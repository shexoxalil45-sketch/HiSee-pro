/**
 * HiSee Pro - Baseline Protection & Safe Update Protocol
 * Mode: Secure Modification (Strict No-Deletion Rule)
 * Status: Verified 100% Stability
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import ProfileView from './components/ProfileView';
import { LiveFeed } from './components/live/LiveFeed';
import { HostPage } from './components/HostPage';
import SettingsView from './components/SettingsView'; 
import AIChat from './components/AIChat';
import NotificationsView from './components/NotificationsView';
import PostCreation from './components/PostCreation';
import PhotoStudio from './components/PhotoStudio';
import { LockScreen } from './components/LockScreen';
import { VoiceCommander, VoiceCommanderRef } from './components/VoiceCommander';
import { normalizeMediaUrl } from './src/lib/mediaUtils';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { VideoCall } from './components/VideoCall';
import { Chat, AppSettings, Language, VideoItem, Message } from './types';
import { 
  MessageCircle, Settings, User as UserIcon, 
  Sparkles, Bell, LayoutGrid, Heart, Plus, Radio, Sun, ArrowRight, Video, Shield, Phone, PhoneOff, X, Trash2,
  Camera, Image as ImageIcon
} from 'lucide-react';
import MultiColorRadioIcon from './components/MultiColorRadioIcon';
import ModernSettingsIcon from './components/ModernSettingsIcon'; 
import ModernMessageIcon from './components/ModernMessageIcon'; 
import ModernHomeIcon from './components/ModernHomeIcon'; 
import { peerService } from './services/peerService';
import { useStore } from './lib/store';
import { auth, db as firestoreDb, storage, messaging, getToken, onMessage } from './lib/firebase';
import { getMillis } from './lib/helpers';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, getDocFromServer, deleteDoc, query, where, limit, orderBy, updateDoc, serverTimestamp, or, getDocs, arrayUnion, increment, writeBatch } from 'firebase/firestore';
import { translations, getTranslation } from './translations';
import { videoCache } from './lib/videoCache';
import VideosView, { ActiveVideoController } from './components/VideosView';
import AuthView from './components/AuthView';
import { getStoredPermissions, isPermissionAllowed } from './lib/permissionManager';
import { PermissionRequestModal } from './components/PermissionRequestModal';
import PermissionsView from './components/PermissionsView';
import { UserProvider, useUsers } from './src/contexts/UserContext';
import { CallProvider } from './src/contexts/CallContext';
import { CallContainer } from './src/components/calls/CallContainer';
import { UnifiedIncomingCall } from './src/components/calls/UnifiedIncomingCall';
import { GroupVoiceCall } from './src/components/calls/GroupVoiceCall';
import { AudioCallModal } from './src/components/calls/AudioCallModal';
import { VideoCallModal } from './src/components/calls/VideoCallModal';
import { IncomingCallModal } from './src/components/calls/IncomingCallModal';
import { useIncomingGroupCalls } from './src/hooks/useIncomingGroupCall';
import { useCallAlertManager } from './src/hooks/useCallAlertManager';
import { useCall } from './src/contexts/CallContext';
import ErrorBoundary from './components/ErrorBoundary';
import { uploadFileResilient, normalizeVideoFile } from './src/lib/mediaProcessor';

import CompleteProfileView from './components/CompleteProfileView';
import { initCloudAutoPurgeScheduler } from './src/lib/cloudAutoPurgeService';

import { LevelStatusModal } from './components/LevelStatusModal';
import { AppLaunchModalQueue } from './components/AppLaunchModalQueue';
import { AIVideoStudio } from './components/AIVideoStudio';
import { DeepThinkingStudio } from './components/DeepThinkingStudio';

type TabType = 'home' | 'chats' | 'live' | 'live_watch' | 'profile' | 'settings' | 'ai_assistant' | 'notifications' | 'post' | 'ai_video' | 'deep_thinking';
type ViewState = 'auth' | 'auth_signup' | 'complete_profile' | 'permissions' | 'main';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <UserProvider>
        <CallProvider>
          <AppContent />
        </CallProvider>
      </UserProvider>
    </ErrorBoundary>
  );
};

// Microphone Guardian: Periodically checks for active audio tracks and kills them if no known activity is happening
const MicrophoneGuardian: React.FC<{ activeCall: any }> = ({ activeCall }) => {
  useEffect(() => {
    const checkInterval = setInterval(() => {
      // Don't waste CPU when page is hidden in background
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        // Known activity check
        const isCallActive = activeCall && (activeCall.status === 'active' || activeCall.status === 'connected' || activeCall.status === 'calling');
        const isRecording = (window as any).__isVoiceRecording === true;
        const isVoiceCommanderActive = (window as any).__isVoiceCommanderActive === true;

        if (!isCallActive && !isRecording && !isVoiceCommanderActive) {
          // No known activity -> Scan for orphan audio tracks
          const leakedStreamKeys = ['localStream', '_previewStream', '_currentStream', '_recordingStream', 'streamRef'];
          leakedStreamKeys.forEach((key) => {
            const stream = (window as any)[key];
            if (stream && typeof stream.getTracks === 'function') {
              const tracks = stream.getTracks().filter((t: any) => t.kind === 'audio' && t.readyState === 'live');
              if (tracks.length > 0) {
                console.log(`MicrophoneGuardian: Killing orphan audio track in window.${key}`);
                tracks.forEach((t: any) => {
                  try {
                    t.stop();
                    t.enabled = false;
                  } catch (e) {}
                });
              }
            }
          });
        }
      } catch (err) {
        // Silently fail to avoid crashing the app
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(checkInterval);
  }, [activeCall]);

  return null;
};

const AppContent: React.FC = () => {
  const { currentUser, users } = useUsers();
  
  // Level-up celebration
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const prevLevelRef = useRef(currentUser?.level || 0);

  useEffect(() => {
    if (currentUser?.level && currentUser.level > prevLevelRef.current) {
      setLevelUpLevel(currentUser.level);
    }
    prevLevelRef.current = currentUser?.level || 0;
  }, [currentUser?.level]);
  // App Flow State - Starts with Auth
  const [viewState, setViewState] = useState<ViewState>('auth');
  const [authMessage, setAuthMessage] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [localVideos, setLocalVideos] = useState<VideoItem[]>([]);
  const [uploadingVideos, setUploadingVideos] = useState<VideoItem[]>([]);

  // Main App State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isLocked, setIsLocked] = useState(() => {
    const savedSettings = localStorage.getItem('hisee_chat_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return !!(parsed.chatSettings?.privacy?.pinPasswordLock || parsed.chatSettings?.privacy?.patternLock);
      } catch (e) {}
    }
    return false;
  });

  
  const voiceRef = useRef<VoiceCommanderRef>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const initialPerms = getStoredPermissions();
    const defaultSettings: AppSettings = {
      theme: 'dark',
      notifications: initialPerms.notifications,
      sound: true,
      permissions: initialPerms,
      chatSettings: {
        permissions: initialPerms,
        background: 'default',
        fontSize: 'medium',
        enterToSend: true,
        autoDownloadMedia: true,
        autoDownloadWifi: true,
        mediaQuality: 'auto',
        useLessDataForCalls: false,
        autoCleanup: false,
        keepMediaDuration: 'forever',
        readReceipts: true,
        voiceReadReceipts: true,
        lastSeen: true,
        liveLocation: false,
        hidePhoneNumber: false,
        muteAllSounds: false,
        silentMode: false,
        callVibrate: 'default',
        callRingtoneTone: 'default',
        notificationVolume: 100,
        sounds: {
          messages: true,
          typing: true,
          audioCall: true,
          buttonClicks: true,
          ringtone: 'classic',
          notificationSound: 'default',
          customNotificationSound: null as string | null,
          recordingStartVolume: 1,
          sendingAudioVolume: 1,
          receivingAudioVolume: 1,
        },
        privacy: {
          hideOnlineStatus: false,
          incognitoKeyboard: false,
          screenSecurity: false,
          preventScreenshots: false,
          preventCameraExposure: false,
          appLock: false,
          endToEndEncryption: true,
          disappearingMessages: false,
        },
        twoFactorEnabled: false,
        email: 'user@hisee.app',
        phoneNumber: '+964 750 123 4567',
      },
    };
    
    try {
      const saved = localStorage.getItem('hisee_chat_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          chatSettings: {
            ...defaultSettings.chatSettings,
            ...parsed,
            sounds: {
              ...defaultSettings.chatSettings.sounds,
              ...(parsed.sounds || {})
            },
            privacy: {
              ...defaultSettings.chatSettings.privacy,
              ...(parsed.privacy || {})
            }
          }
        };
      }
    } catch (e) {}
    return defaultSettings;
  });

  useEffect(() => {
    const hasLock = settings.chatSettings.privacy.pinPasswordLock || 
                    settings.chatSettings.privacy.patternLock;
    if (!hasLock) {
      setIsLocked(false);
    }
  }, [settings]);

  useEffect(() => {
    let timerId: any = null;
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' || document.hidden) {
            const { lockTimeout, smartLock, pinPasswordLock, patternLock } = settings.chatSettings.privacy;
            
            if (pinPasswordLock || patternLock) {
                if (smartLock || lockTimeout === 'immediately') {
                    setIsLocked(true);
                } else if (lockTimeout === '1m') {
                    if (timerId) clearTimeout(timerId);
                    timerId = setTimeout(() => setIsLocked(true), 60000);
                } else if (lockTimeout === '5m') {
                    if (timerId) clearTimeout(timerId);
                    timerId = setTimeout(() => setIsLocked(true), 300000);
                }
            }
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (timerId) clearTimeout(timerId);
    };
  }, [settings]);

  // Page Visibility & Background CPU Saver Guardian
  useEffect(() => {
    const freezeMediaAndReleaseResources = () => {
      (window as any).__isAppBackgrounded = true;

      // 1. Immediately pause and mute all HTML video and audio elements in DOM
      if (typeof document !== 'undefined') {
        const mediaElements = document.querySelectorAll<HTMLMediaElement>('video, audio');
        mediaElements.forEach((media) => {
          try {
            media.pause();
            media.muted = true;
          } catch (e) {}
        });
      }

      // 2. Pause active video in controller
      ActiveVideoController.pauseActive();
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        freezeMediaAndReleaseResources();
      } else {
        (window as any).__isAppBackgrounded = false;
      }
    };

    const handleBlur = () => {
      freezeMediaAndReleaseResources();
    };

    const handleFocus = () => {
      if (!document.hidden) {
        (window as any).__isAppBackgrounded = false;
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Initialize Cloud Auto-Purge Scheduler (>24h cloud message deletion from Firestore)
    initCloudAutoPurgeScheduler(30);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'buy_coins'>('main');

  useEffect(() => {
    const handleNavSettings = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.view) {
        setSettingsInitialView(customEvent.detail.view);
      } else {
        setSettingsInitialView('main');
      }
      setActiveTab('settings');
    };
    window.addEventListener('navigate_settings', handleNavSettings);
    return () => window.removeEventListener('navigate_settings', handleNavSettings);
  }, []);
  const [isCreativeHub, setIsCreativeHub] = useState(false);
  const [initialCreativeTool, setInitialCreativeTool] = useState<'video_gen' | 'thinking' | 'edit' | 'merge' | 'templates' | 'studio' | 'mv' | 'save' | 'duet' | null>(null);
  const [showLivePostMenu, setShowLivePostMenu] = useState(false);
  const [photoStudioInitialMode, setPhotoStudioInitialMode] = useState<'camera' | 'gallery'>('camera');
  const [postMenuSubMode, setPostMenuSubMode] = useState<'none' | 'publish_choice' | 'creative_choice'>('none');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('me');
  const [selectedProfileInitialTab, setSelectedProfileInitialTab] = useState<'gallery' | 'photos' | 'archive' | 'saved' | 'liked' | 'starred'>('gallery');
  const [profileOverlayUserId, setProfileOverlayUserId] = useState<string | null>(null);
  const [originChat, setOriginChat] = useState<any>(null);
  const [pendingForwardMessage, setPendingForwardMessage] = useState<Message | null>(null);
  const { setUserId } = useStore();
  const [myId, setMyId] = useState<string>('');
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myFriends, setMyFriends] = useState<string[]>([]);

  useEffect(() => {
    if (!myId || !isDbConnected) {
      setMyFriends([]);
      return;
    }

    // 1. Get friends from profile
    let friendsFromProfile: string[] = [];
    if (myProfile?.friends && Array.isArray(myProfile.friends)) {
      friendsFromProfile = myProfile.friends;
    }

    // 2. Listen to contacts subcollection where status is friends
    const contactsRef = collection(firestoreDb, 'users', myId, 'contacts');
    const unsubscribeContacts = onSnapshot(contactsRef, (snapshot) => {
      if (document.hidden) return;
      const friendsFromContacts = snapshot.docs
        .filter(doc => doc.data().status === 'friends')
        .map(doc => doc.id);
      
      const allFriends = Array.from(new Set([...friendsFromProfile, ...friendsFromContacts]));
      setMyFriends(allFriends);
    }, (err) => {
      console.warn("Contacts onSnapshot error:", err?.message || err);
    });

    return () => {
      unsubscribeContacts();
    };
  }, [myId, isDbConnected, myProfile?.friends]);
  const lastMessageTimestamps = useRef<Map<string, number>>(new Map());
  const lastPlayTime = useRef<number>(0);
  const deletedVideoIdsRef = useRef<Set<string>>(new Set());
  const { incomingGroupCalls, setIncomingGroupCalls } = useIncomingGroupCalls();
  const [activeGroupRoom, setActiveGroupRoom] = useState<{channelName: string, callType?: 'voice' | 'video'} | null>(null);
  const [isGroupCallMinimized, setIsGroupCallMinimized] = useState<boolean>(false);
  const [autoAnswerCallId, setAutoAnswerCallId] = useState<string | null>(null);
  const [isCallActionLoading, setIsCallActionLoading] = useState(false);

  const { 
    activeCall,
    setActiveCall,
    acceptCall: originalAcceptCall,
    rejectCall: originalRejectCall,
    endCall,
    formatDuration,
    isCallMuted,
    toggleCallMute,
    isCallCameraOff,
    toggleCallCamera,
    isSpeakerOn,
    toggleSpeaker,
    remoteStream,
    callStream,
    localCallVideoRef,
    remoteCallVideoRef,
    switchCamera,
    isScreenSharing,
    toggleScreenShare,
    callBeautyConfig,
    applyBeautyFilter,
    incomingCall,
    setIncomingCall
  } = useCall();

  // =========================================================================
  // 1. Centralized Call Alert Management (Global Root Binding)
  // =========================================================================
  const ringingGroupCalls = incomingGroupCalls.filter(c => !c.isTimedOut && c.id !== activeGroupRoom?.channelName);
  const isAnyCallIncoming = !!incomingCall || ringingGroupCalls.length > 0;
  const currentIncomingCallType = incomingCall?.type || (ringingGroupCalls[0]?.type) || 'voice';
  
  const getRingtoneUrl = () => {
    const tone = settings.chatSettings.callRingtoneTone || 'default';
    if (tone === 'none') return '';
    const RINGTONE_MAP: Record<string, string> = {
      default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      classic: 'https://assets.mixkit.co/active_storage/sfx/2360/2360-preview.mp3',
      marimba: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    };
    return RINGTONE_MAP[tone] || RINGTONE_MAP.default;
  };

  useCallAlertManager({
    isIncoming: isAnyCallIncoming,
    callType: currentIncomingCallType,
    ringtoneUrl: getRingtoneUrl(),
    volume: 0.5 * ((settings.chatSettings.notificationVolume ?? 100) / 100),
    vibrationEnabled: settings.chatSettings.callVibrate !== 'off',
    silentMode: settings.chatSettings.silentMode || settings.chatSettings.muteAllSounds
  });

  // Atomic State Transition: Sync UI clearing with call acceptance
  const stopAllBackgroundMedia = () => {
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        try { video.pause(); video.muted = true; } catch (e) {}
      });
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        try { audio.pause(); } catch (e) {}
      });
    } catch (e) {}
  };

  const handleAnswerCall = useCallback(async (callArg?: any) => {
    if (isCallActionLoading) return;
    setIsCallActionLoading(true);

    // Set manual call click guard flag explicitly so validation in useCallManager succeeds
    (window as any).__USER_MANUAL_CALL_CLICK__ = true;

    // 1. Immediate UI Cleanup (Atomic)
    // We clear the state instantly to stop the AlertManager and hide the modal
    const currentIncoming = incomingCall;

    // Extract callId and type reliably from the passed argument or the current incoming call
    let targetCallId: string | undefined;
    let targetCallType: 'video' | 'voice' | undefined;

    if (callArg && typeof callArg === 'object') {
      targetCallId = callArg.callId || callArg.channelName;
      targetCallType = callArg.type;
    } else if (typeof callArg === 'string') {
      targetCallId = callArg;
    }

    if (!targetCallId) {
      targetCallId = currentIncoming?.id || (currentIncoming as any)?.callId;
    }
    if (!targetCallType) {
      targetCallType = currentIncoming?.type || 'video';
    }

    setIncomingCall(null);
    stopAllBackgroundMedia();

    // 2. Heavy Media Init in background with explicit call parameters
    try {
      const initialStream = callArg?.initialStream;
      const isInitialMuted = callArg?.isInitialMuted;
      await originalAcceptCall(
        { callId: targetCallId, type: targetCallType },
        targetCallType,
        true,
        initialStream,
        isInitialMuted
      );
    } catch (e) {
      console.error('Accept call failed:', e);
      // If it fails, we might want to restore incoming call state, 
      // but usually, it's better to stay clean.
    } finally {
      setIsCallActionLoading(false);
    }
  }, [incomingCall, originalAcceptCall, setIncomingCall, isCallActionLoading]);

  const handleRejectCallWrapper = useCallback(async () => {
    if (isCallActionLoading) return;
    setIsCallActionLoading(true);

    setIncomingCall(null);
    
    try {
      await originalRejectCall();
    } catch (e) {
      console.error('Reject call failed:', e);
    } finally {
      setIsCallActionLoading(false);
    }
  }, [originalRejectCall, setIncomingCall, isCallActionLoading]);

  const handleAnswerGroupCall = useCallback(async (call: any) => {
    if (isCallActionLoading) return;
    setIsCallActionLoading(true);

    // Immediate UI clearing
    setIncomingGroupCalls(prev => prev.filter(c => c.id !== call.id));
    stopAllBackgroundMedia();
    window.dispatchEvent(new CustomEvent('stopRingtone'));

    // Trigger state change with forced unmount of prior activeGroupRoom
    setActiveGroupRoom(null);
    setTimeout(() => {
      setActiveGroupRoom({ channelName: call.id, callType: call.type || 'voice' });
      setIsGroupCallMinimized(false);
      setIsCallActionLoading(false);
    }, 50);
  }, [setIncomingGroupCalls, isCallActionLoading]);

  const handleRejectGroupCall = useCallback(async (call: any) => {
    if (isCallActionLoading) return;
    setIsCallActionLoading(true);

    setIncomingGroupCalls(prev => prev.filter(c => c.id !== call.id));
    window.dispatchEvent(new CustomEvent('stopRingtone'));

    try {
      const roomRef = doc(firestoreDb, 'rooms', call.id);
      const myId = auth.currentUser?.uid;
      if (myId) {
        await updateDoc(roomRef, {
          [`participants.${myId}.status`]: 'rejected'
        });
      }
    } catch (e) {
      console.error('Reject group call failed:', e);
    } finally {
      setIsCallActionLoading(false);
    }
  }, [setIncomingGroupCalls, isCallActionLoading]);

  // Global listener to activate isolated group voice call room
  useEffect(() => {
    const handleOpenGroupCall = (e: any) => {
      const channelName = typeof e.detail === 'string' ? e.detail : (e.detail?.channelName || e.detail?.channel);
      const callType = e.detail?.callType || e.detail?.type || 'voice';
      if (channelName) {
        // Clear active room first to force clean unmount of old connection
        setActiveGroupRoom(null);
        setTimeout(() => {
          setActiveGroupRoom({ channelName, callType });
        }, 50);
      }
    };
    window.addEventListener('openGroupVoiceCall', handleOpenGroupCall);
    return () => window.removeEventListener('openGroupVoiceCall', handleOpenGroupCall);
  }, []);

  const [liveSession, setLiveSession] = useState<{
    mode: 'viewer' | 'host';
    isMinimized: boolean;
    streamId?: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === 'live') {
      setLiveSession({ mode: 'host', isMinimized: false });
    } else if (activeTab === 'live_watch') {
      setLiveSession({ mode: 'viewer', isMinimized: false });
    } else if (activeTab !== 'home' && activeTab !== 'chats' && activeTab !== 'profile' && activeTab !== 'settings') {
      // Maintain state for other potential tabs if needed
    } else {
      // CLEAR live session when switching to standard navigation tabs to stop background processing/heat
      setLiveSession(prev => {
        // If viewer, always stop. If host, only keep if it was already minimized (e.g. background broadcast)
        if (prev?.mode === 'viewer') return null;
        if (prev?.mode === 'host' && !prev.isMinimized) return null;
        return prev;
      });
    }
  }, [activeTab]);

  useEffect(() => {
    // Non-blocking background health check
    async function testConnection() {
      try {
        await getDocFromServer(doc(firestoreDb, '_connection_test_', 'test_doc'));
        setPermissionError(null);
      } catch (error: any) {
        // Silently tolerate in background
      }
    }
    testConnection();

    // Global Audio Unlocker
    const unlockAudio = () => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // Silent
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start(0);
      oscillator.stop(audioCtx.currentTime + 0.1);
      
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });

  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log("Auth: User detected", user.uid);
          setUserId(user.uid);
          setMyId(user.uid);
          
          // Robust Profile Initialization & Duplicate Recovery
          const userDocRef = doc(firestoreDb, 'users', user.uid);
          let userDoc = await getDoc(userDocRef);
          let userData: any = userDoc.exists() ? userDoc.data() : null;

          // ACCOUNT UNIFICATION: Search by email if UID doc not found
          if (!userData && user.email) {
            console.log("Auth: UID doc not found, searching by email for unification:", user.email);
            const emailQuery = query(collection(firestoreDb, 'users'), where('email', '==', user.email), limit(1));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              const existingDoc = emailSnap.docs[0];
              console.log("Auth: Found existing account by email, unifying data to UID doc", existingDoc.id);
              const existingData = existingDoc.data();
              // Migrate data to the new UID document
              await setDoc(userDocRef, {
                ...existingData,
                uid: user.uid, // Ensure UID is updated to current
                lastSeen: serverTimestamp(),
                isOnline: true
              }, { merge: true });
              userDoc = await getDoc(userDocRef);
              userData = userDoc.data();
            }
          }

          // CRITICAL: Check for duplicate documents with same UID field (if random IDs were used previously)
          if (!userData || (!userData.nickname && !userData.displayName && !userData.name)) {
            console.log("Auth: Profile empty or missing, searching for duplicates by UID field");
            const q = query(collection(firestoreDb, 'users'), where('uid', '==', user.uid), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const duplicateDoc = querySnapshot.docs[0];
              if (duplicateDoc.id !== user.uid) {
                console.log("Auth: Found duplicate document by UID field", duplicateDoc.id);
                const duplicateData = duplicateDoc.data();
                if (duplicateData.nickname || duplicateData.displayName || duplicateData.name) {
                  console.log("Auth: Duplicate has data, merging into UID document");
                  await setDoc(userDocRef, duplicateData, { merge: true });
                  userDoc = await getDoc(userDocRef);
                  userData = userDoc.data();
                }
              }
            }
          }

          // If still missing data, use Auth data to initialize
          if (!userData || (!userData.nickname && !userData.displayName && !userData.name)) {
            console.log("Auth: Initializing profile with Auth data");
            const emailPart = user.email ? user.email.split('@')[0] : user.uid;
            const initialData = {
              uid: user.uid,
              displayName: user.displayName || emailPart,
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || user.uid}`,
              email: user.email,
              createdAt: userData?.createdAt || serverTimestamp(),
              isOnline: true,
              lastSeen: serverTimestamp()
            };
            await setDoc(userDocRef, initialData, { merge: true });
            userDoc = await getDoc(userDocRef);
            userData = userDoc.data();
          } else {
            // Update online status and ensure UID field is set
            await setDoc(userDocRef, {
              uid: user.uid,
              isOnline: true,
              lastSeen: serverTimestamp()
            }, { merge: true });
          }
          
          if (userData && userData.chatSettings) {
            loadUserSettings(user.uid);
          }
          
          // Check if profile is completed
          const isNewReg = localStorage.getItem('hisee_new_registration') === 'true';
          
          // Direct redirection for specific user to ChatMainView (chats tab)
          if (user.email === 'dilginhussein984e55@gmail.com') {
            setActiveTab('chats');
          }

          if (userData && userData.profileCompleted) {
            console.log("Auth: Profile completed, going to main");
            localStorage.removeItem('hisee_new_registration');
            setViewState(prev => (prev === 'auth' || prev === 'auth_signup' || prev === 'complete_profile') ? 'main' : prev);
          } else if (isNewReg) {
            console.log("Auth: Profile incomplete and new registration detected, going to complete_profile");
            setViewState('complete_profile');
          } else {
            console.log("Auth: Profile incomplete but not a new registration, skipping complete_profile, going directly to main");
            setViewState(prev => (prev === 'auth' || prev === 'auth_signup' || prev === 'complete_profile') ? 'main' : prev);
          }
        } else {
          console.log("Auth: No user detected");
          setUserId(null);
          setMyId('');
          setViewState(prev => (prev !== 'auth' && prev !== 'auth_signup') ? 'auth' : prev);
        }
      } catch (err) {
        console.error("Auth: Error in onAuthStateChanged callback:", err);
        setViewState(prev => (prev === 'auth' || prev === 'auth_signup') ? 'main' : prev);
      } finally {
        setIsAuthLoading(false);
      }
    }, (error) => {
      console.error("Auth: onAuthStateChanged error:", error);
      setIsAuthLoading(false);
      setAuthMessage("خطأ في الاتصال بخدمات المصادقة.");
    });
    
    // Safety timeout for loading screen (Strict 1.5s bypass for rotation fix)
    const timeout = setTimeout(() => {
      console.log("Auth: Force resolving isAuthLoading (1.5s safety timeout)");
      setIsAuthLoading(false);
    }, 1500);
    
    return () => {
        unsubscribe();
        clearTimeout(timeout);
    };
  }, [setUserId, isDbConnected]);
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hisee_language') as Language;
      if (saved && ['ar', 'en', 'de', 'ku', 'ku-Latn', 'ckb', 'tr', 'fr', 'es', 'it', 'ru', 'zh', 'ja', 'uk', 'hi'].includes(saved)) {
        return saved;
      }
    }
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && lang) {
      localStorage.setItem('hisee_language', lang);
      localStorage.setItem('hisee_user_language', lang);
    }
  }, [lang]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [stories, setStories] = useState<VideoItem[]>([]);
  
  useEffect(() => {
    const urlsToRevoke: string[] = [];
    const loadCachedVideos = async () => {
      try {
        const cached = await videoCache.getAllVideos();
        if (cached.length > 0) {
          const cachedVideoItems: VideoItem[] = cached.map(cv => {
            const blob = new Blob([cv.data], { type: cv.metadata.type });
            const url = URL.createObjectURL(blob);
            urlsToRevoke.push(url);
            
            if (cv.metadata.videoItemJson) {
              try {
                const parsed = JSON.parse(cv.metadata.videoItemJson) as VideoItem;
                return { ...parsed, url: url, id: cv.id };
              } catch (e) {
                console.error("Failed to parse videoItemJson", e);
              }
            }

            return {
              id: cv.id,
              url: url,
              user: auth.currentUser?.displayName || 'أنا',
              userId: auth.currentUser?.uid || 'me',
              userAvatar: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid || 'me'}`,
              likes: 0,
              comments: [],
              shares: 0,
              saves: 0,
              desc: cv.metadata.description || "فيديو محفوظ محلياً",
              music: cv.metadata.music || 'Original Sound',
              isFollowed: false,
              audioSettings: { autoEnhance: true, volume: 80 },
              target: cv.metadata.target || 'feed',
              privacy: 'public'
            };
          });
          setLocalVideos(prev => {
            const existingIds = new Set(prev.map(v => v.id));
            const newUnique = cachedVideoItems.filter(v => !existingIds.has(v.id));
            return [...newUnique, ...prev];
          });
        }
      } catch (err) {
        console.error("Failed to load cached videos", err);
      }
    };
    loadCachedVideos();
    return () => {
      urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const [isUiVisible, setIsUiVisible] = useState(true);
  const [activeStory, setActiveStory] = useState<VideoItem | null>(null);
  
  const [targetMediaId, setTargetMediaId] = useState<{type: "video" | "photo", id: string} | null>(null);
  const [myStory, setMyStory] = useState<VideoItem | null>(null);
  const [totalChatNotifications, setTotalChatNotifications] = useState(0);
  const [totalSystemNotifications, setTotalSystemNotifications] = useState(0);
  const [toastNotification, setToastNotification] = useState<{name: string, message: string} | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  // Handle Deep Linking / Sharing URLs
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      const id = params.get('id');
      const videoId = (type === 'video' && id) ? id : params.get('video');
      const photoId = (type === 'photo' && id) ? id : params.get('photo');
      const liveId = (type === 'live' && id) ? id : params.get('live');
      const profileId = (type === 'profile' && id) ? id : params.get('profile');

      const forceLive = params.get('forceLive');
      if (forceLive === 'true') {
        setLiveSession({ mode: 'viewer', isMinimized: false, streamId: 'test-stream' });
        setActiveTab('live_watch');
      }

      if (videoId) {
        setTargetMediaId({ type: 'video', id: videoId });
        setActiveTab('home');
      } else if (photoId) {
        setTargetMediaId({ type: 'photo', id: photoId });
        setActiveTab('home');
      } else if (liveId) {
        setLiveSession({ mode: 'viewer', isMinimized: false, streamId: liveId });
        setActiveTab('live_watch');
      } else if (profileId) {
        if (profileId !== 'me') setSelectedUserId(profileId);
        setActiveTab('profile');
      }
    } catch (e) {
      console.warn("Deep Link Error:", e);
    }
  }, []);
  
  const allData = useRef<Record<string, VideoItem[]>>({ posts: [], stories: [], videos: [] });
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState(0);

  const updateVideosState = useCallback((newData: VideoItem[], source: 'posts' | 'stories' | 'videos') => {
    // Sort by createdAt desc client-side to ensure stability and include all items
    const sortedData = [...newData].sort((a, b) => {
      const timeA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime())) : 0;
      const timeB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime())) : 0;
      return timeB - timeA;
    });
    allData.current[source] = sortedData;
    setLastRemoteUpdate(prev => prev + 1);
  }, []);

  useEffect(() => {
    // Combine Firestore data with local/optimistic videos
    const combined = [
      ...localVideos,
      ...allData.current.posts,
      ...allData.current.stories,
      ...allData.current.videos
    ];

    // De-duplicate by ID (prefer local/optimistic version if IDs match, specifically preserve blob URLs)
    const uniqueMap = new Map<string, VideoItem>();
    combined.forEach(v => {
      // Ignore corrupt legacy blob URLs, null, or empty URLs from Firestore for published videos
      if (!v.isUploading && (!v.url || typeof v.url !== 'string' || v.url.trim() === '' || v.url.startsWith('blob:') || v.url === 'null' || v.url === 'undefined')) {
        return;
      }

      const existing = uniqueMap.get(v.id);
      if (existing) {
        if (existing.isUploading && !v.isUploading && !v.url.startsWith('blob:')) {
          // Upload completed! Replace local uploading state with official public video item
          uniqueMap.set(v.id, v);
        } else if (existing.url.startsWith('blob:') && !v.url.startsWith('blob:')) {
          // Overwrite local blob URL with final public HTTPS URL from Firestore
          uniqueMap.set(v.id, v);
        } else if (!existing.url.startsWith('blob:') && v.url.startsWith('blob:')) {
          // Keep existing public HTTPS URL
          uniqueMap.set(v.id, existing);
        } else {
          uniqueMap.set(v.id, v);
        }
      } else {
        uniqueMap.set(v.id, v);
      }
    });
    
    const allVideos = Array.from(uniqueMap.values());

    // Filter videos by privacy status
    const filteredVideos = allVideos.filter(v => {
      const authorUid = v.userId || v.authorUid || 'unknown';
      const privacy = v.privacy || v.visibility || 'public';
      const isOwner = myId ? (authorUid === myId) : false;

      // 1. Private: only owner can see
      if (privacy === 'private' && !isOwner) {
        return false;
      }

      // 2. Friends: only owner and friends can see
      if (privacy === 'friends' && !isOwner) {
        if (!myFriends.includes(authorUid)) {
          return false;
        }
      }

      return true;
    });

    // Separate feed (video) and story
    const feedVideos = filteredVideos.filter(v => {
      const target = v.target || 'feed';
      return target === 'feed' || target === 'video' || target === 'both';
    });

    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    const getCreatedAtTime = (createdAt: any): number => {
      if (!createdAt) return 0;
      if (createdAt.toDate && typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
      if (createdAt.toMillis && typeof createdAt.toMillis === 'function') return createdAt.toMillis();
      if (createdAt.seconds) return createdAt.seconds * 1000;
      if (typeof createdAt === 'number') return createdAt;
      return new Date(createdAt).getTime();
    };

    const storyVideos = filteredVideos.filter(v => {
      const authorUid = v.userId || v.authorUid || 'unknown';
      // Mutual Block Check for Stories
      if (myId && authorUid !== 'unknown') {
        const myBlockedUsers = currentUser?.blockedUsers || [];
        const usersBlockingMe = currentUser?.blockedBy || [];
        if (myBlockedUsers.includes(authorUid) || usersBlockingMe.includes(authorUid)) {
          return false;
        }
      }

      const target = v.target || 'feed';
      const isStory = target === 'story' || target === 'both';
      if (!isStory) return false;

      // Strictly 24 hours expiration for stories (disappear after 24 hours)
      const createdAtTime = getCreatedAtTime(v.createdAt);
      if (isNaN(createdAtTime) || createdAtTime === 0) return true;
      return (now - createdAtTime) <= TWENTY_FOUR_HOURS_MS;
    });

    // Sort by createdAt descending
    feedVideos.sort((a, b) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id); // Fallback to ID
    });

    storyVideos.sort((a, b) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id); // Fallback to ID
    });

    // Cleanup specific mock posts if they exist in Firestore (Requested by user)
    const cleanupMockPosts = async () => {
      const cleanupKey = 'hisee_cleanup_mock_posts_v1';
      if (localStorage.getItem(cleanupKey)) return;

      try {
        const postsRef = collection(firestoreDb, 'posts');
        const q = query(postsRef, where('user', 'in', ['سارة المهيري', 'سارة مهيري', 'عمر النيادي']));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(firestoreDb);
          snap.docs.forEach(d => batch.delete(d.ref));
          
          // Also check 'photos' collection if it exists separately
          const photosRef = collection(firestoreDb, 'photos');
          const pSnap = await getDocs(query(photosRef, where('user', 'in', ['سارة المهيري', 'سارة مهيري', 'عمر النيادي'])));
          pSnap.docs.forEach(d => batch.delete(d.ref));
          
          await batch.commit();
          console.log("Cleanup: Mock posts removed from Firestore");
        }
        localStorage.setItem(cleanupKey, 'true');
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };
    if (isDbConnected && myId) {
      cleanupMockPosts();
    }
    
    setVideos(feedVideos);
    setStories(storyVideos);

    if (myId) {
      const myLatestStory = storyVideos.find(v => {
        const isMine = v.userId === myId || v.authorUid === myId;
        if (!isMine) return false;
        
        const createdAtTime = getCreatedAtTime(v.createdAt);
        if (isNaN(createdAtTime) || createdAtTime === 0) return true;
        return (now - createdAtTime) <= TWENTY_FOUR_HOURS_MS;
      });
      setMyStory(myLatestStory || null);
    }
  }, [lastRemoteUpdate, localVideos, myId, myFriends]);

  useEffect(() => {
    if (!isDbConnected) return;
    // Fetch posts and stories from Firestore
    const postsQuery = query(
      collection(firestoreDb, 'posts'), 
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const storiesQuery = query(
      collection(firestoreDb, 'stories'), 
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    const videosQuery = query(
      collection(firestoreDb, 'videos'), 
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      if (document.hidden) return;
      const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, target: data.target || 'feed', collectionName: 'posts' } as VideoItem;
      });
      updateVideosState(posts, 'posts');
    }, (err) => {
      console.warn("postsQuery onSnapshot error:", err?.message || err);
    });

    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      if (document.hidden) return;
      const stories = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, target: data.target || 'story', collectionName: 'stories' } as VideoItem;
      });
      updateVideosState(stories, 'stories');
    }, (err) => {
      console.warn("storiesQuery onSnapshot error:", err?.message || err);
    });

    // Add dedicated listener for MY stories to ensure visibility
    let unsubscribeMyStories = () => {};
    if (myId) {
      const myStoriesQuery = query(
        collection(firestoreDb, 'stories'),
        where('authorUid', '==', myId),
        limit(20)
      );
      unsubscribeMyStories = onSnapshot(myStoriesQuery, (snapshot) => {
        if (document.hidden) return;
        const myStories = snapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, ...data, target: data.target || 'story' } as VideoItem;
        });
        setLocalVideos(prev => {
          const newMap = new Map(prev.map(v => [v.id, v]));
          myStories.forEach(v => {
            newMap.set(v.id, v); // Overwrite or add
          });
          return Array.from(newMap.values());
        });
      }, (err) => {
        console.warn("myStoriesQuery onSnapshot error:", err?.message || err);
      });
    }

    const unsubscribeVideos = onSnapshot(videosQuery, (snapshot) => {
      if (document.hidden) return;
      const videos = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, target: data.target || 'feed', collectionName: 'videos' } as VideoItem;
      });
      updateVideosState(videos, 'videos');
    }, (err) => {
      console.warn("videosQuery onSnapshot error:", err?.message || err);
    });
    
    return () => {
        unsubscribePosts();
        unsubscribeStories();
        unsubscribeVideos();
        unsubscribeMyStories();
    };
  }, [isDbConnected, myId, updateVideosState]);

  // Global Call Listener
  const globalFadeTimerRef = useRef<any>(null);
  const incomingCallRef = useRef<any>(null);

  // =========================================================================
  // 1-on-1 Incoming Call Listener - MOVED TO useCallManager
  // =========================================================================

  // Handle disconnect/unmount
  useEffect(() => {
    if (!myId || !isDbConnected) return;

    const userRef = doc(firestoreDb, 'users', myId);
    
    // Set online status
    setDoc(userRef, {
      isOnline: true,
      lastSeen: serverTimestamp()
    }, { merge: true }).catch(err => console.error("Error setting online status:", err));

    // Handle disconnect/unmount
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        setDoc(userRef, { 
          isOnline: false,
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(() => {});
      } else {
        setDoc(userRef, { 
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    };

    const handleBlur = () => {
      setDoc(userRef, { 
        isOnline: false,
        lastSeen: serverTimestamp()
      }, { merge: true }).catch(() => {});
    };

    const handleFocus = () => {
      if (!document.hidden) {
        setDoc(userRef, { 
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    };

    const handleUnload = () => {
      // Best effort update for unexpected exit
      setDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp()
      }, { merge: true }).catch(() => {});
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleUnload);

    // Heartbeat to keep user online
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden && document.visibilityState === 'visible') {
        setDoc(userRef, { 
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    }, 10000); // 10 seconds heartbeat

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleUnload);
      clearInterval(heartbeatInterval);
      // Set offline on unmount
      setDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp()
      }, { merge: true }).catch(() => {});
    };
  }, [myId, isDbConnected]);

  useEffect(() => {
    if (!myId || !isDbConnected) {
      setMyProfile(null);
      return;
    }
    const userRef = doc(firestoreDb, 'users', myId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (document.hidden) return;
      if (doc.exists()) {
        const data = doc.data();
        const email = data.email || auth.currentUser?.email || '';
        const emailStr = typeof email === 'string' ? email : (email?.value || '');
        const emailPrefix = emailStr ? emailStr.split('@')[0] : '';
        const name = data.displayName || data.name || data.nickname || emailPrefix || doc.id;
        
        const profileData: any = { 
          id: doc.id, 
          ...data,
          displayName: name,
          photoURL: data.photoURL || data.profileImage || data.avatarUrl || data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailStr || doc.id}`
        };
        
        setMyProfile(profileData);
      } else if (auth.currentUser) {
        const email = auth.currentUser.email || '';
        const emailStr = email;
        const emailPrefix = emailStr ? emailStr.split('@')[0] : '';
        // Use Auth data if document doesn't exist yet
        setMyProfile({
          id: myId,
          displayName: auth.currentUser.displayName || emailPrefix || myId,
          photoURL: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`,
          email: auth.currentUser.email
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${myId}`);
    });
    return () => unsubscribe();
  }, [myId, isDbConnected]);

  useEffect(() => {
    // Preload notification sounds
    const sounds = [
      'https://assets.mixkit.co/active_storage/sfx/1361/1361-preview.mp3',
      'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
      'https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3'
    ];
    sounds.forEach(url => {
      const audio = new Audio(url);
      audio.load();
    });
  }, []);

  const [isAppBlurred, setIsAppBlurred] = useState(false);

  // Screen Security Effect
  useEffect(() => {
    if (!settings.chatSettings.privacy.screenSecurity) {
      setIsAppBlurred(false);
      return;
    }

    const handleBlur = () => setIsAppBlurred(true);
    const handleFocus = () => setIsAppBlurred(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsAppBlurred(true);
      } else {
        setIsAppBlurred(false);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.chatSettings.privacy.screenSecurity]);

  useEffect(() => {
    if (myId && isDbConnected) {
      saveUserSettings(settings);
    }
  }, [settings, myId, isDbConnected]);

  function cleanUndefined(obj: any): any {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (Array.isArray(obj)) {
      return obj.map(cleanUndefined);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = cleanUndefined(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  }

  async function saveUserSettings(newSettings: AppSettings) {
    if (!myId) return;
    try {
      const userRef = doc(firestoreDb, 'users', myId);
      const payload: any = {};
      
      if (newSettings.chatSettings !== undefined) payload.chatSettings = cleanUndefined(newSettings.chatSettings);
      if (newSettings.interactionsSettings !== undefined) payload.interactionsSettings = cleanUndefined(newSettings.interactionsSettings);
      if (newSettings.contentDisplaySettings !== undefined) payload.contentDisplaySettings = cleanUndefined(newSettings.contentDisplaySettings);
      if (newSettings.wellbeingSettings !== undefined) payload.wellbeingSettings = cleanUndefined(newSettings.wellbeingSettings);
      if (newSettings.liveSettings !== undefined) payload.liveSettings = cleanUndefined(newSettings.liveSettings);
      if (newSettings.activitySettings !== undefined) payload.activitySettings = cleanUndefined(newSettings.activitySettings);
      if (newSettings.familySettings !== undefined) payload.familySettings = cleanUndefined(newSettings.familySettings);

      if (Object.keys(payload).length > 0) {
        await setDoc(userRef, payload, { merge: true });
        console.log("Settings saved to Firestore");
      }
    } catch (error) {
      console.error("Failed to save settings to Firestore:", error);
    }
  }

  async function loadUserSettings(uid: string) {
    try {
      const userRef = doc(firestoreDb, 'users', uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSettings(prev => {
          const newSettings = {
            ...prev,
            chatSettings: data.chatSettings ? { ...prev.chatSettings, ...data.chatSettings } : prev.chatSettings,
            interactionsSettings: data.interactionsSettings ? { ...prev.interactionsSettings, ...data.interactionsSettings } : prev.interactionsSettings,
            contentDisplaySettings: data.contentDisplaySettings ? { ...prev.contentDisplaySettings, ...data.contentDisplaySettings } : prev.contentDisplaySettings,
            wellbeingSettings: data.wellbeingSettings ? { ...prev.wellbeingSettings, ...data.wellbeingSettings } : prev.wellbeingSettings,
            liveSettings: data.liveSettings ? { ...prev.liveSettings, ...data.liveSettings } : prev.liveSettings,
            activitySettings: data.activitySettings ? { ...prev.activitySettings, ...data.activitySettings } : prev.activitySettings,
            familySettings: data.familySettings ? { ...prev.familySettings, ...data.familySettings } : prev.familySettings,
          };
          localStorage.setItem('hisee_chat_settings', JSON.stringify(newSettings.chatSettings));
          window.dispatchEvent(new Event('chatSettingsChanged'));
          return newSettings;
        });
        console.log("Settings loaded from Firestore");
      }
    } catch (error) {
      console.error("Failed to load settings from Firestore:", error);
    }
  }

  useEffect(() => {
    if (settings && myId) {
      localStorage.setItem('hisee_chat_settings', JSON.stringify(settings.chatSettings));
      window.dispatchEvent(new Event('chatSettingsChanged'));
      saveUserSettings(settings);
    }
  }, [settings.chatSettings, myId]);

  // Apply content & display settings to document root for global CSS access
  useEffect(() => {
    const dSettings = settings.contentDisplaySettings;
    if (!dSettings) return;

    const root = document.documentElement;

    if (dSettings.fontSize) {
      root.setAttribute('data-font-size', dSettings.fontSize);
    } else {
      root.removeAttribute('data-font-size');
    }

    if (dSettings.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    if (dSettings.highContrastText) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (dSettings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [settings.contentDisplaySettings]);

  // Accessibility: Screen Reader global click listener
  useEffect(() => {
    const isScreenReaderOn = settings?.contentDisplaySettings?.screenReader;
    
    const handleGlobalClick = (e: MouseEvent) => {
      if (!isScreenReaderOn) return;
      
      const target = e.target as HTMLElement;
      // Find the closest element with meaningful text
      const textNode = target.closest('button, a, label, h1, h2, h3, h4, h5, h6, [role="button"], p');
      
      let textToRead = '';
      if (textNode) {
        textToRead = textNode.getAttribute('aria-label') || (textNode.textContent || '').trim();
      } else if (target.textContent) {
        textToRead = target.textContent.trim();
      }

      if (textToRead && textToRead.length < 200) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = settings?.contentDisplaySettings?.targetLanguage === 'en' ? 'en-US' : 'ar-SA';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    };

    if (isScreenReaderOn) {
      document.body.addEventListener('click', handleGlobalClick, { capture: true });
    }

    return () => {
      document.body.removeEventListener('click', handleGlobalClick, { capture: true });
      window.speechSynthesis.cancel();
    };
  }, [settings?.contentDisplaySettings?.screenReader, settings?.contentDisplaySettings?.targetLanguage]);

  // Location History Sync
  useEffect(() => {
    const isPreciseLoc = settings?.contentDisplaySettings?.preciseLocation;
    const isLocHistory = settings?.contentDisplaySettings?.locationHistory;
    
    let watchId: number;
    
    if (isPreciseLoc && isLocHistory && myId && 'geolocation' in navigator) {
      // Record location occasionally (every 5-10 minutes) but we'll use watchPosition to get updates, 
      // with a throttle to avoid spamming the DB.
      let lastSavedTime = 0;
      
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (now - lastSavedTime > 5 * 60 * 1000) { // every 5 minutes
            lastSavedTime = now;
            try {
              addDoc(collection(firestoreDb, 'user_activity_logs'), {
                userId: myId,
                type: 'location',
                text: `تم حفظ موقع جديد: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                createdAt: serverTimestamp()
              });
            } catch (e) {
              console.error("Failed to save location history", e);
            }
          }
        },
        (error) => console.error("Location tracking error", error),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 30000 }
      );
    }
    
    return () => {
      if (watchId !== undefined && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [settings?.contentDisplaySettings?.preciseLocation, settings?.contentDisplaySettings?.locationHistory, myId]);

  // Offline Videos Sync
  useEffect(() => {
    const isOfflineVideosEnabled = settings?.contentDisplaySettings?.offlineVideos;

    if (!isOfflineVideosEnabled) {
      // Clear offline cache
      const clearCache = async () => {
        try {
          const cached = await videoCache.getAllVideos();
          for (const v of cached) {
            if (v.metadata.isOfflineCache) {
              await videoCache.deleteVideo(v.id);
            }
          }
        } catch (e) {
          console.error("Failed to clear offline video cache", e);
        }
      };
      clearCache();
      return;
    }

    if (isOnline && isOfflineVideosEnabled && videos.length > 0) {
      // Download top 5 feed videos
      const syncOfflineVideos = async () => {
        try {
          // Use a slice of the feed videos, avoiding already local ones
          const topVideos = videos.filter(v => !v.url.startsWith('blob:')).slice(0, 5);
          if (topVideos.length === 0) return;
          
          const cached = await videoCache.getAllVideos();
          const cachedOfflineIds = cached.filter(v => v.metadata.isOfflineCache).map(v => v.id);
          
          // Delete old cached offline videos that are not in top 5
          const topVideoIds = topVideos.map(v => v.id);
          for (const id of cachedOfflineIds) {
            if (!topVideoIds.includes(id)) {
              await videoCache.deleteVideo(id);
            }
          }

          // Cache new videos
          for (const video of topVideos) {
            if (!cachedOfflineIds.includes(video.id)) {
              const response = await fetch(video.url);
              if (response.ok) {
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                await videoCache.saveVideo({
                  id: video.id,
                  data: arrayBuffer,
                  metadata: {
                    name: video.desc || 'Offline Video',
                    type: blob.type || 'video/mp4',
                    size: arrayBuffer.byteLength,
                    timestamp: Date.now(),
                    userId: video.userId,
                    description: video.desc,
                    music: video.music,
                    target: 'feed',
                    isOfflineCache: true,
                    videoItemJson: JSON.stringify(video)
                  }
                });
              }
            }
          }
        } catch (e) {
          console.error("Failed to sync offline videos", e);
        }
      };
      
      const timeoutId = setTimeout(() => {
        syncOfflineVideos();
      }, 5000); 
      
      return () => clearTimeout(timeoutId);
    }
  }, [videos, isOnline, settings?.contentDisplaySettings?.offlineVideos]);

  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('hisee_chat_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(prev => {
            if (JSON.stringify(prev.chatSettings) !== JSON.stringify({ ...prev.chatSettings, ...parsed })) {
              return { ...prev, chatSettings: { ...prev.chatSettings, ...parsed } };
            }
            return prev;
          });
        } catch (e) {}
      }
    };
    window.addEventListener('chatSettingsChanged', handleSettingsChange);
    return () => window.removeEventListener('chatSettingsChanged', handleSettingsChange);
  }, []);

  const t = translations[lang] || translations.ar;

  // Logic to check if bottom nav is currently active/shown conceptually
  const showBottomNav = activeTab !== 'live' && activeTab !== 'post' && activeTab !== 'photo_studio' && activeTab !== 'live_watch' && activeTab !== 'ai_video' && activeTab !== 'deep_thinking' && !(activeTab === 'chats' && selectedChat);

  useEffect(() => {
    if (!myId || !auth.currentUser || !isDbConnected) return;
    
    // Initialize peer service only if we have a user and it's not already initialized
    if (myId && viewState === 'main') {
      peerService.init((id) => {
        console.log("Peer initialized with ID:", id);
      }, () => {});
    }

    // Chat Notifications Listener
    const chatQ = query(
      collection(firestoreDb, 'chats'), 
      where('participants', 'array-contains', myId)
    );
    
    const unsubscribeChats = onSnapshot(chatQ, (snapshot) => {
      if (document.hidden) return;
      const chats: Chat[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      
      // Audio Notification Logic (Global)
      let shouldPlaySound = false;
      chats.forEach(chat => {
        const chatId = chat.id;
        const currentTimestamp = chat.lastMessageTimestamp || (chat.updatedAt ? getMillis(chat.updatedAt) : 0);
        const prevTimestamp = lastMessageTimestamps.current.get(chatId) || 0;
        
        if (currentTimestamp > prevTimestamp) {
          // Update stored timestamp
          lastMessageTimestamps.current.set(chatId, currentTimestamp);
          
          // Trigger sound if:
          // 1. Not the first load (prevTimestamp > 0)
          // 2. Message is from someone else
          // 3. Message is recent (within 10s)
          const isFromOther = chat.lastMessageSenderId && chat.lastMessageSenderId !== myId;
          const isRecent = (Date.now() - currentTimestamp) < 10000;
          
          if (prevTimestamp > 0 && isFromOther && isRecent) {
            shouldPlaySound = true;
          }
        }
      });

      const isNotifAllowed = isPermissionAllowed('notifications') && settings.notifications;

      if (shouldPlaySound && isNotifAllowed && settings.chatSettings.sounds.messages && !settings.chatSettings.muteAllSounds) {
        const now = Date.now();
        if (now - lastPlayTime.current > 1000) { // 1s throttle
          lastPlayTime.current = now;
          const vol = (settings.chatSettings.notificationVolume ?? 100) / 100;
          
          let audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'; // default
          const selectedSound = settings.chatSettings.sounds.notificationSound;
          
          if (selectedSound === 'hisee_1') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'; // Stronger beep
          else if (selectedSound === 'hisee_2') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'; // Kept (Coin)
          else if (selectedSound === 'hisee_3') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3'; // Clean pop (fixed freeze)
          else if (selectedSound === 'hisee_4') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Modern UI pop
          else if (selectedSound === 'custom' && settings.chatSettings.sounds.customNotificationSound) {
              audioUrl = settings.chatSettings.sounds.customNotificationSound;
          }

          const audio = new Audio(audioUrl);
          audio.volume = vol;
          audio.play().catch(() => {
            // Fallback Ping
            const fallback = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            fallback.volume = vol;
            fallback.play().catch(() => {});
          });
        }
      }

      const unreadMessages = chats.reduce((sum, chat) => {
        if (chat.lastMessageSenderId !== myId) {
          return sum + (Number(chat.unreadCount) || 0);
        }
        return sum;
      }, 0);
      const missedOrIncomingCalls = chats.reduce((sum, chat) => {
        const isMock = chat.id.startsWith('mock-');
        const isCaller = !isMock && (((chat as any).callerId && (chat as any).callerId === myId) || 
                         ((chat as any).lastCallCallerId && (chat as any).lastCallCallerId === myId) ||
                         (chat.lastMessageSenderId === myId && chat.callStatus === 'missed'));
        if (!isCaller && (chat.callStatus === 'missed' || chat.callStatus === 'incoming' || (chat.missedAudioCalls ?? 0) > 0 || (chat.missedVideoCalls ?? 0) > 0)) {
          const missedAudio = chat.missedAudioCalls ?? 0;
          const missedVideo = chat.missedVideoCalls ?? 0;
          const callCount = chat.callCount ?? 1;
          return sum + Math.max(missedAudio + missedVideo, callCount);
        }
        return sum;
      }, 0);
      
      setTotalChatNotifications(prev => {
        if (unreadMessages > prev && unreadMessages > 0) {
          // Find the chat that caused the increase (simplistic approach: just pick the most recently updated unread chat)
          const recentUnreadChat = chats.filter(c => c.unreadCount > 0 && (c as any).lastMessageSenderId !== myId).sort((a, b) => {
            const timeA = (a as any).lastMessageTimestamp || (a as any).updatedAt?.toMillis?.() || 0;
            const timeB = (b as any).lastMessageTimestamp || (b as any).updatedAt?.toMillis?.() || 0;
            return timeB - timeA;
          })[0];
          
          if (isNotifAllowed && recentUnreadChat && (!selectedChat || selectedChat.id !== recentUnreadChat.id)) {
            setToastNotification({
              name: recentUnreadChat.user.name,
              message: 'New Message'
            });
            setTimeout(() => setToastNotification(null), 3000);
          }
        }
        return unreadMessages + missedOrIncomingCalls;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    // System Notifications Listener
    const sysNotiRef = collection(firestoreDb, 'users', myId, 'notifications');

    const unsubscribeSystem = onSnapshot(sysNotiRef, (snapshot) => {
      if (document.hidden) return;
      
      const seen = new Set();
      let unreadCount = 0;
      
      const blockedUsers = currentUser?.blockedUsers || [];
      const blockedBy = currentUser?.blockedBy || [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const isUnread = data.read === false;
        
        if (!isUnread) return;

        // Filter out blocked users
        if (data.fromUserId && (blockedUsers.includes(data.fromUserId) || blockedBy.includes(data.fromUserId))) {
          return;
        }

        // Deduplication logic matching NotificationsView
        const isSystem = data.type === 'SYSTEM_BROADCAST' || data.type === 'ANNOUNCEMENT' || data.fromUserId === 'system' || data.fromUserId === 'admin';
        const isRelationship = data.type === 'friend' || data.type === 'friend_accepted' || data.type === 'follow' || data.type === 'visit';
        const key = (isSystem || !isRelationship) ? docSnap.id : `${data.fromUserId}_${data.type}`;

        if (!seen.has(key)) {
          seen.add(key);
          unreadCount++;
        }
      });
      setTotalSystemNotifications(unreadCount);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${myId}/notifications`);
    });
    
    return () => {
        unsubscribeChats();
        unsubscribeSystem();
    };
  }, [myId, auth.currentUser, viewState, settings, isDbConnected, currentUser]);

  // Zero out notification counter immediately when on notifications tab
  useEffect(() => {
    if (activeTab === 'notifications' && myId) {
      setTotalSystemNotifications(0);
      
      // Also clear them in the database to prevent "ghost" numbers
      const clearAllNotifications = async () => {
        try {
          const notiRef = collection(firestoreDb, 'users', myId, 'notifications');
          const q = query(notiRef, where('read', '==', false), limit(450));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const batch = writeBatch(firestoreDb);
            snapshot.docs.forEach(docSnap => {
              batch.update(docSnap.ref, { read: true });
            });
            await batch.commit();
          }
        } catch (err) {
          console.error("Error clearing all notifications in DB:", err);
        }
      };
      clearAllNotifications();
    }
  }, [activeTab, myId]);

  const handleLoginSuccess = (uid: string) => {
    console.log("Auth: Login success for", uid);
    // Explicit direct transition to main view and chats tab
    setViewState('main');
    setActiveTab('chats');
  };

  const handlePermissionsComplete = () => {
    setViewState('main');
  };

  const cancelUploadRef = useRef<(() => void) | null>(null);

  const uploadVideo = useCallback(async (file: File, onProgress: (progress: number) => void, trimParams?: { start: number; duration: number }, signal?: AbortSignal): Promise<{ url: string; public_id?: string }> => {
    console.log("Video: Starting resilient upload pipeline for", file.name, file.size, "bytes");
    
    if (!file || file.size === 0) {
      throw new Error("الملف غير صالح أو فارغ.");
    }

    // Always normalize file to standard MP4 / video/mp4 MIME type
    const normalizedFile = normalizeVideoFile(file);

    if (normalizedFile.type.startsWith('video/')) {
      const duration = await new Promise<number>((resolve) => {
        const timeoutId = setTimeout(() => resolve(0), 3500); // 3.5s safety threshold
        const video = document.createElement('video');
        video.preload = 'metadata';
        const objectUrl = URL.createObjectURL(normalizedFile);
        video.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          const d = video.duration;
          URL.revokeObjectURL(objectUrl);
          resolve(d || 0);
        };
        video.onerror = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          resolve(0);
        };
        video.src = objectUrl;
      });

      const effectiveDuration = (trimParams && typeof trimParams.duration === 'number' && trimParams.duration > 0)
        ? trimParams.duration
        : duration;

      // Allow up to 185s (3 minutes + 5 seconds keyframe padding margin)
      if (effectiveDuration > 185) {
        throw new Error("عذراً، الفيديو أطول من الحجم المسموح به. الحد الأقصى المسموح هو ثلاث دقائق.");
      }
    }

    // Helper to validate & resolve public URL
    const formatPublicUrl = (rawUrl: string): string => {
      if (!rawUrl || rawUrl.startsWith('blob:')) return '';
      let formatted = rawUrl;
      if (formatted.startsWith('/')) {
        formatted = `${window.location.origin}${formatted}`;
      }
      if (formatted.startsWith('http://') && window.location.protocol === 'https:') {
        formatted = formatted.replace('http://', 'https://');
      }
      return formatted;
    };

    // Helper for chunked resilient upload
    const attemptR2 = async (): Promise<string> => {
      const url = await uploadFileResilient(normalizedFile, '/api/upload', (prog) => {
        onProgress(Math.round(prog));
      });
      const formatted = formatPublicUrl(url);
      if (!formatted) {
        throw new Error("Failed to get valid public URL from chunked resilient upload");
      }
      return formatted;
    };

    try {
      console.log(`Video: Attempting primary resilient chunked upload for ${normalizedFile.name}`);
      const r2Url = await attemptR2();
      return { url: r2Url, public_id: "" };
    } catch (error: any) {
      if (error.message === 'Upload cancelled' || (error.name && error.name === 'AbortError')) {
        throw new Error('Upload cancelled');
      }
      console.warn("R2 upload failed after retries, falling back to Firebase Storage...", error);
      
      onProgress(0);
      setUploadMessage('جاري المحاولة بطريقة بديلة فائقة الأمان... يرجى الانتظار 🔄');
      
      const userIdForPath = myId || auth.currentUser?.uid || 'anonymous';
      const sanitizedFilename = normalizedFile.name ? normalizedFile.name.replace(/[^a-zA-Z0-9.]/g, '_') : 'video.mp4';
      const storageRef = ref(storage, `videos/${userIdForPath}/${Date.now()}_${sanitizedFilename}`);
      const metadata = { contentType: 'video/mp4' };

      // Stage 2: Attempt Firebase Storage Resumable Upload
      try {
        const fbUrl = await new Promise<string>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, normalizedFile, metadata);
          const timeoutId = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error("Firebase Storage upload timed out"));
          }, 300000); // 5 minutes timeout

          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              uploadTask.cancel();
              reject(new Error('Upload cancelled'));
            });
            if (signal.aborted) {
              clearTimeout(timeoutId);
              uploadTask.cancel();
              reject(new Error('Upload cancelled'));
              return;
            }
          }

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(progress);
            },
            (err) => {
              clearTimeout(timeoutId);
              reject(err);
            },
            async () => {
              clearTimeout(timeoutId);
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              } catch (err) {
                reject(err);
              }
            }
          );
        });
        const formatted = formatPublicUrl(fbUrl);
        if (formatted) return { url: formatted };
        throw new Error("Failed to format Firebase Storage URL");
      } catch (fbErr: any) {
        if (fbErr.message === 'Upload cancelled') throw fbErr;
        console.warn("Firebase Storage Resumable failed, attempting direct uploadBytes fallback...", fbErr);

        // Stage 3: Direct uploadBytes fallback
        try {
          const snapshot = await uploadBytes(storageRef, normalizedFile, metadata);
          const downloadURL = await getDownloadURL(snapshot.ref);
          const formatted = formatPublicUrl(downloadURL);
          if (formatted) return { url: formatted };
          throw new Error("Failed to format direct Firebase Storage URL");
        } catch (directErr: any) {
          console.error("All storage upload attempts failed!", directErr);
          throw new Error("تعذر رفع الفيديو إلى خادم التخزين السحابي. يرجى التأكد من الاتصال بالإنترنت والمحاولة مرة أخرى.");
        }
      }
    }
  }, [myId]);

  const handlePublish = useCallback(async (videoData: any) => {
    const videoId = `vid-${Date.now()}`;
    let finalUrl = videoData.url || '';
    
    // Create a NEW stable URL for local preview during upload
    let blobUrl: string | null = null;
    if (videoData.blob instanceof Blob) {
      blobUrl = URL.createObjectURL(videoData.blob);
      finalUrl = blobUrl;
    }
    
    // Create the video object for immediate feedback
    const newVideo: VideoItem = {
      id: videoId,
      url: finalUrl,
      user: auth.currentUser?.displayName || currentUser?.name || 'أنا',
      userId: myId || 'me',
      authorUid: myId || auth.currentUser?.uid || 'me',
      title: videoData.title || videoData.description || "HiSee Post",
      userAvatar: currentUser?.avatar || auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId || 'me'}`,
      likes: 0,
      comments: [],
      shares: 0,
      saves: 0,
      desc: videoData.description || "لحظة إبداعية جديدة من HiSee",
      music: videoData.music || 'Original Sound',
      tags: [],
      isFollowed: false,
      isLiked: false,
      isSaved: false,
      isUploading: videoData.isPending || false,
      target: videoData.target || 'feed',
      audioSettings: videoData.audioSettings,
      privacy: videoData.privacy || 'public',
      screenshotPrivacy: videoData.screenshotPrivacy || 'everyone',
      downloadPrivacy: videoData.downloadPrivacy || 'everyone',
      cameraExposurePrivacy: videoData.cameraExposurePrivacy || 'everyone',
      visibility: videoData.privacy || 'public',
      createdAt: serverTimestamp()
    };

    // Navigate to Home to show the new video in the feed
    setActiveTab('home');

    // If it's a pending upload, start the background process
    if (videoData.isPending && videoData.blob) {
      const abortController = new AbortController();
      cancelUploadRef.current = () => {
        abortController.abort();
        deletedVideoIdsRef.current.add(videoId);
        setUploadStatus('idle');
        setUploadProgress(0);
        setUploadMessage('');
        setUploadingVideos(prev => prev.filter(v => v.id !== videoId));
        setLocalVideos(prev => prev.filter(v => v.id !== videoId));
        if (myStory?.id === videoId) setMyStory(null);
        
        // Clean up any written records in Firestore and local IndexedDB cache
        deleteDoc(doc(firestoreDb, 'videos', videoId)).catch(() => {});
        deleteDoc(doc(firestoreDb, 'posts', videoId)).catch(() => {});
        deleteDoc(doc(firestoreDb, 'stories', videoId)).catch(() => {});
        videoCache.deleteVideo(videoId).catch(() => {});
      };

      // Add to uploading state so it shows in profile
      setUploadingVideos(prev => [newVideo, ...prev]);
      setUploadStatus('uploading');
      setUploadMessage('جاري تهيئة الملف للرفع... يرجى الانتظار أو الإلغاء 🔄');
      setUploadProgress(0);

      try {
        let fileBuffer: ArrayBuffer | null = videoData.arrayBuffer || null;
        let file: File;
        
        if (fileBuffer) {
          file = new File([fileBuffer], videoData.blob?.name || `video_${Date.now()}.mp4`, { type: videoData.blob?.type || 'video/mp4' });
        } else {
          file = videoData.blob instanceof File ? videoData.blob : new File([videoData.blob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
          try {
            const slice = file.slice(0, file.size, file.type);
            if (typeof slice.arrayBuffer === 'function') {
              fileBuffer = await slice.arrayBuffer().catch(() => null);
            }
          } catch (bufErr) {
            console.warn("Best-effort file buffer read skipped:", bufErr);
          }
        }
        
        const trimParams = (videoData.trimStart !== undefined && videoData.trimDuration !== undefined) 
          ? { start: videoData.trimStart, duration: videoData.trimDuration } 
          : undefined;
        
        const uploadedData = await uploadVideo(file, (progress) => {
          setUploadProgress(progress);
          if (progress > 0) {
            setUploadMessage(uploadStatus === 'uploading' && progress < 100 ? 'جاري رفع قصتك الآن... ⏳' : 'جاري إنهاء عملية الرفع... ✨');
          }
        }, trimParams, abortController.signal);
        
        // Format & verify strictly public HTTPS URL before saving to Firestore
        const resolvedPublicUrl = normalizeMediaUrl(uploadedData.url);

        if (!resolvedPublicUrl || resolvedPublicUrl.startsWith('blob:')) {
          throw new Error("رابط الفيديو غير صالح أو غير عام. تعذر نشر الفيديو.");
        }

        setUploadMessage('جاري حفظ البيانات وتحديث القائمة... 📂');
        setUploadProgress(100);
        
        // Clean up the local blob URL once we have a real public URL
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
        
        const finalVideo = { ...newVideo, url: resolvedPublicUrl, public_id: uploadedData.public_id, isUploading: false, type: 'video' };
        
        if (deletedVideoIdsRef.current.has(videoId)) {
          // Video was deleted while uploading, don't save it
          deletedVideoIdsRef.current.delete(videoId);
          setUploadStatus('idle');
          return;
        }

        // Save to Firestore with the final URL
        const firestoreDoc = {
          ...finalVideo,
          authorUid: myId || auth.currentUser?.uid || 'me',
          title: finalVideo.title || finalVideo.desc || "HiSee Post",
          createdAt: serverTimestamp()
        };

        // Save to central videos collection
        await setDoc(doc(firestoreDb, 'videos', videoId), firestoreDoc);

        // Save to posts collection if targeted for feed/video/both
        if (videoData.target === 'feed' || videoData.target === 'video' || videoData.target === 'both' || !videoData.target) {
          await setDoc(doc(firestoreDb, 'posts', videoId), firestoreDoc);
        }

        // Save to stories collection if targeted for story/both
        if (videoData.target === 'story' || videoData.target === 'both') {
          await setDoc(doc(firestoreDb, 'stories', videoId), firestoreDoc);
          // Update user's latest story timestamp
          await updateDoc(doc(firestoreDb, 'users', myId), {
            latestStoryAt: serverTimestamp()
          });
        }

        // Add to actual targets only after verified successful server saving
        setLocalVideos(prev => [finalVideo, ...prev]);
        setUploadingVideos(prev => prev.filter(v => v.id !== videoId));
        
        if (videoData.target === 'story' || videoData.target === 'both') {
           setMyStory(finalVideo);
        }
        
        setUploadStatus('success');
        setUploadMessage('تمت إضافة قصتك بنجاح! ✅');
        setUploadProgress(0); // Reset progress on success

        // Force re-fetch to update local list immediately
        setLastRemoteUpdate(prev => prev + 1);

        // Save to IndexedDB for offline support (best-effort)
        try {
          let finalBuffer = fileBuffer;
          if (!finalBuffer && typeof file.slice === 'function') {
            const slice = file.slice(0, file.size, file.type);
            if (typeof slice.arrayBuffer === 'function') {
              finalBuffer = await slice.arrayBuffer().catch(() => null);
            }
          }
          if (finalBuffer) {
            await videoCache.saveVideo({
              id: videoId,
              data: finalBuffer,
              metadata: {
                name: file.name,
                type: file.type,
                size: file.size,
                timestamp: Date.now(),
                userId: myId || 'me',
                description: videoData.description || '',
                music: videoData.music || '',
                target: finalVideo.target || 'feed'
              }
            });
          }
        } catch (err) {
          console.warn("Skipped optional video cache in IndexedDB:", err);
        }

        // Reset status after a delay
        setTimeout(() => {
          setUploadStatus('idle');
        }, 3000);

      } catch (error: any) {
        if (error.message === 'Upload cancelled' || error.message.includes('canceled')) {
          console.log("Upload was cancelled by the user.");
          setUploadStatus('idle');
          setUploadMessage('');
          setUploadingVideos(prev => prev.filter(v => v.id !== videoId));
          return; // Exit early, don't show error toast
        }

        console.error("Background upload failed:", error);
        setUploadStatus('error');
        setUploadMessage('عذراً، تعذر رفع الفيديو. يرجى المحاولة مرة أخرى ⚠️');
        setUploadingVideos(prev => prev.map(v => v.id === videoId ? { ...v, isUploading: false, error: true } : v));
        
        setTimeout(() => {
          setUploadStatus('idle');
        }, 5000);
      } finally {
        // Remove from uploading state if successful or handled
        setUploadingVideos(prev => prev.filter(v => v.id !== videoId));
      }
    } else if (!videoData.isPending) {
      // If not pending, just save to Firestore immediately
      const firestoreDoc = {
        ...newVideo,
        authorUid: myId || auth.currentUser?.uid || 'me',
        title: newVideo.title || newVideo.desc || "HiSee Post",
        createdAt: serverTimestamp()
      };

      try {
        // Save to central videos collection
        await setDoc(doc(firestoreDb, 'videos', videoId), firestoreDoc);

        // Save to posts collection if targeted for feed/video/both
        if (videoData.target === 'feed' || videoData.target === 'video' || videoData.target === 'both' || !videoData.target) {
          await setDoc(doc(firestoreDb, 'posts', videoId), firestoreDoc);
        }

        // Save to stories collection if targeted for story/both
        if (videoData.target === 'story' || videoData.target === 'both') {
          await setDoc(doc(firestoreDb, 'stories', videoId), firestoreDoc);
          // Update user's latest story timestamp
          await updateDoc(doc(firestoreDb, 'users', myId), {
            latestStoryAt: serverTimestamp()
          });
        }

        // Add to actual targets only after verified successful server saving
        setLocalVideos(prev => [newVideo, ...prev]);
        
        if (videoData.target === 'story' || videoData.target === 'both') {
           setMyStory(newVideo);
        }
      } catch (error: any) {
        console.error("Error saving video to Firestore:", error);
      }
    }
  }, [myId, myStory, uploadVideo]);

  const handleRetryUpload = useCallback(async (video: VideoItem) => {
    // Set back to uploading state
    setUploadingVideos(prev => prev.map(v => v.id === video.id ? { ...v, isUploading: true, error: false } : v));
    setUploadStatus('uploading');
    setUploadMessage('جاري تهيئة الملف للرفع... يرجى الانتظار 🔄');
    setUploadProgress(0);

    try {
      let file: File | null = null;
      try {
        const response = await fetch(video.url);
        if (response.ok) {
          const blob = await response.blob();
          file = new File([blob], `video_${Date.now()}.mp4`, { type: blob.type || 'video/mp4' });
        }
      } catch (e) {
        console.warn("Direct fetch of video URL failed during retry, checking IndexedDB cache...");
      }

      if (!file) {
        const cached = await videoCache.getVideo(video.id);
        if (cached && cached.data) {
          file = new File([cached.data], cached.metadata?.name || `video_${Date.now()}.mp4`, { type: cached.metadata?.type || 'video/mp4' });
        }
      }

      if (!file) {
        throw new Error("تعذر الوصول إلى ملف الفيديو للمحاولة. يرجى إعادة اختيار الملف.");
      }

      const trimParams = (video.trimStart !== undefined && video.trimDuration !== undefined)
        ? { start: video.trimStart, duration: video.trimDuration }
        : undefined;
      
      const abortController = new AbortController();
      cancelUploadRef.current = () => {
        abortController.abort();
        deletedVideoIdsRef.current.add(video.id);
        setUploadStatus('idle');
        setUploadProgress(0);
        setUploadMessage('');
        setUploadingVideos(prev => prev.filter(v => v.id !== video.id));
        setLocalVideos(prev => prev.filter(v => v.id !== video.id));
        if (myStory?.id === video.id) setMyStory(null);
        
        // Clean up any written records in Firestore and local IndexedDB cache
        deleteDoc(doc(firestoreDb, 'videos', video.id)).catch(() => {});
        deleteDoc(doc(firestoreDb, 'posts', video.id)).catch(() => {});
        deleteDoc(doc(firestoreDb, 'stories', video.id)).catch(() => {});
        videoCache.deleteVideo(video.id).catch(() => {});
      };

      const uploadedData = await uploadVideo(file, (progress) => {
        setUploadProgress(progress);
        if (progress > 0) {
          setUploadMessage('جاري رفع قصتك الآن... ⏳');
        }
      }, trimParams, abortController.signal);
      
      const finalVideo = { ...video, url: uploadedData.url, public_id: uploadedData.public_id, isUploading: false, error: false };
      
      if (deletedVideoIdsRef.current.has(video.id)) {
        // Video was deleted while retrying, don't save it
        deletedVideoIdsRef.current.delete(video.id);
        setUploadStatus('idle');
        return;
      }

      // Save to Firestore with the final URL
      const firestoreDoc = {
        ...finalVideo,
        authorUid: myId || auth.currentUser?.uid || 'me',
        title: finalVideo.title || finalVideo.desc || "HiSee Post",
        createdAt: serverTimestamp()
      };

      // Save to central videos collection
      await setDoc(doc(firestoreDb, 'videos', video.id), firestoreDoc);

      // Save to posts collection if targeted for feed/video/both
      if (video.target === 'feed' || video.target === 'video' || video.target === 'both' || !video.target) {
        await setDoc(doc(firestoreDb, 'posts', video.id), firestoreDoc);
      }

      // Save to stories collection if targeted for story/both
      if (video.target === 'story' || video.target === 'both') {
        await setDoc(doc(firestoreDb, 'stories', video.id), firestoreDoc);
      }

      // Add to actual targets only after verified successful server saving
      setLocalVideos(prev => [finalVideo, ...prev]);
      
      if (video.target === 'story' || video.target === 'both') {
         setMyStory(finalVideo);
      }
      
      setUploadStatus('success');
      setUploadMessage('تمت إعادة الرفع بنجاح! ✅');
      setUploadProgress(100);
      
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error: any) {
      console.error("Retry upload failed:", error);
      setUploadStatus('error');
      setUploadMessage('عذراً، فشلت إعادة الرفع. يرجى المحاولة لاحقاً ⚠️');
      setUploadingVideos(prev => prev.map(v => v.id === video.id ? { ...v, isUploading: false, error: true } : v));
      
      setTimeout(() => setUploadStatus('idle'), 5000);
    } finally {
      // Remove from uploading state
      setUploadingVideos(prev => prev.filter(v => v.id !== video.id));
    }
  }, [uploadVideo]);

  const handleDeleteVideo = useCallback(async (video: VideoItem) => {
    // Add to deleted tracking ref to prevent background uploads from saving
    deletedVideoIdsRef.current.add(video.id);

    // Optimistically remove from state
    if (video.isUploading || video.error) {
      setUploadingVideos(prev => prev.filter(v => v.id !== video.id));
    } else {
      setLocalVideos(prev => prev.filter(v => v.id !== video.id));
      if (myStory?.id === video.id) {
        setMyStory(null);
      }
    }

    try {
      // Remove from Firestore
      await deleteDoc(doc(firestoreDb, 'videos', video.id));
      
      // Remove from IndexedDB cache if it exists
      await videoCache.deleteVideo(video.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${video.id}`);
      // Optionally, we could revert the state here if it fails
    }
  }, [myStory]);

  const handleBackToHome = useCallback(() => {
    setActiveTab('home');
    setIsCreativeHub(false);
    setInitialCreativeTool(null);
  }, []);

  const toggleUi = () => setIsUiVisible(!isUiVisible);

  // --- RENDER FLOW ---

  if (isAuthLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#f43f5e] border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-bold tracking-widest text-[10px] uppercase">
            {getTranslation(lang, 'loading_app', 'Loading...')}
          </p>
        </div>
      </div>
    );
  }

  if (viewState === 'auth' || viewState === 'auth_signup') {
    return <AuthView onAuthSuccess={handleLoginSuccess} lang={lang} onLanguageChange={setLang} initialIsLogin={viewState === 'auth'} initialSuccessMessage={authMessage} />;
  }

  if (viewState === 'complete_profile') {
    return <CompleteProfileView lang={lang} onComplete={() => setViewState('permissions')} />;
  }

  if (viewState === 'permissions') {
    return <PermissionsView onComplete={handlePermissionsComplete} />;
  }

  // --- MAIN APP ---

  return (
    <ErrorBoundary>
      <MicrophoneGuardian activeCall={activeCall} />
      <div 
        className={`h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col font-sans transition-all duration-500 ${isAppBlurred && settings.chatSettings.privacy.screenSecurity ? 'blur-[40px] scale-[0.97]' : ''} ${settings.chatSettings.privacy.screenSecurity ? 'select-none' : ''} ${settings.theme === 'light' ? 'bg-gray-100 text-slate-900' : settings.theme === 'amoled' ? 'bg-black text-white' : 'bg-[#0a0c10] text-white'}`} 
        dir={t.dir}
        style={{
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        {isLocked && (
          <LockScreen 
            onUnlock={() => setIsLocked(false)} 
            enabledMethods={(() => {
              const methods: ('pin' | 'pattern')[] = [];
              if (settings.chatSettings.privacy.pinPasswordLock) methods.push('pin');
              if (settings.chatSettings.privacy.patternLock) methods.push('pattern');
              return methods;
            })()} 
            savedPin={settings.chatSettings.privacy.savedPin}
            savedPattern={settings.chatSettings.privacy.savedPattern}
          />
        )}
        {/* Screen Security Print Protection */}
        {settings.chatSettings.privacy.screenSecurity && (
          <style>
            {`
              @media print {
                body { display: none !important; }
              }
            `}
          </style>
        )}

        {/* Privacy Overlay */}
        <AnimatePresence>
          {isAppBlurred && settings.chatSettings.privacy.screenSecurity && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-12"
            >
              <div className="w-28 h-28 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                <Shield size={56} className="text-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter drop-shadow-lg">
                {lang === 'ar' ? 'وضع الحماية نشط' : 'Privacy Protection Active'}
              </h2>
              <p className="text-white/60 max-w-sm text-sm font-medium leading-relaxed">
                {lang === 'ar' 
                  ? 'تم إخفاء المحتوى لحماية خصوصيتك ومنع لقطات الشاشة غير المصرح بها' 
                  : 'Content hidden to protect your privacy and prevent unauthorized screenshots'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
  
        {/* Voice Commander (Hidden) */}
        <VoiceCommander ref={voiceRef} lang={lang === 'ar' ? 'ar' : 'en'} onNavigate={(tab) => setActiveTab(tab)} />
  
        {/* Permission Error Banner */}
        {permissionError && (
          <div className="fixed top-20 left-4 right-4 z-[100] bg-rose-600/90 backdrop-blur-xl border border-rose-500/50 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-10 duration-500">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Shield size={20} className="text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white">{permissionError}</p>
              </div>
              <button onClick={() => setPermissionError(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <Plus size={18} className="rotate-45" />
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastNotification && (
          <div 
            onClick={() => {
              setToastNotification(null);
              setActiveTab('chats');
            }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[150] bg-emerald-600/95 backdrop-blur-xl border border-emerald-500/50 px-4 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 flex items-center gap-3 cursor-pointer hover:bg-emerald-600 transition-all"
          >
            <div className="p-1.5 bg-white/20 rounded-full">
              <MessageCircle size={16} className="text-white" />
            </div>
            <p className="text-xs font-bold text-white">New Message from {toastNotification.name}</p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setToastNotification(null);
              }}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Global Upload Notification */}
        <AnimatePresence>
          {uploadStatus !== 'idle' && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-2 left-4 right-4 z-[1000] flex justify-center pointer-events-none"
            >
              <div className={`
                px-4 py-2 rounded-xl shadow-2xl backdrop-blur-xl border flex flex-col gap-1.5 min-w-[260px] max-w-md pointer-events-auto
                ${uploadStatus === 'uploading' ? 'bg-black/90 border-white/10' : ''}
                ${uploadStatus === 'success' ? 'bg-emerald-600/95 border-emerald-400/20' : ''}
                ${uploadStatus === 'error' ? 'bg-rose-600/95 border-rose-400/20' : ''}
              `}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white font-bold text-[10px] tracking-tight uppercase">{uploadMessage}</span>
                  <div className="flex items-center gap-2">
                    {uploadStatus === 'uploading' && (
                      <span className="text-white/60 text-[9px] font-mono">{uploadProgress}%</span>
                    )}
                    {uploadStatus === 'uploading' && (
                      <button 
                        onClick={() => {
                          if (cancelUploadRef.current) {
                            cancelUploadRef.current();
                          }
                        }}
                        className="p-1.5 hover:bg-rose-500/20 active:scale-95 rounded-full transition-all group"
                        title="إلغاء وحذف الرفع"
                      >
                        <Trash2 size={15} className="text-rose-400 group-hover:text-rose-300 transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
                
                {uploadStatus === 'uploading' && (
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
  
        {/* Main Content Area - Dynamic Padding for Bottom Bar */}
        <main 
          className={`flex-1 relative overflow-hidden transition-[padding] duration-500 ease-in-out pb-0`}
        >
          {activeTab === 'home' && (
            <VideosView 
              videos={videos} 
              myId={myId}
              myProfile={myProfile}
              settings={settings}
              lang={lang}
              onNavigate={(tab) => setActiveTab(tab)} 
              onViewProfile={(uid, initialTab) => { 
                setSelectedUserId(uid); 
                if (initialTab) setSelectedProfileInitialTab(initialTab);
                else setSelectedProfileInitialTab('gallery');
                setActiveTab('profile'); 
              }}
              isUiVisible={isUiVisible}
              onToggleUi={toggleUi}
              onPublish={handlePublish}
              onDeleteVideo={handleDeleteVideo}
              targetMediaId={targetMediaId}
              totalSystemNotifications={totalSystemNotifications}
            />
          )}
  
          {activeTab === 'chats' && (
            selectedChat ? (
              selectedChat.id === 'hisee-ai-bot' ? (
                <AIChat 
                  lang={lang} 
                  className="h-full w-full bg-[#0a0c10] border-none rounded-none shadow-none flex-1" 
                  onBack={() => {
                    setSelectedChat(null);
                    setOriginChat(null);
                  }} 
                />
              ) : (
                <ChatWindow 
                  chat={selectedChat} 
                  originChat={originChat}
                  autoAnswerCallId={autoAnswerCallId}
                  pendingForwardMessage={pendingForwardMessage}
                  onClearForward={() => setPendingForwardMessage(null)}
                  onBack={() => {
                    setSelectedChat(null);
                    setOriginChat(null);
                    setAutoAnswerCallId(null);
                    setPendingForwardMessage(null);
                  }} 
                  onNavigateToHome={() => {
                    setSelectedChat(null);
                    setOriginChat(null);
                    setAutoAnswerCallId(null);
                    setPendingForwardMessage(null);
                    setActiveTab('home');
                  }}
                  onSelectChat={(chat, origin, fMsg) => {
                    setSelectedChat(chat);
                    if (origin) setOriginChat(origin);
                    else setOriginChat(null);
                    if (fMsg) setPendingForwardMessage(fMsg);
                  }}
                  myId={myId}
                  lang={lang}
                  isUiVisible={isUiVisible}
                  onToggleUi={toggleUi}
                  settings={settings}
                />
              )
            ) : (
              <ChatList 
                onSelectChat={(chat) => {
                  setSelectedChat(chat);
                  setOriginChat(null);
                }} 
                activeChatId={selectedChat ? selectedChat.id : undefined}
                onGoToProfile={(userId) => { setSelectedUserId(userId); setActiveTab('profile'); }}
                onGoToProfileOverlay={(userId) => { setProfileOverlayUserId(userId); }}
                onCreateStory={() => setActiveTab('post')}
                myStory={myStory}
                stories={stories}
                myId={myId}
                isUiVisible={isUiVisible}
                onToggleUi={toggleUi}
                activeStory={activeStory}
                setActiveStory={setActiveStory}
                lang={lang}
                incomingGroupCalls={incomingGroupCalls}
                onNavigateToHome={() => {
                  setSelectedChat(null);
                  setOriginChat(null);
                  setAutoAnswerCallId(null);
                  setPendingForwardMessage(null);
                  setActiveTab('home');
                }}
              />
            )
          )}
  

  
          {liveSession && (
            <div className={liveSession.isMinimized ? "pointer-events-none fixed inset-0 z-[9999]" : "fixed inset-0 z-[2000]"}>
              <LiveFeed 
                onBack={() => {
                  if (liveSession.mode === 'host') {
                    setLiveSession(prev => prev ? { ...prev, isMinimized: true } : null);
                  } else {
                    setLiveSession(null);
                  }
                  setIsCreativeHub(false);
                  setInitialCreativeTool(null);
                  setActiveTab('home');
                }}
                onMinimizeToggle={(minimized) => {
                  setLiveSession(prev => prev ? { ...prev, isMinimized: minimized } : null);
                  if (minimized) {
                    setActiveTab('home');
                  } else {
                    setActiveTab(liveSession.mode === 'host' ? 'live' : 'live_watch');
                  }
                }}
                isMinimized={liveSession.isMinimized}
                onForceClose={() => {
                  setLiveSession(null);
                  setIsCreativeHub(false);
                  setInitialCreativeTool(null);
                  setActiveTab('home');
                }}
                onSwitchToSetup={() => {
                  setLiveSession({ mode: 'host', isMinimized: false });
                  setActiveTab('live');
                }}
                initialMode={liveSession.mode === 'host' ? 'setup' : 'view'}
                initialLive={liveSession.streamId} 
                lang={lang}
                isCreativeHub={isCreativeHub}
                initialCreativeTool={initialCreativeTool}
              />
            </div>
          )}
  
          {activeTab === 'post' && (
            <PostCreation 
              lang={lang}
              onBack={handleBackToHome} 
              onPublish={handlePublish}
              onCancel={() => cancelUploadRef.current?.()}
              uploadVideo={uploadVideo}
              globalUploadProgress={uploadProgress}
            />
          )}

          {activeTab === 'photo_studio' && (
            <PhotoStudio 
              initialMode={photoStudioInitialMode} 
              onBack={handleBackToHome} 
              onPublishSuccess={() => { setActiveTab('home'); }}
              myProfile={myProfile}
            />
          )}
  
          {activeTab === 'profile' && (
            <ProfileView 
              myId={myId} 
              myProfile={myProfile}
              userId={selectedUserId}
              initialTab={selectedProfileInitialTab}
              onBack={() => setActiveTab('home')} 
              onSettings={() => setActiveTab('settings')}
              lang={lang}
              onToggleVoice={() => voiceRef.current?.toggleListening()}
              isUiVisible={isUiVisible}
              onToggleUi={toggleUi}
              uploadingPosts={uploadingVideos}
              onRetryUpload={handleRetryUpload}
              onCancelUpload={(video) => cancelUploadRef.current?.()}
              onDeleteVideo={handleDeleteVideo}
              onPost={() => setActiveTab('post')}
              onNavigateToCreativeHub={(tool) => {
                if (tool === 'video_gen') {
                  setActiveTab('ai_video');
                } else if (tool === 'thinking') {
                  setActiveTab('deep_thinking');
                } else {
                  setIsCreativeHub(true);
                  setInitialCreativeTool(tool || null);
                  setLiveSession({ mode: 'host', isMinimized: false });
                  setActiveTab('live');
                }
              }}
              onChat={(uid) => {
                const newChat = {
                  id: uid,
                  user: { id: uid, name: uid, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`, status: 'online' as const },
                  lastMessage: '',
                  timestamp: new Date().toISOString(),
                  unreadCount: 0,
                  isOnline: true
                };
                setSelectedChat(newChat);
                setActiveTab('chats');
              }}
            />
          )}

          {profileOverlayUserId && (
            <div className="absolute inset-0 z-[500] bg-black">
              <ProfileView 
                myId={myId} 
                myProfile={myProfile}
                userId={profileOverlayUserId}
                onBack={() => setProfileOverlayUserId(null)} 
                onSettings={() => setActiveTab('settings')}
                lang={lang}
                onToggleVoice={() => voiceRef.current?.toggleListening()}
                isUiVisible={isUiVisible}
                onToggleUi={toggleUi}
                uploadingPosts={uploadingVideos}
                onRetryUpload={handleRetryUpload}
                onCancelUpload={(video) => cancelUploadRef.current?.()}
                onDeleteVideo={handleDeleteVideo}
                onPost={() => setActiveTab('post')}
                setActiveStory={setActiveStory}
                onChat={(uid) => {
                  setProfileOverlayUserId(null);
                  const newChat = {
                    id: uid,
                    user: { id: uid, name: uid, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`, status: 'online' as const },
                    lastMessage: '',
                    timestamp: new Date().toISOString(),
                    unreadCount: 0,
                    isOnline: true
                  };
                  setSelectedChat(newChat);
                  setActiveTab('chats');
                }}
              />
            </div>
          )}
  
          {activeTab === 'settings' && (
            <SettingsView 
              lang={lang} 
              setLang={setLang} 
              settings={settings}
              setSettings={setSettings}
              myId={myId}
              users={users}
              initialView={settingsInitialView as any}
              onNavigateToProfile={(userId) => {
                setSelectedUserId(userId);
                setActiveTab('profile');
              }}
              onBack={() => {
                setSettingsInitialView('main');
                setActiveTab('profile');
              }} 
              onLogout={async (toSignup, message) => {
                await auth.signOut();
                if (message) setAuthMessage(message);
                setViewState(toSignup ? 'auth_signup' : 'auth');
              }}
            />
          )}
  
          {/* AI View (Still accessible via Voice or specialized buttons, but removed from bottom bar) */}
          {activeTab === 'ai_assistant' && (
            <div className="h-full p-4 pt-16 bg-slate-900">
               <button onClick={() => setActiveTab('home')} className="mb-4 text-white flex items-center gap-2"><ArrowRight className={t.dir === 'ltr' ? 'rotate-180' : ''} /> {t.onBack}</button>
               <AIChat lang={lang} />
            </div>
          )}
  
          {activeTab === 'notifications' && (
            <NotificationsView 
              myId={myId}
              myProfile={myProfile}
              lang={lang}
              onBack={() => setActiveTab('home')} 
              isUiVisible={isUiVisible}
              onToggleUi={toggleUi}
              onNavigateToProfile={(userId) => { setSelectedUserId(userId); setActiveTab('profile'); }}
              onNavigateToHome={() => setActiveTab('home')}
              onNavigateToMedia={(type, id, userId) => {
                if (type === 'video' || type === 'photo') {
                  setTargetMediaId({ type, id });
                  setActiveTab('home');
                } else if (type === 'story' && userId) {
                  const story = stories.find(s => s.userId === userId);
                  if (story) setActiveStory(story);
                } else if (type === 'live') {
                  setLiveSession({ mode: 'viewer', isMinimized: false, streamId: id });
                  setActiveTab('home');
                }
              }}
            />
          )}

          {activeTab === 'ai_video' && (
            <AIVideoStudio 
              lang={lang} 
              onBack={() => setActiveTab('profile')} 
            />
          )}

          {activeTab === 'deep_thinking' && (
            <DeepThinkingStudio 
              lang={lang} 
              onBack={() => setActiveTab('profile')} 
            />
          )}
        </main>
  
        {/* Bottom Navigation Bar (Balanced & Labeled) */}
        {showBottomNav && !activeStory && (
          <nav 
            className={`w-full h-[60px] sm:h-[80px] z-[120] flex justify-around items-center px-1 sm:px-2 transition-all duration-500 bg-gradient-to-t from-black/95 via-black/80 to-transparent ${isUiVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
          >
            {/* Home Tab - Clean, without background */}
            <button 
              onClick={() => setActiveTab('home')} 
              className="flex flex-col items-center gap-1 p-1 sm:p-2 flex-1 group"
              title={t.home}
            >
              <div className={`transition-transform duration-300 ${activeTab === 'home' ? 'scale-105 sm:scale-110' : 'group-hover:scale-105'}`}>
                <ModernHomeIcon 
                  size={22} 
                  className={activeTab === 'home' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'text-white/50 group-hover:text-white/80'} 
                />
              </div>
              <span className={`text-[clamp(7px,1.8vw,9px)] font-bold uppercase tracking-widest transition-colors ${
                activeTab === 'home' ? 'text-white' : 'text-white/50 group-hover:text-white/80'
              }`}>
                {t.home}
              </span>
              {activeTab === 'home' && (
                <div className="w-3 h-0.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>
              )}
            </button>
  
            {/* Chats Tab */}
            <button onClick={() => setActiveTab('chats')} className="flex flex-col items-center gap-1 p-1 sm:p-2 flex-1 group">
              <div className={`transition-transform duration-300 relative ${activeTab === 'chats' ? 'scale-100 sm:scale-110' : ''}`}>
                <ModernMessageIcon size={22} className={activeTab === 'chats' ? 'text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'text-white/50'} />
                {totalChatNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 text-[clamp(6px,1.5vw,8px)] font-black text-white bg-red-500 rounded-full min-w-[12px] h-[12px] flex items-center justify-center shadow-sm">
                    {totalChatNotifications > 99 ? '99+' : totalChatNotifications}
                  </span>
                )}
              </div>
              <span className={`text-[clamp(7px,1.8vw,9px)] font-bold uppercase tracking-widest ${activeTab === 'chats' ? 'text-white' : 'text-white/50'}`}>{t.chat}</span>
            </button>
  
            {/* Live/Post Tab */}
            <button 
              onClick={() => {
                setShowLivePostMenu(!showLivePostMenu);
                setPostMenuSubMode('none');
              }} 
              className="flex flex-col items-center gap-1 p-2 flex-1 group relative h-full justify-center z-30"
            >
              <div className={`transition-all duration-300 ${showLivePostMenu ? 'scale-110' : 'hover:scale-105'} relative z-40`}>
                <MultiColorRadioIcon size={34} className={showLivePostMenu ? 'text-white drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]' : 'text-white/50'} />
              </div>
            </button>

            {/* Live/Post Menu */}
            <AnimatePresence>
              {showLivePostMenu && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setShowLivePostMenu(false);
                      setPostMenuSubMode('none');
                    }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[105]"
                    style={{ bottom: '60px' }}
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 15, x: "-50%", scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                    exit={{ opacity: 0, y: 15, x: "-50%", scale: 0.95 }}
                    className="absolute bottom-[65px] sm:bottom-[85px] left-1/2 bg-black border border-white/20 rounded-[28px] sm:rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,1)] p-2 sm:p-2.5 z-[130] flex flex-col items-center gap-2"
                    style={{
                      width: 'auto',
                      minWidth: 'clamp(220px, 65vw, 340px)',
                      maxWidth: '94vw',
                    }}
                  >
                    {/* Mode 1: Primary choices (Creative Hub, Publish Now, Start LIVE) */}
                    {postMenuSubMode === 'none' && (
                      <div className="flex items-center justify-center gap-2 w-full">
                        <button 
                          onClick={() => setPostMenuSubMode('creative_choice')} 
                          className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-[clamp(54px,15vw,68px)] h-[clamp(54px,15vw,68px)] hover:bg-white/10 bg-emerald-500/10 rounded-full text-emerald-400 transition-all border border-emerald-500/20 shadow-lg group active:scale-90 shrink-0"
                        >
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform" />
                          <span className="truncate w-full text-center font-black uppercase leading-none px-1 text-[clamp(6px,1.8vw,9px)]">{t.creativeHub}</span>
                        </button>

                        <button 
                          onClick={() => setPostMenuSubMode('publish_choice')} 
                          className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-[clamp(54px,15vw,68px)] h-[clamp(54px,15vw,68px)] hover:bg-white/10 bg-sky-500/10 rounded-full text-sky-400 transition-all border border-sky-500/20 shadow-lg group active:scale-90 shrink-0"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.5)] group-hover:scale-110 transition-transform" />
                          <span className="truncate w-full text-center font-black uppercase leading-none px-1 text-[clamp(6px,1.8vw,9px)]">{t.publish}</span>
                        </button>

                        <button 
                          onClick={() => { setShowLivePostMenu(false); setPostMenuSubMode('none'); setIsCreativeHub(false); setActiveTab('live'); }} 
                          className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-[clamp(58px,17vw,74px)] h-[clamp(58px,17vw,74px)] bg-gradient-to-br from-rose-500 to-rose-700 rounded-full text-white transition-all shadow-xl hover:brightness-110 active:scale-95 group relative overflow-hidden shrink-0"
                        >
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse relative z-10" />
                          <span className="truncate w-full text-center font-black uppercase relative z-10 px-1 leading-none text-[clamp(6px,1.8vw,9px)]">{t.startLiveBroadcast}</span>
                        </button>
                      </div>
                    )}

                    {/* Mode 2: Publish Choices (Video or Photo) */}
                    {postMenuSubMode === 'publish_choice' && (
                      <div className="flex flex-col items-center gap-2 w-full p-1 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between w-full px-2">
                          <span className="text-xs font-black text-sky-400">{t.publishChoiceTitle}</span>
                          <button 
                            onClick={() => setPostMenuSubMode('none')}
                            className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded-full bg-white/10"
                          >
                            {t.back} ↩️
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-4 w-full pt-1">
                          <button 
                            onClick={() => {
                              setShowLivePostMenu(false);
                              setPostMenuSubMode('none');
                              setActiveTab('post');
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold text-xs flex-1 active:scale-95 transition-all shadow-md"
                          >
                            <Video size={24} className="text-sky-400 animate-pulse" />
                            <span>{t.video}</span>
                          </button>

                          <button 
                            onClick={() => {
                              setShowLivePostMenu(false);
                              setPostMenuSubMode('none');
                              setPhotoStudioInitialMode('gallery');
                              setActiveTab('photo_studio');
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 font-bold text-xs flex-1 active:scale-95 transition-all shadow-md"
                          >
                            <ImageIcon size={24} className="text-pink-400" />
                            <span>{t.photoStudio}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Creative Choices (Video or Photo Camera) */}
                    {postMenuSubMode === 'creative_choice' && (
                      <div className="flex flex-col items-center gap-2 w-full p-1 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between w-full px-2">
                          <span className="text-xs font-black text-emerald-400">{t.creativeChoiceTitle}</span>
                          <button 
                            onClick={() => setPostMenuSubMode('none')}
                            className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded-full bg-white/10"
                          >
                            {t.back} ↩️
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-4 w-full pt-1">
                          <button 
                            onClick={() => {
                              setShowLivePostMenu(false);
                              setPostMenuSubMode('none');
                              setIsCreativeHub(true);
                              setActiveTab('live');
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex-1 active:scale-95 transition-all shadow-md"
                          >
                            <Video size={24} className="text-emerald-400" />
                            <span>{t.video}</span>
                          </button>

                          <button 
                            onClick={() => {
                              setShowLivePostMenu(false);
                              setPostMenuSubMode('none');
                              setPhotoStudioInitialMode('camera');
                              setActiveTab('photo_studio');
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 font-bold text-xs flex-1 active:scale-95 transition-all shadow-md"
                          >
                            <Camera size={24} className="text-pink-400 animate-bounce" />
                            <span>{t.photoCameraStudio}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
  
            {/* Settings Tab */}
            <button onClick={() => setActiveTab('settings')} className="flex flex-col items-center gap-1 p-2 flex-1 group">
              <div className={`transition-transform duration-300 ${activeTab === 'settings' ? 'scale-110' : ''}`}>
                <ModernSettingsIcon size={22} className={activeTab === 'settings' ? 'text-white drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]' : 'text-white/50'} />
              </div>
              <span className={`text-[clamp(7px,1.8vw,9px)] font-bold uppercase tracking-widest ${activeTab === 'settings' ? 'text-white' : 'text-white/50'}`}>{t.settings}</span>
            </button>
  
            {/* Profile Tab */}
            <button onClick={() => { setSelectedUserId('me'); setActiveTab('profile'); }} className="flex flex-col items-center gap-1 p-2 flex-1 group">
              <div className={`transition-transform duration-300 ${activeTab === 'profile' ? 'scale-110' : ''}`}>
                <img 
                  src={normalizeMediaUrl(myProfile?.photoURL || myProfile?.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`} 
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`; }}
                  className={`w-[22px] h-[22px] rounded-full border-2 transition-all duration-300 ${activeTab === 'profile' ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'border-white/40 opacity-70 group-hover:border-white/80 group-hover:opacity-100'}`}
                  alt={myProfile?.displayName || "Me"}
                />
              </div>
              <span className={`text-[clamp(7px,1.8vw,9px)] font-bold uppercase tracking-widest ${activeTab === 'profile' ? 'text-white' : 'text-white/50'}`}>{t.profile}</span>
            </button>
          </nav>
        )}

        {/* Global Call System Container */}
        {!activeGroupRoom && <CallContainer />}

        {/* Individual Incoming Call Modal - RESTORED */}
        {incomingCall && (
          <IncomingCallModal 
            incomingCall={incomingCall}
            onAccept={handleAnswerCall}
            onReject={handleRejectCallWrapper}
          />
        )}

        {/* Unified Group Call UI */}
        {(() => {
          const toRing = incomingGroupCalls.filter(c => !c.isTimedOut);
          
          return (
            <>
              {toRing.length > 0 && !activeGroupRoom && (
                <UnifiedIncomingCall 
                  incomingCall={{
                    id: String(toRing[0].id),
                    callerName: toRing[0].callerName || 'مكالمة واردة',
                    callerAvatar: toRing[0].callerAvatar || '',
                    participantAvatars: toRing[0].participantAvatars || [],
                    participantsCount: toRing[0].participantsCount,
                    type: toRing[0].type || 'voice'
                  }}
                  onAccept={() => handleAnswerGroupCall(toRing[0])}
                  onReject={() => handleRejectGroupCall(toRing[0])}
                />
              )}
            </>
          );
        })()}

        {/* Group Voice Call Room - Unified & Isolated */}
        {activeGroupRoom && (
          <GroupVoiceCall
            key={`group-call-${activeGroupRoom.channelName}`}
            channelName={activeGroupRoom.channelName}
            callType={activeGroupRoom.callType || 'voice'}
            isMinimized={isGroupCallMinimized}
            onMinimize={() => setIsGroupCallMinimized(true)}
            onRestore={() => setIsGroupCallMinimized(false)}
            onLeaveCall={() => {
              setActiveGroupRoom(null);
              setIsGroupCallMinimized(false);
            }}
          />
        )}

        {/* Minimized Call Pill */}
        {activeGroupRoom && isGroupCallMinimized && (
          <div 
            onClick={() => setIsGroupCallMinimized(false)}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer animate-bounce hover:bg-emerald-600 transition-colors"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">المكالمة مستمرة - انقر للعودة</span>
          </div>
        )}

        {/* Classic Individual Call Modals - RESTORED */}
        {activeCall && !activeCall.isGroup && !activeCall.isGroupCall && (
          activeCall.type === 'video' ? (
            <VideoCallModal
              key={`video-call-${activeCall.id}`}
              isOpen={true}
              onClose={endCall}
              userName={activeCall.callerId === myId ? (activeCall.calleeName || getTranslation(lang, 'calling', 'يتصل...')) : (activeCall.callerName || getTranslation(lang, 'user', 'مستخدم'))}
              userAvatar={activeCall.callerId === myId ? (activeCall.calleeAvatar || '') : (activeCall.callerAvatar || '')}
              status={activeCall.status === 'connected' ? getTranslation(lang, 'connected', 'متصل') : (activeCall.callerId === myId ? getTranslation(lang, 'calling', 'يتصل...') : getTranslation(lang, 'ringing', 'يرن...'))}
              duration={formatDuration(activeCall.duration)}
              isMuted={isCallMuted}
              onToggleMute={toggleCallMute}
              isCameraOff={isCallCameraOff}
              onToggleCamera={toggleCallCamera}
              isSpeakerOn={isSpeakerOn}
              onToggleSpeaker={toggleSpeaker}
              onEndCall={endCall}
              remoteStream={remoteStream}
              localStream={callStream}
              localVideoRef={localCallVideoRef}
              remoteVideoRef={remoteCallVideoRef}
              onSwitchCamera={switchCamera}
              isScreenSharing={isScreenSharing}
              onToggleScreenShare={toggleScreenShare}
              beautyConfig={callBeautyConfig}
              onUpdateBeauty={applyBeautyFilter}
              lang={lang}
            />
          ) : (
            <AudioCallModal
              isOpen={true}
              onClose={endCall}
              userName={activeCall.callerId === myId ? (activeCall.calleeName || getTranslation(lang, 'calling', 'يتصل...')) : (activeCall.callerName || getTranslation(lang, 'user', 'مستخدم'))}
              userAvatar={activeCall.callerId === myId ? (activeCall.calleeAvatar || '') : (activeCall.callerAvatar || '')}
              status={activeCall.status === 'connected' ? getTranslation(lang, 'connected', 'متصل') : (activeCall.callerId === myId ? getTranslation(lang, 'calling', 'يتصل...') : getTranslation(lang, 'ringing', 'يرن...'))}
              duration={formatDuration(activeCall.duration)}
              isMuted={isCallMuted}
              onToggleMute={toggleCallMute}
              isSpeakerOn={isSpeakerOn}
              onToggleSpeaker={toggleSpeaker}
              onEndCall={endCall}
              myId={myId || ''}
              remoteStream={remoteStream}
              lang={lang}
            />
          )
        )}

        {/* App Launch Celebration & Notification System Queue */}
        <AppLaunchModalQueue currentUser={currentUser} lang={lang} />

        {/* Level Up Celebration (runtime trigger) */}
        {levelUpLevel !== null && (
          <LevelStatusModal
            mode="LEVEL_UP"
            level={levelUpLevel}
            isOpen={!!levelUpLevel}
            onClose={() => setLevelUpLevel(null)}
            lang={lang}
            userName={currentUser?.name || currentUser?.displayName}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};
