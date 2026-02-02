import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    getAuditLogs,
    getEntityHistory,
    getUserActivity,
    getSecurityEvents,
    getAuditAnalytics,
    exportLogs
} from '../controllers/auditController.js';

const router = express.Router();

router.use(protect);

// Only Admins can access audit logs
router.use(authorize('admin', 'HRManager'));

// Main audit logs endpoint
router.get('/', getAuditLogs);

// Analytics dashboard
router.get('/analytics', getAuditAnalytics);

// Security events
router.get('/security', getSecurityEvents);

// Entity history
router.get('/entity', getEntityHistory);

// User activity
router.get('/user/:userId?', getUserActivity);

// Export logs
router.get('/export', exportLogs);

export default router;
