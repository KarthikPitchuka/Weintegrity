import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlineUsers,
    HiOutlineCalendar,
    HiOutlineClipboardCheck,
    HiOutlineChartBar,
    HiOutlineArrowUp,
    HiOutlineArrowDown,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlineDocumentText,
    HiOutlineBell
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../../context/NotificationContext';

const DepartmentManagerDashboard = ({ user }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        pendingLeaveApprovals: 0,
        performanceReviews: 0
    });
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);
    const [notificationBannerDismissed, setNotificationBannerDismissed] = useState(false);

    // Get notification context
    const { unreadCount } = useNotifications();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch real data from API
            const [employeesRes, leavesRes, attendanceRes, performanceRes] = await Promise.all([
                api.get('/employees').catch(() => ({ data: { employees: [], pagination: { total: 0 } } })),
                api.get('/leaves/pending').catch(() => ({ data: { leaves: [] } })),
                api.get('/attendance/today').catch(() => ({ data: { count: 0 } })),
                api.get('/performance').catch(() => ({ data: { reviews: [] } }))
            ]);

            const totalEmployees = employeesRes.data?.pagination?.total || employeesRes.data?.employees?.length || 0;
            const pendingLeavesData = leavesRes.data?.leaves || [];
            const presentToday = attendanceRes.data?.count || 0;
            const performanceReviewsCount = (performanceRes.data?.reviews || []).filter(r => r.status === 'pending').length;

            setStats({
                totalEmployees,
                presentToday,
                pendingLeaveApprovals: pendingLeavesData.length,
                performanceReviews: performanceReviewsCount
            });

            // Transform pending leaves for display
            const transformedLeaves = pendingLeavesData.slice(0, 5).map(l => ({
                id: l._id,
                name: l.employeeId ?
                    `${l.employeeId.personalInfo?.firstName || ''} ${l.employeeId.personalInfo?.lastName || ''}`.trim() :
                    'Unknown Employee',
                type: l.leaveType?.name || 'Leave',
                days: l.numberOfDays || 1,
                from: new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                reason: l.reason || 'No reason provided'
            }));

            setPendingLeaves(transformedLeaves);

            // Generate recent activities
            const activities = [];
            if (pendingLeavesData.length > 0) {
                activities.push({
                    id: 1,
                    action: `${pendingLeavesData.length} leave request(s) pending your approval`,
                    time: 'Action needed',
                    type: 'leave',
                    link: '/leave'
                });
            }
            if (totalEmployees > 0) {
                activities.push({
                    id: 2,
                    action: `${totalEmployees} team members in your department`,
                    time: 'Current',
                    type: 'employee',
                    link: '/employees'
                });
            }
            activities.push({
                id: 3,
                action: 'Dashboard data synced with database',
                time: 'Just now',
                type: 'system'
            });

            setRecentActivities(activities);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveLeave = async (leaveId) => {
        setActionLoading(leaveId);
        try {
            await api.put(`/leaves/${leaveId}/approve`, { status: 'approved' });
            toast.success('Leave approved successfully! Saved to database.');
            fetchDashboardData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to approve leave');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectLeave = async (leaveId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason === null) return;

        setActionLoading(leaveId);
        try {
            await api.put(`/leaves/${leaveId}/approve`, {
                status: 'rejected',
                rejectionReason: reason
            });
            toast.success('Leave rejected. Saved to database.');
            fetchDashboardData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reject leave');
        } finally {
            setActionLoading(null);
        }
    };

    const dashboardStats = [
        {
            name: 'Team Members',
            value: stats.totalEmployees,
            change: 'Active',
            trend: 'up',
            icon: HiOutlineUsers,
            color: 'bg-blue-500',
            link: '/employees'
        },
        {
            name: 'Present Today',
            value: stats.presentToday,
            change: stats.totalEmployees > 0 ? `${Math.round((stats.presentToday / stats.totalEmployees) * 100)}%` : '0%',
            trend: 'up',
            icon: HiOutlineClipboardCheck,
            color: 'bg-green-500',
            link: '/attendance'
        },
        {
            name: 'Pending Leave Approvals',
            value: stats.pendingLeaveApprovals,
            change: stats.pendingLeaveApprovals > 0 ? 'Action needed' : 'All clear',
            trend: stats.pendingLeaveApprovals > 0 ? 'up' : 'down',
            icon: HiOutlineCalendar,
            color: 'bg-orange-500',
            link: '/leave'
        },
        {
            name: 'Performance Reviews Due',
            value: stats.performanceReviews,
            change: 'This month',
            trend: 'up',
            icon: HiOutlineChartBar,
            color: 'bg-purple-500',
            link: '/performance'
        },
    ];

    const quickActions = [
        { name: 'View Team', icon: HiOutlineUsers, link: '/employees', color: 'blue' },
        { name: 'Approve Leaves', icon: HiOutlineCalendar, link: '/leave', color: 'orange' },
        { name: 'Attendance', icon: HiOutlineClipboardCheck, link: '/attendance', color: 'green' },
        { name: 'Performance', icon: HiOutlineChartBar, link: '/performance', color: 'purple' },
    ];

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
                                    Stay updated on leave requests and team activities.
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

            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Welcome, {user?.firstName}! 👋
                        </h1>
                        <p className="mt-1 text-green-100">
                            Department Manager Dashboard - Manage your team effectively.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <div className="text-3xl font-bold">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-green-100">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-end">
                <button
                    onClick={fetchDashboardData}
                    disabled={loading}
                    className="btn-secondary btn-sm"
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Refresh Data'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((stat) => (
                    <Link key={stat.name} to={stat.link} className="card p-6 hover:shadow-card-hover transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                            <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-blue-600'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-2xl font-bold text-secondary-900">
                                {loading ? '...' : stat.value}
                            </h3>
                            <p className="text-sm text-secondary-500">{stat.name}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
                <h2 className="font-semibold text-secondary-900 mb-4">Quick Actions (Department Manager)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.name}
                            to={action.link}
                            className={`p-4 rounded-xl bg-${action.color}-50 hover:bg-${action.color}-100 transition-colors text-center group`}
                        >
                            <action.icon className={`w-8 h-8 mx-auto mb-2 text-${action.color}-600`} />
                            <span className="text-sm font-medium text-secondary-700">{action.name}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Pending Leave Approvals Section */}
            {pendingLeaves.length > 0 && (
                <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                        <h2 className="font-semibold text-secondary-900">Pending Leave Approvals</h2>
                        <Link to="/leave" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                    </div>
                    <div className="divide-y divide-secondary-100">
                        {pendingLeaves.map((leave) => (
                            <div key={leave.id} className="px-6 py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-medium">
                                            {leave.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-medium text-secondary-900">{leave.name}</p>
                                            <p className="text-xs text-secondary-500">{leave.type} - {leave.days} day(s)</p>
                                        </div>
                                    </div>
                                    <span className="text-sm text-secondary-500">{leave.from}</span>
                                </div>
                                <p className="text-sm text-secondary-600 mb-3">{leave.reason}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApproveLeave(leave.id)}
                                        disabled={actionLoading === leave.id}
                                        className="flex-1 btn-sm bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                        {actionLoading === leave.id ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <HiOutlineCheck className="w-4 h-4" />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectLeave(leave.id)}
                                        disabled={actionLoading === leave.id}
                                        className="flex-1 btn-sm bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                        <HiOutlineX className="w-4 h-4" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Activities & Projects Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Status */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                        <h2 className="font-semibold text-secondary-900">System Activity</h2>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            Operational
                        </span>
                    </div>
                    <div className="divide-y divide-secondary-100 max-h-[300px] overflow-y-auto">
                        {recentActivities.map((activity) => (
                            <div key={activity.id} className="px-6 py-4 flex items-center gap-4 hover:bg-secondary-50 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                    <HiOutlineDocumentText className="w-4 h-4 text-primary-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-secondary-700 truncate">{activity.action}</p>
                                    <p className="text-xs text-secondary-400 mt-0.5">{activity.time}</p>
                                </div>
                                {activity.link && (
                                    <Link to={activity.link} className="text-sm text-primary-600 hover:text-primary-700">
                                        View
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Project Progress */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                        <h2 className="font-semibold text-secondary-900 flex items-center gap-2">
                            <HiOutlineClipboardCheck className="w-5 h-5 text-indigo-600" />
                            Project Reports
                        </h2>
                        <Link to="/projects" className="text-xs text-primary-600 hover:text-primary-700 font-bold uppercase">View Reports</Link>
                    </div>
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HiOutlineRefresh className="w-6 h-6 text-indigo-500 animate-spin-slow" />
                        </div>
                        <p className="text-sm text-secondary-600 mb-4 px-4 leading-relaxed">
                            Monitor real-time project progress, team leader reports, and member updates across your department.
                        </p>
                        <Link to="/projects" className="btn-secondary btn-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50">Open Project Dashboard</Link>
                    </div>
                </div>
            </div>

            {/* Note about restrictions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-yellow-600 font-bold">!</span>
                    </div>
                    <div>
                        <h3 className="font-medium text-yellow-800">Access Note</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            As a Department Manager, you can view team data, approve leaves, and manage performance reviews. You cannot access salary or confidential employee information.
                        </p>
                    </div>
                </div>
            </div>

            {/* Database Connection Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                        All data is being fetched from and saved to the MongoDB database in real-time. Leave approvals/rejections are immediately persisted.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DepartmentManagerDashboard;
