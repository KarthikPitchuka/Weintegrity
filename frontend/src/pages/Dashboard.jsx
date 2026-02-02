import { useAuth } from '../context/AuthContext';
import {
    HRManagerDashboard,
    HRExecutiveDashboard,
    DepartmentManagerDashboard,
    PayrollOfficerDashboard,
    EmployeeDashboard
} from './dashboards';

/**
 * Main Dashboard component that renders role-specific dashboards
 * Each role gets a customized view based on their permissions:
 * 
 * - HRManager: Full HR operations control
 * - HRExecutive: Recruitment and daily HR tasks
 * - DepartmentManager: Team management
 * - PayrollOfficer: Salary and statutory compliance
 * - Employee: Self-service features
 */
const Dashboard = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-secondary-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // Render role-specific dashboard based on user role
    const renderDashboard = () => {
        switch (user?.role) {
            case 'admin':
            case 'HRManager':
                return <HRManagerDashboard user={user} />;

            case 'HRExecutive':
                return <HRExecutiveDashboard user={user} />;

            case 'DepartmentManager':
                return <DepartmentManagerDashboard user={user} />;

            case 'PayrollOfficer':
                return <PayrollOfficerDashboard user={user} />;

            case 'Employee':
            default:
                return <EmployeeDashboard user={user} />;
        }
    };

    return (
        <div className="animate-fadeIn">
            {renderDashboard()}
        </div>
    );
};

export default Dashboard;
