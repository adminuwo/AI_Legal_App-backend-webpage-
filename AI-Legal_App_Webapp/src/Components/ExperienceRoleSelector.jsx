import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, GraduationCap, Building2, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useRecoilState } from 'recoil';
import { selectedRoleState } from '../userStore/userData';

export const ROLES = [
  {
    id: 'advocate',
    label: 'Advocate',
    subtitle: 'Litigation Workspace & AI Tools',
    icon: Shield,
    badge: 'Standard',
    color: 'from-amber-500/20 to-yellow-600/10 border-amber-500/40 text-amber-400',
    activeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/50',
  },
  {
    id: 'student',
    label: 'Student',
    subtitle: 'Tutor, Exam Prep & Case Summarizer',
    icon: GraduationCap,
    badge: 'Learning',
    color: 'from-indigo-500/20 to-purple-600/10 border-indigo-500/40 text-indigo-400',
    activeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/50',
  },
  {
    id: 'law_firm',
    label: 'Law Firm',
    subtitle: 'Enterprise Team & Multi-User Seat Hub',
    icon: Building2,
    badge: 'Enterprise',
    color: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/40 text-emerald-400',
    activeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50',
  },
];

export default function ExperienceRoleSelector({ compact = false }) {
  const [selectedRole, setSelectedRole] = useRecoilState(selectedRoleState);
  const [isOpen, setIsOpen] = useState(false);

  const currentRoleObj = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const IconComponent = currentRoleObj.icon;

  const handleSelectRole = (roleId) => {
    setSelectedRole(roleId);
    try {
      localStorage.setItem('user_selected_role', roleId);
    } catch (e) {
      console.warn('Failed to save role to localStorage', e);
    }
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative inline-block text-left">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-amber-400 font-medium text-xs shadow-md transition-all duration-200 cursor-pointer"
        >
          <IconComponent className="w-3.5 h-3.5" />
          <span>{currentRoleObj.label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 bottom-full mb-2 w-64 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl z-[100] p-1.5"
            >
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-800/80 mb-1">
                Select Active Role
              </div>
              {ROLES.map((r) => {
                const ItemIcon = r.icon;
                const isSelected = r.id === selectedRole;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all text-xs ${
                      isSelected ? 'bg-amber-500/15 text-amber-300 font-semibold' : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{r.label}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                            {r.badge}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Workspace Experience Role</h3>
            <p className="text-xs text-slate-400">Switch dashboards and specialized AI tools instantly</p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Active: <strong className="font-semibold text-white">{currentRoleObj.label}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {ROLES.map((r) => {
          const ItemIcon = r.icon;
          const isSelected = r.id === selectedRole;
          return (
            <button
              key={r.id}
              onClick={() => handleSelectRole(r.id)}
              className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? r.activeBg + ' shadow-lg ring-1 ring-amber-500/30'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 text-slate-400'}`}>
                <ItemIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {r.label}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800/90 text-slate-400 font-mono">
                    {r.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{r.subtitle}</p>
              </div>
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
