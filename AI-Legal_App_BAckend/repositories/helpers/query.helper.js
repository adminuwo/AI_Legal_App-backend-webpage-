/**
 * Query Helper Utilities for Repositories
 */

export const buildPagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || 10, 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildSort = (sortBy = 'createdAt', order = 'desc') => {
  const sortOrder = order === 'asc' || order === '1' ? 1 : -1;
  return { [sortBy]: sortOrder };
};

export const buildSearchFilter = (searchTerm, fields = []) => {
  if (!searchTerm || fields.length === 0) return {};
  
  const regex = new RegExp(searchTerm, 'i');
  return {
    $or: fields.map(field => ({ [field]: regex }))
  };
};

export const withTransaction = async (session, callback) => {
  session.startTransaction();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export default {
  buildPagination,
  buildSort,
  buildSearchFilter,
  withTransaction
};
