import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email function
export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'HR Portal'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '')
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error.message);
        return { success: false, error: error.message };
    }
};

// Email Templates with OTP
export const emailTemplates = {
    // Email Verification OTP Template
    verifyEmailOTP: (name, otp) => ({
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
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">HR Portal</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Email Verification</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <h2 style="color: #1a1a2e; margin: 0 0 20px; font-size: 24px;">Welcome, ${name}! 👋</h2>
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                Thank you for registering with HR Portal. Use the verification code below to complete your registration:
                            </p>
                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin: 20px 0;">
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
                                If you didn't create an account, please ignore this email.
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
    }),

    // Password Reset OTP Template
    passwordResetOTP: (name, otp) => ({
        subject: '🔑 Password Reset Code - HR Portal',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔑 Password Reset</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                Hi ${name}, we received a request to reset your password. Use the code below to reset it:
                            </p>
                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 30px; margin: 20px 0;">
                                <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px; font-size: 14px;">Your reset code is:</p>
                                <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 20px; letter-spacing: 12px;">
                                    <span style="color: #ffffff; font-size: 36px; font-weight: 700; font-family: 'Courier New', monospace;">${otp}</span>
                                </div>
                            </div>
                            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                                This code will expire in <strong>10 minutes</strong>.
                            </p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                            <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                                If you didn't request this, please ignore this email.
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
    }),

    // Password Change OTP Template
    passwordChangeOTP: (name, otp) => ({
        subject: '🔐 Password Change Verification - HR Portal',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Change Password</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                Hi ${name}, you are trying to change your password. Please use the verification code below to authorize this change:
                            </p>
                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 12px; padding: 30px; margin: 20px 0;">
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
                                If you didn't request a password change, please change your password immediately or contact HR.
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
    }),

    // Welcome Email (after verification)
    welcomeEmail: (name) => ({
        subject: '🎉 Welcome to HR Portal!',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Email Verified!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <h2 style="color: #1a1a2e; margin: 0 0 20px;">Welcome aboard, ${name}!</h2>
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                                Your email has been verified successfully. You can now access all features of the HR Portal.
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
    }),

    // Action OTP (for HR tasks)
    actionOTP: (name, otp, action = 'complete this action') => ({
        subject: '🛡️ Authorization Code - HR Portal',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Authorization Required</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                                Hello ${name},<br><br>
                                Please use the following One-Time Password (OTP) to <strong>${action}</strong>.
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
                                <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 5px; color: #1a1a2e;">${otp}</span>
                            </div>
                            <p style="color: #718096; font-size: 14px;">
                                This code will expire in 10 minutes. Do not share this code with anyone.
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
    }),

    // Account Created Template (No Verification Needed)
    accountCreated: (name, password) => ({
        subject: '🎈 Account Created - HR Portal',
        html: `
            < !DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to HR Portal!</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 40px 30px; text-align: center;">
                                        <h2 style="color: #1a1a2e; margin: 0 0 20px;">Hello, ${name}!</h2>
                                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                                            Your employee account has been successfully created.
                                        </p>
                                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                                            You can now log in to the portal using your email address.
                                        </p>

                                        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: left;">
                                            <p style="margin: 5px 0; color: #065f46; font-size: 14px;"><strong>Note:</strong> Your account is already verified.</p>
                                        </div>

                                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">Login to Portal</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
        `
    }),

    // Legacy templates for backward compatibility
    verifyEmail: (name, verificationUrl) => emailTemplates.verifyEmailOTP(name, '------'),
    passwordReset: (name, resetUrl) => emailTemplates.passwordResetOTP(name, '------')
};

export default { sendEmail, emailTemplates, generateOTP };
