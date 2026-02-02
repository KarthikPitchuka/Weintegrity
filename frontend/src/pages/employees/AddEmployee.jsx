import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineKey,
    HiOutlineClock,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineAcademicCap,
    HiOutlineBadgeCheck,
    HiOutlineX
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AddEmployee = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [shifts, setShifts] = useState([]);
    const [formData, setFormData] = useState({
        // Personal Info
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        // Employment Details
        department: '',
        designation: '',
        joiningDate: '',
        employmentType: 'full-time',
        workLocation: '',
        shift: '',
        // Address
        address: '',
        city: '',
        state: '',
        zipCode: '',
        // Emergency Contact
        emergencyName: '',
        emergencyRelationship: '',
        emergencyPhone: '',
        // Bank Details
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        // Additional Info
        education: [],
        experience: [],
        skills: [],
        // Login Credentials
        password: '',
        createUser: true
    });

    const departments = ['Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales'];
    const employmentTypes = [
        { value: 'full-time', label: 'Full Time' },
        { value: 'part-time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'intern', label: 'Intern' }
    ];

    // Fetch shifts on component mount
    useEffect(() => {
        const fetchShifts = async () => {
            try {
                const res = await api.get('/organization/shifts');
                setShifts(res.data || []);
            } catch (error) {
                console.error('Failed to fetch shifts:', error);
            }
        };
        fetchShifts();
    }, []);

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleArrayChange = (field, index, subfield, value) => {
        const newArray = [...formData[field]];
        if (subfield) {
            newArray[index] = { ...newArray[index], [subfield]: value };
        } else {
            newArray[index] = value;
        }
        setFormData({ ...formData, [field]: newArray });
    };

    const addArrayItem = (field, defaultValue) => {
        setFormData({
            ...formData,
            [field]: [...formData[field], defaultValue]
        });
    };

    const removeArrayItem = (field, index) => {
        setFormData({
            ...formData,
            [field]: formData[field].filter((_, i) => i !== index)
        });
    };

    const handleInitiateCreate = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.department || !formData.designation || !formData.joiningDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            // Send OTP to employee's email for verification
            await api.post('/auth/send-employee-otp', {
                employeeEmail: formData.email,
                employeeName: formData.firstName
            });
            setLoading(false);
            setShowOtpModal(true);
            toast.success(`Verification code sent to ${formData.email}. Please ask the employee to share the code.`);
        } catch (error) {
            setLoading(false);
            toast.error(error.response?.data?.message || 'Failed to send verification code');
        }
    };

    const handleOtpChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const submitWithOtp = async () => {
        setLoading(true);
        // handleSubmit logic moved here
        try {
            // Structure the data according to the Employee model schema
            const employeeData = {
                hrOtp: otp.join(''), // Include the HR OTP
                personalInfo: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    dateOfBirth: formData.dateOfBirth || undefined,
                    gender: formData.gender || undefined
                },
                contactInfo: {
                    email: formData.email,
                    phone: formData.phone || undefined,
                    address: {
                        street: formData.address || undefined,
                        city: formData.city || undefined,
                        state: formData.state || undefined,
                        zipCode: formData.zipCode || undefined
                    },
                    emergencyContact: {
                        name: formData.emergencyName || undefined,
                        relationship: formData.emergencyRelationship || undefined,
                        phone: formData.emergencyPhone || undefined
                    }
                },
                employmentInfo: {
                    department: formData.department,
                    designation: formData.designation,
                    employmentType: formData.employmentType,
                    joiningDate: formData.joiningDate,
                    workLocation: formData.workLocation || undefined,
                    shift: formData.shift || undefined
                },
                bankDetails: {
                    bankName: formData.bankName || undefined,
                    accountNumber: formData.accountNumber || undefined,
                    ifscCode: formData.ifscCode || undefined
                },
                education: formData.education,
                experience: formData.experience,
                skills: formData.skills,
                // Include password for creating user account
                createUser: formData.createUser && formData.password ? true : false,
                password: formData.password || undefined
            };

            await api.post('/employees', employeeData);

            if (formData.createUser && formData.password) {
                toast.success('Employee added successfully! Verification email sent to employee.');
            } else {
                toast.success('Employee added successfully!');
            }
            navigate('/employees');
        } catch (error) {
            console.error('Error creating employee:', error.response?.data || error);
            const errorMsg = error.response?.data?.message || 'Failed to add employee';
            toast.error(errorMsg);

            // If OTP invalid, maybe clear it?
            if (errorMsg.includes('authorization code')) {
                setOtp(['', '', '', '', '', '']);
            }
        } finally {
            setLoading(false);
        }
    };

    // Kept for backward compatibility if accidentally called
    const handleSubmit = (e) => {
        e.preventDefault();
        handleInitiateCreate(e);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/employees" className="p-2 rounded-lg hover:bg-secondary-100">
                    <HiOutlineArrowLeft className="w-5 h-5 text-secondary-600" />
                </Link>
                <div>
                    <h1 className="page-title">Add New Employee</h1>
                    <p className="text-secondary-500">Create a new employee profile</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="card p-6">
                    <h2 className="section-title mb-6">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="label">First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="input"
                                placeholder="John"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="input"
                                placeholder="Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                placeholder="john.doe@company.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div>
                            <label className="label">Date of Birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Employment Details */}
                <div className="card p-6">
                    <h2 className="section-title mb-6">Employment Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="label">Department *</label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Designation *</label>
                            <input
                                type="text"
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                className="input"
                                placeholder="Software Developer"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Employment Type</label>
                            <select
                                name="employmentType"
                                value={formData.employmentType}
                                onChange={handleChange}
                                className="input"
                            >
                                {employmentTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Joining Date *</label>
                            <input
                                type="date"
                                name="joiningDate"
                                value={formData.joiningDate}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Work Location</label>
                            <input
                                type="text"
                                name="workLocation"
                                value={formData.workLocation}
                                onChange={handleChange}
                                className="input"
                                placeholder="Bangalore, India"
                            />
                        </div>
                        <div>
                            <label className="label">Shift</label>
                            <select
                                name="shift"
                                value={formData.shift}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">Select Shift</option>
                                {shifts.map(shift => (
                                    <option key={shift._id} value={shift._id}>
                                        {shift.name} ({shift.timing?.startTime} - {shift.timing?.endTime})
                                    </option>
                                ))}
                            </select>
                            {formData.shift && shifts.find(s => s._id === formData.shift) && (
                                <p className="text-xs text-secondary-500 mt-1 flex items-center gap-1">
                                    <HiOutlineClock className="w-3 h-3" />
                                    {shifts.find(s => s._id === formData.shift)?.timing?.fullDayHours || 8}h/day
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="card p-6">
                    <h2 className="section-title mb-6">Address</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="label">Street Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="input"
                                placeholder="123 Tech Park, Whitefield"
                            />
                        </div>
                        <div>
                            <label className="label">City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="input"
                                placeholder="Bangalore"
                            />
                        </div>
                        <div>
                            <label className="label">State</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="input"
                                placeholder="Karnataka"
                            />
                        </div>
                        <div>
                            <label className="label">ZIP Code</label>
                            <input
                                type="text"
                                name="zipCode"
                                value={formData.zipCode}
                                onChange={handleChange}
                                className="input"
                                placeholder="560066"
                            />
                        </div>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="card p-6">
                    <h2 className="section-title mb-6">Emergency Contact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="label">Contact Name</label>
                            <input
                                type="text"
                                name="emergencyName"
                                value={formData.emergencyName}
                                onChange={handleChange}
                                className="input"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="label">Relationship</label>
                            <input
                                type="text"
                                name="emergencyRelationship"
                                value={formData.emergencyRelationship}
                                onChange={handleChange}
                                className="input"
                                placeholder="Spouse"
                            />
                        </div>
                        <div>
                            <label className="label">Contact Phone</label>
                            <input
                                type="tel"
                                name="emergencyPhone"
                                value={formData.emergencyPhone}
                                onChange={handleChange}
                                className="input"
                                placeholder="+91 98765 43211"
                            />
                        </div>
                    </div>
                </div>

                {/* Bank Details */}
                <div className="card p-6">
                    <h2 className="section-title mb-6">Bank Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="label">Bank Name</label>
                            <input
                                type="text"
                                name="bankName"
                                value={formData.bankName}
                                onChange={handleChange}
                                className="input"
                                placeholder="HDFC Bank"
                            />
                        </div>
                        <div>
                            <label className="label">Account Number</label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                                className="input"
                                placeholder="1234567890"
                            />
                        </div>
                        <div>
                            <label className="label">IFSC Code</label>
                            <input
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode}
                                onChange={handleChange}
                                className="input"
                                placeholder="HDFC0001234"
                            />
                        </div>
                    </div>
                </div>

                {/* Education Section */}
                <div className="card p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <HiOutlineAcademicCap className="w-5 h-5 text-purple-600" />
                            <h2 className="section-title">Education & Qualifications</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => addArrayItem('education', { degree: '', institution: '', year: '', description: '' })}
                            className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg transition-all"
                        >
                            <HiOutlinePlus className="w-4 h-4" />
                            Add Education
                        </button>
                    </div>
                    <div className="space-y-4">
                        {formData.education.map((edu, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                                <button
                                    type="button"
                                    onClick={() => removeArrayItem('education', idx)}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-white text-red-500 rounded-full shadow-sm border border-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
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
                                            className="input py-2 text-sm"
                                            placeholder="Bachelor of Science"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Year</label>
                                        <input
                                            type="text"
                                            value={edu.year}
                                            onChange={(e) => handleArrayChange('education', idx, 'year', e.target.value)}
                                            className="input py-2 text-sm"
                                            placeholder="2018 - 2022"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Institution</label>
                                        <input
                                            type="text"
                                            value={edu.institution}
                                            onChange={(e) => handleArrayChange('education', idx, 'institution', e.target.value)}
                                            className="input py-2 text-sm"
                                            placeholder="University Name"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {formData.education.length === 0 && (
                            <p className="text-center py-4 text-slate-400 text-sm italic">No education details added yet</p>
                        )}
                    </div>
                </div>

                {/* Experience Section */}
                <div className="card p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <HiOutlineBadgeCheck className="w-5 h-5 text-green-600" />
                            <h2 className="section-title">Work Experience</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => addArrayItem('experience', { company: '', position: '', duration: '', description: '' })}
                            className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-lg transition-all"
                        >
                            <HiOutlinePlus className="w-4 h-4" />
                            Add Experience
                        </button>
                    </div>
                    <div className="space-y-4">
                        {formData.experience.map((exp, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group">
                                <button
                                    type="button"
                                    onClick={() => removeArrayItem('experience', idx)}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-white text-red-500 rounded-full shadow-sm border border-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
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
                                            className="input py-2 text-sm"
                                            placeholder="Software Engineer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Duration</label>
                                        <input
                                            type="text"
                                            value={exp.duration}
                                            onChange={(e) => handleArrayChange('experience', idx, 'duration', e.target.value)}
                                            className="input py-2 text-sm"
                                            placeholder="2 years"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Company</label>
                                        <input
                                            type="text"
                                            value={exp.company}
                                            onChange={(e) => handleArrayChange('experience', idx, 'company', e.target.value)}
                                            className="input py-2 text-sm"
                                            placeholder="Company Name"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {formData.experience.length === 0 && (
                            <p className="text-center py-4 text-slate-400 text-sm italic">No work experience added yet</p>
                        )}
                    </div>
                </div>

                {/* Skills Section */}
                <div className="card p-6 border-l-4 border-indigo-500">
                    <div className="flex items-center gap-2 mb-6">
                        <HiOutlineBadgeCheck className="w-5 h-5 text-indigo-600" />
                        <h2 className="section-title">Skills & Expertise</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {formData.skills.map((skill, idx) => (
                                <span key={idx} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('skills', idx)}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <HiOutlineX className="w-3 h-3" />
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
                                        if (val && !formData.skills.includes(val)) {
                                            addArrayItem('skills', val);
                                            e.target.value = '';
                                        }
                                    }
                                }}
                                className="input flex-1"
                                placeholder="Add a skill and press Enter..."
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const input = document.getElementById('new-skill-input');
                                    const val = input.value.trim();
                                    if (val && !formData.skills.includes(val)) {
                                        addArrayItem('skills', val);
                                        input.value = '';
                                    }
                                }}
                                className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                            >
                                <HiOutlinePlus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Login Credentials */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <HiOutlineKey className="w-6 h-6 text-primary-600" />
                        <h2 className="section-title">Login Credentials</h2>
                    </div>
                    <p className="text-sm text-secondary-500 mb-4">
                        Set a password to create login credentials for this employee. They will use their email address and this password to login to their dashboard.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label">Password {formData.createUser && '*'}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input pr-10"
                                    placeholder="Minimum 6 characters"
                                    minLength={formData.createUser ? 6 : 0}
                                    required={formData.createUser}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                >
                                    {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="label">Login Email</label>
                            <input
                                type="text"
                                value={formData.email || 'Enter email above'}
                                disabled
                                className="input bg-secondary-50 text-secondary-500"
                            />
                            <p className="text-xs text-secondary-400 mt-1">Employee will use this email to login</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="createUser"
                                checked={formData.createUser}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-secondary-700">Create login account for this employee</span>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <Link to="/employees" className="btn-secondary">
                        Cancel
                    </Link>
                    <button type="button" onClick={handleInitiateCreate} className="btn-primary" disabled={loading}>
                        {loading ? 'Processing...' : 'Add Employee'}
                    </button>
                </div>
            </form>

            {/* OTP Verification Modal */}
            {showOtpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-2xl">✉️</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Email Verification</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                A verification code has been sent to <strong>{formData.email}</strong>. Please ask the employee to share the code with you.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code (OTP)</label>
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className="w-10 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                        autoComplete="off"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowOtpModal(false)}
                                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitWithOtp}
                                disabled={otp.join('').length !== 6 || loading}
                                className="flex-1 py-2.5 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Verifying...' : 'Verify & Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddEmployee;
