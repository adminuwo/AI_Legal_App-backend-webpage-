import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Send, Search, FileText, Paperclip, MessageSquare, Zap, ChevronRight } from 'lucide-react';

const features = [
    {
        icon: Mail,
        title: 'Read Latest Emails',
        desc: 'Ask AI LEGAL™ to summarize your inbox instantly.',
        example: '"What are my 5 latest emails?"',
        color: 'from-blue-500/20 to-blue-500/5',
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-500/10',
    },
    {
        icon: Send,
        title: 'Send Emails',
        desc: 'Compose and send emails using natural language.',
        example: '"Send an email to john@example.com about the meeting."',
        color: 'from-primary/20 to-primary/5',
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
    },
    {
        icon: Search,
        title: 'Smart Search',
        desc: 'Search your inbox for any topic, sender, or keyword.',
        example: '"Search my emails for invoices from last month."',
        color: 'from-violet-500/20 to-violet-500/5',
        iconColor: 'text-violet-400',
        iconBg: 'bg-violet-500/10',
    },
    {
        icon: FileText,
        title: 'Draft Emails',
        desc: 'Create polished drafts and review before sending.',
        example: '"Draft a follow-up email to HR about my leave."',
        color: 'from-amber-500/20 to-amber-500/5',
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-500/10',
    },
    {
        icon: MessageSquare,
        title: 'Thread Replies',
        desc: 'Reply contextually within existing email threads.',
        example: '"Reply to Alex\'s latest email agreeing on Tuesday."',
        color: 'from-cyan-500/20 to-cyan-500/5',
        iconColor: 'text-cyan-400',
        iconBg: 'bg-cyan-500/10',
    },
    {
        icon: Paperclip,
        title: 'Attachment Intelligence',
        desc: 'Read and summarize PDFs and documents in emails.',
        example: '"Summarize the PDF attached in my last email."',
        color: 'from-rose-500/20 to-rose-500/5',
        iconColor: 'text-rose-400',
        iconBg: 'bg-rose-500/10',
    },
];

const GmailConnectedModal = ({ isOpen, onClose, onTryPrompt }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4" onClick={onClose}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#161B2E] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 custom-scrollbar"
                    >
                        {/* Top Gradient Line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-t-3xl" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="p-6 sm:p-8">
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                                {/* Gmail Icon */}
                                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#1E2438] border border-gray-100 dark:border-white/10 flex items-center justify-center shadow-lg shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-10 h-10">
                                        <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"/>
                                        <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"/>
                                        <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/>
                                        <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"/>
                                        <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z"/>
                                    </svg>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Just Connected</span>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                                        Gmail is now live in AISA™
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        Your AI assistant can now read, write and manage your emails.
                                    </p>
                                </div>
                            </div>

                            {/* Feature Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                {features.map((feature, i) => (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className={`relative p-4 rounded-2xl border border-gray-100 dark:border-white/8 bg-gradient-to-br ${feature.color} group cursor-pointer hover:scale-[1.02] transition-transform duration-200`}
                                        onClick={() => onTryPrompt && onTryPrompt(feature.example.replace(/"/g, ''))}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-xl ${feature.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                                                <feature.icon className={`w-4 h-4 ${feature.iconColor}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-0.5">{feature.title}</h4>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{feature.desc}</p>
                                                <p className={`text-[10px] font-bold mt-1.5 ${feature.iconColor} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                                                    <Zap size={9} /> Try: {feature.example}
                                                </p>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 ${feature.iconColor} opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1`} />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Quick Tip */}
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 mb-5">
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    <span className="font-black text-primary">💡 Pro Tip:</span> Click any feature card above to instantly try it in the AI LEGAL™ chat, or just type naturally — AI LEGAL™ will understand what you need.
                                </p>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        onTryPrompt && onTryPrompt('What are my latest 5 emails?');
                                        onClose();
                                    }}
                                    className="flex-1 py-3 bg-primary hover:opacity-90 text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
                                >
                                    <Mail size={16} />
                                    Check My Latest Emails
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-5 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 font-bold text-sm rounded-2xl transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GmailConnectedModal;
