import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as tradingService from '../services/trading.service';
import * as orderService from '../services/order.service';
import { AppError } from '../utils/errors';

export const buy = async (req: AuthRequest, res: Response) => {
  try {
    const { ticker, quantity } = req.body;
    const userId = req.user.id;

    const result = await tradingService.buyStock(userId, ticker, quantity);
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const sell = async (req: AuthRequest, res: Response) => {
  try {
    const { ticker, quantity } = req.body;
    const userId = req.user.id;

    const result = await tradingService.sellStock(userId, ticker, quantity);
    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const createLimitOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { ticker, side, quantity, limitPrice } = req.body;
    const userId = req.user.id;

    const order = await orderService.createLimitOrder(userId, ticker, side, quantity, limitPrice);
    res.status(201).json({ message: 'Limit order created', order });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await orderService.cancelOrder(userId, orderId as string);
    res.status(200).json({ message: 'Order cancelled', order });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const orders = await orderService.getUserOrders(userId, status as string | undefined);
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};

export const getOrderBook = async (req: AuthRequest, res: Response) => {
  try {
    const { ticker } = req.params;
    const book = await orderService.getOrderBook(ticker as string);
    res.status(200).json(book);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};
