import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    type: {
        type: String,
        enum: ['head-office', 'regional-office', 'branch', 'factory', 'warehouse', 'remote'],
        default: 'branch'
    },

    // Contact Information
    contact: {
        email: String,
        phone: String,
        fax: String
    },

    // Address
    address: {
        street: String,
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, default: 'India' },
        pincode: String,
        landmark: String
    },

    // Geolocation (for GPS-based attendance)
    location: {
        latitude: Number,
        longitude: Number,
        radius: { type: Number, default: 100 } // Meters for geofencing
    },

    // Branch Head
    branchHead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },

    // Operating Hours
    operatingHours: {
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        timezone: { type: String, default: 'Asia/Kolkata' }
    },

    // Statutory (if different from company)
    statutory: {
        pfNumber: String,
        esiNumber: String,
        ptNumber: String,
        ptState: String
    },

    // Capacity
    capacity: {
        maxEmployees: Number,
        currentEmployees: { type: Number, default: 0 }
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'under-construction'],
        default: 'active'
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate branch code
branchSchema.pre('validate', async function (next) {
    if (this.isNew && !this.code) {
        const shortName = this.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
        const cityCode = this.address?.city?.substring(0, 2).toUpperCase() || 'XX';
        const count = await mongoose.model('Branch').countDocuments({ company: this.company });
        this.code = `${shortName}${cityCode}${String(count + 1).padStart(2, '0')}`;
    }
    next();
});

// Compound index
branchSchema.index({ company: 1, name: 1 }, { unique: true });
branchSchema.index({ 'address.city': 1 });
branchSchema.index({ 'address.state': 1 });

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;
