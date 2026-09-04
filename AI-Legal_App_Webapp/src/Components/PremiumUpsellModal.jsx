import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Crown, Zap, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PremiumUpsellModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [toolName, setToolName] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const handlePremiumRequired = (e) => {
            setToolName(e.detail?.toolName || 'this feature');
            setCustomMessage(e.detail?.customMessage || '');
            setIsOpen(true);
        };
        window.addEventListener('premium_required', handlePremiumRequired);
        return () => window.removeEventListener('premium_required', handlePremiumRequired);
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
                            <Lock className="w-7 h-7 text-white" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-300 flex items-center justify-center border-2 border-[#0f0f0f]">
                                <Crown className="w-2.5 h-2.5 text-amber-800" />
                            </div>
                        </div>

                        {/* Text */}
                        <h3 className="text-xl font-black text-white mb-1">
                            Premium Feature
                        </h3>
                        <p className="text-white/50 text-sm mb-1 capitalize font-semibold">
                            {toolName}
                        </p>
                        <p className="text-white/40 text-sm mb-6 leading-relaxed">
                            {customMessage ? customMessage : (
                                <>This magic tool is only available for <span className="text-amber-400 font-bold">paid plan users</span>. Upgrade your plan to unlock all AI magic tools.</>
                            )}
                        </p>

                        {/* Feature bullets */}
                        <div className="flex flex-col gap-2 mb-6">
                            {['Generate Images & Videos', 'Web & Deep Search', 'Convert to Audio & Doc', 'Code Writer Mode'].map(f => (
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
                            Upgrade Now
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

export default PremiumUpsellModal;
