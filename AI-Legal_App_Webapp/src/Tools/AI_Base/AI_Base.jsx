import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, List, Settings, Search, Sparkles, Shield, Zap } from 'lucide-react';
import KnowledgeUpload from './KnowledgeUpload';
import KnowledgeManagement from './KnowledgeManagement';
import KnowledgeSourceManager from './KnowledgeSourceManager';

const AiBase = () => {
    const [activeTab, setActiveTab] = useState('manage'); // 'upload' | 'manage' | 'sources'
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleUploadSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        setActiveTab('manage');
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center gap-6 text-left">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-primary/20">
                        <Database size={40} className="stroke-[1.5]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-maintext tracking-tight uppercase italic">AI LEGAL™ <span className="text-primary italic">BASE</span></h1>
                            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">RAG Engine V2.0</span>
                        </div>
                        <p className="text-subtext text-sm font-bold mt-1 max-w-md">
                            The core intelligence center of AISA. Upload documents and crawl websites to power your custom AI knowledge base.
                        </p>
                    </div>
                </div>

                <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'manage' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-lg' : 'text-subtext hover:text-maintext'}`}
                    >
                        <List size={14} /> Assets Library
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-lg' : 'text-subtext hover:text-maintext'}`}
                    >
                        <Upload size={14} /> Ingest Data
                    </button>
                    <button
                        onClick={() => setActiveTab('sources')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sources' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-lg' : 'text-subtext hover:text-maintext'}`}
                    >
                        <Settings size={14} /> Source Manager
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-6">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    {activeTab === 'upload' ? (
                        <KnowledgeUpload onUploadSuccess={handleUploadSuccess} />
                    ) : activeTab === 'manage' ? (
                        <KnowledgeManagement key={refreshTrigger} />
                    ) : (
                        <KnowledgeSourceManager />
                    )}
                </motion.div>
            </div>

            {/* Quick Stats / Info Footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-subtext uppercase tracking-widest">Embedding Quality</p>
                        <p className="text-lg font-black text-maintext italic uppercase">Lossless Hybrid</p>
                    </div>
                </div>
                <div className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-subtext uppercase tracking-widest">Storage Type</p>
                        <p className="text-lg font-black text-maintext italic uppercase">Secure GCS</p>
                    </div>
                </div>
                <div className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Zap size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-subtext uppercase tracking-widest">Indexing Speed</p>
                        <p className="text-lg font-black text-maintext italic uppercase">Turbo-Sync</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiBase;
