/**
 * Role-based permissions configuration for the frontend
 * Mirrors the backend permissions.js configuration
 */

export const ROLES = {
    ADMIN: 'admin',
    HR_MANAGER: 'HRManager',
    HR_EXECUTIVE: 'HRExecutive',
    DEPARTMENT_MANAGER: 'DepartmentManager',
    PAYROLL_OFFICER: 'PayrollOfficer',
    EMPLOYEE: 'Employee'
};

/**
 * Module access configuration - which roles can access which modules
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
    compliance: ['admin', 'HRManager', 'PayrollOfficer', 'Employee', 'hr', 'employee'],
    settings: ['admin', 'HRManager', 'hr'],
    reports: ['admin', 'HRManager', 'DepartmentManager', 'PayrollOfficer', 'hr', 'manager'],
    profile: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'hr', 'manager', 'employee'],
    projects: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'hr', 'manager', 'employee']
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
        Employee: 'Employee',
        // Lowercase aliases
        hr: 'HR Manager',
        manager: 'Manager',
        employee: 'Employee'
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
        Employee: 'View & update personal profile, view attendance & leave, download payslips, apply for leave',
        // Lowercase aliases
        hr: 'HR operations and employee management',
        manager: 'Team and department management',
        employee: 'View & update personal profile, view attendance & leave, download payslips, apply for leave'
    };
    return descriptions[role] || '';
};

/**
 * Get role badge color
 */
export const getRoleBadgeColor = (role) => {
    const colors = {
        admin: 'bg-red-100 text-red-800',
        HRManager: 'bg-purple-100 text-purple-800',
        HRExecutive: 'bg-blue-100 text-blue-800',
        DepartmentManager: 'bg-green-100 text-green-800',
        PayrollOfficer: 'bg-yellow-100 text-yellow-800',
        Employee: 'bg-gray-100 text-gray-800',
        // Lowercase aliases
        hr: 'bg-purple-100 text-purple-800',
        manager: 'bg-green-100 text-green-800',
        employee: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
};

/**
 * Check if role can perform action on resource
 */
export const canPerform = (role, module, action) => {
    // Admin can do everything
    if (role === 'admin') return true;

    const permissions = {
        HRManager: {
            employees: ['read', 'create', 'update', 'delete'],
            payroll: ['read', 'approve', 'generate', 'update'],
            leaves: ['read', 'approve', 'configure'],
            performance: ['read', 'create', 'update', 'configure'],
            attendance: ['read', 'manage', 'configure'],
            recruitment: ['read', 'create', 'update'],
            training: ['read', 'create', 'update'],
            assets: ['read', 'create', 'update', 'assign'],
            documents: ['read', 'create', 'verify', 'delete'],
            compliance: ['read', 'create', 'update'],
            reports: ['read', 'generate'],
            settings: ['read', 'update'],
            projects: ['read', 'create', 'update', 'delete']
        },
        HRExecutive: {
            employees: ['read', 'create', 'onboard', 'offboard'],
            recruitment: ['read', 'create', 'update'],
            attendance: ['read', 'manage'],
            leaves: ['read', 'apply'],
            training: ['read', 'create'],
            assets: ['read', 'assign'],
            documents: ['read', 'create'],
            projects: ['read', 'create', 'update']
        },
        DepartmentManager: {
            employees: ['read-team'],
            leaves: ['read-team', 'approve-team'],
            attendance: ['read-team', 'approve-team'],
            performance: ['read-team', 'create-team', 'update-team'],
            training: ['read'],
            assets: ['read-team'],
            documents: ['read-team'],
            reports: ['read-team'],
            projects: ['read-team']
        },
        PayrollOfficer: {
            payroll: ['read', 'create', 'update', 'generate', 'deductions'],
            employees: ['read-salary'],
            attendance: ['read'],
            leaves: ['read'],
            reports: ['read-payroll', 'generate-payroll'],
            compliance: ['read', 'update-tax']
        },
        Employee: {
            employees: ['read-self', 'update-self'],
            attendance: ['read-self', 'checkin', 'checkout'],
            leaves: ['read-self', 'apply', 'cancel-self'],
            payroll: ['read-self', 'download-payslip'],
            performance: ['read-self', 'self-assessment'],
            training: ['read', 'register', 'feedback'],
            assets: ['read-assigned'],
            documents: ['read-self', 'upload-self'],
            compliance: ['read', 'update'],
            projects: ['read-self', 'submit-response']
        },
        // Lowercase alias
        employee: {
            employees: ['read-self', 'update-self'],
            attendance: ['read-self', 'checkin', 'checkout'],
            leaves: ['read-self', 'apply', 'cancel-self'],
            payroll: ['read-self', 'download-payslip'],
            performance: ['read-self', 'self-assessment'],
            training: ['read', 'register', 'feedback'],
            assets: ['read-assigned'],
            documents: ['read-self', 'upload-self'],
            compliance: ['read', 'update'],
            projects: ['read-self', 'submit-response']
        }
    };

    const rolePerms = permissions[role];
    if (!rolePerms) return false;

    const modulePerms = rolePerms[module];
    if (!modulePerms) return false;

    return modulePerms.includes(action);
};

export default {
    ROLES,
    MODULE_ACCESS,
    canAccessModule,
    getRoleDisplayName,
    getRoleDescription,
    getRoleBadgeColor,
    canPerform
};
