import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessModule } from '../utils/permissions';

/**
 * RoleBasedRoute - A component that restricts access to routes based on user role
 * 
 * @param {ReactNode} children - The component to render if access is allowed
 * @param {string} module - The module name to check access for
 * @param {string[]} allowedRoles - Optional array of specific roles that can access this route
 * @param {string} redirectTo - Optional redirect path if access is denied (default: /dashboard)
 */
const RoleBasedRoute = ({
    children,
    module,
    allowedRoles = null,
    redirectTo = '/dashboard'
}) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-secondary-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user role is in the allowed roles list
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={redirectTo} replace />;
    }

    // Check if user can access the module
    if (module && !canAccessModule(user.role, module)) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
};

export default RoleBasedRoute;
