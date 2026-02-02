import { PERMISSIONS, ROLES, MODULE_ACCESS } from '../utils/permissions.js';

// Role-Based Access Control Middleware
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

// Permission-based access control
export const hasPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userRole = req.user.role;
        const rolePermissions = PERMISSIONS[userRole] || [];

        // Admin has all permissions
        if (userRole === 'admin' || rolePermissions.includes('*')) {
            return next();
        }

        // Check for exact permission
        if (rolePermissions.includes(requiredPermission)) {
            return next();
        }

        // Check for broader permission (e.g., 'leave:read' grants 'leave:read:self')
        const basePerm = requiredPermission.replace(/:self$|:team$/, '');
        if (rolePermissions.includes(basePerm)) {
            return next();
        }

        return res.status(403).json({
            message: `Access denied. Required permission: ${requiredPermission}`,
            userRole: userRole
        });
    };
};

// Check if user can access resource (own data, team data, or admin)
export const canAccessResource = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

        // Admin or HRManager can access any resource
        if (req.user.role === 'admin' || req.user.role === 'HRManager') {
            return next();
        }

        // HRExecutive can access employee resources (except salary info)
        if (req.user.role === 'HRExecutive') {
            return next();
        }

        // DepartmentManager can access team resources
        if (req.user.role === 'DepartmentManager') {
            // Check if the resource belongs to their team
            // This would require checking the department relationship
            req.teamAccess = true;
            return next();
        }

        // PayrollOfficer can access salary-related resources
        if (req.user.role === 'PayrollOfficer') {
            req.payrollAccess = true;
            return next();
        }

        // User can only access their own resources
        if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: 'Access denied. You can only access your own resources.'
            });
        }

        next();
    };
};

// Check if user can access a module
export const canAccessModuleMiddleware = (moduleName) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const allowedRoles = MODULE_ACCESS[moduleName] || [];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. You do not have access to the ${moduleName} module.`,
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

// Middleware to restrict salary/confidential data access
export const restrictConfidentialAccess = () => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const role = req.user.role;

        // Only these roles can access confidential data
        const allowedRoles = ['admin', 'HRManager', 'PayrollOfficer'];

        if (!allowedRoles.includes(role)) {
            // Filter out confidential fields from response
            req.filterConfidential = true;
        }

        next();
    };
};

export default {
    authorize,
    hasPermission,
    canAccessResource,
    canAccessModuleMiddleware,
    restrictConfidentialAccess
};
