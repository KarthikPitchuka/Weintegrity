import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    HiOutlineOfficeBuilding,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineGlobeAlt,
    HiOutlineIdentification,
    HiOutlineX,
    HiOutlineClock,
    HiOutlineShieldCheck,
    HiOutlineBell
} from 'react-icons/hi';
import {
    FiCalendar,
    FiFileText,
    FiShield,
    FiUsers,
    FiBell,
    FiLock,
    FiMail,
    FiDatabase,
    FiChevronRight,
    FiSettings as FiSettingsIcon
} from 'react-icons/fi';

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
    const [showRegionalModal, setShowRegionalModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [companyData, setCompanyData] = useState(null);
    const [companyForm, setCompanyForm] = useState({
        name: '',
        // ... (omitting middle part of form for brevity as it's already there)
        settings: {
            defaultStartTime: '09:00',
            defaultEndTime: '18:00',
            graceTime: 15,
            overtimeAllowed: true,
            workingDays: [1, 2, 3, 4, 5, 6],
            currency: 'INR',
            dateFormat: 'DD/MM/YYYY',
            timeZone: 'Asia/Kolkata',
            security: {
                minPasswordLength: 8,
                requireSpecialChar: true,
                requireNumber: true,
                twoFactorAuth: false,
                sessionTimeout: 60
            },
            notifications: {
                emailEnabled: true,
                inAppEnabled: true,
                reminderDays: 2
            }
        }
    });

    const [workingHoursForm, setWorkingHoursForm] = useState({
        defaultStartTime: '09:00',
        defaultEndTime: '18:00',
        graceTime: 15,
        overtimeAllowed: true,
        workingDays: [1, 2, 3, 4, 5, 6]
    });

    const [regionalForm, setRegionalForm] = useState({
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        timeZone: 'Asia/Kolkata'
    });

    const [securityForm, setSecurityForm] = useState({
        minPasswordLength: 8,
        requireSpecialChar: true,
        requireNumber: true,
        twoFactorAuth: false,
        sessionTimeout: 60
    });

    const [notificationsForm, setNotificationsForm] = useState({
        emailEnabled: true,
        inAppEnabled: true,
        reminderDays: 2
    });

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        try {
            setLoading(true);
            const res = await api.get('/organization/companies');
            if (res.data.companies && res.data.companies.length > 0) {
                const company = res.data.companies[0];
                setCompanyData(company);
                setCompanyForm({
                    name: company.name || '',
                    legalName: company.legalName || '',
                    registrationNumber: company.registrationNumber || '',
                    contact: {
                        email: company.contact?.email || '',
                        phone: company.contact?.phone || '',
                        website: company.contact?.website || ''
                    },
                    gstNumber: company.gstNumber || '',
                    panNumber: company.panNumber || '',
                    registeredAddress: {
                        street: company.registeredAddress?.street || '',
                        city: company.registeredAddress?.city || '',
                        state: company.registeredAddress?.state || '',
                        pincode: company.registeredAddress?.pincode || ''
                    },
                    settings: company.settings || {}
                });

                setWorkingHoursForm({
                    defaultStartTime: company.settings?.defaultStartTime || '09:00',
                    defaultEndTime: company.settings?.defaultEndTime || '18:00',
                    graceTime: company.settings?.graceTime || 15,
                    overtimeAllowed: company.settings?.overtimeAllowed !== undefined ? company.settings.overtimeAllowed : true,
                    workingDays: company.settings?.workingDays || [1, 2, 3, 4, 5, 6]
                });

                setRegionalForm({
                    currency: company.settings?.currency || 'INR',
                    dateFormat: company.settings?.dateFormat || 'DD/MM/YYYY',
                    timeZone: company.settings?.timeZone || 'Asia/Kolkata'
                });

                setSecurityForm({
                    minPasswordLength: company.settings?.security?.minPasswordLength || 8,
                    requireSpecialChar: company.settings?.security?.requireSpecialChar !== undefined ? company.settings.security.requireSpecialChar : true,
                    requireNumber: company.settings?.security?.requireNumber !== undefined ? company.settings.security.requireNumber : true,
                    twoFactorAuth: company.settings?.security?.twoFactorAuth || false,
                    sessionTimeout: company.settings?.security?.sessionTimeout || 60
                });

                setNotificationsForm({
                    emailEnabled: company.settings?.notifications?.emailEnabled !== undefined ? company.settings.notifications.emailEnabled : true,
                    inAppEnabled: company.settings?.notifications?.inAppEnabled !== undefined ? company.settings.notifications.inAppEnabled : true,
                    reminderDays: company.settings?.notifications?.reminderDays || 2
                });
            }
        } catch (error) {
            console.error('Failed to fetch company:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCompanyUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (companyData?._id) {
                await api.put(`/organization/companies/${companyData._id}`, companyForm);
                toast.success('Company information updated successfully');
            } else {
                await api.post('/organization/companies', companyForm);
                toast.success('Company profile created successfully');
            }
            setShowCompanyModal(false);
            fetchCompany();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update company information');
        } finally {
            setLoading(false);
        }
    };

    const handleWorkingHoursUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.put(`/organization/companies/${companyData._id}`, {
                settings: {
                    ...companyData.settings,
                    ...workingHoursForm
                }
            });
            toast.success('Working hours and policies updated');
            setShowWorkingHoursModal(false);
            fetchCompany();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update working hours');
        } finally {
            setLoading(false);
        }
    };

    const handleRegionalUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.put(`/organization/companies/${companyData._id}`, {
                settings: {
                    ...companyData.settings,
                    ...regionalForm
                }
            });
            toast.success('Regional settings updated');
            setShowRegionalModal(false);
            fetchCompany();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update regional settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSecurityUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.put(`/organization/companies/${companyData._id}`, {
                settings: {
                    ...companyData.settings,
                    security: securityForm
                }
            });
            toast.success('Security policy updated');
            setShowSecurityModal(false);
            fetchCompany();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update security settings');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationsUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.put(`/organization/companies/${companyData._id}`, {
                settings: {
                    ...companyData.settings,
                    notifications: notificationsForm
                }
            });
            toast.success('Notification preferences updated');
            setShowNotificationsModal(false);
            fetchCompany();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update notifications');
        } finally {
            setLoading(false);
        }
    };

    const settingsLinks = [
        {
            title: 'Holiday Management',
            description: 'Manage company holidays and calendar settings',
            icon: FiCalendar,
            path: '/settings/holidays',
            color: 'bg-primary-100 text-primary-600',
            roles: ['admin', 'HRManager', 'HRExecutive']
        },
        {
            title: 'Audit Trail',
            description: 'View system activity logs and audit records',
            icon: FiFileText,
            path: '/settings/audit',
            color: 'bg-secondary-100 text-secondary-600',
            roles: ['admin', 'HRManager']
        }
    ];

    const settingsSections = [
        {
            id: 'general',
            title: 'General Settings',
            icon: FiSettingsIcon,
            settings: [
                {
                    id: 'company-info',
                    title: 'Company Information',
                    description: 'Update company name, logo, and basic information',
                    action: 'Edit',
                    onClick: () => setShowCompanyModal(true)
                },
                {
                    title: 'Working Hours',
                    description: 'Set standard working hours and overtime policies',
                    action: 'Configure',
                    onClick: () => setShowWorkingHoursModal(true)
                },
                {
                    title: 'Date & Time Format',
                    description: 'Customize date and time display preferences',
                    action: 'Configure',
                    onClick: () => setShowRegionalModal(true)
                }
            ]
        },
        {
            id: 'notifications',
            title: 'Notifications',
            icon: FiBell,
            settings: [
                {
                    title: 'Email Notifications',
                    description: 'Configure email alerts for various events',
                    action: 'Configure',
                    onClick: () => setShowNotificationsModal(true)
                },
                {
                    title: 'In-app Notifications',
                    description: 'Manage notification preferences for the application',
                    action: 'Configure',
                    onClick: () => setShowNotificationsModal(true)
                },
                {
                    title: 'Reminder Settings',
                    description: 'Set up automatic reminders for tasks and deadlines',
                    action: 'Configure',
                    onClick: () => setShowNotificationsModal(true)
                }
            ]
        },
        {
            id: 'security',
            title: 'Security',
            icon: FiLock,
            settings: [
                {
                    title: 'Password Policy',
                    description: 'Set password requirements and expiration rules',
                    action: 'Edit',
                    onClick: () => setShowSecurityModal(true)
                },
                {
                    title: 'Two-Factor Authentication',
                    description: 'Enable or disable 2FA for user accounts',
                    action: 'Configure',
                    onClick: () => setShowSecurityModal(true)
                },
                {
                    title: 'Session Management',
                    description: 'Configure session timeout and security settings',
                    action: 'Configure',
                    onClick: () => setShowSecurityModal(true)
                }
            ]
        },
        {
            id: 'integrations',
            title: 'Integrations',
            icon: FiDatabase,
            settings: [
                {
                    title: 'Email Integration',
                    description: 'Configure SMTP settings for email notifications',
                    action: 'Configure'
                },
                {
                    title: 'Biometric Devices',
                    description: 'Connect and manage attendance tracking devices',
                    action: 'Manage'
                },
                {
                    title: 'Third-party APIs',
                    description: 'Manage API connections and webhooks',
                    action: 'Configure'
                }
            ]
        }
    ];

    const filteredLinks = settingsLinks.filter(link =>
        link.roles.includes(user?.role)
    );

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
                <p className="text-secondary-500 mt-1">
                    Manage system configuration and preferences
                </p>
            </div>

            {/* Quick Links */}
            {filteredLinks.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-secondary-900 mb-4">Quick Access</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className="card-hover group flex items-center gap-4 p-5 transition-all duration-200"
                            >
                                <div className={`p-3 rounded-xl ${link.color}`}>
                                    <link.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors">
                                        {link.title}
                                    </h3>
                                    <p className="text-sm text-secondary-500 mt-0.5">
                                        {link.description}
                                    </p>
                                </div>
                                <FiChevronRight className="w-5 h-5 text-secondary-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings Tabs */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="card p-2">
                        {settingsSections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveTab(section.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${activeTab === section.id
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-secondary-600 hover:bg-secondary-50'
                                    }`}
                            >
                                <section.icon className="w-5 h-5" />
                                <span>{section.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Settings Content */}
                <div className="flex-1">
                    {settingsSections.map((section) => (
                        <div
                            key={section.id}
                            className={activeTab === section.id ? 'block' : 'hidden'}
                        >
                            <div className="card">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-secondary-100">
                                    <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
                                        <section.icon className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-secondary-900">
                                        {section.title}
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {section.settings.map((setting, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-4 rounded-xl bg-secondary-50 hover:bg-secondary-100 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <h3 className="font-medium text-secondary-900">
                                                    {setting.title}
                                                </h3>
                                                <p className="text-sm text-secondary-500 mt-0.5">
                                                    {setting.description}
                                                </p>
                                                {setting.id === 'company-info' && companyData && (
                                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 py-3 px-4 bg-white/50 rounded-lg border border-secondary-100">
                                                        <div className="flex items-center gap-2 text-xs text-secondary-600">
                                                            <HiOutlineOfficeBuilding className="w-4 h-4 text-primary-500" />
                                                            <span className="font-semibold">{companyData.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-secondary-600">
                                                            <HiOutlineMail className="w-4 h-4 text-primary-500" />
                                                            <span>{companyData.contact?.email || 'No email set'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-secondary-600">
                                                            <HiOutlinePhone className="w-4 h-4 text-primary-500" />
                                                            <span>{companyData.contact?.phone || 'No phone set'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-secondary-600">
                                                            <HiOutlineGlobeAlt className="w-4 h-4 text-primary-500" />
                                                            <span>{companyData.contact?.website || 'No website set'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {setting.title === 'Working Hours' && companyData && (
                                                    <div className="mt-2 flex flex-wrap gap-3">
                                                        <span className="text-xs bg-white/50 px-2 py-1 rounded border border-secondary-100 text-secondary-600">
                                                            {companyData.settings?.defaultStartTime} - {companyData.settings?.defaultEndTime}
                                                        </span>
                                                        <span className="text-xs bg-white/50 px-2 py-1 rounded border border-secondary-100 text-secondary-600">
                                                            {companyData.settings?.graceTime}m Grace
                                                        </span>
                                                        <span className="text-xs bg-white/50 px-2 py-1 rounded border border-secondary-100 text-secondary-600">
                                                            {companyData.settings?.workingDays?.length || 0} Working Days
                                                        </span>
                                                    </div>
                                                )}
                                                {setting.title === 'Date & Time Format' && companyData && (
                                                    <div className="mt-2 flex flex-wrap gap-3">
                                                        <span className="text-xs bg-white/50 px-2 py-1 rounded border border-secondary-100 text-secondary-600 uppercase">
                                                            {companyData.settings?.currency}
                                                        </span>
                                                        <span className="text-xs bg-white/50 px-2 py-1 rounded border border-secondary-100 text-secondary-600">
                                                            {companyData.settings?.dateFormat}
                                                        </span>
                                                        <span className="text-xs bg-white/50 px-2 py-1 rounded border border-secondary-100 text-secondary-600">
                                                            {companyData.settings?.timeZone}
                                                        </span>
                                                    </div>
                                                )}
                                                {setting.id === 'notifications' && companyData && (
                                                    <div className="mt-2 flex flex-wrap gap-3">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${companyData.settings?.notifications?.emailEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            Email: {companyData.settings?.notifications?.emailEnabled ? 'ON' : 'OFF'}
                                                        </span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${companyData.settings?.notifications?.inAppEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            In-App: {companyData.settings?.notifications?.inAppEnabled ? 'ON' : 'OFF'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={setting.onClick}
                                                className="btn-secondary btn-sm h-fit"
                                            >
                                                {setting.action}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Company Modal */}
            {showCompanyModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary-100 text-primary-600 rounded-xl">
                                    <HiOutlineOfficeBuilding className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-secondary-900">Company Profile</h2>
                                    <p className="text-xs text-secondary-500 uppercase tracking-widest font-bold mt-0.5">Edit General Information</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCompanyModal(false)}
                                className="p-2 hover:bg-white hover:text-red-500 rounded-lg transition-all text-secondary-400 border border-transparent hover:border-red-100"
                            >
                                <HiOutlineX className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCompanyUpdate} className="overflow-y-auto p-8 custom-scrollbar space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-primary-600 uppercase tracking-widest">Identity</h3>
                                    <div>
                                        <label className="label">Company Name *</label>
                                        <input
                                            type="text"
                                            value={companyForm.name}
                                            onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                            className="input"
                                            required
                                            placeholder="WEIntegrity Solutions"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Legal Business Name</label>
                                        <input
                                            type="text"
                                            value={companyForm.legalName}
                                            onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                                            className="input"
                                            placeholder="WEIntegrity Pvt. Ltd."
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Registration No. (CIN)</label>
                                        <input
                                            type="text"
                                            value={companyForm.registrationNumber}
                                            onChange={(e) => setCompanyForm({ ...companyForm, registrationNumber: e.target.value })}
                                            className="input"
                                            placeholder="U12345KA2024PTC123456"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-primary-600 uppercase tracking-widest">Contact Details</h3>
                                    <div>
                                        <label className="label">Corporate Email</label>
                                        <input
                                            type="email"
                                            value={companyForm.contact.email}
                                            onChange={(e) => setCompanyForm({
                                                ...companyForm,
                                                contact: { ...companyForm.contact, email: e.target.value }
                                            })}
                                            className="input"
                                            placeholder="contact@company.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Phone Number</label>
                                        <input
                                            type="text"
                                            value={companyForm.contact.phone}
                                            onChange={(e) => setCompanyForm({
                                                ...companyForm,
                                                contact: { ...companyForm.contact, phone: e.target.value }
                                            })}
                                            className="input"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Company Website</label>
                                        <input
                                            type="text"
                                            value={companyForm.contact.website}
                                            onChange={(e) => setCompanyForm({
                                                ...companyForm,
                                                contact: { ...companyForm.contact, website: e.target.value }
                                            })}
                                            className="input"
                                            placeholder="https://www.company.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                                    <HiOutlineIdentification className="w-5 h-5" />
                                    Tax & ID Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="label">GST Number</label>
                                        <input
                                            type="text"
                                            value={companyForm.gstNumber}
                                            onChange={(e) => setCompanyForm({ ...companyForm, gstNumber: e.target.value })}
                                            className="input bg-white"
                                            placeholder="29AAAAA0000A1Z5"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">PAN Number</label>
                                        <input
                                            type="text"
                                            value={companyForm.panNumber}
                                            onChange={(e) => setCompanyForm({ ...companyForm, panNumber: e.target.value })}
                                            className="input bg-white"
                                            placeholder="ABCDE1234F"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-primary-600 uppercase tracking-widest">Registered Address</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Street Address</label>
                                        <input
                                            type="text"
                                            value={companyForm.registeredAddress.street}
                                            onChange={(e) => setCompanyForm({
                                                ...companyForm,
                                                registeredAddress: { ...companyForm.registeredAddress, street: e.target.value }
                                            })}
                                            className="input"
                                            placeholder="Floor 4, Tech Plaza, Whitefield"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="label">City</label>
                                            <input
                                                type="text"
                                                value={companyForm.registeredAddress.city}
                                                onChange={(e) => setCompanyForm({
                                                    ...companyForm,
                                                    registeredAddress: { ...companyForm.registeredAddress, city: e.target.value }
                                                })}
                                                className="input"
                                                placeholder="Bangalore"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">State</label>
                                            <input
                                                type="text"
                                                value={companyForm.registeredAddress.state}
                                                onChange={(e) => setCompanyForm({
                                                    ...companyForm,
                                                    registeredAddress: { ...companyForm.registeredAddress, state: e.target.value }
                                                })}
                                                className="input"
                                                placeholder="Karnataka"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">ZIP Code</label>
                                            <input
                                                type="text"
                                                value={companyForm.registeredAddress.pincode}
                                                onChange={(e) => setCompanyForm({
                                                    ...companyForm,
                                                    registeredAddress: { ...companyForm.registeredAddress, pincode: e.target.value }
                                                })}
                                                className="input"
                                                placeholder="560066"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-6 border-t border-secondary-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCompanyModal(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary min-w-[140px]"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Working Hours Modal */}
            {showWorkingHoursModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn overflow-hidden">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <HiOutlineClock className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-secondary-900">Working Hours & Policies</h2>
                            </div>
                            <button onClick={() => setShowWorkingHoursModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleWorkingHoursUpdate} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Default Start Time</label>
                                    <input
                                        type="time"
                                        value={workingHoursForm.defaultStartTime}
                                        onChange={(e) => setWorkingHoursForm({ ...workingHoursForm, defaultStartTime: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Default End Time</label>
                                    <input
                                        type="time"
                                        value={workingHoursForm.defaultEndTime}
                                        onChange={(e) => setWorkingHoursForm({ ...workingHoursForm, defaultEndTime: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Grace Time (Minutes)</label>
                                <input
                                    type="number"
                                    value={workingHoursForm.graceTime}
                                    onChange={(e) => setWorkingHoursForm({ ...workingHoursForm, graceTime: parseInt(e.target.value) })}
                                    className="input"
                                    min="0"
                                    max="60"
                                />
                                <p className="text-xs text-secondary-500 mt-1">Allowed late check-in time before marking as 'Late'</p>
                            </div>

                            <div>
                                <label className="label mb-3">Working Days</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                                        const dayNum = idx + 1;
                                        const isSelected = workingHoursForm.workingDays.includes(dayNum);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    const newDays = isSelected
                                                        ? workingHoursForm.workingDays.filter(d => d !== dayNum)
                                                        : [...workingHoursForm.workingDays, dayNum].sort();
                                                    setWorkingHoursForm({ ...workingHoursForm, workingDays: newDays });
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isSelected
                                                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                                    : 'bg-white text-secondary-600 border-secondary-200 hover:border-primary-300'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-secondary-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={workingHoursForm.overtimeAllowed}
                                    onChange={(e) => setWorkingHoursForm({ ...workingHoursForm, overtimeAllowed: e.target.checked })}
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-secondary-700">Allow Overtime Calculation</span>
                            </label>

                            <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                                <button type="button" onClick={() => setShowWorkingHoursModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
                                    {loading ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Regional Settings Modal */}
            {showRegionalModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn overflow-hidden">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                                    <HiOutlineGlobeAlt className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-secondary-900">Regional Preferences</h2>
                            </div>
                            <button onClick={() => setShowRegionalModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRegionalUpdate} className="p-6 space-y-6">
                            <div>
                                <label className="label">Default Currency</label>
                                <select
                                    value={regionalForm.currency}
                                    onChange={(e) => setRegionalForm({ ...regionalForm, currency: e.target.value })}
                                    className="input"
                                >
                                    <option value="INR">Indian Rupee (₹)</option>
                                    <option value="USD">US Dollar ($)</option>
                                    <option value="EUR">Euro (€)</option>
                                    <option value="GBP">British Pound (£)</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Date Display Format</label>
                                <select
                                    value={regionalForm.dateFormat}
                                    onChange={(e) => setRegionalForm({ ...regionalForm, dateFormat: e.target.value })}
                                    className="input"
                                >
                                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                                    <option value="MMM DD, YYYY">MMM DD, YYYY (Dec 31, 2024)</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Organization Timezone</label>
                                <select
                                    value={regionalForm.timeZone}
                                    onChange={(e) => setRegionalForm({ ...regionalForm, timeZone: e.target.value })}
                                    className="input"
                                >
                                    <option value="Asia/Kolkata">IST (GMT+05:30) - Mumbai, Kolkata</option>
                                    <option value="UTC">UTC (GMT+00:00) - Coordinated Universal Time</option>
                                    <option value="America/New_York">EST (GMT-05:00) - New York</option>
                                    <option value="Europe/London">GMT (GMT+00:00) - London</option>
                                    <option value="Asia/Dubai">GST (GMT+04:00) - Dubai</option>
                                    <option value="Asia/Singapore">SGT (GMT+08:00) - Singapore</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                                <button type="button" onClick={() => setShowRegionalModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
                                    {loading ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Security Settings Modal */}
            {showSecurityModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn overflow-hidden">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-rose-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                    <HiOutlineShieldCheck className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-secondary-900">Security & Authentication</h2>
                            </div>
                            <button onClick={() => setShowSecurityModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSecurityUpdate} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Password Complexity</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="label">Minimum Password Length</label>
                                        <input
                                            type="number"
                                            value={securityForm.minPasswordLength}
                                            onChange={(e) => setSecurityForm({ ...securityForm, minPasswordLength: parseInt(e.target.value) })}
                                            className="input"
                                            min="6"
                                            max="32"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-medium text-secondary-700 group-hover:text-primary-600 transition-colors">Require Special Character</span>
                                            <input
                                                type="checkbox"
                                                checked={securityForm.requireSpecialChar}
                                                onChange={(e) => setSecurityForm({ ...securityForm, requireSpecialChar: e.target.checked })}
                                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                            />
                                        </label>
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-medium text-secondary-700 group-hover:text-primary-600 transition-colors">Require Numbers</span>
                                            <input
                                                type="checkbox"
                                                checked={securityForm.requireNumber}
                                                onChange={(e) => setSecurityForm({ ...securityForm, requireNumber: e.target.checked })}
                                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-secondary-100 pt-6">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Access Control</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Session Timeout (Minutes)</label>
                                        <input
                                            type="number"
                                            value={securityForm.sessionTimeout}
                                            onChange={(e) => setSecurityForm({ ...securityForm, sessionTimeout: parseInt(e.target.value) })}
                                            className="input"
                                            min="5"
                                            max="1440"
                                        />
                                    </div>
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm font-medium text-secondary-700 group-hover:text-primary-600 transition-colors">Multi-Factor Authentication (2FA)</span>
                                        <input
                                            type="checkbox"
                                            checked={securityForm.twoFactorAuth}
                                            onChange={(e) => setSecurityForm({ ...securityForm, twoFactorAuth: e.target.checked })}
                                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                                <button type="button" onClick={() => setShowSecurityModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
                                    {loading ? 'Processing...' : 'Save Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notifications Settings Modal */}
            {showNotificationsModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn overflow-hidden">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-indigo-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <HiOutlineBell className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-secondary-900">Communication Preferences</h2>
                            </div>
                            <button onClick={() => setShowNotificationsModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleNotificationsUpdate} className="p-8 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Global Preferences</h3>
                                <div className="space-y-4 p-4 bg-secondary-50/50 rounded-2xl border border-secondary-100">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-secondary-200 shadow-sm">
                                                <HiOutlineMail className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-secondary-800">Email Notifications</p>
                                                <p className="text-xs text-secondary-500">Send system alerts and reports via email</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={notificationsForm.emailEnabled}
                                            onChange={(e) => setNotificationsForm({ ...notificationsForm, emailEnabled: e.target.checked })}
                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-secondary-300"
                                        />
                                    </label>

                                    <div className="h-px bg-secondary-200 mx-1"></div>

                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-secondary-200 shadow-sm">
                                                <FiBell className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-secondary-800">In-App Notifications</p>
                                                <p className="text-xs text-secondary-500">Enable notification bells and toast alerts</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={notificationsForm.inAppEnabled}
                                            onChange={(e) => setNotificationsForm({ ...notificationsForm, inAppEnabled: e.target.checked })}
                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-secondary-300"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Automation</h3>
                                <div>
                                    <label className="label">Default Reminder Offset (Days)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="7"
                                            value={notificationsForm.reminderDays}
                                            onChange={(e) => setNotificationsForm({ ...notificationsForm, reminderDays: parseInt(e.target.value) })}
                                            className="flex-1 accent-indigo-600"
                                        />
                                        <span className="w-12 h-8 flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100">
                                            {notificationsForm.reminderDays}d
                                        </span>
                                    </div>
                                    <p className="text-xs text-secondary-500 mt-2 italic">Automated reminders will be sent {notificationsForm.reminderDays} day(s) before deadlines.</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                                <button type="button" onClick={() => setShowNotificationsModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={loading} className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-none min-w-[140px]">
                                    {loading ? 'Saving...' : 'Update Preferences'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
