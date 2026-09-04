import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { getIO } from '../utils/socket.js';
import { uploadToGCS, gcsFilename } from '../services/gcs.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

// --- CHAT CONTROLLERS ---

// @desc    Get all chats for the authenticated user
// @route   GET /api/chats
// @access  Private
export const getChats = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;

        const chats = await Chat.find({ users: { $elemMatch: { $eq: userId } } })
            .populate('users', '-password')
            .populate('groupAdmin', '-password')
            .populate({
                path: 'latestMessage',
                populate: {
                    path: 'sender',
                    select: 'name email avatar'
                }
            })
            .sort({ updatedAt: -1 });

        res.status(200).json(chats);
    } catch (error) {
        next(error);
    }
};

// @desc    Fetch or create a 1-on-1 chat room
// @route   POST /api/chats
// @access  Private
export const accessChat = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const currentUserId = req.user.id || req.user._id;

        if (!userId) {
            return res.status(400).json({ error: 'UserId parameter is required' });
        }

        // Find existing 1-on-1 chat
        let existingChat = await Chat.findOne({
            isGroupChat: false,
            users: { $all: [currentUserId, userId] }
        })
        .populate('users', '-password')
        .populate({
            path: 'latestMessage',
            populate: {
                path: 'sender',
                select: 'name email avatar'
            }
        });

        if (existingChat) {
            return res.status(200).json(existingChat);
        }

        // Create new 1-on-1 chat
        const newChatData = {
            chatName: 'sender',
            isGroupChat: false,
            users: [currentUserId, userId]
        };

        const createdChat = await Chat.create(newChatData);
        const fullChat = await Chat.findById(createdChat._id).populate('users', '-password');

        res.status(201).json(fullChat);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a group chat room
// @route   POST /api/chats/group
// @access  Private
export const createGroupChat = async (req, res, next) => {
    try {
        const { name, users: userIds } = req.body;
        const currentUserId = req.user.id || req.user._id;

        if (!name || !userIds) {
            return res.status(400).json({ error: 'Group name and users list are required' });
        }

        let parsedUsers = [];
        try {
            parsedUsers = typeof userIds === 'string' ? JSON.parse(userIds) : userIds;
        } catch (e) {
            parsedUsers = userIds;
        }

        if (parsedUsers.length < 2) {
            return res.status(400).json({ error: 'At least 2 members are required to form a group chat.' });
        }

        // Add current user to group if not already present
        if (!parsedUsers.includes(currentUserId)) {
            parsedUsers.push(currentUserId);
        }

        const newGroup = await Chat.create({
            chatName: name,
            isGroupChat: true,
            users: parsedUsers,
            groupAdmin: currentUserId
        });

        const fullGroup = await Chat.findById(newGroup._id)
            .populate('users', '-password')
            .populate('groupAdmin', '-password');

        res.status(201).json(fullGroup);
    } catch (error) {
        next(error);
    }
};

// @desc    Rename a group chat
// @route   PUT /api/chats/rename
// @access  Private
export const renameGroup = async (req, res, next) => {
    try {
        const { chatId, chatName } = req.body;

        if (!chatId || !chatName) {
            return res.status(400).json({ error: 'Chat ID and new name are required' });
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { chatName },
            { new: true }
        )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

        if (!updatedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.status(200).json(updatedChat);
    } catch (error) {
        next(error);
    }
};

// @desc    Add member to group chat
// @route   PUT /api/chats/groupadd
// @access  Private
export const addToGroup = async (req, res, next) => {
    try {
        const { chatId, userId } = req.body;

        if (!chatId || !userId) {
            return res.status(400).json({ error: 'Chat ID and User ID are required' });
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $addToSet: { users: userId } },
            { new: true }
        )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

        if (!updatedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.status(200).json(updatedChat);
    } catch (error) {
        next(error);
    }
};

// @desc    Remove member from group chat
// @route   PUT /api/chats/groupremove
// @access  Private
export const removeFromGroup = async (req, res, next) => {
    try {
        const { chatId, userId } = req.body;

        if (!chatId || !userId) {
            return res.status(400).json({ error: 'Chat ID and User ID are required' });
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $pull: { users: userId } },
            { new: true }
        )
        .populate('users', '-password')
        .populate('groupAdmin', '-password');

        if (!updatedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.status(200).json(updatedChat);
    } catch (error) {
        next(error);
    }
};

// @desc    Get list of members in a group
// @route   GET /api/chats/:chatId/members
// @access  Private
export const getGroupMembers = async (req, res, next) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId).populate('users', 'name email avatar role');

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.status(200).json(chat.users);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a chat session and its messages
// @route   DELETE /api/chats/:chatId
// @access  Private
export const deleteChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const currentUserId = req.user.id || req.user._id;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Verify membership
        if (!chat.users.includes(currentUserId)) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this chat.' });
        }

        // Delete all messages in the chat
        await Message.deleteMany({ chat: chatId });
        // Delete the chat itself
        await Chat.findByIdAndDelete(chatId);

        res.status(200).json({ success: true, message: 'Chat session and history deleted successfully' });
    } catch (error) {
        next(error);
    }
};


