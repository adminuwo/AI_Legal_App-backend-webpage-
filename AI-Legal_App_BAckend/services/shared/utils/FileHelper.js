/**
 * File Buffer & MIME Verification Utility
 */
export const getFileExtension = (filename = '') => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
};

export const isValidMimeType = (mimeType = '', allowedTypes = []) => {
  return allowedTypes.includes(mimeType);
};

export default { getFileExtension, isValidMimeType };
