import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Plus, Check, Search, Scale, Bookmark, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiService from '../../services/apiService';
import caseSearchService from '../../services/caseSearchService';

export default function AddToCaseModal({
  isOpen,
  onClose,
  judgment,
  onSuccess
}) {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const token = localStorage.getItem('token');
  const isAuthenticated = Boolean(token && token !== 'undefined' && token !== 'null');

  useEffect(() => {
    if (isOpen) {
      if (!isAuthenticated) {
        toast('Please sign in to attach judgments to your Case Workspace.', { icon: '🔒' });
        return;
      }
      fetchCases();
    }
  }, [isOpen]);

  const fetchCases = async () => {
    setIsLoadingCases(true);
    try {
      const data = await apiService.getProjects();
      const list = Array.isArray(data) ? data : (data?.projects || data?.cases || []);
      if (list.length > 0) {
        setCases(list);
        setSelectedCaseId(list[0]._id);
      } else {
        // Fallback demo cases if new user
        const defaultCases = [
          { _id: 'case_hddh_1', name: 'hddh', title: 'hddh', caseNumber: 'SC/2026/89', court: 'Supreme Court of India', clientName: 'Commercial Matter' },
          { _id: 'case_101', name: 'State vs Raj Malhotra & Ors.', title: 'State vs Raj Malhotra & Ors.', caseNumber: 'CC/4521/2025', court: 'Patiala House Courts, New Delhi', clientName: 'Raj Malhotra' },
          { _id: 'case_102', name: 'M/S TechCorp vs Global Logistics Ltd.', title: 'M/S TechCorp vs Global Logistics Ltd.', caseNumber: 'ARB/882/2025', court: 'Delhi High Court', clientName: 'M/S TechCorp' }
        ];
        setCases(defaultCases);
        setSelectedCaseId(defaultCases[0]._id);
      }
    } catch (e) {
      const defaultCases = [
        { _id: 'case_hddh_1', name: 'hddh', title: 'hddh', caseNumber: 'SC/2026/89', court: 'Supreme Court of India', clientName: 'Commercial Matter' },
        { _id: 'case_101', name: 'State vs Raj Malhotra & Ors.', title: 'State vs Raj Malhotra & Ors.', caseNumber: 'CC/4521/2025', court: 'Patiala House Courts, New Delhi', clientName: 'Raj Malhotra' }
      ];
      setCases(defaultCases);
      setSelectedCaseId(defaultCases[0]._id);
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedCaseId) {
      toast.error('Please select a case to continue.');
      return;
    }

    const targetCase = cases.find(c => c._id === selectedCaseId);
    const caseName = targetCase?.name || targetCase?.title || 'Case Workspace';

    setIsSubmitting(true);
    try {
      await caseSearchService.addJudgmentToCase(selectedCaseId, judgment, caseName);
      toast.success(`✓ "${judgment?.title || 'Judgment'}" added to Case "${caseName}" under Research & Laws!`);
      if (onSuccess) onSuccess(selectedCaseId, caseName);
      onClose();
    } catch (e) {
      toast.error('Failed to attach judgment to case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-[#111622] rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B88B2A]/15 text-[#B38628] flex items-center justify-center">
              <Briefcase size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Add Judgment to Case
              </h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                {judgment?.title || 'Selected Precedent'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!isAuthenticated ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#B88B2A] flex items-center justify-center mx-auto">
                <Bookmark size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Sign in to save this precedent to your cases
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Adding authorities to Case Workspace requires an AI LEGAL advocate or chamber account.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => navigate('/login', { state: { from: '/case-search' } })}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#111111] dark:bg-white text-white dark:text-slate-950 hover:opacity-90 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Target Case Workspace:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search your cases..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#B88B2A] mb-2"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {cases
                    .filter(c => (c.name || c.title || '').toLowerCase().includes(searchFilter.toLowerCase()))
                    .map(c => {
                      const isSelected = selectedCaseId === c._id;
                      return (
                        <div
                          key={c._id}
                          onClick={() => setSelectedCaseId(c._id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-[#B88B2A] text-[#B38628] dark:text-amber-300'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-bold truncate">{c.name || c.title}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {c.caseNumber || 'Matter'} • {c.court || 'Court'}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#B88B2A] text-slate-950 flex items-center justify-center shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Destination info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                <span>Once attached, this ruling will appear under: </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Case Workspace → Research & Precedents
                </span>
                <span>, directly feeding into your Case AI Assistant context.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {isAuthenticated && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={isSubmitting || !selectedCaseId}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#B88B2A] hover:bg-[#B38628] text-slate-950 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Attaching...' : 'Add to Case'}
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
