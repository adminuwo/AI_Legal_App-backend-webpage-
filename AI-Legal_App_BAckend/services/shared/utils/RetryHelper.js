/**
 * Exponential Backoff Retry Helper
 */
export const withRetry = async (fn, retries = 3, delayMs = 1000) => {
  let lastError;
  for (let i = 1; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise(res => setTimeout(res, delayMs * Math.pow(2, i - 1)));
      }
    }
  }
  throw lastError;
};

export default { withRetry };
