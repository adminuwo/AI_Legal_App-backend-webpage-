import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, CheckCircle, X, Loader, Trash2, ExternalLink, Link as LinkIcon, Globe } from 'lucide-react';
import { apiService } from '../../services/apiService';

const KnowledgeUpload = ({ onUploadSuccess }) => {
    const [activeTab, setActiveTab] = useState('file'); // 'file' | 'url'
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState('LEGAL');
    const [isDragActive, setIsDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
    const [errorMessage, setErrorMessage] = useState('');

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
            setUploadStatus(null);
        }
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setUploadStatus(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus(null);
        setErrorMessage('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        try {
            const data = await apiService.uploadKnowledgeDocument(formData, (percent) => {
                setUploadProgress(percent);
            });

            if (data.success) {
                setUploadStatus('success');
                if (onUploadSuccess) onUploadSuccess(data.data);
            }
        } catch (error) {
            setUploadStatus('error');
            setErrorMessage(error.response?.data?.message || 'Failed to upload document.');
        } finally {
            setIsUploading(false);
        }
    };

    const [crawlDepth, setCrawlDepth] = useState(2);
    const [maxPages, setMaxPages] = useState(20);
    const [frequency, setFrequency] = useState('daily');

    const handleUrlUpload = async () => {
        if (!url) return;

        setIsUploading(true);
        setUploadStatus(null);
        setErrorMessage('');

        try {
            const data = await apiService.uploadKnowledgeUrl({ 
                url, 
                category,
                depth: crawlDepth,
                maxPages: maxPages,
                frequency: frequency
            });

            if (data.success) {
                setUploadStatus('success');
                setUrl('');
                if (onUploadSuccess) onUploadSuccess(data.data);
            }
        } catch (error) {
            setUploadStatus('error');
            setErrorMessage(error.response?.data?.message || 'Failed to process URL.');
        } finally {
            setIsUploading(false);
        }
    };

    const resetUpload = () => {
        setFile(null);
        setUrl('');
        setUploadStatus(null);
        setUploadProgress(0);
        setErrorMessage('');
    };

    return (
        <div className="w-full bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-5 transition-all">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                <div className="flex-1 text-left">
                    <h2 className="text-xl font-bold text-maintext">
                        AISA RAG Knowledge Base
                    </h2>
                    <p className="text-subtext text-sm mt-2">
                        Add knowledge to your chatbot by uploading documents or submitted website links.
                    </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3 bg-white/10 p-1.5 rounded-xl border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-subtext ml-2">Target Category:</span>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-primary/20 text-primary border border-primary/30 rounded-lg px-3 py-1.5 text-xs font-bold outline-none hover:bg-primary/30 transition-all cursor-pointer"
                        >
                            <option value="LEGAL">LEGAL (Law/Pro)</option>
                            <option value="FINANCE">FINANCE (Markets/Books)</option>
                            <option value="GENERAL">GENERAL (Public)</option>
                        </select>
                    </div>

                    <div className="flex bg-white/10 p-1 rounded-xl">
                        <button
                            onClick={() => { setActiveTab('file'); resetUpload(); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'file' ? 'bg-primary text-white shadow-lg' : 'text-subtext hover:text-maintext'}`}
                        >
                            <UploadCloud className="w-4 h-4" /> File Upload
                        </button>
                        <button
                            onClick={() => { setActiveTab('url'); resetUpload(); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'url' ? 'bg-primary text-white shadow-lg' : 'text-subtext hover:text-maintext'}`}
                        >
                            <LinkIcon className="w-4 h-4" /> URL Upload
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full">
                <AnimatePresence mode="wait">
                    {!uploadStatus && activeTab === 'file' && (
                        <motion.div
                            key="file-tab"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            {!file && (
                                <div
                                    className={`relative w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ease-out cursor-pointer group hover:bg-slate-800/50 ${isDragActive ? 'border-primary bg-slate-800/80' : 'border-slate-600 bg-slate-800/30'
                                        }`}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={handleFileChange}
                                        accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,image/*"
                                    />

                                    <motion.div
                                        animate={{ y: isDragActive ? -10 : 0, scale: isDragActive ? 1.1 : 1 }}
                                        className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/30 transition-all"
                                    >
                                        <UploadCloud className="w-8 h-8 text-primary" />
                                    </motion.div>

                                    <p className="text-slate-200 font-medium text-lg">
                                        {isDragActive ? "Drop document here" : "Drag & drop document"}
                                    </p>
                                    <p className="text-slate-500 text-sm mt-2 font-medium">
                                        or click to browse from device
                                    </p>
                                </div>
                            )}

                            {file && (
                                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                <File className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                                                <p className="text-slate-500 text-xs">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            </div>
                                        </div>

                                        {!isUploading && (
                                            <button
                                                onClick={resetUpload}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {isUploading && (
                                        <div className="mb-6">
                                            <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                                                <span>Uploading to Google Cloud Storage...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                                                />
                                            </div>
                                        </div>
                                    )}



                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${isUploading
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            : 'bg-primary hover:opacity-90 text-white shadow-lg shadow-primary/25'
                                            }`}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <span>Upload to Knowledge Base</span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {!uploadStatus && activeTab === 'url' && (
                        <motion.div
                            key="url-tab"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl">
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Website URL</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="url"
                                            placeholder="https://example.com/article"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pl-12 pr-4 text-slate-200 outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        Tip: Provide a root domain (e.g., https://example.com) to automatically crawl up to 20 internal pages.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Update Frequency</label>
                                        <select
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value)}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-primary transition-colors text-sm"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="manual">Manual Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Crawl Depth</label>
                                        <select
                                            value={crawlDepth}
                                            onChange={(e) => setCrawlDepth(Number(e.target.value))}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 outline-none focus:border-primary transition-colors text-sm"
                                        >
                                            <option value={1}>1 (This link only)</option>
                                            <option value={2}>2 (Follow internal links)</option>
                                            <option value={3}>3 (Deep crawl)</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUrlUpload}
                                    disabled={isUploading || !url}
                                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${isUploading || !url
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-primary hover:opacity-90 text-white shadow-lg shadow-primary/25'
                                        }`}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            <span>Scraping & Ingesting...</span>
                                        </>
                                    ) : (
                                        <span>Add to Knowledge Base</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {uploadStatus === 'success' && (
                        <motion.div
                            key="success-msg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4"
                            >
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-emerald-400 mb-2">Success!</h3>
                            <p className="text-slate-300 mb-6 font-medium">
                                Knowledge has been added and indexed successfully.
                            </p>
                            <button
                                onClick={resetUpload}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium border border-slate-700"
                            >
                                Add More
                            </button>
                        </motion.div>
                    )}

                    {uploadStatus === 'error' && (
                        <motion.div
                            key="error-msg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center"
                        >
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                <X className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-red-400 mb-2">Ingestion Failed</h3>
                            <p className="text-red-300 text-sm mb-6">{errorMessage}</p>
                            <button
                                onClick={resetUpload}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium border border-slate-700"
                            >
                                Try Again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default KnowledgeUpload;
