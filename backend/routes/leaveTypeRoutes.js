import express from 'express';
import {
    getLeaveTypes,
    getLeaveType,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType
} from '../controllers/leaveTypeController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get leave types - all authenticated users can view
router.route('/')
    .get(getLeaveTypes)
    .post(authorize('admin', 'HRManager'), auditLog('LEAVE_TYPE_CREATE'), createLeaveType);

// Configure leave policies - Only HRManager can create/update/delete
router.route('/:id')
    .get(getLeaveType)
    .put(authorize('admin', 'HRManager'), auditLog('LEAVE_TYPE_UPDATE'), updateLeaveType)
    .delete(authorize('admin', 'HRManager'), auditLog('LEAVE_TYPE_DELETE'), deleteLeaveType);

export default router;
