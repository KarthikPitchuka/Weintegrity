import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineMail, HiOutlinePhone, HiOutlineLocationMarker, HiOutlineCalendar, HiOutlinePencil, HiOutlineCamera, HiOutlineRefresh, HiOutlinePhotograph, HiOutlineTrash, HiOutlineLockClosed } from 'react-icons/hi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, login } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [employeeData, setEmployeeData] = useState(null);
    const [profilePic, setProfilePic] = useState(null);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        address: '',
        gender: '',
        maritalStatus: '',
        bloodGroup: '',
        nationality: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        joiningDate: '',
        employmentType: '',
        reportingManager: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        otp: ''
    });

    const [otpRequested, setOtpRequested] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);

    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setProfileLoading(true);
            const response = await api.get('/auth/me');
            const userData = response.data.user;
            const emp = userData.employeeId;
            setEmployeeData(emp);

            setFormData({
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                phone: emp?.contactInfo?.phone || '',
                dateOfBirth: emp?.personalInfo?.dateOfBirth ? emp.personalInfo.dateOfBirth.split('T')[0] : '',
                address: emp?.contactInfo?.address?.street || '',
                gender: emp?.personalInfo?.gender || '',
                maritalStatus: emp?.personalInfo?.maritalStatus || '',
                bloodGroup: emp?.personalInfo?.bloodGroup || '',
                nationality: emp?.personalInfo?.nationality || '',
                city: emp?.contactInfo?.address?.city || '',
                state: emp?.contactInfo?.address?.state || '',
                zipCode: emp?.contactInfo?.address?.zipCode || '',
                country: emp?.contactInfo?.address?.country || '',
                joiningDate: emp?.employmentInfo?.joiningDate ? emp.employmentInfo.joiningDate.split('T')[0] : '',
                employmentType: emp?.employmentInfo?.employmentType || '',
                reportingManager: emp?.employmentInfo?.reportingManager ?
                    `${emp.employmentInfo.reportingManager.personalInfo?.firstName || ''} ${emp.employmentInfo.reportingManager.personalInfo?.lastName || ''}`.trim() : 'Not Assigned'
            });

            if (userData.profilePicture) {
                setProfilePic(`${import.meta.env.VITE_API_URL}${userData.profilePicture}`);
            } else {
                setProfilePic(null);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile data');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const triggerFileInput = () => {
        setShowPhotoMenu(false);
        fileInputRef.current.click();
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        const formDataImg = new FormData();
        formDataImg.append('profilePicture', file);

        try {
            setUploadingImg(true);
            const response = await api.post('/auth/profile-picture', formDataImg, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newPhotoUrl = `${import.meta.env.VITE_API_URL}${response.data.profilePicture}`;
            setProfilePic(newPhotoUrl);

            const updatedUser = { ...user, profilePicture: response.data.profilePicture };
            login(updatedUser, localStorage.getItem('token'));

            toast.success('Profile picture updated');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        } finally {
            setUploadingImg(false);
        }
    };

    const handleRemovePhoto = async () => {
        try {
            setShowPhotoMenu(false);
            setUploadingImg(true);
            await api.delete('/auth/profile-picture');
            setProfilePic(null);

            const updatedUser = { ...user, profilePicture: null };
            login(updatedUser, localStorage.getItem('token'));

            toast.success('Profile picture removed');
        } catch (error) {
            console.error('Error removing image:', error);
            toast.error('Failed to remove image');
        } finally {
            setUploadingImg(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            await api.put('/auth/profile', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                gender: formData.gender,
                maritalStatus: formData.maritalStatus,
                bloodGroup: formData.bloodGroup,
                nationality: formData.nationality,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                zipCode: formData.zipCode
            });

            setIsEditing(false);
            toast.success('Profile updated successfully');
            fetchProfile();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOTP = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            return toast.error('Please fill in both password fields first');
        }

        if (passwordData.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        try {
            setOtpLoading(true);
            await api.post('/auth/password-otp');
            setOtpRequested(true);
            toast.success('Verification code sent to your email!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send verification code');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!otpRequested) {
            return toast.error('Please request and enter verification code first');
        }

        if (!passwordData.otp) {
            return toast.error('Please enter the verification code');
        }

        if (passwordData.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        try {
            setPasswordLoading(true);
            await api.put('/auth/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
                otp: passwordData.otp
            });
            toast.success('Password updated successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', otp: '' });
            setOtpRequested(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="text-secondary-500 mt-1">Manage your personal information</p>
                </div>
                <button onClick={fetchProfile} className="btn-secondary btn-sm">
                    <HiOutlineRefresh className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="card p-6 text-center !overflow-visible">
                        <div className="relative inline-block">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploadingImg}
                            />

                            <div
                                className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                            >
                                {profilePic ? (
                                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{formData.firstName?.[0]}{formData.lastName?.[0]}</span>
                                )}
                                {uploadingImg && (
                                    <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center">
                                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            <button
                                className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors z-10 border border-gray-200"
                                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                                disabled={uploadingImg}
                            >
                                <HiOutlineCamera className="w-5 h-5 text-secondary-600" />
                            </button>

                            {showPhotoMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-20"
                                        onClick={() => setShowPhotoMenu(false)}
                                    />

                                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-30 animate-fadeIn">
                                        <button
                                            onClick={triggerFileInput}
                                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                        >
                                            <HiOutlinePhotograph className="w-5 h-5 text-primary-500" />
                                            {profilePic ? 'Change Photo' : 'Upload Photo'}
                                        </button>
                                        {profilePic && (
                                            <button
                                                onClick={handleRemovePhoto}
                                                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                            >
                                                <HiOutlineTrash className="w-5 h-5" />
                                                Remove Photo
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <h2 className="mt-4 text-xl font-bold text-secondary-900">
                            {formData.firstName} {formData.lastName}
                        </h2>
                        <p className="text-secondary-500 capitalize">{user?.role}</p>
                        <p className="text-sm text-secondary-400 mt-1">
                            {employeeData?.employeeCode || 'Not linked to employee record'}
                        </p>

                        {employeeData && (
                            <div className="mt-6 pt-6 border-t border-secondary-100">
                                <div className="flex justify-around">
                                    <div className="text-center px-4">
                                        <p className="text-lg font-bold text-secondary-900 truncate max-w-[120px]">
                                            {employeeData.employmentInfo?.department || '-'}
                                        </p>
                                        <p className="text-xs text-secondary-500">Department</p>
                                    </div>
                                    <div className="text-center px-4">
                                        <p className="text-lg font-bold text-secondary-900 truncate max-w-[120px]">
                                            {employeeData.employmentInfo?.designation || '-'}
                                        </p>
                                        <p className="text-xs text-secondary-500">Designation</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                            <h2 className="font-semibold text-secondary-900">Personal Information</h2>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="btn-secondary btn-sm"
                            >
                                <HiOutlinePencil className="w-4 h-4" />
                                {isEditing ? 'Cancel' : 'Edit'}
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        className="input bg-secondary-50 cursor-not-allowed"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="label">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        className="input bg-secondary-50 cursor-not-allowed"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="label">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        className="input bg-secondary-50"
                                        disabled
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
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="label">Date of Birth</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        className="input bg-secondary-50 cursor-not-allowed"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="label">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Marital Status</label>
                                    <select
                                        name="maritalStatus"
                                        value={formData.maritalStatus}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
                                    >
                                        <option value="">Select Status</option>
                                        <option value="single">Single</option>
                                        <option value="married">Married</option>
                                        <option value="divorced">Divorced</option>
                                        <option value="widowed">Widowed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Blood Group</label>
                                    <input
                                        type="text"
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
                                        placeholder="e.g. A+"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label">Nationality</label>
                                    <input
                                        type="text"
                                        name="nationality"
                                        value={formData.nationality}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleSaveProfile}
                                        className="btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving to Database...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-secondary-100">
                            <h2 className="font-semibold text-secondary-900">Address Information</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="label">Street Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
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
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="label">State / Province</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="label">Zip / Postal Code</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={formData.zipCode}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="label">Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="input"
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Work Identity */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-secondary-100">
                            <h2 className="font-semibold text-secondary-900">Work Identity</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Employment Type</label>
                                    <input
                                        type="text"
                                        value={formData.employmentType}
                                        className="input bg-secondary-50 capitalize"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="label">Joining Date</label>
                                    <input
                                        type="text"
                                        value={formData.joiningDate}
                                        className="input bg-secondary-50"
                                        disabled
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label">Reporting Manager</label>
                                    <input
                                        type="text"
                                        value={formData.reportingManager}
                                        className="input bg-secondary-50"
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Password */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-secondary-100">
                            <h2 className="font-semibold text-secondary-900">Change Password</h2>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6">
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="label">Current Password</label>
                                    <div className="relative">
                                        <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={passwordData.currentPassword}
                                            onChange={handlePasswordChange}
                                            className="input pl-12"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">New Password</label>
                                    <div className="relative">
                                        <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                            className="input pl-12"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {!otpRequested ? (
                                    <button
                                        type="button"
                                        onClick={handleRequestOTP}
                                        className="btn-secondary w-full flex items-center justify-center gap-2"
                                        disabled={otpLoading || !passwordData.newPassword}
                                    >
                                        {otpLoading ? (
                                            <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                        ) : (
                                            <HiOutlineMail className="w-5 h-5" />
                                        )}
                                        {otpLoading ? 'Sending...' : 'Send Verification OTP'}
                                    </button>
                                ) : (
                                    <div className="animate-fadeIn space-y-4">
                                        <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
                                            <p className="text-sm text-primary-700 font-medium flex items-center gap-2">
                                                <HiOutlineMail className="w-4 h-4" />
                                                Check your email for the verification code.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="label">Verification OTP</label>
                                            <input
                                                type="text"
                                                name="otp"
                                                value={passwordData.otp}
                                                onChange={handlePasswordChange}
                                                className="input text-center tracking-[0.5em] font-mono text-lg"
                                                placeholder="000000"
                                                maxLength={6}
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                type="submit"
                                                className="btn-primary flex-1"
                                                disabled={passwordLoading || !passwordData.otp}
                                            >
                                                {passwordLoading ? 'Updating...' : 'Update Password'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOtpRequested(false)}
                                                className="btn-secondary px-3"
                                                title="Reset"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
