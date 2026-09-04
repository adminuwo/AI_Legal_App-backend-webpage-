import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LegalPricingPortal = () => {
  const location = useLocation();

  useEffect(() => {
    // Redirect to static html portal preserving query params
    window.location.replace('/legal-pricing/index.html' + location.search);
  }, [location.search]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#F4F6FA]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#C8A34D]/30 border-t-[#C8A34D] rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Loading AI Legal™ Portal...</span>
      </div>
    </div>
  );
};

export default LegalPricingPortal;
