import { Request, Response } from 'express';
import * as marketService from '../services/market.service';
import { refreshExchangeRates } from '../utils/currency';

export const getQuote = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    const quote = await marketService.getQuote(symbol as string);
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const search = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const results = await marketService.searchSymbols(query as string);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const { symbol, resolution, from, to } = req.query;
    if (!symbol || !from || !to) {
      return res.status(400).json({ error: 'Symbol, from, and to timestamps are required' });
    }

    const candles = await marketService.getCandles(
      symbol as string,
      (resolution as string) || 'D',
      Number(from),
      Number(to)
    );
    res.json(candles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getExchangeRates = async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const rates = await refreshExchangeRates(force);
    res.json(rates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
