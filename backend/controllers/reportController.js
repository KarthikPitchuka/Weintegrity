import Attendance from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';
import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import { generateCSV } from '../utils/csvGenerator.js';

export const generateAttendanceReport = async (req, res) => {
    try {
        const { year, month } = req.query;
        // Default to current month if not provided
        const reportYear = year ? parseInt(year) : new Date().getFullYear();
        const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // 0-based

        const startDate = new Date(reportYear, reportMonth, 1);
        const endDate = new Date(reportYear, reportMonth + 1, 0);

        const attendances = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        })
            .populate('employeeId', 'employeeCode personalInfo.firstName personalInfo.lastName employmentInfo.department')
            .sort({ date: 1 });

        const data = attendances.map(record => ({
            'Employee Code': record.employeeId?.employeeCode || 'N/A',
            'Employee Name': `${record.employeeId?.personalInfo?.firstName} ${record.employeeId?.personalInfo?.lastName}`,
            'Department': record.employeeId?.employmentInfo?.department || 'N/A',
            'Date': new Date(record.date).toLocaleDateString(),
            'Check In': record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString() : 'N/A',
            'Check Out': record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString() : 'N/A',
            'Status': record.status,
            'Work Hours': record.workHours ? record.workHours.toFixed(2) : '0',
            'Overtime Hours': record.overtimeHours ? record.overtimeHours.toFixed(2) : '0',
            'Remarks': record.remarks || ''
        }));

        const headers = ['Employee Code', 'Employee Name', 'Department', 'Date', 'Check In', 'Check Out', 'Status', 'Work Hours', 'Overtime Hours', 'Remarks'];
        const csv = generateCSV(data, headers);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Attendance_Report_${reportYear}_${reportMonth + 1}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Error generating attendance report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};

export const generatePayrollReport = async (req, res) => {
    try {
        const { year, month } = req.query;
        // Require specific month for payroll
        if (!year || !month) {
            return res.status(400).json({ message: 'Year and month are required for payroll report' });
        }

        const reportYear = parseInt(year);
        const reportMonth = parseInt(month);

        const payrolls = await Payroll.find({
            'payPeriod.year': reportYear,
            'payPeriod.month': reportMonth
        })
            .populate('employeeId', 'employeeCode personalInfo.firstName personalInfo.lastName employmentInfo.designation')
            .sort({ 'employeeCode': 1 });

        const data = payrolls.map(record => ({
            'Employee Code': record.employeeId?.employeeCode || 'N/A',
            'Employee Name': `${record.employeeId?.personalInfo?.firstName} ${record.employeeId?.personalInfo?.lastName}`,
            'Designation': record.employeeId?.employmentInfo?.designation || 'N/A',
            'Basic Pay': record.earnings.basicPay || 0,
            'HRA': record.earnings.hra || 0,
            'DA': record.earnings.da || 0,
            'Conveyance': record.earnings.conveyanceAllowance || 0,
            'Medical': record.earnings.medicalAllowance || 0,
            'Special Allowance': record.earnings.specialAllowance || 0,
            'Overtime': record.earnings.overtimeAmount || 0,
            'Bonus': record.earnings.bonus || 0,
            'Gross Earnings': record.grossEarnings || 0,
            'PF': record.deductions.pf || 0,
            'Professional Tax': record.deductions.professionalTax || 0,
            'Income Tax': record.deductions.incomeTax || 0,
            'Loan Deduction': record.deductions.loanDeduction || 0,
            'Total Deductions': record.totalDeductions || 0,
            'Net Salary': record.netSalary || 0,
            'Payment Mode': record.paymentDetails?.mode || 'N/A',
            'Status': record.status
        }));

        const headers = [
            'Employee Code', 'Employee Name', 'Designation',
            'Basic Pay', 'HRA', 'DA', 'Conveyance', 'Medical', 'Special Allowance', 'Overtime', 'Bonus', 'Gross Earnings',
            'PF', 'Professional Tax', 'Income Tax', 'Loan Deduction', 'Total Deductions',
            'Net Salary', 'Payment Mode', 'Status'
        ];
        const csv = generateCSV(data, headers);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Payroll_Summary_${reportYear}_${reportMonth}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Error generating payroll report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};

export const generateLeaveReport = async (req, res) => {
    try {
        const { year } = req.query;
        const reportYear = year ? parseInt(year) : new Date().getFullYear();
        const startDate = new Date(reportYear, 0, 1);
        const endDate = new Date(reportYear, 11, 31);

        const leaves = await Leave.find({
            startDate: { $gte: startDate, $lte: endDate }
        })
            .populate('employeeId', 'employeeCode personalInfo.firstName personalInfo.lastName employmentInfo.department')
            .populate('leaveType', 'name')
            .sort({ startDate: 1 });

        const data = leaves.map(record => ({
            'Employee Code': record.employeeId?.employeeCode || 'N/A',
            'Employee Name': `${record.employeeId?.personalInfo?.firstName} ${record.employeeId?.personalInfo?.lastName}`,
            'Department': record.employeeId?.employmentInfo?.department || 'N/A',
            'Leave Type': record.leaveType?.name || 'Unknown',
            'Start Date': new Date(record.startDate).toLocaleDateString(),
            'End Date': new Date(record.endDate).toLocaleDateString(),
            'Days': record.numberOfDays,
            'Reason': record.reason || '',
            'Status': record.status,
            'Applied On': new Date(record.appliedOn).toLocaleDateString()
        }));

        const headers = ['Employee Code', 'Employee Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Applied On'];
        const csv = generateCSV(data, headers);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Leave_Utilization_${reportYear}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Error generating leave report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};

export const generateTurnoverReport = async (req, res) => {
    try {
        const { year } = req.query;
        const reportYear = year ? parseInt(year) : new Date().getFullYear();
        const startDate = new Date(reportYear, 0, 1);
        const endDate = new Date(reportYear, 11, 31);

        // Find employees who joined or left in the year
        const employees = await Employee.find({
            $or: [
                { 'employmentInfo.joiningDate': { $gte: startDate, $lte: endDate } },
                { terminationDate: { $gte: startDate, $lte: endDate } }
            ]
        }).sort({ 'employmentInfo.joiningDate': 1 });

        const data = employees.map(record => ({
            'Employee Code': record.employeeCode || 'N/A',
            'Employee Name': `${record.personalInfo?.firstName} ${record.personalInfo?.lastName}`,
            'Department': record.employmentInfo?.department || 'N/A',
            'Designation': record.employmentInfo?.designation || 'N/A',
            'Joining Date': record.employmentInfo?.joiningDate ? new Date(record.employmentInfo.joiningDate).toLocaleDateString() : 'N/A',
            'Status': record.status,
            'Termination Date': record.terminationDate ? new Date(record.terminationDate).toLocaleDateString() : 'N/A',
            'Termination Reason': record.terminationReason || 'N/A',
            'Tenure (Days)': record.terminationDate && record.employmentInfo?.joiningDate ?
                Math.ceil((new Date(record.terminationDate) - new Date(record.employmentInfo.joiningDate)) / (1000 * 60 * 60 * 24)) : 'Active'
        }));

        const headers = ['Employee Code', 'Employee Name', 'Department', 'Designation', 'Joining Date', 'Status', 'Termination Date', 'Termination Reason', 'Tenure (Days)'];
        const csv = generateCSV(data, headers);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Employee_Turnover_${reportYear}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Error generating turnover report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};
