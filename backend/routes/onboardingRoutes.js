import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    createOnboarding,
    getOnboardings,
    getOnboardingById,
    updateTask,
    updateClearance,
    completeProcess,
    getStats
} from '../controllers/onboardingController.js';

const router = express.Router();

router.use(protect);

// Stats/dashboard
router.get('/stats', authorize('admin', 'HRManager', 'HRExecutive'), getStats);

// CRUD routes
router.route('/')
    .get(authorize('admin', 'HRManager', 'HRExecutive'), getOnboardings)
    .post(authorize('admin', 'HRManager'), createOnboarding);

router.route('/:id')
    .get(authorize('admin', 'HRManager', 'HRExecutive', 'DepartmentManager'), getOnboardingById);

// Task management
router.put('/:id/task', authorize('admin', 'HRManager', 'HRExecutive', 'DepartmentManager'), updateTask);

// Clearance (offboarding)
router.put('/:id/clearance', authorize('admin', 'HRManager', 'PayrollOfficer', 'DepartmentManager'), updateClearance);

// Complete process
router.put('/:id/complete', authorize('admin', 'HRManager'), completeProcess);

export default router;
