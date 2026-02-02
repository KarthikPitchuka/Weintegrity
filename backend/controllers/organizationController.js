import Company from '../models/Company.js';
import Branch from '../models/Branch.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';

// ============ COMPANY CONTROLLERS ============

export const createCompany = async (req, res) => {
    try {
        const company = new Company({
            ...req.body,
            createdBy: req.user._id
        });
        await company.save();
        res.status(201).json(company);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getCompanies = async (req, res) => {
    try {
        const { status = 'active', page = 1, limit = 50 } = req.query;
        const query = status !== 'all' ? { status } : {};

        const companies = await Company.find(query)
            .populate('parentCompany', 'name code')
            .populate('createdBy', 'name email')
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Company.countDocuments(query);
        res.json({ companies, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCompanyById = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id)
            .populate('parentCompany', 'name code')
            .populate('createdBy', 'name email');
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCompany = async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json(company);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteCompany = async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json({ message: 'Company deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ BRANCH CONTROLLERS ============

export const createBranch = async (req, res) => {
    try {
        const branch = new Branch({
            ...req.body,
            createdBy: req.user._id
        });
        await branch.save();
        res.status(201).json(branch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getBranches = async (req, res) => {
    try {
        const { company, status = 'active', city, state } = req.query;
        const query = {};
        if (company) query.company = company;
        if (status !== 'all') query.status = status;
        if (city) query['address.city'] = new RegExp(city, 'i');
        if (state) query['address.state'] = new RegExp(state, 'i');

        const branches = await Branch.find(query)
            .populate('company', 'name code')
            .populate('branchHead', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .sort({ name: 1 });

        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id)
            .populate('company', 'name code')
            .populate('branchHead', 'personalInfo.firstName personalInfo.lastName employeeCode');
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBranch = async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json({ message: 'Branch deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ DEPARTMENT CONTROLLERS ============

export const createDepartment = async (req, res) => {
    try {
        const department = new Department({
            ...req.body,
            createdBy: req.user._id
        });
        await department.save();
        res.status(201).json(department);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getDepartments = async (req, res) => {
    try {
        const { company, status = 'active', flat = 'false' } = req.query;
        const query = {};
        if (company) query.company = company;
        if (status !== 'all') query.status = status;

        let departments = await Department.find(query)
            .populate('company', 'name code')
            .populate('parentDepartment', 'name code')
            .populate('departmentHead', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('branch', 'name code')
            .sort({ level: 1, name: 1 });

        // Get employee counts for each department
        // Since Employee.employmentInfo.department is stored as a String (department name),
        // we need to count by matching the department name
        const Employee = (await import('../models/Employee.js')).default;

        // Get all employee counts grouped by department name
        const employeeCounts = await Employee.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$employmentInfo.department',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Create a map for quick lookup
        const countMap = {};
        employeeCounts.forEach(ec => {
            countMap[ec._id] = ec.count;
        });

        // Add employee counts to departments
        departments = departments.map(d => {
            const dObj = d.toObject();
            dObj.employeeCount = countMap[d.name] || 0;
            return dObj;
        });

        // Build hierarchy tree if not flat
        if (flat !== 'true') {
            const deptMap = {};
            departments.forEach(d => { deptMap[d._id.toString()] = { ...d, children: [] }; });

            const tree = [];
            departments.forEach(d => {
                const dObj = deptMap[d._id.toString()];
                if (d.parentDepartment) {
                    const parent = deptMap[d.parentDepartment._id?.toString() || d.parentDepartment.toString()];
                    if (parent) parent.children.push(dObj);
                    else tree.push(dObj);
                } else {
                    tree.push(dObj);
                }
            });
            return res.json({ departments: tree, flat: departments });
        }

        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('company', 'name code')
            .populate('parentDepartment', 'name code')
            .populate('departmentHead', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('branch', 'name code');
        if (!department) return res.status(404).json({ message: 'Department not found' });

        const hierarchyPath = await department.getHierarchyPath();
        res.json({ ...department.toObject(), hierarchyPath });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!department) return res.status(404).json({ message: 'Department not found' });
        res.json(department);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        // Check for child departments
        const children = await Department.find({ parentDepartment: req.params.id });
        if (children.length > 0) {
            return res.status(400).json({ message: 'Cannot delete department with sub-departments' });
        }
        const department = await Department.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
        if (!department) return res.status(404).json({ message: 'Department not found' });
        res.json({ message: 'Department deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ DESIGNATION CONTROLLERS ============

export const createDesignation = async (req, res) => {
    try {
        const designation = new Designation({
            ...req.body,
            createdBy: req.user._id
        });
        await designation.save();
        res.status(201).json(designation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getDesignations = async (req, res) => {
    try {
        const { company, status = 'active', level, category, jobFamily } = req.query;
        const query = {};
        if (company) query.company = company;
        if (status !== 'all') query.status = status;
        if (level) query.level = parseInt(level);
        if (category) query.category = category;
        if (jobFamily) query.jobFamily = jobFamily;

        const designations = await Designation.find(query)
            .populate('company', 'name code')
            .populate('company', 'name code')
            .populate('reportsTo', 'name level')
            .sort({ level: 1, name: 1 });

        res.json(designations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDesignationById = async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id)
            .populate('company', 'name code')

            .populate('reportsTo', 'name level')
            .populate('careerPath.previousDesignations', 'name level')
            .populate('careerPath.nextDesignations', 'name level')
            .populate('allowedDepartments', 'name code');
        if (!designation) return res.status(404).json({ message: 'Designation not found' });
        res.json(designation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateDesignation = async (req, res) => {
    try {
        const designation = await Designation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!designation) return res.status(404).json({ message: 'Designation not found' });
        res.json(designation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteDesignation = async (req, res) => {
    try {
        const designation = await Designation.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
        if (!designation) return res.status(404).json({ message: 'Designation not found' });
        res.json({ message: 'Designation deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// ============ GRADE CONTROLLERS ============

export const createGrade = async (req, res) => {
    try {
        const grade = new Grade({
            ...req.body,
            createdBy: req.user._id
        });
        await grade.save();
        res.status(201).json(grade);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getGrades = async (req, res) => {
    try {
        const { status = 'active' } = req.query;
        const query = status !== 'all' ? { status } : {};

        const grades = await Grade.find(query)
            .sort({ level: 1, name: 1 });

        res.json(grades);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGradeById = async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.id);
        if (!grade) return res.status(404).json({ message: 'Grade not found' });
        res.json(grade);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateGrade = async (req, res) => {
    try {
        const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!grade) return res.status(404).json({ message: 'Grade not found' });
        res.json(grade);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteGrade = async (req, res) => {
    try {
        const grade = await Grade.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
        if (!grade) return res.status(404).json({ message: 'Grade not found' });
        res.json({ message: 'Grade deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ SHIFT CONTROLLERS ============

export const createShift = async (req, res) => {
    try {
        const shift = new Shift({
            ...req.body,
            createdBy: req.user._id
        });
        await shift.save();
        res.status(201).json(shift);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getShifts = async (req, res) => {
    try {
        const { company, status = 'active', type } = req.query;
        const query = {};
        if (company) query.company = company;
        if (status !== 'all') query.status = status;
        if (type) query.type = type;

        const shifts = await Shift.find(query)
            .populate('company', 'name code')
            .populate('applicableTo.departments', 'name code')
            .populate('applicableTo.branches', 'name code')
            .sort({ name: 1 });

        res.json(shifts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getShiftById = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id)
            .populate('company', 'name code')
            .populate('applicableTo.departments', 'name code')
            .populate('applicableTo.branches', 'name code')
            .populate('applicableTo.designations', 'name level');
        if (!shift) return res.status(404).json({ message: 'Shift not found' });

        const workingHours = shift.calculateWorkingHours();
        res.json({ ...shift.toObject(), calculatedWorkingHours: workingHours });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateShift = async (req, res) => {
    try {
        const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!shift) return res.status(404).json({ message: 'Shift not found' });
        res.json(shift);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteShift = async (req, res) => {
    try {
        const shift = await Shift.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
        if (!shift) return res.status(404).json({ message: 'Shift not found' });
        res.json({ message: 'Shift deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
