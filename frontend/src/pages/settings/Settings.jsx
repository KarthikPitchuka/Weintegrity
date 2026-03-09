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
    HiOutlineX
} from 'react-icons/hi';
import {
    FiCalendar,
    FiFileText,
    FiChevronRight,
    FiSettings as FiSettingsIcon
} from 'react-icons/fi';

const Settings = () => {
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);

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



    const filteredLinks = settingsLinks.filter(link =>
        link.roles.includes(user?.role)
    );

    return (
        <div className="animate-fadeIn">
            {/* Breadcrumbs & Header */}
            <div className="mb-8">
                <nav className="flex mb-3" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                        <li className="inline-flex items-center">
                            <Link to="/dashboard" className="text-secondary-500 hover:text-primary-600 font-medium text-sm transition-colors">
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <FiChevronRight className="w-4 h-4 text-secondary-400" />
                                <span className="ml-1 text-secondary-900 font-medium text-sm md:ml-2">Settings</span>
                            </div>
                        </li>
                    </ol>
                </nav>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Organization Settings</h1>
                        <p className="text-secondary-500 mt-1.5 text-sm">
                            Manage your company profile, system configurations, and audit logs.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Company Profile Banner */}
                {/* Company Profile Banner */}
                <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-2xl shadow-lg border border-white/10 overflow-hidden relative text-white">
                    <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:20px_20px] pointer-events-none"></div>

                    <div className="p-8 relative z-10">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary-600 flex-shrink-0">
                                <HiOutlineOfficeBuilding className="w-12 h-12" />
                            </div>

                            <div className="flex-1 min-w-0 pt-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-3xl font-bold text-white leading-tight">
                                            {companyData?.name || 'Company Name'}
                                        </h2>
                                        <p className="text-blue-100 text-sm font-medium mt-1">
                                            {companyData?.legalName || 'Legal Business Name'} • {companyData?.registrationNumber || 'Registration No.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowCompanyModal(true)}
                                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                                    >
                                        <FiSettingsIcon className="w-4 h-4" />
                                        Edit Profile
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                                    {/* Email */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                                        <div className="p-2 bg-white rounded-lg text-primary-600">
                                            <HiOutlineMail className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Contact Email</p>
                                            <p className="text-sm font-medium text-white truncate" title={companyData?.contact?.email}>
                                                {companyData?.contact?.email || 'Not Set'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                                        <div className="p-2 bg-white rounded-lg text-primary-600">
                                            <HiOutlinePhone className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Phone</p>
                                            <p className="text-sm font-medium text-white truncate">
                                                {companyData?.contact?.phone || 'Not Set'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Website */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                                        <div className="p-2 bg-white rounded-lg text-primary-600">
                                            <HiOutlineGlobeAlt className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Website</p>
                                            <a href={companyData?.contact?.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:text-blue-100 truncate block">
                                                {companyData?.contact?.website || 'Not Set'}
                                            </a>
                                        </div>
                                    </div>

                                    {/* Tax */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                                        <div className="p-2 bg-white rounded-lg text-primary-600">
                                            <HiOutlineIdentification className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Tax Details</p>
                                            <div className="flex items-center gap-1.5 pt-0.5">
                                                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded">GST</span>
                                                <span className="text-sm font-medium text-white truncate">{companyData?.gstNumber || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {companyData?.registeredAddress && (
                            <div className="mt-8 pt-6 border-t border-white/10 flex items-start gap-2 text-sm text-blue-100">
                                <span className="font-semibold text-white whitespace-nowrap">Registered Address:</span>
                                <span>
                                    {companyData.registeredAddress.street}, {companyData.registeredAddress.city}, {companyData.registeredAddress.state} - {companyData.registeredAddress.pincode}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* System Configuration Grid */}
                {filteredLinks.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <h3 className="text-lg font-bold text-secondary-900">System Configuration</h3>
                            <div className="h-px flex-1 bg-secondary-200"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className="group relative bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 hover:border-primary-200 hover:shadow-md transition-all duration-300 overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className={`w-12 h-12 rounded-xl ${link.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>
                                            <link.icon className="w-6 h-6" />
                                        </div>

                                        <h4 className="text-lg font-bold text-secondary-900 mb-2 group-hover:text-primary-700 transition-colors">
                                            {link.title}
                                        </h4>
                                        <p className="text-secondary-500 text-sm leading-relaxed mb-4 flex-1">
                                            {link.description}
                                        </p>

                                        <div className="flex items-center text-sm font-semibold text-primary-600 md:opacity-0 md:-translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                            Configure
                                            <FiChevronRight className="ml-1 w-4 h-4" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
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


        </div>
    );
};

export default Settings;
