import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema({
    // Reference Fields
    payrollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payroll',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    // Payslip Number (unique identifier - auto-generated)
    payslipNumber: {
        type: String,
        unique: true
    },
    // Pay Period
    payPeriod: {
        month: { type: Number, required: true },
        year: { type: Number, required: true },
        monthName: String
    },
    // Employee Details (snapshot at time of generation)
    employeeDetails: {
        employeeCode: String,
        name: String,
        email: String,
        department: String,
        designation: String,
        dateOfJoining: Date,
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        panNumber: String,
        uanNumber: String // Universal Account Number for PF
    },
    // Company Details
    companyDetails: {
        name: { type: String, default: 'WEIntegrity Solutions' },
        address: String,
        gstin: String,
        panNumber: String
    },
    // Working Days Summary
    attendance: {
        totalDays: Number,
        workingDays: Number,
        daysWorked: Number,
        leaveTaken: Number,
        lopDays: Number,
        holidays: Number
    },
    // Earnings Breakdown
    earnings: [{
        component: String,
        amount: Number
    }],
    totalEarnings: { type: Number, default: 0 },
    // Deductions Breakdown
    deductions: [{
        component: String,
        amount: Number
    }],
    totalDeductions: { type: Number, default: 0 },
    // Net Pay
    netPay: { type: Number, required: true },
    netPayInWords: String,
    // YTD (Year to Date) Figures
    ytd: {
        grossEarnings: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        netPay: { type: Number, default: 0 },
        pfContribution: { type: Number, default: 0 },
        incomeTax: { type: Number, default: 0 }
    },
    // Generation Details
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // PDF Storage
    pdfUrl: String,
    pdfGeneratedAt: Date,
    // Email Status
    emailSent: { type: Boolean, default: false },
    emailSentAt: Date,
    // Status
    status: {
        type: String,
        enum: ['generated', 'sent', 'viewed', 'downloaded'],
        default: 'generated'
    },
    viewedAt: Date,
    downloadedAt: Date,
    // Digital Signature
    isDigitallySigned: { type: Boolean, default: false },
    signatureDetails: {
        signedBy: String,
        signedAt: Date,
        signatureHash: String
    }
}, {
    timestamps: true
});

// Generate payslip number before validation (runs before save AND create)
payslipSchema.pre('validate', async function (next) {
    if (this.isNew && !this.payslipNumber) {
        const monthStr = String(this.payPeriod.month).padStart(2, '0');
        const yearStr = String(this.payPeriod.year);
        const count = await mongoose.model('Payslip').countDocuments({
            'payPeriod.month': this.payPeriod.month,
            'payPeriod.year': this.payPeriod.year
        });
        this.payslipNumber = `PS-${yearStr}${monthStr}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Index for efficient queries
payslipSchema.index({ employeeId: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 });
payslipSchema.index({ payslipNumber: 1 });
payslipSchema.index({ generatedAt: -1 });

const Payslip = mongoose.model('Payslip', payslipSchema);

export default Payslip;
