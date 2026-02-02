import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
import { generateToken } from '../middleware/auth.js';
import { sendEmail, emailTemplates, generateOTP } from '../services/emailService.js';
import { logLogin, logLogout, logPasswordChange, logCreate } from '../utils/auditLogger.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Generate 6-digit OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user
        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            role: role || 'Employee',
            isEmailVerified: false,
            emailOTP: otp,
            emailOTPExpires: otpExpires
        });

        // Send verification OTP email
        const emailTemplate = emailTemplates.verifyEmailOTP(firstName, otp);

        const emailResult = await sendEmail({
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        });

        if (emailResult.success) {
            console.log(`Verification OTP sent to ${email}`);
        } else {
            console.error(`Failed to send OTP to ${email}:`, emailResult.error);
        }

        res.status(201).json({
            message: 'Registration successful! Please check your email for the verification code.',
            requiresVerification: true,
            email: user.email,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // Find user with valid OTP
        const user = await User.findOne({
            email: email.toLowerCase(),
            emailOTP: otp,
            emailOTPExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new code.' });
        }

        // Update user as verified
        user.isEmailVerified = true;
        user.emailOTP = undefined;
        user.emailOTPExpires = undefined;
        await user.save();

        // Send welcome email
        const welcomeTemplate = emailTemplates.welcomeEmail(user.firstName);
        await sendEmail({
            to: user.email,
            subject: welcomeTemplate.subject,
            html: welcomeTemplate.html
        });

        // Generate token for auto-login
        const authToken = generateToken(user._id);

        res.json({
            message: 'Email verified successfully! Welcome to HR Portal.',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isEmailVerified: true,
                profilePicture: user.profilePicture
            },
            token: authToken
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Error verifying email', error: error.message });
    }
};

// @desc    Resend verification OTP
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new OTP
        const otp = generateOTP();
        user.emailOTP = otp;
        user.emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        // Send verification email
        const emailTemplate = emailTemplates.verifyEmailOTP(user.firstName, otp);

        await sendEmail({
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        });

        res.json({ message: 'Verification code sent! Please check your email.' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Error resending verification code', error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Log failed login attempt
            await logLogin({ email }, req, false, 'User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Log failed login attempt
            await logLogin(user, req, false, 'Invalid password');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            await logLogin(user, req, false, 'Email not verified');
            return res.status(403).json({
                message: 'Please verify your email before logging in.',
                requiresVerification: true,
                email: user.email
            });
        }

        // Check if active
        if (!user.isActive) {
            await logLogin(user, req, false, 'Account deactivated');
            return res.status(401).json({ message: 'Account is deactivated. Please contact admin.' });
        }

        // Shift-based login restriction for employees
        if (user.role === 'Employee' && user.employeeId) {
            const employee = await Employee.findById(user.employeeId).populate('employmentInfo.shift');

            if (employee && employee.employmentInfo?.shift) {
                const shift = employee.employmentInfo.shift;
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentTotalMinutes = currentHour * 60 + currentMinute;
                const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

                // Check if today is a working day
                const workingDays = shift.workingDays || [1, 2, 3, 4, 5]; // Default Mon-Fri
                if (!workingDays.includes(currentDay)) {
                    await logLogin(user, req, false, 'Outside working days');
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const workingDayNames = workingDays.map(d => dayNames[d]).join(', ');
                    return res.status(403).json({
                        message: `Login not allowed on ${dayNames[currentDay]}. Your working days are: ${workingDayNames}`,
                        shiftRestriction: true,
                        shiftName: shift.name,
                        workingDays: workingDayNames
                    });
                }

                // Parse shift timing
                const parseTime = (timeStr) => {
                    const [h, m] = timeStr.split(':').map(Number);
                    return h * 60 + m;
                };

                const shiftStartMinutes = parseTime(shift.timing.startTime);
                const shiftEndMinutes = parseTime(shift.timing.endTime);

                // Allow login 60 minutes before shift and 30 minutes after shift ends
                const loginBufferBefore = 60; // Can login 60 minutes before shift
                const loginBufferAfter = 30; // Can login up to 30 minutes after shift ends

                const allowedStartTime = shiftStartMinutes - loginBufferBefore;
                const allowedEndTime = (shiftStartMinutes < shiftEndMinutes)
                    ? (shiftEndMinutes + loginBufferAfter)
                    : (shiftEndMinutes + loginBufferAfter + 1440); // Add 24 hours for overnight end time

                let currentTotalMinutesCompare = currentTotalMinutes;

                // If it's an overnight shift and current time is early morning, 
                // it might be the end of the shift starting yesterday.
                // However, the current logic checks workingDays based on the day they try to login.

                let isWithinAllowedTime = false;
                if (shiftStartMinutes < shiftEndMinutes) {
                    // Regular shift
                    isWithinAllowedTime = currentTotalMinutes >= allowedStartTime && currentTotalMinutes <= allowedEndTime;
                } else {
                    // Overnight shift
                    // We check if current time is after start time OR before end time
                    isWithinAllowedTime = currentTotalMinutes >= allowedStartTime || currentTotalMinutes <= (shiftEndMinutes + loginBufferAfter);
                }

                if (!isWithinAllowedTime) {
                    await logLogin(user, req, false, 'Outside shift hours');

                    const formatTimeDisplay = (totalMins) => {
                        const mins = ((totalMins % 1440) + 1440) % 1440;
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        const hour = h % 12 || 12;
                        const ampm = h < 12 ? 'AM' : 'PM';
                        return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
                    };

                    return res.status(403).json({
                        message: `Login allowed only during your shift hours. Your shift (${shift.name}) is from ${shift.timing.startTime} to ${shift.timing.endTime}. You can login from ${formatTimeDisplay(allowedStartTime)}.`,
                        shiftRestriction: true,
                        shiftName: shift.name,
                        shiftTiming: `${shift.timing.startTime} - ${shift.timing.endTime}`,
                        currentTime: formatTimeDisplay(currentTotalMinutes)
                    });
                }
            }
        }

        // Update last login
        await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

        // Generate token
        const token = generateToken(user._id);

        // Log successful login
        await logLogin(user, req, true);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                profilePicture: user.profilePicture
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate({
                path: 'employeeId',
                populate: {
                    path: 'employmentInfo.reportingManager',
                    select: 'personalInfo employeeCode'
                }
            });
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};

// @desc    Send OTP for password change
// @route   POST /api/auth/password-otp
// @access  Private
export const sendPasswordChangeOTP = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = generateOTP();
        user.passwordChangeOTP = otp;
        user.passwordChangeOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send OTP email
        const emailTemplate = emailTemplates.passwordChangeOTP(user.firstName, otp);

        const emailResult = await sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        });

        if (emailResult.success) {
            console.log(`Password change OTP sent to ${user.email}`);
            res.json({ message: 'Verification code sent to your email.' });
        } else {
            console.error(`Failed to send password change OTP to ${user.email}:`, emailResult.error);
            res.status(500).json({ message: 'Failed to send verification email' });
        }

    } catch (error) {
        console.error('Send password change OTP error:', error);
        res.status(500).json({ message: 'Error sending OTP', error: error.message });
    }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, otp } = req.body;

        if (!otp) {
            return res.status(400).json({ message: 'Verification code is required' });
        }

        const user = await User.findById(req.user._id);

        // Verify OTP
        if (user.passwordChangeOTP !== otp || user.passwordChangeOTPExpires < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        // Clear OTP
        user.passwordChangeOTP = undefined;
        user.passwordChangeOTPExpires = undefined;
        await user.save();

        // Log password change
        await logPasswordChange(user, req);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password', error: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
    try {
        // Log logout event
        if (req.user) {
            await logLogout(req.user, req);
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // firstName, lastName, and email are strictly read-only on the profile page
        // to prevent users from changing their identity.

        await user.save();

        // Also update linked Employee record if it exists
        if (user.employeeId) {
            const employee = await Employee.findById(user.employeeId);
            if (employee) {
                // Personal Info
                if (req.body.gender) employee.personalInfo.gender = req.body.gender;
                if (req.body.maritalStatus) employee.personalInfo.maritalStatus = req.body.maritalStatus;
                if (req.body.bloodGroup) employee.personalInfo.bloodGroup = req.body.bloodGroup;
                if (req.body.nationality) employee.personalInfo.nationality = req.body.nationality;

                // Contact Info
                if (req.body.phone) employee.contactInfo.phone = req.body.phone;

                // Address Info
                if (!employee.contactInfo.address) employee.contactInfo.address = {};
                if (req.body.address) employee.contactInfo.address.street = req.body.address;
                if (req.body.city) employee.contactInfo.address.city = req.body.city;
                if (req.body.state) employee.contactInfo.address.state = req.body.state;
                if (req.body.country) employee.contactInfo.address.country = req.body.country;
                if (req.body.zipCode) employee.contactInfo.address.zipCode = req.body.zipCode;

                await employee.save();
            }
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// @desc    Forgot password - send reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration attacks
        if (!user) {
            return res.json({
                message: 'If an account exists with this email, a reset code has been sent.',
                email: email
            });
        }

        // Generate 6-digit OTP
        const otp = generateOTP();
        user.passwordResetOTP = otp;
        user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send password reset OTP email
        const emailTemplate = emailTemplates.passwordResetOTP(user.firstName, otp);

        const emailResult = await sendEmail({
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        });

        if (emailResult.success) {
            console.log(`Password reset OTP sent to ${email}`);
        } else {
            console.error(`Failed to send password reset OTP to ${email}:`, emailResult.error);
        }

        res.json({
            message: 'If an account exists with this email, a reset code has been sent.',
            email: email
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
};

// @desc    Verify reset OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
export const verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // Find user with valid reset OTP
        const user = await User.findOne({
            email: email.toLowerCase(),
            passwordResetOTP: otp,
            passwordResetOTPExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new code.' });
        }

        // Return success - frontend will now show password reset form
        res.json({
            message: 'OTP verified successfully',
            verified: true,
            email: email
        });
    } catch (error) {
        console.error('Verify reset OTP error:', error);
        res.status(500).json({ message: 'Error verifying OTP', error: error.message });
    }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        if (!email || !otp || !password) {
            return res.status(400).json({ message: 'Email, OTP and new password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Find user with valid reset OTP
        const user = await User.findOne({
            email: email.toLowerCase(),
            passwordResetOTP: otp,
            passwordResetOTPExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new password reset.' });
        }

        // Update password and clear reset OTP
        user.password = password;
        user.passwordResetOTP = undefined;
        user.passwordResetOTPExpires = undefined;
        await user.save();

        // Generate auth token for auto-login
        const authToken = generateToken(user._id);

        res.json({
            message: 'Password reset successfully! You can now login with your new password.',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                profilePicture: user.profilePicture
            },
            token: authToken
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};

// @desc    Send OTP for critical actions (like creating employee)
// @route   POST /api/auth/send-action-otp
// @access  Private
export const sendActionOTP = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { action } = req.body;

        // Generate 6-digit OTP
        const otp = generateOTP();
        user.actionOTP = otp;
        user.actionOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send OTP email
        const emailTemplate = emailTemplates.actionOTP(user.firstName, otp, action || 'authorize this action');

        const emailResult = await sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        });

        if (emailResult.success) {
            console.log(`Action OTP sent to ${user.email}`);
            res.json({ message: 'Authorization code sent to your email.' });
        } else {
            console.error(`Failed to send action OTP to ${user.email}:`, emailResult.error);
            res.status(500).json({ message: 'Failed to send verification email' });
        }

    } catch (error) {
        console.error('Send action OTP error:', error);
        res.status(500).json({ message: 'Error sending OTP', error: error.message });
    }
};

// @desc    Send OTP to new employee's email for verification before creation
// @route   POST /api/auth/send-employee-otp
// @access  Private (HR, Admin)
export const sendEmployeeVerificationOTP = async (req, res) => {
    try {
        const { employeeEmail, employeeName } = req.body;

        if (!employeeEmail) {
            return res.status(400).json({ message: 'Employee email is required' });
        }

        // Check if email already exists in User collection
        const existingUser = await User.findOne({ email: employeeEmail.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'A user account with this email already exists' });
        }

        // Check if email exists in Employee collection
        const existingEmployee = await Employee.findOne({ 'contactInfo.email': employeeEmail.toLowerCase() });
        if (existingEmployee) {
            return res.status(400).json({ message: 'An employee with this email already exists' });
        }

        // Generate 6-digit OTP and store it on the HR user's record
        const hrUser = await User.findById(req.user._id);
        if (!hrUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = generateOTP();

        // Store OTP on HR user record (reusing actionOTP field)
        // Also store the employee email to verify it matches during creation
        hrUser.actionOTP = otp;
        hrUser.actionOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        hrUser.pendingEmployeeEmail = employeeEmail.toLowerCase(); // Track which email the OTP was sent to
        await hrUser.save();

        // Send OTP to EMPLOYEE's email (not HR's)
        const emailTemplate = {
            subject: '🔐 Your Verification Code - HR Portal',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to HR Portal</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Account Verification</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <h2 style="color: #1a1a2e; margin: 0 0 20px; font-size: 24px;">Hello${employeeName ? ', ' + employeeName : ''}! 👋</h2>
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                Your company is creating an employee account for you. Please share this verification code with your HR representative to complete your account setup:
                            </p>
                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; margin: 20px 0;">
                                <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px; font-size: 14px;">Your verification code is:</p>
                                <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 20px; letter-spacing: 12px;">
                                    <span style="color: #ffffff; font-size: 36px; font-weight: 700; font-family: 'Courier New', monospace;">${otp}</span>
                                </div>
                            </div>
                            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                                This code will expire in <strong>10 minutes</strong>.
                            </p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                            <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                                If you didn't expect this email, please ignore it.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center;">
                            <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} HR Portal. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        };

        const emailResult = await sendEmail({
            to: employeeEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        });

        if (emailResult.success) {
            console.log(`Employee verification OTP sent to ${employeeEmail}`);
            res.json({
                message: `Verification code sent to ${employeeEmail}. Please ask the employee to share the code.`,
                emailSent: true
            });
        } else {
            console.error(`Failed to send OTP to ${employeeEmail}:`, emailResult.error);
            res.status(500).json({ message: 'Failed to send verification email to employee' });
        }

    } catch (error) {
        console.error('Send employee verification OTP error:', error);
        res.status(500).json({ message: 'Error sending OTP', error: error.message });
    }
};

// @desc    Upload profile picture
// @route   POST /api/auth/profile-picture
// @access  Private
export const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        user.profilePicture = fileUrl;
        await user.save();

        res.json({
            message: 'Profile picture uploaded successfully',
            profilePicture: fileUrl
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ message: 'Error uploading profile picture', error: error.message });
    }
};

// @desc    Remove profile picture
// @route   DELETE /api/auth/profile-picture
// @access  Private
export const removeProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clear the profile picture URL
        user.profilePicture = undefined;
        await user.save();

        res.json({
            message: 'Profile picture removed successfully'
        });
    } catch (error) {
        console.error('Error removing profile picture:', error);
        res.status(500).json({ message: 'Error removing profile picture', error: error.message });
    }
};

export default { register, login, getMe, updatePassword, logout, updateProfile, verifyEmail, resendVerification, forgotPassword, resetPassword, verifyResetOTP, sendActionOTP, sendEmployeeVerificationOTP, uploadProfilePicture, removeProfilePicture, sendPasswordChangeOTP };
