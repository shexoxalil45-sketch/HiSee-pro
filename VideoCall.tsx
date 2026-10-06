import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useUsers } from '../src/contexts/UserContext';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';

interface VideoCallProps {
  callId: string;
  participants: string[];
  onEndCall: () => void;
  myId: string;
}

export const VideoCall: React.FC<VideoCallProps> = ({ callId, participants, onEndCall, myId }) => {
  const { users } = useUsers();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Grid layout calculation
  const getGridClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    return 'grid-cols-2';
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-[5000] flex flex-col animate-in fade-in duration-500">
      <div className={`flex-1 grid ${getGridClass(participants.length)} gap-4 p-4 pb-24`}>
        {participants.map((participantId) => {
          const user = users[participantId];
          const name = participantId === myId ? 'أنا' : (user?.name || 'مستخدم');
          
          // Improved avatar resolution logic
          const userAvatar = user?.avatar || user?.photoURL;
          const avatar = normalizeMediaUrl(userAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantId || 'user'}`;
          
          return (
            <div key={participantId} className="relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-white/5 group">
              <img 
                src={avatar} 
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-125" 
                alt="" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantId || 'fallback'}`;
                }}
              />
              <div className="relative z-10 flex flex-col items-center">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-blue-500 shadow-2xl mb-4 relative"
                >
                    <img 
                      src={avatar} 
                      className="w-full h-full rounded-full object-cover border-4 border-slate-900" 
                      alt={name} 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantId || 'avatar'}`;
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-900" />
                </motion.div>
                <h3 className="text-white text-xl font-black drop-shadow-lg">{name}</h3>
                <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full backdrop-blur-md">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-white/60 text-[10px] uppercase tracking-widest font-black">جاري الاتصال...</span>
                </div>
              </div>
              
              <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-2xl border border-white/10 transform transition-transform group-hover:scale-105">
                <span className="text-white text-[11px] font-black">{name}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="fixed bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-center gap-8 z-[5001]">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 border ${isMuted ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button 
          onClick={onEndCall} 
          className="w-20 h-20 rounded-full bg-red-600 text-white shadow-[0_0_50px_rgba(220,38,38,0.3)] hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center border-4 border-black ring-4 ring-red-600/20"
        >
          <PhoneOff size={32} />
        </button>
        
        <button 
          onClick={() => setIsVideoOff(!isVideoOff)} 
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 border ${isVideoOff ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
      </div>
    </div>
  );
};
