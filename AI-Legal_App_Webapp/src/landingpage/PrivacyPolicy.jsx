import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PRIVACY_POLICY_DEFAULTS } from '../Tools/AI_Legal/constants/legalDefaults';
import { Database, Lock, Shield, Eye, UserCheck, FileText, ArrowLeft, Scale, CheckCircle2, Cpu } from 'lucide-react';
import { apiService } from '../services/apiService';
import { name, logo } from '../constants';

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
                    <div className="flex items-center gap-2">
                        <img
                            src={logo || '/favicon.png'}
                            alt="AI LEGAL™ - Official Legal Intelligence Logo"
                            className="w-8 h-8 rounded-lg object-contain"
                        />
                        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                            AI LEGAL<sup className="text-[10px] font-bold text-slate-400 ml-0.5">TM</sup>
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 sm:mb-10"
                >
                    <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500/10 mb-3 sm:mb-4">
                        <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2">
                        Privacy Policy & Trust Center
                    </h1>
                    <p className="text-xs sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
                        Your privacy, credibility, and data security matter to us. Learn how we protect your legal workflows.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        <strong>Last Updated:</strong> {lastUpdated}
                    </p>
                </motion.div>

                {/* ── UNIFIED TRUST & GOVERNANCE SECTION (4 PILLARS IN ONE ROW) ── */}
                <section id="trust" className="mb-8 sm:mb-12 scroll-mt-24">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            Unified Trust & Governance
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Built on 4 Pillars of Absolute Trust
                        </h2>
                        <p className="text-slate-600 text-[11px] sm:text-xs max-w-xl mx-auto mt-1.5">
                            Every legal query, drafting workflow, and case file is safeguarded under strict Indian legal standards and verified zero-leakage security.
                        </p>
                    </div>

                    {/* 4 Pillars in a Single Row on Desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
                        {/* Pillar 1: Credibility */}
                        <motion.div
                            whileHover={{ y: -3 }}
                            className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 hover:border-amber-500/40 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                        <Scale className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                        Citations
                                    </span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                                    1. Verified Credibility
                                </h3>
                                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                                    Grounded strictly in BNS, BNSS, BSA & verified Supreme Court and High Court precedents with zero synthetic hallucinations.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px] font-medium text-slate-700 pt-2 border-t border-slate-100">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">⚖️ SCC Precedents</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">📜 BNS 2024</span>
                            </div>
                        </motion.div>

                        {/* Pillar 2: Privacy */}
                        <motion.div
                            whileHover={{ y: -3 }}
                            className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 hover:border-blue-500/40 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                        Privilege
                                    </span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                                    2. Client-Attorney Privacy
                                </h3>
                                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                                    Absolute advocate-client privilege. Case files and client data are never sold, never shared, and never used to train public models.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px] font-medium text-slate-700 pt-2 border-t border-slate-100">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">🔒 Zero Selling</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">🛡️ Tenant Isolation</span>
                            </div>
                        </motion.div>

                        {/* Pillar 3: Data Security */}
                        <motion.div
                            whileHover={{ y: -3 }}
                            className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 hover:border-emerald-500/40 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                        <Shield className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                        AES-256
                                    </span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                                    3. Bank-Grade Security
                                </h3>
                                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                                    Military-grade AES-256 encryption at rest and TLS 1.3 cryptographic tunnels in transit with continuous automated audit logging.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px] font-medium text-slate-700 pt-2 border-t border-slate-100">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">🔐 AES-256 Bit</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">🌐 TLS 1.3</span>
                            </div>
                        </motion.div>

                        {/* Pillar 4: Responsible AI */}
                        <motion.div
                            whileHover={{ y: -3 }}
                            className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 hover:border-purple-500/40 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                        <Cpu className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                                        Human-Led
                                    </span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                                    4. Responsible AI
                                </h3>
                                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                                    Engineered as an assistant for practitioners. Strict fact-grounding with human-in-the-loop validation for generated drafts.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px] font-medium text-slate-700 pt-2 border-t border-slate-100">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">🎯 Zero Hallucination</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100">🤝 Human In Loop</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Trust Badges Verification Strip */}
                    <div className="mt-4 bg-white rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-around gap-2 text-center">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-semibold text-slate-700">BNS & BNSS 2024 Compliant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-semibold text-slate-700">Encrypted Cloud Workspaces</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-semibold text-slate-700">Client Confidentiality Protected</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-semibold text-slate-700">Real-Time Legal Grounding</span>
                        </div>
                    </div>
                </section>

                {/* Introduction */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 mb-6 sm:mb-8 border border-slate-200 shadow-sm"
                >
                    <p className="text-slate-700 leading-relaxed mb-4 text-xs sm:text-base font-medium">
                        Welcome to {name} ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered intelligent assistant platform.
                    </p>
                    <p className="text-slate-700 leading-relaxed text-xs sm:text-base font-medium">
                        By using {name}, you agree to the collection and use of information in accordance with this policy. We are committed to maintaining the highest standards of privacy and security for all our users.
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
                        AI LEGAL™ operates in compliance with major global data protection and privacy regulations. We are committed to upholding user rights across all jurisdictions.
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
