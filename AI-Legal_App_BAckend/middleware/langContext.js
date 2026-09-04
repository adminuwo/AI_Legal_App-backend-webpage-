import { AsyncLocalStorage } from 'async_hooks';

export const langStorage = new AsyncLocalStorage();

const localeMapping = {
    'English': 'en-IN',
    'Hindi': 'hi-IN',
    'Bengali': 'bn-IN',
    'Telugu': 'te-IN',
    'Marathi': 'mr-IN',
    'Tamil': 'ta-IN',
    'Gujarati': 'gu-IN',
    'Kannada': 'kn-IN',
    'Malayalam': 'ml-IN',
    'Punjabi': 'pa-IN',
    'Odia': 'or-IN',
    'Assamese': 'as-IN',
    'Urdu': 'ur-IN',
    'Sanskrit': 'sa-IN',
    'Konkani': 'gom-IN',
    'Maithili': 'mai-IN',
    'Dogri': 'doi-IN',
    'Nepali': 'ne-IN',
    'Bodo': 'brx-IN',
    'Santali': 'sat-IN',
    'Manipuri': 'mni-IN',
    'Kashmiri': 'ks-IN',
    'Sindhi': 'sd-IN',
    // Bilingual Modes
    'Bilingual': 'hi-IN', // English + Hindi
    'English + Marathi': 'mr-IN',
    'English + Tamil': 'ta-IN',
    'English + Telugu': 'te-IN',
    'English + Bengali': 'bn-IN',
    'English + Gujarati': 'gu-IN',
    'English + Kannada': 'kn-IN',
    'English + Malayalam': 'ml-IN',
    'English + Punjabi': 'pa-IN'
};

export const getLocaleForLanguage = (language) => {
    if (!language) return 'en-IN';
    // Match case-insensitively
    const exactLang = Object.keys(localeMapping).find(
        key => key.toLowerCase() === language.toLowerCase()
    );
    return localeMapping[exactLang || language] || 'en-IN';
};

export const langMiddleware = (req, res, next) => {
    let userLang = req.body?.outputLanguage ||
                   req.body?.preferred_response_language || 
                   req.body?.language || 
                   req.headers['x-app-language'] || 
                   req.headers['x-app-language'.toLowerCase()] ||
                   req.query?.outputLanguage ||
                   req.query?.preferred_response_language || 
                   req.query?.language || 
                   req.user?.personalizations?.general?.language ||
                   'English';

    // Normalize case
    const exactLang = Object.keys(localeMapping).find(
        key => key.toLowerCase() === userLang.toLowerCase()
    );
    if (exactLang) {
        userLang = exactLang;
    }

    const locale = req.body?.locale || 
                   req.headers['x-app-locale'] || 
                   req.headers['x-app-locale'.toLowerCase()] ||
                   req.query?.locale || 
                   getLocaleForLanguage(userLang);

    langStorage.run({ language: userLang, locale }, () => {
        next();
    });
};
