import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllConfig,
  getConfigByKey,
  updateConfig,
  updateMultipleConfig,
  getLeaveDefaults,
} from '../controllers/configController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get leave defaults (for employee creation form)
router.get('/leave-defaults', getLeaveDefaults);

// Admin only routes
router.get('/', authorize('ADMIN'), getAllConfig);
router.get('/:key', authorize('ADMIN'), getConfigByKey);
router.put('/:key', authorize('ADMIN'), updateConfig);
router.post('/batch', authorize('ADMIN'), updateMultipleConfig);

export default router;
