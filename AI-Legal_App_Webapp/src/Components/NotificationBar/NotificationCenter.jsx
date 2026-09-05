import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, X, CheckCircle, AlertCircle, Info, Clock, Trash2, Check, 
  Search, Gavel, Calendar, FileText, Sparkles, RefreshCw, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonalization } from '../../context/PersonalizationContext';
import { apiService } from '../../services/apiService';
import toast from 'react-hot-toast';

const NotificationCenter = ({ isOpen, onClose }) => {
    const { 
      notifications: contextNotifications, 
      fetchNotifications,
      markNotificationRead, 
      deleteNotification, 
      clearAllNotifications 
    } = usePersonalization();

    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [casesNotifications, setCasesNotifications] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch live case alerts to combine with context notifications
    const fetchLiveCaseAlerts = async () => {
        setIsRefreshing(true);
        try {
            const res = await apiService.getCases();
            const rawCases = Array.isArray(res) ? res : (res?.cases || res?.data || []);
            const liveAlerts = [];

            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            rawCases.forEach(c => {
                if (c.hearings && Array.isArray(c.hearings)) {
                    c.hearings.forEach((h, idx) => {
                        if (h.date) {
                            const hDate = new Date(h.date);
                            const isToday = hDate.toDateString() === today.toDateString();
                            const isTomorrow = hDate.toDateString() === tomorrow.toDateString();

                            if (isToday) {
                                liveAlerts.push({
                                    id: `case-hearing-today-${c._id}-${idx}`,
                                    title: `⚖️ Hearing Today: ${c.name}`,
                                    desc: `Presiding Court: ${h.courtroom || c.courtName || 'District Court'} • Time: ${h.time || '10:30 AM'}\nPurpose: ${h.purpose || h.title || 'Judicial Proceeding'}`,
                                    time: h.date,
                                    type: 'alert',
                                    category: 'Hearings',
                                    priority: 'High',
                                    isRead: false,
                                    isRealtime: true
                                });
                            } else if (isTomorrow) {
                                liveAlerts.push({
                                    id: `case-hearing-tomorrow-${c._id}-${idx}`,
                                    title: `📅 Hearing Tomorrow: ${c.name}`,
                                    desc: `Court: ${h.courtroom || c.courtName || 'District Court'} • Scheduled for ${new Date(h.date).toLocaleDateString()}`,
                                    time: h.date,
                                    type: 'info',
                                    category: 'Hearings',
                                    priority: 'Medium',
                                    isRead: false,
                                    isRealtime: true
                                });
                            }
                        }
                    });
                }

                if (c.priority === 'High') {
                    liveAlerts.push({
                        id: `case-priority-${c._id}`,
                        title: `🚨 High Priority Tracker: ${c.name}`,
                        desc: `Client: ${c.clientName || 'General'} • Domain: ${c.caseType || 'Litigation Workspace'} requires advocate attention.`,
                        time: c.updatedAt || new Date().toISOString(),
                        type: 'error',
                        category: 'Cases',
                        priority: 'High',
                        isRead: false,
                        isRealtime: true
                    });
                }
            });

            setCasesNotifications(liveAlerts);
        } catch (err) {
            console.warn('Live case notification sync error:', err);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            fetchLiveCaseAlerts();
        }
    }, [isOpen]);

    // Merge context notifications, live case notifications, and institutional announcements
    const allNotifications = useMemo(() => {
        const combined = [...(contextNotifications || [])];
        
        // Add live alerts if not already in context
        casesNotifications.forEach(cn => {
            if (!combined.some(n => n.id === cn.id)) {
                combined.push(cn);
            }
        });

        // Add institutional enterprise announcements
        const annStr = localStorage.getItem('enterpriseAnnouncementsList');
        if (annStr) {
            try {
                const anns = JSON.parse(annStr);
                anns.forEach(a => {
                    const annId = `announcement-${a._id}`;
                    if (!combined.some(n => n.id === annId)) {
                        combined.push({
                            id: annId,
                            title: `📢 ${a.title}`,
                            desc: a.message,
                            time: a.createdAt,
                            type: 'info',
                            category: 'System',
                            priority: a.isPinned ? 'High' : 'Medium',
                            isRead: false
                        });
                    }
                });
            } catch (e) {}
        }

        // Filter by Tab
        return combined.filter(notif => {
            const matchesTab = activeTab === 'All' ? true : 
                               activeTab === 'Hearings' ? (notif.category === 'Hearings' || notif.title?.includes('Hearing')) :
                               activeTab === 'Cases' ? (notif.category === 'Cases' || notif.title?.includes('Case') || notif.title?.includes('Evidence')) :
                               activeTab === 'System' ? (notif.category === 'System' || notif.type === 'system' || notif.title?.includes('📢')) : true;

            const matchesQuery = !searchQuery.trim() ? true : 
                                 (notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  notif.desc?.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesTab && matchesQuery;
        });
    }, [contextNotifications, casesNotifications, activeTab, searchQuery]);

    const unreadCount = useMemo(() => {
        return allNotifications.filter(n => !n.isRead).length;
    }, [allNotifications]);

    const handleMarkSingleAsRead = (id) => {
        markNotificationRead(id);
    };

    const handleDeleteSingle = (id) => {
        deleteNotification(id);
        setCasesNotifications(prev => prev.filter(n => n.id !== id));
        toast.success('Notification removed');
    };

    const handleMarkAllRead = () => {
        allNotifications.forEach(n => markNotificationRead(n.id));
        setCasesNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
    };

    const handleClearAll = () => {
        clearAllNotifications();
        setCasesNotifications([]);
        toast.success('Inbox cleared');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex justify-end">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
                onClick={onClose} 
            />

            {/* Sidebar Drawer */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full sm:max-w-md bg-white dark:bg-[#0F172A] h-full max-h-screen shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 text-[#0F172A] dark:text-white z-10 overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#C8A34D]/15 rounded-xl flex items-center justify-center text-[#C8A34D] border border-[#C8A34D]/30 relative shrink-0">
                            <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#0F172A] animate-pulse" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h2 className="text-base sm:text-lg font-black tracking-tight text-[#0F172A] dark:text-white truncate">Notifications</h2>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#C8A34D] text-[#111111] text-[9px] sm:text-[10px] font-black shrink-0">
                                        {unreadCount} New
                                    </span>
                                )}
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">
                                AI LEGAL™ Real-Time Updates
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button 
                            onClick={fetchLiveCaseAlerts} 
                            disabled={isRefreshing}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-[#C8A34D]"
                            title="Refresh Real-Time Notifications"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#C8A34D]' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-2.5 sm:space-y-3 bg-slate-50/50 dark:bg-[#1E293B]/40">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input 
                            type="text"
                            placeholder="Filter notifications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#C8A34D]"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        {['All', 'Hearings', 'Cases', 'System'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                                    activeTab === tab
                                        ? 'bg-[#C8A34D] text-[#111111] shadow-xs'
                                        : 'bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 hover:text-[#C8A34D] border border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 sm:space-y-3 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {allNotifications.length > 0 ? (
                            allNotifications.map((notif) => (
                                <motion.div
                                    key={notif.id}
                                    layout
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all relative group ${
                                        notif.isRead 
                                            ? 'bg-white/60 dark:bg-[#1E293B]/40 border-slate-200/80 dark:border-slate-800/80 opacity-75' 
                                            : 'bg-white dark:bg-[#1E293B] border-[#C8A34D]/40 shadow-xs ring-1 ring-[#C8A34D]/20'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5 sm:gap-3">
                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                            notif.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                            notif.type === 'alert' || notif.type === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                                            'bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30'
                                        }`}>
                                            {notif.category === 'Hearings' ? <Gavel className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> :
                                             notif.type === 'success' ? <CheckCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> :
                                             notif.type === 'alert' || notif.type === 'error' ? <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : 
                                             <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-10 sm:pr-12">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <h4 className={`text-xs sm:text-sm font-black truncate ${notif.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-[#0F172A] dark:text-white'}`}>
                                                    {(notif.title || '').replace(/AISA/gi, 'AI LEGAL™')}
                                                </h4>
                                                {!notif.isRead && (
                                                    <span className="w-2 h-2 bg-[#C8A34D] rounded-full shrink-0 animate-pulse" />
                                                )}
                                            </div>
                                            <p className={`text-[11px] sm:text-xs leading-relaxed ${notif.isRead ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300 font-medium'}`}>
                                                {(notif.desc || '').replace(/AISA/gi, 'AI LEGAL™')}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex-wrap gap-1">
                                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-[#C8A34D]" />
                                                    {new Date(notif.time || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(notif.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>

                                                {notif.isRealtime && (
                                                    <span className="text-[9px] font-black text-[#C8A34D] bg-[#C8A34D]/10 px-1.5 py-0.5 rounded-md border border-[#C8A34D]/20 uppercase shrink-0">
                                                        Realtime
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Icons Overlay (Delete & Read Toggle) */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkSingleAsRead(notif.id);
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                    notif.isRead 
                                                        ? 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' 
                                                        : 'text-[#C8A34D] hover:bg-[#C8A34D]/15'
                                                }`}
                                                title={notif.isRead ? 'Marked as Read' : 'Mark as Read'}
                                            >
                                                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSingle(notif.id);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                title="Delete Notification"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-16 sm:py-20 text-center px-4 sm:px-6"
                            >
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#C8A34D]/10 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-[#C8A34D]/30 relative">
                                    <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-[#C8A34D]" />
                                </div>
                                <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A] dark:text-white">Your inbox is clear</h3>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                                    No active notifications or court hearing reminders right now. Real-time updates will appear here automatically.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                {allNotifications.length > 0 && (
                    <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex items-center gap-2.5 sm:gap-3">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#111111] bg-[#C8A34D] hover:bg-[#b08d3b] rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                Mark All Read
                            </button>
                        )}

                        <button
                            onClick={handleClearAll}
                            className="flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/40 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Clear All
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default NotificationCenter;
