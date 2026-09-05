import Session from "../models/Session.js";
import crypto from "crypto";

export const MAX_ACTIVE_SESSIONS = 3;

/**
 * Formats a raw session document for API responses.
 */
export const formatSessionDetails = (session, currentToken = null) => {
    const s = typeof session.toObject === 'function' ? session.toObject() : session;
    return {
        sessionId: s._id ? s._id.toString() : s.sessionId,
        _id: s._id ? s._id.toString() : s.sessionId,
        deviceId: s.deviceId || 'unknown_device',
        deviceName: s.deviceName || `${s.os || 'Unknown OS'} Device`,
        deviceType: s.device || 'Desktop',
        platform: s.platform || 'web',
        operatingSystem: s.operatingSystem || s.os || 'Unknown OS',
        browser: s.browser || 'Unknown Browser',
        ipAddress: s.ip || 'Unknown IP',
        lastActiveAt: s.lastActive || s.updatedAt || new Date(),
        createdAt: s.createdAt || new Date(),
        isActive: s.isActive !== false,
        isCurrent: Boolean(currentToken && s.token === currentToken)
    };
};

/**
 * Get active sessions for a user (up to MAX_ACTIVE_SESSIONS).
 */
export const getActiveSessionsForUser = async (userId, currentToken = null) => {
    try {
        const activeSessions = await Session.find({ userId, isActive: true })
            .sort({ lastActive: -1 })
            .limit(10);

        return activeSessions.map(s => formatSessionDetails(s, currentToken));
    } catch (err) {
        console.error("[SESSION ERROR] Failed to fetch active sessions:", err);
        return [];
    }
};

/**
 * Checks if a user has reached the 3 active device session limit.
 * Returns { isLimitReached: boolean, activeSessions: array, existingSession: object|null }
 */
export const checkSessionLimit = async (userId, deviceId = null) => {
    try {
        const activeSessions = await Session.find({ userId, isActive: true }).sort({ lastActive: -1 });
        
        let existingSession = null;
        if (deviceId) {
            existingSession = activeSessions.find(s => s.deviceId === deviceId);
        }

        const isLimitReached = activeSessions.length >= MAX_ACTIVE_SESSIONS && !existingSession;

        return {
            isLimitReached,
            activeCount: activeSessions.length,
            activeSessions: activeSessions.map(s => formatSessionDetails(s)),
            existingSession
        };
    } catch (err) {
        console.error("[SESSION ERROR] Failed to check session limit:", err);
        return { isLimitReached: false, activeCount: 0, activeSessions: [], existingSession: null };
    }
};

/**
 * Create or replace an active session entry for a user.
 */
export const createSession = async (userId, token, req) => {
    try {
        const userAgent = req.headers['user-agent'] || "Unknown Device";
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || "Unknown IP";
        
        const clientDeviceId = req.headers['x-device-id'] || req.body?.deviceId || req.body?.device_id || null;
        const clientDeviceName = req.headers['x-device-name'] || req.body?.deviceName || req.body?.device_name || null;
        const clientPlatform = req.headers['x-device-platform'] || req.body?.platform || req.body?.device_platform || null;

        // Stable fallback deviceId generation from userAgent + IP if not supplied
        const deviceId = clientDeviceId || crypto.createHash('md5').update(`${userId}-${userAgent}`).digest('hex');

        // Simple manual parsing
        let device = "Desktop";
        if (/mobile/i.test(userAgent)) device = "Mobile";
        if (/tablet/i.test(userAgent)) device = "Tablet";

        let browser = "Other";
        if (/chrome|crios/i.test(userAgent)) browser = "Chrome";
        else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
        else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = "Safari";
        else if (/opr\//i.test(userAgent)) browser = "Opera";
        else if (/edg/i.test(userAgent)) browser = "Edge";

        let os = "Other";
        if (/windows/i.test(userAgent)) os = "Windows";
        else if (/mac/i.test(userAgent)) os = "macOS";
        else if (/linux/i.test(userAgent)) os = "Linux";
        else if (/android/i.test(userAgent)) os = "Android";
        else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";

        let platform = clientPlatform || (device === 'Mobile' || device === 'Tablet' ? 'mobile' : 'web');
        let deviceName = clientDeviceName || `${os} ${device === 'Mobile' ? 'Phone' : 'PC'} (${browser})`;

        // Revoke any pre-existing active session for the SAME deviceId to maintain slot count
        if (deviceId) {
            await Session.updateMany(
                { userId, deviceId, isActive: true },
                { $set: { isActive: false } }
            );
        }

        const newSession = await Session.create({
            userId,
            token,
            deviceId,
            deviceName,
            platform,
            device,
            browser,
            os,
            operatingSystem: os,
            ip,
            isActive: true,
            lastActive: Date.now()
        });

        return newSession;
    } catch (err) {
        console.error("[SESSION ERROR] Failed to create session:", err);
        return null;
    }
};

/**
 * Revoke a specific active session by ID and emit real-time logout socket notification.
 */
export const revokeSession = async (userId, sessionId, io = null) => {
    try {
        const session = await Session.findOne({ _id: sessionId, userId, isActive: true });
        if (!session) return false;

        session.isActive = false;
        await session.save();

        if (io) {
            try {
                // Emit to session specific channel
                io.to(`session_${sessionId}`).emit('session_revoked', {
                    sessionId: sessionId.toString(),
                    reason: 'remote_logout'
                });
                // Notify all remaining sessions for user to refresh session lists
                io.to(userId.toString()).emit('active_sessions_updated', {
                    revokedSessionId: sessionId.toString()
                });
            } catch (socketErr) {
                console.warn("[SESSION SOCKET ERROR]", socketErr.message);
            }
        }

        return true;
    } catch (err) {
        console.error("[SESSION ERROR] Failed to revoke session:", err);
        return false;
    }
};

/**
 * Cleanup old/inactive sessions
 */
export const cleanupSessions = async (userId) => {
    try {
        // Delete inactive sessions older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await Session.deleteMany({ userId, isActive: false, updatedAt: { $lt: thirtyDaysAgo } });
    } catch (err) {
        console.error("[SESSION ERROR] Failed to cleanup sessions:", err);
    }
};
