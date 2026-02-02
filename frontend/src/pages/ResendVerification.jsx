import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineMailOpen, HiOutlineCheckCircle } from 'react-icons/hi';
import api from '../services/api';
import toast from 'react-hot-toast';

const ResendVerification = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/auth/resend-verification', { email });
            setSent(true);
            toast.success('Verification email sent!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend verification email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                {!sent ? (
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                                <HiOutlineMailOpen className="w-8 h-8 text-primary-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-secondary-900">Resend Verification Email</h1>
                            <p className="text-secondary-600 mt-2">
                                Enter your email address and we'll send you a new verification link.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="label">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Sending...
                                    </span>
                                ) : (
                                    'Send Verification Email'
                                )}
                            </button>
                        </form>

                        <p className="text-center text-secondary-600 mt-6">
                            Remember your password?{' '}
                            <Link to="/login" className="text-primary-600 font-medium hover:underline">
                                Back to Login
                            </Link>
                        </p>
                    </>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                            <HiOutlineCheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-secondary-900 mb-2">Email Sent!</h1>
                        <p className="text-secondary-600 mb-6">
                            We've sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to verify your account.
                        </p>
                        <Link
                            to="/login"
                            className="btn-primary inline-block py-3 px-6"
                        >
                            Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResendVerification;
