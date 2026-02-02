import { HiOutlineChartPie, HiOutlineDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Reports = () => {
    const reportTypes = [
        { title: 'Attendance Report', description: 'Monthly attendance summary for all employees', type: 'Monthly' },
        { title: 'Payroll Summary', description: 'Detailed payroll breakdown and expenses', type: 'Financial' },
        { title: 'Leave Utilization', description: 'Analysis of leave patterns and balances', type: 'HR' },
        { title: 'Employee Turnover', description: 'Hiring and attrition metrics', type: 'HR' },
    ];

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
                                <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold uppercase tracking-wider">{report.type}</span>
                                <HiOutlineChartPie className="w-6 h-6 text-secondary-400" />
                            </div>
                            <h3 className="font-bold text-lg text-secondary-900 mb-2">{report.title}</h3>
                            <p className="text-secondary-500 text-sm">{report.description}</p>
                        </div>
                        <button
                            onClick={() => toast.success(`${report.title} generation started. You will be notified when ready.`, {
                                icon: '📥',
                                style: {
                                    borderRadius: '10px',
                                    background: '#333',
                                    color: '#fff',
                                },
                            })}
                            className="flex items-center gap-2 text-primary-600 font-medium hover:text-primary-800 transition-colors mt-4 text-sm group"
                        >
                            <HiOutlineDownload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Generate Report
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
