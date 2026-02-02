import express from 'express';
import {
    getSalaryStructures,
    getSalaryStructureByEmployee,
    upsertSalaryStructure,
    getPayrollList,
    getPayrollById,
    processPayroll,
    approvePayroll,
    bulkApprovePayroll,
    lockPayroll,
    generatePayslip,
    getPayslipById,
    getPayslipByPayrollId,
    getEmployeePayslips,
    getMyPayslips,
    getPayrollHistory,
    getPayrollDashboard
} from '../controllers/payrollController.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard', authorize('admin', 'HRManager', 'PayrollOfficer'), getPayrollDashboard);

// My payslips (must be before /:id routes)
router.get('/my-payslips', getMyPayslips);

// Salary Structure routes
router.get('/salary-structures', authorize('admin', 'HRManager', 'PayrollOfficer'), getSalaryStructures);
router.get('/salary-structures/employee/:employeeId', authorize('admin', 'HRManager', 'PayrollOfficer'), getSalaryStructureByEmployee);
router.post('/salary-structures', authorize('admin', 'HRManager'), auditLog('SALARY_STRUCTURE_CREATE'), upsertSalaryStructure);

// Payslip routes (must be before /:id to avoid conflicts)
router.get('/payslips/:id', getPayslipById);
router.get('/payslips/employee/:employeeId', authorize('admin', 'HRManager', 'PayrollOfficer'), getEmployeePayslips);

// Payroll Processing routes
router.get('/', authorize('admin', 'HRManager', 'PayrollOfficer', 'Employee'), getPayrollList);
router.get('/history/:employeeId', authorize('admin', 'HRManager', 'PayrollOfficer'), getPayrollHistory);
router.post('/process', authorize('admin', 'HRManager', 'PayrollOfficer'), auditLog('PAYROLL_PROCESS'), processPayroll);

// Approval routes
router.put('/approve-bulk', authorize('admin', 'HRManager'), auditLog('PAYROLL_BULK_APPROVE'), bulkApprovePayroll);

// Payroll by ID routes (at the end to avoid conflicts)
router.get('/:id', authorize('admin', 'HRManager', 'PayrollOfficer', 'Employee'), getPayrollById);
router.put('/:id/approve', authorize('admin', 'HRManager'), auditLog('PAYROLL_APPROVE'), approvePayroll);
router.put('/:id/lock', authorize('admin'), auditLog('PAYROLL_LOCK'), lockPayroll);
router.post('/:id/payslip', authorize('admin', 'HRManager', 'PayrollOfficer'), auditLog('PAYSLIP_GENERATE'), generatePayslip);
router.get('/:id/payslip', getPayslipByPayrollId);

export default router;
