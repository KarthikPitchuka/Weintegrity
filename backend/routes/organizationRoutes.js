import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    // Company
    createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany,
    // Branch
    createBranch, getBranches, getBranchById, updateBranch, deleteBranch,
    // Department
    createDepartment, getDepartments, getDepartmentById, updateDepartment, deleteDepartment,
    // Designation
    createDesignation, getDesignations, getDesignationById, updateDesignation, deleteDesignation,
    // Grade
    createGrade, getGrades, getGradeById, updateGrade, deleteGrade,
    // Shift
    createShift, getShifts, getShiftById, updateShift, deleteShift
} from '../controllers/organizationController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// ============ COMPANY ROUTES ============
router.route('/companies')
    .get(getCompanies)
    .post(authorize('admin', 'HRManager'), createCompany);

router.route('/companies/:id')
    .get(getCompanyById)
    .put(authorize('admin', 'HRManager'), updateCompany)
    .delete(authorize('admin'), deleteCompany);

// ============ BRANCH ROUTES ============
router.route('/branches')
    .get(getBranches)
    .post(authorize('admin', 'HRManager'), createBranch);

router.route('/branches/:id')
    .get(getBranchById)
    .put(authorize('admin', 'HRManager'), updateBranch)
    .delete(authorize('admin'), deleteBranch);

// ============ DEPARTMENT ROUTES ============
router.route('/departments')
    .get(getDepartments)
    .post(authorize('admin', 'HRManager'), createDepartment);

router.route('/departments/:id')
    .get(getDepartmentById)
    .put(authorize('admin', 'HRManager'), updateDepartment)
    .delete(authorize('admin', 'HRManager'), deleteDepartment);

// ============ DESIGNATION ROUTES ============
router.route('/designations')
    .get(getDesignations)
    .post(authorize('admin', 'HRManager'), createDesignation);

router.route('/designations/:id')
    .get(getDesignationById)
    .put(authorize('admin', 'HRManager'), updateDesignation)
    .delete(authorize('admin', 'HRManager'), deleteDesignation);



// ============ GRADE ROUTES ============
router.route('/grades')
    .get(getGrades)
    .post(authorize('admin', 'HRManager'), createGrade);

router.route('/grades/:id')
    .get(getGradeById)
    .put(authorize('admin', 'HRManager'), updateGrade)
    .delete(authorize('admin', 'HRManager'), deleteGrade);

// ============ SHIFT ROUTES ============
router.route('/shifts')
    .get(getShifts)
    .post(authorize('admin', 'HRManager'), createShift);

router.route('/shifts/:id')
    .get(getShiftById)
    .put(authorize('admin', 'HRManager'), updateShift)
    .delete(authorize('admin', 'HRManager'), deleteShift);

export default router;
