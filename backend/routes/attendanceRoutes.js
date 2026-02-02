import express from 'express';
import {
    getAttendanceRecords,
    checkIn,
    checkOut,
    getTodayAttendance,
    regularizeAttendance,
    getAttendanceSummary
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee self-service routes
router.get('/today', getTodayAttendance);
router.post('/check-in', auditLog('CHECK_IN'), checkIn);
router.post('/check-out', auditLog('CHECK_OUT'), checkOut);
router.get('/summary', getAttendanceSummary);

// Admin/HR routes
router.get('/', getAttendanceRecords);

// Regularize/correct attendance - HRManager, HRExecutive, DepartmentManager
router.post('/:id/regularize',
    authorize('admin', 'HRManager', 'HRExecutive', 'DepartmentManager'),
    auditLog('ATTENDANCE_REGULARIZE'),
    regularizeAttendance
);

export default router;
