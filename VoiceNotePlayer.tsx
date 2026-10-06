import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { Play, Pause, Lock, Headphones, Music } from 'lucide-react';
import { motion } from 'motion/react';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';

export interface VoiceNotePlayerProps {
  audioUrl: string;
  messageId: string;
  isMe?: boolean;
  isAudioFile?: boolean;
  isPlayed?: boolean;
  isRead?: boolean;
  isLocked?: boolean;
  initialDuration?: string;
  isSelectionMode?: boolean;
  onTogglePlay?: (id: string, url: string) => void;
  activeAudioId?: string | null;
  isGlobalAudioPlaying?: boolean;
  audioProgress?: number;
  currentAudioTime?: string;
  onDurationLoaded?: (durationStr: string, rawSeconds: number) => void;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = memo(({
  audioUrl,
  messageId,
  isMe = false,
  isAudioFile = false,
  isPlayed = true,
  isRead = false,
  isLocked = false,
  initialDuration = '00:00',
  isSelectionMode = false,
  onTogglePlay,
  activeAudioId,
  isGlobalAudioPlaying = false,
  audioProgress = 0,
  currentAudioTime = '00:00',
  onDurationLoaded
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [realDuration, setRealDuration] = useState<string>(initialDuration);

  const [hasError, setHasError] = useState(false);

  const cleanUrl = React.useMemo(() => {
    if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.startsWith('E2EE:')) return '';
    return normalizeMediaUrl(audioUrl);
  }, [audioUrl]);

  const isCurrentPlaying = activeAudioId === messageId && isGlobalAudioPlaying;

  const isValidUrl = cleanUrl && cleanUrl.length > 0 && !hasError;

  // Safe duration loader that never interrupts active playback or re-triggers on timeupdate
  useEffect(() => {
    // CRITICAL: Prevent re-loading or setting src if already playing, if duration is already cached, or if URL is invalid
    // This avoids the "reset to zero" bug when state updates happen
    if (isCurrentPlaying || (initialDuration && initialDuration !== '00:00') || !isValidUrl) {
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    try {
      // Only set src and load if it's actually different AND not currently playing
      if (audio.src !== cleanUrl && !isCurrentPlaying) {
        audio.src = cleanUrl;
        audio.load();
      }
    } catch (e: any) {
      console.warn('VoiceNotePlayer metadata load suppressed:', e?.message || e);
    }
  }, [cleanUrl, initialDuration, isCurrentPlaying, isValidUrl]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration) && audio.duration > 0) {
      const mins = Math.floor(audio.duration / 60);
      const secs = Math.floor(audio.duration % 60);
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setRealDuration(formatted);
      if (onDurationLoaded) {
        onDurationLoaded(formatted, audio.duration);
      }
    }
  }, [onDurationLoaded]);

  const handleAudioError = useCallback((e: any) => {
    const errorMsg = e?.target?.error?.message || 'Unknown audio error';
    console.warn('VoiceNotePlayer Audio Error handled gracefully:', errorMsg);
    setHasError(true);
  }, []);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isValidUrl) return;

    // Before toggling, we ensure the audio element has the correct src but DO NOT call .load()
    // if it's already set, to prevent interruption.
    const audio = audioRef.current;
    if (audio && audio.src !== cleanUrl && !isCurrentPlaying) {
      audio.src = cleanUrl;
    }

    if (onTogglePlay) {
      onTogglePlay(messageId, cleanUrl);
    }
  }, [cleanUrl, messageId, onTogglePlay, isCurrentPlaying, isValidUrl]);

  return (
    <div className={`flex items-center gap-3 w-full pl-6 ${isSelectionMode ? 'pointer-events-none' : ''}`}>
      {/* Hidden Audio element for reliable metadata & playback loading */}
      <audio
        ref={audioRef}
        src={isValidUrl ? cleanUrl : undefined}
        preload="metadata"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleAudioError}
        className="hidden"
      />

      {/* Original Play / Pause Button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleToggle}
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all backdrop-blur-sm relative z-10 active:scale-95 ${
            isAudioFile
              ? 'bg-white/10 border border-white/20 text-white'
              : !isPlayed
                ? isMe
                  ? 'bg-slate-900/40 border border-orange-500/30'
                  : 'bg-slate-900/40 border border-emerald-500/30'
                : isMe
                  ? 'bg-slate-400/20 text-white/80 hover:bg-slate-400/30 border border-white/10'
                  : 'bg-slate-500/20 text-white/80 hover:bg-slate-500/30 border border-white/5'
          }`}
        >
          {isCurrentPlaying ? (
            <Pause
              size={24}
              fill={(isAudioFile || isPlayed) ? 'currentColor' : 'none'}
              className={
                (!isPlayed && !isAudioFile)
                  ? isMe
                    ? 'text-white stroke-[1px]'
                    : 'text-white filter drop-shadow-[0_0_3px_rgba(52,211,153,0.8)] stroke-[1px]'
                  : ''
              }
            />
          ) : (
            <Play
              size={24}
              fill={(isAudioFile || isPlayed) ? 'currentColor' : 'none'}
              className={`ml-1 ${
                (!isPlayed && !isAudioFile)
                  ? isMe
                    ? 'text-white stroke-[1px]'
                    : 'text-white filter drop-shadow-[0_0_3px_rgba(52,211,153,0.8)] stroke-[1px]'
                  : ''
              }`}
            />
          )}
        </button>
      </div>

      {/* Original Waveform & Duration Display */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-[120px]">
        {/* Waveform */}
        <div className="flex items-center gap-0.5 h-4">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`w-0.5 rounded-full transition-all duration-300 ${
                activeAudioId === messageId && (i / 20) * 100 < audioProgress
                  ? isAudioFile
                    ? 'bg-white h-3 shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                    : 'bg-amber-400 h-3'
                  : (!isPlayed && isMe && !isAudioFile)
                    ? 'bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400 h-2 shadow-[0_0_5px_rgba(239,68,68,0.5)] animate-pulse'
                    : isAudioFile
                      ? 'bg-white/20 h-1.5'
                      : isRead
                        ? 'bg-indigo-300/40 h-1.5'
                        : 'bg-emerald-200/40 h-1.5'
              }`}
              style={{
                height: isCurrentPlaying ? `${Math.random() * 10 + 4}px` : undefined
              }}
            />
          ))}
          <div className="flex items-center gap-2.5 ml-8">
            {!isPlayed && !isMe && !isAudioFile && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Headphones size={14} className="text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
              </motion.div>
            )}
            {!isAudioFile ? (
              <div
                className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${
                  (!isPlayed && isMe)
                    ? 'bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                    : (!isPlayed && !isMe)
                      ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                      : 'bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.4)]'
                }`}
              />
            ) : (
              <Music size={12} className="text-white/60" />
            )}
          </div>
        </div>

        {/* Duration / Status Row */}
        <div className="flex justify-between items-center mt-1 pr-1">
          <span className={`text-[10px] font-bold ${hasError ? 'text-rose-400' : isMe ? 'text-white/80' : 'text-slate-400'}`}>
            {hasError
              ? 'تعذر التشغيل'
              : isCurrentPlaying
                ? currentAudioTime
                : (realDuration || initialDuration || '00:00')}
          </span>

          <div className="flex items-center gap-1 relative">
            {isLocked && <Lock size={12} className={isMe ? 'text-emerald-200' : 'text-slate-400'} />}
            {isAudioFile && <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Audio File</span>}
          </div>
        </div>
      </div>
    </div>
  );
});

VoiceNotePlayer.displayName = 'VoiceNotePlayer';

export default VoiceNotePlayer;
