import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowLeft, UserPlus, Briefcase, ShieldCheck, Layers, 
  Sparkles, MessageSquare, Send, CheckCircle2, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../../services/apiService';

const ROLES_INFO = {
  'Managing Partner': 'Executive leadership, full firm oversight and policy management.',
  'Senior Advocate': 'Senior counsel leading high-stakes litigation & strategy.',
  'Partner': 'Equity/Salaried partner managing department cases & clients.',
  'Associate Advocate': 'Handles active litigation, drafting, and client representation.',
  'Junior Advocate': 'Handles drafting, court hearings, and legal research.',
  'Legal Consultant': 'Specialist providing expert legal opinions & strategy.',
  'Legal Researcher': 'Performs case law research, precedent analysis, and drafting support.',
  'Paralegal': 'Assists with file management, compliance, and documentation.',
  'Evidence Clerk': 'Manages document indexing, OCR tags, and physical evidence records.',
  'Court Clerk': 'Manages court filings, hearing dates, and registry follow-ups.',
  'Legal Intern': 'Trainee assisting with research, summaries, and observation.',
  'Admin Staff': 'Manages office operations, scheduling, and firm communication.',
  'Accounts': 'Handles billing, retainer invoices, and fee records.',
  'Custom Role': 'Custom defined firm role and responsibilities.'
};

const PERMISSIONS_INFO = {
  'View Only': 'View Only: Can view assigned files & dockets; cannot edit or upload.',
  'Standard Member': 'Standard Member: Can draft, view, and comment on assigned firm matters.',
  'Case Editor': 'Case Editor: Full editing rights for case briefs, evidence, and documents.',
  'Manager': 'Manager: Department-wide management, case assignment, and review permissions.',
  'Administrator': 'Administrator: Full firm workspace ownership, RBAC permissions, and billing control.'
};

const DEPARTMENTS_LIST = [
  'Civil Litigation',
  'Criminal Litigation',
  'Corporate Law',
  'Family Law',
  'Taxation',
  'Labour Law',
  'Property Law',
  'IPR',
  'Arbitration',
  'General Practice',
  'Custom'
];

const ALL_MODULES = [
  'Firm Dashboard',
  'Cases',
  'Documents',
  'Evidence',
  'Tasks',
  'Hearings',
  'Calendar',
  'Research',
  'AI Assistant',
  'Reports',
  'Billing',
  'Client CRM'
];

const DEFAULT_SELECTED_MODULES = [
  'Firm Dashboard',
  'Cases',
  'Documents',
  'Evidence',
  'Tasks',
  'Hearings',
  'Research',
  'AI Assistant'
];

