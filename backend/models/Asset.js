import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
    assetCode: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['laptop', 'desktop', 'monitor', 'mobile', 'tablet', 'furniture', 'vehicle', 'other'],
        required: true
    },
    description: String,
    specifications: {
        brand: String,
        model: String,
        serialNumber: String,
        configuration: String
    },
    purchaseInfo: {
        vendor: String,
        purchaseDate: Date,
        purchasePrice: Number,
        warrantyExpiry: Date,
        invoiceNumber: String,
        invoiceUrl: String
    },
    location: {
        building: String,
        floor: String,
        room: String
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    assignmentHistory: [{
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        assignedDate: Date,
        returnedDate: Date,
        condition: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor', 'damaged']
        },
        notes: String
    }],
    currentCondition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'damaged', 'disposed'],
        default: 'excellent'
    },
    status: {
        type: String,
        enum: ['available', 'assigned', 'in-repair', 'disposed', 'lost'],
        default: 'available'
    },
    maintenanceHistory: [{
        date: Date,
        type: { type: String, enum: ['repair', 'service', 'upgrade'] },
        description: String,
        cost: Number,
        vendor: String,
        performedBy: String
    }],
    depreciationInfo: {
        method: { type: String, enum: ['straight-line', 'declining-balance'] },
        usefulLife: Number, // in years
        salvageValue: Number,
        currentValue: Number
    },
    documents: [String],
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Generate asset code before saving
assetSchema.pre('save', async function (next) {
    if (this.isNew && !this.assetCode) {
        const prefix = this.category.substring(0, 3).toUpperCase();
        const count = await mongoose.model('Asset').countDocuments({ category: this.category });
        this.assetCode = `${prefix}${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Index for searching
assetSchema.index({ name: 'text', 'specifications.serialNumber': 'text' });

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
