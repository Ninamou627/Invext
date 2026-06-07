import { z } from 'zod';

export const quoteQuerySchema = z.object({
  symbol: z
    .string({ message: 'Symbol is required' })
    .min(1, 'Symbol is required')
    .max(30, 'Symbol must be at most 30 characters')
    .transform((val) => val.toUpperCase()),
});

export const searchQuerySchema = z.object({
  query: z
    .string({ message: 'Search query is required' })
    .min(1, 'Search query is required')
    .max(50, 'Search query must be at most 50 characters'),
});

export const historyQuerySchema = z.object({
  symbol: z
    .string({ message: 'Symbol is required' })
    .min(1, 'Symbol is required')
    .transform((val) => val.toUpperCase()),
  resolution: z
    .string()
    .default('D'),
  from: z
    .string({ message: 'From timestamp is required' })
    .regex(/^\d+$/, 'From must be a unix timestamp')
    .transform(Number),
  to: z
    .string({ message: 'To timestamp is required' })
    .regex(/^\d+$/, 'To must be a unix timestamp')
    .transform(Number),
});
