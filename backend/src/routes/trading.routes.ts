import { Router } from 'express';
import { buy, sell, createLimitOrder, cancelOrder, getOrders, getOrderBook } from '../controllers/trading.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { tradeSchema, limitOrderSchema } from '../validators/trading.validators';

const router = Router();

// All trading routes are protected
router.use(authMiddleware);

// Market orders
router.post('/buy', validate(tradeSchema), buy);
router.post('/sell', validate(tradeSchema), sell);

// Limit orders
router.post('/orders', validate(limitOrderSchema), createLimitOrder);
router.get('/orders', getOrders);
router.delete('/orders/:orderId', cancelOrder);

// Order book
router.get('/orderbook/:ticker', getOrderBook);

export default router;
