import mongoose from 'mongoose';

const taxDeclarationSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },

    // Financial Year
    financialYear: {
        type: String,
        required: true // e.g., '2025-2026'
    },
    assessmentYear: String, // e.g., '2026-2027'

    // Tax Regime Selection
    regime: {
        type: String,
        enum: ['old', 'new'],
        required: true,
        default: 'new'
    },
    regimeLockedIn: { type: Boolean, default: false },

    // Declaration Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'verified', 'locked', 'revised'],
        default: 'draft'
    },

    // Section 80C (Max: 1,50,000)
    section80C: {
        maxLimit: { type: Number, default: 150000 },
        declared: {
            epf: { type: Number, default: 0 }, // From salary
            vpf: { type: Number, default: 0 }, // Voluntary PF
            ppf: { type: Number, default: 0 }, // Public Provident Fund
            nsc: { type: Number, default: 0 }, // National Savings Certificate
            elss: { type: Number, default: 0 }, // Equity Linked Savings
            lifeInsurance: { type: Number, default: 0 },
            principalRepayment: { type: Number, default: 0 }, // Home Loan Principal
            childTuitionFee: { type: Number, default: 0 },
            sukanyaSamriddhi: { type: Number, default: 0 },
            fixedDeposit: { type: Number, default: 0 }, // 5-year FD
            others: { type: Number, default: 0 }
        },
        proofsSubmitted: [{
            type: { type: String },
            amount: Number,
            documentUrl: String,
            verified: { type: Boolean, default: false },
            verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            verifiedOn: Date,
            remarks: String
        }],
        totalDeclared: { type: Number, default: 0 },
        totalVerified: { type: Number, default: 0 }
    },

    // Section 80D (Health Insurance)
    section80D: {
        selfAndFamily: {
            maxLimit: { type: Number, default: 25000 },
            declared: { type: Number, default: 0 },
            verified: { type: Number, default: 0 }
        },
        parents: {
            maxLimit: { type: Number, default: 25000 }, // 50000 if senior citizen
            declared: { type: Number, default: 0 },
            verified: { type: Number, default: 0 },
            seniorCitizen: { type: Boolean, default: false }
        },
        preventiveHealthCheckup: {
            maxLimit: { type: Number, default: 5000 },
            declared: { type: Number, default: 0 }
        },
        proofsSubmitted: [{
            type: { type: String, enum: ['self', 'parents', 'checkup'] },
            amount: Number,
            documentUrl: String,
            verified: { type: Boolean, default: false }
        }],
        totalDeclared: { type: Number, default: 0 },
        totalVerified: { type: Number, default: 0 }
    },

    // Section 80E (Education Loan Interest)
    section80E: {
        loanInterest: { type: Number, default: 0 },
        lenderName: String,
        documentUrl: String,
        verified: { type: Boolean, default: false }
    },

    // Section 80G (Donations)
    section80G: {
        donations: [{
            doneeOrganization: String,
            panNumber: String,
            amount: Number,
            deductionPercentage: { type: Number, default: 50 }, // 50% or 100%
            documentUrl: String,
            verified: { type: Boolean, default: false }
        }],
        totalDeclared: { type: Number, default: 0 },
        totalVerified: { type: Number, default: 0 }
    },

    // Section 24 (Home Loan Interest)
    section24: {
        homeLoanInterest: { type: Number, default: 0 },
        maxLimit: { type: Number, default: 200000 }, // Self-occupied
        lenderName: String,
        lenderPAN: String,
        propertyAddress: String,
        isLetOut: { type: Boolean, default: false },
        documentUrl: String,
        verified: { type: Boolean, default: false }
    },

    // Section 80EE/80EEA (Additional Home Loan Interest for first-time buyers)
    section80EE: {
        applicable: { type: Boolean, default: false },
        amount: { type: Number, default: 0 },
        maxLimit: { type: Number, default: 50000 }
    },

    // Section 80TTA/80TTB (Savings Interest)
    section80TTA: {
        savingsInterest: { type: Number, default: 0 },
        maxLimit: { type: Number, default: 10000 }
    },

    // HRA Exemption
    hra: {
        rentPaid: { type: Number, default: 0 },
        rentPaidMonthly: { type: Number, default: 0 },
        landlordName: String,
        landlordPAN: String, // Required if rent > 1 lakh/year
        landlordAddress: String,
        metroCity: { type: Boolean, default: false },
        rentReceipts: [{
            month: String,
            amount: Number,
            documentUrl: String
        }],
        exemptionCalculated: { type: Number, default: 0 },
        verified: { type: Boolean, default: false }
    },

    // Leave Travel Allowance
    lta: {
        claimed: { type: Number, default: 0 },
        travelDetails: String,
        documentUrl: String,
        verified: { type: Boolean, default: false }
    },

    // Other Income (for TDS calculation)
    otherIncome: {
        interestIncome: { type: Number, default: 0 },
        rentalIncome: { type: Number, default: 0 },
        capitalGains: { type: Number, default: 0 },
        otherSources: { type: Number, default: 0 }
    },

    // Previous Employment (if joined mid-year)
    previousEmployment: {
        applicable: { type: Boolean, default: false },
        employerName: String,
        employerTAN: String,
        fromDate: Date,
        toDate: Date,
        grossSalary: { type: Number, default: 0 },
        taxDeducted: { type: Number, default: 0 },
        form12BSubmitted: { type: Boolean, default: false },
        documentUrl: String
    },

    // Calculated Tax Summary
    taxCalculation: {
        grossIncome: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        taxableIncome: { type: Number, default: 0 },
        taxPayable: { type: Number, default: 0 },
        cess: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 },
        taxDeducted: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
        monthlyTds: { type: Number, default: 0 },
        calculatedOn: Date
    },

    // Verification
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedOn: Date,
    verificationRemarks: String,

    // Form 12BB
    form12BB: {
        submitted: { type: Boolean, default: false },
        submittedOn: Date,
        documentUrl: String
    },

    // Proof of Investment (POI) deadline
    poiDeadline: Date,
    poiSubmitted: { type: Boolean, default: false },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Calculate totals before saving
