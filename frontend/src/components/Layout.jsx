import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getImageUrl } from '../utils/imageUrl';
import {
    FiHome,
    FiUsers,
    FiCalendar,
    FiClock,
    FiDollarSign,
    FiTrendingUp,
    FiBookOpen,
    FiFileText,
    FiShield,
    FiBarChart2,
    FiBriefcase,
    FiSettings,
    FiMenu,
    FiX,
    FiBell,
    FiLogOut,
    FiUser,
    FiChevronDown,
    FiGrid,
    FiMapPin,
    FiAward,
    FiLayers,
    FiGlobe
} from 'react-icons/fi';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
    const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
    const { user, logout } = useAuth();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Define navigation items with role-based access
    const navigationItems = [
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: FiHome,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee']
        },
        {
            name: 'Employees',
            path: '/employees',
            icon: FiUsers,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager']
        },
        {
            name: 'Attendance',
            path: '/attendance',
            icon: FiClock,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee']
        },
        {
            name: 'Leave',
            path: '/leave',
            icon: FiCalendar,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee']
        },
        {
            name: 'Payroll',
            path: '/payroll',
            icon: FiDollarSign,
            roles: ['admin', 'HRManager', 'PayrollOfficer', 'Employee']
        },
        {
            name: 'Performance',
            path: '/performance',
            icon: FiTrendingUp,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee']
        },
        {
            name: 'Training',
            path: '/training',
            icon: FiBookOpen,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee']
        },
        {
            name: 'Documents',
            path: '/documents',
            icon: FiFileText,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee']
        },
        {
            name: 'Recruitment',
            path: '/recruitment',
            icon: FiBriefcase,
            roles: ['admin', 'HRManager', 'HRExecutive']
        },
        {
            name: 'Compliance',
            path: '/compliance',
            icon: FiShield,
            roles: ['admin', 'HRManager', 'HRExecutive', 'Employee']
        },
        {
            name: 'Reports',
            path: '/reports',
            icon: FiBarChart2,
            roles: ['admin', 'HRManager', 'HRExecutive', 'PayrollOfficer']
        },
        {
            name: 'Projects',
            path: '/projects',
            icon: FiBriefcase,
            roles: ['admin', 'HRManager', 'HRExecutive', 'DepartmentManager', 'PayrollOfficer', 'Employee', 'hr', 'manager', 'employee']
        }
    ];

    // Organization submenu items
    const organizationItems = [
        { name: 'Departments', path: '/organization/departments', icon: FiGrid },
        { name: 'Designations', path: '/organization/designations', icon: FiMapPin },

        { name: 'Shifts', path: '/organization/shifts', icon: FiLayers }
    ];

    // Filter navigation items based on user role
    const filteredNavItems = navigationItems.filter(item =>
        item.roles.includes(user?.role)
    );

    const canAccessOrganization = ['admin', 'HRManager', 'HRExecutive', 'PayrollOfficer'].includes(user?.role);
    const canAccessSettings = ['admin', 'HRManager', 'HRExecutive'].includes(user?.role);

    return (
        <div className="min-h-screen">
            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200 shadow-xl transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'
                    } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-20 px-4 mb-2">
                    <div
                        className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center w-full cursor-pointer' : ''}`}
                        onClick={() => !sidebarOpen && setSidebarOpen(true)}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 shadow-lg shadow-primary-500/30 flex items-center justify-center transform transition-transform hover:scale-105">
                            <span className="text-white font-bold text-xl">W</span>
                        </div>
                        {sidebarOpen && (
                            <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">WEIntegrity</span>
                        )}
                    </div>
                    {sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                        >
                            <FiMenu className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-5rem)] custom-scrollbar">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive
                                    ? 'bg-gradient-to-r from-primary-50 to-white/50 text-primary-600 font-semibold shadow-sm border border-primary-100/50'
                                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900 hover:shadow-sm'
                                } ${!sidebarOpen ? 'justify-center' : ''}`
                            }
                            title={!sidebarOpen ? item.name : undefined}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                            {sidebarOpen && <span>{item.name}</span>}
                        </NavLink>
                    ))}

                    {/* Organization Section */}
                    {canAccessOrganization && (
                        <>
                            <div className={`pt-6 pb-2 ${sidebarOpen ? 'px-3' : 'px-0 text-center'}`}>
                                {sidebarOpen && (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                        Organization
                                    </span>
                                )}
                            </div>
                            {organizationItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-gradient-to-r from-primary-50 to-white/50 text-primary-600 font-semibold shadow-sm border border-primary-100/50'
                                            : 'text-slate-500 hover:bg-white/50 hover:text-slate-900 hover:shadow-sm'
                                        } ${!sidebarOpen ? 'justify-center' : ''}`
                                    }
                                    title={!sidebarOpen ? item.name : undefined}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                                    {sidebarOpen && <span>{item.name}</span>}
                                </NavLink>
                            ))}
                        </>
                    )}

                    {/* Settings */}
                    {canAccessSettings && (
                        <>
                            <div className={`pt-6 pb-2 ${sidebarOpen ? 'px-3' : 'px-0 text-center'}`}>
                                {sidebarOpen && (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                        System
                                    </span>
                                )}
                            </div>
                            <NavLink
                                to="/settings"
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${isActive
                                        ? 'bg-gradient-to-r from-primary-50 to-white/50 text-primary-600 font-semibold shadow-sm border border-primary-100/50'
                                        : 'text-slate-500 hover:bg-white/50 hover:text-slate-900 hover:shadow-sm'
                                    } ${!sidebarOpen ? 'justify-center' : ''}`
                                }
                                title={!sidebarOpen ? 'Settings' : undefined}
                            >
                                <FiSettings className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                                {sidebarOpen && <span>Settings</span>}
                            </NavLink>
                        </>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Header */}
                <header className="sticky top-0 z-30 h-20 bg-white border-b border-slate-200">
                    <div className="flex items-center justify-between h-full px-6 lg:px-8">
                        {/* Left side - Mobile menu button */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                {mobileMenuOpen ? (
                                    <FiX className="w-6 h-6 text-slate-600" />
                                ) : (
                                    <FiMenu className="w-6 h-6 text-slate-600" />
                                )}
                            </button>

                            {/* Page Title */}
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 capitalize tracking-tight">
                                {location.pathname.split('/')[1] || 'Dashboard'}
                            </h1>
                        </div>

                        {/* Right side - Notifications & Profile */}
                        <div className="flex items-center gap-4">
                            {/* Modules */}
                            <div
                                className="relative hidden sm:block"
                                onMouseEnter={() => {
                                    setModuleDropdownOpen(true);
                                    setNotificationDropdownOpen(false);
                                    setProfileDropdownOpen(false);
                                }}
                                onMouseLeave={() => setModuleDropdownOpen(false)}
                            >
                                <button
                                    onClick={() => {
                                        setModuleDropdownOpen(!moduleDropdownOpen);
                                        setNotificationDropdownOpen(false);
                                        setProfileDropdownOpen(false);
                                    }}
                                    className="relative p-2.5 rounded-xl text-slate-500 hover:bg-white/80 hover:text-primary-600 hover:shadow-sm transition-all border border-transparent hover:border-white/50"
                                    title="Company Modules"
                                >
                                    <FiGrid className="w-5 h-5" />
                                </button>

                                {/* Modules Dropdown */}
                                {moduleDropdownOpen && (
                                    <div className="absolute right-0 top-full pt-3 z-50">
                                        <div className="w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 animate-scaleIn origin-top-right ring-1 ring-black/5">
                                            <div className="px-5 py-3 border-b border-slate-100/50 flex items-center justify-between">
                                                <h3 className="font-semibold text-slate-900 text-sm">App Modules</h3>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">All Access</span>
                                            </div>
                                            <div className="py-1">
                                                {/* HR Module */}
                                                <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                        <FiUsers className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">HR Portal</span>
                                                </div>
                                                {/* Finance Module */}
                                                <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                                        <FiDollarSign className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">Finance</span>
                                                </div>
                                                {/* Operations Module */}
                                                <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                                                        <FiLayers className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 group-hover:text-amber-600 transition-colors">Operations</span>
                                                </div>
                                                {/* Learning Module */}
                                                <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                                        <FiBookOpen className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 group-hover:text-purple-600 transition-colors">Learning</span>
                                                </div>
                                                {/* Projects Module (PPM) */}
                                                <a
                                                    href="https://www.yognito.com/#/stories"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                                                        <FiBriefcase className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 group-hover:text-sky-600 transition-colors">PPM Dashboard</span>
                                                </a>
                                                {/* Company Website */}
                                                <a
                                                    href="https://www.yognito.com"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                                                        <FiGlobe className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 group-hover:text-teal-600 transition-colors">Company Website</span>
                                                </a>
                                                {/* IT Support Module */}
                                                <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group">
                                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                                        <FiShield className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 group-hover:text-rose-600 transition-colors">IT Support</span>
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-100/50 mt-1 px-2 py-2">
                                                <button className="w-full py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                                                    App Catalog
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notifications */}
                            <div
                                className="relative"
                                onMouseEnter={() => {
                                    setNotificationDropdownOpen(true);
                                    setProfileDropdownOpen(false);
                                    setModuleDropdownOpen(false);
                                }}
                                onMouseLeave={() => setNotificationDropdownOpen(false)}
                            >
                                <button
                                    onClick={() => {
                                        setNotificationDropdownOpen(!notificationDropdownOpen);
                                        setProfileDropdownOpen(false);
                                        setModuleDropdownOpen(false);
                                    }}
                                    className="relative p-2.5 rounded-xl text-slate-500 hover:bg-white/80 hover:text-primary-600 hover:shadow-sm transition-all border border-transparent hover:border-white/50"
                                >
                                    <FiBell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {notificationDropdownOpen && (
                                    <div className="absolute right-0 top-full pt-3 z-50">
                                        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 animate-scaleIn origin-top-right ring-1 ring-black/5">
                                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100/50">
                                                <h3 className="font-semibold text-slate-900">Notifications</h3>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                                {notifications?.length > 0 ? (
                                                    notifications.slice(0, 5).map((notification) => (
                                                        <div
                                                            key={notification._id}
                                                            onClick={() => markAsRead(notification._id)}
                                                            className={`px-5 py-4 hover:bg-slate-50/80 cursor-pointer border-b border-slate-50 last:border-0 ${!notification.read ? 'bg-primary-50/30' : ''
                                                                }`}
                                                        >
                                                            <p className="text-sm text-slate-800 leading-snug">{notification.message}</p>
                                                            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                                                <FiClock className="w-3 h-3" />
                                                                {new Date(notification.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-5 py-8 text-center text-slate-400">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                            <FiBell className="w-5 h-5 text-slate-300" />
                                                        </div>
                                                        <p className="text-sm">No new notifications</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="border-t border-slate-100/50 px-2 py-2">
                                                <button
                                                    onClick={() => {
                                                        navigate('/notifications');
                                                        setNotificationDropdownOpen(false);
                                                    }}
                                                    className="w-full py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl font-medium transition-colors"
                                                >
                                                    View all notifications
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile Dropdown */}
                            <div
                                className="relative"
                                onMouseEnter={() => {
                                    setProfileDropdownOpen(true);
                                    setNotificationDropdownOpen(false);
                                    setModuleDropdownOpen(false);
                                }}
                                onMouseLeave={() => setProfileDropdownOpen(false)}
                            >
                                <button
                                    onClick={() => {
                                        setProfileDropdownOpen(!profileDropdownOpen);
                                        setNotificationDropdownOpen(false);
                                        setModuleDropdownOpen(false);
                                    }}
                                    className="flex items-center gap-3 pl-1 pr-3 py-1 bg-white/50 hover:bg-white/80 border border-white/50 hover:border-white rounded-full shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                    {user?.profilePicture ? (
                                        <img
                                            src={getImageUrl(user.profilePicture)}
                                            alt={user.name}
                                            className="w-9 h-9 rounded-full object-cover ring-2 ring-white"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-white">
                                            <span className="text-white font-bold text-sm">
                                                {user?.firstName ? (user.firstName.charAt(0) + (user.lastName?.charAt(0) || '')).toUpperCase() : (user?.name?.charAt(0) || 'U').toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="hidden md:block text-left pr-1">
                                        <p className="text-sm font-semibold text-slate-800 leading-none">{(user?.name || user?.firstName || 'User').split(' ')[0]}</p>
                                        <p className="text-[10px] uppercase tracking-wider font-medium text-slate-500 mt-0.5">{user?.role}</p>
                                    </div>
                                    <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 hidden md:block ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Profile Dropdown Menu */}
                                {profileDropdownOpen && (
                                    <div className="absolute right-0 top-full pt-3 z-50">
                                        <div className="w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 animate-scaleIn origin-top-right ring-1 ring-black/5">
                                            <div className="px-5 py-4 border-b border-slate-100/50 flex items-center gap-3">
                                                {user?.profilePicture ? (
                                                    <img
                                                        src={getImageUrl(user.profilePicture)}
                                                        alt={user.name}
                                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-white shadow-sm">
                                                        <span className="text-white font-bold">
                                                            {user?.firstName ? (user.firstName.charAt(0) + (user.lastName?.charAt(0) || '')).toUpperCase() : (user?.name?.charAt(0) || 'U').toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-slate-900">{user?.name}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[140px]">{user?.email}</p>
                                                </div>
                                            </div>
                                            <div className="px-2 py-2">
                                                <NavLink
                                                    to="/profile"
                                                    onClick={() => setProfileDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-primary-700 hover:bg-primary-50/50 rounded-xl transition-all"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                                        <FiUser className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium">My Profile</span>
                                                </NavLink>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                                                        <FiLogOut className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium">Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Click outside to close dropdowns */}
            {(profileDropdownOpen || notificationDropdownOpen || moduleDropdownOpen) && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => {
                        setProfileDropdownOpen(false);
                        setNotificationDropdownOpen(false);
                        setModuleDropdownOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default Layout;
