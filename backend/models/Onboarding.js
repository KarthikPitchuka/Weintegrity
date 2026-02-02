import mongoose from 'mongoose';

const onboardingSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    type: {
        type: String,
        enum: ['onboarding', 'offboarding'],
        required: true
    },

    // Timeline
    startDate: { type: Date, required: true },
    targetCompletionDate: Date,
    actualCompletionDate: Date,

    // Status
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed', 'on-hold', 'cancelled'],
        default: 'not-started'
    },
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },

    // Tasks and Checklists
    tasks: [{
        category: {
            type: String,
            enum: ['documentation', 'it-setup', 'access-provisioning', 'training', 'introduction',
                'asset-assignment', 'compliance', 'knowledge-transfer', 'exit-formalities', 'clearance']
        },
        title: { type: String, required: true },
        description: String,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'skipped', 'blocked'],
            default: 'pending'
        },
        completedOn: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comments: String,
        documents: [{ name: String, url: String }],
        order: Number
    }],

    // Onboarding Specific
    onboarding: {
        joiningDate: Date,
        welcomeEmailSent: { type: Boolean, default: false },
        officeLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
        workstation: String,
        reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        buddy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        orientation: {
            scheduled: { type: Boolean, default: false },
            date: Date,
            completed: { type: Boolean, default: false }
        },
        assetsAssigned: [{
            assetType: { type: String, enum: ['laptop', 'mobile', 'id-card', 'access-card', 'headset', 'other'] },
            assetId: String,
            serialNumber: String,
            assignedOn: Date
        }],
        accessProvisioned: [{
            system: String,
            accessLevel: String,
            provisionedOn: Date,
            provisionedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],
        trainingCompleted: [{
            trainingName: String,
            completedOn: Date,
            score: Number
        }],
        probationEndDate: Date,
        firstDayFeedback: String
    },

    // Offboarding Specific
    offboarding: {
        resignationDate: Date,
        lastWorkingDate: Date,
        noticePeriod: Number,
        exitType: {
            type: String,
            enum: ['resignation', 'termination', 'retirement', 'contract-end', 'mutual-separation', 'absconding']
        },
        reasonForLeaving: String,
        exitInterview: {
            scheduled: { type: Boolean, default: false },
            date: Date,
            conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            completed: { type: Boolean, default: false },
            feedback: {
                overallExperience: { type: Number, min: 1, max: 5 },
                wouldRecommend: Boolean,
                reasonForLeaving: String,
                suggestions: String,
                managementRating: { type: Number, min: 1, max: 5 },
                workEnvironmentRating: { type: Number, min: 1, max: 5 }
            }
        },
        clearance: {
            manager: { cleared: Boolean, clearedOn: Date, clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, remarks: String },
            hr: { cleared: Boolean, clearedOn: Date, clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, remarks: String },
            finance: { cleared: Boolean, clearedOn: Date, clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, remarks: String },
            it: { cleared: Boolean, clearedOn: Date, clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, remarks: String },
            admin: { cleared: Boolean, clearedOn: Date, clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, remarks: String }
        },
        assetsReturned: [{
            assetType: String,
            assetId: String,
            returnedOn: Date,
            condition: { type: String, enum: ['good', 'damaged', 'lost'] },
            remarks: String
        }],
        accessRevoked: [{
            system: String,
            revokedOn: Date,
            revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],
        knowledgeTransfer: {
            completed: { type: Boolean, default: false },
            transferredTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            documents: [{ name: String, url: String }],
            remarks: String
        },
        finalSettlement: {
            calculated: { type: Boolean, default: false },
            components: {
                pendingSalary: { type: Number, default: 0 },
                leaveEncashment: { type: Number, default: 0 },
                bonus: { type: Number, default: 0 },
                gratuity: { type: Number, default: 0 },
                deductions: { type: Number, default: 0 },
                recoveries: { type: Number, default: 0 }
            },
            netPayable: { type: Number, default: 0 },
            processed: { type: Boolean, default: false },
            processedOn: Date
        },
        relievingLetter: {
            generated: { type: Boolean, default: false },
            documentUrl: String,
            sentOn: Date
        },
        experienceLetter: {
            generated: { type: Boolean, default: false },
            documentUrl: String,
            sentOn: Date
        },
        rehireEligible: { type: Boolean, default: true }
    },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: [{
        text: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedOn: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Calculate progress
onboardingSchema.pre('save', function (next) {
    if (this.tasks?.length > 0) {
        const completedTasks = this.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
        this.overallProgress = Math.round((completedTasks / this.tasks.length) * 100);

        if (this.overallProgress === 100 && this.status !== 'completed') {
            this.status = 'completed';
            this.actualCompletionDate = new Date();
        }
    }
    next();
});

// Get pending tasks
onboardingSchema.methods.getPendingTasks = function () {
    return this.tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
};

// Get tasks by category
onboardingSchema.methods.getTasksByCategory = function () {
    const grouped = {};
    this.tasks.forEach(t => {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t);
    });
    return grouped;
};

// Check if all clearances are done (offboarding)
onboardingSchema.methods.isFullyCleared = function () {
    if (this.type !== 'offboarding') return null;
    const clearance = this.offboarding?.clearance;
    return clearance?.manager?.cleared &&
        clearance?.hr?.cleared &&
        clearance?.finance?.cleared &&
        clearance?.it?.cleared;
};

onboardingSchema.index({ employee: 1, type: 1 });
onboardingSchema.index({ status: 1 });
onboardingSchema.index({ 'onboarding.joiningDate': 1 });
onboardingSchema.index({ 'offboarding.lastWorkingDate': 1 });

const Onboarding = mongoose.model('Onboarding', onboardingSchema);
export default Onboarding;
