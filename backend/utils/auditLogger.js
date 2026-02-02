import AuditLog from '../models/AuditLog.js';

/**
 * Utility for logging audit events across the application
 */

// Helper to extract IP address from request
const getIpAddress = (req) => {
    return req.ip ||
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection?.remoteAddress ||
        'unknown';
};

// Helper to get user agent
const getUserAgent = (req) => {
    return req.get('User-Agent') || 'unknown';
};

/**
 * Log an audit event
 * @param {Object} options - Audit log options
 * @param {string} options.action - Action type (e.g., 'create', 'update', 'delete', 'login')
 * @param {Object} options.entity - Entity affected { type, id, name }
 * @param {Object} options.performedBy - User who performed action { userId, name, email, role }
 * @param {Object} options.changes - Changes made { before, after, fieldsChanged, summary }
 * @param {string} options.module - Module name (e.g., 'employees', 'leave', 'payroll')
 * @param {string} options.severity - Severity level ('info', 'warning', 'critical')
 * @param {string} options.status - Status ('success', 'failure', 'partial')
 * @param {string} options.errorMessage - Error message if status is failure
 * @param {Object} options.metadata - Additional metadata { requestId, sessionId, duration, source }
 * @param {Object} options.req - Express request object (optional, for extracting IP/user agent)
 */
export const logAudit = async (options) => {
    try {
        const {
            action,
            entity,
            performedBy,
            changes,
            module,
            severity = 'info',
            status = 'success',
            errorMessage,
            metadata,
            req
        } = options;

        // Build performedBy object with IP if request is provided
        const performedByData = {
            userId: performedBy?.userId || performedBy?._id,
            name: performedBy?.name || `${performedBy?.firstName || ''} ${performedBy?.lastName || ''}`.trim(),
            email: performedBy?.email,
            role: performedBy?.role,
            ipAddress: req ? getIpAddress(req) : performedBy?.ipAddress,
            userAgent: req ? getUserAgent(req) : performedBy?.userAgent
        };

        const log = await AuditLog.log({
            action,
            entity,
            performedBy: performedByData,
            changes,
            module,
            severity,
            status,
            errorMessage,
            metadata: {
                ...metadata,
                source: metadata?.source || 'web'
            }
        });

        return log;
    } catch (error) {
        console.error('Audit logging failed:', error);
        return null;
    }
};

/**
 * Quick log functions for common actions
 */

// Authentication events
export const logLogin = async (user, req, success = true, errorMessage = null) => {
    return logAudit({
        action: success ? 'login' : 'login-failed',
        entity: { type: 'User', id: user?._id, name: user?.email || 'Unknown' },
        performedBy: user || { name: 'Unknown' },
        module: 'auth',
        severity: success ? 'info' : 'warning',
        status: success ? 'success' : 'failure',
        errorMessage,
        req
    });
};

export const logLogout = async (user, req) => {
    return logAudit({
        action: 'logout',
        entity: { type: 'User', id: user._id, name: user.email },
        performedBy: user,
        module: 'auth',
        severity: 'info',
        status: 'success',
        req
    });
};

export const logPasswordChange = async (user, req) => {
    return logAudit({
        action: 'password-change',
        entity: { type: 'User', id: user._id, name: user.email },
        performedBy: user,
        module: 'auth',
        severity: 'warning',
        status: 'success',
        req
    });
};

// CRUD operations
export const logCreate = async (module, entity, user, req, details = null) => {
    return logAudit({
        action: 'create',
        entity,
        performedBy: user,
        module,
        severity: 'info',
        status: 'success',
        changes: details ? { summary: details } : undefined,
        req
    });
};

export const logUpdate = async (module, entity, user, req, changes = null) => {
    return logAudit({
        action: 'update',
        entity,
        performedBy: user,
        module,
        severity: 'info',
        status: 'success',
        changes,
        req
    });
};

export const logDelete = async (module, entity, user, req) => {
    return logAudit({
        action: 'delete',
        entity,
        performedBy: user,
        module,
        severity: 'warning',
        status: 'success',
        req
    });
};

// Employee-specific events
export const logEmployeeOnboarded = async (employee, user, req) => {
    return logAudit({
        action: 'employee-onboarded',
        entity: {
            type: 'Employee',
            id: employee._id,
            name: `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim()
        },
        performedBy: user,
        module: 'employees',
        severity: 'info',
        status: 'success',
        changes: { summary: `New employee ${employee.employeeId} onboarded` },
        req
    });
};

export const logEmployeeOffboarded = async (employee, user, req) => {
    return logAudit({
        action: 'employee-offboarded',
        entity: {
            type: 'Employee',
            id: employee._id,
            name: `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim()
        },
        performedBy: user,
        module: 'employees',
        severity: 'warning',
        status: 'success',
        req
    });
};

// Leave events
export const logLeaveApplied = async (leave, user, req) => {
    return logAudit({
        action: 'leave-applied',
        entity: { type: 'Leave', id: leave._id, name: `${leave.leaveType} leave` },
        performedBy: user,
        module: 'leave',
        severity: 'info',
        status: 'success',
        changes: {
            summary: `Applied for ${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate}`
        },
        req
    });
};

