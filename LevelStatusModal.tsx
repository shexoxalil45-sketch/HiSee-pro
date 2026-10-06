import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, X, Sparkles, AlertCircle, ShieldAlert, Check } from 'lucide-react';
import { AvatarLevelBadge } from './AvatarLevelBadge';
import { getTranslation } from '../translations';

export type LevelStatusMode = 'LEVEL_UP' | 'LEVEL_DOWN';

export interface LevelStatusModalProps {
  mode?: LevelStatusMode;
  type?: LevelStatusMode;
  level?: number;
  oldLevel?: number;
  badge?: string;
  reason?: string;
  isOpen?: boolean;
  onClose?: () => void;
  lang?: string;
  userName?: string;
}

/**
 * Custom useTranslation hook adhering to strict fallback constraints:
 * - Arabic (ar): Arabic text with dir="rtl".
 * - Non-Arabic: English fallback via defaultValue (no Arabic text returned for non-Arabic languages).
 */
export function useTranslation(overrideLang?: string) {
  const [lang, setLang] = useState<string>(() => {
    if (overrideLang) return overrideLang;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hisee_lang') || localStorage.getItem('language');
      if (saved) return saved;
    }
    return 'ar';
  });

  useEffect(() => {
    if (overrideLang) {
      setLang(overrideLang);
    }
  }, [overrideLang]);

  const isArabic = lang === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';

  const t = (key: string, options?: { defaultValue?: string } | string): string => {
    const defaultVal = typeof options === 'string' ? options : options?.defaultValue || '';

    const dictTranslation = getTranslation(lang, key, '');
    if (dictTranslation && dictTranslation !== key) {
      if (!isArabic && /[\u0600-\u06FF]/.test(dictTranslation)) {
        return defaultVal || key;
      }
      return dictTranslation;
    }

    if (isArabic) {
      return defaultVal || key;
    } else {
      if (/[\u0600-\u06FF]/.test(defaultVal)) {
        return key;
      }
      return defaultVal || key;
    }
  };

  return { t, lang, dir, isArabic };
}

/**
 * LevelStatusModal Component
 * Direct Floating Video Overlay for Level Up with Dynamic Fireworks Explosions over Video & Respectful Alert Card for Level Down.
 * Enhanced text-shadow & drop-shadow visibility over any video background.
 */
