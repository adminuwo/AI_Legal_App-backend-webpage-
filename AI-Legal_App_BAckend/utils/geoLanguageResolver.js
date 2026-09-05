/**
 * AI Legal Backend - State & Region Geolocation Language Resolver
 * Automatically resolves regional language for Indian states and injects it into user profiles for Google, Apple & Email signups.
 */

export const INDIAN_STATE_TO_LANGUAGE = {
  // 28 States of India
  'andhra pradesh': 'Telugu',
  'arunachal pradesh': 'Hindi',
  'assam': 'Assamese',
  'bihar': 'Hindi',
  'chhattisgarh': 'Hindi',
  'goa': 'Konkani',
  'gujarat': 'Gujarati',
  'haryana': 'Hindi',
  'himachal pradesh': 'Hindi',
  'jharkhand': 'Hindi',
  'karnataka': 'Kannada',
  'kerala': 'Malayalam',
  'madhya pradesh': 'Hindi',
  'maharashtra': 'Marathi',
  'manipur': 'Manipuri',
  'meghalaya': 'English',
  'mizoram': 'English',
  'nagaland': 'English',
  'odisha': 'Odia',
  'punjab': 'Punjabi',
  'rajasthan': 'Hindi',
  'sikkim': 'Nepali',
  'tamil nadu': 'Tamil',
  'telangana': 'Telugu',
  'tripura': 'Bengali',
  'uttar pradesh': 'Hindi',
  'uttarakhand': 'Hindi',
  'west bengal': 'Bengali',

  // 8 Union Territories of India
  'andaman & nicobar islands': 'Hindi',
  'chandigarh': 'Punjabi',
  'dadra & nagar haveli and daman & diu': 'Gujarati',
  'delhi': 'Hindi',
  'delhi (nct)': 'Hindi',
  'jammu and kashmir': 'Urdu',
  'ladakh': 'Urdu',
  'lakshadweep': 'Malayalam',
  'puducherry': 'Tamil'
};

export const resolveLanguageFromState = (stateOrCity) => {
  if (!stateOrCity || typeof stateOrCity !== 'string') return 'English';
  const clean = stateOrCity.toLowerCase().trim();

  for (const [key, lang] of Object.entries(INDIAN_STATE_TO_LANGUAGE)) {
    if (clean.includes(key) || key.includes(clean)) {
      return lang;
    }
  }
  return 'English';
};

/**
 * Resolves user language from IP, headers, or state param during Google/Apple/Email login
 */
export const detectLanguageFromRequest = (req, stateInput = '') => {
  if (stateInput) {
    return resolveLanguageFromState(stateInput);
  }

  // Check state from custom headers if passed by mobile client
  const headerState = req.headers['x-user-state'] || req.headers['x-state'];
  if (headerState) {
    return resolveLanguageFromState(headerState);
  }

  const headerLang = req.headers['x-app-language'] || req.headers['x-preferred-language'];
  if (headerLang && headerLang !== 'English' && headerLang !== 'Auto') {
    return headerLang;
  }

  return 'English';
};
