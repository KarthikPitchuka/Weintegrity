import AuditLog from '../models/AuditLog.js';

// Get audit logs with filters
export const getAuditLogs = async (req, res) => {
    try {
        const {
            action, module, severity, userId, entityType, entityId,
            startDate, endDate, status, page = 1, limit = 50
        } = req.query;

        const query = {};
        if (action) query.action = action;
        if (module) query.module = module;
        if (severity) query.severity = severity;
        if (userId) query['performedBy.userId'] = userId;
        if (entityType) query['entity.type'] = entityType;
        if (entityId) query['entity.id'] = entityId;
        if (status) query.status = status;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('performedBy.userId', 'name email');

        const total = await AuditLog.countDocuments(query);

        res.json({
            logs,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get entity history
export const getEntityHistory = async (req, res) => {
    try {
        const { entityType, entityId, limit = 50 } = req.query;
        if (!entityType || !entityId) {
            return res.status(400).json({ message: 'entityType and entityId are required' });
        }

        const logs = await AuditLog.getEntityHistory(entityType, entityId, parseInt(limit));
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get user activity
export const getUserActivity = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;
        const limit = parseInt(req.query.limit) || 100;

        const logs = await AuditLog.getUserActivity(userId, limit);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get security events
export const getSecurityEvents = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
        const end = endDate ? new Date(endDate) : new Date();

        const logs = await AuditLog.getSecurityEvents(start, end);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get analytics/dashboard data
export const getAuditAnalytics = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [actionStats, moduleStats, severityStats, dailyStats, topUsers] = await Promise.all([
            // Actions breakdown
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            // Module breakdown
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                { $group: { _id: '$module', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Severity breakdown
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ]),

            // Daily activity
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // Top active users
            AuditLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: '$performedBy.userId',
                        name: { $first: '$performedBy.name' },
                        email: { $first: '$performedBy.email' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        // Failed logins
        const failedLogins = await AuditLog.countDocuments({
            action: 'login-failed',
            timestamp: { $gte: startDate }
        });

        res.json({
            period: { start: startDate, end: new Date() },
            summary: {
                totalEvents: await AuditLog.countDocuments({ timestamp: { $gte: startDate } }),
                failedLogins,
                criticalEvents: await AuditLog.countDocuments({ severity: 'critical', timestamp: { $gte: startDate } })
            },
            actionStats,
            moduleStats,
            severityStats,
            dailyStats,
            topUsers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Export logs
export const exportLogs = async (req, res) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;

        const query = {};
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .limit(10000) // Max 10k records
            .lean();

        if (format === 'csv') {
            const fields = ['timestamp', 'action', 'entity.type', 'entity.name', 'performedBy.name', 'performedBy.email', 'status', 'severity'];
            const csv = [
                fields.join(','),
                ...logs.map(log => fields.map(f => {
                    const val = f.split('.').reduce((o, k) => o?.[k], log);
                    return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
                }).join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
            return res.send(csv);
        }

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
