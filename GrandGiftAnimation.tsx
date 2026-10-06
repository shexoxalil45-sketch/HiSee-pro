import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface Props {
    gift: any;
}

const GrandGiftAnimation: React.FC<Props> = ({ gift }) => {
    useEffect(() => {
        // Play an extra grand magical sound effect for all gifts
        const audio = new Audio('https://www.soundjay.com/misc/sounds/magic-chime-01.mp3');
        audio.volume = 0.7;
        audio.play().catch(() => {});
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[2000] flex items-center justify-center pointer-events-none overflow-hidden"
        >
            {/* Dark overlay to make the gift pop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                className="absolute inset-0 bg-black"
            />

            {/* Rotating Light Rays */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-[150vw] h-[150vw] opacity-40"
                style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,215,0,0.4) 45deg, transparent 90deg, rgba(255,215,0,0.4) 135deg, transparent 180deg, rgba(255,215,0,0.4) 225deg, transparent 270deg, rgba(255,215,0,0.4) 315deg, transparent 360deg)'
                }}
            />

            {/* Pulsing Glow behind the gift */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 0.9, 0.6]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-96 h-96 bg-yellow-400/50 rounded-full blur-[80px]"
            />
            
            {/* The Gift Icon - Massive and Floating */}
            <motion.div 
                initial={{ y: 100, scale: 0, rotate: -15 }}
                animate={{ y: [0, -30, 0], scale: [0, 2.5, 3, 2.5], rotate: [-15, 0, 5, 0] }}
                transition={{ 
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 1.5, ease: "easeOut" },
                    rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="text-[10rem] drop-shadow-[0_0_60px_rgba(255,255,255,1)] relative z-10"
            >
                {gift.icon}
            </motion.div>

            {/* Explosive Particles */}
            {[...Array(40)].map((_, i) => {
                const angle = (i / 40) * Math.PI * 2;
                const distance = 200 + Math.random() * 300;
                return (
                    <motion.div
                        key={i}
                        initial={{ 
                            opacity: 1, 
                            x: 0, 
                            y: 0,
                            scale: 0
                        }}
                        animate={{ 
                            opacity: [1, 1, 0],
                            x: Math.cos(angle) * distance,
                            y: Math.sin(angle) * distance,
                            scale: [0, Math.random() * 2 + 1, 0]
                        }}
                        transition={{ 
                            duration: 1.5 + Math.random() * 1.5,
                            repeat: Infinity,
                            delay: Math.random() * 0.5,
                            ease: "easeOut"
                        }}
                        className="absolute w-4 h-4 bg-white rounded-full blur-[2px]"
                        style={{
                            boxShadow: '0 0 15px 4px rgba(255, 215, 0, 0.9)'
                        }}
                    />
                );
            })}
        </motion.div>
    );
};

export default React.memo(GrandGiftAnimation);
