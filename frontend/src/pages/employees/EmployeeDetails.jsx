import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    HiOutlineArrowLeft,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineLocationMarker,
    HiOutlineCalendar,
    HiOutlineBriefcase,
    HiOutlineDocumentText,
    HiOutlinePencil,
    HiOutlineX,
    HiOutlineKey,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineClock,
    HiOutlineCheck,
    HiArrowLeft,
    HiOutlineExclamation,
    HiOutlineAcademicCap,
    HiOutlineBadgeCheck,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineStar,
    HiOutlineLibrary,
    HiOutlineChartPie,
    HiOutlineTrendingUp
} from 'react-icons/hi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// HR roles that can edit employees
const HR_ROLES = ['admin', 'HRManager', 'HRExecutive', 'hr'];

const EmployeeDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [shifts, setShifts] = useState([]);

    const [initialFormState, setInitialFormState] = useState(null);
    const [reviewMode, setReviewMode] = useState(false);
    const [changedFields, setChangedFields] = useState([]);

    // Performance & Attendance Stats
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [performanceHistory, setPerformanceHistory] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);

    // Edit form state
    const [editForm, setEditForm] = useState({
        personalInfo: {
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: '',
            maritalStatus: ''
        },
        contactInfo: {
            email: '',
            phone: '',
            address: {
                street: '',
                city: '',
                state: '',
                zipCode: ''
            },
            emergencyContact: {
                name: '',
                relationship: '',
                phone: ''
            }
        },
        employmentInfo: {
            department: '',
            designation: '',
            workLocation: '',
            employmentType: 'full-time',
            joiningDate: '',
            shift: ''
        },
        bankDetails: {
            bankName: '',
            accountNumber: '',
            ifscCode: ''
        },
        status: 'active',
        password: '' // For creating/updating login credentials
    });

    // Check if current user is HR
    const isHR = user && HR_ROLES.includes(user.role);

    const fetchEmployee = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/employees/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setEmployee(response.data.employee);
            // Initialize edit form with employee data
            setEditForm(createFormState(response.data.employee));

            // Fetch stats after employee is loaded
            fetchStats(id);
        } catch (err) {
            console.error('Error fetching employee:', err);
            setError(err.response?.data?.message || 'Failed to fetch employee details');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (employeeId) => {
        try {
            setStatsLoading(true);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch attendance summary
            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            const attendanceRes = await axios.get(`${API_URL}/attendance/summary`, {
                params: { employeeId, month, year },
                headers
            });

            // Fetch performance history
            const performanceRes = await axios.get(`${API_URL}/performance`, {
                params: { employeeId, limit: 5 },
                headers
            });

            setAttendanceSummary(attendanceRes.data.summary);
            setPerformanceHistory(performanceRes.data.reviews.reverse());
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const createFormState = (emp) => ({
        personalInfo: {
            firstName: emp.personalInfo?.firstName || '',
            lastName: emp.personalInfo?.lastName || '',
            dateOfBirth: emp.personalInfo?.dateOfBirth ? emp.personalInfo.dateOfBirth.split('T')[0] : '',
            gender: emp.personalInfo?.gender || '',
            maritalStatus: emp.personalInfo?.maritalStatus || ''
        },
        contactInfo: {
            email: emp.contactInfo?.email || '',
            phone: emp.contactInfo?.phone || '',
            address: {
                street: emp.contactInfo?.address?.street || '',
                city: emp.contactInfo?.address?.city || '',
                state: emp.contactInfo?.address?.state || '',
                zipCode: emp.contactInfo?.address?.zipCode || ''
            },
            emergencyContact: {
                name: emp.contactInfo?.emergencyContact?.name || '',
                relationship: emp.contactInfo?.emergencyContact?.relationship || '',
                phone: emp.contactInfo?.emergencyContact?.phone || ''
            }
        },
        employmentInfo: {
            department: emp.employmentInfo?.department || '',
            designation: emp.employmentInfo?.designation || '',
            workLocation: emp.employmentInfo?.workLocation || '',
            employmentType: emp.employmentInfo?.employmentType || 'full-time',
            joiningDate: emp.employmentInfo?.joiningDate ? emp.employmentInfo.joiningDate.split('T')[0] : '',
            shift: emp.employmentInfo?.shift?._id || emp.employmentInfo?.shift || ''
        },
        bankDetails: {
            bankName: emp.bankDetails?.bankName || '',
            accountNumber: emp.bankDetails?.accountNumber || '',
            ifscCode: emp.bankDetails?.ifscCode || ''
        },
        education: emp.education || [],
        experience: emp.experience || [],
        skills: emp.skills || [],
        status: emp.status || 'active',
        password: ''
    });

    useEffect(() => {
        if (id) {
            fetchEmployee();
        }
        // Fetch shifts for dropdown
        const fetchShifts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/organization/shifts`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setShifts(res.data || []);
            } catch (error) {
                console.error('Failed to fetch shifts:', error);
            }
        };
        fetchShifts();
    }, [id]);

    const handleEditClick = () => {
        if (!isHR) {
            alert('Only HR personnel can edit employee details.');
            return;
        }
        const formState = createFormState(employee);
        setEditForm(formState);
        setInitialFormState(formState);
        setShowEditModal(true);
        setReviewMode(false);
        setSaveMessage({ type: '', text: '' });
    };

    const handleInputChange = (section, field, value) => {
        if (section === 'root') {
            setEditForm(prev => ({ ...prev, [field]: value }));
        } else if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setEditForm(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [parent]: {
                        ...prev[section][parent],
                        [child]: value
                    }
                }
            }));
        } else {
            setEditForm(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            }));
        }
    };

    const handleArrayChange = (field, index, subfield, value) => {
        setEditForm(prev => {
            const newArray = [...prev[field]];
            if (subfield) {
                newArray[index] = { ...newArray[index], [subfield]: value };
            } else {
                newArray[index] = value;
            }
            return { ...prev, [field]: newArray };
        });
    };

    const addArrayItem = (field, defaultValue) => {
        setEditForm(prev => ({
            ...prev,
            [field]: [...prev[field], defaultValue]
        }));
    };

    const removeArrayItem = (field, index) => {
        setEditForm(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const getFieldLabel = (path) => {
        const labels = {
            'personalInfo.firstName': 'First Name',
            'personalInfo.lastName': 'Last Name',
            'personalInfo.dateOfBirth': 'Date of Birth',
            'personalInfo.gender': 'Gender',
            'personalInfo.maritalStatus': 'Marital Status',
            'contactInfo.email': 'Email',
            'contactInfo.phone': 'Phone',
            'contactInfo.address.street': 'Street',
            'contactInfo.address.city': 'City',
            'contactInfo.address.state': 'State',
            'contactInfo.address.zipCode': 'Zip Code',
            'contactInfo.emergencyContact.name': 'Emergency Contact Name',
            'contactInfo.emergencyContact.relationship': 'Relationship',
            'contactInfo.emergencyContact.phone': 'Emergency Phone',
            'employmentInfo.department': 'Department',
            'employmentInfo.designation': 'Designation',
            'employmentInfo.workLocation': 'Work Location',
            'employmentInfo.employmentType': 'Employment Type',
            'employmentInfo.joiningDate': 'Joining Date',
            'employmentInfo.shift': 'Shift',
            'bankDetails.bankName': 'Bank Name',
            'bankDetails.accountNumber': 'Account Number',
            'bankDetails.ifscCode': 'IFSC Code',
            'education': 'Education History',
            'experience': 'Work Experience',
            'skills': 'Skills & Expertise',
            'status': 'Status',
            'password': 'Password'
        };

        // Handle array fields in path (e.g., education.0.degree -> Education Degree)
        if (path.includes('.')) {
            const parts = path.split('.');
            if (parts[0] === 'education') {
                const field = parts[2] ? parts[2].charAt(0).toUpperCase() + parts[2].slice(1) : '';
                return `Education - ${field}`;
            }
            if (parts[0] === 'experience') {
                const field = parts[2] ? parts[2].charAt(0).toUpperCase() + parts[2].slice(1) : '';
                return `Experience - ${field}`;
            }
        }

        return labels[path] || path;
    };

    const handleReview = () => {
        if (!initialFormState) return;

        const changes = [];
        const processObject = (current, initial, prefix = '') => {
            if (!current) return;
            Object.keys(current).forEach(key => {
                const path = prefix ? `${prefix}.${key}` : key;
                const currentVal = current[key];
                const initialVal = initial ? initial[key] : undefined;

                if (typeof currentVal === 'object' && currentVal !== null) {
                    processObject(currentVal, initialVal, path);
                } else {
                    if (currentVal !== initialVal) {
                        // Skip if both are empty/falsy
                        if (!currentVal && !initialVal) return;

                        // Special handling for shift display
                        let oldValue = initialVal;
                        let newValue = currentVal;

                        if (key === 'shift') {
                            const oldShift = shifts.find(s => s._id === oldValue);
                            const newShift = shifts.find(s => s._id === newValue);
                            oldValue = oldShift ? oldShift.name : (oldValue ? 'Unknown' : 'None');
                            newValue = newShift ? newShift.name : (newValue ? 'Unknown' : 'None');
                        } else if (key === 'password') {
                            oldValue = '(Unchanged)';
                            newValue = '******** (Updated)';
                        }

                        changes.push({
                            field: getFieldLabel(path),
                            oldValue: oldValue || '(Empty)',
                            newValue: newValue || '(Empty)'
                        });
                    }
                }
            });
        };

        processObject(editForm, initialFormState);
        setChangedFields(changes);
        setReviewMode(true);
    };

    const executeSave = async () => {
        try {
            setSaving(true);
            setSaveMessage({ type: '', text: '' });

            const token = localStorage.getItem('token');
            const updateData = {
                personalInfo: editForm.personalInfo,
                contactInfo: editForm.contactInfo,
                employmentInfo: editForm.employmentInfo,
                bankDetails: editForm.bankDetails,
                education: editForm.education,
                experience: editForm.experience,
                skills: editForm.skills,
                status: editForm.status
            };

            // Only include password if it's provided
            if (editForm.password && editForm.password.trim()) {
                updateData.password = editForm.password;
                console.log('Including password in update request');
            }

            console.log('Sending update request:', JSON.stringify(updateData, null, 2));

            const response = await axios.put(`${API_URL}/employees/${id}`, updateData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('Update response:', response.data);

            setEmployee(response.data.employee);

            if (response.data.userCreated) {
                toast.success('Employee updated! Login credentials have been created/updated.');
            } else {
                toast.success('Employee updated successfully!');
            }

            // Clear password field after successful save
            setEditForm(prev => ({ ...prev, password: '' }));

            // Close modal immediately
            setShowEditModal(false);
            setSaveMessage({ type: '', text: '' });
        } catch (err) {
            console.error('Error updating employee:', err);
            console.error('Error response:', err.response?.data);

            // Show more detailed error message
            let errorMessage = 'Failed to update employee';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.message) {
                errorMessage = err.message;
            }

            setSaveMessage({
                type: 'error',
                text: errorMessage
            });
        } finally {
            setSaving(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-4">
                    <Link to="/employees" className="p-2 rounded-lg hover:bg-secondary-100">
                        <HiOutlineArrowLeft className="w-5 h-5 text-secondary-600" />
                    </Link>
                    <div>
                        <h1 className="page-title">Employee Details</h1>
                    </div>
                </div>
                <div className="card p-6 text-center">
                    <p className="text-red-500">{error}</p>
                    <Link to="/employees" className="btn-primary mt-4 inline-block">
                        Back to Employees
                    </Link>
                </div>
            </div>
        );
    }

    // No employee found
    if (!employee) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-4">
                    <Link to="/employees" className="p-2 rounded-lg hover:bg-secondary-100">
                        <HiOutlineArrowLeft className="w-5 h-5 text-secondary-600" />
                    </Link>
                    <div>
                        <h1 className="page-title">Employee Details</h1>
                    </div>
                </div>
                <div className="card p-6 text-center">
                    <p className="text-secondary-500">Employee not found</p>
                    <Link to="/employees" className="btn-primary mt-4 inline-block">
                        Back to Employees
                    </Link>
                </div>
            </div>
        );
    }

    // Extract employee data from nested structure
    const firstName = employee.personalInfo?.firstName || '';
    const lastName = employee.personalInfo?.lastName || '';
    const email = employee.contactInfo?.email || '';
    const phone = employee.contactInfo?.phone || '';
    const department = employee.employmentInfo?.department || '';
    const designation = employee.employmentInfo?.designation || '';
    const employeeCode = employee.employeeCode || '';
    const joiningDate = employee.employmentInfo?.joiningDate || '';
    const status = employee.status || 'active';
    const location = employee.employmentInfo?.workLocation || '';
    const dateOfBirth = employee.personalInfo?.dateOfBirth || '';
    const address = employee.contactInfo?.address
        ? `${employee.contactInfo.address.street || ''}, ${employee.contactInfo.address.city || ''}, ${employee.contactInfo.address.state || ''} - ${employee.contactInfo.address.zipCode || ''}`
        : '';
    const emergencyContact = employee.contactInfo?.emergencyContact || { name: '', relationship: '', phone: '' };
    const bankDetails = employee.bankDetails || { bankName: '', accountNumber: '', ifscCode: '' };
    const manager = employee.employmentInfo?.reportingManager
        ? `${employee.employmentInfo.reportingManager.personalInfo?.firstName || ''} ${employee.employmentInfo.reportingManager.personalInfo?.lastName || ''}`
        : '';
    const hasLoginAccount = !!employee.userId;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/employees" className="p-2 rounded-lg hover:bg-secondary-100">
                    <HiOutlineArrowLeft className="w-5 h-5 text-secondary-600" />
                </Link>
                <div>
                    <h1 className="page-title">Employee Details</h1>
                    <p className="text-secondary-500">View and manage employee information</p>
                </div>
            </div>

            {/* Premium Header Profile Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-white/20">
                {/* Decorative Background */}
                <div className="absolute top-0 w-full h-48 bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900"></div>
                <div className="absolute top-0 w-full h-48 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

                <div className="relative px-8 pt-24 pb-8">
                    <div className="flex flex-col md:flex-row items-end gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-36 h-36 rounded-3xl bg-white p-1.5 shadow-2xl rotate-3 transform transition-transform group-hover:rotate-0 duration-300">
                                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-5xl font-bold text-slate-700 overflow-hidden relative">
                                    <span className="z-10 bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-blue-600">
                                        {firstName[0]}{lastName[0]}
                                    </span>
                                    {/* Abstract shapes behind initials */}
                                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-indigo-200/50 rounded-full blur-xl"></div>
                                    <div className="absolute -top-4 -left-4 w-20 h-20 bg-blue-200/50 rounded-full blur-xl"></div>
                                </div>
                            </div>
                            <div className={`absolute bottom-3 right-0 w-6 h-6 rounded-full border-4 border-white ${status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        </div>

                        {/* Name & Title */}
                        <div className="flex-1 mb-[0.25rem]">
                            <h2 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                                {firstName} {lastName}
                                {hasLoginAccount && (
                                    <span title="User Account Active" className="bg-white/20 backdrop-blur-md text-white p-1.5 rounded-full border border-white/20">
                                        <HiOutlineKey className="w-4 h-4" />
                                    </span>
                                )}
                            </h2>
                            <p className="text-lg font-semibold text-white mt-1 flex items-center gap-2">
                                <HiOutlineBriefcase className="w-5 h-5 opacity-80" />
                                {designation} <span className="opacity-40">•</span> {department}
                            </p>

                            <div className="flex flex-wrap gap-3 mt-4">
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg border border-indigo-400/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                                    {employeeCode}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border ${status === 'active'
                                    ? 'bg-emerald-500 text-white border-emerald-400/50'
                                    : 'bg-slate-500 text-white border-slate-400/50'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-slate-300'}`}></span>
                                    <span className="capitalize">{status}</span>
                                </span>
                                {location && (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg border border-blue-400/50">
                                        <HiOutlineLocationMarker className="w-3.5 h-3.5" />
                                        {location}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-4 md:mt-0">
                            {isHR && (
                                <button
                                    onClick={handleEditClick}
                                    className="group relative px-6 py-3 bg-white text-indigo-700 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:bg-indigo-50 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2 overflow-hidden"
                                >
                                    <HiOutlinePencil className="w-5 h-5" />
                                    <span>Edit Profile</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Personal & Contact */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Personal & Contact Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <HiOutlineDocumentText className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Personal Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Email Address</label>
                                <div className="flex items-center gap-3 text-slate-700 p-3 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors">
                                    <HiOutlineMail className="w-5 h-5 text-indigo-500" />
                                    <span className="font-medium">{email}</span>
                                </div>
                            </div>
                            <div className="group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Phone Number</label>
                                <div className="flex items-center gap-3 text-slate-700 p-3 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors">
                                    <HiOutlinePhone className="w-5 h-5 text-green-500" />
                                    <span className="font-medium">{phone}</span>
                                </div>
                            </div>
                            <div className="group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Date of Birth</label>
                                <div className="flex items-center gap-3 text-slate-700 p-3 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors">
                                    <HiOutlineCalendar className="w-5 h-5 text-purple-500" />
                                    <span className="font-medium">{dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                            <div className="group">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Address</label>
                                <div className="flex items-start gap-3 text-slate-700 p-3 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors">
                                    <HiOutlineLocationMarker className="w-5 h-5 text-orange-500 mt-0.5" />
                                    <span className="font-medium leading-tight">{address || 'No address provided'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employment Details Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <HiOutlineBriefcase className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Employment Info</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Department</p>
                                    <p className="font-bold text-slate-700 mt-1">{department}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                    <HiOutlineBriefcase className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-green-200 hover:shadow-md transition-all">
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Reporting Manager</p>
                                    <p className="font-bold text-slate-700 mt-1">{manager || 'None'}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                                    <span className="font-bold text-sm">RM</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all">
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Joining Date</p>
                                    <p className="font-bold text-slate-700 mt-1">{joiningDate ? new Date(joiningDate).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                                    <HiOutlineCalendar className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all">
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Detailed Shift Information</p>
                                    <div className="mt-1">
                                        <p className="font-bold text-slate-700 flex items-center gap-2">
                                            {employee.employmentInfo?.shift?.name || 'Standard'}
                                            {employee.employmentInfo?.shift?.timing && (
                                                <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                    {employee.employmentInfo.shift.timing.startTime} - {employee.employmentInfo.shift.timing.endTime}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                                    <HiOutlineClock className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Other Info */}
                <div className="space-y-8">
                    {/* Emergency Contact */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-red-500 rounded-full"></span>
                            Emergency Contact
                        </h3>
                        <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl">
                                    🆘
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{emergencyContact.name || 'Not Available'}</p>
                                    <p className="text-sm text-slate-500 capitalize">{emergencyContact.relationship || 'Relationship N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 bg-white p-3 rounded-xl border border-red-100/50">
                                <HiOutlinePhone className="w-5 h-5 text-red-500" />
                                <span className="font-mono font-medium">{emergencyContact.phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-lg p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                            <HiOutlineDocumentText className="w-5 h-5 text-indigo-300" />
                            Bank Details
                        </h3>

                        <div className="space-y-5 relative z-10">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Bank Name</p>
                                <p className="font-medium text-lg tracking-wide">{bankDetails.bankName || 'Not Set'}</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Account No.</p>
                                    <p className="font-mono text-slate-200 tracking-wider">
                                        {bankDetails.accountNumber ? `••••${bankDetails.accountNumber.slice(-4)}` : '####'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">IFSC</p>
                                    <p className="font-mono text-slate-200">{bankDetails.ifscCode || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Information: Education, Experience & Skills */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
                {/* Education & Experience */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Education Section */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                                    <HiOutlineAcademicCap className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Education & Qualifications</h3>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {employee.education && employee.education.length > 0 ? (
                                employee.education.map((edu, idx) => (
                                    <div key={idx} className="flex gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100 items-start cursor-default hover:border-purple-200 transition-all">
                                        <div className="mt-1 p-2.5 bg-white rounded-xl text-purple-500 shadow-sm">
                                            <HiOutlineLibrary className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-800 text-lg">{edu.degree}</h4>
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold ring-1 ring-purple-200">
                                                    {edu.year}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 font-medium mt-1">{edu.institution}</p>
                                            {edu.description && (
                                                <p className="text-slate-500 text-sm mt-3 leading-relaxed border-t border-slate-200/60 pt-3 italic">
                                                    {edu.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium font-mono text-sm uppercase tracking-wider">No education details added yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Experience Section */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-50 rounded-2xl text-green-600">
                                    <HiOutlineBriefcase className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Work History</h3>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {employee.experience && employee.experience.length > 0 ? (
                                employee.experience.map((exp, idx) => (
                                    <div key={idx} className="flex gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100 items-start hover:border-green-200 transition-all">
                                        <div className="mt-1 p-2.5 bg-white rounded-xl text-green-500 shadow-sm">
                                            <HiOutlineBriefcase className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-800 text-lg">{exp.position}</h4>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold ring-1 ring-green-200">
                                                    {exp.duration}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 font-medium mt-1">{exp.company}</p>
                                            {exp.description && (
                                                <p className="text-slate-500 text-sm mt-3 leading-relaxed border-t border-slate-200/60 pt-3">
                                                    {exp.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium font-mono text-sm uppercase tracking-wider">No work experience added yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Skills & Expertise */}
                <div className="space-y-8">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <HiOutlineBadgeCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Skills & Expertise</h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {employee.skills && employee.skills.length > 0 ? (
                                employee.skills.map((skill, idx) => (
                                    <span key={idx} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all cursor-default">
                                        {skill}
                                    </span>
                                ))
                            ) : (
                                <div className="w-full text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm font-medium">No skills listed</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Real-time Performance & Attendance Visualizations */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <HiOutlineTrendingUp className="w-5 h-5 text-primary-500" />
                                Performance Insight
                            </h3>
                            {!statsLoading && performanceHistory.length > 0 && (
                                <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-lg">
                                    Last Review: {new Date(performanceHistory[performanceHistory.length - 1].createdAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {statsLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Attendance Pie Chart */}
                                {attendanceSummary && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-600 mb-4">Attendance Distribution (Current Month)</p>
                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Present', value: attendanceSummary.present, color: '#22c55e' },
                                                            { name: 'Late', value: attendanceSummary.late, color: '#f59e0b' },
                                                            { name: 'Absent', value: attendanceSummary.absent, color: '#ef4444' },
                                                            { name: 'Leave', value: attendanceSummary.onLeave, color: '#3b82f6' },
                                                            { name: 'Holiday', value: attendanceSummary.holiday, color: '#8b5cf6' }
                                                        ].filter(d => d.value > 0)}
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {[
                                                            { name: 'Present', value: attendanceSummary.present, color: '#22c55e' },
                                                            { name: 'Late', value: attendanceSummary.late, color: '#f59e0b' },
                                                            { name: 'Absent', value: attendanceSummary.absent, color: '#ef4444' },
                                                            { name: 'Leave', value: attendanceSummary.onLeave, color: '#3b82f6' },
                                                            { name: 'Holiday', value: attendanceSummary.holiday, color: '#8b5cf6' }
                                                        ].filter(d => d.value > 0).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                Present: {attendanceSummary.present}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                Late: {attendanceSummary.late}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                Absent: {attendanceSummary.absent}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                Leave: {attendanceSummary.onLeave}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                                Holiday: {attendanceSummary.holiday || 0}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Performance Rating Trend */}
                                {performanceHistory.length > 0 ? (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-600 mb-4">Rating Trend</p>
                                        <div className="h-40">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={performanceHistory.map(r => ({
                                                    date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short' }),
                                                    rating: r.overallRating || 0,
                                                    band: r.performanceBand?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'N/A'
                                                }))}>
                                                    <defs>
                                                        <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                    <YAxis hide domain={[0, 5]} />
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-50">
                                                                        <p className="text-xs font-bold text-slate-800 mb-1">{payload[0].payload.date}</p>
                                                                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{payload[0].payload.band}</p>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Area type="monotone" dataKey="rating" stroke="#6366f1" fillOpacity={1} fill="url(#colorRating)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-slate-50 rounded-2xl">
                                        <p className="text-xs text-slate-400">No performance history available yet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Performance Summary Placeholder */}
                    <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-3xl shadow-lg p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <HiOutlineStar className="w-5 h-5 text-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.5)]" />
                            Performance Summary
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-indigo-100">Performance Status</span>
                                <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-xs">
                                    {performanceHistory.length > 0 ? (performanceHistory[performanceHistory.length - 1].performanceBand?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Exceeding Expectations') : 'Exceeding Expectations'}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all duration-1000"
                                    style={{ width: `${(performanceHistory.length > 0 ? performanceHistory[performanceHistory.length - 1].overallRating / 5 : 0.92) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-indigo-100/70 leading-relaxed italic">
                                {performanceHistory.length > 0 && performanceHistory[performanceHistory.length - 1].managerAssessment?.comments ?
                                    `"${performanceHistory[performanceHistory.length - 1].managerAssessment.comments}"` :
                                    '"Consistently demonstrates strong leadership and technical expertise in software development roles."'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {reviewMode ? 'Review Changes' : 'Edit Employee Profile'}
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {reviewMode
                                        ? 'Please verify the changes before saving'
                                        : `Update details for ${firstName} ${lastName}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-red-500 rounded-xl transition-all"
                            >
                                <HiOutlineX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">

                            {reviewMode ? (
                                <div className="space-y-6 animate-fadeIn">
                                    {changedFields.length > 0 ? (
                                        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                            <div className="grid grid-cols-3 bg-slate-100 p-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">
                                                <div>Field</div>
                                                <div>Original Value</div>
                                                <div>New Value</div>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {changedFields.map((change, index) => (
                                                    <div key={index} className="grid grid-cols-3 p-4 bg-white hover:bg-slate-50 transition-colors">
                                                        <div className="font-medium text-slate-700 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                            {change.field}
                                                        </div>
                                                        <div className="text-red-500 line-through text-sm">{change.oldValue}</div>
                                                        <div className="text-green-600 font-medium text-sm">{change.newValue}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <HiOutlineCheck className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-700">No Changes Detected</h3>
                                            <p className="text-slate-500">You haven't made any changes to the employee profile.</p>
                                        </div>
                                    )}

                                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-100 flex items-start gap-3">
                                        <HiOutlineExclamation className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm">
                                            <p className="font-bold">Please verify these changes carefully.</p>
                                            <p>Once saved, the employee record will be permanently updated. You can edit it again if needed.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Save Message */}
                                    {saveMessage.text && (
                                        <div className={`p-4 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                            {saveMessage.text}
                                        </div>
                                    )}

                                    {/* Premium Personal Information Section */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                            Personal Information
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="group">
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">First Name</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={editForm.personalInfo.firstName}
                                                        onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                                                        className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                                                        placeholder="John"
                                                    />
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Last Name</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={editForm.personalInfo.lastName}
                                                        onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                                                        className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                                                        placeholder="Doe"
                                                    />
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    value={editForm.personalInfo.dateOfBirth}
                                                    onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                                                    className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                                />
                                            </div>
                                            <div className="group">
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Gender</label>
                                                <select
                                                    value={editForm.personalInfo.gender}
                                                    onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 appearance-none"
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Contact Information */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            Contact Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Email Address</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <HiOutlineMail className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="email"
                                                        value={editForm.contactInfo.email}
                                                        onChange={(e) => handleInputChange('contactInfo', 'email', e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-slate-700"
                                                        placeholder="john@example.com"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Phone Number</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <HiOutlinePhone className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={editForm.contactInfo.phone}
                                                        onChange={(e) => handleInputChange('contactInfo', 'phone', e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-slate-700"
                                                        placeholder="+91..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Street Address</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <HiOutlineLocationMarker className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={editForm.contactInfo.address.street}
                                                        onChange={(e) => handleInputChange('contactInfo', 'address.street', e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-slate-700"
                                                        placeholder="Street Address"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-5 md:col-span-2">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">City</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.contactInfo.address.city}
                                                        onChange={(e) => handleInputChange('contactInfo', 'address.city', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-slate-700"
                                                        placeholder="City"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">State</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.contactInfo.address.state}
                                                        onChange={(e) => handleInputChange('contactInfo', 'address.state', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-slate-700"
                                                        placeholder="State"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ZIP Code</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.contactInfo.address.zipCode}
                                                        onChange={(e) => handleInputChange('contactInfo', 'address.zipCode', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-slate-700"
                                                        placeholder="ZIP"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Emergency Contact */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                            Emergency Contact
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Contact Name</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={editForm.contactInfo.emergencyContact.name}
                                                        onChange={(e) => handleInputChange('contactInfo', 'emergencyContact.name', e.target.value)}
                                                        className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-700"
                                                        placeholder="Name"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Relationship</label>
                                                <input
                                                    type="text"
                                                    value={editForm.contactInfo.emergencyContact.relationship}
                                                    onChange={(e) => handleInputChange('contactInfo', 'emergencyContact.relationship', e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-700"
                                                    placeholder="Spouse, Parent etc."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Phone</label>
                                                <input
                                                    type="text"
                                                    value={editForm.contactInfo.emergencyContact.phone}
                                                    onChange={(e) => handleInputChange('contactInfo', 'emergencyContact.phone', e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-slate-700"
                                                    placeholder="Emergency Number"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Employment Section */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            Employment Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Department</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <HiOutlineBriefcase className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={editForm.employmentInfo.department}
                                                        onChange={(e) => handleInputChange('employmentInfo', 'department', e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Designation</label>
                                                <input
                                                    type="text"
                                                    value={editForm.employmentInfo.designation}
                                                    onChange={(e) => handleInputChange('employmentInfo', 'designation', e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Work Location</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <HiOutlineLocationMarker className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={editForm.employmentInfo.workLocation}
                                                        onChange={(e) => handleInputChange('employmentInfo', 'workLocation', e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Joining Date</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <HiOutlineCalendar className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="date"
                                                        value={editForm.employmentInfo.joiningDate}
                                                        onChange={(e) => handleInputChange('employmentInfo', 'joiningDate', e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Status</label>
                                                <select
                                                    value={editForm.status}
                                                    onChange={(e) => handleInputChange('root', 'status', e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 appearance-none"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="on-leave">On Leave</option>
                                                    <option value="terminated">Terminated</option>
                                                    <option value="resigned">Resigned</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Shift Assignment</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <HiOutlineClock className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <select
                                                        value={editForm.employmentInfo.shift}
                                                        onChange={(e) => handleInputChange('employmentInfo', 'shift', e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 appearance-none"
                                                    >
                                                        <option value="">Select Shift</option>
                                                        {shifts.map(shift => (
                                                            <option key={shift._id} value={shift._id}>
                                                                {shift.name} ({shift.timing?.startTime} - {shift.timing?.endTime})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {editForm.employmentInfo.shift && shifts.find(s => s._id === editForm.employmentInfo.shift) && (
                                                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1 bg-orange-50 p-2 rounded-lg border border-orange-100">
                                                        <HiOutlineClock className="w-3.5 h-3.5" />
                                                        <span className="font-semibold">{shifts.find(s => s._id === editForm.employmentInfo.shift)?.name}:</span>
                                                        {shifts.find(s => s._id === editForm.employmentInfo.shift)?.timing?.fullDayHours || 8}h/day
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Bank Details */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                            Bank Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={editForm.bankDetails.bankName}
                                                    onChange={(e) => handleInputChange('bankDetails', 'bankName', e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium text-slate-700"
                                                    placeholder="Bank Name"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Account Number</label>
                                                <input
                                                    type="text"
                                                    value={editForm.bankDetails.accountNumber}
                                                    onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-mono font-medium text-slate-700"
                                                    placeholder="Account No."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">IFSC Code</label>
                                                <input
                                                    type="text"
                                                    value={editForm.bankDetails.ifscCode}
                                                    onChange={(e) => handleInputChange('bankDetails', 'ifscCode', e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-mono font-medium text-slate-700"
                                                    placeholder="IFSC"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Education Section */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                Education & Qualifications
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => addArrayItem('education', { degree: '', institution: '', year: '', description: '' })}
                                                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                <HiOutlinePlus className="w-3.5 h-3.5" />
                                                Add Education
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {editForm.education.map((edu, idx) => (
                                                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 relative group/item">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeArrayItem('education', idx)}
                                                        className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow-md border border-red-100 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-50"
                                                    >
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="md:col-span-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Degree / Course</label>
                                                            <input
                                                                type="text"
                                                                value={edu.degree}
                                                                onChange={(e) => handleArrayChange('education', idx, 'degree', e.target.value)}
                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                                                placeholder="Bachelor of Science"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Year</label>
                                                            <input
                                                                type="text"
                                                                value={edu.year}
                                                                onChange={(e) => handleArrayChange('education', idx, 'year', e.target.value)}
                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                                                placeholder="2018 - 2022"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Institution</label>
                                                            <input
                                                                type="text"
                                                                value={edu.institution}
                                                                onChange={(e) => handleArrayChange('education', idx, 'institution', e.target.value)}
                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                                                placeholder="University Name"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {editForm.education.length === 0 && (
                                                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">No education entries added</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Premium Work Experience Section */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Work Experience
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => addArrayItem('experience', { company: '', position: '', duration: '', description: '' })}
                                                className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                <HiOutlinePlus className="w-3.5 h-3.5" />
                                                Add Experience
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {editForm.experience.map((exp, idx) => (
                                                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 relative group/item">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeArrayItem('experience', idx)}
                                                        className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow-md border border-red-100 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-50"
                                                    >
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="md:col-span-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Position</label>
                                                            <input
                                                                type="text"
                                                                value={exp.position}
                                                                onChange={(e) => handleArrayChange('experience', idx, 'position', e.target.value)}
                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm font-medium"
                                                                placeholder="Software Engineer"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Duration</label>
                                                            <input
                                                                type="text"
                                                                value={exp.duration}
                                                                onChange={(e) => handleArrayChange('experience', idx, 'duration', e.target.value)}
                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm font-medium"
                                                                placeholder="2 years"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Company</label>
                                                            <input
                                                                type="text"
                                                                value={exp.company}
                                                                onChange={(e) => handleArrayChange('experience', idx, 'company', e.target.value)}
                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm font-medium"
                                                                placeholder="Company Name"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {editForm.experience.length === 0 && (
                                                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">No experience entries added</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Premium Skills Section */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                Skills & Expertise
                                            </h3>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex gap-2 mb-4 flex-wrap">
                                                {editForm.skills.map((skill, idx) => (
                                                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                                                        {skill}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeArrayItem('skills', idx)}
                                                            className="hover:text-red-500 transition-colors"
                                                        >
                                                            <HiOutlineX className="w-3.5 h-3.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    id="new-skill-input"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = e.target.value.trim();
                                                            if (val && !editForm.skills.includes(val)) {
                                                                addArrayItem('skills', val);
                                                                e.target.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                                                    placeholder="Add a skill and press Enter..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById('new-skill-input');
                                                        const val = input.value.trim();
                                                        if (val && !editForm.skills.includes(val)) {
                                                            addArrayItem('skills', val);
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                                                >
                                                    <HiOutlinePlus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Login Credentials */}
                                    <div className="pt-6 border-t border-slate-100">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                <HiOutlineKey className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">Login Credentials</h3>
                                                <p className="text-sm text-slate-500">Manage system access for this employee</p>
                                            </div>
                                            {hasLoginAccount && (
                                                <span className="ml-auto px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                                    Active Account
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-indigo-50/30 p-6 rounded-2xl border border-indigo-50">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={editForm.password}
                                                        onChange={(e) => handleInputChange('root', 'password', e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 pr-12"
                                                        placeholder="Set new password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors bg-white/50 p-1 rounded-lg"
                                                    >
                                                        {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-2 ml-1">Leave blank to keep current password</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Login Email</label>
                                                <input
                                                    type="text"
                                                    value={editForm.contactInfo.email}
                                                    disabled
                                                    className="w-full px-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                                                />
                                                <p className="text-xs text-slate-400 mt-2 ml-1">System uses contact email for login</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Action Buttons */}
                        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-8 py-5 flex items-center justify-end gap-4 z-10">
                            {reviewMode ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setReviewMode(false)}
                                        className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2"
                                        disabled={saving}
                                    >
                                        <HiArrowLeft className="w-4 h-4" />
                                        Back to Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={executeSave}
                                        disabled={saving || changedFields.length === 0}
                                        className="px-6 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 shadow-lg shadow-green-200 active:transform active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlineCheck className="w-5 h-5" />
                                                <span>Confirm & Update</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReview}
                                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-lg shadow-slate-200 active:transform active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <span>Review Changes</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeDetails;
