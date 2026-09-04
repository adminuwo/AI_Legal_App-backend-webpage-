import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Project from '../models/Project.js';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const runTest = async () => {
    try {
        console.log("Connecting to database...");
        await connectDB();
        
        // 1. Find a user
        const user = await User.findOne({});
        if (!user) {
            console.error("No users found in database. Please register/create a user first.");
            process.exit(1);
        }
        console.log(`Found User: ${user.name} (ID: ${user._id}, Email: ${user.email})`);

        // 2. Find a project/case
        const project = await Project.findOne({ userId: user._id }) || await Project.findOne({});
        const caseId = project ? project._id.toString() : new mongoose.Types.ObjectId().toString();
        console.log(`Using Case/Project ID: ${caseId} (Name: ${project ? project.name : 'Mock Case'})`);

        // 3. Register a mock Expo Push Token if none exists
        if (!user.pushToken) {
            console.log("Registering mock Expo Push Token for user...");
            user.pushToken = 'ExponentPushToken[mock_token_for_verification]';
            await user.save();
            console.log("Mock push token registered in DB.");
        } else {
            console.log(`Existing push token: ${user.pushToken}`);
        }

        // 4. Generate JWT Token
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET environment variable is missing.");
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, name: user.name, role: user.role || 'user' },
            secret,
            { expiresIn: '1h' }
        );
        console.log("Generated JWT Token:", token);

        const port = process.env.PORT || 8080;
        const testUrl = `http://localhost:${port}/api/notifications/test`;

        // 5. Fire test notification
        console.log(`Triggering test notification to ${testUrl}...`);
        const payload = {
            title: "Hearing Alert",
            desc: "Next hearing scheduled tomorrow at Room 102.",
            type: "alert",
            voice: "none",
            data: {
                caseId: caseId,
                tab: "hearings"
            }
        };

        const response = await axios.post(testUrl, payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Response Status:", response.status);
        console.log("Response Body:", JSON.stringify(response.data, null, 2));

        // 6. Test Mark All Read
        console.log("Testing mark all read endpoint...");
        const readAllUrl = `http://localhost:${port}/api/notifications/read-all`;
        const readResponse = await axios.put(readAllUrl, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Mark All Read Response Status:", readResponse.status);
        console.log("Mark All Read Response Body:", readResponse.data);

        process.exit(0);
    } catch (err) {
        console.error("Test failed with error:", err.message);
        console.error(err);
        if (err.response) {
            console.error("Response status:", err.response.status);
            console.error("Response data:", err.response.data);
        }
        process.exit(1);
    }
};

runTest();
