/**
 * String Sanitization & Formatting Utility
 */
export const slugify = (text = '') => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

export const sanitizeText = (text = '') => {
  return text.replace(/<[^>]*>?/gm, '').trim();
};

export default { slugify, sanitizeText };
