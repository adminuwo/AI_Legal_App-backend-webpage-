import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        index: true
    },
    refreshTokenHash: {
        type: String,
        index: true
    },
    deviceId: {
        type: String,
        index: true
    },
    deviceName: {
        type: String,
        default: "Unknown Device"
    },
    platform: {
        type: String,
        enum: ["web", "mobile", "tablet", "desktop", "unknown"],
        default: "unknown"
    },
    device: {
        type: String,
        default: "Unknown Device"
    },
    browser: {
        type: String,
        default: "Unknown Browser"
    },
    os: {
        type: String,
        default: "Unknown OS"
    },
    operatingSystem: {
        type: String,
        default: "Unknown OS"
    },
    appVersion: {
        type: String,
        default: "1.0.0"
    },
    ip: {
        type: String,
        default: "Unknown IP"
    },
    location: {
        type: String,
        default: "Unknown Location"
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isCurrent: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ token: 1, isActive: 1 });

const Session = mongoose.model("Session", sessionSchema);
export default Session;
