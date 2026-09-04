import mongoose from 'mongoose';

const usageLedgerSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workspace: { 
        type: String, 
        enum: ['advocate', 'student', 'lawfirm', 'combo'], 
        required: true 
    },
    tool: { type: String, required: true },
    usage: { type: Number, default: 0 },
    limit: { type: Number, default: 5 },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    lastReset: { type: Date, default: Date.now }
}, { timestamps: true });

usageLedgerSchema.index({ accountId: 1, workspace: 1, tool: 1 }, { unique: true });

export default mongoose.model('UsageLedger', usageLedgerSchema);
