import { useState, useEffect } from 'react';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineUserAdd,
    HiOutlineUserRemove,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineChevronRight,
    HiOutlineClipboardCheck,
    HiOutlineCalendar
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const OnboardingList = () => {
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [formData, setFormData] = useState({
        employee: '',
        type: 'onboarding',
        startDate: '',
        lastWorkingDate: '',
        exitType: 'resignation'
    });

    useEffect(() => {
        fetchData();
    }, [filterType, filterStatus]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterType !== 'all') params.type = filterType;
            if (filterStatus !== 'all') params.status = filterStatus;

            const [itemsRes, statsRes, empRes] = await Promise.all([
                api.get('/onboarding', { params }).catch(err => {
                    console.log('Onboarding list error:', err.response?.data?.message || err.message);
                    return { data: { onboardings: [] } };
                }),
                api.get('/onboarding/stats').catch(err => {
                    console.log('Stats error:', err.response?.data?.message || err.message);
                    return { data: { onboarding: [], offboarding: [], upcomingJoiners: 0, upcomingExits: 0 } };
                }),
                api.get('/employees?limit=100').catch(err => {
                    console.log('Employees error:', err.response?.data?.message || err.message);
                    return { data: { employees: [] } };
                })
            ]);

            setItems(itemsRes.data.onboardings || itemsRes.data || []);
            setStats(statsRes.data);
            setEmployees(empRes.data.employees || []);
        } catch (error) {
            console.error('Failed to fetch onboarding data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/onboarding', formData);
            toast.success(`${formData.type === 'onboarding' ? 'Onboarding' : 'Offboarding'} initiated`);
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'not-started': 'bg-secondary-100 text-secondary-700',
            'in-progress': 'bg-blue-100 text-blue-700',
            'completed': 'bg-green-100 text-green-700',
            'on-hold': 'bg-yellow-100 text-yellow-700',
            'cancelled': 'bg-red-100 text-red-700'
        };
        return badges[status] || badges['not-started'];
    };

    const getProgressColor = (progress) => {
        if (progress >= 80) return 'bg-green-500';
        if (progress >= 50) return 'bg-blue-500';
        if (progress >= 25) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Onboarding & Offboarding</h1>
                    <p className="text-secondary-500 mt-1">Manage employee lifecycle</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <HiOutlinePlus className="w-5 h-5" />
                    Initiate Process
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center gap-3">
                        <HiOutlineUserAdd className="w-8 h-8 text-green-200" />
                        <div>
                            <p className="text-2xl font-bold">{stats?.upcomingJoiners || 0}</p>
                            <p className="text-green-100 text-sm">Upcoming Joiners</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center gap-3">
                        <HiOutlineClipboardCheck className="w-8 h-8 text-blue-200" />
                        <div>
                            <p className="text-2xl font-bold">
                                {stats?.onboarding?.find(s => s._id === 'in-progress')?.count || 0}
                            </p>
                            <p className="text-blue-100 text-sm">Active Onboardings</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center gap-3">
                        <HiOutlineUserRemove className="w-8 h-8 text-orange-200" />
                        <div>
                            <p className="text-2xl font-bold">{stats?.upcomingExits || 0}</p>
                            <p className="text-orange-100 text-sm">Upcoming Exits</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center gap-3">
                        <HiOutlineCheck className="w-8 h-8 text-purple-200" />
                        <div>
                            <p className="text-2xl font-bold">
                                {stats?.offboarding?.find(s => s._id === 'in-progress')?.count || 0}
                            </p>
                            <p className="text-purple-100 text-sm">Active Offboardings</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-auto">
                        <option value="all">All Types</option>
                        <option value="onboarding">Onboarding</option>
                        <option value="offboarding">Offboarding</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-auto">
                        <option value="all">All Statuses</option>
                        <option value="not-started">Not Started</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="on-hold">On Hold</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-secondary-200 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-secondary-200 rounded w-1/4 mb-2"></div>
                                    <div className="h-3 bg-secondary-200 rounded w-1/3"></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="card p-12 text-center">
                        <HiOutlineClipboardCheck className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                        <p className="text-secondary-500">No onboarding/offboarding processes found</p>
                    </div>
                ) : (
                    items.map(item => (
                        <Link key={item._id} to={`/onboarding/${item._id}`} className="block">
                            <div className="card p-6 hover:shadow-lg transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.type === 'onboarding'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {item.type === 'onboarding'
                                            ? <HiOutlineUserAdd className="w-6 h-6" />
                                            : <HiOutlineUserRemove className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600">
                                                {item.employee?.personalInfo?.firstName} {item.employee?.personalInfo?.lastName}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                                                {item.status?.replace('-', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-secondary-500 mt-1">
                                            <span className="capitalize">{item.type}</span>
                                            <span>•</span>
                                            <span>{item.employee?.employmentInfo?.department}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <HiOutlineCalendar className="w-4 h-4" />
                                                {new Date(item.startDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-secondary-900">{item.overallProgress}%</p>
                                            <p className="text-xs text-secondary-500">Progress</p>
                                        </div>
                                        <div className="w-24 h-2 bg-secondary-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getProgressColor(item.overallProgress)} transition-all`}
                                                style={{ width: `${item.overallProgress}%` }}
                                            />
                                        </div>
                                        <HiOutlineChevronRight className="w-5 h-5 text-secondary-400 group-hover:text-primary-500" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
                        <h2 className="text-xl font-bold text-secondary-900 mb-6">Initiate Process</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Process Type *</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'onboarding' })}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${formData.type === 'onboarding'
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-secondary-200 hover:border-secondary-300'
                                            }`}
                                    >
                                        <HiOutlineUserAdd className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-semibold">Onboarding</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'offboarding' })}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${formData.type === 'offboarding'
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-secondary-200 hover:border-secondary-300'
                                            }`}
                                    >
                                        <HiOutlineUserRemove className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-semibold">Offboarding</p>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="label">Employee *</label>
                                <select
                                    value={formData.employee}
                                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map(emp => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.personalInfo?.firstName} {emp.personalInfo?.lastName} ({emp.employeeCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">
                                    {formData.type === 'onboarding' ? 'Joining Date' : 'Process Start Date'} *
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            {formData.type === 'offboarding' && (
                                <>
                                    <div>
                                        <label className="label">Last Working Date *</label>
                                        <input
                                            type="date"
                                            value={formData.lastWorkingDate}
                                            onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                                            className="input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Exit Type</label>
                                        <select
                                            value={formData.exitType}
                                            onChange={(e) => setFormData({ ...formData, exitType: e.target.value })}
                                            className="input"
                                        >
                                            <option value="resignation">Resignation</option>
                                            <option value="termination">Termination</option>
                                            <option value="retirement">Retirement</option>
                                            <option value="contract-end">Contract End</option>
                                            <option value="mutual-separation">Mutual Separation</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Start Process</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingList;
