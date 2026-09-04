/**
 * Safe Async Executor Utility
 */
export const runAsync = async (fn, ...args) => {
  try {
    const data = await fn(...args);
    return [null, data];
  } catch (err) {
    return [err, null];
  }
};

export default { runAsync };
