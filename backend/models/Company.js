import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    legalName: {
        type: String,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['headquarters', 'subsidiary', 'branch', 'division'],
        default: 'headquarters'
    },
    industry: {
        type: String,
        enum: ['technology', 'finance', 'healthcare', 'manufacturing', 'retail', 'education', 'consulting', 'other'],
        default: 'technology'
    },
    registrationNumber: String, // CIN for Indian companies
    gstNumber: String,
    panNumber: String,
    tanNumber: String, // Tax Deduction Account Number

    // Contact Information
    contact: {
        email: String,
        phone: String,
        fax: String,
        website: String
    },

    // Registered Address
    registeredAddress: {
        street: String,
        city: String,
        state: String,
        country: { type: String, default: 'India' },
        pincode: String
    },

    // Corporate Address (if different)
    corporateAddress: {
        street: String,
        city: String,
        state: String,
        country: { type: String, default: 'India' },
        pincode: String
    },

    // Statutory Information
    statutory: {
        pfNumber: String, // Provident Fund Registration Number
        esiNumber: String, // ESI Registration Number
        ptNumber: String, // Professional Tax Registration Number
        lwfNumber: String, // Labour Welfare Fund Number
        ptState: String // State for PT (varies by state)
    },

    // Financial Details
    financialYear: {
        startMonth: { type: Number, default: 4 }, // April
        endMonth: { type: Number, default: 3 } // March
    },

    // Logo and Branding
    logo: String,
    favicon: String,

    // Settings
    settings: {
        currency: { type: String, default: 'INR' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        timeZone: { type: String, default: 'Asia/Kolkata' },
        weekStartDay: { type: Number, default: 1 }, // Monday
        workingDays: [{ type: Number }], // 1-7 (Mon-Sun), default: Mon-Sat
        defaultStartTime: { type: String, default: '09:00' },
        defaultEndTime: { type: String, default: '18:00' },
        graceTime: { type: Number, default: 15 }, // minutes
        overtimeAllowed: { type: Boolean, default: true },
        security: {
            minPasswordLength: { type: Number, default: 8 },
            requireSpecialChar: { type: Boolean, default: true },
            requireNumber: { type: Boolean, default: true },
            twoFactorAuth: { type: Boolean, default: false },
            sessionTimeout: { type: Number, default: 60 } // minutes
        },
        notifications: {
            emailEnabled: { type: Boolean, default: true },
            inAppEnabled: { type: Boolean, default: true },
            reminderDays: { type: Number, default: 2 }
        }
    },

    // Parent company (for subsidiaries)
    parentCompany: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate company code if not provided
companySchema.pre('validate', async function (next) {
    if (this.isNew && !this.code) {
        const shortName = this.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        const count = await mongoose.model('Company').countDocuments();
        this.code = `${shortName}${String(count + 1).padStart(3, '0')}`;
    }
    if (!this.settings.workingDays || this.settings.workingDays.length === 0) {
        this.settings.workingDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat default
    }
    next();
});

// Index for searching
companySchema.index({ name: 'text', legalName: 'text' });

const Company = mongoose.model('Company', companySchema);

export default Company;
