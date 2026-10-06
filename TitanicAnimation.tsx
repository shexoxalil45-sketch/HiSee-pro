import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart } from 'lucide-react';

interface Props {
    onComplete: () => void;
}

const SmokeParticle = ({ delay, x }: { delay: number; x: number }) => (
    <motion.div
        initial={{ y: 0, x: 0, opacity: 0, scale: 0.5 }}
        animate={{ 
            y: -150, 
            x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
            opacity: [0, 0.6, 0],
            scale: [0.5, 2, 3]
        }}
        transition={{ 
            duration: 4, 
            repeat: Infinity, 
            delay,
            ease: "easeOut"
        }}
        className="absolute w-6 h-6 bg-gray-400/40 rounded-full blur-md"
        style={{ left: x, top: 0 }}
    />
);

const TitanicAnimation: React.FC<Props> = ({ onComplete }) => {
    const onCompleteRef = React.useRef(onComplete);
    const [showHearts, setShowHearts] = useState(false);
    
    const audioRefs = React.useRef<HTMLAudioElement[]>([]);
    
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const playHorn = () => {
            const audio = new Audio('https://www.soundjay.com/transportation/sounds/ship-horn-1.mp3');
            audio.volume = 0.6;
            audio.play().catch(() => {});
            audioRefs.current.push(audio);
        };

        const t1 = setTimeout(playHorn, 500);
        const t2 = setTimeout(playHorn, 2000);
        
        // Trigger hearts when sinking starts (around 4s)
        const tHearts = setTimeout(() => setShowHearts(true), 4000);

        const t3 = setTimeout(() => {
            onCompleteRef.current();
        }, 8000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(tHearts);
            
            // Stop all active horns immediately to prevent background battery drain
            audioRefs.current.forEach(audio => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (e) {}
            });
            audioRefs.current = [];
        };
    }, []);

    return (
        <div 
            className="fixed inset-0 z-[10000] bg-slate-950 overflow-hidden flex items-center justify-center"
            onClick={() => onCompleteRef.current()}
        >
            {/* Close Button */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onCompleteRef.current();
                }}
                className="absolute top-6 right-6 z-[1000001] flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all shadow-lg border border-white/20"
            >
                <X size={24} />
                <span className="text-xs font-bold uppercase tracking-widest">إغلاق</span>
            </button>

            {/* Night Sky */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(40)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white rounded-full"
                        style={{
                            width: Math.random() * 2 + 1,
                            height: Math.random() * 2 + 1,
                            top: `${Math.random() * 60}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 2 + Math.random() * 3, repeat: Infinity }}
                    />
                ))}
            </div>

            {/* Ship Container */}
            <motion.div
                initial={{ scale: 0.5, y: '10vh', opacity: 1 }}
                animate={{ 
                    scale: [0.5, 1.2, 1.4],
                    y: ['10vh', '0vh', '20vh'],
                    opacity: [1, 1, 1, 0],
                    rotate: [0, 5, 20]
                }}
                transition={{ 
                    duration: 7,
                    times: [0, 0.2, 0.8, 1],
                    ease: "easeInOut"
                }}
                onAnimationComplete={onComplete}
                className="relative z-50 pointer-events-none flex flex-col items-center max-w-[90vw] max-h-[90vh] object-contain"
            >
                <div className="relative w-[85vw] h-[41vw] sm:w-[450px] sm:h-[220px] max-w-[90vw] max-h-[90vh] object-contain">
                    {/* Smoke from Funnels */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                        {[35.5, 48.8, 62.2, 75.5].map((xPct, i) => (
                            <div key={i} className="absolute animate-pulse" style={{ left: `${xPct}%`, top: '9.1%' }}>
                                <SmokeParticle delay={i * 0.5} x={0} />
                                <SmokeParticle delay={i * 0.5 + 1.5} x={0} />
                            </div>
                        ))}
                    </div>

                    {/* Titanic Ship SVG */}
                    <svg viewBox="0 0 450 220" className="drop-shadow-[0_35px_35px_rgba(0,0,0,0.6)] relative z-10 w-full h-full max-w-[90vw] max-h-[90vh] object-contain">
                        {/* Hull */}
                        <path d="M 30 160 L 420 160 L 400 120 L 50 120 Z" fill="#1a1a1a" />
                        {/* Deck */}
                        <rect x="50" y="115" width="350" height="6" fill="#a0522d" />
                        {/* Superstructure */}
                        <rect x="70" y="90" width="310" height="25" fill="#f8f9fa" />
                        <rect x="110" y="65" width="230" height="25" fill="#f8f9fa" />
                        {/* Funnels */}
                        {[160, 220, 280, 340].map((x, i) => (
                            <g key={i} transform="skewX(-8)">
                                <rect x={x - 18} y="20" width="36" height="45" fill="#e67e22" />
                                <rect x={x - 18} y="15" width="36" height="6" fill="#000" />
                            </g>
                        ))}
                        {/* Windows */}
                        {[...Array(15)].map((_, i) => (
                            <rect key={i} x={85 + i * 20} y="98" width="5" height="5" fill="#3498db" rx="1" />
                        ))}

                        {/* Foam / Wake around Hull */}
                        <motion.g
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <path d="M 20 165 Q 225 180 430 165" fill="none" stroke="white" strokeWidth="3" strokeDasharray="10 5" opacity="0.3" />
                            <path d="M 40 162 Q 225 175 410 162" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5 10" opacity="0.2" />
                        </motion.g>
                    </svg>

                    {/* Text Overlay on Hull */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="absolute top-[58%] left-0 right-0 text-center pointer-events-none z-20"
                    >
                        <h2 className="text-white text-base sm:text-2xl font-black uppercase tracking-[0.3em] drop-shadow-lg">Titanic</h2>
                        <p className="text-blue-300 text-[5px] sm:text-[7px] font-bold tracking-[0.1em] mt-0.5 uppercase opacity-90">The Unsinkable Legend</p>
                    </motion.div>

                    {/* Sinking Hearts Animation */}
                    <AnimatePresence>
                        {showHearts && (
                            <div className="absolute inset-0 z-[100] pointer-events-none">
                                {/* Small Hearts */}
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ y: '72%', x: `${33.3 + Math.random() * 33.3}%`, opacity: 0, scale: 0 }}
                                        style={{ position: 'absolute' }}
                                        animate={{ 
                                            y: `-${90 + Math.random() * 90}%`, 
                                            x: `${33.3 + Math.random() * 33.3 + (Math.random() * 20 - 10)}%`,
                                            opacity: [0, 1, 0],
                                            scale: [0, 1, 0.5],
                                            rotate: [0, Math.random() * 360]
                                        }}
                                        transition={{ duration: 1.5 + Math.random() * 1, ease: "easeOut" }}
                                        className="absolute text-rose-500"
                                    >
                                        <Heart size={16} fill="currentColor" />
                                    </motion.div>
                                ))}

                                {/* Jack Heart */}
                                <motion.div
                                    initial={{ y: '72%', x: '40%', opacity: 0, scale: 0 }}
                                    style={{ position: 'absolute' }}
                                    animate={{ 
                                        y: '-136%', 
                                        x: '22%',
                                        opacity: [0, 1, 0],
                                        scale: [0, 2.5, 1.5],
                                        rotate: -15
                                    }}
                                    transition={{ duration: 2.5, ease: "easeOut" }}
                                    className="absolute flex flex-col items-center"
                                >
                                    <div className="relative">
                                        <Heart size={48} className="text-rose-600 drop-shadow-[0_0_15px_rgba(225,29,72,0.8)]" fill="currentColor" />
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-tighter">Jack</span>
                                    </div>
                                </motion.div>

                                {/* Rose Heart */}
                                <motion.div
                                    initial={{ y: '72%', x: '60%', opacity: 0, scale: 0 }}
                                    style={{ position: 'absolute' }}
                                    animate={{ 
                                        y: '-159%', 
                                        x: '77%',
                                        opacity: [0, 1, 0],
                                        scale: [0, 2.5, 1.5],
                                        rotate: 15
                                    }}
                                    transition={{ duration: 2.8, ease: "easeOut", delay: 0.5 }}
                                    className="absolute flex flex-col items-center"
                                >
                                    <div className="relative">
                                        <Heart size={48} className="text-rose-600 drop-shadow-[0_0_15px_rgba(225,29,72,0.8)]" fill="currentColor" />
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-tighter">Rose</span>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default React.memo(TitanicAnimation);
