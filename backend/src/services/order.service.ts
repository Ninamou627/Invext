import prisma from '../config/prisma';
import { getQuote } from './market.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { getCurrencySymbol, convertCurrencyToUsd, convertUsdToCurrency } from '../utils/currency';
import { matchTickerOrders } from './matching.service';
import { Prisma } from '@prisma/client';

/**
 * Seed Market Maker liquidity around the real-time stock price.
 */
export const seedMarketMakerLiquidity = async (ticker: string) => {
  try {
    const quote = await getQuote(ticker);
    const price = quote.c;
    if (!price || price <= 0) return;

    let mm = await prisma.user.findUnique({ where: { username: 'MarketMaker' } });
    if (!mm) {
      mm = await prisma.user.create({
        data: {
          email: 'marketmaker@investx.com',
          username: 'MarketMaker',
          passwordHash: 'mm_disabled_password',
          cashBalance: 999999999.99,
          preferredCurrency: 'USD'
        }
      });
    }

    // Wrap in a transaction with an advisory lock to prevent race conditions with active trades
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, ticker);

      // Delete old pending MM orders for this ticker to prevent database bloat
      await tx.order.deleteMany({
        where: {
          userId: mm!.id,
          ticker,
          status: 'PENDING'
        }
      });

      const mmOrders = [];
      const spread = 0.005; // 0.5% starting spread

      for (let i = 0; i < 3; i++) {
        const bidPrice = price * (1 - spread - i * 0.003);
        const askPrice = price * (1 + spread + i * 0.003);
        const qty = 10 + Math.floor(Math.random() * 90); // Random qty between 10 and 100

        mmOrders.push({
          userId: mm!.id,
          ticker,
          side: 'BUY',
          orderType: 'LIMIT',
          quantity: new Prisma.Decimal(qty),
          limitPrice: new Prisma.Decimal(bidPrice),
          status: 'PENDING',
        });

        mmOrders.push({
          userId: mm!.id,
          ticker,
          side: 'SELL',
          orderType: 'LIMIT',
          quantity: new Prisma.Decimal(qty),
          limitPrice: new Prisma.Decimal(askPrice),
          status: 'PENDING',
        });
      }

      await tx.order.createMany({
        data: mmOrders
      });
    }, { maxWait: 20000, timeout: 20000 });

  } catch (error) {
    console.error(`[MarketMaker] Seeding failed for ${ticker}:`, error);
  }
};

/**
 * Create a LIMIT order and immediately execute matching engine.
 * Reserves cash (for BUY) or holdings (for SELL) upfront to prevent double-spending.
 */
export const createLimitOrder = async (
  userId: string,
  ticker: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  limitPrice: number
) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const isMarketMaker = user.username === 'MarketMaker';

    if (side === 'BUY' && !isMarketMaker) {
      const requiredFunds = limitPrice * quantity;
      if (user.cashBalance.toNumber() < requiredFunds) {
        const sym = getCurrencySymbol(user.preferredCurrency);
        throw new BadRequestError(
          `Insufficient funds for limit order. Required: ${sym}${requiredFunds.toFixed(2)}, Available: ${sym}${user.cashBalance.toNumber().toFixed(2)}`
        );
      }

      // Deduct cash immediately
      await tx.user.update({
        where: { id: userId },
        data: { cashBalance: { decrement: requiredFunds } }
      });
    }

    if (side === 'SELL' && !isMarketMaker) {
      const holding = await tx.holding.findUnique({
        where: { userId_ticker: { userId, ticker } }
      });
      if (!holding || holding.quantity.toNumber() < quantity) {
        throw new BadRequestError(
          `Insufficient ${ticker} shares for limit sell order`
        );
      }

      // Deduct shares immediately
      if (holding.quantity.toNumber() === quantity) {
        await tx.holding.delete({ where: { id: holding.id } });
      } else {
        await tx.holding.update({
          where: { id: holding.id },
          data: { quantity: { decrement: quantity } }
        });
      }
    }

    const limitPriceUsd = isMarketMaker ? limitPrice : convertCurrencyToUsd(limitPrice, user.preferredCurrency);

    const order = await tx.order.create({
      data: {
        userId,
        ticker,
        side,
        orderType: 'LIMIT',
        quantity,
        limitPrice: limitPriceUsd,
        status: 'PENDING',
      }
    });

    // Run matching engine for this ticker
    await matchTickerOrders(ticker, tx);

    const finalOrder = await tx.order.findUnique({ where: { id: order.id } });
    return finalOrder;
  }, { maxWait: 20000, timeout: 20000 });
};

