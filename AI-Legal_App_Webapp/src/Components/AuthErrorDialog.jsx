import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WifiOff, 
  Clock, 
  ServerOff, 
  UserX, 
  PhoneOff, 
  ShieldAlert, 
  MailWarning, 
  LockKeyhole, 
  FileWarning, 
  KeyRound, 
  UserMinus, 
  ShieldX, 
  UserCog, 
  X, 
  AlertTriangle 
} from 'lucide-react';

const iconMap = {
  'wifi-off': WifiOff,
  'clock': Clock,
  'server-off': ServerOff,
  'user-x': UserX,
  'phone-off': PhoneOff,
  'shield-alert': ShieldAlert,
  'mail-warning': MailWarning,
  'lock-keyhole': LockKeyhole,
  'file-warning': FileWarning,
  'key-round': KeyRound,
  'user-minus': UserMinus,
  'shield-x': ShieldX,
  'user-cog': UserCog,
  'alert-triangle': AlertTriangle
};

export default function AuthErrorDialog({ visible, details, onClose }) {
  if (!visible || !details) return null;

  const IconComponent = iconMap[details.icon] || AlertTriangle;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-sm"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl p-6 overflow-hidden z-10 flex flex-col items-center text-center"
        >
          {/* Close button in corner */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-[#F3F4F6] rounded-xl text-[#9CA3AF] hover:text-[#111827] transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Header/Icon Circle */}
          <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] border border-[#FEE2E2] flex items-center justify-center text-[#EF4444] mb-6 mt-2 shadow-inner">
            <IconComponent className="w-8 h-8 stroke-[1.8]" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight mb-3">
            {details.title}
          </h2>

          {/* Description */}
          <div className="text-sm text-[#4B5563] leading-relaxed mb-8 max-w-sm whitespace-pre-line font-normal">
            {details.description}
          </div>

          {/* Actions Footer */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {details.secondaryLabel && details.secondaryAction && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  details.secondaryAction();
                }}
                className="flex-1 order-2 sm:order-1 py-3 px-4 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-xl font-semibold transition-all shadow-sm active:scale-[0.98]"
              >
                {details.secondaryLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                details.primaryAction();
              }}
              className="flex-1 order-1 sm:order-2 py-3 px-4 bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-xl font-semibold transition-all shadow-sm active:scale-[0.98]"
            >
              {details.primaryLabel || 'OK'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
