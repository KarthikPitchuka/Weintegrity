import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Holiday from '../models/Holiday.js';
import { logCheckIn, logCheckOut } from '../utils/auditLogger.js';

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
export const getAttendanceRecords = async (req, res) => {
    try {
        const { employeeId, startDate, endDate, status, month, year, page = 1, limit = 100, employeesOnly } = req.query;

        const query = {};

        // Filter by specific employee if provided
        // Search both employeeId and userId fields since records might reference either
        if (employeeId) {
            query.$or = [
                { employeeId: employeeId },
                { userId: employeeId }
            ];
        }
        if (status) query.status = status;

        // Date range filtering - support both startDate/endDate and month/year
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        } else if (month && year) {
            const targetMonth = parseInt(month);
            const targetYear = parseInt(year);
            const start = new Date(targetYear, targetMonth - 1, 1);
            const end = new Date(targetYear, targetMonth, 0, 23, 59, 59);
            query.date = { $gte: start, $lte: end };
        }

        // Role-based filtering
        const isHR = ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer'].includes(req.user.role);

        if (!isHR) {
            // Regular employees can only see their own attendance
            const userIdentifier = req.user.employeeId || req.user._id;
            if (!query.$or) {
                query.$or = [
                    { employeeId: userIdentifier },
                    { userId: userIdentifier }
                ];
            }
        } else if (!employeeId && employeesOnly !== 'true') {
            // HR staff also see only their own attendance by default, 
            // unless they explicitly filter by an employee OR use "All Employees" view
            const userIdentifier = req.user.employeeId || req.user._id;
            if (!query.$or) {
                query.$or = [
                    { employeeId: userIdentifier },
                    { userId: userIdentifier }
                ];
            }
        }

        // For HR viewing "All Employees", filter to only show Employee role users' attendance
        // This excludes attendance from HR staff, managers, and other non-employee roles
        let employeeOnlyUserIds = null;
        if (employeesOnly === 'true' && !employeeId) {
            // Get all users with 'Employee' role
            const employeeUsers = await User.find({ role: 'Employee', isActive: true }).select('_id employeeId');
            const userIds = employeeUsers.map(u => u._id);
            const linkedEmployeeIds = employeeUsers.filter(u => u.employeeId).map(u => u.employeeId);

            // Combine all IDs to filter by
            employeeOnlyUserIds = [...userIds.map(id => id.toString()), ...linkedEmployeeIds.map(id => id.toString())];

            // Add filter to only include attendance from these users
            if (!query.$or) {
                query.$or = [
                    { userId: { $in: userIds } },
                    { employeeId: { $in: [...userIds, ...linkedEmployeeIds] } }
                ];
            }
        }

        let records = await Attendance.find(query)
            .populate('employeeId', 'personalInfo.firstName personalInfo.lastName employeeCode employmentInfo.designation employmentInfo.department')
            .populate('userId', 'firstName lastName email employeeId role')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ date: -1 });

        // If employeesOnly filter is active, also filter records post-query to ensure no HR attendance slips through
        if (employeesOnly === 'true' && !employeeId) {
            records = records.filter(record => {
                // Check if the userId has role 'Employee'
                if (record.userId?.role && record.userId.role !== 'Employee') {
                    return false;
                }
                return true;
            });
        }

        // For records where employeeId didn't populate (might be User ID), try to get employee info via User
        records = await Promise.all(records.map(async (record) => {
            const recordObj = record.toObject();

            // If employeeId wasn't populated properly (no personalInfo), try to find via userId or direct lookup
            if (!recordObj.employeeId?.personalInfo && recordObj.employeeId) {
                try {
                    // First check if we have userId populated
                    if (recordObj.userId?.employeeId) {
                        const employee = await Employee.findById(recordObj.userId.employeeId)
                            .select('personalInfo.firstName personalInfo.lastName employeeCode employmentInfo.designation employmentInfo.department');
                        if (employee) {
                            recordObj.employeeId = employee;
                        }
                    } else {
                        // Try to find User by the stored employeeId (which might be a User ID)
                        const user = await User.findById(recordObj.employeeId).populate('employeeId');
                        if (user?.employeeId) {
                            const employee = await Employee.findById(user.employeeId)
                                .select('personalInfo.firstName personalInfo.lastName employeeCode employmentInfo.designation employmentInfo.department');
                            if (employee) {
                                recordObj.employeeId = employee;
                            }
                        } else if (user) {
                            // Create a pseudo-employee object from user data
                            recordObj.employeeId = {
                                _id: user._id,
                                employeeCode: '-',
                                personalInfo: {
                                    firstName: user.firstName,
                                    lastName: user.lastName
                                },
                                employmentInfo: {
                                    designation: user.role || '-',
                                    department: '-'
                                }
                            };
                        }
                    }
                } catch (e) {
                    // If lookup fails, keep original
                    console.error('Error looking up employee info:', e.message);
                }
            }
            return recordObj;
        }));

        const total = await Attendance.countDocuments(query);

        res.json({
            records,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance records', error: error.message });
    }
};

