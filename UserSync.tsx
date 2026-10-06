
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';

interface UserSyncProps {
  userId: string;
  initialName?: string;
  initialAvatar?: string;
  children: (data: { name: string; avatar: string; role?: string; totalStars?: number; xp?: number; level?: number }) => React.ReactNode;
}

export const UserSync: React.FC<UserSyncProps> = ({ userId, initialName, initialAvatar, children }) => {
  const cleanName = (name: any) => {
    const nameStr = typeof name === 'string' ? name : (name?.value || '');
    if (!nameStr) return 'مستخدم';
    if (nameStr.includes('@')) return nameStr.split('@')[0];
    if (nameStr.length > 20 && /^[a-zA-Z0-9]+$/.test(nameStr)) return 'مستخدم';
    return nameStr;
  };

  const [name, setName] = useState(cleanName(initialName || ''));
  const [avatar, setAvatar] = useState(normalizeMediaUrl(initialAvatar || ''));
  const [role, setRole] = useState<string | undefined>();
  const [totalStars, setTotalStars] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!userId || !auth.currentUser) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (document.hidden) return;
      if (doc.exists()) {
        const data = doc.data();
        console.log("UserSync: fetched user data:", data);
        setName(cleanName(data.nickname || data.displayName || data.name || initialName || userId));
        setAvatar(normalizeMediaUrl(data.avatarUrl || data.profileImage || data.avatar || data.photoURL) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email || userId}`);
        setRole(data.role);
        setTotalStars(data.totalReceivedStars !== undefined ? data.totalReceivedStars : (data.totalStars || 0));
        setXp(data.xp || data.supporterXP || 0);
        const resolvedLevel = data.level !== undefined 
          ? data.level 
          : ((data.supporterXP || data.xp) ? Math.floor((data.supporterXP || data.xp) / 100) : 0);
        setLevel(resolvedLevel);
      } else {
        setName(cleanName(initialName || userId));
        setAvatar(normalizeMediaUrl(initialAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`);
        setLevel(0);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    });

    return () => unsubscribe();
  }, [userId, auth.currentUser]);

  return <>{children({ 
    name: name || cleanName(initialName || 'User'), 
    avatar: avatar || normalizeMediaUrl(initialAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`, 
    role, 
    totalStars,
    xp,
    level
  })}</>;
};
