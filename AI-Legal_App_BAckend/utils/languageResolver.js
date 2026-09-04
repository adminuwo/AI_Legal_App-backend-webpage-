/**
 * CENTRALIZED MULTILINGUAL & AUTO LANGUAGE RESOLVER
 * Universal Multilingual Response Engine for AI Legal™
 * 
 * Supports ALL major Indian languages:
 * English, Hindi, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Bengali,
 * Odia, Assamese, Urdu, Sanskrit, Konkani, Manipuri, Dogri, Bodo, Maithili, Santali,
 * Kashmiri, Nepali, Sindhi, Hinglish, Bilingual.
 */

const SCRIPTS = {
  'Hindi_Devanagari': /[\u0900-\u097F]/,
  'Bengali': /[\u0980-\u09FF]/,
  'Tamil': /[\u0B80-\u0BFF]/,
  'Telugu': /[\u0C00-\u0C7F]/,
  'Kannada': /[\u0C80-\u0CFF]/,
  'Malayalam': /[\u0D00-\u0D7F]/,
  'Gujarati': /[\u0A80-\u0AFF]/,
  'Punjabi': /[\u0A00-\u0A7F]/,
  'Odia': /[\u0B00-\u0B7F]/,
  'Assamese': /[\u0980-\u09FF]/,
  'Urdu': /[\u0600-\u06FF]/,
  'Manipuri': /[\uABC0-\uABFF]/,
  'Santali': /[\u1C50-\u1C7F]/
};

const MARATHI_DEVANAGARI_KEYWORDS = [
  'आहे', 'मला', 'माहिती', 'सांगा', 'समजावून', 'पाहिजे', 'नाही', 'केसची', 'माझ्या', 'मराठीत', 'मराठी', 'झाले', 'कसे', 'म्हातारपण', 'करा', 'काय'
];

const SANSKRIT_DEVANAGARI_KEYWORDS = [
  'अस्ति', 'भवतः', 'करोतु', 'संसार', 'संस्कृतम्', 'संस्कृतेन', 'उत्तरं', 'ददातु', 'वदतु', 'संस्कृत'
];

const HINGLISH_KEYWORDS = [
  'hai', 'nhi', 'nahi', 'kya', 'kaise', 'kab', 'kyun', 'kyon', 'mujhe', 'hame',
  'hum', 'apne', 'kar', 'karne', 'karo', 'raha', 'rahi', 'rahe', 'tha', 'thi',
  'aur', 'par', 'bhi', 'toh', 'yeh', 'woh', 'cahiye', 'chahie', 'chahiye',
  'hota', 'hoti', 'hote', 'sab', 'kuch', 'aisa', 'waisa', 'kaun', 'kisko', 'mein',
  'liye', 'karna', 'kare', 'karne', 'karte', 'karta', 'samajh', 'samjhao', 'baat',
  'batao', 'dikkat', 'matlab', 'mera', 'meri', 'mere', 'aaj', 'kal', 'parson',
  'bata', 'bataiye', 'dena', 'do', 'le', 'liya', 'diya', 'hoga', 'hogi', 'hogaye'
];

const DISTINCT_HINGLISH_MARKERS = [
  'hai', 'nhi', 'nahi', 'kya', 'kaise', 'kyun', 'kyon', 'mujhe', 'samjhao', 'batao',
  'chahiye', 'chahie', 'hoga', 'hogi', 'karna', 'kare', 'karne', 'karte', 'karta',
  'bataiye', 'dikkat', 'matlab', 'kisko', 'kaun', 'waisa', 'aisa'
];

