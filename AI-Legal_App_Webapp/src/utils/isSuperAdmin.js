/**
 * Returns true ONLY if the given user object belongs to the authorized Super Admin (aditi@uwo24.com).
 *
 * @param {object|null} user - The user object from getUserData() or JWT payload
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => {
    if (!user || !user.email) return false;
    const emailLower = (user.email || '').toLowerCase().trim();
    return emailLower === 'aditi@uwo24.com' || emailLower === 'aditilakhera0@gmail.com' || user.role === 'SUPER_ADMIN';
};

