
import React from 'react';

interface ModernMessageIconProps {
  size?: number;
  className?: string;
}

const ModernMessageIcon: React.FC<ModernMessageIconProps> = ({ size = 24, className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="msgHybridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" /> {/* Emerald-500 */}
          <stop offset="50%" stopColor="#06b6d4" /> {/* Cyan-500 */}
          <stop offset="100%" stopColor="#3b82f6" /> {/* Blue-500 */}
        </linearGradient>
      </defs>

      {/* Modern Fluid Bubble Shape */}
      <path 
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z" 
        stroke="url(#msgHybridGrad)" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="url(#msgHybridGrad)"
        fillOpacity="0.05"
      />

      {/* Left Element: Text Lines (Written) */}
      <path d="M7 10H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M7 14H10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Right Element: Sound Waves (Voice) */}
      <path d="M14 8V16" stroke="url(#msgHybridGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 10V14" stroke="url(#msgHybridGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      
      {/* Dynamic Dot */}
      <circle cx="19" cy="7" r="1.5" fill="#f43f5e" />
    </svg>
  );
};

export default ModernMessageIcon;
