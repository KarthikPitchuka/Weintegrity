import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Holiday from '../models/Holiday.js';
import Leave from '../models/Leave.js';
import Shift from '../models/Shift.js';
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
        let employeeUsers = [];
        if (employeesOnly === 'true' && !employeeId) {
            // Get all users with 'Employee' role who have a linked Employee record
            // This ensures we only show regular employees and exclude HR/Admin staff 
            // who might have an account but aren't part of the regular tracking list
            employeeUsers = await User.find({ 
                role: 'Employee', 
                isActive: true,
                employeeId: { $exists: true, $ne: null }
            }).select('_id employeeId');
            const userIds = employeeUsers.map(u => u._id);
            const linkedEmployeeIds = employeeUsers.filter(u => u.employeeId).map(u => u.employeeId);

            // Add filter to only include attendance from these users
            if (!query.$or) {
                query.$or = [
                    { userId: { $in: userIds } },
                    { employeeId: { $in: [...userIds, ...linkedEmployeeIds] } }
                ];
            }
        }

        // Trigger absence sync in background for the requested range to ensure data is up to date
        // Only do this if it's for current or past dates
        const syncStartDate = startDate ? new Date(startDate) : (month && year ? new Date(year, month - 1, 1) : null);
        const syncEndDate = endDate ? new Date(endDate) : (month && year ? new Date(year, month, 0) : null);

        if (syncStartDate && syncEndDate) {
            if (employeeId) {
                markMissingAbsences(employeeId, syncStartDate, syncEndDate).catch(e => console.error('Absence sync error:', e.message));
            } else if (employeesOnly === 'true' && employeeUsers.length > 0) {
                // Background sync for all employees - to avoid blocking, we do it in batches or just trigger for each
                // Since this is a small team (per role count), we can trigger for each
                employeeUsers.forEach(u => {
                    const identifier = u.employeeId || u._id;
                    markMissingAbsences(identifier, syncStartDate, syncEndDate).catch(e => console.error(`Absence sync error for ${identifier}:`, e.message));
                });
            } else if (!isHR) {
                // Also trigger for the self view
                const userIdentifier = req.user.employeeId || req.user._id;
                markMissingAbsences(userIdentifier, syncStartDate, syncEndDate).catch(e => console.error('Absence sync error:', e.message));
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

        // For records where employeeId didn't populate (might be User ID or missing Employee record), 
        // try to get employee info via User
        records = await Promise.all(records.map(async (record) => {
            const recordObj = record.toObject();

            // If employeeId wasn't populated properly (null or no personalInfo), 
            // try to find info using userId or the stored employeeId value
            if (!recordObj.employeeId?.personalInfo) {
                try {
                    // Fallback identifier: check the original record's employeeId (might be a string ID) 
                    // or the populated userId
                    const rawRecord = await Attendance.findById(recordObj._id).select('employeeId userId');
                    const identifier = rawRecord.employeeId || (recordObj.userId?._id || recordObj.userId);

                    if (identifier) {
                        // Try to find User and see if they have an associated employeeId
                        const user = await User.findById(identifier).populate('employeeId');
                        
                        if (user?.employeeId && user.employeeId.personalInfo) {
                            // Found real Employee record through the User
                            recordObj.employeeId = user.employeeId;
                        } else if (user) {
                            // No Employee record, create a pseudo-employee object from account data
                            recordObj.employeeId = {
                                _id: user._id,
                                employeeCode: user.employeeId || '-',
                                personalInfo: {
                                    firstName: user.firstName,
                                    lastName: user.lastName
                                },
                                employmentInfo: {
                                    designation: user.role || 'Staff',
                                    department: '-'
                                }
                            };
                        } else if (mongoose.isValidObjectId(identifier)) {
                            // Last ditch: maybe the identifier itself is an Employee ID that just failed populate?
                            const directEmployee = await Employee.findById(identifier)
                                .select('personalInfo.firstName personalInfo.lastName employeeCode employmentInfo.designation employmentInfo.department');
                            if (directEmployee) {
                                recordObj.employeeId = directEmployee;
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error looking up employee info for attendance:', e.message);
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
// Helper to mark missing absences for a date range
const markMissingAbsences = async (targetIdentifier, startDate, endDate) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Define the limit (up to yesterday, or the requested endDate if earlier)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const limitDate = new Date(Math.min(endDate.getTime(), yesterday.getTime()));
        if (startDate > limitDate) return;

        // 1. Get user's shift info
        const employee = await Employee.findOne({
            $or: [
                { _id: mongoose.isValidObjectId(targetIdentifier) ? targetIdentifier : null },
                { userId: mongoose.isValidObjectId(targetIdentifier) ? targetIdentifier : null }
            ]
        }).populate('employmentInfo.shift');

        const shiftWorkingDays = employee?.employmentInfo?.shift?.workingDays || [1, 2, 3, 4, 5]; // Default Mon-Fri

        // 2. Get existing attendance records in this range
        const existingRecords = await Attendance.find({
            $or: [
                { employeeId: targetIdentifier },
                { userId: targetIdentifier }
            ],
            date: { $gte: startDate, $lte: limitDate }
        });
        const existingDates = new Set(existingRecords.map(r => r.date.toDateString()));

        // 3. Get holidays
        const holidays = await Holiday.find({
            date: { $gte: startDate, $lte: limitDate },
            isActive: true
        });
        const holidayDates = new Set(holidays.map(h => h.date.toDateString()));

        // 4. Get approved leaves
        const leaves = await Leave.find({
            $or: [
                { employeeId: targetIdentifier },
                { userId: targetIdentifier }
            ],
            status: 'approved',
            $or: [
                { startDate: { $lte: limitDate }, endDate: { $gte: startDate } }
            ]
        });

        // 5. Loop through dates and mark absent if missing
        const d = new Date(startDate);
        const absentRecords = [];

        while (d <= limitDate) {
            const dateStr = d.toDateString();
            const dayOfWeek = d.getDay();

            // Check if it's a working day and missing data
            if (shiftWorkingDays.includes(dayOfWeek) &&
                !existingDates.has(dateStr) &&
                !holidayDates.has(dateStr)) {

                // Check if on leave
                const onLeave = leaves.some(l => {
                    const lStart = new Date(l.startDate);
                    lStart.setHours(0, 0, 0, 0);
                    const lEnd = new Date(l.endDate);
                    lEnd.setHours(0, 0, 0, 0);
                    const currentD = new Date(d);
                    currentD.setHours(0, 0, 0, 0);
                    return currentD >= lStart && currentD <= lEnd;
                });

                if (!onLeave) {
                    absentRecords.push({
                        employeeId: employee?._id || (mongoose.isValidObjectId(targetIdentifier) ? targetIdentifier : undefined),
                        userId: employee?.userId || (mongoose.isValidObjectId(targetIdentifier) ? targetIdentifier : undefined),
                        date: new Date(d),
                        status: 'absent',
                        remarks: 'Automatically marked absent for missed working day'
                    });
                }
            }
            d.setDate(d.getDate() + 1);
        }

        if (absentRecords.length > 0) {
            // Using insertMany with ordered: false to skip duplicates
            await Attendance.insertMany(absentRecords, { ordered: false }).catch(err => {
                // Ignore duplicate key errors
                if (err.code !== 11000) console.error('Error inserting absences:', err.message);
            });
        }
    } catch (error) {
        console.error('Error marking missing absences:', error.message);
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

        // Run database sync for missing absences in background (don't await for faster dashboard response)
        markMissingAbsences(targetIdentifier, startDate, endDate).catch(err =>
            console.error('Background absence sync failed:', err.message)
        );

        // 1. Fetch existing attendance records
        const query = {
            $or: [
                { employeeId: targetIdentifier },
                { userId: targetIdentifier }
            ],
            date: { $gte: startDate, $lte: endDate }
        };

        const records = await Attendance.find(query);

        // 2. Fetch holidays and leaves for virtual calculation
        const [holidays, leaves, employee] = await Promise.all([
            Holiday.find({ date: { $gte: startDate, $lte: endDate }, isActive: true }),
            Leave.find({
                $or: [{ employeeId: targetIdentifier }, { userId: targetIdentifier }],
                status: 'approved',
                $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }]
            }),
            Employee.findOne({
                $or: [
                    { _id: mongoose.isValidObjectId(targetIdentifier) ? targetIdentifier : null },
                    { userId: mongoose.isValidObjectId(targetIdentifier) ? targetIdentifier : null }
                ]
            }).populate('employmentInfo.shift')
        ]);

        // 3. Calculate "Virtual" Absences to ensure graph is accurate immediately
        // This counts days that ARE working days but have NO record, NO holiday, and NO leave
        const existingDates = new Set(records.map(r => r.date.toDateString()));
        const holidayDates = new Set(holidays.map(h => h.date.toDateString()));
        const shiftWorkingDays = employee?.employmentInfo?.shift?.workingDays || [1, 2, 3, 4, 5];

        let virtualAbsentCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cursorDate = new Date(startDate);
        const calculationEndDate = new Date(Math.min(endDate.getTime(), today.getTime() - 86400000)); // Up to yesterday

        while (cursorDate <= calculationEndDate) {
            const dateStr = cursorDate.toDateString();
            const dayOfWeek = cursorDate.getDay();

            if (shiftWorkingDays.includes(dayOfWeek) &&
                !existingDates.has(dateStr) &&
                !holidayDates.has(dateStr)) {

                // Check if on leave
                const onLeave = leaves.some(l => {
                    const lStart = new Date(l.startDate); lStart.setHours(0, 0, 0, 0);
                    const lEnd = new Date(l.endDate); lEnd.setHours(0, 0, 0, 0);
                    const curr = new Date(cursorDate); curr.setHours(0, 0, 0, 0);
                    return curr >= lStart && curr <= lEnd;
                });

                if (!onLeave) virtualAbsentCount++;
            }
            cursorDate.setDate(cursorDate.getDate() + 1);
        }

        const summary = {
            totalDays: endDate.getDate(),
            present: records.filter(r => r.status === 'present').length,
            absent: records.filter(r => r.status === 'absent').length + virtualAbsentCount,
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
