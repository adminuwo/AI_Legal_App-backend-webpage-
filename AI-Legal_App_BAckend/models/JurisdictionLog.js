import mongoose from 'mongoose';

const jurisdictionLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    adminEmail: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    oldCountry: {
        type: String,
        required: true
    },
    newCountry: {
        type: String,
        required: true
    },
    overrideType: {
        type: String,
        enum: ['Permanent', 'Temporary'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const JurisdictionLog = mongoose.model('JurisdictionLog', jurisdictionLogSchema);
export default JurisdictionLog;
