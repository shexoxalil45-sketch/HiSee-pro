
import React, { useState, useRef, useEffect } from 'react';
import { Chat, User } from '../types';
import { db as firestore, auth as firestoreAuth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { collection, query, limit, onSnapshot, doc, where, setDoc, deleteDoc, updateDoc, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Search, UserPlus, MessageCircle, MoreVertical, ArrowRight, Users, X, Shield, Trash2, LogOut, Loader2, Phone, Video } from 'lucide-react';
import { translations, getTranslation } from '../translations';
import { motion, AnimatePresence } from 'motion/react';
import { isUserOnline as isUserOnlineHelper, formatLastSeenArabic } from '../lib/helpers';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { useUsers } from '../src/contexts/UserContext';

interface Props {
  onSelectChat: (chat: Chat) => void;
  onBack: () => void;
  myId: string;
  lang?: string;
}

const ContactsView: React.FC<Props> = ({ onSelectChat, onBack, myId, lang = 'ar' }) => {
  const t = translations[lang] || translations.ar;
  const { users } = useUsers();
  const myProfile = users[myId];
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Chat[]>([]);
  const [firestoreUsers, setFirestoreUsers] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<string[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<any[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followersIds, setFollowersIds] = useState<string[]>([]);

  const isUserOnline = (user: any) => {
    if (!user) return false;
    return isUserOnlineHelper(user.lastSeen || user.lastActive, user.isOnline);
  };

  const formatLastSeen = (lastActive: any, user?: any) => {
    return formatLastSeenArabic(lastActive, user?.isOnline, lang);
  };

  useEffect(() => {
    if (!myId) return;
    const userRef = doc(firestore, 'users', myId);
    const unsubscribe = onSnapshot(userRef, (userDoc) => {
      if (document.hidden) return;
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFriends(userData.friends || []);
      }
    });
    return () => unsubscribe();
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    const followingRef = collection(firestore, 'users', myId, 'following');
    const unsubscribe = onSnapshot(followingRef, (snapshot) => {
      if (document.hidden) return;
      setFollowingIds(snapshot.docs.map(doc => doc.id));
    });
    return () => unsubscribe();
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    const followersRef = collection(firestore, 'users', myId, 'followers');
    const unsubscribe = onSnapshot(followersRef, (snapshot) => {
      if (document.hidden) return;
      setFollowersIds(snapshot.docs.map(doc => doc.id));
    });
    return () => unsubscribe();
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    const incomingRef = collection(firestore, 'users', myId, 'pendingRequests');
    const unsubIncoming = onSnapshot(incomingRef, (snapshot) => {
      if (document.hidden) return;
      setPendingIncoming(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const outgoingRef = collection(firestore, 'users', myId, 'outgoingRequests');
    const unsubOutgoing = onSnapshot(outgoingRef, (snapshot) => {
      if (document.hidden) return;
      setPendingOutgoing(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => {
        unsubIncoming();
        unsubOutgoing();
    };
  }, [myId]);

  useEffect(() => {
    if (!firestoreAuth.currentUser) return;

    const usersRef = collection(firestore, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      if (document.hidden) return;
      const friendUsers: Chat[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const isMutual = (followingIds.includes(doc.id) && followersIds.includes(doc.id)) || doc.id.startsWith('mock-');
        const isFriend = friends.includes(doc.id) || isMutual;
        const incomingReq = pendingIncoming.find(r => r.id === doc.id);
        const outgoingReq = pendingOutgoing.find(r => r.id === doc.id);
        
        if (isFriend || incomingReq || outgoingReq) {
          const email = data.email;
          const emailStr = typeof email === 'string' ? email : (email?.value || '');
          const rawName = data.displayName || data.name || emailStr || doc.id;
          const cleanName = (rawName === doc.id || rawName === emailStr) && emailStr && emailStr.includes('@') 
            ? emailStr.split('@')[0] 
            : rawName;
            
          friendUsers.push({
            id: [myId, doc.id].sort().join('_'),
            user: {
              id: doc.id,
              name: cleanName,
              avatar: data.photoURL || data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailStr || doc.id}`,
              status: data.status || 'offline',
              isOnline: data.isOnline || false,
              lastActive: data.lastActive
            },
            lastMessage: isFriend ? 'أهلاً! لنبدأ المحادثة' : (incomingReq ? 'طلب صداقة جديد' : 'بانتظار الموافقة'),
            timestamp: 'الآن',
            unreadCount: 0,
            isOnline: isUserOnline(data.lastActive),
            status: isFriend ? 'friends' : 'pending',
            requestStatus: (incomingReq || outgoingReq) ? 'pending' : undefined,
            senderId: incomingReq ? doc.id : (outgoingReq ? myId : undefined)
          });
        }
      });

      setContacts(friendUsers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [firestoreAuth.currentUser, friends, pendingIncoming, pendingOutgoing, followingIds, followersIds]);

  const handleAcceptRequest = async (contactId: string) => {
    try {
      const myRef = doc(firestore, 'users', myId);
      const theirRef = doc(firestore, 'users', contactId);
      await updateDoc(myRef, { friends: arrayUnion(contactId) });
      await updateDoc(theirRef, { friends: arrayUnion(myId) });
      await deleteDoc(doc(firestore, 'users', myId, 'pendingRequests', contactId));
      await deleteDoc(doc(firestore, 'users', contactId, 'outgoingRequests', myId));
      
      // Clean up request notification & send acceptance notification with deterministic IDs
      await deleteDoc(doc(firestore, 'users', myId, 'notifications', `friend_${contactId}_${myId}`));
      await setDoc(doc(firestore, 'users', contactId, 'notifications', `friend_accepted_${myId}_${contactId}`), {
        type: 'friend_accepted',
        fromUserId: myId,
        fromUserName: myProfile?.name || myProfile?.displayName || firestoreAuth.currentUser?.displayName || firestoreAuth.currentUser?.email || firestoreAuth.currentUser?.uid,
        fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || firestoreAuth.currentUser?.photoURL || '',
        timestamp: Date.now(),
        read: false,
        message: 'قبل طلب صداقتك'
      });

      const chatId = [myId, contactId].sort().join('_');
      await setDoc(doc(firestore, 'chats', chatId), {
        [`messageCount_${myId}`]: 0,
        [`messageCount_${contactId}`]: 0,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleRejectRequest = async (contactId: string) => {
    try {
      await deleteDoc(doc(firestore, 'users', myId, 'pendingRequests', contactId));
      await deleteDoc(doc(firestore, 'users', contactId, 'outgoingRequests', myId));
      await deleteDoc(doc(firestore, 'users', myId, 'notifications', `friend_${contactId}_${myId}`));
      const chatId = [myId, contactId].sort().join('_');
      await setDoc(doc(firestore, 'chats', chatId), {
        [`messageCount_${myId}`]: 0,
        [`messageCount_${contactId}`]: 0
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pendingRequests');
    }
  };

  const handleCancelRequest = async (contactId: string) => {
    try {
      await deleteDoc(doc(firestore, 'users', contactId, 'pendingRequests', myId));
      await deleteDoc(doc(firestore, 'users', myId, 'outgoingRequests', contactId));
      await deleteDoc(doc(firestore, 'users', contactId, 'notifications', `friend_${myId}_${contactId}`));
      const chatId = [myId, contactId].sort().join('_');
      await setDoc(doc(firestore, 'chats', chatId), {
        [`messageCount_${myId}`]: 0,
        [`messageCount_${contactId}`]: 0
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pendingRequests');
    }
  };

  const handleUnfriend = async (contactId: string) => {
    try {
      const myRef = doc(firestore, 'users', myId);
      const theirRef = doc(firestore, 'users', contactId);
      
      await setDoc(myRef, { friends: arrayRemove(contactId) }, { merge: true });
      await setDoc(theirRef, { friends: arrayRemove(myId) }, { merge: true });
      
      // Clean up notifications between users
      await deleteDoc(doc(firestore, 'users', contactId, 'notifications', `friend_${myId}_${contactId}`)).catch(() => {});
      await deleteDoc(doc(firestore, 'users', myId, 'notifications', `friend_${contactId}_${myId}`)).catch(() => {});
      await deleteDoc(doc(firestore, 'users', contactId, 'notifications', `friend_accepted_${myId}_${contactId}`)).catch(() => {});
      await deleteDoc(doc(firestore, 'users', myId, 'notifications', `friend_accepted_${contactId}_${myId}`)).catch(() => {});

      // Remove from contacts subcollections
      await deleteDoc(doc(firestore, 'users', myId, 'contacts', contactId)).catch(() => {});
      await deleteDoc(doc(firestore, 'users', contactId, 'contacts', myId)).catch(() => {});

      // Reset message counts / cleanup chat safely
      const chatId = [myId, contactId].sort().join('_');
      await setDoc(doc(firestore, 'chats', chatId), {
        [`messageCount_${myId}`]: 0,
        [`messageCount_${contactId}`]: 0
      }, { merge: true }).catch(() => {});
      await deleteDoc(doc(firestore, 'chats', chatId)).catch(() => {});
      
      setLongPressContact(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleSendRequest = async (contactId: string) => {
    try {
      await setDoc(doc(firestore, 'users', contactId, 'pendingRequests', myId), {
        timestamp: Date.now(),
        senderId: myId
      });
      await setDoc(doc(firestore, 'users', myId, 'outgoingRequests', contactId), {
        timestamp: Date.now(),
        receiverId: contactId
      });
      
      // Create friend request notification with deterministic ID
      await setDoc(doc(firestore, 'users', contactId, 'notifications', `friend_${myId}_${contactId}`), {
        type: 'friend_request',
        fromUserId: myId,
        fromUserName: myProfile?.name || myProfile?.displayName || firestoreAuth.currentUser?.displayName || firestoreAuth.currentUser?.email || firestoreAuth.currentUser?.uid,
        fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || firestoreAuth.currentUser?.photoURL || '',
        timestamp: Date.now(),
        read: false,
        message: 'أرسل لك طلب صداقة'
      });

      // Reset message counts
      const chatId = [myId, contactId].sort().join('_');
      await setDoc(doc(firestore, 'chats', chatId), {
        [`messageCount_${myId}`]: 0,
        [`messageCount_${contactId}`]: 0
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pendingRequests');
    }
  };

  useEffect(() => {
    if (!search.trim() || !firestoreAuth.currentUser) {
      setFirestoreUsers([]);
      return;
    }

    setLoading(true);
    console.log(`[Search] Initiating real-time search for: "${search}"`);
    
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const allUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('My lastActive:', data.lastActive);
        return {
          id: doc.id,
          ...data
        } as any;
      });

      console.log(`[Search] Total users in Firestore: ${allUsers.length}`);

      const searchLower = search.toLowerCase();
      const filtered = allUsers
        .filter(u => {
          if (u.id === myId) return false;
          // If suggestToOthers is explicitly disabled, only allow exact username or email match
          const suggestAllowed = u.suggestToOthers !== false && u.contentDisplaySettings?.suggestToOthers !== false;
          const name = (u.name || '').toLowerCase();
          const displayName = (u.displayName || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          const email = u.email;
          const emailStr = typeof email === 'string' ? email : (email?.value || '');
          const emailLower = emailStr.toLowerCase();

          const exactMatch = (username && username === searchLower) || (emailLower && emailLower === searchLower);
          if (!suggestAllowed && !exactMatch) return false;

          return name.includes(searchLower) || 
                 displayName.includes(searchLower) || 
                 username.includes(searchLower) ||
                 emailLower.includes(searchLower);
        })
        .map(u => {
          const isOnline = isUserOnline(u.lastActive);
          const email = u.email;
          const emailStr = typeof email === 'string' ? email : (email?.value || '');
          const rawName = u.displayName || u.name || emailStr || u.uid;
          const cleanName = (rawName === u.uid || rawName === emailStr) && emailStr && emailStr.includes('@') 
            ? emailStr.split('@')[0] 
            : rawName;
            
          const isFriend = friends.includes(u.id);
          const incomingReq = pendingIncoming.find(r => r.id === u.id);
          const outgoingReq = pendingOutgoing.find(r => r.id === u.id);
          
          console.log(`[Search] User: ${u.name}, lastActive: ${u.lastActive}, isOnline: ${isOnline}`);
          return {
            id: [myId, u.id].sort().join('_'),
            user: {
              id: u.id,
              name: cleanName,
              avatar: normalizeMediaUrl(u.photoURL || u.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailStr || u.id}`,
              status: u.status || 'offline',
              lastActive: u.lastActive
            },
            lastMessage: isFriend ? 'أهلاً! لنبدأ المحادثة' : (incomingReq ? 'طلب صداقة جديد' : 'بانتظار الموافقة'),
            timestamp: 'الآن',
            unreadCount: 0,
            isOnline: isOnline,
            status: isFriend ? 'friends' : 'pending',
            requestStatus: (incomingReq || outgoingReq) ? 'pending' : undefined,
            senderId: incomingReq ? u.id : (outgoingReq ? myId : undefined)
          } as Chat;
        });

      console.log(`[Search] Matches found: ${filtered.length}`);
      setFirestoreUsers(filtered);
      setLoading(false);
    }, (error) => {
      console.error("[Search] Error fetching users from Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [search, firestoreAuth.currentUser, friends, pendingIncoming, pendingOutgoing]);

  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [newFriendId, setNewFriendId] = useState('');
  const [longPressContact, setLongPressContact] = useState<Chat | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Chat | null>(null);
  const longPressTimer = useRef<any>(null);

  const handleAddFriend = () => {
    if (newFriendId.trim()) {
      // Create chat document in Firestore
      const chatId = [myId, newFriendId].sort().join('_');
      setDoc(doc(firestore, 'chats', chatId), {
        id: chatId,
        participants: [myId, newFriendId],
        isGroup: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setShowAddFriendModal(false);
      setNewFriendId('');
    }
  };

  const startLongPress = (contact: Chat) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressContact(contact);
    }, 600);
  };

  const stopLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleDeleteGroupForEveryone = (chatId: string) => {
    deleteDoc(doc(firestore, 'chats', chatId));
    setShowDeleteConfirm(null);
    setLongPressContact(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0c10] p-6 md:p-10 overflow-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all" aria-label={t.onBack}><ArrowRight size={24} aria-hidden="true" /></button>
                <div>
                    <h1 className="text-3xl font-bold mb-1">{t.friends}</h1>
                    <p className="text-slate-500 text-sm">{t.youHave} {contacts.length} {t.friendsAdded}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="relative flex-1 md:w-80">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} aria-hidden="true" />
                    <input 
                        type="text" 
                        placeholder={t.searchFriend}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pr-12 pl-4 text-sm focus:border-emerald-500/50 outline-none transition-all"
                        aria-label={t.searchFriend}
                    />
                </div>
                <button 
                  onClick={() => setShowAddFriendModal(true)}
                  className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"
                  aria-label={t.addFriend}
                >
                  <UserPlus size={22} aria-hidden="true" />
                </button>
            </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto no-scrollbar pb-24">
            {loading && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p className="text-sm">جاري البحث في قاعدة البيانات...</p>
                </div>
            )}
            
            {!loading && search && firestoreUsers.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-bold">المستخدم غير موجود</p>
                    <p className="text-sm opacity-60">تأكد من كتابة الاسم بشكل صحيح</p>
                </div>
            )}

            {(search ? firestoreUsers : contacts).map(contact => (
                <div 
                    key={contact.id} 
                    className={`glass p-6 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-emerald-500/30 transition-all relative ${longPressContact?.id === contact.id ? 'ring-2 ring-emerald-500' : ''}`}
                    onMouseDown={() => startLongPress(contact)}
                    onMouseUp={stopLongPress}
                    onMouseLeave={stopLongPress}
                    onTouchStart={() => startLongPress(contact)}
                    onTouchEnd={stopLongPress}
                >
                    <div className="relative mb-4">
                        <img 
                          src={normalizeMediaUrl(contact.user.avatar)} 
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${(contact.user as any).email || contact.user.id}`; }}
                          className="w-20 h-20 rounded-[1.5rem] bg-slate-800 object-cover" 
                          alt={contact.user.name} 
                        />
                        {isUserOnline(contact.user) && (
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-[#00ff66] border border-white/40 ring-2 ring-[#0a0c10] shadow-[0_0_12px_#00ff66]" aria-hidden="true"></div>
                        )}
                    </div>
                    
                    <div className="flex justify-between items-start mb-2 w-full">
                        <h3 className="font-bold flex flex-col items-start gap-1 min-w-0">
                            <div className="flex items-center gap-1 truncate w-full">
                                {contact.isGroup && <Users size={14} className="text-emerald-500" />}
                                <span className="truncate">{contact.user.name}</span>
                            </div>
                            {isUserOnline(contact.user) ? (
                                <span className="text-[10px] text-emerald-500 font-bold">{getTranslation(lang, 'onlineNow', 'متصل الآن')}</span>
                            ) : contact.user.status === 'away' ? (
                                <span className="text-[10px] text-amber-500 font-bold">{getTranslation(lang, 'away', 'بعيد')}</span>
                            ) : contact.user.lastActive ? (
                                <span className="text-[10px] text-slate-500 font-bold">
                                    {formatLastSeen(contact.user.lastActive, contact.user)}
                                </span>
                            ) : null}
                        </h3>
                        
                        {/* أيقونات الاتصال - معطلة إذا لم يكن صديقاً */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {contact.isGroup && (
                                <button 
                                    onClick={() => setLongPressContact(contact)}
                                    className="p-2 rounded-xl bg-white/5 text-slate-400 cursor-pointer hover:bg-slate-700 hover:text-white transition-all"
                                >
                                    <MoreVertical size={14} />
                                </button>
                            )}
                            <div 
                                className={`p-2 rounded-xl transition-all ${contact.status === 'friends' ? 'bg-emerald-500/10 text-emerald-500 cursor-pointer hover:bg-emerald-500 hover:text-white' : 'bg-white/5 text-slate-600 cursor-not-allowed opacity-20'}`}
                                title={contact.status === 'friends' ? getTranslation(lang, 'voiceCall', 'اتصال صوتي') : getTranslation(lang, 'mustBeFriendsToCall', 'يجب أن تكونوا أصدقاء للاتصال')}
                            >
                                <Phone size={14} />
                            </div>
                            <div 
                                className={`p-2 rounded-xl transition-all ${contact.status === 'friends' ? 'bg-blue-500/10 text-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white' : 'bg-white/5 text-slate-600 cursor-not-allowed opacity-20'}`}
                                title={contact.status === 'friends' ? getTranslation(lang, 'videoCall', 'اتصال فيديو') : getTranslation(lang, 'mustBeFriendsToCall', 'يجب أن تكونوا أصدقاء للاتصال')}
                            >
                                <Video size={14} />
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">
                        {contact.isGroup && contact.groupType ? contact.groupType : `@${contact.id.slice(0, 8)}`}
                    </p>
                    
                    <div className="flex items-center gap-3 w-full">
                        {contact.status === 'friends' ? (
                            <button 
                                onClick={() => onSelectChat(contact)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle size={14} /> {t.chat}
                            </button>
                        ) : contact.requestStatus === 'pending' ? (
                            <div className="flex-1 flex items-center justify-between gap-2 px-2 z-[9999] relative">
                                {contact.senderId === myId ? (
                                    <div className="flex items-center justify-between w-full bg-slate-900/90 p-3 rounded-2xl border-2 border-blue-500/50 shadow-2xl">
                                        <span className="text-[11px] text-blue-400 font-black tracking-tight">(بانتظار الموافقة)</span>
                                        <button 
                                          onClick={() => handleCancelRequest(contact.user.id)} 
                                          className="bg-rose-600 text-white rounded-xl px-4 py-2.5 text-[11px] font-black shadow-lg hover:bg-rose-500 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                          إلغاء 🗑️
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 w-full bg-slate-900/90 p-3 rounded-2xl border-2 border-emerald-500/50 shadow-2xl">
                                        <button 
                                          onClick={() => handleAcceptRequest(contact.user.id)} 
                                          className="flex-1 bg-emerald-600 text-white rounded-xl py-4 text-[11px] font-black shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:bg-emerald-500 active:scale-95 transition-all"
                                        >
                                          موافقة ✅
                                        </button>
                                        <button 
                                          onClick={() => handleRejectRequest(contact.user.id)} 
                                          className="flex-1 bg-rose-600 text-white rounded-xl py-4 text-[11px] font-black shadow-[0_0_20px_rgba(225,29,72,0.6)] hover:bg-rose-500 active:scale-95 transition-all"
                                        >
                                          رفض ❌
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button onClick={() => handleSendRequest(contact.user.id)} className="flex-1 bg-blue-500 text-white rounded-2xl py-3 text-xs font-bold">إضافة صديق</button>
                        )}
                        <button 
                            onClick={() => {
                                if (window.confirm('هل أنت متأكد من حذف جهة الاتصال هذه؟')) {
                                    deleteDoc(doc(firestore, 'chats', contact.id));
                                }
                            }}
                            className="w-12 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all" 
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Long Press Options Overlay */}
                    <AnimatePresence>
                        {longPressContact?.id === contact.id && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute inset-0 z-10 bg-[#0a0c10]/80 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center p-4"
                            >
                                {contact.isGroup ? (
                                    contact.adminId === myId ? (
                                        <button 
                                            onClick={() => setShowDeleteConfirm(contact)}
                                            className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all mb-3"
                                        >
                                            <Shield size={18} /> حذف المجموعة
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setShowDeleteConfirm(contact)}
                                            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all mb-3"
                                        >
                                            <LogOut size={18} /> خروج من المجموعة
                                        </button>
                                    )
                                ) : (
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('هل أنت متأكد من حذف جهة الاتصال وإلغاء الصداقة والمتابعة؟')) {
                                                handleUnfriend(contact.user.id);
                                            }
                                        }}
                                        className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all mb-3"
                                    >
                                        <Trash2 size={18} /> حذف جهة الاتصال وإلغاء الصداقة
                                    </button>
                                )}
                                <button 
                                    onClick={() => setLongPressContact(null)}
                                    className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-bold text-sm border border-white/10"
                                >
                                    إلغاء
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>

        {showAddFriendModal && (
          <div className="absolute inset-0 z-[100] bg-[#0a0c10]/95 backdrop-blur-xl p-8 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
             <div className="w-20 h-20 bg-transparent rounded-[2.5rem] flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20" aria-hidden="true">
               <UserPlus size={40} aria-hidden="true" />
             </div>
             <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">{t.addFriend}</h3>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-10">Enter Node ID to Synchronize</p>
             
             <input 
                type="text" 
                placeholder={t.userIdNodeId}
                value={newFriendId}
                onChange={(e) => setNewFriendId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-sm font-bold text-white mb-6 outline-none focus:border-emerald-500/50"
                aria-label={t.userIdNodeId}
             />
             
             <div className="flex gap-4 w-full">
               <button onClick={() => setShowAddFriendModal(false)} className="flex-1 py-4 bg-slate-900 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl border border-white/5" aria-label={t.cancel}>{t.cancel}</button>
               <button onClick={handleAddFriend} className="flex-[2] py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all" aria-label={t.synchronizeNow}>{t.synchronizeNow}</button>
             </div>
          </div>
        )}

        {/* Global Delete Confirmation Modal */}
        <AnimatePresence>
            {showDeleteConfirm && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[200] bg-[#0a0c10]/95 backdrop-blur-2xl flex items-center justify-center p-6"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="w-full max-w-sm bg-slate-900/50 border border-white/10 rounded-[3rem] p-8 text-center"
                    >
                        <div className={`w-20 h-20 ${showDeleteConfirm.adminId === myId ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'} rounded-[2rem] flex items-center justify-center mx-auto mb-6`}>
                            {showDeleteConfirm.adminId === myId ? <Trash2 size={40} /> : <LogOut size={40} />}
                        </div>
                        <h3 className="text-xl font-black text-white mb-4">
                            {showDeleteConfirm.adminId === myId ? 'حذف المجموعة للجميع؟' : 'الخروج من المجموعة؟'}
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed mb-8">
                            {showDeleteConfirm.adminId === myId 
                                ? 'سيتم حذف هذه المجموعة وجميع رسائلها من أجهزة جميع الأعضاء. لا يمكن التراجع عن هذا الإجراء.'
                                : 'سيتم خروجك من هذه المجموعة وحذفها من هاتفك تلقائياً. لن تتمكن من رؤية الرسائل بعد الآن.'}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => handleDeleteGroupForEveryone(showDeleteConfirm.id)}
                                className={`w-full py-4 ${showDeleteConfirm.adminId === myId ? 'bg-rose-500 shadow-rose-500/20' : 'bg-amber-500 shadow-amber-500/20'} text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all`}
                            >
                                {showDeleteConfirm.adminId === myId ? 'تأكيد الحذف النهائي' : 'تأكيد الخروج والحذف'}
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(null)}
                                className="w-full py-4 bg-white/5 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl border border-white/5"
                            >
                                تراجع
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default ContactsView;
