import { Router } from 'express';
import { getDashboard, getHistory, getSnapshots, getLeaderboard } from '../controllers/portfolio.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All portfolio routes are protected
router.use(authMiddleware);

router.get('/dashboard', getDashboard);
router.get('/history', getHistory);
router.get('/snapshots', getSnapshots);
router.get('/leaderboard', getLeaderboard);

export default router;
