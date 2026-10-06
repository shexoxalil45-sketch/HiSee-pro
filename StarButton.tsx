import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface StarButtonProps {
    targetId: string;
    creatorId: string;
    isLive: boolean;
}

export const StarButton: React.FC<StarButtonProps> = ({ targetId, creatorId, isLive }) => {
    const [isStarred, setIsStarred] = useState(false);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsStarred(!isStarred);
        // Add logic for saving star to Firestore here if needed in the future
    };

    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggle}
            className={`w-12 h-12 flex flex-col items-center justify-center rounded-full backdrop-blur-xl border transition-all ${
                isStarred 
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' 
                : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'
            }`}
        >
            <Star size={24} fill={isStarred ? "currentColor" : "none"} />
            <span className="text-[8px] font-black uppercase mt-0.5">تميز</span>
        </motion.button>
    );
};
