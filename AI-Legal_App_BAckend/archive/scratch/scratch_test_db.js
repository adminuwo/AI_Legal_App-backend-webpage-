import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Project from './models/Project.js';

// Configure DNS servers to resolve MongoDB SRV records on Windows
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
console.log('Attempting to connect to MongoDB:', uri);

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
  family: 4
})
.then(async () => {
  console.log('✅ MongoDB connection successful!');
  const projectId = '6a312c48bafb327f2c954216';
  const project = await Project.findById(projectId);
  if (!project) {
    console.log('❌ Project not found');
    process.exit(1);
  }

  const updatedIntelligence = {
    strengthScore: Math.min(100, (project.intelligence?.strengthScore || 70) + 3),
    winProbability: Math.min(95, (project.intelligence?.winProbability || 65) + 2),
    riskLevel: project.intelligence?.riskLevel || 'Medium',
    weakPoints: project.intelligence?.weakPoints || [],
    missingEvidence: project.intelligence?.missingEvidence || [],
    opponentStrategies: project.intelligence?.opponentStrategies || [],
    strategyRecommendations: [
      'Precedent search indicates high success rate under Section 138. Prioritize proving delivery receipt.',
      ...(project.intelligence?.strategyRecommendations || [])
    ]
  };

  console.log('Original intelligence:', project.intelligence);
  console.log('Updated intelligence to save:', updatedIntelligence);

  // Simulating Object.assign
  Object.assign(project, { intelligence: updatedIntelligence });
  
  try {
    const saved = await project.save();
    console.log('✅ Saved successfully!');
    console.log('Saved intelligence:', saved.intelligence);
  } catch (err) {
    console.error('❌ Save failed:', err);
  }

  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});
