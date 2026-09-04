import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CircleUser, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserData } from '../userStore/userData';
import { useLanguage } from '../context/LanguageContext';
import ThemeToggle from '../Components/ThemeToggle';
import ProfileSettingsDropdown from '../Components/ProfileSettingsDropdown/ProfileSettingsDropdown';
import { useTheme } from '../context/ThemeContext';
import { logo } from '../constants';
import apiService from '../services/apiService';

/* ─────────────────────────────────────────────────────────
   Neural Network 3D Canvas
   ───────────────────────────────────────────────────────── */
const NeuralCanvas = ({ mousePos, isDarkMode }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({ nodes: [], particles: [], orb: null, tick: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;

      const centerX = W / 2;
      const centerY = H / 2;

      /* Nodes with depth (z-axis logic simulated) */
      const nodes = [];
      const nodeCount = 35;
      for (let i = 0; i < nodeCount; i++) {
        const radius = 100 + Math.random() * 350;
        const angle = Math.random() * Math.PI * 2;
        nodes.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          baseX: centerX + Math.cos(angle) * radius,
          baseY: centerY + Math.sin(angle) * radius,
          z: Math.random() * 2, // depth factor
          size: 1 + Math.random() * 3,
          color: isDarkMode
            ? (Math.random() > 0.5 ? '#60a5fa' : '#e879f9')
            : (Math.random() > 0.5 ? '#4f46e5' : '#7c3aed'),
        });
      }

      /* Digital Dust (Particles) */
      const particles = [];
      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          baseX: Math.random() * W,
          baseY: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5,
          alpha: 0.1 + Math.random() * 0.4,
          z: 0.5 + Math.random() * 1.5,
        });
      }

      stateRef.current = { nodes, particles, tick: 0, W, H };
    };

    init();
    window.addEventListener('resize', init);
    return () => window.removeEventListener('resize', init);
  }, []);

  /* Parallax Logic */
  useEffect(() => {
    const { nodes, particles, W, H } = stateRef.current;
    if (!nodes) return;

    // Smoothly update positions based on mousePos
    const dx = (mousePos.x - W / 2) / W;
    const dy = (mousePos.y - H / 2) / H;

    nodes.forEach(n => {
      n.x = n.baseX + dx * 100 * n.z;
      n.y = n.baseY + dy * 100 * n.z;
    });

    particles.forEach(p => {
      p.x = (p.baseX + dx * 40 * p.z + W) % W;
      p.y = (p.baseY + dy * 40 * p.z + H) % H;
    });
  }, [mousePos]);

  /* Animation Frame */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const { nodes, particles, tick, W, H } = stateRef.current;
      if (!nodes) return;
      ctx.clearRect(0, 0, W, H);

      const centerX = W / 2;
      const centerY = H / 2;

      /* ── Neural Connections ── */
      ctx.lineWidth = 1;
      nodes.forEach((n1, i) => {
        nodes.slice(i + 1).forEach(n2 => {
          const dist = Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
          if (dist < 300) {
            const alpha = (1 - dist / 300) * (isDarkMode ? 0.2 : 0.08);
            ctx.strokeStyle = isDarkMode ? `rgba(139, 92, 246, ${alpha})` : `rgba(79, 70, 229, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            /* Data Flow Animation */
            if (dist < 220 && (i % 3 === 0)) {
              const flowPos = (tick * 0.006 + i) % 1;
              const fx = n1.x + (n2.x - n1.x) * flowPos;
              const fy = n1.y + (n2.y - n1.y) * flowPos;
              ctx.fillStyle = isDarkMode ? `rgba(232, 121, 249, ${alpha * 2.5})` : `rgba(79, 70, 229, ${alpha * 2})`;
              ctx.beginPath();
              ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      });

      /* ── Neural Nodes ── */
      nodes.forEach(n => {
        const pulse = Math.sin(tick * 0.03 + n.phase) * 0.4 + 1.2;
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 12 * pulse;
        ctx.shadowColor = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      /* ── Digital Dust ── */
      particles.forEach(p => {
        ctx.fillStyle = isDarkMode ? `rgba(255, 255, 255, ${p.alpha * 0.5})` : `rgba(79, 70, 229, ${p.alpha * 0.2})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // NOTE: Original Core Orb and Rings removed to favor the global 3D FlowingAICreature

      stateRef.current.tick++;
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />;
};

/* ─────────────────────────────────────────────────────────
   Hero Component
   ───────────────────────────────────────────────────────── */
const Hero = () => {
  const navigate = useNavigate();
  const user = getUserData();
  const { t } = useLanguage();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { theme } = useTheme();
  const heroRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);



  // Transition State
  const [introStage, setIntroStage] = useState('animating'); // waiting, animating, finished

  const normalizedTheme = typeof theme === 'string' ? theme.toLowerCase() : 'system';
  const isDarkMode = normalizedTheme === 'dark' || (normalizedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const headingText = "The Future of Conversational AI";

  // Variants for the character generation
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(10px)',
    },
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: isDarkMode ? '#04040e' : '#EEF2FF',
      }}
    >
      {/* ── Background: Deep Gradient Space ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={introStage === 'finished' ? { opacity: introStage === 'finished' ? 1 : 0 } : { opacity: 0 }}
        transition={{ duration: 2 }}
        style={{
          position: 'absolute', inset: 0,
          background: isDarkMode
            ? 'radial-gradient(ellipse 120% 80% at 50% 50%, #0c0018 0%, #04040e 100%)'
            : 'radial-gradient(ellipse 120% 80% at 50% 50%, #E0E7FF 0%, #EEF2FF 100%)',
          zIndex: 0
        }}
      />



      {/* Immersive Glowing Lights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={introStage === 'finished' ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 2.5 }}
        style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      >
        <div style={{
          position: 'absolute', top: '5%', left: '10%', width: '45vw', height: '45vw',
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 75%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 75%)',
          filter: 'blur(80px)', animation: 'float-glow 8s infinite alternate'
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '10%', width: '50vw', height: '50vw',
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 75%)'
            : 'radial-gradient(circle, rgba(232,121,249,0.08) 0%, transparent 75%)',
          filter: 'blur(100px)', animation: 'float-glow 10s infinite alternate-reverse'
        }} />
      </motion.div>

      {/* ── 3D Neural Scene ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={introStage === 'finished' ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.5 }}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      >
        <NeuralCanvas mousePos={mousePos} isDarkMode={isDarkMode} />
      </motion.div>

      {/* Central Immersive Glow Ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={introStage === 'finished' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 2 }}
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px', borderRadius: '50%',
          border: isDarkMode ? '1px solid rgba(99, 102, 241, 0.1)' : '1px solid rgba(99, 102, 241, 0.2)',
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          zIndex: 1, pointerEvents: 'none',
          boxShadow: isDarkMode ? '0 0 100px rgba(99, 102, 241, 0.1)' : '0 0 80px rgba(99, 102, 241, 0.05)'
        }}
      />

      {/* ── Foreground Content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', maxWidth: '1400px',
        width: '100%',
        padding: window.innerWidth < 640 ? '5px 1.25rem 60px' : '10px 1.5rem 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* ── Integrated Nav Area ── */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: window.innerWidth < 640 ? '30px' : '40px',
            padding: window.innerWidth < 640 ? '5px 0' : '10px 0',
          }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={() => navigate('/')}
            className="group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src={logo} alt="AI LEGAL™"
                style={{
                  height: window.innerWidth < 640 ? '32px' : '50px',
                  width: 'auto',
                  objectFit: 'cover',
                  objectPosition: 'top'
                }}
                className="drop-shadow-[0_0_40px_rgba(99,102,241,0.6)] relative transition-all duration-500"
              />
            </div>
            <span aria-label="AI LEGAL™" style={{
              fontSize: window.innerWidth < 640 ? '0.6rem' : '0.75rem',
              fontWeight: 900,
              letterSpacing: '0.25em',
              background: 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: '"Times New Roman", Times, serif',
              marginTop: window.innerWidth < 640 ? '2px' : '4px',
              transition: 'all 0.3s',
              display: 'inline-block'
            }}>
              AI LEGAL<span aria-hidden="true" style={{ fontSize: '0.55em', verticalAlign: 'super', marginLeft: '1px' }}>™</span>
            </span>
          </motion.div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: window.innerWidth < 640 ? '0.8rem' : '1.5rem'
          }}>
            <ThemeToggle />
            {user ? (
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  style={{ background: 'none', border: 'none', color: isDarkMode ? '#fff' : '#0F172A', cursor: 'pointer' }}
                >
                  <CircleUser size={30} color={isDarkMode ? "#a78bfa" : "#6366f1"} />
                </motion.button>
                <AnimatePresence>
                  {isProfileOpen && (
                    <ProfileSettingsDropdown
                      onClose={() => setIsProfileOpen(false)}
                      onLogout={async () => {
                        if (window.resetSocialOnboarding) {
                          window.resetSocialOnboarding();
                        }
                        localStorage.clear();
                        window.location.reload();
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(99, 102, 241, 0.1)' }}
                onClick={() => navigate('/login')}
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.05)',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99, 102, 241, 0.2)',
                  color: isDarkMode ? '#fff' : '#0F172A', padding: '10px 24px',
                  borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
                  transition: '0.3s'
                }}
              >
                {t('getStarted')}
              </motion.button>
            )}
          </div>
        </div>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={introStage === 'finished' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '8px 20px', borderRadius: '999px',
            background: isDarkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
            border: isDarkMode ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)',
            color: isDarkMode ? '#a5b4fc' : '#4f46e5', fontSize: '0.85rem', fontWeight: 700,
            marginBottom: '2.5rem', letterSpacing: '0.1em'
          }}>
            Powered by UWO™
          </div>
        </motion.div>

        {/* Heading Reveal */}
        <div style={{ overflow: 'visible' }}>
          <motion.h1
            variants={container}
            initial="hidden"
            animate={introStage !== 'waiting' ? "visible" : "hidden"}
            onAnimationComplete={() => { if (introStage === 'animating') setIntroStage('finished'); }}
            style={{
              fontSize: 'clamp(2.2rem, 10vw, 5.5rem)',
              fontWeight: 900,
              color: isDarkMode ? '#fff' : '#0F172A',
              lineHeight: 1.1,
              letterSpacing: '-0.05em',
              marginBottom: '2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Line 1: The Future of */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.25em' }}>
              {t('heroTitleLine1').split(" ").map((word, index) => (
                <motion.span
                  key={`l1-${index}`}
                  variants={child}
                  style={{ display: 'inline-block' }}
                >
                  {word}
                </motion.span>
              ))}
            </div>

            {/* Line 2: Conversational AI (with Gradient across words) */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', flexWrap: 'wrap', gap: '0.25em' }}>
              {t('heroTitleLine2').split(" ").map((word, index, arr) => (
                <motion.span
                  key={`l2-${index}`}
                  variants={child}
                  style={{
                    display: 'inline-block',
                    // Gradient technique: each word shows a slice of a larger gradient
                    background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #e879f9 100%)',
                    backgroundSize: `${arr.length * 100}% 100%`,
                    backgroundPosition: `${arr.length > 1 ? (index / (arr.length - 1)) * 100 : 50}% center`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {word}
                </motion.span>
              ))}

              {/* Immersive Glow behind second line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={introStage === 'finished' ? { opacity: 0.4 } : { opacity: 0 }}
                transition={{ duration: 1.5 }}
                style={{
                  position: 'absolute', inset: '-10% -20%',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #d946ef 100%)',
                  filter: 'blur(50px)', zIndex: -1, pointerEvents: 'none'
                }}
              />
            </div>
          </motion.h1>
        </div>

        {/* Mission Statement – visible to users and Google's automated review */}
        <motion.p
          id="aisa-mission-statement"
          initial={{ opacity: 0, y: 16 }}
          animate={introStage === 'finished' ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 1, delay: 0.05 }}
          style={{
            fontSize: 'clamp(1.05rem, 2.2vw, 1.3rem)',
            color: isDarkMode ? 'rgba(255, 255, 255, 0.92)' : '#1e1b4b',
            maxWidth: '860px',
            margin: '0 auto 1.25rem',
            lineHeight: 1.7,
            fontWeight: 600,
            letterSpacing: '0.01em',
            textAlign: 'center',
          }}
        >
          AISA™ is an advanced AI platform designed to empower users with intelligent tools for comprehensive research, creative content generation, and insightful data analysis. We use Google Sign-In to securely authenticate users, personalize their workspaces, and synchronize their tasks across devices.
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={introStage === 'finished' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, delay: 0.1 }}
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: isDarkMode ? 'rgba(255, 255, 255, 0.75)' : '#000000',
            maxWidth: '800px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.8,
            fontWeight: 400,
            letterSpacing: '0.01em',
            textAlign: 'center'
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: t('heroSubtitle') }} />
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={introStage === 'finished' ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            flexDirection: window.innerWidth < 640 ? 'column' : 'row',
            alignItems: 'center',
            width: window.innerWidth < 640 ? '100%' : 'auto'
          }}
        >
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(user ? "/dashboard/chat/new" : "/login")}
            style={{
              padding: '16px 42px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#fff', fontWeight: 800, fontSize: '1.1rem',
              cursor: 'pointer', boxShadow: isDarkMode ? '0 20px 50px rgba(99, 102, 241, 0.4)' : '0 10px 40px rgba(79, 70, 229, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              width: window.innerWidth < 640 ? '100%' : 'auto'
            }}
          >
            {user ? t('existingUser') : t('exploreAisa')} <ArrowRight size={22} />
          </motion.button>
        </motion.div>
      </div>

      {/* Styled Scroll Down Icon */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={introStage === 'finished' ? { opacity: 0.3 } : { opacity: 0 }}
        transition={{ duration: 1 }}
        style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)' }}
      >
        <div style={{
          width: '32px', height: '54px', borderRadius: '16px',
          border: isDarkMode ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid rgba(15,23,42,0.4)',
          display: 'flex', justifyContent: 'center', padding: '8px'
        }}>
          <motion.div
            animate={{ y: [0, 15, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: '4px', height: '10px', background: isDarkMode ? '#fff' : '#0F172A', borderRadius: '2px' }}
          />
        </div>
      </motion.div>

      {/* Global Styles */}
      <style>{`
        @keyframes float-glow {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(5%, 5%) scale(1.1); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>
    </section>
  );
};

export default Hero;