// @desc    Check in
// @route   POST /api/attendance/check-in
// @access  Private
export const checkIn = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use employeeId if available, otherwise use user._id
        const attendanceIdentifier = req.user.employeeId || req.user._id;

        console.log('Check-in attempt:', {
            userId: req.user._id,
            employeeId: req.user.employeeId,
            attendanceIdentifier,
            today: today.toISOString()
        });

        // Validate joining date - employees can only check in on or after joining date
        if (req.user.employeeId) {
            const employee = await Employee.findById(req.user.employeeId);
            if (employee && employee.employmentInfo?.joiningDate) {
                const joiningDate = new Date(employee.employmentInfo.joiningDate);
                joiningDate.setHours(0, 0, 0, 0);

                if (today < joiningDate) {
                    const formattedJoiningDate = joiningDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    return res.status(400).json({
                        message: `You cannot check in before your joining date (${formattedJoiningDate}). Please contact HR if you believe this is an error.`
                    });
                }
            }
        }

        // Use findOneAndUpdate with upsert to avoid race conditions and duplicate key errors
        let attendance = await Attendance.findOne({
            employeeId: attendanceIdentifier,
            date: today
        });

        if (attendance && attendance.checkIn?.time) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        const checkInTime = new Date();
        const checkInHour = checkInTime.getHours();
        const checkInMinutes = checkInTime.getMinutes();

        // Fetch employee shift details for dynamic late calculation
        const employee = await Employee.findById(attendanceIdentifier).populate('employmentInfo.shift');
        let isLate = false;

        if (employee?.employmentInfo?.shift) {
            const shift = employee.employmentInfo.shift;
            if (shift.timing && shift.timing.startTime) {
                const [startHour, startMinute] = shift.timing.startTime.split(':').map(Number);
                const graceMinutes = shift.timing.graceTime || 15;

                const checkInTotal = checkInHour * 60 + checkInMinutes;
                const shiftStartTotal = startHour * 60 + startMinute;

                if (checkInTotal > (shiftStartTotal + graceMinutes)) {
                    isLate = true;
                }
            } else {
                // Fallback to company settings if shift data incomplete
                const company = await Company.findOne({ status: 'active' });
                const startTime = company?.settings?.defaultStartTime || '09:00';
                const graceMinutes = company?.settings?.graceTime || 15;
                const [startHour, startMinute] = startTime.split(':').map(Number);

                const checkInTotal = checkInHour * 60 + checkInMinutes;
                const shiftStartTotal = startHour * 60 + startMinute;

                if (checkInTotal > (shiftStartTotal + graceMinutes)) {
                    isLate = true;
                }
            }
        } else {
            // Default: Use company settings
            const company = await Company.findOne({ status: 'active' });
            const startTime = company?.settings?.defaultStartTime || '09:00';
            const graceMinutes = company?.settings?.graceTime || 15;
            const [startHour, startMinute] = startTime.split(':').map(Number);

            const checkInTotal = checkInHour * 60 + checkInMinutes;
            const shiftStartTotal = startHour * 60 + startMinute;

            if (checkInTotal > (shiftStartTotal + graceMinutes)) {
                isLate = true;
            }
        }

        if (attendance) {
            // Update existing record
            attendance.checkIn = {
                time: checkInTime,
                location: req.body.location,
                method: req.body.method || 'web'
            };
            attendance.status = isLate ? 'late' : 'present';
            attendance.userId = req.user._id; // Ensure userId is set
            await attendance.save();
        } else {
            // Create new record
            attendance = new Attendance({
                employeeId: attendanceIdentifier,
                userId: req.user._id, // Store the user ID for reference
                date: today,
                checkIn: {
                    time: checkInTime,
                    location: req.body.location,
                    method: req.body.method || 'web'
                },
                status: isLate ? 'late' : 'present'
            });
            await attendance.save();
        }

        console.log('Check-in successful:', attendance._id);

        // Log check-in event
        await logCheckIn(attendance, req.user, req);

        res.json({ message: 'Checked in successfully', attendance });
    } catch (error) {
        console.error('Check-in error:', error);

        // Handle duplicate key error specifically
        if (error.code === 11000) {
            // Try to fetch and return existing record
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const attendanceIdentifier = req.user.employeeId || req.user._id;
                const existing = await Attendance.findOne({
                    employeeId: attendanceIdentifier,
                    date: today
                });
                if (existing?.checkIn?.time) {
                    return res.status(400).json({ message: 'Already checked in today' });
                }
            } catch (e) {
                // Ignore
            }
        }

        res.status(500).json({ message: 'Error checking in', error: error.message });
    }
};

