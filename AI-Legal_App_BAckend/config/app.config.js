import dotenv from 'dotenv';
dotenv.config();

export const appConfig = {
  port: process.env.PORT || 8080,
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  appName: 'AI Legal Backend',
  apiPrefix: '/api',
  bodyLimit: '50mb'
};

export default appConfig;
