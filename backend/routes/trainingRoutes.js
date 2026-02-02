import express from 'express';
import {
    getTrainings,
    getTraining,
    createTraining,
    updateTraining,
    deleteTraining,
    registerForTraining,
    updateParticipantAttendance,
    submitFeedback
} from '../controllers/trainingController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// CRUD routes
router.route('/')
    .get(getTrainings)
    .post(authorize('admin', 'HRManager', 'HRExecutive'), auditLog('TRAINING_CREATE'), createTraining);

router.route('/:id')
    .get(getTraining)
    .put(authorize('admin', 'HRManager', 'HRExecutive'), auditLog('TRAINING_UPDATE'), updateTraining)
    .delete(authorize('admin', 'HRManager'), auditLog('TRAINING_DELETE'), deleteTraining);

// Registration and attendance
router.post('/:id/register', auditLog('TRAINING_REGISTER'), registerForTraining);
router.put('/:id/attendance/:participantId',
    authorize('admin', 'HRManager', 'HRExecutive'),
    updateParticipantAttendance
);

// Feedback
router.post('/:id/feedback', submitFeedback);

export default router;