// @desc    Check out
// @route   POST /api/attendance/check-out
// @access  Private
export const checkOut = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use employeeId if available, otherwise use user._id
        const attendanceIdentifier = req.user.employeeId || req.user._id;

        const attendance = await Attendance.findOne({
            employeeId: attendanceIdentifier,
            date: today
        });

        if (!attendance || !attendance.checkIn?.time) {
            return res.status(400).json({ message: 'You have not checked in today' });
        }

        if (attendance.checkOut?.time) {
            return res.status(400).json({ message: 'Already checked out today' });
        }

        const checkOutTime = new Date();

        attendance.checkOut = {
            time: checkOutTime,
            location: req.body.location,
            method: req.body.method || 'web'
        };

        // Calculate work hours
        const checkInTime = new Date(attendance.checkIn.time);
        const workMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
        const workHoursValue = workMilliseconds / (1000 * 60 * 60);
        attendance.workHours = parseFloat(workHoursValue.toFixed(2));

        console.log('Checkout Details:', {
            checkInTime: checkInTime.toISOString(),
            checkOutTime: checkOutTime.toISOString(),
            workMilliseconds,
            workHours: attendance.workHours
        });

        // Check for early leave (assuming 5:30 PM is standard end time)
        // Check for early leave based on shift
        const checkOutHour = checkOutTime.getHours();
        const employee = await Employee.findById(attendanceIdentifier).populate('employmentInfo.shift');

        if (employee?.employmentInfo?.shift) {
            const shift = employee.employmentInfo.shift;

            // Early Leave Check
            if (shift.timing && shift.timing.endTime) {
                const [endHour, endMinute] = shift.timing.endTime.split(':').map(Number);

                const checkOutTotal = checkOutHour * 60 + checkOutTime.getMinutes();
                const shiftEndTotal = endHour * 60 + endMinute;

                if (checkOutTotal < shiftEndTotal && attendance.status !== 'late') {
                    attendance.status = 'early-leave';
                }
            } else {
                // Fallback to company settings
                const company = await Company.findOne({ status: 'active' });
                const endTime = company?.settings?.defaultEndTime || '18:00';
                const [endHour, endMinute] = endTime.split(':').map(Number);

                const checkOutTotal = checkOutHour * 60 + checkOutTime.getMinutes();
                const shiftEndTotal = endHour * 60 + endMinute;

                if (checkOutTotal < shiftEndTotal && attendance.status !== 'late') {
                    attendance.status = 'early-leave';
                }
            }

            // Overtime Calculation
            if (shift.overtime && shift.overtime.allowed) {
                // Calculate net hours (Gross currently in attendance.workHours - Breaks)
                let totalBreakHours = 0;
                if (attendance.breaks && attendance.breaks.length > 0) {
                    totalBreakHours = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60;
                }
                const netHours = (attendance.workHours || 0) - totalBreakHours;

                const standardHours = shift.timing.fullDayHours || 8;
                if (netHours > standardHours) {
                    const extra = netHours - standardHours;
                    const minOT = shift.overtime.minOvertimeHours || 0.5;
                    if (extra >= minOT) {
                        const maxOT = shift.overtime.maxOvertimeHours || 4;
                        attendance.overtimeHours = parseFloat(Math.min(extra, maxOT).toFixed(2));
                    }
                }
            }

        } else {
            // Default: Use company settings
            const company = await Company.findOne({ status: 'active' });
            const endTime = company?.settings?.defaultEndTime || '18:00';
            const [endHour, endMinute] = endTime.split(':').map(Number);

            const checkOutTotal = checkOutHour * 60 + checkOutTime.getMinutes();
            const shiftEndTotal = endHour * 60 + endMinute;

            if (checkOutTotal < shiftEndTotal && attendance.status !== 'late') {
                attendance.status = 'early-leave';
            }

            // Default Overtime Logic (Standard 8 hours)
            if (company?.settings?.overtimeAllowed) {
                let totalBreakHours = 0;
                if (attendance.breaks && attendance.breaks.length > 0) {
                    totalBreakHours = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60;
                }
                const netHours = (attendance.workHours || 0) - totalBreakHours;
                if (netHours > 8) {
                    attendance.overtimeHours = parseFloat((netHours - 8).toFixed(2));
                }
            }
        }

        await attendance.save();

        // Log check-out event
        await logCheckOut(attendance, req.user, req);

        res.json({ message: 'Checked out successfully', attendance });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ message: 'Error checking out', error: error.message });
    }
};