export const InviteTeamMemberModal = ({ isOpen, onClose, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [barCouncilNo, setBarCouncilNo] = useState('');
  const [stateBarCouncil, setStateBarCouncil] = useState('Delhi Bar Council');
  
  const [role, setRole] = useState('Junior Advocate');
  const [department, setDepartment] = useState('Civil Litigation');
  const [permission, setPermission] = useState('Standard Member');
  
  const [selectedModules, setSelectedModules] = useState(DEFAULT_SELECTED_MODULES);
  const [personalMessage, setPersonalMessage] = useState(
    'Welcome to our law firm! Please join our AI LEGAL workspace to collaborate on cases.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeWsId = localStorage.getItem('AI_LEGAL_LAST_ACTIVE_WORKSPACE_ID') || 'firm_abc_workspace';

  const toggleModule = (mod) => {
    setSelectedModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const handleSendInvite = async (e) => {
    e?.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full Name is required!');
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      toast.error('Please enter either Email Address or Mobile Number!');
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      barCouncilNo: barCouncilNo.trim(),
      stateBarCouncil,
      role,
      department,
      permission,
      modules: selectedModules,
      personalMessage: personalMessage.trim()
    };

    const tid = toast.loading(`Sending invitation to ${fullName.trim()}...`);
    setIsSubmitting(true);

    try {
      const res = await apiService.post(`/workspaces/${activeWsId}/invitations`, payload);
      const data = res?.data || res;
      if (data?.success || data?.invitation) {
        toast.success(`✨ Invitation successfully sent to ${fullName.trim()}!`, { id: tid });
        if (onSuccess) onSuccess(data?.invitation || payload);
        onClose();
        resetForm();
      } else {
        toast.error(data?.error || 'Failed to send invitation.', { id: tid });
      }
    } catch (err) {
      console.error('[Invite Team Member] Submit Error:', err);
      toast.error(err?.response?.data?.error || err?.message || 'Failed to send invitation.', { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setMobile('');
    setBarCouncilNo('');
    setStateBarCouncil('Delhi Bar Council');
    setRole('Junior Advocate');
    setDepartment('Civil Litigation');
    setPermission('Standard Member');
    setSelectedModules(DEFAULT_SELECTED_MODULES);
    setPersonalMessage('Welcome to our law firm! Please join our AI LEGAL workspace to collaborate on cases.');
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[99999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-900 dark:text-white font-sans max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Invite Team Member
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Invite advocates and legal staff to join your firm's AI LEGAL workspace.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scrollable Body */}
          <form onSubmit={handleSendInvite} className="overflow-y-auto custom-scrollbar flex-1 space-y-5 pr-1">
            
            {/* 1. Member Information Card */}
            <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <UserPlus className="w-5 h-5 text-[#C8A34D]" />
                <span>1. Member Information</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adv. Amit Kumar"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="advocate@firm.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                    Bar Council No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="D/1234/2020"
                    value={barCouncilNo}
                    onChange={e => setBarCouncilNo(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                    State Bar Council
                  </label>
                  <select
                    value={stateBarCouncil}
                    onChange={e => setStateBarCouncil(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                  >
                    <option value="Delhi Bar Council">Delhi Bar Council</option>
                    <option value="Maharashtra & Goa Bar Council">Maharashtra & Goa Bar Council</option>
                    <option value="UP Bar Council">UP Bar Council</option>
                    <option value="Karnataka Bar Council">Karnataka Bar Council</option>
                    <option value="Other Bar Council">Other Bar Council</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Role & Department Card */}
            <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <Briefcase className="w-5 h-5 text-[#C8A34D]" />
                <span>2. Role & Department</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                  Professional Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                >
                  {Object.keys(ROLES_INFO).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                  {ROLES_INFO[role]}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                >
                  {DEPARTMENTS_LIST.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Default Permission Level Card */}
            <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <ShieldCheck className="w-5 h-5 text-[#C8A34D]" />
                <span>3. Default Permission Level</span>
              </div>

              <div className="space-y-1">
                <select
                  value={permission}
                  onChange={e => setPermission(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111]"
                >
                  {Object.keys(PERMISSIONS_INFO).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                
                <div className="p-3 rounded-xl bg-amber-500/10 border border-[#C8A34D]/30 mt-2 text-xs font-medium text-[#C8A34D]">
                  {PERMISSIONS_INFO[permission]}
                </div>
              </div>
            </div>

            {/* 4. Workspace Module Access Card (Exact Mobile SS 1 Design) */}
            <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                  <Layers className="w-5 h-5 text-[#C8A34D]" />
                  <span>4. Workspace Module Access</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-[#C8A34D] text-[10px] font-black border border-[#C8A34D]/30">
                  {selectedModules.length} Modules Selected
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_MODULES.map(mod => {
                  const isSelected = selectedModules.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModule(mod)}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-amber-500/10 text-[#C8A34D] border-[#C8A34D] shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#C8A34D] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>{mod}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Invitation Delivery Card */}
            <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <Sparkles className="w-5 h-5 text-[#C8A34D]" />
                <span>5. Invitation Delivery</span>
              </div>

              <div className="p-4 rounded-xl border border-[#C8A34D]/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent space-y-2">
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                  AI LEGAL Smart Delivery
                </h5>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                  <li>Existing AI LEGAL users receive an instant in-app notification and email.</li>
                  <li>New users receive an email invitation with download and account setup instructions.</li>
                  <li>WhatsApp invitations are sent automatically if your firm has enabled WhatsApp integration.</li>
                </ul>
              </div>
            </div>

            {/* 6. Personal Welcome Message Card */}
            <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
                <MessageSquare className="w-5 h-5 text-[#C8A34D]" />
                <span>6. Personal Welcome Message</span>
              </div>

              <textarea
                rows={2}
                value={personalMessage}
                onChange={e => setPersonalMessage(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#C8A34D] text-slate-900 dark:text-white bg-white dark:bg-[#111111] resize-none"
              />
            </div>

            {/* Invitation Summary Preview Card */}
            <div className="p-4 rounded-2xl border-2 border-[#C8A34D] bg-amber-500/5 dark:bg-amber-500/10 space-y-2">
              <h5 className="font-extrabold text-xs text-[#C8A34D] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Invitation Summary Preview
              </h5>
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 font-medium">
                <div><span className="font-bold text-slate-900 dark:text-white">Invitee:</span> {fullName || 'Full Name'} ({mobile || email || 'Contact'})</div>
                <div><span className="font-bold text-slate-900 dark:text-white">Role & Dept:</span> {role} • {department}</div>
                <div><span className="font-bold text-slate-900 dark:text-white">Permission:</span> {permission} ({selectedModules.length} Modules Selected)</div>
                <div><span className="font-bold text-slate-900 dark:text-white">Delivery:</span> Automatic (Smart Router)</div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#C8A34D] hover:bg-[#b08d3b] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default InviteTeamMemberModal;
