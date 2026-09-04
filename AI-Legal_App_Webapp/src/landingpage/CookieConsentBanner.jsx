import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Shield, BarChart3, Settings2, Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserData } from '../userStore/userData';

import { AppRoute } from '../types';

const COOKIE_CONSENT_KEY = 'aisa_cookie_consent';

const CookieConsentBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showCustomize, setShowCustomize] = useState(false);
    const [preferences, setPreferences] = useState({
        analytics: true,
        preferences: true,
        functional: true,
    });
    const navigate = useNavigate();
    const location = useLocation();

    // Do not show the cookie banner on legal pages
    // Using regex for robust matching (handles case-insensitivity and optional trailing slashes)
    const isLegalPage = /^\/(privacy-policy|terms|cookie-policy|terms-of-service)(\/|$)/i.test(location.pathname);

    useEffect(() => {
        // If we are on a legal page, hide the banner regardless of consent
        if (isLegalPage) {
            setIsVisible(false);
            return;
        }

        const user = getUserData();
        const hasToken = user && user.token;
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);

        if (hasToken) {
            // User is logged in — auto-accept cookies silently and hide the banner
            if (!consent) {
                localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
                    accepted: true,
                    analytics: true,
                    preferences: true,
                    functional: true,
                    essential: true,
                    timestamp: new Date().toISOString()
                }));
            }
            setIsVisible(false);
            return;
        }

        // Only show for non-logged-in users who haven't given consent
        if (!consent) {
            setIsVisible(true);
        }
    }, [location.pathname, isLegalPage]);

    // Scroll is intentionally NOT blocked — users can scroll and browse freely
    // before accepting cookies. Only login-gated features are restricted.

    const saveConsent = (data) => {
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
            ...data,
            essential: true,
            timestamp: new Date().toISOString()
        }));
        setIsVisible(false);
    };

    const handleAcceptAll = () => {
        saveConsent({ accepted: true, analytics: true, preferences: true, functional: true });
    };

    const handleSaveCustom = () => {
        saveConsent({ accepted: true, ...preferences });
    };

    const togglePref = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const cookieOptions = [
        {
            key: 'essential',
            label: 'Essential Cookies',
            description: 'Required for login, security, and core functionality. Cannot be disabled.',
            icon: Lock,
            locked: true,
            enabled: true,
        },
        {
            key: 'analytics',
            label: 'Analytics Cookies',
            description: 'Help us understand how you use AISA™ to improve our services.',
            icon: BarChart3,
            locked: false,
            enabled: preferences.analytics,
        },
        {
            key: 'preferences',
            label: 'Preference Cookies',
            description: 'Remember your language, theme, and personalization settings.',
            icon: Settings2,
            locked: false,
            enabled: preferences.preferences,
        },
        {
            key: 'functional',
            label: 'Functional Cookies',
            description: 'Enable chat history sync, AI agent selection, and enhanced features.',
            icon: Shield,
            locked: false,
            enabled: preferences.functional,
        },
    ];

    if (!isVisible || isLegalPage) return null;

    return (
        <>
            {/* Cookie consent card — non-blocking, user can still scroll */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
            >
                <div className="max-w-3xl mx-auto relative">
                    {/* Glowing gradient border */}
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl blur-sm opacity-75 animate-pulse" />

                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_40px_rgba(99,102,241,0.3)] dark:shadow-[0_8px_40px_rgba(99,102,241,0.4)] overflow-hidden">

                        {/* Main Banner */}
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl shrink-0 hidden sm:flex border border-purple-500/20">
                                    <Cookie className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
                                        <span className="sm:hidden">🍪</span> Cookie Consent
                                    </h3>
                                    <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed mb-4 font-medium">
                                        AI LEGAL™ uses cookies to improve your experience, store preferences, and analyze usage.
                                        Please choose an option below to continue to the platform.{' '}
                                        <button
                                            onClick={() => window.open('/cookie-policy', '_blank')}
                                            className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
                                        >
                                            Cookie Policy →
                                        </button>
                                    </p>

                                    {!showCustomize && (
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={handleAcceptAll}
                                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-blue-700 transition-all active:scale-95 shadow-lg shadow-purple-500/25"
                                            >
                                                ✓ Accept All Cookies
                                            </button>
                                            <button
                                                onClick={() => setShowCustomize(true)}
                                                className="px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-800 text-gray-900 dark:text-white rounded-xl text-sm font-semibold hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Settings2 className="w-4 h-4" /> Customize Cookies
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Customize Panel */}
                        <AnimatePresence>
                            {showCustomize && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="border-t border-gray-200 dark:border-slate-700 px-6 pb-6 pt-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                                            Essential cookies are always active. Toggle optional cookie categories below:
                                        </p>
                                        <div className="space-y-3 mb-5">
                                            {cookieOptions.map((option) => {
                                                const Icon = option.icon;
                                                return (
                                                    <div
                                                        key={option.key}
                                                        className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${option.locked
                                                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                                            : option.enabled
                                                                ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800'
                                                                : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <Icon className={`w-5 h-5 shrink-0 ${option.locked
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : option.enabled
                                                                ? 'text-purple-600 dark:text-purple-400'
                                                                : 'text-gray-400'
                                                            }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{option.label}</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">{option.description}</p>
                                                        </div>
                                                        {option.locked ? (
                                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full shrink-0">
                                                                Always On
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => togglePref(option.key)}
                                                                className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${option.enabled
                                                                    ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                                                                    : 'bg-gray-300 dark:bg-slate-600'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${option.enabled ? 'left-[26px]' : 'left-0.5'
                                                                        }`}
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={handleSaveCustom}
                                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-blue-700 transition-all active:scale-95 shadow-lg shadow-purple-500/25"
                                            >
                                                ✓ Save & Continue
                                            </button>
                                            <button
                                                onClick={handleAcceptAll}
                                                className="px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-800 text-gray-900 dark:text-white rounded-xl text-sm font-semibold hover:border-purple-400 transition-all active:scale-95"
                                            >
                                                Accept All Instead
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default CookieConsentBanner;
