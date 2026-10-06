import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { WatermarkOverlay } from './WatermarkOverlay';
import { Play, Pause, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StarButton } from './StarButton';

export interface VideoContainerHandle {
    play: () => void;
    pause: () => void;
}

interface VideoContainerProps {
    isActive?: boolean;
    isManuallyPaused?: boolean;
    userName?: string;
    isViewer: boolean;
    activeSlots: number;
    activeFilterClass: string;
    isFlipped: boolean;
    isBeautyOn: boolean;
    beautyLevel: number;
    brightenLevel: number;
    eyeSize?: number;
    faceShape?: number;
    activeEffect?: any;
    activeArMask?: any;
    isCameraOff: boolean;
    zoomLevel?: number;
    liveStep: string;
    isCreativeHub: boolean;
    currentRoomDataId?: string;
    currentMockStreamId?: string;
    setBroadcastVideoRef: (el: HTMLElement | null) => void;
    viewerVideoRef?: any;
    selectedBackground?: any;
    previewUrl?: string | null;
    localStream?: MediaStream | null;
    isSpecialChallenge?: boolean;
    containerId?: string;
    roomId?: string;
    streamId?: string;
    videoId?: string;
    authorUid?: string;
    isLocal?: boolean;
    activeStreamSource?: any;
    currentUserId?: string;
    onTogglePause?: () => void;
    onLike?: () => void;
    isUiVisible?: boolean;
    onToggleUi?: (visible: boolean) => void;
}

