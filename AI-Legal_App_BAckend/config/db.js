import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';
import logger from '../utils/logger.js';

import dns from 'dns';

// Fix for querySrv ECONNREFUSED on some networks/Windows
dns.setServers(['8.8.8.8', '8.8.4.4']);


const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(MONGO_URI, {
        dbName: process.env.DB_NAME || 'AISA',
        serverSelectionTimeoutMS: 60000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 60000,
        family: 4, 
      });
      logger.info(`MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
      return;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${i} failed: ${error.message}`);
      if (error.message.includes('ECONNREFUSED')) {
        logger.info("DNS resolution failed. This is often a local network/ISP issue with SRV records.");
      }
      if (i === retries) {
        logger.error("Max retries reached. Database remains disconnected.");
      } else {
        logger.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
};

export default connectDB;
