import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    HiOutlineDocumentText,
    HiOutlineDownload,
    HiOutlineEye,
    HiOutlineCurrencyRupee,
    HiOutlineCalendar,
    HiOutlineRefresh
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const MyPayslips = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [ytdSummary, setYtdSummary] = useState({
        grossEarnings: 0,
        totalDeductions: 0,
        netPay: 0
    });

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        fetchPayslips();
    }, [selectedYear]);

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/payroll/my-payslips?year=${selectedYear}`);
            setPayslips(response.data || []);

            // Calculate YTD summary
            const ytd = (response.data || []).reduce((acc, p) => ({
                grossEarnings: acc.grossEarnings + (p.totalEarnings || 0),
                totalDeductions: acc.totalDeductions + (p.totalDeductions || 0),
                netPay: acc.netPay + (p.netPay || 0)
            }), { grossEarnings: 0, totalDeductions: 0, netPay: 0 });

            setYtdSummary(ytd);
        } catch (error) {
            console.error('Error fetching payslips:', error);
            toast.error('Failed to fetch payslips');
        } finally {
            setLoading(false);
        }
    };

    const handleViewPayslip = (payslipId) => {
        navigate(`/payroll/payslip/${payslipId}`);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || '';
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <HiOutlineDocumentText className="w-8 h-8 text-primary-600" />
                        My Payslips
                    </h1>
                    <p className="text-secondary-500 mt-1">View and download your salary slips</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input py-2"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button onClick={fetchPayslips} className="btn-secondary btn-sm">
                        <HiOutlineRefresh className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* YTD Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <HiOutlineCalendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-secondary-500">Payslips ({selectedYear})</p>
                            <p className="text-xl font-bold text-secondary-900">{payslips.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <HiOutlineCurrencyRupee className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-secondary-500">YTD Gross</p>
                            <p className="text-xl font-bold text-secondary-900">{formatCurrency(ytdSummary.grossEarnings)}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <HiOutlineCurrencyRupee className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-secondary-500">YTD Deductions</p>
                            <p className="text-xl font-bold text-secondary-900">{formatCurrency(ytdSummary.totalDeductions)}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                            <HiOutlineCurrencyRupee className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-sm text-secondary-500">YTD Net Pay</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrency(ytdSummary.netPay)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payslips List */}
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-secondary-100">
                    <h2 className="font-semibold text-secondary-900">Payslips for {selectedYear}</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : payslips.length === 0 ? (
                    <div className="text-center py-12">
                        <HiOutlineDocumentText className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                        <p className="text-secondary-500">No payslips found for {selectedYear}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-secondary-100">
                        {payslips.map(payslip => (
                            <div key={payslip._id} className="p-6 hover:bg-secondary-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white">
                                            <span className="text-lg font-bold">{payslip.payPeriod?.month}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-secondary-900">
                                                {getMonthName(payslip.payPeriod?.month)} {payslip.payPeriod?.year}
                                            </p>
                                            <p className="text-sm text-secondary-500">{payslip.payslipNumber}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right hidden md:block">
                                            <p className="text-sm text-secondary-500">Gross</p>
                                            <p className="font-medium text-secondary-900">{formatCurrency(payslip.totalEarnings)}</p>
                                        </div>
                                        <div className="text-right hidden md:block">
                                            <p className="text-sm text-secondary-500">Deductions</p>
                                            <p className="font-medium text-red-600">-{formatCurrency(payslip.totalDeductions)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-secondary-500">Net Pay</p>
                                            <p className="font-bold text-green-600 text-lg">{formatCurrency(payslip.netPay)}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleViewPayslip(payslip._id)}
                                                className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                title="View Payslip"
                                            >
                                                <HiOutlineEye className="w-5 h-5" />
                                            </button>
                                            <button
                                                className="p-2 text-secondary-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Download PDF"
                                            >
                                                <HiOutlineDownload className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tax Summary Card */}
            {payslips.length > 0 && (
                <div className="card p-6">
                    <h3 className="font-semibold text-secondary-900 mb-4">Tax Summary (YTD)</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-4 bg-secondary-50 rounded-xl">
                            <p className="text-sm text-secondary-500 mb-1">Total PF Contribution</p>
                            <p className="text-xl font-bold text-secondary-900">
                                {formatCurrency(payslips.reduce((sum, p) => {
                                    const pf = p.deductions?.find(d => d.component === 'Provident Fund');
                                    return sum + (pf?.amount || 0);
                                }, 0))}
                            </p>
                        </div>
                        <div className="p-4 bg-secondary-50 rounded-xl">
                            <p className="text-sm text-secondary-500 mb-1">Total Professional Tax</p>
                            <p className="text-xl font-bold text-secondary-900">
                                {formatCurrency(payslips.reduce((sum, p) => {
                                    const pt = p.deductions?.find(d => d.component === 'Professional Tax');
                                    return sum + (pt?.amount || 0);
                                }, 0))}
                            </p>
                        </div>
                        <div className="p-4 bg-secondary-50 rounded-xl">
                            <p className="text-sm text-secondary-500 mb-1">Total TDS Deducted</p>
                            <p className="text-xl font-bold text-secondary-900">
                                {formatCurrency(payslips.reduce((sum, p) => {
                                    const tds = p.deductions?.find(d => d.component.includes('Income Tax') || d.component.includes('TDS'));
                                    return sum + (tds?.amount || 0);
                                }, 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPayslips;