export const VideoContainer = React.memo(forwardRef<VideoContainerHandle, VideoContainerProps>(({
    isActive = true,
    isManuallyPaused = false,
    userName,
    isViewer,
    activeSlots,
    activeFilterClass,
    isFlipped,
    isBeautyOn,
    beautyLevel,
    brightenLevel,
    activeEffect,
    activeArMask,
    isCameraOff,
    zoomLevel,
    liveStep,
    isCreativeHub,
    currentRoomDataId,
    currentMockStreamId,
    setBroadcastVideoRef,
    viewerVideoRef,
    selectedBackground,
    previewUrl,
    localStream,
    isSpecialChallenge,
    containerId,
    roomId,
    streamId,
    videoId,
    authorUid,
    isLocal,
    activeStreamSource,
    currentUserId,
    onTogglePause,
    onLike,
    isUiVisible = true,
    onToggleUi
}, ref) => {
    
    const [showPlayButton, setShowPlayButton] = useState(false);
    const [hearts, setHearts] = useState<{ id: number, x: number, y: number }[]>([]);
    const [isCleanView, setIsCleanView] = useState(false);
    
    const lastTapTime = useRef<number>(0);
    const tapTimeout = useRef<NodeJS.Timeout | null>(null);
    const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
    const hidePlayButtonTimeout = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActive = useRef(false);

    // Auto-hide play button logic
    useEffect(() => {
        if (showPlayButton && !isManuallyPaused) {
            if (hidePlayButtonTimeout.current) clearTimeout(hidePlayButtonTimeout.current);
            hidePlayButtonTimeout.current = setTimeout(() => {
                setShowPlayButton(false);
            }, 3000);
        }
        return () => {
            if (hidePlayButtonTimeout.current) clearTimeout(hidePlayButtonTimeout.current);
        };
    }, [showPlayButton, isManuallyPaused]);

    // Force show play button if paused
    useEffect(() => {
        if (isManuallyPaused) {
            setShowPlayButton(true);
            if (hidePlayButtonTimeout.current) clearTimeout(hidePlayButtonTimeout.current);
        }
    }, [isManuallyPaused]);

    const handleInteractionStart = (clientX: number, clientY: number) => {
        isLongPressActive.current = false;
        if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
        
        longPressTimeout.current = setTimeout(() => {
            isLongPressActive.current = true;
            setIsCleanView(true);
            if (onToggleUi) onToggleUi(false);
        }, 600);
    };

    const handleInteractionEnd = (clientX: number, clientY: number) => {
        if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
        
        if (isLongPressActive.current) {
            setIsCleanView(false);
            if (onToggleUi) onToggleUi(true);
            isLongPressActive.current = false;
            return;
        }

        const now = Date.now();
        const diff = now - lastTapTime.current;

        if (diff < 300) {
            // Double Tap
            if (tapTimeout.current) clearTimeout(tapTimeout.current);
            handleDoubleTap(clientX, clientY);
            lastTapTime.current = 0;
        } else {
            // Single Tap Potential
            lastTapTime.current = now;
            tapTimeout.current = setTimeout(() => {
                handleSingleTap();
                lastTapTime.current = 0;
            }, 300);
        }
    };

    const handleSingleTap = () => {
        setShowPlayButton(prev => !prev);
    };

    const handleDoubleTap = (x: number, y: number) => {
        const newHeart = { id: Date.now(), x, y };
        setHearts(prev => [...prev, newHeart]);
        // Like toggle via double tap removed per user request
        setTimeout(() => {
            setHearts(prev => prev.filter(h => h.id !== newHeart.id));
        }, 1000);
    };

    const handlePlayPauseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onTogglePause) onTogglePause();
        // If it was paused, it will now play, so hide button immediately
        if (isManuallyPaused) {
            setShowPlayButton(false);
        }
    };
    
    useImperativeHandle(ref, () => ({
        play: () => {
            const player = mainContainerRef.current;
            if (player) {
                const videos = player.getElementsByTagName('video');
                for (let i = 0; i < videos.length; i++) {
                    videos[i].play().catch(() => {});
                }
            }
        },
        pause: () => {
            const player = mainContainerRef.current;
            if (player) {
                const videos = player.getElementsByTagName('video');
                for (let i = 0; i < videos.length; i++) {
                    videos[i].pause();
                }
            }
        }
    }), []);
    
    const effectiveIsLocal = isLocal !== undefined 
        ? isLocal 
        : (streamId && currentUserId 
            ? streamId === currentUserId 
            : (streamId ? false : !isViewer)
          );
    const lastStreamIdRef = useRef<string | null>(null);
    const activeContainerId = containerId || (effectiveIsLocal ? "local-player" : `remote-player-${streamId}`);
    useEffect(() => {
        if (streamId && streamId !== lastStreamIdRef.current) {
            console.log(`[VideoContainer] UID Binding Active: ${streamId} in container ${activeContainerId}`);
            lastStreamIdRef.current = streamId;
        }
    }, [streamId, activeContainerId]);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const mainContainerRef = useRef<HTMLDivElement | null>(null);
    const lastViewerVideoRefEl = useRef<HTMLElement | null>(null);
    const lastBroadcastVideoRefEl = useRef<HTMLElement | null>(null);

    // Force re-binding of video tracks ONLY when room/stream actually changes
    const viewerVideoRefRef = useRef(viewerVideoRef);
    useEffect(() => { viewerVideoRefRef.current = viewerVideoRef; }, [viewerVideoRef]);
    
    useEffect(() => {
        if (!roomId || !streamId) return;
        
        // Only force re-bind if it's actually a different session to prevent infinite flicker
        if (lastRoomIdRef.current !== roomId || lastStreamIdRef.current !== streamId) {
            lastRoomIdRef.current = roomId;
            lastStreamIdRef.current = streamId;
            lastViewerVideoRefEl.current = null;
            lastBroadcastVideoRefEl.current = null;
            
            if (viewerVideoRefRef.current && mainContainerRef.current) {
                console.log(`[VideoContainer] Session Change: Re-binding for room ${roomId}, stream ${streamId}`);
                viewerVideoRefRef.current(mainContainerRef.current);
            }
        }
    }, [roomId, streamId]);

    const lastRoomIdRef = useRef<string | null>(null);



    // Play local preview stream when available (for initial setup stage)
    useEffect(() => {
        let isMounted = true;
        if (localVideoRef.current && localStream) {
            if (localVideoRef.current.srcObject !== localStream) {
                localVideoRef.current.srcObject = localStream;
            }
            localVideoRef.current.play().catch(err => {
                if (isMounted && err.name !== 'AbortError') {
                    console.error("[LocalVideoRef] play() failed:", err);
                }
            });
        }
        return () => { isMounted = false; };
    }, [localStream]);

    // Direct playback control based strictly on isActive prop
    useEffect(() => {
        const container = mainContainerRef.current;
        if (!container) return;
        const videos = container.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (isActive) {
                v.play().catch(() => {});
            } else {
                v.pause();
                v.muted = true;
            }
        }
    }, [isActive]);

    // Mute enforcing utility (Trigger on render and track changes instead of polling)
    useEffect(() => {
        if (effectiveIsLocal && (liveStep === 'broadcasting' || liveStep === 'setup')) {
            const player = mainContainerRef.current;
            if (player) {
                const videos = player.getElementsByTagName('video');
                for (let i = 0; i < videos.length; i++) {
                    if (!videos[i].muted) videos[i].muted = true;
                }
            }
        }
    }, [effectiveIsLocal, liveStep, localStream]);

    // Helper to render effects
    const renderEffectsAndMasks = () => (
        <>
            {activeEffect && activeEffect.id !== 'none' && (
                <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full relative">
                        {[...Array(20)].map((_, i) => (
                            <div 
                                key={i}
                                className="absolute animate-float-up opacity-0"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${100 + Math.random() * 50}%`,
                                    animationDelay: `${Math.random() * 5}s`,
                                    fontSize: '24px',
                                    color: activeEffect.color === 'rose' ? '#fb7185' : '#fbbf24'
                                }}
                            >
                                {activeEffect.icon}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {activeArMask && activeArMask.id !== 'none' && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                    <span className="text-8xl animate-pulse transition-all transform hover:scale-110 drop-shadow-2xl">
                        {activeArMask.emoji}
                    </span>
                </div>
            )}
        </>
    );

    // Automatic Video Detection & Visibility Stabilization via MutationObserver (Zero Polling CPU Heat)
    useEffect(() => {
        const container = mainContainerRef.current;
        if (!container) return;

        const checkVisibility = () => {
            const video = container.querySelector('video');
            if (video && !isCameraOff) {
                if (container.style.opacity !== "1") {
                    container.style.opacity = "1";
                }
                if (container.style.zIndex !== "10") {
                    container.style.zIndex = "10";
                }
            }
        };

        checkVisibility();

        const observer = new MutationObserver(() => {
            checkVisibility();
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [isCameraOff]);

    return (
        <div 
            className="absolute inset-0 z-0 overflow-hidden bg-slate-950 w-full h-full cursor-pointer select-none"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
            onMouseUp={(e) => handleInteractionEnd(e.clientX, e.clientY)}
            onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={(e) => handleInteractionEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Background Layer */}
            {selectedBackground && selectedBackground.type !== 'none' && !isCleanView && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {selectedBackground.type === 'image' && (
                        <img src={normalizeMediaUrl(selectedBackground.url)} className="absolute inset-0 w-full h-full object-cover" alt="bg" />
                    )}
                    {selectedBackground.type === 'video' && (
                        <video 
                          src={normalizeMediaUrl(selectedBackground.url)} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline
                          webkit-playsinline="true"
                          preload="metadata"
                          className="absolute inset-0 w-full h-full object-cover" 
                          onError={(e) => {
                            const v = e.currentTarget;
                            console.error("VideoContainer background load error:", v.src, v.error);
                            if (v.readyState === 0 && !(v as any)._hasRetried) {
                                (v as any)._hasRetried = true;
                                v.load();
                            }
                          }}
                        />
                    )}
                    {selectedBackground.type === 'blur' && (
                        <div className="absolute inset-0 w-full h-full bg-slate-900 backdrop-blur-3xl" />
                    )}
                </div>
            )}

            {/* Recording Preview Layer */}
            {previewUrl && (
                <div className="absolute inset-0 z-[15] pointer-events-none flex items-center justify-center bg-black">
                     <video 
                        src={previewUrl} 
                        autoPlay 
                        loop 
                        playsInline
                        webkit-playsinline="true"
                        preload="metadata"
                        className="w-full h-full object-cover"
                        style={{ filter: activeFilterClass, transform: 'scaleX(-1)' }}
                        onError={(e) => console.error("Recording preview error:", e.currentTarget.error)}
                     />
                </div>
            )}

            {/* Main Video Surface Container - Separated based on user type */}
            {effectiveIsLocal ? (
                <div 
                    id={activeContainerId}
                    ref={(el) => {
                        if (!el) return;
                        mainContainerRef.current = el;
                        if (el !== lastBroadcastVideoRefEl.current) {
                            lastBroadcastVideoRefEl.current = el;
                            setBroadcastVideoRef(el);
                        }
                        if (viewerVideoRefRef.current) {
                            if (el !== lastViewerVideoRefEl.current) {
                                lastViewerVideoRefEl.current = el;
                                viewerVideoRefRef.current(el);
                            }
                        }
                    }}
                    className={`video-surface-container absolute z-10 w-full h-full object-cover transition-all duration-500 bg-black
                    ${(isCameraOff) ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
                    ${selectedBackground && selectedBackground.type !== 'none' ? 'opacity-90 mix-blend-screen bg-transparent' : ''}
                    inset-0`}
                    style={{ 
                        filter: activeFilterClass,
                        transform: `scale(${zoomLevel || 1}) scaleX(-1) ${isFlipped ? 'scaleX(-1)' : ''}`,
                        pointerEvents: 'none',
                        zIndex: 10,
                        position: 'absolute',
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    {/* Manual preview video element for initial setup phase */}
                    <video 
                        ref={localVideoRef}
                        muted={true}
                        autoPlay
                        playsInline
                        webkit-playsinline="true"
                        preload="metadata"
                        className={`w-full h-full object-cover ${liveStep === 'broadcasting' ? 'hidden' : 'block'}`}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        onError={(e) => console.error("Local preview error:", e.currentTarget.error)}
                    />
                    {renderEffectsAndMasks()}
                </div>
            ) : (
                <div 
                    id={activeContainerId}
                    ref={(el) => {
                        if (!el) return;
                        mainContainerRef.current = el;
                        if (viewerVideoRefRef.current) {
                            if (el !== lastViewerVideoRefEl.current) {
                                lastViewerVideoRefEl.current = el;
                                viewerVideoRefRef.current(el);
                            }
                        }
                    }}
                    className={`video-surface-container absolute z-10 w-full h-full object-cover transition-all duration-500 bg-black
                    ${(isCameraOff) ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
                    ${selectedBackground && selectedBackground.type !== 'none' ? 'opacity-90 mix-blend-screen bg-transparent' : ''}
                    inset-0`}
                    style={{ 
                        filter: activeFilterClass,
                        transform: `scale(${zoomLevel || 1}) ${isFlipped ? 'scaleX(-1)' : ''}`,
                        backgroundImage: (activeStreamSource?.type === 'background' && activeStreamSource?.url) ? `url(${activeStreamSource.url})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        pointerEvents: 'none',
                        zIndex: 10,
                        position: 'absolute',
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    {renderEffectsAndMasks()}
                </div>
            )}
            
            {/* Restored Watermark Component inside the full container bounds */}
            {!isCleanView && (
                <div className="absolute inset-0 pointer-events-none z-20">
                    <WatermarkOverlay userName={userName || streamId || 'hisee_user'} />
                </div>
            )}

            {/* Central Play/Pause Button */}
            <AnimatePresence>
                {showPlayButton && !isCleanView && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center z-40"
                    >
                        <button 
                            onClick={handlePlayPauseClick}
                            className="w-24 h-24 flex items-center justify-center text-white transition-all active:scale-90"
                        >
                            {isManuallyPaused ? (
                                <Play size={50} strokeWidth={1.5} className="ml-1 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                            ) : (
                                <Pause size={50} strokeWidth={1.5} className="drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Heart Animations */}
            {!isCleanView && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                    <AnimatePresence>
                        {hearts.map(heart => (
                            <motion.div
                                key={heart.id}
                                initial={{ opacity: 0, scale: 0, x: heart.x - 40, y: heart.y - 40 }}
                                animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1.2, 1], y: heart.y - 150 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute text-rose-500"
                            >
                                <Heart size={80} fill="currentColor" className="drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Sidebar Buttons (Right Side) - Safely isolated from video state */}
            {isUiVisible && !isCleanView && (
                <div className="absolute right-2 sm:right-4 bottom-24 sm:bottom-32 z-[60] flex flex-col items-center gap-6 pointer-events-auto">
                    <StarButton 
                        targetId={roomId || videoId || streamId || "default"} 
                        creatorId={authorUid || streamId || ""} 
                        isLive={!!roomId}
                    />
                </div>
            )}

            {/* Global style for animations and strict video confinement */}
            <style>{`
                .video-surface-container video {
                    filter: inherit !important;
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                    image-rendering: high-quality;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                }
                @keyframes float-up {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
                }
                .animate-float-up {
                    animation: float-up 5s linear infinite;
                }
            `}</style>
        </div>
    );
}));
