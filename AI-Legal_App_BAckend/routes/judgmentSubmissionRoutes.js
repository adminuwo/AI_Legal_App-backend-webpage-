import express from 'express';
import multer from 'multer';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import {
    submitJudgment,
    getAllSubmissionsAdmin,
    getSubmissionByIdAdmin,
    updateSubmissionStatusAdmin,
    deleteSubmissionAdmin,
    streamJudgmentPdf
} from '../controllers/judgmentSubmissionController.js';

const router = express.Router();

// Configure Multer memory storage (files are safely processed in memory & saved locally or Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit as requested
});

// Upload fields for profile photo and judgment PDF
const uploadFields = upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'judgementPdf', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]);

// ─── Public Submission & Direct PDF Streaming Routes ─────────────────────────
router.post('/', uploadFields, submitJudgment);
router.post('/submit', uploadFields, submitJudgment);
router.get('/:id/view-pdf', streamJudgmentPdf);
router.get('/view-pdf/:id', streamJudgmentPdf);

// ─── Super Admin Portal Routes ───────────────────────────────────────────────
router.get('/', verifyToken, isAdmin, getAllSubmissionsAdmin);
router.get('/all', verifyToken, isAdmin, getAllSubmissionsAdmin);
router.get('/:id', verifyToken, isAdmin, getSubmissionByIdAdmin);
router.patch('/:id/status', verifyToken, isAdmin, updateSubmissionStatusAdmin);
router.delete('/:id', verifyToken, isAdmin, deleteSubmissionAdmin);

export default router;
