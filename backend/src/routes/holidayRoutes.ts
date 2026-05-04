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
import { authenticate, authorize, HR_ROLES } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', getAllHolidays);
router.get('/upcoming', getUpcomingHolidays);
router.get('/:id', getHolidayById);

router.post(
  '/',
  authorize(...HR_ROLES),
  validate([
    body('name').notEmpty().withMessage('Holiday name is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ]),
  createHoliday
);

router.put(
  '/:id',
  authorize(...HR_ROLES),
  validate([
    body('name').optional().notEmpty(),
    body('date').optional().isISO8601(),
  ]),
  updateHoliday
);

router.delete('/:id', authorize(...HR_ROLES), deleteHoliday);

export default router;
