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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFFFFF] text-[#111827] relative">
      <div className="flex flex-col items-center">
        {/* Mobile App High Resolution Logo with Text */}
        <img 
          src="/logo/ai_legal_logo_with_text.png" 
          alt="AI LEGAL™" 
          className="w-56 sm:w-64 md:w-72 object-contain mb-6 drop-shadow-md animate-pulse" 
        />
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
