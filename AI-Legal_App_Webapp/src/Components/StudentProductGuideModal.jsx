import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GraduationCap, BookOpen, Brain, CheckSquare, Bookmark, Scale, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentProductGuideModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const features = [
    {
      icon: GraduationCap,
      title: 'AI Legal™ Tutor',
      desc: 'Your AI-powered legal learning companion. Ask concepts in Hinglish/English, request IRAC judgment summaries, and get exam-oriented explanations.',
      action: 'Open Tutor',
      path: '/dashboard/chat/new',
    },
    {
      icon: BookOpen,
      title: 'Knowledge Hub & Bare Acts',
      desc: 'Access statutory Bare Acts (BNS, IPC, CrPC, BNSS, BSA, Constitution) with section-by-section breakdowns and landmark precedents.',
      action: 'Explore Hub',
      path: '/dashboard/tools/knowledge-hub',
    },
    {
      icon: Bookmark,
      title: 'AI Notes Workspace',
      desc: 'Create, structure, and auto-summarize study notes, judgment takeaways & judiciary exam revision outlines.',
      action: 'Open Notes',
      path: '/dashboard/tools/knowledge-hub',
    },
    {
      icon: CheckSquare,
      title: 'Quiz & MCQ Practice',
      desc: 'Generate interactive MCQs, topic quizzes & prelims practice for Judiciary (PCS-J) & AIBE exams with instant explanations.',
      action: 'Start Quiz',
      path: '/dashboard/tools/knowledge-hub',
    },
    {
      icon: Brain,
      title: 'AI Mock Courtroom',
      desc: 'Practice oral arguments, bench questioning, and counter-pleas with simulated AI Judge feedback for moot competitions.',
      action: 'Launch Courtroom',
      path: '/dashboard/tools/mock-courtroom',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C8A34D]" /> AI LEGAL™ PRODUCT GUIDE
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white tracking-tight">
                Welcome to Law Student Suite 📚⚖️
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Here is a quick walkthrough of how AI LEGAL™ accelerates your legal education, exam preparation, and moot court training.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Features List */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {features.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#C8A34D]/40 transition-all"
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="p-3 rounded-xl bg-[#C8A34D]/10 border border-[#C8A34D]/25 text-[#C8A34D] shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-[#111827] dark:text-white">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      navigate(item.path);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#C8A34D]/10 text-[#C8A34D] border border-[#C8A34D]/30 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    <span>{item.action}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Need help? Ask **AI Legal Tutor** anytime!
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-white font-bold text-xs transition-all cursor-pointer shadow-2xs"
            >
              Got It!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
