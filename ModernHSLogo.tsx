import React, { useId } from 'react';

interface Props {
  size?: number;
  className?: string;
}

const ModernHSLogo: React.FC<Props> = ({ size, className }) => {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const gradId = `warmHarmoniousGrad_${safeId}`;
  const depthGradId = `warmDepthGrad_${safeId}`;
  const colGleamSoftId = `colGleamSoft_${safeId}`;
  const colGleamCoreId = `colGleamCore_${safeId}`;
  const sRidgeSoftId = `sRidgeSoft_${safeId}`;
  const sRidgeCoreId = `sRidgeCore_${safeId}`;
  const sSpineId = `sSpine_${safeId}`;
  const arrowHeadId = `arrowHead_${safeId}`;
  const backlightGlowId = `backlightGlow_${safeId}`;
  const backAmbientShadowId = `backAmbientShadow_${safeId}`;
  const frontDropShadowId = `frontDropShadow_${safeId}`;
  const backShardsId = `backShards_${safeId}`;
  const frontShardsId = `frontShards_${safeId}`;
  const sCharId = `sChar_${safeId}`;

  return (
    <svg
      width={size || "100%"}
      height={size || "100%"}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: 'visible', shapeRendering: 'geometricPrecision', textRendering: 'geometricPrecision' }}
    >
      <defs>
        {/* 1. Rich Harmonized Multi-Spectrum Metallic Gradient:
               Seamlessly unifies the 4 colors into a rich, deep, polished metallic alloy:
               - Lustrous White tip crests
               - Deep Emerald Jade & Fresh Light-Green/Mint accents
               - Imperial Gold & Bright Sun Yellow in the lower areas for crisp readability
               - Warm Burnished Golden Orange in the center waist without any raw or jarring red */}
        <linearGradient id={gradId} x1="18" y1="12" x2="110" y2="116" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1.0" />   {/* Lustrous White Tip Reflection */}
          <stop offset="4%" stopColor="#dcfce7" />                    {/* Crisp Mint Sheen */}
          <stop offset="10%" stopColor="#16a34a" />                   {/* Vibrant Emerald Jade */}
          <stop offset="20%" stopColor="#4d7c0f" />                   {/* Deep Forest-Olive Transition */}
          <stop offset="32%" stopColor="#854d0e" />                   {/* Polished Bronze */}
          <stop offset="42%" stopColor="#b45309" />                   {/* Deep Imperial Gold */}
          <stop offset="50%" stopColor="#d97706" />                   {/* Lustrous Golden Amber */}
          <stop offset="58%" stopColor="#ea580c" />                   {/* Warm Burnished Golden Orange (Enhanced Contrast) */}
          <stop offset="66%" stopColor="#d97706" />                   {/* Returning Golden Amber Warmth */}
          <stop offset="74%" stopColor="#eab308" />                   {/* Radiant Rich Gold */}
          <stop offset="83%" stopColor="#fde047" />                   {/* Bright Sunny Yellow for High Legibility */}
          <stop offset="90%" stopColor="#84cc16" />                   {/* Fresh Light Lime-Green Touch */}
          <stop offset="96%" stopColor="#4ade80" />                   {/* Fresh Light Green Whisper */}
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1.0" /> {/* Lustrous White Tip Reflection */}
        </linearGradient>

        {/* 2. Cohesive 3D Extrusion Depth Gradient:
               Accurately darkened tones for each metallic section (Deep Slate, Jade Shadow, Olive Bronze, Burnt Umber) */}
        <linearGradient id={depthGradId} x1="18" y1="12" x2="110" y2="116" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />                    {/* Deep Dark Base */}
          <stop offset="12%" stopColor="#064e3b" />                   {/* Deep Jade Shadow */}
          <stop offset="25%" stopColor="#1a2e05" />                   {/* Deep Forest-Olive Shadow */}
          <stop offset="42%" stopColor="#291303" />                   {/* Deep Bronze Umber Shadow */}
          <stop offset="59%" stopColor="#2e1005" />                   {/* Deep Burnt Terracotta Shadow */}
          <stop offset="73%" stopColor="#291303" />                   {/* Deep Bronze Umber Shadow */}
          <stop offset="86%" stopColor="#1a2e05" />                   {/* Deep Olive Shadow */}
          <stop offset="95%" stopColor="#064e3b" />                   {/* Deep Emerald Shadow */}
          <stop offset="100%" stopColor="#0f172a" />                  {/* Deep Dark Base */}
        </linearGradient>

        {/* 3. Column Specular Highlight Gradients:
               Razor-sharp precision glints strictly confined along the center spine of each column */}
        <linearGradient id={colGleamSoftId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
          <stop offset="20%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="80%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id={colGleamCoreId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
          <stop offset="20%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1.0" />
          <stop offset="80%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        {/* 4. Internal S-Curve Specular Glow & Core Gradients:
               Flows continuously inside the curvature of letter S towards the send arrow head */}
        <linearGradient id={sRidgeSoftId} x1="68" y1="14" x2="36" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="75%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id={sRidgeCoreId} x1="68" y1="14" x2="36" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1.0" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="1.0" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        {/* 5. Ambient White Backlight Glow Filter (Backlight Glow / Ambient Rim Light):
               Soft optical rim reflection facing the front light source,
               creating a gentle, subtle floating luminance on dark backgrounds */}
        <filter id={backlightGlowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
          <feOffset in="blur" dx="-0.6" dy="-0.8" result="offsetBlur" />
          <feFlood floodColor="#ffffff" floodOpacity="0.3" result="flood" />
          <feComposite in="flood" in2="offsetBlur" operator="in" />
        </filter>

        {/* 6. Deep Ambient Drop Shadow for Entire Logo Base */}
        <filter id={backAmbientShadowId} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="2.0" dy="2.6" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.7" />
        </filter>

        {/* 7. Directional Contact Shadow: Crisp, localized shadow where front shards cross over S */}
        <filter id={frontDropShadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1.0" dy="1.4" stdDeviation="1.0" floodColor="#000000" floodOpacity="0.7" />
        </filter>

        {/* Back Shards: Top-Left Shard and Bottom-Right Shard (Placed behind letter S) */}
        <g id={backShardsId}>
          {/* Top-Left Shard (العمود الأيسر العلوي) */}
          <path 
            d="M 26 10 L 54 10 L 48 62 L 34 62 Z" 
            fill={`url(#${gradId})`}
          />
          {/* Bottom-Right Shard (العمود الأيمن السفلي) */}
          <path 
            d="M 74 118 L 102 118 L 94 66 L 80 66 Z" 
            fill={`url(#${gradId})`}
          />
        </g>

        {/* Front Shards: Top-Right Shard and Bottom-Left Shard (Placed in front of letter S) */}
        <g id={frontShardsId}>
          {/* Top-Right Shard (العمود الأيمن العلوي - يعبر فوق الجزء العلوي من حرف S) */}
          <path 
            d="M 80 62 L 94 62 L 102 10 L 74 10 Z" 
            fill={`url(#${gradId})`}
          />
          {/* Bottom-Left Shard (العمود الأيسر السفلي - يعبر فوق الجزء السفلي من حرف S) */}
          <path 
            d="M 34 66 L 48 66 L 54 118 L 26 118 Z" 
            fill={`url(#${gradId})`}
          />
        </g>

        {/* Letter S Path Definition */}
        <path
          id={sCharId}
          d="M 92 28 C 72 4, 38 10, 38 36 C 38 60, 90 60, 90 92 C 90 118, 56 124, 36 100"
          fill="none"
        />

        {/* Letter S Internal Spine Highlight Path terminating smoothly into the Send Arrow Head */}
        <path
          id={sSpineId}
          d="M 36 100 C 56 124, 90 118, 90 92 C 90 60, 38 60, 38 36 C 38.00 20.40, 50.24 12.00, 65.50 13.10"
          fill="none"
        />

        {/* Integrated Triangular Send Arrow Head in Upper Curve (رمز الإرسال والمراسلة والوصول) - Optically optimized for crisp rendering at tiny scales */}
        <path
          id={arrowHeadId}
          d="M 72.00 13.50 L 63.80 16.20 L 65.10 9.20 Z"
        />
      </defs>

      {/* Main Logo Graphic Group */}
      <g>
        {/* ========================================================================= */}
        {/* 0. AMBIENT BACKLIGHT GLOW / RIM LIGHT: Soft white aura behind 3D base    */}
        {/* ========================================================================= */}
        <g id="backlight-rim-glow" filter={`url(#${backlightGlowId})`}>
          <use href={`#${backShardsId}`} />
          <use 
            href={`#${sCharId}`} 
            stroke="white" 
            strokeWidth="22.0" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <use href={`#${frontShardsId}`} />
        </g>
        {/* ========================================================================= */}
        {/* 1. BACK ELEMENTS: Top-Left & Bottom-Right Shards behind letter S          */}
        {/* ========================================================================= */}
        <g id="back-shards-group" filter={`url(#${backAmbientShadowId})`}>
          {/* Solid 4-tier 3D Extrusion Wall for Bold Volume */}
          <g transform="translate(2.8, 3.4)">
            <use 
              href={`#${backShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="3.0" 
              strokeLinejoin="round" 
            />
          </g>
          <g transform="translate(2.1, 2.5)">
            <use 
              href={`#${backShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="2.4" 
              strokeLinejoin="round" 
            />
          </g>
          <g transform="translate(1.4, 1.7)">
            <use 
              href={`#${backShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="2.0" 
              strokeLinejoin="round" 
            />
          </g>
          <g transform="translate(0.7, 0.8)">
            <use 
              href={`#${backShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="1.6" 
              strokeLinejoin="round" 
            />
          </g>

          {/* Crisp Anti-aliased White Outline on Front Face */}
          <use 
            href={`#${backShardsId}`} 
            stroke="white" 
            strokeWidth="2.4" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />
          {/* Front gradient face */}
          <use href={`#${backShardsId}`} />

          {/* Specular Highlights strictly in the Center of Back Columns */}
          {/* Top-Left Column Center Specular Ridge */}
          <line 
            x1="40" 
            y1="18" 
            x2="41" 
            y2="54" 
            stroke={`url(#${colGleamSoftId})`} 
            strokeWidth="2.6" 
            strokeLinecap="round" 
          />
          <line 
            x1="40" 
            y1="18" 
            x2="41" 
            y2="54" 
            stroke={`url(#${colGleamCoreId})`} 
            strokeWidth="1.3" 
            strokeLinecap="round" 
          />

          {/* Bottom-Right Column Center Specular Ridge */}
          <line 
            x1="88" 
            y1="74" 
            x2="87" 
            y2="110" 
            stroke={`url(#${colGleamSoftId})`} 
            strokeWidth="2.6" 
            strokeLinecap="round" 
          />
          <line 
            x1="88" 
            y1="74" 
            x2="87" 
            y2="110" 
            stroke={`url(#${colGleamCoreId})`} 
            strokeWidth="1.3" 
            strokeLinecap="round" 
          />
        </g>

        {/* ========================================================================= */}
        {/* 2. MIDDLE ELEMENT: Letter S on top of the back shards                     */}
        {/* ========================================================================= */}
        <g id="middle-s-group">
          {/* S Solid 4-tier 3D Extrusion Wall for Bold Volume */}
          <use
            href={`#${sCharId}`}
            transform="translate(2.8, 3.4)"
            stroke={`url(#${depthGradId})`}
            strokeWidth="21.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <use
            href={`#${sCharId}`}
            transform="translate(2.1, 2.5)"
            stroke={`url(#${depthGradId})`}
            strokeWidth="21.0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <use
            href={`#${sCharId}`}
            transform="translate(1.4, 1.7)"
            stroke={`url(#${depthGradId})`}
            strokeWidth="20.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <use
            href={`#${sCharId}`}
            transform="translate(0.7, 0.8)"
            stroke={`url(#${depthGradId})`}
            strokeWidth="20.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Letter S crisp anti-aliased white outer border */}
          <use
            href={`#${sCharId}`}
            stroke="white"
            strokeWidth="22.0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Letter S warm gradient stroke */}
          <use
            href={`#${sCharId}`}
            stroke={`url(#${gradId})`}
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Internal Flowing S-Curves & Highlights with Send Arrow Head:
              Flowing smoothly along the curvature of the S spine, safely enclosed within the 20px body
              without leaking into black negative spaces, seamlessly culminating in the send arrow head */}
          {/* Soft Specular Glow Layer */}
          <use
            href={`#${sSpineId}`}
            stroke={`url(#${sRidgeSoftId})`}
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <use
            href={`#${arrowHeadId}`}
            fill="white"
            stroke="white"
            strokeWidth="2.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.45"
          />

          {/* Crisp Crystal Core Gleam Layer */}
          <use
            href={`#${sSpineId}`}
            stroke={`url(#${sRidgeCoreId})`}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <use
            href={`#${arrowHeadId}`}
            fill="white"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>

        {/* ========================================================================= */}
        {/* 3. FRONT ELEMENTS: Top-Right & Bottom-Left Shards on top of letter S      */}
        {/* ========================================================================= */}
        <g id="front-shards-group" filter={`url(#${frontDropShadowId})`}>
          {/* Solid 4-tier 3D Extrusion Wall for Bold Volume */}
          <g transform="translate(2.8, 3.4)">
            <use 
              href={`#${frontShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="3.0" 
              strokeLinejoin="round" 
            />
          </g>
          <g transform="translate(2.1, 2.5)">
            <use 
              href={`#${frontShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="2.4" 
              strokeLinejoin="round" 
            />
          </g>
          <g transform="translate(1.4, 1.7)">
            <use 
              href={`#${frontShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="2.0" 
              strokeLinejoin="round" 
            />
          </g>
          <g transform="translate(0.7, 0.8)">
            <use 
              href={`#${frontShardsId}`} 
              fill={`url(#${depthGradId})`} 
              stroke={`url(#${depthGradId})`} 
              strokeWidth="1.6" 
              strokeLinejoin="round" 
            />
          </g>

          {/* Crisp Anti-aliased White Outline on Front Face */}
          <use 
            href={`#${frontShardsId}`} 
            stroke="white" 
            strokeWidth="2.4" 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />
          {/* Front gradient face */}
          <use href={`#${frontShardsId}`} />

          {/* Specular Highlights strictly in the Center of Front Columns */}
          {/* Top-Right Column Center Specular Ridge */}
          <line 
            x1="88" 
            y1="18" 
            x2="87" 
            y2="54" 
            stroke={`url(#${colGleamSoftId})`} 
            strokeWidth="2.6" 
            strokeLinecap="round" 
          />
          <line 
            x1="88" 
            y1="18" 
            x2="87" 
            y2="54" 
            stroke={`url(#${colGleamCoreId})`} 
            strokeWidth="1.3" 
            strokeLinecap="round" 
          />

          {/* Bottom-Left Column Center Specular Ridge */}
          <line 
            x1="40" 
            y1="74" 
            x2="41" 
            y2="110" 
            stroke={`url(#${colGleamSoftId})`} 
            strokeWidth="2.6" 
            strokeLinecap="round" 
          />
          <line 
            x1="40" 
            y1="74" 
            x2="41" 
            y2="110" 
            stroke={`url(#${colGleamCoreId})`} 
            strokeWidth="1.3" 
            strokeLinecap="round" 
          />
        </g>
      </g>
    </svg>
  );
};

export default ModernHSLogo;

