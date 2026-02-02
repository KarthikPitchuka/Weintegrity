import mongoose from 'mongoose';

const projectUpdateSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Update content is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['member_update', 'leader_update'],
        default: 'member_update'
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Indexes
projectUpdateSchema.index({ project: 1, createdAt: -1 });

const ProjectUpdate = mongoose.model('ProjectUpdate', projectUpdateSchema);

export default ProjectUpdate;
