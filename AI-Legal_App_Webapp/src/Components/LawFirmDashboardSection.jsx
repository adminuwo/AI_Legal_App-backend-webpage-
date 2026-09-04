import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Users, Briefcase, ShieldCheck, Plus, 
  CreditCard, UserPlus, Mail, CheckCircle2, ChevronRight, 
  MoreVertical, FileText, Database, Sparkles, X, Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LawFirmDashboardSection({ user, cases = [] }) {
  const navigate = useNavigate();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Associate Advocate' });

  // Mock initial firm members for realistic enterprise demo
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: user?.name || 'Managing Director', email: user?.email || 'admin@firm.com', role: 'Firm Partner (Owner)', status: 'Active', casesCount: cases.length || 12 },
    { id: '2', name: 'Adv. Rajesh Verma', email: 'rajesh.verma@firm.com', role: 'Senior Litigation Counsel', status: 'Active', casesCount: 8 },
    { id: '3', name: 'Priya Sharma', email: 'priya.s@firm.com', role: 'Associate Advocate', status: 'Active', casesCount: 5 },
    { id: '4', name: 'Amitabh Sen', email: 'amitabh.sen@firm.com', role: 'Legal Researcher', status: 'Pending Invite', casesCount: 0 },
  ]);

  const maxSeats = 10;
  const usedSeats = teamMembers.length;

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteForm.email) {
      toast.error("Email address is required!");
      return;
    }
    const newMember = {
      id: Date.now().toString(),
      name: inviteForm.name || inviteForm.email.split('@')[0],
      email: inviteForm.email,
      role: inviteForm.role,
      status: 'Invite Sent',
      casesCount: 0,
    };
    setTeamMembers([...teamMembers, newMember]);
    toast.success(`Invitation sent to ${inviteForm.email}`);
    setIsInviteModalOpen(false);
    setInviteForm({ name: '', email: '', role: 'Associate Advocate' });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Enterprise Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-teal-950/40 border border-emerald-500/30 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Law Firm & Multi-User Enterprise Hub</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {user?.name ? `${user.name} Firm Workspace` : 'Law Firm Administration'} 🏛️
          </h2>
          <p className="text-sm text-slate-300">
            Manage team seats, centralize shared litigation matters, and assign AI research workflows across your firm.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/subscription')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Manage Seats</span>
          </button>
        </div>
      </div>

      {/* 2. Firm Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Seats Usage */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Team Seats Allocation</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{usedSeats} / {maxSeats}</span>
            <span className="text-xs font-bold text-emerald-400">{Math.round((usedSeats / maxSeats) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(usedSeats / maxSeats) * 100}%` }} />
          </div>
        </div>

        {/* Shared Matters */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Shared Firm Matters</span>
            <Briefcase className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-300">{cases.length || 25} Matters</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Centralized document repository</p>
        </div>

        {/* Enterprise AI Usage */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Firm AI Operations</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">Unlimited</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pooled firm AI tokens</p>
        </div>

        {/* Security & Access Controls */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Firm Security level</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">Enterprise</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">256-bit encryption & audit logs</p>
        </div>
      </div>

      {/* 3. Firm Team Members Roster */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Firm Advocates & Team Roster</span>
            </h3>
            <p className="text-xs text-slate-400">Manage permissions, seat assignments, and active litigation workloads</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {usedSeats} Active Team Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Role / Designation</th>
                <th className="py-3 px-4">Active Matters</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div>{member.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-200">
                    {member.casesCount} Cases
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      member.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Invite Lawyer / Associate</h3>
                  <p className="text-xs text-slate-400">Add a member to your firm's enterprise seat license</p>
                </div>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Adv. Rajesh Sharma"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rajesh@firm.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation / Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Partner / Co-founder">Partner / Co-founder</option>
                    <option value="Senior Counsel">Senior Counsel</option>
                    <option value="Associate Advocate">Associate Advocate</option>
                    <option value="Legal Researcher">Legal Researcher</option>
                    <option value="Paralegal / Intern">Paralegal / Intern</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
