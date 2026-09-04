import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, AlertTriangle } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title = "Delete Message?", description = "Are you sure you want to delete this message? This action cannot be undone.", confirmText = "Delete Message" }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex justify-center items-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Glow BG */}
                        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#5555FF]/20 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-full transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Icon */}
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5555FF] to-[#3333DD] shadow-lg shadow-[#5555FF]/30 mb-5 relative">
                            <Trash2 className="w-7 h-7 text-white" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center border-2 border-black/50">
                                <AlertTriangle className="w-2.5 h-2.5 text-blue-900" />
                            </div>
                        </div>

                        {/* Text */}
                        <h3 className="text-xl font-black text-white mb-2">
                            {title}
                        </h3>
                        <p className="text-white/50 text-sm mb-8 leading-relaxed">
                            {description}
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={onConfirm}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5555FF] to-[#4444EE] text-white font-black text-sm hover:shadow-lg hover:shadow-[#5555FF]/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {confirmText}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-3.5 rounded-2xl bg-white/5 text-white/70 font-bold text-sm hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DeleteConfirmModal;
