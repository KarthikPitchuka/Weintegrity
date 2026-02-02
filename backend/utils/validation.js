import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to check validation results
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * User validation rules
 */
export const userValidation = {
    register: [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('firstName')
            .trim()
            .notEmpty()
            .withMessage('First name is required'),
        body('lastName')
            .trim()
            .notEmpty()
            .withMessage('Last name is required'),
        validate
    ],
    login: [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email'),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        validate
    ]
};

/**
 * Employee validation rules
 */
export const employeeValidation = {
    create: [
        body('personalInfo.firstName')
            .trim()
            .notEmpty()
            .withMessage('First name is required'),
        body('personalInfo.lastName')
            .trim()
            .notEmpty()
            .withMessage('Last name is required'),
        body('contactInfo.email')
            .isEmail()
            .withMessage('Valid email is required'),
        body('employmentInfo.department')
            .trim()
            .notEmpty()
            .withMessage('Department is required'),
        body('employmentInfo.designation')
            .trim()
            .notEmpty()
            .withMessage('Designation is required'),
        body('employmentInfo.joiningDate')
            .isISO8601()
            .withMessage('Valid joining date is required'),
        validate
    ],
    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid employee ID'),
        validate
    ]
};

/**
 * Leave validation rules
 */
export const leaveValidation = {
    apply: [
        body('leaveType')
            .isMongoId()
            .withMessage('Valid leave type is required'),
        body('startDate')
            .isISO8601()
            .withMessage('Valid start date is required'),
        body('endDate')
            .isISO8601()
            .withMessage('Valid end date is required')
            .custom((value, { req }) => {
                if (new Date(value) < new Date(req.body.startDate)) {
                    throw new Error('End date must be after start date');
                }
                return true;
            }),
        body('reason')
            .trim()
            .notEmpty()
            .withMessage('Reason is required'),
        validate
    ]
};

/**
 * Payroll validation rules
 */
export const payrollValidation = {
    generate: [
        body('employeeId')
            .isMongoId()
            .withMessage('Valid employee ID is required'),
        body('month')
            .isInt({ min: 1, max: 12 })
            .withMessage('Month must be between 1 and 12'),
        body('year')
            .isInt({ min: 2000, max: 2100 })
            .withMessage('Valid year is required'),
        validate
    ]
};

/**
 * Common validation rules
 */
export const commonValidation = {
    mongoId: [
        param('id')
            .isMongoId()
            .withMessage('Invalid ID format'),
        validate
    ],
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        validate
    ]
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Validate date range
 */
export const isValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return start <= end && !isNaN(start) && !isNaN(end);
};

/**
 * Validate phone number (basic)
 */
export const isValidPhone = (phone) => {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
};

export default {
    validate,
    userValidation,
    employeeValidation,
    leaveValidation,
    payrollValidation,
    commonValidation,
    sanitizeInput,
    isValidDateRange,
    isValidPhone
};
