import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllLeaves,
  getLeaveById,
  applyLeave,
  approveLeave,
  rejectLeave,
  addUrgentLeave,
  updateLeave,
  cancelLeave,
} from '../controllers/leaveController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllLeaves);
router.get('/:id', getLeaveById);

router.post(
  '/apply',
  validate([
    body('leaveType').isIn(['LOCAL', 'SICK']).withMessage('Invalid leave type'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ]),
  applyLeave
);

router.post(
  '/urgent',
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('leaveType').isIn(['LOCAL', 'SICK']).withMessage('Invalid leave type'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ]),
  addUrgentLeave
);

router.put(
  '/:id',
  validate([
    body('leaveType').isIn(['LOCAL', 'SICK']).withMessage('Invalid leave type'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
  ]),
  updateLeave
);

router.put('/:id/approve', authorize('ADMIN', 'EMPLOYER'), approveLeave);

router.put(
  '/:id/reject',
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
  ]),
  rejectLeave
);

router.delete('/:id', cancelLeave);

export default router;
