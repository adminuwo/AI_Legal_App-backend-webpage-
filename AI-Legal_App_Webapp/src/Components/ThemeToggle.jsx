import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    // Normalize theme for calculation (handling 'System' case)
    const normalizedTheme = typeof theme === 'string' ? theme.toLowerCase() : 'system';
    const isDark = normalizedTheme === 'dark' || (normalizedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <div className="flex items-center justify-center">
            <motion.button
                onClick={toggleTheme}
                className={`relative w-14 h-8 flex items-center rounded-full px-1 shadow-inner transition-colors duration-500 overflow-hidden ${isDark
                    ? 'bg-[#2d3436]' // Deep charcoal grey
                    : 'bg-[#d1e9ff]' // Soft sky blue
                    }`}
                whileTap={{ scale: 0.95 }}
            >
                {/* Sliding Knob */}
                <motion.div
                    animate={{ x: isDark ? 24 : 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg relative z-10 ${isDark ? 'bg-[#dfe6e9]' : 'bg-white'
                        }`}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {isDark ? (
                            <motion.div
                                key="moon"
                                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Moon className="w-3.5 h-3.5 text-slate-700" fill="currentColor" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sun"
                                initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Sun className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Background Icons/Effects */}
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                    {/* Sun icon background (visible in light mode) */}
                    <motion.div
                        animate={{
                            opacity: isDark ? 0 : 1,
                            x: isDark ? -10 : 0,
                            scale: isDark ? 0.8 : 1
                        }}
                        className="text-amber-300/40"
                    >
                        <Sun className="w-5 h-5" />
                    </motion.div>

                    {/* Moon/Stars background (visible in dark mode) */}
                    <motion.div
                        animate={{
                            opacity: isDark ? 1 : 0,
                            x: isDark ? 0 : 10,
                            scale: isDark ? 1 : 0.8
                        }}
                        className="flex items-center gap-1 text-slate-400/30"
                    >
                        <Sparkles className="w-3 h-3" />
                        <Moon className="w-4 h-4" />
                    </motion.div>
                </div>

                {/* Inner shadow for neumorphic depth */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] pointer-events-none" />
            </motion.button>
        </div>
    );
};

export default ThemeToggle;
