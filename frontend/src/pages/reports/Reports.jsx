import { useState } from 'react';
import { HiOutlineChartPie, HiOutlineDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Reports = () => {
    const [loading, setLoading] = useState({});

    const reportTypes = [
        {
            title: 'Attendance Report',
            description: 'Monthly attendance summary for all employees',
            type: 'Monthly',
            endpoint: '/reports/attendance',
            requiresMonth: true
        },
        {
            title: 'Payroll Summary',
            description: 'Detailed payroll breakdown and expenses',
            type: 'Financial',
            endpoint: '/reports/payroll',
            requiresMonth: true
        },
        {
            title: 'Leave Utilization',
            description: 'Analysis of leave patterns and balances',
            type: 'HR',
            endpoint: '/reports/leave',
            requiresMonth: false
        },
        {
            title: 'Employee Turnover',
            description: 'Hiring and attrition metrics',
            type: 'HR',
            endpoint: '/reports/turnover',
            requiresMonth: false
        },
    ];

    const handleGenerateReport = async (report) => {
        try {
            setLoading(prev => ({ ...prev, [report.title]: true }));
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;

            const response = await api.get(report.endpoint, {
                params: { year, month },
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Filename
            const filename = report.requiresMonth
                ? `${report.title.replace(/\s+/g, '_')}_${year}_${month}.csv`
                : `${report.title.replace(/\s+/g, '_')}_${year}.csv`;

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success(`${report.title} downloaded successfully`);
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to generate report');
        } finally {
            setLoading(prev => ({ ...prev, [report.title]: false }));
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Reports & Analytics</h1>
                    <p className="text-secondary-500 mt-1">Generate and view detailed organizational reports</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {reportTypes.map((report, idx) => (
                    <div key={idx} className="card p-6 flex flex-col justify-between h-48 hover:shadow-card-hover transition-all duration-300">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${report.type === 'Financial' ? 'bg-green-100 text-green-700' :
                                    report.type === 'HR' ? 'bg-purple-100 text-purple-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {report.type}
                                </span>
                                <div className="p-2 bg-secondary-50 rounded-lg">
                                    <HiOutlineChartPie className="w-5 h-5 text-secondary-400" />
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-secondary-900 mb-2">{report.title}</h3>
                            <p className="text-secondary-500 text-sm">{report.description}</p>
                        </div>
                        <button
                            onClick={() => handleGenerateReport(report)}
                            disabled={loading[report.title]}
                            className="flex items-center gap-2 text-primary-600 font-medium hover:text-primary-800 transition-colors mt-4 text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading[report.title] ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <HiOutlineDownload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>Generate Report</span>
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
