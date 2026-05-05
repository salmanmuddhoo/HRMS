import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllPayrolls,
  getPayrollById,
  processMonthlyPayroll,
  resetMonthlyPayroll,
  approvePayroll,
  lockPayroll,
  updatePayroll,
  deletePayroll,
} from '../controllers/payrollController';
import { authenticate, authorize, PAYROLL_WRITE_ROLES, PAYROLL_APPROVE_ROLES } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', getAllPayrolls);
router.get('/:id', getPayrollById);

// Treasurer processes (creates draft), Secretary cannot
router.post(
  '/process',
  authorize(...PAYROLL_WRITE_ROLES),
  validate([
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').isInt({ min: 2000 }).withMessage('Year must be a valid year'),
  ]),
  processMonthlyPayroll
);

// Admin-only: reset (delete) all payrolls for a month so they can be reprocessed
router.post(
  '/reset',
  authorize('ADMIN'),
  validate([
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').isInt({ min: 2000 }).withMessage('Year must be a valid year'),
  ]),
  resetMonthlyPayroll
);

// Secretary approves, Treasurer cannot
router.put('/:id/approve', authorize(...PAYROLL_APPROVE_ROLES), approvePayroll);

// Treasurer locks after Secretary approval
router.put('/:id/lock', authorize(...PAYROLL_WRITE_ROLES), lockPayroll);

router.put(
  '/:id',
  authorize(...PAYROLL_WRITE_ROLES),
  validate([
    body('baseSalary').optional().isNumeric(),
    body('travellingAllowance').optional().isNumeric(),
    body('otherAllowances').optional().isNumeric(),
  ]),
  updatePayroll
);

router.delete('/:id', authorize(...PAYROLL_WRITE_ROLES), deletePayroll);

export default router;
