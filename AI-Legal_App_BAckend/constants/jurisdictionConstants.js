/**
 * Authoritative Jurisdiction & States Constants for AI LEGAL™ Backend
 */

export const INDIAN_STATES_LIST = [
  // 28 States of India
  { name: 'Andhra Pradesh', code: 'AP', language: 'Telugu', flag: '🏛️' },
  { name: 'Arunachal Pradesh', code: 'AR', language: 'Hindi', flag: '🏔️' },
  { name: 'Assam', code: 'AS', language: 'Assamese', flag: '🦏' },
  { name: 'Bihar', code: 'BR', language: 'Hindi', flag: '📜' },
  { name: 'Chhattisgarh', code: 'CG', language: 'Hindi', flag: '🌾' },
  { name: 'Goa', code: 'GA', language: 'Konkani', flag: '🏖️' },
  { name: 'Gujarat', code: 'GJ', language: 'Gujarati', flag: '🦁' },
  { name: 'Haryana', code: 'HR', language: 'Hindi', flag: '🌾' },
  { name: 'Himachal Pradesh', code: 'HP', language: 'Hindi', flag: '🏔️' },
  { name: 'Jharkhand', code: 'JH', language: 'Hindi', flag: '🌲' },
  { name: 'Karnataka', code: 'KA', language: 'Kannada', flag: '🏰' },
  { name: 'Kerala', code: 'KL', language: 'Malayalam', flag: '🌴' },
  { name: 'Madhya Pradesh', code: 'MP', language: 'Hindi', flag: '🐅' },
  { name: 'Maharashtra', code: 'MH', language: 'Marathi', flag: '🚩' },
  { name: 'Manipur', code: 'MN', language: 'Manipuri', flag: '🏞️' },
  { name: 'Meghalaya', code: 'ML', language: 'English', flag: '☁️' },
  { name: 'Mizoram', code: 'MZ', language: 'English', flag: '⛰️' },
  { name: 'Nagaland', code: 'NL', language: 'English', flag: '🌄' },
  { name: 'Odisha', code: 'OD', language: 'Odia', flag: '🛕' },
  { name: 'Punjab', code: 'PB', language: 'Punjabi', flag: '🌾' },
  { name: 'Rajasthan', code: 'RJ', language: 'Hindi', flag: '🏰' },
  { name: 'Sikkim', code: 'SK', language: 'Nepali', flag: '🏔️' },
  { name: 'Tamil Nadu', code: 'TN', language: 'Tamil', flag: '🛕' },
  { name: 'Telangana', code: 'TG', language: 'Telugu', flag: '🏛️' },
  { name: 'Tripura', code: 'TR', language: 'Bengali', flag: '🌿' },
  { name: 'Uttar Pradesh', code: 'UP', language: 'Hindi', flag: '⚖️' },
  { name: 'Uttarakhand', code: 'UK', language: 'Hindi', flag: '🏔️' },
  { name: 'West Bengal', code: 'WB', language: 'Bengali', flag: '🐯' },

  // 8 Union Territories of India
  { name: 'Andaman & Nicobar Islands', code: 'AN', language: 'Hindi', flag: '🏝️' },
  { name: 'Chandigarh', code: 'CH', language: 'Punjabi', flag: '🏛️' },
  { name: 'Dadra & Nagar Haveli and Daman & Diu', code: 'DN', language: 'Gujarati', flag: '🌊' },
  { name: 'Delhi (NCT)', code: 'DL', language: 'Hindi', flag: '🏛️' },
  { name: 'Jammu & Kashmir', code: 'JK', language: 'Urdu', flag: '❄️' },
  { name: 'Ladakh', code: 'LA', language: 'Urdu', flag: '🏔️' },
  { name: 'Lakshadweep', code: 'LD', language: 'Malayalam', flag: '🏝️' },
  { name: 'Puducherry', code: 'PY', language: 'Tamil', flag: '🏛️' },
];

export const NEPAL_PROVINCES = [
  { name: 'Bagmati', code: 'P3', language: 'Nepali', flag: '🇳🇵', capital: 'Hetauda' },
  { name: 'Koshi', code: 'P1', language: 'Nepali', flag: '🇳🇵', capital: 'Biratnagar' },
  { name: 'Madhesh', code: 'P2', language: 'Nepali', flag: '🇳🇵', capital: 'Janakpur' },
  { name: 'Gandaki', code: 'P4', language: 'Nepali', flag: '🇳🇵', capital: 'Pokhara' },
  { name: 'Lumbini', code: 'P5', language: 'Nepali', flag: '🇳🇵', capital: 'Deukhuri' },
  { name: 'Karnali', code: 'P6', language: 'Nepali', flag: '🇳🇵', capital: 'Birendranagar' },
  { name: 'Sudurpashchim', code: 'P7', language: 'Nepali', flag: '🇳🇵', capital: 'Godawari' }
];

export const STATES_BY_COUNTRY = {
  'IN': INDIAN_STATES_LIST,
  'INDIA': INDIAN_STATES_LIST,
  'NP': NEPAL_PROVINCES,
  'NEPAL': NEPAL_PROVINCES
};

export const getStatesForCountry = (countryOrCode = '') => {
  if (!countryOrCode) return [];
  const normalized = String(countryOrCode).trim().toUpperCase();
  return STATES_BY_COUNTRY[normalized] || [];
};
