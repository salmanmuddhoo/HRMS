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

router.post(
  '/process',
  authorize('ADMIN', 'EMPLOYER'),
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

router.put('/:id/approve', authorize('ADMIN', 'EMPLOYER'), approvePayroll);
router.put('/:id/lock', authorize('ADMIN', 'EMPLOYER'), lockPayroll);

router.put(
  '/:id',
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('baseSalary').optional().isNumeric(),
    body('travellingAllowance').optional().isNumeric(),
    body('otherAllowances').optional().isNumeric(),
  ]),
  updatePayroll
);

router.delete('/:id', authorize('ADMIN', 'EMPLOYER'), deletePayroll);

export default router;
