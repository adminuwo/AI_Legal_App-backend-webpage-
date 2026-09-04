import React, { useState, useEffect } from 'react';
import './LegalPrecedents.css';
import { apiService } from '../../services/apiService';

import { motion, AnimatePresence } from 'framer-motion';
import {
    Scale, Search, FileText, ChevronRight, Gavel,
    Calendar, Shield, AlertCircle, Copy, Save,
    Share2, ExternalLink, Bookmark, CheckCircle2,
    ArrowLeft, Info, Filter, Zap, BookOpen, ArrowRight, X, Brain,
    Briefcase, Plus, Folder, Sparkles, MessageSquare, History, FileSearch,
    ChevronDown, Layout, RefreshCcw, FileDown, MapPin
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { useSetRecoilState } from 'recoil';
import { toggleState } from '../../userStore/userData';
import { apis } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useLegalToolCredits } from '../../hooks/useLegalToolCredits';

export const truncateText = (text, maxLength = 120) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
};

const LegalPrecedents = ({ projectId: initialProjectId, onBack, cases = [], onSelectCase, onCreateCase, onUseInArgument, onUpdateCase }) => {
    const { toolkitLanguage, tLegal: t } = useLanguage();
    const currentLang = toolkitLanguage;
    const [mode, setMode] = useState('CURRENT'); // 'CURRENT' or 'MANUAL'
    const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || null); // Use initialProjectId if provided
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (initialProjectId) {
            setSelectedProjectId(initialProjectId);
        }
    }, [initialProjectId]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedCaseDetail, setSelectedCaseDetail] = useState(null);
    const [searchMetadata, setSearchMetadata] = useState(null);
    const [isActionLoading, setIsActionLoading] = useState({}); // { [precedentId]: { [action]: true } }
    const [isSavingToCaseOpen, setIsSavingToCaseOpen] = useState(false);
    const [isCaseListOpen, setIsCaseListOpen] = useState(false);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [pendingPrecedentToSave, setPendingPrecedentToSave] = useState(null);
    const [aiResponses, setAiResponses] = useState({}); // { [precedentId]: { [actionType]: response } }
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const { handleToolUsage } = useLegalToolCredits();

    // Get the actual case object from the selectedProjectId or fallback to null (never auto-select)
    const activeCase = cases.find(c => c._id === selectedProjectId);

    const handleSearch = async (manualQuery = null, forceProjectId = null) => {
        const targetProjectId = forceProjectId || (mode === 'CURRENT' ? selectedProjectId : null);
        if (mode === 'CURRENT' && !targetProjectId) return;

        // Credit Check & Deduction
        const creditSuccess = await handleToolUsage("Legal Precedents");
        if (!creditSuccess) return;

        setIsLoading(true);
        try {
            const searchQuery = manualQuery || (mode === 'MANUAL' ? query : '');
            const response = await axios.post(`${apis.precedents}/search`, {
                query: searchQuery,
                projectId: mode === 'CURRENT' ? targetProjectId : null,
                language: currentLang
            });

            setResults(response.data.precedents || []);
            setSearchMetadata({
                mode: response.data.mode,
                query: response.data.query
            });

            if (response.data.precedents?.length === 0) {
                toast.error("No relevant precedents found for this case context.");
            }
        } catch (error) {
            console.error("Search failed:", error);
            toast.error("Failed to fetch precedents. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const onCaseClick = (c) => {
        setSelectedProjectId(c._id);
        onSelectCase(c); // Update global context if needed
        handleSearch(null, c._id);
    };

    const resetSelection = () => {
        setSelectedProjectId(null);
        setResults([]);
        setSearchMetadata(null);
    };

    const handleCaseChange = async (newCase) => {
        setIsCaseListOpen(false);
        const oldId = selectedProjectId;
        setSelectedProjectId(newCase._id);
        onSelectCase(newCase);

        // Auto Re-Analysis Logic
        if (selectedCaseDetail) {
            setIsReanalyzing(true);
            try {
                // We use the reanalyze endpoint to get fresh similarity, relevance and reasoning
                const reanalyzed = await apiService.reanalyzePrecedent(
                    selectedCaseDetail,
                    newCase._id,
                    toolkitLanguage
                );

                // Update the detail view with new analysis
                setSelectedCaseDetail(reanalyzed);

                // Clear AI responses for the old case context to avoid confusion
                setAiResponses(prev => ({
                    ...prev,
                    [reanalyzed._id || reanalyzed.case_identity?.case_name]: {}
                }));

                toast.success(`Analysis updated for: ${newCase.name}`);
            } catch (error) {
                console.error("Re-analysis failed:", error);
                toast.error("Failed to re-analyze precedent for the new case context.");
            } finally {
                setIsReanalyzing(false);
            }
        } else if (mode === 'CURRENT') {
            // In list view, just refresh search
            handleSearch(null, newCase._id);
        }
    };

    useEffect(() => {
        if (initialProjectId && mode === 'CURRENT') {
            setSelectedProjectId(initialProjectId);
            if (!results.length && !isLoading) {
                handleSearch(null, initialProjectId);
            }
        }
    }, [initialProjectId]);

    useEffect(() => {
        // If mode switches to manual, results stay but we are in manual mode.
        // If mode switches to current and no selection, results cleared.
        if (mode === 'CURRENT' && !selectedProjectId) {
            setResults([]);
            setSearchMetadata(null);
        }
    }, [mode, selectedProjectId]);

    const copyCitation = (caseItem) => {
        const { case_identity = {} } = caseItem;
        const name = case_identity.case_name || caseItem.case_name || "Unknown Case";
        const court = case_identity.court || caseItem.court || "";
        const year = case_identity.year || caseItem.year || "";
        const citation = case_identity.citation || caseItem.citation || "Citation unavailable";

        let textToCopy = `${name}`;
        if (court) textToCopy += `, ${court}`;
        if (year) textToCopy += ` (${year})`;
        if (citation && citation !== "Citation unavailable") textToCopy += `, ${citation}`;

        navigator.clipboard.writeText(textToCopy);
        toast.success("✅ Citation copied", {
            style: {
                borderRadius: '12px',
                background: 'var(--color-card)',
                color: 'var(--color-maintext)',
                fontSize: '11px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
            }
        });
    };

    const handleSaveAction = async (caseItem, forceProjectId = null) => {
        const targetId = forceProjectId || selectedProjectId;
        if (!targetId) {
            setPendingPrecedentToSave(caseItem);
            setIsSavingToCaseOpen(true);
            return;
        }

        const targetCase = cases.find(c => c._id === targetId);
        if (!targetCase) return;

        const id = caseItem._id || caseItem.case_identity?.case_name;
        const alreadySaved = targetCase.savedPrecedents?.some(p => (p._id || p.case_identity?.case_name) === id);

        if (alreadySaved) {
            toast.error("Already saved to this case");
            return;
        }

        setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], save: true } }));

        try {
            const updatedSaved = [...(targetCase.savedPrecedents || []), caseItem];
            const updatedCase = { ...targetCase, savedPrecedents: updatedSaved };

            const result = await apiService.updateProject(targetId, updatedCase);
            if (onUpdateCase) onUpdateCase(result);

            toast.success(`✅ Saved to ${targetCase.name || 'Case'}`, {
                icon: '💾'
            });
        } catch (error) {
            toast.error("Failed to save. Try again");
            console.error("Save error:", error);
        } finally {
            setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], save: false } }));
        }
    };

    const handleCiteAction = async (caseItem) => {
        const id = caseItem._id || caseItem.case_identity?.case_name;
        setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], cite: true } }));

        try {
            // Generate structured argument
            const { case_identity = {}, judgment_basis = {} } = caseItem;
            const name = case_identity.case_name || "the cited case";
            const principle = judgment_basis.principles_applied?.[0] || "the established legal principles";
            const reasoning = judgment_basis.legal_reasoning?.slice(0, 150) || "the court's reasoning";

            const argumentTemplate = `As held in ${name}, the court established that ${principle}. Specifically, it was observed that "${reasoning}...". This principle directly applies to the current matter because...`;

            await new Promise(resolve => setTimeout(resolve, 600));
            onUseInArgument(argumentTemplate);
        } finally {
            setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], cite: false } }));
        }
    };

    const handleDownloadPDF = async (precedentData) => {
        if (!precedentData) return;

        setIsPdfLoading(true);
        const loadingToast = toast.loading(t('generatingPDF'), {
            style: { borderRadius: '12px', background: 'var(--color-card)', color: 'var(--color-maintext)', fontSize: '12px' }
        });

        try {
            const blob = await apiService.generatePrecedentPDF(precedentData);

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');

            // Generate Filename: CaseName_Court_Year.pdf
            const caseName = (precedentData.case_identity?.case_name || precedentData.case_name || 'Judgment').replace(/[^a-z0-9]/gi, '_');
            const court = (precedentData.case_identity?.court || precedentData.court || 'Court').replace(/[^a-z0-9]/gi, '_');
            const year = precedentData.case_identity?.year || precedentData.year || 'Unknown';

            link.href = url;
            link.setAttribute('download', `${caseName}_${court}_${year}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("PDF Downloaded Successfully", { id: loadingToast });
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate PDF. Please try again.", { id: loadingToast });
        } finally {
            setIsPdfLoading(false);
        }
    };

    const handleSummarizeAction = async (caseItem) => {
        const id = caseItem._id || caseItem.case_identity?.case_name;
        
        // Credit Check & Deduction
        const creditSuccess = await handleToolUsage("Legal Summarizer");
        if (!creditSuccess) return;

        setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], summary: true } }));

        try {
            const result = await apiService.analyzePrecedent('summarize', caseItem, null, toolkitLanguage);
            setAiResponses(prev => ({
                ...prev,
                [id]: { ...prev[id], summarize: result.analysis }
            }));

            // Auto scroll will be handled by a ref or effect in the component
            toast.success("Summary generated successfully");
        } catch (error) {
            toast.error("Failed to generate summary. Try again.");
        } finally {
            setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], summary: false } }));
        }
    };

    const handleCompareAction = async (caseItem) => {
        const id = caseItem._id || caseItem.case_identity?.case_name;

        // Credit Check & Deduction
        const creditSuccess = await handleToolUsage("Legal Comparison");
        if (!creditSuccess) return;

        setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], compare: true } }));

        try {
            const result = await apiService.analyzePrecedent('compare', caseItem, activeCase, toolkitLanguage);
            setAiResponses(prev => ({
                ...prev,
                [id]: { ...prev[id], compare: result.analysis }
            }));

            toast.success("Comparison insights generated");
        } catch (error) {
            toast.error("Failed to generate comparison. Try again.");
        } finally {
            setIsActionLoading(prev => ({ ...prev, [id]: { ...prev[id], compare: false } }));
        }
    };

    // --- Sub-renderers ---

    const renderCaseSelection = () => {
        if (cases.length === 0) return renderEmptyCases();

        return (
            <div className="precedent-selection-container max-w-6xl mx-auto py-6 sm:py-10 px-4">
                <div className="text-center mb-6 sm:mb-8">
                    <div className="w-10 h-10 bg-indigo-500/5 rounded-xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/10">
                        <Folder size={20} className="text-indigo-400/70" />
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-maintext tracking-tight mb-1">
                        {t('selectCaseToAnalyze')}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-subtext font-medium max-w-xs mx-auto">
                        {t('chooseCaseDescription')}
                    </p>
                </div>

                <div className="case-selection-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {cases.map((c) => (
                        <motion.div
                            key={c._id}
                            whileHover={{ y: -3 }}
                            className="case-card bg-card border border-border rounded-[20px] p-5 shadow-sm hover:shadow-sm hover:border-indigo-500/50 transition-colors duration-300 cursor-pointer flex flex-col justify-between"
                            onClick={() => onCaseClick(c)}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center">
                                        <Scale size={14} className="text-subtext" />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-background text-maintext/60 border border-border rounded-md">
                                        {c.caseType || 'General'}
                                    </span>
                                </div>
                                <h3 className="text-sm font-black text-maintext mb-1.5 line-clamp-1">{c.name}</h3>
                                <p className="text-[10px] text-subtext line-clamp-2 mb-4 font-medium leading-relaxed">
                                    {(c.summary || c.caseSummary) ? truncateText(c.summary || c.caseSummary, 110) : "No description provided for this case."}
                                </p>
                            </div>

                            <div className="case-card-footer flex items-center justify-between pt-3 border-t border-border">
                                <span className="text-[9px] text-subtext/60 font-bold uppercase tracking-wider">
                                    {new Date(c.updatedAt).toLocaleDateString()}
                                </span>
                                <button className="analyze-btn flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/10 transition-all">
                                    Analyze Precedents <ArrowRight size={12} />
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        onClick={onCreateCase}
                        className="border-2 border-dashed border-border rounded-[20px] p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors duration-300 min-h-[140px]"
                    >
                        <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
                            <Plus size={20} className="text-subtext" />
                        </div>
                        <span className="text-[10px] font-black text-subtext uppercase tracking-widest">New Case</span>
                    </motion.div>
                </div>
            </div>
        );
    };

    const renderEmptyCases = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-6">
                <Briefcase size={48} className="text-subtext" />
            </div>
            <h3 className="text-2xl font-black text-maintext mb-2">No Matters Found</h3>
            <p className="text-subtext max-w-sm mb-8 font-medium">
                You haven't created any matter workspaces yet. Create your first matter to start using AI Legal™ Precedents.
            </p>
            <button
                onClick={onCreateCase}
                className="flex items-center gap-2 bg-indigo-600 text-slate-800 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition-all"
            >
                <Plus size={18} /> Create New Matter
            </button>
        </div>
    );

    const renderLoading = () => (
        <div className="precedent-loading-container flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="relative mb-8">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full"
                />
                <Scale size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-maintext uppercase tracking-[0.2em] animate-pulse">{t('analyzingCase')}</h3>
            <p className="text-subtext mt-2 font-medium text-sm">{t('crossReferencing')}</p>
        </div>
    );

    const handleLocalBack = () => {
        if (selectedProjectId) {
            setSelectedProjectId(null);
            setResults([]);
            setSearchMetadata(null);
        } else {
            onBack();
        }
    };

    return (
        <div className="precedent-module-container flex-1 flex flex-col min-h-0 bg-white ] rounded-3xl overflow-hidden border border-slate-200 shadow-sm m-4">
            {/* Header */}
            <div className="precedent-header px-4 sm:px-8 py-4 sm:py-6 bg-white/90 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 z-20">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleLocalBack}
                        className="p-2 hover:bg-card rounded-full transition-colors shrink-0 mt-1 sm:mt-0"
                    >
                        <ArrowLeft size={20} className="text-subtext" />
                    </motion.button>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 sm:mb-0">
                            <h2 className="text-lg sm:text-xl font-black text-maintext truncate">
                                {t('legalPrecedentsTitle')}
                            </h2>
                            {activeCase && mode === 'CURRENT' && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-xl w-fit max-w-full shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                                    <span className="text-[10px] sm:text-[11px] font-black text-maintext uppercase tracking-widest truncate max-w-[150px] sm:max-w-[250px]">
                                        {activeCase.name}
                                    </span>
                                    <button
                                        onClick={() => setIsCaseListOpen(true)}
                                        className="text-[9px] sm:text-[10px] font-bold text-indigo-500 hover:text-indigo-600 ml-2 transition-colors underline underline-offset-4 decoration-indigo-500/20 hover:decoration-indigo-500 shrink-0"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-subtext font-medium uppercase tracking-wider line-clamp-1">
                            {t('judgementDiscoveryEngine')}
                        </p>
                    </div>
                </div>

                <div className="mode-toggle flex bg-slate-50 ] p-1 rounded-xl border border-slate-200 w-full sm:w-fit overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => { setMode('CURRENT'); if (!selectedProjectId) resetSelection(); }}
                        className={`px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap ${mode === 'CURRENT'
                            ? 'bg-white dark:bg-[#0B1020] text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-[#F8FAFC]'
                            }`}
                    >
                        {mode === 'CURRENT' && <CheckCircle2 size={12} />} {t('currentCaseMode')}
                    </button>
                    <button
                        onClick={() => setMode('MANUAL')}
                        className={`px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap ${mode === 'MANUAL'
                            ? 'bg-white dark:bg-[#0B1020] text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-[#F8FAFC]'
                            }`}
                    >
                        {mode === 'MANUAL' && <CheckCircle2 size={12} />} {t('manualSearchMode')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain touch-pan-y">
                {isLoading ? renderLoading() : (
                    <>
                        {mode === 'CURRENT' && !selectedProjectId ? renderCaseSelection() : (
                            <div className="p-8">
                                {/* Search Bar (Only in Manual Mode) */}
                                {mode === 'MANUAL' && (
                                    <div className="max-w-2xl mx-auto mb-10">
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                                            <input
                                                type="text"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                placeholder={t('searchPlaceholder')}
                                                className="w-full relative z-10 bg-white ] border-2 border-slate-100 focus:border-indigo-500 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 pl-12 sm:pl-14 text-xs sm:text-sm font-medium text-slate-700 ] shadow-sm transition-all outline-none"
                                            />
                                            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-subtext group-focus-within:text-indigo-500 transition-colors z-20" size={18} />
                                            <button
                                                onClick={() => handleSearch()}
                                                disabled={isLoading || !query}
                                                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-800 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all z-20"
                                            >
                                                {isLoading ? '...' : 'Search'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Results Grid */}
                                {results.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                                        {results.map((caseItem, idx) => (
                                            <PrecedentCard
                                                key={idx}
                                                caseItem={caseItem}
                                                onClick={() => setSelectedCaseDetail(caseItem)}
                                                onCopyCitation={() => copyCitation(caseItem)}
                                                isSaved={activeCase?.savedPrecedents?.some(p => (p._id || p.case_identity?.case_name) === (caseItem._id || caseItem.case_identity?.case_name))}
                                                t={t}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    !isLoading && (
                                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                            <BookOpen size={48} className="text-subtext mb-4" />
                                            <h3 className="text-lg font-bold text-maintext">No Precedents Found</h3>
                                            <p className="text-xs text-subtext max-w-xs mt-2 font-medium">
                                                {mode === 'CURRENT'
                                                    ? "We couldn't find relevant precedents based on this case's facts. Try refining the case documents or use manual search."
                                                    : "Enter a search query to discover relevant case laws and legal principles."}
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Case Detail Overlay */}
            <AnimatePresence>
                {selectedCaseDetail && (
                    <CaseDetailView
                        caseItem={selectedCaseDetail}
                        onClose={() => setSelectedCaseDetail(null)}
                        onCopyCitation={() => copyCitation(selectedCaseDetail)}
                        onSave={() => handleSaveAction(selectedCaseDetail)}
                        onCite={() => handleCiteAction(selectedCaseDetail)}
                        onSummarize={() => handleSummarizeAction(selectedCaseDetail)}
                        onCompare={() => handleCompareAction(selectedCaseDetail)}
                        onDownloadPDF={() => handleDownloadPDF(selectedCaseDetail)}
                        isPdfLoading={isPdfLoading}
                        isSaved={activeCase?.savedPrecedents?.some(p => (p._id || p.case_identity?.case_name) === (selectedCaseDetail?._id || selectedCaseDetail?.case_identity?.case_name))}
                        loadingStates={isActionLoading[selectedCaseDetail._id || selectedCaseDetail.case_identity?.case_name] || {}}
                        aiResponses={aiResponses[selectedCaseDetail._id || selectedCaseDetail.case_identity?.case_name] || {}}
                        isReanalyzing={isReanalyzing}
                        t={t}
                    />
                )}
            </AnimatePresence>

            {/* Case Selection Modal */}
            <AnimatePresence>
                {(isSavingToCaseOpen || isCaseListOpen) && (
                    <CaseSelectionModal
                        isOpen={true}
                        onClose={() => {
                            setIsSavingToCaseOpen(false);
                            setIsCaseListOpen(false);
                        }}
                        onSelect={(c) => {
                            if (isCaseListOpen) {
                                handleCaseChange(c);
                            } else {
                                handleSaveAction(pendingPrecedentToSave, c._id);
                                setIsSavingToCaseOpen(false);
                            }
                        }}
                        cases={cases}
                        currentProjectId={selectedProjectId}
                        title={isCaseListOpen ? "Switch Active Case" : "Select Case to Save"}
                        onCreateNew={() => {
                            setIsSavingToCaseOpen(false);
                            setIsCaseListOpen(false);
                            onCreateCase();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const PrecedentCard = ({ caseItem, onClick, onCopyCitation, t }) => {
    const { case_identity = {}, similarity = {}, case_context = {}, judgment_basis = {} } = caseItem;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="precedent-card group bg-white ] border border-slate-200 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-sm transition-colors duration-300"
            onClick={onClick}
        >
            <div className="precedent-card-body p-6">
                <div className="precedent-card-header flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h3 className="text-base font-black text-maintext leading-snug">
                            {case_identity.case_name || caseItem.case_name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-maintext/90 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Gavel size={12} /> {case_identity.court || caseItem.court}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> {case_identity.year || caseItem.year}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black">
                            {similarity.relevance_score || caseItem.relevance_score || 0}% {t('relevance')}
                        </div>
                    </div>
                </div>

                <p className="precedent-facts text-xs text-maintext leading-relaxed line-clamp-2 mb-4 font-medium italic opacity-90">
                    "{case_context.facts || caseItem.facts || caseItem.summary}"
                </p>

                <div className="precedent-reasoning-preview bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                    <div className="text-[9px] font-black text-maintext uppercase tracking-widest mb-1.5 flex items-center gap-1.5 opacity-70">
                        <Shield size={10} /> {t('legalReasoning')}
                    </div>
                    <ReasoningSection
                        content={judgment_basis.legal_reasoning || caseItem.reasoning || caseItem.ratio_decidendi}
                        t={t}
                    />
                </div>

                <div className="precedent-card-footer flex items-center justify-between">
                    <div className="precedent-tags-container flex flex-wrap gap-1.5">
                        {caseItem.tags?.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-background text-subtext rounded-md text-[9px] font-bold uppercase tracking-tight">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="precedent-actions flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onCopyCitation(); }}
                            className="p-2 hover:bg-border rounded-lg text-subtext hover:text-indigo-400 transition-all group/btn"
                            title="Copy Citation"
                        >
                            <Copy size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <motion.div
                            whileHover={{ x: 4 }}
                            className="flex items-center gap-1 text-[10px] font-black text-maintext uppercase tracking-widest"
                        >
                            {t('intelligenceReport')} <ChevronRight size={14} />
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export const CaseDetailView = ({
    caseItem,
    onClose,
    onCopyCitation,
    onSave,
    onCite,
    onSummarize,
    onCompare,
    onDownloadPDF,
    isSaved,
    loadingStates = {},
    aiResponses = {},
    isReanalyzing = false,
    isPdfLoading = false,
    t
}) => {
    const {
        case_identity = {},
        case_context = {},
        judgment_outcome = {},
        judgment_basis = {},
        similarity = {},
        key_takeaways = [],
        tags = []
    } = caseItem;

    const setTglState = useSetRecoilState(toggleState);
    const responseRef = React.useRef(null);

    useEffect(() => {
        setTglState(prev => ({ ...prev, focusMode: true }));
        document.body.classList.add('focus-mode');
        return () => {
            setTglState(prev => ({ ...prev, focusMode: false }));
            document.body.classList.remove('focus-mode');
        };
    }, [setTglState]);

    useEffect(() => {
        if (aiResponses.summarize || aiResponses.compare) {
            setTimeout(() => {
                responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [aiResponses.summarize, aiResponses.compare]);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="precedent-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-6 bg-background/80"
        >
            <div className="absolute inset-0" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="precedent-detail-modal relative w-full max-w-[1200px] h-full sm:h-[90vh] bg-white ] rounded-0 sm:rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-slate-200"
            >
                {/* Header Section */}
                <div className="precedent-modal-header px-6 sm:px-8 py-5 sm:py-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-20">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                            <Gavel size={20} className="text-slate-800" />
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-lg sm:text-xl font-bold text-maintext truncate tracking-tight leading-tight mb-0.5 sm:mb-1">
                                {case_identity.case_name || caseItem.case_name}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-[11px] text-subtext font-semibold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><Scale size={12} /> {case_identity.court || caseItem.court}</span>
                                <span className="flex items-center gap-1.5"><Calendar size={12} /> {case_identity.year || caseItem.year}</span>
                                <span className="flex items-center gap-1.5"><FileText size={12} /> {case_identity.citation || caseItem.citation}</span>
                                {(case_identity.district || case_identity.area) && (
                                    <span className="flex items-center gap-1.5 text-indigo-400"><MapPin size={12} /> {[case_identity.district, case_identity.area].filter(Boolean).join(', ')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-card rounded-xl transition-all text-subtext hover:text-maintext"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Loader for Re-analysis */}
                <AnimatePresence>
                    {isReanalyzing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-background/80 flex flex-col items-center justify-center text-center p-8"
                        >
                            <div className="relative mb-6">
                                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                                <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={24} />
                            </div>
                            <h3 className="text-lg font-black text-maintext uppercase tracking-tight mb-2">Analyzing New Case Context</h3>
                            <p className="text-xs text-subtext font-medium max-w-xs">
                                Recalculating relevance, reasoning match, and strategic alignment for your newly selected case...
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content Grid */}
                <div className="precedent-modal-body flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* LEFT PANEL - Primary Content (65%) */}
                    <div className="precedent-modal-main md:w-[65%] overflow-y-auto custom-scrollbar px-6 sm:px-8 py-6 sm:py-8 space-y-6 min-h-0 overscroll-contain">

                        {/* Case Facts */}
                        <div className="bg-white ] p-6 rounded-[20px] border border-slate-200 shadow-sm">
                            <Section
                                title={t('caseFacts')}
                                content={case_context.facts || caseItem.facts}
                                icon={<FileText size={18} className="text-indigo-500" />}
                                limit={300}
                                t={t}
                            />
                        </div>

                        {/* Legal Issue */}
                        <div className="bg-indigo-500/10 p-6 rounded-[20px] border border-indigo-500/20">
                            <Section
                                title={t('coreLegalIssue')}
                                content={case_context.legal_issue || caseItem.issue}
                                icon={<AlertCircle size={18} className="text-indigo-400" />}
                                limit={500}
                                isIssue
                                t={t}
                            />
                        </div>

                        {/* Reasoning */}
                        <div className="bg-card p-6 rounded-[20px] border border-border shadow-sm">
                            <h4 className="text-[11px] font-black text-subtext uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <Brain size={18} className="text-indigo-400" /> {t('judgmentReasoning')}
                            </h4>
                            <div className="space-y-4">
                                {formatToBullets(judgment_basis.legal_reasoning || caseItem.reasoning || caseItem.ratio_decidendi).map((point, i) => (
                                    <div key={i} className="flex gap-3 text-[14px] text-maintext leading-relaxed font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
                                        <p>{point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Takeaways */}
                        <div className="bg-card p-6 rounded-[20px] border border-border shadow-sm">
                            <h4 className="text-[11px] font-black text-subtext uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <Zap size={18} className="text-amber-400" /> {t('strategicTakeaways')}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                {(key_takeaways || caseItem.key_takeaways || []).map((item, i) => (
                                    <div key={i} className="flex gap-3 text-[14px] text-maintext leading-relaxed font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL - Insights (35%) */}
                    <div className="precedent-modal-sidebar md:w-[35%] bg-background border-l border-border p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">

                        {/* SMART ACTIONS */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-maintext uppercase tracking-[0.2em]">Smart Assistant Actions</h4>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={onSummarize}
                                    disabled={loadingStates.summary}
                                    className={`smart-action-btn ${loadingStates.summary ? 'btn-loading' : ''}`}
                                >
                                    <Sparkles size={14} className="text-amber-500" />
                                    <span>Summarize Judgment</span>
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </button>
                                <button
                                    onClick={onCompare}
                                    disabled={loadingStates.compare}
                                    className={`smart-action-btn ${loadingStates.compare ? 'btn-loading' : ''}`}
                                >
                                    <FileSearch size={14} className="text-indigo-500" />
                                    <span>Compare with My Case</span>
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </button>
                            </div>
                        </div>

                        {/* AI Response Section */}
                        <AnimatePresence mode="wait">
                            {(loadingStates.summary || loadingStates.compare) ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="p-6 bg-card rounded-3xl border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center text-center gap-3"
                                >
                                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Generating AI response...</p>
                                        <p className="text-[10px] text-subtext">Our senior legal brain is analyzing the judgment</p>
                                    </div>
                                </motion.div>
                            ) : (aiResponses.summarize || aiResponses.compare) && (
                                <motion.div
                                    ref={responseRef}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="ai-response-container space-y-6 animate-glow"
                                >
                                    {aiResponses.summarize && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-amber-400">
                                                    <Sparkles size={16} />
                                                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">AI Summary</span>
                                                </div>
                                                <button
                                                    onClick={() => onSummarize()}
                                                    className="p-1.5 hover:bg-amber-500/10 rounded-lg text-amber-400 transition-all"
                                                    title="Regenerate"
                                                >
                                                    <RefreshCcw size={12} />
                                                </button>
                                            </div>
                                            <div className="bg-card p-5 rounded-2xl border border-amber-500/20 shadow-sm text-maintext text-[12px] leading-relaxed markdown-content">
                                                <ReactMarkdown>{aiResponses.summarize}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    {aiResponses.compare && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-indigo-400">
                                                    <FileSearch size={16} />
                                                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Case Comparison</span>
                                                </div>
                                                <button
                                                    onClick={() => onCompare()}
                                                    className="p-1.5 hover:bg-indigo-500/10 rounded-lg text-indigo-400 transition-all"
                                                    title="Regenerate"
                                                >
                                                    <RefreshCcw size={12} />
                                                </button>
                                            </div>
                                            <div className="bg-card p-5 rounded-2xl border border-indigo-500/20 shadow-sm text-maintext text-[12px] leading-relaxed markdown-content">
                                                <ReactMarkdown>{aiResponses.compare}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Relevance Score */}
                        <div className="bg-card p-6 rounded-[20px] border border-border shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-maintext uppercase tracking-widest">Relevance Match</span>
                                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-bold">
                                    {similarity.relevance_score || caseItem.relevance_score || 0}% {t('relevance')}
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${similarity.relevance_score || caseItem.relevance_score || 0}%` }}
                                    className="h-full bg-emerald-500 rounded-full"
                                />
                            </div>
                            <button className="w-full py-3 bg-indigo-500/10 text-indigo-400 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-indigo-500/20 transition-all">
                                {t('landmarkJudgement')}
                            </button>
                        </div>

                        {/* Final Verdict */}
                        <div className="bg-card p-6 rounded-[24px] border border-border shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 -z-0 opacity-40" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-[11px] font-black text-maintext uppercase tracking-[0.2em]">{t('finalVerdict')}</h4>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${judgment_outcome.type?.toLowerCase().includes('allow')
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                        {judgment_outcome.type || "Allowed"}
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[14px] font-bold text-maintext leading-relaxed italic mb-1">
                                            "{judgment_outcome.final_decision || caseItem.decision}"
                                        </p>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-border">
                                        <div className="text-[10px] font-black text-maintext uppercase tracking-widest mb-2">Court Held</div>
                                        {formatToBullets(judgment_outcome.court_held || judgment_outcome.final_decision).slice(0, 2).map((point, i) => (
                                            <div key={i} className="flex gap-2 text-[12px] text-maintext font-medium leading-relaxed">
                                                <div className="text-emerald-400">•</div>
                                                <p>{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Principles */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-maintext uppercase tracking-[0.2em]">{t('legalPrinciples')}</h4>
                            <div className="flex flex-wrap gap-2">
                                {(judgment_basis.principles_applied || []).map((p, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-card border border-border text-maintext text-[11px] font-bold rounded-lg shadow-sm hover:border-indigo-400/50 transition-colors cursor-default">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Similarity Analysis */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-maintext uppercase tracking-[0.2em]">{t('similarityAnalysis')}</h4>
                            <div className="space-y-2">
                                {(similarity.matching_factors || []).map((factor, i) => (
                                    <div key={i} className="flex gap-3 text-[12px] text-maintext font-bold leading-relaxed bg-card p-3 rounded-xl border border-border shadow-sm">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                        {factor}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="precedent-modal-footer px-6 sm:px-8 py-4 sm:py-5 bg-background border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 sticky bottom-0 z-20">
                    <button
                        onClick={onCopyCitation}
                        className="btn-tertiary-cta mobile-priority-3 flex items-center justify-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl w-full sm:w-auto"
                    >
                        <Copy size={16} /> {t('copyOfficialCitation')}
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={onDownloadPDF}
                            disabled={isPdfLoading}
                            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${isPdfLoading
                                ? 'bg-card text-subtext cursor-not-allowed border border-border'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98]'
                                } w-full sm:w-auto`}
                        >
                            {isPdfLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-border border-t-indigo-600 rounded-full animate-spin" />
                                    <span>{t('generatingPDF')}</span>
                                </>
                            ) : (
                                <>
                                    <FileDown size={16} />
                                    <span>{t('downloadPDF')}</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={onSave}
                            disabled={loadingStates.save || isSaved}
                            className={`btn-secondary-cta mobile-priority-1 flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest ${loadingStates.save ? 'btn-loading' : ''} ${isSaved ? 'btn-success' : ''} ${isSaved ? 'cursor-not-allowed' : ''}`}
                        >
                            {loadingStates.save ? (
                                <span>Saving...</span>
                            ) : isSaved ? (
                                <>
                                    <CheckCircle2 size={16} />
                                    <span>Saved ✓</span>
                                </>
                            ) : (
                                <>
                                    <Bookmark size={16} fill="none" />
                                    <span>{t('save')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export const formatToBullets = (text) => {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    // Split by common delimiters like "•", "-", numbers followed by period, or just split by period if it's long sentences
    const points = text.split(/[•\n]|\d+\. /).filter(p => p.trim().length > 10);
    return points.length > 0 ? points : [text];
};

export const Section = ({ title, content, icon, limit = 200, isIssue = false, t }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = content?.length > limit;
    const displayText = isExpanded ? content : content?.slice(0, limit);

    return (
        <div className="space-y-3">
            <h4 className="text-[11px] font-black text-subtext uppercase tracking-[0.2em] flex items-center gap-2">
                {icon} {title}
            </h4>
            <div className="relative">
                <p className={`${isIssue ? 'text-[16px] font-bold text-maintext' : 'text-[14px] font-medium text-maintext'} leading-relaxed`}>
                    {isIssue && !content?.includes('?') ? `"${displayText}?"` : displayText}
                    {!isExpanded && shouldTruncate && "..."}
                </p>
                {shouldTruncate && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline flex items-center gap-1"
                    >
                        {isExpanded ? t('showLess') : t('readMore')}
                    </button>
                )}
            </div>
        </div>
    );
};



export const ReasoningSection = ({ content, t }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const limit = 120;
    const shouldTruncate = content?.length > limit;
    const displayText = isExpanded ? content : content?.slice(0, limit);

    return (
        <div>
            <p className={`text-[11px] text-maintext font-bold leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                {displayText}
                {!isExpanded && shouldTruncate && "..."}
            </p>
            {shouldTruncate && (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline"
                >
                    {isExpanded ? t('showLess') : t('readMore')}
                </button>
            )}
        </div>
    );
};

export const CaseSelectionModal = ({ isOpen, onClose, onSelect, cases, currentProjectId, title, onCreateNew }) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/80">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-background rounded-3xl w-full max-w-md overflow-hidden shadow-sm border border-border"
            >
                <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <div>
                        <h3 className="text-lg font-black text-maintext uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] text-subtext font-bold uppercase tracking-widest mt-0.5">Select from your existing case files</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-border rounded-full transition-colors text-subtext"><X size={20} /></button>
                </div>

                <div className="p-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                    {cases.length === 0 ? (
                        <div className="py-12 text-center">
                            <Briefcase size={40} className="text-subtext mx-auto mb-3" />
                            <p className="text-sm font-bold text-subtext uppercase tracking-widest">No cases found</p>
                        </div>
                    ) : (
                        cases.map(c => (
                            <button
                                key={c._id}
                                onClick={() => onSelect(c)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group text-left mb-2 border ${c._id === currentProjectId
                                    ? 'bg-indigo-500/10 border-indigo-500/20 shadow-sm'
                                    : 'bg-background border-transparent hover:bg-card hover:border-border'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${c._id === currentProjectId ? 'bg-card' : 'bg-card group-hover:bg-background'
                                    }`}>
                                    <Briefcase size={18} className={c._id === currentProjectId ?'text-indigo-400' : 'text-subtext group-hover:text-indigo-400'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-black truncate ${c._id === currentProjectId ? 'text-indigo-300' : 'text-maintext group-hover:text-indigo-300'}`}>
                                        {c.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] text-subtext font-bold uppercase tracking-widest">{c.caseType || 'General'}</span>
                                        {c.updatedAt && (
                                            <span className="text-[9px] text-subtext/60">• {new Date(c.updatedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                                {c._id === currentProjectId ? (
                                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-slate-800">
                                        <Zap size={12} fill="white" />
                                    </div>
                                ) : (
                                    <ChevronRight size={16} className="text-border group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                )}
                            </button>
                        ))
                    )}
                </div>

                <div className="p-6 bg-background border-t border-border">
                    <button
                        onClick={onCreateNew}
                        className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-[11px] font-black uppercase tracking-widest text-subtext hover:border-indigo-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Create New Case Workspace
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default LegalPrecedents;
