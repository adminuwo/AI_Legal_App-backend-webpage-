import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Bug, Shield, Send } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { getUserData } from '../../userStore/userData';

const ReportModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState('form'); // 'form' | 'success'
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'bug',
        priority: 'medium',
        description: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = getUserData();
            await apiService.submitReport({
                ...formData,
                userId: user?.id || 'anonymous-' + Date.now()
            });
            setLoading(false);
            setStep('success');
        } catch (error) {
            console.error("Report failed", error);
            alert("Failed to submit report. Please try again.");
            setLoading(false);
            // Optionally handle error state in UI
        }
    };

    const handleClose = () => {
        setStep('form');
        setFormData({ type: 'bug', priority: 'medium', description: '' });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                    >
                        {step === 'form' ? (
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-maintext">Report an Issue</h2>
                                        <p className="text-sm text-subtext">Help us improve by reporting bugs or security concerns.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="p-2 text-subtext hover:text-maintext hover:bg-surface rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Issue Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-maintext mb-2">Issue Type</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'bug', label: 'Bug', icon: <Bug className="w-4 h-4" /> },
                                                { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
                                                { id: 'other', label: 'Other', icon: <AlertTriangle className="w-4 h-4" /> }
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${formData.type === type.id
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-surface border-border text-subtext hover:border-primary/50'
                                                        }`}
                                                >
                                                    {type.icon}
                                                    <span className="text-xs font-medium">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-sm font-medium text-maintext mb-2">Priority</label>
                                        <select
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-maintext focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        >
                                            <option value="low">Low - Minor cosmetic issue</option>
                                            <option value="medium">Medium - Functionality impacted</option>
                                            <option value="high">High - Critical system failure</option>
                                        </select>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-maintext mb-2">Description</label>
                                        <textarea
                                            required
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Please describe the issue in detail..."
                                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-maintext placeholder:text-subtext/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[120px] resize-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 text-sm font-medium text-subtext hover:text-maintext transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>Submit Report</span>
                                                <Send className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-10 flex flex-col items-center justify-center text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4"
                                >
                                    <CheckCircle className="w-8 h-8" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-maintext mb-2">Report Submitted!</h3>
                                <p className="text-subtext max-w-[250px] mb-6">Thank you for helping us make A-Series better. We've received your report.</p>
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-2 bg-surface border border-border text-maintext rounded-xl font-medium hover:bg-secondary transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReportModal;
