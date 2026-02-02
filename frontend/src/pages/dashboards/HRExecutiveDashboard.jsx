import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlineUsers,
    HiOutlineClipboardCheck,
    HiOutlineCalendar,
    HiOutlineBriefcase,
    HiOutlineDocumentAdd,
    HiOutlineUserAdd,
    HiOutlineArrowUp,
    HiOutlineDocumentText,
    HiOutlineRefresh,
    HiOutlineBell,
    HiOutlineX
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../../context/NotificationContext';

const HRExecutiveDashboard = ({ user }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        openPositions: 0,
        totalEmployees: 0,
        newJoiners: 0,
        pendingLeaves: 0
    });
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
            const [recruitmentRes, employeesRes, leavesRes, attendanceRes] = await Promise.all([
                api.get('/recruitment').catch(() => ({ data: { data: [] } })),
                api.get('/employees').catch(() => ({ data: { employees: [], pagination: { total: 0 } } })),
                api.get('/leaves/pending').catch(() => ({ data: { leaves: [], pagination: { total: 0 } } })),
                api.get('/attendance/today').catch(() => ({ data: { count: 0 } }))
            ]);

            const openPositions = recruitmentRes.data?.data?.filter(r => r.status === 'open')?.length || 0;
            const totalEmployees = employeesRes.data?.pagination?.total || employeesRes.data?.employees?.length || 0;
            const pendingLeaves = leavesRes.data?.pagination?.total || leavesRes.data?.leaves?.length || 0;

            // Calculate new joiners - employees created in the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const newJoiners = (employeesRes.data?.employees || []).filter(emp => {
                const joinDate = new Date(emp.employment?.joiningDate || emp.createdAt);
                return joinDate >= sevenDaysAgo;
            }).length;

            setStats({
                openPositions,
                totalEmployees,
                newJoiners,
                pendingLeaves
            });

            // Generate recent activities based on fetched data
            const activities = [];
            if (openPositions > 0) {
                activities.push({
                    id: 1,
                    action: `${openPositions} open position(s) available for recruitment`,
                    time: 'Active',
                    type: 'recruitment',
                    link: '/recruitment'
                });
            }
            if (pendingLeaves > 0) {
                activities.push({
                    id: 2,
                    action: `${pendingLeaves} leave request(s) pending review`,
                    time: 'Needs attention',
                    type: 'leave',
                    link: '/leave'
                });
            }
            if (totalEmployees > 0) {
                activities.push({
                    id: 3,
                    action: `${totalEmployees} employees in the organization`,
                    time: 'Current',
                    type: 'employee',
                    link: '/employees'
                });
            }
            activities.push({
                id: 4,
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

    const dashboardStats = [
        {
            name: 'Open Positions',
            value: stats.openPositions,
            change: 'Active',
            trend: 'up',
            icon: HiOutlineBriefcase,
            color: 'bg-blue-500',
            link: '/recruitment'
        },
        {
            name: 'Total Employees',
            value: stats.totalEmployees,
            change: 'Organization',
            trend: 'up',
            icon: HiOutlineUsers,
            color: 'bg-green-500',
            link: '/employees'
        },
        {
            name: 'New Joiners (This Week)',
            value: stats.newJoiners,
            change: 'Recent',
            trend: 'up',
            icon: HiOutlineUserAdd,
            color: 'bg-purple-500',
            link: '/employees'
        },
        {
            name: 'Pending Leaves',
            value: stats.pendingLeaves,
            change: stats.pendingLeaves > 0 ? 'Review needed' : 'All clear',
            trend: stats.pendingLeaves > 0 ? 'up' : 'down',
            icon: HiOutlineCalendar,
            color: 'bg-orange-500',
            link: '/leave'
        },
    ];

    const quickActions = [
        { name: 'Add Employee', icon: HiOutlineUserAdd, link: '/employees/add', color: 'green' },
        { name: 'View Recruitment', icon: HiOutlineBriefcase, link: '/recruitment', color: 'blue' },
        { name: 'Mark Attendance', icon: HiOutlineClipboardCheck, link: '/attendance', color: 'orange' },
        { name: 'Apply Leave', icon: HiOutlineCalendar, link: '/leave/apply', color: 'purple' },
        { name: 'Manage Training', icon: HiOutlineDocumentAdd, link: '/training', color: 'cyan' },
        { name: 'Documents', icon: HiOutlineDocumentText, link: '/documents', color: 'pink' },
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
                                    Stay updated on leave requests and other HR activities.
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
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Welcome, {user?.firstName}! 👋
                        </h1>
                        <p className="mt-1 text-blue-100">
                            HR Executive Dashboard - Recruitment & Onboarding tasks.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <div className="text-3xl font-bold">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-blue-100">
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
                            <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-blue-600'} flex items-center gap-1`}>
                                <HiOutlineArrowUp className="w-4 h-4" />
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
                <h2 className="font-semibold text-secondary-900 mb-4">Quick Actions (HR Executive)</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

            {/* Status & Projects Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
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
                                <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                                    <HiOutlineDocumentText className="w-4 h-4 text-primary-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-secondary-700 truncate">{activity.action}</p>
                                    <p className="text-xs text-secondary-400 mt-0.5">{activity.time}</p>
                                </div>
                                {activity.link && (
                                    <Link to={activity.link} className="text-xs text-primary-600 hover:text-primary-700">
                                        View
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Project Pipeline */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                        <h2 className="font-semibold text-secondary-900 flex items-center gap-2">
                            <HiOutlineBriefcase className="w-5 h-5 text-blue-600" />
                            Project Pipeline
                        </h2>
                        <Link to="/projects" className="text-xs text-primary-600 hover:text-primary-700 font-bold uppercase tracking-wider">Reports</Link>
                    </div>
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HiOutlineClock className="w-6 h-6 text-blue-500 animate-pulse" />
                        </div>
                        <p className="text-sm text-secondary-600 mb-4 px-4">
                            You can monitor real-time project updates and team member progress in the Project Management section.
                        </p>
                        <Link to="/projects" className="btn-primary btn-sm">Access Project Portal</Link>
                    </div>
                </div>
            </div>

            {/* Access Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <HiOutlineDocumentText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-blue-800">HR Executive Access</h3>
                        <p className="text-sm text-blue-700 mt-1">
                            You can manage recruitment, add employees, onboard new joiners, and handle daily HR tasks. All changes are saved to the database.
                        </p>
                    </div>
                </div>
            </div>

            {/* Database Connection Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                        All data is being fetched from and saved to the MongoDB database in real-time.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default HRExecutiveDashboard;
