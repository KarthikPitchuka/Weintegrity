import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineMail, HiOutlineCheckCircle, HiOutlineArrowLeft, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import api from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    useEffect(() => {
        if (step === 2 && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [step]);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            toast.success('Reset code sent to your email!');
            setStep(2);
            setCountdown(60);
        } catch (error) {
            // Still proceed to prevent email enumeration
            setStep(2);
            setCountdown(60);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            setOtp(pastedData.split(''));
            inputRefs.current[5].focus();
        }
    };

    const handleVerifyOTP = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/verify-reset-otp', { email, otp: otpString });
            toast.success('OTP verified!');
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/reset-password', {
                email,
                otp: otp.join(''),
                password
            });
            toast.success('Password reset successfully!');

            // Auto-login
            if (response.data.token && response.data.user) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                navigate('/dashboard');
            } else {
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            toast.success('New code sent!');
            setCountdown(60);
            setOtp(['', '', '', '', '', '']);
        } catch (error) {
            toast.error('Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // Password strength indicator
    const getPasswordStrength = () => {
        if (!password) return { strength: 0, label: '', color: '' };
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
        if (strength <= 3) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
        return { strength: 3, label: 'Strong', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">

                {/* Step 1: Enter Email */}
                {step === 1 && (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                <span className="text-3xl">🔑</span>
                            </div>
                            <h1 className="text-2xl font-bold text-secondary-900">Forgot Password?</h1>
                            <p className="text-secondary-600 mt-2">
                                No worries! Enter your email and we'll send you a reset code.
                            </p>
                        </div>

                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div>
                                <label className="label">Email Address</label>
                                <div className="relative">
                                    <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input pl-12"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3"
                            >
                                {loading ? 'Sending...' : 'Send Reset Code'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link to="/login" className="inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700">
                                <HiOutlineArrowLeft className="w-4 h-4" />
                                Back to Login
                            </Link>
                        </div>
                    </>
                )}

                {/* Step 2: Enter OTP */}
                {step === 2 && (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                <span className="text-3xl">📧</span>
                            </div>
                            <h1 className="text-2xl font-bold text-secondary-900">Enter Reset Code</h1>
                            <p className="text-secondary-600 mt-2">
                                Enter the 6-digit code sent to <strong>{email}</strong>
                            </p>
                        </div>

                        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-secondary-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.join('').length !== 6}
                            className="btn-primary w-full py-3 disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>

                        <div className="mt-6 text-center">
                            <p className="text-secondary-500 text-sm mb-2">Didn't receive the code?</p>
                            {countdown > 0 ? (
                                <p className="text-secondary-400 text-sm">
                                    Resend in <span className="font-semibold text-amber-600">{countdown}s</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendOTP}
                                    disabled={loading}
                                    className="text-amber-600 font-medium hover:text-amber-700"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setStep(1)}
                                className="text-secondary-500 text-sm hover:text-secondary-700"
                            >
                                ← Change email
                            </button>
                        </div>
                    </>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                                <HiOutlineCheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-secondary-900">Create New Password</h1>
                            <p className="text-secondary-600 mt-2">
                                Your code was verified! Enter your new password below.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="label">New Password</label>
                                <div className="relative">
                                    <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input pl-12 pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                    >
                                        {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`h-1 flex-1 rounded ${level <= passwordStrength.strength
                                                            ? passwordStrength.color
                                                            : 'bg-secondary-200'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-xs mt-1 ${passwordStrength.strength === 1 ? 'text-red-600' :
                                                passwordStrength.strength === 2 ? 'text-yellow-600' : 'text-green-600'
                                            }`}>
                                            {passwordStrength.label}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="label">Confirm Password</label>
                                <div className="relative">
                                    <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input pl-12"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                                )}
                            </div>

                            <button
                                onClick={handleResetPassword}
                                disabled={loading || password !== confirmPassword || password.length < 6}
                                className="btn-primary w-full py-3 disabled:opacity-50"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
