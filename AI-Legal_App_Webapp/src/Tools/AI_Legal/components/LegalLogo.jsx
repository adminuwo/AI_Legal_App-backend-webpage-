import React from 'react';

const LegalLogo = ({ size = 24, className = "", showText = false, style = {} }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={style}>
      <img 
        src="/logo/logo_transparent.png" 
        alt="AI LEGAL™" 
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    </div>
  );
};

export default LegalLogo;
