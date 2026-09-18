import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { uninstallDetectionService } from '../services/uninstallDetection.service.js';

async function runTest() {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not set in .env');
        }
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected successfully.');

        console.log('Executing detectUninstallsViaSilentPing()...');
        const result = await uninstallDetectionService.detectUninstallsViaSilentPing();
        console.log('Execution Result:', JSON.stringify(result, null, 2));

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB. Test passed!');
        process.exit(0);
    } catch (err) {
        console.error('Test failed with error:', err);
        process.exit(1);
    }
}

runTest();
