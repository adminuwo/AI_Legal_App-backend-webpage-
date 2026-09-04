import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { ImagePlus, PlaySquare, Headphones, Code, Sparkles, Zap, Search, Globe, FileText, Wand2, PlayCircle, Scale, Video, Brain, TrendingUp, Megaphone, Lock, Target, AlignLeft, Mic2, UserCircle } from 'lucide-react';
import LegalLogo from '../Tools/AI_Legal/components/LegalLogo.jsx';
import { useIsDark } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/* ─── Typewriter Engine ────────────────────────────────────── */

const TypewriterPrompt = ({ text, active }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!active) { setDisplayed(''); return; }

    let intervalId;
    let timeoutId = setTimeout(() => {
      let i = 0;
      intervalId = setInterval(() => {
        setDisplayed(text.slice(0, i));
        i++;
        if (i > text.length) clearInterval(intervalId);
      }, 35);
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, text]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 text-center z-20">
      <div className="bg-white/80 dark:bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-slate-200 dark:border-white/10 inline-block max-w-[90%] shadow-2xl">
        <p className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-800 dark:text-white leading-tight">
          <span className="text-primary mr-1">/</span>{displayed}
          <motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.6 }}
            className="inline-block w-1 h-3 bg-primary ml-0.5"
          />
        </p>
      </div>
    </div>
  );
};

