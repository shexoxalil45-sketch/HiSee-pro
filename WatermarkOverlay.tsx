import React from 'react';
import ModernHSLogo from './ModernHSLogo';

interface WatermarkOverlayProps {
  userName: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ userName }) => {
  return (
    <>
      <style>{`
        @keyframes watermarkFloatPositions {
          0%, 28% {
            top: 35%;
            left: 16px;
            right: auto;
            bottom: auto;
            opacity: 0.9;
            transform: scale(1);
          }
          30% {
            opacity: 0;
            transform: scale(0.9);
          }
          33%, 61% {
            top: 22%;
            right: 16px;
            left: auto;
            bottom: auto;
            opacity: 0.9;
            transform: scale(1);
          }
          63% {
            opacity: 0;
            transform: scale(0.9);
          }
          66%, 94% {
            top: auto;
            bottom: 160px;
            left: 16px;
            right: auto;
            opacity: 0.9;
            transform: scale(1);
          }
          97%, 100% {
            opacity: 0;
            transform: scale(0.9);
          }
        }
        .watermark-overlay-animated {
          animation: watermarkFloatPositions 12s infinite ease-in-out;
          will-change: transform, opacity;
        }
      `}</style>
      <div 
        className="watermark-overlay-animated absolute z-[999] select-none flex flex-col items-center text-center pointer-events-none gap-[2px] w-[95px] bg-transparent border-none drop-shadow-[0px_2px_4px_rgba(0,0,0,0.95)]"
      >
        {/* 1. Official Colorful App Logo Component in compact size (26px x 26px) */}
        <div 
          className="flex items-center justify-center animate-pulse"
          style={{ width: '26px', height: '26px' }}
        >
          <ModernHSLogo size={26} />
        </div>

        {/* 2. Creator's Name (@username) underneath the logo in compact size (9.5px) */}
        <span 
          className="font-black text-white tracking-wide truncate max-w-[90px] font-sans text-[9.5px]"
          style={{
            textShadow: '0px 1px 2px rgba(0, 0, 0, 0.95)'
          }}
        >
          @{userName || 'creator'}
        </span>
      </div>
    </>
  );
};

export default WatermarkOverlay;
