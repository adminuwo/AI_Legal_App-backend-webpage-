import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    gst: {
        type: Number,
        default: 0
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    pdfUrl: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('Invoice', InvoiceSchema);
