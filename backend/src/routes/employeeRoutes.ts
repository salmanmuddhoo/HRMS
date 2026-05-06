import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  getEmployeeStats,
  deleteEmployee,
  resetEmployeePassword,
  bulkSetCompensation,
  upsertEmployeeCompensation,
  deleteEmployeeCompensation,
  getEmployeeTransfers,
  upsertEmployeeTransfer,
  deleteEmployeeTransfer,
} from '../controllers/employeeController';
import { authenticate, authorize, HR_ROLES } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', getAllEmployees);
router.get('/stats', authorize(...HR_ROLES), getEmployeeStats);
router.get('/:id', getEmployeeById);

router.post(
  '/',
  authorize('ADMIN'),
  validate([
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('jobTitle').notEmpty().withMessage('Job title is required'),
    body('joiningDate').isISO8601().withMessage('Valid joining date is required'),
    body('baseSalary').isNumeric().withMessage('Base salary must be a number'),
  ]),
  createEmployee
);

router.put(
  '/:id',
  authorize(...HR_ROLES),
  validate([
    body('firstName').optional().notEmpty(),
    body('lastName').optional().notEmpty(),
    body('department').optional().notEmpty(),
    body('jobTitle').optional().notEmpty(),
    body('baseSalary').optional().isNumeric(),
  ]),
  updateEmployee
);

router.patch('/:id/deactivate', authorize(...HR_ROLES), deactivateEmployee);

router.post(
  '/bulk-compensation',
  authorize(...HR_ROLES),
  validate([
    body('label').notEmpty().withMessage('Label is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
  ]),
  bulkSetCompensation
);

// Per-employee compensation management
router.post(
  '/:id/compensations',
  authorize(...HR_ROLES),
  validate([
    body('label').notEmpty().withMessage('Label is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
  ]),
  upsertEmployeeCompensation
);
router.delete('/:id/compensations/:compensationId', authorize(...HR_ROLES), deleteEmployeeCompensation);

// Per-employee transfer elections
router.get('/:id/transfers', getEmployeeTransfers);
router.post(
  '/:id/transfers',
  authorize(...HR_ROLES),
  validate([
    body('accountType').notEmpty().withMessage('accountType is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
  ]),
  upsertEmployeeTransfer
);
router.delete('/:id/transfers/:transferId', authorize(...HR_ROLES), deleteEmployeeTransfer);

// Hard delete — ADMIN only
router.delete('/:id', authorize('ADMIN'), deleteEmployee);

router.post(
  '/:id/reset-password',
  authorize(...HR_ROLES),
  validate([body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')]),
  resetEmployeePassword
);

export default router;
