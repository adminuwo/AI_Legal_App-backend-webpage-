import mongoose from "mongoose";
import userModel from "../../models/User.js";
import * as FeatureAccessManager from "../featureAccessManager.js";
import { getSmartAvatar, isGeneratedAvatar } from "../../utils/avatarHelper.js";
import BaseService from "./base/BaseService.js";
import LoggerService from "../shared/LoggerService.js";
import UserRepository from "../../repositories/UserRepository.js";

/**
 * Enterprise UserService Component
 * Encapsulates user profile, role self-healing, avatar enrichment, and feature access queries.
 */
export class UserService extends BaseService {
  constructor() {
    super("UserService");
    this.userRepository = new UserRepository();
  }


  /**
   * Fetch User Profile with Self-Healing Avatar & Role Rules
   */
  async getUserProfile(reqUser) {
    const userId = reqUser.id || reqUser._id;
    if (!userId) {
      return { statusCode: 401, data: { error: "Unauthorized" } };
    }

    // DB Down Fallback
    if (mongoose.connection.readyState !== 1) {
      LoggerService.warn("[UserService] MongoDB unreachable. Returning demo user profile.");
      return {
        statusCode: 200,
        data: {
          _id: userId,
          name: reqUser.name || "Demo User",
          email: reqUser.email || "demo@aisa.in",
          role: "user",
          personalizations: {}
        }
      };
    }

    let user = await userModel.findById(userId);
    if (!user && reqUser.email) {
      user = await userModel.findOne({ email: reqUser.email });
    }

    // Self-healing Super Admin & Admin role strictly for aditi@uwo24.com and admin@uwo24.com
    if (user && user.email) {
      const emailLower = user.email.toLowerCase().trim();
      if (emailLower === 'aditi@uwo24.com' || emailLower === 'aditilakhera0@gmail.com') {
        if (user.role !== 'SUPER_ADMIN') {
          user.role = 'SUPER_ADMIN';
          await user.save();
          LoggerService.info(`[UserService] Upgraded ${user.email} to SUPER_ADMIN on profile fetch`);
        }
      } else if (emailLower === 'admin@uwo24.com') {
        if (user.role !== 'admin') {
          user.role = 'admin';
          await user.save();
          LoggerService.info(`[UserService] Ensured ${user.email} has admin role on profile fetch`);
        }
      } else if (user.role === 'SUPER_ADMIN' || user.role === 'admin') {
        user.role = 'user';
        await user.save();
        LoggerService.info(`[UserService] Reset non-admin account ${user.email} to user role`);
      }
    }

    if (!user) {
      const isKnownAdmin = reqUser.email === 'admin@uwo24.com';
      LoggerService.warn(`[UserService] User ${userId} not found in DB. Returning fallback user.`);
      return {
        statusCode: 200,
        data: {
          _id: userId,
          name: reqUser.name || (isKnownAdmin ? 'ADMIN' : 'AISA User'),
          email: reqUser.email || 'user@aisa.in',
          role: isKnownAdmin ? 'admin' : 'user',
          credits: 0,
          personalizations: {}
        }
      };
    }

    // Self-healing Avatar logic
    if (isGeneratedAvatar(user.avatar)) {
      const freshAvatar = await getSmartAvatar(user.email, user.name);
      if (freshAvatar && !isGeneratedAvatar(freshAvatar)) {
        user.avatar = freshAvatar;
        await user.save();
      }
    }

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return { statusCode: 200, data: userObj };
  }

  /**
   * Fetch User Subscription Status
   */
  async getSubscriptionStatus(reqUser, targetWorkspace) {
    const userId = reqUser.id || reqUser._id;
    const status = await FeatureAccessManager.getUsageStatus(userId, targetWorkspace);
    LoggerService.info(`[UserService] Subscription fetch for ${reqUser.email}, Plan: ${status.plan}`);
    return { statusCode: 200, data: status };
  }
}

export default UserService;
