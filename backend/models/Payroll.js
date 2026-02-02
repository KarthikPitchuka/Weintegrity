import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
    // Reference Fields
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    salaryStructureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalaryStructure'
    },
    // Pay Period
    payPeriod: {
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true
        },
        startDate: Date,
        endDate: Date
    },
    // Working Days
    workingDays: {
        totalWorkingDays: { type: Number, default: 0 },
        daysWorked: { type: Number, default: 0 },
        leaveDays: { type: Number, default: 0 },
        lopDays: { type: Number, default: 0 }, // Loss of Pay
        holidays: { type: Number, default: 0 },
        weekends: { type: Number, default: 0 }
    },
    // Earnings
    earnings: {
        basicPay: { type: Number, default: 0 },
        hra: { type: Number, default: 0 },
        da: { type: Number, default: 0 },
        specialAllowance: { type: Number, default: 0 },
        conveyanceAllowance: { type: Number, default: 0 },
        medicalAllowance: { type: Number, default: 0 },
        lta: { type: Number, default: 0 },
        overtimeHours: { type: Number, default: 0 },
        overtimeAmount: { type: Number, default: 0 },
        bonus: { type: Number, default: 0 },
        incentives: { type: Number, default: 0 },
        arrears: { type: Number, default: 0 },
        reimbursements: { type: Number, default: 0 },
        otherEarnings: [{
            name: String,
            amount: Number
        }]
    },
    // Deductions
    deductions: {
        pf: { type: Number, default: 0 }, // Provident Fund
        esi: { type: Number, default: 0 }, // Employee State Insurance
        professionalTax: { type: Number, default: 0 },
        incomeTax: { type: Number, default: 0 }, // TDS
        lop: { type: Number, default: 0 }, // Loss of Pay deduction
        loanDeduction: { type: Number, default: 0 },
        advanceDeduction: { type: Number, default: 0 },
        otherDeductions: [{
            name: String,
            amount: Number
        }]
    },
    // Employer Contributions (not deducted from salary but part of CTC)
    employerContributions: {
        pf: { type: Number, default: 0 },
        esi: { type: Number, default: 0 },
        gratuity: { type: Number, default: 0 }
    },
    // Calculated Totals
    grossEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    // Payroll Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'processed', 'paid', 'cancelled'],
        default: 'draft'
    },
    // Processing Details
    processedAt: Date,
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    paidAt: Date,
    // Payment Details
    paymentDetails: {
        mode: {
            type: String,
            enum: ['bank_transfer', 'cheque', 'cash', 'upi'],
            default: 'bank_transfer'
        },
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        transactionId: String,
        transactionDate: Date
    },
    // Payslip Reference
    payslipGenerated: { type: Boolean, default: false },
    payslipUrl: String,
    // Remarks
    remarks: String,
    // Lock for preventing re-processing
    isLocked: { type: Boolean, default: false },
    lockedAt: Date,
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Pre-save hook to calculate totals
payrollSchema.pre('save', function (next) {
    // Calculate Gross Earnings
    const e = this.earnings;
    let otherEarningsTotal = 0;
    if (e.otherEarnings && e.otherEarnings.length > 0) {
        otherEarningsTotal = e.otherEarnings.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    this.grossEarnings =
        e.basicPay + e.hra + e.da + e.specialAllowance +
        e.conveyanceAllowance + e.medicalAllowance + e.lta +
        e.overtimeAmount + e.bonus + e.incentives + e.arrears +
        e.reimbursements + otherEarningsTotal;

    // Calculate Total Deductions
    const d = this.deductions;
    let otherDeductionsTotal = 0;
    if (d.otherDeductions && d.otherDeductions.length > 0) {
        otherDeductionsTotal = d.otherDeductions.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    this.totalDeductions =
        d.pf + d.esi + d.professionalTax + d.incomeTax +
        d.lop + d.loanDeduction + d.advanceDeduction + otherDeductionsTotal;

    // Calculate Net Salary
    this.netSalary = this.grossEarnings - this.totalDeductions;

    next();
});

// Compound index for unique payroll per employee per month
payrollSchema.index({ employeeId: 1, 'payPeriod.month': 1, 'payPeriod.year': 1 }, { unique: true });
payrollSchema.index({ status: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 });
payrollSchema.index({ processedAt: -1 });

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;
