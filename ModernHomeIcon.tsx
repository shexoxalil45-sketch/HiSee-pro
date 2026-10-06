
import React from 'react';

interface ModernHomeIconProps {
  size?: number;
  className?: string;
}

const ModernHomeIcon: React.FC<ModernHomeIconProps> = ({ size = 24, className }) => {
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
        <linearGradient id="homeStreamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" /> {/* Rose-500 */}
          <stop offset="100%" stopColor="#a855f7" /> {/* Purple-500 */}
        </linearGradient>
      </defs>

      {/* The Roof (Home Concept) merged with Screen top */}
      <path 
        d="M3 10L12 2L21 10V18C21 20.2091 19.2091 22 17 22H7C4.79086 22 3 20.2091 3 18V10Z" 
        stroke="url(#homeStreamGrad)" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* The Media Play Button (Video Concept) */}
      <path 
        d="M10 11V16L14.5 13.5L10 11Z" 
        fill="white" 
        stroke="white" 
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Feed Indicator (Posts Concept) - Horizontal Lines at bottom */}
      <path 
        d="M8 19H16" 
        stroke="url(#homeStreamGrad)" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        opacity="0.8"
      />
    </svg>
  );
};

export default ModernHomeIcon;
