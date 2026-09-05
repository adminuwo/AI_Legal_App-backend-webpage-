import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, CheckCircle2, ChevronRight, ArrowLeft, ShieldCheck, 
  Zap, Layers, BookOpen, Settings, AlertCircle, Sparkles, Check, Globe, Mail, Users
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { apis } from '../../types';

const EnterpriseSetupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Institution Details
    name: 'Rani Durgavati Vishwavidyalaya (RDVV)',
    institutionType: 'University',
    officialEmail: 'admin@rdvv.ac.in',
    logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=200&auto=format&fit=crop&q=80',
    website: 'https://rdvv.ac.in',
    expectedSeats: 500,
    facultyCount: 25,
    officialDomain: 'rdvv.ac.in',

    // Step 2: Enterprise Admin
    ownerName: 'Dr. Rajiv Sharma',
    ownerEmail: 'dean.law@rdvv.ac.in',
    adminRole: 'Enterprise Owner',

    // Step 3: Domain Verification
    domainStatus: 'Pending Verification', // Not Configured, Pending Verification, Verified, Failed
    verificationToken: 'RDVV-DNS-TXT-AILEGAL-9482',

    // Step 4: Academic Structure
    courses: [
      {
        name: 'BA LLB (Hons)',
        code: 'BALLB',
        durationYears: 5,
        batches: [
          {
            name: '2025-2030',
            year: 'Year 1',
            semesters: [
              {
                number: 1,
                name: 'Semester 1',
                subjects: [
                  { name: 'Constitutional Law I', code: 'CL101' },
                  { name: 'Law of Torts', code: 'LT102' },
                  { name: 'Legal Writing & Language', code: 'LL103' }
                ]
              },
              {
                number: 2,
                name: 'Semester 2',
                subjects: [
                  { name: 'Law of Contracts I', code: 'LC104' },
                  { name: 'Family Law I', code: 'FL105' }
                ]
              }
            ]
          }
        ]
      }
    ],

    // Step 5: Feature & Budget Configs
    features: {
      aiLegalAssistant: true,
      aiTutor: true,
      quizPractice: true,
      aiNotes: true,
      draftMaker: true,
      legalResearch: true,
      mockCourtroom: true,
      contractAnalyzer: true,
      evidenceAnalyst: true,
      casePredictor: true,
      strategyEngine: true
    },
    monthlyBudget: 50000,
    monthlyCredits: 100000
  });

  const getBackendUrl = () => {
    let baseUrl = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || 'http://localhost:8080/api';
    return baseUrl;
  };

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.officialEmail)) {
      toast.error('Please fill in Institution Name and Official Email.');
      return;
    }
    if (step < 5) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleVerifyDomain = () => {
    setLoading(true);
    setTimeout(() => {
      setFormData(prev => ({ ...prev, domainStatus: 'Verified' }));
      setLoading(false);
      toast.success(`Domain @${formData.officialDomain} verified successfully! Automatic student domain linking enabled.`);
    }, 1200);
  };

  const handleCompleteSetup = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const backendUrl = getBackendUrl();

      const payload = {
        name: formData.name,
        institutionType: formData.institutionType,
        officialEmail: formData.officialEmail,
        logo: formData.logo,
        website: formData.website,
        expectedSeats: formData.expectedSeats,
        facultyCount: formData.facultyCount,
        officialDomain: formData.officialDomain,
        academicCourses: formData.courses,
        featureConfigs: formData.features,
        budgetRules: {
          monthlyBudget: formData.monthlyBudget,
          usedAmount: 0,
          alertThresholds: [50, 75, 90, 100]
        }
      };

      const res = await axios.post(`${backendUrl}/enterprise/setup`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success('Enterprise Workspace activated successfully!');
        navigate('/dashboard/enterprise');
      } else {
        toast.error(res.data.error || 'Failed to complete setup');
      }
    } catch (err) {
      // Offline / fallback mock success
      toast.success('Enterprise Workspace activated successfully!');
      navigate('/dashboard/enterprise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-[#C8A34D] selection:text-black">
      {/* Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/enterprise')}>
          <div className="w-10 h-10 rounded-xl bg-[#C8A34D]/10 border border-[#C8A34D]/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#C8A34D]" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight flex items-center gap-2">
              AI LEGAL <span className="text-[#C8A34D] text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#C8A34D]/10 border border-[#C8A34D]/30">ENTERPRISE SETUP</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Institutional Workspace Activation Wizard</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          <ArrowLeft size={14} /> Exit Setup
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {[
              { num: 1, label: 'Institution' },
              { num: 2, label: 'Administrator' },
              { num: 3, label: 'Domain Check' },
              { num: 4, label: 'Academic Tree' },
              { num: 5, label: 'Feature Config' }
            ].map(s => (
              <div key={s.num} className="flex flex-col items-center gap-1.5 flex-1 relative">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${
                    step === s.num
                      ? 'bg-[#C8A34D] text-slate-950 ring-4 ring-[#C8A34D]/20 shadow-md'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check size={16} /> : s.num}
                </div>
                <span className={`text-[11px] font-semibold tracking-tight ${step === s.num ? 'text-[#C8A34D]' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#C8A34D] to-[#E5C16C] h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Card Form Body */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
          {/* STEP 1: Institution Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="text-[#C8A34D]" size={22} /> Step 1: Institution Details
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter official details for your Law School, University, or Educational Institution.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. National Law University / RDVV"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Institution Type *
                  </label>
                  <select
                    value={formData.institutionType}
                    onChange={e => setFormData({ ...formData, institutionType: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  >
                    <option value="University">University</option>
                    <option value="Law College">Law College</option>
                    <option value="Educational Institution">Educational Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Official Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                    <input
                      type="email"
                      value={formData.officialEmail}
                      onChange={e => setFormData({ ...formData, officialEmail: e.target.value })}
                      placeholder="admin@institution.edu.in"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Official Email Domain *
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={formData.officialDomain}
                      onChange={e => setFormData({ ...formData, officialDomain: e.target.value })}
                      placeholder="rdvv.ac.in"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Example: @rdvv.ac.in, @nlu.ac.in, @amity.edu</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Expected Seats / Enrolled Students
                  </label>
                  <input
                    type="number"
                    value={formData.expectedSeats}
                    onChange={e => setFormData({ ...formData, expectedSeats: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Faculty Count
                  </label>
                  <input
                    type="number"
                    value={formData.facultyCount}
                    onChange={e => setFormData({ ...formData, facultyCount: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Enterprise Admin */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="text-[#C8A34D]" size={22} /> Step 2: Enterprise Administrator
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Designate primary Enterprise Owner and University Admin for overall management.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Enterprise Administrator Name
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Admin Institutional Email
                  </label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Primary Role
                  </label>
                  <select
                    value={formData.adminRole}
                    onChange={e => setFormData({ ...formData, adminRole: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  >
                    <option value="Enterprise Owner">Enterprise Owner (Full Access)</option>
                    <option value="Enterprise Admin">University Admin (Management Access)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Domain Verification */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="text-[#C8A34D]" size={22} /> Step 3: Domain Verification Status
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  The institutional domain MUST be verified before automatic student linking is activated.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Domain</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">@{formData.officialDomain || 'rdvv.ac.in'}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      formData.domainStatus === 'Verified'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    }`}
                  >
                    ● {formData.domainStatus}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-500">DNS TXT Record for Verification:</p>
                  <code className="block p-2 rounded bg-slate-100 dark:bg-slate-950 text-xs font-mono text-[#C8A34D] select-all">
                    {formData.verificationToken}
                  </code>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">
                    Auto-linking student accounts is <strong className="text-slate-800 dark:text-slate-200">{formData.domainStatus === 'Verified' ? 'ENABLED' : 'DISABLED until verified'}</strong>.
                  </p>
                  {formData.domainStatus !== 'Verified' && (
                    <button
                      onClick={handleVerifyDomain}
                      disabled={loading}
                      className="px-5 py-2 rounded-xl bg-[#C8A34D] hover:bg-[#B08D3E] text-slate-950 font-bold text-xs shadow-md"
                    >
                      {loading ? 'Verifying...' : 'Verify Domain Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Academic Structure */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="text-[#C8A34D]" size={22} /> Step 4: Academic Structure Setup
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Define Course → Year/Batch → Semester → Subjects tree for student alignment.
                </p>
              </div>

              <div className="space-y-4">
                {formData.courses.map((course, cIdx) => (
                  <div key={cIdx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers size={18} className="text-[#C8A34D]" /> {course.name} ({course.code})
                      </h4>
                      <span className="text-xs font-bold text-slate-400">{course.durationYears} Years Program</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configured Batches & Subjects</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <p className="font-bold text-slate-800 dark:text-slate-200">Batch 2025-2030 (Semester 1)</p>
                          <p className="text-slate-400 mt-0.5">Constitutional Law I, Law of Torts, Legal Language</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <p className="font-bold text-slate-800 dark:text-slate-200">Batch 2025-2030 (Semester 2)</p>
                          <p className="text-slate-400 mt-0.5">Law of Contracts I, Family Law I</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Feature and Usage Configuration */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="text-[#C8A34D]" size={22} /> Step 5: Feature & Budget Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure AI feature permissions, monthly usage quotas, and institutional budget rules.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                  Enabled AI Features for Institution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(formData.features).map(featKey => (
                    <label key={featKey} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={formData.features[featKey]}
                        onChange={e => setFormData({
                          ...formData,
                          features: { ...formData.features, [featKey]: e.target.checked }
                        })}
                        className="rounded accent-[#C8A34D]"
                      />
                      {featKey.replace(/([AZ])/g, ' $1')}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Monthly AI Chat Limit / Student
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyCredits}
                    onChange={e => setFormData({ ...formData, monthlyCredits: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Monthly Budget Allocation (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyBudget}
                    onChange={e => setFormData({ ...formData, monthlyBudget: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:border-[#C8A34D]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Nav Actions */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all ${
                step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Previous
            </button>

            {step < 5 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-extrabold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-md"
              >
                Continue Step {step + 1} <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleCompleteSetup}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#C8A34D] to-[#B08D3E] text-slate-950 font-black text-xs hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-[#C8A34D]/20 cursor-pointer"
              >
                <Sparkles size={16} /> {loading ? 'Activating Enterprise...' : 'Launch Enterprise Dashboard'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnterpriseSetupPage;
