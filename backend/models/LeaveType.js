import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    description: String,
    annualQuota: {
        type: Number,
        required: true,
        default: 0
    },
    carryForward: {
        allowed: { type: Boolean, default: false },
        maxDays: { type: Number, default: 0 },
        expiryMonths: { type: Number, default: 0 } // 0 means no expiry
    },
    encashment: {
        allowed: { type: Boolean, default: false },
        maxDays: { type: Number, default: 0 }
    },
    applicableTo: {
        gender: { type: String, enum: ['all', 'male', 'female'], default: 'all' },
        employmentTypes: [{ type: String, enum: ['full-time', 'part-time', 'contract', 'intern'] }],
        minServiceDays: { type: Number, default: 0 }
    },
    requiresApproval: {
        type: Boolean,
        default: true
    },
    requiresAttachment: {
        type: Boolean,
        default: false
    },
    minDaysNotice: {
        type: Number,
        default: 0
    },
    maxConsecutiveDays: Number,
    isPaid: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    color: {
        type: String,
        default: '#3498db'
    }
}, {
    timestamps: true
});

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

export default LeaveType;
