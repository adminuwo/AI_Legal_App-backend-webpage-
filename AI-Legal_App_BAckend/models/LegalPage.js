import mongoose from 'mongoose';

const legalSectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: [{
        subtitle: { type: String, required: true },
        text: { type: String, required: true }
    }]
}, { _id: false });

const legalPageSchema = new mongoose.Schema({
    pageType: {
        type: String,
        enum: ['cookie-policy', 'terms-of-service', 'privacy-policy'],
        required: true,
        unique: true
    },
    lastUpdated: { type: Date, default: Date.now },
    sections: [legalSectionSchema]
}, { timestamps: true });

export default mongoose.model('LegalPage', legalPageSchema);
