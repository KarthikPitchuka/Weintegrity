import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlinePrinter, HiOutlineDownload, HiOutlineArrowLeft, HiOutlineCurrencyRupee } from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PayslipView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef();
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayslip();
    }, [id]);

    const fetchPayslip = async () => {
        try {
            const response = await api.get(`/payroll/payslips/${id}`);
            setPayslip(response.data);
        } catch (error) {
            console.error('Error fetching payslip:', error);
            toast.error('Failed to fetch payslip');
            navigate('/payroll');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        windowPrint.document.write(`
            <html>
                <head>
                    <title>Payslip - ${payslip?.payslipNumber}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        .payslip { max-width: 800px; margin: 0 auto; border: 2px solid #1e40af; }
                        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
                        .company-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
                        .payslip-title { font-size: 18px; letter-spacing: 4px; opacity: 0.9; margin-top: 10px; }
                        .payslip-number { font-size: 14px; opacity: 0.8; margin-top: 10px; }
                        .employee-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 25px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                        .info-group { display: grid; grid-template-columns: 120px 1fr; gap: 5px; font-size: 14px; }
                        .info-label { color: #64748b; }
                        .info-value { font-weight: 500; color: #1e293b; }
                        .period-banner { background: #1e293b; color: white; text-align: center; padding: 12px; font-size: 16px; font-weight: 600; }
                        .salary-section { display: grid; grid-template-columns: 1fr 1fr; }
                        .earnings, .deductions { padding: 20px; }
                        .earnings { border-right: 1px solid #e2e8f0; }
                        .section-title { font-size: 16px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid; margin-bottom: 15px; }
                        .earnings .section-title { color: #16a34a; border-color: #16a34a; }
                        .deductions .section-title { color: #dc2626; border-color: #dc2626; }
                        .salary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                        .salary-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid; padding-top: 15px; margin-top: 10px; }
                        .earnings .salary-row.total { border-color: #16a34a; color: #16a34a; }
                        .deductions .salary-row.total { border-color: #dc2626; color: #dc2626; }
                        .net-pay-section { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 25px; text-align: center; }
                        .net-pay-label { font-size: 14px; opacity: 0.9; }
                        .net-pay-amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
                        .net-pay-words { font-size: 12px; opacity: 0.8; font-style: italic; }
                        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
                        .footer-note { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-style: italic; }
                        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        windowPrint.document.close();
        windowPrint.focus();
        windowPrint.print();
        windowPrint.close();
    };

    const handleDownloadPDF = () => {
        const printContent = printRef.current;
        const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        windowPrint.document.write(`
            <html>
                <head>
                    <title>Payslip_${payslip?.payslipNumber}_${payslip?.payPeriod?.monthName}_${payslip?.payPeriod?.year}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; background: white; }
                        .payslip { max-width: 800px; margin: 0 auto; border: 2px solid #1e40af; background: white; }
                        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
                        .company-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
                        .payslip-title { font-size: 18px; letter-spacing: 4px; opacity: 0.9; margin-top: 10px; }
                        .payslip-number { font-size: 14px; opacity: 0.8; margin-top: 10px; }
                        .employee-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 25px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                        .info-group { display: grid; grid-template-columns: 120px 1fr; gap: 5px; font-size: 14px; }
                        .info-label { color: #64748b; }
                        .info-value { font-weight: 500; color: #1e293b; }
                        .period-banner { background: #1e293b; color: white; text-align: center; padding: 12px; font-size: 16px; font-weight: 600; }
                        .salary-section { display: grid; grid-template-columns: 1fr 1fr; }
                        .earnings, .deductions { padding: 20px; }
                        .earnings { border-right: 1px solid #e2e8f0; }
                        .section-title { font-size: 16px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid; margin-bottom: 15px; }
                        .earnings .section-title { color: #16a34a; border-color: #16a34a; }
                        .deductions .section-title { color: #dc2626; border-color: #dc2626; }
                        .salary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                        .salary-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid; padding-top: 15px; margin-top: 10px; }
                        .earnings .salary-row.total { border-color: #16a34a; color: #16a34a; }
                        .deductions .salary-row.total { border-color: #dc2626; color: #dc2626; }
                        .net-pay-section { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 25px; text-align: center; }
                        .net-pay-label { font-size: 14px; opacity: 0.9; }
                        .net-pay-amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
                        .net-pay-words { font-size: 12px; opacity: 0.8; font-style: italic; }
                        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
                        .footer-note { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-style: italic; }
                        @media print { 
                            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } 
                            @page { size: A4; margin: 10mm; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                    <script>
                        // Automatically trigger print dialog (user can save as PDF)
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        windowPrint.document.close();
        toast.success('Use "Save as PDF" option in the print dialog to download');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!payslip) {
        return (
            <div className="text-center py-12">
                <p className="text-secondary-500">Payslip not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/payroll')} className="p-2 hover:bg-secondary-100 rounded-lg">
                        <HiOutlineArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="page-title">Payslip</h1>
                        <p className="text-secondary-500 mt-1">{payslip.payslipNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="btn-secondary">
                        <HiOutlinePrinter className="w-4 h-4" />
                        Print
                    </button>
                    <button onClick={handleDownloadPDF} className="btn-primary">
                        <HiOutlineDownload className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Payslip Content */}
            <div className="card overflow-hidden" ref={printRef}>
                <div className="payslip">
                    {/* Company Header */}
                    <div className="bg-gradient-to-r from-primary-700 to-primary-500 text-white p-8 text-center">
                        <h1 className="text-2xl font-bold">{payslip.companyDetails?.name || 'WEIntegrity Solutions'}</h1>
                        <p className="text-primary-100 mt-1">{payslip.companyDetails?.address || 'Hyderabad, Telangana, India'}</p>
                        <div className="mt-4">
                            <span className="inline-block px-4 py-1 bg-white bg-opacity-20 rounded-full text-sm tracking-widest">
                                PAYSLIP
                            </span>
                        </div>
                        <p className="text-primary-200 text-sm mt-3">{payslip.payslipNumber}</p>
                    </div>

                    {/* Employee Details */}
                    <div className="grid md:grid-cols-2 gap-6 p-6 bg-secondary-50 border-b border-secondary-200">
                        <div className="space-y-3">
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">Employee Name</span>
                                <span className="font-medium text-secondary-900">{payslip.employeeDetails?.name}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">Employee ID</span>
                                <span className="font-medium text-secondary-900">{payslip.employeeDetails?.employeeCode}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">Department</span>
                                <span className="font-medium text-secondary-900">{payslip.employeeDetails?.department || '-'}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">Designation</span>
                                <span className="font-medium text-secondary-900">{payslip.employeeDetails?.designation || '-'}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">Bank Name</span>
                                <span className="font-medium text-secondary-900">{payslip.employeeDetails?.bankName || '-'}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">Account No.</span>
                                <span className="font-medium text-secondary-900">
                                    {payslip.employeeDetails?.accountNumber ?
                                        `XXXX${payslip.employeeDetails.accountNumber.slice(-4)}` : '-'}
                                </span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">PAN</span>
                                <span className="font-medium text-secondary-900">{payslip.employeeDetails?.panNumber || '-'}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-secondary-500 text-sm">UAN</span>
                                <span className="font-medium text-secondary-900">{payslip.employeeDetails?.uanNumber || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pay Period */}
                    <div className="bg-secondary-800 text-white text-center py-3 font-semibold">
                        Pay Period: {payslip.payPeriod?.monthName} {payslip.payPeriod?.year}
                    </div>

                    {/* Attendance Summary */}
                    <div className="grid grid-cols-5 text-center py-4 bg-white border-b border-secondary-200">
                        <div>
                            <p className="text-lg font-bold text-secondary-900">{payslip.attendance?.totalDays}</p>
                            <p className="text-xs text-secondary-500">Total Days</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-secondary-900">{payslip.attendance?.workingDays}</p>
                            <p className="text-xs text-secondary-500">Working Days</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-green-600">{payslip.attendance?.daysWorked}</p>
                            <p className="text-xs text-secondary-500">Days Worked</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-yellow-600">{payslip.attendance?.leaveTaken}</p>
                            <p className="text-xs text-secondary-500">Leave</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-red-600">{payslip.attendance?.lopDays}</p>
                            <p className="text-xs text-secondary-500">LOP</p>
                        </div>
                    </div>

                    {/* Earnings & Deductions */}
                    <div className="grid md:grid-cols-2">
                        {/* Earnings */}
                        <div className="p-6 border-r border-secondary-200">
                            <h3 className="text-lg font-semibold text-green-600 border-b-2 border-green-500 pb-2 mb-4">
                                Earnings
                            </h3>
                            <div className="space-y-3">
                                {payslip.earnings?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-secondary-600">{item.component}</span>
                                        <span className="font-medium text-secondary-900">{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-6 pt-4 border-t-2 border-green-500">
                                <span className="font-bold text-green-700">Total Earnings</span>
                                <span className="font-bold text-green-700">{formatCurrency(payslip.totalEarnings)}</span>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-red-600 border-b-2 border-red-500 pb-2 mb-4">
                                Deductions
                            </h3>
                            <div className="space-y-3">
                                {payslip.deductions?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-secondary-600">{item.component}</span>
                                        <span className="font-medium text-secondary-900">{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-6 pt-4 border-t-2 border-red-500">
                                <span className="font-bold text-red-700">Total Deductions</span>
                                <span className="font-bold text-red-700">{formatCurrency(payslip.totalDeductions)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Pay */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-8 text-center">
                        <p className="text-primary-100 text-sm">Net Salary Payable</p>
                        <p className="text-4xl font-bold mt-2">{formatCurrency(payslip.netPay)}</p>
                        <p className="text-primary-200 text-sm mt-2 italic">{payslip.netPayInWords}</p>
                    </div>

                    {/* Footer */}
                    <div className="p-6 text-center text-sm text-secondary-500 border-t border-secondary-200">
                        <p>This is a computer-generated payslip and does not require a signature.</p>
                        <p className="mt-2">Generated on: {new Date(payslip.generatedAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })}</p>
                        <p className="mt-4 pt-4 border-t border-dashed border-secondary-300 italic text-xs">
                            For any queries, please contact HR Department
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayslipView;
