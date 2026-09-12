import { resolveResponseLanguage } from '../utils/languageResolver.js';

const msg = `Who is founder of uwo?

[MANDATORY JURISDICTION: NEPAL]

Strictly advise under Nepal law, Muluki Civil/Criminal Codes 2074, Evidence Act 2031, Banking Offence Act 2064, Constitution of Nepal 2072, and NKP precedents. Zero Indian statutory leakage (no BNS/BNSS/BSA/IPC/CrPC). All currency in NPR.`;

console.log("With selectedLanguage = 'English':", resolveResponseLanguage({ currentMessage: msg, selectedLanguage: 'English' }));
console.log("With selectedLanguage = 'Marathi':", resolveResponseLanguage({ currentMessage: msg, selectedLanguage: 'Marathi' }));
console.log("With selectedLanguage = undefined:", resolveResponseLanguage({ currentMessage: msg }));
