import { useState, useEffect } from 'react';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineEye,
    HiOutlineCurrencyRupee,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineCash,
    HiOutlineCalendar
} from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const LoanList = () => {
    const { user } = useAuth();
    const [loans, setLoans] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState(null);
    const [formData, setFormData] = useState({
        type: 'salary-advance',
        requestedAmount: '',
        repayment: { tenure: 3 },
        purpose: '',
        justification: ''
    });

    const loanTypes = ['salary-advance', 'personal-loan', 'emergency-loan', 'travel-advance', 'medical-advance', 'festival-advance', 'education-loan'];
    const statuses = ['draft', 'submitted', 'pending-manager', 'pending-hr', 'pending-finance', 'approved', 'disbursed', 'active', 'closed', 'rejected'];
    const isHR = ['admin', 'HRManager', 'PayrollOfficer'].includes(user?.role);

    useEffect(() => {
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const endpoint = isHR ? '/salary/loans' : '/salary/loans/my';
            const res = await api.get(endpoint);
            setLoans(res.data.loans || res.data);
            setSummary(res.data.summary);
        } catch (error) {
            toast.error('Failed to fetch loans');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, status: 'submitted' };
            await api.post('/salary/loans', payload);
            toast.success('Loan application submitted');
            setShowModal(false);
            resetForm();
            fetchLoans();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit');
        }
    };

    const resetForm = () => {
        setFormData({
            type: 'salary-advance',
            requestedAmount: '',
            repayment: { tenure: 3 },
            purpose: '',
            justification: ''
        });
    };

    const handleApprove = async (id, action, approvedAmount) => {
        try {
            await api.post(`/salary/loans/${id}/approve`, {
                status: action,
                approvedAmount,
                level: 'finance',
                comments: action === 'approved' ? 'Approved' : 'Rejected'
            });
            toast.success(`Loan ${action}`);
            fetchLoans();
            setShowDetails(null);
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const handleDisburse = async (id) => {
        try {
            await api.post(`/salary/loans/${id}/disburse`, {
                method: 'bank-transfer',
                startMonth: new Date().toISOString()
            });
            toast.success('Loan disbursed');
            fetchLoans();
            setShowDetails(null);
        } catch (error) {
            toast.error('Disbursement failed');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: 'bg-secondary-100 text-secondary-700',
            submitted: 'bg-blue-100 text-blue-700',
            'pending-manager': 'bg-yellow-100 text-yellow-700',
            'pending-hr': 'bg-orange-100 text-orange-700',
            'pending-finance': 'bg-orange-100 text-orange-700',
            approved: 'bg-green-100 text-green-700',
            disbursed: 'bg-purple-100 text-purple-700',
            active: 'bg-primary-100 text-primary-700',
            closed: 'bg-secondary-100 text-secondary-700',
            rejected: 'bg-red-100 text-red-700'
        };
        return badges[status] || badges.draft;
    };

    const formatCurrency = (num) => new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(num || 0);

    const filteredItems = loans.filter(l => {
        const matchSearch = l.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.loanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.employee?.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        const matchType = filterType === 'all' || l.type === filterType;
        return matchSearch && matchStatus && matchType;
    });

    const totalOutstanding = loans.filter(l => ['disbursed', 'active'].includes(l.status)).reduce((sum, l) => sum + (l.balance?.total || 0), 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Loans & Advances</h1>
                    <p className="text-secondary-500 mt-1">Apply and track salary advances</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
                    <HiOutlinePlus className="w-5 h-5" />
                    Apply for Loan
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4">
                    <p className="text-2xl font-bold text-primary-600">{loans.length}</p>
                    <p className="text-sm text-secondary-500">Total Applications</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-yellow-600">
                        {loans.filter(l => ['submitted', 'pending-manager', 'pending-hr', 'pending-finance'].includes(l.status)).length}
                    </p>
                    <p className="text-sm text-secondary-500">Pending Approval</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-purple-600">
                        {loans.filter(l => ['disbursed', 'active'].includes(l.status)).length}
                    </p>
                    <p className="text-sm text-secondary-500">Active Loans</p>
                </div>
                <div className="card p-4">
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
                    <p className="text-sm text-secondary-500">Outstanding Balance</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search by loan number or type..."
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
                        {loanTypes.map(t => <option key={t} value={t}>{t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Loan #</th>
                                {isHR && <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Employee</th>}
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Type</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Amount</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">EMI</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Outstanding</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">Status</th>
                                <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="p-8 text-center">Loading...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-secondary-500">No loans found</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm font-medium text-primary-600">{item.loanNumber}</span>
                                        </td>
                                        {isHR && (
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-secondary-900">
                                                    {item.employee?.personalInfo?.firstName} {item.employee?.personalInfo?.lastName}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <span className="capitalize">{item.type?.split('-').join(' ')}</span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold">
                                            {formatCurrency(item.approvedAmount || item.requestedAmount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.repayment?.emiAmount ? (
                                                <div>
                                                    <span className="font-medium">{formatCurrency(item.repayment.emiAmount)}</span>
                                                    <span className="text-secondary-500 text-sm"> × {item.repayment.tenure}m</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.balance?.total ? (
                                                <span className="font-semibold text-red-600">{formatCurrency(item.balance.total)}</span>
                                            ) : '-'}
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

            {/* New Loan Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
                        <h2 className="text-xl font-bold text-secondary-900 mb-6">Apply for Loan/Advance</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Loan Type *</label>
                                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="input">
                                    {loanTypes.map(t => <option key={t} value={t}>{t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Amount Required *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">₹</span>
                                        <input
                                            type="number"
                                            value={formData.requestedAmount}
                                            onChange={(e) => setFormData({ ...formData, requestedAmount: parseInt(e.target.value) })}
                                            className="input pl-8"
                                            required
                                            min={1000}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Repayment Tenure (Months) *</label>
                                    <select value={formData.repayment.tenure} onChange={(e) => setFormData({ ...formData, repayment: { tenure: parseInt(e.target.value) } })} className="input">
                                        {[1, 2, 3, 6, 12, 18, 24].map(m => <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>)}
                                    </select>
                                </div>
                            </div>
                            {formData.requestedAmount && formData.repayment.tenure && (
                                <div className="p-4 bg-primary-50 rounded-xl">
                                    <div className="flex justify-between">
                                        <span className="text-primary-700">Estimated Monthly EMI</span>
                                        <span className="font-bold text-primary-900">
                                            {formatCurrency(Math.ceil(formData.requestedAmount / formData.repayment.tenure))}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="label">Purpose *</label>
                                <input
                                    type="text"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    className="input"
                                    required
                                    placeholder="e.g., Medical emergency, Home renovation"
                                />
                            </div>
                            <div>
                                <label className="label">Justification</label>
                                <textarea
                                    value={formData.justification}
                                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                                    className="input"
                                    rows={3}
                                    placeholder="Provide additional details to support your request"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Submit Application</button>
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
                                <h2 className="text-xl font-bold text-secondary-900">Loan Details</h2>
                                <p className="text-sm text-secondary-500 font-mono">{showDetails.loanNumber}</p>
                            </div>
                            <button onClick={() => setShowDetails(null)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-secondary-50 rounded-xl">
                                    <p className="text-sm text-secondary-500">Type</p>
                                    <p className="font-semibold capitalize">{showDetails.type?.split('-').join(' ')}</p>
                                </div>
                                <div className="p-4 bg-secondary-50 rounded-xl">
                                    <p className="text-sm text-secondary-500">Requested</p>
                                    <p className="font-bold text-lg">{formatCurrency(showDetails.requestedAmount)}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl">
                                    <p className="text-sm text-green-600">Approved</p>
                                    <p className="font-bold text-lg text-green-700">
                                        {showDetails.approvedAmount ? formatCurrency(showDetails.approvedAmount) : '-'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-secondary-500 mb-1">Purpose</p>
                                <p className="font-medium">{showDetails.purpose}</p>
                            </div>

                            {showDetails.emiSchedule?.length > 0 && (
                                <div className="border-t border-secondary-200 pt-4">
                                    <h3 className="font-semibold text-secondary-900 mb-3">EMI Schedule</h3>
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-secondary-50 sticky top-0">
                                                <tr>
                                                    <th className="text-left p-2">#</th>
                                                    <th className="text-left p-2">Due Date</th>
                                                    <th className="text-right p-2">EMI</th>
                                                    <th className="text-center p-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {showDetails.emiSchedule.map((emi, i) => (
                                                    <tr key={i} className="border-b border-secondary-100">
                                                        <td className="p-2">{emi.installmentNumber}</td>
                                                        <td className="p-2">{new Date(emi.dueDate).toLocaleDateString()}</td>
                                                        <td className="p-2 text-right font-medium">{formatCurrency(emi.emiAmount)}</td>
                                                        <td className="p-2 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${emi.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                    emi.status === 'deducted' ? 'bg-green-100 text-green-700' :
                                                                        'bg-secondary-100 text-secondary-700'
                                                                }`}>
                                                                {emi.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl">
                                <HiOutlineCurrencyRupee className="w-8 h-8 text-primary-600" />
                                <div className="flex-1">
                                    <p className="text-sm text-primary-600">Outstanding Balance</p>
                                    <p className="text-2xl font-bold text-primary-900">
                                        {formatCurrency(showDetails.balance?.total || 0)}
                                    </p>
                                </div>
                                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadge(showDetails.status)}`}>
                                    {showDetails.status?.replace('-', ' ')}
                                </span>
                            </div>

                            {isHR && (
                                <div className="flex gap-3 pt-4 border-t border-secondary-200">
                                    {['submitted', 'pending-manager', 'pending-hr', 'pending-finance'].includes(showDetails.status) && (
                                        <>
                                            <button onClick={() => handleApprove(showDetails._id, 'rejected')} className="btn-danger flex-1">
                                                <HiOutlineX className="w-5 h-5" />
                                                Reject
                                            </button>
                                            <button onClick={() => handleApprove(showDetails._id, 'approved', showDetails.requestedAmount)} className="btn-primary flex-1">
                                                <HiOutlineCheck className="w-5 h-5" />
                                                Approve
                                            </button>
                                        </>
                                    )}
                                    {showDetails.status === 'approved' && (
                                        <button onClick={() => handleDisburse(showDetails._id)} className="btn-primary flex-1">
                                            <HiOutlineCash className="w-5 h-5" />
                                            Disburse
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanList;
