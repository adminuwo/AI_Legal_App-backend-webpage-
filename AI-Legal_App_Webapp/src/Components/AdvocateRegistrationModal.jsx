import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldCheck, Scale, Award, FileText, CheckCircle2, 
  AlertCircle, ChevronRight, Check, DollarSign, Clock, MapPin,
  ArrowLeft, MessageSquare, Phone, Video, Calculator, Sparkles,
  Paperclip
} from 'lucide-react';
import toast from 'react-hot-toast';
import consultationService from '../services/consultationService';

const ALL_PRACTICE_AREAS = [
  'Civil Law', 'Criminal Law', 'Commercial Law', 'Corporate Law', 
  'Cyber Law', 'Family Law', 'Property Law', 'Consumer Law', 
  'Constitutional Law', 'Taxation Law', 'Labor & Employment', 'Arbitration'
];

const ALL_COURTS = [
  'Supreme Court of India',
  'Delhi High Court',
  'Bombay High Court',
  'Karnataka High Court',
  'Allahabad High Court',
  'District & Sessions Court',
  'Consumer Disputes Commission',
  'National Company Law Tribunal (NCLT)'
];

const ALL_LANGUAGES = ['English', 'Hindi', 'Marathi', 'Kannada', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Punjabi'];

const BAR_COUNCILS = [
  'Bar Council of Delhi',
  'Bar Council of Maharashtra & Goa',
  'Bar Council of Karnataka',
  'Bar Council of Uttar Pradesh',
  'Bar Council of West Bengal',
  'Bar Council of Tamil Nadu & Puducherry',
  'Bar Council of Gujarat',
  'Bar Council of Punjab & Haryana',
  'Bar Council of Madhya Pradesh',
  'Bar Council of Rajasthan',
  'Bar Council of India'
];

export default function AdvocateRegistrationModal({ isOpen, onClose, onSuccess, initialPrefill = {} }) {
  const [step, setStep] = useState(1); // 1: DETAILS, 2: CONSENT, 3: REVIEW
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields (Step 1)
  const [fullName, setFullName] = useState('');
  const [barCouncil, setBarCouncil] = useState('');
  const [barEnrollmentNumber, setBarEnrollmentNumber] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState('');
  const [selectedPracticeAreas, setSelectedPracticeAreas] = useState(['Civil Law', 'Corporate Law']);
  const [selectedCourts, setSelectedCourts] = useState(['High Court']);
  const [experienceYears, setExperienceYears] = useState('5+ Years');
  const [selectedLanguages, setSelectedLanguages] = useState(['English', 'Hindi']);
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('1500');
  const [consultationTypes, setConsultationTypes] = useState(['chat', 'audio', 'video']);
  const [availability, setAvailability] = useState('Available Today (10 AM - 6 PM)');
  const [verificationDocName, setVerificationDocName] = useState('Bar_Council_Enrollment_Certificate.pdf');

  // Step 2: Consent Checkbox (MUST NOT be pre-selected)
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Dynamic 30% Platform Fee & Per-Minute Extension Calculations
  const rawFee = Math.max(0, parseInt(consultationFee, 10) || 0);
  const platformCut = Math.round(rawFee * 0.30);
  const advocatePayout = rawFee - platformCut;
  const perMinuteRate = rawFee > 0 ? Math.max(1, Math.round(rawFee / 15)) : 0;
  const advocatePerMinutePayout = Math.round(perMinuteRate * 0.70);
  const platformPerMinuteCut = perMinuteRate - advocatePerMinutePayout;

  useEffect(() => {
    if (isOpen) {
      consultationService.getAdvocateStatus().then(res => {
        if (res && res.success && res.prefill) {
          const p = res.prefill;
          if (p.fullName) setFullName(p.fullName);
          if (p.barCouncil) setBarCouncil(p.barCouncil);
          if (p.barEnrollmentNumber) setBarEnrollmentNumber(p.barEnrollmentNumber);
          if (p.enrollmentYear) setEnrollmentYear(String(p.enrollmentYear));
          if (p.practiceAreas?.length) setSelectedPracticeAreas(p.practiceAreas);
          if (p.courts?.length) setSelectedCourts(p.courts);
          if (p.experienceYears) setExperienceYears(p.experienceYears);
          if (p.languages?.length) setSelectedLanguages(p.languages);
          if (p.bio) setBio(p.bio);
          if (p.consultationFee != null) setConsultationFee(String(p.consultationFee));
          if (p.availability) setAvailability(p.availability);
          if (p.consultationTypes?.length) setConsultationTypes(p.consultationTypes);
          if (p.verificationDocument?.name) setVerificationDocName(p.verificationDocument.name);

          if (res.verificationStatus === 'pending') {
            setStep(3);
          } else {
            setStep(1);
          }
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const togglePracticeArea = (area) => {
    setSelectedPracticeAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const toggleCourt = (court) => {
    setSelectedCourts(prev => 
      prev.includes(court) ? prev.filter(c => c !== court) : [...prev, court]
    );
  };

  const toggleLanguage = (lang) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleConsultationType = (type) => {
    setConsultationTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleNextToConsent = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Please enter your full professional name.');
      return;
    }
    if (!barCouncil.trim()) {
      toast.error('Please select or specify your State Bar Council.');
      return;
    }
    if (!barEnrollmentNumber.trim()) {
      toast.error('Please enter your Bar Enrollment Number.');
      return;
    }
    if (selectedPracticeAreas.length === 0) {
      toast.error('Please select at least one practice area.');
      return;
    }
    setStep(2);
  };

  const handleSubmitRegistration = async () => {
    if (!consentAccepted) {
      toast.error('Please check the agreement box to accept the Revenue Share & Consultation Terms.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        fullName: fullName.trim(),
        barCouncil: barCouncil.trim(),
        barEnrollmentNumber: barEnrollmentNumber.trim(),
        enrollmentYear: enrollmentYear.trim() || String(new Date().getFullYear()),
        practiceAreas: selectedPracticeAreas.length ? selectedPracticeAreas : ['General Practice'],
        courts: selectedCourts.length ? selectedCourts : ['High Court'],
        experienceYears: experienceYears || '3+ Years',
        languages: selectedLanguages.length ? selectedLanguages : ['English', 'Hindi'],
        bio: bio.trim(),
        consultationFee: rawFee,
        consultationDuration: 15,
        perMinuteRate: perMinuteRate,
        consultationTypes: consultationTypes.length ? consultationTypes : ['chat', 'audio', 'video'],
        availability: availability || 'Available Today',
        consentAccepted: true,
      };

      const res = await consultationService.submitAdvocateRegistration(payload);
      if (res && res.success) {
        toast.success(res.message || 'Verification details submitted successfully!', {
          icon: '⚖️',
          duration: 4000
        });
        setStep(3);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.message || 'Failed to submit registration.');
      }
    } catch (err) {
      console.error('Advocate registration error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit verification details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6"
        >
          {/* Modal Header Matching Mobile Top App Bar */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#111827]">
            <div className="flex items-center gap-3">
              {step > 1 && step < 3 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Become a Verified Advocate
              </h2>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* 3-Step Wizard Indicator (Matching Mobile App Exactly) */}
          <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
            <div className="flex items-center gap-2 sm:gap-4 max-w-md w-full justify-between">
              {/* Step 1 Indicator */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === 1 ? 'bg-[#C8A34D] text-slate-950 shadow-sm' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  step === 1 ? 'text-[#C8A34D]' : step > 1 ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  Details
                </span>
              </div>

              {/* Connecting Line 1-2 */}
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${step > 1 ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`} />

              {/* Step 2 Indicator */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === 2 ? 'bg-[#C8A34D] text-slate-950 shadow-sm' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {step > 2 ? '✓' : '2'}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  step === 2 ? 'text-[#C8A34D]' : step > 2 ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  Consent
                </span>
              </div>

              {/* Connecting Line 2-3 */}
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${step > 2 ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`} />

              {/* Step 3 Indicator */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === 3 ? 'bg-[#C8A34D] text-slate-950 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  3
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  step === 3 ? 'text-[#C8A34D]' : 'text-slate-400'
                }`}>
                  Review
                </span>
              </div>
            </div>
          </div>

          {/* ================= STEP 1: DETAILS ================= */}
          {step === 1 && (
            <form onSubmit={handleNextToConsent} className="p-6 space-y-4 max-h-[68vh] overflow-y-auto custom-scrollbar">
              {/* Primary Bar Council Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name (as per Bar Council) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adv. Rajesh Sharma"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    State Bar Council <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={barCouncil}
                    onChange={(e) => setBarCouncil(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] transition-all font-semibold"
                  >
                    <option value="">Select State Bar Council...</option>
                    {BAR_COUNCILS.map(bc => (
                      <option key={bc} value={bc}>{bc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bar Enrollment Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={barEnrollmentNumber}
                    onChange={(e) => setBarEnrollmentNumber(e.target.value)}
                    placeholder="e.g. MAH/5621/2017"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] transition-all font-semibold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Enrollment Year
                  </label>
                  <input 
                    type="text" 
                    value={enrollmentYear}
                    onChange={(e) => setEnrollmentYear(e.target.value)}
                    placeholder="e.g. 2017"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Practice Areas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Practice Areas <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PRACTICE_AREAS.map(area => {
                    const isSelected = selectedPracticeAreas.includes(area);
                    return (
                      <button
                        type="button"
                        key={area}
                        onClick={() => togglePracticeArea(area)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#C8A34D] text-slate-950 shadow-xs font-black' 
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {area} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Courts */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Primary Courts
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_COURTS.map(court => {
                    const isSelected = selectedCourts.includes(court);
                    return (
                      <button
                        type="button"
                        key={court}
                        onClick={() => toggleCourt(court)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs' 
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {court} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Experience & Fee Input Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Years Experience
                  </label>
                  <select
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] transition-all font-semibold"
                  >
                    <option value="1-3 Years">1-3 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                    <option value="10+ Years">10+ Years</option>
                    <option value="15+ Years">15+ Years</option>
                    <option value="20+ Years">20+ Years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Consultation Fee (₹ / 15 Mins) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <input 
                      type="number" 
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      placeholder="1500"
                      min="0"
                      required
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 30% Platform Deduction & 15-Min Extension Breakdown Card */}
              <div className="p-4 rounded-2xl border border-[#C8A34D]/40 bg-[#FFFDF5] dark:bg-[#1A1824] space-y-2.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#C8A34D]" />
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    15-Min Consultation Payout & Extension Rates
                  </h4>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Initial 15-Min Fee (Client Pays):</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{rawFee}</span>
                  </div>

                  <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                    <span>AI Legal™ Platform Infrastructure Fee (30%):</span>
                    <span className="font-bold">- ₹{platformCut}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="font-extrabold">Your Net Disbursal (70%):</span>
                    <span className="text-sm font-black">₹{advocatePayout} / 15 Mins</span>
                  </div>
                </div>

                {/* Dynamic Per-Minute Extension Notice */}
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-[#2C220E]/60 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="block font-bold">Per-Minute Session Extension:</strong>
                    If the consultation continues past 15 minutes, extension is billed dynamically at <strong>₹{perMinuteRate}/min</strong> (You receive <strong>₹{advocatePerMinutePayout}/min</strong> after 30% platform fee). Please set your 15-min fee accordingly.
                  </div>
                </div>
              </div>

              {/* Languages Spoken */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Languages Spoken
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_LANGUAGES.map(lang => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#C8A34D] text-slate-950 font-black' 
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {lang} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Professional Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Professional Bio
                </label>
                <textarea 
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Introduce your legal experience, notable practice domains, and representation approach..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#B88B2A] transition-all font-medium resize-none"
                />
              </div>

              {/* Supported Consultation Channels */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Supported Consultation Channels
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'chat', label: 'Chat', icon: MessageSquare },
                    { id: 'audio', label: 'Audio Call', icon: Phone },
                    { id: 'video', label: 'Video Call', icon: Video },
                  ].map(c => {
                    const active = consultationTypes.includes(c.id);
                    const Icon = c.icon;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleConsultationType(c.id)}
                        className={`p-3 rounded-2xl border-1.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          active 
                            ? 'border-[#C8A34D] bg-[#FEF3C7] dark:bg-[#2C220E] text-[#B88B2A] shadow-xs' 
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-bold">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verification Document Upload Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Verification Document (Bar ID or Enrollment Certificate)
                </label>
                <div className="p-4 rounded-2xl border-1.5 border-dashed border-[#C8A34D] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center">
                  <Paperclip className="w-6 h-6 text-[#C8A34D] mb-1.5" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{verificationDocName}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">✓ Document attached for professional admin review.</p>
                </div>
              </div>

              {/* Next Step Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#C8A34D] hover:bg-[#b5923f] text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Review Consent Terms</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ================= STEP 2: CONSENT ================= */}
          {step === 2 && (
            <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto custom-scrollbar">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-[#C8A34D]" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Advocate Profile & Consultation Consent
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  By proceeding with verification, you agree to the following terms regarding your professional profile, revenue share, and client consultations on AI Legal™:
                </p>

                {/* Terms List */}
                <div className="space-y-2.5">
                  {[
                    'Have your professional profile listed in the AI Legal Verified Advocate directory.',
                    'Allow General Users to discover your professional profile and credentials.',
                    'Receive consultation requests and matters from verified General Users.',
                    'AI Legal™ Platform Fee (30% Deduction): Unified Web Options & Services Pvt. Ltd. retains a thirty percent (30%) technology infrastructure, payment gateway, and escrow facilitation fee on all initial 15-minute consultations and subsequent per-minute extensions.',
                    '70% Net Disbursal: Advocate receives seventy percent (70%) of all generated consultation fees disbursed directly to their registered bank account.',
                    '15-Minute Base Consultation Duration: All initial consultation bookings strictly cover a 15-minute live consultation session.',
                    'Per-Minute Extension Billing: Consultations exceeding 15 minutes bill dynamically per minute at (Base Fee ÷ 15), subject to client consent and the standard 70/30 distribution.',
                    'Allow users to initiate consultation-related communication through AI Legal.',
                    'Display selected professional information publicly in the advocate directory.',
                    'Receive notifications and messages related to client consultation requests.',
                    'Manage or update your availability, consultation channels, and consultation fees.',
                  ].map((term, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{term}</span>
                    </div>
                  ))}
                </div>

                {/* 70/30 Revenue Share Highlight Box */}
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>70/30 Platform Revenue Share & 15-Min Extension Policy</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    Advocate explicitly agrees that AI Legal™ provides verified client acquisition, Section 65B encrypted call vaults, and instant payment escrow. A 30% platform fee is deducted on all consultations. You receive 70% direct disbursal. Initial consultations are for 15 minutes; any extended time bills per minute dynamically.
                  </p>
                </div>

                {/* Privacy Box */}
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2 text-xs">
                  <div className="font-extrabold text-[#C8A34D] flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Privacy & Data Protection Guarantee</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Publicly Displayed:</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                      Name, Profile Photo, Verified Badge, Practice Areas, Courts, Experience, Languages, Consultation Fee, Availability, and Bio.
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-red-600 dark:text-red-400 block text-[11px]">Strictly Kept Private:</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                      Aadhaar, PAN, private identity documents, internal admin verification notes, and sensitive personal contact records.
                    </p>
                  </div>
                </div>

                {/* Mandatory Consent Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-[#C8A34D] rounded-md border-slate-300 focus:ring-[#C8A34D] cursor-pointer"
                    />
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-normal select-none">
                      I agree to the 70/30 Revenue Share Terms, 15-Minute Base Consultation & Per-Minute Extension Policy, and BCI Rule 36 Directory Guidelines.
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="w-full sm:w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ← Back to Details
                </button>

                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={submitting || !consentAccepted}
                  className="w-full sm:w-2/3 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b5923f] disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting Verification...</span>
                  ) : (
                    <span>Agree & Submit Details</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SUBMISSION CONFIRMATION ================= */}
          {step === 3 && (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-[#C8A34D] flex items-center justify-center text-[#C8A34D] shadow-md">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Verification Submitted
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your professional details have been submitted for verification. Once approved by the administrator, your profile will become visible to users looking for verified advocates.
                </p>
              </div>

              {/* Details Summary Card */}
              <div className="w-full max-w-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs space-y-2.5 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 font-extrabold text-[11px]">
                    ● Verification Pending
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Fee & Duration:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">₹{rawFee} / 15 Mins</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Your Net Payout (70%):</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{advocatePayout} / 15 Mins</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Extension Rate:</span>
                  <span className="font-extrabold text-[#C8A34D]">₹{perMinuteRate}/min (You get ₹{advocatePerMinutePayout}/min)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Consent:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ Accepted (Rule 36 + 70/30 Share)</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Review Time:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Usually within 24-48 hours</span>
                </div>
              </div>

              <div className="pt-2 w-full max-w-md">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-[#C8A34D] hover:bg-[#b5923f] text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer"
                >
                  Done • Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
