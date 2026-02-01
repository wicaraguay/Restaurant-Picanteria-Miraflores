import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

// GET /api/dashboard/stats?range=today|week|month
router.get('/stats', dashboardController.getStats);

export default router;
