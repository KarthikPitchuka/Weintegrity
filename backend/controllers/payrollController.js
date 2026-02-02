import Payroll from '../models/Payroll.js';
import Payslip from '../models/Payslip.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import payrollCalculator from '../services/payrollCalculator.js';

// @desc    Get all salary structures
// @route   GET /api/payroll/salary-structures
// @access  Private (HR, Admin, Payroll)
export const getSalaryStructures = async (req, res) => {
    try {
        const { page = 1, limit = 20, employeeId, isActive } = req.query;

        const query = {};
        if (employeeId) query.employeeId = employeeId;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const salaryStructures = await SalaryStructure.find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode employmentInfo.department employmentInfo.designation')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await SalaryStructure.countDocuments(query);

        res.json({
            salaryStructures,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching salary structures', error: error.message });
    }
};

// @desc    Get salary structure by employee ID
// @route   GET /api/payroll/salary-structures/employee/:employeeId
// @access  Private
export const getSalaryStructureByEmployee = async (req, res) => {
    try {
        const salaryStructure = await SalaryStructure.findOne({
            employeeId: req.params.employeeId,
            isActive: true
        }).populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode');

        if (!salaryStructure) {
            return res.status(404).json({ message: 'Salary structure not found for this employee' });
        }

        res.json(salaryStructure);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching salary structure', error: error.message });
    }
};

// @desc    Create or Update salary structure
// @route   POST /api/payroll/salary-structures
// @access  Private (HR, Admin)
export const upsertSalaryStructure = async (req, res) => {
    try {
        const {
            employeeId,
            basicPay,
            hraPercentage,
            daPercentage,
            specialAllowance,
            conveyanceAllowance,
            medicalAllowance,
            lta,
            otherAllowances,
            overtimeRate,
            isOvertimeEligible,
            pfEnabled,
            pfPercentage,
            employerPfPercentage,
            esiEnabled,
            esiPercentage,
            employerEsiPercentage,
            professionalTax,
            effectiveFrom
        } = req.body;

        // Check if employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Use findOneAndUpdate with upsert to handle both create and update
        const salaryStructure = await SalaryStructure.findOneAndUpdate(
            { employeeId },
            {
                employeeId,
                basicPay,
                hraPercentage: hraPercentage || 40,
                daPercentage: daPercentage || 0,
                specialAllowance: specialAllowance || 0,
                conveyanceAllowance: conveyanceAllowance || 1600,
                medicalAllowance: medicalAllowance || 1250,
                lta: lta || 0,
                otherAllowances: otherAllowances || [],
                overtimeRate: overtimeRate || 0,
                isOvertimeEligible: isOvertimeEligible || false,
                pfEnabled: pfEnabled !== false,
                pfPercentage: pfPercentage || 12,
                employerPfPercentage: employerPfPercentage || 12,
                esiEnabled: esiEnabled || false,
                esiPercentage: esiPercentage || 0.75,
                employerEsiPercentage: employerEsiPercentage || 3.25,
                professionalTax: professionalTax || 200,
                effectiveFrom: effectiveFrom || new Date(),
                isActive: true,
                updatedBy: req.user._id,
                $setOnInsert: { createdBy: req.user._id }
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        await salaryStructure.populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode');

        res.status(201).json({
            message: 'Salary structure saved successfully',
            salaryStructure
        });
    } catch (error) {
        console.error('Error saving salary structure:', error);
        res.status(500).json({ message: 'Error creating salary structure', error: error.message });
    }
};

// @desc    Get payroll list for a month
// @route   GET /api/payroll
// @access  Private (HR, Admin, Payroll, Employee - own only)
export const getPayrollList = async (req, res) => {
    try {
        const { month, year, status, page = 1, limit = 50 } = req.query;

        const currentDate = new Date();
        const queryMonth = parseInt(month) || currentDate.getMonth() + 1;
        const queryYear = parseInt(year) || currentDate.getFullYear();

        const query = {
            'payPeriod.month': queryMonth,
            'payPeriod.year': queryYear
        };

        // If not HR/Admin/Payroll, only show user's own payroll records
        if (!['admin', 'HRManager', 'HRExecutive', 'PayrollOfficer'].includes(req.user.role)) {
            if (req.user.employeeId) {
                query.employeeId = req.user.employeeId;
            } else {
                // No employee linked - return empty result
                return res.json({
                    payrolls: [],
                    summary: { totalGross: 0, totalDeductions: 0, totalNet: 0, count: 0 },
                    pagination: { current: 1, pages: 0, total: 0 },
                    period: { month: queryMonth, year: queryYear, monthName: payrollCalculator.getMonthName(queryMonth) }
                });
            }
        }

        if (status) query.status = status;

        const payrolls = await Payroll.find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode employmentInfo.department employmentInfo.designation')
            .populate('processedBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ 'employeeId.employeeCode': 1 });

        const total = await Payroll.countDocuments(query);

        // Summary stats
        const summary = await Payroll.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalGross: { $sum: '$grossEarnings' },
                    totalDeductions: { $sum: '$totalDeductions' },
                    totalNet: { $sum: '$netSalary' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            payrolls,
            summary: summary[0] || { totalGross: 0, totalDeductions: 0, totalNet: 0, count: 0 },
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            },
            period: {
                month: queryMonth,
                year: queryYear,
                monthName: payrollCalculator.getMonthName(queryMonth)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payroll list', error: error.message });
    }
};

// @desc    Get single payroll details
// @route   GET /api/payroll/:id
// @access  Private
export const getPayrollById = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id)
            .populate('employeeId', 'personalInfo contactInfo employeeCode employmentInfo bankDetails')
            .populate('salaryStructureId')
            .populate('processedBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName');

        if (!payroll) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }

        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payroll', error: error.message });
    }
};

// @desc    Process payroll for a month
// @route   POST /api/payroll/process
// @access  Private (HR, Admin)
export const processPayroll = async (req, res) => {
    try {
        const { month, year, employeeIds, forceReprocess = false } = req.body;

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        // Get employees to process
        let employeesToProcess;
        if (employeeIds && employeeIds.length > 0) {
            employeesToProcess = await Employee.find({
                _id: { $in: employeeIds },
                status: 'active'
            });
        } else {
            employeesToProcess = await Employee.find({ status: 'active' });
        }

        if (employeesToProcess.length === 0) {
            return res.status(400).json({ message: 'No active employees found to process' });
        }

        const results = {
            processed: [],
            skipped: [],
            errors: []
        };

        const workingDaysInfo = payrollCalculator.calculateWorkingDays(month, year);

        for (const employee of employeesToProcess) {
            try {
                // Validate employee has required data
                if (!employee._id) {
                    results.errors.push({
                        employeeId: null,
                        employeeCode: employee.employeeCode || 'Unknown',
                        name: `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim() || 'Unknown',
                        error: 'Employee record has no valid ID'
                    });
                    continue;
                }

                // Check if payroll already exists and is locked
                const existingPayroll = await Payroll.findOne({
                    employeeId: employee._id,
                    'payPeriod.month': month,
                    'payPeriod.year': year
                });

                if (existingPayroll && existingPayroll.isLocked && !forceReprocess) {
                    results.skipped.push({
                        employeeId: employee._id,
                        employeeCode: employee.employeeCode,
                        reason: 'Payroll is locked'
                    });
                    continue;
                }

                // Get salary structure
                const salaryStructure = await SalaryStructure.findOne({
                    employeeId: employee._id,
                    isActive: true
                });

                if (!salaryStructure) {
                    results.errors.push({
                        employeeId: employee._id,
                        employeeCode: employee.employeeCode,
                        error: 'No active salary structure found'
                    });
                    continue;
                }

                // Get attendance data for the month
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);

                const attendanceRecords = await Attendance.find({
                    employeeId: employee._id,
                    date: { $gte: startDate, $lte: endDate }
                });

                // Get approved leaves
                const approvedLeaves = await Leave.find({
                    employeeId: employee._id,
                    status: 'approved',
                    startDate: { $lte: endDate },
                    endDate: { $gte: startDate }
                });

                // Calculate days worked and LOP
                let daysWorked = attendanceRecords.filter(a =>
                    a.status === 'present' || a.status === 'half-day' || a.status === 'work-from-home'
                ).length;

                let lopDays = 0;
                for (const leave of approvedLeaves) {
                    if (leave.leaveType === 'lop' || leave.leaveType === 'unpaid') {
                        lopDays += leave.totalDays || 1;
                    }
                }

                // Calculate payroll
                const attendanceData = {
                    totalWorkingDays: workingDaysInfo.workingDays,
                    daysWorked,
                    lopDays
                };

                const calculated = payrollCalculator.calculatePayroll(
                    salaryStructure.toObject(),
                    attendanceData,
                    {
                        bonus: req.body.bonuses?.[employee._id.toString()] || 0,
                        incentives: req.body.incentives?.[employee._id.toString()] || 0
                    }
                );

                // Create or update payroll record
                const payrollData = {
                    employeeId: employee._id,
                    salaryStructureId: salaryStructure._id,
                    payPeriod: {
                        month,
                        year,
                        startDate,
                        endDate
                    },
                    workingDays: {
                        totalWorkingDays: workingDaysInfo.workingDays,
                        daysWorked,
                        leaveDays: approvedLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0),
                        lopDays,
                        holidays: workingDaysInfo.holidays,
                        weekends: workingDaysInfo.weekends
                    },
                    earnings: calculated.earnings,
                    deductions: calculated.deductions,
                    employerContributions: calculated.employerContributions,
                    grossEarnings: calculated.grossEarnings,
                    totalDeductions: calculated.totalDeductions,
                    netSalary: calculated.netSalary,
                    status: 'pending',
                    processedAt: new Date(),
                    processedBy: req.user._id
                };

                let payroll;
                if (existingPayroll) {
                    payroll = await Payroll.findByIdAndUpdate(
                        existingPayroll._id,
                        payrollData,
                        { new: true }
                    );
                } else {
                    payroll = await Payroll.create(payrollData);
                }

                results.processed.push({
                    employeeId: employee._id,
                    employeeCode: employee.employeeCode,
                    name: `${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}`,
                    netSalary: calculated.netSalary
                });

            } catch (empError) {
                console.error(`Error processing payroll for employee ${employee.employeeCode}:`, empError.message);
                results.errors.push({
                    employeeId: employee._id,
                    employeeCode: employee.employeeCode,
                    name: `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim(),
                    error: empError.message || 'Unknown error occurred'
                });
            }
        }

        res.json({
            message: 'Payroll processing completed',
            period: {
                month,
                year,
                monthName: payrollCalculator.getMonthName(month)
            },
            results
        });
    } catch (error) {
        res.status(500).json({ message: 'Error processing payroll', error: error.message });
    }
};

// @desc    Approve payroll
// @route   PUT /api/payroll/:id/approve
// @access  Private (HR Manager, Admin)
export const approvePayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) {
            return res.status(404).json({ message: 'Payroll not found' });
        }

        if (payroll.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending payroll can be approved' });
        }

        payroll.status = 'approved';
        payroll.approvedAt = new Date();
        payroll.approvedBy = req.user._id;
        await payroll.save();

        res.json({ message: 'Payroll approved successfully', payroll });
    } catch (error) {
        res.status(500).json({ message: 'Error approving payroll', error: error.message });
    }
};

