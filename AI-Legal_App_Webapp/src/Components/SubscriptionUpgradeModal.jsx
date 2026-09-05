import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, X, Check, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionUpgradeModal = ({ isOpen, onClose, data }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    onClose();
    navigate('/subscription-checkout');
  };

  const title = data?.title || 'Upgrade Your Plan';
  const message = data?.message || 'You have reached your plan limit for this feature.';
  const feature = data?.feature ? data.feature.replace(/_/g, ' ').toUpperCase() : null;
  const plan = data?.plan || 'FREE';
  const used = data?.used;
  const limit = data?.limit;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            <p className="text-sm text-slate-300 mt-1">{message}</p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {feature && (
              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-sm">
                <span className="font-semibold">{feature}</span>
                {used !== undefined && limit !== undefined && limit > 0 && (
                  <span className="font-bold text-amber-700">{used} / {limit} Used</span>
                )}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Current Plan:</span>
                <span className="font-bold text-slate-900 px-2.5 py-0.5 bg-slate-200 rounded-full text-xs uppercase tracking-wider">{plan}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upgrade to an AI Legal™ Pro or Premium Plan to unlock higher monthly quotas, unlimited AI drafting, advanced precedents research, and multi-user workspace access.
              </p>
            </div>

            <div className="space-y-2 pt-1 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Instant access to higher AI credits & feature limits</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Unlimited case dossier creation & cloud storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Cancel or upgrade anytime with instant sync</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-0 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgradeClick}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <span>Upgrade Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionUpgradeModal;
