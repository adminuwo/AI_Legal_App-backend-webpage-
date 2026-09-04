import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePersonalization } from './PersonalizationContext';

const ThemeContext = createContext();

const ACCENT_COLORS = {
    'Default': '240 100% 67%',
    'Blue': '217 91% 60%',
    'Green': '142 71% 45%',
    'Purple': '262 83% 58%',
    'Orange': '24 95% 53%',
    'Pink': '330 81% 60%',
    'Red': '0 84% 60%',
    'Black': '0 0% 0%'
};

// ── Reliable dark mode hook: watches the actual DOM class ──────────────────
export const useIsDark = () => {
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains('dark')
    );

    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            setIsDark(root.classList.contains('dark'));
        });
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return isDark;
};

export const ThemeProvider = ({ children }) => {
    const { personalizations, updatePersonalization } = usePersonalization();

    const theme = personalizations?.general?.theme || 'System';
    const accentColor = personalizations?.general?.accentColor || 'Default';

    const setTheme = (val) => updatePersonalization('general', { theme: val });
    const setAccentColor = (val) => updatePersonalization('general', { accentColor: val });

    // Helper to parse HSL string "H S% L%"
    const parseHsl = (str) => {
        const parts = str.match(/\d+(\.\d+)?/g);
        return parts ? parts.map(Number) : [0, 0, 0];
    };

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (currentTheme) => {
            root.classList.remove('light', 'dark');
            if (currentTheme.toLowerCase() === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                root.classList.add(isDark ? 'dark' : 'light');
            } else {
                root.classList.add(currentTheme.toLowerCase());
            }
        };

        applyTheme(theme);

        if (theme.toLowerCase() === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        localStorage.setItem('app_theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        const baseHslStr = ACCENT_COLORS[accentColor] || ACCENT_COLORS['Default'];
        const [h, s, l] = parseHsl(baseHslStr);

        // Generate dynamic shades
        const primary = `${h} ${s}% ${l}%`;
        const primaryLight = `${h} ${s}% ${Math.min(l + 15, 95)}%`;
        const primaryDark = `${h} ${s}% ${Math.max(l - 15, 5)}%`;
        
        // Background shade (very light in light mode, very dark in dark mode)
        const isDark = root.classList.contains('dark');
        const primaryBg = isDark 
            ? `${h} ${s * 0.5}% 12%` 
            : `${h} ${s * 0.3}% 96%`;
        
        // Border shade (subtle)
        const primaryBorder = `${h} ${s}% ${l}% / 0.15`;
        const primaryRing = `${h} ${s}% ${l}%`;

        // Apply variables to root
        root.style.setProperty('--primary', primary);
        root.style.setProperty('--color-primary', `hsl(${primary})`);
        root.style.setProperty('--primary-light', primaryLight);
        root.style.setProperty('--color-primary-light', `hsl(${primaryLight})`);
        root.style.setProperty('--primary-dark', primaryDark);
        root.style.setProperty('--color-primary-dark', `hsl(${primaryDark})`);
        root.style.setProperty('--primary-bg', primaryBg);
        root.style.setProperty('--color-primary-bg', `hsl(${primaryBg})`);
        root.style.setProperty('--primary-border', primaryBorder);
        root.style.setProperty('--color-primary-border', `hsl(${primaryBorder})`);
        root.style.setProperty('--ring', primaryRing);
        root.style.setProperty('--color-ring', `hsl(${primaryRing})`);

        localStorage.setItem('app_accent', accentColor);
    }, [accentColor, theme]); // Re-run when theme changes to adjust primary-bg

    return (
        <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor, ACCENT_COLORS }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);


