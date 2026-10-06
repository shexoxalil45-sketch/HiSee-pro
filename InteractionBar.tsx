import React, { useEffect, useState, useRef } from 'react';
import { 
  Heart, MessageSquare, Plus, Check, Share, Bookmark, MoreHorizontal, HeartCrack, Star, Sparkles, Crown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, updateDoc, increment, addDoc, collection, serverTimestamp, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { VideoItem } from '../types';

import { UserSync } from './UserSync';
import { AvatarLevelBadge } from './AvatarLevelBadge';
import { useUsers } from '../src/contexts/UserContext';
import { getTranslation, translations } from '../translations';

interface InteractionBarProps {
  vid: VideoItem;
  isUiVisible: boolean;
  onProfileClick: () => void;
  onCommentClick: () => void;
  onShareClick: () => void;
  onGiftClick: () => void;
  onOptionsClick: () => void;
  videoData: any;
  myId: string;
  myProfile: any;
  lang?: string;
}

const InteractionBar: React.FC<InteractionBarProps> = ({
  vid,
  isUiVisible,
  onProfileClick,
  onCommentClick,
  onShareClick,
  onGiftClick,
  onOptionsClick,
  videoData,
  myId,
  myProfile,
  lang = 'ar'
}) => {
  const activeLang = lang || 'ar';
  const t = translations[activeLang] || translations.ar;
  const cleanName = (name: any) => {
    const nameStr = typeof name === 'string' ? name : (name?.value || '');
    if (!nameStr) return 'مستخدم';
    if (nameStr.includes('@')) return nameStr.split('@')[0];
    if (nameStr.length > 20 && /^[a-zA-Z0-9]+$/.test(nameStr)) return 'مستخدم';
    return nameStr;
  };

  const [realtimeData, setRealtimeData] = useState<any>(null);
  
  const { following } = useUsers();
  const isFollowedLocal = following.has(vid.userId);
  
  // Local state for UI feedback only (color changes)
  const [isLikedLocal, setIsLikedLocal] = useState(() => localStorage.getItem(`liked_${vid.id}`) === 'true');
  const [isDislikedLocal, setIsDislikedLocal] = useState(() => localStorage.getItem(`disliked_${vid.id}`) === 'true');
  const [isSavedLocal, setIsSavedLocal] = useState(() => localStorage.getItem(`saved_${vid.id}`) === 'true');

  useEffect(() => {
    const handleLikeToggled = (e: any) => {
        if (e.detail.videoId === vid.id) {
            setIsLikedLocal(e.detail.liked);
        }
    };
    window.addEventListener('video_like_toggled', handleLikeToggled);
    return () => window.removeEventListener('video_like_toggled', handleLikeToggled);
  }, [vid.id]);

  useEffect(() => {
    if (!vid?.id || vid.id === 'temp-upload-preview') return;
    
    console.log("=== DEBUG FIREBASE ===");
    console.log("1. Target Video ID:", vid.id);
    console.log("2. Target Collection: collection(db, 'videos')");
    
    const unsubscribe = onSnapshot(doc(db, 'videos', vid.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRealtimeData(data);
        
        // Initialize missing fields
        const updates: any = {};
        if (data.likesCount === undefined) updates.likesCount = 0;
        if (data.dislikesCount === undefined) updates.dislikesCount = 0;
        if (data.savesCount === undefined) updates.savesCount = 0;
        if (data.sharesCount === undefined) updates.sharesCount = 0;
        
        if (Object.keys(updates).length > 0) {
            setDoc(doc(db, 'videos', vid.id), updates, { merge: true }).catch(console.error);
        }
      } else {
        console.log("❌ ERROR: Document does NOT exist in Firebase! ID:", vid.id);
        setRealtimeData(null);
      }
    }, (error) => {
      console.error("❌ ERROR: onSnapshot failed:", error);
    });

    return () => unsubscribe();
  }, [vid?.id]);

  const handleLikeClick = async () => {
    if (!vid?.id || vid.id === 'temp-upload-preview' || !auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    try {
      const videoRef = doc(db, 'videos', vid.id);
      const userLikeRef = doc(db, 'users', currentUid, 'likes', vid.id);
      
      if (isLikedLocal) {
        setIsLikedLocal(false);
        localStorage.removeItem(`liked_${vid.id}`);
        await setDoc(videoRef, { likesCount: increment(-1) }, { merge: true });
        await deleteDoc(userLikeRef);
      } else {
        setIsLikedLocal(true);
        localStorage.setItem(`liked_${vid.id}`, 'true');
        const updates: any = { likesCount: increment(1) };
        if (isDislikedLocal) {
          setIsDislikedLocal(false);
          localStorage.removeItem(`disliked_${vid.id}`);
          updates.dislikesCount = increment(-1);
        }
        await setDoc(videoRef, updates, { merge: true });
        await setDoc(userLikeRef, {
          videoId: vid.id,
          timestamp: serverTimestamp()
        }, { merge: true });

        // Send notification
        if (vid.userId !== myId) {
          await addDoc(collection(db, 'users', vid.userId, 'notifications'), {
            type: 'like',
            fromUserId: myId,
            fromUserName: myProfile?.name || myProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.uid,
            videoId: vid.id,
            timestamp: serverTimestamp(),
            read: false,
            message: 'أعجب بفيديو خاص بك'
          });
        }
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleDislikeClick = async () => {
    if (!vid?.id || vid.id === 'temp-upload-preview') return;
    try {
      const videoRef = doc(db, 'videos', vid.id);
      if (isDislikedLocal) {
        setIsDislikedLocal(false);
        localStorage.removeItem(`disliked_${vid.id}`);
        await setDoc(videoRef, { dislikesCount: increment(-1) }, { merge: true });
      } else {
        setIsDislikedLocal(true);
        localStorage.setItem(`disliked_${vid.id}`, 'true');
        const updates: any = { dislikesCount: increment(1) };
        if (isLikedLocal) {
          setIsLikedLocal(false);
          localStorage.removeItem(`liked_${vid.id}`);
          updates.likesCount = increment(-1);
        }
        await setDoc(videoRef, updates, { merge: true });
      }
    } catch (error) {
      console.error("Error updating dislike:", error);
    }
  };

  const handleSaveClick = async () => {
    if (!vid?.id || vid.id === 'temp-upload-preview' || !auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    try {
      const videoRef = doc(db, 'videos', vid.id);
      const userSaveRef = doc(db, 'users', currentUid, 'saves', vid.id);

      if (isSavedLocal) {
        setIsSavedLocal(false);
        localStorage.removeItem(`saved_${vid.id}`);
        await updateDoc(videoRef, { savesCount: increment(-1) });
        await deleteDoc(userSaveRef);
      } else {
        setIsSavedLocal(true);
        localStorage.setItem(`saved_${vid.id}`, 'true');
        await updateDoc(videoRef, { savesCount: increment(1) });
        await setDoc(userSaveRef, {
          videoId: vid.id,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error updating save:", error);
    }
  };

  const handleFollowClick = async () => {
    if (!vid?.userId) return;
    const currentUid = auth.currentUser?.uid || myId;
    if (!currentUid || currentUid === vid.userId) return;
    
    try {
      const userRef = doc(db, 'users', vid.userId);
      if (isFollowedLocal) {
        await setDoc(userRef, { followersCount: increment(-1) }, { merge: true });
        await setDoc(doc(db, 'users', currentUid), { followingCount: increment(-1) }, { merge: true });
        await deleteDoc(doc(db, 'users', currentUid, 'following', vid.userId));
        await deleteDoc(doc(db, 'users', vid.userId, 'followers', currentUid));
        await deleteDoc(doc(db, 'users', vid.userId, 'notifications', `follow_${currentUid}_${vid.userId}`));
        
        // Handle notification from them to me
        const theirNotificationRef = doc(db, 'users', currentUid, 'notifications', `follow_${vid.userId}_${currentUid}`);
        const theirNotificationSnap = await getDoc(theirNotificationRef);
        if (theirNotificationSnap.exists()) {
            // Check if they still follow me
            const theyFollowMe = await getDoc(doc(db, 'users', vid.userId, 'following', currentUid));
            if (theyFollowMe.exists()) {
                await updateDoc(theirNotificationRef, {
                    status: 'pending',
                    message: 'قام بمتابعتك'
                });
            } else {
                await deleteDoc(theirNotificationRef);
            }
        }
      } else {
        await setDoc(userRef, { followersCount: increment(1) }, { merge: true });
        await setDoc(doc(db, 'users', currentUid), { followingCount: increment(1) }, { merge: true });
        await setDoc(doc(db, 'users', currentUid, 'following', vid.userId), { timestamp: serverTimestamp() });
        await setDoc(doc(db, 'users', vid.userId, 'followers', currentUid), { timestamp: serverTimestamp() });

        // Check if the other user follows me (i.e. vid.userId is following currentUid)
        const theyFollowMe = await getDoc(doc(db, 'users', vid.userId, 'following', currentUid));
        const status = theyFollowMe.exists() ? 'mutual' : 'pending';

        // Send notification
        await setDoc(doc(db, 'users', vid.userId, 'notifications', `follow_${currentUid}_${vid.userId}`), {
          type: 'follow',
          fromUserId: currentUid,
          fromUserName: cleanName(myProfile?.name || myProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.uid),
          fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || auth.currentUser?.photoURL || '',
          timestamp: serverTimestamp(),
          read: false,
          status: status,
          message: 'قام بمتابعتك'
        });

        // If mutual, update their notification to me
        if (status === 'mutual') {
          const theirNotiRef = doc(db, 'users', currentUid, 'notifications', `follow_${vid.userId}_${currentUid}`);
          const theirNotiSnap = await getDoc(theirNotiRef);
          if (theirNotiSnap.exists()) {
            await updateDoc(theirNotiRef, {
              status: 'mutual',
              message: 'قام بمتابعتك'
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating follow:", error);
    }
  };

  const handleShareAction = async () => {
    if (!vid?.id || vid.id === 'temp-upload-preview') return;
    try {
      const videoRef = doc(db, 'videos', vid.id);
      await updateDoc(videoRef, { sharesCount: increment(1) });
    } catch (error) {
      console.error("Error updating shares:", error);
    }
    onShareClick();
  };

  const handleCommentAction = async () => {
    // The comment count is usually incremented when a comment is actually posted,
    // but if the app increments it just by clicking, we do it here.
    // We will leave the incrementing to the actual comment submission in VideosView.tsx
    // to be more accurate, but we call the prop to open the modal.
    onCommentClick();
  };

  // STRICT RULE: Numbers come ONLY from the server (realtimeData) or fallback to videoData/vid
  const likesCount = realtimeData ? (realtimeData.likesCount || realtimeData.likes || 0) : (videoData?.likesCount ?? videoData?.likes ?? vid?.likes ?? 0);
  const dislikesCount = realtimeData ? (realtimeData.dislikesCount || realtimeData.dislikes || 0) : (videoData?.dislikesCount ?? videoData?.dislikes ?? 0);
  const savesCount = realtimeData ? (realtimeData.savesCount || realtimeData.saves || 0) : (videoData?.savesCount ?? videoData?.saves ?? 0);
  const commentsCount = realtimeData ? (realtimeData.commentsCount || realtimeData.comments?.length || 0) : (videoData?.commentsCount ?? videoData?.comments?.length ?? 0);
  const sharesCount = realtimeData ? (realtimeData.sharesCount || realtimeData.shares || 0) : (videoData?.sharesCount ?? videoData?.shares ?? 0);

  return (
    <div 
      className={`absolute bottom-[38px] sm:bottom-[50px] right-2 md:right-4 flex flex-col gap-3 items-center z-50 transition-all duration-700 ${
        isUiVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0 pointer-events-none'
      }`}
    >
      {/* Avatar Profile */}
      <div className="relative mb-2 interactive-btn no-video-tap">
        <UserSync userId={vid.userId} initialAvatar={vid.userAvatar} initialName={vid.user}>
          {({ avatar, name, level = 0 }) => {
            // Unified Rank & Frame UI logic (Strictly outer corner, no face covering, blocked for level 0)
            const renderAvatarRankUI = () => {
              // Rule: Block star badge completely if level is 0
              if (!level || level === 0) return null;
              
              return (
                <div key="crest" className="absolute -top-3.5 -right-2 flex flex-col items-center z-30 pointer-events-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                   <AvatarLevelBadge level={level} size={25} />
                </div>
              );
            };

            // Dynamic Frame Classes - Pure borders, zero face-covering masks or yellow backgrounds
            let frameClass = ""; 
            if (level === 0) {
              frameClass = "border border-white/30";
            } else if (level <= 2) {
              frameClass = "border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]";
            } else if (level <= 4) {
              frameClass = "border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.45)]";
            } else {
              // Legendary Halo
              frameClass = "border-2 border-cyan-300 shadow-[0_0_20px_rgba(164,245,255,0.7)] ring-1 ring-cyan-200/50";
            }

            return (
              <>
                {/* Unified Rank Crest on Exterior Corner */}
                {renderAvatarRankUI()}

                <div 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onProfileClick(); }} 
                  className={`w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] md:w-16 md:h-16 rounded-full cursor-pointer hover:scale-110 transition-all shadow-2xl relative flex items-center justify-center overflow-hidden ${frameClass}`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 relative">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(vid.userId || name || 'host')}`} className="w-full h-full rounded-full object-cover absolute inset-0" alt="" />
                    {avatar && (
                      <img 
                        src={avatar} 
                        className="w-full h-full rounded-full object-cover absolute inset-0 z-10 transition-opacity duration-300 opacity-0" 
                        alt={name} 
                        onLoad={(e) => {
                          e.currentTarget.classList.remove('opacity-0');
                          e.currentTarget.classList.add('opacity-100');
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            );
          }}
        </UserSync>
        <div 
          role="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFollowClick(); }} 
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-[6vw] h-[6vw] max-w-[24px] max-h-[24px] md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border z-30 ${isFollowedLocal ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'border-white/80 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]'}`}
        >
          {isFollowedLocal ? (
            <div className="relative w-full h-full flex items-center justify-center">
                <Check className="w-[80%] h-[80%] text-emerald-500" strokeWidth={4} />
                <Check className="absolute w-[40%] h-[40%] text-white" strokeWidth={2} />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
                <Plus className="w-[80%] h-[80%] text-white" strokeWidth={4} />
                <Plus className="absolute w-[60%] h-[60%] text-black" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>

      {/* Like */}
      <div className="flex flex-col items-center gap-1 interactive-btn no-video-tap">
        <div 
          role="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleLikeClick(); }}
          className={`w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center transition-all active:scale-75 drop-shadow-xl cursor-pointer ${
            isLikedLocal ? 'text-rose-500' : 'text-white/90 hover:text-white'
          }`}
        >
          <Heart className="w-[70%] h-[70%]" strokeWidth={2} fill={isLikedLocal ? "currentColor" : "none"} />
        </div>
        <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase">
          {likesCount.toLocaleString()}
        </span>
      </div>

      {/* Dislike (Broken Heart) */}
      <div className="flex flex-col items-center gap-1 interactive-btn no-video-tap">
        <div 
          role="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDislikeClick(); }}
          className={`w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center transition-all active:scale-75 drop-shadow-xl cursor-pointer ${
            isDislikedLocal ? 'text-indigo-500' : 'text-white/90 hover:text-white'
          } ${isDislikedLocal ? 'animate-shake' : ''}`}
        >
          <HeartCrack className="w-[70%] h-[70%]" strokeWidth={2} fill={isDislikedLocal ? "currentColor" : "none"} />
        </div>
        <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase">
          DISLIKE
        </span>
      </div>

      {/* Comments */}
      <div className="flex flex-col items-center gap-1 interactive-btn no-video-tap">
        <div 
          role="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleCommentAction(); }}
          className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 drop-shadow-xl cursor-pointer"
        >
          <MessageSquare className="w-[70%] h-[70%]" strokeWidth={2} fill="white" fillOpacity={0.1} />
        </div>
        <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase">
          {commentsCount.toLocaleString()}
        </span>
      </div>

      {/* Save */}
      <div className="flex flex-col items-center gap-1 interactive-btn no-video-tap">
        <div 
          role="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveClick(); }}
          className={`w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center transition-all active:scale-75 drop-shadow-xl cursor-pointer ${
            isSavedLocal ? 'text-yellow-400' : 'text-white/90 hover:text-white'
          }`}
        >
          <Bookmark className="w-[70%] h-[70%]" strokeWidth={2} fill={isSavedLocal ? "currentColor" : "none"} />
        </div>
        <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase">
          {savesCount.toLocaleString()}
        </span>
      </div>

      {/* Share */}
      <div className="flex flex-col items-center gap-1 interactive-btn no-video-tap">
        <div 
          role="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleShareAction(); }}
          className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 drop-shadow-xl cursor-pointer"
        >
          <Share className="w-[70%] h-[70%]" strokeWidth={2} />
        </div>
        <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase">
          {sharesCount.toLocaleString()}
        </span>
      </div>

      {/* More Options */}
      <div className="flex flex-col items-center gap-1 interactive-btn no-video-tap">
        <div 
          role="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onOptionsClick(); }}
          className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 drop-shadow-xl cursor-pointer"
        >
          <MoreHorizontal className="w-[70%] h-[70%]" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};

export default InteractionBar;
