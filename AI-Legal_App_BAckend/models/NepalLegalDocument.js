import mongoose from 'mongoose';

const nepalLegalDocumentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    titleNepali: {
        type: String,
        trim: true,
        default: ''
    },
    url: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    source: {
        type: String,
        default: 'Nepal Law Commission',
        trim: true
    },
    country: {
        type: String,
        default: 'Nepal',
        index: true
    },
    countryCode: {
        type: String,
        default: 'NP'
    },
    province: {
        type: String,
        default: '',
        trim: true,
        index: true
    },
    lawType: {
        type: String,
        enum: ['Constitution', 'Act', 'Code', 'Amendment', 'Regulation', 'Rules', 'Order', 'Treaty'],
        default: 'Act',
        index: true
    },
    actYear: {
        type: String,
        default: '',
        trim: true
    },
    actNumber: {
        type: String,
        default: '',
        trim: true
    },
    publicationDate: {
        type: String,
        default: '',
        trim: true
    },
    language: {
        type: String,
        enum: ['en', 'ne', 'bilingual'],
        default: 'en',
        index: true
    },
    summary: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        required: true
    },
    sections: [{
        sectionNumber: String,
        title: String,
        content: String
    }],
    lastFetchedAt: {
        type: Date,
        default: Date.now
    },
    hash: {
        type: String,
        default: '',
        index: true
    },
    version: {
        type: String,
        default: '1.0'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Full-text search index for fast statutory retrieval
nepalLegalDocumentSchema.index({
    title: 'text',
    titleNepali: 'text',
    summary: 'text',
    content: 'text'
});

const NepalLegalDocument = mongoose.model('NepalLegalDocument', nepalLegalDocumentSchema);
export default NepalLegalDocument;
