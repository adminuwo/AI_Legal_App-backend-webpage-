import dotenv from 'dotenv';
dotenv.config();

import appConfig from './app.config.js';
import databaseConfig from './database.config.js';
import jwtConfig from './jwt.config.js';
import aiConfig from './ai.config.js';
import cloudinaryConfig from './cloudinary.config.js';
import paymentConfig from './payment.config.js';
import storageConfig from './storage.config.js';

/**
 * Environment Validation Function
 * Validates mandatory environment variables on startup.
 */
export const validateEnvironment = () => {
  const missingVars = [];

  if (!databaseConfig.mongoUri) missingVars.push('MONGODB_ATLAS_URI / MONGO_URI');
  if (!jwtConfig.secret || jwtConfig.secret === 'default_jwt_secret_dev_only') {
    if (appConfig.isProduction) missingVars.push('JWT_SECRET');
  }

  if (missingVars.length > 0) {
    if (appConfig.isProduction) {
      console.error(`🚨 FATAL: Missing required environment variables in production: ${missingVars.join(', ')}`);
      process.exit(1);
    } else {
      console.warn(`⚠️ Warning: Missing environment variables: ${missingVars.join(', ')}`);
    }
  } else {
    console.log('✅ Environment configuration validated cleanly.');
  }
};

// Auto-validate on module import
validateEnvironment();

export {
  appConfig,
  databaseConfig,
  jwtConfig,
  aiConfig,
  cloudinaryConfig,
  paymentConfig,
  storageConfig
};

export default {
  app: appConfig,
  db: databaseConfig,
  jwt: jwtConfig,
  ai: aiConfig,
  cloudinary: cloudinaryConfig,
  payment: paymentConfig,
  storage: storageConfig
};
