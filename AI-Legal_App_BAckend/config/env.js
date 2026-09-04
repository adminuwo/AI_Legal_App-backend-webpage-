import dotenv from 'dotenv';
dotenv.config();

import appConfig from './app.config.js';
import databaseConfig from './database.config.js';
import jwtConfig from './jwt.config.js';

// Backward compatibility re-exports
export const PORT = appConfig.port;
export const MONGO_URI = databaseConfig.mongoUri;
export const JWT_SECRET = jwtConfig.secret;
export const NODE_ENV = appConfig.env;

export default {
  PORT,
  MONGO_URI,
  JWT_SECRET,
  NODE_ENV
};
