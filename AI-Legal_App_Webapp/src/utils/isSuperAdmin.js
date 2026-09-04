/**
 * Returns true if the given user object has the SUPER_ADMIN role.
 * Use this instead of hardcoded email checks throughout the web app.
 * Future Super Admins automatically receive access by having role = 'SUPER_ADMIN'.
 *
 * @param {object|null} user - The user object from getUserData() or JWT payload
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => {
    if (!user) return false;
    return user.role === 'SUPER_ADMIN';
};
