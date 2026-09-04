import mongoose from 'mongoose';

const SystemConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('SystemConfig', SystemConfigSchema);
