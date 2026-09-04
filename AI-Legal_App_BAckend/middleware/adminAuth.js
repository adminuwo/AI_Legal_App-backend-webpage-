import jwt from "jsonwebtoken";
import userModel from "../models/User.js";

/**
 * Middleware to verify admin access
 * Only allows ADMIN_EMAIL to access protected routes
 */
export const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Invalid token format" });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database
        const user = await userModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // Check if user is admin (email or role check)
        const PRIMARY_ADMIN_EMAIL = 'admin@uwo24.com';
        if (user.role === 'admin' || user.email === PRIMARY_ADMIN_EMAIL) {
            req.user = decoded;
            req.adminUser = user;
            next();
        } else {
            return res.status(403).json({ error: "Access denied. Admin only." });
        }
    } catch (error) {
        console.error(`[ADMIN AUTH ERROR] ${error.message}`);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};
