/**
 * ISO Date Parsing & Formatting Utility
 */
export const formatDateISO = (date = new Date()) => {
  return new Date(date).toISOString();
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export default { formatDateISO, addDays };
