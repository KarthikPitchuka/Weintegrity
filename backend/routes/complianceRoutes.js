import express from 'express';
import {
    getComplianceItems,
    getComplianceItem,
    createComplianceItem,
    updateComplianceItem,
    deleteComplianceItem,
    updateRequirementStatus,
    addAuditRecord,
    getComplianceDashboard
} from '../controllers/complianceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard', authorize('admin', 'HRManager', 'PayrollOfficer'), getComplianceDashboard);

// CRUD routes
router.route('/')
    .get(authorize('admin', 'HRManager', 'PayrollOfficer', 'Employee'), getComplianceItems)
    .post(authorize('admin', 'HRManager'), auditLog('COMPLIANCE_CREATE'), createComplianceItem);

router.route('/:id')
    .get(authorize('admin', 'HRManager', 'PayrollOfficer', 'Employee'), getComplianceItem)
    .put(authorize('admin', 'HRManager', 'PayrollOfficer', 'Employee'), auditLog('COMPLIANCE_UPDATE'), updateComplianceItem)
    .delete(authorize('admin', 'HRManager'), auditLog('COMPLIANCE_DELETE'), deleteComplianceItem);

// Requirement and audit routes
router.put('/:id/requirements/:requirementIndex',
    authorize('admin', 'HRManager', 'PayrollOfficer', 'Employee'),
    auditLog('REQUIREMENT_UPDATE'),
    updateRequirementStatus
);

router.post('/:id/audit',
    authorize('admin', 'HRManager'),
    auditLog('AUDIT_RECORD_ADD'),
    addAuditRecord
);

export default router;
