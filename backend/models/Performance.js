import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    reviewPeriod: {
        type: { type: String, enum: ['monthly', 'quarterly', 'half-yearly', 'annual'] },
        startDate: Date,
        endDate: Date
    },
    reviewType: {
        type: String,
        enum: ['self', 'manager', '360-degree', 'probation'],
        default: 'manager'
    },
    goals: [{
        title: String,
        description: String,
        targetValue: Number,
        achievedValue: Number,
        weight: Number, // percentage
        status: {
            type: String,
            enum: ['not-started', 'in-progress', 'completed', 'exceeded'],
            default: 'not-started'
        },
        comments: String
    }],
    competencies: [{
        name: String,
        description: String,
        rating: { type: Number, min: 1, max: 5 },
        comments: String
    }],
    overallRating: {
        type: Number,
        min: 1,
        max: 5
    },
    performanceBand: {
        type: String,
        enum: ['exceptional', 'exceeds-expectations', 'meets-expectations', 'needs-improvement', 'unsatisfactory']
    },
    strengths: [String],
    areasOfImprovement: [String],
    developmentPlan: [{
        area: String,
        action: String,
        timeline: String,
        support: String
    }],
    selfAssessment: {
        rating: Number,
        comments: String,
        submittedOn: Date
    },
    managerAssessment: {
        rating: Number,
        comments: String,
        submittedOn: Date,
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    status: {
        type: String,
        enum: ['draft', 'self-review', 'manager-review', 'discussion', 'completed'],
        default: 'draft'
    },
    discussionDate: Date,
    discussionNotes: String,
    acknowledgement: {
        acknowledged: { type: Boolean, default: false },
        acknowledgedOn: Date,
        employeeComments: String
    }
}, {
    timestamps: true
});

// Index for querying
performanceSchema.index({ employeeId: 1, 'reviewPeriod.startDate': 1 });

const Performance = mongoose.model('Performance', performanceSchema);

export default Performance;
