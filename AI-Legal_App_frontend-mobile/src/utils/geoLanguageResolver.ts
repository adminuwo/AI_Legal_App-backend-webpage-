/**
 * AI Legal Mobile - State to Regional Language Resolver
 * Automatically maps Indian states & union territories to their primary official languages.
 */

export const INDIAN_STATE_LANGUAGE_MAP: Record<string, { language: string; locale: string }> = {
  // 28 States of India
  'andhra pradesh': { language: 'Telugu', locale: 'te-IN' },
  'arunachal pradesh': { language: 'Hindi', locale: 'hi-IN' },
  'assam': { language: 'Assamese', locale: 'as-IN' },
  'bihar': { language: 'Hindi', locale: 'hi-IN' },
  'chhattisgarh': { language: 'Hindi', locale: 'hi-IN' },
  'goa': { language: 'Konkani', locale: 'gom-IN' },
  'gujarat': { language: 'Gujarati', locale: 'gu-IN' },
  'haryana': { language: 'Hindi', locale: 'hi-IN' },
  'himachal pradesh': { language: 'Hindi', locale: 'hi-IN' },
  'jharkhand': { language: 'Hindi', locale: 'hi-IN' },
  'karnataka': { language: 'Kannada', locale: 'kn-IN' },
  'kerala': { language: 'Malayalam', locale: 'ml-IN' },
  'madhya pradesh': { language: 'Hindi', locale: 'hi-IN' },
  'maharashtra': { language: 'Marathi', locale: 'mr-IN' },
  'manipur': { language: 'Manipuri', locale: 'mni-IN' },
  'meghalaya': { language: 'English', locale: 'en-IN' },
  'mizoram': { language: 'English', locale: 'en-IN' },
  'nagaland': { language: 'English', locale: 'en-IN' },
  'odisha': { language: 'Odia', locale: 'or-IN' },
  'punjab': { language: 'Punjabi', locale: 'pa-IN' },
  'rajasthan': { language: 'Hindi', locale: 'hi-IN' },
  'sikkim': { language: 'Nepali', locale: 'ne-IN' },
  'tamil nadu': { language: 'Tamil', locale: 'ta-IN' },
  'telangana': { language: 'Telugu', locale: 'te-IN' },
  'tripura': { language: 'Bengali', locale: 'bn-IN' },
  'uttar pradesh': { language: 'Hindi', locale: 'hi-IN' },
  'uttarakhand': { language: 'Hindi', locale: 'hi-IN' },
  'west bengal': { language: 'Bengali', locale: 'bn-IN' },

  // 8 Union Territories of India
  'andaman & nicobar islands': { language: 'Hindi', locale: 'hi-IN' },
  'chandigarh': { language: 'Punjabi', locale: 'pa-IN' },
  'dadra & nagar haveli and daman & diu': { language: 'Gujarati', locale: 'gu-IN' },
  'delhi': { language: 'Hindi', locale: 'hi-IN' },
  'delhi (nct)': { language: 'Hindi', locale: 'hi-IN' },
  'jammu and kashmir': { language: 'Urdu', locale: 'ur-IN' },
  'ladakh': { language: 'Urdu', locale: 'ur-IN' },
  'lakshadweep': { language: 'Malayalam', locale: 'ml-IN' },
  'puducherry': { language: 'Tamil', locale: 'ta-IN' },
};

/**
 * Resolves regional language based on state name string
 */
export const getLanguageForState = (stateName: string): { language: string; locale: string } => {
  if (!stateName) return { language: 'English', locale: 'en-IN' };
  const cleanState = stateName.toLowerCase().trim();
  
  if (INDIAN_STATE_LANGUAGE_MAP[cleanState]) {
    return INDIAN_STATE_LANGUAGE_MAP[cleanState];
  }

  // Partial match search
  for (const [state, info] of Object.entries(INDIAN_STATE_LANGUAGE_MAP)) {
    if (cleanState.includes(state) || state.includes(cleanState)) {
      return info;
    }
  }

  return { language: 'English', locale: 'en-IN' };
};
