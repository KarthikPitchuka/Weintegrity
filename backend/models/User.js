import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'SuperAdmin', 'Auditor'],
        default: 'Employee'
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Email verification OTP
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailOTP: String,
    emailOTPExpires: Date,
    lastLogin: {
        type: Date
    },
    // Password reset OTP
    passwordResetOTP: String,
    passwordResetOTPExpires: Date,
    // Password change OTP
    passwordChangeOTP: String,
    passwordChangeOTPExpires: Date,
    // Administrative Action OTP (for HR tasks like creating employees)
    actionOTP: String,
    actionOTPExpires: Date,
    pendingEmployeeEmail: String, // Track which employee email the OTP was sent to
    profilePicture: {
        type: String
    },
    refreshToken: String
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
