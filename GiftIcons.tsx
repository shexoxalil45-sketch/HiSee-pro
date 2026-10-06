import React from 'react';
import { motion } from 'motion/react';
import ModernHSLogo from './ModernHSLogo';

// Gift Icons Collection
export const AnimatedOctopus = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        {/* Legs - Waving */}
        {[...Array(4)].map((_, i) => (
            <motion.path
                key={`leg-l-${i}`}
                d={`M100,120 Q${60 - i * 15},${160 + i * 10} ${40 - i * 20},${140 + i * 20}`}
                stroke="#9333ea" strokeWidth="12" fill="none" strokeLinecap="round"
                animate={{ d: [`M100,120 Q${60 - i * 15},${160 + i * 10} ${40 - i * 20},${140 + i * 20}`, `M100,120 Q${50 - i * 15},${140 + i * 10} ${30 - i * 20},${120 + i * 20}`, `M100,120 Q${60 - i * 15},${160 + i * 10} ${40 - i * 20},${140 + i * 20}`] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
        ))}
        {[...Array(4)].map((_, i) => (
            <motion.path
                key={`leg-r-${i}`}
                d={`M100,120 Q${140 + i * 15},${160 + i * 10} ${160 + i * 20},${140 + i * 20}`}
                stroke="#9333ea" strokeWidth="12" fill="none" strokeLinecap="round"
                animate={{ d: [`M100,120 Q${140 + i * 15},${160 + i * 10} ${160 + i * 20},${140 + i * 20}`, `M100,120 Q${150 + i * 15},${140 + i * 10} ${170 + i * 20},${120 + i * 20}`, `M100,120 Q${140 + i * 15},${160 + i * 10} ${160 + i * 20},${140 + i * 20}`] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
        ))}
        
        {/* Head - Bobbing */}
        <motion.ellipse 
            cx="100" cy="90" rx="50" ry="60" fill="#a855f7"
            animate={{ ry: [60, 58, 60], cy: [90, 92, 90] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Eyes - Blinking */}
        <motion.g animate={{ y: [0, 2, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <circle cx="80" cy="80" r="12" fill="white" />
            <motion.circle cx="80" cy="80" r="4" fill="black" animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 1] }} />
            
            <circle cx="120" cy="80" r="12" fill="white" />
            <motion.circle cx="120" cy="80" r="4" fill="black" animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 1] }} />
        </motion.g>

        {/* Mouth - O shape */}
        <motion.circle 
            cx="100" cy="110" r="6" fill="black" opacity="0.6"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
        />
    </svg>
);

export const AnimatedShark = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ y: [-5, 5, -5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            {/* Tail - Swinging */}
            <motion.path
                d="M160,100 Q180,80 190,60 L190,140 Q180,120 160,100"
                fill="#64748b"
                style={{ originX: 0, originY: 0.5 }}
                animate={{ rotate: [-15, 15, -15] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Body */}
            <path d="M20,100 Q60,60 160,100 Q60,140 20,100" fill="#94a3b8" />
            
            {/* Dorsal Fin */}
            <path d="M80,80 L100,40 L120,85" fill="#64748b" />
            
            {/* Pectoral Fin - Moving */}
            <motion.path 
                d="M90,110 L70,140 L110,120" fill="#64748b" 
                animate={{ rotate: [-10, 10, -10] }}
                style={{ originX: 0.5, originY: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
            />

            {/* Eye */}
            <circle cx="50" cy="90" r="4" fill="black" />
            <motion.path d="M45,85 L55,88" stroke="black" strokeWidth="2" /> {/* Angry brow */}

            {/* Jaw/Mouth - Chomp */}
            <motion.path
                d="M30,110 Q50,115 70,110"
                stroke="black" strokeWidth="3" fill="none"
                animate={{ d: ["M30,110 Q50,115 70,110", "M30,110 Q50,125 70,110", "M30,110 Q50,115 70,110"] }}
                transition={{ duration: 0.8, repeat: Infinity }}
            />
            {/* Teeth */}
            <path d="M35,110 L40,115 L45,110 M50,110 L55,115 L60,110" stroke="white" strokeWidth="2" fill="none" />
        </motion.g>
    </svg>
);

export const AnimatedWhale = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            {/* Tail - Flapping */}
            <motion.path
                d="M160,100 Q180,70 190,50 L190,150 Q180,130 160,100"
                fill="#1e3a8a"
                style={{ originX: 0, originY: 0.5 }} // Pivot at connection
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Body */}
            <path d="M20,110 Q20,60 100,60 Q180,60 160,100 Q140,150 80,150 Q20,150 20,110" fill="#3b82f6" />
            <path d="M20,110 Q50,130 160,100" fill="none" stroke="#1e3a8a" strokeWidth="2" opacity="0.3" /> {/* Belly line */}

            {/* Eye - Blinking */}
            <circle cx="50" cy="95" r="6" fill="white" />
            <motion.circle 
                cx="50" cy="95" r="3" fill="black"
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.95, 1] }}
            />

            {/* Mouth - Smile */}
            <path d="M40,120 Q60,130 80,120" stroke="#1e3a8a" strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* Spout - Spraying */}
            <motion.g animate={{ opacity: [0, 1, 0], y: [0, -20, -30] }} transition={{ duration: 2, repeat: Infinity }}>
                <circle cx="90" cy="50" r="3" fill="#bae6fd" />
                <circle cx="100" cy="45" r="4" fill="#bae6fd" />
                <circle cx="80" cy="45" r="4" fill="#bae6fd" />
            </motion.g>
            
            {/* Fin */}
            <motion.path 
                d="M100,110 L80,140 L120,120" fill="#1e3a8a"
                animate={{ rotate: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </motion.g>
    </svg>
);

export const AnimatedSeal = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        {/* Body - Bouncing */}
        <motion.g 
            animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }} 
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* Tail */}
            <path d="M160,140 L190,130 L190,150 Z" fill="#64748b" />

            {/* Main Body */}
            <ellipse cx="100" cy="120" rx="70" ry="40" fill="#94a3b8" />
            
            {/* Head Group */}
            <motion.g animate={{ rotate: [-5, 5, -5] }} style={{ originX: 0.8, originY: 0.8 }} transition={{ duration: 1.5, repeat: Infinity }}>
                <circle cx="50" cy="90" r="35" fill="#94a3b8" />
                {/* Snout */}
                <ellipse cx="40" cy="95" rx="15" ry="10" fill="#cbd5e1" />
                <circle cx="35" cy="92" r="2" fill="black" /> {/* Nose */}
                
                {/* Eyes */}
                <circle cx="45" cy="80" r="4" fill="black" />
                <circle cx="65" cy="80" r="4" fill="black" />
                
                {/* Whiskers */}
                <path d="M30,95 L10,90 M30,98 L10,100 M30,101 L10,110" stroke="black" strokeWidth="1" opacity="0.5" />
            </motion.g>

            {/* Front Flipper - Clapping */}
            <motion.path 
                d="M90,130 Q80,160 110,150" 
                stroke="#64748b" strokeWidth="15" strokeLinecap="round" fill="none"
                animate={{ rotate: [0, -20, 0] }}
                style={{ originX: 0, originY: 0 }}
                transition={{ duration: 0.5, repeat: Infinity }}
            />
        </motion.g>
        {/* Ball (Optional playfulness) */}
        <motion.circle 
            cx="50" cy="40" r="15" fill="#ef4444"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
        />
    </svg>
);

