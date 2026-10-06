import React from 'react';
import { X, Mic, MicOff, UserX, ShieldCheck, Flag, Ban, MessageSquareOff } from 'lucide-react';

interface GuestMenuProps {
  onClose: () => void;
  guestId: string;
  isMuted: boolean;
  onToggleMute: (guestId: string) => void;
  onKickGuest: (guestId: string) => void;
  onReportGuest: (guestId: string) => void;
  onAddModerator: (guestId: string) => void;
  onBanGuest: (guestId: string) => void;
  lang?: string;
}

export const GuestMenu: React.FC<GuestMenuProps> = ({
  onClose,
  guestId,
  isMuted,
  onToggleMute,
  onKickGuest,
  onReportGuest,
  onAddModerator,
  onBanGuest,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  return (
    <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-slate-800 rounded-t-3xl p-6 w-full max-w-md shadow-lg animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{isAr ? 'خيارات الضيف' : 'Guest Options'}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-white"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <MenuItem icon={isMuted ? <MicOff size={24} /> : <Mic size={24} />} label={isMuted ? (isAr ? 'إلغاء كتم الصوت' : 'Unmute') : (isAr ? 'كتم الصوت' : 'Mute')} onClick={() => onToggleMute(guestId)} />
          <MenuItem icon={<UserX size={24} />} label={isAr ? 'طرد من LIVE' : 'Kick from LIVE'} onClick={() => onKickGuest(guestId)} />
          <MenuItem icon={<Flag size={24} />} label={isAr ? 'إبلاغ' : 'Report'} onClick={() => onReportGuest(guestId)} />
          <MenuItem icon={<ShieldCheck size={24} />} label={isAr ? 'إضافة مشرف' : 'Add Moderator'} onClick={() => onAddModerator(guestId)} />
          <MenuItem icon={<Ban size={24} />} label={isAr ? 'حظر دائم' : 'Permanent Ban'} onClick={() => onBanGuest(guestId)} />
        </div>
      </div>
    </div>
  );
};

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick }) => (
  <button className="flex flex-col items-center gap-2 text-white/80 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors" onClick={onClick}>
    <div className="bg-slate-700 p-3 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <span className="text-xs text-center">{label}</span>
  </button>
);
