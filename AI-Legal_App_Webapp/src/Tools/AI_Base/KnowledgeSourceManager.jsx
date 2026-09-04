import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    RefreshCw, Trash2, Globe, Clock, Calendar, 
    Layers, PauseCircle, PlayCircle, AlertCircle,
    ChevronRight, ExternalLink, Loader
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import toast from 'react-hot-toast';
import DeleteConfirmModal from '../../Components/DeleteConfirmModal';

const KnowledgeSourceManager = () => {
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

    const fetchSources = useCallback(async () => {
        try {
            const result = await apiService.getKnowledgeSources();
            if (result.success) setSources(result.data);
        } catch (error) {
            console.error("Failed to fetch sources", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSources();
        const interval = setInterval(fetchSources, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [fetchSources]);

    const handleRecrawl = async (id) => {
        setActionLoading(id);
        try {
            await apiService.recrawlSource(id);
            toast.success("Recrawl triggered in background");
            fetchSources();
        } catch (error) {
            toast.error("Failed to trigger recrawl");
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleStatus = async (source) => {
        const newStatus = source.status === 'active' ? 'paused' : 'active';
        try {
            await apiService.updateKnowledgeSource(source._id, { status: newStatus });
            toast.success(`Source ${newStatus}`);
            fetchSources();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await apiService.deleteKnowledgeSource(deleteModal.id);
            toast.success("Source and pages deleted");
            setDeleteModal({ isOpen: false, id: null });
            fetchSources();
        } catch (error) {
            toast.error("Failed to delete source");
            setDeleteModal({ isOpen: false, id: null });
        }
    };

    const getFrequencyLabel = (freq) => {
        return freq.charAt(0).toUpperCase() + freq.slice(1);
    };

    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleString();
    };

    if (loading && sources.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-maintext flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" /> Managed Websites (Auto-Crawl)
                </h3>
                <button 
                    onClick={fetchSources}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all text-subtext"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {sources.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                    <p className="text-subtext">No automated websites added yet.</p>
                    <p className="text-xs text-subtext/60 mt-2">Use the "URL Upload" tab to add a root domain for periodic crawling.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {sources.map((source) => (
                        <motion.div 
                            key={source._id}
                            layout
                            className="bg-white/10 dark:bg-black/20 border border-white/10 rounded-2xl p-5 hover:border-primary/30 transition-all group"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                {/* Left: Basic Info */}
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${source.status === 'error' ? 'bg-red-500/10' : 'bg-primary/10'}`}>
                                        <Globe className={`w-6 h-6 ${source.status === 'error' ? 'text-red-400' : 'text-primary'}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-maintext truncate max-w-md" title={source.url}>{source.domain}</h4>
                                            <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${
                                                source.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                source.status === 'paused' ? 'bg-amber-500/10 text-amber-500' : 
                                                'bg-red-500/10 text-red-500'
                                            }`}>
                                                {source.status}
                                            </span>
                                            <span className="text-[10px] bg-white/5 text-subtext px-2 py-0.5 rounded-full font-bold">
                                                {getFrequencyLabel(source.update_frequency)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-subtext truncate mt-1 flex items-center gap-1">
                                            {source.url} <a href={source.url} target="_blank" rel="noreferrer" className="inline-block hover:text-primary"><ExternalLink className="w-3 h-3" /></a>
                                        </p>
                                        
                                        {source.last_error && (
                                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                                <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                                                <p className="text-[10px] text-red-400 font-medium truncate">{source.last_error}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Middle: Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-4 lg:gap-8 px-4 lg:px-0 lg:border-l lg:border-white/10 lg:pl-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-subtext uppercase tracking-wider flex items-center gap-1.5">
                                            <Layers className="w-3 h-3" /> Pages
                                        </p>
                                        <p className="text-sm font-black text-maintext">{source.pages_indexed || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-subtext uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" /> Last Crawl
                                        </p>
                                        <p className="text-sm font-black text-maintext">{source.last_crawled_at ? new Date(source.last_crawled_at).toLocaleDateString() : 'Never'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-subtext uppercase tracking-wider flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" /> Next Crawl
                                        </p>
                                        <p className="text-sm font-black text-primary">{source.next_crawl_at ? new Date(source.next_crawl_at).toLocaleDateString() : 'Pending'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-subtext uppercase tracking-wider flex items-center gap-1.5">
                                            <ChevronRight className="w-3 h-3" /> Settings
                                        </p>
                                        <p className="text-[10px] font-black text-subtext/60">D:{source.crawl_depth} P:{source.max_pages}</p>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2 lg:pl-8 lg:border-l lg:border-white/10 shrink-0">
                                    <button
                                        onClick={() => handleRecrawl(source._id)}
                                        disabled={actionLoading === source._id}
                                        className="p-3 bg-white/5 hover:bg-primary/10 text-subtext hover:text-primary rounded-xl transition-all"
                                        title="Recrawl Now"
                                    >
                                        {actionLoading === source._id ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(source)}
                                        className="p-3 bg-white/5 hover:bg-amber-500/10 text-subtext hover:text-amber-500 rounded-xl transition-all"
                                        title={source.status === 'active' ? 'Pause' : 'Resume'}
                                    >
                                        {source.status === 'active' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: true, id: source._id })}
                                        className="p-3 bg-white/5 hover:bg-red-500/10 text-subtext hover:text-red-500 rounded-xl transition-all"
                                        title="Delete Source"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                title="Delete Source?"
                description="Are you sure? This will delete the source tracking AND all associated knowledge pages. This cannot be undone."
            />
        </div>
    );
};

export default KnowledgeSourceManager;
