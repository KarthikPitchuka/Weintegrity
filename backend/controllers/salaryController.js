import SalaryStructure from '../models/SalaryStructure.js';
import SalaryRevision from '../models/SalaryRevision.js';
import TaxDeclaration from '../models/TaxDeclaration.js';
import Reimbursement from '../models/Reimbursement.js';
import Loan from '../models/Loan.js';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

// ============ SALARY STRUCTURE CONTROLLERS ============

export const createSalaryStructure = async (req, res) => {
    try {
        // Deactivate previous structures for the employee
        await SalaryStructure.updateMany(
            { employee: req.body.employee, status: 'active' },
            { status: 'superseded' }
        );

        const structure = new SalaryStructure({
            ...req.body,
            createdBy: req.user._id
        });
        await structure.save();
        res.status(201).json(structure);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getSalaryStructures = async (req, res) => {
    try {
        const { employee, status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (employee) query.employee = employee;
        if (status) query.status = status;

        const structures = await SalaryStructure.find(query)
            .populate('employee', 'employeeCode personalInfo.firstName personalInfo.lastName')

            .populate('designation', 'name level')
            .sort({ effectiveFrom: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await SalaryStructure.countDocuments(query);
        res.json({ structures, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getActiveSalaryStructure = async (req, res) => {
    try {
        const structure = await SalaryStructure.findOne({
            employee: req.params.employeeId,
            status: 'active'
        })
            .populate('employee', 'employeeCode personalInfo.firstName personalInfo.lastName')

            .populate('designation', 'name level');

        if (!structure) {
            return res.status(404).json({ message: 'No active salary structure found' });
        }
        res.json(structure);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSalaryStructure = async (req, res) => {
    try {
        const structure = await SalaryStructure.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!structure) return res.status(404).json({ message: 'Salary structure not found' });
        res.json(structure);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const approveSalaryStructure = async (req, res) => {
    try {
        const structure = await SalaryStructure.findById(req.params.id);
        if (!structure) return res.status(404).json({ message: 'Salary structure not found' });

        structure.status = 'active';
        structure.approvedBy = req.user._id;
        structure.approvedOn = new Date();
        await structure.save();

        res.json(structure);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ SALARY REVISION CONTROLLERS ============

export const createSalaryRevision = async (req, res) => {
    try {
        // Get current salary structure
        const currentStructure = await SalaryStructure.findOne({
            employee: req.body.employee,
            status: 'active'
        });

        const revision = new SalaryRevision({
            ...req.body,
            previousStructure: currentStructure?._id,
            previousCTC: currentStructure?.ctc?.annual,
            createdBy: req.user._id
        });
        await revision.save();
        res.status(201).json(revision);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getSalaryRevisions = async (req, res) => {
    try {
        const { employee, status, revisionType, page = 1, limit = 20 } = req.query;
        const query = {};
        if (employee) query.employee = employee;
        if (status) query.status = status;
        if (revisionType) query.revisionType = revisionType;

        const revisions = await SalaryRevision.find(query)
            .populate('employee', 'employeeCode personalInfo.firstName personalInfo.lastName')

            .populate('previousDesignation', 'name')
            .populate('newDesignation', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await SalaryRevision.countDocuments(query);
        res.json({ revisions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveSalaryRevision = async (req, res) => {
    try {
        const { level, status, comments } = req.body;
        const revision = await SalaryRevision.findById(req.params.id);
        if (!revision) return res.status(404).json({ message: 'Revision not found' });

        revision.approvals.push({
            level,
            approvedBy: req.user._id,
            status,
            comments,
            actionDate: new Date()
        });

        // Check if all approvals are done
        const allApproved = ['hr', 'finance'].every(lvl =>
            revision.approvals.some(a => a.level === lvl && a.status === 'approved')
        );

        if (allApproved) {
            revision.status = 'approved';
            revision.finalApprover = req.user._id;
            revision.approvedOn = new Date();

            // Create new salary structure
            const newStructure = new SalaryStructure({
                employee: revision.employee,
                effectiveFrom: revision.effectiveFrom,
                ctc: { annual: revision.newCTC },

                designation: revision.newDesignation,
                reason: revision.revisionType,
                status: 'active',
                createdBy: req.user._id
            });
            await newStructure.save();
            revision.newStructure = newStructure._id;

            // Deactivate old structure
            await SalaryStructure.updateOne(
                { _id: revision.previousStructure },
                { status: 'superseded', effectiveTo: revision.effectiveFrom }
            );
        } else if (status === 'rejected') {
            revision.status = 'rejected';
            revision.rejectedBy = req.user._id;
            revision.rejectedOn = new Date();
            revision.rejectionReason = comments;
        }

        await revision.save();
        res.json(revision);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ TAX DECLARATION CONTROLLERS ============

export const createTaxDeclaration = async (req, res) => {
    try {
        // Check if declaration already exists for the year
        const existing = await TaxDeclaration.findOne({
            employee: req.body.employee,
            financialYear: req.body.financialYear
        });

        if (existing) {
            return res.status(400).json({ message: 'Tax declaration already exists for this financial year' });
        }

        const declaration = new TaxDeclaration({
            ...req.body,
            createdBy: req.user._id
        });
        await declaration.save();
        res.status(201).json(declaration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getTaxDeclarations = async (req, res) => {
    try {
        const { employee, financialYear, status } = req.query;
        const query = {};
        if (employee) query.employee = employee;
        if (financialYear) query.financialYear = financialYear;
        if (status) query.status = status;

        const declarations = await TaxDeclaration.find(query)
            .populate('employee', 'employeeCode personalInfo.firstName personalInfo.lastName')
            .sort({ financialYear: -1 });

        res.json(declarations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyTaxDeclaration = async (req, res) => {
    try {
        const { financialYear } = req.query;
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        let declaration = await TaxDeclaration.findOne({
            employee: employee._id,
            financialYear: financialYear || getCurrentFinancialYear()
        });

        // Create a new draft if not exists
        if (!declaration) {
            declaration = new TaxDeclaration({
                employee: employee._id,
                financialYear: financialYear || getCurrentFinancialYear(),
                regime: 'new',
                createdBy: req.user._id
            });
            await declaration.save();
        }

        res.json(declaration);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTaxDeclaration = async (req, res) => {
    try {
        const declaration = await TaxDeclaration.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!declaration) return res.status(404).json({ message: 'Tax declaration not found' });
        res.json(declaration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const calculateTax = async (req, res) => {
    try {
        const declaration = await TaxDeclaration.findById(req.params.id);
        if (!declaration) return res.status(404).json({ message: 'Tax declaration not found' });

        // Get employee's salary structure
        const salaryStructure = await SalaryStructure.findOne({
            employee: declaration.employee,
            status: 'active'
        });

        if (!salaryStructure) {
            return res.status(400).json({ message: 'No active salary structure found' });
        }

        const grossIncome = salaryStructure.ctc.annual;
        let taxResult;

        if (declaration.regime === 'new') {
            taxResult = declaration.calculateNewRegimeTax(grossIncome);
        } else {
            taxResult = declaration.calculateOldRegimeTax(grossIncome);
        }

        // Calculate remaining months
        const now = new Date();
        const fyEnd = new Date(parseInt(declaration.financialYear.split('-')[1]), 2, 31); // March 31
        const monthsRemaining = Math.max(1, Math.ceil((fyEnd - now) / (1000 * 60 * 60 * 24 * 30)));

        declaration.taxCalculation = {
            ...taxResult,
            grossIncome,
            taxDeducted: declaration.taxCalculation?.taxDeducted || 0,
            calculatedOn: new Date()
        };
        declaration.taxCalculation.balance = taxResult.totalTax - declaration.taxCalculation.taxDeducted;
        declaration.taxCalculation.monthlyTds = Math.round(declaration.taxCalculation.balance / monthsRemaining);

        await declaration.save();
        res.json({
            declaration,
            taxSummary: {
                regime: declaration.regime,
                ...taxResult,
                monthlyTds: declaration.taxCalculation.monthlyTds,
                monthsRemaining
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ REIMBURSEMENT CONTROLLERS ============

export const createReimbursement = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        const reimbursement = new Reimbursement({
            ...req.body,
            employee: employee?._id || req.body.employee,
            createdBy: req.user._id
        });
        await reimbursement.save();
        res.status(201).json(reimbursement);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getReimbursements = async (req, res) => {
    try {
        const { employee, status, type, startDate, endDate, page = 1, limit = 20 } = req.query;
        const query = {};
        if (employee) query.employee = employee;
        if (status) query.status = status;
        if (type) query.type = type;
        if (startDate || endDate) {
            query['claimPeriod.fromDate'] = {};
            if (startDate) query['claimPeriod.fromDate'].$gte = new Date(startDate);
            if (endDate) query['claimPeriod.fromDate'].$lte = new Date(endDate);
        }

        const reimbursements = await Reimbursement.find(query)
            .populate('employee', 'employeeCode personalInfo.firstName personalInfo.lastName')
            .populate('finalApprover', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Reimbursement.countDocuments(query);
        res.json({ reimbursements, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyReimbursements = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const reimbursements = await Reimbursement.find({ employee: employee._id })
            .sort({ createdAt: -1 });

        res.json(reimbursements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveReimbursement = async (req, res) => {
    try {
        const { status, approvedAmount, comments, level } = req.body;
        const reimbursement = await Reimbursement.findById(req.params.id);
        if (!reimbursement) return res.status(404).json({ message: 'Reimbursement not found' });

        reimbursement.approvals.push({
            level,
            approver: req.user._id,
            status,
            approvedAmount,
            comments,
            actionDate: new Date()
        });

        if (status === 'approved') {
            reimbursement.status = level === 'finance' ? 'approved' : 'pending-finance';
            if (level === 'finance') {
                reimbursement.approvedAmount = approvedAmount || reimbursement.claimAmount;
                reimbursement.finalApprover = req.user._id;
                reimbursement.finalApprovedOn = new Date();
            }
        } else if (status === 'rejected') {
            reimbursement.status = 'rejected';
            reimbursement.rejectionReason = comments;
            reimbursement.rejectedBy = req.user._id;
        }

        await reimbursement.save();
        res.json(reimbursement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ============ LOAN CONTROLLERS ============

export const createLoan = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        const loan = new Loan({
            ...req.body,
            employee: employee?._id || req.body.employee,
            createdBy: req.user._id
        });
        await loan.save();
        res.status(201).json(loan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getLoans = async (req, res) => {
    try {
        const { employee, status, type, page = 1, limit = 20 } = req.query;
        const query = {};
        if (employee) query.employee = employee;
        if (status) query.status = status;
        if (type) query.type = type;

        const loans = await Loan.find(query)
            .populate('employee', 'employeeCode personalInfo.firstName personalInfo.lastName')
            .populate('finalApprover', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Loan.countDocuments(query);
        res.json({ loans, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyLoans = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const loans = await Loan.find({ employee: employee._id })
            .sort({ createdAt: -1 });

        const summary = {
            total: loans.length,
            active: loans.filter(l => ['disbursed', 'active'].includes(l.status)).length,
            totalOutstanding: loans
                .filter(l => ['disbursed', 'active'].includes(l.status))
                .reduce((sum, l) => sum + (l.balance?.total || 0), 0)
        };

        res.json({ loans, summary });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveLoan = async (req, res) => {
    try {
        const { level, status, approvedAmount, comments } = req.body;
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        loan.approvals.push({
            level,
            approver: req.user._id,
            status,
            comments,
            actionDate: new Date()
        });

        if (status === 'approved' && level === 'finance') {
            loan.status = 'approved';
            loan.approvedAmount = approvedAmount || loan.requestedAmount;
            loan.finalApprover = req.user._id;
            loan.approvedOn = new Date();
        } else if (status === 'rejected') {
            loan.status = 'rejected';
            loan.rejectionReason = comments;
            loan.rejectedBy = req.user._id;
        } else {
            loan.status = `pending-${getNextApprovalLevel(level)}`;
        }

        await loan.save();
        res.json(loan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const disburseLoan = async (req, res) => {
    try {
        const { method, transactionId, remarks, startMonth } = req.body;
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });
        if (loan.status !== 'approved') {
            return res.status(400).json({ message: 'Loan must be approved before disbursement' });
        }

        loan.disbursement = {
            status: 'disbursed',
            date: new Date(),
            method,
            transactionId,
            remarks
        };
        loan.disbursedAmount = loan.approvedAmount;
        loan.status = 'disbursed';
        loan.repayment.startMonth = startMonth || new Date();

        await loan.save();
        res.json(loan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const recordEmiPayment = async (req, res) => {
    try {
        const { installmentNumber, amount, payrollId } = req.body;
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        await loan.recordPayment(installmentNumber, amount, payrollId);
        res.json(loan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper functions
function getCurrentFinancialYear() {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
}

function getNextApprovalLevel(currentLevel) {
    const levels = { manager: 'hr', hr: 'finance', finance: 'done' };
    return levels[currentLevel] || 'hr';
}
