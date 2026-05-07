import { Router } from 'express';
import {
  getLeaveReport,
  getAttendanceReport,
  getPayrollReport,
  getDashboardStats,
  getLeaveBalancesReport,
} from '../controllers/reportController';
import { authenticate, authorize, HR_ROLES } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/leave', authorize(...HR_ROLES), getLeaveReport);
router.get('/attendance', authorize(...HR_ROLES), getAttendanceReport);
router.get('/payroll', authorize(...HR_ROLES), getPayrollReport);
router.get('/leave-balances', authorize('ADMIN', 'TREASURER', 'SECRETARY', 'DIRECTOR'), getLeaveBalancesReport);

export default router;
