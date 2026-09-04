import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { COOKIE_POLICY_DEFAULTS } from '../Tools/AI_Legal/constants/legalDefaults';
import { Cookie, Settings2, Smartphone, BarChart3, Shield, FileText, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/apiService';
import { name } from '../constants';

const CookiePolicy = () => {
    const navigate = useNavigate();
    const [sections, setSections] = useState([]);
    const [lastUpdated, setLastUpdated] = useState("March 7, 2026");
    const [loading, setLoading] = useState(true);

    const getDynamicIcon = (index) => {
        const icons = [Cookie, Settings2, Smartphone, BarChart3, Shield, FileText];
        return icons[index % icons.length] || FileText;
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const data = await apiService.getLegalPage('cookie-policy');
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-950 dark:via-purple-950/10 dark:to-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/')}
                        className="flex items-center gap-2 text-subtext hover:text-primary transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back</span>
                    </button>
                    <h1 className="text-xl font-bold text-primary">{name} <sup className="text-xs">TM</sup></h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 mb-6">
                        <Cookie className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
                        Cookie Policy
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Learn how we use cookies and similar technologies to enhance your experience.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                        <strong className="text-gray-700 dark:text-gray-200">Last Updated:</strong> {lastUpdated}
                    </p>
                </motion.div>

                {/* Introduction */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-8 mb-8 border border-border shadow-sm"
                >
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
                        This Cookie Policy explains how {name}™ uses cookies and similar technologies to recognize you when you visit our platform. It explains what these technologies are, why we use them, and your rights to control their use.
                    </p>
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                        By continuing to use {name}™, you consent to our use of cookies in accordance with this policy. You can change your cookie preferences at any time through your browser or account settings.
                    </p>
                </motion.div>

                {/* Cookie Sections */}
                <div className="space-y-6">
                    {sections.map((section, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (index + 2) }}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <section.icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{section.title}</h2>
                                </div>
                            </div>

                            <div className="space-y-6 ml-16">
                                {section.content.map((item, idx) => (
                                    <div key={idx} className="border-l-2 border-purple-400/50 pl-4">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{item.subtitle}</h3>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Cookie Table */}


                {/* Contact Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-12 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl p-8 border border-purple-500/20"
                >
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Questions About Cookies?</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        If you have questions about our use of cookies or this policy, please contact us:
                    </p>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                        <p><strong className="text-gray-900 dark:text-white">Email:</strong> <a href="mailto:admin@uwo24.com" className="text-primary hover:underline">admin@uwo24.com</a></p>
                        <p><strong className="text-gray-900 dark:text-white">Phone:</strong> <a href="tel:+918359890909" className="text-primary hover:underline">+91 83589 90909</a></p>
                        <p><strong className="text-gray-900 dark:text-white">Address:</strong> Jabalpur, Madhya Pradesh, India</p>
                    </div>
                </motion.div>

                {/* Policy Updates */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl"
                >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Policy Updates</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        We may update this Cookie Policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes by posting a notice on our platform or via email.
                    </p>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="mt-20 py-8 border-t border-border bg-white/50 dark:bg-slate-900/50">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="text-sm text-subtext">
                        © {new Date().getFullYear()} {name}™. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default CookiePolicy;
