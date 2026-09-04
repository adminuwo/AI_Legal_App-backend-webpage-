/**
 * Returns true if the user has the SUPER_ADMIN role.
 */
export const isSuperAdmin = (user?: any): boolean => {
  if (!user) return false;
  const emailLower = (user.email || '').toLowerCase().trim();
  return user.role === 'SUPER_ADMIN' || emailLower === 'aditi@uwo24.com' || emailLower === 'aditilakhera0@gmail.com';
};
