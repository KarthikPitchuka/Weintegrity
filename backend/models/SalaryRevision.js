import mongoose from 'mongoose';

const salaryRevisionSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },

    // Revision Details
    revisionType: {
        type: String,
        enum: ['annual-appraisal', 'promotion', 'correction', 'market-adjustment', 'role-change', 'special', 'joining'],
        required: true
    },

    // Effective Date
    effectiveFrom: {
        type: Date,
        required: true
    },

    // Previous Salary Structure
    previousStructure: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalaryStructure'
    },
    previousCTC: { type: Number },

    previousDesignation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Designation'
    },

    // New Salary Structure
    newStructure: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalaryStructure'
    },
    newCTC: { type: Number, required: true },

    newDesignation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Designation'
    },

    // Increment Details
    increment: {
        amount: { type: Number }, // Absolute increase
        percentage: { type: Number }, // % increase
        currency: { type: String, default: 'INR' }
    },

    // For Promotion
    promotion: {
        isPromotion: { type: Boolean, default: false },
        fromLevel: Number,
        toLevel: Number,
        fromDesignation: String, // Captured as string for historical reference
        toDesignation: String
    },

    // Linked to Performance (if appraisal-based)
    performanceReview: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performance'
    },
    performanceRating: Number,

    // Arrears (if backdated)
    arrears: {
        applicable: { type: Boolean, default: false },
        fromDate: Date,
        toDate: Date,
        amount: { type: Number, default: 0 },
        paid: { type: Boolean, default: false },
        paidInMonth: Number,
        paidInYear: Number
    },

    // Justification
    justification: String,

    // Comparison with Market
    marketData: {
        percentile: Number, // e.g., 50th percentile
        marketMin: Number,
        marketMax: Number,
        compaRatio: Number // Salary / Market Midpoint
    },

    // Approval Workflow
    status: {
        type: String,
        enum: ['draft', 'pending-hr', 'pending-finance', 'pending-cxo', 'approved', 'rejected', 'processed'],
        default: 'draft'
    },
    approvals: [{
        level: { type: String, enum: ['hr', 'finance', 'cxo'] },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedOn: Date,
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        comments: String
    }],

    // Rejection Details
    rejectionReason: String,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedOn: Date,

    // Letter Generation
    revisionLetter: {
        generated: { type: Boolean, default: false },
        generatedOn: Date,
        documentUrl: String,
        signedByEmployee: { type: Boolean, default: false },
        signedOn: Date
    },

    // Communication
    notifiedEmployee: { type: Boolean, default: false },
    notifiedOn: Date,

    // Audit
    remarks: String,

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Calculate increment before saving
salaryRevisionSchema.pre('save', function (next) {
    if (this.previousCTC && this.newCTC) {
        this.increment.amount = this.newCTC - this.previousCTC;
        this.increment.percentage = Math.round(((this.newCTC - this.previousCTC) / this.previousCTC) * 10000) / 100;
    }
    next();
});

// Method to calculate arrears
salaryRevisionSchema.methods.calculateArrears = async function () {
    if (!this.arrears.applicable || !this.arrears.fromDate || !this.arrears.toDate) {
        return 0;
    }

    const monthsDiff = (this.arrears.toDate.getFullYear() - this.arrears.fromDate.getFullYear()) * 12 +
        (this.arrears.toDate.getMonth() - this.arrears.fromDate.getMonth()) + 1;

    const monthlyDiff = (this.newCTC - (this.previousCTC || 0)) / 12;
    this.arrears.amount = Math.round(monthsDiff * monthlyDiff);

    return this.arrears.amount;
};

// Virtual for display
salaryRevisionSchema.virtual('incrementDisplay').get(function () {
    if (this.increment.amount && this.increment.percentage) {
        return `₹${this.increment.amount.toLocaleString()} (${this.increment.percentage}%)`;
    }
    return 'N/A';
});

salaryRevisionSchema.set('toJSON', { virtuals: true });
salaryRevisionSchema.set('toObject', { virtuals: true });

// Indexes
salaryRevisionSchema.index({ employee: 1, effectiveFrom: -1 });
salaryRevisionSchema.index({ status: 1 });
salaryRevisionSchema.index({ revisionType: 1 });

const SalaryRevision = mongoose.model('SalaryRevision', salaryRevisionSchema);

export default SalaryRevision;
