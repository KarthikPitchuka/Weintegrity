/**
 * Role-based permissions configuration
 * Each role has a list of allowed permissions based on specific HR roles
 */

export const ROLES = {
    ADMIN: 'admin',
    HR_MANAGER: 'HRManager',
    HR_EXECUTIVE: 'HRExecutive',
    DEPARTMENT_MANAGER: 'DepartmentManager',
    PAYROLL_OFFICER: 'PayrollOfficer',
    EMPLOYEE: 'Employee'
};

export const PERMISSIONS = {
    admin: [
        '*', // Admin has all permissions
    ],

    // HRManager - Controls HR operations
    HRManager: [
        // Employee management - Full control
        'employee:read',
        'employee:create',
        'employee:update',
        'employee:delete',

        // Payroll - Approve payroll
        'payroll:read',
        'payroll:approve',
        'payroll:generate',
        'payroll:update',

        // Leave - Configure leave policies
        'leave:read',
        'leave:approve',
        'leave:configure',
        'leave-type:manage',

        // Performance - Manage performance cycles
        'performance:read',
        'performance:create',
        'performance:update',
        'performance:configure',

        // Attendance
        'attendance:read',
        'attendance:manage',
        'attendance:configure',

        // Recruitment
        'recruitment:read',
        'recruitment:create',
        'recruitment:update',

        // Training
        'training:read',
        'training:create',
        'training:update',

        // Assets
        'asset:read',
        'asset:create',
        'asset:update',
        'asset:assign',

        // Documents - Full access
        'document:read',
        'document:create',
        'document:verify',
        'document:delete',

        // Compliance
        'compliance:read',
        'compliance:create',
        'compliance:update',

        // Reports
        'reports:read',
        'reports:generate'
    ],

    // HRExecutive - Recruitment and daily HR tasks
    HRExecutive: [
        // Recruitment operations - Full control
        'recruitment:read',
        'recruitment:create',
        'recruitment:update',

        // Employee onboarding/offboarding
        'employee:read',
        'employee:create',
        'employee:onboard',
        'employee:offboard',

        // Attendance - Daily tasks
        'attendance:read',
        'attendance:manage',

        // Leave - Daily tasks
        'leave:read',
        'leave:apply',

        // Training
        'training:read',
        'training:create',

        // Assets
        'asset:read',
        'asset:assign',

        // Documents
        'document:read',
        'document:create',

        // Cannot modify salaries or payroll settings
        // No payroll:update, payroll:configure
    ],

    // DepartmentManager - Team management
    DepartmentManager: [
        // Limited employee access (team only)
        'employee:read:team',

        // Leave - Approve for team
        'leave:read:team',
        'leave:approve:team',

        // Attendance - Approve corrections for team
        'attendance:read:team',
        'attendance:approve:team',

        // Performance - View team performance
        'performance:read:team',
        'performance:create:team',
        'performance:update:team',

        // Training
        'training:read',

        // Assets (view only)
        'asset:read:team',

        // Documents (limited - cannot view salary/confidential)
        'document:read:team',

        // Reports (team only)
        'reports:read:team'

        // Cannot view salaries or confidential data
        // No payroll:* permissions
    ],

    // PayrollOfficer - Salary and payroll management
    PayrollOfficer: [
        // Salary structures
        'payroll:read',
        'payroll:create',
        'payroll:update',
        'payroll:generate',

        // Statutory deductions (PF, ESI, TAX)
        'payroll:deductions',
        'payroll:statutory',

        // Employee salary view (not personal documents)
        'employee:read:salary',

        // Attendance (for payroll calculation)
        'attendance:read',

        // Leave (for payroll calculation)
        'leave:read',

        // Reports
        'reports:read:payroll',
        'reports:generate:payroll',

        // Compliance (tax related)
        'compliance:read',
        'compliance:update:tax'

        // Cannot view personal documents
        // No document:read:personal
    ],

    // Employee - Self-service only
    Employee: [
        // Self-service - View & update personal profile
        'employee:read:self',
        'employee:update:self',

        // View attendance & leave
        'attendance:read:self',
        'attendance:checkin',
        'attendance:checkout',

        // Apply for leave
        'leave:read:self',
        'leave:apply',
        'leave:cancel:self',

        // Download payslips
        'payroll:read:self',
        'payslip:download:self',

        // Performance (self)
        'performance:read:self',
        'performance:self-assessment',

        // Training
        'training:read',
        'training:register',
        'training:feedback',

        // Assets (assigned)
        'asset:read:assigned',

        // Documents (own)
        'document:read:self',
        'document:upload:self'
    ],

    // Backward compatibility aliases for lowercase roles
    employee: [
        'employee:read:self',
        'employee:update:self',
        'attendance:read:self',
        'attendance:checkin',
        'attendance:checkout',
        'leave:read:self',
        'leave:apply',
        'leave:cancel:self',
        'payroll:read:self',
        'payslip:download:self',
        'performance:read:self',
        'performance:self-assessment',
        'training:read',
        'training:register',
        'training:feedback',
        'asset:read:assigned',
        'document:read:self',
        'document:upload:self'
    ],
    hr: [
        'employee:read', 'employee:create', 'employee:update',
        'payroll:read', 'leave:read', 'leave:approve',
        'attendance:read', 'attendance:manage',
        'recruitment:read', 'recruitment:create',
        'training:read', 'training:create',
        'document:read', 'document:create',
        'compliance:read'
    ],
    manager: [
        'employee:read:team',
        'leave:read:team', 'leave:approve:team',
        'attendance:read:team', 'attendance:approve:team',
        'performance:read:team', 'performance:create:team',
        'training:read',
        'document:read:team',
        'reports:read:team'
    ]
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role, permission) => {
    const rolePermissions = PERMISSIONS[role] || [];

    // Admin check
    if (rolePermissions.includes('*')) {
        return true;
    }

    // Exact permission match
    if (rolePermissions.includes(permission)) {
        return true;
    }

    // Check for wildcard in permission category
    const [category] = permission.split(':');
    if (rolePermissions.includes(`${category}:*`)) {
        return true;
    }

    // Check for broader permission (e.g., 'leave:read' grants 'leave:read:self')
    const basePerm = permission.replace(/:self$|:team$/, '');
    if (rolePermissions.includes(basePerm)) {
        return true;
    }

    return false;
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role) => {
    return PERMISSIONS[role] || [];
};

