import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Briefcase, Users, Scale, Calendar, FileText, CheckCircle2, 
  AlertCircle, TrendingUp, ShieldAlert, Gavel, FileSearch, 
  MessageSquare, Brain, Save, Trash2, Plus, ArrowRight,
  ShieldCheck, AlertTriangle, Info, Download, Upload, Search,
  ClipboardList, BookOpen, UserMinus, UserPlus, ListTodo, History,
  LayoutDashboard, FileDigit, Target, Flame, Lightbulb, Check,
  Clock, MapPin, Bookmark, ExternalLink, Maximize2, Minimize2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import { apiService } from '../../../services/apiService';
import { useLanguage } from '../../../context/LanguageContext';
import { CaseDetailView, formatToBullets } from '../LegalPrecedents';
import { useLegalToolCredits } from '../../../hooks/useLegalToolCredits';

const CaseIntelligencePanel = ({ isOpen, onClose, currentCase, onUpdate, onUseInArgument }) => {
  const { tLegal } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [caseData, setCaseData] = useState(currentCase);
  const [selectedPrecedent, setSelectedPrecedent] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const { handleToolUsage } = useLegalToolCredits();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open-hide-navbar');
    } else {
      document.body.classList.remove('modal-open-hide-navbar');
    }
    return () => {
      document.body.classList.remove('modal-open-hide-navbar');
    };
  }, [isOpen]);

  useEffect(() => {
    if (currentCase) {
      // Auto-update past hearings status
      if (currentCase.hearings) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let hasChanges = false;
        
        const updatedHearings = currentCase.hearings.map(h => {
          const hDate = new Date(h.date);
          hDate.setHours(0, 0, 0, 0);
          
          if (h.status === 'Upcoming' && hDate < today) {
            hasChanges = true;
            return { ...h, status: 'Missed' };
          }
          return h;
        });

        if (hasChanges) {
          setCaseData({ ...currentCase, hearings: updatedHearings });
          return;
        }
      }
      setCaseData(currentCase);
    }
  }, [currentCase]);

  if (!caseData) return null;

  const handleAutoAnalyze = async () => {
    // Credit Check & Deduction
    const creditSuccess = await handleToolUsage("Case Intelligence Analysis");
    if (!creditSuccess) return;

    setIsAnalyzing(true);
    const tid = toast.loading("⚖️ AI Legal Brain is analyzing your case...");
    try {
      console.log(`[Panel] Triggering auto-analyze for: ${caseData._id}`);
      // Use the dedicated /api/cases/:id/auto-analyze endpoint
      const analyzed = await apiService.autoAnalyzeCase(
        caseData._id,
        caseData.summary || caseData.caseSummary || caseData.name
      );
      console.log('[Panel] Analysis result:', analyzed);
      setCaseData(analyzed);
      if (onUpdate) onUpdate(analyzed);
      toast.success("✅ Intelligence report generated!", { id: tid });
    } catch (err) {
      console.error('[Panel] Auto-analyze error:', err);
      toast.error("Analysis failed. Check console for details.", { id: tid });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    const tid = toast.loading("Syncing case folder...");
    try {
      const updated = await apiService.updateProject(caseData._id, caseData);
      if (onUpdate) onUpdate(updated);
      toast.success("Changes saved successfully!", { id: tid });
      // Auto-close panel after successful save
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      toast.error("Failed to save changes.", { id: tid });
    }
  };

  // Robust mapping to handle both DB fields and potential raw AI keys
  const rawStrength = caseData.intelligence?.strengthScore ?? caseData.case_strength ?? 0;
  const rawWinProb = caseData.intelligence?.winProbability ?? caseData.win_probability ?? 0;

  // Normalize scores: if they are <= 1 and > 0, assume they are decimals (e.g., 0.85 -> 85)
  // This handles AI models that return normalized floats instead of percentages.
  const strengthScore = (rawStrength > 0 && rawStrength <= 1) ? Math.round(rawStrength * 100) : rawStrength;
  const winProbability = (rawWinProb > 0 && rawWinProb <= 1) ? Math.round(rawWinProb * 100) : rawWinProb;

  const strengthData = [
    { name: 'Strength', value: strengthScore },
    { name: 'Remaining', value: 100 - strengthScore }
  ];

  const winProbData = [
    { name: 'Win Prob', value: winProbability },
    { name: 'Risk', value: 100 - winProbability }
  ];

  const COLORS = ['#6366f1', 'rgba(128,128,128,0.1)'];
  const WIN_COLORS = ['#10b981', 'rgba(128,128,128,0.1)'];

  const tabs = [
    { id: 'overview', name: tLegal('overviewTab'), icon: LayoutDashboard },
    { id: 'communication', name: tLegal('communicationTab'), icon: MessageSquare },
    { id: 'hearings', name: tLegal('hearingsTab'), icon: Gavel },
    { id: 'parties', name: tLegal('partiesTab'), icon: Users },
    { id: 'timeline', name: tLegal('timelineTab'), icon: History },
    { id: 'evidence', name: tLegal('evidenceTab'), icon: FileSearch },
    { id: 'tasks', name: tLegal('processTab'), icon: ListTodo },
    { id: 'intelligence', name: tLegal('aiStrategyTab'), icon: Brain },
    { id: 'research', name: tLegal('researchTab'), icon: BookOpen },
  ];

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in- duration-300">
      {/* Summary Card */}
      <div className="bg-slate-50 ] rounded-2xl p-5 border border-slate-200">
        <div className="flex items-center gap-2 mb-3 text-indigo-600">
          <FileText size={18} />
          <h4 className="text-xs font-black uppercase tracking-wider">{tLegal('summary')}</h4>
        </div>
        <textarea
          value={caseData.summary || caseData.caseSummary || ''}
          onChange={(e) => setCaseData({ ...caseData, summary: e.target.value })}
          className="w-full bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 resize-none min-h-[100px]"
          placeholder={tLegal('noSummaryYet')}
        />
        
        {(() => {
          const upcoming = (caseData.hearings || [])
            .filter(h => h.status === 'Upcoming')
            .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
          
          if (!upcoming) return null;
          
          const date = new Date(upcoming.date);
          const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          
          return (
            <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <Calendar size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{tLegal('nextHearingSummary')}</span>
              </div>
              <span className="text-xs font-black text-slate-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {formattedDate}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white ] border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {isAnalyzing && (
            <div className="absolute inset-0 ] z-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="relative" style={{width: 96, height: 96}}>
            <PieChart width={96} height={96}>
              <Pie data={strengthData} cx={48} cy={48} innerRadius={30} outerRadius={42} paddingAngle={0} dataKey="value" startAngle={90} endAngle={-270}>
                {strengthData.map((entry, index) => <Cell key={`s-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-indigo-600 leading-none">
                {isAnalyzing ? '--' : `${strengthScore}%`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-subtext mt-2">{tLegal('caseStrength')}</span>
        </div>

        <div className="bg-white ] border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {isAnalyzing && (
            <div className="absolute inset-0 ] z-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="relative" style={{width: 96, height: 96}}>
            <PieChart width={96} height={96}>
              <Pie data={winProbData} cx={48} cy={48} innerRadius={30} outerRadius={42} paddingAngle={0} dataKey="value" startAngle={90} endAngle={-270}>
                {winProbData.map((entry, index) => <Cell key={`w-${index}`} fill={WIN_COLORS[index % WIN_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-emerald-500 leading-none">
                {isAnalyzing ? '--' : `${winProbability}%`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-2">{tLegal('winProbability')}</span>
        </div>
      </div>

      {/* Case Details Grid */}
      <div className="grid grid-cols-1 gap-4">
         <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">{tLegal('currentStage')}</label>
           <select 
             value={caseData.stage}
             onChange={(e) => setCaseData({...caseData, stage: e.target.value})}
             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
           >
             <option value="Pre-litigation">{tLegal('preLitigation')}</option>
             <option value="Notice">{tLegal('noticeStage')}</option>
             <option value="Court">{tLegal('courtProceedings')}</option>
             <option value="Judgment">{tLegal('judgmentPending')}</option>
             <option value="Settled">{tLegal('settledClosed')}</option>
           </select>
         </div>

         <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">{tLegal('priorityLevel')}</label>
           <div className="flex gap-2">
             {[
               { id: 'Low', label: tLegal('lowPriority') },
               { id: 'Medium', label: tLegal('mediumPriority') },
               { id: 'High', label: tLegal('highPriority') },
               { id: 'Urgent', label: tLegal('urgentPriority') }
             ].map(p => (
               <button
                 key={p.id}
                 onClick={() => setCaseData({...caseData, priority: p.id})}
                 className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                   caseData.priority === p.id 
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                   : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-white/5 text-subtext hover:border-indigo-500/50'
                 }`}
               >
                 {p.label}
               </button>
             ))}
           </div>
         </div>
      </div>

      {/* Relief/Goals */}
      <div className="bg-amber-50/50 rounded-2xl p-4 sm:p-5 border border-amber-200/50 overflow-hidden">
        <div className="flex items-center gap-2 mb-3 text-amber-600">
          <Target size={18} />
          <h4 className="text-xs font-black uppercase tracking-wider">{tLegal('yourClaim')}</h4>
        </div>
        <textarea
          value={caseData.reliefGoals || ''}
          onChange={(e) => setCaseData({ ...caseData, reliefGoals: e.target.value })}
          className="w-full bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 resize-none overflow-wrap-anywhere"
          placeholder={tLegal('whatClientWants')}
          rows={3}
        />
      </div>

    </div>
  );

  const renderCommunication = () => (
    <div className="space-y-6 animate-in fade-in slide-in- duration-300">
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <h3 className="text-lg font-black text-slate-800">{tLegal('commDashboard')}</h3>
          <p className="text-[10px] font-bold text-subtext uppercase tracking-widest mt-1">{tLegal('trackInteractions')}</p>
        </div>
        <button 
          onClick={() => setCaseData({...caseData, communicationLogs: [{type: 'Note', date: new Date().toISOString(), summary: ''}, ...(caseData.communicationLogs || [])]})}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={14} />
          {tLegal('addNewLog')}
        </button>
      </div>

      <div className="space-y-4">
        {(caseData.communicationLogs || []).map((log, i) => (
          <div key={i} className="bg-white ] border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-sm transition-all group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              log.type === 'Call' ? 'bg-blue-500' : 
              log.type === 'Email' ? 'bg-amber-500' : 
              log.type === 'Meeting' ? 'bg-emerald-500' : 'bg-indigo-500'
            }`} />
            
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-3">
                  <select 
                    value={log.type}
                    onChange={(e) => {
                      const newLogs = [...caseData.communicationLogs];
                      newLogs[i].type = e.target.value;
                      setCaseData({...caseData, communicationLogs: newLogs});
                    }}
                    className="bg-slate-100 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Note">{tLegal('internalNote')}</option>
                  </select>
                  <span className="text-[10px] text-subtext font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
               </div>
               <button 
                 onClick={() => setCaseData({...caseData, communicationLogs: caseData.communicationLogs.filter((_, idx) => idx !== i)})}
                 className="p-2 text-subtext hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
               >
                 <Trash2 size={14} />
               </button>
            </div>
            
            <textarea
              value={log.summary}
              onChange={(e) => {
                 const newLogs = [...caseData.communicationLogs];
                 newLogs[i].summary = e.target.value;
                 setCaseData({...caseData, communicationLogs: newLogs});
              }}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 p-4 min-h-[80px] resize-none"
              placeholder={tLegal('whatDiscussed')}
            />
          </div>
        ))}

        {(!caseData.communicationLogs || caseData.communicationLogs.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="p-5 bg-slate-50 rounded-full mb-4">
              <MessageSquare size={32} className="text-subtext opacity-40" />
            </div>
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{tLegal('noLogsFound')}</h4>
            <p className="text-[11px] text-subtext mt-2 max-w-[240px] text-center font-medium">{tLegal('startTrackingComm')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderParties = () => (
    <div className="space-y-6 animate-in fade-in slide-in- duration-300">
      <div className="space-y-4">
        <div className="bg-white ] border border-slate-200 rounded-2xl p-5">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <UserPlus size={20} />
              </div>
              <h4 className="text-sm font-black text-slate-800">{tLegal('clientComplainant')}</h4>
           </div>
           <input
             type="text"
             value={caseData.clientName || ''}
             onChange={(e) => setCaseData({...caseData, clientName: e.target.value})}
             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
             placeholder="Name of client"
           />
        </div>

        <div className="bg-white ] border border-slate-200 rounded-2xl p-5">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <UserMinus size={20} />
              </div>
              <h4 className="text-sm font-black text-slate-800">{tLegal('opponentAccused')}</h4>
           </div>
           <input
             type="text"
             value={caseData.opponentName || ''}
             onChange={(e) => setCaseData({...caseData, opponentName: e.target.value})}
             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
             placeholder="Name of opponent"
           />
        </div>

        <div className="bg-white ] border border-slate-200 rounded-2xl p-5">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <Briefcase size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-800">{tLegal('associatedLawyers')}</h4>
              </div>
              <button 
                onClick={() => setCaseData({...caseData, lawyers: [...(caseData.lawyers || []), {name: '', role: ''}]})}
                className="p-1 hover:bg-slate-100 rounded-lg text-primary"
              >
                <Plus size={18} />
              </button>
           </div>
           <div className="space-y-3">
              {(caseData.lawyers || []).map((l, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={l.name}
                    onChange={(e) => {
                      const newL = [...caseData.lawyers];
                      newL[idx].name = e.target.value;
                      setCaseData({...caseData, lawyers: newL});
                    }}
                    placeholder={tLegal('lawyerName')}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold outline-none"
                  />
                  <input
                    value={l.role}
                    onChange={(e) => {
                      const newL = [...caseData.lawyers];
                      newL[idx].role = e.target.value;
                      setCaseData({...caseData, lawyers: newL});
                    }}
                    placeholder={tLegal('role')}
                    className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold outline-none"
                  />
                  <button 
                    onClick={() => setCaseData({...caseData, lawyers: caseData.lawyers.filter((_, i) => i !== idx)})}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );

  const renderHearings = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = (caseData.hearings || [])
      .filter(h => h.status === 'Upcoming')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const past = (caseData.hearings || [])
      .filter(h => h.status !== 'Upcoming')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in- duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 text-white rounded-lg sm:rounded-xl shadow-sm shadow-indigo-500/10">
              <Gavel size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 leading-tight">{tLegal('courtSchedule')}</h3>
              <p className="text-[9px] sm:text-[10px] font-bold text-subtext uppercase tracking-widest mt-0.5 sm:mt-1">Official court schedule</p>
            </div>
          </div>
          <button 
            onClick={() => {
              const newHearing = {
                date: new Date().toISOString().split('T')[0],
                time: '',
                courtName: '',
                location: '',
                notes: '',
                status: 'Upcoming'
              };
              setCaseData({ ...caseData, hearings: [...(caseData.hearings || []), newHearing] });
              toast.success("Hearing added");
            }}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-white rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-sm shadow-indigo-500/10 hover:opacity-90 transition-all w-full sm:w-auto h-9 sm:h-10"
          >
            <Plus size={14} /> {tLegal('addHearing')}
          </button>
        </div>

        {/* Upcoming Hearings Section */}
        <div className="space-y-3">
          <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1 opacity-80">
            {upcoming.length > 1 ? tLegal('upcomingHearingsDetail') : tLegal('upcomingHearingDetail')}
          </h4>
          
          {upcoming.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {upcoming.map((h, i) => (
                <div key={`up-${i}`} className="bg-white ] border border-slate-200 rounded-2xl p-4 sm:px-5 sm:py-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all relative group">
                  {upcoming.length > 1 && (
                    <div className="absolute top-4 sm:top-5 left-4 sm:left-6 text-lg sm:text-xl font-black text-slate-100 -z-0 select-none">
                      {i + 1}.
                    </div>
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex flex-col gap-3">
                       <div className="space-y-2 w-full">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 text-slate-800">
                                <Calendar size={13} className="text-indigo-500 sm:w-4 sm:h-4" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">{tLegal('dateLabel')}:</span>
                             </div>
                             <input 
                               type="date" 
                               value={h.date ? new Date(h.date).toISOString().split('T')[0] : ''}
                               onChange={(e) => {
                                 const newH = [...caseData.hearings];
                                 const idx = caseData.hearings.indexOf(h);
                                 newH[idx].date = e.target.value;
                                 setCaseData({...caseData, hearings: newH});
                               }}
                               className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[11px] sm:text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none w-auto"
                             />
                          </div>

                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-slate-800">
                                <Scale size={13} className="text-indigo-500 sm:w-4 sm:h-4" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">{tLegal('courtLabel')}:</span>
                             </div>
                             <input 
                               type="text" 
                               placeholder="Court Name"
                               value={h.courtName || ''}
                               onChange={(e) => {
                                 const newH = [...caseData.hearings];
                                 const idx = caseData.hearings.indexOf(h);
                                 newH[idx].courtName = e.target.value;
                                 setCaseData({...caseData, hearings: newH});
                               }}
                               className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1 text-[11px] sm:text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                             />
                          </div>

                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 text-slate-800">
                                <Clock size={13} className="text-indigo-500 sm:w-4 sm:h-4" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">{tLegal('timeLabel')}:</span>
                             </div>
                             <input 
                               type="text" 
                               placeholder="Time"
                               value={h.time || ''}
                               onChange={(e) => {
                                 const newH = [...caseData.hearings];
                                 const idx = caseData.hearings.indexOf(h);
                                 newH[idx].time = e.target.value;
                                 setCaseData({...caseData, hearings: newH});
                               }}
                               className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[11px] sm:text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none w-24 text-right"
                             />
                          </div>
                       </div>

                       <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <select 
                            value={h.status}
                            onChange={(e) => {
                              const newH = [...caseData.hearings];
                              const idx = caseData.hearings.indexOf(h);
                              newH[idx].status = e.target.value;
                              setCaseData({...caseData, hearings: newH});
                            }}
                            className="bg-indigo-50 text-indigo-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border-none outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                          >
                            <option value="Upcoming">Upcoming</option>
                            <option value="Completed">Completed</option>
                            <option value="Missed">Missed</option>
                          </select>
                          <button 
                            onClick={() => {
                              const newH = caseData.hearings.filter(item => item !== h);
                              setCaseData({...caseData, hearings: newH});
                            }}
                            className="p-1.5 text-subtext hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                       </div>
                    </div>

                    <div className="mt-2.5 pt-2.5">
                       <div className="flex items-start gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                          <Info size={13} className="text-indigo-500/50 mt-0.5 shrink-0" />
                          <textarea 
                            placeholder="Additional notes..."
                            value={h.notes || ''}
                            onChange={(e) => {
                              const newH = [...caseData.hearings];
                              const idx = caseData.hearings.indexOf(h);
                              newH[idx].notes = e.target.value;
                              setCaseData({...caseData, hearings: newH});
                            }}
                            className="w-full bg-transparent border-none p-0 text-[10px] sm:text-[11px] font-medium text-subtext focus:ring-0 resize-none min-h-[32px]"
                          />
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[280px] bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 group transition-all">
               <div className="p-5 bg-white rounded-full shadow-sm mb-4 border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                  <Calendar size={32} className="text-subtext opacity-30" />
               </div>
               <p className="text-[11px] font-black text-subtext uppercase tracking-[0.2em] text-center px-8">{tLegal('noHearingsScheduled')}</p>
               <p className="text-[9px] text-subtext/50 font-bold uppercase tracking-widest mt-2">Manage all court dates and appearances here</p>
            </div>
          )}
        </div>

        {/* Past Hearings Section */}
        {past.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
             <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-subtext ml-1 opacity-60">
               {tLegal('pastHearings')}
             </h4>
             <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {past.map((h, i) => (
                  <div key={`past-${i}`} className="bg-slate-50/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100 opacity-80 group">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                       <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${h.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                             {h.status === 'Completed' ? <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> : <AlertTriangle size={14} className="sm:w-4 sm:h-4" />}
                          </div>
                          <div>
                             <p className="text-xs sm:text-sm font-black text-slate-800">
                               {new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                               {h.time && ` • ${h.time}`}
                             </p>
                             <p className="text-[9px] sm:text-[10px] font-bold text-subtext uppercase tracking-tight">
                               {h.courtName || 'Court Hearing'} • {h.status}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                          <select 
                            value={h.status}
                            onChange={(e) => {
                              const newH = [...caseData.hearings];
                              const idx = caseData.hearings.indexOf(h);
                              newH[idx].status = e.target.value;
                              setCaseData({...caseData, hearings: newH});
                            }}
                            className="bg-transparent text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-subtext outline-none cursor-pointer hover:text-indigo-500"
                          >
                            <option value="Upcoming">Set Upcoming</option>
                            <option value="Completed">Completed</option>
                            <option value="Missed">Missed</option>
                          </select>
                          <button 
                            onClick={() => {
                              const newH = caseData.hearings.filter(item => item !== h);
                              setCaseData({...caseData, hearings: newH});
                            }}
                            className="p-1.5 sm:p-2 text-subtext hover:text-red-500 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimeline = () => (
    <div className="space-y-6 animate-in fade-in slide-in- duration-300">
       <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-100">
          {(caseData.facts || []).map((f, idx) => (
             <div key={idx} className="relative">
                <div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                     <input
                       type="text"
                       value={f.event}
                       onChange={(e) => {
                         const newF = [...caseData.facts];
                         newF[idx].event = e.target.value;
                         setCaseData({...caseData, facts: newF});
                       }}
                       className="text-xs font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full"
                       placeholder="Event Title"
                     />
                     <button onClick={() => setCaseData({...caseData, facts: caseData.facts.filter((_, i) => i !== idx)})} className="text-subtext hover:text-red-500"><X size={14}/></button>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-[10px] text-indigo-500 font-bold">
                     <Calendar size={12} />
                     <input 
                       type="date"
                       value={f.date ? new Date(f.date).toISOString().split('T')[0] : ''}
                       onChange={(e) => {
                          const newF = [...caseData.facts];
                          newF[idx].date = e.target.value;
                          setCaseData({...caseData, facts: newF});
                       }}
                       className="bg-transparent border-none p-0 focus:ring-0 text-[10px]"
                     />
                  </div>
                  <textarea
                    value={f.description}
                    onChange={(e) => {
                      const newF = [...caseData.facts];
                      newF[idx].description = e.target.value;
                      setCaseData({...caseData, facts: newF});
                    }}
                    className="w-full bg-transparent border-none text-[11px] text-subtext focus:ring-0 p-0 resize-none min-h-[40px]"
                    placeholder="Describe what happened..."
                  />
                </div>
             </div>
          ))}
          <button 
            onClick={() => setCaseData({...caseData, facts: [...(caseData.facts || []), {event: 'New Event', date: new Date().toISOString(), description: ''}]})}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-subtext hover:border-indigo-500 hover:text-indigo-500 transition-all"
          >
            {tLegal('addTimelineEvent')}
          </button>
       </div>
    </div>
  );

  const renderIntelligence = () => (
    <div className="space-y-6 animate-in fade-in slide-in- duration-300">
       {/* Risk Level Indicator */}
       <div className={`p-4 rounded-2xl border flex items-center justify-between ${
         caseData.intelligence?.riskLevel === 'High' || caseData.intelligence?.riskLevel === 'Critical'
         ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400'
         : caseData.intelligence?.riskLevel === 'Medium'
         ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
         : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
       }`}>
          <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-xl bg-current bg-opacity-10`}>
                 <ShieldAlert size={20} />
              </div>
              <div>
                 <h4 className="text-sm font-black tracking-tight">{tLegal('caseRiskAssessment')}</h4>
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{tLegal('currentlyFlaggedAs')} {caseData.intelligence?.riskLevel || 'Medium'} Risk</p>
                 {caseData.intelligence?.weakPoints?.[0] && (
                   <p className="text-[11px] mt-1 opacity-70 font-medium leading-snug">{caseData.intelligence.weakPoints[0]}</p>
                 )}
              </div>
           </div>
           <div className="text-lg font-black">{caseData.intelligence?.riskLevel || 'Medium'}</div>
       </div>

       {/* Weak Points & Missing Evidence */}
       <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-red-600">
                <Flame size={18} />
                <h4 className="text-xs font-black uppercase tracking-wider">{tLegal('criticalVulnerabilities')}</h4>
             </div>
             <div className="space-y-2">
                {(caseData.intelligence?.weakPoints || []).map((w, i) => (
                  <div key={i} className="flex gap-3 bg-white ] p-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700">
                     <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                     {w}
                  </div>
                ))}
                {(!caseData.intelligence?.weakPoints || caseData.intelligence?.weakPoints.length === 0) && (
                  <div className="text-center py-6 text-subtext italic text-[11px] bg-slate-50 rounded-xl border border-dashed border-slate-200">No vulnerabilities identified yet.</div>
                )}
             </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-center gap-2 text-indigo-600">
                <Lightbulb size={18} />
                <h4 className="text-xs font-black uppercase tracking-wider">{tLegal('opponentStrategyPrediction')}</h4>
             </div>
             <div className="space-y-2">
                {(caseData.intelligence?.opponentStrategies || []).map((s, i) => (
                  <div key={i} className="flex gap-3 bg-white ] p-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700">
                     <ShieldCheck size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                     {s}
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );

  const handleRemovePrecedent = async (precedentId) => {
    const updatedSaved = (caseData.savedPrecedents || []).filter(p => (p._id || p.case_identity?.case_name) !== precedentId);
    const updated = { ...caseData, savedPrecedents: updatedSaved };
    setCaseData(updated);
    
    try {
      const result = await apiService.updateProject(caseData._id, updated);
      if (onUpdate) onUpdate(result);
      toast.success("Precedent removed from case");
    } catch (err) {
      toast.error("Failed to sync removal with backend");
    }
  };

  const handleUsePrecedentInArgument = (caseItem) => {
    if (!onUseInArgument) return;
    
    const { case_identity = {}, judgment_basis = {} } = caseItem;
    const name = case_identity.case_name || "the cited case";
    const principle = judgment_basis.principles_applied?.[0] || "the established legal principles";
    const reasoning = judgment_basis.legal_reasoning;
    const reasoningText = Array.isArray(reasoning) ? reasoning[0] : (reasoning?.slice(0, 150) || "the court's reasoning");

    const argumentTemplate = `As held in ${name}, the court established that ${principle}. Specifically, it was observed that "${reasoningText}...". This principle directly applies to the current matter because...`;

    onUseInArgument(argumentTemplate);
    onClose(); 
  };

  const renderResearch = () => (
    <div className="space-y-8 animate-in fade-in slide-in- duration-300 pb-10">
       {/* 🏛️ SAVED PRECEDENTS SECTION */}
       <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-indigo-600">
             <Scale size={18} />
             <h4 className="text-xs font-black uppercase tracking-[0.2em]">Saved Precedents</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {(caseData.savedPrecedents || []).map((p, i) => {
                const id = p._id || p.case_identity?.case_name;
                const reasoning = p.judgment_basis?.legal_reasoning || p.reasoning;
                const reasoningList = formatToBullets(reasoning);
                
                return (
                   <div key={i} className="bg-white ] border border-slate-200 rounded-[20px] p-5 shadow-sm hover:shadow-sm transition-all group flex flex-col h-full relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleRemovePrecedent(id)}
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                        >
                           <Trash2 size={14} />
                        </button>
                     </div>

                     <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                           <Gavel size={18} className="text-indigo-600" />
                        </div>
                        <div className="overflow-hidden">
                           <h5 className="text-sm font-black text-slate-800 truncate leading-tight mb-1">
                              {p.case_identity?.case_name || p.case_name}
                           </h5>
                           <div className="flex items-center gap-2 text-[10px] text-subtext font-bold uppercase tracking-wider">
                              <span>{p.case_identity?.court || p.court}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>{p.case_identity?.year || p.year}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex-1 mb-4">
                        <p className="text-[11px] text-subtext leading-relaxed line-clamp-2 italic">
                           "{reasoningList[0] || 'No reasoning available'}"
                        </p>
                     </div>

                     <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setSelectedPrecedent(p)}
                          className="py-2.5 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                        >
                           Details
                        </button>
                        <button 
                          onClick={() => handleUsePrecedentInArgument(p)}
                          className="py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                           Use in Draft
                        </button>
                     </div>
                  </div>
                );
             })}

             {(!caseData.savedPrecedents || caseData.savedPrecedents.length === 0) && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50/50 ] rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="p-4 bg-white rounded-2xl mb-4 shadow-sm">
                     <Bookmark size={24} className="text-slate-300" />
                  </div>
                  <h6 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">No precedents saved yet</h6>
                  <p className="text-[10px] text-subtext mt-1 max-w-[200px] text-center font-medium">Use the Legal Precedents tool to find and save relevant case laws.</p>
               </div>
             )}
          </div>
       </div>

       <div className="h-[1px] bg-slate-100 w-full" />

       {/* 📜 APPLICABLE LAWS SECTION */}
       <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-amber-600">
             <BookOpen size={18} />
             <h4 className="text-xs font-black uppercase tracking-[0.2em]">Applicable Laws & Sections</h4>
          </div>
          
          <div className="space-y-4">
             {(caseData.research || []).map((r, i) => (
                <div key={i} className="bg-white ] border border-slate-200 rounded-2xl p-5 shadow-sm group hover:border-amber-200/50 transition-all">
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100/50">{r.lawName || 'Law Reference'}</div>
                        {r.section && <span className="text-sm font-black text-slate-800">Section {r.section}</span>}
                     </div>
                     <button onClick={() => setCaseData({...caseData, research: caseData.research.filter((_, idx) => idx !== i)})} className="p-2 text-subtext hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={14} /></button>
                  </div>
                  <p className="text-xs text-subtext leading-relaxed mb-4 font-medium">{r.description}</p>
                  {r.referenceUrl && (
                    <a href={r.referenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-50 transition-all">
                       <ExternalLink size={10} /> View Official Text
                    </a>
                  )}
               </div>
             ))}
             <button 
               onClick={() => setCaseData({...caseData, research: [...(caseData.research || []), {lawName: 'New Act', section: '', description: ''}]})}
               className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-subtext hover:border-indigo-500 hover:text-indigo-500 transition-all bg-slate-50/30 ]"
             >
               + Add Legal Reference
             </button>
          </div>
       </div>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 pointer-events-auto"
          />

          {/* Panel */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%', left: '50%', top: '50%', filter: 'blur(10px)' }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              x: '-50%', 
              y: '-50%', 
              left: '50%', 
              top: '50%', 
              filter: 'blur(0px)',
              width: isMaximized ? '100vw' : '95%', 
              height: isMaximized ? '100vh' : '90vh', 
              maxWidth: isMaximized ? '100vw' : '1024px', 
              maxHeight: isMaximized ? '100vh' : '95vh',
              borderRadius: isMaximized ? 0 : '2.5rem' 
            }}
            exit={{ 
              scale: 0.95, 
              opacity: 0, 
              x: '-50%', 
              y: '-50%',
              filter: 'blur(10px)',
              transition: { duration: 0.2, ease: "easeIn" }
            }}
            transition={{ 
              type: 'spring', 
              damping: 35, 
              stiffness: 400, 
              mass: 0.6,
              filter: { duration: 0.2 }
            }}
            className="fixed bg-white ] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.4)] flex flex-col pointer-events-auto overflow-hidden border border-black/5 z-[10000]"
          >
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden">
            <div className="absolute inset-0 ] ] z-0 border-b border-white/5" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0" />
            
            <div className="relative z-10 p-3 sm:p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-2xl border border-white/20 shrink-0">
                  <Briefcase className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-sm sm:text-xl font-black tracking-tight leading-tight uppercase truncate max-w-[160px] sm:max-w-[280px]">{caseData.name}</h2>
                  <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 overflow-hidden">
                    <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] opacity-80 whitespace-nowrap">AI Intelligence</span>
                    <span className="w-1 h-1 rounded-full shrink-0" />
                    <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] opacity-80 truncate">{caseData.caseType || 'Legal'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
                  className="p-1.5 hover: rounded-full text-white/80 hover:text-white transition-colors duration-200 shrink-0 cursor-pointer"
                >
                  {isMaximized ? <Minimize2 size={18} className="sm:w-5 sm:h-5" /> : <Maximize2 size={18} className="sm:w-5 sm:h-5" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="p-1.5 hover: rounded-full text-white/80 hover:text-white transition-colors duration-200 shrink-0 cursor-pointer"
                >
                  <X size={18} className="sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-2 bg-slate-50 ] border-b border-slate-200 overflow-x-auto custom-scrollbar no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]' 
                  : 'text-subtext hover:bg-slate-100 dark:hover:bg-[#131C31] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
                }`}
              >
                <tab.icon size={14} />
                {tab.name}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div 
            className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 pb-72 sm:pb-80 bg-slate-50/30 scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
             {activeTab === 'overview' && renderOverview()}
             {activeTab === 'communication' && renderCommunication()}
             {activeTab === 'hearings' && renderHearings()}
             {activeTab === 'parties' && renderParties()}
             {activeTab === 'timeline' && renderTimeline()}
             {activeTab === 'intelligence' && renderIntelligence()}
             {activeTab === 'research' && renderResearch()}
             {activeTab === 'evidence' && (
               <div className="space-y-6 animate-in fade-in slide-in- duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <ShieldCheck size={18} />
                      <h4 className="text-xs font-black uppercase tracking-wider">Evidence Vault</h4>
                    </div>
                    <button 
                      onClick={() => document.getElementById('evidence-upload').click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm shadow-indigo-500/20"
                    >
                      <Upload size={12} />
                      Upload
                    </button>
                    <input 
                      id="evidence-upload" 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        const newDocs = files.map(f => ({
                          name: f.name,
                          type: 'Document',
                          uploadDate: new Date().toISOString(),
                          status: 'Verified'
                        }));
                        setCaseData({...caseData, evidence: [...(caseData.evidence || []), ...newDocs]});
                        toast.success(`${files.length} documents added to vault!`);
                      }}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    {(caseData.evidence || []).map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white ] border border-slate-200 rounded-2xl group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 rounded-xl text-subtext group-hover:text-indigo-500 transition-colors">
                            <FileDigit size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 truncate max-w-[180px]">{doc.name}</p>
                            <p className="text-[9px] font-bold text-subtext uppercase tracking-wider mt-0.5">{doc.type} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                             (doc.status || '').toLowerCase() === 'strong'
                               ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                               : (doc.status || '').toLowerCase() === 'weak'
                               ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                               : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                           }`}>
                             {doc.status || 'Moderate'}
                           </span>
                           <button onClick={() => setCaseData({...caseData, evidence: caseData.evidence.filter((_, idx) => idx !== i)})} className="p-1.5 text-subtext hover:text-red-500 transition-colors">
                             <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    ))}
                    {(!caseData.evidence || caseData.evidence.length === 0) && (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="p-4 bg-white rounded-full w-fit mx-auto mb-3 shadow-sm">
                          <FileSearch className="w-6 h-6 text-subtext" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-subtext">Vault is Empty</p>
                        <p className="text-[9px] text-subtext/60 mt-1">Upload relevant documents, proofs, or notices.</p>
                      </div>
                    )}
                  </div>
               </div>
             )}
             {activeTab === 'tasks' && (
               <div className="space-y-6 animate-in fade-in slide-in- duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <ListTodo size={18} />
                      <h4 className="text-xs font-black uppercase tracking-wider">Legal Process Tracker</h4>
                    </div>
                    <button 
                      onClick={() => setCaseData({...caseData, tasks: [...(caseData.tasks || []), {title: 'New Task', status: 'Pending', priority: 'Medium'}]})}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                    >
                      + Add Step
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(caseData.tasks || []).map((task, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4 flex-1">
                          <button 
                            onClick={() => {
                              const newTasks = [...caseData.tasks];
                              newTasks[i].status = newTasks[i].status === 'Completed' ? 'Pending' : 'Completed';
                              setCaseData({...caseData, tasks: newTasks});
                            }}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              task.status === 'Completed' 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'border-slate-200 dark:border-zinc-700 hover:border-indigo-400'
                            }`}
                          >
                            {task.status === 'Completed' && <Check size={12} />}
                          </button>
                          <div>
                            <input 
                              value={task.title}
                              onChange={(e) => {
                                const newTasks = [...caseData.tasks];
                                newTasks[i].title = e.target.value;
                                setCaseData({...caseData, tasks: newTasks});
                              }}
                              className={`text-xs font-black bg-transparent border-none p-0 focus:ring-0 ${task.status === 'Completed' ? 'line-through text-subtext opacity-50' : 'text-slate-800 dark:text-white'}`}
                            />
                            {task.deadline && (
                              <p className="text-[9px] font-bold text-indigo-500 mt-0.5">Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                             task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-subtext border border-slate-100'
                           }`}>
                             {task.priority || 'Medium'}
                           </span>
                           <button onClick={() => setCaseData({...caseData, tasks: caseData.tasks.filter((_, idx) => idx !== i)})} className="p-1 text-subtext hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    ))}
                    {(!caseData.tasks || caseData.tasks.length === 0) && (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-subtext">No Process Steps</p>
                        <p className="text-[9px] text-subtext/60 mt-1">Auto-Analyze to generate a legal timeline.</p>
                      </div>
                    )}
                  </div>
               </div>
             )}
          </div>

           {/* Quick Actions & Footer */}
           <div className="p-4 sm:px-10 sm:py-3 border-t border-slate-100 bg-white/95 absolute bottom-0 left-0 right-0 z-[210] safe-area-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 max-w-7xl mx-auto">
                 <div className="flex items-center gap-3 w-full sm:w-auto">
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAutoAnalyze}
                      disabled={isAnalyzing}
                      className="flex-1 sm:flex-none sm:min-w-[160px] flex items-center justify-center gap-2 py-2 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all border border-indigo-200/50 h-9 sm:h-10 px-4"
                    >
                      <Brain size={14} className={isAnalyzing ?'animate-pulse' : ''} />
                      <span className="leading-tight">{isAnalyzing ? tLegal('processing') : tLegal('aiAutoAnalyze')}</span>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onClose();
                        if (window.handleAisaAction) {
                          window.handleAisaAction('DRAFT NOTICE');
                        }
                      }}
                      className="flex-1 sm:flex-none sm:min-w-[160px] flex items-center justify-center gap-2 py-2 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all border border-emerald-200/50 h-9 sm:h-10 px-4"
                    >
                      <FileText size={14} />
                      <span className="leading-tight">{tLegal('draftNotice')}</span>
                    </motion.button>
                 </div>
                 
                 <motion.button
                   whileHover={{ scale: 1.01, y: -1 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={handleSave}
                   className="w-full sm:w-auto sm:min-w-[200px] py-2 sm:py-2.5 hover: hover: text-white rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.15em] shadow-[0_8px_15px_-4px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2.5 h-9 sm:h-10 px-6 sm:px-8"
                 >
                   <Save size={16} />
                   {tLegal('syncCaseFolder')}
                 </motion.button>
              </div>
           </div>

          <AnimatePresence>
            {selectedPrecedent && (
              <CaseDetailView 
                caseItem={selectedPrecedent}
                onClose={() => setSelectedPrecedent(null)}
                isSaved={true}
                t={tLegal}
                onCopyCitation={() => {
                  const p = selectedPrecedent;
                  const name = p.case_identity?.case_name || p.case_name;
                  const court = p.case_identity?.court || p.court || "";
                  const year = p.case_identity?.year || p.year || "";
                  const citation = p.case_identity?.citation || p.citation || "Citation unavailable";
                  let textToCopy = `${name}`;
                  if (court) textToCopy += `, ${court}`;
                  if (year) textToCopy += ` (${year})`;
                  if (citation && citation !== "Citation unavailable") textToCopy += `, ${citation}`;
                  navigator.clipboard.writeText(textToCopy);
                  toast.success("✅ Citation copied");
                }}
                onCite={() => handleUsePrecedentInArgument(selectedPrecedent)}
                onSave={() => toast.success("Already saved")}
                onSummarize={() => toast.success("Summary coming soon...")}
                onCompare={() => toast.success("Comparison coming soon...")}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

export default CaseIntelligencePanel;
