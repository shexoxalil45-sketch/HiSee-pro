import React, { useState, useEffect } from 'react';
import { Eye, Heart } from 'lucide-react';

interface LiveStatsProps {
  startedAt?: any; // Firestore timestamp
  fallbackViewers?: number;
  onEyeClick?: () => void;
  ViewersComponent?: React.ReactNode;
}

export const LiveStats: React.FC<LiveStatsProps> = React.memo(({ startedAt, fallbackViewers = 0, onEyeClick, ViewersComponent }) => {
  const [duration, setDuration] = useState('00:00');

  // Timer logic
  useEffect(() => {
    if (!startedAt) return;
    
    const updateTimer = () => {
      const start = startedAt.toMillis ? startedAt.toMillis() : (startedAt.seconds ? startedAt.seconds * 1000 : Date.now());
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      if (hours > 0) {
        setDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-start gap-1.5 shrink-0 pointer-events-none px-1">
      {/* Column 1: LIVE Badge & Clock directly below it */}
      <div className="flex flex-col items-center gap-1">
        {/* LIVE Badge */}
        <div 
          onClick={onEyeClick}
          className={`bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_15px_rgba(220,38,38,0.8)] flex items-center gap-0.5 shrink-0 ${onEyeClick ? 'cursor-pointer hover:bg-red-700 active:scale-95 transition-all pointer-events-auto' : ''}`}
        >
          <Eye size={11} className="text-cyan-300 shrink-0 animate-pulse mr-0.5" />
          <span className="shrink-0 leading-none">LIVE</span>
        </div>
        
        {/* Timer (Below LIVE vertically aligned) */}
        {startedAt && (
          <span className="text-[7px] sm:text-[8px] font-bold font-mono tracking-widest leading-none text-white/80 drop-shadow-sm h-2">
            {duration}
          </span>
        )}
      </div>
      
      {/* Column 2: Viewers Count */}
      {ViewersComponent ? ViewersComponent : (
        <div 
          onClick={onEyeClick}
          className={`flex items-center shrink-0 mt-0.5 ${onEyeClick ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform pointer-events-auto hover:bg-white/10 px-1.5 py-0.5 rounded-md' : ''}`}
        >
          <Eye size={12} className="text-cyan-300 mr-1" />
          <span className="text-[10px] sm:text-[11px] font-black font-mono tracking-wider shrink-0 leading-none text-white drop-shadow-md flex items-center">
            {fallbackViewers.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
});

export default LiveStats;
