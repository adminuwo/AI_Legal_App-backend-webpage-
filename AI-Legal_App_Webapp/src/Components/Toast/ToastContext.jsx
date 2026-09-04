import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const Toast = ({ id, message, type, onClose }) => {
    const isSuccess = type === 'success';
    const isError = type === 'error';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`pointer-events-auto w-full max-w-sm p-4 rounded-2xl border shadow-xl backdrop-blur-sm flex items-start gap-4 ${isSuccess ? 'bg-card border-green-100' :
                isError ? 'bg-card border-red-100' :
                    'bg-card border-blue-100'
                }`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSuccess ? 'bg-green-50 text-green-600' :
                isError ? 'bg-red-50 text-red-600' :
                    'bg-blue-50 text-blue-600'
                }`}>
                {isSuccess ? <CheckCircle className="w-5 h-5" /> :
                    isError ? <AlertCircle className="w-5 h-5" /> :
                        <Info className="w-5 h-5" />}
            </div>

            <div className="flex-1 pt-0.5">
                <h4 className={`text-sm font-bold ${isSuccess ? 'text-green-900' :
                    isError ? 'text-red-900' :
                        'text-blue-900'
                    }`}>
                    {isSuccess ? 'Success' : isError ? 'Error' : 'Info'}
                </h4>
                <p className="text-sm text-subtext mt-1 leading-relaxed">
                    {message}
                </p>
            </div>

            <button
                onClick={() => onClose(id)}
                className="p-1 hover:bg-secondary rounded-lg text-subtext hover:text-maintext transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    // Helper functions for cleaner API
    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        info: (message, duration) => addToast(message, 'info', duration),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <Toast key={t.id} {...t} onClose={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
