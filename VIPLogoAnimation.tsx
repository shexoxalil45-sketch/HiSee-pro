
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles as SparklesIcon, Stars, Leaf, Sun, X } from 'lucide-react';

interface Props {
    onComplete: () => void;
}

// --- SUB-COMPONENTS MOVED OUTSIDE ---

// Rain Effect Component (Optimized)
const RainEffect = ({ windowSize }: { windowSize: { width: number, height: number } }) => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => ( // Reduced from 50 to 30
            <motion.div
                key={`rain-${i}`}
                initial={{ y: -100, x: Math.random() * windowSize.width }}
                animate={{ y: windowSize.height + 100 }}
                transition={{ 
                    duration: 0.5 + Math.random() * 0.5, 
                    repeat: Infinity, 
                    delay: Math.random() * 2,
                    ease: "linear"
                }}
                className="absolute w-[1px] h-4 bg-blue-400/30 blur-[0.5px]"
            />
        ))}
    </div>
);

// Smiling Heart Component (Animated & Expressive - Flicker Free)
const SmilingHeart = () => (
    <div className="relative flex items-center justify-center preserve-3d">
        {/* Main Heart Layers */}
        {[...Array(3)].map((_, i) => ( // Reduced to 3 layers for maximum stability
            <Heart 
                key={i} 
                size={100} 
                fill="#ff0000" 
                className="absolute text-red-600" 
                style={{ 
                    // Push layers BACK significantly to avoid fighting with the face
                    transform: `translateZ(${-i * 5 - 10}px)`, 
                    opacity: 1,
                    filter: i > 0 ? `brightness(${1 - (i / 3) * 0.4})` : 'none',
                    backfaceVisibility: 'hidden',
                    willChange: 'transform'
                }} 
            />
        ))}
        
        {/* Animated Face - Pushed FORWARD to prevent clipping */}
        <div 
            className="relative z-50 flex flex-col items-center justify-center -mt-4"
            style={{ transform: 'translateZ(20px)' }} // Explicitly move face forward
        >
            {/* Eyes with Moving Pupils */}
            <div className="flex gap-4">
                <div className="relative w-3 h-3 bg-white rounded-full shadow-sm overflow-hidden">
                    <motion.div 
                        animate={{ x: [-1, 1, -1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1 left-1 w-1.5 h-1.5 bg-black rounded-full"
                    />
                </div>
                <div className="relative w-3 h-3 bg-white rounded-full shadow-sm overflow-hidden">
                    <motion.div 
                        animate={{ x: [-1, 1, -1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1 left-1 w-1.5 h-1.5 bg-black rounded-full"
                    />
                </div>
            </div>
            {/* Smiling Mouth Animation */}
            <svg width="30" height="15" viewBox="0 0 40 20" className="mt-2">
                <motion.path 
                    d="M 5 5 Q 20 20 35 5" 
                    animate={{ d: ["M 5 5 Q 20 10 35 5", "M 5 5 Q 20 25 35 5", "M 5 5 Q 20 10 35 5"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    fill="none" 
                    stroke="black" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                />
            </svg>
        </div>

        {/* Pulsing Aura */}
        <motion.div 
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} 
            transition={{ repeat: Infinity, duration: 1.5 }} 
            className="absolute inset-0 border-2 border-red-500 rounded-full"
            style={{ transform: 'translateZ(-20px)' }} // Push aura behind everything
        />
    </div>
);

// Highly Realistic Grass Blade (Optimized)
const LushGrass = ({ delay, height, color, depth, scaleFactor }: { delay: number, height: number, color: string, depth: number, scaleFactor: number }) => (
    <motion.svg 
        viewBox="0 0 20 100" 
        className="origin-bottom"
        style={{ 
            height: height * scaleFactor * depth, 
            width: 20 * scaleFactor * depth,
            opacity: 0.8 + depth * 0.2
        }}
        animate={{ 
            rotate: [0, 6, -3, 8, -2, 0],
            skewX: [0, 2, -1, 3, -1, 0]
        }}
        transition={{ 
            repeat: Infinity, 
            duration: 4 + Math.random() * 2, 
            delay,
            ease: "easeInOut" 
        }}
    >
        <path d="M10,100 C14,80 18,40 10,0 C2,40 6,80 10,100" fill={color} />
        <path d="M10,100 C12,80 14,40 10,10" fill="white" fillOpacity="0.2" />
    </motion.svg>
);

// Energy Ripple Component
const EnergyRipple = ({ x, y, delay }: { x: number, y: number, delay: number }) => (
    <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 3, repeat: Infinity, delay, ease: "easeOut" }}
        className="absolute rounded-full border border-emerald-400/30"
        style={{ left: `${x}%`, top: `${y}%`, width: '100px', height: '100px', transform: 'translate(-50%, -50%) rotateX(70deg)' }}
    />
);

// ExtrudedLogo Component (Massive Building Style)
const ExtrudedLogo = ({ part, size = 300, hLayer = 'all', scaleFactor, depth = 1 }: { part: 'H' | 'S', size?: number, hLayer?: 'front' | 'back' | 'all', scaleFactor: number, depth?: number }) => {
    const layers = 12; // Increased layers for "massive" solid look
    const finalSize = size * scaleFactor;
    
    return (
        <div className="relative preserve-3d" style={{ width: finalSize, height: finalSize }}>
            <svg width="0" height="0" className="absolute">
                <defs>
                    {/* Window Pattern for Building Look */}
                    <pattern id="buildingWindows" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                        <rect width="8" height="8" fill="none"/>
                        <rect x="1" y="1" width="3" height="3" fill="rgba(0,0,0,0.3)" />
                        <rect x="5" y="5" width="3" height="3" fill="rgba(0,0,0,0.3)" />
                    </pattern>
                    {/* Shiny Gradient */}
                    <linearGradient id="shinyGloss" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                        <stop offset="40%" stopColor="white" stopOpacity="0" />
                        <stop offset="60%" stopColor="white" stopOpacity="0" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.3" />
                    </linearGradient>

                    {/* Harmonized 4-Color Deep Metallic Gradient for Front Faces */}
                    <linearGradient id="vipHarmoniousGrad" x1="18" y1="12" x2="110" y2="116" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="5%" stopColor="#bbf7d0" />
                        <stop offset="12%" stopColor="#15803d" />
                        <stop offset="22%" stopColor="#3f6212" />
                        <stop offset="33%" stopColor="#713f12" />
                        <stop offset="43%" stopColor="#a16207" />
                        <stop offset="51%" stopColor="#ca8a04" />
                        <stop offset="59%" stopColor="#c2410c" />
                        <stop offset="67%" stopColor="#d97706" />
                        <stop offset="75%" stopColor="#eab308" />
                        <stop offset="84%" stopColor="#facc15" />
                        <stop offset="91%" stopColor="#84cc16" />
                        <stop offset="96%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                    </linearGradient>

                    {/* Cohesive Darkened 3D Extrusion Depth Gradient */}
                    <linearGradient id="vipDepthGrad" x1="18" y1="12" x2="110" y2="116" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#1c1917" />
                        <stop offset="12%" stopColor="#14381e" />
                        <stop offset="25%" stopColor="#22330e" />
                        <stop offset="42%" stopColor="#3d2206" />
                        <stop offset="59%" stopColor="#431407" />
                        <stop offset="73%" stopColor="#3d2206" />
                        <stop offset="86%" stopColor="#25350e" />
                        <stop offset="95%" stopColor="#14381e" />
                        <stop offset="100%" stopColor="#1c1917" />
                    </linearGradient>

                    {/* Specular Ridge Highlights for S Spine */}
                    <linearGradient id="vipSRidgeSoft" x1="68" y1="14" x2="36" y2="108" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                        <stop offset="40%" stopColor="#ffffff" stopOpacity="0.48" />
                        <stop offset="75%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="vipSRidgeCore" x1="68" y1="14" x2="36" y2="108" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="70%" stopColor="#ffffff" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Specular Column Gleams */}
                    <linearGradient id="vipColGleamSoft" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
                        <stop offset="20%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.4" />
                        <stop offset="80%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="vipColGleamCore" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
                        <stop offset="20%" stopColor="#ffffff" stopOpacity="0.75" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.92" />
                        <stop offset="80%" stopColor="#ffffff" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Alias for backwards compatibility */}
                    <linearGradient id="vipShardGrad" x1="18" y1="12" x2="110" y2="116" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="5%" stopColor="#bbf7d0" />
                        <stop offset="12%" stopColor="#15803d" />
                        <stop offset="22%" stopColor="#3f6212" />
                        <stop offset="33%" stopColor="#713f12" />
                        <stop offset="43%" stopColor="#a16207" />
                        <stop offset="51%" stopColor="#ca8a04" />
                        <stop offset="59%" stopColor="#c2410c" />
                        <stop offset="67%" stopColor="#d97706" />
                        <stop offset="75%" stopColor="#eab308" />
                        <stop offset="84%" stopColor="#facc15" />
                        <stop offset="91%" stopColor="#84cc16" />
                        <stop offset="96%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                    </linearGradient>
                </defs>
            </svg>

            {[...Array(layers)].map((_, i) => (
                <div 
                    key={i}
                    className="absolute inset-0 preserve-3d"
                    style={{ 
                        // Dense layering for solid building look
                        transform: `translateZ(${-i * (depth * 3)}px)`, 
                        // Darken layers as they go back to simulate shadow/depth
                        filter: i > 0 ? `brightness(${1 - (i / layers) * 0.5})` : 'none',
                        backfaceVisibility: 'hidden',
                        willChange: 'transform'
                    }}
                >
                    <svg width={finalSize} height={finalSize} viewBox="0 0 128 128" fill="none">
                        {part === 'H' ? (
                            <g>
                                {/* BACK LAYER (Top-Left & Bottom-Right Shards) */}
                                {(hLayer === 'all' || hLayer === 'back') && (
                                    <>
                                        {/* Top-Left Shard */}
                                        <path 
                                            d="M 26 10 L 54 10 L 48 62 L 34 62 Z" 
                                            fill={i === 0 ? "url(#vipHarmoniousGrad)" : "url(#vipDepthGrad)"} 
                                            stroke={i === 0 ? "white" : "url(#vipDepthGrad)"} 
                                            strokeWidth={i === 0 ? "2.4" : "1.8"} 
                                            strokeLinejoin="round" 
                                            strokeLinecap="round" 
                                        />
                                        {/* Bottom-Right Shard */}
                                        <path 
                                            d="M 74 118 L 102 118 L 94 66 L 80 66 Z" 
                                            fill={i === 0 ? "url(#vipHarmoniousGrad)" : "url(#vipDepthGrad)"} 
                                            stroke={i === 0 ? "white" : "url(#vipDepthGrad)"} 
                                            strokeWidth={i === 0 ? "2.4" : "1.8"} 
                                            strokeLinejoin="round" 
                                            strokeLinecap="round" 
                                        />
                                        {/* Specular Center Gleams for Back Columns on Front Face */}
                                        {i === 0 && (
                                            <>
                                                <line x1="39" y1="18" x2="40" y2="54" stroke="url(#vipColGleamSoft)" strokeWidth="2.6" strokeLinecap="round" />
                                                <line x1="39" y1="18" x2="40" y2="54" stroke="url(#vipColGleamCore)" strokeWidth="1.3" strokeLinecap="round" />
                                                <line x1="89" y1="74" x2="88" y2="110" stroke="url(#vipColGleamSoft)" strokeWidth="2.6" strokeLinecap="round" />
                                                <line x1="89" y1="74" x2="88" y2="110" stroke="url(#vipColGleamCore)" strokeWidth="1.3" strokeLinecap="round" />
                                            </>
                                        )}
                                    </>
                                )}
                                
                                {/* FRONT LAYER (Top-Right & Bottom-Left Shards) */}
                                {(hLayer === 'all' || hLayer === 'front') && (
                                    <>
                                        {/* Top-Right Shard */}
                                        <path 
                                            d="M 80 62 L 94 62 L 102 10 L 74 10 Z" 
                                            fill={i === 0 ? "url(#vipHarmoniousGrad)" : "url(#vipDepthGrad)"} 
                                            stroke={i === 0 ? "white" : "url(#vipDepthGrad)"} 
                                            strokeWidth={i === 0 ? "2.4" : "1.8"} 
                                            strokeLinejoin="round" 
                                            strokeLinecap="round" 
                                        />
                                        {/* Bottom-Left Shard */}
                                        <path 
                                            d="M 34 66 L 48 66 L 54 118 L 26 118 Z" 
                                            fill={i === 0 ? "url(#vipHarmoniousGrad)" : "url(#vipDepthGrad)"} 
                                            stroke={i === 0 ? "white" : "url(#vipDepthGrad)"} 
                                            strokeWidth={i === 0 ? "2.4" : "1.8"} 
                                            strokeLinejoin="round" 
                                            strokeLinecap="round" 
                                        />
                                        {/* Specular Center Gleams for Front Columns on Front Face */}
                                        {i === 0 && (
                                            <>
                                                <line x1="88" y1="18" x2="87" y2="54" stroke="url(#vipColGleamSoft)" strokeWidth="2.6" strokeLinecap="round" />
                                                <line x1="88" y1="18" x2="87" y2="54" stroke="url(#vipColGleamCore)" strokeWidth="1.3" strokeLinecap="round" />
                                                <line x1="40" y1="74" x2="41" y2="110" stroke="url(#vipColGleamSoft)" strokeWidth="2.6" strokeLinecap="round" />
                                                <line x1="40" y1="74" x2="41" y2="110" stroke="url(#vipColGleamCore)" strokeWidth="1.3" strokeLinecap="round" />
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Window Pattern Overlay (On all layers for structural look) */}
                                <g opacity="0.35">
                                    {(hLayer === 'all' || hLayer === 'back') && (
                                        <>
                                            <path d="M 26 10 L 54 10 L 48 62 L 34 62 Z" fill="url(#buildingWindows)" />
                                            <path d="M 74 118 L 102 118 L 94 66 L 80 66 Z" fill="url(#buildingWindows)" />
                                        </>
                                    )}
                                    {(hLayer === 'all' || hLayer === 'front') && (
                                        <>
                                            <path d="M 80 62 L 94 62 L 102 10 L 74 10 Z" fill="url(#buildingWindows)" />
                                            <path d="M 34 66 L 48 66 L 54 118 L 26 118 Z" fill="url(#buildingWindows)" />
                                        </>
                                    )}
                                </g>

                                {/* Shiny Overlay on Front Layer Only */}
                                {i === 0 && (
                                    <>
                                        {(hLayer === 'all' || hLayer === 'back') && (
                                            <>
                                                <path d="M 26 10 L 54 10 L 48 62 L 34 62 Z" fill="url(#shinyGloss)" />
                                                <path d="M 74 118 L 102 118 L 94 66 L 80 66 Z" fill="url(#shinyGloss)" />
                                            </>
                                        )}
                                        {(hLayer === 'all' || hLayer === 'front') && (
                                            <>
                                                <path d="M 80 62 L 94 62 L 102 10 L 74 10 Z" fill="url(#shinyGloss)" />
                                                <path d="M 34 66 L 48 66 L 54 118 L 26 118 Z" fill="url(#shinyGloss)" />
                                            </>
                                        )}
                                    </>
                                )}
                            </g>
                        ) : (
                            <g>
                                {i === 0 ? (
                                    <>
                                        {/* Letter S crisp anti-aliased white outer border */}
                                        <path 
                                            d="M 92 28 C 72 4, 38 10, 38 36 C 38 60, 90 60, 90 92 C 90 118, 56 124, 36 100" 
                                            fill="none" 
                                            stroke="white" 
                                            strokeWidth="22" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />
                                        {/* Letter S warm harmonized gradient stroke */}
                                        <path 
                                            d="M 92 28 C 72 4, 38 10, 38 36 C 38 60, 90 60, 90 92 C 90 118, 56 124, 36 100" 
                                            fill="none" 
                                            stroke="url(#vipHarmoniousGrad)" 
                                            strokeWidth="20" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />

                                        {/* Window Pattern on S (Stroke Overlay) */}
                                        <path 
                                            d="M 92 28 C 72 4, 38 10, 38 36 C 38 60, 90 60, 90 92 C 90 118, 56 124, 36 100" 
                                            fill="none" 
                                            stroke="url(#buildingWindows)" 
                                            strokeWidth="20" 
                                            strokeLinecap="round" 
                                            opacity="0.25" 
                                        />

                                        {/* Shiny Overlay for S */}
                                        <path 
                                            d="M 92 28 C 72 4, 38 10, 38 36 C 38 60, 90 60, 90 92 C 90 118, 56 124, 36 100" 
                                            fill="none" 
                                            stroke="url(#shinyGloss)" 
                                            strokeWidth="20" 
                                            strokeLinecap="round" 
                                        />

                                        {/* Internal Flowing S-Curve Spine Highlights */}
                                        <path 
                                            d="M 36 100 C 56 124, 90 118, 90 92 C 90 60, 38 60, 38 36 C 38.00 20.40, 50.24 12.00, 65.50 13.10" 
                                            fill="none" 
                                            stroke="url(#vipSRidgeSoft)" 
                                            strokeWidth="3.6" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />
                                        <path 
                                            d="M 36 100 C 56 124, 90 118, 90 92 C 90 60, 38 60, 38 36 C 38.00 20.40, 50.24 12.00, 65.50 13.10" 
                                            fill="none" 
                                            stroke="url(#vipSRidgeCore)" 
                                            strokeWidth="1.5" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />

                                        {/* Integrated Triangular Send Arrow Head */}
                                        <path 
                                            d="M 70.80 14.04 L 64.70 16.06 L 65.70 10.14 Z" 
                                            fill="white" 
                                            stroke="white" 
                                            strokeWidth="2.8" 
                                            strokeLinejoin="round" 
                                            strokeLinecap="round" 
                                            opacity="0.45" 
                                        />
                                        <path 
                                            d="M 70.80 14.04 L 64.70 16.06 L 65.70 10.14 Z" 
                                            fill="white" 
                                            stroke="white" 
                                            strokeWidth="1.2" 
                                            strokeLinejoin="round" 
                                            strokeLinecap="round" 
                                            opacity="0.95" 
                                        />
                                    </>
                                ) : (
                                    /* Depth Extrusion Wall Layers for S */
                                    <path 
                                        d="M 92 28 C 72 4, 38 10, 38 36 C 38 60, 90 60, 90 92 C 90 118, 56 124, 36 100" 
                                        fill="none" 
                                        stroke="url(#vipDepthGrad)" 
                                        strokeWidth="20.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                    />
                                )}
                            </g>
                        )}
                    </svg>
                </div>
            ))}
        </div>
    );
};

// Sunrise Component (Corrected Position & Animation)
const Sunrise = ({ phase }: { phase: number }) => (
    <AnimatePresence>
        {(phase === 2 || phase === 3 || phase === 4) && (
            <motion.div
                initial={{ y: 150, opacity: 0, scale: 0.8 }}
                animate={{ y: -100, opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 8, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 z-0 pointer-events-none"
                style={{ bottom: '35vh' }} // Positioned just behind the horizon line (40vh ground)
            >
                {/* Sun Core */}
                <div className="w-48 h-48 bg-gradient-to-t from-red-500 via-yellow-300 to-white rounded-full blur-2xl opacity-90 shadow-[0_0_100px_rgba(255,200,0,0.6)]" />
                
                {/* Sun Rays */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 left-1/2 w-[250%] h-1 bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent origin-left"
                        style={{ transform: `translate(-50%, -50%) rotate(${i * 45}deg)` }}
                    />
                ))}
            </motion.div>
        )}
    </AnimatePresence>
);

const VIPLogoAnimation: React.FC<Props> = ({ onComplete }) => {
    const [phase, setPhase] = useState(0);
    const [windowSize, setWindowSize] = useState({ 
        width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
        height: typeof window !== 'undefined' ? window.innerHeight : 800 
    });

    const onCompleteRef = React.useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        
        // Fallback timer to ensure the animation closes even if something goes wrong
        const fallbackTimer = setTimeout(() => {
            onCompleteRef.current();
        }, 11000); // Slightly longer than the animation
        
        // Epic 10s Timeline (Slower, heavier feel)
        // 0-1.5s: The Approach
        // 1.5-3.5s: Majestic Rotation
        // 3.5-6s: The Divine Split
        // 6-7.5s: Climax
        // 7.5-8.5s: Re-unification (Assembly)
        // 8.5-10s: Final Showcase & Fade Out
        
        const timers = [
            setTimeout(() => setPhase(1), 1500),   // Approach (1.5s)
            setTimeout(() => setPhase(2), 3500),   // Rotation (2s)
            setTimeout(() => setPhase(3), 6000),   // Split (2.5s)
            setTimeout(() => setPhase(4), 7500),   // Climax (1.5s)
            setTimeout(() => setPhase(5), 8500),   // Re-unification (1s)
            setTimeout(() => setPhase(6), 9000),   // Move away (1s)
            setTimeout(() => onCompleteRef.current(), 10000), // Total 10 Seconds
        ];

        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(fallbackTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const scaleFactor = useMemo(() => {
        // Ensure windowSize is valid to prevent NaN or infinite values
        if (!windowSize.width || windowSize.width === 0) return 0.4;
        
        const isPortrait = windowSize.height > windowSize.width;
        const baseWidth = 1920;
        
        // Calculate scale based on width, but boost for mobile portrait to ensure visibility
        let scale = Math.min(Math.max(windowSize.width / baseWidth, 0.4), 1.0);
        
        if (isPortrait) {
            // In portrait, scale up slightly more relative to width, as we have vertical space
            // but cap it to avoid horizontal overflow during split
            scale = Math.min(windowSize.width / 800, 0.8); 
        }
        
        return scale;
    }, [windowSize]);

    // Calculate dynamic split distance based on screen width to prevent overflow
    const splitDistance = useMemo(() => {
        const baseSplit = 250;
        // Ensure split doesn't push elements off-screen (allow 150px margin on each side)
        const maxSplit = (windowSize.width / 2) - 150; 
        return Math.min(baseSplit * scaleFactor, maxSplit);
    }, [windowSize.width, scaleFactor]);

    // Calculate dynamic Y position to sit on the "ground" (approx 10% below center)
    const groundY = useMemo(() => {
        return windowSize.height * 0.15; 
    }, [windowSize.height]);

    // Dynamic Depth: Flat (0.5) during approach, Deep (4) during split/rotation
    const logoDepth = phase >= 2 ? 4 : 0.5;

    return (
        <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden select-none bg-black/40 backdrop-blur-[2px]"
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
            
            {/* Global SVG Definitions */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="vipShardGrad" x1="18" y1="12" x2="110" y2="116" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="5%" stopColor="#bbf7d0" />
                        <stop offset="12%" stopColor="#15803d" />
                        <stop offset="22%" stopColor="#3f6212" />
                        <stop offset="33%" stopColor="#713f12" />
                        <stop offset="43%" stopColor="#a16207" />
                        <stop offset="51%" stopColor="#ca8a04" />
                        <stop offset="59%" stopColor="#c2410c" />
                        <stop offset="67%" stopColor="#d97706" />
                        <stop offset="75%" stopColor="#eab308" />
                        <stop offset="84%" stopColor="#facc15" />
                        <stop offset="91%" stopColor="#84cc16" />
                        <stop offset="96%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                    </linearGradient>
                </defs>
            </svg>

            {/* --- CINEMATIC NATURE ENVIRONMENT --- */}
            <motion.div 
                initial={{ opacity: 1 }} 
                animate={{ opacity: 1 }} 
                className="absolute inset-0 z-10 transition-colors duration-1000 bg-transparent"
            >
                {/* VIP Header Text */}
                <motion.div 
                    initial={{ y: -100, opacity: 1 }}
                    animate={{ y: 50, opacity: phase >= 1 && phase < 5 ? 1 : 0 }}
                    className="absolute top-0 left-0 right-0 text-center z-50"
                >
                    <div className="text-white font-black text-4xl uppercase tracking-[1em] drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">VIP SHOWCASE</div>
                    <div className="text-emerald-400 font-bold text-sm uppercase tracking-[0.5em] mt-2">HiSee Exclusive Experience</div>
                </motion.div>
                {/* Rain Effect */}
                <RainEffect windowSize={windowSize} />

                {/* Sky Background with original colors */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#064e3b_0%,#020617_100%)] opacity-40" />
                
                {/* Transient Sky Components: Shooting Stars & Nebula Wisps */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={`shooting-star-${i}`}
                            initial={{ x: '-10%', y: '20%', opacity: 0 }}
                            animate={{ x: '120%', y: '60%', opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 8, ease: "linear" }}
                            className="absolute w-40 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent rotate-[20deg]"
                        />
                    ))}
                    {[...Array(4)].map((_, i) => (
                        <motion.div
                            key={`nebula-${i}`}
                            animate={{ 
                                x: [windowSize.width, -400],
                                opacity: [0, 0.2, 0]
                            }}
                            transition={{ duration: 20, repeat: Infinity, delay: i * 5, ease: "linear" }}
                            className="absolute w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full"
                            style={{ top: `${i * 20}%` }}
                        />
                    ))}
                </div>

                {/* Floating Particles */}
                <div className="absolute inset-0">
                    {[...Array(30)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ x: Math.random() * windowSize.width, y: -100, rotate: 0 }}
                            animate={{ 
                                y: windowSize.height + 100, 
                                x: (Math.random() - 0.5) * 300 + (Math.random() * windowSize.width),
                                rotate: [0, 360],
                            }}
                            transition={{ repeat: Infinity, duration: 8 + Math.random() * 8, delay: i * 0.5, ease: "linear" }}
                            className="absolute"
                        >
                            <div className="w-1 h-1 bg-emerald-400/20 rounded-full blur-[1px]" />
                        </motion.div>
                    ))}
                </div>

                {/* Ground Layer (Magical Energy Floor) */}
                <div className="absolute bottom-0 left-0 right-0 h-[45vh] overflow-hidden bg-[#1a0f05]" style={{ transform: 'translateZ(0)' }}>
                    
                    {/* Infinite Grid with Extreme Perspective */}
                    <div className="absolute -inset-[100%] w-[300%] h-[300%] opacity-20 origin-bottom" 
                         style={{ 
                             left: '-100%',
                             backgroundImage: `
                                linear-gradient(to right, #facc15 2px, transparent 2px), 
                                linear-gradient(to bottom, #facc15 2px, transparent 2px)
                             `,
                             backgroundSize: '100px 100px',
                             transform: 'perspective(200px) rotateX(85deg) scale(1)',
                             maskImage: 'linear-gradient(to top, black 10%, transparent 80%)', // Smooth fade to horizon
                             WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 80%)',
                             backfaceVisibility: 'hidden'
                         }} 
                    />

                    {/* Horizon Glow Line - REMOVED */}

                    {/* Liquid Aura under Logo */}
                    <motion.div
                        animate={{ 
                            scale: phase === 0 ? [0, 1.5] : 1.5,
                            opacity: phase >= 6 ? 0 : [0.3, 0.6, 0.3],
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-yellow-500/10 blur-[60px] rounded-[100%]"
                        style={{ transform: 'rotateX(80deg)' }}
                    />

                    {/* Moving Light Trails (On the grid surface) */}
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ y: ['100vh', '-20vh'], opacity: [0, 1, 0] }} // Move from bottom to horizon
                            transition={{ duration: 3, repeat: Infinity, delay: i * 1.5, ease: "linear" }}
                            className="absolute left-1/2 w-1 h-20 bg-yellow-400/50 blur-sm"
                            style={{ 
                                x: (i - 1) * 300,
                                transformOrigin: 'bottom',
                                transform: 'perspective(200px) rotateX(85deg)'
                            }} 
                        />
                    ))}

                    {/* Energy Ripples */}
                    <EnergyRipple x={50} y={60} delay={0} />
                    <EnergyRipple x={30} y={70} delay={1} />
                    <EnergyRipple x={70} y={70} delay={2} />

                    {/* Transient Ground Components: Floating Energy Orbs */}
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={`ground-orb-${i}`}
                            initial={{ x: Math.random() * windowSize.width, y: '100%', opacity: 0 }}
                            animate={{ 
                                y: ['100%', '0%'],
                                x: (Math.random() - 0.5) * 200 + (Math.random() * windowSize.width),
                                opacity: [0, 0.6, 0]
                            }}
                            transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: i * 2 }}
                            className="absolute w-2 h-2 bg-yellow-400 rounded-full blur-[1px] shadow-sm"
                            style={{ bottom: `${Math.random() * 30}%` }}
                        />
                    ))}

                    {/* Ground Glow & Mist */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f05] via-transparent to-transparent opacity-60" />
                    <motion.div 
                        animate={{ opacity: [0.2, 0.4, 0.2] }} 
                        transition={{ duration: 5, repeat: Infinity }}
                        className="absolute top-0 left-0 right-0 h-32 bg-yellow-500/10 blur-[40px]" 
                    />
                </div>

                {/* Perspective Nature (Near to Far) */}
                <div className="absolute bottom-0 left-0 right-0 h-80 overflow-hidden">
                    {/* Far Row (Muted, Small) */}
                    <div className="absolute bottom-12 left-0 right-0 flex items-end justify-around px-2 opacity-30">
                        {[...Array(45)].map((_, i) => (
                            <LushGrass key={`far-${i}`} delay={i * 0.2} height={20 + Math.random() * 20} color="#064e3b" depth={0.3} scaleFactor={scaleFactor} />
                        ))}
                    </div>
                    {/* Middle Row (Textured) */}
                    <div className="absolute bottom-6 left-0 right-0 flex items-end justify-around px-4 opacity-70">
                        {[...Array(40)].map((_, i) => (
                            <LushGrass key={`mid-${i}`} delay={i * 0.15} height={40 + Math.random() * 40} color="#065f46" depth={0.6} scaleFactor={scaleFactor} />
                        ))}
                    </div>
                    {/* Near Row (Sharp, Detailed, Realistic) */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-6">
                        {[...Array(35)].map((_, i) => (
                            <LushGrass key={`near-${i}`} delay={i * 0.1} height={70 + Math.random() * 50} color="#10b981" depth={1.0} scaleFactor={scaleFactor} />
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* --- 3D LOGO STAGE --- */}
            <div className="relative w-full h-full flex items-center justify-center preserve-3d perspective-[3500px] z-50">
                
                {/* Dynamic Shadow */}
                <motion.div 
                    animate={{ 
                        scale: phase === 0 ? [0.2, 2] : phase === 1 ? 2.2 : 1.8,
                        opacity: phase >= 6 ? 0 : 0.7,
                        rotateX: 80,
                        y: 200 * scaleFactor
                    }}
                    transition={{ duration: 2.5, ease: "circOut" }}
                    className="absolute bottom-[25vh] w-[45vw] h-24 bg-black/95 rounded-[100%] blur-3xl"
                />

                {/* Sunrise Effect (Behind Logos) */}
                <Sunrise phase={phase} />

                {/* Main Logo Container */}
                <motion.div
                    className="relative flex items-center justify-center preserve-3d"
                    style={{ willChange: 'transform' }}
                    initial={{ scale: 0.1, z: -800, rotateY: 0, opacity: 0, y: 0 }}
                    animate={{ 
                        // Reduced scale and Z-position to keep logo within viewport
                        scale: phase >= 6 ? [2.8, 0] : (phase === 0 ? 2.5 : phase >= 4 ? 2.8 : phase === 1 ? 2.5 : 2.0),
                        z: phase === 0 ? [-800, 0] : 0, // Moved back from 400 to 0
                        y: phase >= 6 ? [groundY, groundY - 500] : [groundY - 20, groundY + 20, groundY - 20], // Continuous floating motion
                        rotateY: [0, 10, -10, 0], // Continuous subtle rotation
                        opacity: phase >= 6 ? 0 : 1,
                        filter: 'none' // Removed white glow/shadow to prevent square artifact
                    }}
                    transition={{ 
                        y: phase >= 6 ? { duration: 1.5, ease: "easeInOut" } : { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                        rotateY: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                        scale: phase >= 6 ? { duration: 1.5, ease: "easeInOut" } : { duration: 1, ease: "easeInOut" },
                        z: { duration: 1, ease: "easeInOut" },
                        opacity: { duration: 1.5, ease: "easeInOut" }
                    }}
                >
                    {/* Shockwave Effect on Transitions */}
                    <AnimatePresence>
                        {(phase === 2 || phase === 3 || phase === 4) && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 1 }}
                                animate={{ scale: 5, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                className="absolute inset-0 border-[15px] border-yellow-400/50 rounded-full z-0"
                            />
                        )}
                    </AnimatePresence>
                    {/* INTERLOCKING LOGO SYSTEM */}
                    <div className="relative flex items-center justify-center preserve-3d">
                        {/* H BACK LAYER (Top-Left Red & Bottom-Right White) - BEHIND S */}
                        <motion.div
                            animate={{ 
                                x: phase >= 2 && phase < 4 ? -splitDistance : 0, // Dynamic split distance
                                z: phase < 2 || phase >= 4 ? -15 : 0, 
                                rotateY: phase === 2 ? [-10, 10, 0] : 0,
                                scale: phase === 2 ? 1.1 : phase >= 4 ? 1.0 : 1, // Reduced scale
                            }}
                            transition={{ duration: 3, ease: "easeInOut" }}
                            className="absolute z-10 preserve-3d"
                        >
                            <ExtrudedLogo part="H" hLayer="back" size={300} scaleFactor={scaleFactor} depth={logoDepth} /> {/* Reduced base size */}
                        </motion.div>

                        {/* S PART (Middle) */}
                        <motion.div
                            animate={{ 
                                x: phase >= 2 && phase < 4 ? splitDistance : 0, // Dynamic split distance
                                z: 0,
                                rotateY: phase === 2 ? [10, -10, 0] : 0,
                                scale: phase === 2 ? 1.1 : phase >= 4 ? 1.0 : 1,
                            }}
                            transition={{ duration: 3, ease: "easeInOut" }}
                            className="absolute z-20 preserve-3d"
                        >
                            <ExtrudedLogo part="S" size={300} scaleFactor={scaleFactor} depth={logoDepth} />
                        </motion.div>

                        {/* H FRONT LAYER (Top-Right Yellow & Bottom-Left Green) - IN FRONT OF S */}
                        <motion.div
                            animate={{ 
                                x: phase >= 2 && phase < 4 ? -splitDistance : 0, // Dynamic split distance
                                z: phase < 2 || phase >= 4 ? 15 : 0, 
                                rotateY: phase === 2 ? [-10, 10, 0] : 0,
                                scale: phase === 2 ? 1.1 : phase >= 4 ? 1.0 : 1,
                            }}
                            transition={{ duration: 3, ease: "easeInOut" }}
                            className="absolute z-30 preserve-3d"
                        >
                            <ExtrudedLogo part="H" hLayer="front" size={300} scaleFactor={scaleFactor} depth={logoDepth} />
                        </motion.div>
                    </div>

                    {/* --- HEART CLIMAX (Representing &) --- */}
                    <AnimatePresence>
                        {phase === 3 && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0, rotateY: 180, z: -500 }}
                                animate={{ scale: 1.5, opacity: 1, rotateY: 0, z: 0 }} // Reduced scale from 4.5 to 1.5
                                exit={{ scale: 0, opacity: 0, rotateY: -180 }}
                                transition={{ type: "spring", damping: 15, stiffness: 50 }}
                                className="absolute z-30 preserve-3d"
                            >
                                <SmilingHeart />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* --- AMBIENT AUTUMN PARTICLES --- */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(100)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ x: Math.random() * windowSize.width, y: windowSize.height + 100, scale: Math.random() * 1.2 }}
                            animate={{ y: -500, x: (Math.random() - 0.5) * 500 + (Math.random() * windowSize.width), rotate: 360, opacity: [0, 1, 0] }}
                            transition={{ duration: 10 + Math.random() * 10, repeat: Infinity, delay: Math.random() * 20 }}
                            className={`absolute rounded-full ${i % 3 === 0 ? 'bg-red-400' : i % 3 === 1 ? 'bg-green-400' : 'bg-yellow-400'} shadow-[0_0_25px_white]`}
                            style={{ width: Math.random() * 10 + 2, height: Math.random() * 10 + 2 }}
                        />
                    ))}
                </div>
            </div>

            {/* Final Cinematic Flash */}
            <AnimatePresence>
                {phase === 4 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2.5 }} className="absolute inset-0 bg-white z-[500] mix-blend-overlay" />
                )}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(VIPLogoAnimation);




