import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    generateAttendanceReport,
    generatePayrollReport,
    generateLeaveReport,
    generateTurnoverReport
} from '../controllers/reportController.js';

const router = express.Router();

// All report routes require authentication and HR/Admin role
router.use(protect);
router.use(authorize('admin', 'HRManager', 'HRExecutive'));

router.get('/attendance', generateAttendanceReport);
router.get('/payroll', generatePayrollReport);
router.get('/leave', generateLeaveReport);
router.get('/turnover', generateTurnoverReport);

export default router;
