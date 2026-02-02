import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
        // Not required - allows company-wide documents like policies
    },
    documentType: {
        type: String,
        enum: [
            'resume', 'offer-letter', 'appointment-letter', 'id-proof',
            'address-proof', 'educational', 'experience-letter',
            'salary-slip', 'form-16', 'pan-card', 'aadhaar',
            'passport', 'visa', 'contract', 'nda', 'policy-acknowledgement',
            'performance-review', 'warning-letter', 'appreciation-letter', 'other'
        ],
        required: true
    },
    category: {
        type: String,
        enum: ['General', 'Policy', 'Benefits', 'Personal', 'Other'],
        default: 'General'
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    fileName: {
        type: String,
        required: true
    },
    originalName: String,
    fileType: String,
    fileSize: Number, // in bytes
    fileUrl: {
        type: String,
        required: true
    },
    isConfidential: {
        type: Boolean,
        default: false
    },
    accessibleBy: [{
        type: String,
        enum: ['employee', 'hr', 'manager', 'admin']
    }],
    validFrom: Date,
    validUntil: Date,
    isExpired: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedOn: Date,
    verificationNotes: String,
    tags: [String],
    version: {
        type: Number,
        default: 1
    },
    previousVersions: [{
        fileUrl: String,
        uploadedOn: Date,
        version: Number
    }],
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Check expiry before find
documentSchema.pre('find', function () {
    // This middleware can be used to update isExpired flag
});

// Index for querying
documentSchema.index({ employeeId: 1, documentType: 1 });
documentSchema.index({ title: 'text', tags: 'text' });

const Document = mongoose.model('Document', documentSchema);

export default Document;
