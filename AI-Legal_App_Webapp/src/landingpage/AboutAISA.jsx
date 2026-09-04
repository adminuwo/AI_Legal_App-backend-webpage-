import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Info, MessageSquare, FileText, Image, Cloud, Camera, Mic, Share2, Scan, FileDiff, FileType, Search, Video, Globe, Headphones, Code, Wand2, TrendingUp, PlaySquare, Megaphone } from 'lucide-react';
import LegalLogo from '../Tools/AI_Legal/components/LegalLogo';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const AboutAISA = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { theme } = useTheme();

    const normalizedTheme = typeof theme === 'string' ? theme.toLowerCase() : 'system';
    const isDarkMode = normalizedTheme === 'dark' || (normalizedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (!isOpen) return null;

    const sections = [
        {
            title: t('coreIntelligence'),
            icon: <Bot className="w-5 h-5 text-blue-500" />,
            content: t('coreIntelligenceDesc')
        },
        {
            title: t('whyAisaExists'),
            icon: <Info className="w-5 h-5 text-blue-500" />,
            content: t('whyAisaExistsDesc')
        }
    ];

    const features = [
        { title: t('webSearch'), icon: <Globe className="w-4 h-4" />, desc: t('liveWebDataAccess') },
        { title: t('deepSearch'), icon: <Search className="w-4 h-4" />, desc: t('researchComplexTopics') },
        { title: t('convertToAudio'), icon: <Headphones className="w-4 h-4" />, desc: t('textDocsToVoice') },
        { title: t('analyzeDocument'), icon: <FileText className="w-4 h-4" />, desc: t('chatWithPdfsDocs') },
        { title: t('aiLegal'), icon: <LegalLogo size={16} />, desc: t('specializedAiLegalTools') }
    ];

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border"
                style={{
                    background: isDarkMode 
                        ? 'radial-gradient(ellipse 120% 80% at 50% 50%, #0c0018 0%, #04040e 100%)'
                        : 'radial-gradient(ellipse 120% 80% at 50% 50%, #E0E7FF 0%, #EEF2FF 100%)',
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(99, 102, 241, 0.2)',
                    color: isDarkMode ? '#fff' : '#0F172A'
                }}
            >
                {/* Immersive Header */}
                <div className="relative h-44 flex flex-col items-center justify-center shrink-0 overflow-hidden" style={{ borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(99, 102, 241, 0.1)' }}>
                    {/* Mesh Gradients */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[100%] rounded-full blur-[120px] animate-pulse" 
                             style={{ background: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(99,102,241,0.08)' }} />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[100%] rounded-full blur-[100px]" 
                             style={{ background: isDarkMode ? 'rgba(236,72,153,0.1)' : 'rgba(232,121,249,0.05)' }} />
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-full border transition-all z-50 cursor-pointer group"
                        style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(99, 102, 241, 0.2)' }}
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 transition-all duration-300" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6366f1' }} />
                    </button>

                    <div className="relative z-10 text-center px-6">
                        <motion.div 
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border mb-3"
                            style={{ 
                                background: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(99,102,241,0.05)',
                                borderColor: isDarkMode ? 'rgba(59,130,246,0.3)' : 'rgba(99,102,241,0.2)'
                            }}
                        >
                            <Info className="w-3 h-3 text-blue-400" />
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-blue-400">{t('nextGenPlatform')}</span>
                        </motion.div>
                        
                        <motion.h2 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl md:text-5xl font-black tracking-tighter mb-1 bg-clip-text text-transparent"
                            style={{ backgroundImage: isDarkMode ? 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.6))' : 'linear-gradient(to bottom, #1e1b4b, #4338ca)' }}
                        >
                            AI LEGAL<span className="text-blue-500" style={{ fontSize: '0.55em', verticalAlign: 'super', marginLeft: '1px' }}>™</span>
                        </motion.h2>
                        
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs md:text-sm font-medium tracking-wide"
                            style={{ color: isDarkMode ? 'rgba(203, 213, 225, 0.8)' : '#64748B' }}
                        >
                            {t('aiSmartAssistant')}
                        </motion.p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12 custom-scrollbar">
                    
                    {/* Intro Paragraph */}
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <p 
                            className="text-lg md:text-xl leading-[1.8]"
                            style={{ 
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#000000',
                                letterSpacing: '0.01em'
                            }}
                            dangerouslySetInnerHTML={{ __html: t('aboutIntro') }}
                        />
                    </motion.div>

                    {/* Modern Grid Sections */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {sections.map((sec, i) => (
                            <motion.div 
                                key={i}
                                initial={{ x: i % 2 === 0 ? -20 : 20, opacity: 0 }}
                                whileInView={{ x: 0, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative p-8 rounded-[2rem] border transition-all duration-500"
                                style={{ 
                                    background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(99, 102, 241, 0.03)',
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.1)'
                                }}
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 flex items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110"
                                         style={{ background: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(99,102,241,0.08)', color: '#3b82f6' }}>
                                        {sec.icon}
                                    </div>
                                    <h3 className="text-xl font-bold">{sec.title}</h3>
                                </div>
                                <p className="leading-relaxed font-medium" style={{ color: isDarkMode ? 'rgba(203, 213, 225, 0.7)' : '#475569' }}>
                                    {sec.content}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Features Showcase */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="h-[1px] flex-1" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(99, 102, 241, 0.2)' }} />
                            <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#64748B' }}>{t('powerhouseFeatures')}</span>
                            <div className="h-[1px] flex-1" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(99, 102, 241, 0.2)' }} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feat, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ y: 10, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: (i % 3) * 0.1 }}
                                    className="flex items-start gap-4 p-5 rounded-2xl border transition-all group"
                                    style={{ 
                                        background: isDarkMode ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.5)',
                                        borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.1)'
                                    }}
                                >
                                    <div className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                                         style={{ background: isDarkMode ? 'rgba(59,130,246,0.05)' : 'rgba(99,102,241,0.05)', color: '#3b82f6' }}>
                                        {feat.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm mb-1.5">{feat.title}</h4>
                                        <p className="text-xs leading-relaxed font-medium" style={{ color: isDarkMode ? 'rgba(203, 213, 225, 0.6)' : '#64748B' }}>
                                            {feat.desc}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Immersive User Badge Section */}
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        className="relative overflow-hidden rounded-[2.5rem] p-12 text-center text-white"
                        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                    >
                        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-8">{t('builtForEveryone')}</h3>
                            <div className="flex flex-wrap justify-center gap-3">
                                {['Advocates', 'Lawyers', 'Legal Professionals', 'Solicitors', 'Judges'].map((label, i) => (
                                    <span key={i} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold tracking-wide transition-colors backdrop-blur-md">
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

            </motion.div>
        </div>
    );
};

export default AboutAISA;