// @desc    Bulk approve payroll for a month
// @route   PUT /api/payroll/approve-bulk
// @access  Private (HR Manager, Admin)
export const bulkApprovePayroll = async (req, res) => {
    try {
        const { month, year, payrollIds } = req.body;

        let query = { status: 'pending' };

        if (payrollIds && payrollIds.length > 0) {
            query._id = { $in: payrollIds };
        } else if (month && year) {
            query['payPeriod.month'] = parseInt(month);
            query['payPeriod.year'] = parseInt(year);
        } else {
            return res.status(400).json({ message: 'Provide payrollIds or month/year' });
        }

        const result = await Payroll.updateMany(query, {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: req.user._id
        });

        res.json({
            message: 'Payroll approved successfully',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error approving payroll', error: error.message });
    }
};

// @desc    Lock payroll (prevent further changes)
// @route   PUT /api/payroll/:id/lock
// @access  Private (Admin)
export const lockPayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);

        if (!payroll) {
            return res.status(404).json({ message: 'Payroll not found' });
        }

        if (payroll.status !== 'approved') {
            return res.status(400).json({ message: 'Only approved payroll can be locked' });
        }

        payroll.isLocked = true;
        payroll.lockedAt = new Date();
        payroll.lockedBy = req.user._id;
        payroll.status = 'processed';
        await payroll.save();

        res.json({ message: 'Payroll locked successfully', payroll });
    } catch (error) {
        res.status(500).json({ message: 'Error locking payroll', error: error.message });
    }
};

