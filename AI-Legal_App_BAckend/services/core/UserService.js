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

    // Ensure role defaults to 'user' if undefined, preserving MongoDB role as single source of truth
    if (user && !user.role) {
      user.role = 'user';
      await user.save();
    }

    if (!user) {
      const isKnownAdmin = reqUser.role === 'admin' || reqUser.role === 'SUPER_ADMIN';
      LoggerService.warn(`[UserService] User ${userId} not found in DB. Returning fallback user.`);
      return {
        statusCode: 200,
        data: {
          _id: userId,
          name: reqUser.name || (isKnownAdmin ? 'ADMIN' : 'AISA User'),
          email: reqUser.email || 'user@aisa.in',
          role: isKnownAdmin ? reqUser.role : 'user',
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
