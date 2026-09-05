import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        path: '/api/socket.io',
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // BSA-008: Socket.IO Handshake JWT Authentication Middleware
    io.use((socket, next) => {
        try {
            const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
            if (!rawToken) {
                return next(new Error('Authentication token required for Socket.IO'));
            }
            const tokenStr = rawToken.replace('Bearer ', '').trim();
            const tokenSecret = process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'secret';
            const decoded = jwt.verify(tokenStr, tokenSecret);
            socket.user = decoded;
            next();
        } catch (err) {
            console.warn('[Socket] Connection rejected - Authentication failed:', err.message);
            return next(new Error('Invalid or expired socket token'));
        }
    });

    io.on('connection', async (socket) => {
        const authenticatedUserId = socket.user?.id || socket.user?._id;
        console.log(`[Socket] Authenticated client connected: ${socket.id} (User: ${authenticatedUserId})`);

        if (authenticatedUserId) {
            socket.join(authenticatedUserId.toString());
            
            // Join specific session room if session exists for token
            try {
                const Session = (await import('../models/Session.js')).default;
                const tokenStr = (socket.handshake.auth?.token || socket.handshake.headers?.authorization || '').replace('Bearer ', '').trim();
                if (tokenStr) {
                    const session = await Session.findOne({ userId: authenticatedUserId, token: tokenStr, isActive: true });
                    if (session) {
                        socket.join(`session_${session._id}`);
                    }
                }
            } catch (e) {}
        }

        socket.on('join', async (userId) => {
            if (String(userId) === String(authenticatedUserId)) {
                socket.join(authenticatedUserId.toString());
            }
        });
            
        socket.on('friend_typing_start', ({ senderId, receiverId }) => {
            if (receiverId) {
                io.to(receiverId.toString()).emit('friend_typing_start', { senderId });
            }
        });

        socket.on('friend_typing_end', ({ senderId, receiverId }) => {
            if (receiverId) {
                io.to(receiverId.toString()).emit('friend_typing_end', { senderId });
            }
        });

        socket.on('chat:join', (chatId) => {
            if (chatId) {
                socket.join(chatId.toString());
                console.log(`[Socket] User joined chat room: ${chatId}`);
            }
        });

        socket.on('chat:leave', (chatId) => {
            if (chatId) {
                socket.leave(chatId.toString());
                console.log(`[Socket] User left chat room: ${chatId}`);
            }
        });

        socket.on('typing:start', ({ chatId, userId }) => {
            if (chatId && userId) {
                socket.to(chatId.toString()).emit('typing:start', { chatId, userId });
            }
        });

        socket.on('typing:end', ({ chatId, userId }) => {
            if (chatId && userId) {
                socket.to(chatId.toString()).emit('typing:end', { chatId, userId });
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const notifyUser = (userId, notification) => {
    if (io) {
        io.to(userId.toString()).emit('new_notification', notification);
    }
};
