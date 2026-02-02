import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    HiOutlineCurrencyRupee,
    HiOutlineDocumentText,
    HiOutlineCheck,
    HiOutlineLockClosed,
    HiOutlineRefresh,
    HiOutlineDownload,
    HiOutlineEye,
    HiOutlineCog,
    HiOutlineCalculator,
    HiOutlineChartBar,
    HiOutlineUserGroup,
    HiOutlineCalendar,
    HiOutlineX,
    HiOutlinePlus,
    HiOutlineExclamation
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PayrollList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [payrolls, setPayrolls] = useState([]);
    const [summary, setSummary] = useState({ totalGross: 0, totalDeductions: 0, totalNet: 0, count: 0 });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [processing, setProcessing] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [dashboard, setDashboard] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [salaryForm, setSalaryForm] = useState({
        employeeId: '',
        basicPay: '',
        hraPercentage: 40,
        specialAllowance: '',
        pfEnabled: true,
        professionalTax: 200
    });
    const [processingErrors, setProcessingErrors] = useState([]);

    const isHR = ['admin', 'HRManager', 'HRExecutive', 'PayrollOfficer'].includes(user?.role);

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    useEffect(() => {
        fetchPayrolls();
        if (isHR) {
            fetchDashboard();
            fetchEmployees();
        }
    }, [selectedMonth, selectedYear]);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/payroll?month=${selectedMonth}&year=${selectedYear}`);
            setPayrolls(response.data.payrolls || []);
            setSummary(response.data.summary || { totalGross: 0, totalDeductions: 0, totalNet: 0, count: 0 });
        } catch (error) {
            console.error('Error fetching payrolls:', error);
            toast.error('Failed to fetch payroll data');
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/payroll/dashboard');
            setDashboard(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees?status=active&limit=100');
            setEmployees(response.data.employees || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleProcessPayroll = async () => {
        if (!window.confirm(`Process payroll for ${months[selectedMonth - 1].label} ${selectedYear}?`)) return;

        setProcessing(true);
        try {
            const response = await api.post('/payroll/process', {
                month: selectedMonth,
                year: selectedYear
            });

            const { processed, errors, skipped } = response.data.results;

            if (processed.length > 0) {
                toast.success(`Processed ${processed.length} payroll(s) successfully`);
            }

            if (skipped.length > 0) {
                toast.info(`${skipped.length} payroll(s) skipped (already locked)`);
            }

            if (errors.length > 0) {
                // Store errors for display in UI
                setProcessingErrors(errors);
                // Show detailed error information
                const errorMessages = errors.map(e =>
                    `${e.name || e.employeeCode}: ${e.error}`
                ).join('\n');
                console.error('Payroll processing errors:', errors);
                toast.error(`${errors.length} error(s) occurred. See details below.`, {
                    duration: 5000
                });
            } else {
                setProcessingErrors([]);
            }

            fetchPayrolls();
            fetchDashboard();
        } catch (error) {
            console.error('Error processing payroll:', error);
            toast.error(error.response?.data?.message || 'Failed to process payroll');
        } finally {
            setProcessing(false);
        }
    };

    const handleApprove = async (payrollId) => {
        try {
            await api.put(`/payroll/${payrollId}/approve`);
            toast.success('Payroll approved');
            fetchPayrolls();
        } catch (error) {
            toast.error('Failed to approve payroll');
        }
    };

    const handleBulkApprove = async () => {
        if (!window.confirm('Approve all pending payrolls for this month?')) return;

        try {
            const response = await api.put('/payroll/approve-bulk', {
                month: selectedMonth,
                year: selectedYear
            });
            toast.success(`${response.data.modifiedCount} payrolls approved`);
            fetchPayrolls();
        } catch (error) {
            toast.error('Failed to approve payrolls');
        }
    };

    const handleLock = async (payrollId) => {
        if (!window.confirm('Lock this payroll? This action cannot be undone.')) return;

        try {
            await api.put(`/payroll/${payrollId}/lock`);
            toast.success('Payroll locked');
            fetchPayrolls();
        } catch (error) {
            toast.error('Failed to lock payroll');
        }
    };

    const handleGeneratePayslip = async (payrollId) => {
        try {
            const response = await api.post(`/payroll/${payrollId}/payslip`);
            toast.success('Payslip generated');
            fetchPayrolls();
            // Navigate to view the payslip after generation
            if (response.data.payslip?._id) {
                navigate(`/payroll/payslip/${response.data.payslip._id}`);
            }
        } catch (error) {
            toast.error('Failed to generate payslip');
        }
    };

    const handleViewPayslip = async (payrollId) => {
        try {
            // Get payslip by payroll ID using the new endpoint
            const response = await api.get(`/payroll/${payrollId}/payslip`);
            if (response.data._id) {
                navigate(`/payroll/payslip/${response.data._id}`);
            } else {
                toast.error('Payslip not found');
            }
        } catch (error) {
            // If payslip doesn't exist, generate it
            if (error.response?.status === 404) {
                try {
                    const response = await api.post(`/payroll/${payrollId}/payslip`);
                    if (response.data.payslip?._id) {
                        navigate(`/payroll/payslip/${response.data.payslip._id}`);
                    }
                } catch (genError) {
                    toast.error('Failed to generate payslip');
                }
            } else {
                toast.error('Failed to view payslip');
            }
        }
    };

    const handleViewDetails = async (payrollId) => {
        try {
            const response = await api.get(`/payroll/${payrollId}`);
            setSelectedPayroll(response.data);
            setShowDetailModal(true);
        } catch (error) {
            toast.error('Failed to fetch payroll details');
        }
    };

    const handleSaveSalary = async () => {
        if (!salaryForm.employeeId || !salaryForm.basicPay) {
            toast.error('Employee and Basic Pay are required');
            return;
        }

        try {
            await api.post('/payroll/salary-structures', {
                ...salaryForm,
                basicPay: parseFloat(salaryForm.basicPay),
                specialAllowance: parseFloat(salaryForm.specialAllowance) || 0
            });
            toast.success('Salary structure saved');
            setShowSalaryModal(false);
            setSalaryForm({
                employeeId: '',
                basicPay: '',
                hraPercentage: 40,
                specialAllowance: '',
                pfEnabled: true,
                professionalTax: 200
            });
            fetchDashboard();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save salary structure');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: 'bg-gray-100 text-gray-700',
            pending: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-blue-100 text-blue-700',
            processed: 'bg-green-100 text-green-700',
            paid: 'bg-emerald-100 text-emerald-700',
            cancelled: 'bg-red-100 text-red-700'
        };
        return badges[status] || badges.draft;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <HiOutlineCurrencyRupee className="w-8 h-8 text-primary-600" />
                        Payroll Management
                    </h1>
                    <p className="text-secondary-500 mt-1">Process salaries and manage payroll</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchPayrolls} className="btn-secondary btn-sm">
                        <HiOutlineRefresh className="w-4 h-4" />
                        Refresh
                    </button>
                    {isHR && (
                        <button onClick={() => setShowSalaryModal(true)} className="btn-secondary">
                            <HiOutlinePlus className="w-4 h-4" />
                            Add Salary Structure
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard Stats (HR only) */}
            {isHR && dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <HiOutlineUserGroup className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-500">Processed</p>
                                <p className="text-xl font-bold text-secondary-900">{summary.count || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <HiOutlineCurrencyRupee className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-500">Total Net Salary</p>
                                <p className="text-xl font-bold text-secondary-900">{formatCurrency(summary.totalNet)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                <HiOutlineExclamation className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-500">Pending Approvals</p>
                                <p className="text-xl font-bold text-secondary-900">{dashboard.stats?.pendingApprovals || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <HiOutlineExclamation className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-500">Missing Salary</p>
                                <p className="text-xl font-bold text-secondary-900">{dashboard.stats?.employeesWithoutSalary || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Month/Year Selector & Actions */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <HiOutlineCalendar className="w-5 h-5 text-secondary-400" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="input py-2"
                            >
                                {months.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="input py-2"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isHR && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleProcessPayroll}
                                disabled={processing}
                                className="btn-primary"
                            >
                                <HiOutlineCalculator className="w-4 h-4" />
                                {processing ? 'Processing...' : 'Process Payroll'}
                            </button>
                            {payrolls.some(p => p.status === 'pending') && (
                                <button onClick={handleBulkApprove} className="btn-secondary">
                                    <HiOutlineCheck className="w-4 h-4" />
                                    Approve All Pending
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Processing Errors Display */}
            {processingErrors.length > 0 && (
                <div className="card p-4 bg-red-50 border border-red-200">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-red-700 font-semibold mb-3">
                            <HiOutlineExclamation className="w-5 h-5" />
                            <span>Payroll Processing Errors ({processingErrors.length})</span>
                        </div>
                        <button
                            onClick={() => setProcessingErrors([])}
                            className="text-red-500 hover:text-red-700 p-1"
                        >
                            <HiOutlineX className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {processingErrors.map((error, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 bg-white rounded-lg border border-red-100">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-sm flex-shrink-0">
                                    {(error.name || error.employeeCode || 'E')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-secondary-900 truncate">
                                        {error.name || error.employeeCode || 'Unknown Employee'}
                                    </p>
                                    <p className="text-sm text-red-600">{error.error}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-red-600 mt-3">
                        Tip: Ensure all employees above have valid salary structures before processing payroll.
                    </p>
                </div>
            )}

            {/* Payroll Table */}
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-secondary-100">
                    <h2 className="font-semibold text-secondary-900">
                        Payroll for {months[selectedMonth - 1]?.label} {selectedYear}
                    </h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : payrolls.length === 0 ? (
                    <div className="text-center py-12">
                        <HiOutlineCurrencyRupee className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                        <p className="text-secondary-500">No payroll records for this month</p>
                        {isHR && (
                            <button onClick={handleProcessPayroll} className="btn-primary mt-4">
                                Process Payroll Now
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Department</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Gross</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Deductions</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Net Pay</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {payrolls.map(payroll => (
                                    <tr key={payroll._id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                                                    {payroll.employeeId?.personalInfo?.firstName?.[0]}
                                                    {payroll.employeeId?.personalInfo?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-secondary-900">
                                                        {payroll.employeeId?.personalInfo?.firstName} {payroll.employeeId?.personalInfo?.lastName}
                                                    </p>
                                                    <p className="text-sm text-secondary-500">{payroll.employeeId?.employeeCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-secondary-600">
                                            {payroll.employeeId?.employmentInfo?.department || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-secondary-900">
                                            {formatCurrency(payroll.grossEarnings)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-red-600">
                                            -{formatCurrency(payroll.totalDeductions)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">
                                            {formatCurrency(payroll.netSalary)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(payroll.status)}`}>
                                                {payroll.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(payroll._id)}
                                                    className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <HiOutlineEye className="w-5 h-5" />
                                                </button>
                                                {isHR && payroll.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleApprove(payroll._id)}
                                                        className="p-2 text-secondary-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Approve"
                                                    >
                                                        <HiOutlineCheck className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {isHR && payroll.status === 'approved' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleGeneratePayslip(payroll._id)}
                                                            className="p-2 text-secondary-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Generate Payslip"
                                                        >
                                                            <HiOutlineDocumentText className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleLock(payroll._id)}
                                                            className="p-2 text-secondary-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Lock Payroll"
                                                        >
                                                            <HiOutlineLockClosed className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                                {payroll.payslipGenerated && (
                                                    <button
                                                        onClick={() => handleViewPayslip(payroll._id)}
                                                        className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        title="View Payslip"
                                                    >
                                                        <HiOutlineDownload className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary Footer */}
                {payrolls.length > 0 && (
                    <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="text-sm text-secondary-500">
                                Total: <span className="font-medium text-secondary-900">{payrolls.length}</span> employees
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <div>
                                    <span className="text-secondary-500">Total Gross:</span>
                                    <span className="ml-2 font-semibold text-secondary-900">{formatCurrency(summary.totalGross)}</span>
                                </div>
                                <div>
                                    <span className="text-secondary-500">Total Deductions:</span>
                                    <span className="ml-2 font-semibold text-red-600">{formatCurrency(summary.totalDeductions)}</span>
                                </div>
                                <div>
                                    <span className="text-secondary-500">Total Net Pay:</span>
                                    <span className="ml-2 font-bold text-green-600">{formatCurrency(summary.totalNet)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedPayroll && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-secondary-900">Salary Breakdown</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 hover:bg-secondary-100 rounded-lg"
                            >
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Employee Info */}
                            <div className="flex items-center gap-4 p-4 bg-secondary-50 rounded-xl">
                                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xl">
                                    {selectedPayroll.employeeId?.personalInfo?.firstName?.[0]}
                                    {selectedPayroll.employeeId?.personalInfo?.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-secondary-900">
                                        {selectedPayroll.employeeId?.personalInfo?.firstName} {selectedPayroll.employeeId?.personalInfo?.lastName}
                                    </p>
                                    <p className="text-secondary-500">{selectedPayroll.employeeId?.employeeCode}</p>
                                    <p className="text-sm text-secondary-400">
                                        {selectedPayroll.employeeId?.employmentInfo?.department} • {selectedPayroll.employeeId?.employmentInfo?.designation}
                                    </p>
                                </div>
                            </div>

                            {/* Working Days */}
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <p className="text-2xl font-bold text-blue-600">{selectedPayroll.workingDays?.totalWorkingDays || 0}</p>
                                    <p className="text-xs text-blue-600">Working Days</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <p className="text-2xl font-bold text-green-600">{selectedPayroll.workingDays?.daysWorked || 0}</p>
                                    <p className="text-xs text-green-600">Days Worked</p>
                                </div>
                                <div className="p-3 bg-yellow-50 rounded-xl">
                                    <p className="text-2xl font-bold text-yellow-600">{selectedPayroll.workingDays?.leaveDays || 0}</p>
                                    <p className="text-xs text-yellow-600">Leave</p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl">
                                    <p className="text-2xl font-bold text-red-600">{selectedPayroll.workingDays?.lopDays || 0}</p>
                                    <p className="text-xs text-red-600">LOP</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-xl">
                                    <p className="text-2xl font-bold text-purple-600">{selectedPayroll.workingDays?.holidays || 0}</p>
                                    <p className="text-xs text-purple-600">Holidays</p>
                                </div>
                            </div>

                            {/* Earnings & Deductions */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Earnings */}
                                <div className="border border-secondary-200 rounded-xl overflow-hidden">
                                    <div className="bg-green-50 px-4 py-3">
                                        <h3 className="font-semibold text-green-700">Earnings</h3>
                                    </div>
                                    <div className="divide-y divide-secondary-100">
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">Basic Pay</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.basicPay)}</span>
                                        </div>
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">HRA</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.hra)}</span>
                                        </div>
                                        {selectedPayroll.earnings?.da > 0 && (
                                            <div className="px-4 py-2 flex justify-between">
                                                <span className="text-secondary-600">DA</span>
                                                <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.da)}</span>
                                            </div>
                                        )}
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">Special Allowance</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.specialAllowance)}</span>
                                        </div>
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">Conveyance</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.conveyanceAllowance)}</span>
                                        </div>
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">Medical</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.medicalAllowance)}</span>
                                        </div>
                                        {selectedPayroll.earnings?.overtimeAmount > 0 && (
                                            <div className="px-4 py-2 flex justify-between">
                                                <span className="text-secondary-600">Overtime ({selectedPayroll.earnings?.overtimeHours}h)</span>
                                                <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.overtimeAmount)}</span>
                                            </div>
                                        )}
                                        {selectedPayroll.earnings?.bonus > 0 && (
                                            <div className="px-4 py-2 flex justify-between">
                                                <span className="text-secondary-600">Bonus</span>
                                                <span className="font-medium">{formatCurrency(selectedPayroll.earnings?.bonus)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-green-100 px-4 py-3 flex justify-between">
                                        <span className="font-semibold text-green-800">Total Earnings</span>
                                        <span className="font-bold text-green-800">{formatCurrency(selectedPayroll.grossEarnings)}</span>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div className="border border-secondary-200 rounded-xl overflow-hidden">
                                    <div className="bg-red-50 px-4 py-3">
                                        <h3 className="font-semibold text-red-700">Deductions</h3>
                                    </div>
                                    <div className="divide-y divide-secondary-100">
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">Provident Fund</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.deductions?.pf)}</span>
                                        </div>
                                        {selectedPayroll.deductions?.esi > 0 && (
                                            <div className="px-4 py-2 flex justify-between">
                                                <span className="text-secondary-600">ESI</span>
                                                <span className="font-medium">{formatCurrency(selectedPayroll.deductions?.esi)}</span>
                                            </div>
                                        )}
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">Professional Tax</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.deductions?.professionalTax)}</span>
                                        </div>
                                        <div className="px-4 py-2 flex justify-between">
                                            <span className="text-secondary-600">Income Tax (TDS)</span>
                                            <span className="font-medium">{formatCurrency(selectedPayroll.deductions?.incomeTax)}</span>
                                        </div>
                                        {selectedPayroll.deductions?.lop > 0 && (
                                            <div className="px-4 py-2 flex justify-between">
                                                <span className="text-secondary-600">Loss of Pay</span>
                                                <span className="font-medium">{formatCurrency(selectedPayroll.deductions?.lop)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-red-100 px-4 py-3 flex justify-between">
                                        <span className="font-semibold text-red-800">Total Deductions</span>
                                        <span className="font-bold text-red-800">{formatCurrency(selectedPayroll.totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Pay */}
                            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white text-center">
                                <p className="text-primary-100 text-sm">Net Salary</p>
                                <p className="text-4xl font-bold mt-1">{formatCurrency(selectedPayroll.netSalary)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Structure Modal */}
            {showSalaryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-secondary-900">Add Salary Structure</h2>
                            <button
                                onClick={() => setShowSalaryModal(false)}
                                className="p-2 hover:bg-secondary-100 rounded-lg"
                            >
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="label">Employee *</label>
                                <select
                                    value={salaryForm.employeeId}
                                    onChange={(e) => setSalaryForm({ ...salaryForm, employeeId: e.target.value })}
                                    className="input"
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
                                <label className="label">Basic Pay (Monthly) *</label>
                                <input
                                    type="number"
                                    value={salaryForm.basicPay}
                                    onChange={(e) => setSalaryForm({ ...salaryForm, basicPay: e.target.value })}
                                    className="input"
                                    placeholder="e.g., 50000"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">HRA %</label>
                                    <input
                                        type="number"
                                        value={salaryForm.hraPercentage}
                                        onChange={(e) => setSalaryForm({ ...salaryForm, hraPercentage: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Special Allowance</label>
                                    <input
                                        type="number"
                                        value={salaryForm.specialAllowance}
                                        onChange={(e) => setSalaryForm({ ...salaryForm, specialAllowance: e.target.value })}
                                        className="input"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="pfEnabled"
                                        checked={salaryForm.pfEnabled}
                                        onChange={(e) => setSalaryForm({ ...salaryForm, pfEnabled: e.target.checked })}
                                        className="w-4 h-4 text-primary-600"
                                    />
                                    <label htmlFor="pfEnabled" className="text-sm text-secondary-700">Enable PF (12%)</label>
                                </div>
                                <div>
                                    <label className="label">Professional Tax</label>
                                    <input
                                        type="number"
                                        value={salaryForm.professionalTax}
                                        onChange={(e) => setSalaryForm({ ...salaryForm, professionalTax: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-secondary-100 flex justify-end gap-3">
                            <button onClick={() => setShowSalaryModal(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button onClick={handleSaveSalary} className="btn-primary">
                                Save Salary Structure
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollList;
