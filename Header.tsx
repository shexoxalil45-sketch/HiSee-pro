import React from 'react';
import { MessageCircle, Bell } from 'lucide-react';
import ModernMessageIcon from './ModernMessageIcon';

interface HeaderProps {
  onNavigate: (tab: string) => void;
  totalSystemNotifications: number;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, totalSystemNotifications }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-2 sm:p-4 bg-gradient-to-b from-black/80 to-transparent">
      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => onNavigate('notifications')} className="text-white/80 hover:text-white p-1 relative">
          <Bell size={20} className="sm:w-6 sm:h-6" />
          {totalSystemNotifications > 0 && (
            <span className="absolute top-0 right-0 text-[clamp(6px,1.5vw,8px)] font-black text-white bg-red-500 rounded-full min-w-[12px] h-[12px] flex items-center justify-center shadow-sm">
              {totalSystemNotifications > 99 ? '99+' : totalSystemNotifications}
            </span>
          )}
        </button>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => onNavigate('chats')} className="text-white/80 hover:text-white p-1">
          <ModernMessageIcon size={20} className="sm:w-6 sm:h-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;
