import { Request, Response } from 'express';
import { getNewsSentiment } from '../services/news.service';

export const getTickerSentiment = async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required', code: 'MISSING_TICKER' });
    }

    const sentiment = await getNewsSentiment(String(ticker).toUpperCase());
    res.status(200).json(sentiment);
  } catch (error: any) {
    console.error('[news.controller] Error:', error);
    res.status(500).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
};
