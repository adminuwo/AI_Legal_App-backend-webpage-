/**
 * AI Legal - Geolocation & Country Auto-Detection Resolver
 * Resolves user country and jurisdiction from Cloudflare headers, client hints,
 * or device locales during Google, Apple, and Email signups.
 */

export const COUNTRY_CODE_MAP = {
  'US': { country: 'United States', countryCode: 'US', defaultState: 'California', language: 'English', currency: 'USD' },
  'USA': { country: 'United States', countryCode: 'US', defaultState: 'California', language: 'English', currency: 'USD' },
  'GB': { country: 'United Kingdom', countryCode: 'GB', defaultState: 'England & Wales', language: 'English', currency: 'GBP' },
  'UK': { country: 'United Kingdom', countryCode: 'GB', defaultState: 'England & Wales', language: 'English', currency: 'GBP' },
  'CA': { country: 'Canada', countryCode: 'CA', defaultState: 'Ontario', language: 'English', currency: 'CAD' },
  'CAN': { country: 'Canada', countryCode: 'CA', defaultState: 'Ontario', language: 'English', currency: 'CAD' },
  'IN': { country: 'India', countryCode: 'IN', defaultState: 'Delhi', language: 'English', currency: 'INR' },
  'IND': { country: 'India', countryCode: 'IN', defaultState: 'Delhi', language: 'English', currency: 'INR' },
  'NP': { country: 'Nepal', countryCode: 'NP', defaultState: 'Bagmati', language: 'Nepali', currency: 'NPR' },
  'NPL': { country: 'Nepal', countryCode: 'NP', defaultState: 'Bagmati', language: 'Nepali', currency: 'NPR' },
  'AE': { country: 'United Arab Emirates', countryCode: 'AE', defaultState: 'Dubai', language: 'English', currency: 'AED' },
  'ARE': { country: 'United Arab Emirates', countryCode: 'AE', defaultState: 'Dubai', language: 'English', currency: 'AED' },
  'AM': { country: 'Armenia', countryCode: 'AM', defaultState: 'Yerevan', language: 'Armenian', currency: 'AMD' },
  'ARM': { country: 'Armenia', countryCode: 'AM', defaultState: 'Yerevan', language: 'Armenian', currency: 'AMD' },
  'AU': { country: 'Australia', countryCode: 'AU', defaultState: 'New South Wales', language: 'English', currency: 'AUD' },
  'NZ': { country: 'New Zealand', countryCode: 'NZ', defaultState: 'Auckland', language: 'English', currency: 'NZD' },
  'SG': { country: 'Singapore', countryCode: 'SG', defaultState: 'Singapore', language: 'English', currency: 'SGD' },
  'LR': { country: 'Liberia', countryCode: 'LR', defaultState: 'Montserrado', language: 'English', currency: 'USD' },
  'GY': { country: 'Guyana', countryCode: 'GY', defaultState: 'Demerara-Mahaica', language: 'English', currency: 'GYD' },
};

/**
 * Resolves user country details from HTTP request headers and payload
 * @param {import('express').Request} req
 * @param {Object} [fallbackPayload={}]
 * @returns {{ country: string, countryCode: string, state: string, language: string, source: string }}
 */
