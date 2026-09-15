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

export const ARMENIA_PROVINCES = [
  { name: 'Yerevan', code: 'ER', language: 'Armenian', flag: '🇦🇲', capital: 'Yerevan' },
  { name: 'Shirak', code: 'SH', language: 'Armenian', flag: '🇦🇲', capital: 'Gyumri' },
  { name: 'Lori', code: 'LO', language: 'Armenian', flag: '🇦🇲', capital: 'Vanadzor' },
  { name: 'Kotayk', code: 'KT', language: 'Armenian', flag: '🇦🇲', capital: 'Hrazdan' },
  { name: 'Ararat', code: 'AR', language: 'Armenian', flag: '🇦🇲', capital: 'Artashat' },
  { name: 'Armavir', code: 'AV', language: 'Armenian', flag: '🇦🇲', capital: 'Armavir' },
  { name: 'Gegharkunik', code: 'GR', language: 'Armenian', flag: '🇦🇲', capital: 'Gavar' },
  { name: 'Syunik', code: 'SU', language: 'Armenian', flag: '🇦🇲', capital: 'Kapan' },
  { name: 'Aragatsotn', code: 'AG', language: 'Armenian', flag: '🇦🇲', capital: 'Ashtarak' },
  { name: 'Tavush', code: 'TV', language: 'Armenian', flag: '🇦🇲', capital: 'Ijevan' },
  { name: 'Vayots Dzor', code: 'VD', language: 'Armenian', flag: '🇦🇲', capital: 'Yeghegnadzor' }
];

export const US_STATES = [
  { name: 'California', code: 'CA', flag: '🇺🇸' },
  { name: 'New York', code: 'NY', flag: '🇺🇸' },
  { name: 'Texas', code: 'TX', flag: '🇺🇸' },
  { name: 'Florida', code: 'FL', flag: '🇺🇸' },
  { name: 'Illinois', code: 'IL', flag: '🇺🇸' },
  { name: 'Pennsylvania', code: 'PA', flag: '🇺🇸' },
  { name: 'Ohio', code: 'OH', flag: '🇺🇸' },
  { name: 'Georgia', code: 'GA', flag: '🇺🇸' },
  { name: 'Washington', code: 'WA', flag: '🇺🇸' },
  { name: 'Massachusetts', code: 'MA', flag: '🇺🇸' },
  { name: 'New Jersey', code: 'NJ', flag: '🇺🇸' },
  { name: 'Virginia', code: 'VA', flag: '🇺🇸' }
];

export const UK_COUNTRIES = [
  { name: 'England & Wales', code: 'EW', flag: '🇬🇧' },
  { name: 'Scotland', code: 'SCT', flag: '🇬🇧' },
  { name: 'Northern Ireland', code: 'NIR', flag: '🇬🇧' }
];

export const CANADA_PROVINCES = [
  { name: 'Ontario', code: 'ON', flag: '🇨🇦' },
  { name: 'Quebec', code: 'QC', flag: '🇨🇦' },
  { name: 'British Columbia', code: 'BC', flag: '🇨🇦' },
  { name: 'Alberta', code: 'AB', flag: '🇨🇦' },
  { name: 'Manitoba', code: 'MB', flag: '🇨🇦' }
];

export const AUSTRALIA_STATES = [
  { name: 'New South Wales', code: 'NSW', flag: '🇦🇺' },
  { name: 'Victoria', code: 'VIC', flag: '🇦🇺' },
  { name: 'Queensland', code: 'QLD', flag: '🇦🇺' },
  { name: 'Western Australia', code: 'WA', flag: '🇦🇺' },
  { name: 'South Australia', code: 'SA', flag: '🇦🇺' }
];

export const UAE_EMIRATES = [
  { name: 'Dubai', code: 'DXB', flag: '🇦🇪' },
  { name: 'Abu Dhabi', code: 'AUH', flag: '🇦🇪' },
  { name: 'Sharjah', code: 'SHJ', flag: '🇦🇪' },
  { name: 'Ajman', code: 'AJM', flag: '🇦🇪' },
  { name: 'Ras Al Khaimah', code: 'RAK', flag: '🇦🇪' },
  { name: 'Fujairah', code: 'FUJ', flag: '🇦🇪' },
  { name: 'Umm Al Quwain', code: 'UAQ', flag: '🇦🇪' }
];

export const STATES_BY_COUNTRY = {
  'IN': INDIAN_STATES_LIST,
  'INDIA': INDIAN_STATES_LIST,
  'NP': NEPAL_PROVINCES,
  'NEPAL': NEPAL_PROVINCES,
  'AM': ARMENIA_PROVINCES,
  'ARMENIA': ARMENIA_PROVINCES,
  'US': US_STATES,
  'USA': US_STATES,
  'UNITED STATES': US_STATES,
  'GB': UK_COUNTRIES,
  'UK': UK_COUNTRIES,
  'UNITED KINGDOM': UK_COUNTRIES,
  'CA': CANADA_PROVINCES,
  'CANADA': CANADA_PROVINCES,
  'AU': AUSTRALIA_STATES,
  'AUSTRALIA': AUSTRALIA_STATES,
  'AE': UAE_EMIRATES,
  'UAE': UAE_EMIRATES,
  'UNITED ARAB EMIRATES': UAE_EMIRATES
};

export const getStatesForCountry = (countryOrCode = '') => {
  if (!countryOrCode) return [];
  const normalized = String(countryOrCode).trim().toUpperCase();
  return STATES_BY_COUNTRY[normalized] || [];
};
