import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true
    },
    fullName: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        default: ''
    },
    country: {
        type: String,
        default: 'India'
    },
    countryCode: {
        type: String,
        default: 'IN'
    },
    dialCode: {
        type: String,
        default: '+91'
    },
    jurisdiction: {
        type: String,
        default: 'India'
    },
    verificationCode: {
        type: String,
        required: true
    },
    verificationCodeExpiresAt: {
        type: Date,
        required: true
    },
    resendCooldownUntil: {
        type: Date,
        default: Date.now
    },
    attempts: {
        type: Number,
        default: 0
    },
    previousCodes: [{
        code: String,
        expiresAt: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // TTL index: document automatically expires after 10 minutes
    }
});

export default mongoose.model('PendingRegistration', pendingRegistrationSchema);
