import Compliance from '../models/Compliance.js';
import { createNotification } from './notificationController.js';

// @desc    Get all compliance items
// @route   GET /api/compliance
// @access  Private
export const getComplianceItems = async (req, res) => {
    try {
        const { type, category, status, page = 1, limit = 10 } = req.query;

        const query = {};

        if (type) query.type = type;
        if (category) query.category = category;
        if (status) query.overallStatus = status;

        // If user is Employee (and not Admin/HR), restrict to their assigned items
        const isHR = ['admin', 'HRManager', 'PayrollOfficer'].includes(req.user.role);
        if (!isHR) {
            query.responsiblePerson = req.user._id;
        }

        const items = await Compliance.find(query)
            .populate('responsiblePerson', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ effectiveDate: -1 });

        const total = await Compliance.countDocuments(query);

        res.json({
            items,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching compliance items', error: error.message });
    }
};

// @desc    Get compliance item by ID
// @route   GET /api/compliance/:id
// @access  Private
export const getComplianceItem = async (req, res) => {
    try {
        const item = await Compliance.findById(req.params.id)
            .populate('responsiblePerson', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .populate('notifications.recipients', 'firstName lastName email');

        if (!item) {
            return res.status(404).json({ message: 'Compliance item not found' });
        }

        res.json({ item });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching compliance item', error: error.message });
    }
};

// @desc    Create compliance item
// @route   POST /api/compliance
// @access  Private (HR, Admin)
export const createComplianceItem = async (req, res) => {
    try {
        const item = await Compliance.create({
            ...req.body,
            createdBy: req.user._id
        });

        res.status(201).json({ message: 'Compliance item created successfully', item });

        // Notify responsible person
        if (req.body.responsiblePerson) {
            await createNotification({
                recipientId: req.body.responsiblePerson,
                type: 'compliance_task',
                title: 'New Compliance Task Assigned',
                message: `You have been assigned to compliance task: ${item.title}`,
                data: {
                    referenceId: item._id,
                    referenceModel: 'Compliance',
                    actionUrl: `/compliance`
                },
                createdById: req.user._id
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error creating compliance item', error: error.message });
    }
};

// @desc    Update compliance item
// @route   PUT /api/compliance/:id
// @access  Private (HR, Admin)
export const updateComplianceItem = async (req, res) => {
    try {
        const isHR = ['admin', 'HRManager', 'PayrollOfficer'].includes(req.user.role);

        let item;

        if (isHR) {
            item = await Compliance.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
        } else {
            // If regular employee, only allow update if they are responsible person
            item = await Compliance.findOneAndUpdate(
                { _id: req.params.id, responsiblePerson: req.user._id },
                {
                    $set: {
                        overallStatus: req.body.overallStatus
                    }
                },
                { new: true, runValidators: true }
            );
        }

        if (!item) {
            return res.status(404).json({ message: 'Compliance item not found or unauthorized' });
        }

        // Notify creator (HR/Admin) if finished by employee
        if (!isHR && req.body.overallStatus === 'compliant') {
            await createNotification({
                recipientId: item.createdBy,
                type: 'compliance_task',
                title: 'Compliance Task Finished',
                message: `${req.user.firstName} ${req.user.lastName} has completed the task: ${item.title}`,
                data: {
                    referenceId: item._id,
                    referenceModel: 'Compliance',
                    actionUrl: `/compliance`
                },
                createdById: req.user._id
            });
        }

        res.json({ message: 'Compliance item updated successfully', item });
    } catch (error) {
        res.status(500).json({ message: 'Error updating compliance item', error: error.message });
    }
};

// @desc    Delete compliance item
// @route   DELETE /api/compliance/:id
// @access  Private (Admin)
export const deleteComplianceItem = async (req, res) => {
    try {
        const item = await Compliance.findByIdAndDelete(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Compliance item not found' });
        }

        res.json({ message: 'Compliance item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting compliance item', error: error.message });
    }
};

// @desc    Update requirement status
// @route   PUT /api/compliance/:id/requirements/:requirementIndex
// @access  Private (HR, Admin)
export const updateRequirementStatus = async (req, res) => {
    try {
        const { status, completedDate, evidence, notes } = req.body;

        const item = await Compliance.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Compliance item not found' });
        }

        // Check permissions: HR/Admin can update anyone's. Employee can only update their own.
        const isHR = ['admin', 'HRManager', 'PayrollOfficer'].includes(req.user.role);
        if (!isHR) {
            if (item.responsiblePerson.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this compliance item' });
            }
        }

        const reqIndex = parseInt(req.params.requirementIndex);
        if (!item.requirements[reqIndex]) {
            return res.status(404).json({ message: 'Requirement not found' });
        }

        item.requirements[reqIndex].status = status;
        if (completedDate) item.requirements[reqIndex].completedDate = completedDate;
        if (evidence) item.requirements[reqIndex].evidence = evidence;
        if (notes) item.requirements[reqIndex].notes = notes;

        // Update overall status based on requirements
        const allStatuses = item.requirements.map(r => r.status);
        if (allStatuses.every(s => s === 'completed')) {
            item.overallStatus = 'compliant';
        } else if (allStatuses.some(s => s === 'non-compliant')) {
            item.overallStatus = 'non-compliant';
        } else if (allStatuses.some(s => s === 'completed')) {
            item.overallStatus = 'partially-compliant';
        }

        await item.save();

        // Notify creator if overall status is now compliant
        if (item.overallStatus === 'compliant' && item.responsiblePerson.toString() === req.user._id.toString()) {
            await createNotification({
                recipientId: item.createdBy,
                type: 'compliance_task',
                title: 'Compliance Task Finished',
                message: `${req.user.firstName} ${req.user.lastName} has completed all requirements for: ${item.title}`,
                data: {
                    referenceId: item._id,
                    referenceModel: 'Compliance',
                    actionUrl: `/compliance`
                },
                createdById: req.user._id
            });
        }

        res.json({ message: 'Requirement status updated successfully', item });
    } catch (error) {
        res.status(500).json({ message: 'Error updating requirement status', error: error.message });
    }
};

// @desc    Add audit record
// @route   POST /api/compliance/:id/audit
// @access  Private (HR, Admin)
export const addAuditRecord = async (req, res) => {
    try {
        const item = await Compliance.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Compliance item not found' });
        }

        item.auditHistory.push({
            ...req.body,
            auditDate: new Date()
        });

        await item.save();

        res.json({ message: 'Audit record added successfully', item });
    } catch (error) {
        res.status(500).json({ message: 'Error adding audit record', error: error.message });
    }
};

// @desc    Get compliance dashboard
// @route   GET /api/compliance/dashboard
// @access  Private (HR, Admin)
export const getComplianceDashboard = async (req, res) => {
    try {
        const totalItems = await Compliance.countDocuments();

        const byStatus = await Compliance.aggregate([
            { $group: { _id: '$overallStatus', count: { $sum: 1 } } }
        ]);

        const byRiskLevel = await Compliance.aggregate([
            { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
        ]);

        const upcomingRenewals = await Compliance.find({
            renewalDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
            }
        }).select('title renewalDate riskLevel').limit(10);

        const nonCompliantItems = await Compliance.find({
            overallStatus: 'non-compliant'
        }).select('title category riskLevel').limit(10);

        res.json({
            totalItems,
            byStatus,
            byRiskLevel,
            upcomingRenewals,
            nonCompliantItems
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
    }
};

export default {
    getComplianceItems,
    getComplianceItem,
    createComplianceItem,
    updateComplianceItem,
    deleteComplianceItem,
    updateRequirementStatus,
    addAuditRecord,
    getComplianceDashboard
};
