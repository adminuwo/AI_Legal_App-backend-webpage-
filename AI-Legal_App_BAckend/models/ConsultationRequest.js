import mongoose from 'mongoose';

const consultationRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    advocateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    advocateName: {
        type: String,
        default: 'Advocate'
    },
    advocateAvatar: {
        type: String,
        default: ''
    },
    userName: {
        type: String,
        default: ''
    },
    userEmail: {
        type: String,
        default: ''
    },
    userPhone: {
        type: String,
        default: ''
    },
    consultationType: {
        type: String,
        enum: ['chat', 'audio', 'video', 'in_person'],
        default: 'chat'
    },
    scheduledDate: {
        type: Date,
        default: null
    },
    scheduledTimeSlot: {
        type: String,
        default: '11:00 AM - 11:45 AM'
    },
    practiceArea: {
        type: String,
        default: 'General Legal Consultation'
    },
    legalIssueSummary: {
        type: String,
        required: true
    },
    uploadedDocuments: [{
        name: String,
        uri: String,
        size: Number,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    fee: {
        type: Number,
        default: 1500
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'waived', 'failed'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'scheduled', 'completed', 'cancelled', 'rejected', 'expired'],
        default: 'pending',
        index: true
    },
    cancelReason: {
        type: String,
        default: ''
    },
    advocateNotes: {
        type: String,
        default: ''
    },
    timeline: [{
        status: String,
        title: String,
        description: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

consultationRequestSchema.index({ userId: 1, createdAt: -1 });
consultationRequestSchema.index({ advocateId: 1, status: 1 });

export default mongoose.model('ConsultationRequest', consultationRequestSchema);
