import { z } from 'zod';

export const createAlertSchema = z.object({
  ticker: z
    .string({ message: 'Ticker is required' })
    .min(1, 'Ticker is required')
    .max(30, 'Ticker must be at most 30 characters')
    .transform((val) => val.toUpperCase()),
  targetPrice: z
    .number({ message: 'Target price is required' })
    .positive('Target price must be greater than 0'),
  condition: z.enum(['ABOVE', 'BELOW'], {
    message: 'Condition must be ABOVE or BELOW',
  }),
});

export const deleteAlertSchema = z.object({
  alertId: z.string({ message: 'Alert ID is required' }).uuid('Invalid alert ID'),
});
