import prisma from '../config/prisma';
import { getQuote } from './market.service';
import {
  NotFoundError,
  InsufficientFundsError,
  InsufficientAssetsError,
  ExternalServiceError,
} from '../utils/errors';
import { convertUsdToCurrency } from '../utils/currency';
import { Prisma } from '@prisma/client';

export const buyStock = async (userId: string, ticker: string, quantity: number) => {
  // Get external market price as fallback
  let quote;
  try {
    quote = await getQuote(ticker);
  } catch (error) {
    throw new ExternalServiceError(`Failed to get price for ${ticker}`);
  }
  const rawPrice = quote.c;
  if (!rawPrice || rawPrice <= 0) {
    throw new ExternalServiceError(`Invalid price received for ${ticker}`);
  }

  return await prisma.$transaction(async (tx) => {
    // Lock ticker
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, ticker);

    const buyer = await tx.user.findUnique({ where: { id: userId } });
    if (!buyer) throw new NotFoundError('User not found');

    const fallbackPrice = convertUsdToCurrency(rawPrice, buyer.preferredCurrency);

    // Create a MARKET order record
    const marketOrder = await tx.order.create({
      data: {
        userId,
        ticker,
        side: 'BUY',
        orderType: 'MARKET',
        quantity,
        status: 'PENDING'
      }
    });

    // Find all pending sell orders for this ticker (excluding buyer's own orders)
    const sellOrders = await tx.order.findMany({
      where: {
        ticker,
        side: 'SELL',
        status: { in: ['PENDING', 'PARTIAL'] },
        userId: { not: userId }
      },
      orderBy: [
        { limitPrice: 'asc' },
        { createdAt: 'asc' }
      ],
      include: { user: true }
    });

    let remainingQty = quantity;
    let totalFilledQty = 0;
    let currentBuyerCash = buyer.cashBalance.toNumber();

    // 1. Try matching with internal sell orders
    for (const sellOrder of sellOrders) {
      if (remainingQty <= 0) break;

      const executionPriceUsd = sellOrder.limitPrice!.toNumber();
      const executionPrice = convertUsdToCurrency(executionPriceUsd, buyer.preferredCurrency);
      const sellQtyRemaining = sellOrder.quantity.toNumber() - sellOrder.filledQuantity.toNumber();
      let matchQty = Math.min(remainingQty, sellQtyRemaining);

      if (matchQty <= 0) continue;

      // Check buyer's cash solvency
      const cost = matchQty * executionPrice;
      if (currentBuyerCash < cost) {
        // Buy only what buyer can afford
        matchQty = currentBuyerCash / executionPrice;
        if (matchQty <= 0) break;
      }

      const actualCost = matchQty * executionPrice;
      currentBuyerCash -= actualCost;

      // Debit buyer
      await tx.user.update({
        where: { id: userId },
        data: { cashBalance: { decrement: actualCost } }
      });

      // Credit seller
      const sellerCurrency = sellOrder.user.preferredCurrency || 'USD';
      const executionPriceSeller = convertUsdToCurrency(executionPriceUsd, sellerCurrency);
      const actualCostSeller = matchQty * executionPriceSeller;
      
      await tx.user.update({
        where: { id: sellOrder.userId },
        data: { cashBalance: { increment: actualCostSeller } }
      });

      // Update buyer holdings
      const existingHolding = await tx.holding.findUnique({
        where: { userId_ticker: { userId, ticker } }
      });

      if (existingHolding) {
        const oldCost = existingHolding.avgBuyPrice.toNumber() * existingHolding.quantity.toNumber();
        const newQty = existingHolding.quantity.toNumber() + matchQty;
        const newAvg = (oldCost + actualCost) / newQty;

        await tx.holding.update({
          where: { id: existingHolding.id },
          data: { quantity: newQty, avgBuyPrice: newAvg }
        });
      } else {
        await tx.holding.create({
          data: {
            userId,
            ticker,
            quantity: matchQty,
            avgBuyPrice: executionPrice,
            currency: buyer.preferredCurrency
          }
        });
      }

      // Record transaction records
      await tx.transaction.create({
        data: {
          userId,
          ticker,
          type: 'BUY',
          quantity: matchQty,
          pricePerUnit: executionPrice,
          totalAmount: actualCost,
          currency: buyer.preferredCurrency
        }
      });

      await tx.transaction.create({
        data: {
          userId: sellOrder.userId,
          ticker,
          type: 'SELL',
          quantity: matchQty,
          pricePerUnit: executionPriceSeller,
          totalAmount: actualCostSeller,
          currency: sellerCurrency
        }
      });

      // Update matched sell order
      const newFilled = sellOrder.filledQuantity.toNumber() + matchQty;
      await tx.order.update({
        where: { id: sellOrder.id },
        data: {
          filledQuantity: newFilled,
          status: newFilled >= sellOrder.quantity.toNumber() ? 'FILLED' : 'PARTIAL'
        }
      });

      remainingQty -= matchQty;
      totalFilledQty += matchQty;
    }

    // 2. Fallback to executing remainder against market price if liquidity is not enough
    if (remainingQty > 0) {
      const cost = remainingQty * fallbackPrice;
      if (currentBuyerCash < cost) {
        // Adjust quantity to what buyer can afford
        const matchQty = currentBuyerCash / fallbackPrice;
        if (matchQty > 0) {
          const actualCost = matchQty * fallbackPrice;
          currentBuyerCash -= actualCost;

          await tx.user.update({
            where: { id: userId },
            data: { cashBalance: { decrement: actualCost } }
          });

          // Add holding
          const existingHolding = await tx.holding.findUnique({
            where: { userId_ticker: { userId, ticker } }
          });

          if (existingHolding) {
            const oldCost = existingHolding.avgBuyPrice.toNumber() * existingHolding.quantity.toNumber();
            const newQty = existingHolding.quantity.toNumber() + matchQty;
            const newAvg = (oldCost + actualCost) / newQty;

            await tx.holding.update({
              where: { id: existingHolding.id },
              data: { quantity: newQty, avgBuyPrice: newAvg }
            });
          } else {
            await tx.holding.create({
              data: {
                userId,
                ticker,
                quantity: matchQty,
                avgBuyPrice: fallbackPrice,
                currency: buyer.preferredCurrency
              }
            });
          }

          // Record transaction history
          await tx.transaction.create({
            data: {
              userId,
              ticker,
              type: 'BUY',
              quantity: matchQty,
              pricePerUnit: fallbackPrice,
              totalAmount: actualCost,
              currency: buyer.preferredCurrency
            }
          });

          remainingQty -= matchQty;
          totalFilledQty += matchQty;
        } else if (totalFilledQty === 0) {
          throw new InsufficientFundsError('Insufficient funds for market buy');
        }
      } else {
        await tx.user.update({
          where: { id: userId },
          data: { cashBalance: { decrement: cost } }
        });

        // Add holding
        const existingHolding = await tx.holding.findUnique({
          where: { userId_ticker: { userId, ticker } }
        });

        if (existingHolding) {
          const oldCost = existingHolding.avgBuyPrice.toNumber() * existingHolding.quantity.toNumber();
          const newQty = existingHolding.quantity.toNumber() + remainingQty;
          const newAvg = (oldCost + cost) / newQty;

          await tx.holding.update({
            where: { id: existingHolding.id },
            data: { quantity: newQty, avgBuyPrice: newAvg }
          });
        } else {
          await tx.holding.create({
            data: {
              userId,
              ticker,
              quantity: remainingQty,
              avgBuyPrice: fallbackPrice,
              currency: buyer.preferredCurrency
            }
          });
        }

        // Record transaction
        await tx.transaction.create({
          data: {
            userId,
            ticker,
            type: 'BUY',
            quantity: remainingQty,
            pricePerUnit: fallbackPrice,
            totalAmount: cost,
            currency: buyer.preferredCurrency
          }
        });

        totalFilledQty += remainingQty;
        remainingQty = 0;
      }
    }

    // Update market order status
    const finalStatus = totalFilledQty >= quantity ? 'FILLED' : (totalFilledQty > 0 ? 'PARTIAL' : 'CANCELLED');
    const updatedOrder = await tx.order.update({
      where: { id: marketOrder.id },
      data: {
        filledQuantity: totalFilledQty,
        status: finalStatus
      }
    });

    const finalHolding = await tx.holding.findUnique({ where: { userId_ticker: { userId, ticker } } });

    return {
      transaction: await tx.transaction.findFirst({ where: { userId, ticker }, orderBy: { executedAt: 'desc' } }),
      holding: finalHolding,
      newCashBalance: currentBuyerCash,
      order: updatedOrder
    };
  }, { maxWait: 20000, timeout: 20000 });
};

