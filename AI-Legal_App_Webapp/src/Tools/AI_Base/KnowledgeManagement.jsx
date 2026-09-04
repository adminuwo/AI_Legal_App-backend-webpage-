import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Filter, Trash2, RefreshCw, Globe, FileText, 
    MoreVertical, ExternalLink, Download, CheckCircle, 
    Clock, AlertCircle, Loader2, ChevronDown, BookOpen, X
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import toast from 'react-hot-toast';
import DeleteConfirmModal from '../../Components/DeleteConfirmModal';

const KnowledgeManagement = () => {
    const [loading, setLoading] = useState(true);
    const [knowledgeList, setKnowledgeList] = useState({ documents: [], sources: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
    const [selectedItem, setSelectedItem] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null });

    const fetchKnowledge = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getKnowledgeList();
            if (data.success) {
                setKnowledgeList(data.data);
            }
        } catch (error) {
            toast.error("Failed to load knowledge assets");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKnowledge();
    }, [fetchKnowledge]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchKnowledge();
        setIsRefreshing(false);
        toast.success("Knowledge list updated");
    };

    const handleDeleteDoc = async () => {
        if (!deleteModal.id) return;
        try {
            await apiService.deleteKnowledgeDocument(deleteModal.id);
            toast.success("Document removed");
            setDeleteModal({ isOpen: false, type: null, id: null });
            fetchKnowledge();
        } catch (error) {
            toast.error("Delete failed");
            setDeleteModal({ isOpen: false, type: null, id: null });
        }
    };

    const handleDeleteSource = async () => {
        if (!deleteModal.id) return;
        try {
            await apiService.deleteKnowledgeSource(deleteModal.id);
            toast.success("Source removed");
            setDeleteModal({ isOpen: false, type: null, id: null });
            fetchKnowledge();
        } catch (error) {
            toast.error("Delete failed");
            setDeleteModal({ isOpen: false, type: null, id: null });
        }
    };

    const handleConfirmDelete = () => {
        if (deleteModal.type === 'source') handleDeleteSource();
        else handleDeleteDoc();
    };

    const handleReindex = async (id) => {
        try {
            await apiService.reindexDocument(id);
            toast.success("Re-indexing started in background");
            fetchKnowledge();
        } catch (error) {
            toast.error("Process failed to start");
        }
    };

    const handleRecrawl = async (id) => {
        try {
            await apiService.recrawlSource({ id });
            toast.success("Re-crawl triggered");
            fetchKnowledge();
        } catch (error) {
            toast.error("Process failed");
        }
    };

    // Consolidated list for the table
    const allItems = [
        ...knowledgeList.documents.map(doc => ({
            id: doc._id,
            name: doc.filename,
            type: doc.mimetype?.includes('pdf') ? 'PDF' : 
                  doc.mimetype?.includes('word') ? 'DOC' : 
                  doc.mimetype?.includes('text') ? 'TXT' : 
                  doc.sourceUrl ? 'URL_PAGE' : 'DOC',
            date: doc.uploadDate,
            chunks: doc.totalChunks || 'Auto',
            status: doc.status || 'Active',
            category: doc.category,
            raw: doc,
            isSource: false
        })),
        ...knowledgeList.sources.map(src => ({
            id: src._id,
            name: src.url,
            type: 'URL_SOURCE',
            date: src.createdAt,
            chunks: src.pages_indexed || 0,
            status: src.status === 'active' ? 'Active' : 'Paused',
            category: src.category || 'GENERAL',
            raw: src,
            isSource: true
        }))
    ];

    const filteredItems = allItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             item.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || 
                             (filterType === 'document' && !item.isSource) ||
                             (filterType === 'website' && item.isSource) ||
                             item.type.toLowerCase() === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const getStatusIcon = (status) => {
        switch(status.toLowerCase()) {
            case 'active': return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
            case 'indexing': return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
            case 'pending': return <Clock className="w-3.5 h-3.5 text-amber-500" />;
            case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
            default: return <Clock className="w-3.5 h-3.5 text-slate-500" />;
        }
    };

    if (loading && !isRefreshing) {
        return (
            <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-subtext font-medium">Loading knowledge base...</p>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <AnimatePresence>
                {selectedItem && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                        {selectedItem.isSource ? <Globe className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white truncate max-w-[400px]">{selectedItem.name}</h3>
                                        <p className="text-subtext text-xs font-bold uppercase tracking-widest">{selectedItem.type}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/5 rounded-full text-subtext transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-subtext uppercase tracking-widest">Status</p>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(selectedItem.status)}
                                        <p className="text-sm font-bold text-white">{selectedItem.status}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-subtext uppercase tracking-widest">Date Added</p>
                                    <p className="text-sm font-bold text-white">{new Date(selectedItem.date).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-subtext uppercase tracking-widest">Category</p>
                                    <p className="text-sm font-bold text-white">{selectedItem.category}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-subtext uppercase tracking-widest">{selectedItem.isSource ? 'Pages Indexed' : 'Chunks'}</p>
                                    <p className="text-sm font-bold text-white">{selectedItem.chunks}</p>
                                </div>
                            </div>

                            {selectedItem.raw.gcsUri && (
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 mb-8">
                                    <p className="text-[10px] font-black text-subtext uppercase tracking-widest mb-1">Retrieval URI (GCS)</p>
                                    <p className="text-xs font-mono text-primary break-all">{selectedItem.raw.gcsUri}</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => {
                                        if (selectedItem.isSource) handleRecrawl(selectedItem.id);
                                        else handleReindex(selectedItem.id);
                                        setSelectedItem(null);
                                    }}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {selectedItem.isSource ? 'Recrawl Now' : 'Re-index Assets'}
                                </button>
                                <button 
                                    onClick={() => {
                                        if (selectedItem.isSource) setDeleteModal({ isOpen: true, type: 'source', id: selectedItem.id });
                                        else setDeleteModal({ isOpen: true, type: 'doc', id: selectedItem.id });
                                        setSelectedItem(null);
                                    }}
                                    className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/30 dark:bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/20">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtext" />
                    <input 
                        type="text" 
                        placeholder="Search document name, category, or URL..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/10 dark:bg-black/20 border border-white/10 rounded-xl py-2 pl-11 pr-4 text-sm outline-none focus:border-primary/50 transition-all text-maintext"
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-black/10 dark:bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none text-maintext"
                    >
                        <option value="all">All Sources</option>
                        <option value="document">Documents</option>
                        <option value="website">Websites</option>
                        <option value="pdf">PDF Files</option>
                    </select>

                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
                    >
                        <RefreshCw className={`w-4 h-4 text-maintext ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Knowledge Table */}
            <div className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-subtext">Source Name</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-subtext">Type</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-subtext">Upload Date</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-subtext text-center">Chunks/Pages</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-subtext">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-subtext text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredItems.map((item) => (
                            <motion.tr 
                                key={item.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-white/5 transition-colors group"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.isSource ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {item.isSource ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        </div>
                                        <div className="max-w-[250px]">
                                            <p className="text-sm font-bold text-maintext truncate" title={item.name}>{item.name}</p>
                                            <div className="flex gap-1 mt-1">
                                                <span className={`text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded ${
                                                    item.category === 'LEGAL' 
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                        : item.category === 'FINANCE'
                                                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                }`}>
                                                    {item.category || 'GENERAL'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-xs text-subtext font-medium">
                                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-sm font-black text-maintext">
                                        {item.chunks}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(item.status)}
                                        <span className="text-xs font-bold text-maintext">{item.status}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 transition-opacity">
                                        <button 
                                            onClick={() => setSelectedItem(item)}
                                            className="p-2 text-subtext hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                            title="View Details"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                        
                                        {item.isSource ? (
                                            <button 
                                                onClick={() => handleRecrawl(item.id)}
                                                className="p-2 text-subtext hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-all"
                                                title="Recrawl Website"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleReindex(item.id)}
                                                className="p-2 text-subtext hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-all"
                                                title="Re-index Document"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        )}
                                        
                                        {!item.isSource && item.raw.gcsUri && (
                                            <button 
                                                onClick={() => {
                                                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                                                    const token = user.token || '';
                                                    const baseUrl = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
                                                    window.open(`${baseUrl}/aibase/knowledge/download/${item.id}?token=${token}`, '_blank');
                                                }}
                                                className="p-2 text-subtext hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-all"
                                                title="View Raw"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => item.isSource ? setDeleteModal({ isOpen: true, type: 'source', id: item.id }) : setDeleteModal({ isOpen: true, type: 'doc', id: item.id })}
                                            className="p-2 text-subtext hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                                            title="Delete Permanently"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {filteredItems.length === 0 && (
                    <div className="py-20 text-center">
                        <BookOpen className="w-10 h-10 text-white/5 mx-auto mb-3" />
                        <p className="text-subtext font-medium">No knowledge assets found matches your criteria.</p>
                    </div>
                )}
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, type: null, id: null })}
                onConfirm={handleConfirmDelete}
                title={deleteModal.type === 'source' ? "Delete Source?" : "Delete Document?"}
                description={deleteModal.type === 'source' ? "Are you sure you want to delete this website source and all crawled pages? This cannot be undone." : "Are you sure you want to delete this document and all its embeddings? This cannot be undone."}
            />
        </div>
    );
};

export default KnowledgeManagement;
