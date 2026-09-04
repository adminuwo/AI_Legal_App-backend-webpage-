import mongoose from 'mongoose';

const BugReportSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    device: {
        type: String,
        default: 'Unknown'
    },
    platform: {
        type: String,
        enum: ['Android', 'iOS', 'Web'],
        default: 'Android',
        index: true
    },
    appVersion: {
        type: String,
        default: '1.0.0'
    },
    osVersion: {
        type: String,
        default: 'Unknown'
    },
    screenshot: {
        type: String,
        default: ''
    },
    logFile: {
        type: String,
        default: ''
    },
    severity: {
        type: String,
        enum: ['Minor', 'Major', 'Critical'],
        default: 'Minor',
        index: true
    },
    status: {
        type: String,
        enum: ['Open', 'Assigned', 'Fixing', 'Testing', 'Fixed', 'Closed'],
        default: 'Open',
        index: true
    },
    developerAssigned: {
        type: String,
        default: ''
    },
    internalNotes: {
        type: String,
        default: ''
    },
    fixBuildUrl: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('BugReport', BugReportSchema);
