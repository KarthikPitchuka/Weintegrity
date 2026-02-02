import express from 'express';
import {
    getHolidays,
    getUpcomingHolidays,
    getHoliday,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    bulkCreateHolidays
} from '../controllers/holidayController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (for all authenticated users)
router.get('/upcoming', getUpcomingHolidays);
router.get('/', getHolidays);
router.get('/:id', getHoliday);

// HR/Admin only routes
router.post('/', authorize('admin', 'HRManager', 'HRExecutive', 'hr'), auditLog('HOLIDAY_CREATE'), createHoliday);
router.post('/bulk', authorize('admin', 'HRManager'), auditLog('HOLIDAY_BULK_CREATE'), bulkCreateHolidays);
router.put('/:id', authorize('admin', 'HRManager', 'HRExecutive', 'hr'), auditLog('HOLIDAY_UPDATE'), updateHoliday);
router.delete('/:id', authorize('admin', 'HRManager'), auditLog('HOLIDAY_DELETE'), deleteHoliday);

export default router;
