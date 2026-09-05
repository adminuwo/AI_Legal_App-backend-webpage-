import React, { useState, useEffect } from 'react';
import { PlusCircle, CheckCircle2, Clock, Sparkles, ShieldCheck, ArrowRight, X, Briefcase, MessageSquare, Users, Search, Gavel, Scale, FileText, Brain, ShieldAlert, Cpu, Lightbulb, Send, Lock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EnterpriseAddons = () => {
  const [addons, setAddons] = useState([
    {
      id: 'argument-builder',
      name: 'Argument Builder & Court Prep Workspace',
      desc: 'Hearing intelligence, 5-point oral submissions, opposition counter-pleas & judge profiling.',
      status: 'Available',
      icon: '🏛️',
      category: 'Advocate Practitioner Suite',
      features: ['Oral Submissions', 'Counter-Rebuttals', 'Judge Profiling']
    },
    {
      id: 'evidence-analyst',
      name: 'Evidence Analyst & Forensic Scanner',
      desc: 'OCR exhibit scanning, admissibility score dial (0-100%), witness deposition contradiction table & missing proof detector.',
      status: 'Available',
      icon: '🔍',
      category: 'Advocate Practitioner Suite',
      features: ['Sec 65B BSA OCR', 'Admissibility Gauge', 'Deposition Contradictions']
    },
    {
      id: 'contract-analyzer',
      name: 'Contract Review & Risk Audit Engine',
      desc: 'Clause risk audit cards, executive risk rating (Low/Med/High/Critical), redline replacement & compliance audit.',
      status: 'Available',
      icon: '📄',
      category: 'Advocate Practitioner Suite',
      features: ['Clause Audit', 'Redline Suggestions', 'Risk Rating Badge']
    },
    {
      id: 'case-predictor',
      name: 'Case Predictor Vector Engine',
      desc: 'Statistical success probability dial, judicial bench trend analysis, litigation duration forecast & settlement range.',
      status: 'Available',
      icon: '⚖️',
      category: 'Advocate Practitioner Suite',
      features: ['Win Probability %', 'Judicial Bench Trends', 'Settlement Range']
    },
    {
      id: 'strategy-engine',
      name: 'Litigation Strategy Engine',
      desc: 'Custom tactical litigation roadmap under BNS/CrPC/CPC, cross-examination question builder & interim relief planning.',
      status: 'Available',
      icon: '🧠',
      category: 'Advocate Practitioner Suite',
      features: ['Tactical Roadmap', 'Cross-Exam Questions', 'Interim Reliefs']
    },
    {
      id: 'client-connect',
      name: 'AI Client Connect™',
      desc: 'Automated client WhatsApp/SMS hearing reminders, legal fee follow-up drafter & client CRM status broadcasts.',
      status: 'Available',
      icon: '💬',
      category: 'Advocate Practitioner Suite',
      features: ['WhatsApp Reminders', 'Client CRM', 'Status Broadcasts']
    },
    {
      id: 'client-communication',
      name: 'AI Team Communication & Associate Manager',
      desc: 'Automated team broadcasts, internal associate case updates, WhatsApp hearing reminders & firm operations.',
      status: 'Available',
      icon: '👥',
      category: 'Law Firm Operations Suite',
      features: ['Team Broadcasts', 'WhatsApp Reminders', 'Status Broadcasts']
    },
    {
      id: 'supreme-court-api-vault',
      name: 'Advanced Supreme Court Research Vault API',
      desc: 'Unlimited Supreme Court & High Court full-text judgment search, AIR/SCC citation retrieval & ratio decidendi analysis.',
      status: 'Available',
      icon: '📚',
      category: 'Law Firm Operations Suite',
      features: ['Supreme Court & HCs', 'Ratio Decidendi', 'AIR/SCC Citations']
    }
  ]);

  const [requestNotes, setRequestNotes] = useState('');
  const [selectedAddon, setSelectedAddon] = useState(null);

  // Custom Feature Request Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({
    title: '',
    department: 'BA LLB & LLM Departments',
    priority: 'High',
    description: ''
  });

  // Sync statuses with approvedAddonsList and adminAddonRequests from localStorage
  useEffect(() => {
    const syncStatusWithAdminApprovals = () => {
      const approvedStr = localStorage.getItem('approvedAddonsList');
      const approvedList = approvedStr ? JSON.parse(approvedStr) : [];

      const pendingStr = localStorage.getItem('adminAddonRequests');
      const pendingList = pendingStr ? JSON.parse(pendingStr) : [];

      setAddons(prev => prev.map(a => {
        if (approvedList.includes(a.id)) {
          return { ...a, status: 'Active' };
        }
        const hasPending = pendingList.some(p => p.addonId === a.id && p.status === 'Pending');
        if (hasPending) {
          return { ...a, status: 'Requested' };
        }
        return a;
      }));
    };

    syncStatusWithAdminApprovals();
  }, []);

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  // Submit Standard Addon Activation Request to Super Admin Portal
  const handleRequestAddon = async () => {
    if (!selectedAddon) return;

    const requestObj = {
      _id: `addon-req-${Date.now()}`,
      addonId: selectedAddon.id,
      addonName: selectedAddon.name,
      category: selectedAddon.category,
      institutionName: 'Rani Durgavati Vishwavidyalaya (RDVV)',
      institutionEmail: 'admin@rdvv.ac.in',
      requestedBy: 'University Admin (RDVV)',
      notes: requestNotes || 'Requested for university students & faculty access.',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    // Save Request to LocalStorage for Super Admin Panel
    const existingStr = localStorage.getItem('adminAddonRequests');
    let existingList = existingStr ? JSON.parse(existingStr) : [];
    existingList.unshift(requestObj);
    localStorage.setItem('adminAddonRequests', JSON.stringify(existingList));

    // Update Local Card State
    setAddons(prev => prev.map(a => a.id === selectedAddon.id ? { ...a, status: 'Requested' } : a));

    // Backend API Call
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${getBackendUrl()}/enterprise/addons/request`, requestObj, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {}

    toast.success(`✨ Activation request for "${selectedAddon.name}" sent to Super Admin Portal & Email!`);
    setSelectedAddon(null);
    setRequestNotes('');
  };

  // Submit Custom Feature Proposal to Super Admin Portal
  const handleCustomFeatureSubmit = async (e) => {
    e.preventDefault();
    if (!customForm.title || !customForm.description) {
      toast.error('Please enter Feature Title and Requirements');
      return;
    }

    const customReqObj = {
      _id: `custom-req-${Date.now()}`,
      addonId: `custom-${Date.now()}`,
      addonName: customForm.title,
      title: `[RDVV Law University] ${customForm.title}`,
      description: `Department: ${customForm.department}\n\nRequirements:\n${customForm.description}`,
      category: 'Custom Feature Proposal',
      priority: customForm.priority,
      institutionName: 'Rani Durgavati Vishwavidyalaya (RDVV)',
      email: 'admin@rdvv.ac.in',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    // Save to adminFeatureRequests for Admin Portal
    const existingStr = localStorage.getItem('adminFeatureRequests');
    let existingList = existingStr ? JSON.parse(existingStr) : [];
    existingList.unshift(customReqObj);
    localStorage.setItem('adminFeatureRequests', JSON.stringify(existingList));

    toast.success(`✨ Proposal for "${customForm.title}" sent to Super Admin Portal & Email!`);
    setShowCustomModal(false);
    setCustomForm({
      title: '',
      department: 'BA LLB & LLM Departments',
      priority: 'High',
      description: ''
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="text-[#C8A34D]" size={24} /> Institutional Add-on Modules
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Request Advanced Advocate & Law Firm AI toolkits. Once Super Admin approves, features unlock automatically for your students.
          </p>
        </div>

        <button
          onClick={() => setShowCustomModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-black shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Lightbulb size={15} /> Propose Custom Feature
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-2xl bg-[#C8A34D]/10 border border-[#C8A34D]/30 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#C8A34D] shrink-0" />
          <span>
            <strong>💡 Simple Approval Workflow:</strong> Click <strong>"Request Activation"</strong> to send an instant message to Super Admin. Once Super Admin allows, the feature activates live on both Web and Mobile apps!
          </span>
        </div>
      </div>

      {/* Compact Add-ons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addons.map((item) => (
          <div
            key={item.id}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-2xs space-y-3 flex flex-col justify-between transition-all hover:shadow-md ${
              item.status === 'Active'
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : item.status === 'Requested'
                ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/50'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{item.icon}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    item.status === 'Active'
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                      : item.status === 'Requested'
                      ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ● {item.status === 'Active' ? 'ACTIVE' : item.status === 'Requested' ? 'PENDING APPROVAL' : 'AVAILABLE'}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-extrabold text-[#C8A34D] uppercase tracking-wider block">{item.category}</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{item.name}</h3>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>

              {/* Feature Badges */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {item.features.map((feat, fIdx) => (
                  <span key={fIdx} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-extrabold">
                    • {feat}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              {item.status === 'Active' ? (
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 text-xs font-black flex items-center justify-center gap-1.5 border border-emerald-500/30">
                  <CheckCircle2 size={15} /> Active & Unlocked for All Students
                </div>
              ) : item.status === 'Requested' ? (
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 text-xs font-black flex items-center justify-center gap-1.5 border border-amber-500/30">
                  <Clock size={15} /> Message Sent to Super Admin
                </div>
              ) : (
                <button
                  onClick={() => setSelectedAddon(item)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-black shadow-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} /> Request Activation for Institution →
                </button>
              )}
            </div>
          </div>
        ))}

        {/* COMPACT CUSTOM FEATURE PROPOSAL CARD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white shadow-lg space-y-3 flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-2xl">💡</span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30">
                PROPOSE NEW TOOL
              </span>
            </div>

            <div>
              <span className="text-[9px] font-extrabold text-[#C8A34D] uppercase tracking-wider block">CUSTOM UNIVERSITY DEVELOPMENT</span>
              <h3 className="text-sm font-black text-white leading-snug">Need a Custom AI Tool?</h3>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Have a unique law syllabus tool or moot requirement? Send your proposal directly to the Super Admin.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowCustomModal(true)}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-black shadow-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lightbulb size={14} /> Submit Custom Proposal →
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Request Activation Form */}
      {selectedAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#C8A34D]" /> Request {selectedAddon.name}
              </h3>
              <button onClick={() => setSelectedAddon(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Submitting sends an instant message to the Super Admin Portal. Once Super Admin allows, this feature activates live for all your university students across Web & Mobile apps.
            </p>

            <div className="space-y-2 text-xs">
              <label className="block font-bold uppercase tracking-wider text-slate-500">University Admin Message / Notes</label>
              <textarea
                rows={3}
                value={requestNotes}
                onChange={e => setRequestNotes(e.target.value)}
                placeholder="e.g. Please activate Evidence Analyst for our BA LLB Final Year moot court preparation..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:border-[#C8A34D]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setSelectedAddon(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestAddon}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md cursor-pointer"
              >
                Send Request to Super Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Propose Custom AI Feature */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb size={20} className="text-[#C8A34D]" /> Propose Custom AI Tool
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCustomFeatureSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Feature Title *</label>
                <input
                  type="text"
                  required
                  value={customForm.title}
                  onChange={e => setCustomForm({ ...customForm, title: e.target.value })}
                  placeholder="e.g. Bare Act Audio Explainer & Moot Evaluation System"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">Requirements & Use Case *</label>
                <textarea
                  rows={4}
                  required
                  value={customForm.description}
                  onChange={e => setCustomForm({ ...customForm, description: e.target.value })}
                  placeholder="Describe the feature requirements for your law university..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:border-[#C8A34D]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black shadow-md cursor-pointer"
                >
                  <Send size={14} /> Send Proposal to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseAddons;
