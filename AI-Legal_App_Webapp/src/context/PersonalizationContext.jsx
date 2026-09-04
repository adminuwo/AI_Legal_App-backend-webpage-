import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { apis } from '../types';
import { getUserData } from '../userStore/userData';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { initSocket } from '../services/socketService';
import { API } from '../types';
import { Clock } from 'lucide-react';

console.log("PersonalizationContext file loaded!");
if (typeof window !== 'undefined' && !window.__PersonalizationContext) {
    window.__PersonalizationContext = createContext();
}
const PersonalizationContext = typeof window !== 'undefined' ? window.__PersonalizationContext : createContext();

const DEFAULT_PREFERENCES = {
    general: {
        language: import.meta.env.VITE_DEFAULT_LANGUAGE || 'English',
        region: 'India',
        theme: 'Light',
        responseSpeed: 'Balanced',
        screenReader: false,
        highContrast: false
    },
    notifications: {
        responses: 'Push',
        groupChats: 'Push',
        tasks: 'Push, Email',
        projects: 'Email',
        recommendations: 'Push, Email'
    },
    personalization: {
        fontSize: 'Medium',
        fontStyle: 'Default',
        enthusiasm: 'Medium',
        formality: 'Medium',
        creativity: 'Medium',
        structuredResponses: false,
        bulletPoints: false,
        customInstructions: '',
        emojiUsage: 'Moderate'
    },
    apps: {},
    dataControls: {
        chatHistory: 'On',
        trainingDataUsage: true
    },
    security: {
        twoFactor: false
    },
    parentalControls: {
        enabled: false,
        ageCategory: 'Adult',
        contentFilter: false,
        timeLimits: false
    },
    account: {
        nickname: ''
    },
    voice: {
        languageCode: 'en-US',
        voiceName: 'en-US-Chirp3-HD-Autonoe',
        pitch: 0,
        speed: 1.0
    }
};

