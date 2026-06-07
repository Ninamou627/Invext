import { Router } from 'express';
import { createAlert, getAlerts, deleteAlert } from '../controllers/alert.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAlertSchema } from '../validators/alert.validators';

const router = Router();

// All alert routes are protected
router.use(authMiddleware);

router.post('/', validate(createAlertSchema), createAlert);
router.get('/', getAlerts);
router.delete('/:alertId', deleteAlert);

export default router;
