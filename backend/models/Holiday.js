import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Holiday name is required'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Holiday date is required']
    },
    type: {
        type: String,
        enum: ['national', 'regional', 'company', 'optional'],
        default: 'national'
    },
    description: {
        type: String,
        trim: true
    },
    isOptional: {
        type: Boolean,
        default: false
    },
    applicableTo: {
        type: String,
        enum: ['all', 'specific-departments'],
        default: 'all'
    },
    departments: [{
        type: String
    }],
    year: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient querying by date and year
holidaySchema.index({ date: 1, year: 1 });
holidaySchema.index({ year: 1, isActive: 1 });

// Virtual for formatted date
holidaySchema.virtual('formattedDate').get(function () {
    return this.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
});

// Virtual for day of week
holidaySchema.virtual('dayOfWeek').get(function () {
    return this.date.toLocaleDateString('en-US', { weekday: 'long' });
});

holidaySchema.set('toJSON', { virtuals: true });
holidaySchema.set('toObject', { virtuals: true });

const Holiday = mongoose.model('Holiday', holidaySchema);

export default Holiday;
