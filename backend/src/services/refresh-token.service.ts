import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  verifyRefreshToken,
} from '../utils/auth.utils';
import { UnauthorizedError } from '../utils/errors';

type DbClient = Prisma.TransactionClient | typeof prisma;

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const createRefreshTokenRecord = async (userId: string, db: DbClient = prisma) => {
  const tokenId = crypto.randomUUID();
  const refreshToken = generateRefreshToken(userId, tokenId);
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = getRefreshTokenExpiresAt();

  await db.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { refreshToken, tokenHash, expiresAt };
};

export const issueTokenPair = async (userId: string, db: DbClient = prisma) => {
  const accessToken = generateAccessToken(userId);
  const { refreshToken, expiresAt } = await createRefreshTokenRecord(userId, db);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
  };
};

export const rotateRefreshToken = async (token: string) => {
  const decoded = verifyRefreshToken(token);
  if (!decoded?.userId || !decoded?.jti) {
    throw new UnauthorizedError('Invalid refresh token', 'INVALID_TOKEN');
  }

  const tokenHash = hashRefreshToken(token);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!storedToken) {
    throw new UnauthorizedError('Refresh token not found', 'INVALID_TOKEN');
  }

  if (storedToken.userId !== decoded.userId) {
    throw new UnauthorizedError('Refresh token subject mismatch', 'INVALID_TOKEN');
  }

  if (storedToken.revokedAt) {
    await revokeAllRefreshTokens(storedToken.userId);
    throw new UnauthorizedError('Refresh token has been revoked', 'TOKEN_REUSED');
  }

  if (storedToken.expiresAt <= new Date()) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token expired', 'TOKEN_EXPIRED');
  }

  return await prisma.$transaction(async (tx) => {
    const nextPair = await issueTokenPair(storedToken.userId, tx);

    await tx.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: hashRefreshToken(nextPair.refreshToken),
      },
    });

    return nextPair;
  });
};

export const revokeRefreshToken = async (token: string) => {
  const tokenHash = hashRefreshToken(token);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!storedToken) {
    return { revoked: false };
  }

  if (!storedToken.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
  }

  return { revoked: true };
};

export const revokeAllRefreshTokens = async (userId: string) => {
  const result = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return { revokedCount: result.count };
};
