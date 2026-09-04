export interface LanguageConfig {
  id: string;
  name: string; // The display name in the selection list (e.g. हिन्दी (Hindi))
  englishName: string; // Stored language identifier (e.g. "Hindi" or "Bilingual")
  locale: string;
  supportsVoice: boolean;
  supportsOCR: boolean;
  supportsAI: boolean;
  supportsTranslation: boolean;
  isBilingual?: boolean;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    id: "en",
    name: "English",
    englishName: "English",
    locale: "en-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "hi",
    name: "हिन्दी (Hindi)",
    englishName: "Hindi",
    locale: "hi-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "bn",
    name: "বাংলা (Bengali)",
    englishName: "Bengali",
    locale: "bn-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "te",
    name: "తెలుగు (Telugu)",
    englishName: "Telugu",
    locale: "te-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "mr",
    name: "मराठी (Marathi)",
    englishName: "Marathi",
    locale: "mr-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "ta",
    name: "தமிழ் (Tamil)",
    englishName: "Tamil",
    locale: "ta-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "gu",
    name: "ગુજરાતી (Gujarati)",
    englishName: "Gujarati",
    locale: "gu-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "kn",
    name: "ಕನ್ನಡ (Kannada)",
    englishName: "Kannada",
    locale: "kn-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "ml",
    name: "മലയാളം (Malayalam)",
    englishName: "Malayalam",
    locale: "ml-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "pa",
    name: "ਪੰਜਾਬੀ (Punjabi)",
    englishName: "Punjabi",
    locale: "pa-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "or",
    name: "ଓଡ଼ିଆ (Odia)",
    englishName: "Odia",
    locale: "or-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "as",
    name: "অসমীয়া (Assamese)",
    englishName: "Assamese",
    locale: "as-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "ur",
    name: "اردو (Urdu)",
    englishName: "Urdu",
    locale: "ur-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "sa",
    name: "संस्कृत (Sanskrit)",
    englishName: "Sanskrit",
    locale: "sa-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "gom",
    name: "कोंकणी (Konkani)",
    englishName: "Konkani",
    locale: "gom-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "mai",
    name: "मैथिली (Maithili)",
    englishName: "Maithili",
    locale: "mai-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "doi",
    name: "डोगरी (Dogri)",
    englishName: "Dogri",
    locale: "doi-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "ne",
    name: "नेपाली (Nepali)",
    englishName: "Nepali",
    locale: "ne-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "brx",
    name: "बोडो (Bodo)",
    englishName: "Bodo",
    locale: "brx-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "sat",
    name: "संथाली (Santali)",
    englishName: "Santali",
    locale: "sat-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "mni",
    name: "मणिपुरी / Meitei",
    englishName: "Manipuri",
    locale: "mni-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "ks",
    name: "काश्मीरी (Kashmiri)",
    englishName: "Kashmiri",
    locale: "ks-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  },
  {
    id: "sd",
    name: "Sindhi",
    englishName: "Sindhi",
    locale: "sd-IN",
    supportsVoice: true,
    supportsOCR: true,
    supportsAI: true,
    supportsTranslation: true
  }
];

