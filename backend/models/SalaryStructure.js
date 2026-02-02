import mongoose from 'mongoose';

const salaryStructureSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        unique: true
    },
    // Basic Salary Components
    basicPay: {
        type: Number,
        required: true,
        min: 0
    },
    // House Rent Allowance (typically 40-50% of basic for metro cities)
    hra: {
        type: Number,
        default: 0
    },
    hraPercentage: {
        type: Number,
        default: 40, // 40% of basic pay
        min: 0,
        max: 100
    },
    // Dearness Allowance
    da: {
        type: Number,
        default: 0
    },
    daPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    // Special Allowance
    specialAllowance: {
        type: Number,
        default: 0
    },
    // Conveyance Allowance
    conveyanceAllowance: {
        type: Number,
        default: 1600 // Standard exemption limit
    },
    // Medical Allowance
    medicalAllowance: {
        type: Number,
        default: 1250
    },
    // Leave Travel Allowance (LTA)
    lta: {
        type: Number,
        default: 0
    },
    // Other Allowances
    otherAllowances: [{
        name: String,
        amount: Number,
        isTaxable: { type: Boolean, default: true }
    }],
    // Overtime Settings
    overtimeRate: {
        type: Number,
        default: 0 // Per hour rate
    },
    isOvertimeEligible: {
        type: Boolean,
        default: false
    },
    // Provident Fund Settings
    pfEnabled: {
        type: Boolean,
        default: true
    },
    pfPercentage: {
        type: Number,
        default: 12 // Employee contribution 12% of basic
    },
    employerPfPercentage: {
        type: Number,
        default: 12 // Employer contribution
    },
    // ESI Settings (applicable if gross < 21000)
    esiEnabled: {
        type: Boolean,
        default: false
    },
    esiPercentage: {
        type: Number,
        default: 0.75 // Employee contribution
    },
    employerEsiPercentage: {
        type: Number,
        default: 3.25 // Employer contribution
    },
    // Professional Tax (state-wise, max 200/month)
    professionalTax: {
        type: Number,
        default: 200
    },
    // TDS Settings
    tdsPercentage: {
        type: Number,
        default: 0
    },
    // Calculated Fields (stored for quick access)
    grossSalary: {
        type: Number,
        default: 0
    },
    ctc: {
        type: Number,
        default: 0 // Cost to Company (annual)
    },
    // Effective Date
    effectiveFrom: {
        type: Date,
        default: Date.now
    },
    effectiveTo: {
        type: Date
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    // Audit Fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate gross salary and CTC
salaryStructureSchema.pre('save', function (next) {
    // Calculate HRA if percentage is set
    if (this.hraPercentage > 0 && this.basicPay) {
        this.hra = Math.round(this.basicPay * this.hraPercentage / 100);
    }

    // Calculate DA if percentage is set
    if (this.daPercentage > 0 && this.basicPay) {
        this.da = Math.round(this.basicPay * this.daPercentage / 100);
    }

    // Calculate Gross Salary
    let otherAllowancesTotal = 0;
    if (this.otherAllowances && this.otherAllowances.length > 0) {
        otherAllowancesTotal = this.otherAllowances.reduce((sum, a) => sum + (a.amount || 0), 0);
    }

    this.grossSalary =
        this.basicPay +
        this.hra +
        this.da +
        this.specialAllowance +
        this.conveyanceAllowance +
        this.medicalAllowance +
        this.lta +
        otherAllowancesTotal;

    // Calculate CTC (Annual)
    const annualGross = this.grossSalary * 12;
    const employerPf = this.pfEnabled ? (this.basicPay * this.employerPfPercentage / 100) * 12 : 0;
    const employerEsi = this.esiEnabled ? (this.grossSalary * this.employerEsiPercentage / 100) * 12 : 0;

    this.ctc = annualGross + employerPf + employerEsi;

    next();
});

// Virtual for monthly in-hand salary (approximate)
salaryStructureSchema.virtual('estimatedNetSalary').get(function () {
    const pfDeduction = this.pfEnabled ? (this.basicPay * this.pfPercentage / 100) : 0;
    const esiDeduction = this.esiEnabled ? (this.grossSalary * this.esiPercentage / 100) : 0;
    return this.grossSalary - pfDeduction - esiDeduction - this.professionalTax;
});

salaryStructureSchema.set('toJSON', { virtuals: true });
salaryStructureSchema.set('toObject', { virtuals: true });

// Index for efficient queries
salaryStructureSchema.index({ employeeId: 1, isActive: 1 });
salaryStructureSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);

export default SalaryStructure;