export const logLeaveApproved = async (leave, approver, req) => {
    return logAudit({
        action: 'leave-approved',
        entity: { type: 'Leave', id: leave._id, name: `${leave.leaveType} leave` },
        performedBy: approver,
        module: 'leave',
        severity: 'info',
        status: 'success',
        changes: { summary: `Leave approved for employee` },
        req
    });
};

export const logLeaveRejected = async (leave, approver, reason, req) => {
    return logAudit({
        action: 'leave-rejected',
        entity: { type: 'Leave', id: leave._id, name: `${leave.leaveType} leave` },
        performedBy: approver,
        module: 'leave',
        severity: 'info',
        status: 'success',
        changes: { summary: `Leave rejected. Reason: ${reason}` },
        req
    });
};

// Attendance events
export const logCheckIn = async (attendance, user, req) => {
    return logAudit({
        action: 'check-in',
        entity: { type: 'Attendance', id: attendance._id, name: `Attendance ${attendance.date}` },
        performedBy: user,
        module: 'attendance',
        severity: 'info',
        status: 'success',
        req
    });
};

export const logCheckOut = async (attendance, user, req) => {
    return logAudit({
        action: 'check-out',
        entity: { type: 'Attendance', id: attendance._id, name: `Attendance ${attendance.date}` },
        performedBy: user,
        module: 'attendance',
        severity: 'info',
        status: 'success',
        req
    });
};

// Payroll events
export const logPayrollGenerated = async (payroll, user, req) => {
    return logAudit({
        action: 'payroll-generated',
        entity: { type: 'Payroll', id: payroll._id, name: `Payroll ${payroll.month}/${payroll.year}` },
        performedBy: user,
        module: 'payroll',
        severity: 'info',
        status: 'success',
        req
    });
};

export const logPayrollApproved = async (payroll, user, req) => {
    return logAudit({
        action: 'payroll-approved',
        entity: { type: 'Payroll', id: payroll._id, name: `Payroll ${payroll.month}/${payroll.year}` },
        performedBy: user,
        module: 'payroll',
        severity: 'warning',
        status: 'success',
        req
    });
};

export const logSalaryRevised = async (employee, oldSalary, newSalary, user, req) => {
    return logAudit({
        action: 'salary-revised',
        entity: { type: 'Employee', id: employee._id, name: employee.employeeId },
        performedBy: user,
        module: 'payroll',
        severity: 'critical',
        status: 'success',
        changes: {
            before: { salary: oldSalary },
            after: { salary: newSalary },
            summary: `Salary revised from ${oldSalary} to ${newSalary}`
        },
        req
    });
};

// Document events
export const logDocumentUploaded = async (document, user, req) => {
    return logAudit({
        action: 'document-uploaded',
        entity: { type: 'Document', id: document._id, name: document.name || document.title },
        performedBy: user,
        module: 'documents',
        severity: 'info',
        status: 'success',
        req
    });
};

export const logDocumentDownloaded = async (document, user, req) => {
    return logAudit({
        action: 'document-downloaded',
        entity: { type: 'Document', id: document._id, name: document.name || document.title },
        performedBy: user,
        module: 'documents',
        severity: 'info',
        status: 'success',
        req
    });
};

// Settings events
export const logSettingsChanged = async (settingName, oldValue, newValue, user, req) => {
    return logAudit({
        action: 'settings-changed',
        entity: { type: 'Settings', name: settingName },
        performedBy: user,
        module: 'settings',
        severity: 'warning',
        status: 'success',
        changes: {
            before: oldValue,
            after: newValue,
            summary: `Setting "${settingName}" changed`
        },
        req
    });
};

export const logRoleAssigned = async (targetUser, newRole, assignedBy, req) => {
    return logAudit({
        action: 'role-assigned',
        entity: { type: 'User', id: targetUser._id, name: targetUser.email },
        performedBy: assignedBy,
        module: 'settings',
        severity: 'critical',
        status: 'success',
        changes: { summary: `Role changed to ${newRole}` },
        req
    });
};

// Export helpers
export const logExport = async (module, exportType, user, req) => {
    return logAudit({
        action: 'export',
        entity: { type: exportType, name: `${module} export` },
        performedBy: user,
        module,
        severity: 'info',
        status: 'success',
        req
    });
};

export default {
    logAudit,
    logLogin,
    logLogout,
    logPasswordChange,
    logCreate,
    logUpdate,
    logDelete,
    logEmployeeOnboarded,
    logEmployeeOffboarded,
    logLeaveApplied,
    logLeaveApproved,
    logLeaveRejected,
    logCheckIn,
    logCheckOut,
    logPayrollGenerated,
    logPayrollApproved,
    logSalaryRevised,
    logDocumentUploaded,
    logDocumentDownloaded,
    logSettingsChanged,
    logRoleAssigned,
    logExport
};
