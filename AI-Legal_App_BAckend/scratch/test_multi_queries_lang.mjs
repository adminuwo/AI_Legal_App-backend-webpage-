import { resolveResponseLanguage } from '../utils/languageResolver.js';

const queries = [
    "Who is founder of uwo?",
    "uwo ke founder kaun hai",
    "batao uwo kya karta hai",
    "UWO के संस्थापक कौन हैं?",
    "what does uwo deck say",
    "is bare me detail me batao",
    "tell me in hindi"
];

for (const q of queries) {
    const res = resolveResponseLanguage({ currentMessage: q, selectedLanguage: 'English' });
    console.log(`Query: "${q}" => Lang: ${res.language}, Style: ${res.style}, Source: ${res.source}`);
}
