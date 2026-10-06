import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Edit2, ArrowRight, ArrowLeft, CheckCircle2, Share, Plus, X, Play, Mic, Globe, 
  Sparkles, Camera, Image as ImageIcon, Check, Loader2, RefreshCcw,
  Users, UserPlus, Eye, Heart, MessageSquare, Bookmark, Settings, ChevronLeft,
  RotateCcw, Zap, SlidersHorizontal, Volume2, VolumeX, MapPin, Link as LinkIcon,
  UserMinus, UserCheck, Send as SendIcon, Move, ZoomIn, LogOut, Trash2, Lock,
  Calendar, Mail, Phone, History, Clock, Share2, QrCode, Copy, Scan, Pin, Star, ShieldCheck, Shield,
  Brain, Video, Layers, ChevronRight, Crown
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { Language, VideoItem, User as UserType, PhotoPost } from '../types';
import { normalizeMediaUrl, getMediaProxyUrl } from '../src/lib/mediaUtils';
import EditProfileModal from './EditProfileModal';
import ListViewModal from './ListViewModal';
import { StoryViewerModal as StoryViewer } from '../src/components/stories/StoryViewerModal';
import { AvatarLevelBadge } from './AvatarLevelBadge';
import { calculateLevelAndBadge } from '../services/starsEngine';
import { translations, getTranslation } from '../translations';
import { FILTERS } from './PostCreation';
import ModernSettingsIcon from './ModernSettingsIcon';
import { db as firestoreDb } from '../lib/firebase';
import { useUsers } from '../src/contexts/UserContext';
import { VideoItemComponent as FeedItem } from './VideosView';
import { videoCache } from '../lib/videoCache';
import { requirePermission } from '../lib/permissionManager';
import { INITIAL_CURATED_PHOTOS } from './PhotosGalleryView';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, onSnapshot, query, where, getDocs, deleteDoc, updateDoc, arrayUnion, arrayRemove, or, increment, limit } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface Props {
  myId: string;
  myProfile?: any;
  userId?: string;
  onBack: () => void;
  onSettings?: () => void;
  lang: Language;
  onToggleVoice?: () => void;
  isUiVisible: boolean;
  onToggleUi: () => void;
  uploadingPosts?: VideoItem[]; // NEW: Accept uploading posts
  onWatchStream?: (userId: string) => void;
  onChat?: (userId: string) => void;
  isLive?: boolean;
  onInviteToLive?: () => void;
  onRetryUpload?: (video: VideoItem) => void;
  onCancelUpload?: (video: VideoItem) => void;
  onDeleteVideo?: (video: VideoItem) => void;
  onPost?: () => void;
  onNavigateToCreativeHub?: (tool?: any) => void;
  setActiveStory?: (story: VideoItem | null) => void;
  initialTab?: 'gallery' | 'photos' | 'archive' | 'saved' | 'liked' | 'starred';
}

import { uploadFileResilient } from '../src/lib/mediaProcessor';