const ALL_SUPPORTED_LANGUAGES_MAP = {
  english: { language: 'English', style: 'Standard', script: 'Latin' },
  hindi: { language: 'Hindi', style: 'Standard', script: 'Devanagari' },
  marathi: { language: 'Marathi', style: 'Standard', script: 'Devanagari' },
  sanskrit: { language: 'Sanskrit', style: 'Standard', script: 'Devanagari' },
  gujarati: { language: 'Gujarati', style: 'Standard', script: 'Gujarati' },
  punjabi: { language: 'Punjabi', style: 'Standard', script: 'Gurmukhi' },
  tamil: { language: 'Tamil', style: 'Standard', script: 'Tamil' },
  telugu: { language: 'Telugu', style: 'Standard', script: 'Telugu' },
  kannada: { language: 'Kannada', style: 'Standard', script: 'Kannada' },
  malayalam: { language: 'Malayalam', style: 'Standard', script: 'Malayalam' },
  bengali: { language: 'Bengali', style: 'Standard', script: 'Bengali' },
  bangla: { language: 'Bengali', style: 'Standard', script: 'Bengali' },
  odia: { language: 'Odia', style: 'Standard', script: 'Odia' },
  oriya: { language: 'Odia', style: 'Standard', script: 'Odia' },
  assamese: { language: 'Assamese', style: 'Standard', script: 'Bengali' },
  urdu: { language: 'Urdu', style: 'Standard', script: 'Urdu' },
  konkani: { language: 'Konkani', style: 'Standard', script: 'Devanagari' },
  manipuri: { language: 'Manipuri', style: 'Standard', script: 'Manipuri' },
  meitei: { language: 'Manipuri', style: 'Standard', script: 'Manipuri' },
  dogri: { language: 'Dogri', style: 'Standard', script: 'Devanagari' },
  bodo: { language: 'Bodo', style: 'Standard', script: 'Devanagari' },
  maithili: { language: 'Maithili', style: 'Standard', script: 'Devanagari' },
  santali: { language: 'Santali', style: 'Standard', script: 'Santali' },
  kashmiri: { language: 'Kashmiri', style: 'Standard', script: 'Urdu' },
  nepali: { language: 'Nepali', style: 'Standard', script: 'Devanagari' },
  sindhi: { language: 'Sindhi', style: 'Standard', script: 'Urdu' },
  hinglish: { language: 'Hindi', style: 'Hinglish', script: 'Latin' },
  bilingual: { language: 'Bilingual (English + Hindi)', style: 'Bilingual', script: 'Latin+Devanagari' }
};

/**
 * Explicit in-message language request detector (Priority 1)
 */
