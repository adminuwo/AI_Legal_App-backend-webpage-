import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Knowledge from '../models/Knowledge.model.js';
import * as vertexService from '../services/vertex.service.js';

dotenv.config();

async function checkRag() {
  await mongoose.connect(process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const docs = await Knowledge.find({}).lean();
  console.log(`Found ${docs.length} documents in AIBaseKnowledge:`);
  docs.forEach(d => {
    console.log(`- ID: ${d._id}, Filename: ${d.filename}, Category: ${d.category}, GCS: ${d.gcsUri}, TotalChunks: ${d.totalChunks}`);
  });

  console.log("\nTesting RAG retrieval for 'UWO'...");
  const ragRes = await vertexService.retrieveContextFromRag("What does UWO do?", 5, 'GENERAL');
  console.log("RAG Result for 'What does UWO do?':", ragRes ? { textLength: ragRes.text?.length, sources: ragRes.sources } : "NULL");

  console.log("\nTesting RAG detection for 'What does UWO do?'...");
  const detectRes = await vertexService.detectRAGNeed("What does UWO do?");
  console.log("Detect result:", detectRes);

  console.log("\nTesting RAG detection for 'explain contract clause'...");
  const detectRes2 = await vertexService.detectRAGNeed("explain contract clause");
  console.log("Detect result 2:", detectRes2);

  await mongoose.disconnect();
}

checkRag().catch(err => console.error("Error:", err));
