import React from 'react';

interface AvatarLevelBadgeProps {
  level: number;
  size?: number;
  className?: string;
}

export const AvatarLevelBadge: React.FC<AvatarLevelBadgeProps> = ({
  level,
  size = 24,
  className = ''
}) => {
  // Rule: Strictly block badge when level is 0 or less
  if (!level || level <= 0) return null;

  const effectiveLevel = Math.min(6, Math.max(1, level));
  const gradFillId = `avatarBadgeFillGrad_${effectiveLevel}`;
  const gradOutlineId = `avatarBadgeOutlineGrad_${effectiveLevel}`;

  const renderBadgePath = () => {
    switch (effectiveLevel) {
      case 1:
        // المستوى 1: النجمة الذهبية المعتمدة
        return (
          <g>
            <path
              d="M24 4.5 C24.5 4.5 24.9 4.8 25.1 5.3 L29.5 16.2 C29.7 16.6 30.1 16.9 30.6 17 L42.3 17.8 C42.8 17.8 43.3 18.2 43.4 18.7 C43.5 19.2 43.3 19.7 42.9 20 L33.9 27 C33.5 27.3 33.3 27.8 33.4 28.3 L36.2 39.8 C36.3 40.3 36.1 40.8 35.7 41.1 C35.3 41.3 34.8 41.3 34.4 41 L24.6 34.8 C24.2 34.5 23.8 34.5 23.4 34.8 L13.6 41 C13.2 41.3 12.7 41.3 12.3 41.1 C11.9 40.8 11.7 40.3 11.8 39.8 L14.6 28.3 C14.7 27.8 14.5 27.3 14.1 27 L5.1 20 C4.7 19.7 4.5 19.2 4.6 18.7 C4.7 18.2 5.2 17.8 5.7 17.8 L17.4 17 C17.9 16.9 18.3 16.6 18.5 16.2 L22.9 5.3 C23.1 4.8 23.5 4.5 24 4.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center Heart Level Number */}
            <circle cx="24" cy="24" r="7.5" fill="#1E293B" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <text
              x="24"
              y="27.5"
              textAnchor="middle"
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="#FDE047"
              className="select-none"
            >
              1
            </text>
          </g>
        );

      case 2:
        // المستوى 2: النجمة المزدوجة المعتمدة
        return (
          <g>
            {/* Outer 8-point Faceted Diamond Star Frame */}
            <path
              d="M24 2 L28.5 13.5 L40 14.5 L31 22 L34.5 33.5 L24 26.5 L13.5 33.5 L17 22 L8 14.5 L19.5 13.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="2" r="1.5" fill="#FEF08A" />
            <circle cx="40" cy="14.5" r="1.5" fill="#FEF08A" />
            <circle cx="34.5" cy="33.5" r="1.5" fill="#FEF08A" />
            <circle cx="13.5" cy="33.5" r="1.5" fill="#FEF08A" />
            <circle cx="8" cy="14.5" r="1.5" fill="#FEF08A" />

            {/* Inner Nested Sharp Star */}
            <path
              d="M24 8.5 L27 16.5 L35.5 17 L29 22 L31.5 30 L24 25.2 L16.5 30 L19 22 L12.5 17 L21 16.5 Z"
              fill="#1E293B"
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center Heart Level Number */}
            <circle cx="24" cy="23.5" r="7" fill="#0F172A" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <text
              x="24"
              y="27"
              textAnchor="middle"
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="#FDE047"
              className="select-none"
            >
              2
            </text>
          </g>
        );

      case 3:
        // المستوى 3: النجمة الذهبية بالأجنحة
        return (
          <g>
            {/* Left Wing */}
            <path
              d="M16 23 C11 18 6 16 1.5 17 C0.8 17.2 0.5 17.9 0.8 18.5 C2.5 22.5 5.5 25.5 10 27.5 C13 28.5 15.5 28.5 17 28.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 16 C10 10.5 4.5 8.5 0.5 9.5 C0 9.7 -0.2 10.3 0.1 10.8 C2 15 5.5 18.5 10.5 20.5 C13 21.5 14.8 22 15.5 22.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right Wing */}
            <path
              d="M32 23 C37 18 42 16 46.5 17 C47.2 17.2 47.5 17.9 47.2 18.5 C45.5 22.5 42.5 25.5 38 27.5 C35 28.5 32.5 28.5 31 28.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M33 16 C38 10.5 43.5 8.5 47.5 9.5 C48 9.7 48.2 10.3 47.9 10.8 C46 15 42.5 18.5 37.5 20.5 C35 21.5 33.2 22 32.5 22.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center Star */}
            <path
              d="M24 7.5 L27.2 16.5 L36.8 17 L29.2 22.8 L32 32 L24 26.5 L16 32 L18.8 22.8 L11.2 17 L20.8 16.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center Heart Level Number */}
            <circle cx="24" cy="23.5" r="7" fill="#1E293B" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <text
              x="24"
              y="27"
              textAnchor="middle"
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="#FDE047"
              className="select-none"
            >
              3
            </text>
          </g>
        );

      case 4:
        // المستوى 4: النجمة المزدوجة بالأجنحة البراقة
        return (
          <g>
            {/* Left Majestic Tiered Wings */}
            <path
              d="M15 10 C9.5 4 4.5 2 0.8 3 C0.2 3.2 -0.1 3.9 0.1 4.5 C2.2 9.5 6.5 14 13 17 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.6}
            />
            <path
              d="M16 16.5 C10.5 11 6 10 2 11 C1.4 11.2 1.1 11.8 1.3 12.4 C3.5 16.5 7.5 20 13.5 22.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.6}
            />
            <path
              d="M17 23 C12 19.5 8 18.5 4 19.5 C3.4 19.7 3.2 20.3 3.4 20.9 C5.5 24.5 9 27 14.5 28.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.6}
            />
            {/* Right Majestic Tiered Wings */}
            <path
              d="M33 10 C38.5 4 43.5 2 47.2 3 C47.8 3.2 48.1 3.9 47.9 4.5 C45.8 9.5 41.5 14 35 17 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.6}
            />
            <path
              d="M32 16.5 C37.5 11 42 10 46 11 C46.6 11.2 46.9 11.8 46.7 12.4 C44.5 16.5 40.5 20 34.5 22.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.6}
            />
            <path
              d="M31 23 C36 19.5 40 18.5 44 19.5 C44.6 19.7 44.8 20.3 44.6 20.9 C42.5 24.5 39 27 33.5 28.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.6}
            />
            {/* Radiant Sparkles */}
            <circle cx="24" cy="3" r="1.8" fill="#FEF08A" />
            <circle cx="14" cy="7" r="1.2" fill="#FEF08A" />
            <circle cx="34" cy="7" r="1.2" fill="#FEF08A" />
            {/* Outer Star */}
            <path
              d="M24 6 L27.2 14.5 L36.5 16.5 L29.5 23 L31.5 32.5 L24 27 L16.5 32.5 L18.5 23 L11.5 16.5 L20.8 14.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center Heart Level Number */}
            <circle cx="24" cy="23.5" r="7" fill="#1E293B" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <text
              x="24"
              y="27"
              textAnchor="middle"
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="#FDE047"
              className="select-none"
            >
              4
            </text>
          </g>
        );

      case 5:
        // المستوى 5: وسام التاج الملكي الإمبراطوري
        return (
          <g>
            {/* Crown Base Rim */}
            <rect
              x="7"
              y="34"
              width="34"
              height="7.5"
              rx="3"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.8}
            />
            {/* Gemstones on Rim */}
            <circle cx="13" cy="37.8" r="1.6" fill="#EF4444" stroke="#FFF" strokeWidth={0.6} />
            <circle cx="24" cy="37.8" r="2" fill="#38BDF8" stroke="#FFF" strokeWidth={0.6} />
            <circle cx="35" cy="37.8" r="1.6" fill="#10B981" stroke="#FFF" strokeWidth={0.6} />

            {/* Royal Crown Peaks & Arches */}
            <path
              d="M8.5 34 L5 16.5 L15 25 L24 8.5 L33 25 L43 16.5 L39.5 34 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Pearl Orb Tips */}
            <circle cx="5" cy="15.5" r="2.2" fill="#FEF08A" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <circle cx="15" cy="24" r="1.8" fill="#FEF08A" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <circle cx="24" cy="7.5" r="3" fill="#FEF08A" stroke={`url(#${gradOutlineId})`} strokeWidth={1.2} />
            <circle cx="33" cy="24" r="1.8" fill="#FEF08A" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <circle cx="43" cy="15.5" r="2.2" fill="#FEF08A" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />

            {/* Crown Center Medallion with Level 5 */}
            <circle cx="24" cy="26" r="6" fill="#1E293B" stroke={`url(#${gradOutlineId})`} strokeWidth={1} />
            <text
              x="24"
              y="29.2"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="#FDE047"
              className="select-none"
            >
              5
            </text>
          </g>
        );

      case 6:
        // المستوى 6: الوسام الأسطوري الملوكي (مع علامة الاستفهام المتوهجة)
        return (
          <g>
            {/* Arcane Crest Shield / Mythic Aura */}
            <path
              d="M24 2.5 C34.5 2.5 44 8.5 44 19 C44 31.5 32.5 41 24 45.5 C15.5 41 4 31.5 4 19 C4 8.5 13.5 2.5 24 2.5 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Inner Arcane Rune Border */}
            <path
              d="M24 7 C31.5 7 38.5 11 38.5 19.5 C38.5 29 29.5 36.5 24 40.5 C18.5 36.5 9.5 29 9.5 19.5 C9.5 11 16.5 7 24 7 Z"
              fill="#1E293B"
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.5}
              strokeDasharray="3 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Mythic Crest Horns */}
            <path
              d="M13 9.5 C7.5 4.5 3.5 5.5 1.5 8 C4.5 12 8.5 14 13 14 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.5}
            />
            <path
              d="M35 9.5 C40.5 4.5 44.5 5.5 46.5 8 C43.5 12 39.5 14 35 14 Z"
              fill={`url(#${gradFillId})`}
              stroke={`url(#${gradOutlineId})`}
              strokeWidth={1.5}
            />
            {/* Center Glowing Mythic Question Mark "?" */}
            <text
              x="24"
              y="28.5"
              textAnchor="middle"
              fontSize="21"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="#FDE047"
              stroke="#78350F"
              strokeWidth={1}
              className="select-none tracking-tighter"
            >
              ?
            </text>
            <circle cx="24" cy="33.5" r="2" fill="#FDE047" />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className={`relative flex items-center justify-center filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] transition-all ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <defs>
          {/* Rich Golden Liquid Gradient */}
          <linearGradient id={gradFillId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="25%" stopColor="#B45309" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#FFFBEB" />
          </linearGradient>

          {/* High Contrast Golden Outline Gradient */}
          <linearGradient id={gradOutlineId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="50%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>

        {renderBadgePath()}
      </svg>
    </div>
  );
};

export default AvatarLevelBadge;
