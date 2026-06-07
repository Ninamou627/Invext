import { Router } from 'express';
import { getQuote, search, getHistory, getExchangeRates } from '../controllers/market.controller';
import { validate } from '../middleware/validate.middleware';
import { quoteQuerySchema, searchQuerySchema, historyQuerySchema } from '../validators/market.validators';

const router = Router();

router.get('/quote', validate(quoteQuerySchema, 'query'), getQuote);
router.get('/search', validate(searchQuerySchema, 'query'), search);
router.get('/history', validate(historyQuerySchema, 'query'), getHistory);
router.get('/exchange-rates', getExchangeRates);

export default router;
