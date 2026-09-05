import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import UserModel from "../../models/User.js";
import PendingRegistration from "../../models/PendingRegistration.js";
import generateTokenAndSetCookies from "../../utils/generateTokenAndSetCookies.js";
import { generateOTP } from "../../utils/verifiacitonCode.js";
import { sendVerificationEmail, sendResetPasswordEmail, sendPasswordChangeSuccessEmail, sendResetPasswordOTP } from "../../utils/Email.js";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { getSmartAvatar } from "../../utils/avatarHelper.js";
import BaseService from "./base/BaseService.js";
import LoggerService from "../shared/LoggerService.js";
import UserRepository from "../../repositories/UserRepository.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Enterprise AuthService Component
 * Encapsulates authentication, identity verification, OAuth, and password operations.
 */
export class AuthService extends BaseService {
  constructor() {
    super("AuthService");
    this.userRepository = new UserRepository();
  }


  /**
   * User Signup Routine (Pre-OTP Verification)
   * DOES NOT create a User record, profile, or subscription in MongoDB.
   * Stores pending registration details in PendingRegistration collection and sends 6-digit OTP to email.
   */
  async signup(payload, res) {
    const { name, email, password, fullName, phone, country, countryCode, dialCode, jurisdiction } = payload;
    const normalizedEmail = (email || '').toLowerCase().trim();

    // DB Down Fallback for Signup
    if (mongoose.connection.readyState !== 1) {
      LoggerService.warn("[AuthService] MongoDB unreachable during signup. Granting temporary access.");
      const demoId = new mongoose.Types.ObjectId().toString();
      const token = generateTokenAndSetCookies(res, demoId, normalizedEmail, name);
      return {
        statusCode: 201,
        data: {
          id: demoId,
          name: name || "Demo User",
          email: normalizedEmail,
          message: "Demo Mode: Verification bypassed due to DB status",
          token: token,
        }
      };
    }

    if (!normalizedEmail || !password) {
      return { statusCode: 400, data: { error: "Email and password are required" } };
    }

    // Check if user already exists & is verified in database
    const existingUser = await UserModel.findOne({ email: new RegExp('^' + normalizedEmail + '$', 'i') });
    if (existingUser) {
      if (existingUser.isVerified) {
        return { statusCode: 400, data: { error: "User already exists with this email address. Please log in." } };
      } else {
        // Remove unverified legacy user record if any exists
        await UserModel.deleteOne({ _id: existingUser._id });
      }
    }

    if (phone) {
      const existingUserPhone = await UserModel.findOne({ phone, isVerified: true });
      if (existingUserPhone) {
        return { statusCode: 400, data: { error: "Phone number is already registered to a verified account" } };
      }
    }

    // Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return {
        statusCode: 400,
        data: {
          error: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
        }
      };
    }

    // Hash password & generate 6-digit OTP
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationCode = generateOTP();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes OTP expiration
    const cooldownUntil = new Date(Date.now() + 30 * 1000); // 30 seconds resend cooldown

    // Preserve existing valid OTP code into previousCodes history array
    const existingPending = await PendingRegistration.findOne({ email: normalizedEmail });
    let previousCodes = existingPending?.previousCodes || [];
    if (existingPending?.verificationCode) {
      previousCodes.push({
        code: existingPending.verificationCode,
        expiresAt: existingPending.verificationCodeExpiresAt || new Date(Date.now() + 10 * 60 * 1000)
      });
    }

    // Save/Update in PendingRegistration collection ONLY
    await PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        name: name || fullName || normalizedEmail.split('@')[0],
        fullName: fullName || name || normalizedEmail.split('@')[0],
        password: hashedPassword,
        phone: phone || '',
        country: country || 'India',
        countryCode: countryCode || 'IN',
        dialCode: dialCode || '+91',
        state: payload.state || jurisdiction || 'India',
        jurisdiction: jurisdiction || country || 'India',
        verificationCode,
        verificationCodeExpiresAt: expiresAt,
        previousCodes,
        resendCooldownUntil: cooldownUntil,
        attempts: 0,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Send verification OTP ONLY to the entered email address
    try {
      await sendVerificationEmail(normalizedEmail, name || fullName || 'User', verificationCode);
      LoggerService.info(`[AuthService] Verification code ${verificationCode} sent to ${normalizedEmail}`);
    } catch (e) {
      LoggerService.error('[AuthService] Verification email failed:', e);
    }

    return {
      statusCode: 200,
      data: {
        success: true,
        message: "Verification code sent to your email address.",
        email: normalizedEmail,
      }
    };
  }

  /**
   * User Login Routine
   */
  async login(payload, res) {
    const { email, password } = payload;
    const normalizedEmail = (email || '').toLowerCase().trim();

    // DB Down Fallback for Login
    if (mongoose.connection.readyState !== 1) {
      LoggerService.warn("[AuthService] MongoDB unreachable during login. Granting temporary access.");
      const demoId = new mongoose.Types.ObjectId().toString();
      const token = generateTokenAndSetCookies(res, demoId, normalizedEmail, "Demo User");
      return {
        statusCode: 201,
        data: {
          id: demoId,
          name: "Demo User",
          email: normalizedEmail,
          message: "LogIn Successfully (Demo Mode)",
          token: token,
          role: "user"
        }
      };
    }

    // Initial Admin Setup (only if explicitly specified via environment variables)
    if (process.env.INITIAL_ADMIN_EMAIL && normalizedEmail === process.env.INITIAL_ADMIN_EMAIL.toLowerCase()) {
      let adminUser = await UserModel.findOne({ email: process.env.INITIAL_ADMIN_EMAIL });
      if (!adminUser && process.env.INITIAL_ADMIN_PASSWORD) {
        LoggerService.info(`[AuthService] Seeding initial admin user: ${process.env.INITIAL_ADMIN_EMAIL}`);
        const hashedPassword = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, 10);
        adminUser = await UserModel.create({
          name: 'System Admin',
          email: process.env.INITIAL_ADMIN_EMAIL,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isVerified: true
        });
      }
    }

    // Find user
    const user = await UserModel.findOne({ email: new RegExp('^' + normalizedEmail + '$', 'i') });
    if (!user) {
      return { statusCode: 401, data: { error: "Account not found with this email" } };
    }

    // LOGIN RESTRICTION: Unverified accounts MUST NEVER be able to log in
    if (user.isVerified === false) {
      return {
        statusCode: 403,
        data: {
          error: "Please verify your email before logging in.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email
        }
      };
    }

    // Check if account is temporarily deactivated
    if (user.accountStatus === 'inactive') {
      return {
        statusCode: 403,
        data: {
          error: "Your account is temporarily deactivated.",
          code: "ACCOUNT_DEACTIVATED",
          email: user.email
        }
      };
    }

    // Brute-force check
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const remainMins = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (1000 * 60));
      return {
        statusCode: 403,
        data: {
          error: `Too many failed attempts. Account locked. Try again in ${remainMins} minutes.`,
          code: "ACCOUNT_LOCKED"
        }
      };
    }

    // Compare Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }
      await user.save();
      return { statusCode: 401, data: { error: "Invalid password" } };
    }

    // Reset failed attempts on success & enforce strict Super Admin role check
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    user.lastLoginAt = new Date();

    const emailLower = (user.email || '').toLowerCase().trim();
    if (emailLower === 'aditi@uwo24.com' || emailLower === 'aditilakhera0@gmail.com') {
      user.role = 'SUPER_ADMIN';
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'admin') {
      user.role = 'user';
    }
    await user.save();

    const token = generateTokenAndSetCookies(res, user._id, user.email, user.name, user.plan, user.role);

    return {
      statusCode: 200,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        message: "LogIn Successfully",
        token: token,
        role: user.role,
        plan: user.plan,
        isVerified: user.isVerified
      }
    };
  }
}

export default AuthService;
