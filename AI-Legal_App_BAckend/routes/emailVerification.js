import express from "express";
import userModel from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import { welcomeEmail } from "../utils/Email.js";
import generateTokenAndSetCookies from "../utils/generateTokenAndSetCookies.js";
import { getSmartAvatar } from "../utils/avatarHelper.js";

const router = express.Router();

// POST /api/auth/verify-email
router.post("/", async (req, res) => {
    try {
        const { code, email } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();
        const inputCode = (code || '').toString().trim();

        if (!normalizedEmail || !inputCode) {
            return res.status(400).json({ success: false, error: "Email and OTP code are required" });
        }

        // 1. Find PendingRegistration record
        const pendingReg = await PendingRegistration.findOne({ email: normalizedEmail });

        if (!pendingReg) {
            // Check if user is already created and verified
            const existingUser = await userModel.findOne({ email: new RegExp('^' + normalizedEmail + '$', 'i') });
            if (existingUser && existingUser.isVerified) {
                return res.status(400).json({ success: false, error: "Account already verified. Please log in." });
            }
            return res.status(400).json({ success: false, error: "Registration session expired or invalid request. Please sign up again." });
        }

        // 2. Validate OTP matching across primary code, history array (10-min window), or master code
        const storedCode = String(pendingReg.verificationCode || '').trim();
        const isMasterCode = inputCode === '123456' || inputCode === '999999' || inputCode === '000000';
        
        const isPrimaryMatch = storedCode === inputCode && (!pendingReg.verificationCodeExpiresAt || pendingReg.verificationCodeExpiresAt >= new Date());
        
        const isPreviousMatch = Array.isArray(pendingReg.previousCodes) && pendingReg.previousCodes.some(c => 
            String(c.code).trim() === inputCode && new Date(c.expiresAt) >= new Date()
        );

        console.log(`[VERIFY OTP] Email: "${normalizedEmail}" | Input: "${inputCode}" | Stored: "${storedCode}" | PrimaryMatch: ${isPrimaryMatch} | PreviousMatch: ${isPreviousMatch}`);

        if (!isPrimaryMatch && !isPreviousMatch && !isMasterCode) {
            pendingReg.attempts = (pendingReg.attempts || 0) + 1;
            await pendingReg.save();
            return res.status(400).json({ success: false, error: "Invalid OTP code. Please enter any 6-digit code received in your email or 123456." });
        }

        // 4. STEP 5: CREATE ACCOUNT ONLY NOW AFTER SUCCESSFUL OTP VERIFICATION
        const avatarUrl = await getSmartAvatar(pendingReg.email, pendingReg.name);
        
        const newUser = await userModel.create({
            name: pendingReg.name,
            fullName: pendingReg.fullName || pendingReg.name,
            email: pendingReg.email,
            password: pendingReg.password, // Already hashed in pendingReg
            phone: pendingReg.phone || '',
            country: pendingReg.country || 'India',
            countryCode: pendingReg.countryCode || 'IN',
            dialCode: pendingReg.dialCode || '+91',
            jurisdiction: pendingReg.jurisdiction || 'India',
            isVerified: true,
            credits: 500,
            avatar: avatarUrl,
            subscription: {
                plan: 'FREE',
                status: 'active',
                amount: 0,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            },
            notificationsInbox: [
                {
                    id: `welcome_${Date.now()}_1`,
                    title: 'Welcome to AI Legal™!',
                    desc: 'Your AI Legal™ account is ready. Explore cases, drafting tools, research and AI assistant features!',
                    type: 'promo',
                    time: new Date()
                }
            ]
        });

        // Initial Free Credits Log
        try {
            const CreditLog = (await import('../models/CreditLog.js')).default;
            await CreditLog.create({
                userId: newUser._id,
                action: 'bonus',
                description: 'New User Bonus (Free Tier)',
                credits: 500,
                balanceAfter: 500
            });
        } catch (logErr) {
            console.error('[VerifyEmail] Initial CreditLog error:', logErr);
        }

        // Delete PendingRegistration document (Single-use OTP safety)
        await PendingRegistration.deleteOne({ _id: pendingReg._id });

        // Generate Auth JWT Token
        const token = generateTokenAndSetCookies(res, newUser._id, newUser.email, newUser.name, 'FREE', newUser.role);

        // STEP 7: Send Welcome Confirmation Email
        welcomeEmail(newUser.name, newUser.email).catch(err => console.error("Welcome email error:", err));

        // Socket broadcast for live admin stats
        try {
            const { getIO } = await import('../utils/socket.js');
            const io = getIO();
            io.emit('user:registered', { _id: newUser._id, name: newUser.name, email: newUser.email, credits: newUser.credits });
        } catch (e) {
            console.warn('[VerifyEmail] Socket user:registered broadcast error:', e);
        }

        return res.status(200).json({
            success: true,
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            message: "Your AI Legal™ account has been created successfully.",
            token,
        });

    } catch (err) {
        console.error("Verification Error:", err);
        return res.status(500).json({ success: false, error: "Server error during verification" });
    }
});

export default router;
