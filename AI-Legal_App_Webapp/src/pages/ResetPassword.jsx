import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, CheckCircle, ArrowLeft, Key } from 'lucide-react';
import axios from 'axios';
import { apis } from '../types';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';
import ThemeToggle from '../Components/ThemeToggle';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [errorDetails, setErrorDetails] = useState(null);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    const triggerError = (errObj) => {
        const details = parseAuthError(errObj, 'reset', navigate, (actionType) => {
            if (actionType === 'focusPassword') {
                document.querySelector("input[placeholder='••••••••']")?.focus();
            }
        });
        setErrorDetails(details);
        setShowErrorDialog(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            triggerError("passwords don't match");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            triggerError("weak password");
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await axios.post(`${apis.resetPassword}/${token}`, {
                password,
                confirmPassword
            });
            setMessage(response.data.message);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            triggerError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#0B0F19] p-4 sm:p-6 md:p-8 relative transition-colors duration-300">
            {/* Top Header Controls */}
            <div className="absolute top-6 right-6 flex items-center gap-4">
                <ThemeToggle />
                <Link to="/login" className="text-sm font-medium text-[#6B7280] dark:text-zinc-400 hover:text-[#111827] dark:hover:text-zinc-100 flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
            </div>

            {/* Centered Card */}
            <div className="max-w-md w-full bg-white dark:bg-[#161726] border border-[#E5E7EB] dark:border-zinc-800/80 shadow-xl rounded-2xl p-8 sm:p-10 my-auto transition-colors duration-300">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <img 
                        src="/logo/logo_transparent.png" 
                        alt="AI LEGAL™" 
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain -mb-2.5 drop-shadow-sm" 
                    />
                    <span className="text-lg font-black text-[#111827] dark:text-zinc-100 tracking-wider uppercase mb-1">AI LEGAL™</span>
                    <h1 className="text-2xl font-bold text-[#111827] dark:text-zinc-100 tracking-tight mb-1">
                        Reset Password
                    </h1>
                    <p className="text-sm text-[#6B7280] dark:text-zinc-400">
                        Enter your new password below.
                    </p>
                </div>

                {message && (
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-sm text-center flex items-center justify-center gap-2 rounded-xl">
                        <CheckCircle className="w-5 h-5" />
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">
                            New Password
                        </label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-12 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-zinc-400 hover:text-[#111827] dark:hover:text-zinc-100"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#111827] dark:text-zinc-200 mb-1.5">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-zinc-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#FFFFFF] dark:bg-[#121321] border border-[#E5E7EB] dark:border-zinc-800 rounded-xl py-3 pl-12 pr-12 text-[#111827] dark:text-zinc-100 placeholder-[#9CA3AF] dark:placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B8860B] hover:opacity-95 text-[#111827] rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer uppercase tracking-wider text-sm mt-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-[#111827]/30 border-t-[#111827] rounded-full animate-spin" />
                        ) : (
                            'Reset Password'
                        )}
                    </button>
                </form>
            </div>

            <AuthErrorDialog
                visible={showErrorDialog}
                details={errorDetails}
                onClose={() => setShowErrorDialog(false)}
            />
        </div>
    );
};

export default ResetPassword;
