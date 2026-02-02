import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineCalendar, HiOutlineRefresh, HiOutlineInformationCircle } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ApplyLeave = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [leaveTypesLoading, setLeaveTypesLoading] = useState(true);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [userGender, setUserGender] = useState(null);

    const [formData, setFormData] = useState({
        leaveType: '',
        fromDate: '',
        toDate: '',
        halfDay: false,
        halfDayType: 'first-half',
        reason: ''
    });

    // Default leave quotas with gender info
    const defaultLeaveQuotas = {
        'Casual Leave': { code: 'CL', total: 12, gender: 'all' },
        'Sick Leave': { code: 'SL', total: 10, gender: 'all' },
        'Earned Leave': { code: 'EL', total: 15, gender: 'all' },
        'Comp Off': { code: 'CO', total: 5, gender: 'all' },
        'Maternity Leave': { code: 'ML', total: 180, gender: 'female' },
        'Paternity Leave': { code: 'PL', total: 15, gender: 'male' },
    };

    useEffect(() => {
        fetchLeaveTypes();
        fetchLeaveBalance();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const response = await api.get('/leave-types?active=true');
            const types = response.data?.leaveTypes || [];
            const gender = response.data?.userGender || null;
            setUserGender(gender);
            setLeaveTypes(types);
        } catch (error) {
            console.error('Error fetching leave types:', error);
            // Fallback to default types - filter by gender from user data
            const gender = user?.employeeId?.personalInfo?.gender?.toLowerCase() || null;
            setUserGender(gender);

            const allTypes = [
                { _id: 'casual', name: 'Casual Leave', code: 'CL', maxDays: 12, annualQuota: 12, applicableTo: { gender: 'all' } },
                { _id: 'sick', name: 'Sick Leave', code: 'SL', maxDays: 10, annualQuota: 10, applicableTo: { gender: 'all' } },
                { _id: 'earned', name: 'Earned Leave', code: 'EL', maxDays: 15, annualQuota: 15, applicableTo: { gender: 'all' } },
                { _id: 'compoff', name: 'Comp Off', code: 'CO', maxDays: 5, annualQuota: 5, applicableTo: { gender: 'all' } },
                { _id: 'maternity', name: 'Maternity Leave', code: 'ML', maxDays: 180, annualQuota: 180, applicableTo: { gender: 'female' } },
                { _id: 'paternity', name: 'Paternity Leave', code: 'PL', maxDays: 15, annualQuota: 15, applicableTo: { gender: 'male' } },
            ];

            // Filter by gender
            const filteredTypes = gender
                ? allTypes.filter(t => t.applicableTo.gender === 'all' || t.applicableTo.gender === gender)
                : allTypes;

            setLeaveTypes(filteredTypes);
        } finally {
            setLeaveTypesLoading(false);
        }
    };

    const fetchLeaveBalance = async () => {
        try {
            const response = await api.get('/leaves/balance');
            const balances = response.data?.balances || [];
            const gender = response.data?.userGender || null;
            if (gender) setUserGender(gender);
            setLeaveBalances(balances);
        } catch (error) {
            console.error('Error fetching leave balance:', error);
            setLeaveBalances([]);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const calculateDays = () => {
        if (!formData.fromDate || !formData.toDate) return 0;
        const from = new Date(formData.fromDate);
        const to = new Date(formData.toDate);
        const diffTime = Math.abs(to - from);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return formData.halfDay ? 0.5 : diffDays;
    };

    const getAvailableBalance = (leaveTypeId) => {
        if (!leaveTypeId) return 0;

        const leaveType = leaveTypes.find(t => t._id === leaveTypeId);
        if (!leaveType) return 0;

        const balance = leaveBalances.find(b =>
            b.leaveType?._id === leaveTypeId ||
            b.leaveType?.code === leaveType.code ||
            b.leaveType?.name === leaveType.name
        );

        if (balance) {
            return balance.available ?? balance.quota ?? 0;
        }

        // Fallback to default quota
        return defaultLeaveQuotas[leaveType.name]?.total || leaveType.annualQuota || leaveType.maxDays || 0;
    };

    const getLeaveBalanceForType = (typeName) => {
        const balance = leaveBalances.find(b => b.leaveType?.name === typeName);
        if (balance) {
            return balance.available ?? balance.quota ?? 0;
        }
        return defaultLeaveQuotas[typeName]?.total || 0;
    };

    // Get leave types applicable to user's gender for sidebar display
    const getApplicableLeaveTypes = () => {
        if (!userGender) {
            return Object.keys(defaultLeaveQuotas).slice(0, 4);
        }
        return Object.entries(defaultLeaveQuotas)
            .filter(([_, info]) => info.gender === 'all' || info.gender === userGender)
            .map(([name]) => name)
            .slice(0, 4);
    };

    const getSelectedLeaveType = () => {
        return leaveTypes.find(t => t._id === formData.leaveType);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.leaveType || !formData.fromDate || !formData.toDate || !formData.reason) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Validate dates
        const fromDate = new Date(formData.fromDate);
        const toDate = new Date(formData.toDate);
        if (fromDate > toDate) {
            toast.error('From date cannot be after To date');
            return;
        }

        // Check available balance
        const availableBalance = getAvailableBalance(formData.leaveType);
        const requestedDays = calculateDays();

        if (requestedDays > availableBalance) {
            toast.error(`Insufficient leave balance. You have ${availableBalance} days available but requested ${requestedDays} days.`);
            return;
        }

        setLoading(true);
        try {
            const leaveData = {
                leaveType: formData.leaveType,
                startDate: formData.fromDate,
                endDate: formData.toDate,
                halfDay: formData.halfDay,
                halfDayType: formData.halfDay ? formData.halfDayType : undefined,
                reason: formData.reason,
                numberOfDays: calculateDays()
            };

            await api.post('/leaves', leaveData);
            toast.success('Leave application submitted successfully! Saved to database.');
            navigate('/leave');
        } catch (error) {
            console.error('Error applying leave:', error);
            toast.error(error.response?.data?.message || 'Failed to submit leave application');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/leave" className="p-2 rounded-lg hover:bg-secondary-100 transition-colors">
                        <HiOutlineArrowLeft className="w-5 h-5 text-secondary-600" />
                    </Link>
                    <div>
                        <h1 className="page-title">Apply for Leave</h1>
                        <p className="text-secondary-500">Submit a new leave request</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="card p-6 space-y-6">
                        {/* Leave Type Selection */}
                        <div>
                            <label className="label">Leave Type *</label>
                            {leaveTypesLoading ? (
                                <div className="input bg-secondary-50 text-secondary-400 flex items-center">
                                    <div className="w-4 h-4 border-2 border-secondary-300 border-t-primary-600 rounded-full animate-spin mr-2"></div>
                                    Loading leave types...
                                </div>
                            ) : (
                                <select
                                    name="leaveType"
                                    value={formData.leaveType}
                                    onChange={handleChange}
                                    className="input cursor-pointer"
                                    required
                                >
                                    <option value="">Select Leave Type</option>
                                    {leaveTypes.map(type => (
                                        <option key={type._id} value={type._id}>
                                            {type.name} ({getAvailableBalance(type._id)} available)
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Date Selection - Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">From Date *</label>
                                <div className="relative">
                                    <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={formData.fromDate}
                                        onChange={handleChange}
                                        className="input pl-12"
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">To Date *</label>
                                <div className="relative">
                                    <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        name="toDate"
                                        value={formData.toDate}
                                        onChange={handleChange}
                                        className="input pl-12"
                                        min={formData.fromDate || new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Half Day Option */}
                        <div className="flex items-center gap-4 p-4 bg-secondary-50 rounded-xl">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="halfDay"
                                    checked={formData.halfDay}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-secondary-700">Half Day Leave</span>
                            </label>

                            {formData.halfDay && (
                                <select
                                    name="halfDayType"
                                    value={formData.halfDayType}
                                    onChange={handleChange}
                                    className="input w-auto py-2"
                                >
                                    <option value="first-half">First Half</option>
                                    <option value="second-half">Second Half</option>
                                </select>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="label">Reason *</label>
                            <textarea
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                rows={4}
                                className="input resize-none"
                                placeholder="Please provide a reason for your leave request..."
                                required
                            ></textarea>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-4 pt-4 border-t border-secondary-100">
                            <Link to="/leave" className="btn-secondary px-6">
                                Cancel
                            </Link>
                            <button type="submit" className="btn-primary px-6" disabled={loading}>
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Saving to Database...
                                    </div>
                                ) : (
                                    'Submit Request'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar - Summary & Balance */}
                <div className="space-y-6">
                    {/* Leave Summary Card */}
                    <div className="card p-6">
                        <h3 className="font-semibold text-secondary-900 mb-4">Leave Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-secondary-100">
                                <span className="text-sm text-secondary-500">Leave Type</span>
                                <span className="text-sm font-medium text-secondary-900">
                                    {getSelectedLeaveType()?.name || '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-secondary-100">
                                <span className="text-sm text-secondary-500">Duration</span>
                                <span className="text-sm font-semibold text-secondary-900">
                                    {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-sm text-secondary-500">Half Day</span>
                                <span className={`text-sm font-medium ${formData.halfDay ? 'text-primary-600' : 'text-secondary-900'}`}>
                                    {formData.halfDay ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Leave Balance Card - Filtered by Gender */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-secondary-900">Leave Balance</h3>
                            <button
                                onClick={fetchLeaveBalance}
                                className="text-primary-600 hover:text-primary-700 p-1 rounded-lg hover:bg-primary-50 transition-colors"
                                title="Refresh balance"
                            >
                                <HiOutlineRefresh className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {getApplicableLeaveTypes().map((typeName) => (
                                <div key={typeName} className="flex justify-between items-center py-2">
                                    <span className="text-sm text-secondary-600">{typeName}</span>
                                    <span className="text-sm font-medium text-secondary-900">
                                        {getLeaveBalanceForType(typeName)} days
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Note Card */}
                    <div className="card p-6 bg-blue-50 border-blue-100">
                        <div className="flex items-start gap-3">
                            <HiOutlineInformationCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-blue-900 mb-2">Note</h3>
                                <ul className="text-sm text-blue-700 space-y-2">
                                    <li>• Leave requests require manager approval</li>
                                    <li>• You can cancel pending requests anytime</li>
                                    <li>• Approved leaves cannot be modified</li>
                                    <li>• All leaves are stored in the database</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyLeave;
