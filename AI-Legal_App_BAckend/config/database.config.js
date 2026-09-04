import dotenv from 'dotenv';
dotenv.config();

export const databaseConfig = {
  mongoUri: process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aisa_legal',
  options: {
    dbName: process.env.DB_NAME || 'AISA',
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 60000,
    family: 4
  },
  dnsServers: ['8.8.8.8', '8.8.4.4'],
  maxRetries: 5,
  retryDelayMs: 5000
};

export default databaseConfig;
