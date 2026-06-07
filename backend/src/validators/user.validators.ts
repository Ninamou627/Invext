import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[\p{L}0-9_ -]+$/u, 'Username can only contain letters, numbers, spaces, hyphens and underscores')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .optional(),
  preferredCurrency: z
    .enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'CHF', 'MAD', 'GNF', 'XOF'])
    .optional(),
}).refine(data => data.username || data.email || data.preferredCurrency, {
  message: 'At least one field must be provided',
});

export const changePasswordSchema = z.object({
  oldPassword: z
    .string({ message: 'Old password is required' })
    .min(1, 'Old password is required'),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});

export const updateAvatarSchema = z.object({
  avatarData: z
    .string({ message: 'Avatar data is required' }),
});

export const verifyPasswordSchema = z.object({
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required'),
});
