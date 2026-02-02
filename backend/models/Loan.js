import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    type: {
        type: String,
        enum: ['salary-advance', 'personal-loan', 'emergency-loan', 'travel-advance', 'medical-advance', 'festival-advance', 'education-loan', 'laptop-loan', 'other'],
        required: true
    },
    loanNumber: { type: String, unique: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, default: 0 },
    disbursedAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    interestRate: { type: Number, default: 0 },
    interestType: { type: String, enum: ['simple', 'compound', 'flat', 'none'], default: 'none' },
    totalInterest: { type: Number, default: 0 },

    repayment: {
        method: { type: String, enum: ['salary-deduction', 'cheque', 'bank-transfer', 'lump-sum'], default: 'salary-deduction' },
        tenure: { type: Number, required: true },
        emiAmount: { type: Number, default: 0 },
        startMonth: Date,
        endMonth: Date
    },

    emiSchedule: [{
        installmentNumber: Number,
        dueDate: Date,
        emiAmount: Number,
        principalComponent: Number,
        interestComponent: Number,
        status: { type: String, enum: ['pending', 'deducted', 'paid', 'partially-paid', 'waived', 'skipped'], default: 'pending' },
        paidAmount: { type: Number, default: 0 },
        paidOn: Date,
        payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' }
    }],

    balance: {
        principal: { type: Number, default: 0 },
        interest: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },

    purpose: { type: String, required: true },
    justification: String,
    supportingDocuments: [{ name: String, url: String, type: String }],

    status: {
        type: String,
        enum: ['draft', 'submitted', 'pending-manager', 'pending-hr', 'pending-finance', 'approved', 'disbursed', 'active', 'closed', 'rejected', 'cancelled', 'written-off'],
        default: 'draft'
    },

    approvals: [{
        level: { type: String, enum: ['manager', 'hr', 'finance', 'director'] },
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        comments: String,
        actionDate: Date
    }],

    finalApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedOn: Date,
    rejectionReason: String,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    disbursement: {
        status: { type: String, enum: ['pending', 'processing', 'disbursed', 'failed'], default: 'pending' },
        date: Date,
        method: { type: String, enum: ['salary', 'bank-transfer', 'cheque'] },
        transactionId: String
    },

    closureDate: Date,
    closureRemarks: String,
    submittedOn: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Generate loan number
loanSchema.pre('validate', async function (next) {
    if (this.isNew && !this.loanNumber) {
        const typeCode = this.type.substring(0, 3).toUpperCase();
        const year = new Date().getFullYear().toString().substring(2);
        const count = await mongoose.model('Loan').countDocuments();
        this.loanNumber = `LN${typeCode}${year}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Calculate EMI
loanSchema.pre('save', function (next) {
    if (this.approvedAmount && this.repayment.tenure && this.isModified('approvedAmount')) {
        const principal = this.approvedAmount;
        const tenure = this.repayment.tenure;

        // Simple no-interest EMI for advances
        const emi = Math.round(principal / tenure);
        this.repayment.emiAmount = emi;
        this.totalInterest = 0;
        this.balance.principal = principal;
        this.balance.interest = 0;
        this.balance.total = principal;

        // Generate EMI schedule
        if (this.repayment.startMonth) {
            const schedule = [];
            let currentDate = new Date(this.repayment.startMonth);

            for (let i = 1; i <= tenure; i++) {
                schedule.push({
                    installmentNumber: i,
                    dueDate: new Date(currentDate),
                    emiAmount: i === tenure ? principal - (emi * (tenure - 1)) : emi,
                    principalComponent: i === tenure ? principal - (emi * (tenure - 1)) : emi,
                    interestComponent: 0,
                    status: 'pending'
                });
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            this.emiSchedule = schedule;
            this.repayment.endMonth = schedule[schedule.length - 1].dueDate;
        }
    }
    if (this.status === 'submitted' && !this.submittedOn) {
        this.submittedOn = new Date();
    }
    next();
});

// Method to record payment
loanSchema.methods.recordPayment = function (installmentNumber, amount, payrollId = null) {
    const installment = this.emiSchedule.find(e => e.installmentNumber === installmentNumber);
    if (!installment) throw new Error('Installment not found');

    installment.paidAmount = (installment.paidAmount || 0) + amount;
    installment.paidOn = new Date();
    installment.payrollId = payrollId;
    installment.status = installment.paidAmount >= installment.emiAmount ? 'deducted' : 'partially-paid';

    this.balance.total -= amount;
    this.balance.principal -= amount;

    if (this.emiSchedule.every(e => e.status === 'deducted' || e.status === 'paid')) {
        this.status = 'closed';
        this.closureDate = new Date();
    }
    return this.save();
};

loanSchema.index({ employee: 1, status: 1 });
loanSchema.index({ status: 1 });

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
