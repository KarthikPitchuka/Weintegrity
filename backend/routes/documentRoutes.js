import express from 'express';
import {
    getDocuments,
    getDocument,
    uploadDocument,
    updateDocument,
    deleteDocument,
    verifyDocument,
    downloadDocument,
    viewDocument,
    serveFileByName,
    upload
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Route for serving actual file stream via URL - Publicly accessible for <img> tags
// MUST BE PLACED BEFORE /:id logic, otherwise "files" is interpreted as an ID
router.get('/files/:filename', serveFileByName);

// All other routes require authentication
router.use(protect);

// CRUD routes with file upload
router.route('/')
    .get(getDocuments)
    .post(upload.single('file'), auditLog('DOCUMENT_UPLOAD'), uploadDocument);

router.route('/:id')
    .get(getDocument)
    .put(auditLog('DOCUMENT_UPDATE'), updateDocument)
    .delete(authorize('admin', 'HRManager', 'HRExecutive', 'SuperAdmin', 'Employee'), auditLog('DOCUMENT_DELETE'), deleteDocument);

// View (inline) and Download
router.get('/:id/view', viewDocument);
router.get('/:id/download', downloadDocument);

// Verification
router.put('/:id/verify',
    authorize('admin', 'HRManager', 'HRExecutive', 'SuperAdmin'),
    auditLog('DOCUMENT_VERIFY'),
    verifyDocument
);

export default router;
