import mongoose from 'mongoose';

const FeatureCreditSchema = new mongoose.Schema({
    featureKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    uiLabel: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true,
        default: 0
    },
    category: {
        type: String,
        default: 'Magic Tool'
    },
    description: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('FeatureCredit', FeatureCreditSchema);
