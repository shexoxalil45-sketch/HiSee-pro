import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';

interface GiftOverlayProps {
    videoUrl: string | null;
    onEnded: () => void;
}

export const GiftVideoOverlay: React.FC<GiftOverlayProps> = React.memo(({ videoUrl, onEnded }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let isMounted = true;
        let playPromise: Promise<void> | null = null;

        const startPlayback = async () => {
            if (!videoUrl || !videoRef.current) return;

            try {
                // Force reload to pick up new source tags
                videoRef.current.load();
                
                // Wait for a tiny bit to let the load request settle
                await new Promise(resolve => setTimeout(resolve, 50));
                
                if (!isMounted || !videoRef.current) return;

                playPromise = videoRef.current.play();
                if (playPromise !== null) {
                    await playPromise;
                }
            } catch (err: any) {
                // Ignore AbortError as it's expected when we interrupt or unmount
                if (err.name !== 'AbortError') {
                    console.error("Video playback failed:", err);
                    if (isMounted) {
                        onEnded();
                    }
                }
            }
        };

        startPlayback();

        return () => {
            isMounted = false;
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = "";
                videoRef.current.load();
            }
        };
    }, [videoUrl, onEnded]);

    const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const video = e.currentTarget;
        console.error("Video Error Details:", {
            error: video.error,
            networkState: video.networkState,
            readyState: video.readyState,
            src: video.currentSrc
        });
        
        if (video.getAttribute('crossOrigin')) {
            console.log("Retrying gift video load without crossOrigin attribute:", videoUrl);
            video.removeAttribute('crossOrigin');
            video.load();
            video.play().catch(err => console.warn("Retry auto-play failed for gift video:", err));
            return;
        }

        // Generic retry once
        if (video.readyState === 0 && !(video as any)._hasRetried) {
            console.log("Generic retry for gift video:", videoUrl);
            (video as any)._hasRetried = true;
            video.load();
            video.play().catch(err => console.warn("Generic retry auto-play failed for gift video:", err));
            return;
        }
        
        onEnded();
    };

    return (
        <AnimatePresence>
            {videoUrl && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
                >
                        <video
                        ref={videoRef}
                        src={normalizeMediaUrl(videoUrl)}
                        className="w-full h-full object-contain"
                        playsInline
                        webkit-playsinline="true"
                        preload="metadata"
                        muted={false}
                        onEnded={onEnded}
                        onError={handleError}
                        // Ensure transparency support for .webm
                        style={{ mixBlendMode: 'screen' }} // 'screen' is often better for black backgrounds to simulate transparency
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default GiftVideoOverlay;