// @desc    Generate payslip
// @route   POST /api/payroll/:id/payslip
// @access  Private (HR, Admin)
export const generatePayslip = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id)
            .populate('employeeId', 'personalInfo contactInfo employeeCode employmentInfo bankDetails')
            .populate('salaryStructureId');

        if (!payroll) {
            return res.status(404).json({ message: 'Payroll not found' });
        }

        // Check if payslip already exists
        let payslip = await Payslip.findOne({ payrollId: payroll._id });

        const employee = payroll.employeeId;

        const earningsBreakdown = [
            { component: 'Basic Pay', amount: payroll.earnings.basicPay },
            { component: 'HRA', amount: payroll.earnings.hra },
            { component: 'Dearness Allowance', amount: payroll.earnings.da },
            { component: 'Special Allowance', amount: payroll.earnings.specialAllowance },
            { component: 'Conveyance Allowance', amount: payroll.earnings.conveyanceAllowance },
            { component: 'Medical Allowance', amount: payroll.earnings.medicalAllowance },
            { component: 'Leave Travel Allowance', amount: payroll.earnings.lta }
        ].filter(e => e.amount > 0);

        if (payroll.earnings.overtimeAmount > 0) {
            earningsBreakdown.push({
                component: `Overtime (${payroll.earnings.overtimeHours} hrs)`,
                amount: payroll.earnings.overtimeAmount
            });
        }
        if (payroll.earnings.bonus > 0) {
            earningsBreakdown.push({ component: 'Bonus', amount: payroll.earnings.bonus });
        }
        if (payroll.earnings.incentives > 0) {
            earningsBreakdown.push({ component: 'Incentives', amount: payroll.earnings.incentives });
        }
        if (payroll.earnings.arrears > 0) {
            earningsBreakdown.push({ component: 'Arrears', amount: payroll.earnings.arrears });
        }
        if (payroll.earnings.reimbursements > 0) {
            earningsBreakdown.push({ component: 'Reimbursements', amount: payroll.earnings.reimbursements });
        }

        const deductionsBreakdown = [
            { component: 'Provident Fund', amount: payroll.deductions.pf },
            { component: 'ESI', amount: payroll.deductions.esi },
            { component: 'Professional Tax', amount: payroll.deductions.professionalTax },
            { component: 'Income Tax (TDS)', amount: payroll.deductions.incomeTax },
            { component: 'Loss of Pay', amount: payroll.deductions.lop }
        ].filter(d => d.amount > 0);

        if (payroll.deductions.loanDeduction > 0) {
            deductionsBreakdown.push({ component: 'Loan Deduction', amount: payroll.deductions.loanDeduction });
        }

        const payslipData = {
            payrollId: payroll._id,
            employeeId: employee._id,
            payPeriod: {
                month: payroll.payPeriod.month,
                year: payroll.payPeriod.year,
                monthName: payrollCalculator.getMonthName(payroll.payPeriod.month)
            },
            employeeDetails: {
                employeeCode: employee.employeeCode,
                name: `${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}`,
                email: employee.contactInfo?.email,
                department: employee.employmentInfo?.department,
                designation: employee.employmentInfo?.designation,
                dateOfJoining: employee.employmentInfo?.dateOfJoining,
                bankName: employee.bankDetails?.bankName,
                accountNumber: employee.bankDetails?.accountNumber,
                ifscCode: employee.bankDetails?.ifscCode,
                panNumber: employee.personalInfo?.panNumber,
                uanNumber: employee.personalInfo?.uanNumber
            },
            attendance: {
                totalDays: payrollCalculator.getDaysInMonth(payroll.payPeriod.month, payroll.payPeriod.year),
                workingDays: payroll.workingDays.totalWorkingDays,
                daysWorked: payroll.workingDays.daysWorked,
                leaveTaken: payroll.workingDays.leaveDays,
                lopDays: payroll.workingDays.lopDays,
                holidays: payroll.workingDays.holidays
            },
            earnings: earningsBreakdown,
            totalEarnings: payroll.grossEarnings,
            deductions: deductionsBreakdown,
            totalDeductions: payroll.totalDeductions,
            netPay: payroll.netSalary,
            netPayInWords: payrollCalculator.numberToWords(payroll.netSalary),
            generatedBy: req.user._id
        };

        if (payslip) {
            // Update existing payslip
            payslip = await Payslip.findByIdAndUpdate(payslip._id, payslipData, { new: true });
        } else {
            payslip = await Payslip.create(payslipData);
        }

        // Update payroll with payslip flag
        payroll.payslipGenerated = true;
        await payroll.save();

        res.json({
            message: 'Payslip generated successfully',
            payslip
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating payslip', error: error.message });
    }
};

