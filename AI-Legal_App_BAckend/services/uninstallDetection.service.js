/**
 * AI Legal — Silent Token Ping Uninstall Detection Service
 * Detects real-time uninstalls on the SAME DAY using silent background push pings via Expo / FCM.
 * When a user uninstalls the app, Apple APNs and Google FCM notify Expo that the token is invalid:
 * Error: "DeviceNotRegistered".
 * Upon receiving this, we immediately update AppInstall (status: 'uninstalled', uninstalledAt: Today)
 * without waiting 24-48 hours for Google Analytics batch reports.
 */

import axios from 'axios';
import cron from 'node-cron';
import User from '../models/User.js';
import AppInstall from '../models/AppInstall.js';
import logger from '../utils/logger.js';

class UninstallDetectionService {
    /**
     * Executes a silent background ping across all registered mobile devices
     * to detect uninstalled apps on the exact same day.
     * @returns {Promise<{ success: boolean, totalChecked: number, uninstalledDetected: number, activeDevices: number, message: string }>}
     */
    async detectUninstallsViaSilentPing() {
        try {
            logger.info('[UninstallDetection] Starting real-time silent token ping across active mobile devices...');

            // 1. Fetch users with active push tokens
            const usersWithTokens = await User.find({
                pushToken: { $exists: true, $ne: null }
            }).select('_id email pushToken deviceOS country').lean();

            // Filter for valid ExponentPushTokens
            const eligibleUsers = usersWithTokens.filter(u =>
                typeof u.pushToken === 'string' && u.pushToken.startsWith('ExponentPushToken')
            );

            if (eligibleUsers.length === 0) {
                logger.info('[UninstallDetection] No active push tokens found to ping.');
                return {
                    success: true,
                    totalChecked: 0,
                    uninstalledDetected: 0,
                    activeDevices: 0,
                    message: 'No registered push devices found in database.'
                };
            }

            logger.info(`[UninstallDetection] Found ${eligibleUsers.length} active push tokens. Processing in batches of 100...`);

            let uninstalledCount = 0;
            const uninstalledUsers = [];
            const ticketsToVerify = []; // { ticketId, userId, token }

            // 2. Send silent messages to Expo Push API with automatic experience ID segregation
            const BATCH_SIZE = 100;

            const sendMessagesToExpo = async (usersToPing) => {
                if (!usersToPing || usersToPing.length === 0) return;

                for (let i = 0; i < usersToPing.length; i += BATCH_SIZE) {
                    const batch = usersToPing.slice(i, i + BATCH_SIZE);

                    const messages = batch.map(u => ({
                        to: u.pushToken,
                        _contentAvailable: true,
                        priority: 'normal',
                        data: {
                            _silentPing: true,
                            purpose: 'uninstall_liveness_check',
                            timestamp: Date.now()
                        }
                    }));

                    try {
                        const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Accept-Encoding': 'gzip, deflate'
                            },
                            timeout: 15000
                        });

                        const ticketResults = response.data?.data || [];

                        for (let idx = 0; idx < ticketResults.length; idx++) {
                            const ticket = ticketResults[idx];
                            const targetUser = batch[idx];

                            if (ticket.status === 'error') {
                                const errCode = ticket.details?.error;
                                if (errCode === 'DeviceNotRegistered') {
                                    // 🎯 EXACT SAME-DAY UNINSTALL DETECTED!
                                    uninstalledCount++;
                                    uninstalledUsers.push({
                                        userId: targetUser._id,
                                        email: targetUser.email,
                                        token: targetUser.pushToken,
                                        reason: 'DeviceNotRegistered (Ticket Error)'
                                    });
                                }
                            } else if (ticket.status === 'ok' && ticket.id) {
                                ticketsToVerify.push({
                                    ticketId: ticket.id,
                                    userId: targetUser._id,
                                    email: targetUser.email,
                                    token: targetUser.pushToken
                                });
                            }
                        }
                    } catch (batchErr) {
                        const errData = batchErr.response?.data;
                        const isTooManyExp = errData?.errors?.[0]?.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS';
                        const details = errData?.errors?.[0]?.details;

                        if (isTooManyExp && details && typeof details === 'object') {
                            logger.info(`[UninstallDetection] Resolving conflicting experience IDs into isolated project batches...`);
                            const tokenToUser = new Map();
                            batch.forEach(u => tokenToUser.set(u.pushToken, u));

                            for (const [expId, tokens] of Object.entries(details)) {
                                const isolatedUsers = tokens
                                    .map(t => tokenToUser.get(t))
                                    .filter(Boolean);
                                if (isolatedUsers.length > 0) {
                                    logger.info(`[UninstallDetection] Pinging ${isolatedUsers.length} devices for project "${expId}"...`);
                                    await sendMessagesToExpo(isolatedUsers);
                                }
                            }
                        } else {
                            logger.warn(`[UninstallDetection] Batch send error at index ${i}: ${batchErr.message} - details: ${JSON.stringify(errData)}`);
                        }
                    }
                }
            };

            await sendMessagesToExpo(eligibleUsers);

            // 3. Optional: Verify receipts for recent tickets (wait 2 seconds for APNs/FCM delivery)
            if (ticketsToVerify.length > 0) {
                try {
                    await new Promise(r => setTimeout(r, 2500));
                    const receiptIds = ticketsToVerify.map(t => t.ticketId);

                    for (let i = 0; i < receiptIds.length; i += 300) {
                        const chunkIds = receiptIds.slice(i, i + 300);
                        const receiptRes = await axios.post('https://exp.host/--/api/v2/push/getReceipts', {
                            ids: chunkIds
                        }, { timeout: 10000 });

                        const receipts = receiptRes.data?.data || {};

                        for (const [ticketId, receipt] of Object.entries(receipts)) {
                            if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
                                const matched = ticketsToVerify.find(t => t.ticketId === ticketId);
                                if (matched && !uninstalledUsers.some(u => u.userId.toString() === matched.userId.toString())) {
                                    uninstalledCount++;
                                    uninstalledUsers.push({
                                        userId: matched.userId,
                                        email: matched.email,
                                        token: matched.token,
                                        reason: 'DeviceNotRegistered (Receipt Error)'
                                    });
                                }
                            }
                        }
                    }
                } catch (receiptErr) {
                    logger.warn(`[UninstallDetection] Receipt check notice: ${receiptErr.message}`);
                }
            }

            // 4. Update Database for all detected uninstalls
            if (uninstalledUsers.length > 0) {
                logger.info(`[UninstallDetection] Marking ${uninstalledUsers.length} uninstalled devices in database...`);
                const userIds = uninstalledUsers.map(u => u.userId);
                const installIds = userIds.map(id => `inst_user_${id.toString()}`);

                // A. Update AppInstall collection (match both userId and user-based installId)
                await AppInstall.updateMany(
                    {
                        $or: [
                            { userId: { $in: userIds } },
                            { installId: { $in: installIds } }
                        ]
                    },
                    {
                        $set: {
                            status: 'uninstalled',
                            uninstalledAt: new Date()
                        }
                    }
                );

                // B. Nullify pushToken in User collection to stop further pings
                await User.updateMany(
                    { _id: { $in: userIds } },
                    {
                        $set: {
                            pushToken: null,
                            appStatus: 'uninstalled',
                            lastUninstalledAt: new Date()
                        }
                    }
                );
            }

            logger.info(`[UninstallDetection] Real-time detection complete. Checked: ${eligibleUsers.length}, Uninstalled: ${uninstalledCount}`);

            return {
                success: true,
                totalChecked: eligibleUsers.length,
                uninstalledDetected: uninstalledCount,
                activeDevices: eligibleUsers.length - uninstalledCount,
                message: `Live uninstall scan complete. Checked ${eligibleUsers.length} active devices: ${uninstalledCount} uninstalled detected today.`
            };
        } catch (err) {
            logger.error(`[UninstallDetection] Fatal error during silent ping scan: ${err.message}`);
            return {
                success: false,
                totalChecked: 0,
                uninstalledDetected: 0,
                activeDevices: 0,
                message: `Error during uninstall detection: ${err.message}`
            };
        }
    }
}

export const uninstallDetectionService = new UninstallDetectionService();

/**
 * Initialize automatic background scheduler for silent uninstall detection.
 * Runs twice a day (at 04:00 and 16:00 UTC / 09:30 and 21:30 IST) to keep
 * daily uninstall metrics accurate in near real-time.
 */
export const initUninstallDetectionScheduler = () => {
    logger.info('[UninstallDetection] Initializing Silent Token Ping Scheduler (04:00 & 16:00 UTC)...');
    cron.schedule('0 4,16 * * *', async () => {
        logger.info('[UninstallDetection] Running scheduled silent ping scan for mobile uninstalls...');
        try {
            await uninstallDetectionService.detectUninstallsViaSilentPing();
        } catch (err) {
            logger.error(`[UninstallDetection] Scheduled scan error: ${err.message}`);
        }
    });
    logger.info('[UninstallDetection] Automatic silent ping scheduler active.');
};

export default uninstallDetectionService;
