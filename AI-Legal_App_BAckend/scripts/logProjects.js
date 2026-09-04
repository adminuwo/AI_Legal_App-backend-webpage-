import mongoose from 'mongoose';
import Project from '../models/Project.js';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const logProjects = async () => {
    try {
        await connectDB();
        const projects = await Project.find({}).limit(5);
        console.log("=== RECENT PROJECTS ===");
        projects.forEach(p => {
            console.log(`ID: ${p._id}`);
            console.log(`Name: ${p.name}`);
            console.log(`User ID: ${p.userId}`);
            console.log(`Facts Count: ${p.facts?.length}`);
            console.log(`Hearings Count: ${p.hearings?.length}`);
            console.log("------------------------");
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
logProjects();