taxDeclarationSchema.pre('save', function (next) {
    // Calculate 80C total
    const c = this.section80C.declared;
    this.section80C.totalDeclared = Math.min(
        this.section80C.maxLimit,
        (c.epf || 0) + (c.vpf || 0) + (c.ppf || 0) + (c.nsc || 0) +
        (c.elss || 0) + (c.lifeInsurance || 0) + (c.principalRepayment || 0) +
        (c.childTuitionFee || 0) + (c.sukanyaSamriddhi || 0) + (c.fixedDeposit || 0) + (c.others || 0)
    );

    // Calculate 80D total
    const d = this.section80D;
    this.section80D.totalDeclared =
        Math.min(d.selfAndFamily.maxLimit, d.selfAndFamily.declared) +
        Math.min(d.parents.maxLimit, d.parents.declared) +
        Math.min(d.preventiveHealthCheckup.maxLimit, d.preventiveHealthCheckup.declared);

    // Calculate 80G total
    this.section80G.totalDeclared = this.section80G.donations.reduce((sum, d) =>
        sum + Math.round((d.amount || 0) * (d.deductionPercentage || 50) / 100), 0);

    next();
});

// Method to calculate tax under new regime
taxDeclarationSchema.methods.calculateNewRegimeTax = function (grossIncome) {
    const slabs = [
        { limit: 300000, rate: 0 },
        { limit: 600000, rate: 5 },
        { limit: 900000, rate: 10 },
        { limit: 1200000, rate: 15 },
        { limit: 1500000, rate: 20 },
        { limit: Infinity, rate: 30 }
    ];

    // Standard deduction of 50000 in new regime
    let taxableIncome = grossIncome - 50000;
    taxableIncome = Math.max(0, taxableIncome);

    let tax = 0;
    let remaining = taxableIncome;
    let prevLimit = 0;

    for (const slab of slabs) {
        const taxableInSlab = Math.min(remaining, slab.limit - prevLimit);
        if (taxableInSlab <= 0) break;
        tax += taxableInSlab * slab.rate / 100;
        remaining -= taxableInSlab;
        prevLimit = slab.limit;
    }

    // Rebate u/s 87A (if taxable income <= 7 lakh)
    if (taxableIncome <= 700000) {
        tax = 0;
    }

    // Cess 4%
    const cess = Math.round(tax * 4 / 100);

    return {
        taxableIncome,
        taxPayable: Math.round(tax),
        cess,
        totalTax: Math.round(tax + cess)
    };
};

// Method to calculate tax under old regime
taxDeclarationSchema.methods.calculateOldRegimeTax = function (grossIncome) {
    // Total deductions
    const totalDeductions =
        this.section80C.totalDeclared +
        this.section80D.totalDeclared +
        (this.section80E.loanInterest || 0) +
        this.section80G.totalDeclared +
        Math.min(this.section24.maxLimit, this.section24.homeLoanInterest || 0) +
        Math.min(this.section80TTA.maxLimit, this.section80TTA.savingsInterest || 0) +
        50000; // Standard deduction

    let taxableIncome = grossIncome - totalDeductions;
    taxableIncome = Math.max(0, taxableIncome);

    const slabs = [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 5 },
        { limit: 1000000, rate: 20 },
        { limit: Infinity, rate: 30 }
    ];

    let tax = 0;
    let remaining = taxableIncome;
    let prevLimit = 0;

    for (const slab of slabs) {
        const taxableInSlab = Math.min(remaining, slab.limit - prevLimit);
        if (taxableInSlab <= 0) break;
        tax += taxableInSlab * slab.rate / 100;
        remaining -= taxableInSlab;
        prevLimit = slab.limit;
    }

    // Rebate u/s 87A (if taxable income <= 5 lakh)
    if (taxableIncome <= 500000) {
        tax = 0;
    }

    // Cess 4%
    const cess = Math.round(tax * 4 / 100);

    return {
        totalDeductions,
        taxableIncome,
        taxPayable: Math.round(tax),
        cess,
        totalTax: Math.round(tax + cess)
    };
};

// Indexes
taxDeclarationSchema.index({ employee: 1, financialYear: 1 }, { unique: true });
taxDeclarationSchema.index({ status: 1 });
taxDeclarationSchema.index({ financialYear: 1 });

const TaxDeclaration = mongoose.model('TaxDeclaration', taxDeclarationSchema);

export default TaxDeclaration;
