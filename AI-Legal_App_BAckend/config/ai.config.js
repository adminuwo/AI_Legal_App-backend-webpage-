import dotenv from 'dotenv';
dotenv.config();

export const aiConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  gcpProjectId: process.env.GCP_PROJECT_ID,
  gcpLocation: process.env.GCP_LOCATION || 'asia-south1',
  openaiApiKey: process.env.OPENAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  defaultModel: 'gemini-2.5-flash',
  maxTokens: 4096,
  fallbackOrder: ['vertex', 'openai', 'groq']
};

export default aiConfig;
