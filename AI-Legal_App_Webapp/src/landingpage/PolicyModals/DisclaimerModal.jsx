import React from 'react';
import { X, Scale, AlertTriangle, BookOpen, Shield, UserCheck, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { name } from '../../constants';
import { apiService } from '../../services/apiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DisclaimerModal = ({ isOpen, onClose }) => {
    const [dynamicSections, setDynamicSections] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            fetchDisclaimer();
        }
    }, [isOpen]);

    const fetchDisclaimer = async () => {
        setLoading(true);
        try {
            const data = await apiService.getLegalPage('disclaimer');
            if (data && data.sections && data.sections.length > 0) {
                setDynamicSections(data.sections);
            }
        } catch (error) {
            console.error("Failed to fetch Disclaimer:", error);
        } finally {
            setLoading(false);
        }
    };

    const defaultSections = [
        {
            icon: Scale,
            title: "1. Informational & Legal Research Support Only",
            desc: "AI LEGAL™ is an artificial intelligence platform designed to assist advocates, legal professionals, and students. Outputs—including statutory searches, case law citations (BNS, BNSS, BSA, IPC, CrPC), and draft suggestions—do not constitute formal legal opinions or legal advice."
        },
        {
            icon: UserCheck,
            title: "2. No Advocate-Client Relationship",
            desc: "Using AI LEGAL™ does not establish an attorney-client or advocate-client relationship under the Advocates Act, 1961 or Bar Council of India regulations. Formal representation requires independent engagement of an enrolled advocate."
        },
        {
            icon: AlertTriangle,
            title: "3. Mandatory Verification of Judicial Citations",
            desc: "AI models can occasionally generate inaccurate, incomplete, or overruled case precedents. Practicing advocates are under a professional duty to independently cross-verify all case names, statutory sections, and citations before citing them in court."
        },
        {
            icon: AlertOctagon,
            title: "4. Limitation of Liability & Vetting Responsibility",
            desc: "Neither UNIFIED WEB OPTIONS & SERVICES PRIVATE LIMITED nor its developers assume liability for lost cases, dismissed petitions, or errors arising from reliance on AI suggestions. The executing advocate or user bears sole responsibility for final documents."
        }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl max-h-[85vh] bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-border bg-surface">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <Scale className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-maintext">AI Legal™ Disclaimer</h2>
                                <p className="text-xs text-subtext">Operational scope, regulatory limits & advocate verification duty</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-subtext hover:text-maintext hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
                                <p className="text-sm text-subtext animate-pulse">Loading AI Legal Disclaimer...</p>
                            </div>
                        ) : dynamicSections && dynamicSections.length > 0 ? (
                            dynamicSections.map((section, index) => (
                                <div key={index} className="bg-surface rounded-xl p-4 sm:p-5 border border-border hover:border-amber-500/30 transition-all">
                                    <h3 className="text-base font-bold text-maintext mb-3">{section.title}</h3>
                                    <div className="space-y-3">
                                        {section.content?.map((item, idx) => (
                                            <div key={idx} className="space-y-1">
                                                {item.subtitle && (
                                                    <h4 className="text-xs font-semibold text-maintext">{item.subtitle}</h4>
                                                )}
                                                <div className="text-xs sm:text-sm text-subtext leading-relaxed prose dark:prose-invert max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {item.text}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                                    <p className="text-xs sm:text-sm text-maintext leading-relaxed font-medium">
                                        AI output is informational support, not a substitute for professional legal advice. Practicing advocates must independently review and verify all citations and drafts before court submission.
                                    </p>
                                </div>

                                {defaultSections.map((sec, i) => {
                                    const Icon = sec.icon;
                                    return (
                                        <div key={i} className="bg-surface rounded-xl p-4 sm:p-5 border border-border">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600">
                                                    <Icon className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <h3 className="text-sm font-bold text-maintext">{sec.title}</h3>
                                                    <p className="text-xs text-subtext leading-relaxed">{sec.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* Contact */}
                        <div className="bg-gradient-to-r from-amber-500/5 to-primary/5 rounded-xl p-4 border border-amber-500/20 text-xs text-subtext space-y-1">
                            <p><strong className="text-maintext">UNIFIED WEB OPTIONS & SERVICES PRIVATE LIMITED</strong></p>
                            <p>Email: <a href="mailto:admin@uwo24.com" className="text-amber-600 hover:underline">admin@uwo24.com</a> | Helpline: +91 83589 90909</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border bg-surface flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:brightness-105 transition-all cursor-pointer shadow-xs"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DisclaimerModal;
