import { z } from 'zod';

export const tradeSchema = z.object({
  ticker: z
    .string({ message: 'Ticker is required' })
    .min(1, 'Ticker is required')
    .max(30, 'Ticker must be at most 30 characters')
    .transform((val) => val.toUpperCase()),
  quantity: z
    .number({ message: 'Quantity is required' })
    .positive('Quantity must be greater than 0')
    .max(1000000, 'Quantity must be at most 1,000,000'),
});

export const limitOrderSchema = z.object({
  ticker: z
    .string({ message: 'Ticker is required' })
    .min(1, 'Ticker is required')
    .max(30, 'Ticker must be at most 30 characters')
    .transform((val) => val.toUpperCase()),
  side: z.enum(['BUY', 'SELL'], { message: 'Side must be BUY or SELL' }),
  quantity: z
    .number({ message: 'Quantity is required' })
    .positive('Quantity must be greater than 0'),
  limitPrice: z
    .number({ message: 'Limit price is required' })
    .positive('Limit price must be greater than 0'),
});

export const cancelOrderSchema = z.object({
  orderId: z.string({ message: 'Order ID is required' }).uuid('Invalid order ID'),
});