export const PersonalizationProvider = ({ children }) => {
    const [personalizations, setPersonalizationsState] = useState(() => {
        const saved = localStorage.getItem('personalizations');
        const prefs = saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
        // Migration: Small is now Medium
        if (prefs?.personalization?.fontSize === 'Small') {
            prefs.personalization.fontSize = 'Medium';
        }
        // Migration: 'System' theme defaults to 'Light'
        if (!prefs?.general?.theme || prefs.general.theme === 'System') {
            if (!prefs.general) prefs.general = {};
            prefs.general.theme = 'Light';
        }
        return prefs;
    });
    const [notifications, setNotifications] = useState([]);
    const [chatSessions, setChatSessions] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const reminderAudioRef = useRef(null);
    const recentNotificationsRef = useRef(new Set());
    const notifiedRemindersRef = useRef(new Set());

    const user = getUserData();

    const fetchReminders = async () => {
        if (!user?.token) return [];
        try {
            const res = await axios.get(`${API}/reminders`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.data.success) {
                setReminders(res.data.reminders || []);
                return res.data.reminders || [];
            }
        } catch (error) {
            console.error('Failed to fetch reminders:', error);
        }
        return [];
    };

    const fetchChatSessions = async () => {
        if (!user?.token) return;
        try {
            const res = await axios.get(apis.chatAgent, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            setChatSessions(res.data || []);
        } catch (error) {
            console.error('Failed to fetch chat sessions', error);
        }
    };

    const fetchNotifications = async () => {
        if (!user?.token) return;
        try {
            const res = await axios.get(apis.notifications, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            setNotifications(res.data);
        } catch (error) {
            console.error('Failed to fetch notifications', error.response?.data || error.message);
        }
    };

    const deleteNotification = async (notifId) => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        try {
            if (user?.token) {
                await axios.delete(`${apis.notifications}/${notifId}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
            }
        } catch (error) {
            console.error('Failed to delete notification', error);
            fetchNotifications();
        }
    };

    const clearAllNotifications = async () => {
        setNotifications([]);
        try {
            if (user?.token) {
                await axios.delete(apis.notifications, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
            }
        } catch (error) {
            console.error('Failed to clear notifications', error);
            fetchNotifications();
        }
    };

    const markNotificationRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try {
            if (user?.token && !id.startsWith('local_')) {
                await axios.put(`${apis.notifications}/${id}/read`, {}, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
            }
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const addNotification = (notif) => {
        // Prevent duplicate local notifications for the same thing today
        const today = new Date().toDateString();
        const isDuplicate = notifications.some(n => n.title === notif.title && new Date(n.time).toDateString() === today);
        if (isDuplicate) return;

        const newNotif = {
            id: 'local_' + Date.now(),
            time: new Date().toISOString(),
            isRead: false,
            type: 'alert',
            ...notif
        };
        setNotifications(prev => [newNotif, ...prev]);
        
        toast.custom((tObj) => (
            <div className={`${tObj.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-indigo-500/20 overflow-hidden`}>
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="ml-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="text-indigo-500">⚖️</span> {notif.title}
                            </p>
                            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                {notif.desc}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex border-l border-gray-100 dark:border-white/5">
                    <button
                        onClick={() => toast.dismiss(tObj.id)}
                        className="w-full border border-transparent rounded-none rounded-r-2xl px-4 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 focus:outline-none"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        ), { duration: 6000 });
    };


    const fetchPersonalizations = async () => {
        if (!user?.token) return;
        setIsLoading(true);
        try {
            const res = await axios.get(apis.user, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.data.personalizations) {
                const merged = { ...DEFAULT_PREFERENCES, ...res.data.personalizations };
                // Migration: Small is now Medium
                if (merged.personalization?.fontSize === 'Small') {
                    merged.personalization.fontSize = 'Medium';
                }
                setPersonalizationsState(merged);
                localStorage.setItem('personalizations', JSON.stringify(merged));
                applyDynamicStyles(merged);
            } else {
                setPersonalizationsState(prev => prev || DEFAULT_PREFERENCES);
            }
        } catch (error) {
            console.error('Failed to fetch personalizations', error);
            setPersonalizationsState(prev => prev || DEFAULT_PREFERENCES);
        } finally {
            setIsLoading(false);
        }
    };

    const applyDynamicStyles = (prefs) => {
        const p = prefs || personalizations;
        if (!p?.personalization) return;

        // Font Size
        const fontSize = p.personalization.fontSize || 'Medium';
        const fontSizeMap = {
            'Small': '14px',
            'Medium': '16px',
            'Large': '20px',
            'Extra Large': '24px'
        };

        const scaleMap = {
            'Small': '0.9',
            'Medium': '1',
            'Large': '1.2',
            'Extra Large': '1.4'
        };

        document.documentElement.style.setProperty('--aisa-font-size', fontSizeMap[fontSize] || '15px');
        document.documentElement.style.setProperty('--aisa-scale', scaleMap[fontSize] || '1');

        // Font Style
        const fontStyle = p.personalization.fontStyle || 'Default';
        const fontClasses = ['font-serif', 'font-mono', 'font-rounded', 'font-sans'];
        document.body.classList.remove(...fontClasses);
        const fontClassName = fontStyle === 'Serif' ? 'font-serif' : fontStyle === 'Mono' ? 'font-mono' : fontStyle === 'Rounded' ? 'font-rounded' : 'font-sans';
        document.body.classList.add(fontClassName);

        document.body.classList.add('aisa-scalable-text');
    };

    useEffect(() => {
        let socket;
        if (user?.token) {
            fetchPersonalizations();
            fetchNotifications();
            fetchChatSessions();

            // Initialize Socket.io for Real-time Notifications
            socket = initSocket(user.token);

            socket.on('new_notification', (notification) => {
                console.log('[Socket] New notification received:', notification);
                
                setNotifications(prev => [notification, ...prev]);

                // Mark in notifiedRemindersRef to prevent local duplicate triggering
                if (notification.id && notification.id.startsWith('reminder_')) {
                    const reminderId = notification.id.replace('reminder_', '');
                    notifiedRemindersRef.current.add(reminderId);
                }

                // Show Toast
                toast.custom((tObj) => (
                    <div className={`${tObj.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-[#1E1E1E] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-primary/20 overflow-hidden`}>
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className="ml-0 flex-1">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <span>{notification.type === 'alert' ? '⚠️' : '🔔'}</span> {notification.title}
                                    </p>
                                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                        {notification.desc}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-l border-gray-100 dark:border-white/5">
                            <button
                                onClick={() => {
                                    if (notification.voice) stopReminderVoice();
                                    toast.dismiss(tObj.id);
                                }}
                                className="w-full border border-transparent rounded-none rounded-r-2xl px-4 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 focus:outline-none"
                            >
                                {notification.voice && notification.voice !== 'none' ? 'Stop' : 'Close'}
                            </button>
                        </div>
                    </div>
                ), { duration: notification.voice && notification.voice !== 'none' ? 60000 : 5000 });

                // Voice Reminder if applicable
                if (notification.voice && notification.voice !== 'none') {
                    const taskId = notification.id.replace('reminder_', '');
                    speakReminder(notification.title, notification.voice, taskId);
                }
            });

            const userId = user.id || user._id;
            if (userId) {
                socket.emit('join', userId);
            }

            return () => {
                // We don't disconnect here because other components might use it
                // but we do turn off the listener to avoid duplicates
                if (socket) socket.off('new_notification');
            };
        }
        applyDynamicStyles();
    }, [user?.token]);

    useEffect(() => {
        if (!user?.token) return;

        // Load reminders on mount/login
        fetchReminders();

        const checkReminders = async () => {
            const isGlobalEnabled = personalizations?.personalization?.enableReminders !== false;
            if (!isGlobalEnabled) return;

            const now = new Date();
            
            for (const reminder of reminders) {
                if (reminder.status !== 'pending' || !reminder.isActive) continue;

                const reminderTime = new Date(reminder.datetime);
                const timeDiff = now - reminderTime;

                // Trigger if due (time passed or is now, within a 1-minute window)
                const isDue = timeDiff >= 0 && timeDiff < 60000;

                if (isDue && !notifiedRemindersRef.current.has(reminder._id)) {
                    notifiedRemindersRef.current.add(reminder._id);
                    
                    // 1. Play sound
                    const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3");
                    audio.volume = 0.5;
                    audio.play().catch(e => console.error("Audio play failed", e));

                    // 2. Visual Toast
                    toast.custom((tObj) => (
                        <div className={`${tObj.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white dark:bg-[#1E1E1E] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-primary/20 overflow-hidden`}>
                            <div className="flex-1 w-0 p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        <Clock className="h-10 w-10 text-primary animate-pulse" />
                                    </div>
                                    <div className="ml-3 flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span>⚠️</span> {reminder.title}
                                        </p>
                                        <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                            {reminder.description || 'Time to check your scheduled task.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-l border-gray-100 dark:border-white/5">
                                <button
                                    onClick={() => {
                                        stopReminderVoice();
                                        toast.dismiss(tObj.id);
                                    }}
                                    className="w-full border border-transparent rounded-none rounded-r-2xl px-4 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 focus:outline-none"
                                >
                                    Stop
                                </button>
                            </div>
                        </div>
                    ), { duration: reminder.voice && reminder.voice !== 'none' ? 60000 : 5000 });

                    // 3. Speak Voice if selected
                    if (reminder.voice && reminder.voice !== 'none') {
                        speakReminder(reminder.title, reminder.voice, reminder._id);
                    } else {
                        const utterance = new SpeechSynthesisUtterance(`Reminder: ${reminder.title}`);
                        window.speechSynthesis.speak(utterance);
                    }

                    // 4. Update the reminder in the backend
                    try {
                        let updatedReminder;
                        if (reminder.repeat === 'none') {
                            const res = await axios.patch(`${API}/reminders/${reminder._id}/complete`, {}, {
                                headers: { 'Authorization': `Bearer ${user.token}` }
                            });
                            updatedReminder = res.data.reminder;
                        } else {
                            const nextTime = new Date(reminder.datetime);
                            if (reminder.repeat === 'daily') nextTime.setDate(nextTime.getDate() + 1);
                            else if (reminder.repeat === 'weekly') nextTime.setDate(nextTime.getDate() + 7);
                            else if (reminder.repeat === 'monthly') nextTime.setMonth(nextTime.getMonth() + 1);
                            else if (reminder.repeat === 'custom') {
                                const currentDay = nextTime.getDay();
                                let daysToAdd = 1;
                                if (reminder.customDays && reminder.customDays.length > 0) {
                                    for (let i = 1; i <= 7; i++) {
                                        const nextDayToCheck = (currentDay + i) % 7;
                                        if (reminder.customDays.includes(nextDayToCheck)) {
                                            daysToAdd = i;
                                            break;
                                        }
                                    }
                                }
                                nextTime.setDate(nextTime.getDate() + daysToAdd);
                            }

                            const res = await axios.put(`${API}/reminders/${reminder._id}`, {
                                datetime: nextTime.toISOString()
                            }, {
                                headers: { 'Authorization': `Bearer ${user.token}` }
                            });
                            updatedReminder = res.data.reminder;
                        }

                        if (updatedReminder) {
                            setReminders(prev => prev.map(r => r._id === reminder._id ? updatedReminder : r));
                        }
                    } catch (err) {
                        console.error("Failed to update reminder status on trigger:", err);
                    }
                }
            }
        };

        const checkInterval = setInterval(checkReminders, 10000); // Check every 10 seconds
        return () => clearInterval(checkInterval);
    }, [reminders, user?.token, personalizations]);


    const stopReminderVoice = () => {
        // 1. Stop Browser Native Speech (Crucial for fallback)
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // 2. Stop Chirp-3 HD Looping Audio
        if (reminderAudioRef.current) {
            reminderAudioRef.current.pause();
            reminderAudioRef.current.currentTime = 0;
            if (reminderAudioRef.current.src) {
                URL.revokeObjectURL(reminderAudioRef.current.src);
            }
            reminderAudioRef.current = null;
        }
    };

    const speakReminder = async (text, voiceConfig, taskId) => {
        if (!user?.token) return;

        // Throttling: Prevent the same task from shouting multiple times within a minute
        if (taskId) {
            if (recentNotificationsRef.current.has(taskId)) return;
            recentNotificationsRef.current.add(taskId);
            setTimeout(() => {
                recentNotificationsRef.current.delete(taskId);
            }, 60000); // 1 minute cooldown per task
        }

        try {
            // Priority: Explicit voiceConfig (from task) > Global voice setting
            const v = personalizations?.voice || DEFAULT_PREFERENCES.voice;
            
            let finalVoice = v.voiceName;
            let langCode = v.languageCode;
            let pitch = v.pitch;
            let speed = v.speed;

            if (voiceConfig && voiceConfig !== 'none') {
                if (voiceConfig.includes('-Chirp3-HD-')) {
                    finalVoice = voiceConfig;
                    langCode = voiceConfig.split('-Chirp3-HD-')[0];
                } else {
                    const parts = voiceConfig.split('-');
                    langCode = parts.slice(0, 2).join('-');
                    const persona = parts[2] === 'male' ? 'Algieba' : 'Autonoe';
                    finalVoice = `${langCode}-Chirp3-HD-${persona}`;
                }
            }

            stopReminderVoice(); // Stop any overlapping audio

            const res = await axios.post(apis.synthesizeFile, {
                introText: `🔔 ${text}`,
                languageCode: langCode,
                voiceName: finalVoice,
                pitch: pitch,
                speakingRate: speed
            }, {
                headers: { 'Authorization': `Bearer ${user.token}` },
                responseType: 'blob'
            });

            const url = URL.createObjectURL(res.data);
            const audio = new Audio(url);
            audio.loop = true;
            reminderAudioRef.current = audio;
            audio.play();
        } catch (error) {
            console.error('Premium TTS failed, falling back...', error);
            try {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
            } catch (inner) {}
        }
    };

    const updatePersonalization = async (section, data) => {
        const next = {
            ...personalizations,
            [section]: { ...(personalizations?.[section] || {}), ...data }
        };
        setPersonalizationsState(next);
        localStorage.setItem('personalizations', JSON.stringify(next));
        applyDynamicStyles(next);
        syncWithBackend(section, next[section]);
    };

    const syncWithBackend = async (section, fullSectionData) => {
        try {
            if (user?.token) {
                await axios.put(apis.user + '/personalizations',
                    { personalizations: { [section]: fullSectionData } },
                    { headers: { 'Authorization': `Bearer ${user.token}` } }
                );
            }
        } catch (error) {
            console.warn('Sync failed:', error.message);
        }
    };

    const resetPersonalizations = async () => {
        try {
            if (user?.token) {
                await axios.post(apis.user + '/personalizations/reset', {}, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                setPersonalizationsState(DEFAULT_PREFERENCES);
                localStorage.setItem('personalizations', JSON.stringify(DEFAULT_PREFERENCES));
                applyDynamicStyles(DEFAULT_PREFERENCES);
                toast.success('Settings reset');
            }
        } catch (error) {}
    };

    const getSystemPromptExtensions = () => {
        const p = personalizations?.personalization || {};
        let prompt = "";
        if (p.emojiUsage) {
            const map = { 'None': "Do NOT use emojis.", 'Minimal': "Use emojis sparingly.", 'Moderate': "Use emojis moderately.", 'Expressive': "Use emojis frequently." };
            prompt += `\nEmoji Guideline: ${map[p.emojiUsage] || map['Moderate']}`;
        }
        if (p.customInstructions) prompt += `\nCustom Instructions: ${p.customInstructions}`;
        return prompt;
    };

    return (
        <PersonalizationContext.Provider value={{
            personalizations,
            updatePersonalization,
            resetPersonalizations,
            isLoading,
            notifications,
            markNotificationRead,
            addNotification,
            deleteNotification,
            clearAllNotifications,
            chatSessions,
            refreshChatSessions: fetchChatSessions,
            getSystemPromptExtensions,
            speakReminder,
            stopReminderVoice,
            reminders,
            setReminders,
            fetchReminders
        }}>
            {children}
        </PersonalizationContext.Provider>
    );
};

export const usePersonalization = () => {
    const context = useContext(PersonalizationContext);
    if (!context) throw new Error('usePersonalization must be used within a PersonalizationProvider');
    return context;
};
