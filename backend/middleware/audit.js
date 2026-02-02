// Audit logging middleware for tracking user actions
const auditLogs = [];

export const auditLog = (action) => {
    return (req, res, next) => {
        const originalSend = res.send;

        res.send = function (body) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                userId: req.user?._id || 'anonymous',
                userEmail: req.user?.email || 'anonymous',
                userRole: req.user?.role || 'unknown',
                method: req.method,
                path: req.originalUrl,
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                statusCode: res.statusCode,
                requestBody: sanitizeBody(req.body),
                responseStatus: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure'
            };

            // Log to console (in production, send to logging service)
            if (process.env.NODE_ENV !== 'test') {
                console.log('📝 Audit Log:', JSON.stringify(logEntry, null, 2));
            }

            // Store in memory (in production, use database or external service)
            auditLogs.push(logEntry);

            // Keep only last 1000 logs in memory
            if (auditLogs.length > 1000) {
                auditLogs.shift();
            }

            return originalSend.call(this, body);
        };

        next();
    };
};

// Sanitize sensitive data from request body
const sanitizeBody = (body) => {
    if (!body) return {};

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn', 'bankAccount'];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
};

// Get audit logs (for admin)
export const getAuditLogs = (filters = {}) => {
    let logs = [...auditLogs];

    if (filters.userId) {
        logs = logs.filter(log => log.userId.toString() === filters.userId);
    }

    if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }

    return logs.reverse(); // Most recent first
};

export default { auditLog, getAuditLogs };
