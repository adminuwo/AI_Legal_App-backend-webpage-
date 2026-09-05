import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, GraduationCap, Building2, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { useRecoilState } from 'recoil';
import { selectedRoleState } from '../userStore/userData';
import apiService from '../services/apiService';

export const ROLES = [
  {
    id: 'advocate',
    label: 'Advocate',
    subtitle: 'Complete litigation workspace with all legal tools',
    icon: Shield,
    badge: 'Standard',
  },
  {
    id: 'student',
    label: 'Student',
    subtitle: 'Learning-focused workspace & tutor',
    icon: GraduationCap,
    badge: 'Learning',
  },
  {
    id: 'law_firm',
    label: 'Law Firm',
    subtitle: 'Enterprise & multi-lawyer firm workspace',
    icon: Building2,
    badge: 'Enterprise',
  },
];

export default function ExperienceRoleSelector({ compact = false }) {
  const [selectedRole, setSelectedRole] = useRecoilState(selectedRoleState);
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  const activeWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID');

  // Fetch workspaces from API
  const fetchWorkspaces = async () => {
    try {
      setIsLoadingWorkspaces(true);
      const res = await apiService.request('/workspaces');
      const wsData = res?.data?.workspaces || res?.workspaces || res?.data || [];
      if (Array.isArray(wsData)) {
        setWorkspaces(wsData);
      }
    } catch (err) {
      console.warn('[ExperienceRoleSelector] Failed to fetch workspaces:', err);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchWorkspaces();
    }
  }, [isOpen]);

  // Filter ONLY Law Firm workspaces for Section 1
  const availableFirmWorkspaces = workspaces.filter(
    (ws) => (ws.type === 'law_firm' || ws.type === 'firm' || ws.type === 'enterprise' || ws.isFirm) && ws.type !== 'personal'
  );

  // Compute Active Firm Workspace object
  const activeFirmWs = availableFirmWorkspaces.find((w) => (w.id || w._id) === activeWsId) || availableFirmWorkspaces[0];

  // Compute Display Title and Icon for Trigger Button
  let displayTitle = 'Advocate';
  let DisplayIcon = Shield;

  if (selectedRole === 'student') {
    displayTitle = 'Student';
    DisplayIcon = GraduationCap;
  } else if (selectedRole === 'advocate' || selectedRole === 'personal' || selectedRole === 'individual') {
    displayTitle = 'Advocate';
    DisplayIcon = Shield;
  } else if (selectedRole === 'law_firm') {
    displayTitle = activeFirmWs?.name || 'Law Firm';
    DisplayIcon = Building2;
  }

  // Handle click on specific Firm Workspace under AVAILABLE WORKSPACES
  const handleSelectFirmWorkspace = (ws) => {
    const wsId = ws.id || ws._id;
    localStorage.setItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID', wsId);
    localStorage.setItem('user_selected_role', 'law_firm');
    setSelectedRole('law_firm');
    localStorage.removeItem('aisa_current_case');
    localStorage.removeItem('aisa_active_project_id');

    window.dispatchEvent(new CustomEvent('user_role_changed', { detail: { role: 'law_firm', workspaceId: wsId } }));
    window.dispatchEvent(new CustomEvent('workspace_changed', { detail: { workspaceId: wsId } }));
    setIsOpen(false);
  };

  // Handle click on Practice Experience Options
  const handleSelectPracticeRole = (roleId) => {
    setSelectedRole(roleId);
    localStorage.setItem('user_selected_role', roleId);

    let targetWsId = 'personal_practice';
    if (roleId === 'law_firm') {
      if (availableFirmWorkspaces.length > 0) {
        targetWsId = availableFirmWorkspaces[0].id || availableFirmWorkspaces[0]._id;
      } else {
        targetWsId = activeWsId || 'firm_abc_workspace';
      }
    }
    localStorage.setItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID', targetWsId);
    localStorage.removeItem('aisa_current_case');
    localStorage.removeItem('aisa_active_project_id');

    window.dispatchEvent(new CustomEvent('user_role_changed', { detail: { role: roleId, workspaceId: targetWsId } }));
    window.dispatchEvent(new CustomEvent('workspace_changed', { detail: { workspaceId: targetWsId } }));
    setIsOpen(false);
  };

  const modalPortal = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[99999] flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 max-h-[85vh] flex flex-col text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Choose Workspace
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Select where you want to work. Switching workspace updates your cases, AI context & team.
            </p>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-1">
              {/* 1. AVAILABLE WORKSPACES SECTION */}
              <div>
                <div className="text-[11px] font-extrabold text-[#C8A34D] tracking-wider uppercase mb-2">
                  AVAILABLE WORKSPACES {availableFirmWorkspaces.length > 0 ? `(${availableFirmWorkspaces.length})` : ''}
                </div>

                {isLoadingWorkspaces ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-400 animate-pulse">
                    Loading available workspaces...
                  </div>
                ) : availableFirmWorkspaces.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs">
                    <Building2 className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span>No Law Firm workspaces available.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableFirmWorkspaces.map((ws) => {
                      const wsId = ws.id || ws._id;
                      const isSelected = selectedRole === 'law_firm' && activeWsId === wsId;
                      return (
                        <button
                          key={wsId}
                          onClick={() => handleSelectFirmWorkspace(ws)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FEF3C7] dark:bg-amber-500/15 border-[#C8A34D] text-[#92400E] dark:text-amber-300 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-[#C8A34D]/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-[#C8A34D]/20 text-[#C8A34D]' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-extrabold truncate ${isSelected ? 'text-[#92400E] dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                                  {ws.name}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isSelected ? 'bg-[#C8A34D] text-white' : 'bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30'}`}>
                                  {ws.badge || 'Law Firm'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                Role: {ws.role || 'Managing Partner'}{ws.casesCount !== undefined ? ` • ${ws.casesCount} Cases` : ''}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-[#C8A34D] shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. PRACTICE EXPERIENCE SECTION */}
              <div>
                <div className="text-[11px] font-extrabold text-[#C8A34D] tracking-wider uppercase mt-4 mb-2">
                  PRACTICE EXPERIENCE
                </div>
                <div className="space-y-2">
                  {ROLES.map((roleItem) => {
                    const isAdvocateRole = roleItem.id === 'advocate' && (selectedRole === 'advocate' || selectedRole === 'personal' || selectedRole === 'individual');
                    const isStudentRole = roleItem.id === 'student' && selectedRole === 'student';
                    const isFirmRole = roleItem.id === 'law_firm' && selectedRole === 'law_firm';
                    const isSelected = isAdvocateRole || isStudentRole || isFirmRole;
                    const ItemIcon = roleItem.icon;

                    return (
                      <button
                        key={roleItem.id}
                        onClick={() => handleSelectPracticeRole(roleItem.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FEF3C7] dark:bg-amber-500/15 border-[#C8A34D] text-[#92400E] dark:text-amber-300 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-[#C8A34D]/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-[#C8A34D]/20 text-[#C8A34D]' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            <ItemIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <span className={`text-sm font-extrabold truncate ${isSelected ? 'text-[#92400E] dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                              {roleItem.label}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {roleItem.subtitle}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-[#C8A34D] shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FEF3C7] dark:bg-amber-500/15 hover:bg-[#FDE68A] dark:hover:bg-amber-500/25 border border-[#C8A34D] text-[#92400E] dark:text-amber-300 font-bold text-xs shadow-xs transition-all duration-200 cursor-pointer max-w-[200px]"
      >
        <DisplayIcon className="w-3.5 h-3.5 text-[#C8A34D] shrink-0" />
        <span className="truncate">{displayTitle}</span>
        <ChevronDown className="w-3 h-3 text-[#C8A34D] shrink-0 ml-0.5" />
      </button>

      {modalPortal}
    </>
  );
}

