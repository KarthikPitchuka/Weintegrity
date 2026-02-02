import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
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

    // Timing
    timing: {
        startTime: { type: String, required: true }, // HH:MM format
        endTime: { type: String, required: true },
        graceTime: { type: Number, default: 15 }, // Minutes grace for late arrival
        halfDayHours: { type: Number, default: 4 }, // Hours for half day
        fullDayHours: { type: Number, default: 8 }, // Hours for full day
        minHoursRequired: { type: Number, default: 8 }
    },

    // Break Times
    breaks: [{
        name: { type: String, default: 'Lunch' },
        startTime: String, // HH:MM
        endTime: String,
        duration: { type: Number, default: 60 }, // Minutes
        isPaid: { type: Boolean, default: true }
    }],

    // Working Days
    workingDays: [{
        type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        enum: [0, 1, 2, 3, 4, 5, 6]
    }],

    // Shift Type
    type: {
        type: String,
        enum: ['regular', 'night', 'rotational', 'flexible', 'split'],
        default: 'regular'
    },

    // Night Shift Settings
    nightShift: {
        isNightShift: { type: Boolean, default: false },
        nightStartHour: { type: Number, default: 20 }, // 8 PM
        nightEndHour: { type: Number, default: 6 }, // 6 AM
        nightAllowance: { type: Number, default: 0 } // Extra pay
    },

    // Overtime Rules
    overtime: {
        allowed: { type: Boolean, default: true },
        minOvertimeHours: { type: Number, default: 0.5 },
        maxOvertimeHours: { type: Number, default: 4 },
        overtimeRate: { type: Number, default: 1.5 }, // Multiplier
        weekendRate: { type: Number, default: 2 }, // Weekend OT multiplier
        holidayRate: { type: Number, default: 2 } // Holiday OT multiplier
    },

    // Flexible Timing (for flexible shifts)
    flexibility: {
        flexibleStart: { type: Boolean, default: false },
        earliestStart: String, // Earliest check-in time
        latestStart: String, // Latest check-in time
        coreHoursStart: String, // Must be present from
        coreHoursEnd: String // Must be present until
    },

    // Auto-checkout
    autoCheckout: {
        enabled: { type: Boolean, default: false },
        time: String, // Auto checkout time if not manually checked out
        notifyBefore: { type: Number, default: 30 } // Minutes before auto-checkout
    },

    // Week Off Rules
    weekOff: {
        type: { type: String, enum: ['fixed', 'rotational'], default: 'fixed' },
        fixedDays: [{ type: Number }], // For fixed: [0] for Sunday
        rotationalPattern: String // For rotational: 'weekly', 'bi-weekly'
    },

    // Applicable to
    applicableTo: {
        departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
        branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
        designations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Designation' }]
    },

    // Color for calendar display
    color: {
        type: String,
        default: '#3B82F6' // Blue
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    effectiveFrom: {
        type: Date,
        default: Date.now
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate shift code
shiftSchema.pre('validate', async function (next) {
    if (this.isNew && !this.code) {
        const typeCode = this.type.substring(0, 3).toUpperCase();
        const count = await mongoose.model('Shift').countDocuments();
        this.code = `SHF${typeCode}${String(count + 1).padStart(2, '0')}`;
    }
    // Set default working days if not provided
    if (!this.workingDays || this.workingDays.length === 0) {
        this.workingDays = [1, 2, 3, 4, 5]; // Mon-Fri default
    }
    next();
});

// Method to calculate working hours
shiftSchema.methods.calculateWorkingHours = function () {
    const start = this.timing.startTime.split(':').map(Number);
    const end = this.timing.endTime.split(':').map(Number);

    let hours = end[0] - start[0];
    let minutes = end[1] - start[1];

    // Handle overnight shift
    if (hours < 0) {
        hours += 24;
    }

    // Subtract break time
    const totalBreakMinutes = this.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    minutes -= totalBreakMinutes;

    if (minutes < 0) {
        hours -= 1;
        minutes += 60;
    }

    return hours + (minutes / 60);
};

// Method to check if a time is within shift
shiftSchema.methods.isWithinShift = function (time) {
    const [checkHour, checkMinute] = time.split(':').map(Number);
    const [startHour, startMinute] = this.timing.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.timing.endTime.split(':').map(Number);

    const checkTime = checkHour * 60 + checkMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime < endTime) {
        return checkTime >= startTime && checkTime <= endTime;
    } else {
        // Overnight shift
        return checkTime >= startTime || checkTime <= endTime;
    }
};

// Virtual for display
shiftSchema.virtual('displayTiming').get(function () {
    return `${this.timing.startTime} - ${this.timing.endTime}`;
});

shiftSchema.set('toJSON', { virtuals: true });
shiftSchema.set('toObject', { virtuals: true });

// Indexes
shiftSchema.index({ company: 1, name: 1 }, { unique: true });
shiftSchema.index({ type: 1 });
shiftSchema.index({ status: 1 });

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
