import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    event: {
        type: String,
        required: true,
        enum: [
            'PASSWORD_CHANGED',
            'DEVICE_LOGGED_OUT',
            'LOGIN_SESSION_CREATED',
            'ACCOUNT_DEACTIVATED',
            'ACCOUNT_REACTIVATED',
            'ACCOUNT_PERMANENTLY_DELETED'
        ]
    },
    device: {
        type: String,
        default: 'Unknown Device'
    },
    ip: {
        type: String,
        default: 'Unknown IP'
    },
    browser: {
        type: String,
        default: 'Unknown Browser'
    },
    os: {
        type: String,
        default: 'Unknown OS'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
