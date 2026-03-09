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
    category: {
        type: String,
        enum: ['IT Infrastructure', 'Client Delivery', 'Employee Branding', 'R&D', 'Internal Operations', 'Others'],
        default: 'Others'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    budget: {
        amount: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },
    milestones: [{
        title: {
            type: String,
            required: true
        },
        dueDate: {
            type: Date
        },
        status: {
            type: String,
            enum: ['pending', 'in-review', 'completed'],
            default: 'pending'
        },
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        }
    }],
    resources: [{
        name: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    }],
    risks: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'low'
        },
        status: {
            type: String,
            enum: ['open', 'resolved'],
            default: 'open'
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        reportedAt: {
            type: Date,
            default: Date.now
        }
    }],
    riskStatus: {
        type: String,
        enum: ['on-track', 'at-risk', 'delayed'],
        default: 'on-track'
    },
    tags: [String],
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
