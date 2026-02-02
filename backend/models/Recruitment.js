import mongoose from 'mongoose';

const recruitmentSchema = new mongoose.Schema({
    jobTitle: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: [String],
    responsibilities: [String],
    employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'intern'],
        default: 'full-time'
    },
    experienceLevel: {
        type: String,
        enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
        default: 'mid'
    },
    salaryRange: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'INR' }
    },
    location: String,
    openings: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['draft', 'open', 'on-hold', 'closed', 'filled'],
        default: 'draft'
    },
    postedDate: Date,
    closingDate: Date,
    applicants: [{
        name: String,
        email: String,
        phone: String,
        resumeUrl: String,
        coverLetter: String,
        appliedDate: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'],
            default: 'applied'
        },
        interviewDate: Date,
        interviewNotes: String,
        rating: { type: Number, min: 1, max: 5 },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for searching
recruitmentSchema.index({ jobTitle: 'text', description: 'text' });

const Recruitment = mongoose.model('Recruitment', recruitmentSchema);

export default Recruitment;
