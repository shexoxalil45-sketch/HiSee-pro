import React, { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, limit } from 'firebase/firestore';
import { LevelStatusModal } from './LevelStatusModal';
import { VideoStarAlertModal, VideoStarNotification } from './VideoStarAlertModal';

export type ModalQueueItem =
  | { type: 'level_status'; mode: 'LEVEL_UP' | 'LEVEL_DOWN'; level: number; oldLevel?: number; reason?: string }
  | { type: 'video_star'; notification: VideoStarNotification };

interface AppLaunchModalQueueProps {
  currentUser: any;
  lang?: string;
}

export const AppLaunchModalQueue: React.FC<AppLaunchModalQueueProps> = ({ currentUser, lang }) => {
  const [queue, setQueue] = useState<ModalQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const initializedUserIdRef = useRef<string | null>(null);

  const userId = currentUser?.id;

  useEffect(() => {
    // Auth Initialization Check: Only proceed once currentUser.id is available
    if (!userId) {
      initializedUserIdRef.current = null;
      setQueue([]);
      return;
    }

    // Skip if already initialized for this specific user
    if (initializedUserIdRef.current === userId) return;

    let isMounted = true;

    const checkLaunchAlerts = async () => {
      try {
        const modalQueue: ModalQueueItem[] = [];

        // 1. Check Level Status (Level Up or Level Down)
        const currentLevel = Number(currentUser.level || currentUser.currentLevel || 0);
        const storageKey = `hisee_last_celebrated_level_${userId}`;
        const storedLastLevel = localStorage.getItem(storageKey);
        
        let lastCelebratedLevel = storedLastLevel !== null 
          ? Number(storedLastLevel) 
          : Number(currentUser.lastCelebratedLevel || 0);

        if (currentLevel > lastCelebratedLevel && currentLevel > 0) {
          // LEVEL_UP Mode: Strict condition (currentLevel > lastCelebratedLevel)
          modalQueue.push({
            type: 'level_status',
            mode: 'LEVEL_UP',
            level: currentLevel,
            oldLevel: lastCelebratedLevel
          });
        } else if (currentLevel < lastCelebratedLevel && storedLastLevel !== null) {
          // LEVEL_DOWN Mode: User level was downgraded by admin or reset
          modalQueue.push({
            type: 'level_status',
            mode: 'LEVEL_DOWN',
            level: currentLevel,
            oldLevel: lastCelebratedLevel,
            reason: currentUser.downgradeReason || currentUser.levelChangeReason || undefined
          });
        }

        // 2. Check Unseen Video Star Notifications (Client-Side Filter to avoid Firestore Index errors)
        const unseenStarsMap = new Map<string, VideoStarNotification>();

        // Query 2a: Subcollection users/{userId}/notifications
        try {
          const userNotifsRef = collection(db, 'users', userId, 'notifications');
          const userSnap = await getDocs(userNotifsRef);

          userSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const isStarNotif = data.type === 'star_received' || data.type === 'star' || (typeof data.message === 'string' && data.message.includes('نجمة'));
            const isUnseen = data.seen !== true && data.status !== 'read' && data.read !== true;

            if (isStarNotif && isUnseen) {
              unseenStarsMap.set(docSnap.id, {
                id: docSnap.id,
                videoId: data.videoId || '',
                videoTitle: data.videoTitle || data.message || 'فيديو خاص بك',
                thumbnail: data.thumbnail || data.mediaUrl || '',
                starEarnedAt: data.timestamp || data.createdAt,
                fromUserId: data.fromUserId || data.senderId,
                fromUserName: data.fromUserName || data.senderName,
                fromUserAvatar: data.fromUserAvatar || data.senderAvatar,
                seen: false
              });
            }
          });
        } catch (err) {
          console.warn("Could not query user notifications subcollection:", err);
        }

        // Query 2b: Top-level notifications collection
        try {
          const rootNotifsRef = collection(db, 'notifications');
          const rootQuery = query(
            rootNotifsRef,
            where('recipientId', '==', userId),
            limit(50)
          );
          const rootSnap = await getDocs(rootQuery);

          rootSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const isStarNotif = data.type === 'star_received' || data.type === 'star' || (typeof data.message === 'string' && data.message.includes('نجمة'));
            const isUnseen = data.seen !== true && data.status !== 'read' && data.read !== true;

            if (isStarNotif && isUnseen && !unseenStarsMap.has(docSnap.id)) {
              unseenStarsMap.set(docSnap.id, {
                id: docSnap.id,
                videoId: data.videoId || '',
                videoTitle: data.videoTitle || data.message || 'فيديو خاص بك',
                thumbnail: data.thumbnail || data.mediaUrl || '',
                starEarnedAt: data.timestamp || data.createdAt,
                fromUserId: data.fromUserId || data.senderId,
                fromUserName: data.fromUserName || data.senderName,
                fromUserAvatar: data.fromUserAvatar || data.senderAvatar,
                seen: false
              });
            }
          });
        } catch (err) {
          // Ignore
        }

        // Append star notifications sequentially
        unseenStarsMap.forEach((starNotif) => {
          modalQueue.push({
            type: 'video_star',
            notification: starNotif
          });
        });

        if (isMounted) {
          initializedUserIdRef.current = userId;
          setQueue(modalQueue);
        }
      } catch (err) {
        console.error("Error initializing launch modal queue:", err);
        if (isMounted) {
          initializedUserIdRef.current = userId;
        }
      }
    };

    checkLaunchAlerts();

    return () => {
      isMounted = false;
    };
  }, [userId, currentUser?.level, currentUser?.currentLevel, currentUser?.lastCelebratedLevel, currentUser?.downgradeReason]);

  if (queue.length === 0) return null;

  const currentModal = queue[0];

  // 3. Queue Lock Release & Storage Update on Close
  const handleCloseCurrentModal = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const itemToClose = currentModal;

    try {
      if (itemToClose.type === 'level_status') {
        const level = itemToClose.level;
        const storageKey = `hisee_last_celebrated_level_${userId}`;
        localStorage.setItem(storageKey, String(level));

        if (userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { lastCelebratedLevel: level }).catch(() => {});
        }
      } else if (itemToClose.type === 'video_star') {
        const notifId = itemToClose.notification.id;
        if (userId && notifId) {
          const notifRef = doc(db, 'users', userId, 'notifications', notifId);
          await updateDoc(notifRef, {
            seen: true,
            status: 'read',
            read: true
          }).catch(async () => {
            const rootNotifRef = doc(db, 'notifications', notifId);
            await updateDoc(rootNotifRef, {
              seen: true,
              status: 'read',
              read: true
            }).catch(() => {});
          });
        }
      }
    } catch (err) {
      console.error("Error persisting modal closure state:", err);
    } finally {
      setQueue((prevQueue) => prevQueue.slice(1));
      setIsProcessing(false);
    }
  };

  return (
    <>
      {currentModal.type === 'level_status' && (
        <LevelStatusModal
          mode={currentModal.mode}
          level={currentModal.level}
          oldLevel={currentModal.oldLevel}
          reason={currentModal.reason}
          isOpen={true}
          onClose={handleCloseCurrentModal}
          lang={lang}
          userName={currentUser?.name || currentUser?.displayName}
        />
      )}

      {currentModal.type === 'video_star' && (
        <VideoStarAlertModal
          notification={currentModal.notification}
          isOpen={true}
          onClose={handleCloseCurrentModal}
        />
      )}
    </>
  );
};
