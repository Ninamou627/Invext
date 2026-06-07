import prisma from '../config/prisma';
import { getQuote } from './market.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { convertUsdToCurrency } from '../utils/currency';

/**
 * Create a price alert for a ticker.
 */
export const createAlert = async (
  userId: string,
  ticker: string,
  targetPrice: number,
  condition: 'ABOVE' | 'BELOW'
) => {
  const alert = await prisma.alert.create({
    data: {
      userId,
      ticker,
      targetPrice,
      condition,
    }
  });

  return alert;
};

/**
 * Get all alerts for a user.
 */
export const getUserAlerts = async (userId: string) => {
  return await prisma.alert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Delete an alert.
 */
export const deleteAlert = async (userId: string, alertId: string) => {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });

  if (!alert) throw new NotFoundError('Alert not found');
  if (alert.userId !== userId) throw new NotFoundError('Alert not found');

  await prisma.alert.delete({ where: { id: alertId } });
  return { message: 'Alert deleted successfully' };
};

/**
 * Check all active alerts against current prices.
 * Called periodically by a cron job.
 */
export const checkAlerts = async () => {
  const activeAlerts = await prisma.alert.findMany({
    where: { isTriggered: false },
    include: { user: true }
  });

  const triggeredAlerts: any[] = [];

  // Group alerts by ticker to minimize API calls
  const alertsByTicker = activeAlerts.reduce((acc, alert) => {
    if (!acc[alert.ticker]) acc[alert.ticker] = [];
    acc[alert.ticker].push(alert);
    return acc;
  }, {} as Record<string, typeof activeAlerts>);

  for (const [ticker, alerts] of Object.entries(alertsByTicker)) {
    try {
      const quote = await getQuote(ticker);
      const currentPrice = quote.c;
      if (!currentPrice) continue;

      for (const alert of alerts) {
        const targetPrice = alert.targetPrice.toNumber();
        let triggered = false;

        const currentPriceInUserCurrency = convertUsdToCurrency(currentPrice, alert.user.preferredCurrency);

        if (alert.condition === 'ABOVE' && currentPriceInUserCurrency >= targetPrice) {
          triggered = true;
        } else if (alert.condition === 'BELOW' && currentPriceInUserCurrency <= targetPrice) {
          triggered = true;
        }

        if (triggered) {
          await prisma.alert.update({
            where: { id: alert.id },
            data: { isTriggered: true }
          });
          triggeredAlerts.push({
            ...alert,
            currentPrice: currentPriceInUserCurrency, // Return the price in the user's currency
          });
        }
      }
    } catch (error) {
      console.error(`Error checking alerts for ${ticker}:`, error);
    }
  }

  return { checked: activeAlerts.length, triggered: triggeredAlerts.length, alerts: triggeredAlerts };
};
