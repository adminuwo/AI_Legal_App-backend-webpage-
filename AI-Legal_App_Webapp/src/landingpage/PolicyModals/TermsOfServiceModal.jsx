import React from 'react';
import { X, Scale, FileText, DollarSign, Shield, AlertCircle, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { name } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { apiService } from '../../services/apiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const TermsOfServiceContent = () => {
    const { t } = useLanguage();
    const [dynamicSections, setDynamicSections] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        fetchTerms();
    }, []);

    const fetchTerms = async () => {
        setLoading(true);
        try {
            const data = await apiService.getLegalPage('terms-of-service');
            if (data && data.sections && data.sections.length > 0) {
                setDynamicSections(data.sections);
            }
        } catch (error) {
            console.error("Failed to fetch Terms:", error);
        } finally {
            setLoading(false);
        }
    };

    const sections = [
        {
            icon: FileText,
            title: t('tos_accept_title'),
            items: [
                t('tos_accept_item1'),
                t('tos_accept_item2'),
                t('tos_accept_item3')
            ]
        },
        {
            icon: Scale,
            title: t('tos_use_title'),
            items: [
                t('tos_use_item1'),
                t('tos_use_item2'),
                t('tos_use_item3'),
                t('tos_use_item4')
            ]
        },
        {
            icon: DollarSign,
            title: t('tos_billing_title'),
            items: [
                t('tos_billing_item1'),
                t('tos_billing_item2'),
                t('tos_billing_item3'),
                t('tos_billing_item4')
            ]
        },
        {
            icon: Shield,
            title: t('tos_ip_title'),
            items: [
                t('tos_ip_item1'),
                t('tos_ip_item2'),
                t('tos_ip_item3'),
                t('tos_ip_item4')
            ]
        },
        {
            icon: AlertCircle,
            title: t('tos_liability_title'),
            items: [
                t('tos_liability_item1'),
                t('tos_liability_item2'),
                t('tos_liability_item3'),
                t('tos_liability_item4')
            ]
        },
        {
            icon: UserX,
            title: t('tos_termination_title'),
            items: [
                t('tos_termination_item1'),
                t('tos_termination_item2'),
                t('tos_termination_item3'),
                t('tos_termination_item4')
            ]
        }
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-subtext animate-pulse">Loading Terms...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {dynamicSections ? (
                <>
                    {dynamicSections.map((section, index) => (
                        <div key={index} className="bg-surface/30 rounded-[2rem] sm:rounded-2xl p-5 sm:p-8 border border-border hover:border-primary/20 transition-all group">
                            <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
                                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-maintext pt-1.5 sm:pt-2">{section.title}</h3>
                                    <div className="h-1 w-10 sm:w-12 bg-primary/20 rounded-full mt-1.5 sm:mt-2 group-hover:w-20 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-6 sm:space-y-10">
                                {section.content.map((item, idx) => (
                                    <div key={idx} className="space-y-3 sm:space-y-4">
                                        {item.subtitle && !['General Terms', 'Policy Overview', 'Introduction', 'N/A', ''].includes(item.subtitle) && (
                                            <h4 className="text-base sm:text-lg font-bold text-maintext flex items-center gap-2 sm:gap-3 mb-2">
                                                <div className="w-1 h-5 sm:w-1.5 sm:h-6 bg-primary rounded-full" />
                                                {item.subtitle}
                                            </h4>
                                        )}
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {item.text}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            ) : (
                <>
                    <div className="bg-white dark:bg-white/[0.04] rounded-xl p-4 border border-border">
                        <p className="text-sm text-maintext leading-relaxed">
                            {t('tos_intro')}
                        </p>
                    </div>

                    {sections.map((section, index) => (
                        <div key={index} className="bg-white dark:bg-white/[0.04] rounded-xl p-5 border border-border hover:border-primary/30 transition-all">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <section.icon className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-maintext pt-1">{section.title}</h3>
                            </div>
                            <ul className="ml-1 sm:ml-14 space-y-2">
                                {section.items.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-subtext">
                                        <span className="text-primary mt-1">•</span>
                                        <span className="flex-1">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </>
            )}

            <div className="bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-xl p-5 border border-primary/20">
                <h3 className="text-lg font-bold text-maintext mb-3">{t('tos_questions_title_terms')}</h3>
                <div className="space-y-1.5 text-sm text-subtext">
                    <p><strong className="text-maintext">Email:</strong> <a href="mailto:admin@uwo24.com" className="text-primary hover:underline">admin@uwo24.com</a></p>
                    <p><strong className="text-maintext">Phone:</strong> <a href="tel:+918358990909" className="text-primary hover:underline">+91 83589 90909</a></p>
                </div>
            </div>
        </div>
    );
};

const TermsOfServiceModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-card dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-border"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-border bg-primary/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Scale className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-maintext">{t('termsOfService')}</h2>
                                <p className="text-xs text-subtext mt-0.5">{t('lastUpdated')}: January 22, 2026</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-surface rounded-lg transition-colors text-subtext hover:text-maintext"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <TermsOfServiceContent />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border bg-surface flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                        >
                            {t('close')}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TermsOfServiceModal;
