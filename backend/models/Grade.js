import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true
    },
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 20
    },
    description: {
        type: String,
        trim: true
    },
    // Salary range for this grade
    salaryRange: {
        minimum: {
            type: Number,
            default: 0
        },
        maximum: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'INR'
        }
    },
    // Benefits associated with this grade
    benefits: [{
        name: String,
        description: String,
        value: mongoose.Schema.Types.Mixed
    }],
    // Leave entitlements
    leaveEntitlement: {
        casual: { type: Number, default: 12 },
        sick: { type: Number, default: 12 },
        earned: { type: Number, default: 15 },
        maternity: { type: Number, default: 182 },
        paternity: { type: Number, default: 15 }
    },
    // Other perks
    perks: [String],
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient queries
gradeSchema.index({ level: 1 });
gradeSchema.index({ status: 1 });

const Grade = mongoose.model('Grade', gradeSchema);

export default Grade;
