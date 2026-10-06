import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Heart, UserPlus, Star, Info, ArrowRight, Check, X, Wallet, 
  DollarSign, ArrowDownLeft, ArrowUpRight, ShieldCheck, AlertCircle, 
  Megaphone, Gift, MessageSquare, Share2, Link2, Wrench, ShieldAlert, 
  Sparkles, Coins, CheckCircle2, UserCheck, Server, Zap, Trash2, Users as UsersIcon,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, getTranslation, formatTemplateMessage } from '../translations';
import { db as firestoreDb, auth as firestoreAuth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, deleteDoc, setDoc, arrayUnion, increment, getDocs, writeBatch } from 'firebase/firestore';
import { useUsers } from '../src/contexts/UserContext';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { formatTimestampDisplay } from '../lib/helpers';
import { Language } from '../types';
import ModernHSLogo from './ModernHSLogo';

interface Props {
  myId: string;
  myProfile: any;
  onBack: () => void;
  isUiVisible: boolean;
  onToggleUi: () => void;
  onNavigateToProfile: (userId: string) => void;
  onNavigateToHome?: () => void;
  onNavigateToMedia?: (type: 'video' | 'photo' | 'story' | 'live', id: string, userId?: string) => void;
  lang?: Language;
}

const translateNotificationMessage = (notiItem: any, activeLang: string) => {
  if (!notiItem) return '';
  if (typeof notiItem === 'object') {
    if (notiItem.messageKey) {
      return formatTemplateMessage(notiItem.messageKey, notiItem.params, activeLang);
    }
    if (notiItem.message) {
      return translateStringMessage(notiItem.message, activeLang);
    }
    if (notiItem.text) {
      return translateStringMessage(notiItem.text, activeLang);
    }
  }
  if (typeof notiItem === 'string') {
    return translateStringMessage(notiItem, activeLang);
  }
  return String(notiItem);
};

const translateStringMessage = (msg: string, activeLang: string) => {
  if (!msg || typeof msg !== 'string') return msg;
  let text = msg.trim();
  if (activeLang === 'ar') return text;

  if (text.includes('أرسل لك طلب صداقة') || text.includes('طلب صداقة')) {
    return getTranslation(activeLang, 'sentFriendRequest', 'sent you a friend request');
  }
  if (text.includes('قبل طلب الصداقة') || text.includes('أصبحتم أصدقاء الآن')) {
    return getTranslation(activeLang, 'acceptedFriendRequest', 'accepted your friend request');
  }
  if (text.includes('بدأ بمتابعتك') || text.includes('قام بمتابعتك') || text.includes('متابعة جديدة')) {
    return getTranslation(activeLang, 'startedFollowingYou', 'started following you');
  }
  if (text.includes('أعجب بفيديوهاتك') || text.includes('أعجب بفيديو') || text.includes('أعجب بمنشورك') || text.includes('تسجيل إعجاب')) {
    return getTranslation(activeLang, 'likedYourPost', 'liked your post');
  }
  if (text.includes('مشاركة منشور جديد')) {
    return getTranslation(activeLang, 'newPostShare', 'New post share');
  }
  if (text.includes('مشاركة فيديو جديد')) {
    return getTranslation(activeLang, 'newVideoShare', 'New video share');
  }
  if (text.includes('شارك معك')) {
    return getTranslation(activeLang, 'sharedWithYou', 'shared with you');
  }
  if (text.includes('شارك الفيديو الخاص بك') || text.includes('شارك منشورك') || text.includes('قام بمشاركة')) {
    return getTranslation(activeLang, 'sharedYourPost', 'shared your post');
  }
  if (text.includes('علق على منشورك') || text.includes('علق على مقطع') || text.includes('تعليق جديد')) {
    return getTranslation(activeLang, 'commentedOnYourPost', 'commented on your post');
  }
  if (text.includes('أرسل لك هدية') || text.includes('أرسل هدية') || text.includes('هدية جديدة')) {
    return getTranslation(activeLang, 'sentYouAGift', 'sent you a gift');
  }
  if (text.includes('متابعة متبادلة') || text.includes('متبادل')) {
    return getTranslation(activeLang, 'mutualFollow', 'Mutual');
  }
  if (text.includes('إيداع عملات تجريبية مجانية')) {
    return getTranslation(activeLang, 'freeTrialCoins', 'Free trial coins deposit');
  }
  if (text.includes('لاختبار فقط')) {
    return getTranslation(activeLang, 'forTestingOnly', 'For testing only');
  }
  if (text === 'اختبار') {
    return getTranslation(activeLang, 'test', 'Test');
  }
  if (text.includes('تنبيه سيتم تحديث شروط الخدمة قريباً') || text.includes('شروط الخدمة')) {
    return getTranslation(activeLang, 'termsUpdateAlert', 'Notice: Terms of service will be updated soon');
  }
  if (text.includes('نص من نظام')) {
    return getTranslation(activeLang, 'systemMessageText', 'System message');
  }

  return text;
};

// ... existing code ...

