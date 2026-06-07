import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { convertUsdToCurrency } from '../utils/currency';

/**
 * Run the matching engine for a specific ticker within an active transaction.
 * Uses a transaction-level PostgreSQL advisory lock on the ticker name
 * to guarantee that concurrent matching requests for the same ticker
 * are serialized, avoiding race conditions and double-spending.
 */
export const matchTickerOrders = async (ticker: string, tx: Prisma.TransactionClient) => {
  // 1. Acquire transaction-level advisory lock on the ticker
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, ticker);

  // 2. Fetch all PENDING BUY orders for this ticker (bids)
  // Sorted by price DESC (highest bid first) then createdAt ASC (oldest first)
  const bids = await tx.order.findMany({
    where: { ticker, side: 'BUY', status: { in: ['PENDING', 'PARTIAL'] } },
    orderBy: [
      { limitPrice: 'desc' },
      { createdAt: 'asc' }
    ],
    include: { user: true }
  });

  // 3. Fetch all PENDING SELL orders for this ticker (asks)
  // Sorted by price ASC (cheapest ask first) then createdAt ASC (oldest first)
  const asks = await tx.order.findMany({
    where: { ticker, side: 'SELL', status: { in: ['PENDING', 'PARTIAL'] } },
    orderBy: [
      { limitPrice: 'asc' },
      { createdAt: 'asc' }
    ],
    include: { user: true }
  });

  let bidIdx = 0;
  let askIdx = 0;

  while (bidIdx < bids.length && askIdx < asks.length) {
    const bid = bids[bidIdx];
    const ask = asks[askIdx];

    // Prevent self-trading (wash trading)
    if (bid.userId === ask.userId) {
      if (bid.createdAt < ask.createdAt) {
        askIdx++;
      } else {
        bidIdx++;
      }
      continue;
    }

    const bidPrice = bid.limitPrice ? bid.limitPrice.toNumber() : 0;
    const askPrice = ask.limitPrice ? ask.limitPrice.toNumber() : 0;

    // A match occurs if the buy limit price is >= the sell limit price.
    // If one of the orders is actually a MARKET order (we represent it as LIMIT for book compatibility
    // but we'll handle market orders specifically when they matching), we match them.
    if (bidPrice >= askPrice) {
      // Execution price is determined by the older (resting) order
      const executionPrice = bid.createdAt < ask.createdAt ? bidPrice : askPrice;

      // Determine match quantity based on remaining unfilled quantities
      const bidQtyRemaining = bid.quantity.toNumber() - bid.filledQuantity.toNumber();
      const askQtyRemaining = ask.quantity.toNumber() - ask.filledQuantity.toNumber();
      const matchQty = Math.min(bidQtyRemaining, askQtyRemaining);

      if (matchQty <= 0) {
        if (bidQtyRemaining <= 0) bidIdx++;
        if (askQtyRemaining <= 0) askIdx++;
        continue;
      }

      // Execute the trade
      await executeTrade(tx, bid, ask, matchQty, executionPrice);

      // Update remaining quantity in-memory for the loop
      const newBidFilled = bid.filledQuantity.toNumber() + matchQty;
      bid.filledQuantity = new Prisma.Decimal(newBidFilled);
      if (newBidFilled >= bid.quantity.toNumber()) {
        bid.status = 'FILLED';
        bidIdx++;
      } else {
        bid.status = 'PARTIAL';
      }

      const newAskFilled = ask.filledQuantity.toNumber() + matchQty;
      ask.filledQuantity = new Prisma.Decimal(newAskFilled);
      if (newAskFilled >= ask.quantity.toNumber()) {
        ask.status = 'FILLED';
        askIdx++;
      } else {
        ask.status = 'PARTIAL';
      }
    } else {
      // Bids and asks no longer overlap
      break;
    }
  }
};

/**
 * Execute a match between a buy order and a sell order.
 */
const executeTrade = async (
  tx: Prisma.TransactionClient,
  bid: any,
  ask: any,
  matchQty: number,
  executionPrice: number
) => {
  const totalAmountUsd = executionPrice * matchQty;
  const buyerCurrency = bid.user.preferredCurrency || 'USD';
  const sellerCurrency = ask.user.preferredCurrency || 'USD';
  const buyerExecutionPrice = convertUsdToCurrency(executionPrice, buyerCurrency);
  const sellerExecutionPrice = convertUsdToCurrency(executionPrice, sellerCurrency);
  const buyerTotalAmount = buyerExecutionPrice * matchQty;
  const sellerTotalAmount = sellerExecutionPrice * matchQty;

  // 1. Credit the seller with the cash amount (their holding was already locked/deducted upon placing the order)
  await tx.user.update({
    where: { id: ask.userId },
    data: { cashBalance: { increment: sellerTotalAmount } }
  });

  // 2. The buyer's cash was already debited at bid.limitPrice * qty upon placing the order.
  // We refund the price improvement (if any) to the buyer.
  const bidPrice = bid.limitPrice.toNumber();
  const refundAmount = convertUsdToCurrency((bidPrice - executionPrice) * matchQty, buyerCurrency);
  if (refundAmount > 0) {
    await tx.user.update({
      where: { id: bid.userId },
      data: { cashBalance: { increment: refundAmount } }
    });
  }

  // 3. Add holdings to the buyer
  const existingHolding = await tx.holding.findUnique({
    where: { userId_ticker: { userId: bid.userId, ticker: bid.ticker } }
  });

  if (existingHolding) {
    const oldCost = existingHolding.avgBuyPrice.toNumber() * existingHolding.quantity.toNumber();
    const newQty = existingHolding.quantity.toNumber() + matchQty;
    const newAvg = (oldCost + buyerTotalAmount) / newQty;

    await tx.holding.update({
      where: { id: existingHolding.id },
      data: {
        quantity: newQty,
        avgBuyPrice: newAvg
      }
    });
  } else {
    await tx.holding.create({
      data: {
        userId: bid.userId,
        ticker: bid.ticker,
        quantity: matchQty,
        avgBuyPrice: buyerExecutionPrice,
        currency: buyerCurrency
      }
    });
  }

  // 4. Create Transaction history records for both counterparties
  // Buyer record
  await tx.transaction.create({
    data: {
      userId: bid.userId,
      ticker: bid.ticker,
      type: 'BUY',
      quantity: matchQty,
      pricePerUnit: buyerExecutionPrice,
      totalAmount: buyerTotalAmount,
      currency: buyerCurrency
    }
  });

  // Seller record
  await tx.transaction.create({
    data: {
      userId: ask.userId,
      ticker: ask.ticker,
      type: 'SELL',
      quantity: matchQty,
      pricePerUnit: sellerExecutionPrice,
      totalAmount: sellerTotalAmount,
      currency: sellerCurrency
    }
  });

  // 5. Update the orders' filled quantities and statuses in database
  const finalBidFilled = bid.filledQuantity.toNumber() + matchQty;
  const finalBidStatus = finalBidFilled >= bid.quantity.toNumber() ? 'FILLED' : 'PARTIAL';
  await tx.order.update({
    where: { id: bid.id },
    data: {
      filledQuantity: finalBidFilled,
      status: finalBidStatus
    }
  });

  const finalAskFilled = ask.filledQuantity.toNumber() + matchQty;
  const finalAskStatus = finalAskFilled >= ask.quantity.toNumber() ? 'FILLED' : 'PARTIAL';
  await tx.order.update({
    where: { id: ask.id },
    data: {
      filledQuantity: finalAskFilled,
      status: finalAskStatus
    }
  });
};