// @desc    Get payslip by ID
// @route   GET /api/payroll/payslips/:id
// @access  Private
export const getPayslipById = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id)
            .populate('generatedBy', 'firstName lastName');

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found' });
        }

        // If user is employee, verify they can only access their own payslip
        if (req.user.role === 'Employee') {
            const employee = await Employee.findOne({ userId: req.user._id });
            if (!employee || payslip.employeeId.toString() !== employee._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this payslip' });
            }
        }

        // Update viewed status
        if (!payslip.viewedAt) {
            payslip.viewedAt = new Date();
            payslip.status = 'viewed';
            await payslip.save();
        }

        res.json(payslip);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payslip', error: error.message });
    }
};

// @desc    Get payslip by Payroll ID
// @route   GET /api/payroll/:payrollId/payslip
// @access  Private
export const getPayslipByPayrollId = async (req, res) => {
    try {
        const payslip = await Payslip.findOne({ payrollId: req.params.payrollId })
            .populate('generatedBy', 'firstName lastName');

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found for this payroll' });
        }

        res.json(payslip);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payslip', error: error.message });
    }
};

// @desc    Get payslips for an employee
// @route   GET /api/payroll/payslips/employee/:employeeId
// @access  Private
export const getEmployeePayslips = async (req, res) => {
    try {
        const { year } = req.query;
        const query = { employeeId: req.params.employeeId };

        if (year) {
            query['payPeriod.year'] = parseInt(year);
        }

        const payslips = await Payslip.find(query)
            .sort({ 'payPeriod.year': -1, 'payPeriod.month': -1 });

        res.json(payslips);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payslips', error: error.message });
    }
};

