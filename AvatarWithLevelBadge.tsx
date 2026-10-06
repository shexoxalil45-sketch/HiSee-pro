import React from 'react';
import { AvatarLevelBadge } from './AvatarLevelBadge';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';

interface AvatarWithLevelBadgeProps {
  avatarUrl: string;
  level: number;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const AvatarWithLevelBadge: React.FC<AvatarWithLevelBadgeProps> = ({
  avatarUrl,
  level,
  size = 48,
  className = '',
  onClick
}) => {
  const badgeSize = size * 0.4;
  return (
    <div className={`relative inline-block ${className}`} onClick={onClick}>
      <img
        src={normalizeMediaUrl(avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`}
        alt="Avatar"
        className="rounded-full object-cover border-2 border-white/20"
        style={{ width: size, height: size }}
      />
      {level > 0 && (
        <div className="absolute -top-1 -right-1 z-10">
          <AvatarLevelBadge level={level} size={badgeSize} />
        </div>
      )}
    </div>
  );
};
