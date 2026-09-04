import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workspace: { 
        type: String, 
        default: 'advocate' 
    },
    tier: { 
        type: String, 
        default: 'FREE' 
    },
    billingType: { 
        type: String, 
        default: 'individual' 
    },
    billingCycle: { 
        type: String, 
        default: 'monthly' 
    },
    amount: { type: Number, default: 0 },
    status: { 
        type: String, 
        default: 'active' 
    },
    paymentId: { type: String, default: '' },
    orderId: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    platform: { type: String, default: 'ios' },
    invoiceId: { type: String, default: '' },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    autoRenew: { type: Boolean, default: true }
}, { timestamps: true, strict: false });

export default mongoose.model('Subscription', subscriptionSchema);
