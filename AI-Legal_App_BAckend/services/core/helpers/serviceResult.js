/**
 * Standardized Service Result Payload Wrapper
 */
export const successResult = (data = null, message = 'Success', code = 'OK') => {
  return {
    success: true,
    data,
    message,
    code
  };
};

export const failureResult = (error = 'Service operation failed', code = 'SERVICE_FAILURE', details = []) => {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message || 'Service operation failed',
    code,
    details
  };
};

export default {
  successResult,
  failureResult
};