// @desc    Get today's attendance for current user
// @route   GET /api/attendance/today
// @access  Private
export const getTodayAttendance = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use employeeId if available, otherwise use user._id
        const attendanceIdentifier = req.user.employeeId || req.user._id;

        console.log('Fetching today attendance:', {
            userId: req.user._id,
            employeeId: req.user.employeeId,
            attendanceIdentifier,
            today: today.toISOString()
        });

        // Get user's attendance for today
        const attendance = await Attendance.findOne({
            employeeId: attendanceIdentifier,
            date: today
        });

        console.log('Today attendance result:', attendance ? attendance._id : 'No record found');

        // For HR/Admin roles, also get the count of all employees present today
        let count = 0;
        if (['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer'].includes(req.user.role)) {
            count = await Attendance.countDocuments({
                date: today,
                'checkIn.time': { $exists: true }
            });
        }

        res.json({
            attendance: attendance || null,
            count
        });
    } catch (error) {
        console.error('Error fetching today attendance:', error);
        res.status(500).json({ message: 'Error fetching today\'s attendance', error: error.message });
    }
};

// @desc    Regularize attendance
// @route   POST /api/attendance/:id/regularize
// @access  Private
export const regularizeAttendance = async (req, res) => {
    try {
        const { reason, checkIn, checkOut } = req.body;

        const attendance = await Attendance.findById(req.params.id);

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        if (checkIn) attendance.checkIn = { ...attendance.checkIn, time: new Date(checkIn) };
        if (checkOut) attendance.checkOut = { ...attendance.checkOut, time: new Date(checkOut) };
        attendance.isRegularized = true;
        attendance.regularizationReason = reason;

        await attendance.save();

        res.json({ message: 'Attendance regularized successfully', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Error regularizing attendance', error: error.message });
    }
};

// @desc    Get attendance summary
// @route   GET /api/attendance/summary
// @access  Private
export const getAttendanceSummary = async (req, res) => {
    try {
        const { employeeId, month, year } = req.query;

        // Use provided employeeId or fallback to current user's identifiers
        const targetIdentifier = employeeId || req.user.employeeId || req.user._id;
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;
        const targetYear = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Robust query checking both possible identifier fields
        const query = {
            $or: [
                { employeeId: targetIdentifier },
                { userId: targetIdentifier }
            ],
            date: { $gte: startDate, $lte: endDate }
        };

        const records = await Attendance.find(query);

        // Fetch holidays for the period
        const holidays = await Holiday.find({
            date: { $gte: startDate, $lte: endDate },
            isActive: true
        });

        const summary = {
            totalDays: endDate.getDate(),
            present: records.filter(r => r.status === 'present').length,
            absent: records.filter(r => r.status === 'absent').length,
            late: records.filter(r => r.status === 'late').length,
            halfDay: records.filter(r => r.status === 'half-day').length,
            onLeave: records.filter(r => r.status === 'on-leave').length,
            earlyLeave: records.filter(r => r.status === 'early-leave').length,
            holiday: holidays.length,
            totalWorkHours: records.reduce((sum, r) => sum + (r.workHours || 0), 0),
            totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0)
        };

        res.json({ summary, records, holidays });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching summary', error: error.message });
    }
};

export default {
    getAttendanceRecords,
    checkIn,
    checkOut,
    getTodayAttendance,
    regularizeAttendance,
    getAttendanceSummary
};