function detectExplicitInMessageLanguage(message) {
  if (!message || typeof message !== 'string') return null;
  const text = message.toLowerCase().trim();

  // Native script explicit triggers
  if (text.includes('संस्कृत') || text.includes('संस्कृतम्') || text.includes('संस्कृतेन')) {
    return { language: 'Sanskrit', style: 'Standard', script: 'Devanagari', source: 'explicit_message_request' };
  }
  if (text.includes('मराठी') || text.includes('मराठीत') || text.includes('मराठी मध्ये')) {
    return { language: 'Marathi', style: 'Standard', script: 'Devanagari', source: 'explicit_message_request' };
  }
  if (text.includes('हिंदी') || text.includes('हिन्दी')) {
    return { language: 'Hindi', style: 'Standard', script: 'Devanagari', source: 'explicit_message_request' };
  }
  if (text.includes('ಕನ್ನಡ') || text.includes('ಕನ್ನಡದಲ್ಲಿ')) {
    return { language: 'Kannada', style: 'Standard', script: 'Kannada', source: 'explicit_message_request' };
  }
  if (text.includes('தமிழ்') || text.includes('தமிழில்')) {
    return { language: 'Tamil', style: 'Standard', script: 'Tamil', source: 'explicit_message_request' };
  }
  if (text.includes('ગુજરાતી') || text.includes('ગુજરાતીમાં')) {
    return { language: 'Gujarati', style: 'Standard', script: 'Gujarati', source: 'explicit_message_request' };
  }
  if (text.includes('বাংলা') || text.includes('বাংলায়')) {
    return { language: 'Bengali', style: 'Standard', script: 'Bengali', source: 'explicit_message_request' };
  }
  if (text.includes('ਪੰਜਾਬੀ') || text.includes('ਪੰਜਾਬੀ ਵਿੱਚ')) {
    return { language: 'Punjabi', style: 'Standard', script: 'Gurmukhi', source: 'explicit_message_request' };
  }
  if (text.includes('తెలుగు') || text.includes('తెలుగులో')) {
    return { language: 'Telugu', style: 'Standard', script: 'Telugu', source: 'explicit_message_request' };
  }
  if (text.includes('മലയാളം') || text.includes('മലയാളത്തിൽ')) {
    return { language: 'Malayalam', style: 'Standard', script: 'Malayalam', source: 'explicit_message_request' };
  }
  if (text.includes('اردو') || text.includes('اردو میں')) {
    return { language: 'Urdu', style: 'Standard', script: 'Urdu', source: 'explicit_message_request' };
  }
  if (text.includes('ଓଡ଼ିଆ') || text.includes('ଓଡ଼ିଆରେ')) {
    return { language: 'Odia', style: 'Standard', script: 'Odia', source: 'explicit_message_request' };
  }

  // Hinglish / Roman Hindi explicit check
  if (/\b(hinglish|roman hindi)\b/i.test(text) || /\b(hinglish me|hinglish mein|roman hindi me)\b/i.test(text)) {
    return { language: 'Hindi', style: 'Hinglish', script: 'Latin', source: 'explicit_message_request' };
  }

  // Explicit Hindi / English check
  if (/\b(explain in hindi|hindi me|hindi mein|hindi please|in hindi|hindi language|hindi me samjhao|hindi mein samjhao|hindi me batao)\b/i.test(text)) {
    return { language: 'Hindi', style: 'Standard', script: 'Devanagari', source: 'explicit_message_request' };
  }
  if (/\b(explain in english|in english|english please|english language)\b/i.test(text)) {
    return { language: 'English', style: 'Standard', script: 'Latin', source: 'explicit_message_request' };
  }

  // Check language suffix/prefix patterns e.g., "in marathi", "marathi me", "marathi madhe", "explain in sanskrit", "tell in tamil", "kannada dalli heli"
  const targetPatternMatches = [
    /\b(?:explain|translate|write|speak|reply|answer|give|continue|batao|samjhao|smjhao|bataiye)\s+(?:in|into|to|with)?\s*(?:everything|this|all)?\s*([a-z]+)\b/i,
    /\b([a-z]+)\s+(?:me|mein|madhe|lo|dalli|ma|vich|te|il|re)\s*(?:samjhao|smjhao|batao|bataiye|do|kar|karo|tell|explain|say|speak|jawab)?\b/i
  ];

  for (const pattern of targetPatternMatches) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidateKey = match[1].toLowerCase();
      if (ALL_SUPPORTED_LANGUAGES_MAP[candidateKey]) {
        const info = ALL_SUPPORTED_LANGUAGES_MAP[candidateKey];
        return {
          language: info.language,
          style: info.style,
          script: info.script,
          source: 'explicit_message_request'
        };
      }
    }
  }

  // Direct keyword occurrences
  for (const [key, info] of Object.entries(ALL_SUPPORTED_LANGUAGES_MAP)) {
    if (key === 'english' || key === 'hindi') continue; // Handled specially to avoid false positive on words like "in"
    const regex = new RegExp(`\\b(in|into|explain in|speak in|translate into|give in|${key} me|${key} mein|${key} madhe|${key} lo|${key} dalli|${key} ma|${key} vich|${key} te|${key} il|${key} re)\\s+${key}\\b|\\b${key}\\s+(me|mein|madhe|lo|dalli|ma|vich|te|il|re|smjhao|samjhao)\\b`, 'i');
    if (regex.test(text)) {
      return {
        language: info.language,
        style: info.style,
        script: info.script,
        source: 'explicit_message_request'
      };
    }
  }

  // General "in english" / "english me" check
  if (/\b(in english|english me|english mein|explain in english|give in english|english text|in english please|key points in english)\b/i.test(text)) {
    return { language: 'English', style: 'Standard', script: 'Latin', source: 'explicit_message_request' };
  }

  return null;
}