export const LevelStatusModal: React.FC<LevelStatusModalProps> = ({
  mode,
  type,
  level = 1,
  badge,
  reason,
  isOpen = true,
  onClose = () => {},
  lang: userLang,
  userName
}) => {
  const activeMode: LevelStatusMode = mode || type || 'LEVEL_UP';
  const { t, isArabic, dir } = useTranslation(userLang);

  const [countdown, setCountdown] = useState<number>(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Safe Close Handler
  const handleClose = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    onClose();
  };

  // Reset state when modal opens and establish accurate countdown interval
  useEffect(() => {
    if (!isOpen || activeMode !== 'LEVEL_UP') return;
    
    setCountdown(3);

    // Precise, balanced 1-second interval execution (1000ms) with zero drifts
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeMode]);

  // HTML5 Canvas Fireworks Explosions & Floating Particles animation over Video
  useEffect(() => {
    if (!isOpen || activeMode !== 'LEVEL_UP' || countdown > 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const width = (canvas.width = window.innerWidth || canvas.offsetWidth || 360);
    const height = (canvas.height = window.innerHeight || canvas.offsetHeight || 600);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      alpha: number;
      decay: number;
      size: number;
    }

    interface FloatingBubble {
      x: number;
      y: number;
      radius: number;
      color: string;
      speedY: number;
      speedX: number;
      alpha: number;
    }

    const fireworkColors = [
      '#fbbf24', // Amber / Gold
      '#f59e0b', // Deep Amber
      '#fef08a', // Yellow Glow
      '#ec4899', // Pink / Rose
      '#3b82f6', // Bright Blue
      '#10b981', // Emerald Green
      '#a855f7', // Vivid Purple
      '#ffffff'  // Pure Sparkle White
    ];

    let particles: Particle[] = [];
    const bubbles: FloatingBubble[] = [];

    // Background floating bubbles
    for (let i = 0; i < 18; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: height + Math.random() * 80,
        radius: Math.random() * 5 + 3,
        color: fireworkColors[Math.floor(Math.random() * fireworkColors.length)],
        speedY: Math.random() * 1.5 + 1.0,
        speedX: (Math.random() - 0.5) * 0.8,
        alpha: Math.random() * 0.6 + 0.3
      });
    }

    // Function to trigger a firework burst at (x, y)
    const createFireworkBurst = (centerX: number, centerY: number, particleCount = 35) => {
      const palette = [
        fireworkColors[Math.floor(Math.random() * fireworkColors.length)],
        fireworkColors[Math.floor(Math.random() * fireworkColors.length)],
        '#ffffff'
      ];

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.2;
        const speed = Math.random() * 4.5 + 1.8;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 1.0,
          decay: Math.random() * 0.018 + 0.012,
          size: Math.random() * 3 + 2
        });
      }
    };

    // Initial festive fireworks salvo on video!
    createFireworkBurst(width * 0.5, height * 0.35, 45);
    setTimeout(() => { if (isRunning) createFireworkBurst(width * 0.25, height * 0.28, 35); }, 200);
    setTimeout(() => { if (isRunning) createFireworkBurst(width * 0.75, height * 0.30, 35); }, 400);

    let lastFireworkTime = Date.now();

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      // Periodically trigger new fireworks across the video overlay
      const now = Date.now();
      if (now - lastFireworkTime > 650) {
        lastFireworkTime = now;
        const burstX = Math.random() * (width * 0.7) + width * 0.15;
        const burstY = Math.random() * (height * 0.35) + height * 0.18;
        createFireworkBurst(burstX, burstY, Math.floor(Math.random() * 15) + 25);
      }

      // 1. Render Floating Bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = b.alpha;
        ctx.fill();

        b.y -= b.speedY;
        b.x += b.speedX;

        if (b.y < -20) {
          b.y = height + 10;
          b.x = Math.random() * width;
        }
      }

      // 2. Render & Update Fireworks Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fill();

        // Particle dynamics: movement + gravity + fade out
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // Gentle gravity
        p.vx *= 0.98; // Friction
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      particles = [];
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isOpen, activeMode, countdown]);

  if (!isOpen) return null;

  const isLevelUp = activeMode === 'LEVEL_UP';

  return (
    <AnimatePresence>
      <div
        dir={dir}
        onClick={handleClose}
        className={
          isLevelUp
            ? "fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-transparent pointer-events-none animate-in fade-in duration-300"
            : "fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        }
      >
        {isLevelUp ? (
          /* Direct Floating Overlay Mode with Full-Screen Fireworks Canvas */
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-full max-w-sm bg-transparent border-none shadow-none p-4 text-center relative overflow-visible flex flex-col items-center pointer-events-auto"
          >
            {/* Full-Screen Fireworks Canvas Overlay over Video */}
            {countdown === 0 && (
              <canvas
                ref={canvasRef}
                className="fixed inset-0 w-full h-full pointer-events-none z-0"
              />
            )}

            {/* Stage 1: Floating Countdown 3 -> 2 -> 1 */}
            {countdown > 0 ? (
              <div className="py-12 flex flex-col items-center justify-center z-50 my-4 bg-transparent">
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
                  animate={{ scale: 1.4, opacity: 1, rotate: 0 }}
                  exit={{ scale: 2.0, opacity: 0, rotate: 25 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex items-center justify-center bg-transparent border-none shadow-none"
                >
                  <span className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 font-mono select-none drop-shadow-[0_10px_25px_rgba(245,158,11,0.6)]">
                    {countdown}
                  </span>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-10 text-lg font-black text-amber-300 tracking-wider drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
                >
                  {isArabic
                    ? 'استعد للترقية...'
                    : t('levelStatus.getReady', { defaultValue: 'Get ready for your level upgrade...' })}
                </motion.p>
              </div>
            ) : (
              /* Stage 2: Floating Level Up Elements over Video with Fireworks */
              <div className="flex flex-col items-center justify-center z-10 w-full pt-2">
                <div className="relative mb-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                    className="w-28 h-28 relative filter drop-shadow-[0_12px_25px_rgba(0,0,0,0.95)]"
                  >
                    <AvatarLevelBadge level={level} size={112} />
                  </motion.div>
                  <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 p-1.5 rounded-full border-2 border-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-bounce">
                    <Sparkles size={18} />
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center w-full"
                >
                  <h2 className="text-2xl font-black text-white mb-2 drop-shadow-[0_4px_14px_rgba(0,0,0,0.98)] tracking-wide">
                    {isArabic
                      ? `تهانينا يا ${userName || 'المبدع'}! ترقية مستوى جديد 🌟`
                      : t('levelStatus.upTitle', { defaultValue: `Congratulations ${userName || 'Creator'}! Level Up 🌟` })}
                  </h2>

                  <p className="text-sm text-amber-200 font-bold mb-4 drop-shadow-[0_3px_10px_rgba(0,0,0,0.98)]">
                    {isArabic
                      ? `لقد أصبحت الآن في المستوى ${level}!`
                      : t('levelStatus.upSubtitle', {
                          defaultValue: `You have successfully reached Level ${level}!`
                        })}
                  </p>

                  {badge && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/75 border border-amber-400/80 text-amber-300 text-xs font-bold mb-5 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.9)]">
                      <Award size={14} />
                      <span>{badge}</span>
                    </div>
                  )}

                  {/* Bottom Action Button handles closing */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-2xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.9)] cursor-pointer text-sm"
                  >
                    {isArabic
                      ? 'رائع، استمرار 🎉'
                      : t('levelStatus.awesomeBtn', { defaultValue: 'Awesome, Continue 🎉' })}
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        ) : (
          /* LEVEL_DOWN Mode: Respectful Alert Card */
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-700/60 rounded-[2.5rem] p-7 text-center shadow-2xl relative overflow-hidden flex flex-col items-center"
          >
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-10"
            >
              <X size={16} />
            </button>

            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-slate-300 shadow-inner">
              <ShieldAlert size={32} className="text-amber-400/90" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {isArabic
                ? 'إشعار تعديل المستوى'
                : t('levelStatus.downTitle', { defaultValue: 'Level Adjustment Notice' })}
            </h2>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed px-2">
              {isArabic
                ? `تم إرجاع مستواك الحالي إلى المستوى ${level}. نحن نقدر مساهمتك الدائمة معنا.`
                : t('levelStatus.downSubtitle', {
                    defaultValue: `Your current level has been updated to Level ${level}. We value your continued contributions.`
                  })}
            </p>

            <div className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3.5 mb-4 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">
                {isArabic
                  ? 'المستوى الحالي:'
                  : t('levelStatus.currentLevelLabel', { defaultValue: 'Current Level:' })}
              </span>
              <div className="flex items-center gap-2">
                <AvatarLevelBadge level={level} size={28} />
                <span className="text-sm font-black text-amber-400">
                  {isArabic ? `المستوى ${level}` : `Level ${level}`}
                </span>
              </div>
            </div>

            {reason && (
              <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 mb-5 text-right">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                  <AlertCircle size={14} />
                  <span>
                    {isArabic
                      ? 'سبب التعديل:'
                      : t('levelStatus.reasonLabel', { defaultValue: 'Adjustment Reason:' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {reason}
                </p>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all active:scale-95 border border-slate-600/50 cursor-pointer text-sm flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>
                {isArabic
                  ? 'حسناً، فهمت ذلك'
                  : t('levelStatus.confirmBtn', { defaultValue: 'I Understand' })}
              </span>
            </button>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default LevelStatusModal;