/**
 * Check if user can access a resource
 */
export const canAccess = (userRole, resource, action, isOwner = false, isTeamMember = false) => {
    const permission = `${resource}:${action}`;
    const selfPermission = `${resource}:${action}:self`;
    const teamPermission = `${resource}:${action}:team`;

    if (hasPermission(userRole, permission)) {
        return true;
    }

    if (isOwner && hasPermission(userRole, selfPermission)) {
        return true;
    }

    if (isTeamMember && hasPermission(userRole, teamPermission)) {
        return true;
    }

    return false;
};

/**
 * Module hierarchy for determining access levels
 * Includes both capitalized and lowercase role variants for backward compatibility
 */
export const MODULE_ACCESS = {
    dashboard: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'hr', 'manager', 'employee'],
    employees: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'hr', 'manager'],
    recruitment: ['admin', 'HRManager', 'HRExecutive', 'hr'],
    attendance: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'hr', 'manager', 'employee'],
    leaves: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'hr', 'manager', 'employee'],
    payroll: ['admin', 'HRManager', 'PayrollOfficer', 'Employee', 'hr', 'employee'],
    performance: ['admin', 'HRManager', 'DepartmentManager', 'Employee', 'hr', 'manager', 'employee'],
    training: ['admin', 'HRManager', 'HRExecutive', 'Employee', 'hr', 'employee'],
    assets: ['admin', 'HRManager', 'HRExecutive', 'hr'],
    documents: ['admin', 'HRManager', 'HRExecutive', 'Employee', 'hr', 'employee'],
    compliance: ['admin', 'HRManager', 'PayrollOfficer', 'hr'],
    settings: ['admin', 'HRManager', 'hr'],
    reports: ['admin', 'HRManager', 'DepartmentManager', 'PayrollOfficer', 'hr', 'manager'],
    profile: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'hr', 'manager', 'employee']
};

/**
 * Check if role can access a module
 */
export const canAccessModule = (role, module) => {
    const allowedRoles = MODULE_ACCESS[module] || [];
    return allowedRoles.includes(role);
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role) => {
    const displayNames = {
        admin: 'Administrator',
        HRManager: 'HR Manager',
        HRExecutive: 'HR Executive',
        DepartmentManager: 'Department Manager',
        PayrollOfficer: 'Payroll Officer',
        Employee: 'Employee'
    };
    return displayNames[role] || role;
};

/**
 * Get role description
 */
export const getRoleDescription = (role) => {
    const descriptions = {
        admin: 'Full system access and control',
        HRManager: 'Controls HR operations, edit employee details, approve payroll, configure leave policies, manage performance cycles',
        HRExecutive: 'Recruitment operations, employee onboarding/offboarding, daily HR tasks like attendance and leave',
        DepartmentManager: 'Approve leaves for team, approve attendance corrections, view team performance',
        PayrollOfficer: 'Manage salary structures, generate payroll runs, handle statutory deductions (PF, ESI, TAX)',
        Employee: 'View & update personal profile, view attendance & leave, download payslips, apply for leave'
    };
    return descriptions[role] || '';
};

export default {
    ROLES,
    PERMISSIONS,
    hasPermission,
    getRolePermissions,
    canAccess,
    MODULE_ACCESS,
    canAccessModule,
    getRoleDisplayName,
    getRoleDescription
};