/**
 * Detect language & style from raw message text (Priority 3)
 */
function detectMessageLanguageAndStyle(message) {
  if (!message || typeof message !== 'string') {
    return { language: 'English', style: 'Standard', script: 'Latin', source: 'default_fallback' };
  }

  // 1. Devanagari script check (Hindi vs Marathi vs Sanskrit)
  if (SCRIPTS.Hindi_Devanagari.test(message)) {
    const isSanskrit = SANSKRIT_DEVANAGARI_KEYWORDS.some(kw => message.includes(kw));
    if (isSanskrit) {
      return { language: 'Sanskrit', style: 'Standard', script: 'Devanagari', source: 'detected_script' };
    }
    const isMarathi = MARATHI_DEVANAGARI_KEYWORDS.some(kw => message.includes(kw));
    if (isMarathi) {
      return { language: 'Marathi', style: 'Standard', script: 'Devanagari', source: 'detected_script' };
    }
    return { language: 'Hindi', style: 'Standard', script: 'Devanagari', source: 'detected_script' };
  }

  // 2. Check other native scripts
  for (const [scriptName, regex] of Object.entries(SCRIPTS)) {
    if (scriptName !== 'Hindi_Devanagari' && regex.test(message)) {
      const langName = scriptName === 'Punjabi' ? 'Punjabi' : scriptName;
      return { language: langName, style: 'Standard', script: scriptName, source: 'detected_script' };
    }
  }

  // 3. Latin script check: Hinglish vs English
  const words = message.toLowerCase().replace(/[?.!,:;()]/g, '').split(/\s+/).filter(w => w.length > 0);
  let hinglishScore = 0;
  let hasDistinctMarker = false;
  words.forEach(w => {
    if (HINGLISH_KEYWORDS.includes(w)) hinglishScore++;
    if (DISTINCT_HINGLISH_MARKERS.includes(w)) hasDistinctMarker = true;
  });

  const threshold = Math.max(2, Math.ceil(words.length * 0.18));
  if (hasDistinctMarker || hinglishScore >= threshold) {
    return { language: 'Hindi', style: 'Hinglish', script: 'Latin', source: 'detected_hinglish' };
  }

  return { language: 'English', style: 'Standard', script: 'Latin', source: 'detected_english' };
}

/**
 * MASTER LANGUAGE RESOLVER
 * Enforces Priority 1 -> Priority 2 -> Priority 3
 */
export function resolveResponseLanguage({
  currentMessage = '',
  explicitRequestedLanguage = '',
  selectedLanguage = '',
  conversationContext = null,
  appLocale = ''
} = {}) {

  // Priority 1: Explicit user instruction inside the message query (e.g. "Explain in Marathi", "Marathi me smjhao", "उत्तर संस्कृत में दो")
  const explicitInMessage = detectExplicitInMessageLanguage(currentMessage);
  if (explicitInMessage) {
    return {
      ...explicitInMessage,
      systemInstruction: buildSystemLanguageInstruction(explicitInMessage)
    };
  }

  // Priority 2: Selected Output Language inside AI Legal™ settings or module
  const normalizedAppLang = String(explicitRequestedLanguage || selectedLanguage || '').trim();
  if (normalizedAppLang && normalizedAppLang !== 'Auto' && normalizedAppLang !== 'UI_ONLY') {
    if (normalizedAppLang === 'Bilingual' || normalizedAppLang.includes('English + Hindi')) {
      const res = { language: 'Bilingual (English + Hindi)', style: 'Bilingual', script: 'Latin+Devanagari', source: 'app_setting_bilingual' };
      return { ...res, systemInstruction: buildSystemLanguageInstruction(res) };
    }
    if (normalizedAppLang === 'Hinglish') {
      const res = { language: 'Hindi', style: 'Hinglish', script: 'Latin', source: 'app_setting_hinglish' };
      return { ...res, systemInstruction: buildSystemLanguageInstruction(res) };
    }
    const matchedKey = Object.keys(ALL_SUPPORTED_LANGUAGES_MAP).find(k => k.toLowerCase() === normalizedAppLang.toLowerCase());
    if (matchedKey) {
      const info = ALL_SUPPORTED_LANGUAGES_MAP[matchedKey];
      const res = { language: info.language, style: info.style, script: info.script, source: 'app_setting_language' };
      return { ...res, systemInstruction: buildSystemLanguageInstruction(res) };
    }
  }

  // Priority 3: Automatic per-message detection (Message input language, script & style)
  const detected = detectMessageLanguageAndStyle(currentMessage);
  return {
    ...detected,
    systemInstruction: buildSystemLanguageInstruction(detected)
  };
}

