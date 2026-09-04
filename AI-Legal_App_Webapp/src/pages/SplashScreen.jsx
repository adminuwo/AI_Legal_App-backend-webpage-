import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Fake loading delay
    const timer = setTimeout(() => {
      navigate('/onboarding', { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFFFFF] text-[#111827]">
      <div className="animate-pulse flex flex-col items-center">
        {/* Minimal AI LEGAL Logo */}
        <div className="w-16 h-16 rounded-xl bg-[#6D5DFC] flex items-center justify-center mb-6 shadow-sm border border-[#E5E7EB]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] mb-2">AI LEGAL™</h1>
        <p className="text-sm font-medium text-[#6B7280] tracking-widest uppercase">Legal Operating System</p>
      </div>
      <div className="absolute bottom-12 flex flex-col items-center gap-3">
        <div className="w-48 h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div className="h-full bg-[#6D5DFC] animate-[pulse_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
        </div>
        <span className="text-xs text-[#6B7280] font-medium">Initializing Workspace...</span>
      </div>
    </div>
  );
};

export default SplashScreen;
