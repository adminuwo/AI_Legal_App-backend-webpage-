import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JudgmentSubmission from '../models/JudgmentSubmission.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local uploads directory exists for reliable fallback storage
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'judgments');
if (!fs.existsSync(UPLOADS_DIR)) {
    try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    } catch (e) {
        console.warn('Could not create uploads directory:', e.message);
    }
}

/**
 * Helper to save file locally or to Cloudinary
 */
async function processFile(file, prefix = 'doc') {
    if (!file || !file.buffer) return null;

    let publicUrl = '';
    const safeName = `${prefix}_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const localFilePath = path.join(UPLOADS_DIR, safeName);

    // Write to local disk as primary reliable storage
    try {
        fs.writeFileSync(localFilePath, file.buffer);
        publicUrl = `/uploads/judgments/${safeName}`;
    } catch (err) {
        console.warn('Local disk write warning:', err.message);
    }

    // Try Cloudinary upload for non-PDF files (Cloudinary free/default ACL blocks raw PDFs with 401)
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
        try {
            if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
                const result = await uploadToCloudinary(file.buffer, {
                    folder: 'ailegal_judgments',
                    public_id: `${prefix}_${Date.now()}`
                });
                if (result && result.secure_url) {
                    publicUrl = result.secure_url;
                }
            }
        } catch (cloudErr) {
            logger.info(`[Cloudinary fallback to local]: ${cloudErr.message}`);
        }
    }

    return {
        url: publicUrl,
        filename: file.originalname,
        size: file.size,
        base64: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
    };
}

/**
 * Public Endpoint: Submit Judgment / Win
 * POST /api/judgment-submissions
 */
export async function submitJudgment(req, res) {
    try {
        const {
            advocateName,
            enrolmentNumber,
            instagramId,
            linkedinUrl,
            whatsappNumber,
            email,
            twitterUrl,
            matter,
            consentGiven
        } = req.body;

        if (!advocateName || !advocateName.trim()) {
            return res.status(400).json({ success: false, message: 'Advocate name is required.' });
        }
        if (!enrolmentNumber || !enrolmentNumber.trim()) {
            return res.status(400).json({ success: false, message: 'Bar enrolment number is required.' });
        }
        if (!whatsappNumber || !whatsappNumber.trim()) {
            return res.status(400).json({ success: false, message: 'WhatsApp number is required.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }

        // Process Judgment PDF
        let pdfFileObj = null;
        if (req.files) {
            if (req.files['judgementPdf'] && req.files['judgementPdf'][0]) {
                pdfFileObj = req.files['judgementPdf'][0];
            } else if (req.files['pdf'] && req.files['pdf'][0]) {
                pdfFileObj = req.files['pdf'][0];
            }
        } else if (req.file) {
            pdfFileObj = req.file;
        }

        let pdfUrl = '';
        let pdfFileName = 'judgement.pdf';
        let pdfFileSize = 0;
        let pdfData = '';

        if (pdfFileObj) {
            const processedPdf = await processFile(pdfFileObj, 'judgement');
            if (processedPdf) {
                pdfUrl = processedPdf.url;
                pdfFileName = processedPdf.filename;
                pdfFileSize = processedPdf.size;
                pdfData = processedPdf.base64;
            }
        } else if (req.body.pdfData || req.body.pdfUrl) {
            // Direct Base64 / URL provided
            pdfUrl = req.body.pdfUrl || req.body.pdfData;
            pdfData = req.body.pdfData || '';
            pdfFileName = req.body.pdfFileName || 'judgement.pdf';
            pdfFileSize = req.body.pdfFileSize || 0;
        }

        if (!pdfUrl && !pdfData) {
            return res.status(400).json({ success: false, message: 'Judgment PDF document is required.' });
        }

        // Process Profile Photo (optional)
        let profilePhotoUrl = '';
        if (req.files && req.files['profilePhoto'] && req.files['profilePhoto'][0]) {
            const processedPhoto = await processFile(req.files['profilePhoto'][0], 'profile');
            if (processedPhoto) {
                profilePhotoUrl = processedPhoto.url || processedPhoto.base64;
            }
        } else if (req.body.profilePhotoUrl) {
            profilePhotoUrl = req.body.profilePhotoUrl;
        }

        const submission = await JudgmentSubmission.create({
            advocateName: advocateName.trim(),
            enrolmentNumber: enrolmentNumber.trim(),
            profilePhotoUrl,
            instagramId: (instagramId || '').trim(),
            linkedinUrl: (linkedinUrl || '').trim(),
            whatsappNumber: whatsappNumber.trim(),
            email: email.trim().toLowerCase(),
            twitterUrl: (twitterUrl || '').trim(),
            matter: (matter || '').trim(),
            pdfUrl,
            pdfFileName,
            pdfFileSize,
            pdfData,
            consentGiven: consentGiven === 'true' || consentGiven === true || consentGiven === '1',
            status: 'Pending'
        });

        console.log(`[Judgment Submission] ✅ New win submitted by ${submission.advocateName} (${submission.enrolmentNumber})`);

        return res.status(201).json({
            success: true,
            message: 'Your judgment win has been submitted to our editorial and intelligence desk!',
            submissionId: submission._id
        });
    } catch (error) {
        console.error('[Judgment Submission Error]:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit judgment. Please try again.'
        });
    }
}

/**
 * Admin Endpoint: Get all submissions with filters & live telemetry
 * GET /api/admin/judgment-submissions
 */
export async function getAllSubmissionsAdmin(req, res) {
    try {
        const { search, status, page = 1, limit = 25 } = req.query;

        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { advocateName: regex },
                { enrolmentNumber: regex },
                { email: regex },
                { whatsappNumber: regex },
                { matter: regex },
                { pdfFileName: regex }
            ];
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 25;
        const skip = (pageNum - 1) * limitNum;

        const [submissions, total, pendingCount, approvedCount, featuredCount, rejectedCount] = await Promise.all([
            JudgmentSubmission.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            JudgmentSubmission.countDocuments(query),
            JudgmentSubmission.countDocuments({ status: 'Pending' }),
            JudgmentSubmission.countDocuments({ status: 'Approved' }),
            JudgmentSubmission.countDocuments({ status: 'Featured' }),
            JudgmentSubmission.countDocuments({ status: 'Rejected' })
        ]);

        return res.json({
            success: true,
            submissions,
            stats: {
                total,
                pending: pendingCount,
                approved: approvedCount,
                featured: featuredCount,
                rejected: rejectedCount
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum) || 1
            }
        });
    } catch (error) {
        console.error('[Admin Judgment Submissions Fetch Error]:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch judgment submissions.' });
    }
}

/**
 * Admin Endpoint: Get Single Submission Details
 * GET /api/admin/judgment-submissions/:id
 */
export async function getSubmissionByIdAdmin(req, res) {
    try {
        const submission = await JudgmentSubmission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        return res.json({ success: true, submission });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Admin Endpoint: Update Submission Status & Notes
 * PATCH /api/admin/judgment-submissions/:id/status
 */
export async function updateSubmissionStatusAdmin(req, res) {
    try {
        const { status, adminNotes } = req.body;
        const updateData = {};
        if (status) updateData.status = status;
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
        updateData.reviewedAt = new Date();
        if (req.user && req.user._id) {
            updateData.reviewedBy = req.user._id;
        }

        const submission = await JudgmentSubmission.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        return res.json({ success: true, submission, message: `Status updated to ${submission.status}` });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Admin Endpoint: Delete Submission
 * DELETE /api/admin/judgment-submissions/:id
 */
export async function deleteSubmissionAdmin(req, res) {
    try {
        const submission = await JudgmentSubmission.findByIdAndDelete(req.params.id);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        return res.json({ success: true, message: 'Judgment submission deleted successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Public/Direct Endpoint: Stream Judgment PDF directly
 * GET /api/judgment-submissions/:id/view-pdf
 */
export async function streamJudgmentPdf(req, res) {
    try {
        const submission = await JudgmentSubmission.findById(req.params.id);
        if (!submission) {
            return res.status(404).send('Judgment record not found');
        }

        const safeFilename = (submission.pdfFileName || 'judgement.pdf').replace(/["\r\n]/g, '_');

        // 1. Check if file exists locally in uploads directory
        if (submission.pdfUrl && submission.pdfUrl.includes('/uploads/judgments/')) {
            const fileNamePart = path.basename(submission.pdfUrl);
            const localPath = path.join(UPLOADS_DIR, fileNamePart);
            if (fs.existsSync(localPath)) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
                return res.sendFile(localPath);
            }
        }

        // 2. Scan UPLOADS_DIR for matching timestamp/filename
        if (fs.existsSync(UPLOADS_DIR)) {
            const files = fs.readdirSync(UPLOADS_DIR);
            const matching = files.find(f => submission.pdfUrl && submission.pdfUrl.includes(f));
            if (matching) {
                const localPath = path.join(UPLOADS_DIR, matching);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
                return res.sendFile(localPath);
            }
        }

        // 3. Fallback to base64 pdfData stored directly in MongoDB
        if (submission.pdfData) {
            const base64Content = submission.pdfData.includes(';base64,')
                ? submission.pdfData.split(';base64,')[1]
                : submission.pdfData;
            const fileBuffer = Buffer.from(base64Content, 'base64');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', fileBuffer.length);
            res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
            return res.send(fileBuffer);
        }

        // 4. Redirect if external URL
        if (submission.pdfUrl) {
            return res.redirect(submission.pdfUrl);
        }

        return res.status(404).send('PDF document data not found.');
    } catch (err) {
        console.error('[Stream Judgment PDF Error]:', err);
        return res.status(500).send('Error streaming judgment PDF document.');
    }
}

