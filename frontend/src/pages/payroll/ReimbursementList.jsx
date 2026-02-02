import { useState, useEffect } from 'react';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineEye,
    HiOutlineDocument,
    HiOutlineCurrencyRupee,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineUpload
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ReimbursementList = () => {
    const { user } = useAuth();
    const [reimbursements, setReimbursements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState(null);
    const [formData, setFormData] = useState({
        type: 'travel',
        claimPeriod: { fromDate: '', toDate: '' },
        expenses: [{ date: '', description: '', amount: '', vendor: '' }],
        purpose: ''
    });

    const types = ['travel', 'medical', 'mobile', 'internet', 'education', 'relocation', 'food', 'other'];
    const statuses = ['draft', 'submitted', 'pending-manager', 'pending-finance', 'approved', 'rejected', 'paid'];
    const isHR = ['admin', 'HRManager', 'PayrollOfficer'].includes(user?.role);

    useEffect(() => {
        fetchReimbursements();
    }, []);

    const fetchReimbursements = async () => {
        try {
            setLoading(true);
            const endpoint = isHR ? '/salary/reimbursements' : '/salary/reimbursements/my';
            const res = await api.get(endpoint);
            setReimbursements(res.data.reimbursements || res.data);
        } catch (error) {
            toast.error('Failed to fetch reimbursements');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, status: 'submitted' };
            await api.post('/salary/reimbursements', payload);
            toast.success('Reimbursement submitted');
            setShowModal(false);
            resetForm();
            fetchReimbursements();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit');
        }
    };

    const resetForm = () => {
        setFormData({
            type: 'travel',
            claimPeriod: { fromDate: '', toDate: '' },
            expenses: [{ date: '', description: '', amount: '', vendor: '' }],
            purpose: ''
        });
    };

    const addExpense = () => {
        setFormData(prev => ({
            ...prev,
            expenses: [...prev.expenses, { date: '', description: '', amount: '', vendor: '' }]
        }));
    };

    const removeExpense = (index) => {
        setFormData(prev => ({
            ...prev,
            expenses: prev.expenses.filter((_, i) => i !== index)
        }));
    };

    const updateExpense = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            expenses: prev.expenses.map((exp, i) => i === index ? { ...exp, [field]: value } : exp)
        }));
    };

    const handleApprove = async (id, action, approvedAmount) => {
        try {
            await api.post(`/salary/reimbursements/${id}/approve`, {
                status: action,
                approvedAmount,
                level: 'finance',
                comments: action === 'approved' ? 'Approved' : 'Rejected'
            });
            toast.success(`Reimbursement ${action}`);
            fetchReimbursements();
            setShowDetails(null);
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: 'bg-secondary-100 text-secondary-700',
            submitted: 'bg-blue-100 text-blue-700',
            'pending-manager': 'bg-yellow-100 text-yellow-700',
            'pending-finance': 'bg-orange-100 text-orange-700',
            approved: 'bg-green-100 text-green-700',
            rejected: 'bg-red-100 text-red-700',
            paid: 'bg-purple-100 text-purple-700'
        };
        return badges[status] || badges.draft;
    };

    const formatCurrency = (num) => new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(num || 0);

    const filteredItems = reimbursements.filter(r => {
        const matchSearch = r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.employee?.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchType = filterType === 'all' || r.type === filterType;
        return matchSearch && matchStatus && matchType;
    });

    const totalPending = reimbursements.filter(r => ['submitted', 'pending-manager', 'pending-finance'].includes(r.status)).reduce((sum, r) => sum + (r.claimAmount || 0), 0);
    const totalApproved = reimbursements.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.approvedAmount || 0), 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Reimbursements</h1>
                    <p className="text-secondary-500 mt-1">Manage expense claims</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
                    <HiOutlinePlus className="w-5 h-5" />
                    New Claim
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4">
                    <p className="text-2xl font-bold text-primary-600">{reimbursements.length}</p>
                    <p className="text-sm text-secondary-500">Total Claims</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
                    <p className="text-sm text-secondary-500">Pending Approval</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalApproved)}</p>
                    <p className="text-sm text-secondary-500">Approved (Unpaid)</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(reimbursements.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.approvedAmount || 0), 0))}
                    </p>
                    <p className="text-sm text-secondary-500">Paid This Year</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-12"
                        />
                    </div>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-auto">
                        <option value="all">All Statuses</option>
                        {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-auto">
                        <option value="all">All Types</option>
                        {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                            <tr>
                                {isHR && <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Employee</th>}
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Type</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Period</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Claim Amount</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Approved</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Status</th>
                                <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-secondary-500">No reimbursements found</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                                        {isHR && (
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-secondary-900">
                                                    {item.employee?.personalInfo?.firstName} {item.employee?.personalInfo?.lastName}
                                                </div>
                                                <div className="text-sm text-secondary-500">{item.employee?.employeeCode}</div>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 capitalize">{item.type}</td>
                                        <td className="px-4 py-3">
                                            {item.claimPeriod?.fromDate && new Date(item.claimPeriod.fromDate).toLocaleDateString()}
                                            {item.claimPeriod?.toDate && ` - ${new Date(item.claimPeriod.toDate).toLocaleDateString()}`}
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{formatCurrency(item.claimAmount)}</td>
                                        <td className="px-4 py-3 font-semibold text-green-600">
                                            {item.approvedAmount ? formatCurrency(item.approvedAmount) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                                                {item.status?.replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setShowDetails(item)}
                                                    className="p-2 hover:bg-primary-50 rounded-lg text-secondary-500 hover:text-primary-600"
                                                >
                                                    <HiOutlineEye className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Claim Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
                        <h2 className="text-xl font-bold text-secondary-900 mb-6">New Reimbursement Claim</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Claim Type *</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="input">
                                        {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Purpose *</label>
                                    <input
                                        type="text"
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">From Date *</label>
                                    <input
                                        type="date"
                                        value={formData.claimPeriod.fromDate}
                                        onChange={(e) => setFormData({ ...formData, claimPeriod: { ...formData.claimPeriod, fromDate: e.target.value } })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">To Date</label>
                                    <input
                                        type="date"
                                        value={formData.claimPeriod.toDate}
                                        onChange={(e) => setFormData({ ...formData, claimPeriod: { ...formData.claimPeriod, toDate: e.target.value } })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-secondary-200 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-secondary-900">Expense Items</h3>
                                    <button type="button" onClick={addExpense} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                        + Add Item
                                    </button>
                                </div>
                                {formData.expenses.map((exp, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                                        <input type="date" value={exp.date} onChange={(e) => updateExpense(i, 'date', e.target.value)} className="input col-span-3" placeholder="Date" />
                                        <input type="text" value={exp.description} onChange={(e) => updateExpense(i, 'description', e.target.value)} className="input col-span-4" placeholder="Description" />
                                        <input type="number" value={exp.amount} onChange={(e) => updateExpense(i, 'amount', e.target.value)} className="input col-span-2" placeholder="Amount" />
                                        <input type="text" value={exp.vendor} onChange={(e) => updateExpense(i, 'vendor', e.target.value)} className="input col-span-2" placeholder="Vendor" />
                                        <button type="button" onClick={() => removeExpense(i)} className="btn-secondary col-span-1 !p-2">
                                            <HiOutlineX className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <div className="text-right font-bold text-secondary-900 mt-2">
                                    Total: {formatCurrency(formData.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Submit Claim</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-secondary-900">Reimbursement Details</h2>
                                <span className={`mt-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(showDetails.status)}`}>
                                    {showDetails.status?.replace('-', ' ')}
                                </span>
                            </div>
                            <button onClick={() => setShowDetails(null)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-secondary-500">Type</label>
                                    <p className="font-semibold capitalize">{showDetails.type}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">Purpose</label>
                                    <p className="font-semibold">{showDetails.purpose}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">Claim Amount</label>
                                    <p className="font-bold text-lg">{formatCurrency(showDetails.claimAmount)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-secondary-500">Approved Amount</label>
                                    <p className="font-bold text-lg text-green-600">
                                        {showDetails.approvedAmount ? formatCurrency(showDetails.approvedAmount) : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-secondary-200 pt-4">
                                <h3 className="font-semibold text-secondary-900 mb-3">Expense Items</h3>
                                <table className="w-full text-sm">
                                    <thead className="bg-secondary-50">
                                        <tr>
                                            <th className="text-left p-2">Date</th>
                                            <th className="text-left p-2">Description</th>
                                            <th className="text-right p-2">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {showDetails.expenses?.map((exp, i) => (
                                            <tr key={i} className="border-b border-secondary-100">
                                                <td className="p-2">{exp.date && new Date(exp.date).toLocaleDateString()}</td>
                                                <td className="p-2">{exp.description}</td>
                                                <td className="p-2 text-right">{formatCurrency(exp.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {isHR && ['submitted', 'pending-manager', 'pending-finance'].includes(showDetails.status) && (
                                <div className="flex gap-3 pt-4 border-t border-secondary-200">
                                    <button
                                        onClick={() => handleApprove(showDetails._id, 'rejected')}
                                        className="btn-danger flex-1"
                                    >
                                        <HiOutlineX className="w-5 h-5" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(showDetails._id, 'approved', showDetails.claimAmount)}
                                        className="btn-primary flex-1"
                                    >
                                        <HiOutlineCheck className="w-5 h-5" />
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReimbursementList;
