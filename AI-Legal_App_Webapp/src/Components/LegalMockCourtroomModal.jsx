import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Gavel, Mic, MessageSquare, Sparkles, Copy, Download, Globe, ShieldAlert, CheckCircle2,
  Trophy, AlertTriangle, Send, UserCheck, Bot, User, Play, Pause, Check, Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';

const COURTS = ['Delhi District Court', 'Bombay High Court', 'Supreme Court Bench', 'Metropolitan Magistrate Court'];
const DIFFICULTIES = ['Balanced Judicial Bench', 'Strict Procedural Judge', 'Hostile Opposing Counsel'];

const STAGES = ['Opening Statement', 'Evidence Presentation', 'Witness Deposition', 'Cross Examination', 'Final Arguments', 'Verdict'];

export default function LegalMockCourtroomModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [hearingMode, setHearingMode] = useState('text');
  const [selectedCourt, setSelectedCourt] = useState(COURTS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTIES[0]);
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  // Step 2: Connection state
  const [isLaunching, setIsLaunching] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Step 3: Dialogue Messages
  const [messages, setMessages] = useState([
    { id: '1', sender: 'judge', name: 'Hon\'ble Justice R. K. Varma', text: 'Court is now in session. Counsel for complainant, you may begin your opening statement under Section 138 of the Negotiable Instruments Act.' },
    { id: '2', sender: 'opponent', name: 'Adv. Mehta (Opposing Counsel)', text: 'My Lord, before the complainant begins, we raise a preliminary objection regarding the service of statutory demand notice.' }
  ]);
  const [userInput, setUserInput] = useState('');

  // Live Performance Scores
  const [scores] = useState({
    advocacy: 85,
    satisfaction: 80,
    admissibility: 78,
    persuasiveness: 82
  });

  const startCourtroomSession = () => {
    setCurrentStep(2);
    setIsLaunching(true);
    setProgressPct(15);
    setProgressStatus('Connecting to AI Judicial Bench...');

    const statuses = [
      { pct: 40, text: 'Loading Case Pleadings & Exhibits...' },
      { pct: 70, text: 'Initializing Opposing Counsel Strategy Engine...' },
      { pct: 90, text: 'Opening Courtroom Chamber...' },
      { pct: 100, text: 'Mock Courtroom Session Active!' }
    ];

    statuses.forEach((item, idx) => {
      setTimeout(() => {
        setProgressPct(item.pct);
        setProgressStatus(item.text);
        if (item.pct === 100) {
          setIsLaunching(false);
          setCurrentStep(3);
        }
      }, (idx + 1) * 900);
    });
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    const newMsg = { id: Date.now().toString(), sender: 'advocate', name: 'Advocate (You)', text: userInput };
    setMessages(prev => [...prev, newMsg]);
    setUserInput('');

    // AI Response simulation
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'judge',
        name: 'Hon\'ble Justice R. K. Varma',
        text: 'Objection noted. Counsel, please produce Exhibit P-2 bank return memo to substantiate the dishonour argument.'
      }]);
      if (activeStageIdx < STAGES.length - 1) {
        setActiveStageIdx(prev => prev + 1);
      }
    }, 1000);
  };

  const handleEndHearing = () => {
    setCurrentStep(4);
    toast.success('Hearing concluded! Final Verdict decree compiled.');
  };

  const handleCopyTranscript = () => {
    const text = messages.map(m => `[${m.name}]: ${m.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Hearing transcript copied to clipboard!');
  };

  const handleExportReport = () => {
    toast.success('Exporting Trial Performance Audit Report (PDF)...');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-5xl h-[90vh] bg-white dark:bg-[#111111] border border-[#C8A34D]/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="px-8 py-5 bg-[#111111] border-b border-[#C8A34D]/30 flex items-center justify-between shrink-0 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#222222] border border-[#C8A34D]/40 flex items-center justify-center text-[#C8A34D]">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>AI Mock Courtroom Simulator</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C8A34D]/20 text-[#C8A34D] border border-[#C8A34D]/30 uppercase">
                    Interactive Trial Simulator
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Step {currentStep} of 4 • {currentStep === 1 ? 'Setup & Mode Selection' : currentStep === 2 ? 'Courtroom Chamber' : currentStep === 3 ? 'Live Trial Progression' : 'Judicial Verdict'}
                </p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="px-8 py-3 bg-[#181818] border-b border-slate-800 flex items-center justify-between text-xs font-semibold shrink-0 overflow-x-auto">
            {[
              { num: 1, label: '1. Court Setup' },
              { num: 2, label: '2. Connection' },
              { num: 3, label: '3. Live Trial' },
              { num: 4, label: '4. Verdict Decree' },
            ].map(step => (
              <div 
                key={step.num}
                onClick={() => { if (step.num < currentStep) setCurrentStep(step.num); }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl cursor-pointer transition-all ${
                  currentStep === step.num
                    ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md shadow-[#C8A34D]/20'
                    : currentStep > step.num
                    ? 'text-[#C8A34D]'
                    : 'text-slate-500'
                }`}
              >
                <span>{step.label}</span>
                {currentStep > step.num && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            ))}
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F5F5] dark:bg-[#111111]">
            {/* STEP 1: SETUP */}
            {currentStep === 1 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Hearing Mode & Judicial Bench Setup</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Select simulation format, court forum & judicial bench difficulty.</p>
                </div>

                {/* Hearing Mode Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'voice', label: '🗣️ AI Voice Trial', desc: 'Real-time oral argument voice trial' },
                    { id: 'text', label: '💬 Interactive Text Trial', desc: 'Text argument exchange & objections' },
                    { id: 'practice', label: '🎙️ Solo Speech Practice', desc: 'Oral speech rehearsal with feedback' },
                  ].map(m => (
                    <div
                      key={m.id}
                      onClick={() => setHearingMode(m.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        hearingMode === m.id
                          ? 'bg-white dark:bg-[#222222] border-[#C8A34D] ring-1 ring-[#C8A34D] shadow-md'
                          : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-slate-800 hover:border-[#C8A34D]/40'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">{m.label}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">{m.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Presiding Court Forum</label>
                      <select
                        value={selectedCourt}
                        onChange={(e) => setSelectedCourt(e.target.value)}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#C8A34D] focus:outline-none"
                      >
                        {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Bench Difficulty</label>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      >
                        {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: LAUNCHING */}
            {currentStep === 2 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-12">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C8A34D]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#111111] border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D]">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Connecting to AI Judicial Bench</h3>
                  <p className="text-xs font-mono text-[#C8A34D]">{progressStatus}</p>
                </div>

                <div className="w-full max-w-md bg-slate-200 dark:bg-[#222222] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#C8A34D] h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* STEP 3: LIVE COURTROOM SIMULATOR */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Stage Progression Bar */}
                <div className="flex items-center justify-between bg-white dark:bg-[#181818] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  {STAGES.map((st, idx) => (
                    <div 
                      key={st}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        activeStageIdx === idx
                          ? 'bg-[#C8A34D] text-[#111111] font-black shadow-md'
                          : activeStageIdx > idx
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {idx + 1}. {st}
                    </div>
                  ))}
                </div>

                {/* 4 Live Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Advocacy</span>
                    <h4 className="text-lg font-black text-[#C8A34D] mt-0.5">{scores.advocacy}%</h4>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Bench Satisfaction</span>
                    <h4 className="text-lg font-black text-white mt-0.5">{scores.satisfaction}%</h4>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Admissibility</span>
                    <h4 className="text-lg font-black text-emerald-400 mt-0.5">{scores.admissibility}%</h4>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Persuasiveness</span>
                    <h4 className="text-lg font-black text-[#C8A34D] mt-0.5">{scores.persuasiveness}%</h4>
                  </div>
                </div>

                {/* Dialogue Feed */}
                <div className="p-4 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 h-64 overflow-y-auto space-y-3">
                  {messages.map(m => (
                    <div 
                      key={m.id}
                      className={`p-3 rounded-2xl border text-xs max-w-2xl ${
                        m.sender === 'judge'
                          ? 'bg-[#111111] border-[#C8A34D]/40 text-slate-200 mr-auto'
                          : m.sender === 'opponent'
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200 mr-auto'
                          : 'bg-[#222222] border-[#C8A34D]/60 text-white ml-auto'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase text-[#C8A34D] block mb-1">{m.name}</span>
                      <p className="leading-relaxed font-sans">{m.text}</p>
                    </div>
                  ))}
                </div>

                {/* Real-time Strategy Coach */}
                <div className="p-4 rounded-2xl bg-[#111111] border border-[#C8A34D]/30 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C8A34D]">AI Strategy Coach Tip:</span>
                  <p className="text-slate-300 font-sans">"My Lord, under Section 139 NI Act, once cheque signature is admitted, mandatory statutory presumption applies in favor of complainant."</p>
                </div>

                {/* Input Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type oral argument or response to Hon'ble Judge..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                    className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C8A34D]"
                  />
                  <button onClick={handleSendMessage} className="p-3 rounded-2xl bg-[#C8A34D] text-[#111111] cursor-pointer">
                    <Send className="w-4 h-4" />
                  </button>
                  <button onClick={handleEndHearing} className="px-4 py-3 rounded-2xl bg-rose-600 text-white text-xs font-black cursor-pointer">
                    Conclude Trial
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: VERDICT & SCORECARD */}
            {currentStep === 4 && (
              <div className="space-y-6 max-w-4xl mx-auto text-center">
                <div className="p-6 bg-[#111111] border border-[#C8A34D]/40 rounded-3xl space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C8A34D]">Final Judicial Decree Issued</span>
                  <h3 className="text-xl font-black text-white">"PETITION ALLOWED IN FULL WITH COMPENSATION"</h3>
                  <p className="text-xs text-slate-300 font-mono">Hon'ble Metropolitan Magistrate Court ruled in favor of complainant under Sec 138 NI Act awarding double cheque compensation of Rs 50,00,000.</p>
                </div>

                <div className="p-6 bg-white dark:bg-[#181818] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#C8A34D]">Advocacy Performance Scorecard</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Legal Reasoning</span>
                      <span className="text-lg font-black text-[#C8A34D]">92%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Precedent Usage</span>
                      <span className="text-lg font-black text-[#C8A34D]">88%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Evidence Handling</span>
                      <span className="text-lg font-black text-emerald-400">95%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Courtroom Demeanor</span>
                      <span className="text-lg font-black text-white">90%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-8 py-4 bg-[#111111] border-t border-[#C8A34D]/30 flex items-center justify-between shrink-0">
            {currentStep === 1 && (
              <button 
                onClick={startCourtroomSession}
                className="ml-auto px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
              >
                <Sparkles className="w-4 h-4" /> Enter AI Mock Courtroom
              </button>
            )}

            {currentStep === 4 && (
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={handleCopyTranscript}
                  className="px-4 py-2 rounded-xl bg-[#222222] text-[#C8A34D] border border-[#C8A34D]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4" /> Copy Transcript
                </button>

                <button 
                  onClick={handleExportReport}
                  className="px-6 py-2.5 rounded-xl bg-[#C8A34D] text-[#111111] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#C8A34D]/20"
                >
                  <Download className="w-4 h-4" /> Export Performance Report (PDF)
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
