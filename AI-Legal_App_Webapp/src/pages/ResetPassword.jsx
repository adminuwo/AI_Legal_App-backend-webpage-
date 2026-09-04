import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { apis } from '../types';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';

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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 bg-surface">
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white border border-border p-8 rounded-3xl shadow-xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-maintext mb-2">
                            Reset Password
                        </h1>
                        <p className="text-subtext">
                            Enter your new password below.
                        </p>
                    </div>

                    {message && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm text-center flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-maintext mb-2 ml-1">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-subtext" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-xl py-3 pl-12 pr-10 text-maintext placeholder-subtext focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-subtext hover:text-maintext transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-maintext mb-2 ml-1">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-subtext" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-xl py-3 pl-12 pr-10 text-maintext placeholder-subtext focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-primary rounded-xl font-bold text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin mr-2" />
                                    Resetting Password...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                </div>
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
