import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlinePlus,
    HiOutlineFilter,
    HiOutlineCalendar,
    HiOutlineRefresh,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineClipboardList
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { canPerform } from '../../utils/permissions';
import api from '../../services/api';
import toast from 'react-hot-toast';

const LeaveList = () => {
    const { user } = useAuth();
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [userGender, setUserGender] = useState(null);

    // Check if user can approve leaves (HR Manager, HR Executive, etc.)
    const canApproveLeaves = canPerform(user?.role, 'leaves', 'approve');
    const isHRRole = ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager'].includes(user?.role);

    // Default leave quotas - these are the official fixed quotas with gender info
    const defaultLeaveQuotas = [
        { type: 'Casual Leave', code: 'CL', total: 12, color: 'bg-blue-500', dotColor: 'bg-blue-400', gender: 'all' },
        { type: 'Sick Leave', code: 'SL', total: 10, color: 'bg-green-500', dotColor: 'bg-green-400', gender: 'all' },
        { type: 'Earned Leave', code: 'EL', total: 15, color: 'bg-purple-500', dotColor: 'bg-purple-400', gender: 'all' },
        { type: 'Comp Off', code: 'CO', total: 5, color: 'bg-orange-500', dotColor: 'bg-orange-400', gender: 'all' },
        { type: 'Maternity Leave', code: 'ML', total: 180, color: 'bg-pink-500', dotColor: 'bg-pink-400', gender: 'female' },
        { type: 'Paternity Leave', code: 'PL', total: 15, color: 'bg-cyan-500', dotColor: 'bg-cyan-400', gender: 'male' },
    ];

    useEffect(() => {
        fetchLeaveData();
    }, []);

    const fetchLeaveData = async () => {
        setLoading(true);
        try {
            const [balanceRes, leavesRes] = await Promise.all([
                api.get('/leaves/balance').catch(() => ({ data: { balances: [], userGender: null } })),
                // Fetch all leaves for all users (API will filter based on role)
                api.get('/leaves').catch(() => ({ data: { leaves: [] } }))
            ]);

            // Get user gender from the response
            const gender = balanceRes.data?.userGender || user?.employeeId?.personalInfo?.gender || null;
            setUserGender(gender);

            // Filter default quotas based on gender
            const genderFilteredQuotas = defaultLeaveQuotas.filter(leave => {
                if (!gender) return true; // Show all if no gender info
                if (leave.gender === 'all') return true;
                return leave.gender === gender;
            });

            // Transform balance data for display, using filtered quotas
            const balances = balanceRes.data?.balances || [];
            const transformedBalances = genderFilteredQuotas.map(defaultLeave => {
                const balanceFromServer = balances.find(b =>
                    b.leaveType?.code === defaultLeave.code ||
                    b.leaveType?.name === defaultLeave.type
                );

                return {
                    type: defaultLeave.type,
                    code: defaultLeave.code,
                    total: balanceFromServer?.quota || defaultLeave.total,
                    used: balanceFromServer?.used || 0,
                    available: balanceFromServer?.available ?? defaultLeave.total,
                    color: defaultLeave.color,
                    dotColor: defaultLeave.dotColor
                };
            });

            setLeaveBalance(transformedBalances);

            // Transform leave requests
            const leaves = leavesRes.data?.leaves || [];
            const transformedLeaves = leaves.map(l => ({
                id: l._id,
                type: l.leaveType?.name || 'Leave',
                from: l.startDate,
                to: l.endDate,
                days: l.numberOfDays || 1,
                reason: l.reason,
                status: l.status,
                appliedOn: l.appliedOn || l.createdAt,
                // Use applicantName from backend (which tries Employee first, then User)
                employeeName: l.applicantName ||
                    (l.employeeId?.personalInfo?.firstName
                        ? `${l.employeeId.personalInfo.firstName} ${l.employeeId.personalInfo.lastName || ''}`.trim()
                        : (l.userId?.name || l.userId?.firstName
                            ? `${l.userId.firstName || ''} ${l.userId.lastName || ''}`.trim() || l.userId.name
                            : 'Unknown')),
                employeeCode: l.applicantCode || l.employeeId?.employeeCode || ''
            }));

            setLeaveRequests(transformedLeaves);
        } catch (error) {
            console.error('Error fetching leave data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="badge-success">Approved</span>;
            case 'pending':
                return <span className="badge-warning">Pending</span>;
            case 'rejected':
                return <span className="badge-danger">Rejected</span>;
            case 'cancelled':
                return <span className="badge-gray">Cancelled</span>;
            default:
                return <span className="badge-gray">{status}</span>;
        }
    };

    const filteredLeaves = filter === 'all'
        ? leaveRequests
        : leaveRequests.filter(l => l.status === filter);

    const handleCancel = async (id) => {
        try {
            await api.put(`/leaves/${id}/cancel`, { reason: 'Cancelled by user' });
            toast.success('Leave request cancelled! Updated in database.');
            fetchLeaveData(); // Refresh data
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to cancel leave');
        }
    };

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await api.put(`/leaves/${id}/approve`, { status: 'approved' });
            toast.success('Leave approved successfully! Leave balance updated.');
            fetchLeaveData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to approve leave');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason === null) return; // User cancelled

        setActionLoading(id);
        try {
            await api.put(`/leaves/${id}/approve`, {
                status: 'rejected',
                rejectionReason: reason
            });
            toast.success('Leave rejected.');
            fetchLeaveData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reject leave');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Leave Management</h1>
                    <p className="text-secondary-500 mt-1">
                        {isHRRole ? 'Manage and approve leave requests' : 'Apply and manage your leaves'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchLeaveData} className="btn-secondary btn-sm">
                        <HiOutlineRefresh className="w-4 h-4" />
                    </button>
                    <Link to="/leave/apply" className="btn-primary">
                        <HiOutlinePlus className="w-5 h-5" />
                        Apply Leave
                    </Link>
                </div>
            </div>

            {/* HR Role Notice */}
            {isHRRole && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <HiOutlineCalendar className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-purple-800">HR Manager Access</h3>
                            <p className="text-sm text-purple-700 mt-1">
                                You can approve or reject pending leave requests. When a leave is approved, the employee's leave balance will be automatically deducted.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Balance Cards - Professional HR Portal Layout (Filtered by Gender) */}
            {!isHRRole && (
                <div className={`grid gap-4 ${leaveBalance.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'}`}>
                    {leaveBalance.map((leave) => (
                        <div key={leave.type} className="card p-5 hover:shadow-lg transition-shadow duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`w-3 h-3 rounded-full ${leave.dotColor}`}></span>
                                <span className="text-xs font-medium text-secondary-500">{leave.type}</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-secondary-900">{leave.available}</p>
                                    <p className="text-xs text-secondary-500 mt-1">Available</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-secondary-600">{leave.used} used</p>
                                    <p className="text-xs text-secondary-400">of {leave.total}</p>
                                </div>
                            </div>
                            <div className="mt-4 h-2 bg-secondary-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${leave.color} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min((leave.used / leave.total) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Leave Requests */}
            <div className="card">
                <div className="px-6 py-4 border-b border-secondary-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="font-semibold text-secondary-900">
                        {isHRRole ? 'Leave Requests (All Employees)' : 'My Leave Requests'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <HiOutlineFilter className="w-5 h-5 text-secondary-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="input w-auto py-2"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
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
                                    {isHRRole && <th className="table-header-cell text-primary-600">EMPLOYEE</th>}
                                    <th className="table-header-cell text-primary-600">LEAVE TYPE</th>
                                    <th className="table-header-cell text-primary-600">DURATION</th>
                                    <th className="table-header-cell text-primary-600">DAYS</th>
                                    <th className="table-header-cell text-primary-600">REASON</th>
                                    <th className="table-header-cell text-primary-600">APPLIED ON</th>
                                    <th className="table-header-cell text-primary-600">STATUS</th>
                                    <th className="table-header-cell text-primary-600">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filteredLeaves.map((leave) => (
                                    <tr key={leave.id} className="hover:bg-secondary-50">
                                        {isHRRole && (
                                            <td className="table-cell">
                                                <div>
                                                    <p className="font-medium text-secondary-900">{leave.employeeName}</p>
                                                    <p className="text-xs text-secondary-500">{leave.employeeCode}</p>
                                                </div>
                                            </td>
                                        )}
                                        <td className="table-cell">
                                            <span className="font-medium text-secondary-900">{leave.type}</span>
                                        </td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-2">
                                                <HiOutlineCalendar className="w-4 h-4 text-secondary-400" />
                                                {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="table-cell">{leave.days} day{leave.days > 1 ? 's' : ''}</td>
                                        <td className="table-cell max-w-xs truncate">{leave.reason}</td>
                                        <td className="table-cell">{new Date(leave.appliedOn).toLocaleDateString()}</td>
                                        <td className="table-cell">{getStatusBadge(leave.status)}</td>
                                        <td className="table-cell">
                                            <div className="flex items-center gap-2">
                                                {/* HR Actions for pending leaves */}
                                                {canApproveLeaves && leave.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(leave.id)}
                                                            disabled={actionLoading === leave.id}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Approve"
                                                        >
                                                            {actionLoading === leave.id ? (
                                                                <div className="w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                                                            ) : (
                                                                <HiOutlineCheck className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(leave.id)}
                                                            disabled={actionLoading === leave.id}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Reject"
                                                        >
                                                            <HiOutlineX className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                                {/* Cancel option for own pending leaves */}
                                                {!isHRRole && leave.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCancel(leave.id)}
                                                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {!loading && filteredLeaves.length === 0 && (
                    <div className="p-8 text-center">
                        <HiOutlineClipboardList className="w-16 h-16 mx-auto text-secondary-300" />
                        <p className="mt-4 text-lg font-medium text-secondary-600">
                            No leave requests found
                        </p>
                        <p className="mt-1 text-sm text-secondary-500">
                            {filter !== 'all'
                                ? `No ${filter} leave requests found`
                                : (isHRRole ? 'No leave requests in the system' : 'You haven\'t applied for any leaves yet')
                            }
                        </p>
                        {!isHRRole && (
                            <Link to="/leave/apply" className="btn-primary mt-6 inline-flex">
                                <HiOutlinePlus className="w-5 h-5" />
                                Apply for Leave
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveList;
