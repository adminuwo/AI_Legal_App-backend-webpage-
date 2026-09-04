import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    datetime: {
        type: Date,
        required: true,
        index: true
    },
    repeat: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly', 'custom'],
        default: 'none'
    },
    customDays: [{
        type: Number, // 0 for Sunday, 1 for Monday, etc.
        min: 0,
        max: 6
    }],
    notificationType: {
        type: String,
        enum: ['in-app', 'email', 'both'],
        default: 'in-app'
    },
    voice: {
        type: String,
        enum: ['none', 'en-US-female', 'en-US-male', 'hi-IN-female', 'hi-IN-male'],
        default: 'none'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    intent: {
        type: String,
        enum: ['reminder_with_alarm', 'reminder_notification_only', 'alarm_only', 'task_only'],
        default: 'reminder_notification_only'
    }
}, { timestamps: true });

// Index for querying pending reminders
reminderSchema.index({ userId: 1, status: 1, datetime: 1, isActive: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;
