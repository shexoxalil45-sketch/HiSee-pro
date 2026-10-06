import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Sparkles, Play } from 'lucide-react';

export interface VideoStarNotification {
  id: string;
  videoId: string;
  videoTitle?: string;
  thumbnail?: string;
  starEarnedAt?: any;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  seen?: boolean;
  status?: string;
}

interface VideoStarAlertModalProps {
  notification: VideoStarNotification | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoStarAlertModal: React.FC<VideoStarAlertModalProps> = ({
  notification,
  isOpen,
  onClose
}) => {
  if (!notification) return null;

  const supporterName = notification.fromUserName || 'مُعجب دافع';
  const supporterAvatar = notification.fromUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.fromUserId || 'supporter'}`;
  const videoTitle = notification.videoTitle || 'فيديو خاص بك';
  const thumbnail = notification.thumbnail;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.85, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 25 }}
            className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-400/40 rounded-[2.5rem] p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden"
          >
            {/* Background Glow Effect */}
            <div className="absolute -top-16 -left-16 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer z-10"
            >
              <X size={16} />
            </button>

            {/* Header / Badge */}
            <div className="flex flex-col items-center justify-center mb-4 pt-2">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-bounce">
                  <Star size={34} className="fill-slate-950 text-slate-950" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full border border-slate-950">
                  <Sparkles size={12} className="animate-spin" />
                </div>
              </div>

              <h2 className="text-xl font-black text-white mb-1">نجمة جديدة للفيديو! 🌟</h2>
              <p className="text-xs text-amber-300/90 font-medium">
                حصل فيديو الخاص بك على دعم بنجمة ذهبية جديدة
              </p>
            </div>

            {/* Video Thumbnail Card */}
            <div className="bg-white/5 border border-amber-400/20 rounded-2xl p-3 mb-5 flex items-center gap-3 text-right relative overflow-hidden">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                {thumbnail && !thumbnail.endsWith('.mp4') ? (
                  <img
                    src={thumbnail}
                    alt={videoTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/40 to-slate-900">
                    <Play size={20} className="text-amber-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-amber-400/80 flex items-center justify-center shadow">
                    <Play size={10} className="fill-slate-950 text-slate-950 ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate mb-1.5">
                  {videoTitle}
                </p>
                <div className="flex items-center gap-2">
                  <img
                    src={supporterAvatar}
                    alt={supporterName}
                    className="w-5 h-5 rounded-full object-cover bg-slate-700 border border-amber-400/30"
                  />
                  <span className="text-[11px] text-slate-300 truncate font-semibold">
                    داعمك: <span className="text-amber-400 font-bold">{supporterName}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-950/40 cursor-pointer text-sm"
            >
              شكرًا ودعم القناة 🌟
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
