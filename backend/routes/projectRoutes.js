import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    getProjects,
    getProject,
    createProject,
    updateProject,
    submitResponse,
    submitProjectUpdate,
    getProjectUpdates,
    reviewProjectUpdate,
    deleteProject
} from '../controllers/projectController.js';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Routes accessible by all authorized users (filtering logic is in controller)
router.get('/', getProjects);
router.get('/:id', getProject);

// HR/Admin only routes
router.post('/', authorize('admin', 'HRManager', 'HRExecutive'), createProject);
router.put('/:id', authorize('admin', 'HRManager', 'HRExecutive'), updateProject);
router.delete('/:id', authorize('admin', 'HRManager', 'HRExecutive'), deleteProject);

// Response routes
router.post('/:id/response', submitResponse);
router.post('/:id/updates', submitProjectUpdate);
router.get('/:id/updates', getProjectUpdates);
router.patch('/:id/updates/:updateId/review', reviewProjectUpdate);

export default router;
