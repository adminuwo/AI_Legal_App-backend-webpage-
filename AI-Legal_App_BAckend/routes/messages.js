import express from 'express';
import { verifyToken } from '../middleware/authorization.js';
import * as chatRoomController from '../controllers/chatRoom.controller.js';
import uploadMiddleware from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/:chatId', verifyToken, chatRoomController.getMessages);
router.post('/', verifyToken, chatRoomController.sendMessage);
router.post('/media', verifyToken, uploadMiddleware, chatRoomController.sendMediaMessage);
router.put('/:chatId/seen', verifyToken, chatRoomController.markAsSeen);

export default router;
