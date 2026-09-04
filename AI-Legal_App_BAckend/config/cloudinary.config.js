import dotenv from 'dotenv';
dotenv.config();

export const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  url: process.env.CLOUDINARY_URL,
  folder: 'aisa_legal_uploads'
};

export default cloudinaryConfig;
