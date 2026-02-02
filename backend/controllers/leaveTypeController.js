import LeaveType from '../models/LeaveType.js';
import Employee from '../models/Employee.js';

// @desc    Get all leave types (filtered by user's gender)
// @route   GET /api/leave-types
// @access  Private
export const getLeaveTypes = async (req, res) => {
    try {
        const { active } = req.query;
        const query = active !== undefined ? { isActive: active === 'true' } : {};

        let leaveTypes = await LeaveType.find(query).sort({ name: 1 });

        // Get user's gender from employee record if available
        let userGender = null;
        if (req.user.employeeId) {
            const employee = await Employee.findById(req.user.employeeId);
            if (employee?.personalInfo?.gender) {
                userGender = employee.personalInfo.gender.toLowerCase();
            }
        }

        // Filter leave types based on gender applicability
        if (userGender) {
            leaveTypes = leaveTypes.filter(lt => {
                const applicableGender = lt.applicableTo?.gender || 'all';
                // Show leave types that are applicable to 'all' OR match the user's gender
                return applicableGender === 'all' || applicableGender === userGender;
            });
        }

        res.json({ leaveTypes, userGender });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave types', error: error.message });
    }
};

// @desc    Get leave type by ID
// @route   GET /api/leave-types/:id
// @access  Private
export const getLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.findById(req.params.id);

        if (!leaveType) {
            return res.status(404).json({ message: 'Leave type not found' });
        }

        res.json({ leaveType });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave type', error: error.message });
    }
};

// @desc    Create leave type
// @route   POST /api/leave-types
// @access  Private (HR, Admin)
export const createLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.create(req.body);
        res.status(201).json({ message: 'Leave type created successfully', leaveType });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Leave type with this name or code already exists' });
        }
        res.status(500).json({ message: 'Error creating leave type', error: error.message });
    }
};

// @desc    Update leave type
// @route   PUT /api/leave-types/:id
// @access  Private (HR, Admin)
export const updateLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!leaveType) {
            return res.status(404).json({ message: 'Leave type not found' });
        }

        res.json({ message: 'Leave type updated successfully', leaveType });
    } catch (error) {
        res.status(500).json({ message: 'Error updating leave type', error: error.message });
    }
};

// @desc    Delete leave type
// @route   DELETE /api/leave-types/:id
// @access  Private (Admin)
export const deleteLeaveType = async (req, res) => {
    try {
        const leaveType = await LeaveType.findByIdAndDelete(req.params.id);

        if (!leaveType) {
            return res.status(404).json({ message: 'Leave type not found' });
        }

        res.json({ message: 'Leave type deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting leave type', error: error.message });
    }
};

export default { getLeaveTypes, getLeaveType, createLeaveType, updateLeaveType, deleteLeaveType };
