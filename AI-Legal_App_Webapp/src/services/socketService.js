import { io } from 'socket.io-client';
import { API } from '../types';

let socket;

/**
 * Initializes the socket connection if it doesn't exist.
 * @param {string} token - User authentication token
 * @returns {import('socket.io-client').Socket}
 */
export const initSocket = (token) => {
    if (socket && socket.connected) return socket;

    // The API is http://localhost:8080/api, so socket is http://localhost:8080
    const socketUrl = API.replace('/api', '');

    console.log('[Socket] Initializing connection to:', socketUrl);

    socket = io(socketUrl, {
        path: '/api/socket.io',
        auth: {
            token: token
        },
        transports: ['websocket', 'polling'], // Support both for better compatibility
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 20000
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected to server with ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected from server. Reason:', reason);
    });

    socket.on('connect_error', (err) => {
        console.error('[Socket] Connection Error:', err.message);
    });

    return socket;
};

/**
 * Returns the existing socket instance.
 * @returns {import('socket.io-client').Socket | undefined}
 */
export const getSocket = () => socket;

/**
 * Disconnects the socket.
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
