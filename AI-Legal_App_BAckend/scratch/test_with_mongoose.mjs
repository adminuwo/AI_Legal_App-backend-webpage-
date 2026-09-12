import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import connectDB from '../config/db.js';
import dotenv from 'dotenv';
import * as vertexService from '../services/vertex.service.js';

dotenv.config();

async function testWithMongoose() {
    await connectDB();
    console.log("Connected to MongoDB via connectDB");

    console.log("\nTesting retrieveContextFromRag for 'UWO services'...");
    const res = await vertexService.retrieveContextFromRag("What does UWO company deck say about services or mission?", 5, 'GENERAL');
    
    if (res) {
        console.log("SUCCESS! Retrieved text length:", res.text.length);
        console.log("Sources:", JSON.stringify(res.sources, null, 2));
        console.log("Snippet:\n", res.text.substring(0, 400));
    } else {
        console.log("No RAG result returned.");
    }

    await mongoose.disconnect();
}

testWithMongoose().catch(err => console.error("Error:", err));