const NotificationItem: React.FC<{
  noti: any;
  isSystem: boolean;
  avatarSrc: string | null;
  displayName: string;
  activeLang: string;
  handleNotificationClick: (noti: any) => void;
  renderLeftIndicator: (noti: any, isSystem: boolean) => React.ReactNode;
  handleTouchStart: (noti: any) => void;
  handleTouchEnd: () => void;
}> = ({ noti, isSystem, avatarSrc, displayName, activeLang, handleNotificationClick, renderLeftIndicator, handleTouchStart, handleTouchEnd }) => {
  const [expanded, setExpanded] = useState(false);
  
  const rawMsg = (noti.message || '').trim();
  const isRedundantMutual = rawMsg === 'متابعة متبادلة' || rawMsg === 'متبادل' || rawMsg === 'متابعة متبتدل' || rawMsg.includes('متابعة متبادلة');
  const cleanMsg = isRedundantMutual ? '' : rawMsg;
  const translatedCleanMsg = translateNotificationMessage(cleanMsg, activeLang);
  const isLong = translatedCleanMsg.length > 80;

  return (
    <div 
        onTouchStart={() => handleTouchStart(noti)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onMouseDown={() => handleTouchStart(noti)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onClick={() => handleNotificationClick(noti)}
        className={`p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] active:bg-white/[0.05] flex items-center justify-between transition-colors group cursor-pointer relative z-10 ${noti.read === false ? 'border-r-4 border-r-[#ff3b30] bg-[#ff3b30]/[0.03]' : ''}`}
    >
        <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 border border-white/10 bg-black shadow-inner">
                {noti.category === 'finance' || noti.type?.startsWith('financial_') ? (
                <div className="w-full h-full flex items-center justify-center bg-white/10 text-white">
                    {noti.type === 'financial_deposit' ? <ArrowDownLeft size={20} /> :
                    noti.type === 'financial_payout_approved' ? <ShieldCheck size={20} /> :
                    <AlertCircle size={20} />}
                </div>
                ) : isSystem ? (
                avatarSrc ? (
                    <img 
                        src={avatarSrc} 
                        alt="إعلان" 
                        className="w-full h-full object-cover bg-black"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full p-2 flex items-center justify-center bg-black">
                    <ModernHSLogo size={26} />
                    </div>
                )
                ) : (
                <>
                    <img 
                        src={avatarSrc || ''} 
                        alt={displayName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${noti.fromUserId || 'user'}`;
                            if (target.src !== fallback) {
                                target.src = fallback;
                            }
                        }}
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-black rounded-full flex items-center justify-center border border-white/20">
                        {noti.type === 'friend_request' || noti.type === 'friend_accepted' ? <UserPlus className="text-white" size={8} /> : 
                        noti.type === 'follow' ? <UserPlus className="text-white" size={8} /> :
                        noti.type === 'like' ? <Heart className="text-white" size={8} fill="currentColor" /> :
                        <Info className="text-neutral-400" size={8} />}
                    </div>
                </>
                )}
            </div>
            <div className="flex-1 min-w-0">
                {noti.title && (
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-0.5 truncate">
                    {isSystem && <Megaphone size={13} className="text-neutral-300 shrink-0" />}
                    <span>{translateNotificationMessage(noti.title, activeLang)}</span>
                    {noti.amount !== undefined && noti.amount > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/10 text-white font-bold border border-white/20">
                        {noti.amount} {noti.currency || '€'}
                    </span>
                    )}
                </h4>
                )}
                <div className="text-sm font-medium text-neutral-200 leading-relaxed">
                  <p className={expanded ? '' : 'line-clamp-2'}>
                    {displayName && !isSystem && <span className="text-white font-bold">{displayName} </span>}
                    {translatedCleanMsg}
                  </p>
                  {isLong && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                      }}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 mt-1"
                    >
                      {expanded 
                        ? getTranslation(activeLang, 'readLess', 'عرض أقل') 
                        : getTranslation(activeLang, 'readMore', 'قراءة المزيد')}
                    </button>
                  )}
                </div>
                {noti.transactionRef && (
                <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                    {getTranslation(activeLang, 'refNumber', 'رقم المرجع:')} <span className="text-white">{noti.transactionRef}</span>
                </p>
                )}
                <p className="text-[10px] text-neutral-400 mt-1">
                    {noti.timestamp?.toDate 
                      ? formatTimestampDisplay(noti.timestamp.toDate().getTime(), undefined, activeLang) 
                      : getTranslation(activeLang, 'now', 'الآن')}
                </p>
            </div>
        </div>
        <div className="shrink-0 mr-3">
            {renderLeftIndicator(noti, isSystem)}
        </div>
    </div>
  );
};

const NotificationsView: React.FC<Props> = ({ myId, myProfile, onBack, isUiVisible, onToggleUi, onNavigateToProfile, onNavigateToHome, onNavigateToMedia, lang }) => {
// ...

  const activeLang = lang || (typeof window !== 'undefined' ? localStorage.getItem('hisee_language') : null) || 'ar';
  const t = translations[activeLang] || translations.ar;
  const isRtl = activeLang === 'ar' || activeLang === 'ckb';
  const { users, following, currentUser } = useUsers();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<null | 'friends' | 'follows' | 'activity' | 'shares' | 'system'>(null);
  const [locallyFollowed, setLocallyFollowed] = useState<Set<string>>(new Set());
  const [deleteTargetNoti, setDeleteTargetNoti] = useState<any | null>(null);
  const pressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const handleTouchStart = (noti: any) => {
    isLongPressRef.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) {}
      }
      setDeleteTargetNoti(noti);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const [previewMedia, setPreviewMedia] = useState<{
    type: 'video' | 'image';
    url: string;
    title?: string;
    description?: string;
    senderName?: string;
    senderAvatar?: string;
  } | null>(null);

  const handleDeleteNotification = async (notiId: string) => {
    if (!myId) return;
    try {
      await deleteDoc(doc(firestoreDb, 'users', myId, 'notifications', notiId));
      setNotifications(prev => prev.filter(n => n.id !== notiId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${myId}/notifications/${notiId}`);
    }
  };

  useEffect(() => {
    if (!myId || !firestoreAuth.currentUser) return;

    const notiRef = collection(firestoreDb, 'users', myId, 'notifications');
    const q = query(notiRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const notis: any[] = [];
      const seen = new Set();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const isSystem = data.type === 'SYSTEM_BROADCAST' || data.type === 'ANNOUNCEMENT' || data.fromUserId === 'system' || data.fromUserId === 'admin';
        const isRelationship = data.type === 'friend' || data.type === 'friend_accepted' || data.type === 'follow' || data.type === 'visit';
        const key = (isSystem || !isRelationship) ? doc.id : `${data.fromUserId}_${data.type}`;
        
        const blockedUsers = currentUser?.blockedUsers || [];
        const blockedBy = currentUser?.blockedBy || [];
        if (data.fromUserId && (blockedUsers.includes(data.fromUserId) || blockedBy.includes(data.fromUserId))) {
          return;
        }

        if (!seen.has(key)) {
          seen.add(key);
          notis.push({ id: doc.id, ...data });
        }
      });
      setNotifications(notis);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${myId}/notifications`);
    });

    return () => unsubscribe();
  }, [myId, firestoreAuth.currentUser, currentUser]);

  const handleOpenContent = (noti: any) => {
    if (noti.read === false) {
      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, read: true } : n));
      if (myId) {
        try {
          updateDoc(doc(firestoreDb, 'users', myId, 'notifications', noti.id), {
            read: true
          }).catch(() => {});
        } catch (e) {}
      }
    }

    if (onNavigateToMedia) {
      if (noti.sharedType === 'video' || noti.type === 'video') {
        onNavigateToMedia('video', noti.videoId || '', noti.fromUserId);
        return;
      }
      if (noti.sharedType === 'image' || noti.sharedType === 'photo' || noti.type === 'image' || noti.type === 'photo') {
        onNavigateToMedia('photo', noti.photoId || '', noti.fromUserId);
        return;
      }
      if (noti.sharedType === 'story' || noti.type === 'story') {
        onNavigateToMedia('story', noti.storyId || '', noti.fromUserId);
        return;
      }
      if (noti.sharedType === 'live' || noti.type === 'live') {
        onNavigateToMedia('live', noti.roomId || noti.streamId || `room_${noti.fromUserId}`, noti.fromUserId);
        return;
      }
    }

    const rawUrl = noti.mediaUrl || noti.sharedThumbnail || noti.sharedLink || noti.link || '';
    if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
      window.open(rawUrl, '_blank');
      return;
    }

    if (onNavigateToHome) {
      onNavigateToHome();
    }
  };

  const handleNotificationClick = async (noti: any) => {
    if (noti.read === false) {
      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, read: true } : n));
      if (myId) {
        try {
          await updateDoc(doc(firestoreDb, 'users', myId, 'notifications', noti.id), {
            read: true
          });
        } catch (error: any) {
          if (error.code !== 'not-found') {
            console.error("Error marking notification as read:", error);
          }
        }
      }
    }
    if (noti.type === 'friend_request' || noti.type === 'friend_accepted' || noti.type === 'follow') {
      if (noti.fromUserId) {
        onNavigateToProfile(noti.fromUserId);
      }
      return;
    }
    if (noti.type === 'share' || noti.sharedThumbnail || noti.mediaUrl || noti.sharedLink || noti.link) {
      handleOpenContent(noti);
      return;
    }
  };

  const handleAccept = async (noti: any) => {
    try {
      await setDoc(doc(firestoreDb, 'users', myId), {
        friends: arrayUnion(noti.fromUserId)
      }, { merge: true });
      await setDoc(doc(firestoreDb, 'users', noti.fromUserId), {
        friends: arrayUnion(myId)
      }, { merge: true });
      
      await setDoc(doc(firestoreDb, 'users', noti.fromUserId, 'contacts', myId), {
        status: 'friends',
        timestamp: serverTimestamp()
      }, { merge: true });
      
      await setDoc(doc(firestoreDb, 'users', myId, 'contacts', noti.fromUserId), {
        status: 'friends',
        timestamp: serverTimestamp()
      }, { merge: true });
      
      await setDoc(doc(firestoreDb, 'users', noti.fromUserId, 'notifications', `friend_accepted_${myId}_${noti.fromUserId}`), {
        type: 'friend_accepted',
        fromUserId: myId,
        fromUserName: myProfile?.name || myProfile?.displayName || firestoreAuth.currentUser?.displayName || firestoreAuth.currentUser?.email || firestoreAuth.currentUser?.uid,
        fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || firestoreAuth.currentUser?.photoURL || '',
        timestamp: serverTimestamp(),
        read: false,
        message: 'قبل طلب صداقتك'
      });

      await deleteDoc(doc(firestoreDb, 'users', myId, 'notifications', noti.id));
      if (noti.id !== `friend_${noti.fromUserId}_${myId}`) {
        await deleteDoc(doc(firestoreDb, 'users', myId, 'notifications', `friend_${noti.fromUserId}_${myId}`));
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleReject = async (noti: any) => {
    try {
      await deleteDoc(doc(firestoreDb, 'users', myId, 'notifications', noti.id));
      if (noti.id !== `friend_${noti.fromUserId}_${myId}`) {
        await deleteDoc(doc(firestoreDb, 'users', myId, 'notifications', `friend_${noti.fromUserId}_${myId}`));
      }
      await deleteDoc(doc(firestoreDb, 'users', noti.fromUserId, 'contacts', myId));
      await deleteDoc(doc(firestoreDb, 'users', myId, 'contacts', noti.fromUserId));
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  const handleFollowBack = async (noti: any) => {
    try {
      await setDoc(doc(firestoreDb, 'users', noti.fromUserId, 'followers', myId), {
        timestamp: serverTimestamp()
      });
      await setDoc(doc(firestoreDb, 'users', myId, 'following', noti.fromUserId), {
        timestamp: serverTimestamp()
      });
      
      await setDoc(doc(firestoreDb, 'users', noti.fromUserId), { followersCount: increment(1) }, { merge: true });
      await setDoc(doc(firestoreDb, 'users', myId), { followingCount: increment(1) }, { merge: true });

      await updateDoc(doc(firestoreDb, 'users', myId, 'notifications', noti.id), {
        status: 'mutual',
        message: 'قام بمتابعتك'
      });

      await setDoc(doc(firestoreDb, 'users', noti.fromUserId, 'notifications', `follow_${myId}_${noti.fromUserId}`), {
        type: 'follow',
        fromUserId: myId,
        fromUserName: myProfile?.name || myProfile?.displayName || firestoreAuth.currentUser?.displayName || firestoreAuth.currentUser?.email || firestoreAuth.currentUser?.uid,
        fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || firestoreAuth.currentUser?.photoURL || '',
        timestamp: serverTimestamp(),
        read: false,
        status: 'mutual',
        message: 'قام بمتابعتك'
      });
    } catch (error) {
      console.error("Error following back:", error);
    }
  };

  const handleFollowSuggested = async (targetUser: any) => {
    if (!targetUser?.id) return;
    // Hide immediately from UI
    setLocallyFollowed(prev => new Set(prev).add(targetUser.id));

    try {
      await setDoc(doc(firestoreDb, 'users', targetUser.id, 'followers', myId), {
        timestamp: serverTimestamp()
      });
      await setDoc(doc(firestoreDb, 'users', myId, 'following', targetUser.id), {
        timestamp: serverTimestamp()
      });
      await setDoc(doc(firestoreDb, 'users', targetUser.id), { followersCount: increment(1) }, { merge: true });
      await setDoc(doc(firestoreDb, 'users', myId), { followingCount: increment(1) }, { merge: true });

      await setDoc(doc(firestoreDb, 'users', targetUser.id, 'notifications', `follow_${myId}_${targetUser.id}`), {
        type: 'follow',
        fromUserId: myId,
        fromUserName: myProfile?.name || myProfile?.displayName || firestoreAuth.currentUser?.displayName || firestoreAuth.currentUser?.email || firestoreAuth.currentUser?.uid,
        fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || firestoreAuth.currentUser?.photoURL || '',
        timestamp: serverTimestamp(),
        read: false,
        status: 'follow',
        message: 'بدأ بمتابعتك'
      });
    } catch (e) {
      console.error("Error following suggested user:", e);
    }
  };

  const getAvatarForUser = (userId: string, storedAvatar?: string) => {
    const liveUser = users[userId];
    const rawAvatar = liveUser?.avatar || storedAvatar || liveUser?.photoURL;
    return normalizeMediaUrl(rawAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId || 'user'}`;
  };

  const getNameForUser = (userId: string, storedName?: string) => {
    const liveUser = users[userId];
    return liveUser?.name || storedName || getTranslation(activeLang, 'user', 'مستخدم');
  };

  // Categorize notifications cleanly and strictly
  const friendRequestsNotis = notifications.filter(n => n.type === 'friend_request' || n.type === 'friend');
  const followsNotis = notifications.filter(n => n.type === 'follow');
  const activityNotis = notifications.filter(n => 
    !friendRequestsNotis.includes(n) &&
    !followsNotis.includes(n) &&
    (
      n.type === 'like' || n.type === 'video_like' || n.type === 'heart' || 
      n.type === 'comment' || n.type === 'reply' || 
      n.type === 'gift' || n.type === 'reward' || n.category === 'REWARD_GIFT' || n.type === 'star_received' ||
      n.message?.includes('إعجاب') || n.message?.includes('تعليق') || n.message?.includes('هدية') || n.message?.includes('ماس') || n.message?.includes('ملصق') || n.message?.includes('نجمة')
    )
  );
  const sharesNotis = notifications.filter(n => 
    !friendRequestsNotis.includes(n) &&
    !followsNotis.includes(n) &&
    !activityNotis.includes(n) &&
    (
      n.type === 'share' || n.sharedType || n.sharedThumbnail || n.sharedLink || n.link || n.mediaUrl ||
      n.message?.includes('مشاركة') || n.message?.includes('شارك') || n.message?.includes('رابط')
    )
  );
  // System Notifications: catch-all for any notifications not fitting into other categories
  const systemNotis = notifications.filter(n => {
    const isInOtherCategory = 
      friendRequestsNotis.some(f => f.id === n.id) || 
      followsNotis.some(f => f.id === n.id) || 
      activityNotis.some(f => f.id === n.id) || 
      sharesNotis.some(f => f.id === n.id);
    
    return !isInOtherCategory;
  });

  // Calculate unread counts for each category
  const countUnread = (list: any[]) => list.filter(n => n.read === false).length;
  const friendRequestsUnread = countUnread(friendRequestsNotis);
  const followsUnread = countUnread(followsNotis);
  const activityUnread = countUnread(activityNotis);
  const sharesUnread = countUnread(sharesNotis);
  const systemUnread = countUnread(systemNotis);

  // Category badge: white with "0" if zero, red with count if new notifications exist
  const renderCategoryBadge = (unreadCount: number) => {
    if (unreadCount > 0) {
      return (
        <span className="text-[#ff3b30] font-black text-sm sm:text-base px-3 py-0.5 rounded-full bg-[#ff3b30]/15 border border-[#ff3b30]/40 shadow-[0_0_12px_rgba(255,59,48,0.35)] animate-pulse">
          {unreadCount}
        </span>
      );
    }
    return (
      <span className="text-white font-bold text-sm sm:text-base px-3 py-0.5 rounded-full bg-white/5 border border-white/15">
        0
      </span>
    );
  };

  // Open category and filter/clear new notifications upon viewing
  const handleOpenCategory = async (category: 'friends' | 'follows' | 'activity' | 'shares' | 'system') => {
    setActiveCategory(category);

    let targetList: any[] = [];
    if (category === 'friends') targetList = friendRequestsNotis;
    else if (category === 'follows') targetList = followsNotis;
    else if (category === 'activity') targetList = activityNotis;
    else if (category === 'shares') targetList = sharesNotis;
    else if (category === 'system') targetList = systemNotis;

    const unreadItems = targetList.filter(n => n.read === false);
    if (unreadItems.length > 0 && myId) {
      // 1. Immediately update local state so badges and list update instantly
      setNotifications(prev => prev.map(n => {
        if (unreadItems.some(u => u.id === n.id)) {
          return { ...n, read: true };
        }
        return n;
      }));

      // 2. Persist read status in Firestore
      try {
        const batch = writeBatch(firestoreDb);
        unreadItems.slice(0, 450).forEach(item => {
          const ref = doc(firestoreDb, 'users', myId, 'notifications', item.id);
          batch.update(ref, { read: true });
        });
        await batch.commit();
      } catch (err) {
        console.error("Error clearing category notifications:", err);
      }
    }
  };

  // Ensure active category notifications are filtered/cleared as viewed
  useEffect(() => {
    if (!activeCategory || !myId) return;

    let targetList: any[] = [];
    if (activeCategory === 'friends') targetList = friendRequestsNotis;
    else if (activeCategory === 'follows') targetList = followsNotis;
    else if (activeCategory === 'activity') targetList = activityNotis;
    else if (activeCategory === 'shares') targetList = sharesNotis;
    else if (activeCategory === 'system') targetList = systemNotis;

    const unreadItems = targetList.filter(n => n.read === false);
    if (unreadItems.length > 0) {
      setNotifications(prev => prev.map(n => {
        if (unreadItems.some(u => u.id === n.id)) {
          return { ...n, read: true };
        }
        return n;
      }));

      const batch = writeBatch(firestoreDb);
      unreadItems.slice(0, 450).forEach(item => {
        const ref = doc(firestoreDb, 'users', myId, 'notifications', item.id);
        batch.update(ref, { read: true });
      });
      batch.commit().catch(err => console.error("Error auto-reading active category:", err));
    }
  }, [activeCategory]);

  const getCategoryList = () => {
    if (activeCategory === 'friends') return friendRequestsNotis;
    if (activeCategory === 'follows') return followsNotis;
    if (activeCategory === 'activity') return activityNotis;
    if (activeCategory === 'shares') return sharesNotis;
    if (activeCategory === 'system') return systemNotis;
    return notifications;
  };

  // Filter suggested users: exclude current user, already followed, friends, and locally dismissed
  const availableSuggested = Object.values(users).filter((u: any) => {
    if (!u || !u.id || u.id === myId) return false;
    if (following.has(u.id) || locallyFollowed.has(u.id)) return false;
    const currentAny = currentUser as any;
    if (Array.isArray(currentAny?.friends) && currentAny.friends.includes(u.id)) return false;
    const blockedUsers = currentUser?.blockedUsers || [];
    const blockedBy = currentUser?.blockedBy || [];
    if (blockedUsers.includes(u.id) || blockedBy.includes(u.id)) return false;
    return true;
  });

  const horizontalCount = Math.min(8, Math.max(2, Math.ceil(availableSuggested.length / 2)));
  const horizontalSuggestions = availableSuggested.slice(0, horizontalCount);
  const verticalSuggestions = availableSuggested.slice(horizontalCount);

  const renderLeftIndicator = (noti: any, isSystem: boolean) => {
    if ((noti.type === 'friend_request' || noti.type === 'friend') && noti.status !== 'accepted') {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleAccept(noti);
            }} 
            className="p-2.5 bg-white text-black rounded-xl hover:bg-neutral-200 transition-all shadow-sm active:scale-95 cursor-pointer font-bold text-xs" 
            title={getTranslation(activeLang, 'accept', 'قبول')}
          >
            <Check size={16} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleReject(noti);
            }} 
            className="p-2.5 bg-[#262626] text-white rounded-xl hover:bg-[#333333] transition-all border border-white/10 active:scale-95 cursor-pointer" 
            title={getTranslation(activeLang, 'reject', 'رفض')}
          >
            <X size={16} />
          </button>
        </div>
      );
    }

    if (noti.type === 'friend_accepted' || noti.status === 'accepted') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold shrink-0">
          <CheckCircle2 size={15} />
          <span>{getTranslation(activeLang, 'friend', 'صديق')}</span>
        </div>
      );
    }

    if (noti.type === 'follow') {
      if (following.has(noti.fromUserId) || noti.status === 'mutual') {
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/15 text-white rounded-xl text-[11px] font-bold shrink-0">
            <UserCheck size={14} />
            <span>{getTranslation(activeLang, 'mutualFollow', 'متبادل')}</span>
          </div>
        );
      }
      return (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleFollowBack(noti);
          }} 
          className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black rounded-xl text-[11px] font-bold transition-all shadow-sm shrink-0 cursor-pointer active:scale-95"
        >
          {getTranslation(activeLang, 'followBack', 'رد المتابعة')}
        </button>
      );
    }

    if (noti.type === 'like' || noti.type === 'video_like' || noti.message?.includes('إعجاب') || noti.type === 'heart') {
      return (
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
          <Heart size={18} className="fill-white" />
        </div>
      );
    }

    if (noti.type === 'share' || noti.sharedType || noti.sharedThumbnail || noti.sharedLink || noti.link || noti.mediaUrl || noti.message?.includes('مشاركة') || noti.message?.includes('رابط')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
          <Link2 size={18} />
        </div>
      );
    }

    if (noti.type === 'gift' || noti.type === 'reward' || noti.category === 'REWARD_GIFT' || noti.message?.includes('هدية') || noti.message?.includes('ماس') || noti.message?.includes('ملصق') || noti.type === 'star_received') {
      return (
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
          {noti.type === 'star_received' ? <Star size={18} className="text-yellow-400 fill-yellow-400" /> : <Gift size={18} />}
        </div>
      );
    }

    if (noti.type === 'comment' || noti.type === 'reply' || noti.message?.includes('تعليق') || noti.message?.includes('رد')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
          <MessageSquare size={18} />
        </div>
      );
    }

    if (noti.category === 'finance' || noti.type?.startsWith('financial_')) {
      if (noti.type === 'financial_deposit') {
        return (
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
            <Coins size={18} />
          </div>
        );
      }
      if (noti.type === 'financial_payout_approved') {
        return (
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
            <ShieldCheck size={18} />
          </div>
        );
      }
      return (
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
          <Wallet size={18} />
        </div>
      );
    }

    if (isSystem) {
      const category = noti.category || noti.type;
      if (category === 'MAINTENANCE' || noti.message?.includes('صيانة') || noti.message?.includes('سيرفر') || noti.title?.includes('صيانة')) {
        return (
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
            <Wrench size={18} />
          </div>
        );
      }
      if (category === 'SYSTEM_ALERT' || noti.message?.includes('أمان') || noti.message?.includes('تحذير') || noti.title?.includes('أمان')) {
        return (
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
            <ShieldAlert size={18} />
          </div>
        );
      }
      if (category === 'REWARD_GIFT' || noti.message?.includes('مكافأة') || noti.message?.includes('هدية') || noti.title?.includes('مكافأة')) {
        return (
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
            <Sparkles size={18} />
          </div>
        );
      }
      return (
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
          <Megaphone size={18} />
        </div>
      );
    }

    return (
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
        <Bell size={16} />
      </div>
    );
  };

  return (
    <div 
        className="flex flex-col h-full w-full bg-[#0d0d0d] p-5 sm:p-8 md:p-10 overflow-hidden"
        onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button')) {
                onToggleUi();
            }
        }}
    >
        {/* Header */}
        <header className={`mb-6 flex items-center gap-4 transition-all duration-300 ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}>
            <button 
              onClick={() => {
                if (activeCategory) {
                  setActiveCategory(null);
                } else {
                  onBack();
                }
              }} 
              className="p-2.5 bg-transparent border border-white/10 rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer" 
              aria-label={t.onBack}
            >
              <ArrowRight size={20} className={isRtl ? '' : 'rotate-180'} aria-hidden="true" />
            </button>
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-0.5">
                  {activeCategory === 'friends' ? getTranslation(activeLang, 'friendRequests', 'طلبات الصداقة') :
                   activeCategory === 'follows' ? getTranslation(activeLang, 'newFollowers', 'المتابعات') :
                   activeCategory === 'activity' ? getTranslation(activeLang, 'activityAndInteractions', 'النشاط والتفاعل') :
                   activeCategory === 'shares' ? getTranslation(activeLang, 'sharesAndLinks', 'المشاركات والروابط') :
                   activeCategory === 'system' ? getTranslation(activeLang, 'systemAlerts', 'تنبيهات النظام') :
                   getTranslation(activeLang, 'notifications', 'التنبيهات')}
                </h1>
                <p className="text-neutral-400 text-xs sm:text-sm">
                  {activeCategory ? getTranslation(activeLang, 'viewCategoryNotifications', 'استعراض إشعارات هذه الفئة') : getTranslation(activeLang, 'notificationsSubtitle', 'تابع كل ما هو جديد حول حسابك.')}
                </p>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-24">
            {/* If NO category is selected, show Category Cards + Suggestions */}
            {!activeCategory ? (
              <>
                {/* 1. Categorized View Cards - Sleek Minimalist & Dynamic Badges (White 0 / Red New) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Friend Requests Card */}
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleOpenCategory('friends')}
                    className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] cursor-pointer relative flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition-colors">
                        <UserPlus size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-neutral-100">{getTranslation(activeLang, 'friendRequests', 'طلبات الصداقة')}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{getTranslation(activeLang, 'newConnectionRequests', 'طلبات الاتصال الجديدة')}</p>
                      </div>
                    </div>
                    {renderCategoryBadge(friendRequestsUnread)}
                  </motion.div>

                  {/* Follows Card */}
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleOpenCategory('follows')}
                    className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] cursor-pointer relative flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition-colors">
                        <UserCheck size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-neutral-100">{getTranslation(activeLang, 'newFollowers', 'المتابعات')}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{getTranslation(activeLang, 'newFollowersDesc', 'المتابعون الجدد لحسابك')}</p>
                      </div>
                    </div>
                    {renderCategoryBadge(followsUnread)}
                  </motion.div>

                  {/* Activity Card */}
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleOpenCategory('activity')}
                    className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] cursor-pointer relative flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition-colors">
                        <Heart size={22} className="fill-white/30" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-neutral-100">{getTranslation(activeLang, 'activityAndInteractions', 'النشاط والتفاعل')}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{getTranslation(activeLang, 'likesCommentsGifts', 'الإعجابات والتعليقات والهدايا')}</p>
                      </div>
                    </div>
                    {renderCategoryBadge(activityUnread)}
                  </motion.div>

                  {/* Shares & Links Card (المشاركات والروابط) */}
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleOpenCategory('shares')}
                    className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] cursor-pointer relative flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition-colors">
                        <Link2 size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-neutral-100 flex items-center gap-1.5">
                          <span>{getTranslation(activeLang, 'sharesAndLinks', 'المشاركات والروابط')}</span>
                          <span className="text-xs">🔗</span>
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{getTranslation(activeLang, 'sharesDesc', 'مشاركات الفيديو والصور والروابط')}</p>
                      </div>
                    </div>
                    {renderCategoryBadge(sharesUnread)}
                  </motion.div>

                  {/* System & App Notifications Card */}
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleOpenCategory('system')}
                    className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] cursor-pointer relative flex items-center justify-between group transition-all sm:col-span-2"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition-colors">
                        <Megaphone size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-neutral-100">{getTranslation(activeLang, 'systemAlerts', 'تنبيهات النظام')}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{getTranslation(activeLang, 'systemAlertsDesc', 'الرسائل والتحديثات الإدارية الصادرة من التطبيق')}</p>
                      </div>
                    </div>
                    {renderCategoryBadge(systemUnread)}
                  </motion.div>
                </div>

                {/* 2. Structured Suggestions Section (قسم الاقتراحات) - Minimalist & Unified */}
                <div className="mt-8 pt-6 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UsersIcon size={18} className="text-white" />
                      <h3 className="text-sm font-bold text-white">{getTranslation(activeLang, 'friendSuggestions', 'اقتراحات الأصدقاء')}</h3>
                    </div>
                    <span className="text-xs text-neutral-400">{getTranslation(activeLang, 'discoverNewPeople', 'اكتشف أشخاصاً جدد')}</span>
                  </div>

                  {/* Part 1: Horizontal Scroll Bar (اقتراحات سريعة) - Enlarged Avatars without Card Box */}
                  {horizontalSuggestions.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h4 className="text-xs font-bold text-neutral-300">{getTranslation(activeLang, 'quickSuggestions', 'اقتراحات سريعة')}</h4>
                        <span className="text-[11px] text-neutral-400">{getTranslation(activeLang, 'swipeToBrowse', 'سحب أفقي للتصفح')}</span>
                      </div>
                      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar pb-2 pt-1" dir={isRtl ? 'rtl' : 'ltr'}>
                        {horizontalSuggestions.map((user: any) => (
                          <div 
                            key={user.id}
                            className="flex flex-col items-center shrink-0 w-22 sm:w-26 text-center group"
                          >
                            <div className="relative mb-2.5">
                              <img 
                                src={normalizeMediaUrl(user.avatar || user.photoURL) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                alt={user.name || user.displayName}
                                onClick={() => onNavigateToProfile(user.id)}
                                className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover border-2 border-white/20 group-hover:border-white transition-all shadow-md cursor-pointer bg-neutral-900"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFollowSuggested(user);
                                }}
                                className="absolute bottom-0 right-0 w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-white text-black hover:bg-neutral-200 border-2 border-[#0d0d0d] flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                                title={getTranslation(activeLang, 'add', 'إضافة')}
                              >
                                <Plus size={15} strokeWidth={3} />
                              </button>
                            </div>
                            <p 
                              onClick={() => onNavigateToProfile(user.id)}
                              className="text-xs font-bold text-white truncate w-full max-w-[88px] sm:max-w-[104px] cursor-pointer hover:underline"
                            >
                              {user.name || user.displayName || getTranslation(activeLang, 'user', 'مستخدم')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Part 2: Vertical List (أشخاص قد تعرفهم) - Enlarged Avatars & Clean Rows */}
                  <div>
                    <h4 className="text-xs font-bold text-neutral-300 mb-2 px-1">{getTranslation(activeLang, 'peopleYouMayKnow', 'أشخاص قد تعرفهم')}</h4>
                    <div className="flex flex-col">
                      {verticalSuggestions.map((user: any) => (
                        <div
                          key={user.id}
                          className="py-3 px-2 sm:px-3 hover:bg-white/[0.03] rounded-2xl flex items-center justify-between transition-colors border-b border-white/[0.06] last:border-b-0"
                        >
                          <div 
                            className="flex items-center gap-3.5 cursor-pointer min-w-0"
                            onClick={() => onNavigateToProfile(user.id)}
                          >
                            <img 
                              src={normalizeMediaUrl(user.avatar || user.photoURL) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                              alt={user.name || user.displayName}
                              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border border-white/20 shrink-0 bg-neutral-900 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <h5 className="text-base font-bold text-white truncate hover:underline">
                                {user.name || user.displayName || getTranslation(activeLang, 'user', 'مستخدم')}
                              </h5>
                              <p className="text-xs text-neutral-400 truncate mt-0.5">
                                @{user.username || user.id.slice(0, 6)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleFollowSuggested(user)}
                            className="px-5 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer"
                          >
                            {getTranslation(activeLang, 'follow', 'متابعة')}
                          </button>
                        </div>
                      ))}

                      {availableSuggested.length === 0 && (
                        <div className="py-8 text-center text-neutral-500 text-xs">
                          {getTranslation(activeLang, 'noSuggestionsYet', 'لا توجد اقتراحات جديدة حالياً')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* If a category IS selected, show filtered notifications list */
              <AnimatePresence initial={false}>
                {getCategoryList().map(noti => {
                    const isSystem = noti.type === 'SYSTEM_BROADCAST' || noti.type === 'ANNOUNCEMENT' || noti.fromUserId === 'system' || noti.fromUserId === 'admin';
                    const customImage = noti.imageUrl || noti.fromUserAvatar;
                    const avatarSrc = isSystem ? (customImage ? normalizeMediaUrl(customImage) : null) : getAvatarForUser(noti.fromUserId, noti.fromUserAvatar);
                    const displayName = isSystem ? (noti.fromUserName || getTranslation(activeLang, 'appManagement', 'إدارة التطبيق')) : getNameForUser(noti.fromUserId, noti.fromUserName);

                    return (
                    <motion.div
                        key={noti.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 100 }}
                        transition={{ type: "spring", stiffness: 500, damping: 50, mass: 1 }}
                        className="relative group/noti select-none"
                    >
                        <NotificationItem 
                          noti={noti}
                          isSystem={isSystem}
                          avatarSrc={avatarSrc}
                          displayName={displayName}
                          activeLang={activeLang}
                          handleNotificationClick={handleNotificationClick}
                          renderLeftIndicator={renderLeftIndicator}
                          handleTouchStart={handleTouchStart}
                          handleTouchEnd={handleTouchEnd}
                        />
                    </motion.div>
                )})}
                {getCategoryList().length === 0 && (
                  <div className="py-16 text-center text-neutral-400 text-sm">
                    {getTranslation(activeLang, 'noNotificationsInCategory', 'لا توجد إشعارات في هذه الفئة حالياً')}
                  </div>
                )}
              </AnimatePresence>
            )}
        </div>

        {/* Modal for viewing original media (Images & Videos) - Monochrome */}
        {previewMedia && (
          <div 
            className="fixed inset-0 z-[2500] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={() => setPreviewMedia(null)}
          >
            <div className="flex items-center justify-between w-full max-w-2xl mx-auto z-10 pt-2 pb-3 border-b border-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                {previewMedia.senderAvatar && (
                  <img 
                    src={normalizeMediaUrl(previewMedia.senderAvatar)} 
                    className="w-10 h-10 rounded-full object-cover border border-white/20 shadow"
                    alt="" 
                    referrerPolicy="no-referrer" 
                  />
                )}
                <div className="text-right">
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {previewMedia.senderName || getTranslation(activeLang, 'user', 'مستخدم')}
                  </h4>
                  <span className="text-[11px] text-neutral-300 font-medium flex items-center gap-1">
                    <Sparkles size={11} /> {previewMedia.type === 'video' ? getTranslation(activeLang, 'originalVideo', 'مقطع فيديو أصلي') : getTranslation(activeLang, 'originalPhoto', 'صورة أصلية')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setPreviewMedia(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                title={getTranslation(activeLang, 'close', 'إغلاق')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center my-auto p-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {previewMedia.type === 'video' ? (
                <video 
                  src={normalizeMediaUrl(previewMedia.url)} 
                  controls 
                  autoPlay 
                  playsInline 
                  className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/10 object-contain bg-black"
                />
              ) : (
                <img 
                  src={normalizeMediaUrl(previewMedia.url)} 
                  alt={previewMedia.title || getTranslation(activeLang, 'photo', 'صورة')} 
                  className="max-h-[70vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/10 object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="w-full max-w-2xl mx-auto z-10 pb-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="text-right w-full sm:w-auto">
                {previewMedia.title && (
                  <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">{previewMedia.title}</p>
                )}
                {previewMedia.description && (
                  <p className="text-[11px] text-neutral-400 line-clamp-1">{previewMedia.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {previewMedia.type === 'video' && onNavigateToHome && (
                  <button 
                    onClick={() => {
                      setPreviewMedia(null);
                      onNavigateToHome();
                    }}
                    className="px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer active:scale-95 w-full sm:w-auto justify-center"
                  >
                    <span>{getTranslation(activeLang, 'goToMainVideos', 'الانتقال للفيديوهات الرئيسية')}</span>
                    <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
                  </button>
                )}
                <button 
                  onClick={() => setPreviewMedia(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {getTranslation(activeLang, 'close', 'إغلاق')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Long Press Delete Confirmation Dialog */}
        <AnimatePresence>
          {deleteTargetNoti && (
            <div 
              className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setDeleteTargetNoti(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#161616] border border-white/15 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/25 text-[#ff3b30] flex items-center justify-center mb-4">
                  <Trash2 size={26} />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">
                  {getTranslation(activeLang, 'deleteNotification', 'حذف التنبيه')}
                </h3>
                <p className="text-xs text-neutral-400 mb-6 leading-relaxed max-w-xs">
                  {getTranslation(activeLang, 'deleteNotificationConfirm', 'هل أنت متأكد من رغبتك في حذف هذا التنبيه نهائياً من قائمتك؟')}
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button 
                    onClick={() => {
                      if (deleteTargetNoti?.id) {
                        handleDeleteNotification(deleteTargetNoti.id);
                      }
                      setDeleteTargetNoti(null);
                    }}
                    className="flex-1 py-3 px-4 bg-[#ff3b30] hover:bg-[#e0352b] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    {getTranslation(activeLang, 'delete', 'حذف')}
                  </button>
                  <button 
                    onClick={() => setDeleteTargetNoti(null)}
                    className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all cursor-pointer border border-white/10 active:scale-95"
                  >
                    {getTranslation(activeLang, 'cancel', 'إلغاء')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default NotificationsView;
