import mongoose from 'mongoose';

const paymentHistorySchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    razorpayPaymentId: { type: String, default: function() { return this.orderId || this.transactionId || `PAY-${Date.now()}`; } },
    razorpayOrderId: { type: String, default: function() { return this.orderId || `ORD-${Date.now()}`; } },
    invoice: { type: String, default: function() { return `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`; } },
    gateway: { type: String, default: 'AppleStoreKit' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['paid', 'failed', 'pending'], default: 'paid' },
    workspace: { type: String, default: 'advocate' },
    planId: { type: String, default: 'advocate_pro' },
    orderId: { type: String },
    paymentMethod: { type: String, default: 'apple_iap' },
    paidAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });

export default mongoose.model('PaymentHistory', paymentHistorySchema);
