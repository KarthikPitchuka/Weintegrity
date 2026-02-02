import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineExclamationCircle, HiOutlineClock } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verificationRequired, setVerificationRequired] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [shiftRestriction, setShiftRestriction] = useState(null);
    const [loginError, setLoginError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setLoginError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setLoginError('');
        setVerificationRequired(false);
        setShiftRestriction(null);

        try {
            await login(email, password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (error) {
            const errorData = error.response?.data;

            // Check if shift restriction applies
            if (errorData?.shiftRestriction) {
                setShiftRestriction({
                    message: errorData.message,
                    shiftName: errorData.shiftName,
                    shiftTiming: errorData.shiftTiming,
                    workingDays: errorData.workingDays,
                    currentTime: errorData.currentTime
                });
            } else if (errorData?.requiresVerification) {
                // Check if email verification is required
                setVerificationRequired(true);
            } else {
                setLoginError(errorData?.message || 'Invalid email or password');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendLoading(true);
        try {
            await api.post('/auth/resend-verification', { email });
            toast.success('Verification email sent! Check your inbox.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend verification email');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800 p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">HR</span>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-xl">HR Portal</h1>
                            <p className="text-primary-200 text-sm">Management System</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-4xl font-bold text-white leading-tight">
                            Streamline your <br />
                            <span className="text-primary-200">HR Operations</span>
                        </h2>
                        <p className="mt-4 text-primary-100 text-lg">
                            Manage employees, track attendance, process payroll, and more - all in one place.
                        </p>
                    </div>
                </div>

                <div className="text-primary-200 text-sm">
                    © 2025 HR Portal. All rights reserved.
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">HR</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-xl text-secondary-900">HR Portal</h1>
                            <p className="text-secondary-500 text-sm">Management System</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-secondary-100">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-secondary-900">Welcome back</h2>
                            <p className="text-secondary-500 mt-2">Sign in to your account</p>
                        </div>

                        {/* Login Error Banner */}
                        {loginError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                                <div className="flex items-start gap-3">
                                    <HiOutlineExclamationCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-red-800 font-medium">Authentication Failed</p>
                                        <p className="text-red-700 text-sm mt-1">
                                            {loginError}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Email Verification Required Banner */}
                        {verificationRequired && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <HiOutlineExclamationCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-amber-800 font-medium">Email Verification Required</p>
                                        <p className="text-amber-700 text-sm mt-1">
                                            Please verify your email before logging in. Check your inbox for the verification link.
                                        </p>
                                        <button
                                            onClick={handleResendVerification}
                                            disabled={resendLoading}
                                            className="mt-2 text-sm text-amber-700 font-medium hover:text-amber-800 underline"
                                        >
                                            {resendLoading ? 'Sending...' : 'Resend verification email'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Shift Restriction Banner */}
                        {shiftRestriction && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <HiOutlineClock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-blue-800 font-medium">Login Restricted - Outside Shift Hours</p>
                                        <p className="text-blue-700 text-sm mt-1">
                                            {shiftRestriction.message}
                                        </p>
                                        {shiftRestriction.shiftTiming && (
                                            <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                                                <p className="text-sm text-blue-800">
                                                    <span className="font-medium">Shift:</span> {shiftRestriction.shiftName}
                                                </p>
                                                <p className="text-sm text-blue-800">
                                                    <span className="font-medium">Timing:</span> {shiftRestriction.shiftTiming}
                                                </p>
                                            </div>
                                        )}
                                        {shiftRestriction.workingDays && (
                                            <p className="text-sm text-blue-700 mt-2">
                                                <span className="font-medium">Working Days:</span> {shiftRestriction.workingDays}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="label">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`input pl-12 ${loginError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                                        placeholder="you@company.com"
                                    />
                                    <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`input pl-12 pr-12 ${loginError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                                        placeholder="••••••••"
                                    />
                                    <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                    >
                                        {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm text-secondary-600">Remember me</span>
                                </label>
                                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign in'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

