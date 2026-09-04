import express from 'express';
import * as knowledgeController from '../controllers/knowledge.controller.js';
import uploadMiddleware from '../middleware/upload.middleware.js';
import { verifyToken, isAdmin } from '../middleware/authorization.js';

const router = express.Router();

router.post('/upload', verifyToken, isAdmin, uploadMiddleware, knowledgeController.uploadDocument);
router.post('/upload-url', verifyToken, isAdmin, knowledgeController.uploadUrl);
router.get('/documents', verifyToken, isAdmin, knowledgeController.getDocuments);
router.get('/list', verifyToken, isAdmin, knowledgeController.getKnowledgeList);
router.post('/reindex/:id', verifyToken, isAdmin, knowledgeController.reindexDocument);
router.get('/download/:id', verifyToken, knowledgeController.downloadDocument);
router.delete('/:id', verifyToken, isAdmin, knowledgeController.deleteDocument);
router.delete('/delete/:id', verifyToken, isAdmin, knowledgeController.deleteDocument);
router.post('/test-query', verifyToken, isAdmin, knowledgeController.testRagQuery);
router.post('/query-guide', verifyToken, knowledgeController.queryProductGuide);

// Knowledge Source (Website) Management
router.get('/sources', verifyToken, isAdmin, knowledgeController.getKnowledgeSources);
router.post('/recrawl', verifyToken, isAdmin, knowledgeController.recrawlSource);
router.post('/recrawl/:id', verifyToken, isAdmin, (req, res) => {
    req.body.id = req.params.id;
    knowledgeController.recrawlSource(req, res);
});
router.patch('/sources/:id', verifyToken, isAdmin, knowledgeController.updateSourceStatus);
router.delete('/sources/:id', verifyToken, isAdmin, knowledgeController.deleteKnowledgeSource);

export default router;
