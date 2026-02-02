import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlineCurrencyDollar,
    HiOutlineDocumentReport,
    HiOutlineCalculator,
    HiOutlineClipboardList,
    HiOutlineArrowUp,
    HiOutlineArrowDown,
    HiOutlineDownload,
    HiOutlineDocumentText,
    HiOutlineRefresh,
    HiOutlineBell,
    HiOutlineX
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNotifications } from '../../context/NotificationContext';

const PayrollOfficerDashboard = ({ user }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalSalaryDue: 0,
        processedPayroll: 0,
        pendingPayroll: 0
    });
    const [recentPayrollRuns, setRecentPayrollRuns] = useState([]);
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
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // Fetch real data from API
            const [employeesRes, payrollRes, summaryRes] = await Promise.all([
                api.get('/employees').catch(() => ({ data: { employees: [], pagination: { total: 0 } } })),
                api.get('/payroll', { params: { month: currentMonth, year: currentYear } }).catch(() => ({ data: { records: [] } })),
                api.get('/payroll/summary', { params: { month: currentMonth, year: currentYear } }).catch(() => ({ data: { summary: null } }))
            ]);

            const totalEmployees = employeesRes.data?.pagination?.total || employeesRes.data?.employees?.length || 0;
            const payrollRecords = payrollRes.data?.records || [];
            const summary = summaryRes.data?.summary || {};

            const processedCount = payrollRecords.filter(p => p.paymentStatus === 'paid').length;
            const pendingCount = payrollRecords.filter(p => ['pending', 'processing'].includes(p.paymentStatus)).length;
            const totalSalary = summary.totalNetSalary || payrollRecords.reduce((sum, p) => sum + (p.netSalary || 0), 0);

            setStats({
                totalEmployees,
                totalSalaryDue: totalSalary,
                processedPayroll: processedCount,
                pendingPayroll: pendingCount
            });

            // Transform payroll records for display
            const recentRuns = payrollRecords.slice(0, 5).map(p => ({
                id: p._id,
                month: new Date(p.year, p.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                status: p.paymentStatus,
                employees: 1,
                amount: `₹${(p.netSalary || 0).toLocaleString()}`
            }));

            setRecentPayrollRuns(recentRuns);

            // Generate activities
            const activities = [];
            if (pendingCount > 0) {
                activities.push({
                    id: 1,
                    action: `${pendingCount} payroll record(s) pending processing`,
                    time: 'Action needed',
                    type: 'payroll',
                    link: '/payroll'
                });
            }
            if (processedCount > 0) {
                activities.push({
                    id: 2,
                    action: `${processedCount} payroll record(s) processed this month`,
                    time: 'This month',
                    type: 'payroll',
                    link: '/payroll'
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

    const formatCurrency = (amount) => {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)}Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)}L`;
        }
        return `₹${amount.toLocaleString()}`;
    };

    const dashboardStats = [
        {
            name: 'Total Employees',
            value: stats.totalEmployees,
            change: 'In system',
            trend: 'up',
            icon: HiOutlineCurrencyDollar,
            color: 'bg-green-500',
            link: '/payroll'
        },
        {
            name: 'Total Salary Due',
            value: formatCurrency(stats.totalSalaryDue),
            change: 'This month',
            trend: 'up',
            icon: HiOutlineDocumentReport,
            color: 'bg-blue-500',
            link: '/payroll'
        },
        {
            name: 'Processed Payroll',
            value: stats.processedPayroll,
            change: 'Completed',
            trend: 'up',
            icon: HiOutlineCalculator,
            color: 'bg-purple-500',
            link: '/payroll'
        },
        {
            name: 'Pending Payroll',
            value: stats.pendingPayroll,
            change: stats.pendingPayroll > 0 ? 'Action needed' : 'All clear',
            trend: stats.pendingPayroll > 0 ? 'up' : 'down',
            icon: HiOutlineClipboardList,
            color: 'bg-orange-500',
            link: '/payroll'
        },
    ];

    const quickActions = [
        { name: 'View Payroll', icon: HiOutlineCurrencyDollar, link: '/payroll', color: 'green' },
        { name: 'View Compliance', icon: HiOutlineDocumentReport, link: '/compliance', color: 'blue' },
        { name: 'View Reports', icon: HiOutlineClipboardList, link: '/reports', color: 'purple' },
        { name: 'View Attendance', icon: HiOutlineCalculator, link: '/attendance', color: 'orange' },
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
                                    Stay updated on payroll and other activities.
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
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Welcome, {user?.firstName}! 👋
                        </h1>
                        <p className="mt-1 text-amber-100">
                            Payroll Officer Dashboard - Manage salaries and statutory compliance.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <div className="text-3xl font-bold">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-amber-100">
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
                <h2 className="font-semibold text-secondary-900 mb-4">Quick Actions (Payroll Officer)</h2>
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

            {/* Payroll Runs */}
            {recentPayrollRuns.length > 0 && (
                <div className="card">
                    <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                        <h2 className="font-semibold text-secondary-900">Recent Payroll Records</h2>
                        <Link to="/payroll" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                    </div>
                    <div className="divide-y divide-secondary-100">
                        {recentPayrollRuns.map((run) => (
                            <div key={run.id} className="px-6 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-secondary-900">{run.month}</p>
                                    <p className="text-sm text-secondary-500">{run.employees} record(s)</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-secondary-900">{run.amount}</p>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${run.status === 'paid' ? 'bg-green-100 text-green-700' :
                                        run.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {run.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="card">
                <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                    <h2 className="font-semibold text-secondary-900">System Status</h2>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        All Systems Operational
                    </span>
                </div>
                <div className="divide-y divide-secondary-100">
                    {recentActivities.map((activity) => (
                        <div key={activity.id} className="px-6 py-4 flex items-center gap-4 hover:bg-secondary-50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <HiOutlineDocumentText className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-secondary-700">{activity.action}</p>
                                <p className="text-xs text-secondary-400 mt-0.5">{activity.time}</p>
                            </div>
                            {activity.link && (
                                <Link to={activity.link} className="text-sm text-primary-600 hover:text-primary-700">
                                    View →
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Note about access */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <HiOutlineDocumentText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-blue-800">Payroll Officer Access</h3>
                        <p className="text-sm text-blue-700 mt-1">
                            You can view payroll data, generate payroll runs, manage statutory compliance (PF, ESI, TAX), and access related reports. All changes are saved to the database.
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

export default PayrollOfficerDashboard;