export const AnimatedFish = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ x: [-10, 10, -10] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            {/* Tail - Fast Wiggle */}
            <motion.path
                d="M140,100 L170,70 L170,130 Z"
                fill="#f59e0b"
                style={{ originX: 0, originY: 0.5 }}
                animate={{ rotate: [-20, 20, -20] }}
                transition={{ duration: 0.2, repeat: Infinity }}
            />
            
            {/* Body */}
            <ellipse cx="90" cy="100" rx="60" ry="40" fill="#fbbf24" />
            
            {/* Fins */}
            <motion.path 
                d="M90,60 L110,40 L70,40 Z" fill="#f59e0b" 
                animate={{ rotate: [-10, 10, -10] }}
                style={{ originX: 0.5, originY: 1 }}
                transition={{ duration: 0.5, repeat: Infinity }}
            />
            <path d="M90,140 L110,160 L70,160 Z" fill="#f59e0b" />

            {/* Eye */}
            <circle cx="50" cy="90" r="8" fill="white" />
            <circle cx="50" cy="90" r="4" fill="black" />
            
            {/* Mouth - Bubble blowing */}
            <motion.circle 
                cx="30" cy="110" r="3" fill="none" stroke="black" strokeWidth="2"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
            />
        </motion.g>
    </svg>
);

