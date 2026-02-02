import mongoose from 'mongoose';

const complianceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['policy', 'regulation', 'certification', 'audit', 'training', 'document', 'other'],
        required: true
    },
    category: {
        type: String,
        enum: ['hr', 'legal', 'safety', 'financial', 'data-privacy', 'industry-specific', 'other'],
        required: true
    },
    description: String,
    requirements: [{
        title: String,
        description: String,
        mandatory: { type: Boolean, default: true },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'non-compliant'],
            default: 'pending'
        },
        dueDate: Date,
        completedDate: Date,
        evidence: [String], // URLs to supporting documents
        notes: String
    }],
    applicableTo: {
        allEmployees: { type: Boolean, default: true },
        departments: [String],
        designations: [String],
        locations: [String]
    },
    effectiveDate: {
        type: Date,
        required: true
    },
    expiryDate: Date,
    renewalDate: Date,
    frequency: {
        type: String,
        enum: ['one-time', 'monthly', 'quarterly', 'half-yearly', 'annual'],
        default: 'annual'
    },
    responsiblePerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    overallStatus: {
        type: String,
        enum: ['compliant', 'partially-compliant', 'non-compliant', 'pending-review', 'expired'],
        default: 'pending-review'
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    documents: [{
        name: String,
        url: String,
        uploadedOn: Date
    }],
    auditHistory: [{
        auditDate: Date,
        auditor: String,
        findings: String,
        recommendations: String,
        status: String
    }],
    notifications: {
        enabled: { type: Boolean, default: true },
        reminderDays: [Number], // Days before due date to send reminders
        recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for searching and querying
complianceSchema.index({ title: 'text', description: 'text' });
complianceSchema.index({ type: 1, category: 1, overallStatus: 1 });

const Compliance = mongoose.model('Compliance', complianceSchema);

export default Compliance;
