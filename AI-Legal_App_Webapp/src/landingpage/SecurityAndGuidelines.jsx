import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, FileText, Scale, Eye, AlertTriangle } from 'lucide-react';
import ReportModal from '../Components/ReportModal/ReportModal';

const SecurityAndGuidelines = () => {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const sections = [
        {
            id: 1,
            title: "1. Data Privacy & Protection",
            icon: <Lock className="w-5 h-5 text-primary" />,
            content: (
                <div className="space-y-4">
                    <p className="text-subtext">A-Series™ is committed to safeguarding user data in accordance with applicable data protection laws, including but not limited to GDPR and CCPA.</p>

                    <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                        <div>
                            <h4 className="font-semibold text-maintext">1.1 Data Collection</h4>
                            <p className="text-sm text-subtext">A-Series™ may collect personal and technical information including account details, usage metadata, device identifiers, and file access permissions, solely for legitimate business and operational purposes.</p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-maintext">1.2 Data Usage</h4>
                            <p className="text-sm text-subtext mb-2">Collected data shall be used exclusively to:</p>
                            <ul className="list-disc list-inside text-sm text-subtext ml-2 space-y-1">
                                <li>Provide and operate platform services</li>
                                <li>Improve performance, reliability, and security</li>
                                <li>Communicate important updates or security notices</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-maintext">1.3 Data Sharing</h4>
                            <p className="text-sm text-subtext">A-Series™ does not sell personal data. Data may be shared with trusted third-party service providers strictly for operational requirements and in compliance with industry security standards.</p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-maintext">1.4 User Rights</h4>
                            <p className="text-sm text-subtext">Users retain the right to access, rectify, or request deletion of their data by contacting <a href="mailto:admin@uwo24.com" className="text-primary hover:underline">admin@uwo24.com</a>.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 2,
            title: "2. Account Security Responsibilities",
            icon: <Shield className="w-5 h-5 text-primary" />,
            content: (
                <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                        <span className="text-primary font-bold">2.1</span>
                        <p className="text-subtext">Users are solely responsible for maintaining the confidentiality of their account credentials.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                        <span className="text-primary font-bold">2.2</span>
                        <p className="text-subtext">A-Series™ employs industry-standard security measures, including encryption and secure session handling, to protect accounts; however, users must immediately report unauthorized access or suspected breaches.</p>
                    </div>
                </div>
            )
        },
        {
            id: 3,
            title: "3. Acceptable Use & Prohibited Conduct",
            icon: <AlertTriangle className="w-5 h-5 text-primary" />,
            content: (
                <div className="space-y-3">
                    <p className="text-subtext">Users agree not to engage in any activity that may compromise the platform, including but not limited to:</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Illegal or unauthorized use of services",
                            "Reverse engineering source code or AI models",
                            "Uploading malicious or offensive content",
                            "Attempting to bypass security controls"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-subtext bg-surface p-2 rounded-lg border border-border">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                {item}
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-subtext mt-2 italic">A-Series™ reserves the right to suspend or terminate accounts found in violation of these guidelines.</p>
                </div>
            )
        },
        {
            id: 4,
            title: "4. AI Usage & Content Disclaimer",
            icon: <Scale className="w-5 h-5 text-primary" />,
            content: (
                <div className="space-y-3">
                    <div className="bg-surface/50 p-3 rounded-lg border border-border">
                        <h4 className="font-semibold text-maintext text-sm mb-1">4.1 Accuracy Disclaimer</h4>
                        <p className="text-xs text-subtext">AI-generated outputs are provided on an “as-is” basis and may contain inaccuracies.</p>
                    </div>
                    <div className="bg-surface/50 p-3 rounded-lg border border-border">
                        <h4 className="font-semibold text-maintext text-sm mb-1">4.2 Reliability Disclaimer</h4>
                        <p className="text-xs text-subtext">Users acknowledge that A-Series™ shall not be held responsible for decisions or outcomes arising from reliance on AI-generated content, including legal, financial, or medical decisions.</p>
                    </div>
                    <div className="bg-surface/50 p-3 rounded-lg border border-border">
                        <h4 className="font-semibold text-maintext text-sm mb-1">4.3 AI Usage Policy</h4>
                        <p className="text-xs text-subtext">AI LEGAL™ AI tools must not be used for illegal activities. Users must not generate harmful, misleading, abusive, or discriminatory content using AI features.</p>
                    </div>
                    <div className="bg-surface/50 p-3 rounded-lg border border-border">
                        <h4 className="font-semibold text-maintext text-sm mb-1">4.4 Review Before Public Use</h4>
                        <p className="text-xs text-subtext">AI-generated outputs should be reviewed and verified by users before any public use, publication, or professional reliance. Users are solely responsible for content they publish.</p>
                    </div>
                    <div className="bg-surface/50 p-3 rounded-lg border border-border">
                        <h4 className="font-semibold text-maintext text-sm mb-1">4.5 Usage Restrictions</h4>
                        <p className="text-xs text-subtext">AI LEGAL™ reserves the right to restrict, suspend, or terminate access for any usage that violates ethical standards, legal requirements, or these guidelines.</p>
                    </div>
                </div>
            )
        },
        {
            id: 5,
            title: "5. File Upload & Document Security",
            icon: <FileText className="w-5 h-5 text-primary" />,
            content: (
                <div className="space-y-2">
                    <p className="text-subtext">Uploaded files are processed solely for functionality (document analysis, RAG).</p>
                    <p className="text-subtext">Restrictions apply to file size, type, and content to prevent abuse.</p>
                    <p className="text-subtext font-medium text-blue-500">Executable or malicious files may be rejected.</p>
                </div>
            )
        },
        {
            id: 6,
            title: "6. Cookies & Tracking Technologies",
            icon: <Eye className="w-5 h-5 text-primary" />,
            content: (
                <div className="space-y-2">
                    <p className="text-subtext">A-Series™ uses cookies for functionality, security, and optimization.</p>
                    <p className="text-subtext">Users may manage cookies via browser settings. See <span className="text-primary cursor-pointer hover:underline">Cookie Policy</span>.</p>
                </div>
            )
        },
        {
            id: 7,
            title: "7. Third-Party Services & Integrations",
            icon: <div className="w-5 h-5 flex items-center justify-center font-bold text-primary text-xs">3P</div>,
            content: <p className="text-subtext">Integrations with cloud providers and AI services are governed by contracts and limited to operational necessity.</p>
        },
        {
            id: 8,
            title: "8. Intellectual Property",
            icon: <div className="w-5 h-5 flex items-center justify-center font-bold text-primary text-xs">©</div>,
            content: <div className="text-subtext space-y-2">
                <p><strong>8.1 License:</strong> Limited, non-exclusive, non-transferable access.</p>
                <p><strong>8.2 Ownership:</strong> All rights remain with A-Series™ and UWO™.</p>
                <p><strong>8.3 Transfer:</strong> No transfer of ownership implies.</p>
            </div>
        },
        {
            id: 9,
            title: "9. Enforcement & Termination",
            icon: <AlertTriangle className="w-5 h-5 text-primary" />,
            content: <ul className="list-disc list-inside text-subtext text-sm">
                <li>Monitor for compliance</li>
                <li>Suspend/terminate for violations</li>
                <li>Immediate action for security threats</li>
            </ul>
        },
        {
            id: 10,
            title: "10. Policy Updates",
            icon: <FileText className="w-5 h-5 text-primary" />,
            content: <p className="text-subtext">Modifications may occur at any time. Continued use constitutes acceptance.</p>
        },
        {
            id: 11,
            title: "11. Contact Information",
            icon: <FileText className="w-5 h-5 text-primary" />,
            content: <p className="text-subtext">For questions, concerns, or rights-related requests, contact <a href="mailto:admin@uwo24.com" className="text-primary hover:underline">admin@uwo24.com</a>.</p>
        },
        {
            id: 12,
            title: "12. Incident Reporting & Support",
            icon: <AlertTriangle className="w-5 h-5 text-blue-500" />,
            content: (
                <div className="space-y-4">
                    <p className="text-subtext text-sm">If you witness any security violations, encounter technical issues, or need urgent assistance, please report them immediately.</p>
                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-500/20 border border-blue-500/20 transition-colors">
                            <span>📧 Report in App:</span>
                            <span className="font-semibold">Open Form</span>
                        </button>
                        <a href="tel:+918358990909" className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 border border-primary/20 transition-colors">
                            <span>📞 Support:</span>
                            <span className="font-semibold">+91 83589 90909</span>
                        </a>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden relative">
            {/* Header */}
            <header className="px-6 py-5 border-b border-border bg-secondary/30 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-maintext">Security & Guidelines</h1>
                        <p className="text-xs text-subtext">Last Updated: 07/03/2026</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-4xl mx-auto space-y-6 pb-10">

                    {/* Intro Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-secondary border border-border rounded-xl p-6 shadow-sm"
                    >
                        <p className="text-subtext leading-relaxed">
                            This Security & Guidelines section governs the acceptable use, data protection practices, and security standards applicable to <span className="text-maintext font-semibold">A-Series™</span>, operated by <span className="text-maintext font-semibold">UWO™</span>. By accessing or using the platform, you agree to comply with the terms set forth herein.
                        </p>
                    </motion.div>

                    {/* Grid for Sections */}
                    <div className="grid grid-cols-1 gap-4">
                        {sections.map((section, index) => (
                            <motion.div
                                key={section.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-secondary hover:bg-surface/50 border border-border rounded-xl p-5 hover:shadow-md transition-all duration-300"
                            >
                                <div className="flex items-center gap-3 mb-3 border-b border-border/50 pb-2">
                                    {section.icon}
                                    <h3 className="text-lg font-semibold text-maintext">{section.title}</h3>
                                </div>
                                <div className="pl-1">
                                    {section.content}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Contact & Footer */}
                    <div className="mt-8">


                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="bg-surface border border-border rounded-xl p-5"
                        >
                            <h3 className="font-bold text-maintext mb-2 flex items-center gap-2">
                                🧠 Legal Summary Statement
                            </h3>
                            <p className="text-subtext text-sm italic">
                                "These Security & Guidelines establish the framework for lawful use, data protection, AI governance, and operational security within the A-Series platform."
                            </p>
                        </motion.div>
                    </div>

                </div>
            </div>
            <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
        </div>
    );
};

export default SecurityAndGuidelines;
