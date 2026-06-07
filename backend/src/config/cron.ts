import cron from 'node-cron';
import { executePendingOrders } from '../services/order.service';
import { checkAlerts } from '../services/alert.service';
import { takeAllSnapshots } from '../services/portfolio.service';
import { refreshExchangeRates } from '../utils/currency';

/**
 * Initialize all cron jobs.
 */
export const initCronJobs = () => {
  // Check pending limit orders every minute (during market hours)
  cron.schedule('* * * * *', async () => {
    try {
      const result = await executePendingOrders();
      if (result.executed > 0) {
        console.log(`[CRON] Orders: ${result.executed}/${result.checked} executed`);
      }
    } catch (error) {
      console.error('[CRON] Error checking pending orders:', error);
    }
  });

  // Check price alerts every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await checkAlerts();
      if (result.triggered > 0) {
        console.log(`[CRON] Alerts: ${result.triggered}/${result.checked} triggered`);
      }
    } catch (error) {
      console.error('[CRON] Error checking alerts:', error);
    }
  });

  // Take portfolio snapshots daily at midnight UTC
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await takeAllSnapshots();
      console.log(`[CRON] Snapshots: ${result.success}/${result.total} taken`);
    } catch (error) {
      console.error('[CRON] Error taking snapshots:', error);
    }
  });

  // Refresh FX rates hourly so portfolio and trading conversions stay current.
  cron.schedule('0 * * * *', async () => {
    try {
      const snapshot = await refreshExchangeRates(true);
      console.log(`[CRON] FX rates refreshed from ${snapshot.source}`);
    } catch (error) {
      console.error('[CRON] Error refreshing FX rates:', error);
    }
  });

  console.log('[CRON] Scheduled jobs initialized');
};