export const AnimatedDolphin = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ y: [0, -30, 0], rotate: [-10, 10, -10] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            {/* Body */}
            <path d="M40,100 Q60,50 120,60 Q180,70 160,120 Q120,140 80,130 Q40,120 40,100" fill="#0ea5e9" />
            {/* Tail */}
            <motion.path d="M160,120 L190,110 L190,130 Z" fill="#0284c7" animate={{ rotate: [-15, 15, -15] }} style={{ originX: 0, originY: 0.5 }} transition={{ duration: 0.5, repeat: Infinity }} />
            {/* Fin */}
            <path d="M100,60 L90,30 L120,55 Z" fill="#0284c7" />
            {/* Eye */}
            <circle cx="60" cy="90" r="4" fill="black" />
            {/* Smile */}
            <path d="M40,105 Q50,110 60,105" stroke="#0284c7" strokeWidth="2" fill="none" />
        </motion.g>
    </svg>
);

export const AnimatedDragon = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-2xl ${className}`}>
        <defs>
            <linearGradient id="dragonScaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>
            <radialGradient id="dragonEyeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>
            <filter id="dragonFireGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        <motion.g 
            animate={{ 
                y: [-8, 8, -8],
                rotate: [-1, 1, -1]
            }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* Wing Membranes - Back */}
            <motion.path 
                d="M100,80 Q160,20 190,70 L140,110 Q120,100 100,80" 
                fill="#7f1d1d" opacity="0.6"
                animate={{ rotateY: [0, 45, 0] }}
                style={{ originX: "100px", originY: "80px" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path 
                d="M100,80 Q40,20 10,70 L60,110 Q80,100 100,80" 
                fill="#7f1d1d" opacity="0.6"
                animate={{ rotateY: [0, -45, 0] }}
                style={{ originX: "100px", originY: "80px" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Serpentine Body */}
            <motion.path
                d="M100,140 Q130,160 100,180 Q70,200 100,220"
                stroke="url(#dragonScaleGradient)"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                animate={{ 
                    d: [
                        "M100,140 Q130,160 100,180 Q70,200 100,220",
                        "M100,140 Q70,160 100,180 Q130,200 100,220",
                        "M100,140 Q130,160 100,180 Q70,200 100,220"
                    ]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Main Torso */}
            <path 
                d="M85,80 Q100,150 115,80 Q100,40 85,80" 
                fill="url(#dragonScaleGradient)" 
            />
            
            {/* Spikes on Back */}
            {[...Array(5)].map((_, i) => (
                <path 
                    key={`spike-${i}`}
                    d={`M${95 + (i-2)*4},${100 + i*10} L100,${105 + i*10} L${105 + (i-2)*4},${100 + i*10} Z`}
                    fill="#450a0a"
                />
            ))}

            {/* Wing Membranes - Front (More detailed) */}
            <motion.g
                animate={{ rotateX: [-10, 20, -10] }}
                style={{ originX: "100px", originY: "80px" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* Right Wing */}
                <path d="M110,80 L180,40 L160,90 L110,85 Z" fill="#991b1b" />
                <path d="M110,80 L180,40" stroke="#450a0a" strokeWidth="2" />
                <path d="M110,80 L160,90" stroke="#450a0a" strokeWidth="1.5" />
                
                {/* Left Wing */}
                <path d="M90,80 L20,40 L40,90 L90,85 Z" fill="#991b1b" />
                <path d="M90,80 L20,40" stroke="#450a0a" strokeWidth="2" />
                <path d="M90,80 L40,90" stroke="#450a0a" strokeWidth="1.5" />
            </motion.g>

            {/* Head */}
            <motion.g
                animate={{ rotate: [-2, 2, -2] }}
                style={{ originX: "100px", originY: "60px" }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* Neck */}
                <path d="M95,80 Q100,60 100,45" stroke="url(#dragonScaleGradient)" strokeWidth="12" fill="none" />
                
                {/* Skull */}
                <path d="M85,40 Q100,20 115,40 L110,55 Q100,60 90,55 Z" fill="url(#dragonScaleGradient)" />
                
                {/* Horns */}
                <path d="M90,30 L80,15 L95,25 Z" fill="#1f2937" />
                <path d="M110,30 L120,15 L105,25 Z" fill="#1f2937" />
                
                {/* Eyes Glow */}
                <circle cx="93" cy="40" r="3" fill="#fbbf24" />
                <circle cx="93" cy="40" r="6" fill="url(#dragonEyeGlow)" />
                <circle cx="107" cy="40" r="3" fill="#fbbf24" />
                <circle cx="107" cy="40" r="6" fill="url(#dragonEyeGlow)" />

                {/* Snout */}
                <path d="M95,50 L105,50 L103,58 L97,58 Z" fill="#450a0a" />

                {/* Fire Breath Effect */}
                <motion.g 
                    filter="url(#dragonFireGlow)"
                    animate={{ 
                        opacity: [0, 1, 0.8, 0],
                        scale: [0.5, 1.2, 1.5, 1.8],
                        y: [0, 10, 25, 40]
                    }} 
                    transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.2, 0.5, 1] }}
                >
                    <path d="M100,55 L90,80 L110,80 Z" fill="#f97316" />
                    <path d="M100,55 L95,70 L105,70 Z" fill="#fbbf24" />
                    <circle cx="100" cy="75" r="8" fill="#ef4444" opacity="0.6" />
                </motion.g>
            </motion.g>
        </motion.g>
    </svg>
);

export const AnimatedPhoenix = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ y: [-5, 5, -5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            {/* Wings - Glowing Flap */}
            <motion.path 
                d="M100,100 Q20,50 10,100 L100,140" fill="#f97316" opacity="0.8"
                animate={{ d: ["M100,100 Q20,50 10,100 L100,140", "M100,100 Q20,150 10,120 L100,140", "M100,100 Q20,50 10,100 L100,140"] }}
                transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.path 
                d="M100,100 Q180,50 190,100 L100,140" fill="#f97316" opacity="0.8"
                animate={{ d: ["M100,100 Q180,50 190,100 L100,140", "M100,100 Q180,150 190,120 L100,140", "M100,100 Q180,50 190,100 L100,140"] }}
                transition={{ duration: 1, repeat: Infinity }}
            />
            
            {/* Body */}
            <ellipse cx="100" cy="100" rx="20" ry="40" fill="#fbbf24" />
            {/* Head */}
            <circle cx="100" cy="60" r="15" fill="#fbbf24" />
            
            {/* Glow Effect */}
            <motion.circle cx="100" cy="100" r="50" fill="url(#glowGradient)" animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <defs>
                <radialGradient id="glowGradient">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
            </defs>
        </motion.g>
    </svg>
);

export const AnimatedCastle = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <path d="M40,180 L40,100 L60,100 L60,180 Z" fill="#94a3b8" /> {/* Left Tower */}
        <path d="M140,180 L140,100 L160,100 L160,180 Z" fill="#94a3b8" /> {/* Right Tower */}
        <path d="M60,140 L140,140 L140,180 L60,180 Z" fill="#64748b" /> {/* Main Wall */}
        <path d="M80,140 L80,80 L120,80 L120,140 Z" fill="#cbd5e1" /> {/* Keep */}
        <path d="M80,80 L100,50 L120,80 Z" fill="#ef4444" /> {/* Roof */}
        
        {/* Flag */}
        <motion.path 
            d="M100,50 L100,20 L130,30 L100,40" fill="#facc15" 
            animate={{ d: ["M100,50 L100,20 L130,30 L100,40", "M100,50 L100,20 L130,25 L100,40", "M100,50 L100,20 L130,30 L100,40"] }}
            transition={{ duration: 1, repeat: Infinity }}
        />
        
        {/* Gate */}
        <path d="M90,180 L90,150 Q100,140 110,150 L110,180 Z" fill="#475569" />
    </svg>
);

export const AnimatedEagle = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ y: [-10, 10, -10] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            {/* Wings */}
            <motion.path 
                d="M100,100 L20,60 L40,120 Z" fill="#78350f" 
                animate={{ rotate: [-20, 20, -20] }} style={{ originX: 1, originY: 0.5 }}
                transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.path 
                d="M100,100 L180,60 L160,120 Z" fill="#78350f" 
                animate={{ rotate: [20, -20, 20] }} style={{ originX: 0, originY: 0.5 }}
                transition={{ duration: 0.8, repeat: Infinity }}
            />
            {/* Body */}
            <ellipse cx="100" cy="100" rx="15" ry="30" fill="#92400e" />
            {/* Head */}
            <circle cx="100" cy="70" r="12" fill="white" />
            <path d="M100,75 L110,70 L100,65 Z" fill="#facc15" /> {/* Beak */}
        </motion.g>
    </svg>
);

export const AnimatedTiger = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            {/* Head Base */}
            <circle cx="100" cy="100" r="60" fill="#f97316" />
            <path d="M40,100 L160,100" stroke="black" strokeWidth="2" opacity="0.2" /> {/* Whiskers guide */}
            
            {/* Stripes */}
            <path d="M100,40 L90,60 L110,60 Z" fill="black" />
            <path d="M50,80 L70,90 L50,100 Z" fill="black" />
            <path d="M150,80 L130,90 L150,100 Z" fill="black" />
            
            {/* Eyes */}
            <ellipse cx="80" cy="90" rx="8" ry="6" fill="white" />
            <circle cx="80" cy="90" r="3" fill="black" />
            <ellipse cx="120" cy="90" rx="8" ry="6" fill="white" />
            <circle cx="120" cy="90" r="3" fill="black" />
            
            {/* Mouth */}
            <path d="M90,120 Q100,130 110,120" stroke="black" strokeWidth="3" fill="none" />
            <motion.path 
                d="M95,125 L105,125" stroke="red" strokeWidth="4" 
                animate={{ d: ["M95,125 L105,125", "M95,135 L105,135", "M95,125 L105,125"] }}
                transition={{ duration: 0.5, repeat: Infinity }}
            />
        </motion.g>
    </svg>
);

export const AnimatedButterfly = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ y: [-10, 10, -10] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            {/* Left Wing */}
            <motion.path 
                d="M100,100 Q40,40 40,100 Q40,160 100,100" fill="#d8b4fe" stroke="#a855f7" strokeWidth="2"
                animate={{ scaleX: [1, 0.2, 1] }} style={{ originX: 1 }}
                transition={{ duration: 0.4, repeat: Infinity }}
            />
            {/* Right Wing */}
            <motion.path 
                d="M100,100 Q160,40 160,100 Q160,160 100,100" fill="#d8b4fe" stroke="#a855f7" strokeWidth="2"
                animate={{ scaleX: [1, 0.2, 1] }} style={{ originX: 0 }}
                transition={{ duration: 0.4, repeat: Infinity }}
            />
            {/* Body */}
            <ellipse cx="100" cy="100" rx="5" ry="30" fill="#4b5563" />
        </motion.g>
    </svg>
);

export const AnimatedPenguin = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ rotate: [-5, 5, -5] }} style={{ originX: 0.5, originY: 1 }} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}>
            {/* Body */}
            <ellipse cx="100" cy="100" rx="50" ry="70" fill="#1e293b" />
            <ellipse cx="100" cy="110" rx="35" ry="50" fill="white" />
            {/* Eyes */}
            <circle cx="85" cy="70" r="5" fill="white" />
            <circle cx="85" cy="70" r="2" fill="black" />
            <circle cx="115" cy="70" r="5" fill="white" />
            <circle cx="115" cy="70" r="2" fill="black" />
            {/* Beak */}
            <path d="M95,80 L105,80 L100,90 Z" fill="#f97316" />
            {/* Feet */}
            <path d="M70,160 L90,160 L80,170 Z" fill="#f97316" />
            <path d="M110,160 L130,160 L120,170 Z" fill="#f97316" />
        </motion.g>
    </svg>
);

export const AnimatedCar = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={`drop-shadow-lg ${className}`}>
        <motion.g animate={{ x: [-2, 2, -2], y: [-1, 1, -1] }} transition={{ duration: 0.2, repeat: Infinity }}>
            {/* Car Body */}
            <path d="M40,120 L40,100 L60,80 L140,80 L160,100 L160,120 Z" fill="#ef4444" />
            <rect x="40" y="100" width="120" height="30" fill="#dc2626" />
            {/* Windows */}
            <path d="M65,85 L135,85 L150,100 L50,100 Z" fill="#bae6fd" opacity="0.8" />
            {/* Wheels */}
            <motion.circle cx="60" cy="130" r="15" fill="#1f2937" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            <motion.circle cx="140" cy="130" r="15" fill="#1f2937" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            <circle cx="60" cy="130" r="5" fill="#9ca3af" />
            <circle cx="140" cy="130" r="5" fill="#9ca3af" />
        </motion.g>
    </svg>
);

export const AnimatedCoinMedal = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 300" className={`drop-shadow-lg ${className}`}>
        <defs>
            <radialGradient id="goldGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#854d0e" />
            </radialGradient>
            <path id="circlePath" d="M100,150 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
            <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="black" floodOpacity="0.5"/>
            </filter>
        </defs>
        
        {/* Chain */}
        <motion.path
            d="M100,0 L100,80"
            stroke="#eab308"
            strokeWidth="6"
            fill="none"
            strokeDasharray="10 5"
            animate={{ y: [0, 2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Medal Body - Swinging */}
        <motion.g 
            style={{ originX: 0.5, originY: 0.26 }}
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
             {/* Outer Ring */}
            <circle cx="100" cy="150" r="60" fill="url(#goldGradient)" stroke="#854d0e" strokeWidth="4" />
            
            {/* Inner Coin Design */}
            <circle cx="100" cy="150" r="45" fill="url(#goldGradient)" stroke="#854d0e" strokeWidth="2" />
            
            {/* Circular Text */}
            <text fill="#facc15" fontSize="12" fontWeight="bold" letterSpacing="2" filter="url(#textShadow)">
                <textPath xlinkHref="#circlePath" startOffset="0%">
                    HISEE HISEE HISEE HISEE HISEE
                </textPath>
            </text>
            
            {/* Logo Shape (Simplified HS) */}
            <path d="M85,135 L85,165 M115,135 L115,165 M85,150 L115,150" stroke="#facc15" strokeWidth="6" strokeLinecap="round" />
            
            {/* Stars */}
            <g fill="#facc15" filter="url(#textShadow)">
                <path d="M100,80 L103,88 L111,88 L105,93 L107,101 L100,96 L93,101 L95,93 L89,88 L97,88 Z" />
                <path d="M160,150 L163,158 L171,158 L165,163 L167,171 L160,166 L153,171 L155,163 L149,158 L157,158 Z" />
                <path d="M40,150 L43,158 L51,158 L45,163 L47,171 L40,166 L33,171 L35,163 L29,158 L37,158 Z" />
            </g>
            
            {/* Shine */}
            <motion.circle 
                cx="100" cy="150" r="40" 
                stroke="white" strokeWidth="2" fill="none" opacity="0.3"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </motion.g>
    </svg>
);

export const AnimatedLogoMedal = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 300" className={`drop-shadow-lg ${className}`}>
        {/* Chain */}
        <motion.path
            d="M100,0 L100,80"
            stroke="#fbbf24"
            strokeWidth="6"
            fill="none"
            strokeDasharray="10 5"
            animate={{ y: [0, 2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Medal Body */}
        <motion.g 
            style={{ originX: 0.5, originY: 0.26 }}
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* Outer Ring */}
            <circle cx="100" cy="150" r="60" fill="#1e293b" stroke="#fbbf24" strokeWidth="8" />
            
            {/* Inner Logo Design (HS) */}
            <circle cx="100" cy="150" r="45" fill="#090d14" />
            
            {/* Final Harmonized Modern HS Logo */}
            <g transform="translate(68, 118)">
                <ModernHSLogo size={64} />
            </g>
            
            {/* Shine */}
            <motion.path
                d="M70,120 L130,180"
                stroke="white"
                strokeWidth="10"
                strokeOpacity="0.2"
                animate={{ x: [-50, 50, -50], opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </motion.g>
    </svg>
);


