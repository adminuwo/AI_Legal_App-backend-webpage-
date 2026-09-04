import express from 'express';
import { verifyToken } from '../middleware/authorization.js';
import * as chatRoomController from '../controllers/chatRoom.controller.js';

const router = express.Router();

router.get('/', verifyToken, chatRoomController.getChats);
router.post('/', verifyToken, chatRoomController.accessChat);
router.post('/group', verifyToken, chatRoomController.createGroupChat);
router.put('/rename', verifyToken, chatRoomController.renameGroup);
router.put('/groupadd', verifyToken, chatRoomController.addToGroup);
router.put('/groupremove', verifyToken, chatRoomController.removeFromGroup);
router.get('/:chatId/members', verifyToken, chatRoomController.getGroupMembers);
router.delete('/:chatId', verifyToken, chatRoomController.deleteChat);

export default router;
