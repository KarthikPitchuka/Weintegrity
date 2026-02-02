import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    // Salary Structure
    createSalaryStructure, getSalaryStructures, getActiveSalaryStructure,
    updateSalaryStructure, approveSalaryStructure,
    // Salary Revision
    createSalaryRevision, getSalaryRevisions, approveSalaryRevision,
    // Tax Declaration
    createTaxDeclaration, getTaxDeclarations, getMyTaxDeclaration,
    updateTaxDeclaration, calculateTax,
    // Reimbursement
    createReimbursement, getReimbursements, getMyReimbursements, approveReimbursement,
    // Loan
    createLoan, getLoans, getMyLoans, approveLoan, disburseLoan, recordEmiPayment
} from '../controllers/salaryController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// ============ SALARY STRUCTURE ROUTES ============
router.route('/structures')
    .get(authorize('admin', 'HRManager', 'PayrollOfficer'), getSalaryStructures)
    .post(authorize('admin', 'HRManager', 'PayrollOfficer'), createSalaryStructure);

router.get('/structures/employee/:employeeId', authorize('admin', 'HRManager', 'PayrollOfficer'), getActiveSalaryStructure);

router.route('/structures/:id')
    .put(authorize('admin', 'HRManager', 'PayrollOfficer'), updateSalaryStructure);

router.post('/structures/:id/approve', authorize('admin', 'HRManager'), approveSalaryStructure);

// ============ SALARY REVISION ROUTES ============
router.route('/revisions')
    .get(authorize('admin', 'HRManager', 'PayrollOfficer'), getSalaryRevisions)
    .post(authorize('admin', 'HRManager'), createSalaryRevision);

router.post('/revisions/:id/approve', authorize('admin', 'HRManager', 'PayrollOfficer'), approveSalaryRevision);

// ============ TAX DECLARATION ROUTES ============
router.route('/tax-declarations')
    .get(authorize('admin', 'HRManager', 'PayrollOfficer'), getTaxDeclarations)
    .post(createTaxDeclaration);

router.get('/tax-declarations/my', getMyTaxDeclaration);

router.route('/tax-declarations/:id')
    .put(updateTaxDeclaration);

router.post('/tax-declarations/:id/calculate', calculateTax);

// ============ REIMBURSEMENT ROUTES ============
router.route('/reimbursements')
    .get(authorize('admin', 'HRManager', 'PayrollOfficer', 'DepartmentManager'), getReimbursements)
    .post(createReimbursement);

router.get('/reimbursements/my', getMyReimbursements);

router.post('/reimbursements/:id/approve', authorize('admin', 'HRManager', 'PayrollOfficer', 'DepartmentManager'), approveReimbursement);

// ============ LOAN ROUTES ============
router.route('/loans')
    .get(authorize('admin', 'HRManager', 'PayrollOfficer'), getLoans)
    .post(createLoan);

router.get('/loans/my', getMyLoans);

router.post('/loans/:id/approve', authorize('admin', 'HRManager', 'PayrollOfficer'), approveLoan);
router.post('/loans/:id/disburse', authorize('admin', 'PayrollOfficer'), disburseLoan);
router.post('/loans/:id/pay-emi', authorize('admin', 'PayrollOfficer'), recordEmiPayment);

export default router;
