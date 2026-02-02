import Leave from '../models/Leave.js';
import LeaveType from '../models/LeaveType.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { createNotification } from './notificationController.js';
import { logLeaveApplied, logLeaveApproved, logLeaveRejected } from '../utils/auditLogger.js';

// @desc    Get leave applications
// @route   GET /api/leaves
// @access  Private
export const getLeaves = async (req, res) => {
    try {
        const { employeeId, status, leaveType, startDate, endDate, page = 1, limit = 10 } = req.query;

        const query = {};

        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;
        if (leaveType) query.leaveType = leaveType;
        if (startDate) query.startDate = { $gte: new Date(startDate) };
        if (endDate) query.endDate = { $lte: new Date(endDate) };

        // If not admin/hr, only show own leaves
        if (!['admin', 'HRManager', 'HRExecutive', 'DepartmentManager'].includes(req.user.role)) {
            query.employeeId = req.user.employeeId || req.user._id;
        }

        // Fetch leaves without populating employeeId first to preserve the raw ID
        const leaves = await Leave.find(query)
            .populate('userId', 'firstName lastName email name')
            .populate('leaveType', 'name code color')
            .populate('approvedBy', 'firstName lastName name')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ appliedOn: -1 })
            .lean();

        // Collect all distinct employee IDs
        const employeeIds = [...new Set(leaves.map(l => l.employeeId).filter(id => id))];

        // Fetch Employees and Users in parallel
        const [employees, users] = await Promise.all([
            Employee.find({ _id: { $in: employeeIds } }).select('personalInfo.firstName personalInfo.lastName employeeCode'),
            User.find({ _id: { $in: employeeIds } }).select('firstName lastName name')
        ]);

        // Create lookups
        const employeeMap = employees.reduce((acc, emp) => {
            acc[emp._id.toString()] = emp;
            return acc;
        }, {});

        const userMap = users.reduce((acc, usr) => {
            acc[usr._id.toString()] = usr;
            return acc;
        }, {});

        // Transform leaves
        const transformedLeaves = leaves.map(leave => {
            const empIdStr = leave.employeeId ? leave.employeeId.toString() : null;

            // 1. Try resolving from Employee collection (standard case)
            if (empIdStr && employeeMap[empIdStr]) {
                const emp = employeeMap[empIdStr];
                leave.employeeId = emp; // Re-attach for frontend consistency if needed
                leave.applicantName = `${emp.personalInfo.firstName} ${emp.personalInfo.lastName || ''}`.trim();
                leave.applicantCode = emp.employeeCode;
            }
            // 2. Try resolving from User collection (legacy case where employeeId stored User ID)
            else if (empIdStr && userMap[empIdStr]) {
                const usr = userMap[empIdStr];
                leave.applicantName = usr.firstName
                    ? `${usr.firstName} ${usr.lastName || ''}`.trim()
                    : (usr.name || 'Unknown');
                leave.applicantCode = ''; // Users don't have employee codes usually
            }
            // 3. Try resolving from the separate userId field (new Schema)
            else if (leave.userId) {
                const usr = leave.userId; // Already populated
                leave.applicantName = usr.firstName
                    ? `${usr.firstName} ${usr.lastName || ''}`.trim()
                    : (usr.name || 'Unknown');
            }
            // 4. Fallback
            else {
                leave.applicantName = 'Unknown (Deleted)';
            }

            return leave;
        });

        const total = await Leave.countDocuments(query);

        res.json({
            leaves: transformedLeaves,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leaves', error: error.message });
    }
};

