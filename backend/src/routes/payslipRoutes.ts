import { Router } from 'express';
import {
  generatePayslip,
  downloadPayslip,
  getEmployeePayslips,
} from '../controllers/payslipController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/generate/:payrollId', generatePayslip);
router.get('/download/:payrollId', downloadPayslip);
router.get('/employee/:employeeId', getEmployeePayslips);

export default router;
