import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as portfolioService from '../services/portfolio.service';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const portfolio = await portfolioService.getUserPortfolio(userId);
    res.json(portfolio);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const history = await portfolioService.getTransactionHistory(userId, page, limit);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const getSnapshots = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days as string) || 30;

    const snapshots = await portfolioService.getPortfolioSnapshots(userId, days);
    res.json(snapshots);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await portfolioService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};
