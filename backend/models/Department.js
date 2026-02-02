import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
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

    // Hierarchy
    parentDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    level: {
        type: Number,
        default: 1 // 1 = Top level, 2 = Child, etc.
    },

    // Department Head
    departmentHead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },

    // Cost Center
    costCenter: {
        code: String,
        name: String
    },

    // Budget
    budget: {
        annual: { type: Number, default: 0 },
        utilized: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' }
    },

    // Contact
    contact: {
        email: String,
        phone: String,
        extension: String
    },

    // Location
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },

    // Department specific settings
    settings: {
        allowRemoteWork: { type: Boolean, default: true },
        flexibleHours: { type: Boolean, default: false },
        overtimeAllowed: { type: Boolean, default: true }
    },

    // Approval workflow
    approvalWorkflow: {
        leaveApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        expenseApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        timesheetApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'merged'],
        default: 'active'
    },

    // Metrics (computed/cached)
    metrics: {
        totalEmployees: { type: Number, default: 0 },
        activeEmployees: { type: Number, default: 0 },
        lastUpdated: Date
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate department code
departmentSchema.pre('validate', async function (next) {
    if (this.isNew && !this.code) {
        const words = this.name.split(' ');
        let shortCode = '';
        if (words.length >= 2) {
            shortCode = words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
        } else {
            shortCode = this.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        }
        const count = await mongoose.model('Department').countDocuments();
        this.code = `${shortCode}${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

// Calculate level based on parent
departmentSchema.pre('save', async function (next) {
    if (this.parentDepartment) {
        const parent = await mongoose.model('Department').findById(this.parentDepartment);
        if (parent) {
            this.level = parent.level + 1;
        }
    } else {
        this.level = 1;
    }
    next();
});

// Method to get all child departments
departmentSchema.methods.getChildren = async function () {
    return await mongoose.model('Department').find({ parentDepartment: this._id });
};

// Method to get full hierarchy path
departmentSchema.methods.getHierarchyPath = async function () {
    const path = [this.name];
    let current = this;

    while (current.parentDepartment) {
        current = await mongoose.model('Department').findById(current.parentDepartment);
        if (current) {
            path.unshift(current.name);
        } else {
            break;
        }
    }

    return path.join(' > ');
};

// Virtual for child count
departmentSchema.virtual('childDepartments', {
    ref: 'Department',
    localField: '_id',
    foreignField: 'parentDepartment'
});

departmentSchema.set('toJSON', { virtuals: true });
departmentSchema.set('toObject', { virtuals: true });

// Indexes
departmentSchema.index({ company: 1, name: 1 }, { unique: true });
departmentSchema.index({ parentDepartment: 1 });
departmentSchema.index({ name: 'text', description: 'text' });

const Department = mongoose.model('Department', departmentSchema);

export default Department;
