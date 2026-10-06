
import React from 'react';

interface Props {
  size?: number;
  className?: string;
}

const ModernAuthIcon: React.FC<Props> = ({ size = 64, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="keyGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" /> {/* Rose */}
          <stop offset="50%" stopColor="#facc15" /> {/* Yellow */}
          <stop offset="100%" stopColor="#10b981" /> {/* Emerald */}
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hexagon Background Container */}
      <path
        d="M32 2L58 17V47L32 62L6 47V17L32 2Z"
        stroke="url(#keyGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.05)"
        className="animate-pulse-slow"
      />

      {/* The Key Head (Digital Circuit Style) */}
      <circle cx="32" cy="24" r="8" stroke="white" strokeWidth="2" />
      <circle cx="32" cy="24" r="3" fill="#10b981" className="animate-ping" />

      {/* The Key Shaft */}
      <path d="M32 32V52" stroke="white" strokeWidth="2" strokeLinecap="round" />

      {/* The Key Teeth (Data Bits) */}
      <path d="M32 40H40" stroke="url(#keyGrad)" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 46H38" stroke="url(#keyGrad)" strokeWidth="2" strokeLinecap="round" />
      
      {/* Sparkles */}
      <path d="M50 10L52 14L54 10L52 6L50 10Z" fill="#facc15" className="animate-spin-slow" />
      <path d="M10 50L12 54L14 50L12 46L10 50Z" fill="#f43f5e" className="animate-spin-slow" style={{ animationDirection: 'reverse' }} />
    </svg>
  );
};

export default ModernAuthIcon;
