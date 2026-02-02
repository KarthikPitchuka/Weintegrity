import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import Notification from '../models/Notification.js';
import Onboarding from '../models/Onboarding.js';
import Performance from '../models/Performance.js';
import Document from '../models/Document.js';
import SalaryStructure from '../models/SalaryStructure.js';
import SalaryRevision from '../models/SalaryRevision.js';
import TaxDeclaration from '../models/TaxDeclaration.js';
import Reimbursement from '../models/Reimbursement.js';
import Loan from '../models/Loan.js';
import Training from '../models/Training.js';
import { sendEmail, emailTemplates, generateOTP } from '../services/emailService.js';
import { logEmployeeOnboarded, logUpdate, logDelete } from '../utils/auditLogger.js';

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
export const getEmployees = async (req, res) => {
    try {
        const { page = 1, limit = 10, department, status, search } = req.query;

        const query = {};

        // Handle both nested and flat department structures
        if (department) {
            query.$or = [
                { 'employmentInfo.department': department },
                { 'employment_details.department_id': department }
            ];
        }
        if (status) query.status = status;

        // Search across both data structures
        if (search) {
            query.$or = [
                { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
                { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
                { 'first_name': { $regex: search, $options: 'i' } },
                { 'last_name': { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } },
                { employee_code: { $regex: search, $options: 'i' } },
                { 'contactInfo.email': { $regex: search, $options: 'i' } },
                { 'work_email': { $regex: search, $options: 'i' } }
            ];
        }

        const employees = await Employee.find(query)
            .populate('employmentInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName')
            .populate('employmentInfo.shift', 'name code timing type')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Employee.countDocuments(query);

        res.json({
            employees,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employees', error: error.message });
    }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private
export const getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate('employmentInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('employmentInfo.shift', 'name code timing type workingDays')
            .populate('documents')
            .populate('userId', 'email role isEmailVerified');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({ employee });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employee', error: error.message });
    }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (HR, Admin)
// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (HR, Admin)
export const createEmployee = async (req, res) => {
    try {
        console.log('Creating employee:', req.body.contactInfo?.email);

        // Extract password, createUser, and HR OTP from request body
        const { password, createUser, hrOtp, ...employeeData } = req.body;

        // Verify HR action OTP
        if (!hrOtp) {
            return res.status(403).json({ message: 'Authorization code required' });
        }

        const requestor = await User.findById(req.user._id);
        if (!requestor || requestor.actionOTP !== hrOtp || requestor.actionOTPExpires < new Date()) {
            return res.status(403).json({ message: 'Invalid or expired authorization code' });
        }

        // Validate email if createUser is requested
        const email = employeeData.contactInfo?.email;

        // Verify that the OTP was sent to this employee's email (security check)
        if (email && requestor.pendingEmployeeEmail) {
            if (requestor.pendingEmployeeEmail.toLowerCase() !== email.toLowerCase()) {
                return res.status(403).json({
                    message: 'The verification code was sent to a different email address. Please request a new code for this employee.'
                });
            }
        }

        // Clear the OTP after successful use
        requestor.actionOTP = undefined;
        requestor.actionOTPExpires = undefined;
        requestor.pendingEmployeeEmail = undefined;
        await requestor.save();

        // Validate email if createUser is requested
        if (createUser && !email) {
            return res.status(400).json({ message: 'Email is required to create a user account' });
        }

        // Check if email already exists in User collection
        if (email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ message: 'A user account with this email already exists' });
            }
        }

        const employee = await Employee.create(employeeData);

        let userCreated = false;
        let verificationSent = false;

        // If creating user account, verify immediately (since HR created it)
        if (createUser && password && email) {
            try {
                // Create user with VERIFIED status
                const user = await User.create({
                    email: email,
                    password: password,
                    firstName: employee.personalInfo.firstName,
                    lastName: employee.personalInfo.lastName,
                    role: 'Employee',
                    employeeId: employee._id,
                    isActive: true,
                    isEmailVerified: true, // Auto-verified since HR created it
                    // No OTP needed
                    emailOTP: undefined,
                    emailOTPExpires: undefined
                });

                employee.userId = user._id;
                await employee.save();
                userCreated = true;

                // Send ACCOUNT CREATED email (Welcome email)
                const emailTemplate = emailTemplates.accountCreated(employee.personalInfo.firstName, password);

                const emailResult = await sendEmail({
                    to: email,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html
                });

                if (emailResult.success) {
                    verificationSent = true;
                    console.log(`Welcome email sent to new employee: ${email}`);
                } else {
                    console.error(`Failed to send welcome email to ${email}:`, emailResult.error);
                }

                console.log('User account created for employee (pending verification):', employee._id);
            } catch (userError) {
                console.error('Error creating user account:', userError);
                // Don't fail the whole request, just log the error
            }
        }

        // Log employee creation in background
        logEmployeeOnboarded(employee, req.user, req).catch(err => console.error('Audit log failed:', err));

        console.log('Employee created successfully:', employee._id);
        res.status(201).json({
            message: userCreated
                ? (verificationSent
                    ? 'Employee created successfully! A verification code has been sent to ' + email
                    : 'Employee created with login credentials (verification email failed to send)')
                : 'Employee created successfully',
            employee,
            userCreated,
            verificationSent
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        if (error.code === 11000) {
            // Determine which field caused the duplicate error
            const keyPattern = error.keyPattern || {};
            const keyValue = error.keyValue || {};
            let duplicateField = Object.keys(keyPattern).join(', ') || 'email or code';
            let duplicateValue = Object.values(keyValue).join(', ') || '';
            console.error('Duplicate key error:', { keyPattern, keyValue });
            return res.status(400).json({
                message: `Employee with this ${duplicateField} already exists${duplicateValue ? ` (${duplicateValue})` : ''}`
            });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Error creating employee', error: error.message });
    }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (HR, Admin)
export const updateEmployee = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;

        // Clean empty enum values to prevent validation errors
        // MongoDB enum fields don't accept empty strings
        if (updateData.personalInfo) {
            if (updateData.personalInfo.gender === '') {
                delete updateData.personalInfo.gender;
            }
            if (updateData.personalInfo.maritalStatus === '') {
                delete updateData.personalInfo.maritalStatus;
            }
        }
        if (updateData.employmentInfo) {
            if (updateData.employmentInfo.employmentType === '') {
                delete updateData.employmentInfo.employmentType;
            }
        }

        console.log('Updating employee:', req.params.id);
        console.log('Updating employee profile:', req.params.id);
        console.log('Password provided:', password ? 'Yes' : 'No');

        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Handle password - create or update user account
        if (password && password.trim()) {
            const email = employee.contactInfo?.email;
            if (!email) {
                return res.status(400).json({ message: 'Employee must have an email to create login credentials' });
            }

            console.log('Processing password update for employee:', employee._id);

            // Check if user already exists for this employee
            let user = await User.findOne({ employeeId: employee._id });
            let verificationSent = false;

            if (user) {
                // Update existing user's password (already verified, just update)
                console.log('Updating existing user:', user._id);
                user.password = password;
                user.firstName = employee.personalInfo?.firstName || user.firstName;
                user.lastName = employee.personalInfo?.lastName || user.lastName;
                user.email = email;
                await user.save();
            } else {
                // Check if user exists with this email but not linked to employee
                user = await User.findOne({ email: email.toLowerCase() });

                if (user) {
                    // Link existing user to this employee and update password
                    console.log('Linking existing user to employee:', user._id);
                    user.employeeId = employee._id;
                    user.password = password;
                    user.role = 'Employee';
                    await user.save();
                } else {
                    // Create new user account with verification required
                    console.log('Creating new user account for employee (with verification)');

                    // Generate OTP
                    const otp = generateOTP();
                    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

                    user = await User.create({
                        email: email,
                        password: password,
                        firstName: employee.personalInfo?.firstName || 'Employee',
                        lastName: employee.personalInfo?.lastName || '',
                        role: 'Employee',
                        employeeId: employee._id,
                        isActive: true,
                        isEmailVerified: false,
                        emailOTP: otp,
                        emailOTPExpires: otpExpires
                    });

                    // Send verification email
                    const emailTemplate = emailTemplates.verifyEmailOTP(employee.personalInfo?.firstName || 'Employee', otp);

                    const emailResult = await sendEmail({
                        to: email,
                        subject: emailTemplate.subject,
                        html: emailTemplate.html
                    });

                    if (emailResult.success) {
                        verificationSent = true;
                        console.log(`Verification OTP sent to employee: ${email}`);
                    } else {
                        console.error(`Failed to send verification OTP to ${email}:`, emailResult.error);
                    }
                }
            }

            // Link user to employee if not already linked
            if (!employee.userId || employee.userId.toString() !== user._id.toString()) {
                employee.userId = user._id;
                await employee.save();
            }

            console.log('Password update successful');
            return res.json({
                message: verificationSent
                    ? 'Employee updated! A verification code has been sent to ' + email
                    : 'Employee updated successfully with login credentials',
                employee,
                userCreated: true,
                verificationSent
            });
        }

        // Log employee update in background
        logUpdate('employees',
            { type: 'Employee', id: employee._id, name: `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim() },
            req.user, req
        ).catch(err => console.error('Audit log failed:', err));

        res.json({ message: 'Employee updated successfully', employee });
    } catch (error) {
        console.error('Error updating employee:', error);

        // Handle validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                message: 'Validation error: ' + messages.join(', '),
                errors: error.errors
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        res.status(500).json({ message: 'Error updating employee', error: error.message });
    }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin)
export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const linkedUserId = employee.userId;
        const linkedUserEmail = employee.contactInfo?.email;
        const employeeId = employee._id;

        // Build comprehensive deletion criteria
        // Some collections use employeeId, some use userId, some use employee field
        const employeeIdCriteria = { employeeId: employeeId };
        const employeeFieldCriteria = { employee: employeeId };

        // Extended criteria for collections that might reference userId
        const userIdCriteria = linkedUserId ? { userId: linkedUserId } : null;
        const userFieldCriteria = linkedUserId ? { user: linkedUserId } : null;

        // Combined criteria for flexible matching
        const flexibleCriteria = {
            $or: [
                { employeeId: employeeId },
                { employee: employeeId },
                ...(linkedUserId ? [
                    { userId: linkedUserId },
                    { user: linkedUserId },
                    { employeeId: linkedUserId } // Legacy case
                ] : [])
            ]
        };

        console.log(`Deleting employee ${employeeId} and all associated data...`);

        // Track deletion results for logging
        const deletionResults = {};

        // 1. Delete associated User account first
        if (linkedUserId) {
            const userResult = await User.findByIdAndDelete(linkedUserId);
            deletionResults.user = userResult ? 1 : 0;
        } else if (linkedUserEmail) {
            const userResult = await User.findOneAndDelete({ email: linkedUserEmail });
            deletionResults.user = userResult ? 1 : 0;
        }

        // 2. Delete ALL linked operational data in parallel
        const [
            attendanceResult,
            leaveResult,
            payrollResult,
            notificationResult,
            onboardingResult,
            performanceResult,
            documentResult,
            salaryStructureResult,
            salaryRevisionResult,
            taxDeclarationResult,
            reimbursementResult,
            loanResult,
            trainingResult
        ] = await Promise.all([
            // Core HR data
            Attendance.deleteMany(flexibleCriteria),
            Leave.deleteMany(employeeIdCriteria),
            Payroll.deleteMany(employeeIdCriteria),

            // Notifications (uses userId or user field)
            Notification.deleteMany(userIdCriteria || employeeIdCriteria),

            // Onboarding/Offboarding (uses employee field)
            Onboarding.deleteMany(employeeFieldCriteria),

            // Performance reviews
            Performance.deleteMany(employeeIdCriteria),

            // Documents
            Document.deleteMany(employeeIdCriteria),

            // Salary related
            SalaryStructure.deleteMany(employeeIdCriteria),
            SalaryRevision.deleteMany(employeeIdCriteria),
            TaxDeclaration.deleteMany(employeeIdCriteria),

            // Financial
            Reimbursement.deleteMany(employeeIdCriteria),
            Loan.deleteMany(employeeIdCriteria),

            // Training
            Training.deleteMany(flexibleCriteria)
        ]);

        // Store deletion counts
        deletionResults.attendance = attendanceResult.deletedCount || 0;
        deletionResults.leave = leaveResult.deletedCount || 0;
        deletionResults.payroll = payrollResult.deletedCount || 0;
        deletionResults.notifications = notificationResult.deletedCount || 0;
        deletionResults.onboarding = onboardingResult.deletedCount || 0;
        deletionResults.performance = performanceResult.deletedCount || 0;
        deletionResults.documents = documentResult.deletedCount || 0;
        deletionResults.salaryStructures = salaryStructureResult.deletedCount || 0;
        deletionResults.salaryRevisions = salaryRevisionResult.deletedCount || 0;
        deletionResults.taxDeclarations = taxDeclarationResult.deletedCount || 0;
        deletionResults.reimbursements = reimbursementResult.deletedCount || 0;
        deletionResults.loans = loanResult.deletedCount || 0;
        deletionResults.training = trainingResult.deletedCount || 0;

        // 3. Delete the Employee record itself
        await Employee.findByIdAndDelete(req.params.id);
        deletionResults.employee = 1;

        // Calculate total records deleted
        const totalDeleted = Object.values(deletionResults).reduce((sum, count) => sum + count, 0);

        console.log('Deletion complete:', deletionResults);

        // Log employee deletion
        await logDelete('employees',
            { type: 'Employee', id: employeeId, name: `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim() },
            req.user, req
        );

        res.json({
            message: 'Employee and all associated data deleted successfully',
            deletedRecords: deletionResults,
            totalRecordsDeleted: totalDeleted
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Error deleting employee', error: error.message });
    }
};


// @desc    Get employee statistics
// @route   GET /api/employees/stats
// @access  Private (HR, Admin)
export const getEmployeeStats = async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments({ status: 'active' });

        const departmentWise = await Employee.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$employmentInfo.department', count: { $sum: 1 } } }
        ]);

        const genderWise = await Employee.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$personalInfo.gender', count: { $sum: 1 } } }
        ]);

        const employmentTypeWise = await Employee.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$employmentInfo.employmentType', count: { $sum: 1 } } }
        ]);

        res.json({
            totalEmployees,
            departmentWise,
            genderWise,
            employmentTypeWise
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
};

// @desc    Resend verification email for employee
// @route   POST /api/employees/:id/resend-verification
// @access  Private (HR, Admin)
export const resendEmployeeVerification = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).populate('userId');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (!employee.userId) {
            return res.status(400).json({ message: 'No user account exists for this employee' });
        }

        const user = await User.findById(employee.userId);

        if (!user) {
            return res.status(400).json({ message: 'User account not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        const email = employee.contactInfo?.email || user.email;
        if (!email) {
            return res.status(400).json({ message: 'No email address found' });
        }

        // Generate new OTP
        const otp = generateOTP();
        user.emailOTP = otp;
        user.emailOTPExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        // Send verification OTP
        const emailTemplate = emailTemplates.verifyEmailOTP(employee.personalInfo?.firstName || user.firstName, otp);

        const emailResult = await sendEmail({
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        });

        if (emailResult.success) {
            res.json({ message: 'Verification code sent to ' + email });
        } else {
            res.status(500).json({ message: 'Failed to send verification email', error: emailResult.error });
        }
    } catch (error) {
        console.error('Error resending verification:', error);
        res.status(500).json({ message: 'Error resending verification email', error: error.message });
    }
};

export default { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, getEmployeeStats, resendEmployeeVerification };


