import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';

export const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        // Find subscriptions for this user and populate the plan details
        const subscriptions = await Subscription.find({ userId })
            .populate('planId')
            .sort({ createdAt: -1 });

        // Map subscriptions to a transaction format expected by the frontend
        const transactions = subscriptions.map(sub => ({
            id: sub._id,
            paymentId: sub.paymentId,
            planName: sub.planId?.planName || 'Unknown Plan',
            amount: sub.billingCycle === 'yearly' ? sub.planId?.priceYearly : sub.planId?.priceMonthly,
            status: sub.subscriptionStatus === 'active' ? 'success' : sub.subscriptionStatus,
            date: sub.createdAt,
            billingCycle: sub.billingCycle
        })).filter(tx => tx.amount > 0); // Only return transactions with an actual amount

        res.status(200).json(transactions);
    } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const createOrder = async (req, res) => {
    // Placeholder as this might be handled by subscriptionController
    res.status(501).json({ error: "Not Implemented - Use subscription API" });
};

export const verifyPayment = async (req, res) => {
    // Placeholder
    res.status(501).json({ error: "Not Implemented - Use subscription API" });
};
