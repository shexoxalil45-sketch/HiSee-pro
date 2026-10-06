import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, UserPlus, Circle, RefreshCw, Users } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';

interface Participant {
  id: string;
  name: string;
  avatar: string;
}

interface RoomGroup {
  roomId: string;
  participants: Participant[];
  isLive: boolean;
}

interface InviteToLiveMenuProps {
  onClose: () => void;
  onInvite: (user: any) => void;
  lang?: string;
  viewers?: any[];
  currentRoomId?: string | null;
  activeGuests?: any[];
}

/**
 * مكون قائمة الدعوات المحدث - يجمع المشاركين في الغرفة ببطاقة موحدة
 * يضمن عرض جميع أعضاء الغرفة كمشاركين متساوين في شبكة (2x2)
 */
export const InviteToLiveMenu: React.FC<InviteToLiveMenuProps> = ({ 
  onClose, 
  onInvite, 
  lang = 'ar', 
  currentRoomId, 
  activeGuests = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlineRooms, setOnlineRooms] = useState<RoomGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  const isAr = lang === 'ar';
  const currentUserId = auth.currentUser?.uid;

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const fetchLiveRooms = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'live_rooms'),
        where('status', 'in', ['live', 'active'])
      );
      const snapshot = await getDocs(q);
      const now = Date.now();

      // Collect all participant IDs to fetch their real profile images in one go
      const allUserIds = new Set<string>();
      snapshot.docs.forEach(d => {
        const data = d.data();
        const hostId = data.hostId || data.uid;
        if (hostId) allUserIds.add(hostId);
        if (Array.isArray(data.activeGuests)) {
          data.activeGuests.forEach((g: any) => {
            const gid = g.uid || g.id;
            if (gid) allUserIds.add(gid);
          });
        }
      });

      // Fetch user profile docs
      const userProfilesMap: Record<string, any> = {};
      const userIdsList = Array.from(allUserIds);
      if (userIdsList.length > 0) {
        // Query users collection in batches of 10
        for (let i = 0; i < userIdsList.length; i += 10) {
          const batchUids = userIdsList.slice(i, i + 10);
          try {
            const usersQ = query(collection(db, 'users'), where('__name__', 'in', batchUids));
            const usersSnap = await getDocs(usersQ);
            usersSnap.docs.forEach(uDoc => {
              userProfilesMap[uDoc.id] = uDoc.data();
            });
          } catch (e) {
            console.warn("Error fetching user profiles for invite menu:", e);
          }
        }
      }

      const rooms = snapshot.docs
        .map((doc): RoomGroup | null => {
          const data = doc.data();
          const hostId = data.hostId || data.uid;
          if (!hostId) return null;
          
          // Filter out stale/ghost streams (35s inactivity threshold)
          const lastActiveValue = data.lastActive || data.startedAt || data.createdAt;
          if (!lastActiveValue) return null;
          const lastActiveMillis = typeof lastActiveValue.toMillis === 'function'
            ? lastActiveValue.toMillis()
            : (lastActiveValue.seconds ? lastActiveValue.seconds * 1000 : new Date(lastActiveValue).getTime());
          if (now - lastActiveMillis > 35000) return null;
          
          // Don't show the room if I am the host
          if (hostId === currentUserId) return null;
          
          const guests = Array.isArray(data.activeGuests) ? data.activeGuests : [];
          
          const hostProfile = userProfilesMap[hostId];
          const hostAvatar = normalizeMediaUrl(hostProfile?.photoURL) || hostProfile?.avatar || hostProfile?.profileImage || hostProfile?.avatarUrl || data.streamer?.avatar || data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(hostId)}`;
          const hostName = hostProfile?.displayName || hostProfile?.name || hostProfile?.nickname || data.streamer?.name || data.nickname || data.displayName || (isAr ? 'مذيع' : 'Host');

          // Group host and guests as equal participants
          const participants: Participant[] = [
            {
              id: hostId,
              name: hostName,
              avatar: hostAvatar
            }
          ];

          guests.forEach((g: any) => {
            const gid = g.uid || g.id;
            if (gid && gid !== hostId) {
              const gProfile = userProfilesMap[gid];
              const gAvatar = normalizeMediaUrl(gProfile?.photoURL) || gProfile?.avatar || gProfile?.profileImage || gProfile?.avatarUrl || g.avatar || g.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(gid)}`;
              const gName = gProfile?.displayName || gProfile?.name || gProfile?.nickname || g.name || g.displayName || (isAr ? 'ضيف' : 'Guest');
              participants.push({
                id: gid,
                name: gName,
                avatar: gAvatar
              });
            }
          });

          return {
            roomId: doc.id,
            participants,
            isLive: true
          };
        })
        .filter((r): r is RoomGroup => r !== null);
      setOnlineRooms(rooms);
    } catch (err) {
      console.error("Error fetching live rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    return onlineRooms
      .filter(room => 
        room.participants.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => (b.participants.length - a.participants.length));
  }, [onlineRooms, searchTerm]);

  const handleJoinAction = (room: RoomGroup) => {
    const isGroup = room.participants.length > 1;
    const isFull = room.participants.length >= 4;
    
    // Check if I am in this room
    const isInSameRoom = (currentRoomId && room.roomId === currentRoomId) ||
                         (room.participants.some(p => p.id === currentUserId)) ||
                         (activeGuests?.some(g => room.participants.some(p => p.id === (g.uid || g.id))));

    if (isInSameRoom) {
      showAlert(isAr ? "أنت متواجد في هذه الغرفة بالفعل!" : "You are already in this room!");
      return;
    }

    if (isFull) {
      showAlert(isAr ? "عذراً، وصل البث إلى الحد الأقصى للمشاركين (4/4)" : "Room is full (4/4)");
      return;
    }

    // Broadcast join request to all participants in the room
    room.participants.forEach(p => {
      onInvite({
          uid: p.id,
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          roomId: room.roomId,
          isGroupBroadcast: isGroup
      });
    });

    if (isGroup) {
      showAlert(isAr ? "تم إرسال طلب الانضمام لجميع المشاركين" : "Join request sent to all participants");
    }
  };

  return (
    <div className="absolute inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200 pointer-events-auto" onClick={onClose}>
      <div className="bg-gray-900 text-white rounded-t-3xl w-full max-w-md relative animate-in slide-in-from-bottom duration-300 pointer-events-auto shadow-2xl overflow-hidden flex flex-col max-h-[85vh] select-none" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Section */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-bold">{isAr ? 'دعوة لـ LIVE' : 'Invite to LIVE'}</h3>
             <button onClick={fetchLiveRooms} disabled={loading} className={`p-1.5 rounded-full bg-gray-800 text-zinc-400 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}>
               <RefreshCw size={14} />
             </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {alertMessage && (
          <div className="absolute top-16 left-4 right-4 bg-emerald-600 text-white text-[11px] p-2.5 rounded-xl text-center animate-bounce z-50 shadow-xl border border-white/10 font-bold">
            {alertMessage}
          </div>
        )}

        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder={isAr ? 'ابحث عن مذيعين...' : 'Search hosts...'}
              className="w-full bg-gray-800 text-white rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-700 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4 overflow-y-auto no-scrollbar pb-6 flex-1 px-1">
            {filteredRooms.map((room) => {
              const isGroup = room.participants.length > 1;
              const isFull = room.participants.length >= 4;
              const isInSameRoom = (currentRoomId && room.roomId === currentRoomId) || 
                                   (room.participants.some(p => p.id === currentUserId)) ||
                                   (activeGuests?.some(g => room.participants.some(p => p.id === (g.uid || g.id))));

              return (
                <div key={room.roomId} className="bg-gray-800/60 p-4 rounded-2xl border border-gray-700/50 hover:bg-gray-800 transition-all group flex flex-col gap-4 shadow-lg">
                  
                  {/* Participants Grid (2 columns) */}
                  <div className="grid grid-cols-2 gap-2">
                    {room.participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5 overflow-hidden">
                        <div className="relative shrink-0">
                          <img 
                            src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.id || 'user')}`} 
                            alt={p.name} 
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.id || 'user')}`;
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }}
                            className="w-8 h-8 rounded-full object-cover border border-emerald-500/30" 
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-gray-800 rounded-full" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-300 truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Unified Join/Invite Button */}
                  <div className="flex justify-end">
                    {isInSameRoom ? (
                      <button 
                        disabled
                        className="bg-gray-700 text-emerald-400 text-[10px] px-5 py-2 rounded-xl font-black uppercase border border-emerald-500/10 opacity-80"
                      >
                        {isAr ? 'متصل معك' : 'Connected'}
                      </button>
                    ) : isFull ? (
                      <button 
                        disabled
                        className="bg-gray-700 text-gray-500 text-[10px] px-5 py-2 rounded-xl font-black uppercase border border-gray-600 opacity-80"
                      >
                        {isAr ? 'مكتمل (4/4)' : 'Full (4/4)'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleJoinAction(room)}
                        className={`${isGroup ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-500 hover:bg-emerald-400'} text-white text-[10px] px-6 py-2.5 rounded-xl font-black uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2`}
                      >
                        {isGroup ? <Users size={14} /> : <UserPlus size={14} />}
                        <span>{isGroup ? (isAr ? 'طلب انضمام' : 'Join Group') : (isAr ? 'دعوة' : 'Invite')}</span>
                        {isGroup && <span className="text-[9px] opacity-70">({room.participants.length}/4)</span>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredRooms.length === 0 && (
              <div className="text-center text-gray-500 py-16 flex flex-col items-center gap-3">
                 <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-2 shadow-inner">
                    <Search size={24} className="opacity-10" />
                 </div>
                 <p className="text-sm font-medium">{isAr ? 'لا يوجد غرف بث متاحة' : 'No live rooms available'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
