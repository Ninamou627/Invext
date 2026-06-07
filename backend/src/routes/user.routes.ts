import { Router } from 'express';
import { getProfile, updateProfile, changePassword, updateAvatar, verifyPassword } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateProfileSchema, changePasswordSchema, updateAvatarSchema, verifyPasswordSchema } from '../validators/user.validators';

const router = Router();

// All user routes are protected
router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.put('/change-password', validate(changePasswordSchema), changePassword);
router.put('/avatar', validate(updateAvatarSchema), updateAvatar);
router.post('/verify-password', validate(verifyPasswordSchema), verifyPassword);

export default router;
