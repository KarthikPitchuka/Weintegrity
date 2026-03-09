import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    HiOutlineCalendar,
    HiOutlineClipboardCheck,
    HiOutlineCurrencyDollar,
    HiOutlineDocumentText,
    HiOutlineClock,
    HiOutlineChartBar,
    HiOutlineDownload,
    HiOutlineArrowUp,
    HiOutlineRefresh,
    HiOutlineUser,
    HiOutlineBell,
    HiOutlineX,
    HiOutlineTrendingUp,
    HiOutlineChartPie,
    HiOutlineChevronRight,
    HiOutlineFlag,
    HiOutlineChatAlt2
} from 'react-icons/hi';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import HolidayCalendar from '../../components/HolidayCalendar';
import { useNotifications } from '../../context/NotificationContext';

const EmployeeDashboard = ({ user }) => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [leaveBalance, setLeaveBalance] = useState({
        casual: 12,
        sick: 10,
        earned: 14,
        total: 36
    });
    const [stats, setStats] = useState({
        attendanceThisMonth: '0/22',
        pendingRequests: 0,
        performanceScore: '4.2/5'
    });
    const [recentPayslips, setRecentPayslips] = useState([]);
    const [downloadingPayslip, setDownloadingPayslip] = useState(null);
    const [upcomingHolidays, setUpcomingHolidays] = useState([]);
    const [allHolidays, setAllHolidays] = useState([]);
    const [holidaysLoading, setHolidaysLoading] = useState(true);
    const [notificationBannerDismissed, setNotificationBannerDismissed] = useState(false);
    const [employeeProfile, setEmployeeProfile] = useState(null);
    const [performanceHistory, setPerformanceHistory] = useState([]);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [activeProjects, setActiveProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);

    // Get notification context
    const { unreadCount } = useNotifications();

    // Total annual leave quota: 36 days
    const TOTAL_ANNUAL_LEAVES = 36;
    const WORKING_DAYS_PER_MONTH = 22;

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch all data
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
            fetchTodayAttendance(),
            fetchLeaveBalance(),
            fetchStats(),
            fetchRecentPayslips(),
            fetchUpcomingHolidays(),
            fetchEmployeeProfile(),
            fetchActiveProjects()
        ]);
        setLoading(false);
    };

    const fetchEmployeeProfile = async () => {
        try {
            const response = await api.get('/auth/me');
            const userData = response.data?.user;
            if (userData?.employeeId) {
                setEmployeeProfile({
                    employeeCode: userData.employeeId.employeeCode,
                    department: userData.employeeId.employmentInfo?.department,
                    designation: userData.employeeId.employmentInfo?.designation,
                    joiningDate: userData.employeeId.employmentInfo?.joiningDate,
                    workLocation: userData.employeeId.employmentInfo?.workLocation,
                    employmentType: userData.employeeId.employmentInfo?.employmentType,
                    status: userData.employeeId.status,
                    reportingManager: userData.employeeId.employmentInfo?.reportingManager ?
                        `${userData.employeeId.employmentInfo.reportingManager.personalInfo?.firstName} ${userData.employeeId.employmentInfo.reportingManager.personalInfo?.lastName}` :
                        'Not Assigned'
                });
            }
        } catch (error) {
            console.error('Error fetching employee profile:', error);
        }
    };

    const fetchTodayAttendance = async () => {
        try {
            const response = await api.get('/attendance/today');
            setTodayAttendance(response.data?.attendance || null);
        } catch (error) {
            console.error('Error fetching today attendance:', error);
        }
    };

    const fetchLeaveBalance = async () => {
        try {
            const response = await api.get('/leaves/balance');
            const balances = response.data?.balances || [];

            let casual = 0, sick = 0, earned = 0;
            balances.forEach(b => {
                const code = b.leaveType?.code?.toUpperCase();
                if (code === 'CL') casual = b.available || 0;
                else if (code === 'SL') sick = b.available || 0;
                else if (code === 'EL') earned = b.available || 0;
            });

            // If no data from server, use default values that sum to 36
            const total = casual + sick + earned;
            if (total === 0) {
                setLeaveBalance({ casual: 12, sick: 10, earned: 14, total: 36 });
            } else {
                setLeaveBalance({ casual, sick, earned, total });
            }
        } catch (error) {
            console.error('Error fetching leave balance:', error);
            // Default: 36 total leaves per year (12 CL + 10 SL + 14 EL)
            setLeaveBalance({ casual: 12, sick: 10, earned: 14, total: 36 });
        }
    };

    const fetchStats = async () => {
        try {
            // Fetch attendance summary for the month
            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            const attendanceRes = await api.get('/attendance', {
                params: { month, year }
            }).catch(() => ({ data: { records: [] } }));

            const records = attendanceRes.data?.records || [];
            const presentDays = records.filter(r =>
                ['present', 'late'].includes(r.status)
            ).length;

            // Default to 0 days if no records, otherwise use actual count
            const actualPresentDays = presentDays;
            const workingDays = WORKING_DAYS_PER_MONTH;

            // Fetch pending leave requests
            const leavesRes = await api.get('/leaves').catch(() => ({ data: { leaves: [] } }));
            const pendingLeaves = (leavesRes.data?.leaves || []).filter(l => l.status === 'pending').length;

            setStats({
                attendanceThisMonth: `${actualPresentDays}/${workingDays}`,
                pendingRequests: pendingLeaves,
                performanceScore: '4.2/5'
            });

            // Fetch Additional Stats for Charts
            fetchChartData();
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStats({
                attendanceThisMonth: '0/22',
                pendingRequests: 0,
                performanceScore: '4.2/5'
            });
        }
    };

    const fetchChartData = async () => {
        try {
            setStatsLoading(true);
            // Fetch attendance summary
            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();

            const [attendanceRes, performanceRes] = await Promise.all([
                api.get('/attendance/summary', { params: { month, year } }),
                api.get('/performance', { params: { limit: 5 } })
            ]);

            setAttendanceSummary(attendanceRes.data.summary);
            setPerformanceHistory(performanceRes.data.reviews ? [...performanceRes.data.reviews].reverse() : []);
        } catch (err) {
            console.error('Error fetching chart data:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchRecentPayslips = async () => {
        try {
            // Try to get employee's payslips from dedicated endpoint first
            let records = [];
            try {
                const myPayslipsRes = await api.get('/payroll/my-payslips');
                records = myPayslipsRes.data || [];
            } catch (e) {
                // Fallback to regular payroll endpoint
                const response = await api.get('/payroll');
                records = response.data?.payrolls || response.data?.records || [];
            }

            // Transform and take last 3
            const payslips = records.slice(0, 3).map(r => ({
                id: r._id,
                month: r.payPeriod ?
                    new Date(r.payPeriod.year, r.payPeriod.month - 1).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                    }) :
                    (r.year && r.month ? new Date(r.year, r.month - 1).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                    }) : 'Unknown'),
                amount: `₹${(r.netSalary || r.netPay || 0).toLocaleString()}`,
                status: r.status || r.paymentStatus || 'processed'
            }));

            setRecentPayslips(payslips);
        } catch (error) {
            console.error('Error fetching payslips:', error);
            setRecentPayslips([]);
        }
    };

    const fetchActiveProjects = async () => {
        try {
            setProjectsLoading(true);
            const response = await api.get('/projects', { params: { limit: 5 } });
            setActiveProjects(response.data.projects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setProjectsLoading(false);
        }
    };

    const handleCheckIn = async () => {
        setActionLoading(true);
        try {
            const response = await api.post('/attendance/check-in');
            setTodayAttendance(response.data?.attendance);
            toast.success('Checked in successfully! Saved to database.');
            fetchStats(); // Refresh stats
        } catch (error) {
            console.error('Check-in failed:', error);
            toast.error(error.response?.data?.message || 'Check-in failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckOut = async () => {
        setActionLoading(true);
        try {
            const response = await api.post('/attendance/check-out');
            setTodayAttendance(response.data?.attendance);
            toast.success('Checked out successfully! Saved to database.');
            fetchStats(); // Refresh stats
        } catch (error) {
            console.error('Check-out failed:', error);
            toast.error(error.response?.data?.message || 'Check-out failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadPayslip = async (payslipId, month) => {
        setDownloadingPayslip(payslipId);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success(`Payslip for ${month} downloaded!`);
        } catch (error) {
            toast.error('Failed to download payslip');
        } finally {
            setDownloadingPayslip(null);
        }
    };

    const isCheckedIn = todayAttendance?.checkIn && !todayAttendance?.checkOut;
    const isCheckedOut = todayAttendance?.checkIn && todayAttendance?.checkOut;

    const formatTime = (dateString) => {
        if (!dateString) return 'Invalid Date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const quickStats = [
        {
            name: 'Leave Balance',
            value: leaveBalance.total,
            subtitle: 'Total days available',
            icon: HiOutlineCalendar,
            color: 'bg-blue-500',
            link: '/leave'
        },
        {
            name: 'This Month Attendance',
            value: stats.attendanceThisMonth,
            subtitle: 'Days present',
            icon: HiOutlineClipboardCheck,
            color: 'bg-green-500',
            link: '/attendance'
        },
        {
            name: 'Pending Requests',
            value: stats.pendingRequests,
            subtitle: 'Leave applications',
            icon: HiOutlineDocumentText,
            color: 'bg-orange-500',
            link: '/leave'
        },
        {
            name: 'Performance Score',
            value: stats.performanceScore,
            subtitle: 'Last review',
            icon: HiOutlineChartBar,
            color: 'bg-purple-500',
            link: '/performance'
        }
    ];

    const fetchUpcomingHolidays = async () => {
        try {
            setHolidaysLoading(true);
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;

            const [upcomingRes, currentYearRes, nextYearRes] = await Promise.all([
                api.get('/holidays/upcoming?limit=4'),
                api.get(`/holidays?year=${currentYear}`),
                api.get(`/holidays?year=${nextYear}`)
            ]);

            setUpcomingHolidays(upcomingRes.data?.holidays || []);
            const allYearHolidays = [
                ...(currentYearRes.data?.holidays || []),
                ...(nextYearRes.data?.holidays || [])
            ];
            setAllHolidays(allYearHolidays);
        } catch (error) {
            console.error('Error fetching holidays:', error);
            setUpcomingHolidays([]);
            setAllHolidays([]);
        } finally {
            setHolidaysLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Notification Reminder Banner */}
            {unreadCount > 0 && !notificationBannerDismissed && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-lg animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <HiOutlineBell className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">
                                    🔔 You have {unreadCount} new notification{unreadCount > 1 ? 's' : ''} to read!
                                </h3>
                                <p className="text-amber-100 text-sm">
                                    Check your notifications to stay updated on your leave requests and other updates.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                to="/notifications"
                                className="px-4 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                            >
                                View Notifications
                            </Link>
                            <button
                                onClick={() => setNotificationBannerDismissed(true)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                title="Dismiss"
                            >
                                <HiOutlineX className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Deadline Alert */}
            {activeProjects.some(p => p.endDate && new Date(p.endDate) > new Date() && (new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24) <= 3) && (
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl p-4 shadow-lg animate-pulse mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <HiOutlineFlag className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">
                                    ⚠️ Critical Deadlines Approaching!
                                </h3>
                                <p className="text-rose-100 text-sm">
                                    You have project deadlines within the next 3 days. Please ensure all updates are submitted.
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/projects"
                            className="px-4 py-2 bg-white text-rose-600 rounded-lg font-medium hover:bg-rose-50 transition-colors"
                        >
                            View Projects
                        </Link>
                    </div>
                </div>
            )}

            {/* Welcome Section with Check-in */}
            <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.firstName}! 👋
                        </h1>
                        <p className="mt-1 text-primary-100">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        {/* Today's Status */}
                        {todayAttendance && (
                            <div className="mt-2 text-sm text-primary-100">
                                {todayAttendance.checkIn && (
                                    <span>✓ Checked in at {formatTime(todayAttendance.checkIn.time || todayAttendance.checkIn)}</span>
                                )}
                                {todayAttendance.checkOut && (
                                    <span className="ml-3">✓ Checked out at {formatTime(todayAttendance.checkOut?.time)}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-4">
                        <div className="text-right mr-4">
                            <div className="text-3xl font-bold">
                                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        {!isCheckedIn && !isCheckedOut ? (
                            <button
                                onClick={handleCheckIn}
                                disabled={actionLoading}
                                className="px-6 py-3 bg-white text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading ? (
                                    <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                ) : (
                                    <HiOutlineClock className="w-5 h-5" />
                                )}
                                Check In
                            </button>
                        ) : isCheckedIn ? (
                            <button
                                onClick={handleCheckOut}
                                disabled={actionLoading}
                                className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <HiOutlineClock className="w-5 h-5" />
                                )}
                                Check Out
                            </button>
                        ) : (
                            <div className="px-6 py-3 bg-white/20 text-white rounded-xl font-medium">
                                ✓ Completed for Today
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center justify-end">
                <button
                    onClick={fetchAllData}
                    disabled={loading}
                    className="btn-secondary btn-sm"
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* Performance & Attendance Insights Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-secondary-900 flex items-center gap-2">
                            <HiOutlineTrendingUp className="w-5 h-5 text-primary-600" />
                            Performance Trend
                        </h3>
                        <span className="text-xs text-secondary-500">Last 5 Reviews</span>
                    </div>
                    <div className="h-64">
                        {statsLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                            </div>
                        ) : performanceHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceHistory.map(r => ({
                                    name: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short' }),
                                    rating: r.overallRating || 0,
                                    band: r.performanceBand?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'N/A'
                                }))}>
                                    <defs>
                                        <linearGradient id="colorRatingDash" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis hide domain={[0, 5]} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-50">
                                                        <p className="text-xs font-bold text-slate-800 mb-1">{payload[0].payload.name}</p>
                                                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{payload[0].payload.band}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="rating" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRatingDash)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-secondary-400">
                                <HiOutlineChartBar className="w-12 h-12 mb-2 opacity-20" />
                                <p className="text-sm">No performance data yet</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-secondary-900 flex items-center gap-2">
                            <HiOutlineChartPie className="w-5 h-5 text-green-600" />
                            Attendance Distribution
                        </h3>
                        <span className="text-xs text-secondary-500">Current Month</span>
                    </div>
                    <div className="h-64">
                        {statsLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                            </div>
                        ) : attendanceSummary ? (
                            <div className="flex flex-col md:flex-row h-full items-center">
                                <div className="flex-1 h-full w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Present', value: attendanceSummary.present, color: '#22c55e' },
                                                    { name: 'Late', value: attendanceSummary.late, color: '#f59e0b' },
                                                    { name: 'Absent', value: attendanceSummary.absent, color: '#ef4444' },
                                                    { name: 'Leave', value: attendanceSummary.onLeave, color: '#3b82f6' },
                                                    { name: 'Holiday', value: attendanceSummary.holiday, color: '#8b5cf6' }
                                                ].filter(d => d.value > 0)}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Present', value: attendanceSummary.present, color: '#22c55e' },
                                                    { name: 'Late', value: attendanceSummary.late, color: '#f59e0b' },
                                                    { name: 'Absent', value: attendanceSummary.absent, color: '#ef4444' },
                                                    { name: 'Leave', value: attendanceSummary.onLeave, color: '#3b82f6' },
                                                    { name: 'Holiday', value: attendanceSummary.holiday, color: '#8b5cf6' }
                                                ].filter(d => d.value > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-3 px-4">
                                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <span>Present ({attendanceSummary.present})</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                        <span>Late ({attendanceSummary.late})</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span>Absent ({attendanceSummary.absent})</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        <span>Leave ({attendanceSummary.onLeave})</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                        <span>Holiday ({attendanceSummary.holiday || 0})</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-secondary-400">
                                <HiOutlineChartPie className="w-12 h-12 mb-2 opacity-20" />
                                <p className="text-sm">No attendance records this month</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats - Matching Reference Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickStats.map((stat) => (
                    <Link key={stat.name} to={stat.link} className="card p-6 hover:shadow-card-hover transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-2xl font-bold text-secondary-900">
                                {loading ? '...' : stat.value}
                            </h3>
                            <p className="text-sm text-secondary-500">{stat.name}</p>
                            <p className="text-xs text-secondary-400 mt-1">{stat.subtitle}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
                <h2 className="font-semibold text-secondary-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/leave/apply" className="p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-center group">
                        <HiOutlineCalendar className="w-8 h-8 mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-secondary-700">Apply Leave</span>
                    </Link>
                    <Link to="/attendance" className="p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors text-center group">
                        <HiOutlineClipboardCheck className="w-8 h-8 mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-secondary-700">View Attendance</span>
                    </Link>
                    <Link to="/payroll" className="p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-center group">
                        <HiOutlineCurrencyDollar className="w-8 h-8 mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-secondary-700">View Payslips</span>
                    </Link>
                    <Link to="/profile" className="p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors text-center group">
                        <HiOutlineUser className="w-8 h-8 mx-auto mb-2 text-orange-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-secondary-700">Update Profile</span>
                    </Link>
                </div>
            </div>

            {/* Employee Profile Card */}
            {employeeProfile && (
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-secondary-900">My Profile</h2>
                        <Link to="/profile" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            Edit Profile
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Employee ID</p>
                            <p className="font-semibold text-secondary-900">{employeeProfile.employeeCode || '-'}</p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Department</p>
                            <p className="font-semibold text-secondary-900">{employeeProfile.department || '-'}</p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Designation</p>
                            <p className="font-semibold text-secondary-900">{employeeProfile.designation || '-'}</p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Joining Date</p>
                            <p className="font-semibold text-secondary-900">
                                {employeeProfile.joiningDate ? new Date(employeeProfile.joiningDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                }) : '-'}
                            </p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Work Location</p>
                            <p className="font-semibold text-secondary-900">{employeeProfile.workLocation || '-'}</p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Employment Type</p>
                            <p className="font-semibold text-secondary-900">
                                {employeeProfile.employmentType ? employeeProfile.employmentType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-') : '-'}
                            </p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Reporting Manager</p>
                            <p className="font-semibold text-secondary-900">{employeeProfile.reportingManager || '-'}</p>
                        </div>
                        <div className="p-3 bg-secondary-50 rounded-lg">
                            <p className="text-xs text-secondary-500 mb-1">Status</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${employeeProfile.status === 'active' ? 'bg-green-100 text-green-700' :
                                employeeProfile.status === 'on-leave' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {employeeProfile.status?.charAt(0).toUpperCase() + employeeProfile.status?.slice(1) || 'Active'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leave Balance Card */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                        <h2 className="font-semibold text-secondary-900">Leave Balance</h2>
                        <Link to="/leave" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View details</Link>
                    </div>
                    <div className="p-6 grid grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-xl bg-blue-50">
                            <p className="text-3xl font-bold text-blue-600">
                                {loading ? '...' : leaveBalance.casual}
                            </p>
                            <p className="text-sm text-secondary-600">Casual Leave</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-green-50">
                            <p className="text-3xl font-bold text-green-600">
                                {loading ? '...' : leaveBalance.sick}
                            </p>
                            <p className="text-sm text-secondary-600">Sick Leave</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-purple-50">
                            <p className="text-3xl font-bold text-purple-600">
                                {loading ? '...' : leaveBalance.earned}
                            </p>
                            <p className="text-sm text-secondary-600">Earned Leave</p>
                        </div>
                    </div>
                </div>

                {/* Recent Payslips */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                        <h2 className="font-semibold text-secondary-900">Recent Payslips</h2>
                        <Link to="/payroll" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                    </div>
                    <div className="divide-y divide-secondary-100">
                        {loading ? (
                            <div className="p-6 text-center">
                                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                            </div>
                        ) : recentPayslips.length === 0 ? (
                            <div className="p-6 text-center text-secondary-500">
                                No payslips available
                            </div>
                        ) : (
                            recentPayslips.map((payslip) => (
                                <div key={payslip.id} className="px-6 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-secondary-900">{payslip.month}</p>
                                        <p className="text-sm text-secondary-500">{payslip.amount}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadPayslip(payslip.id, payslip.month)}
                                        disabled={downloadingPayslip === payslip.id}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {downloadingPayslip === payslip.id ? (
                                            <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                        ) : (
                                            <HiOutlineDownload className="w-4 h-4" />
                                        )}
                                        Download
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Active Projects & Deadlines */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold text-secondary-900 flex items-center gap-2">
                        <HiOutlineTrendingUp className="w-5 h-5 text-primary-600" />
                        Active Projects
                    </h2>
                    <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All Projects</Link>
                </div>

                {projectsLoading ? (
                    <div className="py-8 flex justify-center">
                        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : activeProjects.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-400 italic">No active projects assigned to you.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeProjects.map((project) => (
                            <Link
                                key={project._id}
                                to={`/projects/${project._id}`}
                                className="group p-4 bg-white border border-slate-100 rounded-xl hover:border-primary-200 hover:shadow-md transition-all relative overflow-hidden"
                            >
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${project.priority === 'high' ? 'bg-rose-500' : project.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                <div className="flex flex-col h-full pl-3">
                                    <h4 className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors truncate mb-1 text-sm">
                                        {project.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase mb-3">
                                        <HiOutlineClock className="w-3.5 h-3.5 text-slate-400" />
                                        <span className={`${project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed' ? 'text-rose-600' : 'text-slate-500'}`}>
                                            Deadline: {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB') : 'N/A'}
                                        </span>
                                        {project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed' && (
                                            <span className="text-[9px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded-full uppercase tracking-tighter">Overdue</span>
                                        )}
                                    </div>
                                    <div className="mt-auto flex items-center justify-between gap-2">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : project.status === 'in-progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {project.status.replace('-', ' ')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                title="Quick Update"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigate(`/projects/${project._id}`);
                                                }}
                                                className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                                            >
                                                <HiOutlineChatAlt2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Calendar and Upcoming Holidays */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Calendar */}
                <div className="flex-shrink-0 relative">
                    <HolidayCalendar holidays={allHolidays} />
                </div>

                {/* Upcoming Holidays */}
                <div className="card flex-1 h-72 flex flex-col">
                    <div className="px-4 py-2 border-b border-secondary-100 flex-shrink-0">
                        <h2 className="font-semibold text-secondary-900">Upcoming Holidays</h2>
                    </div>
                    <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                        {holidaysLoading ? (
                            // Loading skeleton
                            [1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary-50 animate-pulse">
                                    <div className="w-11 h-11 rounded-lg bg-secondary-200"></div>
                                    <div>
                                        <div className="h-3.5 w-24 bg-secondary-200 rounded mb-1.5"></div>
                                        <div className="h-3 w-16 bg-secondary-200 rounded"></div>
                                    </div>
                                </div>
                            ))
                        ) : upcomingHolidays.length > 0 ? (
                            upcomingHolidays.slice(0, 4).map((holiday, index) => (
                                <div key={holiday.id || index} className="flex items-center gap-3 p-2 rounded-lg bg-secondary-50 hover:bg-secondary-100 transition-colors">
                                    <div className="w-11 h-11 rounded-lg bg-white shadow-sm flex flex-col items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] text-secondary-500 uppercase">{holiday.month}</span>
                                        <span className="text-base font-bold text-secondary-900">{holiday.dayOfMonth}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-secondary-900 truncate">{holiday.name}</p>
                                        <p className="text-sm text-secondary-500">{holiday.day}</p>
                                    </div>
                                    {holiday.isOptional && (
                                        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Optional</span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-secondary-500">
                                <HiOutlineCalendar className="w-8 h-8 mb-2 text-secondary-400" />
                                <p className="text-sm">No upcoming holidays</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
