import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAttendance,
  getMonthlyAttendanceSummary,
  markAbsence,
  updateAttendance,
} from '../controllers/attendanceController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAttendance);
router.get('/summary/:employeeId', getMonthlyAttendanceSummary);

router.post(
  '/absence',
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ]),
  markAbsence
);

router.put(
  '/:id',
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('isPresent').optional().isBoolean(),
    body('isAbsence').optional().isBoolean(),
  ]),
  updateAttendance
);

export default router;
