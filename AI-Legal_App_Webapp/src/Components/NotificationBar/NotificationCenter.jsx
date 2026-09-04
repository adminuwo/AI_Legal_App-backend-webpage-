import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, Clock, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonalization } from '../../context/PersonalizationContext';

const NotificationCenter = ({ isOpen, onClose }) => {
    const { notifications, markNotificationRead } = usePersonalization();
    const [loading, setLoading] = useState(false); // Context handles initial load, but we can keep a local sync if needed

    const handleMarkAsRead = async (id) => {
        try {
            await markNotificationRead(id);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            // Bulk mark read logic if needed
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
                onClick={onClose} 
            />

            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-sm bg-white dark:bg-[#0f111a] h-screen shadow-2xl flex flex-col border-l border-white/10"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 bg-inherit/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-maintext tracking-tight">Notifications</h2>
                            <p className="text-[10px] text-subtext font-bold uppercase tracking-widest">AI LEGAL™ System Updates</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-subtext hover:text-maintext">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20 gap-4"
                            >
                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-xs text-subtext font-bold animate-pulse">Syncing Inbox...</p>
                            </motion.div>
                        ) : notifications.length > 0 ? (
                            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                {notifications.map((notif) => (
                                    <motion.div
                                        key={notif.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                                            notif.isRead 
                                                ? 'bg-transparent border-white/5 opacity-60' 
                                                : 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'
                                        }`}
                                        onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                notif.type === 'success' ? 'bg-green-500/10 text-green-500' :
                                                notif.type === 'alert' ? 'bg-amber-500/10 text-amber-500' : 
                                                notif.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                                            }`}>
                                                {notif.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                                                 notif.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : 
                                                 notif.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h4 className={`text-sm font-bold truncate ${notif.isRead ? 'text-subtext' : 'text-maintext'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    {!notif.isRead && <span className="w-2 h-2 bg-primary rounded-full shrink-0 animate-pulse"></span>}
                                                </div>
                                                <p className={`text-xs leading-relaxed line-clamp-3 ${notif.isRead ? 'text-subtext/70' : 'text-subtext'}`}>
                                                    {notif.desc}
                                                </p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-[9px] font-black text-subtext/40 uppercase tracking-tighter">
                                                        {new Date(notif.time).toLocaleDateString()} · {new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-20 text-center px-6"
                            >
                                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/10 relative">
                                    <Bell className="w-8 h-8 text-subtext/40" />
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-50" />
                                </div>
                                <h3 className="font-bold text-maintext">Your inbox is clear</h3>
                                <p className="text-xs text-subtext mt-2 leading-relaxed">No new notifications from AI LEGAL™ at the moment. We'll alert you here for reminders or system updates.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <AnimatePresence>
                    {notifications.some(n => !n.isRead) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-xl"
                        >
                            <button
                                onClick={handleMarkAllRead}
                                className="w-full py-3 text-xs font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/10 rounded-xl transition-all border border-primary/20 flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Mark all as read
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default NotificationCenter;
