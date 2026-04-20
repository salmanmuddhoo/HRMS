import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getUpcomingHolidays,
} from '../controllers/holidayController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllHolidays);
router.get('/upcoming', getUpcomingHolidays);
router.get('/:id', getHolidayById);

router.post(
  '/',
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('name').notEmpty().withMessage('Holiday name is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ]),
  createHoliday
);

router.put(
  '/:id',
  authorize('ADMIN', 'EMPLOYER'),
  validate([
    body('name').optional().notEmpty(),
    body('date').optional().isISO8601(),
  ]),
  updateHoliday
);

router.delete('/:id', authorize('ADMIN', 'EMPLOYER'), deleteHoliday);

export default router;
