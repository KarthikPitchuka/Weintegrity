import express from 'express';
import {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
    resendEmployeeVerification
} from '../controllers/employeeController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Statistics route - HRManager, HRExecutive can view stats
// Also include 'hr' for backward compatibility with old role names
router.get('/stats', authorize('admin', 'HRManager', 'HRExecutive', 'hr'), getEmployeeStats);

// CRUD routes
router.route('/')
    .get(authorize('admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'hr', 'manager'), getEmployees)
    .post(authorize('admin', 'HRManager', 'HRExecutive', 'hr'), auditLog('EMPLOYEE_CREATE'), createEmployee);

router.route('/:id')
    .get(authorize('admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'hr', 'manager'), getEmployee)
    .put(authorize('admin', 'HRManager', 'HRExecutive', 'hr'), auditLog('EMPLOYEE_UPDATE'), updateEmployee)
    .delete(authorize('admin', 'HRManager', 'HRExecutive', 'hr'), auditLog('EMPLOYEE_DELETE'), deleteEmployee);

// Resend verification email for employee
router.post('/:id/resend-verification', authorize('admin', 'HRManager', 'HRExecutive', 'hr'), resendEmployeeVerification);

export default router;