export const resolveCountryFromRequest = (req, fallbackPayload = {}) => {
  // 1. Check explicit payload first
  const payloadCode = (fallbackPayload.countryCode || fallbackPayload.country_code || '').toUpperCase().trim();
  const payloadCountry = (fallbackPayload.country || '').trim();

  if (payloadCode && COUNTRY_CODE_MAP[payloadCode]) {
    const info = COUNTRY_CODE_MAP[payloadCode];
    return {
      country: info.country,
      countryCode: info.countryCode,
      state: fallbackPayload.state || info.defaultState,
      language: info.language,
      source: 'client_payload'
    };
  }

  if (payloadCountry) {
    const match = Object.values(COUNTRY_CODE_MAP).find(
      c => c.country.toLowerCase() === payloadCountry.toLowerCase()
    );
    if (match) {
      return {
        country: match.country,
        countryCode: match.countryCode,
        state: fallbackPayload.state || match.defaultState,
        language: match.language,
        source: 'client_payload'
      };
    }
  }

  // 2. Check Cloudflare Geo-IP header (Industry standard for proxies)
  const cfCountry = (req.headers['cf-ipcountry'] || '').toUpperCase().trim();
  if (cfCountry && cfCountry !== 'XX' && cfCountry !== 'T1' && COUNTRY_CODE_MAP[cfCountry]) {
    const info = COUNTRY_CODE_MAP[cfCountry];
    return {
      country: info.country,
      countryCode: info.countryCode,
      state: info.defaultState,
      language: info.language,
      source: 'cloudflare_geoip'
    };
  }

  // 3. Check custom client headers sent by mobile or web app
  const clientHeaderCode = (
    req.headers['x-country-code'] ||
    req.headers['x-client-country'] ||
    req.headers['x-user-country'] ||
    ''
  ).toUpperCase().trim();

  if (clientHeaderCode && COUNTRY_CODE_MAP[clientHeaderCode]) {
    const info = COUNTRY_CODE_MAP[clientHeaderCode];
    return {
      country: info.country,
      countryCode: info.countryCode,
      state: req.headers['x-user-state'] || info.defaultState,
      language: info.language,
      source: 'client_header'
    };
  }

  // 4. Check client timezone if passed via header or payload
  const tz = (req.headers['x-timezone'] || fallbackPayload.timezone || '').trim().toLowerCase();
  if (tz) {
    if (tz.includes('toronto') || tz.includes('vancouver') || tz.includes('montreal') || tz.includes('halifax') || tz.includes('edmonton')) {
      const info = COUNTRY_CODE_MAP['CA'];
      return { ...info, state: tz.includes('vancouver') ? 'British Columbia' : (tz.includes('montreal') ? 'Quebec' : 'Ontario'), source: 'client_timezone' };
    }
    if (tz.startsWith('america/') || tz.includes('new_york') || tz.includes('chicago') || tz.includes('denver') || tz.includes('los_angeles')) {
      const info = COUNTRY_CODE_MAP['US'];
      const state = tz.includes('los_angeles') ? 'California' : (tz.includes('new_york') ? 'New York' : info.defaultState);
      return { ...info, state, source: 'client_timezone' };
    }
    if (tz.includes('london') || tz.includes('europe/belfast')) {
      const info = COUNTRY_CODE_MAP['GB'];
      return { ...info, state: info.defaultState, source: 'client_timezone' };
    }
    if (tz.includes('kathmandu')) {
      const info = COUNTRY_CODE_MAP['NP'];
      return { ...info, state: info.defaultState, source: 'client_timezone' };
    }
    if (tz.includes('kolkata') || tz.includes('calcutta')) {
      const info = COUNTRY_CODE_MAP['IN'];
      return { ...info, state: info.defaultState, source: 'client_timezone' };
    }
    if (tz.includes('dubai')) {
      const info = COUNTRY_CODE_MAP['AE'];
      return { ...info, state: info.defaultState, source: 'client_timezone' };
    }
  }

  // 5. Fallback from phone dial code if provided
  const phone = (fallbackPayload.phone || '').trim();
  if (phone.startsWith('+1')) {
    // US or Canada
    const info = COUNTRY_CODE_MAP['US'];
    return { ...info, state: info.defaultState, source: 'phone_dial_code' };
  } else if (phone.startsWith('+44')) {
    const info = COUNTRY_CODE_MAP['GB'];
    return { ...info, state: info.defaultState, source: 'phone_dial_code' };
  } else if (phone.startsWith('+977')) {
    const info = COUNTRY_CODE_MAP['NP'];
    return { ...info, state: info.defaultState, source: 'phone_dial_code' };
  } else if (phone.startsWith('+971')) {
    const info = COUNTRY_CODE_MAP['AE'];
    return { ...info, state: info.defaultState, source: 'phone_dial_code' };
  }

  // 6. Default Fallback -> India (IN)
  const defaultInfo = COUNTRY_CODE_MAP['IN'];
  return {
    country: defaultInfo.country,
    countryCode: defaultInfo.countryCode,
    state: fallbackPayload.state || defaultInfo.defaultState,
    language: defaultInfo.language,
    source: 'default_fallback'
  };
};

export default {
  COUNTRY_CODE_MAP,
  resolveCountryFromRequest
};
