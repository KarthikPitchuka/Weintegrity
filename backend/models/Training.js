import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    type: {
        type: String,
        enum: ['internal', 'external', 'online', 'workshop', 'seminar', 'certification'],
        default: 'internal'
    },
    category: {
        type: String,
        enum: ['technical', 'soft-skills', 'compliance', 'leadership', 'product', 'other'],
        default: 'technical'
    },
    trainer: {
        name: String,
        designation: String,
        organization: String,
        email: String,
        phone: String
    },
    schedule: {
        startDate: Date,
        endDate: Date,
        startTime: String,
        endTime: String,
        duration: Number, // in hours
        venue: String,
        isVirtual: { type: Boolean, default: false },
        meetingLink: String
    },
    targetAudience: {
        departments: [String],
        designations: [String],
        maxParticipants: Number
    },
    participants: [{
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        registeredOn: { type: Date, default: Date.now },
        attendanceStatus: {
            type: String,
            enum: ['registered', 'attended', 'partially-attended', 'absent', 'cancelled'],
            default: 'registered'
        },
        completionPercentage: { type: Number, default: 0 },
        feedback: {
            rating: { type: Number, min: 1, max: 5 },
            comments: String,
            submittedOn: Date
        },
        certificateUrl: String
    }],
    materials: [{
        name: String,
        type: String,
        url: String
    }],
    assessment: {
        required: { type: Boolean, default: false },
        passingScore: Number,
        questions: [{
            question: String,
            options: [String],
            correctAnswer: Number
        }]
    },
    cost: {
        amount: Number,
        currency: { type: String, default: 'INR' },
        budgetCode: String
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'],
        default: 'draft'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for searching
trainingSchema.index({ title: 'text', description: 'text' });

const Training = mongoose.model('Training', trainingSchema);

export default Training;
