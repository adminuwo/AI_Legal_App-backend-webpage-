import { v2 as cloudinary } from 'cloudinary';

import multer from 'multer';
import logger from '../utils/logger.js';
import stream from 'stream';

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

logger.info(`[Cloudinary Config] Cloud Name: ${cloudName ? 'Set' : 'Missing'}`);
logger.info(`[Cloudinary Config] API Key: ${apiKey ? 'Set' : 'Missing'}`);
logger.info(`[Cloudinary Config] API Secret: ${apiSecret ? 'Set' : 'Missing'}`);

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
});

const ALLOWED_EXTENSIONS = new Set([
    'pdf', 'docx', 'doc', 'txt', 'rtf', 'csv', 'xlsx', 'xls',
    'png', 'jpg', 'jpeg', 'webp', 'mp3', 'wav', 'm4a', 'mp4'
]);

const DISALLOWED_EXTENSIONS = new Set([
    'exe', 'sh', 'php', 'js', 'bat', 'cmd', 'vbs', 'jar', 'apk', 'html', 'svg', 'cgi', 'pl'
]);

const storage = multer.memoryStorage();

export const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
    fileFilter: (req, file, cb) => {
        const ext = (file.originalname || '').split('.').pop().toLowerCase();
        if (DISALLOWED_EXTENSIONS.has(ext)) {
            return cb(new Error(`Security Restriction: Executable file type .${ext} is prohibited.`));
        }
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return cb(new Error(`Unsupported File Type: .${ext} is not a supported legal document format.`));
        }
        cb(null, true);
    }
});

export const uploadToCloudinary = (fileBuffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'aibase_uploads',
                resource_type: 'auto',
                ...options
            },
            (error, result) => {
                if (error) {
                    logger.error(`[Cloudinary Stream Error]: ${JSON.stringify(error)}`);
                    return reject(error);
                }
                resolve(result);
            }
        );
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);
        bufferStream.pipe(uploadStream);
    });
};

export default { cloudinary, upload, uploadToCloudinary };
