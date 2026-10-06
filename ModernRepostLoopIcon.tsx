import React from 'react';

interface ModernRepostLoopIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * ModernRepostLoopIcon
 * A modern, sleek, dual-arrow cyclic loop icon representing Repost (إعادة النشر).
 * Interlocking clockwise arrows forming a continuous loop.
 * Monochrome design matching the platform's visual identity.
 */
export const ModernRepostLoopIcon: React.FC<ModernRepostLoopIconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 2.2
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top arrow pointing right */}
      <path d="M17 2.5L21.5 7L17 11.5" />
      <path d="M3.5 11V9.5C3.5 6.74 5.74 4.5 8.5 4.5H21.5" />
      
      {/* Bottom arrow pointing left */}
      <path d="M7 21.5L2.5 17L7 12.5" />
      <path d="M20.5 13V14.5C20.5 17.26 18.26 19.5 15.5 19.5H2.5" />
    </svg>
  );
};

export default ModernRepostLoopIcon;
