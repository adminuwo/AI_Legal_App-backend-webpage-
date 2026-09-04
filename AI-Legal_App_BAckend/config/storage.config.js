import dotenv from 'dotenv';
dotenv.config();

export const storageConfig = {
  gcsBucketName: process.env.GCS_BUCKET_NAME,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
};

export default storageConfig;
