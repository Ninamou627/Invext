import { Router } from 'express';
import { getTickerSentiment } from '../controllers/news.controller';

const router = Router();

router.get('/:ticker/sentiment', getTickerSentiment);

export default router;
