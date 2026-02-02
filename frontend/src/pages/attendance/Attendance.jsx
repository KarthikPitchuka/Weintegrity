import { useState, useEffect, useCallback } from 'react';
import {
    HiOutlineClock,
    HiOutlineLogout,
    HiOutlineCalendar,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineRefresh,
    HiOutlineUsers,
    HiOutlineFilter
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Attendance = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [elapsedTime, setElapsedTime] = useState('0h 0m');
    const [summary, setSummary] = useState({
        present: 0,
        absent: 0,
        late: 0,
        leaves: 0,
        workingDays: 0,
        totalHours: '0h 0m'
    });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('self'); // 'self' or 'all' (for HR)
    const [allEmployeesAttendance, setAllEmployeesAttendance] = useState([]);

    // HR/Manager roles check - these roles can view all employees' attendance
    const isHRRole = ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer'].includes(user?.role);

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Calculate elapsed time since check-in (live timer)
    useEffect(() => {
        let timer;

        const calculateElapsedTime = () => {
            if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
                // Currently working - calculate live elapsed time
                const checkInTimeValue = todayAttendance.checkIn?.time || todayAttendance.checkIn;
                const checkInTime = new Date(checkInTimeValue);

                if (!isNaN(checkInTime.getTime())) {
                    const now = new Date();
                    const diff = now - checkInTime;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setElapsedTime(`${hours}h ${minutes}m`);
                }
            } else if (todayAttendance?.checkIn && todayAttendance?.checkOut) {
                // Checked out - calculate total work hours between check-in and check-out
                const checkInTimeValue = todayAttendance.checkIn?.time || todayAttendance.checkIn;
                const checkOutTimeValue = todayAttendance.checkOut?.time || todayAttendance.checkOut;

                const checkInTime = new Date(checkInTimeValue);
                const checkOutTime = new Date(checkOutTimeValue);

                if (!isNaN(checkInTime.getTime()) && !isNaN(checkOutTime.getTime())) {
                    const diff = checkOutTime - checkInTime;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setElapsedTime(`${hours}h ${minutes}m`);
                } else if (todayAttendance.workHours) {
                    // Fallback to workHours from database
                    const hours = Math.floor(todayAttendance.workHours);
                    const minutes = Math.round((todayAttendance.workHours - hours) * 60);
                    setElapsedTime(`${hours}h ${minutes}m`);
                }
            } else {
                setElapsedTime('0h 0m');
            }
        };

        // Calculate immediately
        calculateElapsedTime();

        // Update every minute for live timer (only if checked in but not out)
        if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
            timer = setInterval(calculateElapsedTime, 60000); // Update every minute
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [todayAttendance, currentTime]);

    useEffect(() => {
        if (user) {
            fetchTodayAttendance();
            fetchAttendanceHistory();
        }
    }, [selectedMonth, selectedYear, viewMode, user]);

    const fetchTodayAttendance = async () => {
        try {
            const response = await api.get('/attendance/today');
            setTodayAttendance(response.data?.attendance || null);
        } catch (error) {
            console.error('Error fetching today attendance:', error);
            setTodayAttendance(null);
        }
    };

    const fetchAttendanceHistory = async () => {
        setLoading(true);
        try {
            // Calculate date range for selected month
            const startDate = new Date(selectedYear, selectedMonth - 1, 1);
            const endDate = new Date(selectedYear, selectedMonth, 0);

            const recordEmployeeId = user?.employeeId?._id || user?.employeeId || user?._id || user?.id;
            const params = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                limit: 100 // Get all records for the month
            };

            // For 'self' view mode, explicitly request only the current user's attendance
            // This is important for HR roles who can normally see all attendance
            if (viewMode === 'self') {
                params.employeeId = typeof recordEmployeeId === 'object' ? recordEmployeeId?._id : recordEmployeeId;
            } else if (viewMode === 'all') {
                // For 'all' view, only show Employee role users' attendance (exclude HR staff)
                params.employeesOnly = 'true';
            }

            const response = await api.get('/attendance', { params });
            const records = response.data?.records || [];

            // For HR viewing all employees
            if (isHRRole && viewMode === 'all') {
                setAllEmployeesAttendance(records);
            }

            setAttendanceHistory(records);

            // Calculate summary
            const present = records.filter(r => r.status === 'present').length;
            const late = records.filter(r => r.status === 'late').length;
            const leaves = records.filter(r => r.status === 'on-leave').length;
            const absent = records.filter(r => r.status === 'absent').length;

            // Calculate total hours
            let totalMinutes = 0;
            records.forEach(r => {
                const hours = r.workHours || r.workingHours || 0;
                totalMinutes += hours * 60;
            });
            const hours = Math.floor(totalMinutes / 60);
            const mins = Math.round(totalMinutes % 60);

            setSummary({
                present: present + late,
                absent,
                late,
                leaves,
                workingDays: records.length,
                totalHours: `${hours}h ${mins}m`
            });
        } catch (error) {
            console.error('Error fetching attendance:', error);
            setAttendanceHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        setActionLoading(true);
        try {
            const response = await api.post('/attendance/check-in');
            setTodayAttendance(response.data?.attendance);
            toast.success('Checked in successfully! Timer started.');
            fetchAttendanceHistory();
        } catch (error) {
            console.error('Check-in error:', error);
            toast.error(error.response?.data?.message || 'Failed to check in');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckOut = async () => {
        setActionLoading(true);
        try {
            const response = await api.post('/attendance/check-out');
            setTodayAttendance(response.data?.attendance);
            toast.success('Checked out successfully! Work hours recorded.');
            fetchAttendanceHistory();
        } catch (error) {
            console.error('Check-out error:', error);
            toast.error(error.response?.data?.message || 'Failed to check out');
        } finally {
            setActionLoading(false);
        }
    };

    // Helper to check if a check-in/out value exists and is valid
    const hasValidCheckIn = () => {
        if (!todayAttendance) return false;
        const checkIn = todayAttendance.checkIn;
        if (!checkIn) return false;
        // Handle both nested (checkIn.time) and direct value
        const timeValue = checkIn?.time || checkIn;
        return !!timeValue && !isNaN(new Date(timeValue).getTime());
    };

    const hasValidCheckOut = () => {
        if (!todayAttendance) return false;
        const checkOut = todayAttendance.checkOut;
        if (!checkOut) return false;
        // Handle both nested (checkOut.time) and direct value
        const timeValue = checkOut?.time || checkOut;
        return !!timeValue && !isNaN(new Date(timeValue).getTime());
    };

    const formatTime = (dateValue) => {
        if (!dateValue) return '-';

        // Handle nested structure (checkIn.time) or direct value (checkIn)
        const timeValue = dateValue?.time || dateValue;

        if (!timeValue) return '-';

        try {
            const date = new Date(timeValue);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '-';
        }
    };

    const formatWorkHours = (record) => {
        // First try to use workHours from the record
        const hours = record.workHours || record.workingHours;
        if (hours && hours > 0) {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${h}h ${m}m`;
        }

        // If no workHours, calculate from check-in/check-out
        if (record.checkIn && record.checkOut) {
            const checkInTime = new Date(record.checkIn?.time || record.checkIn);
            const checkOutTime = new Date(record.checkOut?.time || record.checkOut);

            if (!isNaN(checkInTime.getTime()) && !isNaN(checkOutTime.getTime())) {
                const diff = checkOutTime - checkInTime;
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                return `${h}h ${m}m`;
            }
        }

        return '-';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'present':
                return <span className="badge-success">Present</span>;
            case 'late':
                return <span className="badge-warning">Late</span>;
            case 'absent':
                return <span className="badge-danger">Absent</span>;
            case 'on-leave':
                return <span className="badge-info">On Leave</span>;
            case 'early-leave':
                return <span className="badge-warning">Early Leave</span>;
            case 'weekend':
                return <span className="badge-gray">Weekend</span>;
            case 'holiday':
                return <span className="bg-purple-100 text-purple-800 badge">Holiday</span>;
            default:
                return <span className="badge-gray">{status}</span>;
        }
    };

    const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1];
    };

    const getEmployeeInfo = (record) => {
        const info = {
            id: record.employeeId?.employeeCode || record.employeeId?._id || '-',
            name: 'Unknown',
            department: record.employeeId?.employmentInfo?.department || '-',
            designation: record.employeeId?.employmentInfo?.designation || '-'
        };

        if (record.employeeId?.personalInfo) {
            const firstName = record.employeeId.personalInfo.firstName || '';
            const lastName = record.employeeId.personalInfo.lastName || '';
            info.name = `${firstName} ${lastName}`.trim() || 'Unknown';
        }

        return info;
    };

    // Generate years for dropdown
    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Attendance</h1>
                    <p className="text-secondary-500 mt-1">
                        {isHRRole ? 'Manage team attendance' : 'Track your daily attendance'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isHRRole && (
                        <div className="flex bg-secondary-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('self')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'self'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-secondary-600 hover:text-secondary-900'
                                    }`}
                            >
                                My Attendance
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'all'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-secondary-600 hover:text-secondary-900'
                                    }`}
                            >
                                <HiOutlineUsers className="inline w-4 h-4 mr-1" />
                                All Employees
                            </button>
                        </div>
                    )}
                    <button onClick={() => { fetchTodayAttendance(); fetchAttendanceHistory(); }} className="btn-secondary btn-sm">
                        <HiOutlineRefresh className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Check In/Out Card - Only show for self view */}
            {viewMode === 'self' && (
                <div className="card p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="text-center md:text-left">
                            <p className="text-secondary-500">
                                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            <h2 className="text-4xl font-bold text-secondary-900 mt-2">
                                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </h2>

                            {/* Today's Status */}
                            {todayAttendance && (
                                <div className="mt-3 space-y-1">
                                    {todayAttendance.checkIn && (
                                        <p className="text-sm text-green-600">
                                            ✓ Checked in at {formatTime(todayAttendance.checkIn)}
                                        </p>
                                    )}
                                    {todayAttendance.checkOut && (
                                        <p className="text-sm text-blue-600">
                                            ✓ Checked out at {formatTime(todayAttendance.checkOut)}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Live Working Hours Timer */}
                            {hasValidCheckIn() && !hasValidCheckOut() && (
                                <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                                    <HiOutlineClock className="w-5 h-5 text-green-600 animate-pulse" />
                                    <div>
                                        <p className="text-xs text-green-600 font-medium">Working Time</p>
                                        <p className="text-xl font-bold text-green-700">{elapsedTime}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-4 justify-center items-center">
                            {/* Not checked in yet - Show Check In button */}
                            {!hasValidCheckIn() && (
                                <button
                                    onClick={handleCheckIn}
                                    disabled={actionLoading}
                                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <HiOutlineClock className="w-6 h-6" />
                                    )}
                                    Check In
                                </button>
                            )}

                            {/* Checked in but not out - Show Check Out button */}
                            {hasValidCheckIn() && !hasValidCheckOut() && (
                                <button
                                    onClick={handleCheckOut}
                                    disabled={actionLoading}
                                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <HiOutlineLogout className="w-6 h-6" />
                                    )}
                                    Check Out
                                </button>
                            )}

                            {/* Checked in and out - Show completion message */}
                            {hasValidCheckIn() && hasValidCheckOut() && (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="px-8 py-4 bg-secondary-100 text-secondary-600 rounded-xl font-medium">
                                        ✓ Attendance Complete for Today
                                    </div>
                                    <p className="text-sm text-secondary-500">
                                        Total Work: <span className="font-semibold text-secondary-700">{elapsedTime}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HR Info Banner - For all employees view */}
            {isHRRole && viewMode === 'all' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <HiOutlineUsers className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-purple-800">Team Attendance Overview</h3>
                            <p className="text-sm text-purple-700 mt-1">
                                Viewing attendance records for all employees. You can filter by month and year.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                        <HiOutlineCheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900 mt-2">{summary.present}</p>
                    <p className="text-xs text-secondary-500">Present</p>
                </div>
                <div className="card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                        <HiOutlineXCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900 mt-2">{summary.absent}</p>
                    <p className="text-xs text-secondary-500">Absent</p>
                </div>
                <div className="card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-yellow-100 flex items-center justify-center">
                        <HiOutlineClock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900 mt-2">{summary.late}</p>
                    <p className="text-xs text-secondary-500">Late</p>
                </div>
                <div className="card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                        <HiOutlineCalendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900 mt-2">{summary.leaves}</p>
                    <p className="text-xs text-secondary-500">Leaves</p>
                </div>
                <div className="card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                        <HiOutlineCalendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900 mt-2">{summary.workingDays}</p>
                    <p className="text-xs text-secondary-500">Working Days</p>
                </div>
                <div className="card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-indigo-100 flex items-center justify-center">
                        <HiOutlineClock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900 mt-2">{summary.totalHours}</p>
                    <p className="text-xs text-secondary-500">Total Hours</p>
                </div>
            </div>

            {/* Attendance History */}
            <div className="card">
                <div className="px-6 py-4 border-b border-secondary-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="font-semibold text-secondary-900">
                        {viewMode === 'all' ? 'All Employees Attendance' : 'Attendance History'} - {getMonthName(selectedMonth)} {selectedYear}
                    </h2>
                    <div className="flex gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="input w-auto"
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="input w-auto"
                        >
                            {yearOptions.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                            <p className="text-secondary-500 mt-2">Loading from database...</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="table-header">
                                    {viewMode === 'all' && <th className="table-header-cell text-primary-600">Employee ID</th>}
                                    {viewMode === 'all' && <th className="table-header-cell text-primary-600">Employee Name</th>}
                                    <th className="table-header-cell text-primary-600">Date</th>
                                    <th className="table-header-cell text-primary-600">Day</th>
                                    <th className="table-header-cell text-primary-600">Check In</th>
                                    <th className="table-header-cell text-primary-600">Check Out</th>
                                    <th className="table-header-cell text-primary-600">Working Hours</th>
                                    <th className="table-header-cell text-primary-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {attendanceHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={viewMode === 'all' ? 8 : 6} className="table-cell text-center py-8 text-secondary-500">
                                            No attendance records found for this period
                                        </td>
                                    </tr>
                                ) : (
                                    attendanceHistory.map((record, index) => {
                                        const empInfo = getEmployeeInfo(record);
                                        return (
                                            <tr key={index} className="hover:bg-secondary-50">
                                                {viewMode === 'all' && (
                                                    <td className="table-cell">
                                                        <span className="font-mono font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                                                            {empInfo.id}
                                                        </span>
                                                    </td>
                                                )}
                                                {viewMode === 'all' && (
                                                    <td className="table-cell">
                                                        <div>
                                                            <p className="font-medium text-secondary-900">{empInfo.name}</p>
                                                            <p className="text-xs text-secondary-500">{empInfo.designation}</p>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="table-cell font-medium">
                                                    {new Date(record.date).toLocaleDateString()}
                                                </td>
                                                <td className="table-cell">
                                                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                </td>
                                                <td className="table-cell">{formatTime(record.checkIn)}</td>
                                                <td className="table-cell">{formatTime(record.checkOut)}</td>
                                                <td className="table-cell">{formatWorkHours(record)}</td>
                                                <td className="table-cell">{getStatusBadge(record.status)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Attendance;
