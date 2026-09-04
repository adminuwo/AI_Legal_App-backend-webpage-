import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft, AlertCircle, Pencil, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { AppRoute, apis } from '../types';
import AuthErrorDialog from '../Components/AuthErrorDialog';
import { parseAuthError } from '../utils/authErrorMapper';
import { getUserData, setUserData, userData as userDataAtom } from '../userStore/userData';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function VerificationForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const setUserRecoil = useSetRecoilState(userDataAtom);

    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendLoading, setResendLoading] = useState(false);

    const [errorDetails, setErrorDetails] = useState(null);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    const triggerError = (errObj) => {
        const details = parseAuthError(errObj, 'verification', navigate, (actionType) => {
            if (actionType === 'focusCode') {
                document.querySelector("input[type='text']")?.focus();
            }
        });
        setErrorDetails(details);
        setShowErrorDialog(true);
    };

    // Safety check for user data
    const user = getUserData();
    const email = user?.email || "";

    useEffect(() => {
        if (!email) {
            toast.error("User session not found. Please sign up again.");
            navigate(AppRoute.SIGNUP);
        }
    }, [email, navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (verificationCode.length !== 6) {
            triggerError("Please enter a 6-digit code.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await axios.post(apis.emailVerificationApi, { code: verificationCode, email });
            const finalData = setUserData(res.data);
            setUserRecoil({ user: finalData });

            toast.success("Welcome to AI Legal™! Your account has been created successfully.", {
                icon: '⚖️',
                style: {
                    borderRadius: '16px',
                    background: '#1F2937',
                    color: '#FFF',
                }
            });
            navigate(AppRoute.DASHBOARD, { state: location.state });
        } catch (err) {
            console.error("Verification Error:", err);
            triggerError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setError("");

        try {
            await axios.post(apis.resendCode, { email });
            toast.success("Verification code resent successfully!");
        } catch (err) {
            console.error("Resend Error:", err);
            triggerError(err);
        } finally {
            setResendLoading(true); // Wait, should be false!
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#FFFFFF]">
            {/* Left side - Branding (Hidden on mobile) */}
            <div className="hidden md:flex md:w-[45%] bg-[#F9FAFB] border-r border-[#E5E7EB] flex-col items-center justify-center p-12">
                <div className="max-w-md text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-[#6D5DFC] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-[#111827] mb-4">AI LEGAL™</h2>
                    <p className="text-[#6B7280] text-base leading-relaxed">The premium Legal Operating System designed exclusively for modern Advocates. Automate research, drafting, and analysis.</p>
                </div>
            </div>

            {/* Right side - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-12 relative overflow-y-auto custom-scrollbar">
                <Link to={AppRoute.SIGNUP} className="absolute top-8 right-8 text-sm font-medium text-[#6B7280] hover:text-[#111827] flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Signup
                </Link>

                <div className="max-w-sm w-full mx-auto mt-8 md:mt-0">
                    <div className="mb-10 text-center md:text-left">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#6D5DFC] rounded-xl mb-6 shadow-sm">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-[#111827] tracking-tight mb-2">Verify Your Email</h1>
                        <p className="text-[#6B7280] text-sm">We've sent a 6-digit code to</p>
                        <div className="flex items-center gap-2 mt-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-1.5 w-fit mx-auto md:mx-0">
                            <span className="font-medium text-[#111827] text-sm">{email}</span>
                            <Link to="/signup" className="text-[#6D5DFC] hover:text-[#5b4be8] transition-colors p-1">
                                <Pencil className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleVerify} className="space-y-6" autoComplete="off">
                        <div>
                            <input
                                type="text"
                                name="otp"
                                autoComplete="one-time-code"
                                maxLength={6}
                                required
                                value={verificationCode}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 6) setVerificationCode(val);
                                }}
                                placeholder="000000"
                                className="w-full text-center text-3xl tracking-[0.4em] py-5 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] transition-all text-[#111827] font-bold placeholder-[#D1D5DB]"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || verificationCode.length !== 6}
                            className="w-full py-3.5 bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Verify Email</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-[#6B7280] mb-2">Didn't receive the code?</p>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="text-[#6D5DFC] font-semibold hover:text-[#5b4be8] transition-colors disabled:opacity-50 text-sm"
                        >
                            {resendLoading ? 'Sending...' : 'Request New Code'}
                        </button>
                    </div>
                </div>
            </div>
            <AuthErrorDialog
                visible={showErrorDialog}
                details={errorDetails}
                onClose={() => setShowErrorDialog(false)}
            />
        </div>
    );
}