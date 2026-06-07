import { Router } from 'express';
import { register, login, refreshToken, logout, logoutAll } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validators';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);
router.post('/logout', validate(refreshTokenSchema), logout);
router.post('/logout-all', authMiddleware, logoutAll);

export default router;
