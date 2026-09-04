import cron from 'node-cron';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';
import logger from '../utils/logger.js';

/**
 * Sends notification warnings when feature usage crosses 80%, 90%, 95%, or 100% threshold
 */
export const checkAndNotifyUsageThreshold = async (userId, featureKey, used, limit) => {
    if (!limit || limit === Infinity || limit <= 0) return;

    const remaining = Math.max(0, limit - used);
    const percentage = Math.round((used / limit) * 100);
    const featureName = featureKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    if (percentage >= 100) {
        await createNotification(userId, {
            title: `${featureName} Limit Reached`,
            desc: `You have used all ${limit} ${featureName} generations included in your plan. Upgrade to continue using AI Legal tools.`,
            type: 'alert'
        });
    } else if (percentage >= 80) {
        await createNotification(userId, {
            title: `${featureName} Usage Warning (${percentage}%)`,
            desc: `You have used ${used} of ${limit} ${featureName} generations. Only ${remaining} remaining.`,
            type: 'info'
        });
    }
};

export const startPlanExpiryService = () => {
    logger.info('[PlanExpiryService] Initializing Plan Expiry & Reminders System...');

    // Run every day at 09:00 AM
    cron.schedule('0 9 * * *', async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const checkExpiring = async (days, labelTitle) => {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + days);
                const targetEnd = new Date(targetDate);
                targetEnd.setDate(targetEnd.getDate() + 1);

                const usersExpiring = await User.find({
                    'subscription.status': 'active',
                    'subscription.expiryDate': { $gte: targetDate, $lt: targetEnd }
                });

                for (const u of usersExpiring) {
                    await createNotification(u._id, {
                        title: labelTitle,
                        desc: `Your subscription expires in ${days} day(s). Renew now to maintain uninterrupted access to all AI tools and workspace features.`,
                        type: 'alert'
                    });
                }
                return usersExpiring.length;
            };

            const count7 = await checkExpiring(7, 'Subscription Expiring in 7 Days');
            const count3 = await checkExpiring(3, 'Subscription Expiring in 3 Days');
            const count1 = await checkExpiring(1, 'Subscription Expiring Tomorrow');

            // Process expired plans
            const expiredUsers = await User.find({
                'subscription.status': 'active',
                'subscription.expiryDate': { $lt: today }
            });

            for (const u of expiredUsers) {
                u.subscription.status = 'expired';
                u.subscription.plan = 'FREE';
                await u.save();

                await Subscription.updateMany(
                    { accountId: u._id, status: 'active' },
                    { $set: { status: 'expired', autoRenew: false } }
                );

                await createNotification(u._id, {
                    title: 'Subscription Expired',
                    desc: 'Your AI Legal™ subscription has ended and your workspace has been reverted to the Free plan. Renew now to restore full access.',
                    type: 'error'
                });
            }

            logger.info(`[PlanExpiryService] Expiry check complete. Reminded: ${count7 + count3 + count1}, Expired: ${expiredUsers.length}`);
        } catch (error) {
            logger.error(`[PlanExpiryService] Error during expiry check: ${error.message}`);
        }
    });
};
