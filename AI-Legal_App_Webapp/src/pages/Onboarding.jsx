import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';
import { ChevronRight, Shield, Zap, Scale } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Welcome to AI LEGAL™",
      description: "The premium Legal Operating System designed exclusively for modern Advocates.",
      icon: <Scale className="w-12 h-12 text-[#6D5DFC]" strokeWidth={1.5} />
    },
    {
      title: "Why AI Legal™?",
      description: "Automate research, draft court-ready documents, and analyze evidence in seconds, not hours.",
      icon: <Zap className="w-12 h-12 text-[#4F8CFF]" strokeWidth={1.5} />
    },
    {
      title: "Uncompromising Security",
      description: "Enterprise-grade encryption ensures your case files and client data remain strictly confidential.",
      icon: <Shield className="w-12 h-12 text-[#6D5DFC]" strokeWidth={1.5} />
    }
  ];

  const nextStep = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFFFFF] px-6">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-[#E5E7EB] flex items-center justify-center mb-8">
          {slides[step].icon}
        </div>
        
        <h2 className="text-3xl font-bold text-[#111827] mb-4 tracking-tight">{slides[step].title}</h2>
        <p className="text-[#6B7280] text-base leading-relaxed mb-12">
          {slides[step].description}
        </p>

        {/* Indicators */}
        <div className="flex gap-2 mb-12">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[#6D5DFC]' : 'w-2 bg-[#E5E7EB]'}`}
            />
          ))}
        </div>

        <button 
          onClick={nextStep}
          className="w-full h-12 bg-[#6D5DFC] hover:bg-[#5b4be8] text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          {step === slides.length - 1 ? 'Get Started' : 'Continue'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
