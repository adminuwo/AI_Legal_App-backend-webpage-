import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
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
        await connectDB();
        
        // Find a project
        const project = await Project.findOne({});
        if (!project) {
            console.error("No projects found in DB");
            process.exit(1);
        }

        console.log(`Found project: ${project.name} (${project._id}) owned by user: ${project.userId}`);

        // Sign a JWT token for the owner
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET environment variable is missing.");
        const token = jwt.sign(
            { id: project.userId.toString(), email: 'test@example.com', name: 'Test User', planType: 'basic', role: 'user' },
            secret,
            { expiresIn: '1h' }
        );

        console.log("Generated JWT token:", token);

        // Make HTTP request to local backend
        const port = process.env.PORT || 8080;
        const url = `http://localhost:${port}/api/projects/${project._id}`;
        console.log(`Sending GET request to ${url}...`);

        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Response status:", response.status);
        console.log("Response data keys:", Object.keys(response.data));
        console.log("Response data (truncated):", JSON.stringify(response.data).substring(0, 500));
        
        process.exit(0);
    } catch (err) {
        console.error("Test failed with error:", err.message);
        if (err.response) {
            console.error("Response status:", err.response.status);
            console.error("Response data:", err.response.data);
        }
        process.exit(1);
    }
}
runTest();
