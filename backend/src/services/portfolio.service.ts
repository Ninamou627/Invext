import prisma from '../config/prisma';
import { getQuote } from './market.service';
import { NotFoundError } from '../utils/errors';
import { convertUsdToCurrency } from '../utils/currency';

/**
 * Get the full portfolio dashboard for a user.
 */
export const getUserPortfolio = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      holdings: true,
      transactions: {
        orderBy: { executedAt: 'desc' },
        take: 10
      }
    }
  });

  if (!user) throw new NotFoundError('User not found');

  let totalEquity = 0;
  const detailedHoldings = await Promise.all(
    user.holdings.map(async (holding) => {
      try {
        const quote = await getQuote(holding.ticker);
        const currentPrice = convertUsdToCurrency(quote.c, user.preferredCurrency);
        const qty = holding.quantity.toNumber();
        const avgPrice = holding.avgBuyPrice.toNumber();
        const currentValue = currentPrice * qty;
        const costBasis = avgPrice * qty;
        const pl = currentValue - costBasis;
        const plPercentage = costBasis > 0 ? (pl / costBasis) * 100 : 0;

        totalEquity += currentValue;

        return {
          id: holding.id,
          ticker: holding.ticker,
          quantity: qty,
          avgBuyPrice: avgPrice,
          currentPrice,
          currentValue,
          costBasis,
          pl,
          plPercentage: Math.round(plPercentage * 100) / 100,
          currency: user.preferredCurrency,
        };
      } catch (error) {
        const qty = holding.quantity.toNumber();
        const avgPrice = holding.avgBuyPrice.toNumber();
        return {
          id: holding.id,
          ticker: holding.ticker,
          quantity: qty,
          avgBuyPrice: avgPrice,
          currentPrice: 0,
          currentValue: 0,
          costBasis: avgPrice * qty,
          pl: 0,
          plPercentage: 0,
          currency: user.preferredCurrency,
          error: 'Price unavailable',
        };
      }
    })
  );

  const cashBalance = user.cashBalance.toNumber();
  const totalPortfolioValue = cashBalance + totalEquity;
  const totalPL = detailedHoldings.reduce((sum, h) => sum + h.pl, 0);
  const totalCostBasis = detailedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalPLPercentage = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

  return {
    cashBalance,
    totalEquity,
    totalPortfolioValue,
    totalPL,
    totalPLPercentage: Math.round(totalPLPercentage * 100) / 100,
    holdings: detailedHoldings,
    recentTransactions: user.transactions,
  };
};

/**
 * Get full transaction history for a user with pagination.
 */
export const getTransactionHistory = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { executedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
};

/**
 * Take a snapshot of the user's portfolio (called by cron).
 */
export const takePortfolioSnapshot = async (userId: string) => {
  const portfolio = await getUserPortfolio(userId);

  const snapshot = await prisma.portfolioSnapshot.create({
    data: {
      userId,
      totalValue: portfolio.totalPortfolioValue,
      cashBalance: portfolio.cashBalance,
      equityValue: portfolio.totalEquity,
    }
  });

  return snapshot;
};

/**
 * Take snapshots for ALL users (called by cron).
 */
export const takeAllSnapshots = async () => {
  const users = await prisma.user.findMany({ select: { id: true } });
  let successCount = 0;

  for (const user of users) {
    try {
      await takePortfolioSnapshot(user.id);
      successCount++;
    } catch (error) {
      console.error(`Snapshot failed for user ${user.id}:`, error);
    }
  }

  return { total: users.length, success: successCount };
};

/**
 * Get portfolio snapshots for a user (performance chart).
 */
export const getPortfolioSnapshots = async (userId: string, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return await prisma.portfolioSnapshot.findMany({
    where: {
      userId,
      snapshotAt: { gte: since }
    },
    orderBy: { snapshotAt: 'asc' }
  });
};

/**
 * Get leaderboard — top users by portfolio value.
 */
export const getLeaderboard = async (limit = 20) => {
  // Get all users with their holdings
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      cashBalance: true,
      createdAt: true,
      holdings: true,
      preferredCurrency: true,
    }
  });

  // Calculate total portfolio value for each user
  const leaderboard = await Promise.all(
    users.map(async (user) => {
      let equity = 0;

      for (const holding of user.holdings) {
        try {
          const quote = await getQuote(holding.ticker);
          const price = convertUsdToCurrency(quote.c, user.preferredCurrency);
          equity += price * holding.quantity.toNumber();
        } catch (error) {
          // Skip if price unavailable
        }
      }

      const totalValue = user.cashBalance.toNumber() + equity;
      const initialCapital = 100000;
      const totalReturn = totalValue - initialCapital;
      const totalReturnPercentage = (totalReturn / initialCapital) * 100;

      return {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        totalValue: Math.round(totalValue * 100) / 100,
        totalReturn: Math.round(totalReturn * 100) / 100,
        totalReturnPercentage: Math.round(totalReturnPercentage * 100) / 100,
        memberSince: user.createdAt,
        preferredCurrency: user.preferredCurrency,
      };
    })
  );

  // Sort by total value descending and add rank
  leaderboard.sort((a, b) => b.totalValue - a.totalValue);

  return leaderboard.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));
};
