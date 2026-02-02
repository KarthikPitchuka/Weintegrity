import Asset from '../models/Asset.js';

// @desc    Get all assets
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req, res) => {
    try {
        const { category, status, assignedTo, search, page = 1, limit = 10 } = req.query;

        const query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        if (assignedTo) query.assignedTo = assignedTo;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { assetCode: { $regex: search, $options: 'i' } },
                { 'specifications.serialNumber': { $regex: search, $options: 'i' } }
            ];
        }

        const assets = await Asset.find(query)
            .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('createdBy', 'firstName lastName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Asset.countDocuments(query);

        res.json({
            assets,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assets', error: error.message });
    }
};

// @desc    Get asset by ID
// @route   GET /api/assets/:id
// @access  Private
export const getAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id)
            .populate('assignedTo', 'personalInfo employeeCode')
            .populate('assignmentHistory.employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('createdBy', 'firstName lastName');

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.json({ asset });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching asset', error: error.message });
    }
};

// @desc    Create asset
// @route   POST /api/assets
// @access  Private (HR, Admin)
export const createAsset = async (req, res) => {
    try {
        const asset = await Asset.create({
            ...req.body,
            createdBy: req.user._id
        });

        res.status(201).json({ message: 'Asset created successfully', asset });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Asset with this code already exists' });
        }
        res.status(500).json({ message: 'Error creating asset', error: error.message });
    }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private (HR, Admin)
export const updateAsset = async (req, res) => {
    try {
        const asset = await Asset.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.json({ message: 'Asset updated successfully', asset });
    } catch (error) {
        res.status(500).json({ message: 'Error updating asset', error: error.message });
    }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private (Admin)
export const deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findByIdAndDelete(req.params.id);

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting asset', error: error.message });
    }
};

// @desc    Assign asset to employee
// @route   POST /api/assets/:id/assign
// @access  Private (HR, Admin)
export const assignAsset = async (req, res) => {
    try {
        const { employeeId, notes } = req.body;

        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.status === 'assigned') {
            return res.status(400).json({ message: 'Asset is already assigned. Please return it first.' });
        }

        asset.assignedTo = employeeId;
        asset.status = 'assigned';
        asset.assignmentHistory.push({
            employeeId,
            assignedDate: new Date(),
            condition: asset.currentCondition,
            notes
        });

        await asset.save();

        res.json({ message: 'Asset assigned successfully', asset });
    } catch (error) {
        res.status(500).json({ message: 'Error assigning asset', error: error.message });
    }
};

// @desc    Return asset from employee
// @route   POST /api/assets/:id/return
// @access  Private (HR, Admin)
export const returnAsset = async (req, res) => {
    try {
        const { condition, notes } = req.body;

        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.status !== 'assigned') {
            return res.status(400).json({ message: 'Asset is not currently assigned' });
        }

        // Update the last assignment history record
        const lastAssignment = asset.assignmentHistory[asset.assignmentHistory.length - 1];
        if (lastAssignment) {
            lastAssignment.returnedDate = new Date();
            lastAssignment.condition = condition;
            if (notes) lastAssignment.notes = notes;
        }

        asset.assignedTo = null;
        asset.status = 'available';
        asset.currentCondition = condition;

        await asset.save();

        res.json({ message: 'Asset returned successfully', asset });
    } catch (error) {
        res.status(500).json({ message: 'Error returning asset', error: error.message });
    }
};

// @desc    Add maintenance record
// @route   POST /api/assets/:id/maintenance
// @access  Private (HR, Admin)
export const addMaintenance = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        asset.maintenanceHistory.push({
            ...req.body,
            date: new Date()
        });

        if (req.body.type === 'repair') {
            asset.status = 'in-repair';
        }

        await asset.save();

        res.json({ message: 'Maintenance record added successfully', asset });
    } catch (error) {
        res.status(500).json({ message: 'Error adding maintenance record', error: error.message });
    }
};

// @desc    Get asset statistics
// @route   GET /api/assets/stats
// @access  Private (HR, Admin)
export const getAssetStats = async (req, res) => {
    try {
        const totalAssets = await Asset.countDocuments();

        const byCategory = await Asset.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        const byStatus = await Asset.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const totalValue = await Asset.aggregate([
            { $group: { _id: null, total: { $sum: '$purchaseInfo.purchasePrice' } } }
        ]);

        res.json({
            totalAssets,
            byCategory,
            byStatus,
            totalValue: totalValue[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
};

export default {
    getAssets,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    assignAsset,
    returnAsset,
    addMaintenance,
    getAssetStats
};
