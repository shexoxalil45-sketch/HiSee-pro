
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { doc, onSnapshot, collection, setDoc, deleteDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { Chat, VideoItem, CallStatus, User } from '../types';
import { Search, Plus, UserPlus, Users, Sparkles, Bot, X, Heart, MapPin, MapPinOff, VolumeX, Volume2, Settings, Phone, Video, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed, VideoOff, ArrowUpRight, ArrowDownLeft, Keyboard, MousePointerClick, CheckCheck, Clock, Download, Send, Type, Image as LucideImage, Database, Lock, MessageCircle, Camera, AlignRight, Check, Trash2, LogOut, MoreVertical, Bell, Shield, EyeOff, Mic, ChevronDown, Star, Pin, Maximize2, Minimize2, ArrowRight, ArrowLeft } from 'lucide-react';
import AIChat from './AIChat';
import ContactsView from './ContactsView';
import { translations, getTranslation } from '../translations';
import ModernHSLogo from './ModernHSLogo';
import { useChatList } from '../src/hooks/useChatList';
import { ChatListItem } from '../src/components/chat/ChatListItem';
import { StoryViewerModal } from '../src/components/stories/StoryViewerModal';
import { PinnedMediaCard, PinnedItem } from '../src/components/chat/PinnedMediaCard';
import { getMillis, isUserOnline, translateCallMessage } from '../lib/helpers';
import { useUsers } from '../src/contexts/UserContext';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { PersistentJoinBanner } from '../src/components/calls/PersistentJoinBanner';
import { auth, db as firestoreDb } from '../lib/firebase';
import { restoreFromCloud } from '../src/services/chatSyncService';

// E2EE Decrypt Helper
const decryptText = (text: string) => {
    if (!text || typeof text !== 'string') return text;
    if (text.startsWith("E2EE:")) {
        try {
            return decodeURIComponent(escape(atob(text.substring(5))));
        } catch (e) {
            return text;
        }
    }
    return text;
};

// Nearby Icon Component
const NearbyGlobeIcon = ({ size = 18 }: { size?: number }) => (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
            <path d="M12 2C14.5 4.5 15.5 8 15.5 12C15.5 16 14.5 19.5 12 22C9.5 19.5 8.5 16 8.5 12C8.5 8 9.5 4.5 12 2Z" stroke="#4ade80" strokeWidth="1" />
            <path d="M2 12H22" stroke="#facc15" strokeWidth="1" />
            <path d="M12 14.5C13.3807 14.5 14.5 13.3807 14.5 12C14.5 10.6193 13.3807 9.5 12 9.5C10.6193 9.5 9.5 10.6193 9.5 12C9.5 13.3807 10.6193 14.5 12 14.5Z" fill="#ef4444" />
            <path d="M12 17L10 14.5H14L12 17Z" fill="#ef4444" />
        </svg>
    </div>
);

interface Props {
  onSelectChat: (chat: Chat) => void;
  activeChatId?: string;
  onGoToProfile: (userId: string) => void;
  onGoToProfileOverlay?: (userId: string) => void;
  onCreateStory: () => void; 
  myStory: VideoItem | null;
  stories: VideoItem[];
  myId: string;
  isUiVisible: boolean;
  onToggleUi: () => void;
  activeStory: VideoItem | null;
  setActiveStory: (story: VideoItem | null) => void;
  lang?: string;
  incomingGroupCalls?: any[];
  onNavigateToHome?: () => void;
}

export interface CallLogItem {
  id: string;
  chatId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'voice' | 'video';
  direction: 'outgoing' | 'incoming' | 'missed';
  timestamp: number;
  duration?: string;
  chatRef?: Chat;
}

const ChatList: React.FC<Props> = ({ 
  onSelectChat, 
  activeChatId, 
  onGoToProfile, 
  onGoToProfileOverlay, 
  onCreateStory, 
  myStory, 
  stories, 
  myId, 
  isUiVisible, 
  onToggleUi,
  activeStory,
  setActiveStory,
  lang = 'ar',
  incomingGroupCalls = [],
  onNavigateToHome
}) => {
  const activeLang = lang || 'ar';
  const t = translations[activeLang] || translations.ar;
  const { users: usersMap, currentUser } = useUsers();
  const [showAiChatModal, setShowAiChatModal] = useState(false);
  
  const {
      chats, setChats,
      search, setSearch,
      searchResults,
      notFound,
      friends,
      followingIds,
      followersIds,
      pendingIncoming,
      pendingOutgoing,
      dynamicMissedCalls,
      filteredChats,
      handleAcceptRequest,
      handleRejectRequest,
      handleCancelRequest,
      allUsers,
      isOnline,
      formatLastSeen,
      handleChatClick,
      handleDeleteLocal,
      handleArchiveChat,
      handleMuteChat,
      handleUnfriendAndUnfollow,
      chatMenuId, setChatMenuId,
      longPressChat, startLongPress, stopLongPress
  } = useChatList(myId, usersMap, activeChatId || '', currentUser, activeLang);

  const [mode, setMode] = useState<'chats' | 'contacts'>('chats');
  const [chatSubTab, setChatSubTab] = useState<'chats' | 'calls'>('chats');
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [isFavFullScreen, setIsFavFullScreen] = useState(false);
  const [isPinnedFullScreen, setIsPinnedFullScreen] = useState(false);
  const [favUpdate, setFavUpdate] = useState(0);
  const [callLogs, setCallLogs] = useState<CallLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('hisee_call_logs_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => b.timestamp - a.timestamp);
        }
      }
    } catch (e) {}
    return [];
  });
  const [callFilter, setCallFilter] = useState<'all' | 'missed'>('all');

  // Force Sync Cloud Data to Standard Browser:
  // Automatically restores chats, messages, and contacts from Firestore into IndexedDB on mount.
  useEffect(() => {
    const userIdToSync = (currentUser as any)?.uid || currentUser?.id || myId || auth.currentUser?.uid;
    if (userIdToSync) {
      restoreFromCloud(userIdToSync).then(res => {
        console.log("Force Sync Cloud Data result in ChatList:", res);
        if (res.success) {
          window.dispatchEvent(new CustomEvent('localChatsChanged'));
        }
      }).catch(err => {
        console.warn("Force Sync notice:", err);
      });
    }
  }, [(currentUser as any)?.uid, currentUser?.id, myId]);

  // Removed OngoingCallsBar in favor of PersistentJoinBanner below stories

  // Save to localStorage whenever callLogs changes
  useEffect(() => {
    try {
      localStorage.setItem('hisee_call_logs_v2', JSON.stringify(callLogs.slice(0, 100)));
    } catch (e) {}
  }, [callLogs]);

  // Reactive sync to capture all incoming, missed, and outgoing calls automatically to top of callLogs
  useEffect(() => {
    if (!chats || chats.length === 0) return;

    setCallLogs(prevLogs => {
      let changed = false;
      const updated = [...prevLogs];
      const existingIds = new Set(prevLogs.map(l => l.id));

      chats.forEach((chat, idx) => {
        const otherUserId = !chat.isGroup ? chat.participants?.find(id => id !== myId) || chat.user?.id : null;
        const targetUser = otherUserId ? usersMap[otherUserId] : undefined;
        const name = targetUser?.name || chat.user?.name || (chat as any).name || 'مستخدم';
        const avatar = normalizeMediaUrl(targetUser?.avatar || chat.user?.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`;

        const missed = dynamicMissedCalls[chat.id];
        const hasMissed = (missed && (missed.audio > 0 || missed.video > 0)) || chat.callStatus === 'missed';
        const callerId = chat.lastCallCallerId || chat.callerId;
        const isOutgoing = callerId === myId;
        const isVideo = chat.lastCallType === 'video' || (missed && missed.video > 0) || (chat.missedVideoCalls ?? 0) > 0;
        
        const time = typeof chat.updatedAt === 'number' 
          ? chat.updatedAt 
          : (chat.updatedAt?.toMillis ? chat.updatedAt.toMillis() : Date.now());

        const callLogId = `chat_call_${chat.id}_${time}_${chat.callStatus || 'none'}`;

        if (!existingIds.has(callLogId) && (hasMissed || chat.lastCallCallerId || chat.callStatus === 'ongoing' || chat.callStatus === 'missed')) {
          existingIds.add(callLogId);
          changed = true;

          updated.unshift({
            id: callLogId,
            chatId: chat.id,
            userId: targetUser?.id || chat.user?.id || 'unknown',
            userName: name,
            userAvatar: avatar,
            type: isVideo ? 'video' : 'voice',
            direction: hasMissed ? 'missed' : isOutgoing ? 'outgoing' : 'incoming',
            timestamp: time || Date.now(),
            duration: hasMissed ? 'لم يتم الرد' : isVideo ? 'مكالمة فيديو' : 'مكالمة صوتية',
            chatRef: chat
          });
        }
      });

      // Populate initial call records if empty
      if (updated.length === 0 && chats.length > 0) {
        chats.forEach((chat, idx) => {
          const otherUserId = !chat.isGroup ? chat.participants?.find(id => id !== myId) || chat.user?.id : null;
          const targetUser = otherUserId ? usersMap[otherUserId] : undefined;
          const name = targetUser?.name || chat.user?.name || (chat as any).name || 'مستخدم';
          const avatar = normalizeMediaUrl(targetUser?.avatar || chat.user?.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`;
          
          const missed = dynamicMissedCalls[chat.id];
          const hasMissed = (missed && (missed.audio > 0 || missed.video > 0)) || chat.callStatus === 'missed';
          const isOutgoing = (chat.lastCallCallerId || chat.callerId) === myId;
          const isVideo = chat.lastCallType === 'video' || (missed && missed.video > 0) || (chat.missedVideoCalls ?? 0) > 0;

          updated.push({
            id: `init_${chat.id}_${Date.now() - idx * 3600000}`,
            chatId: chat.id,
            userId: targetUser?.id || chat.user?.id || 'unknown',
            userName: name,
            userAvatar: avatar,
            type: isVideo ? 'video' : 'voice',
            direction: hasMissed ? 'missed' : isOutgoing ? 'outgoing' : 'incoming',
            timestamp: chat.updatedAt || (Date.now() - (idx + 1) * 3600000),
            duration: hasMissed ? 'لم يتم الرد' : isVideo ? '03:12' : '01:45',
            chatRef: chat
          });
        });
        changed = true;
      }

      if (changed) {
        return updated.sort((a, b) => b.timestamp - a.timestamp);
      }
      return prevLogs;
    });
  }, [chats, usersMap, myId, dynamicMissedCalls]);

  const handleTriggerCallLog = useCallback((chat: Chat, callType: 'voice' | 'video', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const otherUserId = !chat.isGroup ? chat.participants?.find(id => id !== myId) || chat.user?.id : null;
    const targetUser = otherUserId ? usersMap[otherUserId] : undefined;
    const name = targetUser?.name || chat.user?.name || (chat as any).name || 'مستخدم';
    const avatar = normalizeMediaUrl(targetUser?.avatar || chat.user?.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`;

    const newEntry: CallLogItem = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      chatId: chat.id,
      userId: targetUser?.id || chat.user?.id || 'unknown',
      userName: name,
      userAvatar: avatar,
      type: callType,
      direction: 'outgoing',
      timestamp: Date.now(),
      duration: 'جاري الاتصال...',
      chatRef: chat
    };

    setCallLogs(prev => [newEntry, ...prev.filter(item => item.id !== newEntry.id)].sort((a, b) => b.timestamp - a.timestamp));
    handleChatClick(chat, onSelectChat);
  }, [myId, usersMap, handleChatClick, onSelectChat]);

  const handleSubTabSwitch = useCallback((tab: 'chats' | 'calls', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setChatSubTab(tab);
  }, []);

  const handleFilterSwitch = useCallback((filter: 'all' | 'missed', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCallFilter(filter);
  }, []);

  const formatCallTime = (timestamp: number) => {
    if (!timestamp) return getTranslation(activeLang, 'now', 'الآن');
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const localeCode = activeLang === 'ar' ? 'ar-EG' : activeLang === 'en' ? 'en-US' : activeLang;
    const timeStr = date.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit', hour12: true });

    if (diffMins < 1) return getTranslation(activeLang, 'now', 'الآن');
    if (diffMins < 60) return activeLang === 'ar' ? `منذ ${diffMins} دقيقة (${timeStr})` : `${diffMins}m ago (${timeStr})`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      const todayText = getTranslation(activeLang, 'today', 'اليوم');
      return `${todayText}، ${timeStr}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
      const yesterdayText = getTranslation(activeLang, 'yesterday', 'أمس');
      return `${yesterdayText}، ${timeStr}`;
    }

    return `${date.toLocaleDateString(localeCode, { month: 'numeric', day: 'numeric' })}، ${timeStr}`;
  };

  const filteredCallLogs = useMemo(() => {
    const list = callFilter === 'missed' 
      ? callLogs.filter(item => item.direction === 'missed') 
      : callLogs;
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [callLogs, callFilter]);
  const [showGroupsMenu, setShowGroupsMenu] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState<'عام' | 'خاص' | 'اصدقاء'>('عام');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [groupContactSearch, setGroupContactSearch] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Chat | null>(null);
  const [sparkleCycle, setSparkleCycle] = useState(0);
  const [randomJewelCount, setRandomJewelCount] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setSparkleCycle(prev => (prev + 1) % 8); // 8 states for more variation
      // Randomly change jewel count between 2 and 5 occasionally
      if (Math.random() > 0.7) {
        setRandomJewelCount(Math.floor(Math.random() * 4) + 2);
      }
    }, 3125); // 25s total rotation / 8 states = 3.125s per state change
    return () => clearInterval(interval);
  }, []);

  const renderJewel = (id: string, index: number, total: number, cycle: number) => {
    // Deterministic but complex selection based on userId, index, and cycle
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index + cycle;
    const types: ('star' | 'diamond' | 'gold' | 'pearl' | 'ruby' | 'emerald')[] = ['star', 'diamond', 'gold', 'pearl', 'ruby', 'emerald'];
    const type = types[seed % types.length];

    // Calculate position around the circle
    const angle = (index / total) * 360;
    
    const jewelContent = (() => {
      switch (type) {
        case 'star':
          return (
            <motion.div 
              animate={{ scale: [0.8, 1.3, 0.8], rotate: [0, 90, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="flex items-center justify-center"
            >
              <Sparkles size={10} className="text-yellow-400 fill-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,1)]" />
            </motion.div>
          );
        case 'diamond':
          return (
            <motion.div 
              animate={{ scale: [1, 0.9, 1.1, 1], rotate: [45, 135, 225, 315], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="w-2 h-2 bg-gradient-to-br from-white via-cyan-50 to-blue-100 shadow-[0_0_10px_rgba(255,255,255,0.9)] rounded-[1px]"
            />
          );
        case 'gold':
          return (
            <motion.div 
              animate={{ scale: [1, 1.4, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.8)]"
            />
          );
        case 'ruby':
          return (
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-rose-400 to-red-700 shadow-[0_0_8px_rgba(225,29,72,0.8)]"
            />
          );
        case 'emerald':
          return (
            <motion.div 
              animate={{ scale: [0.9, 1.1, 0.9], rotate: [-10, 10, -10] }}
              transition={{ duration: 3.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-sm bg-gradient-to-tr from-emerald-300 to-green-700 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            />
          );
        default:
          return (
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              className="w-2 h-2 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,1)]"
            />
          );
      }
    })();

    return (
      <div 
        key={`${id}-${index}-${cycle}`}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ 
          transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-32px)` 
        }}
      >
        <div style={{ transform: `rotate(-${angle}deg)` }}>
          {jewelContent}
        </div>
      </div>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setGroupImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // Chat Settings
  const defaultSettings = {
    liveLocation: true,
    hidePhoneNumber: false,
    muteAllSounds: false,
    readReceipts: true,
    voiceReadReceipts: true,
    lastSeen: true,
    autoDownloadMedia: true,
    enterToSend: true,
    fontSize: 'medium',
    background: 'default',
    backup: { enabled: false, frequency: 'daily', time: '02:00', lastBackup: null as string | null },
    sounds: { buttonClicks: true, typing: true, messages: true, audioCall: true, videoCall: true, ringtone: 'default', notificationSound: 'default', customNotificationSound: null as string | null },
    privacy: { endToEndEncryption: true, screenSecurity: false, incognitoKeyboard: false, disappearingMessages: false, selfDestructTimer: 'off', hideTypingStatus: false, hideOnlineStatus: false, requirePasscode: false }
  };

  const [chatSettings, setChatSettings] = useState(() => {
    const saved = localStorage.getItem('hisee_chat_settings');
    if (saved) { try { return { ...defaultSettings, ...JSON.parse(saved) }; } catch (e) {} }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('hisee_chat_settings', JSON.stringify(chatSettings));
  }, [chatSettings]);

  const botChat = useMemo(() => ({
    id: 'hisee-ai-bot',
    user: { id: 'hisee-ai-bot', name: 'HiSee AI', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=hisee-ai-bot&backgroundColor=f43f5e', status: 'online' },
    lastMessage: 'أنا هنا لمساعدتك دائماً!',
    timestamp: 'الآن',
    unreadCount: 0,
    isOnline: true
  }), []);

  const handleGroupExitOrDelete = async (chat: Chat) => {
    if (!chat.isGroup) return;

    try {
        if (chat.adminId === myId) {
            // Admin: Delete for everyone
            await deleteDoc(doc(db, 'chats', chat.id));
            alert('تم حذف المجموعة للكل');
        } else {
            // Regular member: Exit
            const chatRef = doc(db, 'chats', chat.id);
            const newMembers = (chat.members || []).filter(id => id !== myId);
            const newParticipants = (chat.participants || []).filter(id => id !== myId);
            await updateDoc(chatRef, {
                members: newMembers,
                participants: newParticipants
            });
            alert('تم الخروج من المجموعة');
        }
        setShowDeleteConfirm(null);
        setChatMenuId(null);
        if (activeChatId === chat.id) {
            onSelectChat(null as any);
        }
    } catch (error) {
        console.error("Error in group action:", error);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#0a0c10] border-l border-white/5 select-none relative overflow-hidden" 
      onClick={(e) => {
        // Only toggle UI if clicking directly on empty background container, not interactive components
        if (e.target === e.currentTarget) {
          onToggleUi();
        }
      }}
    >
      <div className="p-4 space-y-4 shrink-0 transition-all duration-300" style={{ opacity: isUiVisible ? 1 : 0.5 }}>
        <div className="flex items-center justify-between gap-1 md:gap-2 w-full">
           <div className="flex items-center gap-1 md:gap-2 shrink min-w-0">
               <ModernHSLogo size={28} />
               <h2 className="text-sm md:text-lg font-black italic text-white uppercase truncate">{getTranslation(activeLang, mode === 'chats' ? 'chat' : 'contacts', mode === 'chats' ? 'CHAT' : 'CONTACTS')}</h2>
               {mode === 'chats' && (
                   <button type="button" onClick={(e) => { e.stopPropagation(); onSelectChat(botChat as any); }} className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-95 ${activeChatId === botChat.id ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500'}`} title={getTranslation(activeLang, "aiBot", "AI Bot")}><Bot size={18} /></button>
               )}
           </div>

           <div className="flex gap-1 md:gap-2 items-center shrink-0">
               <button type="button" onClick={(e) => { e.stopPropagation(); setShowNearbyModal(true); }} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-xl border border-white/10 transition-all cursor-pointer touch-manipulation active:scale-95"><NearbyGlobeIcon size={18} /><span className="text-[11px] font-bold text-white hidden lg:block">{getTranslation(activeLang, "nearby", "Nearby")}</span></button>
               <div className="relative">
                 <button type="button" onClick={(e) => { e.stopPropagation(); setShowGroupsMenu(!showGroupsMenu); }} className="px-2.5 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 text-[11px] font-bold cursor-pointer touch-manipulation active:scale-95"><span className="bg-[linear-gradient(to_right,#eab308,#ef4444,#ffffff,#22c55e)] text-transparent bg-clip-text font-black">{getTranslation(activeLang, "groups", "Groups")}</span></button>
                 {showGroupsMenu && (
                   <div className="absolute top-11 right-0 z-50 w-48 bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                     <button type="button" onClick={() => { setShowGroupsMenu(false); setShowCreateGroupModal(true); }} className="w-full p-3 text-emerald-500 font-bold text-sm hover:bg-white/5 rounded-xl text-start cursor-pointer"><span className="bg-[linear-gradient(to_right,#eab308,#ef4444,#ffffff,#22c55e)] text-transparent bg-clip-text font-black">{getTranslation(activeLang, "newGroup", "New Group")}</span></button>
                   </div>
                 )}
               </div>
               <button type="button" onClick={(e) => { e.stopPropagation(); setMode(mode === 'chats' ? 'contacts' : 'chats'); }} className="w-8 h-8 md:w-9 md:h-9 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 cursor-pointer touch-manipulation active:scale-95"><Users size={18} strokeWidth={2.5} /></button>
               <button type="button" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate_settings', { detail: { view: 'chat' } })); }} className="w-8 h-8 md:w-9 md:h-9 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 cursor-pointer touch-manipulation active:scale-95"><MoreVertical size={18} strokeWidth={2.5} /></button>
           </div>
        </div>

        {mode === 'chats' && (
          <div className="flex items-center gap-2 w-full">
              {/* Shrunk Search Input */}
              <div className="relative group flex-1 min-w-0">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                  <input 
                    type="text" 
                    placeholder={getTranslation(activeLang, "searchPlaceholder", "Search...")} 
                    value={search} 
                    onClick={(e) => e.stopPropagation()} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-8 pl-2 text-[11px] font-bold text-white outline-none focus:border-emerald-500/40 transition-all" 
                  />
                  {notFound && <p className="text-red-500 text-xs mt-2 absolute top-full right-0 z-50">{getTranslation(activeLang, "userNotFound", "User not found")}</p>}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                      {searchResults.map(user => {
                        const isBlocked = currentUser?.blockedUsers?.includes(user.id);
                        const avatar = isBlocked 
                          ? `https://api.dicebear.com/7.x/avataaars/svg?seed=user_${user.id}` 
                          : (normalizeMediaUrl(user.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`);
                        const displayName = user.name;
                        return (
                          <button type="button" key={user.id} onClick={() => { onGoToProfile(user.id); setSearch(''); }} className="w-full text-right hover:bg-white/5 text-white p-3 border-b border-white/5 text-xs flex items-center gap-4 transition-colors cursor-pointer">
                            <img src={avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                            <span className="font-bold">{displayName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>

              {/* Horizontal Subtabs: Chats, Favorites, Unified Pinned, Call Logs */}
              <div className="flex items-center p-0.5 bg-white/5 rounded-xl border border-white/10 shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleSubTabSwitch('chats', e)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      chatSubTab === 'chats' 
                        ? 'text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageCircle size={13} className={chatSubTab === 'chats' ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>{getTranslation(activeLang, "chats", "Chats")}</span>
                  </button>

                  {/* Icon Button: Star (المفضلين) */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowFavoritesModal(true); }}
                    title={getTranslation(activeLang, "favoriteUsersTitle", "Favorite People & Chats ⭐")}
                    className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center shrink-0"
                  >
                    <Star size={13} className="fill-amber-400" />
                  </button>

                  {/* Icon Button: Pin (الرسائل المثبتة الموحدة) */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowPinnedModal(true); }}
                    title={getTranslation(activeLang, "pinnedMessagesTitle", "Unified Pinned Messages 📌")}
                    className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 bg-emerald-500/10 border border-emerald-500/20 transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center shrink-0"
                  >
                    <Pin size={13} className="fill-emerald-400" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSubTabSwitch('calls', e)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all relative cursor-pointer touch-manipulation active:scale-95 ${
                      chatSubTab === 'calls' 
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Phone size={13} />
                      {incomingGroupCalls && incomingGroupCalls.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse border border-[#0a0c10]" />
                      )}
                    </div>
                    <span>{getTranslation(activeLang, "callLog", "Call Log")}</span>
                    {Object.values(dynamicMissedCalls).some(c => (c.audio > 0 || c.video > 0)) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    )}
                  </button>
              </div>
          </div>
        )}

        {mode === 'chats' && !search.trim() && (
          <div className="flex flex-col gap-2">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{getTranslation(activeLang, "stories", "Stories")}</h3>
             <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 items-center">
                {/* My Story */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group relative" onClick={(e) => { e.stopPropagation(); myStory ? setActiveStory(myStory) : onCreateStory(); }}>
                    <div className={`relative w-[80px] h-[80px] rounded-full p-[3px] ${myStory ? 'bg-gradient-to-tr from-emerald-500 via-rose-500 to-yellow-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-2 border-emerald-500/40 bg-white/5 hover:border-emerald-400 transition-all'}`}>
                        <div className="w-full h-full rounded-full bg-[#0a0c10] overflow-hidden flex items-center justify-center relative transition-all group-active:scale-95">
                            {myStory ? (
                                <>
                                    {myStory.url?.toLowerCase().match(/\.(jpeg|jpg|png|gif|webp)$/) || 
                                     myStory.mediaType?.startsWith('image') || 
                                     myStory.mediaType === 'photo' || 
                                     myStory.type === 'photo' ? (
                                        <img 
                                            src={normalizeMediaUrl(myStory.url)} 
                                            className="w-full h-full object-cover" 
                                            alt={getTranslation(activeLang, "myStory", "My Story")} 
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <video src={normalizeMediaUrl(myStory.url)} className="w-full h-full object-cover opacity-90" playsInline muted />
                                    )}
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                                </>
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img 
                                        src={normalizeMediaUrl(currentUser?.avatar || usersMap[myId]?.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`} 
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`; }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                        alt={getTranslation(activeLang, "myStory", "My Story")} 
                                    />
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full border-2 border-[#0a0c10] flex items-center justify-center shadow-lg z-10 transition-transform group-hover:scale-110">
                            <Plus size={14} className="text-black" strokeWidth={2.5} />
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">{getTranslation(activeLang, "myStory", "My Story")}</span>
                </div>

                {/* Other Users Stories / Profile Placeholders */}
                {(() => {
                    const eligibleUsers = allUsers.filter(u => {
                        if (u.id === myId || u.id === 'hisee-ai-bot') return false;
                        const isMutual = (followingIds.includes(u.id) && followersIds.includes(u.id)) || (friends && friends.includes(u.id)) || u.id.startsWith('mock-');
                        return isMutual;
                    });

                    if (eligibleUsers.length === 0) {
                        return (
                            <div className="flex-1 flex items-center justify-center py-4 px-2 text-slate-500 text-[10px] font-bold text-center">
                                {getTranslation(activeLang, "followEachOtherStories", "💬 Follow each other to share and view stories here")}
                            </div>
                        );
                    }

                    // Sort so users with active stories appear first
                    const sortedUsers = [...eligibleUsers].sort((a, b) => {
                        const hasA = stories.some(s => s.userId === a.id);
                        const hasB = stories.some(s => s.userId === b.id);
                        if (hasA && !hasB) return -1;
                        if (!hasA && hasB) return 1;
                        return 0;
                    });

                    return sortedUsers.map(user => {
                        const userStories = stories.filter(s => s.userId === user.id);
                        const hasStory = userStories.length > 0;
                        const hasUnseenStory = hasStory && userStories.some(s => !s.seenBy?.includes(myId));
                        const firstStory = userStories[0];
                        
                        const chatWithUser = chats.find(c => !c.isGroup && c.user?.id === user.id);
                        const myActivityHidden = (chatWithUser as any)?.privacyOverrides?.[myId]?.hideActivity === true;
                        const otherActivityHidden = (chatWithUser as any)?.privacyOverrides?.[user.id]?.hideActivity === true;
                        const canShowPresence = !myActivityHidden && !otherActivityHidden;

                        return (
                            <div 
                                key={user.id} 
                                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group" 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (firstStory) {
                                        setActiveStory(firstStory); 
                                    } else if (onGoToProfileOverlay) {
                                        onGoToProfileOverlay(user.id);
                                    } else {
                                        onGoToProfile(user.id);
                                    }
                                }}
                            >
                                <div className={`relative p-[2px] rounded-full transition-all duration-500 ${
                                    hasStory 
                                        ? 'bg-gradient-to-tr from-emerald-500 via-rose-500 to-yellow-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                                        : 'border-2 border-slate-700/80 hover:border-emerald-500/50 bg-white/5'
                                }`}>
                                    {hasUnseenStory && (
                                        <motion.div 
                                            className="absolute inset-[-18px] pointer-events-none z-10"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                        >
                                            {[...Array(randomJewelCount)].map((_, i) => (
                                                renderJewel(user.id, i, randomJewelCount, sparkleCycle)
                                            ))}
                                        </motion.div>
                                    )}
                                    <div className="w-[72px] h-[72px] rounded-full bg-[#0a0c10] border-2 border-[#0a0c10] overflow-hidden transition-transform group-hover:scale-95 relative">
                                        <img 
                                            src={normalizeMediaUrl(user.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`; }}
                                            className={`w-full h-full object-cover ${!hasStory ? 'opacity-90 group-hover:opacity-100' : ''}`} 
                                            alt="" 
                                        />
                                    </div>
                                    {canShowPresence && isOnline(user) && (
                                        <div className="absolute z-50 bottom-0 right-0 w-3.5 h-3.5 bg-[#00ff66] rounded-full border border-white/40 ring-2 ring-[#0a0c10] shadow-[0_0_10px_#00ff66]" />
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold truncate w-20 text-center transition-colors ${hasUnseenStory ? 'text-white' : hasStory ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {user.name}
                                </span>
                            </div>
                        );
                    });
                })()}
             </div>
          </div>
        )}
      </div>

      {mode === 'chats' ? (
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1">
        <div className="px-1 py-2 mb-2">
          <PersistentJoinBanner 
            incomingCalls={incomingGroupCalls.filter(c => c.isTimedOut)}
            onAccept={(call) => {
              window.dispatchEvent(new CustomEvent('openGroupVoiceCall', { detail: call.id }));
            }}
            onDismiss={async (call) => {
              try {
                const roomRef = doc(firestoreDb, 'rooms', call.id);
                const myId = auth.currentUser?.uid;
                if (myId) {
                  await updateDoc(roomRef, {
                    [`participants.${myId}.status`]: 'rejected'
                  });
                }
              } catch (e) {}
            }}
          />
        </div>

          {chatSubTab === 'chats' ? (
            <>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 mt-1">{getTranslation(activeLang, "chats", "Chats")}</h3>
              {filteredChats.length === 0 ? (
                <div className="py-20 text-center px-4">
                  <Sparkles size={40} className="mx-auto mb-4 text-slate-500/50" />
                  <p className="text-xs font-bold text-slate-400">{getTranslation(activeLang, "noActiveChats", "No active chats with your mutual friends currently")}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{getTranslation(activeLang, "startFollowingToChat", "Follow each other to chat here, or search for them above")}</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const otherUserId = !chat.isGroup ? chat.participants?.find(id => id !== myId) || chat.user?.id : null;
                  const targetUser = otherUserId ? usersMap[otherUserId] : undefined;
                  return (
                    <ChatListItem 
                      key={chat.id} 
                      chat={chat} 
                      targetUser={targetUser}
                      currentUser={currentUser}
                      activeChatId={activeChatId} 
                      myId={myId} 
                      missedCalls={dynamicMissedCalls[chat.id]} 
                      isOnline={isOnline} 
                      formatLastSeen={formatLastSeen}
                      decryptText={decryptText}
                      onSelectChat={() => handleChatClick(chat, onSelectChat)}
                      onGoToProfile={onGoToProfile}
                      chatSettings={chatSettings}
                      friends={friends}
                      pendingIncoming={pendingIncoming}
                      pendingOutgoing={pendingOutgoing}
                      chatMenuId={chatMenuId}
                      setChatMenuId={setChatMenuId}
                      handleAcceptRequest={handleAcceptRequest}
                      handleRejectRequest={handleRejectRequest}
                      handleCancelRequest={handleCancelRequest}
                      handleDeleteGroupForEveryone={() => handleGroupExitOrDelete(chat)}
                      handleDeleteLocal={handleDeleteLocal}
                      handleArchiveChat={handleArchiveChat}
                      handleMuteChat={handleMuteChat}
                      handleUnfriendAndUnfollow={handleUnfriendAndUnfollow}
                      startLongPress={startLongPress}
                      stopLongPress={stopLongPress}
                      longPressChat={longPressChat}
                      setShowDeleteConfirm={setShowDeleteConfirm}
                      lang={activeLang}
                    />
                  );
                })
              )}
            </>
          ) : (
            <div className="space-y-2">
              {/* Top Join Section UI for Group Calls */}
              {incomingGroupCalls && incomingGroupCalls.length > 0 && (
                <div className="px-2 py-1 space-y-2">
                  {incomingGroupCalls.map((call: any) => {
                    const getArabicCountText = (count: number) => {
                      if (count <= 1) return getTranslation(activeLang, 'oneInCall', '1 person in call');
                      if (count === 2) return getTranslation(activeLang, 'twoInCall', '2 people in call');
                      if (count >= 3 && count <= 10) return `${count} أشخاص في المكالمة`;
                      return `${count} شخصاً في المكالمة`;
                    };
                    
                    return (
                      <div 
                        key={call.id} 
                        className="bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-500/50 transition-all animate-pulse"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img 
                              src={call.callerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.id}`}
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.id}`; }}
                              className="w-11 h-11 rounded-xl object-cover ring-2 ring-emerald-500/20" 
                              alt="" 
                            />
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md border-2 border-[#0a0c10]">
                              <Phone size={10} className="text-white" />
                            </span>
                          </div>

                          <div className="min-w-0 flex flex-col">
                            <span className="text-xs font-black text-white truncate">
                              {call.callerName || getTranslation(activeLang, 'groupCall', 'Group Call')}
                            </span>
                            <div className="flex items-center gap-2 mt-1 min-w-0">
                              {/* Avatar Stack */}
                              <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                {call.participantAvatars?.map((avatarUrl: string, idx: number) => (
                                  <img
                                    key={idx}
                                    src={avatarUrl}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=avatar_${idx}`;
                                    }}
                                    className="inline-block h-5 w-5 rounded-full ring-2 ring-[#0a0c10] object-cover"
                                    alt=""
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-emerald-400 font-bold truncate">
                                {getArabicCountText(call.activeParticipantsCount || 1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('openGroupVoiceCall', { 
                              detail: { channelName: call.id, callType: call.type || 'voice' } 
                            }));
                          }}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                          <Phone size={12} className="stroke-[3]" />
                          <span>{getTranslation(activeLang, "join", "Join")}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between px-2 mb-2 mt-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Phone size={12} className="text-rose-400" />
                    <span>{getTranslation(activeLang, "callLogsAndHistory", "Call Logs & History")}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {filteredCallLogs.length} {getTranslation(activeLang, "records", "records")}
                  </span>
                </div>

              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={(e) => handleFilterSwitch('all', e)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                    callFilter === 'all' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {getTranslation(activeLang, "all", "All")}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleFilterSwitch('missed', e)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                    callFilter === 'missed' ? 'bg-rose-500/30 text-rose-300 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {getTranslation(activeLang, "missed", "Missed")}
                </button>
              </div>
            </div>

            {filteredCallLogs.length === 0 ? (
              <div className="py-20 text-center opacity-30">
                <PhoneOff size={40} className="mx-auto mb-4 text-rose-400" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  {callFilter === 'missed' ? getTranslation(activeLang, 'noMissedCalls', 'No missed calls') : getTranslation(activeLang, 'noRecordedCalls', 'No recorded calls')}
                </p>
              </div>
            ) : (
              filteredCallLogs.map((item) => {
                const chat = item.chatRef || chats.find(c => c.id === item.chatId);
                
                return (
                  <div 
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (chat) {
                        handleTriggerCallLog(chat, item.type, e);
                      }
                    }}
                    className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl cursor-pointer transition-all active:scale-[0.98] touch-manipulation"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <img 
                          src={item.userAvatar}
                          className="w-11 h-11 rounded-2xl object-cover border border-white/10" 
                          alt="" 
                        />
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a0c10] ${
                          item.direction === 'missed' 
                            ? 'bg-rose-500 text-white' 
                            : item.direction === 'outgoing' 
                            ? 'bg-sky-500 text-white' 
                            : 'bg-emerald-500 text-white'
                        }`}>
                          {item.direction === 'missed' ? (
                            <PhoneMissed size={10} />
                          ) : item.direction === 'outgoing' ? (
                            <ArrowUpRight size={10} />
                          ) : (
                            <ArrowDownLeft size={10} />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-black text-white truncate group-hover:text-emerald-400 transition-colors">
                          {item.userName}
                        </span>
                        
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
                            item.direction === 'missed' 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                              : item.direction === 'outgoing' 
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {item.direction === 'missed' ? (
                              <PhoneMissed size={11} className="text-rose-400 shrink-0" />
                            ) : item.direction === 'outgoing' ? (
                              <ArrowUpRight size={11} className="text-sky-400 shrink-0" />
                            ) : (
                              <ArrowDownLeft size={11} className="text-emerald-400 shrink-0" />
                            )}
                            <span>
                              {item.direction === 'missed'
                                ? (item.type === 'video' ? getTranslation(activeLang, 'videoCallMissed', 'Video Call - Missed') : getTranslation(activeLang, 'voiceCallMissed', 'Voice Call - Missed'))
                                : item.direction === 'outgoing'
                                ? (item.type === 'video' ? getTranslation(activeLang, 'videoCallOutgoing', 'Outgoing Video Call') : getTranslation(activeLang, 'voiceCallOutgoing', 'Outgoing Voice Call'))
                                : (item.type === 'video' ? getTranslation(activeLang, 'videoCallIncoming', 'Incoming Video Call') : getTranslation(activeLang, 'voiceCallIncoming', 'Incoming Voice Call'))}
                            </span>
                          </span>

                          {item.duration && (
                            <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {translateCallMessage(item.duration, activeLang)}
                            </span>
                          )}

                          <span className="text-[9px] text-slate-500">• {formatCallTime(item.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => chat && handleTriggerCallLog(chat, 'voice', e)}
                        className="w-8 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white flex items-center justify-center transition-all border border-emerald-500/20 active:scale-95 cursor-pointer touch-manipulation"
                        title={getTranslation(activeLang, "voiceCall", "Voice Call")}
                      >
                        <Phone size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => chat && handleTriggerCallLog(chat, 'video', e)}
                        className="w-8 h-8 rounded-xl bg-amber-400/10 hover:bg-amber-400 text-amber-400 hover:text-white flex items-center justify-center transition-all border border-amber-400/20 active:scale-95 cursor-pointer touch-manipulation"
                        title={getTranslation(activeLang, "videoCall", "Video Call")}
                      >
                        <Video size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    ) : (
      <div className="flex-1 overflow-y-auto no-scrollbar">
           <ContactsView 
             myId={myId} 
             onSelectChat={onSelectChat} 
             onBack={() => setMode('chats')}
             lang={activeLang}
           />
        </div>
      )}

      {/* Modals Container */}
      {showCreateGroupModal && (
        <div className="absolute inset-0 z-[100] bg-[#0a0c10]/95 backdrop-blur-2xl p-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
           <div className="w-full max-w-md bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black text-emerald-500">{getTranslation(activeLang, "newGroup", "New Group")}</h3>
                 <button onClick={() => setShowCreateGroupModal(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              <input type="text" placeholder={getTranslation(activeLang, "groupName", "Group Name")} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 text-white mb-4" />
               <textarea placeholder={getTranslation(activeLang, "groupDescriptionOptional", "Group description (optional)")} value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 text-white mb-4 h-20 resize-none" />
               
               <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-2xl bg-slate-950 border border-dashed border-white/20 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                        {groupImage ? <img src={normalizeMediaUrl(groupImage)} className="w-full h-full rounded-2xl object-cover" /> : <Camera size={24} />}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <span className="text-sm text-slate-400">{getTranslation(activeLang, "chooseGroupImage", "Choose group image")}</span>
               </div>
               
               <div className="flex gap-2 mb-4">
                    {(['عام', 'خاص', 'اصدقاء'] as const).map(type => (
                        <button key={type} onClick={() => setGroupPrivacy(type)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${groupPrivacy === type ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {type}
                        </button>
                    ))}
                </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar mb-4">
                <h4 className="text-sm font-bold text-slate-400 mb-2">{getTranslation(activeLang, "members", "Members")} ({selectedContacts.length}):</h4>
                {allUsers.filter(u => u.id !== myId).map(user => (
                    <button key={user.id} onClick={() => setSelectedContacts(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} className={`w-full flex items-center gap-3 p-2 rounded-xl mb-1 ${selectedContacts.includes(user.id) ? 'bg-emerald-500/20' : 'hover:bg-white/5'}`}>
                        <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-8 h-8 rounded-full" alt="" />
                        <span className="text-white text-sm">{user.name}</span>
                    </button>
                ))}
              </div>

              <div className="flex gap-3 mt-auto">
                <button onClick={() => setShowCreateGroupModal(false)} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">{getTranslation(activeLang, "cancel", "Cancel")}</button>
                <button onClick={async () => {
                    const groupId = `group-${Date.now()}`;
                    let finalGroupImage = '';

                    if (groupImage) {
                        try {
                            // Convert base64 to Blob
                            const response = await fetch(groupImage);
                            const blob = await response.blob();
                            
                            const formData = new FormData();
                            formData.append('file', blob, `group_${groupId}.jpg`);

                            const uploadResponse = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            });

                            if (uploadResponse.ok) {
                                const uploadData = await uploadResponse.json();
                                finalGroupImage = uploadData.url;
                            }
                        } catch (err) {
                            console.error("Error uploading group image:", err);
                        }
                    }

                    const newChat: Chat = { 
                        id: groupId, 
                        user: { id: groupId, name: newGroupName, avatar: finalGroupImage, status: 'offline' },
                        lastMessage: '',
                        timestamp: String(Date.now()),
                        unreadCount: 0,
                        isOnline: false,
                        description: groupDescription,
                        participants: [myId, ...selectedContacts], 
                        isGroup: true, 
                        adminId: myId,
                        privacy: groupPrivacy,
                        image: finalGroupImage,
                        members: [myId, ...selectedContacts]
                    };
                    await setDoc(doc(db, 'chats', groupId), newChat);
                    setShowCreateGroupModal(false);
                    setNewGroupName('');
                    setSelectedContacts([]);
                    setGroupDescription('');
                    setGroupImage(null);
                    onSelectChat(newChat);
                }} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl">{getTranslation(activeLang, "create", "Create")}</button>
              </div>
           </div>
        </div>
      )}

      {activeStory && (
        <StoryViewerModal activeStory={activeStory} stories={stories} myId={myId} setActiveStory={setActiveStory} onCreateStory={onCreateStory} onGoToProfile={onGoToProfileOverlay || onGoToProfile} />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[3rem] p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border-emerald-500/10">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {showDeleteConfirm.isGroup ? (
                        showDeleteConfirm.adminId === myId ? <Trash2 className="text-emerald-500" size={28} /> : <LogOut className="text-emerald-500" size={28} />
                    ) : (
                        <Trash2 className="text-rose-500" size={28} />
                    )}
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                    {showDeleteConfirm.isGroup 
                        ? (showDeleteConfirm.adminId === myId ? getTranslation(activeLang, 'deleteGroupTitle', 'Delete Group?') : getTranslation(activeLang, 'leaveGroupTitle', 'Leave Group?')) 
                        : getTranslation(activeLang, 'deleteContactTitle', 'Delete Contact?')}
                </h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    {showDeleteConfirm.isGroup 
                        ? (showDeleteConfirm.adminId === myId 
                            ? getTranslation(activeLang, 'deleteGroupConfirm', 'The group and all its messages will be permanently deleted for all members.') 
                            : getTranslation(activeLang, 'leaveGroupConfirm', 'Are you sure you want to leave this group? You will no longer see messages.'))
                        : getTranslation(activeLang, 'deleteContactConfirm', 'Are you sure you want to delete this contact and unfriend/unfollow this user?')}
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => {
                            if (showDeleteConfirm.isGroup) {
                                handleGroupExitOrDelete(showDeleteConfirm);
                            } else {
                                handleUnfriendAndUnfollow(showDeleteConfirm);
                            }
                        }} 
                        className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black shadow-xl transition-all active:scale-95"
                    >
                        {getTranslation(activeLang, 'confirm', 'Confirm')} {showDeleteConfirm.isGroup ? (showDeleteConfirm.adminId === myId ? getTranslation(activeLang, 'delete', 'Delete') : getTranslation(activeLang, 'exit', 'Exit')) : getTranslation(activeLang, 'deleteAndUnfriend', 'Delete & Unfriend')}
                    </button>
                    <button 
                        onClick={() => setShowDeleteConfirm(null)} 
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-bold transition-all"
                    >
                        {getTranslation(activeLang, "cancel", "Cancel")}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Simplified Settings Modal */}
      {showChatSettingsModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowChatSettingsModal(false)}>
            <div className="w-full max-w-sm bg-[#1a1c22] rounded-3xl border border-white/10 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white">{getTranslation(activeLang, "settings", "Settings")}</h3>
                    <button onClick={() => setShowChatSettingsModal(false)} className="p-2 bg-white/5 rounded-full text-white/50"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{getTranslation(activeLang, "liveLocation", "Live Location")}</span>
                        <button onClick={() => setChatSettings((s: any) => ({...s, liveLocation: !s.liveLocation}))} className={`w-12 h-6 rounded-full ${chatSettings.liveLocation ? 'bg-emerald-500' : 'bg-white/10'}`} />
                    </div>
                </div>
            </div>
        </div>
      )}
      {/* Modal 1: Favorites Modal (الأشخاص والدردشات المفضلة ⭐) */}
      {showFavoritesModal && (
        <div className={`fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex items-center justify-center transition-all duration-200 ${isFavFullScreen ? 'p-0' : 'p-3 sm:p-4'}`} onClick={() => setShowFavoritesModal(false)}>
            <div className={`bg-[#13151b] border border-amber-500/30 shadow-2xl flex flex-col gap-3 text-right transition-all duration-300 ${isFavFullScreen ? 'w-full h-full rounded-none p-4 sm:p-6' : 'w-full max-w-lg rounded-3xl p-4 sm:p-5'}`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Star className="text-amber-400 fill-amber-400" size={20} />
                        <h3 className="text-sm sm:text-base font-black text-white">{getTranslation(activeLang, "favoriteUsersTitle", "Favorite People & Chats ⭐")}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Fullscreen Toggle Button */}
                        <button 
                            onClick={() => setIsFavFullScreen(!isFavFullScreen)} 
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                            title={isFavFullScreen ? getTranslation(activeLang, "minimizeScreen", "Minimize Screen") : getTranslation(activeLang, "fullscreen", "Fullscreen")}
                        >
                            {isFavFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                            <span className="hidden sm:inline">{isFavFullScreen ? getTranslation(activeLang, "minimize", "Minimize") : getTranslation(activeLang, "fullscreen", "Fullscreen")}</span>
                        </button>

                        {/* Back / Close Button */}
                        <button 
                            onClick={() => setShowFavoritesModal(false)} 
                            className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                            title={getTranslation(activeLang, "backAndClose", "Back & Close Window")}
                        >
                            <ArrowRight size={15} />
                            <span>{getTranslation(activeLang, "back", "Back")}</span>
                        </button>
                    </div>
                </div>

                <div className={`${isFavFullScreen ? 'flex-1 overflow-y-auto' : 'max-h-[70vh] overflow-y-auto'} flex flex-col gap-4 no-scrollbar p-1`}>
                    {(() => {
                        const eligibleUsers = allUsers.filter(u => u.id !== myId && u.id !== 'hisee-ai-bot');
                        const favUsers = eligibleUsers.filter(u => localStorage.getItem(`hisee_fav_user_${u.id}`) === 'true');
                        const suggestedUsers = eligibleUsers.filter(u => localStorage.getItem(`hisee_fav_user_${u.id}`) !== 'true');

                        const renderUserCard = (user: User, isFav: boolean) => {
                            const chatWithUser = chats.find(c => !c.isGroup && c.user?.id === user.id);
                            const myActivityHidden = (chatWithUser as any)?.privacyOverrides?.[myId]?.hideActivity === true;
                            const otherActivityHidden = (chatWithUser as any)?.privacyOverrides?.[user.id]?.hideActivity === true;
                            const canShowPresence = !myActivityHidden && !otherActivityHidden;
                            const online = canShowPresence && isUserOnline(user.lastSeen || user.lastActive, user.isOnline);
                            return (
                                <div key={user.id} className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-slate-800 shrink-0">
                                            <img src={normalizeMediaUrl(user.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-full h-full object-cover" alt="" />
                                            {online && (
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00ff66] rounded-full border border-white/40 ring-1 ring-[#0a0c10] shadow-[0_0_8px_#00ff66]"></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                                                <span>{user.name || getTranslation(activeLang, 'user', 'User')}</span>
                                                {isFav && <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{online ? getTranslation(activeLang, 'online', 'Online') : getTranslation(activeLang, 'offline', 'Offline')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                const next = !isFav;
                                                localStorage.setItem(`hisee_fav_user_${user.id}`, String(next));
                                                setFavUpdate(p => p + 1);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-lg text-amber-400 transition-colors"
                                            title={isFav ? getTranslation(activeLang, "removeFromFavorites", "Remove from Favorites") : getTranslation(activeLang, "addToFavorites", "Add to Favorites")}
                                        >
                                            <Star size={16} className={isFav ? "fill-amber-400 text-amber-400" : "text-slate-500"} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowFavoritesModal(false);
                                                onSelectChat({
                                                    id: user.id,
                                                    user: user,
                                                    lastMessage: '',
                                                    timestamp: '',
                                                    unreadCount: 0,
                                                    isOnline: !!user.isOnline,
                                                    messages: []
                                                });
                                            }}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-black rounded-xl transition-all shadow-md shadow-emerald-500/20"
                                        >
                                            {getTranslation(activeLang, "chat", "Chat")}
                                        </button>
                                    </div>
                                </div>
                            );
                        };

                        if (eligibleUsers.length === 0) {
                            return <p className="text-xs text-slate-400 text-center py-4">{getTranslation(activeLang, "noContactsYet", "No contacts yet.")}</p>;
                        }

                        return (
                            <>
                                {/* Section 1: Favorites */}
                                <div className="flex flex-col gap-2">
                                    <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                        <Star size={13} className="fill-amber-400" />
                                        <span>{getTranslation(activeLang, "favoriteContacts", "Favorite Contacts")} ({favUsers.length})</span>
                                    </h4>
                                    {favUsers.length === 0 ? (
                                        <p className="text-[11px] text-slate-500 bg-white/5 p-3 rounded-2xl text-center">{getTranslation(activeLang, "noFavoriteContacts", "No favorite contacts currently.")}</p>
                                    ) : (
                                        favUsers.map(u => renderUserCard(u, true))
                                    )}
                                </div>

                                {/* Section 2: Suggested */}
                                {suggestedUsers.length > 0 && (
                                    <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                            <span>{getTranslation(activeLang, "suggestedContacts", "Suggested Contacts")} ({suggestedUsers.length})</span>
                                        </h4>
                                        {suggestedUsers.map(u => renderUserCard(u, false))}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
      )}

      {/* Modal 2: Unified Pinned Messages Modal (الرسائل المثبتة الموحدة 📌) */}
      {showPinnedModal && (
        <div className={`fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex items-center justify-center transition-all duration-200 ${isPinnedFullScreen ? 'p-0' : 'p-3 sm:p-4'}`} onClick={() => setShowPinnedModal(false)}>
            <div className={`bg-[#13151b] border border-amber-500/40 shadow-2xl flex flex-col gap-3 text-right transition-all duration-300 ${isPinnedFullScreen ? 'w-full h-full rounded-none p-4 sm:p-6 max-h-none' : 'w-full max-w-2xl rounded-3xl p-4 sm:p-5 max-h-[88vh]'}`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Pin className="text-amber-400 fill-amber-400" size={20} />
                        <h3 className="text-sm sm:text-base font-black text-white">{getTranslation(activeLang, "unifiedPinnedMessages", "Unified Pinned Messages 📌")}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Fullscreen Toggle Button */}
                        <button 
                            onClick={() => setIsPinnedFullScreen(!isPinnedFullScreen)} 
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                            title={isPinnedFullScreen ? getTranslation(activeLang, "minimizeScreen", "Minimize Screen") : getTranslation(activeLang, "fullscreen", "Fullscreen")}
                        >
                            {isPinnedFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                            <span className="hidden sm:inline">{isPinnedFullScreen ? getTranslation(activeLang, "minimize", "Minimize") : getTranslation(activeLang, "fullscreen", "Fullscreen")}</span>
                        </button>

                        {/* Back / Close Button */}
                        <button 
                            onClick={() => setShowPinnedModal(false)} 
                            className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                            title={getTranslation(activeLang, "backAndClose", "Back & Close Window")}
                        >
                            <ArrowRight size={15} />
                            <span>{getTranslation(activeLang, "back", "Back")}</span>
                        </button>
                    </div>
                </div>

                <div className={`${isPinnedFullScreen ? 'flex-1 overflow-y-auto' : 'max-h-[68vh] overflow-y-auto'} flex flex-col gap-3 no-scrollbar p-1`}>
                    {/* General Public Chat / Room Notice */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col gap-1 text-right shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-400">🌐 {getTranslation(activeLang, "unifiedPinnedTitle", "Unified Pinned Messages List")}</span>
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">{getTranslation(activeLang, "fullVersion", "Full Version")}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                            {getTranslation(activeLang, "pinnedListDesc", "This list displays original media (audio recordings, videos, photos, and files) with a button to jump to the sender profile.")}
                        </p>
                    </div>

                    {(() => {
                        let savedUnified: PinnedItem[] = [];
                        try {
                            savedUnified = JSON.parse(localStorage.getItem('hisee_unified_pinned_msgs') || '[]');
                        } catch (e) {
                            savedUnified = [];
                        }

                        // Also include any chats that have pinnedMessageIds
                        const pinnedChatItems: PinnedItem[] = [];
                        chats.filter(c => ((c as any)['pinnedMessageIds_' + myId]) && ((c as any)['pinnedMessageIds_' + myId]).length > 0).forEach(chatItem => {
                            ((chatItem as any)['pinnedMessageIds_' + myId])?.forEach((msgId: string) => {
                                if (!savedUnified.some(u => u.id === msgId)) {
                                    pinnedChatItems.push({
                                        id: msgId,
                                        text: chatItem.lastMessage || getTranslation(activeLang, 'pinnedMessageInChat', 'Pinned message in this chat'),
                                        chatId: chatItem.id,
                                        chatName: chatItem.isGroup ? (chatItem.name || getTranslation(activeLang, 'publicChat', 'Public Chat')) : (chatItem.user?.name || getTranslation(activeLang, 'privateChat', 'Private Chat')),
                                        senderId: chatItem.user?.id || myId,
                                        senderName: chatItem.user?.name || getTranslation(activeLang, 'user', 'User'),
                                        timestamp: Date.now()
                                    });
                                }
                            });
                        });

                        const allPinned = [...savedUnified, ...pinnedChatItems];

                        if (allPinned.length === 0) {
                            return <p className="text-xs text-slate-400 text-center py-6">{getTranslation(activeLang, "noPinnedMessages", "No pinned messages or media currently.")}</p>;
                        }

                        return allPinned.map(pinnedItem => (
                            <PinnedMediaCard
                                key={pinnedItem.id}
                                item={pinnedItem}
                                myId={myId}
                                onGoToProfile={(userId) => {
                                    setShowPinnedModal(false);
                                    if (onGoToProfileOverlay) onGoToProfileOverlay(userId);
                                    else onGoToProfile(userId);
                                }}
                                onSelectChat={(chatId, messageId) => {
                                    setShowPinnedModal(false);
                                    const targetChat = chats.find(c => c.id === chatId);
                                    if (targetChat) {
                                        onSelectChat(targetChat);
                                        if (messageId) {
                                            setTimeout(() => {
                                                const el = document.getElementById(`msg-${messageId}`);
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    el.classList.add('ring-4', 'ring-amber-400', 'ring-offset-2', 'ring-offset-black', 'bg-amber-500/30');
                                                    setTimeout(() => {
                                                        el.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-2', 'ring-offset-black', 'bg-amber-500/30');
                                                    }, 3000);
                                                }
                                            }, 600);
                                        }
                                    }
                                }}
                                onUnpin={(msgId) => {
                                    const updated = savedUnified.filter(u => u.id !== msgId);
                                    localStorage.setItem('hisee_unified_pinned_msgs', JSON.stringify(updated));
                                    setShowPinnedModal(false);
                                    setTimeout(() => setShowPinnedModal(true), 50);
                                }}
                            />
                        ));
                    })()}
                </div>
            </div>
        </div>
      )}

      {showAiChatModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowAiChatModal(false)}>
          <div className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowAiChatModal(false)}
              className="absolute top-4 left-4 z-50 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            <AIChat lang={(lang || 'ar') as any} />
          </div>
        </div>
      )}

      {/* Floating Small White Back to Home Button */}
      <div className="fixed bottom-24 right-4 z-[9999]">
          <button
              type="button"
              onClick={() => {
                  if (onNavigateToHome) {
                      onNavigateToHome();
                  }
              }}
              className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-black flex items-center justify-center border border-white/40 shadow-xl hover:scale-110 active:scale-95 transition-all duration-300"
              title={lang === 'ar' ? 'الرجوع للرئيسية ↩️' : 'Back to Home ↩️'}
              aria-label={lang === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
          >
              {lang === 'ar' ? (
                  <ArrowRight size={18} className="text-black" />
              ) : (
                  <ArrowLeft size={18} className="text-black" />
              )}
          </button>
      </div>
    </div>
  );
};

export default ChatList;
