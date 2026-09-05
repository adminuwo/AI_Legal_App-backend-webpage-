import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, Sparkles, FileText, Briefcase, BarChart2, Compass, PenTool, ShieldCheck, ArrowRight } from 'lucide-react';

const slides = [
  {
    topic: 'Welcome',
    tokens: [
      { text: 'Welcome to ' },
      { text: 'AI Legal™', bold: true },
      { text: '. I will show you how AI Legal™ helps ' },
      { text: 'advocates and law firms', bold: true },
      { text: ' work ' },
      { text: 'faster and smarter', bold: true },
      { text: '.' }
    ],
    icon: Sparkles,
    accentGlow: '#111111'
  },
  {
    topic: 'Contract Analyzer',
    tokens: [
      { text: 'Upload ' },
      { text: 'any agreement', bold: true },
      { text: ' and receive an ' },
      { text: 'AI-powered legal review', bold: true },
      { text: ', clause analysis, compliance checks and risk detection.' }
    ],
    icon: FileText,
    accentGlow: '#3B82F6'
  },
  {
    topic: 'My Matters · Legal CRM',
    tokens: [
      { text: 'Organise ' },
      { text: 'cases', bold: true },
      { text: ', ' },
      { text: 'clients', bold: true },
      { text: ', documents, ' },
      { text: 'evidence', bold: true },
      { text: ', hearings, notes, timelines and ' },
      { text: 'AI insights', bold: true },
      { text: ' in one unified legal workspace.' }
    ],
    icon: Briefcase,
    accentGlow: '#0EA5E9'
  },
  {
    topic: 'Case Predictor',
    tokens: [
      { text: 'Analyze ' },
      { text: 'evidence', bold: true },
      { text: ', estimate ' },
      { text: 'litigation outcomes', bold: true },
      { text: ' and identify strengths, weaknesses and courtroom scenarios.' }
    ],
    icon: BarChart2,
    accentGlow: '#EF4444'
  },
  {
    topic: 'Strategy Engine',
    tokens: [
      { text: 'Generate complete ' },
      { text: 'litigation strategy', bold: true },
      { text: ' including arguments, ' },
      { text: 'evidence roadmap', bold: true },
      { text: ', negotiation tactics and court prep.' }
    ],
    icon: Compass,
    accentGlow: '#10B981'
  },
  {
    topic: 'AI Drafting',
    tokens: [
      { text: 'Draft ' },
      { text: 'professional legal documents', bold: true },
      { text: ' instantly with AI while maintaining legal ' },
      { text: 'formatting and structure', bold: true },
      { text: '.' }
    ],
    icon: PenTool,
    accentGlow: '#F59E0B'
  },
  {
    topic: 'Ready',
    tokens: [
      { text: 'You are now ready to ' },
      { text: 'experience AI Legal™', bold: true },
      { text: '. Let\'s get started with your ' },
      { text: 'litigation dashboard', bold: true },
      { text: '.' }
    ],
    icon: ShieldCheck,
    accentGlow: '#6366F1'
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  const typingTimeoutRef = useRef(null);
  const speechRef = useRef(null);

  const slide = slides[currentSlide];
  const fullText = slide.tokens.map(t => t.text).join('');

  // ─── Voice Narration (Web Speech Synthesis API) ───────────────────
  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = (textToSpeak) => {
    stopAudio();
    if (isVoiceMuted || !window.speechSynthesis) return;

    try {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.92;
      utterance.pitch = 1.15; // Pleasant female pitch
      utterance.lang = 'en-US';

      // Find best available female voice in browser (matching mobile app priority)
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find((v) => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        return (
          (lang.startsWith('en') || lang.startsWith('hi')) &&
          (name.includes('zira') ||
            name.includes('female') ||
            name.includes('samantha') ||
            name.includes('veena') ||
            name.includes('heera') ||
            name.includes('karen') ||
            name.includes('victoria') ||
            name.includes('siri') ||
            name.includes('google us english') ||
            name.includes('natural') ||
            name.includes('jenny') ||
            name.includes('aria'))
        );
      }) || voices.find((v) => v.lang.startsWith('en') && !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('mark') && !v.name.toLowerCase().includes('george'));

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Onboarding] Speech error:', e);
      setIsSpeaking(false);
    }
  };

  // ─── Typewriter & Speech Effect Per Slide ────────────────────────
  useEffect(() => {
    setVisibleCount(0);
    setIsSpeaking(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let charIdx = 0;
    const typeNextChar = () => {
      if (charIdx <= fullText.length) {
        setVisibleCount(charIdx);
        charIdx++;
        typingTimeoutRef.current = setTimeout(typeNextChar, 28);
      } else {
        setIsSpeaking(false);
      }
    };

    typeNextChar();
    speakText(fullText);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopAudio();
    };
  }, [currentSlide, isVoiceMuted]);

  // Mascot Eye Blinking Loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  // Complete onboarding helper
  const completeOnboarding = (targetRoute = '/login') => {
    stopAudio();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    localStorage.setItem('ai_legal_onboarding_completed', 'true');
    navigate(targetRoute, { replace: true });
  };

  const handleNext = () => {
    if (visibleCount < fullText.length) {
      // Skip typing: instantly reveal full text & stop speech
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setVisibleCount(fullText.length);
      stopAudio();
      setIsSpeaking(false);
      return;
    }

    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      completeOnboarding('/login');
    }
  };

  const toggleVoice = () => {
    if (isVoiceMuted) {
      setIsVoiceMuted(false);
      speakText(fullText);
    } else {
      setIsVoiceMuted(true);
      stopAudio();
      setIsSpeaking(false);
    }
  };

  // Helper to render styled rich token text slice
  const renderTypewrittenTokens = () => {
    let accumulated = 0;
    return slide.tokens.map((token, tIdx) => {
      const tokenStart = accumulated;
      accumulated += token.text.length;

      if (visibleCount <= tokenStart) return null;

      const visibleChars = Math.min(token.text.length, visibleCount - tokenStart);
      const textSlice = token.text.slice(0, visibleChars);

      return (
        <span
          key={tIdx}
          className={token.bold ? 'font-extrabold text-[#111111] dark:text-white' : 'font-normal text-slate-700 dark:text-slate-200'}
        >
          {textSlice}
        </span>
      );
    });
  };

  const SlideIcon = slide.icon;

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col justify-between items-center relative overflow-hidden select-none font-sans text-slate-900 dark:text-white transition-colors">

      {/* Background Aura Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-slate-200/50 dark:bg-slate-800/40 blur-3xl pointer-events-none" />

      {/* Background Courthouse Silhouette */}
      <div className="absolute top-20 opacity-10 pointer-events-none flex flex-col items-center">
        <div className="w-0 h-0 border-l-[160px] border-l-transparent border-r-[160px] border-r-transparent border-b-[40px] border-b-slate-600" />
        <div className="w-80 h-2 bg-slate-600 my-1" />
        <div className="flex justify-between w-72 h-20">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-3.5 h-full bg-slate-600" />
          ))}
        </div>
        <div className="w-84 h-3 bg-slate-600" />
      </div>

      {/* ─── Top Control Bar ─── */}
      <header className="w-full max-w-5xl px-6 py-5 flex items-center justify-between z-20">
        <button
          onClick={toggleVoice}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-[#C8A34D] text-xs font-black tracking-wide transition-all cursor-pointer"
        >
          {isVoiceMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#C8A34D]" />}
          <span>{isVoiceMuted ? 'Voice OFF' : 'Voice ON'}</span>
        </button>

        <button
          onClick={() => completeOnboarding('/login')}
          className="px-4 py-1.5 rounded-full bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] text-xs font-black tracking-wide shadow-xs transition-all cursor-pointer"
        >
          Skip
        </button>
      </header>

      {/* ─── Center Mascot Character Section ─── */}
      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center relative z-10 px-4">

        {/* Mascot Wrapper & Background Halo */}
        <div className="relative flex flex-col items-center justify-center my-6">

          {/* Background Circular Halo (Matching Mobile App) */}
          <div className="w-80 h-80 rounded-full bg-slate-200/50 dark:bg-slate-800/40 border border-slate-300/30 dark:border-slate-700/30 absolute -top-10 z-0 pointer-events-none" />

          {/* ─── Slender Chibi Character Composition (100% 1-to-1 Pixel Parity with Mobile App) ─── */}
          <div className="relative w-[140px] h-[180px] flex justify-center items-center z-10 transition-transform hover:scale-105">

            {/* Waist Shadow */}
            <div className="absolute -bottom-2.5 w-[90px] h-[16px] rounded-[8px] bg-slate-900/10 dark:bg-slate-900/40 blur-[2px] transform scale-x-85 z-1" />

            {/* Voluminous Back Hair Plate */}
            <div className="absolute bottom-[40px] w-[76px] h-[95px] bg-[#1E293B] rounded-[25px] border-[2px] border-[#0F172A] z-9" />

            {/* Torso Composition */}
            <div className="absolute bottom-0 w-[82px] h-[80px] flex flex-col items-center z-10">

              {/* White Crossover Shirt Collar */}
              <div className="absolute -top-[2px] w-[24px] h-[14px] flex z-15">
                <div className="flex-1 bg-white rounded-bl-[10px] transform rotate-[30deg] border-r-[2px] border-b-[2px] border-[#0F172A]" />
                <div className="flex-1 bg-white rounded-br-[10px] transform -rotate-[30deg] border-l-[2px] border-b-[2px] border-[#0F172A]" />
              </div>

              {/* Double Advocate Neck Bands */}
              <div className="absolute top-[10px] flex gap-[1.5px] z-16">
                <div className="w-[4.5px] h-[18px] bg-white border-[1.5px] border-[#0F172A] rounded-b-[1px]" />
                <div className="w-[4.5px] h-[18px] bg-white border-[1.5px] border-[#0F172A] rounded-b-[1px]" />
              </div>

              {/* Blazer Coat */}
              <div className="absolute bottom-0 w-[68px] h-[72px] bg-[#27272A] border-[2px] border-[#0F172A] rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[20px] rounded-br-[20px] z-12 overflow-hidden">
                <div className="absolute top-0 left-[10px] w-[10px] h-[40px] bg-[#18181B] border-r-[1.5px] border-[#0F172A] transform rotate-[12deg]" />
                <div className="absolute top-0 right-[10px] w-[10px] h-[40px] bg-[#18181B] border-l-[1.5px] border-[#0F172A] transform -rotate-[12deg]" />
              </div>

              {/* Folded Sleeves */}
              <div className="absolute top-[16px] -left-[2px] w-[22px] h-[38px] bg-[#27272A] border-[2px] border-[#0F172A] rounded-tl-[10px] rounded-bl-[12px] rounded-br-[6px] transform rotate-[32deg] z-13" />
              <div className="absolute top-[16px] -right-[2px] w-[22px] h-[38px] bg-[#27272A] border-[2px] border-[#0F172A] rounded-tr-[10px] rounded-br-[12px] rounded-bl-[6px] transform -rotate-[32deg] z-13" />

              {/* Joined Hands Overlay */}
              <div className="absolute bottom-[12px] w-[28px] h-[18px] z-20 flex justify-center items-center">
                <div className="absolute w-[22px] h-[12px] bg-[#FCD5BE] border-[2px] border-[#0F172A] rounded-[6px] transform -rotate-[12deg]" />
                <div className="absolute w-[22px] h-[12px] bg-[#FCD5BE] border-[2px] border-[#0F172A] rounded-[6px] transform rotate-[12deg] flex justify-around px-[2px]">
                  <div className="w-[1.5px] h-[4px] bg-[#EAA882] rounded-[0.5px] mt-[2px]" />
                  <div className="w-[1.5px] h-[4px] bg-[#EAA882] rounded-[0.5px] mt-[2px]" />
                </div>
              </div>
            </div>

            {/* Chibi Head Composition (100% Exact 1-to-1 Parity with Mobile App onboarding.tsx) */}
            <div className="absolute bottom-[74px] w-[60px] h-[64px] flex flex-col items-center z-22">

              {/* Side Ears */}
              <div className="absolute left-[2px] top-[26px] w-[8px] h-[12px] bg-[#FCD5BE] border-[2px] border-[#0F172A] rounded-tl-[5px] rounded-bl-[5px] z-19" />
              <div className="absolute right-[2px] top-[26px] w-[8px] h-[12px] bg-[#FCD5BE] border-[2px] border-[#0F172A] rounded-tr-[5px] rounded-br-[5px] z-19" />

              {/* Face Panel */}
              <div className="w-[50px] h-[52px] bg-[#FCD5BE] border-[2px] border-[#0F172A] rounded-[24px] relative flex flex-col items-center justify-center z-22">

                {/* Nose */}
                <div className="absolute top-[26px] w-[2.2px] h-[4px] bg-[#EAA882] rounded-[1px] z-34" />

                {/* Soft Pink Blush Cheeks */}
                <div className="absolute left-[6px] bottom-[15px] w-[9px] h-[7px] bg-[#FCA5A5] rounded-[4.5px] opacity-75 z-28" />
                <div className="absolute right-[6px] bottom-[15px] w-[9px] h-[7px] bg-[#FCA5A5] rounded-[4.5px] opacity-75 z-28" />

                {/* Expressive Eyes & Eyelash Detail */}
                <div className="w-[28px] flex justify-between absolute top-[18px] z-30">
                  <div className="w-[9px] h-[10px] relative">
                    <div className="w-[9px] h-[9px] bg-[#111111] rounded-full border-[2px] border-[#0F172A] overflow-hidden flex items-center justify-center">
                      {!isBlinking && (
                        <div className="w-[2px] h-[2px] bg-white rounded-full absolute top-[1px] left-[1px]" />
                      )}
                    </div>
                    <div className="absolute -top-[1px] -left-[1.5px] w-[11px] h-[3px] border-t-[2px] border-[#0F172A] rounded-tl-[5px]" />
                  </div>

                  <div className="w-[9px] h-[10px] relative">
                    <div className="w-[9px] h-[9px] bg-[#111111] rounded-full border-[2px] border-[#0F172A] overflow-hidden flex items-center justify-center">
                      {!isBlinking && (
                        <div className="w-[2px] h-[2px] bg-white rounded-full absolute top-[1px] left-[1px]" />
                      )}
                    </div>
                    <div className="absolute -top-[1px] -right-[1.5px] w-[11px] h-[3px] border-t-[2px] border-[#0F172A] rounded-tr-[5px]" />
                  </div>
                </div>

                {/* Thin High Curved Eyebrows */}
                <div className="w-[30px] flex justify-between absolute top-[10px] z-32">
                  <div className="w-[9px] h-[2px] bg-[#0F172A] rounded-t-[1px] transform rotate-[5deg]" />
                  <div className="w-[9px] h-[2px] bg-[#0F172A] rounded-t-[1px] transform -rotate-[5deg]" />
                </div>

                {/* Gentle Smiling Mouth */}
                <div className="absolute bottom-[9px] w-[16px] h-[8px] flex items-center justify-center z-30">
                  <div className={`w-[10px] border-b-[2px] border-[#0F172A] rounded-bl-[5px] rounded-br-[5px] transition-all duration-150 ${isSpeaking ? 'h-[5px] bg-[#EAA882]/40' : 'h-[4px]'}`} />
                </div>
              </div>

              {/* Professional Hair Cap Rim (Matching Mobile Screenshot 2 Ditto Same to Same) */}
              <div className="absolute -top-[5px] w-[52px] h-[14px] bg-[#1E293B] rounded-t-[22px] rounded-b-[4px] border-[2px] border-[#0F172A] z-35 pointer-events-none" />

            </div>

          </div>
        </div>

        {/* ─── Interactive Message Card Container ─── */}
        <div className="w-full max-w-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 z-20 relative">

          {/* Card Topic Badge */}
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#C8A34D]">
            <SlideIcon className="w-4 h-4 text-[#C8A34D]" />
            <span>{slide.topic}</span>
          </div>

          {/* Typewriter Text Box */}
          <div className="min-h-[75px] text-sm sm:text-base leading-relaxed font-medium">
            {renderTypewrittenTokens()}
            {visibleCount < fullText.length && (
              <span className="inline-block font-bold text-[#111111] dark:text-white animate-pulse ml-0.5">
                ▌
              </span>
            )}
          </div>

          {/* Controls Footer Row: Progress Dots + Next/Skip Typing CTA */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">

            {/* 7 Progress Indicator Dots */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, sIdx) => (
                <div
                  key={sIdx}
                  className={`h-2 rounded-full transition-all duration-300 ${sIdx === currentSlide
                      ? 'w-6 bg-[#C8A34D]'
                      : 'w-2 bg-slate-200 dark:bg-slate-700'
                    }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            {currentSlide < slides.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] text-xs font-black tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{visibleCount < fullText.length ? 'Skip Typing ›' : 'Next'}</span>
                {visibleCount >= fullText.length && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => completeOnboarding('/signup')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Register
                </button>
                <button
                  onClick={() => completeOnboarding('/login')}
                  className="px-5 py-2.5 rounded-xl bg-[#C8A34D] hover:bg-[#b08d3b] text-[#111111] text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full py-4 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 z-10">
        AI LEGAL™ • The Legal Operating System for Modern Advocates
      </footer>
    </div>
  );
}
