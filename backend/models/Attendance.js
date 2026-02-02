import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
        // Not required - can be User._id for users without employee records
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Reference to the actual user who checked in
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        time: Date,
        location: {
            latitude: Number,
            longitude: Number,
            address: String
        },
        method: {
            type: String,
            enum: ['biometric', 'manual', 'mobile', 'web'],
            default: 'web'
        }
    },
    checkOut: {
        time: Date,
        location: {
            latitude: Number,
            longitude: Number,
            address: String
        },
        method: {
            type: String,
            enum: ['biometric', 'manual', 'mobile', 'web'],
            default: 'web'
        }
    },
    breaks: [{
        startTime: Date,
        endTime: Date,
        duration: Number, // in minutes
        reason: String
    }],
    workHours: {
        type: Number, // in hours
        default: 0
    },
    overtimeHours: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'half-day', 'late', 'early-leave', 'on-leave', 'holiday', 'weekend'],
        default: 'present'
    },
    remarks: String,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isRegularized: {
        type: Boolean,
        default: false
    },
    regularizationReason: String
}, {
    timestamps: true
});

// Compound index for unique attendance per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Calculate work hours before saving
attendanceSchema.pre('save', function (next) {
    if (this.checkIn?.time && this.checkOut?.time) {
        const checkInTime = new Date(this.checkIn.time);
        const checkOutTime = new Date(this.checkOut.time);

        let totalBreakMinutes = 0;
        if (this.breaks && this.breaks.length > 0) {
            totalBreakMinutes = this.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
        }

        const diffMs = checkOutTime - checkInTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        this.workHours = Math.max(0, diffHours - (totalBreakMinutes / 60));


    }
    next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
