import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Layout from './components/Layout';

// Auth Pages
// Auth Pages
import Login from './pages/auth/Login';
import VerifyEmail from './pages/VerifyEmail';
import ResendVerification from './pages/ResendVerification';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Dashboard
import Dashboard from './pages/Dashboard';

// Employee Pages
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeDetails from './pages/employees/EmployeeDetails';
import AddEmployee from './pages/employees/AddEmployee';

// Attendance
import Attendance from './pages/attendance/Attendance';

// Leave
import LeaveList from './pages/leave/LeaveList';
import ApplyLeave from './pages/leave/ApplyLeave';

// Payroll
import PayrollList from './pages/payroll/PayrollList';
import PayslipView from './pages/payroll/PayslipView';
import MyPayslips from './pages/payroll/MyPayslips';

// Recruitment
import RecruitmentList from './pages/recruitment/RecruitmentList';
import JobDetails from './pages/recruitment/JobDetails';

// Performance
import PerformanceList from './pages/performance/PerformanceList';

// Training
import TrainingList from './pages/training/TrainingList';

// Documents
import DocumentList from './pages/documents/DocumentList';

// Compliance
import ComplianceList from './pages/compliance/ComplianceList';

// Reports
import Reports from './pages/reports/Reports';

// Settings
import Settings from './pages/settings/Settings';
import HolidayManagement from './pages/settings/HolidayManagement';
import AuditTrail from './pages/settings/AuditTrail';

// Organization
import DepartmentList from './pages/organization/DepartmentList';
import DesignationList from './pages/organization/DesignationList';

import ShiftList from './pages/organization/ShiftList';

// Enhanced Payroll
import TaxDeclaration from './pages/payroll/TaxDeclaration';
import ReimbursementList from './pages/payroll/ReimbursementList';
import LoanList from './pages/payroll/LoanList';

// Profile
import Profile from './pages/Profile';

// Notifications
import Notifications from './pages/Notifications';

// Projects
import ProjectList from './pages/projects/ProjectList';
import AddProject from './pages/projects/AddProject';
import ProjectDetails from './pages/projects/ProjectDetails';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/resend-verification" element={<ResendVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <NotificationProvider>
                <Layout />
              </NotificationProvider>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Employees - Restricted to HRManager, HRExecutive, DepartmentManager */}
            <Route path="employees" element={
              <RoleBasedRoute module="employees">
                <EmployeeList />
              </RoleBasedRoute>
            } />
            <Route path="employees/add" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'HRExecutive']}>
                <AddEmployee />
              </RoleBasedRoute>
            } />
            <Route path="employees/:id" element={
              <RoleBasedRoute module="employees">
                <EmployeeDetails />
              </RoleBasedRoute>
            } />

            {/* Attendance - Available to all roles */}
            <Route path="attendance" element={
              <RoleBasedRoute module="attendance">
                <Attendance />
              </RoleBasedRoute>
            } />

            {/* Leave - Available to all roles */}
            <Route path="leave" element={
              <RoleBasedRoute module="leaves">
                <LeaveList />
              </RoleBasedRoute>
            } />
            <Route path="leave/apply" element={
              <RoleBasedRoute module="leaves">
                <ApplyLeave />
              </RoleBasedRoute>
            } />

            {/* Payroll - Available to HRManager, PayrollOfficer, and Employee (view only) */}
            <Route path="payroll" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'PayrollOfficer', 'Employee']}>
                <PayrollList />
              </RoleBasedRoute>
            } />
            <Route path="payroll/payslip/:id" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'PayrollOfficer', 'Employee']}>
                <PayslipView />
              </RoleBasedRoute>
            } />
            <Route path="payroll/my-payslips" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'PayrollOfficer', 'Employee']}>
                <MyPayslips />
              </RoleBasedRoute>
            } />

            {/* Performance - Available to all roles */}
            <Route path="performance" element={
              <RoleBasedRoute module="performance">
                <PerformanceList />
              </RoleBasedRoute>
            } />

            {/* Training - Available to all/mostly employees */}
            <Route path="training" element={
              <RoleBasedRoute module="training">
                <TrainingList />
              </RoleBasedRoute>
            } />

            {/* Documents - Available to all */}
            <Route path="documents" element={
              <RoleBasedRoute module="documents">
                <DocumentList />
              </RoleBasedRoute>
            } />

            {/* Compliance - Available to HR/Admin */}
            <Route path="compliance" element={
              <RoleBasedRoute module="compliance">
                <ComplianceList />
              </RoleBasedRoute>
            } />

            {/* Reports - Available to HR/Admin */}
            <Route path="reports" element={
              <RoleBasedRoute module="reports">
                <Reports />
              </RoleBasedRoute>
            } />

            {/* Recruitment - Restricted to HRManager, HRExecutive */}
            <Route path="recruitment" element={
              <RoleBasedRoute module="recruitment">
                <RecruitmentList />
              </RoleBasedRoute>
            } />
            <Route path="recruitment/:id" element={
              <RoleBasedRoute module="recruitment">
                <JobDetails />
              </RoleBasedRoute>
            } />

            {/* Settings - Available to Admin/HR */}
            <Route path="settings" element={
              <RoleBasedRoute module="settings">
                <Settings />
              </RoleBasedRoute>
            } />
            <Route path="settings/holidays" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'HRExecutive']}>
                <HolidayManagement />
              </RoleBasedRoute>
            } />
            <Route path="settings/audit" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager']}>
                <AuditTrail />
              </RoleBasedRoute>
            } />

            {/* Organization Management */}
            <Route path="organization/departments" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'HRExecutive']}>
                <DepartmentList />
              </RoleBasedRoute>
            } />
            <Route path="organization/designations" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'HRExecutive']}>
                <DesignationList />
              </RoleBasedRoute>
            } />

            <Route path="organization/shifts" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'HRExecutive']}>
                <ShiftList />
              </RoleBasedRoute>
            } />

            {/* Enhanced Payroll */}
            <Route path="payroll/tax-declaration" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'PayrollOfficer', 'Employee']}>
                <TaxDeclaration />
              </RoleBasedRoute>
            } />
            <Route path="payroll/reimbursements" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'PayrollOfficer', 'Employee']}>
                <ReimbursementList />
              </RoleBasedRoute>
            } />
            <Route path="payroll/loans" element={
              <RoleBasedRoute allowedRoles={['admin', 'HRManager', 'PayrollOfficer', 'Employee']}>
                <LoanList />
              </RoleBasedRoute>
            } />

            {/* Projects */}
            <Route path="projects" element={
              <RoleBasedRoute module="projects">
                <ProjectList />
              </RoleBasedRoute>
            } />
            <Route path="projects/add" element={
              <RoleBasedRoute module="projects" allowedRoles={['admin', 'HRManager', 'HRExecutive']}>
                <AddProject />
              </RoleBasedRoute>
            } />
            <Route path="projects/:id" element={
              <RoleBasedRoute module="projects">
                <ProjectDetails />
              </RoleBasedRoute>
            } />

            {/* Profile - Available to all */}
            <Route path="profile" element={<Profile />} />

            {/* Notifications - Available to all */}
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
