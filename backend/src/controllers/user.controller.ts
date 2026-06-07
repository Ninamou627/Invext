import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/auth.utils';
import { convertBetweenCurrencies } from '../utils/currency';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        cashBalance: true,
        preferredCurrency: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { username, email, preferredCurrency } = req.body;

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new Error('User not found');

    if (username && username !== currentUser.username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }

    if (email && email !== currentUser.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email is already taken' });
      }
    }

    let cashBalanceData = {};

    if (preferredCurrency && preferredCurrency !== currentUser.preferredCurrency) {
      const currentCash = currentUser.cashBalance.toNumber();
      const newCash = convertBetweenCurrencies(currentCash, currentUser.preferredCurrency, preferredCurrency);
      cashBalanceData = { cashBalance: newCash };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: username || undefined,
        email: email || undefined,
        preferredCurrency: preferredCurrency || undefined,
        ...cashBalanceData
      },
      select: {
        id: true,
        email: true,
        username: true,
        preferredCurrency: true,
        cashBalance: true
      }
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await comparePassword(oldPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect old password' });

    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

import fs from 'fs/promises';
import path from 'path';

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { avatarData } = req.body;

    let finalAvatarUrl = '';

    if (avatarData && avatarData.startsWith('data:image')) {
      const matches = avatarData.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `avatar-${userId}-${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, '../../public/uploads');
        const uploadPath = path.join(uploadDir, fileName);

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        await fs.writeFile(uploadPath, buffer);
        finalAvatarUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
      } else {
        return res.status(400).json({ error: 'Invalid image format' });
      }
    } else {
      return res.status(400).json({ error: 'Missing avatar data' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: finalAvatarUrl }
    });

    res.json({ message: 'Avatar updated successfully', avatarUrl: finalAvatarUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyPassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) return res.json({ valid: false });

    res.json({ valid: true, message: 'Password verified' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
