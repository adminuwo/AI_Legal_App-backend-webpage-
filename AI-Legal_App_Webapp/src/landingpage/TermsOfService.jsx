import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TERMS_OF_SERVICE_DEFAULTS } from '../Tools/AI_Legal/constants/legalDefaults';
import { FileText, Scale, DollarSign, Shield, AlertCircle, UserX, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/apiService';
import { name } from '../constants';

const TermsOfService = () => {
    const navigate = useNavigate();
    const [sections, setSections] = useState([]);
    const [lastUpdated, setLastUpdated] = useState("March 7, 2026");
    const [loading, setLoading] = useState(true);

    const getDynamicIcon = (index) => {
        const icons = [FileText, Scale, DollarSign, Shield, AlertCircle, UserX];
        return icons[index % icons.length] || FileText;
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const data = await apiService.getLegalPage('terms-of-service');
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
                    setSections([]);
                }
            } catch (err) {
                console.error("Failed to fetch dynamic policy:", err);
                setSections([]);
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
                        <Scale className="w-7 h-7 sm:w-10 sm:h-10 text-amber-600" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-2 sm:mb-4">
                        Terms of Service
                    </h1>
                    <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                        Please read these terms carefully before using our AI-powered platform.
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
                        Welcome to {name}™. These Terms of Service ("Terms") govern your access to and use of our intelligent AI assistant platform, including all features, applications, content, and services (collectively, the "Service").
                    </p>
                    <p className="text-slate-700 leading-relaxed text-xs sm:text-base font-medium">
                        Please read these Terms carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
                    </p>
                </motion.div>

                {/* Terms Sections */}
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

                {/* Additional Terms */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 sm:mt-8 bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 border border-slate-200 shadow-sm"
                >
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Additional Terms</h2>
                    <div className="space-y-4 sm:space-y-6 text-xs sm:text-base text-slate-600 leading-relaxed">
                        <div>
                            <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Governing Law</h3>
                            <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Changes to Terms</h3>
                            <p>We reserve the right to modify these Terms at any time. We will notify users of material changes via email or platform notification. Continued use after changes constitutes acceptance of the modified Terms.</p>
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Severability</h3>
                            <p>If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.</p>
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-1 sm:mb-2">Global Regulatory Compliance</h3>
                            <p>AISA™ operates in compliance with major global data protection and privacy regulations including:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li><a href="https://gdpr.eu/" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-semibold hover:underline">General Data Protection Regulation (GDPR) — EU</a></li>
                                <li><a href="https://oag.ca.gov/privacy/ccpa" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-semibold hover:underline">California Consumer Privacy Act (CCPA) — USA</a></li>
                                <li><a href="https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-semibold hover:underline">PIPEDA — Canada</a></li>
                                <li><a href="https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-semibold hover:underline">Personal Data Protection Act (PDPA) — Singapore</a></li>
                                <li><a href="https://www.oaic.gov.au/privacy/the-privacy-act" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-semibold hover:underline">Privacy Act 1988 — Australia</a></li>
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* Contact Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-8 sm:mt-12 bg-amber-500/5 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 border border-amber-500/20 shadow-sm"
                >
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-4">Questions About These Terms?</h2>
                    <p className="text-xs sm:text-base text-slate-600 leading-relaxed mb-3 sm:mb-4 font-medium">
                        If you have any questions about these Terms of Service, please contact us:
                    </p>
                    <div className="space-y-2 text-xs sm:text-base text-slate-600">
                        <p><strong className="text-slate-900">Email:</strong> <a href="mailto:admin@uwo24.com" className="text-amber-600 font-semibold hover:underline">admin@uwo24.com</a></p>
                        <p><strong className="text-slate-900">Phone:</strong> <a href="tel:+918359890909" className="text-amber-600 font-semibold hover:underline">+91 83589 90909</a></p>
                        <p><strong className="text-slate-900">Address:</strong> Jabalpur, Madhya Pradesh, India</p>
                    </div>
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

export default TermsOfService;