/**
 * BUILD SYSTEM LANGUAGE INSTRUCTION
 * Injected into LLM system prompt across all AI Legal™ modules
 */
export function buildSystemLanguageInstruction(resolved) {
  const { language, style, script, source } = resolved;

  let instruction = `\n=== UNIVERSAL MULTILINGUAL RESPONSE SYSTEM ===\n`;
  instruction += `Target Response Language: ${language}\n`;
  instruction += `Target Communication Style: ${style}\n`;
  instruction += `Target Script: ${script}\n`;
  instruction += `Resolution Source: ${source}\n\n`;

  instruction += `SYSTEM RULES FOR LANGUAGE RESPONSE:\n`;

  if (style === 'Hinglish') {
    instruction += `- GENERATE RESPONSE IN NATURAL HINGLISH (Romanized Hindi script mixed naturally with English).\n`;
    instruction += `- Example tone: "Aapki next hearing 28 July ko hai. Is case me aapko yeh evidence prepare karna chahiye..."\n`;
    instruction += `- DO NOT translate the entire response into formal Devanagari Hindi or plain English.\n`;
  } else if (language === 'Marathi') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in MARATHI (Devanagari script).\n`;
  } else if (language === 'Sanskrit') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in SANSKRIT (Devanagari script).\n`;
  } else if (language === 'Tamil') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in TAMIL script.\n`;
  } else if (language === 'Telugu') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in TELUGU script.\n`;
  } else if (language === 'Kannada') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in KANNADA script.\n`;
  } else if (language === 'Gujarati') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in GUJARATI script.\n`;
  } else if (language === 'Bengali') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in BENGALI script.\n`;
  } else if (language === 'Punjabi') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in GURMUKHI (PUNJABI) script.\n`;
  } else if (language === 'Hindi' && style === 'Standard') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in HINDI (Devanagari script).\n`;
  } else if (style === 'Bilingual') {
    instruction += `- GENERATE RESPONSE IN BILINGUAL FORMAT (English headings/structure followed by Hindi explanations).\n`;
  } else if (language !== 'English') {
    instruction += `- CRITICAL MULTILINGUAL MANDATE: You MUST generate 100% of your response in ${language.toUpperCase()} in its native script.\n`;
    instruction += `- Do NOT respond in English or Hindi. Translate all headings, explanations, reasons, probabilities, vulnerabilities, and legal reports into ${language}.\n`;
  } else {
    instruction += `- GENERATE RESPONSE IN CLEAR PROFESSIONAL ENGLISH.\n`;
  }

  instruction += `- ABSOLUTE PROHIBITION ON REFUSAL MESSAGES: NEVER output language restriction or refusal phrases (such as limiting responses to English or Hindi, or declaring inability to explain in ${language}). Fully fulfill the prompt directly in ${language}.\n`;

  instruction += `- CRITICAL LEGAL TERM PRESERVATION RULE: NEVER translate statutory references, Section numbers, Act names (e.g. "Section 420 IPC", "Section 138 NI Act", "BNS", "BNSS", "BSA", "Indian Evidence Act"), Case names, Court names, and standard legal terms (e.g., FIR, bail, hearing, petition, notice, evidence, contract, draft, precedent) into unnatural literal words. Keep them in their standard readable form.\n`;

  return instruction;
}

export default {
  resolveResponseLanguage,
  buildSystemLanguageInstruction
};

