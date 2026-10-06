
import React from 'react';

interface MultiColorRadioIconProps {
  size?: number;
  className?: string;
}

const MultiColorRadioIcon: React.FC<MultiColorRadioIconProps> = ({ size = 28, className }) => {
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
        <filter id="staticGlow" x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur stdDeviation="0.5" result="blur" />
           <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        {/* Core Gradient */}
        <linearGradient id="coreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* 
           Blended Gradients for Segments 
           Each segment transitions to the color of the next segment
        */}
        
        {/* Top: White -> Red -> Yellow */}
        <linearGradient id="gradTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" /> 
            <stop offset="50%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#facc15" /> 
        </linearGradient>

        {/* Right: Red -> Yellow -> Emerald */}
        <linearGradient id="gradRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        {/* Bottom: Yellow -> Emerald -> White */}
        <linearGradient id="gradBottom" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* Left: Emerald -> White -> Red */}
        <linearGradient id="gradLeft" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>

      {/* 
         DESIGN: "The Fusion Gate" 
         The segments now have gradient strokes that blend into each other visually.
      */}

      <g filter="url(#staticGlow)">
        {/* Top Segment */}
        <path 
          d="M7 6 Q 12 2 17 6" 
          stroke="url(#gradTop)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
        
        {/* Right Segment */}
        <path 
          d="M19 8 Q 22 12 19 16" 
          stroke="url(#gradRight)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />

        {/* Bottom Segment */}
        <path 
          d="M17 18 Q 12 22 7 18" 
          stroke="url(#gradBottom)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />

        {/* Left Segment */}
        <path 
          d="M5 16 Q 2 12 5 8" 
          stroke="url(#gradLeft)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
      </g>

      {/* Center Core */}
      <circle cx="12" cy="12" r="3" fill="url(#coreGradient)" />
      <circle cx="12" cy="12" r="1.5" fill="#f43f5e" className="animate-pulse" />

    </svg>
  );
};

export default MultiColorRadioIcon;
