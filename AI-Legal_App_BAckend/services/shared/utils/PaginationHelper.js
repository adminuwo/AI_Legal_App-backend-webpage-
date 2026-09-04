/**
 * Pagination Calculation Utility
 */
export const calculatePagination = (page = 1, limit = 10, totalItems = 0) => {
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const totalPages = Math.ceil(totalItems / l);

  return {
    page: p,
    limit: l,
    skip: (p - 1) * l,
    totalItems,
    totalPages,
    hasNextPage: p < totalPages,
    hasPrevPage: p > 1
  };
};

export default { calculatePagination };
