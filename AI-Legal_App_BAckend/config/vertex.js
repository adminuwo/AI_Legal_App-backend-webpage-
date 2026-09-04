import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import { fileURLToPath } from 'url';
import fs, { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.warn(`[config/vertex] ⚠️ Invalid GOOGLE_APPLICATION_CREDENTIALS file path ("${process.env.GOOGLE_APPLICATION_CREDENTIALS}"). Clearing env var to enable gcloud ADC credentials.`);
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

// Dual-mode initialization: Try Gemini API Key first, fallback to Vertex AI
const apiKey = process.env.GEMINI_API_KEY;

// Resolve projectId by checking .env first to see if it is explicitly commented out or missing
let projectId = process.env.GCP_PROJECT_ID;
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envConfig = dotenv.parse(envContent);
    projectId = envConfig.GCP_PROJECT_ID;
    
    // Synchronize process.env to ensure other parts of the application also see it as undefined/removed
    if (!projectId) {
      delete process.env.GCP_PROJECT_ID;
    } else {
      process.env.GCP_PROJECT_ID = projectId;
    }
  } catch (err) {
    console.warn(`[config/vertex] Failed to parse .env file: ${err.message}`);
  }
}

// Use GCP_LOCATION env var so all services (RAG, Gemini calls) use the same region
const location = "asia-south1";
const keyFilePath = path.join(__dirname, '../google_cloud_credentials.json');

let genAI;
let vertexAI;
let useVertexAI = false;

// Initialize Gemini API Key if available
if (apiKey) {
  console.log(`✅ Gemini AI initialized with API Key`);
  genAI = new GoogleGenerativeAI(apiKey);
}

// Fallback to Vertex AI with service account / ADC if GCP_PROJECT_ID exists
if (projectId) {
  console.log(`✅ Vertex AI initializing with project: ${projectId}, location: ${location}`);
  try {
    if (existsSync(keyFilePath)) {
      vertexAI = new VertexAI({
        project: projectId,
        location: location,
        googleAuthOptions: { keyFilename: keyFilePath }
      });
      console.log('✅ Vertex AI initialized with service account keyfile');
    } else {
      vertexAI = new VertexAI({ project: projectId, location: location });
      console.log('✅ Vertex AI initialized with Application Default Credentials (ADC)');
    }
    useVertexAI = true;
  } catch (e) {
    console.error('❌ Vertex AI initialization failed:', e.message);
    useVertexAI = false;
  }
} else if (apiKey) {
  useVertexAI = false;
} else {
  console.error("❌ Error: Neither GEMINI_API_KEY nor GCP_PROJECT_ID found in environment variables.");
}

import { getConfig, getFullSystemInstruction } from '../services/configService.js';

// Model name - Set strictly to user's explicit request

export const modelName = "gemini-2.5-flash";

/**
 * Dynamic System Instruction Getter
 */
export const getDynamicSystemInstruction = () => {
  try {
    return getFullSystemInstruction();
  } catch (e) {
    console.warn('⚠️ Could not fetch system instructions from ConfigService:', e.message);
    return '';
  }
};

// Removed static systemInstructionText to avoid race conditions

// VertexAI-compatible safety settings (from @google-cloud/vertexai package)
const vertexSafetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Create generative model - with null safety checks
export const generativeModel = (() => {
  try {
    if (useVertexAI && vertexAI) {
      return vertexAI.getGenerativeModel({
        model: modelName,
        safetySettings: vertexSafetySettings,
        generationConfig: { maxOutputTokens: 4096 },
        // Instruction will be applied dynamically in services for better flexibility
      });
    } else if (genAI) {
      return genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 4096 },
      });
    } else {
      console.error('❌ CRITICAL: No AI provider available for generativeModel!');
      return null;
    }
  } catch (e) {
    console.error('❌ generativeModel creation failed:', e.message);
    return null;
  }
})();

// Export genAI instance for multi-model support in chatRoutes
export const genAIInstance = (() => {
  if (useVertexAI && vertexAI) {
    return {
      getGenerativeModel: (options) => vertexAI.getGenerativeModel(options)
    };
  }
  return genAI || null;
})();

// Export raw vertexAI instance so services can create fresh models
export { vertexAI };

// Export the flag so services know which mode is active
export { useVertexAI };
