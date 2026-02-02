import express from 'express';
import {
    getJobPostings,
    getJobPosting,
    createJobPosting,
    updateJobPosting,
    deleteJobPosting,
    applyForJob,
    updateApplicantStatus
} from '../controllers/recruitmentController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Public routes - Anyone can apply for a job
router.post('/:id/apply', applyForJob);

// Protected routes
router.use(protect);

// View job postings - HRManager, HRExecutive
router.route('/')
    .get(authorize('admin', 'HRManager', 'HRExecutive'), getJobPostings)
    .post(authorize('admin', 'HRManager', 'HRExecutive'), auditLog('JOB_CREATE'), createJobPosting);

router.route('/:id')
    .get(authorize('admin', 'HRManager', 'HRExecutive'), getJobPosting)
    .put(authorize('admin', 'HRManager', 'HRExecutive'), auditLog('JOB_UPDATE'), updateJobPosting)
    .delete(authorize('admin', 'HRManager'), auditLog('JOB_DELETE'), deleteJobPosting);

// Update applicant status - HRManager, HRExecutive
router.put('/:id/applicants/:applicantId',
    authorize('admin', 'HRManager', 'HRExecutive'),
    auditLog('APPLICANT_STATUS_UPDATE'),
    updateApplicantStatus
);

export default router;
