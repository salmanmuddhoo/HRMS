import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllPayrolls,
  getPayrollById,
  processMonthlyPayroll,
  approvePayroll,
  lockPayroll,
  updatePayroll,
  deletePayroll,
} from '../controllers/payrollController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllPayrolls);
router.get('/:id', getPayrollById);

// Process: Treasurer initiates, Director/Admin/Employer can also
router.post(
  '/process',
  authorize('ADMIN', 'EMPLOYER', 'DIRECTOR', 'TREASURER'),
  validate([
    body('month')
      .isInt({ min: 1, max: 12 })
      .withMessage('Month must be between 1 and 12'),
    body('year')
      .isInt({ min: 2000 })
      .withMessage('Year must be a valid year'),
  ]),
  processMonthlyPayroll
);

// Approve: Secretary approves, Treasurer explicitly excluded
router.put('/:id/approve', authorize('ADMIN', 'EMPLOYER', 'DIRECTOR', 'SECRETARY'), approvePayroll);
router.put('/:id/lock', authorize('ADMIN', 'EMPLOYER', 'DIRECTOR', 'SECRETARY'), lockPayroll);

router.put(
  '/:id',
  authorize('ADMIN', 'EMPLOYER', 'DIRECTOR'),
  validate([
    body('baseSalary').optional().isNumeric(),
    body('travellingAllowance').optional().isNumeric(),
    body('otherAllowances').optional().isNumeric(),
  ]),
  updatePayroll
);

router.delete('/:id', authorize('ADMIN', 'EMPLOYER', 'DIRECTOR'), deletePayroll);

export default router;
