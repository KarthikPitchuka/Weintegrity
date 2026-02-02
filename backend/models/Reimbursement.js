import mongoose from 'mongoose';

const reimbursementSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },

    // Reimbursement Type
    type: {
        type: String,
        enum: ['travel', 'medical', 'mobile', 'internet', 'food', 'fuel', 'books', 'equipment', 'training', 'relocation', 'other'],
        required: true
    },

    // Category for accounting
    category: {
        type: String,
        enum: ['taxable', 'non-taxable', 'perquisite'],
        default: 'taxable'
    },

    // Financial Details
    claimAmount: {
        type: Number,
        required: true,
        min: 0
    },
    approvedAmount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },

    // Claim Period
    claimPeriod: {
        fromDate: { type: Date, required: true },
        toDate: { type: Date, required: true }
    },

    // Expense Details
    expenses: [{
        date: { type: Date, required: true },
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        vendor: String,
        invoiceNumber: String,
        receiptUrl: String,
        category: String,
        approved: { type: Boolean, default: false },
        approvedAmount: Number,
        remarks: String
    }],

    // For Travel Reimbursements
    travelDetails: {
        purpose: String,
        destination: String,
        travelMode: { type: String, enum: ['air', 'train', 'bus', 'car', 'taxi', 'self-vehicle'] },
        distanceKm: Number, // For self-vehicle
        ratePerKm: Number,
        startLocation: String,
        endLocation: String,
        travelRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelRequest' }
    },

    // For Medical Reimbursements
    medicalDetails: {
        patientName: String,
        relationship: { type: String, enum: ['self', 'spouse', 'child', 'parent'] },
        diagnosisType: String,
        hospitalName: String,
        doctorName: String,
        treatmentType: String
    },

    // Description
    title: {
        type: String,
        required: true
    },
    description: String,

    // Receipts/Documents
    documents: [{
        name: String,
        url: String,
        type: { type: String, enum: ['receipt', 'invoice', 'bill', 'ticket', 'prescription', 'other'] },
        uploadedOn: { type: Date, default: Date.now }
    }],

    // Policy Limits
    policyLimit: {
        monthly: Number,
        annual: Number,
        utilizedThisMonth: Number,
        utilizedThisYear: Number,
        remaining: Number
    },

    // Approval Workflow
    status: {
        type: String,
        enum: ['draft', 'submitted', 'pending-manager', 'pending-finance', 'approved', 'partially-approved', 'rejected', 'paid', 'cancelled'],
        default: 'draft'
    },

    approvals: [{
        level: { type: String, enum: ['manager', 'hr', 'finance'] },
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'rejected', 'escalated'] },
        approvedAmount: Number,
        comments: String,
        actionDate: Date
    }],

    // Final Approval
    finalApprover: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    finalApprovedOn: Date,

    // Rejection
    rejectionReason: String,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Payment
    payment: {
        status: { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' },
        method: { type: String, enum: ['salary', 'direct-transfer', 'cheque'] },
        paidOn: Date,
        paidAmount: Number,
        transactionId: String,
        payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' }, // If paid with salary
        remarks: String
    },

    // Tax Implication
    taxable: { type: Boolean, default: false },
    taxAmount: { type: Number, default: 0 },

    // Advance Adjustment (if advance was taken)
    advanceAdjustment: {
        advanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
        advanceAmount: { type: Number, default: 0 },
        adjustedAmount: { type: Number, default: 0 }
    },

    // Audit Fields
    submittedOn: Date,

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Calculate claim amount from expenses
reimbursementSchema.pre('save', function (next) {
    if (this.expenses && this.expenses.length > 0) {
        this.claimAmount = this.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    }
    if (this.status === 'submitted' && !this.submittedOn) {
        this.submittedOn = new Date();
    }
    next();
});

// Method to get reimbursement summary
reimbursementSchema.methods.getSummary = function () {
    return {
        totalClaimed: this.claimAmount,
        totalApproved: this.approvedAmount,
        difference: this.claimAmount - this.approvedAmount,
        paymentStatus: this.payment.status,
        expenseCount: this.expenses.length
    };
};

// Static method to get employee's reimbursement summary for a period
reimbursementSchema.statics.getEmployeeSummary = async function (employeeId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                employee: new mongoose.Types.ObjectId(employeeId),
                'claimPeriod.fromDate': { $gte: startDate },
                'claimPeriod.toDate': { $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$type',
                totalClaimed: { $sum: '$claimAmount' },
                totalApproved: { $sum: '$approvedAmount' },
                totalPaid: {
                    $sum: {
                        $cond: [{ $eq: ['$payment.status', 'paid'] }, '$payment.paidAmount', 0]
                    }
                },
                count: { $sum: 1 }
            }
        }
    ]);
};

// Virtual for age in days
reimbursementSchema.virtual('ageInDays').get(function () {
    if (this.submittedOn) {
        return Math.floor((new Date() - this.submittedOn) / (1000 * 60 * 60 * 24));
    }
    return 0;
});

reimbursementSchema.set('toJSON', { virtuals: true });
reimbursementSchema.set('toObject', { virtuals: true });

// Indexes
reimbursementSchema.index({ employee: 1, createdAt: -1 });
reimbursementSchema.index({ status: 1 });
reimbursementSchema.index({ type: 1 });
reimbursementSchema.index({ 'claimPeriod.fromDate': 1, 'claimPeriod.toDate': 1 });
reimbursementSchema.index({ 'payment.status': 1 });

const Reimbursement = mongoose.model('Reimbursement', reimbursementSchema);

export default Reimbursement;