// @desc    Get my payslips (for logged in employee)
// @route   GET /api/payroll/my-payslips
// @access  Private (Employee)
export const getMyPayslips = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id });

        if (!employee && !req.user.employeeId) {
            return res.status(404).json({ message: 'Employee record not found' });
        }

        const employeeId = employee?._id || req.user.employeeId;

        const { year } = req.query;
        const query = { employeeId };

        if (year) {
            query['payPeriod.year'] = parseInt(year);
        }

        // Try to get payslips first
        let payslips = await Payslip.find(query)
            .sort({ 'payPeriod.year': -1, 'payPeriod.month': -1 });

        // If no payslips found, return payroll records instead
        if (payslips.length === 0) {
            const payrollQuery = { employeeId };
            if (year) {
                payrollQuery['payPeriod.year'] = parseInt(year);
            }

            const payrolls = await Payroll.find(payrollQuery)
                .select('payPeriod grossEarnings totalDeductions netSalary status earnings deductions')
                .sort({ 'payPeriod.year': -1, 'payPeriod.month': -1 });

            // Transform payroll to payslip-like format
            payslips = payrolls.map(p => ({
                _id: p._id,
                employeeId: p.employeeId,
                payPeriod: p.payPeriod,
                earnings: p.earnings,
                deductions: p.deductions,
                grossEarnings: p.grossEarnings,
                totalDeductions: p.totalDeductions,
                netSalary: p.netSalary,
                status: p.status,
                isPayroll: true // Flag to indicate this is from Payroll, not Payslip
            }));
        }

        res.json(payslips);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payslips', error: error.message });
    }
};

