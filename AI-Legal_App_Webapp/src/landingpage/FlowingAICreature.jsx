import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Register ScrollTrigger for reactive scrolling
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Skip on mobile to prevent CPU freeze
const isMobileDevice = () => typeof window !== 'undefined' && window.innerWidth < 1024;

const FlowingAICreature = () => {
  const { theme } = useTheme();
  const normalizedTheme = typeof theme === 'string' ? theme.toLowerCase() : 'system';
  const isDarkMode = normalizedTheme === 'dark' || (normalizedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── High-Quality CSS-based 'Digital Energy Core' ──
  const DigitalCore = () => (
    <div className="relative flex items-center justify-center w-[450px] h-[450px] pointer-events-none">
      {/* Immersive Background Glow */}
      <div className={`absolute inset-0 rounded-full animate-pulse blur-[90px] transition-colors duration-1000 ${isDarkMode ? 'bg-primary/25' : 'bg-primary/10'}`} />
      
      {/* Outer Orbitals */}
      <div className={`absolute w-[340px] h-[340px] border rounded-full animate-spin-slow transition-all duration-1000 ${isDarkMode ? 'border-primary/20 opacity-30' : 'border-primary/10 opacity-60'}`} />
      <div className={`absolute w-[300px] h-[300px] border rounded-full animate-spin-slow-reverse transition-all duration-1000 ${isDarkMode ? 'border-fuchsia-500/20 opacity-20' : 'border-fuchsia-500/10 opacity-40'}`} />
      
      {/* Inner Rotating Ring with segments */}
      <div className={`absolute w-60 h-60 rounded-full border-2 border-dashed animate-spin-slow transition-colors duration-1000 ${isDarkMode ? 'border-primary/30' : 'border-primary/15'}`} style={{ animationDuration: '20s' }} />
      
      {/* The Core Orb */}
      <div className="relative w-44 h-44 group">
        {/* Glass Content */}
        <div className={`absolute inset-0 backdrop-blur-3xl rounded-full border shadow-[0_0_80px_rgba(99,102,241,0.5)] flex items-center justify-center overflow-hidden transition-all duration-1000 ${
          isDarkMode ? 'bg-gradient-to-tr from-primary/40 via-purple-500/40 to-fuchsia-400/40 border-white/30' : 'bg-gradient-to-tr from-primary/20 via-purple-500/20 to-fuchsia-400/10 border-white/60 shadow-[0_0_50px_rgba(99,102,241,0.2)]'
        }`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_70%)]" />
          
          {/* Internal Energy pulse */}
          <div className={`w-20 h-20 bg-white rounded-full blur-2xl animate-pulse transition-opacity duration-1000 ${isDarkMode ? 'opacity-40' : 'opacity-20'}`} />
          <Sparkles className={`relative z-10 text-white w-12 h-12 ${isDarkMode ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'} transition-opacity duration-1000 ${isDarkMode ? 'opacity-100' : 'opacity-70'}`} />
        </div>
        
        {/* Orbiting particles (CSS only) */}
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '3s' }}>
          <div className={`w-2.5 h-2.5 rounded-full absolute top-0 left-1/2 -ml-1 blur-sm ${isDarkMode ? 'bg-primary' : 'bg-primary/80'}`} />
        </div>
        <div className="absolute inset-0 animate-spin-slow-reverse" style={{ animationDuration: '5s' }}>
          <div className={`w-2 h-2 rounded-full absolute bottom-0 left-1/2 -ml-1 blur-sm ${isDarkMode ? 'bg-fuchsia-400' : 'bg-fuchsia-500/80'}`} />
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    // Skip entirely on mobile to prevent CPU freeze
    if (isMobileDevice()) return;
    // Artificial small delay to ensure DOM readiness
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    try {
      // ── Initial State Setup ──
      gsap.set(containerRef.current, {
        opacity: 0,
        scale: 0.8,
        xPercent: -50,
        yPercent: -50,
        left: "50%",
        top: "45%",
      });

      // ── Hero Entry Animation ──
      gsap.to(containerRef.current, {
        opacity: 1,
        scale: 1,
        duration: 2,
        ease: "power3.out",
        delay: 0.5
      });

      // ── Main Scroll Path Timeline (Large curved path) ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: 2, 
        }
      });

      // Cinematic Curved Path Animation
      tl.to(containerRef.current, {
        left: "88%",
        top: "25%",
        scale: 0.65,
        rotationZ: 25,
        duration: 2,
        ease: "sine.inOut"
      })
      .to(containerRef.current, {
        left: "12%",
        top: "55%",
        scale: 1.1,
        rotationZ: -20,
        duration: 3,
        ease: "power2.inOut"
      })
      .to(containerRef.current, {
        left: "80%",
        top: "75%",
        scale: 0.85,
        rotationZ: 10,
        duration: 2.5,
        ease: "sine.inOut"
      })
      .to(containerRef.current, {
        left: "50%",
        top: "88%",
        scale: 1.0,
        rotationZ: 0,
        duration: 2,
        ease: "power3.out"
      });

      // ── Organic Sinusoidal Swimming (desktop only) ──
      if (!isMobileDevice()) {
        gsap.to(containerRef.current, {
          y: "+=20",
          x: "+=10",
          rotationZ: "+=2",
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }

      // ── Footer "Bloom Explosion" Trigger ──
      ScrollTrigger.create({
        trigger: ".footer-reveal-bg",
        start: "top 85%",
        onEnter: () => {
          gsap.timeline()
            .to(containerRef.current, {
                scale: 1.5,
                filter: "brightness(3) blur(10px)",
                duration: 0.8,
                ease: "power2.in"
            })
            .to(containerRef.current, {
                opacity: 0,
                scale: 4,
                filter: "brightness(5) blur(50px)",
                duration: 1.2,
                ease: "power4.out",
                onComplete: () => {
                  window.dispatchEvent(new CustomEvent('aisa-bloom-explosion'));
                }
            });
        }
      });

      // ── Subtle Mouse Parallax Interaction ──
      const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const { clientX, clientY } = e;
        const moveX = (clientX - window.innerWidth / 2) * 0.01;
        const moveY = (clientY - window.innerHeight / 2) * 0.01;
        gsap.to(containerRef.current, {
          x: moveX,
          y: moveY,
          duration: 1.2,
          ease: "power2.out"
        });
      };

      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        ScrollTrigger.getAll().forEach(st => st.kill());
      };
      
    } catch (err) {
      console.error("GSAP Animation Failed:", err);
    }
  }, [isLoaded]);

  // Don't render at all on mobile — prevents GPU/CPU freeze
  if (isMobileDevice()) return null;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        width: '480px',
        height: '480px',
        zIndex: 5,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        willChange: 'transform, opacity, filter',
        opacity: 0 // Start hidden
      }}
    >
      <DigitalCore />
    </div>
  );
};

export default FlowingAICreature;
