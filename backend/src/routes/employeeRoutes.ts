import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  getEmployeeStats,
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllEmployees);
router.get('/stats', authorize('ADMIN', 'EMPLOYER'), getEmployeeStats);
router.get('/:id', getEmployeeById);

router.post(
  '/',
  authorize('ADMIN', 'EMPLOYER'),
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
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('firstName').optional().notEmpty(),
    body('lastName').optional().notEmpty(),
    body('department').optional().notEmpty(),
    body('jobTitle').optional().notEmpty(),
    body('baseSalary').optional().isNumeric(),
  ]),
  updateEmployee
);

router.delete('/:id', authorize('ADMIN', 'EMPLOYER'), deactivateEmployee);

export default router;
