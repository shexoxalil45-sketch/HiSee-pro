import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Zap, Flame, Swords, Trophy } from 'lucide-react';
import { Language } from '../types';

export interface PKChallengeContainerProps {
  roomId: string;
  hostUid: string;
  guestUid?: string;
  hostName?: string;
  guestName?: string;
  initialBlueScore?: number;
  initialRedScore?: number;
  durationSeconds?: number;
  lang?: Language;
  onClose?: () => void;
  className?: string;
}

/**
 * PKChallengeContainer:
 * Manages PK Challenge interactive buttons (Yellow & Red)
 * - Yellow button is positioned on the Left, under the Account Owner (Host 1)
 * - Red button is positioned on the Right, under the Competitor (Host 2 / Guest)
 * - Account Owner's button is enabled (disabled = false)
 * - Opponent's button is frozen and disabled (disabled = true, pointer-events-none opacity-40)
 * - Points are strictly linked to the tapped side only, with no overlap
 */
export const PKChallengeContainer: React.FC<PKChallengeContainerProps> = ({
  roomId,
  hostUid,
  guestUid = '',
  hostName = 'المضيف',
  guestName = 'المنافس',
  initialBlueScore = 0,
  initialRedScore = 0,
  durationSeconds = 240,
  lang = 'ar',
  onClose,
  className = ''
}) => {
  const [blueScore, setBlueScore] = useState<number>(initialBlueScore);
  const [redScore, setRedScore] = useState<number>(initialRedScore);
  const [lastTap, setLastTap] = useState<'left' | 'right' | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(durationSeconds);
  const [pkEnded, setPkEnded] = useState<boolean>(false);

  const currentUid = auth.currentUser?.uid || '';

  // Determine owner side:
  // Left side is Host / Account Owner
  // Right side is Guest / Opponent
  const isLeftOwner = useMemo(() => {
    if (!currentUid) return true; // Default fallback for preview
    return currentUid === hostUid;
  }, [currentUid, hostUid]);

  const isRightOwner = useMemo(() => {
    if (!currentUid) return false;
    return currentUid === guestUid && guestUid !== '';
  }, [currentUid, guestUid]);

  // Real-time Firestore score listener
  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(db, 'live_rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (typeof data.blueScore === 'number') setBlueScore(data.blueScore);
        if (typeof data.redScore === 'number') setRedScore(data.redScore);
        if (typeof data.pkEnded === 'boolean') setPkEnded(data.pkEnded);
      }
    }, (err) => {
      console.warn('[PKChallengeContainer] Snapshot warning:', err);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Timer countdown
  useEffect(() => {
    if (pkEnded || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPkEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pkEnded, secondsRemaining]);

  // Left Tap (Yellow - Host Side)
  const handleLeftTap = async () => {
    if (!isLeftOwner || pkEnded) return;

    setLastTap('left');
    setBlueScore(prev => prev + 1);

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    } catch (_) {}

    if (roomId) {
      try {
        const roomRef = doc(db, 'live_rooms', roomId);
        await updateDoc(roomRef, {
          blueScore: increment(1),
          lastInteractionAt: serverTimestamp()
        });
      } catch (err) {
        console.error('[PKChallengeContainer] Failed to update blue score:', err);
      }
    }

    setTimeout(() => setLastTap(null), 250);
  };

  // Right Tap (Red - Opponent Side)
  const handleRightTap = async () => {
    if (!isRightOwner || pkEnded) return;

    setLastTap('right');
    setRedScore(prev => prev + 1);

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    } catch (_) {}

    if (roomId) {
      try {
        const roomRef = doc(db, 'live_rooms', roomId);
        await updateDoc(roomRef, {
          redScore: increment(1),
          lastInteractionAt: serverTimestamp()
        });
      } catch (err) {
        console.error('[PKChallengeContainer] Failed to update red score:', err);
      }
    }

    setTimeout(() => setLastTap(null), 250);
  };

  const total = blueScore + redScore;
  const leftPercent = total === 0 ? 50 : Math.max(10, Math.min(90, Math.round((blueScore / total) * 100)));
  const rightPercent = 100 - leftPercent;

  return (
    <div className={`w-full bg-gradient-to-b from-[#1c222d] via-[#12161f] to-[#0a0d13] border-y border-white/10 p-3 flex flex-col gap-2 select-none shadow-2xl ${className}`}>
      
      {/* Top Header: Score & Timer */}
      <div className="flex items-center justify-between gap-3">
        {/* Left Team Info (Yellow) */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,1)] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-yellow-400 font-mono font-black text-base drop-shadow-sm leading-tight">
              {blueScore}
            </span>
            <span className="text-[10px] text-white/70 truncate max-w-[80px]">
              {hostName}
            </span>
          </div>
        </div>

        {/* Center: Timer & Status */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-white font-mono text-xs font-bold shadow-inner">
            <Swords size={12} className="text-amber-400" />
            <span>{Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}</span>
          </div>
          {pkEnded && (
            <span className="text-[9px] text-amber-400 font-bold mt-0.5">
              {blueScore < redScore ? (lang === 'ar' ? 'فاز المضيف!' : 'Host Won!') : redScore < blueScore ? (lang === 'ar' ? 'فاز المنافس!' : 'Opponent Won!') : (lang === 'ar' ? 'تعادل!' : 'Draw!')}
            </span>
          )}
        </div>

        {/* Right Team Info (Red) */}
        <div className="flex items-center gap-2 justify-end">
          <div className="flex flex-col items-end">
            <span className="text-red-400 font-mono font-black text-base drop-shadow-sm leading-tight">
              {redScore}
            </span>
            <span className="text-[10px] text-white/70 truncate max-w-[80px]">
              {guestName}
            </span>
          </div>
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse" />
        </div>
      </div>

      {/* Center Duel Progress Bar */}
      <div className="relative w-full h-3.5 bg-black/80 rounded-full border border-white/10 overflow-hidden flex shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
          style={{ width: `${leftPercent}%` }}
        />
        <div className="w-[2px] h-full bg-white z-10 shrink-0 shadow-[0_0_6px_white]" />
        <div 
          className="h-full bg-gradient-to-l from-rose-600 to-red-500 transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
          style={{ width: `${rightPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">VS</span>
        </div>
      </div>

      {/* Buttons Layout:
          - Left Button: Yellow (أصفر) situated under Host / Account Owner
          - Right Button: Red (أحمر) situated under Opponent / Competitor
          - Account Owner button is enabled (disabled = false)
          - Competitor opposite button is frozen (disabled = true, pointer-events-none opacity-40)
      */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        {/* Left Tap Button (Yellow - Host Side) */}
        <div className="flex items-center justify-center">
          <button
            id="pk-btn-container-yellow"
            type="button"
            disabled={isLeftOwner || pkEnded}
            onClick={handleLeftTap}
            aria-label="Yellow PK Button (Host Side)"
            className={`w-full h-[46px] rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all select-none shadow-lg ${
              isLeftOwner || pkEnded
                ? 'disabled = true pointer-events-none opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700'
                : 'disabled = false cursor-pointer bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_18px_rgba(250,204,21,0.6)] border-2 border-yellow-200'
            } ${lastTap === 'left' ? 'scale-95 ring-2 ring-yellow-300' : ''}`}
          >
            <Zap size={18} className={!isLeftOwner && !pkEnded ? "text-slate-950 fill-slate-950" : "text-slate-500"} />
            <span className="font-extrabold">{lang === 'ar' ? 'ضغط المضيف (أصفر)' : 'Host Tap (Yellow)'}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-black/20 text-slate-950 font-black">+{blueScore}</span>
          </button>
        </div>

        {/* Right Tap Button (Red - Opponent Side) */}
        <div className="flex items-center justify-center">
          <button
            id="pk-btn-container-red"
            type="button"
            disabled={isRightOwner || pkEnded}
            onClick={handleRightTap}
            aria-label="Red PK Button (Opponent Side)"
            className={`w-full h-[46px] rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all select-none shadow-lg ${
              isRightOwner || pkEnded
                ? 'disabled = true pointer-events-none opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700'
                : 'disabled = false cursor-pointer bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 text-white hover:brightness-110 active:scale-95 shadow-[0_0_18px_rgba(239,68,68,0.6)] border-2 border-rose-300'
            } ${lastTap === 'right' ? 'scale-95 ring-2 ring-red-400' : ''}`}
          >
            <Flame size={18} className={!isRightOwner && !pkEnded ? "text-white fill-white" : "text-slate-500"} />
            <span className="font-extrabold">{lang === 'ar' ? 'ضغط المنافس (أحمر)' : 'Opponent Tap (Red)'}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-black/30 text-white font-black">+{redScore}</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default PKChallengeContainer;
