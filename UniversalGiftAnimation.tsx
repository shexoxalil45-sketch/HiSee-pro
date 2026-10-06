import React from 'react';
import { motion } from 'motion/react';
import { 
    AnimatedOctopus, AnimatedShark, AnimatedWhale, AnimatedSeal, 
    AnimatedFish, AnimatedDolphin, AnimatedDragon, AnimatedPhoenix, 
    AnimatedCastle, AnimatedEagle, AnimatedTiger, AnimatedButterfly, 
    AnimatedPenguin, AnimatedCar, AnimatedCoinMedal, AnimatedLogoMedal
} from './GiftIcons';

interface Props {
    gift: any;
    onComplete: () => void;
}

const UniversalGiftAnimation: React.FC<Props> = ({ gift, onComplete }) => {
    
    const price = gift.price || 0;
    const displayType = gift.displayType || (price > 3000 ? 'fullscreen' : 'normal');
    
    // Determine Tier based on displayType
    let tier = displayType === 'fullscreen' ? 3 : 2; // Default to medium for normal if not specified
    if (price < 1000) tier = 1;

    // Select Custom Animation Component if available
    const getCustomIcon = () => {
        switch(gift.id) {
            case 'octopus': return <AnimatedOctopus className="w-full h-full object-contain" />;
            case 'shark': return <AnimatedShark className="w-full h-full object-contain" />;
            case 'whale': return <AnimatedWhale className="w-full h-full object-contain" />;
            case 'seal': return <AnimatedSeal className="w-full h-full object-contain" />;
            case 'fish_big':
            case 'fish_school': return <AnimatedFish className="w-full h-full object-contain" />;
            case 'dolphin': return <AnimatedDolphin className="w-full h-full object-contain" />;
            case 'dragon': return <AnimatedDragon className="w-full h-full object-contain" />;
            case 'phoenix': return <AnimatedPhoenix className="w-full h-full object-contain" />;
            case 'castle': return <AnimatedCastle className="w-full h-full object-contain" />;
            case 'eagle': return <AnimatedEagle className="w-full h-full object-contain" />;
            case 'tiger': return <AnimatedTiger className="w-full h-full object-contain" />;
            case 'butterfly': return <AnimatedButterfly className="w-full h-full object-contain" />;
            case 'penguin': return <AnimatedPenguin className="w-full h-full object-contain" />;
            case 'luxury_car': return <AnimatedCar className="w-full h-full object-contain" />;
            case 'coin_medal': return <AnimatedCoinMedal className="w-full h-full object-contain" />;
            case 'logo_medal': return <AnimatedLogoMedal className="w-full h-full object-contain" />;
            default: 
                // Return default image or icon placeholder if missing
                if (gift.icon) {
                    return <div className="text-[12vw] select-none transform flex items-center justify-center w-full h-full max-w-[90%] max-h-[90%] object-contain leading-none">{gift.icon}</div>;
                }
                return <div className="w-[18vw] h-[18vw] bg-white/20 rounded-full flex items-center justify-center text-white text-[10vw] max-w-[90%] max-h-[90%] object-contain">🎁</div>;
        }
    };

    // Animation Variants based on Tier - Added bounce and fade-in
    const containerVariants = {
        tier1: { // Low Value: Bounce Pop
            scale: [0, 1.2, 0.9, 1, 1, 0],
            opacity: [0, 1, 1, 1, 1, 0],
            transition: { duration: 3, times: [0, 0.1, 0.2, 0.3, 0.9, 1] }
        },
        tier2: { // Medium Value: Grand Entrance with bounce
            scale: [0, 2, 1.8, 2, 2, 0],
            rotate: [-10, 0, 5, 0, 0, 0],
            opacity: [0, 1, 1, 1, 1, 0],
            y: [100, -20, 10, 0, 0, 0],
            transition: { duration: 3.5, times: [0, 0.15, 0.25, 0.35, 0.9, 1], ease: "easeInOut" as const }
        },
        tier3: { // High Value: Massive Screen Takeover with bounce
            scale: [0, 3.2, 2.8, 3, 3, 0],
            rotate: [-10, 0, 0, 0, 0, 0],
            opacity: [0, 1, 1, 1, 1, 0],
            transition: { duration: 4.5, times: [0, 0.15, 0.25, 0.35, 0.9, 1], ease: "circOut" as const }
        }
    };

    const bgGlowVariants = {
        tier1: { scale: [0, 1.5, 0], opacity: [0, 0.3, 0] },
        tier2: { scale: [0, 2, 2.5, 0], opacity: [0, 0.6, 0] },
        tier3: { scale: [0, 4, 5, 0], opacity: [0, 0.8, 0] } // Fills screen
    };
    
    const isUnderwater = gift.environment === 'underwater' || gift.animType === 'swim' || gift.id === 'whale' || gift.id === 'shark';

    const duration = gift.duration ? gift.duration / 1000 : (tier === 1 ? 3 : tier === 2 ? 3.5 : 4.5);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, duration * 1000);
        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none bg-transparent`}>
            
            {/* Background Burst/Glow Effect - kept transparent */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={bgGlowVariants[`tier${tier}` as keyof typeof bgGlowVariants] as any}
                transition={{ duration: duration }}
                className={`absolute rounded-full bg-gradient-to-r ${gift.color || 'from-white to-gray-200'} blur-3xl mix-blend-screen`}
                style={{ 
                    width: tier === 3 ? '100vw' : '60vw', 
                    height: tier === 3 ? '100vh' : '60vh' 
                }}
            />

            {/* Tier 3: Extra Light Beams */}
            {tier === 3 && (
                 <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[150vw] h-[150vw] opacity-30"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0deg, ${gift.color ? 'var(--tw-gradient-to)' : 'white'} 20deg, transparent 40deg, transparent 360deg)`
                    }}
                 />
            )}

            {/* The Gift Icon Container (Entrance/Exit) */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={containerVariants[`tier${tier}` as keyof typeof containerVariants] as any}
                className="relative z-10 drop-shadow-[0_0_5vw_rgba(255,255,255,0.8)] filter flex items-center justify-center max-w-[90vw] max-h-[90vh] object-contain"
                style={{
                    width: tier === 1 ? '20vw' : tier === 2 ? '35vw' : '50vw',
                    height: tier === 1 ? '20vh' : tier === 2 ? '35vh' : '50vh',
                    maxWidth: '90%',
                    maxHeight: '90%',
                }}
            >
                {/* Render Custom Animated SVG or Default Icon */}
                <div className="w-full h-full flex items-center justify-center object-contain max-w-[90%] max-h-[90%] select-none">
                    {getCustomIcon()}
                </div>
            </motion.div>
            
            {/* Floating Particles / Bubbles */}
            {[...Array(tier * 5)].map((_, i) => ( // More particles for higher tiers
                <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{ 
                        x: (Math.random() - 0.5) * (tier === 3 ? 1000 : 400), 
                        y: isUnderwater ? -600 : (Math.random() - 0.5) * (tier === 3 ? 1000 : 400), 
                        opacity: [0, 1, 0], 
                        scale: [0, isUnderwater ? 1.5 : 1, 0] 
                    }}
                    transition={{ duration: (tier === 1 ? 2 : 3) + Math.random(), delay: Math.random() * 0.5, repeat: 0 }}
                    className={`absolute w-4 h-4 rounded-full blur-[1px] ${isUnderwater ? 'bg-blue-200/60 border border-white/40' : 'bg-white'}`}
                />
            ))}
        </div>
    );
};

export default React.memo(UniversalGiftAnimation);
