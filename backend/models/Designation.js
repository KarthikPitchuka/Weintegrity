import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    description: String,

    // Job Level/Band
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 15 // L1 to L15 typically
    },
    band: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], // Alternative band system
    },

    // Category
    category: {
        type: String,
        enum: ['executive', 'senior-management', 'middle-management', 'junior-management', 'staff', 'trainee'],
        default: 'staff'
    },

    // Job Family
    jobFamily: {
        type: String,
        enum: ['engineering', 'product', 'design', 'sales', 'marketing', 'hr', 'finance', 'operations', 'support', 'leadership', 'other'],
        default: 'other'
    },

    // Linked Grade (for salary)


    // Reporting Structure
    reportsTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Designation'
    }],

    // Scope
    scope: {
        canApproveLeave: { type: Boolean, default: false },
        canApproveExpense: { type: Boolean, default: false },
        canApproveTimesheet: { type: Boolean, default: false },
        canHire: { type: Boolean, default: false },
        canTerminate: { type: Boolean, default: false },
        approvalLimit: { type: Number, default: 0 } // Max amount they can approve
    },

    // Requirements
    requirements: {
        minExperience: { type: Number, default: 0 }, // Years
        maxExperience: Number,
        education: [String], // e.g., ['B.Tech', 'MCA', 'MBA']
        skills: [String],
        certifications: [String]
    },

    // Career Path
    careerPath: {
        previousDesignations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Designation' }],
        nextDesignations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Designation' }],
        typicalTenure: { type: Number, default: 24 } // Months before promotion
    },

    // Allowed in departments (empty = all departments)
    allowedDepartments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    }],

    status: {
        type: String,
        enum: ['active', 'inactive', 'deprecated'],
        default: 'active'
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate designation code
designationSchema.pre('validate', async function (next) {
    if (this.isNew && !this.code) {
        const words = this.name.split(' ');
        let shortCode = '';
        if (words.length >= 2) {
            shortCode = words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
        } else {
            shortCode = this.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        }
        this.code = `${shortCode}L${this.level}`;
    }
    next();
});

// Virtual for display name with level
designationSchema.virtual('displayName').get(function () {
    return `${this.name} (L${this.level})`;
});

designationSchema.set('toJSON', { virtuals: true });
designationSchema.set('toObject', { virtuals: true });

// Indexes
designationSchema.index({ company: 1, name: 1 }, { unique: true });
designationSchema.index({ level: 1 });

designationSchema.index({ name: 'text', description: 'text' });

const Designation = mongoose.model('Designation', designationSchema);

export default Designation;
