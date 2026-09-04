import { getInstrumentBySymbol } from './angelScripMaster.js';
import logger from './logger.js';

/**
 * Checks if a symbol corresponds to an Indian stock.
 * Validates by format suffix, predefined presets, or checking the Angel One scrip master.
 * @param {string} symbol - The stock symbol
 * @returns {Promise<boolean>} - True if it's an Indian stock, false otherwise
 */
export const isIndianStock = async (symbol) => {
    if (!symbol) return false;
    const upperSym = symbol.toUpperCase();

    // 1. Suffix checks
    if (upperSym.endsWith('.BSE') || upperSym.endsWith('.NSE') || upperSym.endsWith('.BO') || upperSym.endsWith('.NS')) {
        return true;
    }

    // 2. Predefined presets check (e.g., in ANGEL_TOKEN_MAP)
    const presets = ['TCS', 'RELIANCE', 'HDFCBANK', 'INFY', 'SBIN', 'ICICIBANK'];
    if (presets.includes(upperSym)) {
        return true;
    }

    // 3. Dynamic check against the Angel One scrip master
    try {
        const match = await getInstrumentBySymbol(symbol);
        if (match) {
            return true;
        }
    } catch (error) {
        logger.error(`[Validation] Error checking instrument for ${symbol}: ${error.message}`);
    }

    return false;
};
