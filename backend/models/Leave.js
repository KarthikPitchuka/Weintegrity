import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    leaveType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LeaveType',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    halfDay: {
        type: Boolean,
        default: false
    },
    halfDayType: {
        type: String,
        enum: ['first-half', 'second-half']
    },
    numberOfDays: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    attachments: [String],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    appliedOn: {
        type: Date,
        default: Date.now
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedOn: Date,
    rejectionReason: String,
    cancelledOn: Date,
    cancellationReason: String
}, {
    timestamps: true
});

// Calculate number of days before saving
leaveSchema.pre('save', function (next) {
    if (this.startDate && this.endDate) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        this.numberOfDays = this.halfDay ? 0.5 : diffDays;
    }
    next();
});

// Index for querying
leaveSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1 });

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
