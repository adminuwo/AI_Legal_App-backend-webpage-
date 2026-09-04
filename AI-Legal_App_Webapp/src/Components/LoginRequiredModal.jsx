import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, X, UserPlus, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsDark } from '../context/ThemeContext';

const LoginRequiredModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [toolName, setToolName] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const navigate = useNavigate();
    const isDark = useIsDark();

    useEffect(() => {
        const handleLoginRequired = (e) => {
            setToolName(e.detail?.toolName || 'AI LEGAL™ Magic Tools');
            setCustomMessage(e.detail?.customMessage || '');
            setIsOpen(true);
        };
        window.addEventListener('login_required', handleLoginRequired);
        return () => window.removeEventListener('login_required', handleLoginRequired);
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-[100000] backdrop-blur-md flex justify-center items-center p-4 ${
                        isDark ? 'bg-black/80' : 'bg-slate-900/40'
                    }`}
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`relative rounded-[40px] p-8 sm:p-11 max-w-[420px] w-full overflow-hidden ${
                            isDark
                                ? 'bg-[#111218] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.9)]'
                                : 'bg-white border border-slate-200 shadow-[0_40px_120px_rgba(0,0,0,0.12)]'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background glows */}
                        <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[120px] pointer-events-none ${
                            isDark ? 'bg-primary/20' : 'bg-primary/10'
                        }`} />
                        <div className={`absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-[130px] pointer-events-none ${
                            isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/10'
                        }`} />

                        {/* Header with Close */}
                        <div className="flex justify-between items-start mb-10">
                            <div className={`w-[72px] h-[72px] rounded-[24px] flex items-center justify-center ${
                                isDark
                                    ? 'bg-white/[0.04] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]'
                                    : 'bg-slate-100 border border-slate-200 shadow-inner'
                            }`}>
                                <Lock className={`w-10 h-10 ${isDark ? 'text-white' : 'text-slate-700'}`} strokeWidth={1.2} />
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={`p-2.5 rounded-full transition-all duration-300 group ${
                                    isDark
                                        ? 'text-white/30 hover:text-white hover:bg-white/10'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <X className="w-7 h-7 transition-transform group-hover:rotate-90" strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Text Content */}
                        <h3 className={`text-[32px] font-black mb-4 tracking-tight leading-tight ${
                            isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                            Login Required
                        </h3>
                        <p className={`text-[16px] mb-12 leading-relaxed font-medium ${
                            isDark ? 'text-white/40' : 'text-slate-500'
                        }`}>
                            {customMessage || (
                                <>
                                    Sign in to your{' '}
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>AI LEGAL™</span>{' '}
                                    account to unlock{' '}
                                    <span className="text-primary font-bold">
                                        {toolName === 'AI LEGAL™ Magic Tools' ? 'AI-Powered Legal Research' : toolName}
                                    </span>{' '}
                                    and other powerful AI magic tools.
                                </>
                            )}
                        </p>

                        {/* CTAs */}
                        <div className="space-y-4">
                            <motion.button
                                whileHover={{ scale: 1.015, y: -2 }}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => { setIsOpen(false); navigate('/login'); }}
                                className={`w-full py-5 rounded-[22px] font-black text-[16px] transition-all flex items-center justify-center gap-3.5 group relative overflow-hidden ${
                                    isDark
                                        ? 'bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.12)]'
                                        : 'bg-primary text-white shadow-[0_20px_50px_rgba(99,102,241,0.3)]'
                                }`}
                            >
                                <LogIn className="w-5.5 h-5.5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                                Log In Now
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.015 }}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => { setIsOpen(false); navigate('/signup'); }}
                                className={`w-full py-5 rounded-[22px] font-black text-[16px] transition-all flex items-center justify-center gap-3.5 ${
                                    isDark
                                        ? 'bg-transparent border border-white/15 text-white hover:bg-white/8'
                                        : 'bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <UserPlus className={`w-5.5 h-5.5 ${isDark ? 'text-white/80' : 'text-slate-500'}`} strokeWidth={1.5} />
                                Create Account
                            </motion.button>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className={`w-full mt-12 py-2 text-[12px] font-black transition-all uppercase tracking-[0.3em] ${
                                isDark
                                    ? 'text-white/20 hover:text-white/60'
                                    : 'text-slate-300 hover:text-slate-500'
                            }`}
                        >
                            Maybe Later
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoginRequiredModal;
