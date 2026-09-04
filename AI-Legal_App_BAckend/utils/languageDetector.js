/**
 * Global Language & Script Detector
 */

const SCRIPTS = {
    'Arabic': /[\u0600-\u06FF]/,
    'Bengali': /[\u0980-\u09FF]/,
    'Hindi': /[\u0900-\u097F]/, // Devanagari
    'Cyrillic': /[\u0400-\u04FF]/,
    'Chinese': /[\u4E00-\u9FFF]/,
    'Japanese': /[\u3040-\u309F\u30A0-\u30FF]/,
    'Korean': /[\uAC00-\uD7AF]/,
    'Tamil': /[\u0B80-\u0BFF]/,
    'Telugu': /[\u0C00-\u0C7F]/,
    'Kannada': /[\u0C80-\u0CFF]/,
    'Malayalam': /[\u0D00-\u0D7F]/,
    'Gujarati': /[\u0A80-\u0AFF]/,
    'Punjabi': /[\u0A00-\u0A7F]/,
    'Thai': /[\u0E00-\u0E7F]/,
    'Hebrew': /[\u0590-\u05FF]/,
    'Greek': /[\u0370-\u03FF]/,
};

const HINGLISH_KEYWORDS = [
    'hai', 'nhi', 'nahi', 'kya', 'kaise', 'kab', 'kyun', 'kyon', 'mujhe', 'hame',
    'hum', 'apne', 'kar', 'karne', 'karo', 'raha', 'rahi', 'rahe', 'tha', 'thi',
    'the', 'aur', 'par', 'bhi', 'toh', 'yeh', 'woh', 'cahiye', 'chahie', 'hota',
    'sab', 'kuch', 'aisa', 'waisa', 'kaun', 'kisko', 'mein', 'liye', 'karna',
    'kare', 'karne', 'karte', 'karta', 'samajh', 'baat', 'bol', 'pata', 'bhool',
    'gaya', 'gayi', 'hoga', 'hogi', 'kiya', 'liye', 'sath', 'mere', 'tere',
    'zindagi', 'mehsoos', 'dimag', 'tension', 'pareshan', 'shanti', 'sukoon',
    'bhai', 'yaar', 'sahi', 'bilkul', 'theek', 'galat', 'baatao', 'dikkat', 'matlab'
];

export const detectLanguage = (text) => {
    if (!text || typeof text !== 'string') return 'English';

    // 1. Script-based check
    for (const [name, regex] of Object.entries(SCRIPTS)) {
        if (regex.test(text)) return name;
    }

    // 2. Romanized Hindi (Hinglish)
    const words = text.toLowerCase().replace(/[?.!,]/g, '').split(/\s+/).filter(w => w.length > 0);
    let score = 0;
    words.forEach(w => { if (HINGLISH_KEYWORDS.includes(w)) score++; });
    if (score >= Math.max(1, Math.min(2, Math.ceil(words.length * 0.15)))) return 'Hinglish';

    return 'English';
};
