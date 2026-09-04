import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        path: '/api/socket.io',
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        socket.on('join', async (userId) => {
            socket.join(userId.toString());
            console.log(`[Socket] User ${userId} joined room`);
            
            /* Optional: Send a login alert
            io.to(userId.toString()).emit('new_notification', {
                id: `login_${Date.now()}`,
                title: 'Connected to AI LEGAL™',
                desc: 'Real-time synchronization established.',
                type: 'success',
                time: new Date(),
                isRead: false
            }); */
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
