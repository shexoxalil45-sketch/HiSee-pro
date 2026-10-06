import React, { useId } from 'react';

interface HiSeeCoinIconProps {
  size?: number;
  className?: string;
}

const HiSeeCoinIcon: React.FC<HiSeeCoinIconProps> = ({ size = 24, className = "" }) => {
  const uniqueId = useId().replace(/:/g, '-');
  
  const rimGradientId = `rimGradient-${uniqueId}`;
  const faceGradientId = `faceGradient-${uniqueId}`;
  const embossColorId = `embossColor-${uniqueId}`;
  const shadowColor = "#512000";
  const topTextId = `topText-${uniqueId}`;
  const bottomTextId = `bottomText-${uniqueId}`;
  const backShardsId = `coinBackShards-${uniqueId}`;
  const frontShardsId = `coinFrontShards-${uniqueId}`;
  const sCharId = `coinSChar-${uniqueId}`;
  const sSpineId = `coinSSpine-${uniqueId}`;
  const arrowHeadId = `coinArrowHead-${uniqueId}`;

  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 group ${className}`} style={{ width: size, height: size, isolation: 'isolate' }}>
        
        <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
          <defs>
            {/* Base Rim Gradient for metallic depth */}
            <linearGradient id={rimGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FAC34B" />
              <stop offset="25%" stopColor="#FFEAA7" />
              <stop offset="50%" stopColor="#DF9E28" />
              <stop offset="75%" stopColor="#8A5A19" />
              <stop offset="100%" stopColor="#F9D423" />
            </linearGradient>
  
            {/* Inner Face Radiant Gold */}
            <radialGradient id={faceGradientId} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFF2A8" />
              <stop offset="30%" stopColor="#F5A623" />
              <stop offset="70%" stopColor="#E27C00" />
              <stop offset="100%" stopColor="#8A4A00" />
            </radialGradient>
  
            {/* Text and Emblem Bevel/Shine */}
            <linearGradient id={embossColorId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFEE2" />
              <stop offset="40%" stopColor="#FFD25E" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
  
            {/* Text paths for circular text wrapping */}
            <path id={topTextId} d="M 23,60 A 37,37 0 0,1 97,60" fill="none" />
            <path id={bottomTextId} d="M 23,60 A 37,37 0 0,0 97,60" fill="none" />

            {/* New Modern HS Emblem Geometries (Interlocking Monogram) */}
            <g id={backShardsId}>
              <path d="M 26 10 L 54 10 L 48 62 L 34 62 Z" />
              <path d="M 74 118 L 102 118 L 94 66 L 80 66 Z" />
            </g>

            <g id={frontShardsId}>
              <path d="M 80 62 L 94 62 L 102 10 L 74 10 Z" />
              <path d="M 34 66 L 48 66 L 54 118 L 26 118 Z" />
            </g>

            <path
              id={sCharId}
              d="M 92 28 C 72 4, 38 10, 38 36 C 38 60, 90 60, 90 92 C 90 118, 56 124, 36 100"
            />

            <path
              id={sSpineId}
              d="M 36 100 C 56 124, 90 118, 90 92 C 90 60, 38 60, 38 36 C 38.00 20.40, 50.24 12.00, 65.50 13.10"
            />

            <path
              id={arrowHeadId}
              d="M 70.80 14.04 L 64.70 16.06 L 65.70 10.14 Z"
            />
          </defs>
  
          {/* Outer Rim */}
          <circle cx="60" cy="60" r="58" fill={`url(#${rimGradientId})`} />
          
          {/* Rim Inner Edge (Bevel Profile) */}
          <circle cx="60" cy="60" r="53.5" fill="none" stroke="#7B3A00" strokeWidth="1.5" opacity="0.6" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#FFF2A8" strokeWidth="1" opacity="0.5" />
          
          {/* Inner Coin Face */}
          <circle cx="60" cy="60" r="51.5" fill={`url(#${faceGradientId})`} />
          
          {/* Inner Face Bevel Shadow (Layered Circle) */}
          <circle cx="60" cy="60" r="51.5" fill="none" stroke="#512000" strokeWidth="2.5" opacity="0.45" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="#FFF2A8" strokeWidth="1" opacity="0.25" />
  
          {/* Decorative Dotted Ring */}
          <circle cx="60" cy="60" r="47" fill="none" stroke="#FFF2A8" strokeWidth="1.5" strokeDasharray="3,3.5" opacity="0.75" />
  
          {/* 3D Embossed Texts and Central Emblem (Simulated via layered vector offsets for 100% compatibility in WebRTC/GPU containers) */}
          
          {/* LAYER 1: Deep Drop Shadow (shifted by 1px right, 1.5px down) */}
          <g transform="translate(1, 1.5)" opacity="0.9">
              {/* Top Text: HISEE APP */}
              <text fill={shadowColor} fontSize="13" fontWeight="900" letterSpacing="1.5" fontFamily="Arial, sans-serif">
                 <textPath href={`#${topTextId}`} startOffset="50%" textAnchor="middle">HISEE APP</textPath>
              </text>
              
              {/* Bottom Text: PREMIUM STARS */}
              <text fill={shadowColor} fontSize="9" fontWeight="800" letterSpacing="5" fontFamily="Arial, sans-serif">
                 <textPath href={`#${bottomTextId}`} startOffset="50%" textAnchor="middle">★★★★★</textPath>
              </text>
              
              {/* Central Emblem - Modern HS Interlocking Monogram (Deep Shadow) */}
              <g transform="translate(60, 60) scale(0.33) translate(-64, -64)">
                 <use href={`#${backShardsId}`} fill={shadowColor} />
                 <use 
                   href={`#${sCharId}`} 
                   fill="none" 
                   stroke={shadowColor} 
                   strokeWidth="21" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                 />
                 <use href={`#${frontShardsId}`} fill={shadowColor} />
              </g>
          </g>

          {/* LAYER 2: Foreground Face (Golden bevel) */}
          <g>
              {/* Top Text: HISEE APP */}
              <text fill={`url(#${embossColorId})`} fontSize="13" fontWeight="900" letterSpacing="1.5" fontFamily="Arial, sans-serif">
                 <textPath href={`#${topTextId}`} startOffset="50%" textAnchor="middle">HISEE APP</textPath>
              </text>
              
              {/* Bottom Text: PREMIUM STARS */}
              <text fill={`url(#${embossColorId})`} fontSize="9" fontWeight="800" letterSpacing="5" fontFamily="Arial, sans-serif">
                 <textPath href={`#${bottomTextId}`} startOffset="50%" textAnchor="middle">★★★★★</textPath>
              </text>
              
              {/* Central Emblem - Modern HS Interlocking Monogram (Minted Pure Gold) */}
              <g transform="translate(60, 60) scale(0.33) translate(-64, -64)">
                 {/* 1. Back Shards (Top-Left and Bottom-Right Shards behind S) */}
                 <use 
                   href={`#${backShardsId}`} 
                   fill={`url(#${embossColorId})`} 
                   stroke="#FFFEE2" 
                   strokeWidth="1.2" 
                   strokeLinejoin="round" 
                 />
                 {/* Center column specular gleams in bright gold */}
                 <line x1="40" y1="18" x2="41" y2="54" stroke="#FFFEE2" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
                 <line x1="88" y1="74" x2="87" y2="110" stroke="#FFFEE2" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />

                 {/* 2. Middle Letter S (Intertwined across the H pillars) */}
                 {/* Subtle bevel contour */}
                 <use 
                   href={`#${sCharId}`} 
                   fill="none" 
                   stroke="#FFFEE2" 
                   strokeWidth="21.6" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                   opacity="0.6" 
                 />
                 {/* Main S Gold Body */}
                 <use 
                   href={`#${sCharId}`} 
                   fill="none" 
                   stroke={`url(#${embossColorId})`} 
                   strokeWidth="20" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                 />
                 {/* S Spine Highlight in radiant gold */}
                 <use 
                   href={`#${sSpineId}`} 
                   fill="none" 
                   stroke="#FFFEE2" 
                   strokeWidth="2.8" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                   opacity="0.85" 
                 />
                 {/* Send Arrow Head in bright gold */}
                 <use 
                   href={`#${arrowHeadId}`} 
                   fill="#FFFEE2" 
                   stroke="#FFFEE2" 
                   strokeWidth="1.2" 
                   strokeLinejoin="round" 
                   strokeLinecap="round" 
                   opacity="0.95" 
                 />

                 {/* 3. Front Shards (Top-Right and Bottom-Left Shards in front of S) */}
                 {/* Minted contact drop shadow where front pillars cross over S */}
                 <g transform="translate(1, 1.4)" opacity="0.45">
                   <use href={`#${frontShardsId}`} fill={shadowColor} />
                 </g>
                 {/* Front Shards Gold Face */}
                 <use 
                   href={`#${frontShardsId}`} 
                   fill={`url(#${embossColorId})`} 
                   stroke="#FFFEE2" 
                   strokeWidth="1.2" 
                   strokeLinejoin="round" 
                 />
                 {/* Center column specular gleams in bright gold */}
                 <line x1="88" y1="18" x2="87" y2="54" stroke="#FFFEE2" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
                 <line x1="40" y1="74" x2="41" y2="110" stroke="#FFFEE2" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
              </g>
          </g>
        </svg>
        
        {/* Light Shine Effect resolving on hover or pulsing */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:scale-105 transition-all duration-300 pointer-events-none transform -rotate-45"></div>
        
    </div>
  );
};

export default HiSeeCoinIcon;
