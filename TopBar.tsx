import React, { useState, useEffect } from 'react';
import { Gem, Plus, Heart, X } from 'lucide-react';
import ModernHSLogo from './ModernHSLogo';
import LiveStats from './LiveStats';
import { Language } from '../types';
import HiSeeCoinIcon from './HiSeeCoinIcon';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';

export interface Contributor {
  uid: string;
  name: string;
  avatar: string;
  totalSpent: number;
}

interface TopBarProps {
  gameState: 'idle' | 'active' | 'ended' | 'swapping' | 'waiting' | 'countdown' | 'results';
  score: number;
  onProfileClick: () => void;
  onScoreClick?: () => void;
  hostAvatar: string;
  hostName?: string;
  userCoins?: number;
  onRecharge?: () => void;
  roomId?: string | null;
  startedAt?: any;
  fallbackViewers?: number;
  isViewer?: boolean;
  onFollow?: () => void;
  isFollowing?: boolean;
  lang?: Language;
  onEyeClick?: () => void;
  likesCount?: number;
  challengerContributors?: Contributor[];
  opponentContributors?: Contributor[];
  isMultiStream?: boolean;
  ViewersComponent?: React.ReactNode;
  LikesComponent?: React.ReactNode;
  onClose?: () => void;
}

const RenderContributorSlots = ({ 
  contributors = [], 
  isLeft = true, 
  lang = 'ar' 
}: { 
  contributors: Contributor[], 
  isLeft: boolean, 
  lang: string 
}) => {
  const slots = [0, 1];
  
  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 shrink-0 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {slots.map((idx) => {
        const item = contributors[idx];
        const rank = idx + 1;
        
        if (item) {
          return (
            <div key={`contributor-${isLeft ? 'left' : 'right'}-${idx}`} className="relative group/contrib cursor-pointer pointer-events-auto">
              {rank === 1 && (
                <div className="absolute -inset-[1.5px] rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 blur-[2px] opacity-75 group-hover/contrib:opacity-100 transition-opacity duration-300 animate-pulse" />
              )}
              {rank === 2 && (
                <div className="absolute -inset-[1.5px] rounded-full bg-gradient-to-r from-slate-400 to-slate-300 blur-[2px] opacity-40 group-hover/contrib:opacity-75 transition-opacity duration-300" />
              )}
              <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 rounded-full border border-white/20 shadow-inner overflow-hidden bg-slate-900 flex items-center justify-center z-10 transition-transform duration-300 group-hover/contrib:scale-110">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.uid || item.name || 'contrib')}`} 
                  className="absolute inset-0 w-full h-full object-cover" 
                  alt="" 
                />
                {(item.avatar) && (
                  <img 
                    referrerPolicy="no-referrer"
                    src={item.avatar} 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      e.currentTarget.classList.remove('opacity-0');
                      e.currentTarget.classList.add('opacity-100');
                    }}
                    alt={item.name} 
                    className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 opacity-0" 
                  />
                )}
              </div>
              
              <div className={`absolute -top-0.5 -right-0.5 z-20 font-black text-[6px] sm:text-[7px] w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-white/20 leading-none ${
                rank === 1 
                  ? 'bg-gradient-to-b from-yellow-400 to-amber-500 text-black font-mono' 
                  : 'bg-gradient-to-b from-slate-300 to-slate-500 text-white font-mono'
              }`}>
                {rank}
              </div>
              
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/contrib:block bg-slate-900/95 border border-white/15 px-2 py-1 rounded-xl text-[8px] text-white whitespace-nowrap z-50 shadow-2xl pointer-events-none transition-all duration-300">
                <div className="font-bold">{item.name}</div>
                <div className="text-yellow-400 text-[7px] flex items-center gap-0.5 justify-center mt-0.5">
                  <HiSeeCoinIcon size={7} />
                  <span>{item.totalSpent}</span>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div key={`placeholder-${isLeft ? 'left' : 'right'}-${idx}`} className="relative group/contrib select-none pointer-events-auto">
              <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/5 blur-[2px] opacity-50 animate-pulse" />
              
              <div className="relative w-5 h-5 sm:w-6.5 sm:h-6.5 rounded-full border border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/[0.03] hover:bg-emerald-500/10 flex items-center justify-center z-10 transition-all duration-300 group-hover/contrib:scale-105 shadow-inner">
                <div className="text-[7px] sm:text-[8px] font-black text-emerald-400/80 leading-none flex flex-col items-center justify-center scale-90 sm:scale-100">
                  <span className="text-[4px] sm:text-[5px] tracking-tighter opacity-70 mb-0.5 font-bold">
                    {lang === 'ar' ? 'كن' : 'Be'}
                  </span>
                  <span className="font-mono leading-none">{rank}</span>
                </div>
              </div>

              {rank === 1 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none animate-bounce z-20">
                  <span className="text-[4.5px] sm:text-[5.5px] font-black bg-gradient-to-r from-emerald-600 to-teal-500 text-white leading-none px-1 py-0.5 rounded-full scale-[0.8] whitespace-nowrap border border-emerald-400/20 shadow-[0_1px_4px_rgba(16,185,129,0.35)] animate-pulse">
                    {lang === 'ar' ? 'أرسل! 👇' : 'Send! 👇'}
                  </span>
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );
};

export const TopBar: React.FC<TopBarProps> = React.memo(({ 
  gameState, score, onProfileClick, onScoreClick, hostAvatar, hostName, 
  userCoins = 0, onRecharge, roomId, startedAt, fallbackViewers = 0,
  isViewer, onFollow, isFollowing, lang = 'ar', onEyeClick, likesCount = 0,
  challengerContributors = [], opponentContributors = [], isMultiStream = false,
  ViewersComponent, LikesComponent, onClose
}) => {
  return (
      <div className="absolute top-0 left-0 right-0 z-[60] pointer-events-none h-auto pb-4 w-full max-w-[100vw] px-2 sm:px-4 flex items-start pt-[calc(env(safe-area-inset-top,8px)+12px)] justify-between overflow-visible box-border">
          
          {/* Right (start in RTL): Exit Button at the corner next to LIVE badge, LiveStats */}
          <div className="pointer-events-auto flex-initial shrink-0 flex items-center justify-start gap-1 sm:gap-1.5">
            {onClose && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="pointer-events-auto w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-all shadow-md shrink-0 cursor-pointer"
                title={lang === 'ar' ? 'خروج' : 'Exit'}
              >
                <X size={13} className="text-white drop-shadow-md" />
              </button>
            )}
            <LiveStats 
              startedAt={startedAt} 
              fallbackViewers={fallbackViewers} 
              onEyeClick={onEyeClick} 
              ViewersComponent={ViewersComponent}
            />
          </div>

          {/* Center: Coins and Gift Pool with Contributors */}
          <div className="pointer-events-auto flex-1 flex flex-col items-center justify-center gap-1 min-w-0 px-1 select-none overflow-visible relative">
              <div className="flex items-center gap-1 sm:gap-2.5 justify-center w-full max-w-full overflow-visible">
                  {/* Gift Pool Centerpiece */}
                  <div 
                    onPointerDown={(e) => { e.preventDefault(); if (!isViewer && onScoreClick) onScoreClick(); }}
                    className={`flex items-center gap-1 sm:gap-1.5 transition-all group px-1.5 sm:px-3 py-1 rounded-full bg-gradient-to-b from-yellow-500/15 via-amber-500/10 to-transparent border border-yellow-400/25 shadow-[0_4px_12px_rgba(234,179,8,0.1)] backdrop-blur-[4px] shrink-0 ${isViewer ? 'opacity-95 select-none pointer-events-none' : 'cursor-pointer active:scale-95 hover:border-yellow-400/40 hover:from-yellow-500/20 hover:to-amber-500/15'}`}
                  >
                      <div className="relative shrink-0 flex items-center justify-center w-4.5 h-4.5 sm:w-6 sm:h-6">
                          {/* Ambient golden glow behind the icon */}
                          <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-[6px] scale-110 group-hover:scale-130 transition-transform duration-300 animate-pulse"></div>
                          
                          <Gem size={12} className="text-yellow-400 drop-shadow-[0_2px_6px_rgba(234,179,8,0.8)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 absolute" fill="currentColor" />
                          <div className="absolute inset-0 flex items-center justify-center z-10 opacity-90 mix-blend-screen scale-[0.75] sm:scale-90 transition-transform duration-300 group-hover:scale-[0.85] sm:group-hover:scale-100">
                              <ModernHSLogo size={16} />
                          </div>
                      </div>
                      <div className="flex flex-col items-start leading-[1.0] justify-center">
                          <span className="text-[8.5px] sm:text-xs font-black text-yellow-400 font-mono tracking-wider drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] leading-none">{score.toLocaleString()}</span>
                          <span className="text-[5.5px] sm:text-[8px] font-black text-amber-200/90 drop-shadow-md select-none tracking-wide leading-none mt-0.5">{lang === 'ar' ? 'مجمع الهدايا' : 'Gift Hub'}</span>
                      </div>
                  </div>
              </div>

              {/* Floating lower contributors - ONLY shown in joint stream (isMultiStream) */}
              {isMultiStream && (
                <div className="absolute top-[38px] sm:top-[44px] left-1/2 -translate-x-1/2 flex justify-between items-center px-4 w-[92vw] sm:w-[440px] md:w-[540px] lg:w-[640px] max-w-[95vw] pointer-events-none overflow-visible">
                  {/* Left Contributor Slot (Challenger) - Pushed down and offset left */}
                  <div className="pointer-events-auto flex items-center gap-1 bg-black/45 border border-white/10 backdrop-blur-md px-1.5 py-1 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.4)] select-none">
                    <RenderContributorSlots 
                      contributors={challengerContributors} 
                      isLeft={true} 
                      lang={lang} 
                    />
                  </div>

                  {/* Right Contributor Slot (Opponent) - Pushed down and offset right */}
                  <div className="pointer-events-auto flex items-center gap-1 bg-black/45 border border-white/10 backdrop-blur-md px-1.5 py-1 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.4)] select-none">
                    <RenderContributorSlots 
                      contributors={opponentContributors} 
                      isLeft={false} 
                      lang={lang} 
                    />
                  </div>
                </div>
              )}
          </div>

          {/* Right: Host Profile & Follow */}
          <div className="flex-initial shrink-0 flex items-start justify-end pointer-events-none font-sans">
              <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="flex flex-col items-end justify-center min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {/* Likes Counter Badge (Transparent floating without bg container) - Shown for viewers only */}
                      {isViewer && (
                        LikesComponent ? LikesComponent : (
                          <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-white select-none shrink-0 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]">
                            <Heart size={10} fill="#f43f5e" className="text-rose-500 animate-[pulse_1.5s_infinite]" />
                            <span className="font-mono tracking-wide leading-none">{likesCount > 999 ? (likesCount / 1000).toFixed(1) + 'k' : likesCount}</span>
                          </div>
                        )
                      )}
                      
                      <span className="text-[10px] sm:text-[11px] font-black text-white truncate max-w-[65px] sm:max-w-[100px] drop-shadow-md leading-tight">
                        {hostName}
                      </span>
                    </div>
                    {isViewer && onFollow ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onFollow(); }}
                        className={`text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-lg transition-all active:scale-95 mt-0.5 ${
                          isFollowing 
                            ? 'bg-neutral-800/80 text-white/75 hover:bg-neutral-800 border border-white/5' 
                            : 'bg-rose-600 hover:bg-rose-700 text-white font-black'
                        }`}
                      >
                        {isFollowing 
                          ? (lang === 'ar' ? 'متابع ✓' : 'Following ✓') 
                          : (lang === 'ar' ? 'متابعة' : 'Follow')
                        }
                      </button>
                    ) : (
                      /* For Host - Show the Likes Counter Badge in space of Follow button */
                      !isViewer && (
                        LikesComponent ? LikesComponent : (
                          <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-white select-none shrink-0 mt-0.5 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]">
                            <Heart size={10} fill="#f43f5e" className="text-rose-500 animate-[pulse_1.5s_infinite]" />
                            <span className="font-mono tracking-wide leading-none">{likesCount > 999 ? (likesCount / 1000).toFixed(1) + 'k' : likesCount}</span>
                          </div>
                        )
                      )
                    )}
                  </div>

                  <div 
                    className="relative z-50 pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full cursor-pointer flex items-center justify-center p-0.5 bg-black/40 border border-white/20 shadow-lg active:scale-95 transition-transform"
                    onPointerDown={(e) => { 
                      e.preventDefault(); 
                      onProfileClick(); 
                    }}
                  >
                    <img 
                      referrerPolicy="no-referrer"
                      src={normalizeMediaUrl(hostAvatar)}
                      className="w-full h-full rounded-full object-cover" 
                      alt="Host" 
                    />
                  </div>
              </div>
          </div>
      </div>
  );
});

export default TopBar;