export const sellStock = async (userId: string, ticker: string, quantity: number) => {
  // Get external market price as fallback
  let quote;
  try {
    quote = await getQuote(ticker);
  } catch (error) {
    throw new ExternalServiceError(`Failed to get price for ${ticker}`);
  }
  const rawPrice = quote.c;
  if (!rawPrice || rawPrice <= 0) {
    throw new ExternalServiceError(`Invalid price received for ${ticker}`);
  }

  return await prisma.$transaction(async (tx) => {
    // Lock ticker
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, ticker);

    const seller = await tx.user.findUnique({ where: { id: userId } });
    if (!seller) throw new NotFoundError('User not found');

    const fallbackPrice = convertUsdToCurrency(rawPrice, seller.preferredCurrency);

    // Verify holding exists and has sufficient quantity
    const holding = await tx.holding.findUnique({
      where: { userId_ticker: { userId, ticker } }
    });

    if (!holding || holding.quantity.toNumber() < quantity) {
      throw new InsufficientAssetsError(
        `Insufficient ${ticker} shares. Available: ${holding?.quantity.toNumber() ?? 0}, Requested: ${quantity}`
      );
    }

    // Create MARKET order record
    const marketOrder = await tx.order.create({
      data: {
        userId,
        ticker,
        side: 'SELL',
        orderType: 'MARKET',
        quantity,
        status: 'PENDING'
      }
    });

    // Find all pending buy orders for this ticker (excluding seller's own orders)
    const buyOrders = await tx.order.findMany({
      where: {
        ticker,
        side: 'BUY',
        status: { in: ['PENDING', 'PARTIAL'] },
        userId: { not: userId }
      },
      orderBy: [
        { limitPrice: 'desc' },
        { createdAt: 'asc' }
      ],
      include: { user: true }
    });

    let remainingQty = quantity;
    let totalFilledQty = 0;
    let cashCredited = 0;

    // 1. Try matching with internal buy orders
    for (const buyOrder of buyOrders) {
      if (remainingQty <= 0) break;

      const executionPriceUsd = buyOrder.limitPrice!.toNumber();
      const executionPrice = convertUsdToCurrency(executionPriceUsd, seller.preferredCurrency);
      const buyQtyRemaining = buyOrder.quantity.toNumber() - buyOrder.filledQuantity.toNumber();
      const matchQty = Math.min(remainingQty, buyQtyRemaining);

      if (matchQty <= 0) continue;

      const tradeAmount = matchQty * executionPrice;
      cashCredited += tradeAmount;

      // Credit seller
      await tx.user.update({
        where: { id: userId },
        data: { cashBalance: { increment: tradeAmount } }
      });

      // Buyer cash was already locked at their submitted limitPrice * quantity.
      // We refund any price improvement (buyOrder limit price USD - execution price USD) -> converted to buyer currency
      const bidPriceUsd = buyOrder.limitPrice!.toNumber();
      const buyerCurrency = buyOrder.user.preferredCurrency || 'USD';
      
      const executionPriceBuyer = convertUsdToCurrency(executionPriceUsd, buyerCurrency);
      const bidPriceBuyer = convertUsdToCurrency(bidPriceUsd, buyerCurrency);
      
      const refundAmount = (bidPriceBuyer - executionPriceBuyer) * matchQty;
      if (refundAmount > 0) {
        await tx.user.update({
          where: { id: buyOrder.userId },
          data: { cashBalance: { increment: refundAmount } }
        });
      }

      const tradeAmountBuyer = matchQty * executionPriceBuyer;

      // Update buyer holding
      const buyerHolding = await tx.holding.findUnique({
        where: { userId_ticker: { userId: buyOrder.userId, ticker } }
      });

      if (buyerHolding) {
        const oldCost = buyerHolding.avgBuyPrice.toNumber() * buyerHolding.quantity.toNumber();
        const newQty = buyerHolding.quantity.toNumber() + matchQty;
        const newAvg = (oldCost + tradeAmountBuyer) / newQty;

        await tx.holding.update({
          where: { id: buyerHolding.id },
          data: { quantity: newQty, avgBuyPrice: newAvg }
        });
      } else {
        await tx.holding.create({
          data: {
            userId: buyOrder.userId,
            ticker,
            quantity: matchQty,
            avgBuyPrice: executionPriceBuyer,
            currency: buyerCurrency
          }
        });
      }

      // Record transactions
      await tx.transaction.create({
        data: {
          userId,
          ticker,
          type: 'SELL',
          quantity: matchQty,
          pricePerUnit: executionPrice,
          totalAmount: tradeAmount,
          currency: seller.preferredCurrency
        }
      });

      await tx.transaction.create({
        data: {
          userId: buyOrder.userId,
          ticker,
          type: 'BUY',
          quantity: matchQty,
          pricePerUnit: executionPriceBuyer,
          totalAmount: tradeAmountBuyer,
          currency: buyerCurrency
        }
      });

      // Update matched buy order
      const newFilled = buyOrder.filledQuantity.toNumber() + matchQty;
      await tx.order.update({
        where: { id: buyOrder.id },
        data: {
          filledQuantity: newFilled,
          status: newFilled >= buyOrder.quantity.toNumber() ? 'FILLED' : 'PARTIAL'
        }
      });

      remainingQty -= matchQty;
      totalFilledQty += matchQty;
    }

    // 2. Fallback to executing remainder against market price if liquidity is not enough
    if (remainingQty > 0) {
      const tradeAmount = remainingQty * fallbackPrice;
      cashCredited += tradeAmount;

      // Credit seller
      await tx.user.update({
        where: { id: userId },
        data: { cashBalance: { increment: tradeAmount } }
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          ticker,
          type: 'SELL',
          quantity: remainingQty,
          pricePerUnit: fallbackPrice,
          totalAmount: tradeAmount,
          currency: seller.preferredCurrency
        }
      });

      totalFilledQty += remainingQty;
      remainingQty = 0;
    }

    // Update seller holdings
    const newQty = holding.quantity.toNumber() - totalFilledQty;
    let finalHolding;
    if (newQty <= 0) {
      await tx.holding.delete({ where: { id: holding.id } });
      finalHolding = null;
    } else {
      finalHolding = await tx.holding.update({
        where: { id: holding.id },
        data: { quantity: newQty }
      });
    }

    // Update market order status
    const finalStatus = totalFilledQty >= quantity ? 'FILLED' : (totalFilledQty > 0 ? 'PARTIAL' : 'CANCELLED');
    const updatedOrder = await tx.order.update({
      where: { id: marketOrder.id },
      data: {
        filledQuantity: totalFilledQty,
        status: finalStatus
      }
    });

    return {
      transaction: await tx.transaction.findFirst({ where: { userId, ticker }, orderBy: { executedAt: 'desc' } }),
      holding: finalHolding,
      newCashBalance: seller.cashBalance.toNumber() + cashCredited,
      order: updatedOrder
    };
  }, { maxWait: 20000, timeout: 20000 });
};