// --- MESSAGE CONTROLLERS ---

// @desc    Get all messages for a specific chat room
// @route   GET /api/messages/:chatId
// @access  Private
export const getMessages = async (req, res, next) => {
    try {
        const { chatId } = req.params;

        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'name email avatar')
            .populate('chat')
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};

// @desc    Send a text message in a chat room
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
    try {
        const { chatId, content, type } = req.body;
        const currentUserId = req.user.id || req.user._id;

        if (!chatId || !content) {
            return res.status(400).json({ error: 'ChatId and message content are required' });
        }

        // Create message
        let message = await Message.create({
            sender: currentUserId,
            content: content.trim(),
            type: type || 'text',
            chat: chatId,
            readBy: [currentUserId]
        });

        // Update latestMessage in Chat
        await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

        // Populate sender and chat
        message = await message.populate('sender', 'name email avatar');
        message = await message.populate({
            path: 'chat',
            populate: {
                path: 'users',
                select: 'name email avatar'
            }
        });

        // Broadcast to other members via Socket.io
        try {
            const io = getIO();
            if (io && message.chat && Array.isArray(message.chat.users)) {
                message.chat.users.forEach(member => {
                    const memberIdStr = member._id.toString();
                    if (memberIdStr !== currentUserId.toString()) {
                        io.to(memberIdStr).emit('message:receive', message);
                    }
                });
            }
        } catch (socketErr) {
            console.error('[Socket] Group message broadcast failed:', socketErr.message);
        }

        res.status(201).json(message);
    } catch (error) {
        next(error);
    }
};

// @desc    Upload media / file message
// @route   POST /api/messages/media
// @access  Private
export const sendMediaMessage = async (req, res, next) => {
    try {
        const { chatId, type } = req.body;
        const currentUserId = req.user.id || req.user._id;

        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No attachment file uploaded' });
        }

        let mediaUrl = null;

        // Try GCS
        try {
            const ext = req.file.originalname.split('.').pop() || 'png';
            const gcsResult = await uploadToGCS(req.file.buffer, {
                folder: 'chat_attachments',
                filename: gcsFilename(`chat_${Date.now()}`, ext),
                mimeType: req.file.mimetype,
            });
            mediaUrl = gcsResult.publicUrl;
        } catch (gcsError) {
            console.warn('[GCS] Chat media GCS upload failed, falling back to Cloudinary:', gcsError.message);
            // Fallback to Cloudinary
            try {
                const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
                    folder: 'chat_attachments',
                    public_id: `chat_${Date.now()}`,
                    resource_type: 'image',
                });
                mediaUrl = cloudinaryResult.secure_url || cloudinaryResult.url;
            } catch (cloudinaryError) {
                console.error('[CLOUDINARY] Chat media upload fallback failed:', cloudinaryError.message);
                return res.status(500).json({ error: 'Failed to upload attachment file' });
            }
        }

        // Create media message
        let message = await Message.create({
            sender: currentUserId,
            content: mediaUrl,
            type: type || 'image',
            chat: chatId,
            readBy: [currentUserId]
        });

        // Update latestMessage in Chat
        await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

        // Populate sender and chat
        message = await message.populate('sender', 'name email avatar');
        message = await message.populate({
            path: 'chat',
            populate: {
                path: 'users',
                select: 'name email avatar'
            }
        });

        // Broadcast to other members via Socket.io
        try {
            const io = getIO();
            if (io && message.chat && Array.isArray(message.chat.users)) {
                message.chat.users.forEach(member => {
                    const memberIdStr = member._id.toString();
                    if (memberIdStr !== currentUserId.toString()) {
                        io.to(memberIdStr).emit('message:receive', message);
                    }
                });
            }
        } catch (socketErr) {
            console.error('[Socket] Group media message broadcast failed:', socketErr.message);
        }

        res.status(201).json(message);
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all messages in a chat room as read
// @route   PUT /api/messages/:chatId/seen
// @access  Private
export const markAsSeen = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const currentUserId = req.user.id || req.user._id;

        await Message.updateMany(
            { chat: chatId, sender: { $ne: currentUserId }, readBy: { $ne: currentUserId } },
            { $addToSet: { readBy: currentUserId } }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};
