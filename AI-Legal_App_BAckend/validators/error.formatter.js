/**
 * Standardized Enterprise Validation Error Formatter
 * Generates uniform JSON error responses across all API endpoints.
 */
export const formatValidationError = (code = 'VALIDATION_ERROR', message = 'Request payload validation failed', details = []) => {
  return {
    success: false,
    error: {
      code,
      message,
      details: Array.isArray(details) ? details : [details]
    }
  };
};

export default formatValidationError;