const ToolPreviewContent = ({ id, prompt, active }) => {
  const { t } = useLanguage();
  const isDark = useIsDark();
  const [phase, setPhase] = useState('typing'); // typing -> generating -> result

  useEffect(() => {
    if (!active) { setPhase('typing'); return; }

    const typingTimer = setTimeout(() => {
      setPhase('generating');
    }, 2200);

    const generatingTimer = setTimeout(() => {
      setPhase('result');
    }, 3800);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(generatingTimer);
    };
  }, [active]);

  const getResultImage = () => {
    const images = {
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&h=250&auto=format&fit=crop",
      video: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&h=250&auto=format&fit=crop",
      edit_image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400&h=250&auto=format&fit=crop",
      image_to_video: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=400&h=250&auto=format&fit=crop"
    };
    return images[id] || null;
  };

  const getResultText = () => {
    const responses = {
      deep_search: [
        "Analysis Complete: 247 global datasets indexed.",
        "Trend identified: 18.2% growth in AI infrastructure.",
        "Conclusion: Sustainable tech is the leading sector for 2026."
      ],
      web_search: [
        "Live Feed [CNBC]: Market indices hit record highs today.",
        "SpaceX Update: Starship successfully reached orbit.",
        "Weather: Global temperatures stabilize near arctic regions."
      ],
      document: [
        "Source: Report_Final_v2.pdf",
        "Target Format: Microsoft Word (.docx)",
        "Status: 100% Conversion Successful",
        "Download: Ready for local storage."
      ],
      code: [
        "import torch",
        "import torch.nn as nn",
        "class AisaModel(nn.Module):",
        "   def forward(self, x):",
        "      return self.model(x)"
      ],
      audio: [
        "Processing Audio Track 04...",
        "Voice: Natural Male (British)",
        "Clarity: 99.8% High Fidelity",
        "Duration: 00:04:12"
      ],
      legal: [
        "Section 4.2 - Identified Liability Breach.",
        "Risk Factor: Moderate (72% probability code check).",
        "Recommendation: Amend clause 12 for compliance."
      ],
      aiad_agent: [
        "Orchestrating 30-day Campaign...",
        "Brand Voice calibrated: Premium",
        "Target Platforms: Instagram, LinkedIn, X",
        "Status: 90 Content Pieces Ready"
      ]
    };
    return responses[id] || ["AI Task Successfully Completed.", "Verified by AI LEGAL™ Engine V4.2", "Runtime: 0.8s Total Latency."];
  };

  return (
    <div className={`w-full h-full relative overflow-hidden flex flex-col ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
      <AnimatePresence mode="wait">
        {phase === 'typing' && (
          <motion.div
            key="typing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center p-4"
          >
            <TypewriterPrompt text={prompt} active={active} />
          </motion.div>
        )}

        {phase === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 p-4"
          >
            <div className="relative">
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.2, opacity: 1 }}
                transition={{ duration: 0.75, repeat: Infinity, repeatType: "reverse" }}
                className="w-16 h-16 rounded-full border-4 border-primary/20"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatType: "loop" }}
                className="absolute inset-0 border-t-4 border-primary rounded-full"
              />
            </div>
            <p className="text-[12px] font-black text-primary uppercase tracking-widest animate-pulse">{t('aisaAiGenerating')}</p>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 w-full h-full p-2"
          >
            {getResultImage() ? (
              <div className="w-full h-full rounded-xl overflow-hidden relative group">
                <img src={getResultImage()} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <p className="text-[10px] text-white font-bold truncate">{prompt}</p>
                </div>
              </div>
            ) : (
              <div className={`w-full h-full rounded-xl border p-2.5 flex flex-col justify-between shadow-inner ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-100'}`}>
                <div className="space-y-1">
                  {getResultText().map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className={`text-[9px] font-mono p-1 rounded-md ${id === 'code' ? 'bg-slate-900 text-blue-300' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-slate-100 pt-1.5 mt-auto">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain size={10} className="text-primary" />
                  </div>
                  <p className="text-[9px] font-black text-primary uppercase tracking-tight">{t('aiResultConfirmed')}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



/* ─── 3D Tilt Card ─────────────────────────────────────────── */

const ToolCard = ({ tool, onToolSelect, index, isFlipped, onFlip, onUnflip }) => {
  const { t } = useLanguage();
  const isDark = useIsDark();
  const cardRef = useRef(null);
  const { icon: Icon } = tool;

  // Mouse-tracked 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tiltX = useSpring(useTransform(y, [-70, 70], [15, -15]), { stiffness: 100, damping: 20 });
  const tiltY = useSpring(useTransform(x, [-70, 70], [-15, 15]), { stiffness: 100, damping: 20 });

  // Spotlight effect
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);

  // Interaction handlers
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    if (!isFlipped) {
      x.set(e.clientX - rect.left - rect.width / 2);
      y.set(e.clientY - rect.top - rect.height / 2);
    }

    spotlightX.set(e.clientX - rect.left);
    spotlightY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    x.set(0); y.set(0);
    onUnflip();
  };

  const handleMouseEnter = () => {
    if (tool.comingSoon) return;
    onFlip();
  };

  const handleCardClick = () => {
    if (tool.comingSoon) return;
    // Call onToolSelect immediately to ensure 1-click activation on all devices
    onToolSelect(tool.id);
  };


  const isActive = tool.active;

  return (
    <div
      className="relative w-full h-[85px] sm:h-[155px]"
      style={{ perspective: '1200px' }}
    >
      {/* Active Glow Backdrop */}
      {isActive && (
        <motion.div
          layoutId="activeGlow"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.1 }}
          className="absolute inset-[-10px] rounded-[30px] bg-primary/25 blur-2xl z-0 pointer-events-none"
        />
      )}

      <motion.div
        ref={cardRef}
        className={`w-full h-full relative cursor-pointer z-10 ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent' : ''} rounded-[20px]`}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          scale: isFlipped ? 1.02 : 1
        }}
        transition={{
          type: "spring", stiffness: 150, damping: 25
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
        onClick={handleCardClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        {/* INNER TILT WRAPPER - This handles the mouse tilt separately from the 180-flip */}
        <motion.div
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            rotateX: isFlipped ? 0 : tiltX,
            rotateY: isFlipped ? 0 : tiltY,
          }}
        >
          {/* FRONT SIDE */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[20px] border transition-all duration-500 backface-hidden overflow-hidden ${isActive
              ? (isDark ? 'bg-gradient-to-br from-primary/20 via-indigo-500/10 to-purple-500/20 border-primary shadow-[0_0_35px_rgba(var(--primary-rgb),0.3)] backdrop-blur-xl' : 'bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-blue-50/90 border-primary shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)]')
              : (isDark
                ? 'sidebar-glass border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]'
                : 'bg-white border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.05)]')
              }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Invisible Buffer for hover stability */}
            <div className="absolute inset-[-4px] z-[-1] pointer-events-auto" />

            {/* Spotlight Effect Layer */}
            <motion.div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-0 z-0"
              style={{
                background: useTransform(
                  [spotlightX, spotlightY],
                  ([latestX, latestY]) => `radial-gradient(600px circle at ${latestX}px ${latestY}px, rgba(255,255,255,0.06), transparent 80%)`
                ),
              }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
              style={{
                background: useTransform(
                  [spotlightX, spotlightY],
                  ([latestX, latestY]) => `radial-gradient(400px circle at ${latestX}px ${latestY}px, var(--color-primary), transparent 80%)`
                ),
              }}
            />

            {/* Content Wrapper (card-inner) */}
            <div className="relative z-10 w-full h-full p-3 sm:p-5 flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between mb-1 sm:mb-3">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-500"
                  style={{
                    background: isActive ? 'var(--color-primary)' : (isDark ? `${tool.color}15` : `${tool.color}10`),
                    border: isDark ? `1px solid ${tool.color}30` : `1px solid ${tool.color}20`,
                    boxShadow: isActive ? '0 0 15px var(--color-primary)' : 'none'
                  }}
                >
                  <Icon
                    size={16}
                    className="sm:w-[18px] sm:h-[18px]"
                    showText={tool.id === 'legal'}
                    style={{ color: isActive ? '#fff' : tool.color }}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 bg-gradient-to-r from-primary to-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse"
                    >
                      <div className="w-1 h-1 rounded-full bg-white animate-ping" />
                      {t('active')}
                    </motion.span>
                  )}
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isActive ? 'bg-primary/20 text-primary' : (isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500')
                    }`}>
                    {tool.badge}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <h3 className={`text-[11px] sm:text-[14px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {tool.label}
                </h3>
                <p className={`hidden sm:block text-[9.5px] sm:text-[10px] leading-snug line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tool.desc}
                </p>
              </div>
            </div>

            {tool.comingSoon && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[1px] rounded-[20px] pointer-events-none">
                <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${isDark ? 'bg-[#1a1c2e] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                  }`}>
                  {t('soon')}
                </div>
              </div>
            )}
          </div>

          {/* BACK SIDE (Review & Preview) */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[20px] border overflow-hidden flex flex-col backface-hidden transition-all duration-500 ${isActive
              ? (isDark ? 'bg-gradient-to-br from-primary/30 via-indigo-500/20 to-purple-500/30 border-primary shadow-[0_0_40px_rgba(var(--primary-rgb),0.4)] backdrop-blur-2xl' : 'bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-purple-50/80 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]')
              : (isDark
                ? 'sidebar-glass border-primary/30 shadow-[0_10px_40px_rgba(var(--primary-rgb),0.2)]'
                : 'bg-gradient-to-br from-white via-slate-50 to-white border-primary/20 shadow-[0_10px_40px_rgba(0,0,0,0.1)]')
              }`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="flex flex-col h-full relative z-10">
              {/* Back Side Label */}
              <div className="px-3 py-1.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 pointer-events-none">
                <span className={`text-[9px] font-black uppercase tracking-tighter ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {tool.label}
                </span>
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${isDark ? 'bg-primary/40' : 'bg-primary/30'}`} />
                  ))}
                </div>
              </div>

              {/* Live Demo Animation Section */}
              <div className="flex-1 w-full overflow-hidden border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 pointer-events-none">
                <ToolPreviewContent
                  id={tool.id}
                  prompt={tool.prompt}
                  active={isFlipped}
                />
              </div>

              {/* Review & Action Section */}
              <div className="p-1.5 sm:p-2.5 flex flex-col justify-between bg-white/40 dark:bg-[#1a1e2e]/40 backdrop-blur-sm">
                <div className="hidden sm:block mb-1.5 pointer-events-none">
                  <p className={`text-[8.5px] leading-tight italic font-medium line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    "{tool.review?.text || "Revolutionary AI tool that significantly improves my workflow efficiency."}"
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToolSelect(tool.id);
                  }}
                  className="bg-gradient-to-r from-primary via-indigo-500 to-purple-600 text-white text-[8px] font-black uppercase tracking-widest py-1.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/30 cursor-pointer pointer-events-auto hover:shadow-indigo-500/40 transition-all duration-300"
                >
                  <Zap size={9} fill="white" />
                  {t('liveTry')}
                </motion.div>
              </div>
            </div>

            {/* Subtle Neural Background for back side */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
              <div className="bg-primary absolute inset-0 blur-3xl rounded-full translate-y-1/2" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

/* ─── Main Grid Component ────────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.88, rotateX: 12 },
  visible: {
    opacity: 1, y: 0, scale: 1, rotateX: 0,
    transition: { type: 'spring', stiffness: 160, damping: 20 }
  }
};

const FuturisticToolCards = ({ onToolSelect, activeToolId, isAdmin = false }) => {
  const { t } = useLanguage();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Track the currently hovered card ID with debounce to prevent flickering
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleFlip = (id) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredCardId(id);
  };

  const handleUnflip = () => {
    // Add a small delay before unflipping to stabilize the interaction
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCardId(null);
    }, 120);
  };

  /* ─── Tools Data ───────────────────────────────── */

  const ALL_TOOLS = [
    { id: 'deep_search', label: t('deepSearch'), badge: t('badgeIntelligence'), desc: t('researchComplexTopics'), icon: Search, color: '#0ea5e9', prompt: "Analyze Supreme Court precedents on land disputes...", review: { rating: 5, count: "21k", text: "Replaced my research team. It synthesizes case laws perfectly." } },
    { id: 'web_search', label: t('realTimeSearch'), badge: t('badgeRealTime'), desc: t('liveWebDataAccess'), icon: Globe, color: '#22d3ee', prompt: "Search for live updates on new arbitration amendments...", review: { rating: 4.9, count: "10k", text: "Provides real-time citations and live feeds." } },
    { id: 'document', label: t('analyzeDocument'), badge: t('badgeDocument'), desc: t('chatWithPdfsDocs'), icon: FileText, color: '#3b82f6', prompt: "Analyze this client contract and find potential liabilities...", review: { rating: 5, count: "7.4k", text: "Parsed my 50-page case file in seconds. Super efficient!" } },
    { id: 'audio', label: t('convertToAudio'), badge: t('badgeAudio'), desc: t('textDocsToVoice'), icon: Headphones, color: '#34d399', prompt: "Synthesize this draft notice into a voice reading...", review: { rating: 4.8, count: "6k", text: "Perfect for listening to draft documents on the go." } },
    { id: 'legal', label: t('aiLegal'), badge: t('badgeLegal'), desc: t('specializedAiLegalTools'), icon: LegalLogo, color: '#818cf8', prompt: "Analyze this employment contract for potential loopholes...", review: { rating: 5, count: "3.2k", text: "AI LEGAL™'s legal reasoning is spookily good. It identified risks that our junior lawyers missed twice." } },
  ];

  const getToolActiveStatus = (toolId) => {
    if (!activeToolId) return false;
    return activeToolId === toolId;
  };

  return (
    <div className="w-full pt-0 pb-4 sm:pb-8 px-0 sm:px-0 flex flex-col items-center gap-4 sm:gap-6" ref={ref}>
      <motion.div
        className="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-8 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {ALL_TOOLS.map((tool, index) => (
          <motion.div
            key={tool.id}
            variants={cardVariants}
            style={{ transformOrigin: 'center bottom' }}
          >
            <ToolCard
              tool={{
                ...tool,
                active: getToolActiveStatus(tool.id)
              }}
              index={index}
              isFlipped={hoveredCardId === tool.id}
              onFlip={() => handleFlip(tool.id)}
              onUnflip={() => handleUnflip()}
              onToolSelect={(id) => {
                onToolSelect(id);
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default FuturisticToolCards;
export { ToolCard };
