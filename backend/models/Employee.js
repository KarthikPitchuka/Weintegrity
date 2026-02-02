import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
    employeeCode: {
        type: String,
        unique: true,
        sparse: true // Allow null/undefined for new documents before pre-save hook runs
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    personalInfo: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        middleName: String,
        dateOfBirth: Date,
        gender: { type: String, enum: ['male', 'female', 'other'] },
        maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
        nationality: String,
        bloodGroup: String,
        photo: String
    },
    contactInfo: {
        email: { type: String, required: true },
        phone: String,
        alternatePhone: String,
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            zipCode: String
        },
        emergencyContact: {
            name: String,
            relationship: String,
            phone: String
        }
    },
    employmentInfo: {
        department: { type: String, required: true },
        designation: { type: String, required: true },
        employmentType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'intern'],
            default: 'full-time'
        },
        joiningDate: { type: Date, required: true },
        confirmationDate: Date,
        reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        workLocation: String,
        shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' }
    },
    bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        panNumber: String
    },
    documents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    }],
    education: [{
        degree: String,
        institution: String,
        year: String,
        description: String
    }],
    experience: [{
        company: String,
        position: String,
        duration: String,
        description: String
    }],
    skills: [String],
    status: {
        type: String,
        enum: ['active', 'inactive', 'on-leave', 'terminated', 'resigned'],
        default: 'active'
    },
    terminationDate: Date,
    terminationReason: String
}, {
    timestamps: true
});

// Generate employee code before validation
employeeSchema.pre('validate', async function (next) {
    if (this.isNew && !this.employeeCode) {
        try {
            // Find the highest existing employee code by sorting descending
            const lastEmployee = await mongoose.model('Employee')
                .findOne({ employeeCode: { $regex: /^EMP/ } })
                .sort({ employeeCode: -1 })
                .select('employeeCode')
                .lean();

            let nextNumber = 1;
            if (lastEmployee && lastEmployee.employeeCode) {
                // Extract the number from the last employee code (e.g., EMP00005 -> 5)
                const match = lastEmployee.employeeCode.match(/EMP(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            this.employeeCode = `EMP${String(nextNumber).padStart(5, '0')}`;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function () {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