// @desc    Get payroll history for an employee
// @route   GET /api/payroll/history/:employeeId
// @access  Private
export const getPayrollHistory = async (req, res) => {
    try {
        const { startYear, endYear } = req.query;
        const query = { employeeId: req.params.employeeId };

        if (startYear && endYear) {
            query['payPeriod.year'] = { $gte: parseInt(startYear), $lte: parseInt(endYear) };
        }

        const payrolls = await Payroll.find(query)
            .select('payPeriod grossEarnings totalDeductions netSalary status')
            .sort({ 'payPeriod.year': -1, 'payPeriod.month': -1 });

        // Calculate YTD for current year
        const currentYear = new Date().getFullYear();
        const ytdPayrolls = payrolls.filter(p => p.payPeriod.year === currentYear);

        const ytd = {
            year: currentYear,
            grossEarnings: ytdPayrolls.reduce((sum, p) => sum + p.grossEarnings, 0),
            totalDeductions: ytdPayrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
            netSalary: ytdPayrolls.reduce((sum, p) => sum + p.netSalary, 0),
            monthsProcessed: ytdPayrolls.length
        };

        res.json({
            history: payrolls,
            ytd
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payroll history', error: error.message });
    }
};

// @desc    Get payroll dashboard stats
// @route   GET /api/payroll/dashboard
// @access  Private (HR, Admin)
export const getPayrollDashboard = async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Current month stats
        const currentMonthStats = await Payroll.aggregate([
            {
                $match: {
                    'payPeriod.month': currentMonth,
                    'payPeriod.year': currentYear
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalNet: { $sum: '$netSalary' }
                }
            }
        ]);

        // Last month stats for comparison
        const lastMonthStats = await Payroll.aggregate([
            {
                $match: {
                    'payPeriod.month': lastMonth,
                    'payPeriod.year': lastMonthYear
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalNet: { $sum: '$netSalary' }
                }
            }
        ]);

        // Employees without salary structure
        const employeesWithoutSalary = await Employee.countDocuments({
            status: 'active',
            _id: { $nin: await SalaryStructure.distinct('employeeId', { isActive: true }) }
        });

        // Pending approvals
        const pendingApprovals = await Payroll.countDocuments({ status: 'pending' });

        res.json({
            currentPeriod: {
                month: currentMonth,
                year: currentYear,
                monthName: payrollCalculator.getMonthName(currentMonth)
            },
            stats: {
                currentMonth: currentMonthStats,
                lastMonthTotal: lastMonthStats[0]?.totalNet || 0,
                employeesWithoutSalary,
                pendingApprovals
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
    }
};

export default {
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
};
