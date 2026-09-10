/**
 * Returns true if the user has the SUPER_ADMIN role in the database.
 *
 * @param {object|null} user - The user object from getUserData() or JWT payload
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => {
    if (!user) return false;
    return user.role === 'SUPER_ADMIN';
};

/**
 * Returns true if the user has admin or SUPER_ADMIN role in the database.
 *
 * @param {object|null} user
 * @returns {boolean}
 */
export const isAdmin = (user) => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'SUPER_ADMIN';
};

