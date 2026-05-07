import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllConfig,
  getConfigByKey,
  updateConfig,
  updateMultipleConfig,
  getLeaveDefaults,
  getPayrollCycle,
  getLeaveYearStatus,
  resetLeaveYear,
} from '../controllers/configController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get leave defaults (for employee creation form)
router.get('/leave-defaults', getLeaveDefaults);

// Leave year reset (admin only)
router.get('/leave-year-status', authorize('ADMIN'), getLeaveYearStatus);
router.post('/reset-leave-year', authorize('ADMIN'), resetLeaveYear);

// Get payroll cycle info (any authenticated user)
router.get('/payroll-cycle', getPayrollCycle);

// Admin only routes
router.get('/', authorize('ADMIN'), getAllConfig);
router.get('/:key', authorize('ADMIN'), getConfigByKey);
router.put('/:key', authorize('ADMIN'), updateConfig);
router.post('/batch', authorize('ADMIN'), updateMultipleConfig);

export default router;