const ProfileView: React.FC<Props> = ({ myId, myProfile, userId = 'me', onBack, onSettings, lang, onToggleVoice, isUiVisible, onToggleUi, uploadingPosts = [], onWatchStream, onChat, isLive, onInviteToLive, onRetryUpload, onCancelUpload, onDeleteVideo, onPost, onNavigateToCreativeHub, setActiveStory, initialTab = 'gallery' }) => {
  const t = translations[lang] || translations.ar;
  
  // Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // State for Navigation inside Profile (To view other users)
  const [viewId, setViewId] = useState<string>(userId === 'me' ? (auth.currentUser?.uid || myId) : userId);
  
  // Sync viewId with userId prop
  useEffect(() => {
    const currentUid = auth.currentUser?.uid || myId;
    setViewId(userId === 'me' ? currentUid : userId);
  }, [userId, myId, auth.currentUser?.uid]);

  // Derived state to check if we are viewing "My Profile"
  const isMe = viewId === (auth.currentUser?.uid || myId);

  // Profile Data State
  const [profileName, setProfileName] = useState('');
  const [realName, setRealName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [profileInterests, setProfileInterests] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileBirthDate, setProfileBirthDate] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [phonePrivacy, setPhonePrivacy] = useState<'public' | 'friends' | 'private'>('private');
  const [birthDatePrivacy, setBirthDatePrivacy] = useState<'public' | 'friends' | 'private'>('private');
  const [emailPrivacy, setEmailPrivacy] = useState<'public' | 'friends' | 'private'>('private');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [totalStars, setTotalStars] = useState(0);
  const [level, setLevel] = useState(0);
  
  // Relationship State
  const { following, users } = useUsers();
  const isFollowing = following.has(viewId);
  const user = users[viewId];
  
  // Update avatar when user data changes in UserContext
  useEffect(() => {
    if (user && user.avatar) {
        setAvatarUrl(user.avatar);
    }
  }, [user]);

  // const [isFollowing, setIsFollowing] = useState(false); // Removed
  const [isFollower, setIsFollower] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'friend' | 'request_sent' | 'request_received'>('none');
  const [isAccountPrivate, setIsAccountPrivate] = useState<boolean>(false);
  const [profilePicPrivacy, setProfilePicPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [aboutPrivacy, setAboutPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');

  // Cached Videos State
  const [cachedVideos, setCachedVideos] = useState<VideoItem[]>([]);
  const [videoFilter, setVideoFilter] = useState<'public' | 'private' | 'friends'>('public');
  
  // Photos State
  const [userPhotos, setUserPhotos] = useState<PhotoPost[]>([]);
  const [activePhotoLightbox, setActivePhotoLightbox] = useState<PhotoPost | null>(null);
  const [lightboxImgIndex, setLightboxImgIndex] = useState<number>(0);

  // New Tabs State
  const [activeTab, setActiveTab] = useState<'gallery' | 'photos' | 'archive' | 'saved' | 'liked' | 'starred'>(initialTab || 'gallery');
  
  // Sync tab with initialTab prop
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [failedVideos, setFailedVideos] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoItem[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  
  // Smart Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Highlights State
  const [highlights, setHighlights] = useState<any[]>([]);
  
  // Pinning State
  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  // Phone Verification States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const formatPhoneNumber = (phone: string) => {
    let trimmed = phone.trim();
    if (trimmed.startsWith('+')) {
      return '+' + trimmed.replace(/\D/g, '');
    }
    let digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('00')) {
      return '+' + digits.substring(2);
    }
    if (digits.startsWith('0') && digits.length >= 10) {
      digits = digits.substring(1);
    }
    if (!digits.startsWith('964')) {
      digits = '964' + digits;
    }
    return '+' + digits;
  };

  const startPhoneVerification = async () => {
    if (!profilePhone) return;
    setVerifyLoading(true);
    setVerifyError(null);
    const formattedPhone = formatPhoneNumber(profilePhone);
    console.log('Attempting OTP for:', formattedPhone);

    try {
      if (!recaptchaRef.current) return;

      // Clear previous recaptcha if exists
      const container = recaptchaRef.current;
      if (container) container.innerHTML = '';

      if ((window as any).recaptchaVerifierProfile) {
        try {
          (window as any).recaptchaVerifierProfile.clear();
        } catch (e) {}
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible'
      });

      (window as any).recaptchaVerifierProfile = recaptchaVerifier;

      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setVerifyError(getTranslation(lang, 'phoneInvalidAlert', 'Invalid phone number format. Please ensure international format (+964...)'));
      } else if (err.code === 'auth/operation-not-allowed') {
        setVerifyError(getTranslation(lang, 'phoneAuthDisabledAlert', 'Phone Authentication must be enabled in Firebase console first.'));
      } else if (err.code === 'auth/billing-not-enabled') {
        setVerifyError(getTranslation(lang, 'phoneAuthBlazeAlert', 'Firebase project must be on Blaze plan for Phone Authentication.'));
      } else {
        setVerifyError(getTranslation(lang, 'phoneSendFailedAlert', 'Failed to send code. Please check the number.'));
      }
      // Reset recaptcha on error
      if ((window as any).recaptchaVerifierProfile) {
        try {
          (window as any).recaptchaVerifierProfile.clear();
          delete (window as any).recaptchaVerifierProfile;
        } catch (e) {}
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!confirmationResult || !verificationCode) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await confirmationResult.confirm(verificationCode);
      // Update Firestore
      await updateDoc(doc(firestoreDb, 'users', myId), {
        phoneVerified: true
      });
      setShowVerifyModal(false);
      setPhoneVerified(true);
    } catch (err: any) {
      setVerifyError(getTranslation(lang, 'codeInvalidAlert', 'Invalid code. Please try again.'));
    } finally {
      setVerifyLoading(false);
    }
  };

  const extractValue = (field: any) => {
    if (field && typeof field === 'object' && 'value' in field) {
      return field.value;
    }
    return typeof field === 'string' ? field : '';
  };

  const cleanName = (name: any, email?: any) => {
    const emailStr = extractValue(email);
    const nameStr = extractValue(name);
    if (!nameStr || nameStr === 'مستخدم' || nameStr === 'User') {
      if (emailStr && emailStr.includes('@')) return emailStr.split('@')[0];
      return getTranslation(lang, 'userLabel', 'User');
    }
    return nameStr;
  };

  const isFieldVisible = (fieldPrivacy: 'public' | 'friends' | 'private', isMe: boolean, isFriend: boolean) => {
    if (isMe) return true;
    if (fieldPrivacy === 'public') return true;
    if (fieldPrivacy === 'friends' && isFriend) return true;
    return false;
  };

  // Load Profile Data Effect
  useEffect(() => {
    let unsubscribeUser: () => void = () => {};
    let unsubscribeVideos: () => void = () => {};
    let unsubscribePosts: () => void = () => {};
    let unsubscribeFollow: () => void = () => {};
    let unsubscribeContacts: () => void = () => {};

    const fetchProfileData = async () => {
      const currentUid = auth.currentUser?.uid || myId;
      const targetId = userId === 'me' ? currentUid : viewId;
      
      if (!targetId || !auth.currentUser) return;

      // Reset state when switching profiles
      setProfileName('');
      setProfileBio('');
      setProfileLocation('');
      setProfileWebsite('');
      setProfileInterests('');
      setAvatarUrl('');
      setCachedVideos([]);
      setUserPhotos([]);
      setIsFollower(false);
      setFriendStatus('none');

      try {
        // 1. Fetch user data with onSnapshot
        const userRef = doc(firestoreDb, 'users', targetId);
        unsubscribeUser = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            console.log("ProfileView: fetched user data:", data);
            // Fallback to Auth data if Firestore data is missing key fields and it's ME
            const email = data.email || (isMe ? auth.currentUser?.email : '') || '';
            const emailStr = typeof email === 'string' ? email : (email?.value || '');
            const emailPrefix = emailStr ? emailStr.split('@')[0] : '';
            const fallbackName = (isMe && auth.currentUser?.displayName) ? auth.currentUser.displayName : (emailPrefix || targetId);
            const fallbackAvatar = (isMe && auth.currentUser?.photoURL) ? normalizeMediaUrl(auth.currentUser.photoURL) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailStr || targetId}`;

            setProfileName(cleanName(data.nickname || data.displayName || data.name || '', email));
            setRealName(extractValue(data.name));
            
            setProfileBio(extractValue(data.bio) || getTranslation(lang, 'readyToExploreBio', 'Ready to explore the world 🌍'));
            setProfileLocation(extractValue(data.location));
            setProfileWebsite(extractValue(data.website));
            setProfileInterests(extractValue(data.interests));
            setProfilePhone(extractValue(data.phoneNumber) || extractValue(data.phone));
            setProfileBirthDate(extractValue(data.birthDate));
            setProfileEmail(extractValue(data.email));
            setPhoneVerified(data.phoneVerified !== false); // Default to true if not explicitly false
            setPhonePrivacy(data.phone?.privacy || 'private');
            setBirthDatePrivacy(data.birthDate?.privacy || 'private');
            setEmailPrivacy(data.email?.privacy || 'private');
            setAvatarUrl(normalizeMediaUrl(data.photoURL) || fallbackAvatar);
            setTotalStars(data.totalReceivedStars !== undefined ? data.totalReceivedStars : (data.totalStars || 0));
            const stars = Number(data.starsCount !== undefined ? data.starsCount : (data.freeStars || data.supporterXP || data.xp || 0));
            const { level: resolvedLevel } = calculateLevelAndBadge(stars);
            setLevel(resolvedLevel);
            setVideoFilter(data.defaultPrivacy || data.videoPrivacy || data.privacy || 'public');
            setIsAccountPrivate(data.isPrivate === true || data.visibility === 'private' || data.contentDisplaySettings?.privateAccount === true);
            setProfilePicPrivacy(data.chatSettings?.profilePicPrivacy || 'everyone');
            setAboutPrivacy(data.chatSettings?.aboutPrivacy || 'everyone');
          } else {
            setLevel(0);
            // Setup fallback details instead of redirecting
            const email = isMe ? (auth.currentUser?.email || '') : '';
            const emailPrefix = email ? email.split('@')[0] : '';
            const fallbackName = (isMe && auth.currentUser?.displayName) ? auth.currentUser.displayName : (isMe ? (emailPrefix || auth.currentUser?.uid || targetId) : targetId);
            const fallbackAvatar = (isMe && auth.currentUser?.photoURL) ? normalizeMediaUrl(auth.currentUser.photoURL) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${email || targetId}`;
            
            setProfileName(cleanName(fallbackName || '', email));
            setProfileBio(getTranslation(lang, 'readyToExploreBio', 'Ready to explore the world 🌍'));
            setAvatarUrl(fallbackAvatar);
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, `users/${targetId}`));

    // 2. Fetch videos for this user with onSnapshot
    const videosRef = collection(firestoreDb, 'videos');
    const queryUid = (isMe && auth.currentUser?.uid) ? auth.currentUser.uid : targetId;
    const q = query(videosRef, where('userId', '==', queryUid));
    
    unsubscribeVideos = onSnapshot(q, (videosSnap) => {
      console.log("ProfileView: Videos onSnapshot received", videosSnap.docs.length, "documents");
      const videosData = videosSnap.docs.map(doc => {
        const data = doc.data();
        console.log("ProfileView: Video doc", doc.id, "exists:", doc.exists());
        return {
          id: doc.id,
          url: data.url || '',
          user: data.user || data.nickname || 'User',
          userId: data.userId || data.authorUid || 'unknown',
          userAvatar: normalizeMediaUrl(data.userAvatar || data.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`,
          likes: data.likesCount || data.likes || 0,
          comments: data.comments || [],
          commentsCount: data.commentsCount || (data.comments ? data.comments.length : 0),
          shares: data.sharesCount || data.shares || 0,
          saves: data.savesCount || data.saves || 0,
          views: data.viewsCount || data.views || 0,
          desc: data.desc || data.description || '',
          music: data.music || 'Original Sound',
          isFollowed: data.isFollowed || false,
          isLiked: data.isLiked || false,
          isSaved: data.isSaved || false,
          isPinned: data.isPinned || false,
          isStarred: data.isStarred || false,
          audioSettings: data.audioSettings || { autoEnhance: true, volume: 80 },
          privacy: data.privacy || data.visibility || 'public',
          visibility: data.visibility || data.privacy || 'public',
          target: data.target || 'feed',
          createdAt: data.createdAt
        } as VideoItem;
      });
      videosData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        if (timeA === 0 && timeB === 0) return b.id.localeCompare(a.id);
        return timeB - timeA;
      });
      setCachedVideos(videosData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'videos'));

    // 2.5 Fetch user photo posts with onSnapshot
    const postsRef = collection(firestoreDb, 'posts');
    const qPosts = query(postsRef, where('userId', '==', queryUid), limit(60));
    unsubscribePosts = onSnapshot(qPosts, (postsSnap) => {
      const loadedPhotos: PhotoPost[] = [];
      postsSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const isImage = data.mediaType === 'image' || data.mediaType === 'photo' || data.mediaType === 'gallery' || (data.images && Array.isArray(data.images) && data.images.length > 0);
        if (isImage) {
          const rawList: string[] = data.images && Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : (data.imageUrl ? [data.imageUrl] : (data.url ? [data.url] : []));
          
          // Strict URL Sanitization Guard: Exclude temporary blob URLs, null, undefined, or empty strings
          const imagesList = rawList.filter(imgUrl => 
            imgUrl && typeof imgUrl === 'string' && imgUrl.trim() !== '' && !imgUrl.startsWith('blob:') && imgUrl !== 'null' && imgUrl !== 'undefined'
          );

          loadedPhotos.push({
            id: docSnap.id,
            images: imagesList.length > 0 ? imagesList : ['https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&auto=format&fit=crop&q=80'],
            aspectRatio: data.aspectRatio || '4/5',
            user: data.user || data.userName || data.nickname || profileName || getTranslation(lang, 'userLabel', 'User'),
            userId: data.userId || queryUid,
            userAvatar: normalizeMediaUrl(data.userAvatar || data.avatarUrl || avatarUrl),
            likes: data.likesCount || data.likes || 0,
            likesCount: data.likesCount || data.likes || 0,
            commentsCount: data.commentsCount || (data.comments ? data.comments.length : 0),
            shares: data.sharesCount || data.shares || 0,
            saves: data.savesCount || data.saves || 0,
            stars: data.stars || 0,
            desc: data.desc || data.description || '',
            tags: data.tags || ['#HiSeePhotos'],
            location: data.location || '',
            category: data.category || 'all',
            createdAt: data.createdAt
          });
        }
      });

      // Fallback demo photos if user matches curated creators
      const curatedMatches = INITIAL_CURATED_PHOTOS.filter(cp => cp.userId === queryUid || targetId.includes(cp.userId) || cp.userId.includes(targetId));
      curatedMatches.forEach(cp => {
        if (!loadedPhotos.some(lp => lp.id === cp.id)) {
          loadedPhotos.push(cp);
        }
      });

      setUserPhotos(loadedPhotos);
    }, (err) => console.warn("User photos fetch warning:", err));

        // 3. Fetch following/friend status if not me
        if (!isMe && currentUid) {
          // Check following
          // Using UserContext following instead

          // Check if they follow me (isFollower)
          const followerRef = doc(firestoreDb, 'users', currentUid, 'followers', targetId);
          onSnapshot(followerRef, (followerSnap) => {
            setIsFollower(followerSnap.exists());
          });

          // Check friend status
          const contactRef = doc(firestoreDb, 'users', currentUid, 'contacts', targetId);
          unsubscribeContacts = onSnapshot(contactRef, (contactSnap) => {
            if (contactSnap.exists()) {
              const contactData = contactSnap.data();
              if (contactData.status === 'pending') {
                setFriendStatus('request_sent');
              } else if (contactData.status === 'received_request') {
                setFriendStatus('request_received');
              } else if (contactData.status === 'friends') {
                setFriendStatus('friend');
              } else {
                setFriendStatus('none');
              }
            } else {
              // Fallback to checking friends array
              const myRef = doc(firestoreDb, 'users', currentUid);
              getDoc(myRef).then(mySnap => {
                if (mySnap.exists()) {
                  const myData = mySnap.data();
                  const myFriends = myData?.friends || [];
                  if (myFriends.includes(targetId)) {
                    setFriendStatus('friend');
                  } else {
                    setFriendStatus('none');
                  }
                }
              });
            }
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `profile/${targetId}`);
      }
    };

    fetchProfileData();

    return () => {
      unsubscribeUser();
      unsubscribeVideos();
      unsubscribePosts();
      unsubscribeFollow();
      unsubscribeContacts();
    };
  }, [viewId, isMe, myId, userId]);

  // Fetch Highlights
  useEffect(() => {
    if (!viewId) return;
    const highlightsRef = collection(firestoreDb, 'users', viewId, 'highlights');
    const unsubscribe = onSnapshot(highlightsRef, (snap) => {
      const hData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHighlights(hData);
    });
    return () => unsubscribe();
  }, [viewId]);

  const handleStarVideo = async (video: VideoItem) => {
    if (!isMe) return;
    try {
      const newStarredState = !video.isStarred;
      const videoRef = doc(firestoreDb, 'videos', video.id);
      await updateDoc(videoRef, { isStarred: newStarredState });
      // Update local state immediately
      setCachedVideos(prev => prev.map(v => v.id === video.id ? { ...v, isStarred: newStarredState } : v));
    } catch (error) {
      console.error("Error starring video:", error);
    }
  };

  const handlePinVideo = async (video: VideoItem) => {
    if (!isMe) return;
    try {
      const newPinnedState = !video.isPinned;
      const videoRef = doc(firestoreDb, 'videos', video.id);
      await updateDoc(videoRef, { isPinned: newPinnedState });
      // Update local state immediately and re-sort
      setCachedVideos(prev => {
        const updated = prev.map(v => v.id === video.id ? { ...v, isPinned: newPinnedState } : v);
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          if (timeA === 0 && timeB === 0) return b.id.localeCompare(a.id);
          return timeB - timeA;
        });
      });
    } catch (error) {
      console.error("Error pinning video:", error);
    }
  };

  const handleCopyProfileLink = () => {
    const link = window.location.origin.replace(/\/$/, '') + '/?type=profile&id=' + viewId;
    navigator.clipboard.writeText(link);
    alert(getTranslation(lang, 'linkCopied', 'Link copied!'));
  };

  const handleSmartShare = async () => {
    const link = window.location.origin.replace(/\/$/, '') + '/?type=profile&id=' + viewId;
    if (navigator.share) {
      try {
        await navigator.share({
          title: profileName,
          text: profileBio,
          url: link,
        });
      } catch (err) {
        const isCancel = err instanceof Error && (
          err.name === 'AbortError' || 
          err.message.toLowerCase().includes('cancel') || 
          err.message.toLowerCase().includes('abort') ||
          err.message.toLowerCase().includes('share canceled')
        );
        if (!isCancel) {
          console.log('Error sharing:', err);
        }
      }
    } else {
      handleCopyProfileLink();
    }
  };

  // Scanner Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrame: number;

    const startScanner = async () => {
      if (!showScanner) return;
      if (!requirePermission('camera', getTranslation(lang, 'scanQrHeader', 'Scan QR Code'), () => startScanner())) {
        setShowScanner(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            aspectRatio: { ideal: 1.0 }
          } 
        });
        if (scannerVideoRef.current) {
          scannerVideoRef.current.srcObject = stream;
          scannerVideoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
          scannerVideoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert(getTranslation(lang, 'cameraAccessFailedAlert', 'Camera access failed'));
        setShowScanner(false);
      }
    };

    const tick = () => {
      if (!showScanner || !scannerVideoRef.current || !scannerCanvasRef.current) return;

      if (scannerVideoRef.current.readyState === scannerVideoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = scannerCanvasRef.current;
        const video = scannerVideoRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            console.log("Found QR code", code.data);
            handleScannedData(code.data);
            return; // Stop scanning
          }
        }
      }
      animationFrame = requestAnimationFrame(tick);
    };

    const handleScannedData = (data: string) => {
      try {
        let scannedUserId = "";
        
        if (data.includes('hisee://user/')) {
          scannedUserId = data.replace('hisee://user/', '').split('?')[0];
        } else if (data.includes('/profile/')) {
          const parts = data.split('/profile/');
          if (parts[1]) {
            scannedUserId = parts[1].split('?')[0];
          }
        } else if (data.startsWith('http://') || data.startsWith('https://')) {
          try {
            const url = new URL(data);
            const pathParts = url.pathname.split('/');
            const profileIndex = pathParts.indexOf('profile');
            if (profileIndex !== -1 && pathParts[profileIndex + 1]) {
              scannedUserId = pathParts[profileIndex + 1];
            }
          } catch (urlErr) {
            console.error("URL parsing error:", urlErr);
          }
        } else {
          scannedUserId = data.trim();
        }

        if (scannedUserId) {
          setViewId(scannedUserId);
          setShowScanner(false);
          setShowShareModal(false);
          alert(getTranslation(lang, 'profileFoundAlert', 'Profile found! Opening...'));
        } else {
          alert(getTranslation(lang, 'invalidProfileQrAlert', 'Invalid code or profile not found'));
          setShowScanner(false);
        }
      } catch (e) {
        console.error("Invalid QR code scanned:", data);
        alert(getTranslation(lang, 'invalidQrDataAlert', 'Invalid QR data'));
        setShowScanner(false);
      }
    };

    if (showScanner) {
      startScanner();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrame);
    };
  }, [showScanner, lang]);

  const getVideoThumbnail = (url: string) => {
    if (!url) return '';
    // For R2, we don't have an easy way to get a static thumbnail URL from a video URL.
    // Returning null/empty indicates no separate thumbnail is available.
    return '';
  };

  const [useThumbnail, setUseThumbnail] = useState<Set<string>>(new Set());

  // UI State
  const [activeList, setActiveList] = useState<{title: string, type: 'followers' | 'following' | 'posts', data: any[]} | null>(null);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const hasIncrementedView = useRef<string | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const swipableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPost !== null && swipableContainerRef.current) {
        const container = swipableContainerRef.current;
        const videoHeight = container.clientHeight;
        container.scrollTop = selectedPost * videoHeight;
    }
  }, [selectedPost]);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showCreativeMenu, setShowCreativeMenu] = useState(false);
  const [focusedToolIndex, setFocusedToolIndex] = useState(0);
  
  const radialTools = [
    { 
      id: 'upload', 
      icon: Plus, 
      label: getTranslation(lang, 'uploadFromPhone', 'Upload from Phone'), 
      sub: getTranslation(lang, 'uploadFromPhoneSub', 'Upload your favorite videos'), 
      color: 'emerald',
      gradient: 'from-emerald-400 to-emerald-600',
      action: () => { setShowCreativeMenu(false); onPost?.(); }
    },
    { 
      id: 'camera', 
      icon: Camera, 
      label: getTranslation(lang, 'creativeCamera', 'Creative Camera'), 
      sub: getTranslation(lang, 'creativeCameraSub', 'Record your moments live'), 
      color: 'rose',
      gradient: 'from-rose-400 to-rose-600',
      action: () => { setShowCreativeMenu(false); onNavigateToCreativeHub?.(); }
    },
    { 
      id: 'video_gen', 
      icon: Video, 
      label: getTranslation(lang, 'aiVideoStudio', 'AI Video Studio'), 
      sub: getTranslation(lang, 'aiVideoStudioSub', 'Turn imagination into reality'), 
      color: 'indigo',
      gradient: 'from-indigo-400 to-indigo-600',
      action: () => { setShowCreativeMenu(false); onNavigateToCreativeHub?.('video_gen'); }
    },
    { 
      id: 'thinking', 
      icon: Brain, 
      label: getTranslation(lang, 'deepThinking', 'Deep Thinking'), 
      sub: getTranslation(lang, 'deepThinkingSub', 'Smart creative analysis'), 
      color: 'purple',
      gradient: 'from-purple-400 to-purple-600',
      action: () => { setShowCreativeMenu(false); onNavigateToCreativeHub?.('thinking'); }
    }
  ];

  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  const [isPlayerUiVisible, setIsPlayerUiVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Editor State (Pan & Zoom)
  const [crop, setCrop] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Stats State
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalLiveLikes, setTotalLiveLikes] = useState(0);

  const handleShareVideo = async (video: VideoItem) => {
    const shareData = {
      title: 'HiSee Video',
      text: video.desc || 'Check out this video on HiSee!',
      url: window.location.origin.replace(/\/$/, '') + '/?type=video&id=' + video.id,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin.replace(/\/$/, '') + '/?type=video&id=' + video.id);
        alert(getTranslation(lang, 'linkCopied', 'Link copied!'));
      }
    } catch (err) {
      const isCancel = err instanceof Error && (
        err.name === 'AbortError' || 
        err.message.toLowerCase().includes('cancel') || 
        err.message.toLowerCase().includes('abort') ||
        err.message.toLowerCase().includes('share canceled')
      );
      if (!isCancel) {
        console.log('Error sharing:', err);
      }
    }
  };

  // Fetch Stats Effect
  useEffect(() => {
    if (!viewId || !auth.currentUser) return;

    // Fetch User Stats
    const userRef = doc(firestoreDb, 'users', viewId);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      if (data) {
        setFollowersCount(data.followersCount || 0);
        setFollowingCount(data.followingCount || 0);
        setTotalLiveLikes(data.totalLiveLikes || 0);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${viewId}`);
    });

    // Fetch Total Likes
    const videosRef = collection(firestoreDb, 'videos');
    const q = query(videosRef, where('userId', '==', viewId));
    const unsubscribeLikes = onSnapshot(q, (snap) => {
      let likes = 0;
      snap.forEach(doc => {
        likes += (doc.data().likesCount || 0);
      });
      setTotalLikes(likes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `videos where userId == ${viewId}`);
    });

    return () => {
      unsubscribeUser();
      unsubscribeLikes();
    };
  }, [viewId, auth.currentUser]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const imagePreviewRef = useRef<HTMLImageElement>(null);

  // Use passed posts for both My Profile and other users, plus cached videos for me
  // Fetch Saved & Liked Videos Effect
  useEffect(() => {
    if (!isMe || !auth.currentUser || activeTab === 'gallery' || activeTab === 'archive') return;

    const fetchTabData = async () => {
      setIsLoadingTabs(true);
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      try {
        const collectionName = activeTab === 'saved' ? 'saves' : 'likes';
        const subRef = collection(firestoreDb, 'users', currentUid, collectionName);
        const q = query(subRef, limit(20));
        const snap = await getDocs(q);
        
        const videoIds = snap.docs.map(doc => doc.data().videoId);
        if (videoIds.length === 0) {
          if (activeTab === 'saved') setSavedVideos([]);
          else setLikedVideos([]);
          setIsLoadingTabs(false);
          return;
        }

        // Fetch actual video data
        const videosRef = collection(firestoreDb, 'videos');
        // Firestore 'in' query supports up to 10-30 elements depending on version, 10 is safe
        const chunks = [];
        for (let i = 0; i < videoIds.length; i += 10) {
          chunks.push(videoIds.slice(i, i + 10));
        }

        let fetchedVideos: VideoItem[] = [];
        for (const chunk of chunks) {
          const vq = query(videosRef, where('__name__', 'in', chunk));
          const vsnap = await getDocs(vq);
          vsnap.docs.forEach(doc => {
            const data = doc.data();
            fetchedVideos.push({
              id: doc.id,
              url: data.url || '',
              user: data.user || data.nickname || 'User',
              userId: data.userId || data.authorUid || 'unknown',
              userAvatar: data.userAvatar || data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`,
              likes: data.likesCount || data.likes || 0,
              comments: data.comments || [],
              commentsCount: data.commentsCount || (data.comments ? data.comments.length : 0),
              shares: data.sharesCount || data.shares || 0,
              saves: data.savesCount || data.saves || 0,
              views: data.viewsCount || data.views || 0,
              desc: data.desc || data.description || '',
              music: data.music || 'Original Sound',
              isFollowed: data.isFollowed || false,
              isLiked: data.isLiked || false,
              isSaved: data.isSaved || false,
              privacy: data.privacy || data.visibility || 'public',
              visibility: data.visibility || data.privacy || 'public',
              createdAt: data.createdAt
            } as VideoItem);
          });
        }

        if (activeTab === 'saved') setSavedVideos(fetchedVideos);
        else setLikedVideos(fetchedVideos);
      } catch (error) {
        console.error(`Error fetching ${activeTab} videos:`, error);
      } finally {
        setIsLoadingTabs(false);
      }
    };

    fetchTabData();
  }, [activeTab, isMe]);

  // Derived state for archived stories
  const archivedStories = useMemo(() => {
    return cachedVideos.filter(v => v.target === 'story' || v.target === 'both').sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return timeB - timeA;
    });
  }, [cachedVideos]);

  const handleTabChange = (tab: 'gallery' | 'photos' | 'archive' | 'saved' | 'liked' | 'starred') => {
    if (tab === activeTab) return;
    
    // For gallery, photos, archive, and starred, we show a brief loading state for "smoothness"
    if (tab === 'gallery' || tab === 'photos' || tab === 'archive' || tab === 'starred') {
      setIsLoadingTabs(true);
      setTimeout(() => {
        setActiveTab(tab);
        setIsLoadingTabs(false);
      }, 250);
    } else {
      setActiveTab(tab);
    }
  };

  const displayPosts = useMemo(() => {
    let basePosts: VideoItem[] = [];
    if (activeTab === 'gallery') basePosts = cachedVideos;
    else if (activeTab === 'archive') basePosts = archivedStories;
    else if (activeTab === 'saved') basePosts = savedVideos;
    else if (activeTab === 'liked') basePosts = likedVideos;
    else if (activeTab === 'starred') basePosts = cachedVideos.filter(v => v.isStarred);

    const allPosts = [...(activeTab === 'gallery' ? (uploadingPosts || []) : []), ...basePosts];
    const uniquePosts: VideoItem[] = [];
    const seenIds = new Set();
    for (const p of allPosts) {
      if (!seenIds.has(p.id) && p.id !== 'temp-upload-preview') {
        // Privacy check
        let canView = true;
        const privacy = p.privacy || p.visibility || 'public';

        if (isMe) {
          // Owner always sees everything
          canView = true;
        } else {
          // If it's someone else, standard privacy rules
          if (privacy === 'private') canView = false;
          if (privacy === 'friends' && friendStatus !== 'friend') canView = false;
        }
        
        if (canView) {
          seenIds.add(p.id);
          uniquePosts.push(p);
        }
      }
    }
    
    // Sort by Pinned status first
    return uniquePosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [uploadingPosts, cachedVideos, isMe, friendStatus, videoFilter, activeTab, archivedStories, savedVideos, likedVideos]);

  useEffect(() => {
    if (selectedPost !== null && displayPosts && displayPosts[selectedPost]) {
      const vidId = displayPosts[selectedPost].id;
      if (hasIncrementedView.current !== vidId && vidId !== 'temp-upload-preview') {
        hasIncrementedView.current = vidId;
        const videoRef = doc(firestoreDb, 'videos', vidId);
        updateDoc(videoRef, { viewsCount: increment(1) }).catch(console.error);
      }
    } else {
      hasIncrementedView.current = null;
    }
  }, [selectedPost, displayPosts]);

  const handleStatClick = (type: 'followers' | 'following' | 'posts' | 'likes') => {
    if (type === 'posts') {
      galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'followers') {
      setActiveList({
        title: t.followersList,
        type: 'followers',
        data: []
      });
    } else if (type === 'following') {
      setActiveList({
        title: t.followingList,
        type: 'following',
        data: []
      });
    } else if (type === 'likes') {
      // Do nothing or handle likes click
    }
  };

  const handleResyncIdentity = async () => {
    if (!isMe || !auth.currentUser) return;
    const user = auth.currentUser;
    const userRef = doc(firestoreDb, 'users', user.uid);
    
    try {
      // 1. Check for duplicates by UID field
      const q = query(collection(firestoreDb, 'users'), where('uid', '==', user.uid), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const duplicateDoc = querySnapshot.docs[0];
        if (duplicateDoc.id !== user.uid) {
          const duplicateData = duplicateDoc.data();
          if (duplicateData.nickname || duplicateData.displayName || duplicateData.name) {
             await setDoc(userRef, duplicateData, { merge: true });
             return;
          }
        }
      }
      
      // 2. Fallback to Auth data
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || user.email || user.uid,
        photoURL: user.photoURL || avatarUrl,
        email: user.email,
        isOnline: true,
        lastSeen: serverTimestamp()
      }, { merge: true });
      
    } catch (error) {
      console.error("Error resyncing identity:", error);
    }
  };

  const handleBackClick = () => {
    const initialViewId = userId === 'me' ? (auth.currentUser?.uid || myId) : userId;
    
    // If we navigated deeper to another user's profile, go back to the initial one we opened
    if (viewId !== initialViewId) {
        setViewId(initialViewId);
    } else {
        // Otherwise, close the profile view and return to the previous screen (like LiveFeed)
        onBack();
    }
  };

  const handleFollowToggle = async () => {
    const currentUid = auth.currentUser?.uid || myId;
    if (!isFollowing) {
      try {
        // Add to followers
        await setDoc(doc(firestoreDb, 'users', viewId, 'followers', currentUid), {
          timestamp: serverTimestamp()
        });
        // Add to following
        await setDoc(doc(firestoreDb, 'users', currentUid, 'following', viewId), {
          timestamp: serverTimestamp()
        });
        // Update counts
        await setDoc(doc(firestoreDb, 'users', viewId), { followersCount: increment(1) }, { merge: true });
        await setDoc(doc(firestoreDb, 'users', currentUid), { followingCount: increment(1) }, { merge: true });
        // Check if the other user follows me (i.e. viewId is following currentUid)
        const theyFollowMe = await getDoc(doc(firestoreDb, 'users', viewId, 'following', currentUid));
        const status = theyFollowMe.exists() ? 'mutual' : 'pending';

        // Send notification
        await setDoc(doc(firestoreDb, 'users', viewId, 'notifications', `follow_${currentUid}_${viewId}`), {
          type: 'follow',
          fromUserId: currentUid,
          fromUserName: myProfile?.name || myProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.uid,
          fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || auth.currentUser?.photoURL || '',
          timestamp: serverTimestamp(),
          read: false,
          status: status,
          message: getTranslation(lang, 'startedFollowingYou', 'started following you')
        });

        // If mutual, update their notification to me
        if (status === 'mutual') {
          const theirNotiRef = doc(firestoreDb, 'users', currentUid, 'notifications', `follow_${viewId}_${currentUid}`);
          const theirNotiSnap = await getDoc(theirNotiRef);
          if (theirNotiSnap.exists()) {
            await updateDoc(theirNotiRef, {
              status: 'mutual',
              message: getTranslation(lang, 'startedFollowingYou', 'started following you')
            });
          }
        }
      } catch (error) {
        console.error("Error following user:", error);
      }
    } else {
      try {
        // Remove from followers
        await deleteDoc(doc(firestoreDb, 'users', viewId, 'followers', currentUid));
        // Remove from following
        await deleteDoc(doc(firestoreDb, 'users', currentUid, 'following', viewId));
        // Update counts
        await setDoc(doc(firestoreDb, 'users', viewId), { followersCount: increment(-1) }, { merge: true });
        await setDoc(doc(firestoreDb, 'users', currentUid), { followingCount: increment(-1) }, { merge: true });
        
        // Remove notification from me to them
        await deleteDoc(doc(firestoreDb, 'users', viewId, 'notifications', `follow_${currentUid}_${viewId}`));
        
        // Handle notification from them to me
        const theirNotificationRef = doc(firestoreDb, 'users', currentUid, 'notifications', `follow_${viewId}_${currentUid}`);
        const theirNotificationSnap = await getDoc(theirNotificationRef);
        if (theirNotificationSnap.exists()) {
            // Check if they still follow me
            const theyFollowMe = await getDoc(doc(firestoreDb, 'users', viewId, 'following', currentUid));
            if (theyFollowMe.exists()) {
                await updateDoc(theirNotificationRef, {
                    status: 'pending',
                    message: getTranslation(lang, 'startedFollowingYou', 'started following you')
                });
            } else {
                await deleteDoc(theirNotificationRef);
            }
        }
      } catch (error) {
        console.error("Error unfollowing user:", error);
      }
    }
  };

  const handleFriendRequest = async () => {
    const currentUid = auth.currentUser?.uid || myId;
    if (friendStatus === 'none') {
      setFriendStatus('request_sent');
      try {
        // 1. Send friend request notification with deterministic ID
        await setDoc(doc(firestoreDb, 'users', viewId, 'notifications', `friend_${currentUid}_${viewId}`), {
          type: 'friend_request',
          fromUserId: currentUid,
          fromUserName: myProfile?.name || myProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.uid,
          fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || auth.currentUser?.photoURL || '',
          timestamp: serverTimestamp(),
          read: false,
          message: getTranslation(lang, 'sentFriendRequest', 'sent you a friend request')
        });

        // 2. Add to contacts subcollection (for compatibility and state tracking)
        await setDoc(doc(firestoreDb, 'users', currentUid, 'contacts', viewId), {
          timestamp: serverTimestamp(),
          status: 'pending'
        });
        
        await setDoc(doc(firestoreDb, 'users', viewId, 'contacts', currentUid), {
          timestamp: serverTimestamp(),
          status: 'received_request'
        });
        
        // 3. Create a chat document if it doesn't exist to ensure it shows in ChatList
        const chatId = [currentUid, viewId].sort().join('_');
        await setDoc(doc(firestoreDb, 'chats', chatId), {
          id: chatId,
          participants: [currentUid, viewId],
          updatedAt: serverTimestamp(),
          lastMessage: getTranslation(lang, 'chatStartedNow', 'Chat started now'),
          isGroup: false,
          [`messageCount_${currentUid}`]: 0,
          [`messageCount_${viewId}`]: 0,
          user: {
            id: viewId,
            name: profileName || viewId,
            avatar: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewId}`,
          }
        }, { merge: true });

      } catch (error) {
        console.error("Error sending friend request:", error);
        setFriendStatus('none');
      }
    } else if (friendStatus === 'request_received') {
      // Accept the request
      setFriendStatus('friend');
      try {
        // 1. Add to friends array
        await setDoc(doc(firestoreDb, 'users', currentUid), {
          friends: arrayUnion(viewId)
        }, { merge: true });
        await setDoc(doc(firestoreDb, 'users', viewId), {
          friends: arrayUnion(currentUid)
        }, { merge: true });
        
        // 2. Update contact status to 'friends' for both users
        await setDoc(doc(firestoreDb, 'users', currentUid, 'contacts', viewId), {
          status: 'friends',
          timestamp: serverTimestamp()
        }, { merge: true });
        
        await setDoc(doc(firestoreDb, 'users', viewId, 'contacts', currentUid), {
          status: 'friends',
          timestamp: serverTimestamp()
        }, { merge: true });
        
        // 3. Send acceptance notification
        await setDoc(doc(firestoreDb, 'users', viewId, 'notifications', `friend_accepted_${currentUid}_${viewId}`), {
          type: 'friend_accepted',
          fromUserId: currentUid,
          fromUserName: myProfile?.name || myProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.uid,
          fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || auth.currentUser?.photoURL || '',
          timestamp: serverTimestamp(),
          read: false,
          message: getTranslation(lang, 'acceptedFriendRequest', 'accepted your friend request')
        });

        // 4. Delete the request notification from my notifications
        await deleteDoc(doc(firestoreDb, 'users', currentUid, 'notifications', `friend_${viewId}_${currentUid}`));
        const notiRef = collection(firestoreDb, 'users', currentUid, 'notifications');
        const q = query(notiRef, where('type', '==', 'friend_request'), where('fromUserId', '==', viewId));
        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => {
          await deleteDoc(doc(firestoreDb, 'users', currentUid, 'notifications', docSnap.id));
        });
      } catch (error) {
        console.error("Error accepting friend request:", error);
        setFriendStatus('request_received');
      }
    } else if (friendStatus === 'request_sent' || friendStatus === 'friend') {
      const prevStatus = friendStatus;
      setFriendStatus('none');
      try {
        // Remove from friends array safely
        const myRef = doc(firestoreDb, 'users', currentUid);
        await setDoc(myRef, {
          friends: arrayRemove(viewId)
        }, { merge: true });
        
        const theirRef = doc(firestoreDb, 'users', viewId);
        await setDoc(theirRef, {
          friends: arrayRemove(currentUid)
        }, { merge: true });

        // Clean up any friend request / acceptance notifications between the two users
        await deleteDoc(doc(firestoreDb, 'users', viewId, 'notifications', `friend_${currentUid}_${viewId}`)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'users', currentUid, 'notifications', `friend_${viewId}_${currentUid}`)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'users', viewId, 'notifications', `friend_accepted_${currentUid}_${viewId}`)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'users', currentUid, 'notifications', `friend_accepted_${viewId}_${currentUid}`)).catch(() => {});

        // Remove from contacts subcollection
        await deleteDoc(doc(firestoreDb, 'users', currentUid, 'contacts', viewId)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'users', viewId, 'contacts', currentUid)).catch(() => {});

        // Safely reset / delete chat without failing if chat document does not exist
        const chatId = [currentUid, viewId].sort().join('_');
        await setDoc(doc(firestoreDb, 'chats', chatId), {
            [`messageCount_${currentUid}`]: 0,
            [`messageCount_${viewId}`]: 0
        }, { merge: true }).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'chats', chatId)).catch(() => {});
      } catch (error) {
        console.error("Error removing friend:", error);
        setFriendStatus(prevStatus);
      }
    }
  };

  const handleUpdateVideoPrivacy = async (videoId: string, newVisibility: 'public' | 'private' | 'friends') => {
    try {
      const videoRef = doc(firestoreDb, 'videos', videoId);
      await updateDoc(videoRef, { 
        visibility: newVisibility,
        privacy: newVisibility 
      });
      
      // Update local state to reflect change immediately
      setCachedVideos(prev => prev.map(v => v.id === videoId ? { ...v, visibility: newVisibility, privacy: newVisibility } : v));
    } catch (error) {
      console.error("Error updating video privacy:", error);
    }
  };

  const handleSaveProfile = async (updatedUser: UserType) => {
    setProfileName(updatedUser.name);
    setProfileBio(updatedUser.bio?.value || '');
    setProfileWebsite(updatedUser.website?.value || '');
    setProfileLocation(updatedUser.location?.value || '');
    setProfileInterests(updatedUser.interests?.value || '');
    setProfilePhone(updatedUser.phone?.value || '');
    setProfileBirthDate(updatedUser.birthDate?.value || '');
    setProfileEmail(updatedUser.email?.value || '');
    setPhonePrivacy(updatedUser.phone?.privacy || 'private');
    setBirthDatePrivacy(updatedUser.birthDate?.privacy || 'private');
    setEmailPrivacy(updatedUser.email?.privacy || 'private');
    
    if (isMe) {
      try {
        const currentUid = auth.currentUser?.uid || myId;
        const userRef = doc(firestoreDb, 'users', currentUid);
        await updateDoc(userRef, {
          name: updatedUser.name,
          displayName: updatedUser.name,
          bio: updatedUser.bio,
          website: updatedUser.website,
          location: updatedUser.location,
          interests: updatedUser.interests,
          phone: updatedUser.phone,
          email: updatedUser.email,
          birthDate: updatedUser.birthDate,
          privacy: updatedUser.privacy
        });
      } catch (error) {
        console.error("Error saving profile to Firestore:", error);
      }
    }
  };

  const startCamera = async () => {
    setShowPhotoMenu(false);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      setEditingImage(canvasRef.current.toDataURL('image/jpeg', 0.7));
      setCrop({ x: 0, y: 0, zoom: 1 }); // Reset crop
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCameraActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => {
        setEditingImage(prev.target?.result as string);
        setCrop({ x: 0, y: 0, zoom: 1 }); // Reset crop on new file
      };
      reader.readAsDataURL(file);
      setShowPhotoMenu(false);
    }
  };

  // --- Drag & Drop Logic for Image ---
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setCrop(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const saveProfilePicture = async () => {
    if (!editingImage) return;
    setIsUploading(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Output resolution (square)
          const size = 500;
          canvas.width = size;
          canvas.height = size;
          
          // Background for transparency
          ctx.fillStyle = '#0a0c10';
          ctx.fillRect(0, 0, size, size);

          // Calculate base scale to fit image in canvas
          const baseScale = Math.min(size / img.width, size / img.height);
          
          // Get UI container size to scale pan offsets
          const uiSize = imagePreviewRef.current?.parentElement?.clientWidth || 300;
          const ratio = size / uiSize;

          // Apply transformations based on crop state
          ctx.translate(size / 2 + crop.x * ratio, size / 2 + crop.y * ratio); // Move origin to center + pan
          ctx.scale(baseScale * crop.zoom, baseScale * crop.zoom);   // Apply base fit + manual zoom

          // Apply filter
          ctx.filter = selectedFilter.filter || 'none';
          
          // Draw image centered at origin
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          
          canvas.toBlob(async (blob) => {
            if (!blob) {
              setIsUploading(false);
              return;
            }

            try {
              const uploadId = `avatar_${myId}_${Date.now()}`;
              const fileToUpload = new File([blob], `${uploadId}.jpg`, { type: 'image/jpeg' });

              const uploadedUrl = await uploadFileResilient(
                fileToUpload,
                '/api/upload',
                (progress) => {
                  console.log(`Upload progress: ${progress}%`);
                }
              );

              // Save to Firestore if it's my profile
              if (isMe) {
                const userRef = doc(firestoreDb, 'users', myId);
                await updateDoc(userRef, { 
                  avatar: uploadedUrl,
                  photoURL: uploadedUrl,
                  avatarUrl: uploadedUrl,
                  profileImage: uploadedUrl 
                });
              }

              setAvatarUrl(uploadedUrl);
              setEditingImage(null);
              setIsUploading(false);
              setSelectedFilter(FILTERS[0]);
              showToast('تم حفظ الصورة بنجاح!', 'success');
            } catch (err) {
              console.error("Error saving avatar:", err);
              setIsUploading(false);
              showToast('فشل حفظ الصورة، يرجى المحاولة مرة أخرى.', 'error');
            }
          }, 'image/jpeg', 0.8);
        }
      }
    };
    img.src = editingImage;
  };

  return (
    <>
      {toastMessage && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[2500] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === 'success' ? 'bg-emerald-900 border-emerald-500 text-emerald-100' : 'bg-red-900 border-red-500 text-red-100'
        }`}>
          <span className="font-bold text-sm">{toastMessage.text}</span>
        </div>
      )}
      <div 
        className="flex flex-col h-full w-full bg-[#0a0c10] overflow-y-auto no-scrollbar pb-32 relative text-white font-light"
        onClick={(e) => {
            // Only toggle if not clicking interactive elements
            if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('input')) {
                onToggleUi();
            }
        }}
    >
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[2500] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === 'success' ? 'bg-emerald-900 border-emerald-500 text-emerald-100' : 'bg-red-900 border-red-500 text-red-100'
        }`}>
          <span className="font-bold text-sm">{toastMessage.text}</span>
        </div>
      )}
      
       {/* Header Buttons */}
      <div className={`fixed top-6 right-6 left-6 flex justify-between items-center z-[50] pointer-events-none transition-all duration-300 ${selectedPost !== null ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Left Side: Back Button (Actually right side in RTL) */}
        <button onClick={handleBackClick} className="p-2 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 text-white hover:text-emerald-500 transition-all pointer-events-auto shadow-xl">
          <ArrowRight size={20} />
        </button>

        {/* Right Side: Action Buttons (Actually left side in RTL) */}
        <div className="flex items-center gap-2 pointer-events-auto">
            {/* Highlights Button */}
            {isMe && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleTabChange('starred'); }}
                className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl text-white/60 hover:text-yellow-400 transition-all cursor-pointer shadow-xl"
                title={t.featuredContent || 'Featured Content'}
              >
                <Star size={16} />
              </button>
            )}

            {/* Connect+ Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} 
              className="px-4 py-2 bg-gradient-to-tr from-emerald-500 to-rose-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span className="text-xs font-black italic tracking-tighter uppercase">{t.connect || 'Connect+'}</span>
            </button>
        </div>
      </div>

      {/* Profile Header Info */}
      <div className="px-8 pt-24 mb-8 flex items-center justify-between">
        <div className="flex flex-col items-start gap-2 max-w-[65%]">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-3xl font-black italic text-white uppercase tracking-tighter truncate leading-tight">
              {profileName}
            </h2>
            <CheckCircle2 size={20} fill="#10b981" className="text-white shrink-0" />
          </div>
          
          {realName && (
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest -mt-1">
              {realName}
            </div>
          )}
          
          {/* Bio & Details */}
          {(() => {
            const isBioAllowed = isMe || aboutPrivacy === 'everyone' || (aboutPrivacy === 'contacts' && (friendStatus === 'friend' || isFollower));
            if (!isBioAllowed) {
              return (
                <p className="text-xs text-slate-500 italic flex items-center gap-1.5 py-1">
                  <Shield size={12} className="text-slate-500" />
                  <span>{lang === 'ar' ? '🔒 النبذة التعريفية مخفية بموجب خيارات الخصوصية للمستخدم' : '🔒 Bio is hidden under user privacy settings'}</span>
                </p>
              );
            }
            return <p className="text-sm text-slate-300 font-medium leading-snug">{profileBio || t.addBio || 'Add a bio...'}</p>;
          })()}
          
          <div className="flex flex-wrap gap-3 mt-2">
             {profileLocation && (
               <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <MapPin size={12} className="text-rose-500" /> {profileLocation}
               </div>
             )}
             {profileWebsite && (
               <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <LinkIcon size={12} className="text-blue-400" /> {profileWebsite}
               </div>
             )}
             {isFieldVisible(phonePrivacy, isMe, friendStatus === 'friend') && (
               <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                  <Phone size={12} className={!phoneVerified && isMe && profilePhone ? "text-orange-500" : "text-emerald-500"} /> 
                  <span className={!phoneVerified && isMe && profilePhone ? "text-orange-400" : "text-slate-500"}>
                    {profilePhone || <span className="text-slate-600 italic">{t.notSet || 'Not set'}</span>}
                  </span>
                   {profilePhone && !phoneVerified && isMe && (
                    <button 
                      onClick={() => {
                        setShowVerifyModal(true);
                        startPhoneVerification();
                      }}
                      className="flex items-center gap-1 text-orange-500 ml-1 animate-pulse hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      <ShieldCheck size={10} />
                      ({getTranslation(lang, 'phoneNotVerifiedNotice', 'Phone not verified - please verify later ⚠️')})
                    </button>
                  )}
               </div>
             )}
             {isFieldVisible(birthDatePrivacy, isMe, friendStatus === 'friend') && (
               <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <Calendar size={12} className="text-yellow-500" /> 
                  {profileBirthDate || <span className="text-slate-600 italic">{t.dateNotSet || t.notSet || 'Not set'}</span>}
               </div>
             )}
             {profileEmail && isFieldVisible(emailPrivacy, isMe, friendStatus === 'friend') && (
               <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <Mail size={12} className="text-blue-500" /> {profileEmail}
               </div>
             )}
          </div>
          <div className="text-[10px] text-emerald-500/80 font-bold mt-1">{profileInterests}</div>

          {/* ACTION BUTTONS (Edit for Me, Follow/Friend for Others) */}
          <div className="mt-4 flex flex-row flex-nowrap gap-1.5 sm:gap-2 relative z-50 w-full justify-start items-center overflow-hidden">
            {isMe ? (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowEditProfileModal(true); }}
                  className="flex-1 min-w-0 px-2 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-tighter sm:tracking-widest hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Edit2 size={10} className="sm:w-3 sm:h-3" /> <span className="truncate">{t.editProfile}</span>
                </button>
                <div className="relative flex-1 min-w-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowCreativeMenu(!showCreativeMenu); }}
                    className="w-full px-2 sm:px-4 py-2 bg-gradient-to-tr from-emerald-500 via-yellow-400/70 to-rose-500 text-white rounded-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-tighter sm:tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={10} strokeWidth={3} className="sm:w-3 sm:h-3" /> <span className="truncate">{t.newCreativity || 'New Creativity'}</span>
                  </button>

                  <AnimatePresence>
                    {showCreativeMenu && (
                      <>
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowCreativeMenu(false)}
                          className="fixed inset-0 bg-[#050505]/95 backdrop-blur-md z-[1000]"
                        />
                        
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="fixed inset-0 flex flex-col items-center justify-center z-[1001] pointer-events-none"
                        >
                          {/* Radial Container */}
                          <div className="relative w-[320px] h-[320px] flex items-center justify-center pointer-events-auto">
                            {/* Orbit Paths */}
                            <div className="absolute inset-0 border border-white/5 rounded-full scale-[0.8]" />
                            <div className="absolute inset-0 border border-white/5 rounded-full" />
                            
                            {/* Central Selection Circle */}
                            <motion.div 
                              layoutId="centerCircle"
                              className={`absolute w-32 h-32 rounded-full bg-gradient-to-tr ${radialTools[focusedToolIndex].gradient} p-[2px] shadow-[0_0_50px_-10px] shadow-current transition-all duration-500`}
                              style={{ color: `var(--tw-gradient-to)` }}
                            >
                              <div className="w-full h-full rounded-full bg-[#0a0a0a] flex flex-col items-center justify-center text-center p-2">
                                <motion.div
                                  key={focusedToolIndex}
                                  initial={{ y: 10, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  className="flex flex-col items-center"
                                >
                                  {React.createElement(radialTools[focusedToolIndex].icon, { size: 32, className: "mb-2" })}
                                  <span className="text-[10px] font-black uppercase tracking-tighter text-white leading-none mb-1">
                                    {radialTools[focusedToolIndex].label}
                                  </span>
                                  <button 
                                    onClick={radialTools[focusedToolIndex].action}
                                    className="px-3 py-1 bg-white text-black rounded-full text-[8px] font-black uppercase tracking-widest mt-1 hover:scale-105 active:scale-95 transition-transform"
                                  >
                                    {t.enterNow || 'Enter Now'}
                                  </button>
                                </motion.div>
                              </div>
                            </motion.div>

                            {/* Orbiting Icons */}
                            {radialTools.map((tool, idx) => {
                              const angle = (idx * (360 / radialTools.length)) + (focusedToolIndex * -90);
                              const radius = 120;
                              const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
                              const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;
                              const isFocused = idx === focusedToolIndex;

                              return (
                                <motion.button
                                  key={tool.id}
                                  animate={{ 
                                    x, y, 
                                    scale: isFocused ? 0 : 1,
                                    opacity: isFocused ? 0 : 1
                                  }}
                                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                  onClick={() => setFocusedToolIndex(idx)}
                                  className={`absolute w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors`}
                                >
                                  {React.createElement(tool.icon, { size: 24 })}
                                </motion.button>
                              );
                            })}
                          </div>

                          {/* Info Panel */}
                          <motion.div 
                            key={`info-${focusedToolIndex}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-12 text-center max-w-xs px-6"
                          >
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                              {radialTools[focusedToolIndex].label}
                            </h3>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed">
                              {radialTools[focusedToolIndex].sub}
                            </p>
                          </motion.div>

                          {/* Close Button */}
                          <button 
                            onClick={() => setShowCreativeMenu(false)}
                            className="absolute bottom-12 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 pointer-events-auto"
                          >
                            <X size={24} />
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleFollowToggle(); }}
                  className={`flex-1 min-w-0 px-2 sm:px-5 py-2.5 rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-tighter sm:tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-lg whitespace-nowrap ${
                    isFollowing 
                    ? 'bg-white/10 text-white border border-white/10 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500' 
                    : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-500'
                  }`}
                >
                   {isFollowing && isFollower ? (
                     <><RefreshCcw size={10} strokeWidth={3} className="sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.mutualFollow || "Mutual"}</span></>
                   ) : isFollowing ? (
                     <><Check size={10} strokeWidth={3} className="sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.following}</span></>
                   ) : (
                     <><Plus size={10} strokeWidth={3} className="sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.follow}</span></>
                   )}
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); handleFriendRequest(); }}
                  className={`flex-1 min-w-0 px-2 sm:px-5 py-2.5 rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-tighter sm:tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-lg whitespace-nowrap ${
                    friendStatus === 'friend'
                    ? 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500'
                    : friendStatus === 'request_sent'
                    ? 'bg-white/10 text-white border border-white/10'
                    : friendStatus === 'request_received'
                    ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                    : 'bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  {friendStatus === 'friend' ? (
                    <><UserCheck size={10} className="sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.friends}</span></>
                  ) : friendStatus === 'request_sent' ? (
                    <><RefreshCcw size={10} className="animate-spin sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.request_sent || t.sentFriendRequest || "Request Sent"}</span></>
                  ) : friendStatus === 'request_received' ? (
                    <><UserPlus size={10} className="sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.acceptRequest || 'Accept Request'}</span></>
                  ) : (
                    <><UserPlus size={10} className="sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.addFriend}</span></>
                  )}
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); onChat?.(viewId); }}
                  className="flex-1 min-w-0 px-2 sm:px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[8px] sm:text-[10px] font-black text-white uppercase tracking-tighter sm:tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                >
                  <MessageSquare size={10} className="sm:w-3.5 sm:h-3.5" /> <span className="truncate">{t.messageAction || t.message || "Message"}</span>
                </button>

                {/* Watch Live Button */}
                {onWatchStream && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onWatchStream(viewId); }}
                    className="px-5 py-2.5 bg-rose-600 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-all flex items-center gap-2 animate-pulse"
                  >
                    <Play size={14} fill="white" /> {t.watchLive || 'Watch LIVE'}
                  </button>
                )}

                {/* Invite to Live Button */}
                {isLive && onInviteToLive && !isMe && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onInviteToLive(); }}
                    className="px-5 py-2.5 bg-purple-600 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition-all flex items-center gap-2 animate-pulse"
                  >
                    <UserPlus size={14} /> {t.inviteToLive || 'Invite to LIVE'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Highlights Section */}
          {highlights.length > 0 && (
            <div className="mt-8 overflow-x-auto no-scrollbar flex gap-4 pb-2">
              {highlights.map((h) => (
                <div key={h.id} className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-emerald-500 to-rose-500 shadow-lg">
                    <div className="w-full h-full rounded-full border-2 border-[#0a0c10] overflow-hidden">
                      <img src={normalizeMediaUrl(h.cover) || `https://picsum.photos/seed/${h.id}/200`} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={h.title} />
                    </div>
                  </div>
                  <span className="text-[8px] font-bold uppercase text-white/80 tracking-widest truncate w-16 text-center">{h.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative group shrink-0">
          {/* Avatar Rank & Frame Display - Exterior outer corner, only for Level > 0 */}
          {level > 0 && (
            <div className="absolute -top-3.5 -right-2 md:-top-4 md:-right-2 flex flex-col items-center z-30 pointer-events-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              <AvatarLevelBadge level={level} size={28} />
            </div>
          )}

          <div 
            onClick={(e) => { e.stopPropagation(); if(isMe) setShowPhotoMenu(true); }}
            className={`rounded-full transition-all duration-500 flex items-center justify-center relative overflow-hidden ${isMe ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${(() => {
                if (level === 0) return "border border-white/30";
                if (level <= 2) return "border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]";
                if (level <= 4) return "border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)]";
                return "border-2 border-cyan-300 shadow-[0_0_35px_rgba(164,245,255,0.7)] ring-1 ring-cyan-200/50";
            })()}`}
          >
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full bg-[#0a0c10] overflow-hidden relative">
              {(() => {
                const isPicAllowed = isMe || profilePicPrivacy === 'everyone' || (profilePicPrivacy === 'contacts' && (friendStatus === 'friend' || isFollower));
                const neutralInitials = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileName || 'User')}&backgroundColor=334155&fontColor=ffffff`;
                const finalPicSrc = isPicAllowed ? (normalizeMediaUrl(avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewId}`) : neutralInitials;
                return (
                  <img 
                    src={finalPicSrc} 
                    referrerPolicy="no-referrer" 
                    className="w-full h-full rounded-full object-cover" 
                    alt="" 
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = isPicAllowed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewId}` : neutralInitials;
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                );
              })()}
              {isMe && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera size={24} className="text-white" />
                </div>
              )}
            </div>
          </div>
          {isMe && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPhotoMenu(true); }}
              className="absolute bottom-0 right-0 w-9 h-9 flex items-center justify-center"
            >
              {/* Logic for state change needs check, but updating the plus button structure if it toggles */}
              <div className="relative w-full h-full flex items-center justify-center border border-white/80 rounded-full">
                <Plus size={24} strokeWidth={3} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]" />
                <Plus size={16} strokeWidth={2} className="absolute text-black" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid - Now Functional */}
      <div className="px-4 sm:px-8 space-y-4 sm:space-y-8">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full">
          {[
            { label: t.posts, value: displayPosts.length.toString(), color: 'text-rose-500', type: 'posts' as const },
            { label: t.followers, value: followersCount.toString(), color: 'text-yellow-400', type: 'followers' as const },
            { label: t.following, value: followingCount.toString(), color: 'text-emerald-500', type: 'following' as const },
            { label: t.totalLikes, value: (totalLikes + totalLiveLikes).toString(), color: 'text-rose-500', type: 'likes' as const }
          ].map(stat => (
            <button 
              key={stat.label} 
              onClick={(e) => { e.stopPropagation(); handleStatClick(stat.type); }}
              className="bg-white/5 py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center hover:bg-white/10 transition-all active:scale-95 border border-white/5 shadow-lg group relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${stat.color.split('-')[1]}-500 to-transparent opacity-50`}></div>
              <span className={`text-2xl font-black italic group-hover:scale-110 transition-transform ${stat.color}`}>{stat.value}</span>
              <span className="text-slate-500 uppercase tracking-[0.2em] text-[8px] font-black mt-2">{stat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Section */}
      <div className="px-4 sm:px-8 mt-6 sm:mt-10 mb-12 sm:mb-20" ref={galleryRef} id="gallery-section">
         <div className="flex items-center justify-between mb-4 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Videos Tab */}
              <button 
                onClick={() => handleTabChange('gallery')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeTab === 'gallery' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 scale-105 font-black' 
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5 font-bold'
                }`}
              >
                <Video size={13} />
                <span className="text-[10px] uppercase tracking-wider">
                  {t.videosTab || "Videos"} ({cachedVideos.length})
                </span>
              </button>

              {/* Photos Tab */}
              <button 
                onClick={() => handleTabChange('photos')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeTab === 'photos' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 scale-105 font-black' 
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5 font-bold'
                }`}
              >
                <ImageIcon size={13} />
                <span className="text-[10px] uppercase tracking-wider">
                  {t.photosTab || "Photos"} ({userPhotos.length})
                </span>
              </button>
              
              {isMe && (
                <div className="flex items-center gap-2 border-r border-white/10 pr-2">
                  {[
                    { id: 'archive', icon: <Clock size={13} />, label: t.archiveTab },
                    { id: 'saved', icon: <Bookmark size={13} />, label: t.savedTab },
                    { id: 'liked', icon: <Heart size={13} />, label: t.likedTab }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        activeTab === tab.id 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105 font-black' 
                        : 'text-white/30 hover:text-white/60 hover:bg-white/5 font-bold'
                      }`}
                    >
                      {tab.icon}
                      <span className="text-[9px] uppercase tracking-wider hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-10 h-[1px] bg-white/10"></div>
         </div>

         {!isMe && isAccountPrivate && !isFollower && friendStatus !== 'friend' ? (
           <div className="py-20 flex flex-col items-center justify-center text-center p-8 bg-zinc-900/80 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 my-6 max-w-md mx-auto">
             <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/20 shadow-inner">
               <Lock size={36} />
             </div>
             <h3 className="text-lg font-black text-white mb-2">{t.privateAccountTitle || 'This account is private'}</h3>
             <p className="text-xs text-slate-400 leading-relaxed mb-6">
               {t.privateAccountDesc || 'This user has restricted access to their content. Follow this account to see their photos and videos.'}
             </p>
             <button 
               onClick={handleFollowToggle}
               className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
             >
               <UserPlus size={16} />
               <span>{isFollowing ? (t.unfollowAction || 'Unfollow') : (t.followAction || 'Follow')}</span>
             </button>
           </div>
         ) : isLoadingTabs ? (
           <div className="py-20 flex flex-col items-center justify-center">
             <RefreshCcw size={32} className="text-emerald-500 animate-spin mb-4" />
             <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t.loadingContent || 'Loading content...'}</p>
           </div>
         ) : activeTab === 'photos' ? (
           /* PHOTOS GRID VIEW */
           userPhotos.length > 0 ? (
             <div className="grid grid-cols-3 gap-1.5 sm:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {userPhotos.map((photo) => (
                 <div
                   key={photo.id}
                   onClick={() => {
                     setActivePhotoLightbox(photo);
                     setLightboxImgIndex(0);
                   }}
                   className="aspect-[3/4] rounded-2xl md:rounded-[2.5rem] overflow-hidden relative group cursor-pointer border border-white/5 shadow-2xl transition-all hover:scale-[1.02] bg-[#10141f]"
                 >
                   <img
                     src={normalizeMediaUrl(photo.images && photo.images[0] ? photo.images[0] : '') || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&auto=format&fit=crop&q=80'}
                     alt={photo.desc || 'photo'}
                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                     onError={(e) => {
                       const target = e.currentTarget;
                       const originalUrl = photo.images && photo.images[0] ? photo.images[0] : '';
                       if (!(target as any)._hasTriedProxy && originalUrl) {
                         (target as any)._hasTriedProxy = true;
                         target.src = getMediaProxyUrl(originalUrl);
                       } else if (!(target as any)._hasTriedFallback) {
                         (target as any)._hasTriedFallback = true;
                         target.src = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&auto=format&fit=crop&q=80';
                       }
                     }}
                   />

                   {/* Multi-image indicator badge */}
                   {photo.images.length > 1 && (
                     <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center gap-1 text-[9px] font-black">
                       <Layers size={10} className="text-emerald-400" />
                       <span>{photo.images.length}</span>
                     </div>
                   )}

                   {/* Star badge if post has stars */}
                   {(photo.stars || 0) > 0 && (
                     <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-black flex items-center gap-0.5 text-[9px] font-black shadow-lg">
                       <Star size={9} className="fill-black text-black" />
                       <span>{photo.stars}</span>
                     </div>
                   )}

                   {/* Bottom details overlay on hover */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                     <p className="text-[10px] text-white/90 line-clamp-1 font-bold mb-1.5">{photo.desc}</p>
                     <div className="flex items-center justify-between text-white text-[10px] font-black">
                       <div className="flex items-center gap-1">
                         <Heart size={11} className="fill-rose-500 text-rose-500" />
                         <span>{photo.likes || 0}</span>
                       </div>
                       <div className="flex items-center gap-1">
                         <MessageSquare size={11} />
                         <span>{photo.commentsCount || 0}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="py-20 flex flex-col items-center justify-center text-center text-slate-600 animate-in fade-in duration-700">
               <ImageIcon size={48} className="mb-4 opacity-20" />
               <p className="text-[10px] uppercase tracking-[0.2em] font-black">{t.noPhotosYet}</p>
               <span className="text-[8px] mt-2 opacity-40">{t.noPhotosDesc}</span>
             </div>
           )
         ) : displayPosts.length > 0 ? (
           <div className={`${activeTab === 'archive' ? 'flex flex-wrap gap-y-2 gap-x-1 justify-start' : 'grid grid-cols-3 gap-1.5 sm:gap-3'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {displayPosts.map((post: VideoItem, index: number) => (
                 <div 
                   key={post.id} 
                   onClick={(e) => { e.stopPropagation(); setSelectedPost(index); }}
                   onPointerDown={(e) => {
                     if (!isMe) return;
                     const timer = setTimeout(() => handlePinVideo(post), 800);
                     setLongPressTimer(timer);
                   }}
                   onPointerUp={() => {
                     if (longPressTimer) {
                       clearTimeout(longPressTimer);
                       setLongPressTimer(null);
                     }
                   }}
                   onPointerLeave={() => {
                     if (longPressTimer) {
                       clearTimeout(longPressTimer);
                       setLongPressTimer(null);
                     }
                   }}
                   className={activeTab === 'archive' ? 'w-[calc(25%-8px)] flex flex-col items-center gap-1' : "aspect-[3/4] rounded-2xl md:rounded-[2.5rem] overflow-hidden relative group cursor-pointer border border-white/5 shadow-2xl transition-all hover:translate-y-[-5px]"}
                 >
                   {activeTab === 'archive' ? (
                     <div className="relative group cursor-pointer">
                       <div className="w-[100px] h-[100px] rounded-full p-[2.5px] bg-gradient-to-tr from-emerald-500 via-rose-500 to-yellow-500 transition-transform group-hover:scale-110 shadow-lg shadow-emerald-500/10">
                         <div className="w-full h-full rounded-full bg-[#0a0c10] p-[2px] overflow-hidden">
                           <video 
                             src={normalizeMediaUrl(post.url)}
                             className="w-full h-full rounded-full object-cover"
                             muted
                             playsInline
                             preload="metadata"
                           />
                         </div>
                       </div>
                       <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Play size={24} className="text-white fill-white" />
                       </div>
                       <div className="mt-2 flex flex-col items-center text-center">
                         <span className="text-[10px] text-white font-black italic tracking-wider">
                           {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }) : t.previousDate}
                         </span>
                       </div>
                     </div>
                   ) : (
                     <>
                        <div className="w-full h-full relative bg-[#10141f] flex items-center justify-center overflow-hidden">
                          {(() => {
                            const videoPoster = (post as any).thumbnailUrl || (post as any).poster || (post as any).cover || (post as any).imageUrl || (post as any).coverUrl;
                            if (videoPoster) {
                              return (
                                <img 
                                  src={normalizeMediaUrl(videoPoster)} 
                                  className="w-full h-full object-cover absolute inset-0 z-20"
                                  alt="Video thumbnail"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              );
                            }
                            return null;
                          })()}

                          {post.url ? (
                            <video 
                              src={`${normalizeMediaUrl(post.url)}#t=0.001`} 
                              className="w-full h-full object-cover bg-transparent absolute inset-0 z-10" 
                              muted 
                              playsInline
                              crossOrigin="anonymous"
                              preload="metadata"
                              onError={(e) => {
                                const video = e.currentTarget;
                                if (video.getAttribute('crossOrigin')) {
                                  video.removeAttribute('crossOrigin');
                                  video.load();
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-zinc-800 flex items-center justify-center">
                              <Video size={28} className="text-white/20" />
                            </div>
                          )}

                          {/* Center play icon overlay on hover */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30">
                            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                              <Play size={18} className="text-white fill-white ml-0.5" />
                            </div>
                          </div>

                          {/* Gradient bottom bar for clarity */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none z-30" />
                        </div>
                        
                        {post.isPinned && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 rounded-lg text-white z-50 shadow-lg flex items-center gap-1">
                            <span className="text-[10px] font-black uppercase tracking-widest">{t.pinnedBadge}</span>
                            <Pin size={10} fill="currentColor" />
                          </div>
                        )}

                        {(post.isStarred || activeTab === 'starred') && (
                          <div className="absolute top-2 left-2 p-1.5 bg-yellow-500 rounded-full text-white z-50 shadow-lg">
                            <Star size={12} fill="currentColor" />
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-white text-[10px] font-bold bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <div className="flex items-center gap-1">
                            <Eye size={10} />
                            <span>{post.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart size={10} />
                            <span>{post.likes || 0}</span>
                          </div>
                        </div>
                        {isMe && (
                          <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white/80 z-10 border border-white/10">
                            {(post.visibility || post.privacy || 'public') === 'private' && <Lock size={12} />}
                            {(post.visibility || post.privacy || 'public') === 'public' && <Globe size={12} />}
                            {(post.visibility || post.privacy || 'public') === 'friends' && <Users size={12} />}
                          </div>
                        )}
                        {isMe && onDeleteVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVideoToDelete(post);
                            }}
                            className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-rose-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {post.isUploading && !post.error && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2" />
                            <span className="text-white text-[10px] font-bold mb-2">{t.uploading}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onCancelUpload) onCancelUpload(post);
                              }}
                              className="bg-rose-500 text-white text-[10px] px-3 py-1 rounded-full font-bold"
                            >
                              {t.cancel || 'Cancel'}
                            </button>
                          </div>
                        )}
                        {post.error && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2 text-center">
                            <span className="text-rose-500 text-[10px] font-bold mb-2">{t.uploadFailed || 'Upload failed'}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRetryUpload) onRetryUpload(post);
                              }}
                              className="bg-rose-500 text-white text-[10px] px-3 py-1 rounded-full font-bold"
                            >
                              {t.retry || 'Retry'}
                            </button>
                          </div>
                        )}
                        {!post.isUploading && !post.error && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play size={16} fill="white" className="text-white drop-shadow-md" />
                            </div>
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                               <div className="flex items-center gap-2">
                                  <div className="flex flex-col items-center">
                                      <Heart size={12} className="text-rose-500 fill-current" />
                                      <span className="text-[8px] font-black italic">{post.likes}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                      <MessageSquare size={12} className="text-white fill-current" fillOpacity={0.2} />
                                      <span className="text-[8px] font-black italic">{post.commentsCount || 0}</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                      <Bookmark size={12} className="text-yellow-400 fill-current" />
                                      <span className="text-[8px] font-black italic">{post.saves || 0}</span>
                                  </div>
                               </div>
                            </div>
                          </>
                        )}
                     </>
                   )}
                 </div>
              ))}
           </div>
         ) : (
           <div className="py-20 flex flex-col items-center justify-center text-slate-600 animate-in fade-in duration-700">
             {activeTab === 'gallery' && <ImageIcon size={48} className="mb-4 opacity-20" />}
             {activeTab === 'archive' && <Clock size={48} className="mb-4 opacity-20" />}
             {activeTab === 'saved' && <Bookmark size={48} className="mb-4 opacity-20" />}
             {activeTab === 'liked' && <Heart size={48} className="mb-4 opacity-20" />}
             
             <p className="text-[10px] uppercase tracking-[0.2em] font-black">
               {activeTab === 'gallery' && (t.noPublicPosts || 'No public posts')}
               {activeTab === 'archive' && (t.storiesArchiveEmpty || 'Stories archive is empty')}
               {activeTab === 'saved' && (t.noSavedVideosYet || 'No saved videos yet')}
               {activeTab === 'liked' && (t.noLikedContentYet || 'No liked content yet')}
             </p>
             <span className="text-[8px] mt-2 opacity-40">
               {activeTab === 'archive' && (t.storiesArchiveDesc || 'Stories you post will appear here')}
               {activeTab === 'saved' && (t.savedVideosDesc || "Click the save icon on the main feed")}
               {activeTab === 'liked' && (t.likedVideosDesc || 'Videos you like will be collected here')}
             </span>
           </div>
         )}
      </div>

      {/* Modals & Overlays */}
      
      {/* 1. Photo Menu */}
      {showPhotoMenu && (
        <div className="absolute inset-0 z-[250] bg-black/80 backdrop-blur-xl flex items-end" onClick={() => setShowPhotoMenu(false)}>
           <div className="w-full bg-[#0d1117] rounded-t-[3.5rem] p-12 border-t border-white/10 animate-in slide-in-from-bottom duration-500 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowPhotoMenu(false)} className="absolute top-6 left-6 p-2 text-white/40 hover:text-white transition-all active:scale-75">
                <X size={24} />
              </button>
              <div className="grid grid-cols-2 gap-8 mt-4">
                 <button onClick={startCamera} className="flex flex-col items-center gap-6 p-10 bg-white/[0.03] border border-white/5 rounded-[3rem] hover:bg-emerald-500/10 transition-all group">
                    <Camera size={40} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest italic">{t.capturePhoto || 'Capture'}</span>
                 </button>
                 <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-6 p-10 bg-white/[0.03] border border-white/5 rounded-[3rem] hover:bg-emerald-500/10 transition-all group">
                    <ImageIcon size={40} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest italic">{t.studioGallery || 'Gallery'}</span>
                 </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
           </div>
        </div>
      )}

      {/* 2. Image Editor (Interactive Crop) */}
      {editingImage && (
        <div className="absolute inset-0 z-[400] bg-[#0a0c10] flex flex-col items-center justify-between p-8 animate-in zoom-in-95 duration-500">
           <div className="w-full flex justify-between items-center mb-6">
              <button onClick={() => setEditingImage(null)} className="p-4 bg-white/5 rounded-2xl text-slate-400"><ArrowRight size={20} /></button>
              <div className="text-center">
                 <h3 className="text-xs font-black uppercase tracking-widest italic text-rose-500">{t.photoEditor || 'Photo Editor'}</h3>
                 <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t.photoEditorHint || "Drag to move | Pinch to zoom"}</span>
              </div>
              <div className="w-12"></div>
           </div>

           {/* Interactive Crop Area */}
           <div 
             className="relative w-72 h-72 md:w-96 md:h-96 touch-none select-none cursor-move"
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onPointerLeave={handlePointerUp}
           >
              {/* Mask/Frame */}
              <div className="absolute inset-0 rounded-full border-[6px] border-white/10 shadow-2xl z-20 pointer-events-none ring-1 ring-white/20"></div>
              
              {/* Image Container with transformations */}
              <div className="w-full h-full rounded-full overflow-hidden relative bg-[#0a0c10]">
                 <img 
                    ref={imagePreviewRef}
                    src={normalizeMediaUrl(editingImage)} 
                    className="absolute w-full h-full object-contain origin-center pointer-events-none transition-transform duration-75 ease-linear"
                    style={{ 
                        transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.zoom})`,
                        top: '0',
                        left: '0',
                        filter: selectedFilter.filter 
                    }} 
                    alt="Preview" 
                 />
              </div>

              {/* Grid Overlay for Guide */}
              <div className="absolute inset-0 rounded-full z-20 pointer-events-none opacity-20">
                  <div className="absolute top-1/3 w-full h-[1px] bg-white"></div>
                  <div className="absolute top-2/3 w-full h-[1px] bg-white"></div>
                  <div className="absolute left-1/3 h-full w-[1px] bg-white"></div>
                  <div className="absolute left-2/3 h-full w-[1px] bg-white"></div>
              </div>

              {/* Pan Indicator */}
              <div className="absolute bottom-4 right-4 z-30 bg-black/50 p-2 rounded-full pointer-events-none animate-pulse">
                 <Move size={16} className="text-white" />
              </div>
           </div>

           {/* Zoom Control */}
           <div className="w-full px-8 mt-6">
              <div className="flex items-center gap-4 text-slate-400">
                  <ZoomIn size={16} />
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="0.05"
                    value={crop.zoom} 
                    onChange={(e) => setCrop(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-bold w-8">{crop.zoom.toFixed(1)}x</span>
              </div>
           </div>

           <div className="w-full mt-6 space-y-8 bg-white/[0.02] p-6 rounded-[3rem] border border-white/5">
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                  {FILTERS.map(f => (
                    <button key={f.id} onClick={() => setSelectedFilter(f)} className={`shrink-0 flex flex-col items-center gap-3 p-4 rounded-[2.5rem] border transition-all ${selectedFilter.id === f.id ? 'bg-emerald-600 border-emerald-400 scale-110 shadow-xl' : 'bg-black/40 border-white/5 opacity-60'}`}>
                        <div className="w-12 h-12 rounded-[1.2rem] overflow-hidden border border-white/10">
                           <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${editingImage})`, filter: f.filter }}></div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">{f.name}</span>
                    </button>
                  ))}
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setEditingImage(null)} className="flex-1 py-5 bg-slate-900/50 text-slate-500 rounded-[2rem] font-black text-xs">{t.cancel || "Cancel"}</button>
                 <button onClick={saveProfilePicture} disabled={isUploading} className="flex-[2] py-5 bg-emerald-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl">
                   {isUploading ? <Loader2 className="animate-spin" /> : <>{t.saveIdentity || 'Save Avatar'} <Check size={20} strokeWidth={4} /></>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 3. Video Player Overlay */}
      {selectedPost !== null && (
        <AnimatePresence>
          {(displayPosts[selectedPost]?.target === 'story' || displayPosts[selectedPost]?.target === 'both') ? (
            <StoryViewer 
                activeStory={displayPosts[selectedPost]}
                stories={cachedVideos.filter(v => {
                    const isStory = v.target === 'story' || v.target === 'both';
                    if (!isStory) return false;
                    
                    const getCreatedAtTime = (createdAt: any): number => {
                        if (!createdAt) return 0;
                        if (createdAt.toDate && typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
                        if (createdAt.toMillis && typeof createdAt.toMillis === 'function') return createdAt.toMillis();
                        if (createdAt.seconds) return createdAt.seconds * 1000;
                        if (typeof createdAt === 'number') return createdAt;
                        return new Date(createdAt).getTime();
                    };
                    const createdAtTime = getCreatedAtTime(v.createdAt);
                    
                    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
                    const isExpired = (Date.now() - createdAtTime) > expirationTime;
                    return !isExpired;
                })}
                myId={myId}
                setActiveStory={(story) => {
                    setActiveStory?.(story);
                    if (story) {
                        const newIndex = displayPosts.findIndex(p => p.id === story.id);
                        if (newIndex !== -1) setSelectedPost(newIndex);
                    } else {
                        setSelectedPost(null);
                    }
                }}
                onCreateStory={isMe ? onPost : undefined}
                onGoToProfile={(uid) => {
                    setViewId(uid);
                    setSelectedPost(null);
                }}
            />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-black"
            >
              <div ref={swipableContainerRef} className="relative h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar">
                {displayPosts.map((post, index) => (
                  <div key={post.id} className="h-full w-full snap-start relative">
                    <FeedItem 
                        vid={post}
                        isUiVisible={isPlayerUiVisible}
                        onProfileClick={() => { setViewId(post.userId); setSelectedPost(null); }}
                        onCommentClick={() => { /* handleComment */ }}
                        onShareClick={() => handleShareVideo(post)}
                        onGiftClick={() => { /* handleGift */ }}
                        onOptionsClick={() => { /* handleOptions */ }}
                        onToggleUi={() => setIsPlayerUiVisible(!isPlayerUiVisible)}
                        myId={myId}
                        myProfile={myProfile}
                    >
                        {/* Management Buttons: Only for owner */}
                        {post.userId === auth.currentUser?.uid && (
                          <div className="absolute top-8 right-6 z-[1010] flex gap-2">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleStarVideo(post);
                              }}
                              className={`p-3 backdrop-blur-md rounded-full transition-all border border-white/10 ${post.isStarred ? 'bg-yellow-500 text-white' : 'bg-black/40 text-white/80 hover:bg-yellow-500/50'}`}
                              title={t.starPost || 'Featured Star'}
                            >
                              <Star size={20} className={post.isStarred ? "fill-white" : ""} />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handlePinVideo(post);
                              }}
                              className={`p-3 backdrop-blur-md rounded-full transition-all border border-white/10 ${post.isPinned ? 'bg-emerald-500 text-white' : 'bg-black/40 text-white/80 hover:bg-emerald-500/50'}`}
                              title={t.pinPost || 'Pin Video'}
                            >
                              <Pin size={20} className={post.isPinned ? "fill-white" : ""} />
                            </button>
                            <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 mr-2">
                              {[
                                { id: 'public', icon: <Globe size={16} /> },
                                { id: 'friends', icon: <Users size={16} /> },
                                { id: 'private', icon: <Lock size={16} /> }
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateVideoPrivacy(post.id, opt.id as any);
                                  }}
                                  className={`p-2 rounded-full transition-all ${
                                    (post.visibility || post.privacy || 'public') === opt.id
                                       ? 'bg-emerald-500 text-white shadow-lg'
                                       : 'text-white/40 hover:text-white'
                                  }`}
                                >
                                  {opt.icon}
                                </button>
                              ))}
                            </div>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setVideoToDelete(post);
                              }} 
                              className="p-3 bg-rose-500/80 backdrop-blur-md rounded-full text-white hover:bg-rose-600 border border-white/10"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        )}
                    </FeedItem>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="absolute top-8 left-6 z-[1001] p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20"
              >
                <ChevronLeft size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Smart Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#151619] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-8">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Smart Share</h3>
                  <button onClick={() => setShowShareModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                {/* QR Code Section */}
                <div className="relative p-6 bg-white rounded-[2rem] shadow-2xl mb-8 group">
                  <QRCodeSVG 
                    value={`${window.location.origin}/profile/${viewId}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: avatarUrl,
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-rose-500/20 rounded-[2rem] pointer-events-none" />
                </div>

                <p className="text-lg font-black italic text-white mb-2 uppercase tracking-tight">{profileName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">@{viewId.slice(0, 8)}</p>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={handleCopyProfileLink}
                    className="flex flex-col items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <Copy size={20} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">{t.copyLink || 'Copy Link'}</span>
                  </button>

                  <button 
                    onClick={handleSmartShare}
                    className="flex flex-col items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                      <SendIcon size={20} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">{t.sendTo || 'Send To...'}</span>
                  </button>

                  <button 
                    onClick={() => setShowScanner(true)}
                    className="flex flex-col items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group col-span-2"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-rose-500 text-white group-hover:scale-110 transition-transform">
                      <Scan size={20} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">Scanner</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black">
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <video 
                ref={scannerVideoRef} 
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                muted
                playsInline
              />
              <canvas ref={scannerCanvasRef} className="hidden" />
              
              <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-10">
                <button onClick={() => setShowScanner(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white">
                  <X size={24} />
                </button>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Scan QR Code</h3>
                <div className="w-12" />
              </div>

              <div className="w-48 h-48 border-2 border-emerald-500 rounded-[2rem] relative overflow-hidden z-10">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-scan" />
              </div>

              <p className="mt-8 text-[10px] text-white/80 uppercase tracking-[0.2em] font-black z-10 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                {t.scanQrCode || 'Point camera at QR code'}
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Edit Profile Modal */}
      {showEditProfileModal && myProfile && (
        <EditProfileModal 
          lang={lang}
          currentUser={myProfile as UserType}
          onSave={handleSaveProfile}
          onClose={() => setShowEditProfileModal(false)}
        />
      )}

      {/* 5. Lists Modal (Followers/Following) */}
      {activeList && (
        <ListViewModal
          lang={lang}
          title={activeList.title}
          list={activeList.data}
          onClose={() => setActiveList(null)}
          onItemClick={(item) => {
            setViewId(item.id);
            setActiveList(null);
          }}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
      {/* 6. Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a1d24] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">{t.deleteVideoTitle || 'Delete Video'}</h3>
              <p className="text-sm text-slate-400">
                {t.deleteVideoPrompt || 'Are you sure you want to permanently delete this video?'}
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setVideoToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
              >
                {t.cancel || 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  if (onDeleteVideo) {
                    onDeleteVideo(videoToDelete);
                  }
                  if (selectedPost !== null && displayPosts[selectedPost]?.id === videoToDelete.id) {
                    setSelectedPost(null);
                  }
                  setVideoToDelete(null);
                }}
                className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                {t.delete || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Phone Verification Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowVerifyModal(false)}
                className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-orange-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">{t.verifyPhoneTitle || 'Verify Phone Number'}</h3>
                <p className="text-slate-400 text-xs">
                  {confirmationResult ? (t.verifyCodeSentTo ? t.verifyCodeSentTo.replace('{phone}', profilePhone) : `Enter code sent to ${profilePhone}`) : (t.verifyCodeWillBeSentTo ? t.verifyCodeWillBeSentTo.replace('{phone}', profilePhone) : `Verification code will be sent to ${profilePhone}`)}
                </p>
              </div>

              <div className="space-y-6">
                {confirmationResult && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pr-2">{t.verificationCodeLabel || 'Verification Code'}</label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-2xl font-black tracking-[0.5em] focus:border-orange-500/50 outline-none transition-all"
                      placeholder="000000"
                    />
                  </div>
                )}

                {verifyError && (
                  <p className="text-rose-500 text-[10px] font-bold text-center">{verifyError}</p>
                )}

                <button 
                  onClick={confirmationResult ? confirmCode : startPhoneVerification}
                  disabled={verifyLoading}
                  className="w-full py-4 bg-orange-500 rounded-2xl font-black text-black hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {verifyLoading ? <Loader2 className="animate-spin" size={20} /> : (confirmationResult ? (t.confirmVerificationCode || 'Confirm Code') : (t.sendVerificationCode || 'Send Code'))}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox Modal */}
      <AnimatePresence>
        {activePhotoLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col justify-between"
            onClick={() => setActivePhotoLightbox(null)}
          >
            {/* Top Bar */}
            <div className="p-4 flex items-center justify-between z-20" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                {(() => {
                  const creatorId = activePhotoLightbox.userId || viewId;
                  const creatorObj = users[creatorId];
                  const resolvedAvatar = creatorObj?.avatarUrl || creatorObj?.avatar || activePhotoLightbox.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorId}`;
                  return (
                    <img
                      src={normalizeMediaUrl(resolvedAvatar)}
                      alt={activePhotoLightbox.user}
                      className="w-10 h-10 rounded-full object-cover border border-white/20 bg-slate-900"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorId}`;
                      }}
                    />
                  );
                })()}
                <div>
                  <h4 className="text-white text-sm font-black">{activePhotoLightbox.user}</h4>
                  {activePhotoLightbox.location && (
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <MapPin size={11} className="text-rose-400" />
                      <span>{activePhotoLightbox.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActivePhotoLightbox(null)}
                className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Image Stage */}
            <div 
              className="relative flex-1 flex items-center justify-center p-4 max-h-[75vh]"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={normalizeMediaUrl(activePhotoLightbox.images[lightboxImgIndex] || activePhotoLightbox.images[0]) || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&auto=format&fit=crop&q=80'}
                alt={activePhotoLightbox.desc || 'photo'}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl select-none"
                onError={(e) => {
                  const target = e.currentTarget;
                  const rawUrl = activePhotoLightbox.images[lightboxImgIndex] || activePhotoLightbox.images[0] || '';
                  if (!(target as any)._hasTriedProxy && rawUrl) {
                    (target as any)._hasTriedProxy = true;
                    target.src = getMediaProxyUrl(rawUrl);
                  } else if (!(target as any)._hasTriedFallback) {
                    (target as any)._hasTriedFallback = true;
                    target.src = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&auto=format&fit=crop&q=80';
                  }
                }}
              />

              {/* Navigation Chevrons if multi-image */}
              {activePhotoLightbox.images.length > 1 && (
                <>
                  {lightboxImgIndex > 0 && (
                    <button
                      onClick={() => setLightboxImgIndex(prev => Math.max(0, prev - 1))}
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all border border-white/10 cursor-pointer shadow-lg"
                    >
                      <ChevronRight size={22} />
                    </button>
                  )}

                  {lightboxImgIndex < activePhotoLightbox.images.length - 1 && (
                    <button
                      onClick={() => setLightboxImgIndex(prev => Math.min(activePhotoLightbox.images.length - 1, prev + 1))}
                      className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all border border-white/10 cursor-pointer shadow-lg"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}

                  {/* Dots Indicator */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                    {activePhotoLightbox.images.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={() => setLightboxImgIndex(dotIdx)}
                        className={`transition-all rounded-full ${
                          dotIdx === lightboxImgIndex ? 'w-5 h-2 bg-emerald-400' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Bar: Description & Tags */}
            <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20" onClick={e => e.stopPropagation()}>
              <div className="max-w-2xl mx-auto space-y-2">
                <p className="text-white text-sm font-medium leading-relaxed">{activePhotoLightbox.desc}</p>
                {activePhotoLightbox.tags && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activePhotoLightbox.tags.map((tag, idx) => (
                      <span key={idx} className="text-emerald-400 text-xs font-black">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-6 pt-2 text-slate-300 text-xs font-bold border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Heart size={15} className="fill-rose-500 text-rose-500" />
                    <span>{activePhotoLightbox.likes || 0} {t.likesCountLabel || 'Likes'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={15} className="text-slate-300" />
                    <span>{activePhotoLightbox.commentsCount || 0} {t.commentsCountLabel || 'Comments'}</span>
                  </div>
                  {(activePhotoLightbox.stars || 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Star size={15} className="fill-amber-400 text-amber-400" />
                      <span>{activePhotoLightbox.stars} {t.goldenStarsCountLabel || 'Gold Stars'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={recaptchaRef} id="recaptcha-container"></div>
    </div>
  </>
);
};

export default ProfileView;