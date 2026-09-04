import Notification from '../models/Notification.js';
import userModel from '../models/User.js';
import { notifyUser, getIO } from '../utils/socket.js';
import mongoose from 'mongoose';
import axios from 'axios';

/**
 * AI LEGAL™ Central Notification Service
 * Production-ready, event-driven service for case management alerts and system events.
 */

export const createNotification = async (userId, payload) => {
    try {
        let targetUserId = userId;
        let dataPayload = payload;

        if (typeof userId === 'object' && userId !== null && !payload) {
            targetUserId = userId.userId;
            dataPayload = userId;
        }

        const {
            title,
            desc,
            message,
            type = 'info',
            module = 'Cases',
            category = null,
            priority = null,
            caseName = null,
            caseId = null,
            icon = null,
            color = null,
            actionType = 'OPEN_ROUTE',
            actionId = '',
            route = '',
            voice = 'none',
            id = null,
            data = null,
            metadata = {}
        } = dataPayload || {};

        const finalDesc = desc || message || '';

        // Auto-resolve category if not passed
        let finalCategory = category;
        if (!finalCategory) {
            const titleLower = (title || '').toLowerCase();
            const descLower = (finalDesc || '').toLowerCase();
            if (titleLower.includes('login') || titleLower.includes('password') || titleLower.includes('email') || titleLower.includes('backup') || titleLower.includes('subscription') || titleLower.includes('welcome')) {
                finalCategory = 'System';
            } else if (titleLower.includes('hearing tomorrow') || titleLower.includes('hearing today') || titleLower.includes('urgent') || titleLower.includes('overdue') || titleLower.includes('missing') || titleLower.includes('alert') || type === 'error' || type === 'warning') {
                finalCategory = 'Alerts';
            } else {
                finalCategory = 'Cases';
            }
        }

        // Auto-resolve priority if not passed
        let finalPriority = priority;
        if (!finalPriority) {
            if (finalCategory === 'Alerts' || type === 'error') finalPriority = 'High';
            else if (type === 'success') finalPriority = 'Completed';
            else finalPriority = 'Medium';
        }

        const notifId = id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notificationData = data || metadata || {};
        if (caseId) notificationData.caseId = caseId;
        if (caseName) notificationData.caseName = caseName;

        const notificationObj = {
            id: notifId,
            notificationId: notifId,
            userId: targetUserId,
            caseId: (caseId && mongoose.Types.ObjectId.isValid(caseId)) ? caseId : undefined,
            caseName: caseName || notificationData.caseName || '',
            module,
            category: finalCategory,
            priority: finalPriority,
            title,
            desc: finalDesc,
            message: finalDesc,
            type,
            icon: icon || (finalCategory === 'Alerts' ? 'alert-circle' : finalCategory === 'System' ? 'shield-checkmark' : 'briefcase'),
            color: color || (finalCategory === 'Alerts' ? '#EF4444' : finalCategory === 'System' ? '#8B5CF6' : '#3B82F6'),
            actionType,
            actionId: actionId || caseId || '',
            route: route || (caseId ? `/workspace/${caseId}` : ''),
            metadata: notificationData,
            voice,
            time: new Date(),
            createdAt: new Date(),
            isRead: false,
            deleted: false
        };

        // 1. Save into dedicated Mongo Collection
        if (mongoose.connection.readyState === 1) {
            try {
                await Notification.create({
                    ...notificationObj,
                    userId: targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) ? new mongoose.Types.ObjectId(targetUserId) : undefined
                });
            } catch (dbErr) {
                console.warn('[NOTIFICATION SERVICE] Primary DB save notice:', dbErr.message);
            }

            // Also mirror in user document array for fast backward compatibility
            try {
                await userModel.findByIdAndUpdate(userId, {
                    $push: { 
                        notificationsInbox: { 
                            $each: [notificationObj], 
                            $position: 0 
                        } 
                    }
                });
            } catch (userErr) {
                console.warn('[NOTIFICATION SERVICE] User document mirror notice:', userErr.message);
            }
        }

        console.log(`[NOTIFICATION SERVICE] Event Created: "${title}" (${finalCategory}) for User: ${userId}`);

        // 2. Real-time Socket.io Emission
        notifyUser(userId, notificationObj);

        // 3. Expo Push Notification dispatch
        try {
            const user = await userModel.findById(userId).select('pushToken settings');
            if (user && user.pushToken && user.pushToken.startsWith('ExponentPushToken')) {
                let deepLinkUrl = 'ailegalmobile://(tabs)/dashboard';
                if (notificationData.url) {
                    deepLinkUrl = notificationData.url;
                } else if (caseId) {
                    deepLinkUrl = `ailegalmobile://workspace/${caseId}`;
                }

                await axios.post('https://exp.host/--/api/v2/push/send', {
                    to: user.pushToken,
                    title: title,
                    body: finalDesc,
                    sound: 'default',
                    badge: 1,
                    data: {
                        id: notifId,
                        type,
                        category: finalCategory,
                        url: deepLinkUrl,
                        ...notificationData
                    }
                }, { headers: { 'Content-Type': 'application/json' } });
            }
        } catch (pushErr) {
            console.warn('[NOTIFICATION SERVICE] Push notification notice:', pushErr.message);
        }

        return notificationObj;
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] createNotification Error:', error);
        throw error;
    }
};

