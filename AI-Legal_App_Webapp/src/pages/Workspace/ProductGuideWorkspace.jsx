import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowLeft, RefreshCw, UploadCloud, Search, FileText, 
  Trash2, Eye, RotateCw, CheckCircle2, AlertCircle, Shield, ShieldAlert,
  Database, Layers, HardDrive, FileCode, Check, X, ExternalLink, HelpCircle,
  BookOpen, Terminal, Send, MessageSquare, Lock, ChevronRight, File,
  Compass, Lightbulb, Zap, ArrowRight, CornerDownLeft, Copy
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRecoilValue } from 'recoil';
import { userData } from '../../userStore/userData';
import { isSuperAdmin } from '../../utils/isSuperAdmin';
import DeleteConfirmModal from '../../Components/DeleteConfirmModal';
import axios from 'axios';
import { API } from '../../types';
import { GuideService, QUICK_ACTIONS, APP_CONTEXTS, WEB_ROUTES_MAP } from '../../services/guideService';

export default function ProductGuideWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const recoilUserData = useRecoilValue(userData);
  const user = recoilUserData?.user || null;

  // Authorization Check
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    return (
      user.role === 'admin' ||
      user.role === 'SUPER_ADMIN' ||
      email === 'aditi@uwo24.com' ||
      email === 'admin@uwo24.com' ||
      isSuperAdmin(user)
    );
  }, [user]);

  const isKnowledgeRoute = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode');
    return mode === 'knowledge' || mode === 'rag' || mode === 'admin';
  }, [location.search]);

  // Tab Mode: 'chat' (Interactive Assistant) or 'knowledge' (Admin Calibrator)
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    return (mode === 'knowledge' || mode === 'rag' || mode === 'admin') ? 'knowledge' : 'chat';
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode');
    if (mode === 'knowledge' || mode === 'rag' || mode === 'admin') {
      setActiveWorkspaceMode('knowledge');
    } else {
      setActiveWorkspaceMode('chat');
    }
  }, [location.search]);
  const [currentContext, setCurrentContext] = useState('General');

  // State Management for Knowledge Admin
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Selected Detail Modal & Delete Confirm Modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, id: null, name: '' });

  // RAG Test Sandbox States
  const [testQuery, setTestQuery] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Interactive Product Guide Chat Messages (1:1 Mobile Welcome Message)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      sender: 'guide',
      text: `👋 Welcome to AI LEGAL™ Guide!\n\nI'm your personal AI LEGAL™ assistant.\n\nI can help you learn every feature of the application.\n\nAsk me anything related to AI LEGAL™.`,
      suggestions: [
        'How do I create a case?',
        'How do I upload evidence?',
        'Where is Draft Maker?',
        'How do reminders work?'
      ],
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatThinking, setChatThinking] = useState(false);
  const chatEndRef = useRef(null);

  // Load Documents for Admin Knowledge Calibrator
  const loadDocuments = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await axios.get(`${API}/knowledge/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) setDocuments(res.data.data.documents || []);
    } catch (err) {
      console.error('Load documents error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [isAdmin]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatThinking]);

  // Handle Drag Events for Admin Upload
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Upload Knowledge File Handler
  const handleUploadFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadStep('Uploading & Indexing...');
    try {
      const token = user?.token || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('document', selectedFile);
      await axios.post(`${API}/knowledge/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully.');
      setSelectedFile(null);
      loadDocuments();
    } catch (err) {
      toast.error('Upload failed.');
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  // Delete Knowledge File Handler
  const handleDeleteDoc = async (id) => {
    const token = user?.token || localStorage.getItem('token');
    try {
      await axios.delete(`${API}/knowledge/document/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Deleted.');
      setDocuments(prev => prev.filter(d => d._id !== id && d.id !== id));
    } catch (err) {
      toast.error('Delete failed.');
    } finally {
      setDeleteModalConfig({ isOpen: false, id: null, name: '' });
    }
  };

  // Re-index Document Handler
  const handleReindex = async (id) => {
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.post(`${API}/knowledge/reindex/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Re-indexing started.');
    } catch (err) {
      toast.error('Failed to re-index.');
    }
  };

  // RAG Search Test Handler
  const handleTestRAG = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setTestLoading(true);
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await axios.post(`${API}/knowledge/search`, { query: testQuery }, { headers: { Authorization: `Bearer ${token}` } });
      setTestResult(res.data);
    } catch (err) {
      toast.error('Search failed.');
    } finally {
      setTestLoading(false);
    }
  };

  // Interactive Product Guide Chat Submission
  const handleSendChatMessage = async (textToSubmit = null) => {
    const userText = (textToSubmit || chatInput).trim();
    if (!userText || chatThinking) return;

    const userMsg = { id: Date.now(), sender: 'user', text: userText, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatThinking(true);

    try {
      const guideRes = await GuideService.getResponse(userText, currentContext, chatMessages);
      const guideMsg = {
        id: Date.now() + 1,
        sender: 'guide',
        text: guideRes.reply,
        navRoute: guideRes.navRoute,
        navLabel: guideRes.navLabel,
        suggestions: guideRes.suggestions,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, guideMsg]);
    } catch (err) {
      console.error('Product Guide Chat Error:', err);
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'guide',
          text: "I'm sorry, I encountered an issue. Please try again later.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setChatThinking(false);
    }
  };

  // Clear Chat History
  const handleClearHistory = () => {
    setChatMessages([
      {
        id: 'welcome',
        sender: 'guide',
        text: `👋 Welcome to AI LEGAL™ Guide!\n\nI'm your personal AI LEGAL™ assistant.\n\nI can help you learn every feature of the application.\n\nAsk me anything related to AI LEGAL™.`,
        suggestions: [
          'How do I create a case?',
          'How do I upload evidence?',
          'Where is Draft Maker?',
          'How do reminders work?'
        ],
        timestamp: new Date()
      }
    ]);
    toast.success('Conversation reset.');
  };

  // Summary Metrics Calculation for Knowledge Admin
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalChunks = documents.reduce((acc, doc) => acc + (doc.totalChunks || 0), 0);
    const totalSizeBytes = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
    const storageUsed = totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

    return {
      totalDocs,
      totalChunks,
      storageUsed,
      lastUpdated: documents.length > 0
        ? new Date(documents[0].uploadDate || Date.now()).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Never'
    };
  }, [documents]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-800 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 select-none">
      {/* 1. Header Bar */}
      <header className="bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-slate-500 dark:text-zinc-400 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-200 dark:bg-zinc-700" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A34D]/10 flex items-center justify-center border border-[#C8A34D]/30 shadow-xs">
              <BookOpen className="w-5 h-5 text-[#C8A34D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📖 AI Product Guide Assistant</span>
                </h1>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded bg-[#C8A34D]/15 text-[#C8A34D] border border-[#C8A34D]/30 text-[10px] font-black uppercase tracking-wider">
                    {isSuperAdmin(user) ? 'SUPER ADMIN' : 'ADMIN'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Interactive AI coach for navigating AI LEGAL™ platform features.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Clear History Controls */}
        <div className="flex items-center gap-3">
          {activeWorkspaceMode === 'chat' && (
            <button
              onClick={handleClearHistory}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reset conversation"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}

          {isAdmin && isKnowledgeRoute && (
            <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700">
              <button
                onClick={() => setActiveWorkspaceMode('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeWorkspaceMode === 'chat'
                    ? 'bg-white dark:bg-zinc-900 text-[#C8A34D] shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>AI Guide Chat</span>
              </button>
              <button
                onClick={() => setActiveWorkspaceMode('knowledge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeWorkspaceMode === 'knowledge'
                    ? 'bg-white dark:bg-zinc-900 text-[#C8A34D] shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>RAG Knowledge Calibrator</span>
              </button>
            </div>
          )}

          {isAdmin && activeWorkspaceMode === 'knowledge' && (
            <button
              onClick={() => { setRefreshing(true); loadDocuments(); }}
              className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-[#C8A34D] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeWorkspaceMode === 'chat' ? (
          /* FULL WIDTH AI PRODUCT GUIDE WORKSPACE */
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col h-[78vh] overflow-hidden">
            
            {/* Chat Sub-Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C8A34D]" />
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-white">AI LEGAL™ Guide Assistant</span>
              </div>
            </div>

            {/* Message History Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 scroll-smooth">
              {chatMessages.map((msg, index) => {
                const isGuide = msg.sender === 'guide';
                const parsed = isGuide ? GuideService.parseStepFlow(msg.text) : null;

                return (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl w-full ${msg.sender === 'user' ? 'max-w-md' : ''}`}>
                      
                      {/* User Message Bubble */}
                      {!isGuide ? (
                        <div className="bg-[#C8A34D] text-[#111111] font-semibold p-4 rounded-2xl rounded-br-none text-sm shadow-xs ml-auto">
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      ) : (
                        /* AI Guide Response Card */
                        <div className="bg-slate-50/80 dark:bg-zinc-900/80 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4 shadow-2xs">
                          
                          {/* Intro text */}
                          {parsed && parsed.intro ? (
                            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                              {parsed.intro}
                            </p>
                          ) : (
                            <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                              {msg.text}
                            </p>
                          )}

                          {/* Step Cards Rendering if '↓' present */}
                          {parsed && parsed.steps && parsed.steps.length > 0 && (
                            <div className="space-y-2.5 pt-2">
                              {parsed.steps.map((step, idx) => (
                                <div key={idx} className="p-3 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200/70 dark:border-zinc-800 flex items-start gap-3 shadow-xs">
                                  <div className="w-6 h-6 rounded-lg bg-[#C8A34D]/15 text-[#C8A34D] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300 leading-relaxed">
                                    {step}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Tips Card */}
                          {parsed && parsed.tips && parsed.tips.length > 0 && (
                            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5" />
                                <span>Pro Tip</span>
                              </p>
                              {parsed.tips.map((tip, idx) => (
                                <p key={idx} className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                  • {tip}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Contextual Navigation Action Button */}
                          {msg.navRoute && (
                            <div className="pt-2">
                              <button
                                onClick={() => navigate(msg.navRoute)}
                                className="px-4 py-2 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer group"
                              >
                                <span>{msg.navLabel || 'Open Feature →'}</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          )}

                          {/* Dynamic Quick Action Chips inside Message */}
                          {index === 0 && (
                            <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800 space-y-2">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick Questions:</p>
                              <div className="flex flex-wrap gap-2">
                                {QUICK_ACTIONS.map((qa, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleSendChatMessage(qa.query)}
                                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-[#C8A34D]/10 hover:border-[#C8A34D] text-slate-700 dark:text-zinc-300 font-semibold rounded-xl text-xs border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer text-left"
                                  >
                                    {qa.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {chatThinking && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-2xl rounded-bl-none border border-slate-200/60 text-xs font-bold text-slate-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C8A34D]" />
                    <span>Searching AI LEGAL™ RAG Knowledge Base...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Chips Bar above Composer */}
            <div className="px-4 py-2 bg-slate-50/50 dark:bg-zinc-900/30 border-t border-slate-200/60 dark:border-zinc-800 overflow-x-auto flex items-center gap-2 no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Suggested:</span>
              {QUICK_ACTIONS.slice(0, 4).map((qa, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChatMessage(qa.query)}
                  className="px-3 py-1 bg-white dark:bg-zinc-800 hover:border-[#C8A34D] hover:text-[#C8A34D] text-slate-600 dark:text-zinc-300 font-medium rounded-lg text-xs border border-slate-200 dark:border-zinc-700 transition-colors shrink-0 cursor-pointer"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            {/* Bottom Sticky Composer Input */}
            <form onSubmit={e => { e.preventDefault(); handleSendChatMessage(); }} className="p-4 border-t border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#1E293B] flex items-center gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask AI LEGAL™ Guide..."
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:outline-none focus:border-[#C8A34D]"
              />
              <button
                type="submit"
                disabled={chatThinking || !chatInput.trim()}
                className="px-5 py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        ) : !isAdmin ? (
          /* NON-ADMIN ACCESS RESTRICTED GUARD */
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto shadow-sm my-12">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Access Restricted</h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                Only authorized administrators can manage and calibrate the AI Product Guide RAG Knowledge Base.
              </p>
            </div>
          </div>
        ) : (
          /* ADMIN RAG KNOWLEDGE CALIBRATOR WORKSPACE */
          <div className="space-y-6">
            {/* 1. Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-bold uppercase text-slate-400">Total Docs</p>
                <h3 className="text-2xl font-black">{stats.totalDocs}</h3>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-bold uppercase text-slate-400">Total Chunks</p>
                <h3 className="text-2xl font-black">{stats.totalChunks}</h3>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-bold uppercase text-slate-400">Storage Used</p>
                <h3 className="text-2xl font-black">{stats.storageUsed}</h3>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-bold uppercase text-slate-400">Last Updated</p>
                <h3 className="text-xl font-black">{stats.lastUpdated}</h3>
              </div>
            </div>

            {/* 2. Upload */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-[#C8A34D]" />
                  <span>Upload Knowledge Document</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  Ingest FAQs, User Manuals, Release Notes, or Feature Docs to calibrate AI Product Guide.
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[#C8A34D] bg-[#C8A34D]/10 scale-[0.99]'
                    : 'border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 hover:border-[#C8A34D]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.md"
                />
                <div className="w-12 h-12 rounded-2xl bg-[#C8A34D]/10 text-[#C8A34D] flex items-center justify-center mx-auto mb-3">
                  <FileCode className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drag & drop knowledge files'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">PDF, DOCX, TXT, or MD up to 25 MB</p>
              </div>

              {selectedFile && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadFile}
                    disabled={uploading}
                    className="px-6 py-2 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>{uploading ? uploadStep : 'Upload to Vector Store'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Knowledge Document List & RAG Sandbox */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active Product Guide Knowledge Assets</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Shared vector store used by Web & Mobile Product Guide</p>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#C8A34D] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Loading Product Guide Knowledge Base...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/60 dark:border-zinc-800 space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">No Knowledge Files Uploaded Yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Upload user manuals, release notes, or FAQs to calibrate the AI Product Guide.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  {documents.map((doc) => (
                    <div key={doc._id || doc.id} className="p-4 bg-white dark:bg-[#1E293B] flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">{doc.filename || doc.name}</h4>
                          <p className="text-[11px] text-slate-400 font-medium">
                            Uploaded {new Date(doc.uploadDate || Date.now()).toLocaleDateString()} • {doc.fileSize ? `${(doc.fileSize/1024).toFixed(1)} KB` : 'Standard Vector'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          title="View File Metadata"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModalConfig({ isOpen: true, id: doc._id || doc.id, name: doc.filename || doc.name })}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Interactive RAG Test Sandbox */}
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#C8A34D]" />
                    <span>Live RAG Search & Calibration Sandbox</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Test statutory / feature queries against the active Product Guide vector index.</p>
                </div>
              </div>

              <form onSubmit={handleTestRAG} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={testQuery}
                  onChange={e => setTestQuery(e.target.value)}
                  placeholder="e.g. How do I create a case workspace in My Matters?"
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#C8A34D]"
                />
                <button
                  type="submit"
                  disabled={testLoading || !testQuery.trim()}
                  className="px-6 py-3 bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Test RAG Query</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* View Document Details Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate max-w-[280px]">{selectedDoc.filename}</h3>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#C8A34D]">{selectedDoc.category || 'PRODUCT_GUIDE'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                <p className="text-[10px] text-slate-400 uppercase font-black">Status</p>
                <p className="text-slate-800 dark:text-zinc-200 mt-0.5">{selectedDoc.status || 'Active'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                <p className="text-[10px] text-slate-400 uppercase font-black">Chunks</p>
                <p className="text-slate-800 dark:text-zinc-200 mt-0.5">{selectedDoc.totalChunks || 'Auto'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { handleReindex(selectedDoc._id); setSelectedDoc(null); }}
                className="flex-1 py-3 bg-[#C8A34D] text-[#111111] font-black rounded-xl text-xs hover:bg-[#b08d3b] transition-all cursor-pointer"
              >
                Re-index Document
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-5 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, id: null, name: '' })}
        onConfirm={() => handleDeleteDoc(deleteModalConfig.id)}
        title="Delete Knowledge Document?"
        description={`Are you sure you want to permanently delete "${deleteModalConfig.name}"? This action will remove the document and all vector embeddings from the Product Guide knowledge base.`}
      />
    </div>
  );
}
