import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Zap, Users, HardDrive, ArrowRight, CheckCircle2, Sparkles, PhoneCall, Scale } from 'lucide-react';

const EnterprisePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-[#C8A34D] selection:text-black">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C8A34D] to-[#E5C16C] p-[2px] flex items-center justify-center shadow-lg shadow-[#C8A34D]/10">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Scale size={20} className="text-[#C8A34D]" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              AI LEGAL<span className="text-[#C8A34D] text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/30">ENTERPRISE</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Enterprise Legal Intelligence & Law School Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/enterprise/setup')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Setup Institution
          </button>
          <button
            onClick={() => navigate('/dashboard/enterprise')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-[#C8A34D]/20"
          >
            Launch Enterprise Dashboard <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 text-center max-w-5xl mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C8A34D]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/30 text-[#C8A34D] text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles size={14} /> UNLIMITED ENTERPRISE ACCESS ACTIVATED
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
          Enterprise Power for <span className="bg-gradient-to-r from-[#C8A34D] via-[#B08D3E] to-[#C8A34D] bg-clip-text text-transparent">Universities, Law Colleges & Institutions</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Your free enterprise upgrade is active. Experience institution-wide AI tutors, curriculum alignment, syllabus-guided quiz engines, student credit management, and domain auto-linking.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => navigate('/dashboard/enterprise')}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black text-sm hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-[#C8A34D]/25"
          >
            <Building2 size={18} /> Open Enterprise Dashboard <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/enterprise/setup')}
            className="px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
          >
            Institution Setup Wizard
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-[#C8A34D]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-500 flex items-center justify-center mb-5">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Priority AI Processing Queue</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              Execute complex legal research, precedent analysis, and syllabus tutor responses at lightning speed with dedicated compute instances.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-[#C8A34D]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-5">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unlimited Student Seats & RBAC</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              Add unlimited law students, faculty members, deans, and course coordinators to your institutional workspace with fine-grained permissions.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-[#C8A34D]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mb-5">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Privacy-Safe Student Analytics</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              Institutional feature adoption and batch metrics without exposing private AI chats, case research, or uploaded student documents.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-8 px-6 text-center text-xs text-slate-400">
        <p>© 2026 AI LEGAL™ Enterprise Intelligence Platform. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default EnterprisePage;