export const getNotifications = async (userId, options = {}) => {
    try {
        const { category, page = 1, limit = 50 } = options;
        const query = { userId, deleted: false };
        if (category && category !== 'All') query.category = category;

        if (mongoose.connection.readyState === 1) {
            const list = await Notification.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            if (list.length > 0) {
                return list.map(n => ({
                    ...n,
                    id: n.notificationId || n.id || n._id.toString(),
                    time: n.createdAt || n.time
                }));
            }
        }

        // Fallback to user inbox array
        const user = await userModel.findById(userId).select('notificationsInbox').lean();
        return user?.notificationsInbox || [];
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] getNotifications Error:', error);
        return [];
    }
};

export const markAsRead = async (userId, notificationId) => {
    try {
        if (mongoose.connection.readyState === 1) {
            await Notification.updateMany(
                { userId, $or: [{ notificationId }, { id: notificationId }] },
                { $set: { isRead: true } }
            );
            await userModel.findOneAndUpdate(
                { _id: userId, "notificationsInbox.id": notificationId },
                { $set: { "notificationsInbox.$.isRead": true } }
            );
        }
        return { success: true };
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] markAsRead Error:', error);
        throw error;
    }
};

export const markAllRead = async (userId) => {
    try {
        if (mongoose.connection.readyState === 1) {
            await Notification.updateMany({ userId }, { $set: { isRead: true } });
            await userModel.findOneAndUpdate(
                { _id: userId },
                { $set: { "notificationsInbox.$[].isRead": true } }
            );
        }
        return { success: true };
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] markAllRead Error:', error);
        throw error;
    }
};

export const deleteNotification = async (userId, notificationId) => {
    try {
        if (mongoose.connection.readyState === 1) {
            await Notification.updateMany(
                { userId, $or: [{ notificationId }, { id: notificationId }] },
                { $set: { deleted: true } }
            );
            await userModel.findByIdAndUpdate(userId, {
                $pull: { notificationsInbox: { id: notificationId } }
            });
        }
        return { success: true };
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] deleteNotification Error:', error);
        throw error;
    }
};

export const deleteAll = async (userId) => {
    try {
        if (mongoose.connection.readyState === 1) {
            await Notification.updateMany({ userId }, { $set: { deleted: true } });
            await userModel.findByIdAndUpdate(userId, {
                $set: { notificationsInbox: [] }
            });
        }
        return { success: true };
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] deleteAll Error:', error);
        throw error;
    }
};

export const getUnreadCount = async (userId) => {
    try {
        if (mongoose.connection.readyState === 1) {
            return await Notification.countDocuments({ userId, isRead: false, deleted: false });
        }
        const user = await userModel.findById(userId).select('notificationsInbox').lean();
        return (user?.notificationsInbox || []).filter(n => !n.isRead).length;
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] getUnreadCount Error:', error);
        return 0;
    }
};

export const broadcastNotification = async (payload) => {
    try {
        const users = await userModel.find({}).select('_id');
        for (const u of users) {
            await createNotification(u._id.toString(), payload);
        }
        return { success: true, count: users.length };
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] broadcastNotification Error:', error);
        throw error;
    }
};
