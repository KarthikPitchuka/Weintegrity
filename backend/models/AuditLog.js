import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    // Action details
    action: {
        type: String,
        required: true,
        enum: [
            // Generic
            'create', 'read', 'update', 'delete', 'export', 'import', 'bulk-update',
            // Auth
            'login', 'logout', 'login-failed', 'password-change', 'password-reset',
            // Employee
            'employee-onboarded', 'employee-offboarded', 'employee-promoted', 'employee-transferred',
            // Attendance
            'check-in', 'check-out', 'attendance-regularized', 'attendance-approved',
            // Leave
            'leave-applied', 'leave-approved', 'leave-rejected', 'leave-cancelled',
            // Payroll
            'payroll-generated', 'payroll-approved', 'payroll-processed', 'salary-revised',
            // Admin
            'settings-changed', 'permissions-changed', 'role-assigned',
            // Other
            'document-uploaded', 'document-downloaded', 'email-sent', 'notification-sent'
        ]
    },

    // Entity affected
    entity: {
        type: { type: String, required: true }, // 'Employee', 'User', 'Leave', 'Payroll', etc.
        id: { type: mongoose.Schema.Types.ObjectId },
        name: String // Human readable identifier
    },

    // Who performed the action
    performedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String,
        role: String,
        ipAddress: String,
        userAgent: String
    },

    // Change details
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
        fieldsChanged: [String],
        summary: String
    },

    // Context
    module: {
        type: String,
        enum: ['auth', 'employees', 'attendance', 'leave', 'payroll', 'performance', 'recruitment',
            'training', 'documents', 'settings', 'organization', 'reports', 'compliance', 'other']
    },

    // Severity
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },

    // Outcome
    status: {
        type: String,
        enum: ['success', 'failure', 'partial'],
        default: 'success'
    },
    errorMessage: String,

    // Additional metadata
    metadata: {
        requestId: String,
        sessionId: String,
        duration: Number, // in ms
        source: { type: String, enum: ['web', 'mobile', 'api', 'system', 'scheduled'], default: 'web' }
    },

    // Timestamp (explicit for querying)
    timestamp: { type: Date, default: Date.now }
}, {
    timestamps: true,
    capped: { size: 104857600, max: 1000000 } // 100MB cap, max 1M documents
});

// Indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });
auditLogSchema.index({ 'entity.type': 1, 'entity.id': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1 });

// Static method to log an action
auditLogSchema.statics.log = async function (data) {
    try {
        const log = new this({
            action: data.action,
            entity: data.entity,
            performedBy: data.performedBy,
            changes: data.changes,
            module: data.module,
            severity: data.severity || 'info',
            status: data.status || 'success',
            errorMessage: data.errorMessage,
            metadata: data.metadata
        });
        await log.save();
        return log;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        return null;
    }
};

// Static method to get logs for an entity
auditLogSchema.statics.getEntityHistory = function (entityType, entityId, limit = 50) {
    return this.find({
        'entity.type': entityType,
        'entity.id': entityId
    })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('performedBy.userId', 'name email');
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function (userId, limit = 100) {
    return this.find({ 'performedBy.userId': userId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

// Static method to get security events
auditLogSchema.statics.getSecurityEvents = function (startDate, endDate) {
    return this.find({
        action: { $in: ['login', 'logout', 'login-failed', 'password-change', 'password-reset', 'permissions-changed', 'role-assigned'] },
        timestamp: { $gte: startDate, $lte: endDate }
    })
        .sort({ timestamp: -1 });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
