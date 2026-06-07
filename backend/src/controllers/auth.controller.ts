import { Request, Response } from 'express';
import prisma from '../config/prisma';
import {
  hashPassword,
  comparePassword,
} from '../utils/auth.utils';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  issueTokenPair,
  rotateRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
} from '../services/refresh-token.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({
        error: `A user with this ${field} already exists`,
        code: 'CONFLICT',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    const { user, tokenPair } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          cashBalance: 100000.00,
        }
      });

      const tokens = await issueTokenPair(createdUser.id, tx);

      return { user: createdUser, tokenPair: tokens };
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        cashBalance: user.cashBalance
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }

    const tokenPair = await issueTokenPair(user.id);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        cashBalance: user.cashBalance
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    const tokenPair = await rotateRefreshToken(token);

    res.status(200).json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(401).json({ error: 'Invalid or expired refresh token', code: 'INVALID_TOKEN' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    await revokeRefreshToken(token);

    res.status(200).json({ message: 'Session logged out successfully' });
  } catch (error: any) {
    res.status(200).json({ message: 'Session logged out successfully' });
  }
};

export const logoutAll = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const result = await revokeAllRefreshTokens(userId);

    res.status(200).json({
      message: 'All sessions logged out successfully',
      revokedCount: result.revokedCount,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};
