import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        default: ''
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
    state: {
        type: String,
        default: ''
    },
    legalJurisdiction: {
        country: { type: String, default: 'India' },
        countryCode: { type: String, default: 'IN' },
        state: { type: String, default: '' },
        jurisdictionType: { type: String, default: 'state' },
        savedAt: { type: Date, default: Date.now },
        source: { type: String, default: 'user_selected' }
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () { return !this.providerId; }, // Only required for email/password login
        select: false
    },
    provider: {
        type: String,
        default: 'local'
    },
    providerId: {
        type: String,
        unique: true,
        sparse: true
    },
    socialLinks: [{
        provider: String,
        providerId: String
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
        default: '/User.jpeg'
    },
    agents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agent"
    }],
    role: {
        type: String,
        enum: ['user', 'admin', 'SUPER_ADMIN'],
        default: "user"
    },
    chatSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatSession" }],
    verificationCode: String,
    isBlocked: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    settings: {
        emailNotif: { type: Boolean, default: true },
        pushNotif: { type: Boolean, default: false },
        publicProfile: { type: Boolean, default: true },
        twoFactor: { type: Boolean, default: false }
    },
    personalizations: {
        // Advocate / User Dossier Details
        advocateProfile: { type: mongoose.Schema.Types.Mixed, default: {} },

        // General Settings
        general: {
            language: { type: String, default: process.env.APP_DEFAULT_LANGUAGE || 'English' },
            theme: { type: String, enum: ['Light', 'Dark', 'System', 'light', 'dark', 'system'], default: 'System' },
            responseSpeed: { type: String, enum: ['Fast', 'Balanced', 'Detailed', 'fast', 'balanced', 'detailed'], default: 'Balanced' },
            screenReader: { type: Boolean, default: false },
            highContrast: { type: Boolean, default: false },
            permissionsOnboardingCompleted: { type: Boolean, default: false }
        },

        // Notifications
        notifications: {
            responses: { type: String, default: 'Push' }, // Push, Off
            groupChats: { type: String, default: 'Push' }, // Push, Off
            tasks: { type: String, default: 'Push, Email' }, // Push, Email, Off
            projects: { type: String, default: 'Email' }, // Email, Off
            recommendations: { type: String, default: 'Push, Email' } // Push, Email, Off
        },

        // Personalization (Core Feature)
        personalization: {
            fontStyle: {
                type: String,
                enum: ['Default', 'Serif', 'Mono', 'Sans', 'Rounded', 'default', 'serif', 'mono', 'sans', 'rounded'],
                default: 'Default'
            },
            characteristics: {
                enthusiasm: { type: String, default: 'Medium' },
                formality: { type: String, default: 'Medium' },
                creativity: { type: String, default: 'Medium' },
                directness: { type: String, default: 'Medium' }
            },
            headers: {
                structuredResponses: { type: Boolean, default: true },
                bulletPoints: { type: Boolean, default: true },
                stepByStep: { type: Boolean, default: true }
            },
            emojiUsage: {
                type: String,
                enum: ['None', 'Minimal', 'Moderate', 'Expressive', 'none', 'minimal', 'moderate', 'expressive'],
                default: 'Moderate'
            },
            fontSize: { type: String, default: 'Medium' }, // Added to match frontend data structure
            customInstructions: { type: String, default: '', maxlength: 1500 }
        },

        // Apps & Integrations
        apps: [{
            name: String,
            enabled: { type: Boolean, default: true },
            permissions: { type: String, enum: ['Read', 'Write', 'ReadWrite'], default: 'Read' },
            connectedAt: { type: Date, default: Date.now },
            tokens: {
                access_token: String,
                refresh_token: String,
                expiry_date: Number,
                email_address: String,
                token_type: String
            }
        }],

        // Data Controls
        dataControls: {
            chatHistory: { type: String, enum: ['On', 'Auto-delete', 'Off'], default: 'On' },
            trainingDataUsage: { type: Boolean, default: true },
            autoDeleteDays: { type: Number, default: 30 }
        },

        // Parental Controls
        parentalControls: {
            enabled: { type: Boolean, default: false },
            ageCategory: { type: String, enum: ['Child', 'Teen', 'Adult'], default: 'Adult' },
            contentFiltering: { type: String, enum: ['Strict', 'Moderate', 'Off'], default: 'Off' },
            disableSensitiveTopics: { type: Boolean, default: false },
            timeUsageLimits: { type: Number, default: 0 } // minutes per day, 0 = unlimited
        },

        // Account
        account: {
            nickname: { type: String, default: '' }
        }
    },
    modePreferences: {
        defaultMode: { type: String, default: 'NORMAL_CHAT' },
        autoDetect: { type: Boolean, default: true }
    },

    credits: { type: Number, default: 500 },
    founderStatus: { type: Boolean, default: false },
    subscription: {
        plan: { type: String, default: 'FREE' },
        status: { type: String, default: 'active' },
        paymentId: { type: String, default: '' },
        orderId: { type: String, default: '' },
        expiryDate: { type: Date, default: null },
        purchaseDate: { type: Date, default: null },
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        gateway: { type: String, default: 'AppleStoreKit' },
        invoice: { type: String, default: '' },
        autoRenew: { type: Boolean, default: false }
    },
    usage: {
        mockCourtroomTrials: { type: Number, default: 0 },
        knowledgeHubTrials: { type: Number, default: 0 },
        clientConnectTrials: { type: Number, default: 0 },
        resetDate: { type: Date, default: Date.now }
    },
    pushToken: { type: String, default: null },

    // Security Profile Attributes
    passwordUpdatedAt: { type: Date, default: Date.now },
    accountStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastLogin: { type: Date },
    failedAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    deviceTokens: [{ type: String }],
    deviceOS: { type: String, enum: ['android', 'ios', 'web', 'unknown'], default: 'unknown' },
    deactivatedAt: { type: Date },
    deletedAt: { type: Date },

    // Real-Time Student / User Study Streak (Snapchat-style daily consecutive active days)
    studyStreak: {
        currentStreak: { type: Number, default: 0 },
        lastActiveDate: { type: String, default: '' }, // YYYY-MM-DD
        bestStreak: { type: Number, default: 0 },
        totalActiveDays: { type: Number, default: 0 }
    },

    // User Lifecycle & Email Automation Tracking
    welcomeEmailSent: { type: Boolean, default: false },
    welcomeEmailSentAt: { type: Date, default: null },
    signupMethod: { type: String, enum: ['email', 'google', 'apple', 'local', 'other'], default: 'email' },
    signupPlatform: { type: String, enum: ['web', 'android', 'ios', 'unknown'], default: 'unknown' },
    lifecycleStage: { type: String, enum: ['new', 'active', 'free_partially_exhausted', 'free_fully_exhausted', 'upgraded'], default: 'new' },
    finalExhaustionEmailSent: { type: Boolean, default: false },
    finalExhaustionEmailSentAt: { type: Date, default: null },

    notificationsInbox: [{
        id: String,
        title: String,
        desc: String,
        type: { type: String, enum: ['promo', 'update', 'alert', 'success', 'info', 'error'], default: 'promo' },
        time: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
        voice: { type: String, default: 'none' },
        data: { type: mongoose.Schema.Types.Mixed, default: null }
    }]
}, { timestamps: true });

// Optimize query performance for admin registration date filtering and pagination
userSchema.index({ createdAt: -1 });
userSchema.index({ createdAt: -1, deviceOS: 1 });
userSchema.index({ welcomeEmailSent: 1, createdAt: -1 });

// Sanitize user serialization to prevent password and token exposure
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.resetPasswordToken;
    delete userObject.resetPasswordExpires;
    return userObject;
};

export default mongoose.model('User', userSchema);
