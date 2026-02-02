import { useState, useEffect } from 'react';
import {
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineDownload,
    HiOutlineEye,
    HiOutlineShieldCheck,
    HiOutlineClock,
    HiOutlineUser,
    HiOutlineExclamation,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineChartBar,
    HiOutlineDocumentReport
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AuditTrail = () => {
    const [logs, setLogs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('logs');
    const [filters, setFilters] = useState({
        action: '',
        module: '',
        severity: '',
        startDate: '',
        endDate: ''
    });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [showDetails, setShowDetails] = useState(null);

    const modules = ['auth', 'employees', 'attendance', 'leave', 'payroll', 'performance', 'recruitment', 'training', 'documents', 'settings', 'organization'];
    const severities = ['info', 'warning', 'critical'];
    const actions = ['create', 'update', 'delete', 'login', 'logout', 'login-failed', 'export', 'approve', 'reject'];

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
        } else {
            fetchAnalytics();
        }
    }, [activeTab, filters.action, filters.module, filters.severity, pagination.page]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = { page: pagination.page, limit: 50 };
            if (filters.action) params.action = filters.action;
            if (filters.module) params.module = filters.module;
            if (filters.severity) params.severity = filters.severity;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const res = await api.get('/audit', { params });
            setLogs(res.data.logs || []);
            setPagination(prev => ({ ...prev, pages: res.data.pages, total: res.data.total }));
        } catch (error) {
            toast.error('Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await api.get('/audit/analytics', { params: { days: 30 } });
            setAnalytics(res.data);
        } catch (error) {
            toast.error('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    const exportLogs = async () => {
        try {
            const res = await api.get('/audit/export', {
                params: { format: 'csv', ...filters },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Export downloaded');
        } catch (error) {
            toast.error('Export failed');
        }
    };

    const getSeverityBadge = (severity) => {
        const badges = {
            info: 'bg-blue-100 text-blue-700',
            warning: 'bg-yellow-100 text-yellow-700',
            critical: 'bg-red-100 text-red-700'
        };
        return badges[severity] || badges.info;
    };

    const getStatusIcon = (status) => {
        if (status === 'success') return <HiOutlineCheckCircle className="w-5 h-5 text-green-500" />;
        if (status === 'failure') return <HiOutlineXCircle className="w-5 h-5 text-red-500" />;
        return <HiOutlineExclamation className="w-5 h-5 text-yellow-500" />;
    };

    const getActionColor = (action) => {
        if (action?.includes('create')) return 'text-green-600';
        if (action?.includes('delete')) return 'text-red-600';
        if (action?.includes('update')) return 'text-blue-600';
        if (action?.includes('login')) return 'text-purple-600';
        return 'text-secondary-600';
    };

    const formatTimestamp = (ts) => {
        const date = new Date(ts);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Audit Trail</h1>
                    <p className="text-secondary-500 mt-1">Track all system activities</p>
                </div>
                <button onClick={exportLogs} className="btn-secondary">
                    <HiOutlineDownload className="w-5 h-5" />
                    Export Logs
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-secondary-200">
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'logs'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-700'
                        }`}
                >
                    <HiOutlineDocumentReport className="w-5 h-5 inline mr-2" />
                    Activity Logs
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'analytics'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-700'
                        }`}
                >
                    <HiOutlineChartBar className="w-5 h-5 inline mr-2" />
                    Analytics
                </button>
                <button
                    onClick={() => {
                        api.get('/audit/security').then(res => {
                            setLogs(res.data);
                            setActiveTab('security');
                        });
                    }}
                    className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'security'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-700'
                        }`}
                >
                    <HiOutlineShieldCheck className="w-5 h-5 inline mr-2" />
                    Security Events
                </button>
            </div>

            {/* Logs View */}
            {activeTab === 'logs' && (
                <>
                    {/* Filters */}
                    <div className="card p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <select
                                value={filters.module}
                                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                                className="input w-auto"
                            >
                                <option value="">All Modules</option>
                                {modules.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                            </select>
                            <select
                                value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                className="input w-auto"
                            >
                                <option value="">All Actions</option>
                                {actions.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1).replace('-', ' ')}</option>)}
                            </select>
                            <select
                                value={filters.severity}
                                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                                className="input w-auto"
                            >
                                <option value="">All Severities</option>
                                {severities.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="input w-auto"
                                placeholder="Start Date"
                            />
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="input w-auto"
                                placeholder="End Date"
                            />
                            <button onClick={fetchLogs} className="btn-primary">
                                <HiOutlineFilter className="w-5 h-5" />
                                Apply
                            </button>
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Timestamp</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Action</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Entity</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">User</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Module</th>
                                        <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">Status</th>
                                        <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">Severity</th>
                                        <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={8} className="p-8 text-center">Loading...</td></tr>
                                    ) : logs.length === 0 ? (
                                        <tr><td colSpan={8} className="p-8 text-center text-secondary-500">No logs found</td></tr>
                                    ) : (
                                        logs.map(log => (
                                            <tr key={log._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <HiOutlineClock className="w-4 h-4 text-secondary-400" />
                                                        {formatTimestamp(log.timestamp)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-medium ${getActionColor(log.action)}`}>
                                                        {log.action?.replace('-', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-secondary-900">{log.entity?.name || '-'}</p>
                                                        <p className="text-xs text-secondary-500">{log.entity?.type}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <HiOutlineUser className="w-4 h-4 text-secondary-400" />
                                                        <div>
                                                            <p className="text-sm font-medium">{log.performedBy?.name || 'System'}</p>
                                                            <p className="text-xs text-secondary-500">{log.performedBy?.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 capitalize">{log.module}</td>
                                                <td className="px-4 py-3 text-center">{getStatusIcon(log.status)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(log.severity)}`}>
                                                        {log.severity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setShowDetails(log)}
                                                        className="p-2 hover:bg-primary-50 rounded-lg text-secondary-500 hover:text-primary-600"
                                                    >
                                                        <HiOutlineEye className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-secondary-200 flex items-center justify-between">
                            <p className="text-sm text-secondary-500">
                                Showing {logs.length} of {pagination.total} logs
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page <= 1}
                                    className="btn-secondary btn-sm"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-sm">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page >= pagination.pages}
                                    className="btn-secondary btn-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Analytics View */}
            {activeTab === 'analytics' && analytics && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                            <p className="text-3xl font-bold">{analytics.summary?.totalEvents?.toLocaleString()}</p>
                            <p className="text-primary-100">Total Events (30 days)</p>
                        </div>
                        <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
                            <p className="text-3xl font-bold">{analytics.summary?.failedLogins}</p>
                            <p className="text-red-100">Failed Login Attempts</p>
                        </div>
                        <div className="card p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <p className="text-3xl font-bold">{analytics.summary?.criticalEvents}</p>
                            <p className="text-orange-100">Critical Events</p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Module Breakdown */}
                        <div className="card p-6">
                            <h3 className="font-semibold text-secondary-900 mb-4">Activity by Module</h3>
                            <div className="space-y-3">
                                {analytics.moduleStats?.map(stat => (
                                    <div key={stat._id} className="flex items-center gap-3">
                                        <span className="w-24 text-sm text-secondary-700 capitalize truncate">{stat._id}</span>
                                        <div className="flex-1 h-4 bg-secondary-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500"
                                                style={{ width: `${(stat.count / (analytics.summary?.totalEvents || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-secondary-900 w-16 text-right">{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Actions */}
                        <div className="card p-6">
                            <h3 className="font-semibold text-secondary-900 mb-4">Top Actions</h3>
                            <div className="space-y-3">
                                {analytics.actionStats?.map(stat => (
                                    <div key={stat._id} className="flex items-center gap-3">
                                        <span className={`w-24 text-sm truncate ${getActionColor(stat._id)}`}>
                                            {stat._id?.replace('-', ' ')}
                                        </span>
                                        <div className="flex-1 h-4 bg-secondary-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{ width: `${(stat.count / (analytics.actionStats?.[0]?.count || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-secondary-900 w-16 text-right">{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Daily Activity */}
                        <div className="card p-6 md:col-span-2">
                            <h3 className="font-semibold text-secondary-900 mb-4">Daily Activity</h3>
                            <div className="flex items-end gap-1 h-40">
                                {analytics.dailyStats?.map(stat => {
                                    const maxCount = Math.max(...analytics.dailyStats.map(s => s.count));
                                    const height = (stat.count / maxCount) * 100;
                                    return (
                                        <div key={stat._id} className="flex-1 flex flex-col items-center group">
                                            <div
                                                className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                                                style={{ height: `${height}%` }}
                                                title={`${stat._id}: ${stat.count} events`}
                                            />
                                            <p className="text-xs text-secondary-500 mt-1 transform -rotate-45 origin-left">
                                                {stat._id?.slice(5)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Most Active Users */}
                        <div className="card p-6 md:col-span-2">
                            <h3 className="font-semibold text-secondary-900 mb-4">Most Active Users</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {analytics.topUsers?.slice(0, 10).map((user, i) => (
                                    <div key={user._id || i} className="p-3 bg-secondary-50 rounded-xl text-center">
                                        <div className="w-10 h-10 mx-auto bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold mb-2">
                                            {user.name?.charAt(0) || '?'}
                                        </div>
                                        <p className="font-medium text-secondary-900 truncate">{user.name || 'Unknown'}</p>
                                        <p className="text-sm text-secondary-500">{user.count} actions</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Events View */}
            {activeTab === 'security' && (
                <div className="card overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-100">
                        <h3 className="font-semibold text-red-800 flex items-center gap-2">
                            <HiOutlineShieldCheck className="w-5 h-5" />
                            Security Events (Last 7 Days)
                        </h3>
                    </div>
                    <div className="divide-y divide-secondary-100">
                        {logs.map(log => (
                            <div key={log._id} className="p-4 flex items-center gap-4 hover:bg-secondary-50">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.action === 'login-failed' ? 'bg-red-100 text-red-600' :
                                        log.action === 'login' ? 'bg-green-100 text-green-600' :
                                            'bg-blue-100 text-blue-600'
                                    }`}>
                                    {getStatusIcon(log.status)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-secondary-900">
                                        {log.action?.replace('-', ' ')}
                                    </p>
                                    <p className="text-sm text-secondary-500">
                                        {log.performedBy?.email} • {formatTimestamp(log.timestamp)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-secondary-500">{log.performedBy?.ipAddress}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
                        <div className="flex items-start justify-between mb-6">
                            <h2 className="text-xl font-bold text-secondary-900">Event Details</h2>
                            <button onClick={() => setShowDetails(null)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <HiOutlineXCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-secondary-500">Timestamp</label>
                                    <p className="font-medium">{formatTimestamp(showDetails.timestamp)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">Action</label>
                                    <p className={`font-medium ${getActionColor(showDetails.action)}`}>
                                        {showDetails.action?.replace('-', ' ')}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">User</label>
                                    <p className="font-medium">{showDetails.performedBy?.name}</p>
                                    <p className="text-sm text-secondary-500">{showDetails.performedBy?.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">IP Address</label>
                                    <p className="font-medium font-mono">{showDetails.performedBy?.ipAddress || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-secondary-500">Entity</label>
                                <div className="p-3 bg-secondary-50 rounded-lg mt-1">
                                    <p className="font-medium">{showDetails.entity?.name}</p>
                                    <p className="text-sm text-secondary-500">{showDetails.entity?.type} • {showDetails.entity?.id}</p>
                                </div>
                            </div>

                            {showDetails.changes?.summary && (
                                <div>
                                    <label className="text-sm text-secondary-500">Changes</label>
                                    <p className="mt-1">{showDetails.changes.summary}</p>
                                    {showDetails.changes.fieldsChanged?.length > 0 && (
                                        <p className="text-sm text-secondary-500 mt-1">
                                            Fields: {showDetails.changes.fieldsChanged.join(', ')}
                                        </p>
                                    )}
                                </div>
                            )}

                            {showDetails.errorMessage && (
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <label className="text-sm text-red-600">Error</label>
                                    <p className="text-red-700">{showDetails.errorMessage}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditTrail;
