import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    planId: {
        type: String,
        default: 'advocate_pro'
    },
    invoiceNumber: {
        type: String,
        default: function() { return `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`; }
    },
    amount: {
        type: Number,
        required: true
    },
    gst: {
        type: Number,
        default: 0
    },
    gateway: {
        type: String,
        default: 'AppleStoreKit'
    },
    transactionId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'paid', 'failed', 'refunded', 'refund_requested', 'pending'],
        default: 'success'
    }
}, { timestamps: true, strict: false });

export default mongoose.model('Payment', PaymentSchema);
