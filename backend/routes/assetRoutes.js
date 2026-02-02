import express from 'express';
import {
    getAssets,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    assignAsset,
    returnAsset,
    addMaintenance,
    getAssetStats
} from '../controllers/assetController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Statistics route
router.get('/stats', authorize('admin', 'hr'), getAssetStats);

// CRUD routes
router.route('/')
    .get(getAssets)
    .post(authorize('admin', 'hr'), auditLog('ASSET_CREATE'), createAsset);

router.route('/:id')
    .get(getAsset)
    .put(authorize('admin', 'hr'), auditLog('ASSET_UPDATE'), updateAsset)
    .delete(authorize('admin'), auditLog('ASSET_DELETE'), deleteAsset);

// Assignment routes
router.post('/:id/assign',
    authorize('admin', 'hr'),
    auditLog('ASSET_ASSIGN'),
    assignAsset
);

router.post('/:id/return',
    authorize('admin', 'hr'),
    auditLog('ASSET_RETURN'),
    returnAsset
);

// Maintenance
router.post('/:id/maintenance',
    authorize('admin', 'hr'),
    auditLog('ASSET_MAINTENANCE'),
    addMaintenance
);

export default router;
