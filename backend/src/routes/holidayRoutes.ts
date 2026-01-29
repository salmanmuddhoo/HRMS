import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getUpcomingHolidays,
  uploadHolidays,
} from '../controllers/holidayController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Configure multer for Excel file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

router.get('/', getAllHolidays);
router.get('/upcoming', getUpcomingHolidays);

// Upload holidays from Excel file - must come before /:id route
router.post(
  '/upload',
  authorize('ADMIN', 'EMPLOYER'),
  upload.single('file'),
  uploadHolidays
);

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
