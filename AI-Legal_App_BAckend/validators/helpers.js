/**
 * Reusable Field Validation Helpers
 */

export const isString = (value) => typeof value === 'string' && value.trim().length > 0;

export const isEmail = (value) => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
};

export const isPhone = (value) => {
  if (!value) return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(String(value).replace(/[\s-()]/g, ''));
};

export const isUuid = (value) => {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value.trim());
};

export const isMongoId = (value) => {
  if (!isString(value)) return false;
  const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
  return mongoIdRegex.test(value.trim());
};

export const isDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

export const isUrl = (value) => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch (_) {
    return false;
  }
};

export const isFile = (fileObject) => {
  return fileObject && (fileObject.fieldname || fileObject.originalname || fileObject.buffer);
};

export default {
  isString,
  isEmail,
  isPhone,
  isUuid,
  isMongoId,
  isDate,
  isUrl,
  isFile
};
