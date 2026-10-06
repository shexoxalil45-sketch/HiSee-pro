import React, { useState, useRef, useEffect } from 'react';

interface PatternLockProps {
  onConfirm: (pattern: number[]) => void;
  title: string;
  error?: boolean;
  isRtl?: boolean;
}

export const PatternLock: React.FC<PatternLockProps> = ({ onConfirm, title, error, isRtl }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const dots = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  // Reset pattern on error or component mount
  useEffect(() => {
      if (error) {
          setPattern([]);
          setIsDrawing(false);
      }
  }, [error]);

  // Helper to get dot center in container coordinates
  const getDotCenter = (index: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const dot = containerRef.current.children[index] as HTMLElement;
    const dotRect = dot.getBoundingClientRect();
    return {
      x: dotRect.left - rect.left + dotRect.width / 2,
      y: dotRect.top - rect.top + dotRect.height / 2,
    };
  };

  const checkDotCollision = (x: number, y: number) => {
    if (error) return; // Freeze if error
    dots.forEach(index => {
      if (pattern.includes(index)) return;
      const center = getDotCenter(index);
      const distance = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2));
      if (distance < 30) { // Threshold for collision
        setPattern(prev => [...prev, index]);
      }
    });
  };

  const handleEnd = () => {
    if (error) return; // Freeze if error
    if (pattern.length >= 3) {
      onConfirm(pattern);
    } else {
      setPattern([]);
    }
    setIsDrawing(false);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (error || !isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setMousePos({ x, y });
    checkDotCollision(x, y);
  };

  return (
    <div className="space-y-4 text-center">
      <h4 className={`text-sm font-bold ${error ? 'text-red-500' : 'text-white'}`}>{title}</h4>
      <div
        ref={containerRef}
        className={`relative grid grid-cols-3 gap-8 p-6 bg-white/5 rounded-3xl mx-auto w-64 h-64 touch-none ${error ? 'border-2 border-red-500' : ''}`}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onMouseLeave={handleEnd}
        onMouseUp={handleEnd}
        onTouchEnd={handleEnd}
      >
        {dots.map((index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full transition-all z-10 ${
              pattern.includes(index) 
                ? (error ? 'bg-red-500 scale-150' : 'bg-emerald-500 scale-150') 
                : 'bg-slate-700'
            }`}
            onMouseDown={() => { if (!error) { setIsDrawing(true); setPattern([index]); } }}
            onTouchStart={() => { if (!error) { setIsDrawing(true); setPattern([index]); } }}
            data-index={index}
          />
        ))}

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {pattern.map((dotIndex, i) => {
            if (i === 0) return null;
            const start = getDotCenter(pattern[i - 1]);
            const end = getDotCenter(dotIndex);
            return (
              <line
                key={i}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={error ? "#ef4444" : "#10b981"}
                strokeWidth="4"
              />
            );
          })}
          {isDrawing && pattern.length > 0 && (
            <line
              x1={getDotCenter(pattern[pattern.length - 1]).x}
              y1={getDotCenter(pattern[pattern.length - 1]).y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke={error ? "#ef4444" : "#10b981"}
              strokeWidth="4"
              strokeDasharray="4 4"
            />
          )}
        </svg>
      </div>
      <p className={`text-xs ${error ? 'text-red-400' : 'text-slate-400'}`}>
        {error 
          ? (isRtl ? 'نمط خاطئ! يرجى المحاولة مرة أخرى' : 'Wrong pattern! Please try again') 
          : (isRtl ? 'ارسم نمطاً لا يقل عن 3 نقاط' : 'Draw a pattern connecting at least 3 dots')}
      </p>
    </div>
  );
};
