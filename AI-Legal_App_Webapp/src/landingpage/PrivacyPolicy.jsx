import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PRIVACY_POLICY_DEFAULTS } from '../Tools/AI_Legal/constants/legalDefaults';
import { Database, Lock, Shield, Eye, UserCheck, FileText, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/apiService';
import { name } from '../constants';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const [sections, setSections] = useState([]);
    const [lastUpdated, setLastUpdated] = useState("March 7, 2026");
    const [loading, setLoading] = useState(true);

    const getDynamicIcon = (index) => {
        const icons = [Database, Lock, Shield, Eye, UserCheck, FileText];
        return icons[index % icons.length] || FileText;
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const data = await apiService.getLegalPage('privacy-policy');
                if (data && data.sections && data.sections.length > 0) {
                    const mappedSections = data.sections.map((s, i) => ({
                        ...s,
                        icon: getDynamicIcon(i)
                    }));
                    setSections(mappedSections);
                    if (data.lastUpdated) {
                        setLastUpdated(new Date(data.lastUpdated).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }));
                    }
                } else {
                    setSections(PRIVACY_POLICY_DEFAULTS.map((s, i) => ({ ...s, icon: getDynamicIcon(i) })));
                }
            } catch (err) {
                console.error("Failed to fetch dynamic policy:", err);
                setSections(PRIVACY_POLICY_DEFAULTS.map((s, i) => ({ ...s, icon: getDynamicIcon(i) })));
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);


    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-amber-500/20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/')}
                        className="flex items-center gap-2 text-slate-600 hover:text-amber-600 transition-colors group font-semibold"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back</span>
                    </button>
                    <h1 className="text-xl font-extrabold text-amber-600">{name} <sup className="text-xs text-slate-400">TM</sup></h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 sm:mb-16"
                >
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-amber-500/10 mb-4 sm:mb-6">
                        <Shield className="w-7 h-7 sm:w-10 sm:h-10 text-amber-600" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-2 sm:mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                        Your privacy matters to us. Learn how we collect, use, and protect your data.
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 sm:mt-4">
                        <strong>Last Updated:</strong> {lastUpdated}
                    </p>
                </motion.div>

                {/* Introduction */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 mb-6 sm:mb-8 border border-slate-200 shadow-sm"
                >
                    <p className="text-slate-700 leading-relaxed mb-4 text-xs sm:text-base font-medium">
                        Welcome to {name}™ ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered intelligent assistant platform.
                    </p>
                    <p className="text-slate-700 leading-relaxed text-xs sm:text-base font-medium">
                        By using {name}™, you agree to the collection and use of information in accordance with this policy. We are committed to maintaining the highest standards of privacy and security for all our users.
                    </p>
                </motion.div>

                {/* Policy Sections */}
                <div className="space-y-4 sm:space-y-6">
                    {sections.map((section, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (index + 2) }}
                            className="bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 border border-slate-200 shadow-sm hover:border-amber-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <section.icon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900">{section.title}</h2>
                                </div>
                            </div>

                            <div className="space-y-4 sm:space-y-6 ml-0 sm:ml-16">
                                {section.content.map((item, idx) => (
                                    <div key={idx}>
                                        <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">{item.subtitle}</h3>
                                        <p className="text-xs sm:text-base text-slate-600 leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Global Regulatory Compliance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mt-6 sm:mt-8 bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 border border-slate-200 shadow-sm"
                >
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-4">Global Regulatory Compliance</h2>
                    <p className="text-xs sm:text-base text-slate-600 leading-relaxed mb-4">
                        AISA™ operates in compliance with major global data protection and privacy regulations. We are committed to upholding user rights across all jurisdictions.
                    </p>
                    <div className="space-y-2 sm:space-y-3">
                        {[
                            { name: "General Data Protection Regulation (GDPR) — EU", url: "https://gdpr.eu/" },
                            { name: "California Consumer Privacy Act (CCPA) — USA", url: "https://oag.ca.gov/privacy/ccpa" },
                            { name: "PIPEDA — Canada", url: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/" },
                            { name: "Personal Data Protection Act (PDPA) — Singapore", url: "https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act" },
                            { name: "Privacy Act 1988 — Australia", url: "https://www.oaic.gov.au/privacy/the-privacy-act" }
                        ].map((reg, i) => (
                            <a key={i} href={reg.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-xl transition-colors group">
                                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                                <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-amber-600 transition-colors">{reg.name}</span>
                            </a>
                        ))}
                    </div>
                </motion.div>

                {/* Contact Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-8 sm:mt-12 bg-amber-500/5 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 border border-amber-500/20 shadow-sm"
                >
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-4">Questions About Privacy?</h2>
                    <p className="text-xs sm:text-base text-slate-600 leading-relaxed mb-3 sm:mb-4 font-medium">
                        If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <div className="space-y-2 text-xs sm:text-base text-slate-600">
                        <p><strong className="text-slate-900">Email:</strong> <a href="mailto:admin@uwo24.com" className="text-amber-600 font-semibold hover:underline">admin@uwo24.com</a></p>
                        <p><strong className="text-slate-900">Phone:</strong> <a href="tel:+918359890909" className="text-amber-600 font-semibold hover:underline">+91 83589 90909</a></p>
                        <p><strong className="text-slate-900">Address:</strong> Jabalpur, Madhya Pradesh, India</p>
                    </div>
                </motion.div>

                {/* Policy Updates */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-6 sm:mt-8 p-4 sm:p-8 bg-slate-100 border border-slate-200 rounded-2xl sm:rounded-[2rem]"
                >
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Policy Updates</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically for any changes.
                    </p>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="mt-20 py-12 border-t border-slate-200 bg-white">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="text-sm text-slate-500 font-medium">
                        © {new Date().getFullYear()} {name}™. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
