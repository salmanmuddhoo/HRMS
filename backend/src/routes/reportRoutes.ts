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
router.get('/leave', authorize('ADMIN', 'EMPLOYER', 'DIRECTOR'), getLeaveReport);
router.get('/attendance', authorize('ADMIN', 'EMPLOYER', 'DIRECTOR'), getAttendanceReport);
router.get('/payroll', authorize('ADMIN', 'EMPLOYER', 'DIRECTOR', 'TREASURER', 'SECRETARY'), getPayrollReport);

export default router;
