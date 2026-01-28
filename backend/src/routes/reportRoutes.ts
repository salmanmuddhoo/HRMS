import { Router } from 'express';
import {
  getLeaveReport,
  getAttendanceReport,
  getPayrollReport,
  getDashboardStats,
} from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/leave', authorize('ADMIN', 'EMPLOYER'), getLeaveReport);
router.get('/attendance', authorize('ADMIN', 'EMPLOYER'), getAttendanceReport);
router.get('/payroll', authorize('ADMIN', 'EMPLOYER'), getPayrollReport);

export default router;
