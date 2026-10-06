
import React from 'react';

interface ModernSettingsIconProps {
  size?: number;
  className?: string;
}

const ModernSettingsIcon: React.FC<ModernSettingsIconProps> = ({ size = 24, className }) => {
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
        <linearGradient id="settingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan-400 */}
          <stop offset="100%" stopColor="#3b82f6" /> {/* Blue-500 */}
        </linearGradient>
      </defs>

      {/* Outer Modern Hexagon Shape */}
      <path 
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z" 
        stroke="url(#settingsGrad)" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="opacity-90"
      />

      {/* Internal "Control Sliders" representing configuration */}
      {/* Top Slider */}
      <line x1="7" y1="8" x2="17" y2="8" stroke="url(#settingsGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="14" cy="8" r="1.5" fill="var(--hisee-white)" />

      {/* Middle Slider */}
      <line x1="6" y1="12" x2="18" y2="12" stroke="url(#settingsGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="10" cy="12" r="1.5" fill="var(--hisee-white)" />

      {/* Bottom Slider */}
      <line x1="7" y1="16" x2="17" y2="16" stroke="url(#settingsGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="15" cy="16" r="1.5" fill="var(--hisee-white)" />
    </svg>
  );
};

export default ModernSettingsIcon;
