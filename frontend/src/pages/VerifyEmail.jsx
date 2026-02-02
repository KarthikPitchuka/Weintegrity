import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineMail } from 'react-icons/hi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [email, setEmail] = useState(location.state?.email || '');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [status, setStatus] = useState('input'); // input, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef([]);

    useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    useEffect(() => {
        // Countdown timer for resend
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleOtpChange = (index, value) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            inputRefs.current[5].focus();
        }
    };

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error('Please enter the complete 6-digit code');
            return;
        }

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/verify-email', { email, otp: otpString });

            setStatus('success');
            toast.success('Email verified successfully!');

            // Auto-login
            if (response.data.token && response.data.user) {
                setTimeout(() => {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    navigate('/dashboard');
                }, 2000);
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage(error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        setResendLoading(true);
        try {
            await api.post('/auth/resend-verification', { email });
            toast.success('New verification code sent!');
            setCountdown(60);
            setOtp(['', '', '', '', '', '']);
            setStatus('input');
            inputRefs.current[0].focus();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend code');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">

                {status === 'input' && (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
                                <HiOutlineMail className="w-8 h-8 text-primary-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-secondary-900">Verify Your Email</h1>
                            <p className="text-secondary-600 mt-2">
                                Enter the 6-digit code sent to your email
                            </p>
                        </div>

                        {/* Email Input */}
                        {!location.state?.email && (
                            <div className="mb-6">
                                <label className="label">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="Enter your email"
                                />
                            </div>
                        )}

                        {/* OTP Input */}
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
                                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-secondary-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={loading || otp.join('').length !== 6}
                            className="btn-primary w-full py-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Verifying...
                                </span>
                            ) : (
                                'Verify Email'
                            )}
                        </button>

                        <div className="mt-6 text-center">
                            <p className="text-secondary-500 text-sm mb-2">Didn't receive the code?</p>
                            {countdown > 0 ? (
                                <p className="text-secondary-400 text-sm">
                                    Resend in <span className="font-semibold text-primary-600">{countdown}s</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                    className="text-primary-600 font-medium hover:text-primary-700"
                                >
                                    {resendLoading ? 'Sending...' : 'Resend Code'}
                                </button>
                            )}
                        </div>

                        <div className="mt-4 text-center">
                            <Link to="/login" className="text-secondary-500 text-sm hover:text-secondary-700">
                                ← Back to Login
                            </Link>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                            <HiOutlineCheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-secondary-900 mb-2">Email Verified! 🎉</h1>
                        <p className="text-secondary-600 mb-6">
                            Your account has been verified successfully. Redirecting to dashboard...
                        </p>
                        <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <HiOutlineXCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-secondary-900 mb-2">Verification Failed</h1>
                        <p className="text-secondary-600 mb-6">{errorMessage}</p>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setStatus('input');
                                    setOtp(['', '', '', '', '', '']);
                                }}
                                className="block w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={handleResend}
                                disabled={resendLoading}
                                className="block w-full py-3 px-4 border border-secondary-300 text-secondary-700 rounded-lg font-medium hover:bg-secondary-50 transition-colors"
                            >
                                {resendLoading ? 'Sending...' : 'Get New Code'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
