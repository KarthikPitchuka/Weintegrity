import express from 'express';
import {
    getPerformanceReviews,
    getPerformanceReview,
    createPerformanceReview,
    updatePerformanceReview,
    submitSelfAssessment,
    submitManagerAssessment,
    acknowledgeReview,
    deletePerformanceReview
} from '../controllers/performanceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// CRUD routes
router.route('/')
    .get(authorize('admin', 'HRManager', 'DepartmentManager', 'Employee', 'employee'), getPerformanceReviews)
    .post(authorize('admin', 'HRManager', 'DepartmentManager'), auditLog('PERFORMANCE_CREATE'), createPerformanceReview);

router.route('/:id')
    .get(authorize('admin', 'HRManager', 'DepartmentManager', 'Employee', 'employee'), getPerformanceReview)
    .put(authorize('admin', 'HRManager', 'DepartmentManager'), auditLog('PERFORMANCE_UPDATE'), updatePerformanceReview)
    .delete(authorize('admin', 'HRManager'), auditLog('PERFORMANCE_DELETE'), deletePerformanceReview);

// Assessment routes - Employee can submit self assessment
router.put('/:id/self-assessment', auditLog('SELF_ASSESSMENT'), submitSelfAssessment);

// Manager assessment - HRManager and DepartmentManager can do this
router.put('/:id/manager-assessment',
    authorize('admin', 'HRManager', 'DepartmentManager'),
    auditLog('MANAGER_ASSESSMENT'),
    submitManagerAssessment
);

// Acknowledge review - Employee acknowledges their review
router.put('/:id/acknowledge', auditLog('PERFORMANCE_ACKNOWLEDGE'), acknowledgeReview);

export default router;
