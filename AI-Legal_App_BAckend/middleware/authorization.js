import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import mongoose from "mongoose";

export const verifyToken = async (req, res, next) => {
    let token = null;
    
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // --- Session Validation & Revocation Gate ---
        if (mongoose.connection.readyState === 1 && decoded.id && !decoded.id.toString().startsWith('demo-')) {
            const activeSession = await Session.findOne({ 
                userId: decoded.id, 
                token, 
                isActive: true 
            });

            if (!activeSession) {
                return res.status(401).json({ 
                    success: false,
                    code: "SESSION_REVOKED", 
                    error: "Your session was signed out because the account was logged in from another device." 
                });
            }

            // Throttled update of lastActive timestamp
            const now = Date.now();
            if (!activeSession.lastActive || now - new Date(activeSession.lastActive).getTime() > 60000) {
                Session.updateOne({ _id: activeSession._id }, { $set: { lastActive: now } }).catch(() => {});
            }
            req.sessionId = activeSession._id.toString();
        }

        req.user = decoded;
        req.workspaceId = req.headers['x-active-workspace-id'] || 'personal_practice';
        next();
    } catch (error) {
        console.error(`[AUTH ERROR] JWT Verification Failed: ${error.message}`);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

export const optionalVerifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = null;
        req.workspaceId = 'personal_practice';
        return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === 'undefined' || token === 'null') {
        req.user = null;
        req.workspaceId = 'personal_practice';
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.workspaceId = req.headers['x-active-workspace-id'] || 'personal_practice';
    } catch (error) {
        req.user = null;
        req.workspaceId = 'personal_practice';
    }
    next();
};

export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'admin') {
            return next();
        }

        const User = (await import('../models/User.js')).default;
        const user = await User.findById(req.user.id);

        if (user && (user.role === 'SUPER_ADMIN' || user.role === 'admin')) {
            req.user.role = user.role;
            return next();
        }

        return res.status(403).json({ error: "Forbidden: Admin privileges required" });
    } catch (err) {
        console.error("isAdmin middleware error:", err);
        return res.status(500).json({ error: "Internal server error during authorization check" });
    }
};

/**
 * Mandatory Centralized Tenant Isolation & IDOR Authorization Gate
 * Verifies that the authenticated user is the owner, creator, assigned member,
 * or workspace participant of the given project/case object.
 */
export const authorizeCaseAccess = (user, project, capability = 'read') => {
    if (!user || (!user.id && !user._id)) {
        return false;
    }
    if (!project) {
        return false;
    }

    // Administrative override
    if (user.role === 'SUPER_ADMIN' || user.role === 'admin') {
        return true;
    }

    const userIdStr = String(user.id || user._id);
    const ownerIdStr = project.userId ? String(project.userId._id || project.userId) : null;
    const creatorIdStr = project.owner ? String(project.owner._id || project.owner) : null;

    // 1. Owner or Creator direct match
    if (ownerIdStr === userIdStr || creatorIdStr === userIdStr) {
        return true;
    }

    // 2. Assigned team member IDs match
    if (Array.isArray(project.assignedUserIds)) {
        const isAssigned = project.assignedUserIds.some(id => String(id?._id || id) === userIdStr);
        if (isAssigned) return true;
    }

    // 3. Workspace team members array match
    if (Array.isArray(project.members)) {
        const isMember = project.members.some(m => String(m?.user?._id || m?.user || m) === userIdStr);
        if (isMember) return true;
    }

    return false;
};

/**
 * Express Middleware Gate: Enforces Case Level Isolation for specific routes
 */
export const requireCaseAccess = (paramKey = 'id', capability = 'read') => {
    return async (req, res, next) => {
        try {
            const caseId = req.params[paramKey] || req.body?.projectId || req.query?.projectId;
            if (!caseId) {
                return res.status(400).json({ error: 'Case / Project ID parameter is required' });
            }

            const Project = (await import('../models/Project.js')).default;
            const project = await Project.findById(caseId);
            if (!project) {
                return res.status(404).json({ error: 'Case / Project not found' });
            }

            const isAuthorized = authorizeCaseAccess(req.user, project, capability);
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Access denied: You do not have permission for this case' });
            }

            req.project = project;
            next();
        } catch (err) {
            console.error('[requireCaseAccess Error]', err);
            return res.status(500).json({ error: 'Internal error checking case authorization' });
        }
    };
};

