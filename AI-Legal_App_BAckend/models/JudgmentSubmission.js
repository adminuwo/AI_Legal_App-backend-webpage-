import mongoose from 'mongoose';

const JudgmentSubmissionSchema = new mongoose.Schema({
    advocateName: {
        type: String,
        required: [true, 'Advocate name is required'],
        trim: true,
        index: true
    },
    enrolmentNumber: {
        type: String,
        required: [true, 'Bar enrolment number is required'],
        trim: true,
        index: true
    },
    profilePhotoUrl: {
        type: String,
        default: ''
    },
    instagramId: {
        type: String,
        trim: true,
        default: ''
    },
    linkedinUrl: {
        type: String,
        trim: true,
        default: ''
    },
    whatsappNumber: {
        type: String,
        required: [true, 'WhatsApp number is required'],
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        trim: true,
        lowercase: true,
        index: true
    },
    twitterUrl: {
        type: String,
        trim: true,
        default: ''
    },
    matter: {
        type: String,
        trim: true,
        default: ''
    },
    pdfUrl: {
        type: String,
        required: [true, 'Judgment PDF is required']
    },
    pdfFileName: {
        type: String,
        default: 'judgement.pdf'
    },
    pdfFileSize: {
        type: Number,
        default: 0
    },
    pdfData: {
        type: String, // Base64 data URI fallback for guaranteed in-app preview
        default: ''
    },
    consentGiven: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Under Review', 'Approved', 'Featured', 'Rejected'],
        default: 'Pending',
        index: true
    },
    adminNotes: {
        type: String,
        default: ''
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    }
}, {
    timestamps: true
});

const JudgmentSubmission = mongoose.models.JudgmentSubmission || mongoose.model('JudgmentSubmission', JudgmentSubmissionSchema);

export default JudgmentSubmission;
