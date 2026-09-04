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

const checkAdmin = async () => {
    try {
        await connectDB();
        const adminUser = await User.findOne({ email: 'admin@uwo24.com' });
        const subscription = await Subscription.findOne({ userId: adminUser._id, subscriptionStatus: 'active' }).populate('planId');
        
        console.log("Subscription:", JSON.stringify(subscription, null, 2));
        
        // This is exactly what the frontend uses:
        if (adminUser.founderStatus) {
            console.log("PlanName selected by frontend: Founder");
        } else if (subscription?.planId?.planName) {
            console.log("PlanName selected by frontend:", subscription.planId.planName);
        } else {
            console.log("PlanName selected by frontend: Free Plan");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkAdmin();
