import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Zap, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserData } from '../userStore/userData';

const CreditUpsellPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleOutOfCredits = () => {
            const user = getUserData();
            if (user && user.email && user.email.toLowerCase() === 'admin@uwo24.com') return;
            setIsOpen(true);
        };
        window.addEventListener('out_of_credits', handleOutOfCredits);

        return () => window.removeEventListener('out_of_credits', handleOutOfCredits);
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex justify-center items-center p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Glow BG */}
                        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-full transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Icon */}
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 mb-5 relative">
                            <AlertTriangle className="w-7 h-7 text-white" />
                        </div>

                        {/* Text */}
                        <h3 className="text-xl font-black text-white mb-2">
                            Out of Credits?
                        </h3>
                        <p className="text-white/40 text-sm mb-6 leading-relaxed">
                            You've run out of credits. <span className="text-amber-400 font-bold">Upgrade your plan</span> to get massive limits and unlock all premium magic tools instantly.
                        </p>

                        {/* Feature bullets */}
                        <div className="flex flex-col gap-2 mb-6">
                            {['Massive Credit Allowance', 'Generate Images & Videos', 'Web & Deep Search', 'Code Writer Mode'].map(f => (
                                <div key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <Zap className="w-2.5 h-2.5 text-amber-400" />
                                    </div>
                                    {f}
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={() => { setIsOpen(false); navigate('/pricing'); }}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-sm hover:shadow-lg hover:shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Upgrade Plan
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full mt-3 py-2.5 text-xs font-semibold text-white/30 hover:text-white/60 transition-colors"
                        >
                            Maybe Later
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreditUpsellPopup;
