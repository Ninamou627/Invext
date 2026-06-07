import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as alertService from '../services/alert.service';
import { AppError } from '../utils/errors';

export const createAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { ticker, targetPrice, condition } = req.body;

    const alert = await alertService.createAlert(userId, ticker, targetPrice, condition);
    res.status(201).json({ message: 'Alert created', alert });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const alerts = await alertService.getUserAlerts(userId);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const deleteAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { alertId } = req.params;

    const result = await alertService.deleteAlert(userId, alertId as string);
    res.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};
