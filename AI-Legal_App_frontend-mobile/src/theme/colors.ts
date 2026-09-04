/**
 * AI Legal Mobile - Color System Design Tokens
 * Premium enterprise design tokens (Matte Black, Pure White, Soft Gold, Light Gray, Dark Charcoal).
 */

export const Colors = {
  // Brand Base (Matte Black primary, Soft Gold accent)
  brand: {
    primary: '#111111',
    primaryLight: '#F5F5F5',
    primaryDark: '#000000',
    secondary: '#C8A34D',
  },

  // AI Tool Action Palette (Coordinated luxury themes, absolutely no purple/blue gradients)
  tools: {
    aiAssistant: '#C8A34D',       // Soft Gold
    draftMaker: '#111111',        // Matte Black
    legalResearch: '#C8A34D',     // Soft Gold
    contractAnalyzer: '#222222',  // Dark Charcoal
    evidenceAnalyst: '#C8A34D',   // Soft Gold
    argumentBuilder: '#111111',   // Matte Black
    casePredictor: '#C8A34D',      // Soft Gold
    strategyEngine: '#222222',    // Dark Charcoal
    researchAssistant: '#C8A34D',  // Soft Gold
  },

  // Light Mode Tokens (Rolex / Apple Minimalist Theme)
  light: {
    primary: '#C8A34D',            // Soft Gold primary color
    secondary: '#222222',          // Dark Charcoal
    background: '#F5F5F5',         // Light Gray app background
    surface: '#FFFFFF',            // Pure White surface elements
    surfaceVariant: '#EBEBEB',
    border: '#E5E5E5',             // Clean light border
    divider: '#E5E5E5',
    card: '#FFFFFF',               // Pure White cards
    hover: 'rgba(17, 17, 17, 0.04)',
    pressed: 'rgba(17, 17, 17, 0.08)',
    disabled: 'rgba(17, 17, 17, 0.38)',
    overlay: 'rgba(17, 17, 17, 0.4)',
    
    // Status colors (Strict text-only rules apply in lists, no colorful pill backgrounds)
    success: '#10B981',
    successLight: '#E6F4EA',
    warning: '#F59E0B',
    warningLight: '#FEF7E0',
    danger: '#EF4444',
    dangerLight: '#FCE8E6',
    info: '#C8A34D',               // Soft Gold for premium info info highlights
    infoLight: 'rgba(200, 163, 77, 0.08)',

    // Text hierarchy
    textPrimary: '#111111',        // Matte Black primary text
    textSecondary: '#4B5563',      // Medium Gray body text
    textMuted: '#9CA3AF',
    placeholder: '#9CA3AF',
    selection: 'rgba(200, 163, 77, 0.12)', // Soft Gold highlight
    focus: '#C8A34D',              // Soft Gold focus

    // Legacy parameters (For backwards compatibility with templates)
    text: '#111111',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E5E5E5',
  },

  // Dark Mode Tokens (Mercedes / Notion Dark Slate Theme)
  dark: {
    primary: '#C8A34D',            // Soft Gold primary color
    secondary: '#F5F5F5',          // Light Gray
    background: '#111111',         // Matte Black background
    surface: '#222222',            // Dark Charcoal surface elements
    surfaceVariant: '#333333',
    border: '#333333',
    divider: '#333333',
    card: '#222222',               // Dark Charcoal cards
    hover: 'rgba(255, 255, 255, 0.04)',
    pressed: 'rgba(255, 255, 255, 0.08)',
    disabled: 'rgba(255, 255, 255, 0.38)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // Status colors
    success: '#10B981',
    successLight: '#0E2818',
    warning: '#F59E0B',
    warningLight: '#2C220E',
    danger: '#EF4444',
    dangerLight: '#2D1414',
    info: '#C8A34D',               // Soft Gold accent
    infoLight: 'rgba(200, 163, 77, 0.12)',

    // Text hierarchy
    textPrimary: '#FFFFFF',        // Pure White text
    textSecondary: '#A1A1AA',      // Soft zinc gray text
    textMuted: '#6B7280',
    placeholder: '#6B7280',
    selection: 'rgba(200, 163, 77, 0.24)',
    focus: '#C8A34D',              // Soft Gold focus

    // Legacy parameters (For backwards compatibility with templates)
    text: '#FFFFFF',
    backgroundElement: '#222222',
    backgroundSelected: '#333333',
  },
} as const;

export type ColorPalette = typeof Colors;
export type ToolNameColor = keyof typeof Colors.tools;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export default Colors;
