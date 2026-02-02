import express from 'express';
import {
    getLeaves,
    getPendingLeaves,
    getLeave,
    applyLeave,
    updateLeave,
    approveLeave,
    cancelLeave,
    getLeaveBalance
} from '../controllers/leaveController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Leave balance - All users can check their balance
router.get('/balance', getLeaveBalance);

// Get pending leaves - for approvers (uses dedicated function that only returns pending)
router.get('/pending', authorize('admin', 'HRManager', 'HRExecutive', 'DepartmentManager'), getPendingLeaves);

// CRUD routes
router.route('/')
    .get(getLeaves)
    .post(auditLog('LEAVE_APPLY'), applyLeave);

router.route('/:id')
    .get(getLeave)
    .put(auditLog('LEAVE_UPDATE'), updateLeave);

// Approval routes - HRManager, HRExecutive, DepartmentManager can approve
router.put('/:id/approve',
    authorize('admin', 'HRManager', 'HRExecutive', 'DepartmentManager'),
    auditLog('LEAVE_APPROVE'),
    approveLeave
);

router.put('/:id/cancel', auditLog('LEAVE_CANCEL'), cancelLeave);

export default router;
