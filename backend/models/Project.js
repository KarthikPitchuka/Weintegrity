import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    client: {
        type: String,
        trim: true
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['planned', 'in-progress', 'completed', 'on-hold'],
        default: 'planned'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    teamLeader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Team Leader is required']
    },
    teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }],
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    response: {
        content: {
            type: String,
            trim: true
        },
        submittedAt: {
            type: Date
        }
    }
}, {
    timestamps: true
});

// Index for searching and filtering
projectSchema.index({ name: 'text', description: 'text', client: 'text' });
projectSchema.index({ teamLeader: 1 });
projectSchema.index({ status: 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
