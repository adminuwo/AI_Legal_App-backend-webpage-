import mongoose from 'mongoose';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const upgradeAdmin = async () => {
    try {
        await connectDB();

        // 1. Get the admin user
        const adminUser = await User.findOne({ email: 'admin@uwo24.com' });
        
        if (!adminUser) {
            console.error("User admin@uwo24.com not found!");
            process.exit(1);
        }

        // 2. Get the Business Plan
        const businessPlan = await Plan.findOne({ planId: 'business' });
        if (!businessPlan) {
            console.error("Business plan not found in database! Make sure you seeded plans.");
            process.exit(1);
        }

        // 3. Update User Data
        adminUser.credits = businessPlan.credits; // Set credits to 32,000
        adminUser.founderStatus = false;
        await adminUser.save();
        
        console.log("Admin user credits updated successfully.");

        // 4. Update or Create Subscription
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const sub = await Subscription.findOneAndUpdate(
            { userId: adminUser._id },
            {
                planId: businessPlan._id,
                creditsRemaining: businessPlan.credits,
                subscriptionStart: now,
                renewalDate: nextMonth,
                subscriptionStatus: 'active',
                billingCycle: 'monthly',
                paymentId: 'ADMIN_UPGRADE_MANUAL'
            },
            { new: true, upsert: true }
        );

        console.log("Admin subscription successfully upgraded to Business Plan:");
        console.log(`Plan Name: ${businessPlan.planName}`);
        console.log(`Credits: ${sub.creditsRemaining}`);

        process.exit(0);
    } catch (err) {
        console.error("Failed to upgrade admin user:", err);
        process.exit(1);
    }
}

upgradeAdmin();
