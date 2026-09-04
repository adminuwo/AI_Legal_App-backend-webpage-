import React from 'react';

const LegalLogo = ({ size = 24, color = 'currentColor', className = "", showText = false, style = {} }) => {
  const finalColor = style.color || color;
  const iconSize = showText ? size * 0.75 : size;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={{ ...style, color: finalColor }}>
      <div 
        style={{ 
          width: iconSize, 
          height: iconSize, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Circle with slight gradient feel or depth */}
          <circle cx="50" cy="50" r="44" stroke={finalColor} strokeWidth="5.5" opacity="0.9" />
          
          {/* Advocate's Collar - Styled to match professional attire */}
          <path d="M50 22 L30 40 L38 48 L50 38 L62 48 L70 40 L50 22Z" fill={finalColor} />
          
          {/* Left Band - Slightly flared at bottom */}
          <path d="M41 42 L34 84 H47 L48 42 H41Z" fill={finalColor} />
          
          {/* Right Band - Slightly flared at bottom */}
          <path d="M52 42 L53 84 H66 L59 42 H52Z" fill={finalColor} />
          
          {/* Small separator at top of bands */}
          <rect x="42" y="38" width="16" height="4" rx="1" fill={finalColor} opacity="0.8" />
        </svg>
      </div>
      {showText && (
        <span 
          className="whitespace-nowrap font-black tracking-[0.05em]" 
          style={{ 
            color: finalColor,
            fontSize: Math.max(iconSize / 4.2, 5.5) + 'px',
            marginTop: '1px',
            lineHeight: 1,
            textShadow: '0 1px 2px rgba(0,0,0,0.05)',
            fontFamily: 'inherit'
          }}
        >
          सत्यमेव जयते
        </span>
      )}
    </div>
  );
};

export default LegalLogo;
