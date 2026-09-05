import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { Edit2, Plus, X, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiService } from '../../../services/apiService';
import { chatStorageService } from '../../../services/chatStorageService';
import LegalDashboard from '../components/LegalDashboard';
import CreateCaseWizardModal from '../components/CreateCaseWizardModal';
import LawFirmOnboardingView from '../../../Components/LawFirmOnboardingView';

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

  const legalCases = (allProjects || []).filter(p => p && p.isLegalCase !== false);
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

  // Law Firm Workspace State
  const [firmWorkspaces, setFirmWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      setIsLoadingWorkspaces(true);
      const res = await apiService.request('/workspaces');
      if (res && res.success && Array.isArray(res.workspaces)) {
        const firms = res.workspaces.filter(w => w.type === 'law_firm');
        setFirmWorkspaces(firms);
      }
    } catch (err) {
      console.warn('[CRM] Failed to fetch workspaces:', err);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  // ─── Direct Case Dashboard Route Handler ───
  useEffect(() => {
    if (location.pathname === '/dashboard/cases') {
      const activeRole = localStorage.getItem('user_selected_role') || 'advocate';
      if (activeRole === 'law_firm') {
        fetchWorkspaces();
      }

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
    try {
      const all = await apiService.getProjects();
      if (Array.isArray(all)) {
        setAllProjects(all);
      } else {
        setAllProjects([]);
      }
    } catch (err) {
      console.error("Failed to fetch legal cases:", err);
      setAllProjects([]);
    }
  };

  // User identity / Role change listener to prevent cross-account case retention in Recoil state
  useEffect(() => {
    const handleRoleOrWsChange = () => {
      fetchLegalCases(true);
    };
    window.addEventListener('user_role_changed', handleRoleOrWsChange);
    window.addEventListener('workspace_changed', handleRoleOrWsChange);
    return () => {
      window.removeEventListener('user_role_changed', handleRoleOrWsChange);
      window.removeEventListener('workspace_changed', handleRoleOrWsChange);
    };
  }, []);

  useEffect(() => {
    fetchLegalCases(true);
  }, [location.pathname]);

  // Automatic Window Focus Listener to ensure real-time sync with Mobile App updates
  useEffect(() => {
    const handleWindowFocus = () => {
      fetchLegalCases(true);
      const activeRole = localStorage.getItem('user_selected_role') || 'advocate';
      if (activeRole === 'law_firm') {
        fetchWorkspaces();
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  useEffect(() => {
    if (currentMode === 'LEGAL_TOOLKIT' && selectedLegalTool?.id === 'legal_my_case') {
      fetchLegalCases(true);
    }
  }, [currentMode, selectedLegalTool, setAllProjects]);

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

  const renderCaseDashboard = () => {
    return (
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
  };

  const renderNewCaseModal = () => {
    const editingCaseObj = editingCaseId 
      ? legalCases.find(c => ((c._id || c.id) === editingCaseId))
      : null;

    return (
      <CreateCaseWizardModal
        isOpen={isNewCaseModalOpen}
        initialData={editingCaseObj}
        onClose={() => {
          setIsNewCaseModalOpen(false);
          setEditingCaseId(null);
        }}
        onSuccess={(created) => {
          if (fetchLegalCases) {
            fetchLegalCases(true);
          }
          setIsNewCaseModalOpen(false);
          setEditingCaseId(null);
        }}
      />
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

      const isValidObjectId = Boolean(currentProjectId && typeof currentProjectId === 'string' && currentProjectId.trim().length > 0 && currentProjectId !== 'null' && currentProjectId !== 'undefined' && currentProjectId !== 'default' && currentProjectId !== 'new' && currentProjectId !== 'all');
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