// @desc    Get pending leave applications only
// @route   GET /api/leaves/pending
// @access  Private (HR, Admin, Manager)
export const getPendingLeaves = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Only get leaves with status 'pending'
        const query = { status: 'pending' };

        // Fetch leaves without populating employeeId first to preserve the raw ID
        const leaves = await Leave.find(query)
            .populate('userId', 'firstName lastName email name')
            .populate('leaveType', 'name code color')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ appliedOn: -1 })
            .lean();

        // Collect all distinct employee IDs
        const employeeIds = [...new Set(leaves.map(l => l.employeeId).filter(id => id))];

        // Fetch Employees and Users in parallel
        const [employees, users] = await Promise.all([
            Employee.find({ _id: { $in: employeeIds } }).select('personalInfo.firstName personalInfo.lastName employeeCode'),
            User.find({ _id: { $in: employeeIds } }).select('firstName lastName name')
        ]);

        // Create lookups
        const employeeMap = employees.reduce((acc, emp) => {
            acc[emp._id.toString()] = emp;
            return acc;
        }, {});

        const userMap = users.reduce((acc, usr) => {
            acc[usr._id.toString()] = usr;
            return acc;
        }, {});

        // Transform leaves
        const transformedLeaves = leaves.map(leave => {
            const empIdStr = leave.employeeId ? leave.employeeId.toString() : null;

            // 1. Try resolving from Employee collection (standard case)
            if (empIdStr && employeeMap[empIdStr]) {
                const emp = employeeMap[empIdStr];
                leave.employeeId = emp;
                leave.applicantName = `${emp.personalInfo.firstName} ${emp.personalInfo.lastName || ''}`.trim();
                leave.applicantCode = emp.employeeCode;
            }
            // 2. Try resolving from User collection (legacy case)
            else if (empIdStr && userMap[empIdStr]) {
                const usr = userMap[empIdStr];
                leave.applicantName = usr.firstName
                    ? `${usr.firstName} ${usr.lastName || ''}`.trim()
                    : (usr.name || 'Unknown');
                leave.applicantCode = '';
            }
            // 3. Try resolving from userId field
            else if (leave.userId) {
                const usr = leave.userId;
                leave.applicantName = usr.firstName
                    ? `${usr.firstName} ${usr.lastName || ''}`.trim()
                    : (usr.name || 'Unknown');
            }
            // 4. Fallback
            else {
                leave.applicantName = 'Unknown (Deleted)';
            }

            return leave;
        });

        const total = await Leave.countDocuments(query);

        res.json({
            leaves: transformedLeaves,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending leaves', error: error.message });
    }
};

// @desc    Get leave by ID
// @route   GET /api/leaves/:id
// @access  Private
export const getLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode')
            .populate('leaveType')
            .populate('approvedBy', 'firstName lastName');

        if (!leave) {
            return res.status(404).json({ message: 'Leave application not found' });
        }

        res.json({ leave });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave', error: error.message });
    }
};

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
export const applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason, halfDay, halfDayType, numberOfDays } = req.body;

        // Validate leave type
        const leaveTypeDoc = await LeaveType.findById(leaveType);
        if (!leaveTypeDoc) {
            return res.status(400).json({ message: 'Invalid leave type' });
        }

        // Use employeeId if available, otherwise use user._id
        const leaveIdentifier = req.user.employeeId || req.user._id;

        // Check for overlapping leaves
        const overlapping = await Leave.findOne({
            employeeId: leaveIdentifier,
            status: { $in: ['pending', 'approved'] },
            $or: [
                { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({ message: 'You already have a leave application for overlapping dates' });
        }

        // Calculate number of days if not provided
        let calcDays = numberOfDays;
        if (!calcDays) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            calcDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            if (halfDay) calcDays = 0.5;
        }

        const leave = await Leave.create({
            employeeId: leaveIdentifier,
            userId: req.user._id,
            leaveType,
            startDate,
            endDate,
            numberOfDays: calcDays,
            reason,
            halfDay,
            halfDayType,
            appliedOn: new Date()
        });

        await leave.populate('leaveType', 'name code');

        // Log leave application
        await logLeaveApplied(leave, req.user, req);

        // Notify HR managers about new leave request
        const hrUsers = await User.find({
            role: { $in: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager'] },
            isActive: true
        }).select('_id');

        const applicantName = `${req.user.firstName} ${req.user.lastName}`;
        const leaveTypeName = leaveTypeDoc.name;
        const formattedStartDate = new Date(startDate).toLocaleDateString();
        const formattedEndDate = new Date(endDate).toLocaleDateString();

        for (const hrUser of hrUsers) {
            await createNotification({
                recipientId: hrUser._id,
                type: 'leave_request',
                title: '📋 New Leave Request',
                message: `${applicantName} has applied for ${leaveTypeName} from ${formattedStartDate} to ${formattedEndDate} (${calcDays} day${calcDays > 1 ? 's' : ''})`,
                data: {
                    referenceId: leave._id,
                    referenceModel: 'Leave',
                    actionUrl: '/leave'
                },
                createdById: req.user._id
            });
        }

        res.status(201).json({ message: 'Leave application submitted successfully', leave });
    } catch (error) {
        res.status(500).json({ message: 'Error applying for leave', error: error.message });
    }
};


// @desc    Update leave application
// @route   PUT /api/leaves/:id
// @access  Private
export const updateLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({ message: 'Leave application not found' });
        }

        // Only allow update if pending
        if (leave.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot update leave that is not pending' });
        }

        Object.assign(leave, req.body);
        await leave.save();

        res.json({ message: 'Leave application updated successfully', leave });
    } catch (error) {
        res.status(500).json({ message: 'Error updating leave', error: error.message });
    }
};

