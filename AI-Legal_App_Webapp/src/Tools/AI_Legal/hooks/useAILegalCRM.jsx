import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { Edit2, Plus, X, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiService } from '../../../services/apiService';
import { chatStorageService } from '../../../services/chatStorageService';
import LegalDashboard from '../components/LegalDashboard';

export const useAILegalCRM = ({
  allProjects,
  setAllProjects,
  currentProjectId,
  setCurrentProjectId,
  currentCase,
  setCurrentCase,
  currentMode,
  setCurrentMode,
  selectedLegalTool,
  setSelectedLegalTool,
  setMessages,
  inputRef,
  setInputValue,
  setIsCasePanelOpen,
  setActiveLegalToolkit,
  legalView,
  setLegalView,
  activeTool,
  setActiveTool,
  setDashboardCategory
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const legalCases = allProjects.filter(p => p.isLegalCase);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [newCaseForm, setNewCaseForm] = useState({
    clientName: '',
    caseType: '',
    otherCaseType: '',
    accused: '',
    summary: ''
  });
  const [isRenamingCase, setIsRenamingCase] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // ─── Direct Case Dashboard Route Handler ───
  useEffect(() => {
    if (location.pathname === '/dashboard/cases') {
      // Set all states atomically to prevent flash of blank/wrong content
      if (currentProjectId !== null) setCurrentProjectId(null);
      if (currentCase !== null) setCurrentCase(null);
      if (legalView !== 'DASHBOARD') setLegalView('DASHBOARD');
      if (currentMode !== 'LEGAL_TOOLKIT') setCurrentMode('LEGAL_TOOLKIT');
      if (selectedLegalTool?.id !== 'legal_my_case') {
        setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
      }
      fetchLegalCases();
    }
  }, [location.pathname]);

  const handleOpenEditModal = (c) => {
    setEditingCaseId(c._id);
    const standardTypes = ['Civil Case', 'Criminal Case', 'Divorce Case', 'Property Dispute', 'Corporate Legal', 'Consumer Court', 'Labor Dispute'];
    const isOther = c.caseType && !standardTypes.includes(c.caseType);

    setNewCaseForm({
      clientName: c.clientName || '',
      caseType: isOther ? 'Other' : (c.caseType || ''),
      otherCaseType: isOther ? c.caseType : '',
      accused: c.accused || '',
      summary: c.summary || c.caseSummary || ''
    });
    setIsNewCaseModalOpen(true);
  };

  const handleBackToDashboard = () => {
    if (location.pathname === '/dashboard/cases') return;
    // Set view to DASHBOARD first to prevent blank screen flash during navigation
    setLegalView('DASHBOARD');
    setCurrentMode('LEGAL_TOOLKIT');
    setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
    setCurrentCase(null);
    setCurrentProjectId(null);
    // setMessages([]); // REMOVED for master fix: Keep messages in state until new session loads
    navigate('/dashboard/cases', { replace: true });
  };

  const handleUseInArgument = (argument) => {
    setInputValue(argument);
    setLegalView('CHAT');
    toast.success("✅ Argument inserted into chat", {
      icon: '✍️',
      style: { borderRadius: '10px', background: '#333', color: '#fff' }
    });
    setTimeout(() => {
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleLegalPrecedentsBack = () => {
    // 1st SS (Analyzing/Results) -> 2nd SS (Select Case)
    // If we have a case selected in Precedents, just clear the case but STAY in Precedents view
    if (currentProjectId || currentCase) {
      setCurrentCase(null);
      setCurrentProjectId(null);
      setLegalView('PRECEDENTS'); // Stay here to show "Select a Case"
    } else {
      // 2nd SS (Select Case) -> 3rd SS (Main Chat)
      // If no case is selected, go back to NORMAL CHAT
      setCurrentMode('NORMAL_CHAT');
      setSelectedLegalTool(null);
      setActiveTool(null);
      setActiveLegalToolkit(false);
      // setMessages([]); // REMOVED for master fix
      if (setDashboardCategory) setDashboardCategory('business');
      navigate('/dashboard/chat/new', { replace: true });
    }
  };

  const handleDashboardBack = () => {
    // Always return directly to the main dashboard (AI tools home screen)
    setCurrentMode('NORMAL_CHAT');
    setSelectedLegalTool(null);
    setActiveTool(null);
    setActiveLegalToolkit(false);
    setCurrentCase(null);
    setCurrentProjectId(null);
    setMessages([]); // OK to clear when exiting AI Legal Toolkit entirely
    setLegalView('CHAT');
    if (setDashboardCategory) setDashboardCategory('business');
    navigate('/dashboard/chat/new', { replace: true });
  };

  const fetchLegalCases = async (force = false) => {
    if (!force && allProjects && allProjects.length > 0) {
      return;
    }
    try {
      const all = await apiService.getProjects();
      setAllProjects(all);
    } catch (err) {
      console.error("Failed to fetch legal cases:", err);
    }
  };

  useEffect(() => {
    if (currentMode === 'LEGAL_TOOLKIT' && selectedLegalTool?.id === 'legal_my_case') {
      fetchLegalCases();
    }
  }, [currentMode, selectedLegalTool?.id, setAllProjects]);

  const handleCreateNewCase = async () => {
    if (!newCaseForm.clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (newCaseForm.caseType === 'Other' && !newCaseForm.otherCaseType.trim()) {
      toast.error("Please enter the case type");
      return;
    }

    const tid = toast.loading(editingCaseId ? "Updating legal case..." : "Creating legal case...");
    setIsNewCaseModalOpen(false);
    const formSnapshot = { ...newCaseForm };
    setNewCaseForm({ clientName: '', caseType: '', otherCaseType: '', accused: '', summary: '' });

    const caseIdToEdit = editingCaseId;
    setEditingCaseId(null);

    try {
      const caseName = formSnapshot.accused
        ? `${formSnapshot.clientName} vs ${formSnapshot.accused}`
        : `${formSnapshot.clientName} Case`;
      const finalCaseType = formSnapshot.caseType === 'Other' ? formSnapshot.otherCaseType : formSnapshot.caseType;

      const payload = {
        name: caseName,
        clientName: formSnapshot.clientName,
        caseType: finalCaseType,
        accused: formSnapshot.accused,
        summary: formSnapshot.summary,
        isLegalCase: true
      };

      if (caseIdToEdit) {
        await apiService.updateProject(caseIdToEdit, payload);
        toast.success("Case updated successfully!", { id: tid });
        setAllProjects(prev =>
          prev.map(p =>
            p._id === caseIdToEdit
              ? { ...p, ...payload, updatedAt: new Date().toISOString() }
              : p
          )
        );
        if (currentCase?._id === caseIdToEdit) {
          setCurrentCase(prev => ({ ...prev, ...payload }));
        }
      } else {
        const newCase = await apiService.createProject(payload);
        const optimisticCase = {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(newCase || {}),
          isLegalCase: true,
        };
        setAllProjects(prev => [optimisticCase, ...prev]);
        toast.success("New case created! It's now at the top of your list. ✅", { id: tid });
        
        apiService.analyzeProject(newCase._id)
          .then(() => apiService.getProject(newCase._id))
          .then(analyzed => {
            if (analyzed) {
              setAllProjects(prev =>
                prev.map(p => p._id === newCase._id ? { ...p, ...analyzed } : p)
              );
            }
          })
          .catch(err => console.warn("[Case] Background analysis failed (non-critical):", err));
      }
    } catch (err) {
      console.error("[Case] Create/update failed:", err);
      const errMsg =
        err?.response?.data?.message ||
        (caseIdToEdit ? "Failed to update case. Please try again." : "Failed to create case. Please try again.");
      toast.error(errMsg, { id: tid });
      setNewCaseForm(formSnapshot);
      setIsNewCaseModalOpen(true);
    }
  };

  const handleOpenCase = async (c, isNew = false) => {
    setCurrentProjectId(c._id);
    setCurrentCase(c);
    if (c.isLegalCase) {
      setCurrentMode('LEGAL_TOOLKIT');
      setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
      setLegalView('CHAT');
      setActiveTool('legal');
      setIsCasePanelOpen(false); // Only open when user explicitly clicks the active case pill
    }
    // setMessages([]); // REMOVED for master fix: Let initChat handle clearing if session changes

    // Navigate to the dedicated case route
    if (location.pathname !== `/dashboard/cases/${c._id}`) {
      navigate(`/dashboard/cases/${c._id}`, { replace: true });
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  };

  const handleDeleteCase = async (id) => {
    if (window.confirm("Are you sure you want to delete this case? All data and history will be lost.")) {
      try {
        await apiService.deleteProject(id);
        toast.success("Case deleted");
        fetchLegalCases(true);

        if (currentProjectId === id) {
          setCurrentProjectId(null);
          setCurrentCase(null);
          setLegalView('DASHBOARD');
          navigate('/dashboard/cases', { replace: true });
        }
      } catch (err) {
        toast.error("Delete failed");
      }
    }
  };

  const handleRenameCase = async (id) => {
    if (!renameValue.trim()) {
      setIsRenamingCase(null);
      return;
    }
    try {
      await apiService.updateProject(id, { name: renameValue });
      setIsRenamingCase(null);
      fetchLegalCases(true);

      if (currentCase?._id === id) {
        setCurrentCase(prev => ({ ...prev, name: renameValue }));
      }
      toast.success("Case renamed");
    } catch (err) {
      toast.error("Rename failed");
    }
  };

  const renderCaseDashboard = () => (
    <LegalDashboard
      legalCases={legalCases}
      currentProjectId={currentProjectId}
      handleOpenCase={handleOpenCase}
      handleOpenEditModal={handleOpenEditModal}
      handleDeleteCase={handleDeleteCase}
      isRenamingCase={isRenamingCase}
      renameValue={renameValue}
      setRenameValue={setRenameValue}
      handleRenameCase={handleRenameCase}
      setIsRenamingCase={setIsRenamingCase}
      setIsNewCaseModalOpen={setIsNewCaseModalOpen}
      setEditingCaseId={setEditingCaseId}
      setNewCaseForm={setNewCaseForm}
      setActiveLegalToolkit={setActiveLegalToolkit}
      onBack={handleDashboardBack}
    />
  );

  const renderNewCaseModal = () => {
    return (
      <Transition appear show={isNewCaseModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[200000]" onClose={() => setIsNewCaseModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-8"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-8"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[32px] bg-white dark:bg-zinc-900 p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
                         {editingCaseId ? <Edit2 size={20} /> : <Plus size={20} />}
                      </div>
                      <Dialog.Title as="h3" className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                         {editingCaseId ? 'Edit Legal Case' : 'New Legal Case'}
                      </Dialog.Title>
                    </div>
                    <button onClick={() => { setIsNewCaseModalOpen(false); setEditingCaseId(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                      <X size={20} className="text-subtext" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1 whitespace-nowrap">Client Name/ Complainant <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newCaseForm.clientName}
                        onChange={e => setNewCaseForm({ ...newCaseForm, clientName: e.target.value })}
                        placeholder="Mr. A. Kumar"
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1 whitespace-nowrap">Case Type</label>
                      <div className="relative">
                        <select
                          value={newCaseForm.caseType}
                          onChange={e => {
                            const val = e.target.value;
                            setNewCaseForm({
                              ...newCaseForm,
                              caseType: val,
                              otherCaseType: val === 'Other' ? newCaseForm.otherCaseType : ''
                            });
                          }}
                          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-bold appearance-none cursor-pointer pr-10"
                        >
                          <option value="">Select Case Type</option>
                          <option value="Civil Case">Civil Case</option>
                          <option value="Criminal Case">Criminal Case</option>
                          <option value="Divorce Case">Divorce Case</option>
                          <option value="Property Dispute">Property Dispute</option>
                          <option value="Corporate Legal">Corporate Legal</option>
                          <option value="Consumer Court">Consumer Court</option>
                          <option value="Labor Dispute">Labor Dispute</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>

                      <AnimatePresence>
                        {newCaseForm.caseType === 'Other' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="space-y-2 overflow-hidden"
                          >
                            <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1 whitespace-nowrap">Enter Case Type <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              autoFocus
                              value={newCaseForm.otherCaseType}
                              onChange={e => setNewCaseForm({ ...newCaseForm, otherCaseType: e.target.value })}
                              placeholder="e.g. Intellectual Property"
                              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-bold"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1 whitespace-nowrap">Accused</label>
                      <input
                        type="text"
                        value={newCaseForm.accused}
                        onChange={e => setNewCaseForm({ ...newCaseForm, accused: e.target.value })}
                        placeholder="Mr. Ravi"
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1 whitespace-nowrap">Case Summary</label>
                      <textarea
                        rows={3}
                        value={newCaseForm.summary}
                        onChange={e => setNewCaseForm({ ...newCaseForm, summary: e.target.value })}
                        placeholder="Mr. A Kumar has give a lo Rs. 5 Lakh to Mr. Ravi on..."
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none font-medium"
                      />
                    </div>

                    <button
                      onClick={handleCreateNewCase}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95 mt-4"
                    >
                      {editingCaseId ? 'Update Case' : 'Submit'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };

  // Fetch Case Details when currentProjectId changes
  useEffect(() => {
    const fetchCaseDetails = async () => {
      if (!currentProjectId || currentProjectId === 'default' || currentProjectId === 'all') {
        if (currentCase !== null) setCurrentCase(null);
        if (currentMode !== 'LEGAL_TOOLKIT') {
          if (currentMode !== 'NORMAL_CHAT') setCurrentMode('NORMAL_CHAT');
          if (selectedLegalTool !== null) setSelectedLegalTool(null);
          if (legalView !== 'CHAT') setLegalView('CHAT');
        }
        return;
      }

      const isValidObjectId = /^[a-f\d]{24}$/i.test(currentProjectId);
      if (!isValidObjectId) {
        console.warn(`[Case] Invalid project ID format, clearing: ${currentProjectId}`);
        if (currentProjectId !== null) setCurrentProjectId(null);
        return;
      }

      if (currentCase?._id === currentProjectId) {
        if (currentCase.isLegalCase && currentMode !== 'LEGAL_TOOLKIT') {
          setCurrentMode('LEGAL_TOOLKIT');
          if (selectedLegalTool?.id !== 'legal_precedents' && selectedLegalTool?.id !== 'legal_case_law_research' && selectedLegalTool?.id !== 'legal_my_case') {
            setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
          }
          if (legalView !== 'DASHBOARD' && legalView !== 'PRECEDENTS' && legalView !== 'CHAT') setLegalView('CHAT');
        }
        return;
      }

      try {
        const response = await apiService.getProject(currentProjectId);
        if (location.pathname === '/dashboard/cases') return;

        if (response) {
          if (currentCase?._id !== response._id) setCurrentCase(response);
          if (response.isLegalCase) {
            if (currentMode !== 'LEGAL_TOOLKIT') setCurrentMode('LEGAL_TOOLKIT');
            if (selectedLegalTool?.id !== 'legal_precedents' && selectedLegalTool?.id !== 'legal_case_law_research' && selectedLegalTool?.id !== 'legal_my_case') {
              setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
            }
            if (legalView !== 'PRECEDENTS') {
              if (legalView !== 'CHAT') setLegalView('CHAT');
              if (location.pathname === '/dashboard/chat/new') {
                try {
                  const caseSessions = await chatStorageService.getSessions(currentProjectId);
                  if (Array.isArray(caseSessions) && caseSessions.length > 0) {
                    navigate(`/dashboard/chat/${caseSessions[0].sessionId}`, { replace: true });
                  }
                } catch (sessionErr) {
                  console.error("Failed to fetch case sessions:", sessionErr);
                }
              }
            }
          }
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          console.warn(`[Case] Project ${currentProjectId} not found (404). Clearing stale ID.`);
          if (currentProjectId !== null) setCurrentProjectId(null);
          if (currentCase !== null) setCurrentCase(null);
          if (currentMode !== 'NORMAL_CHAT') setCurrentMode('NORMAL_CHAT');
          
          if (location.pathname.startsWith('/dashboard/case/') || location.pathname.startsWith('/dashboard/cases/')) {
            navigate('/dashboard/cases', { replace: true });
          } else {
            const params = new URLSearchParams(window.location.search);
            if (params.has('caseId')) {
              params.delete('caseId');
              const newSearch = params.toString();
              navigate(`${location.pathname}${newSearch ? '?' + newSearch : ''}`, { replace: true });
            }
          }
        } else {
          console.error("Failed to fetch case details:", err);
        }
      }
    };
    fetchCaseDetails();
  }, [currentProjectId, location.pathname, currentMode, currentCase?._id, selectedLegalTool?.id, setCurrentCase, setCurrentMode, setSelectedLegalTool, setLegalView, navigate, setCurrentProjectId]);

  return {
    renderCaseDashboard,
    renderNewCaseModal,
    handleUseInArgument,
    legalCases,
    isRenamingCase,
    renameValue,
    setRenameValue,
    handleRenameCase,
    setIsRenamingCase,
    handleDeleteCase,
    handleBackToDashboard,
    setIsNewCaseModalOpen,
    setEditingCaseId,
    handleLegalPrecedentsBack,
    fetchLegalCases
  };
};