/**
 * Cancel a pending limit order and refund reserved cash/assets.
 */
export const cancelOrder = async (userId: string, orderId: string) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });

    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new NotFoundError('Order not found');
    if (order.status !== 'PENDING' && order.status !== 'PARTIAL') {
      throw new BadRequestError(`Cannot cancel order with status: ${order.status}`);
    }

    const remainingQty = order.quantity.toNumber() - order.filledQuantity.toNumber();

    if (remainingQty > 0) {
      const user = await tx.user.findUnique({ where: { id: userId } });
      const userCurrency = user?.preferredCurrency || 'USD';

      if (order.side === 'BUY') {
        const limitPriceUsd = order.limitPrice!.toNumber();
        const refundAmountUsd = limitPriceUsd * remainingQty;
        const refundAmount = convertUsdToCurrency(refundAmountUsd, userCurrency);

        await tx.user.update({
          where: { id: userId },
          data: { cashBalance: { increment: refundAmount } }
        });
      } else if (order.side === 'SELL') {
        const existingHolding = await tx.holding.findUnique({
          where: { userId_ticker: { userId, ticker: order.ticker } }
        });

        if (existingHolding) {
          await tx.holding.update({
            where: { id: existingHolding.id },
            data: { quantity: { increment: remainingQty } }
          });
        } else {
          const limitPriceUsd = order.limitPrice ? order.limitPrice.toNumber() : 0;
          const avgBuyPrice = convertUsdToCurrency(limitPriceUsd, userCurrency);

          await tx.holding.create({
            data: {
              userId,
              ticker: order.ticker,
              quantity: remainingQty,
              avgBuyPrice,
              currency: userCurrency
            }
          });
        }
      }
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    });

    return updated;
  }, { maxWait: 20000, timeout: 20000 });
};

/**
 * Get all orders for a user.
 */
export const getUserOrders = async (userId: string, status?: string) => {
  const where: any = { userId };
  if (status) {
    where.status = status;
  } else {
    // Return pending/partial orders by default if no status specified
    where.status = { in: ['PENDING', 'PARTIAL'] };
  }

  return await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Fetch aggregated order book bids & asks, seeding market maker first.
 */
export const getOrderBook = async (ticker: string) => {
  // Ensure the market maker seeds active liquidity first
  await seedMarketMakerLiquidity(ticker);

  // Group bids
  const bidsRaw = await prisma.order.groupBy({
    by: ['limitPrice'],
    where: {
      ticker,
      side: 'BUY',
      status: { in: ['PENDING', 'PARTIAL'] }
    },
    _sum: {
      quantity: true,
      filledQuantity: true
    },
    orderBy: {
      limitPrice: 'desc'
    },
    take: 5
  });

  // Group asks
  const asksRaw = await prisma.order.groupBy({
    by: ['limitPrice'],
    where: {
      ticker,
      side: 'SELL',
      status: { in: ['PENDING', 'PARTIAL'] }
    },
    _sum: {
      quantity: true,
      filledQuantity: true
    },
    orderBy: {
      limitPrice: 'asc'
    },
    take: 5
  });

  const bids = bidsRaw
    .map(b => {
      const qty = (b._sum.quantity?.toNumber() || 0) - (b._sum.filledQuantity?.toNumber() || 0);
      return {
        price: b.limitPrice ? b.limitPrice.toNumber() : 0,
        quantity: qty
      };
    })
    .filter(b => b.quantity > 0);

  const asks = asksRaw
    .map(a => {
      const qty = (a._sum.quantity?.toNumber() || 0) - (a._sum.filledQuantity?.toNumber() || 0);
      return {
        price: a.limitPrice ? a.limitPrice.toNumber() : 0,
        quantity: qty
      };
    })
    .filter(a => a.quantity > 0);

  return { bids, asks };
};

/**
 * Check and execute pending limit orders (animated by cron).
 */
export const executePendingOrders = async () => {
  const pendingTickers = await prisma.order.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL'] } },
    select: { ticker: true },
    distinct: ['ticker']
  });

  let executedCount = 0;

  for (const item of pendingTickers) {
    try {
      await seedMarketMakerLiquidity(item.ticker);

      await prisma.$transaction(async (tx) => {
        await matchTickerOrders(item.ticker, tx);
      }, { maxWait: 20000, timeout: 20000 });
      executedCount++;
    } catch (error) {
      console.error(`Error matching orders for ticker ${item.ticker}:`, error);
    }
  }

  return { checked: pendingTickers.length, executed: executedCount };
};