// @desc    Approve/Reject leave
// @route   PUT /api/leaves/:id/approve
// @access  Private (HR, Manager, Admin)
export const approveLeave = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const leave = await Leave.findById(req.params.id)
            .populate('leaveType', 'name');

        if (!leave) {
            return res.status(404).json({ message: 'Leave application not found' });
        }

        if (leave.status !== 'pending') {
            return res.status(400).json({ message: 'Leave has already been processed' });
        }

        leave.status = status;
        leave.approvedBy = req.user._id;
        leave.approvedOn = new Date();
        if (status === 'rejected' && rejectionReason) {
            leave.rejectionReason = rejectionReason;
        }

        await leave.save();

        // Log leave approval/rejection
        if (status === 'approved') {
            await logLeaveApproved(leave, req.user, req);
        } else {
            await logLeaveRejected(leave, req.user, rejectionReason, req);
        }

        // Send notification to the employee
        const recipientId = leave.userId || leave.employeeId;
        if (recipientId) {
            const leaveTypeName = leave.leaveType?.name || 'Leave';
            const approverName = `${req.user.firstName} ${req.user.lastName}`;

            await createNotification({
                recipientId,
                type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
                title: status === 'approved' ? 'Leave Approved ✅' : 'Leave Rejected ❌',
                message: status === 'approved'
                    ? `Your ${leaveTypeName} request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been approved by ${approverName}.`
                    : `Your ${leaveTypeName} request has been rejected by ${approverName}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
                data: {
                    referenceId: leave._id,
                    referenceModel: 'Leave',
                    actionUrl: '/leave-management'
                },
                createdById: req.user._id
            });
        }

        res.json({ message: `Leave ${status} successfully`, leave });
    } catch (error) {
        res.status(500).json({ message: 'Error processing leave', error: error.message });
    }
};


// @desc    Cancel leave
// @route   PUT /api/leaves/:id/cancel
// @access  Private
export const cancelLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({ message: 'Leave application not found' });
        }

        if (!['pending', 'approved'].includes(leave.status)) {
            return res.status(400).json({ message: 'Cannot cancel this leave' });
        }

        leave.status = 'cancelled';
        leave.cancelledOn = new Date();
        leave.cancellationReason = req.body.reason;

        await leave.save();

        res.json({ message: 'Leave cancelled successfully', leave });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling leave', error: error.message });
    }
};

// @desc    Get leave balance (filtered by employee's gender)
// @route   GET /api/leaves/balance
// @access  Private
export const getLeaveBalance = async (req, res) => {
    try {
        // Use employeeId if available, otherwise use user._id
        const employeeId = req.query.employeeId || req.user.employeeId || req.user._id;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        // Get user's gender from employee record if available
        let userGender = null;
        if (req.user.employeeId) {
            const Employee = (await import('../models/Employee.js')).default;
            const employee = await Employee.findById(req.user.employeeId);
            if (employee?.personalInfo?.gender) {
                userGender = employee.personalInfo.gender.toLowerCase();
            }
        }

        let leaveTypes = await LeaveType.find({ isActive: true });

        // Filter leave types based on gender applicability
        if (userGender) {
            leaveTypes = leaveTypes.filter(lt => {
                const applicableGender = lt.applicableTo?.gender || 'all';
                // Show leave types that are applicable to 'all' OR match the user's gender
                return applicableGender === 'all' || applicableGender === userGender;
            });
        }

        const balances = await Promise.all(leaveTypes.map(async (type) => {
            const usedLeaves = await Leave.aggregate([
                {
                    $match: {
                        employeeId: employeeId,
                        leaveType: type._id,
                        status: 'approved',
                        startDate: {
                            $gte: new Date(year, 0, 1),
                            $lte: new Date(year, 11, 31)
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalDays: { $sum: '$numberOfDays' }
                    }
                }
            ]);

            const used = usedLeaves[0]?.totalDays || 0;

            return {
                leaveType: type,
                quota: type.annualQuota,
                used,
                available: type.annualQuota - used
            };
        }));

        res.json({ balances, year, userGender });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave balance', error: error.message });
    }
};

export default {
    getLeaves,
    getPendingLeaves,
    getLeave,
    applyLeave,
    updateLeave,
    approveLeave,
    cancelLeave,
    getLeaveBalance
};
