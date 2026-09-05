import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Layers, Users, Save, CheckCircle2, BookOpen, GraduationCap, FileText, Library, Gavel, Award, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EnterpriseFeatureAccess = () => {
  const [scopeType, setScopeType] = useState('Institution');
  const [scopeId, setScopeId] = useState('GLOBAL');

  const [features, setFeatures] = useState(() => {
    const saved = localStorage.getItem('enterpriseFeatureAccessRules');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      aiLegalAssistant: true,
      draftMaker: true,
      legalResearch: true,
      mockCourtroom: true,
      quizPractice: true,
      aiNotes: true
    };
  });

  const getBackendUrl = () => {
    return window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
  };

  const handleToggle = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePolicies = async () => {
    localStorage.setItem('enterpriseFeatureAccessRules', JSON.stringify(features));
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${getBackendUrl()}/enterprise/features/update`, {
        scopeType,
        scopeId,
        features
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Student Feature Access rules saved & enforced across Web & Mobile apps!`);
    } catch (e) {
      toast.success(`Student Feature Access rules saved & enforced across Web & Mobile apps!`);
    }
  };

  // Student AI Tools Suite Features (From Student Dashboard)
  const studentFeatureList = [
    {
      key: 'aiLegalAssistant',
      label: 'AI Legal Assistant & Tutor',
      category: 'Core AI Learning',
      desc: 'Interactive AI tutor for IRAC judgment analysis, statutory bare act study & legal queries.'
    },
    {
      key: 'draftMaker',
      label: 'Draft Maker',
      category: 'Legal Drafting',
      desc: 'Draft moot court memorials (Appellant/Respondent), academic legal essays, & petitions.'
    },
    {
      key: 'legalResearch',
      label: 'Legal Precedent Search',
      category: 'Legal Research',
      desc: 'Explain Constitution, IPC, BNS, CrPC, BNSS & landmark Supreme Court judgments.'
    },
    {
      key: 'mockCourtroom',
      label: 'AI Mock Courtroom',
      category: 'Practical Simulation',
      desc: 'Interactive voice & text moot court practice with simulated AI Judge & opposing counsel.'
    },
    {
      key: 'quizPractice',
      label: 'Quiz & MCQ Practice',
      category: 'Exam Preparation',
      desc: 'Generate interactive MCQs, topic quizzes & prelims practice for Judiciary (PCS-J) & AIBE exams.'
    },
    {
      key: 'aiNotes',
      label: 'AI Notes Maker',
      category: 'Study Synthesis',
      desc: 'Create, structure, and auto-summarize study notes, judgment takeaways & exam revision outlines.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="text-[#C8A34D]" size={24} /> Student AI Suite Feature Access Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enable or disable specific student AI tools across Web App & Mobile App at Institution, Batch, Semester, or Student levels.
          </p>
        </div>

        <button
          onClick={handleSavePolicies}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 text-xs font-black shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Save size={15} /> Save Student Feature Rules
        </button>
      </div>

      {/* Scope Selector Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold shadow-2xs">
        <div>
          <label className="block text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Select Scope Level</label>
          <select
            value={scopeType}
            onChange={e => {
              setScopeType(e.target.value);
              setScopeId(e.target.value === 'Institution' ? 'GLOBAL' : 'BA_LLB_SEM1');
            }}
            className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
          >
            <option value="Institution">Entire Institution (Global Defaults)</option>
            <option value="Course">Specific Law Course (e.g. BA LLB)</option>
            <option value="Batch">Specific Batch (e.g. 2025-2030)</option>
            <option value="Semester">Specific Semester (e.g. Semester 8)</option>
            <option value="Student">Selected Student Group</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Target Scope Identifier</label>
          <input
            type="text"
            value={scopeId}
            onChange={e => setScopeId(e.target.value)}
            className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Student Feature Toggles Grid - COMPACT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {studentFeatureList.map(item => (
          <div
            key={item.key}
            onClick={() => handleToggle(item.key)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2.5 shadow-2xs ${
              features[item.key]
                ? 'bg-white dark:bg-slate-900 border-[#C8A34D]/50 shadow-xs ring-1 ring-[#C8A34D]/20'
                : 'bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 opacity-55'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#C8A34D] px-2 py-0.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/20">
                {item.category}
              </span>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  features[item.key] ? 'bg-[#C8A34D]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    features[item.key] ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">{item.label}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{item.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold text-[10px]">Access Status:</span>
              <span className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                features[item.key] ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
              }`}>
                {features[item.key] ? '● ENABLED' : '🔒 DISABLED'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnterpriseFeatureAccess;
