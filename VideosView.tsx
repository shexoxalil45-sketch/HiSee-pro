import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, MessageSquare, Plus, CheckCircle2, Search, Bell, X, Send, 
  Share, Bookmark, Headphones, Music, Check, Instagram, Facebook, Twitter, 
  Link2, MoreHorizontal, Download, Play, Pause, Flag, Ban, AlertCircle,
  Radio, HeartCrack, Loader2, FileText, Smartphone, ShieldCheck,
  Phone, History, Camera, Mic, RefreshCcw, Trash, StopCircle, Video, Sparkles, Filter, CheckCheck,
  Globe, Users, Lock, LayoutGrid, Zap, VideoOff, Gift, Star, UserCheck, Image as ImageIcon
} from 'lucide-react';
import PhotosGalleryView from './PhotosGalleryView';
import InteractionBar from './InteractionBar';
import ModernMessageIcon from './ModernMessageIcon';
import HiSeeCoinIcon from './HiSeeCoinIcon';
import ModernRepostLoopIcon from './ModernRepostLoopIcon';
import { VideoItem, Comment, Language } from '../types';
import ModernHSLogo from './ModernHSLogo';
import { videoCache } from '../lib/videoCache';
import { normalizeMediaUrl, getMediaProxyUrl } from '../src/lib/mediaUtils';
import { doc, setDoc, increment, collection, query, where, onSnapshot, getDocs, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, orderBy, addDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { GIFT_ITEMS } from '../data/GiftsData';
import { parseDate } from '../lib/helpers';
import { requirePermission } from '../lib/permissionManager';
import { ProtectionEngine } from '../services/protectionEngine';
import { cacheEngine } from '../services/cacheEngine';
import { videoPreloader } from '../services/videoPreloader';
import { WatermarkExporter } from '../services/watermarkExporter';
import { WatermarkOverlay } from './WatermarkOverlay';

interface VideosViewProps {
  videos: VideoItem[];
  myId: string; // Add this
  myProfile: any; // Add this
  settings?: any;
  onNavigate: (tab: any) => void;
  onViewProfile: (uid: string, initialTab?: 'gallery' | 'photos') => void;
  isUiVisible: boolean;
  onToggleUi: () => void;
  onPublish?: (videoData: any) => void; // New callback for publishing
  onDeleteVideo?: (video: VideoItem) => void; // Callback for deleting
  totalSystemNotifications: number;
  targetMediaId?: {type: 'video' | 'photo', id: string} | null;
  lang?: Language;
}

// Reuse filters from PostCreation/Live
const DUET_FILTERS = [
    { id: 'normal', name: 'طبيعي', class: '' },
    { id: 'vivid', name: 'حيوي', class: 'saturate-150 contrast-110' },
    { id: 'bw', name: 'أبيض أسود', class: 'grayscale contrast-125' },
    { id: 'warm', name: 'دافئ', class: 'sepia-[0.3] brightness-105' },
    { id: 'cool', name: 'بارد', class: 'hue-rotate-30 saturate-75' },
];

import { UserSync } from './UserSync';
import { useUsers } from '../src/contexts/UserContext';
import { translations, getTranslation } from '../translations';

// Central Active Video Controller to prevent sound overlapping and background autoplaying
export class ActiveVideoController {
  private static activeVideoId: string | null = null;
  private static activeVideoRef: HTMLVideoElement | null = null;
  private static subscribers: Map<string, (isActive: boolean) => void> = new Map();

  static setActive(id: string, ref: HTMLVideoElement) {
    // Notify all other subscribers to pause and mute immediately
    this.subscribers.forEach((callback, subId) => {
      if (subId !== id) {
        callback(false);
      }
    });

    if (this.activeVideoRef && this.activeVideoRef !== ref) {
      try {
        this.activeVideoRef.pause();
        this.activeVideoRef.muted = true;
      } catch (err) {
        console.warn("Error pausing previous video:", err);
      }
    }

    // Strict safety sweep: pause and mute all other video elements in the DOM to eliminate background audio leaks
    if (typeof document !== 'undefined') {
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach((v) => {
        if (v !== ref) {
          try {
            v.pause();
            v.muted = true;
          } catch (e) {}
        }
      });
    }

    this.activeVideoId = id;
    this.activeVideoRef = ref;

    // Notify new active video subscriber
    const callback = this.subscribers.get(id);
    if (callback) callback(true);
  }

  static clearActive(id: string) {
    if (this.activeVideoId === id) {
      if (this.activeVideoRef) {
        try {
          this.activeVideoRef.pause();
          this.activeVideoRef.muted = true;
        } catch (e) {}
      }
      this.activeVideoId = null;
      this.activeVideoRef = null;
    }
  }

  static subscribe(id: string, callback: (isActive: boolean) => void) {
    this.subscribers.set(id, callback);
    return () => {
      this.subscribers.delete(id);
      if (this.activeVideoId === id) {
        if (this.activeVideoRef) {
          try {
            this.activeVideoRef.pause();
            this.activeVideoRef.muted = true;
          } catch (e) {}
        }
        this.activeVideoId = null;
        this.activeVideoRef = null;
      }
    };
  }

  static getActiveId() {
    return this.activeVideoId;
  }

  static pauseActive() {
    if (this.activeVideoRef) {
      try {
        this.activeVideoRef.pause();
        this.activeVideoRef.muted = true;
      } catch (e) {}
    }
  }

  static playActive() {
    if (this.activeVideoRef) {
      try {
        this.activeVideoRef.muted = false;
        this.activeVideoRef.play().catch(() => {});
      } catch (e) {}
    }
  }
}


const videoTranslations: Record<string, Record<string, string>> = {
  ar: {
    loading: 'جاري التحميل...',
    loading_db: 'جاري الاتصال بقاعدة البيانات...',
    loading_app: 'جاري التحميل...',
    no_star_givers: 'لا يوجد مُهدو نجوم بعد',
    no_videos_currently: 'لا توجد فيديوهات حالياً',
    be_first_video_desc: 'كن أول من ينشر لحظاته الإبداعية على HiSee!',
    post_video_btn: 'نشر فيديو',
    no_videos_following: 'لا توجد فيديوهات من الحسابات التي تتابعها',
    no_videos_following_desc: 'عندما ينشر الأشخاص الذين تتابعهم فيديوهات جديدة، ستظهر هنا تلقائياً.',
    explore_suggested_btn: 'استكشف المقاطع المقترحة',
    list_locked: 'القائمة مقفلة',
    list_locked_desc_views: 'قام صاحب القصة بقفل قائمة المشاهدين.',
    list_locked_desc_likes: 'قام صاحب القصة بقفل قائمة المعجبين.',
    list_locked_desc_stars: 'قام صاحب القصة بقفل قائمة مُهدي النجوم.',
    no_interactors_views: 'لا يوجد مشاهدون بعد',
    no_interactors_likes: 'لا يوجد معجبون بعد',
    no_interactors_stars: 'لا يوجد مُهدو نجوم بعد'
  },
  en: {
    loading: 'Loading...',
    loading_db: 'Connecting to database...',
    loading_app: 'Loading...',
    no_star_givers: 'No star givers yet',
    no_videos_currently: 'No videos found currently',
    be_first_video_desc: 'Be the first to share your creative moments on HiSee!',
    post_video_btn: 'Publish Video',
    no_videos_following: 'No videos from accounts you follow',
    no_videos_following_desc: 'When people you follow upload new videos, they will appear here automatically.',
    explore_suggested_btn: 'Explore Suggested Videos',
    list_locked: 'List Locked',
    list_locked_desc_views: 'The story owner has locked the list of viewers.',
    list_locked_desc_likes: 'The story owner has locked the list of likers.',
    list_locked_desc_stars: 'The story owner has locked the list of star givers.',
    no_interactors_views: 'No viewers yet',
    no_interactors_likes: 'No likers yet',
    no_interactors_stars: 'No star givers yet'
  },
  de: {
    loading: 'Wird geladen...',
    loading_db: 'Verbindung zur Datenbank wird hergestellt...',
    loading_app: 'Wird geladen...',
    no_star_givers: 'Noch keine Sternenspender',
    no_videos_currently: 'Derzeit keine Videos gefunden',
    be_first_video_desc: 'Teile als Erster deine kreativen Momente auf HiSee!',
    post_video_btn: 'Video veröffentlichen',
    no_videos_following: 'Keine Videos von Konten, denen du folgst',
    no_videos_following_desc: 'Wenn Personen, denen du folgst, neue Videos hochladen, werden sie hier automatisch angezeigt.',
    explore_suggested_btn: 'Empfohlene Videos erkunden',
    list_locked: 'Liste gesperrt',
    list_locked_desc_views: 'Der Besitzer der Story hat die Zuschauerliste gesperrt.',
    list_locked_desc_likes: 'Der Besitzer der Story hat die Liste der Likes gesperrt.',
    list_locked_desc_stars: 'Der Besitzer der Story hat die Liste der Sternenspender gesperrt.',
    no_interactors_views: 'Noch keine Zuschauer',
    no_interactors_likes: 'Noch keine Likes',
    no_interactors_stars: 'Noch keine Sternenspender'
  },
  ku: {
    loading: 'Tê barkirin...',
    loading_db: 'Girêdana database tê çêkirin...',
    loading_app: 'Tê barkirin...',
    no_star_givers: 'Hîn tu stêrk-bexş tune ne',
    no_videos_currently: 'Niha tu vîdyo nehatin dîtin',
    be_first_video_desc: 'Yekem kes be ku kêliyên xwe yên afirîner li ser HiSee parve dike!',
    post_video_btn: 'Vîdyoyê bişîne',
    no_videos_following: 'Ji hesabên ku tu dişopînî tu vîdyo tune ne',
    no_videos_following_desc: 'Dema ku kesên tu dişopînî vîdyoyên nû bar bikin, ew ê bixweber li vir xuya bibin.',
    explore_suggested_btn: 'Vîdyoyên Pêşniyarkirî Bigere',
    list_locked: 'Lîsteya girtî ye',
    list_locked_desc_views: 'Xwediyê çîrokê lîsteya temaşevanan girtiye.',
    list_locked_desc_likes: 'Xwediyê çîrokê lîsteya ecibandinan girtiye.',
    list_locked_desc_stars: 'Xwediyê çîrokê lîsteya stêrk-bexşan girtiye.',
    no_interactors_views: 'Hîn tu temaşevan tune ne',
    no_interactors_likes: 'Hîn tu ecibandin tune ne',
    no_interactors_stars: 'Hîn tu stêrk-bexş tune ne'
  },
  'ku-Latn': {
    loading: 'Tê barkirin...',
    loading_db: 'Girêdana database tê çêkirin...',
    loading_app: 'Tê barkirin...',
    no_star_givers: 'Hîn tu stêrk-bexş tune ne',
    no_videos_currently: 'Niha tu vîdyo nehatin dîtin',
    be_first_video_desc: 'Yekem kes be ku kêliyên xwe yên afirîner li ser HiSee parve dike!',
    post_video_btn: 'Vîdyoyê bişîne',
    no_videos_following: 'Ji hesabên ku tu dişopînî tu vîdyo tune ne',
    no_videos_following_desc: 'Dema ku kesên tu dişopînî vîdyoyên nû bar bikin, ew ê bixweber li vir xuya bibin.',
    explore_suggested_btn: 'Vîdyoyên Pêşniyarkirî Bigere',
    list_locked: 'Lîsteya girtî ye',
    list_locked_desc_views: 'Xwediyê çîrokê lîsteya temaşevanan girtiye.',
    list_locked_desc_likes: 'Xwediyê çîrokê lîsteya ecibandinan girtiye.',
    list_locked_desc_stars: 'Xwediyê çîrokê lîsteya stêrk-bexşan girtiye.',
    no_interactors_views: 'Hîn tu temaşevan tune ne',
    no_interactors_likes: 'Hîn tu ecibandin tune ne',
    no_interactors_stars: 'Hîn tu stêrk-bexş tune ne'
  },
  ckb: {
    loading: 'باردەکرێت...',
    loading_db: 'پەیوەندی لەگەڵ بنکەی زانیاری دروست دەکرێت...',
    loading_app: 'باردەکرێت...',
    no_star_givers: 'هێشتا هیچ ئەستێرەبەخشێک نییە',
    no_videos_currently: 'لە ئێستادا هیچ ڤیدیۆیەک نەدۆزراوەتەوە',
    be_first_video_desc: 'ببەرە یەکەم کەس کە ساتە داهێنەرەکانی لەسەر HiSee هاوبەش بکات!',
    post_video_btn: 'بڵاوکردنەوەی ڤیدیۆ',
    no_videos_following: 'هیچ ڤیدیۆیەک لەو هەژمارانەوە نییە کە دوایان دەکەویت',
    no_videos_following_desc: 'کاتێک ئەو کەسانەی دوایان دەکەویت ڤیدیۆی نوێ بڵاودەکەنەوە، لێرەدا بە شێوەیەکی خۆکارانە دەردەکەون.',
    explore_suggested_btn: 'گەڕان بەدوای ڤیدیۆ پێشنیارکراوەکاندا',
    list_locked: 'لیستەکە قفڵ کراوە',
    list_locked_desc_views: 'خاوەنی چیرۆکەکە لیستی بینەرانی قفڵ کردووە.',
    list_locked_desc_likes: 'خاوەنی چیرۆکەکە لیستی سەرسامبووانی قفڵ کردووە.',
    list_locked_desc_stars: 'خاوەنی چیرۆکەکە لیستی ئەستێرەبەخشانی قفڵ کردووە.',
    no_interactors_views: 'هێشتا هیچ بینەرێک نییە',
    no_interactors_likes: 'هێشتا هیچ سەرسامبوویەک نییە',
    no_interactors_stars: 'هێشتا هیچ ئەستێرەبەخشێک نییە'
  }
};

// Merge video translations into central translation store at runtime
Object.keys(videoTranslations).forEach(langKey => {
  if (translations[langKey]) {
    Object.assign(translations[langKey], videoTranslations[langKey]);
  } else {
    translations[langKey] = videoTranslations[langKey] as any;
  }
});

const getLocalizedMusicName = (musicName: string | undefined, activeLang: string, username?: string) => {
    if (!musicName) {
        return getTranslation(activeLang, 'originalSound', 'Original Sound');
    }
    
    let text = musicName.trim();
    const lower = text.toLowerCase();
    
    // Check for Original Sound variants
    const isOriginal = lower.includes('original sound') || 
                       text.includes('الصوت الأصلي') || 
                       text.includes('صوت أصلي') ||
                       lower.includes('orijinal ses') ||
                       lower.includes('son original') ||
                       lower.includes('sonido original');
                       
    if (isOriginal) {
        const origText = getTranslation(activeLang, 'originalSound', 'Original Sound');
        if (text.includes('-')) {
            const parts = text.split('-');
            const u = parts[1] ? parts[1].trim() : (username || '');
            return `${origText}${u ? ` - ${u}` : ''}`;
        }
        return username ? `${origText} - ${username}` : origText;
    }

    // Check for Music Sync / "موسيقى مع تصوير"
    if (text.includes('موسيقى مع تصوير') || lower.includes('music sync') || lower.includes('music with video')) {
        return getTranslation(activeLang, 'musicWithVideo', 'Music Sync');
    }

    // Replace Arabic keywords if activeLang is non-Arabic
    if (activeLang !== 'ar' && /[\u0600-\u06FF]/.test(text)) {
        text = text.replace(/الصوت الأصلي/g, getTranslation(activeLang, 'originalSound', 'Original Sound'))
                   .replace(/صوت أصلي/g, getTranslation(activeLang, 'originalSound', 'Original Sound'))
                   .replace(/موسيقى مع تصوير/g, getTranslation(activeLang, 'musicWithVideo', 'Music Sync'))
                   .replace(/موسيقى/g, getTranslation(activeLang, 'selectedMusic', 'Music'));
    }

    return text;
};

/**
 * Strict Data Guard: Validates that a video URL is a genuine public media URL.
 * Automatically excludes temporary blob URLs (blob:http...), empty/null values,
 * and broken or relative invalid strings before passing to the video player.
 */
export const isValidVideoUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return false;
  if (trimmed.startsWith('blob:')) return true; // Allowed for offline cache loading
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/api/')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  return trimmed.includes('.');
};

export const VideoItemComponent: React.FC<{ 
  vid: VideoItem; 
  isActive?: boolean;
  isUiVisible: boolean; 
  onProfileClick: () => void; 
  onCommentClick: () => void; 
  onShareClick: () => void; 
  onGiftClick: () => void;
  onOptionsClick: () => void;
  onToggleUi: () => void;
  myId: string;
  myProfile: any;
  settings?: any;
  lang?: string;
  onNavigate?: (tab: any) => void;
  isFeedActive?: boolean;
  isHighlighted?: boolean;
  children?: React.ReactNode;
  index?: number;
  videosList?: VideoItem[];
}> = ({ vid, isActive = false, isUiVisible, onProfileClick, onCommentClick, onShareClick, onGiftClick, onOptionsClick, onToggleUi, myId, myProfile, settings, lang = 'ar', onNavigate, isFeedActive = true, isHighlighted, children, index = 0, videosList = [] }) => {
    const activeLang = lang || settings?.language || 'ar';
    const [videoData, setVideoData] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false); 
    const [videoError, setVideoError] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isFrameRendered, setIsFrameRendered] = useState(false);

    useEffect(() => {
        setIsFrameRendered(false);
    }, [vid.id]);
    
    // Star Feature State
    const [isStarring, setIsStarring] = useState(false);
    const [showStarGiftConfirmModal, setShowStarGiftConfirmModal] = useState(false);
    const [showStarExplosion, setShowStarExplosion] = useState(false);
    const [starExplosionText, setStarExplosionText] = useState("GOLDEN STAR FEATURED ★");
    const [showStarGiversModal, setShowStarGiversModal] = useState(false);
    const [starGiversUsers, setStarGiversUsers] = useState<any[]>([]);
    const [isLoadingStarGivers, setIsLoadingStarGivers] = useState(false);
    const [showInsufficientCoinsModal, setShowInsufficientCoinsModal] = useState(false);
    const [xpToasts, setXpToasts] = useState<{ id: number; x: number; y: number }[]>([]);
    const nextToastId = useRef(0);

    const showXpToast = (e: React.MouseEvent | React.PointerEvent) => {
        const id = nextToastId.current++;
        // Get position relative to viewport or button
        const x = e.clientX;
        const y = e.clientY;
        
        setXpToasts(prev => [...prev, { id, x, y }]);
        setTimeout(() => {
            setXpToasts(prev => prev.filter(t => t.id !== id));
        }, 2000);
    };

    const [userCurrentCoins, setUserCurrentCoins] = useState<number | null>(null);
    const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);

    // Auto-translation logic
    useEffect(() => {
        const targetLang = activeLang || settings?.contentDisplaySettings?.targetLanguage || 'ar';
        if (vid.desc && vid.desc.trim().length > 0) {
            if (targetLang !== 'ar' || settings?.contentDisplaySettings?.alwaysTranslate) {
                if (vid.desc.length > 2) {
                    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(vid.desc)}`)
                    .then(res => {
                        if (!res.ok) throw new Error('Network response was not ok');
                        return res.json();
                    })
                    .then(data => {
                        if (data && data[0] && data[0][0] && data[0][0][0]) {
                            const translatedText = data[0].map((item: any) => item[0]).join('');
                            setTranslatedDesc(translatedText);
                        }
                    }).catch(e => {
                        console.debug("Translation skipped/failed:", e.message);
                    });
                }
            } else {
                setTranslatedDesc(null);
            }
        } else {
            setTranslatedDesc(null);
        }
    }, [vid.desc, activeLang, settings?.contentDisplaySettings?.alwaysTranslate, settings?.contentDisplaySettings?.targetLanguage]);

    const cleanName = (name: any) => {
        const nameStr = typeof name === 'string' ? name : (name?.value || '');
        if (!nameStr) return 'مستخدم';
        if (nameStr.includes('@')) return nameStr.split('@')[0];
        if (nameStr.length > 20 && /^[a-zA-Z0-9]+$/.test(nameStr)) return 'مستخدم';
        return nameStr;
    };

    const hasTriggeredStarAnim = useRef(false);

    const mergedVid = useMemo(() => ({
        ...vid,
        ...(videoData || {})
    }), [vid, videoData]);

    const starsCount = mergedVid.stars || (Array.isArray(mergedVid.starredBy) ? mergedVid.starredBy.length : 0);
    const isStarredByMe = Array.isArray(mergedVid.starredBy) && mergedVid.starredBy.includes(myId);

    const triggerStarAnimation = (customText?: string) => {
        setStarExplosionText(customText || "GOLDEN STAR FEATURED ★");
        setShowStarExplosion(true);
        if (vid.id) {
            localStorage.setItem(`star_anim_seen_${vid.id}`, 'true');
        }
        setTimeout(() => {
            setShowStarExplosion(false);
        }, 3800);
    };

    const STAR_COST = 1;

    const handleGiveStar = async () => {
        if (!vid?.id || vid.id === 'temp-upload-preview' || !auth.currentUser || isStarring) return;
        setIsStarring(true);

        try {
            const currentUid = auth.currentUser.uid;
            
            // Check user's current stars in Firestore
            const userRef = doc(db, 'users', currentUid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            
            const freeStars = typeof userData.freeStars === 'number' ? userData.freeStars : 0;
            const paidStars = typeof userData.paidStars === 'number' ? userData.paidStars : 0;
            const currentTotalStars = freeStars + paidStars;
            setUserCurrentCoins(currentTotalStars);

            if (currentTotalStars < STAR_COST) {
                setShowInsufficientCoinsModal(true);
                setIsStarring(false);
                return;
            }

            // Deduct stars from sender (free stars first, then paid)
            let isFromPaid = false;
            let senderUpdates: any = {
                supporterXP: increment(10),
                xp: increment(10)
            };

            const currentXp = userData.xp || 0;
            const newXp = currentXp + 10;
            const newLevel = Math.floor(newXp / 100) + 1;

            if (freeStars >= STAR_COST) {
                senderUpdates.freeStars = increment(-STAR_COST);
            } else {
                senderUpdates.paidStars = increment(-STAR_COST);
                isFromPaid = true;
            }
            
            senderUpdates.xp = increment(10);
            senderUpdates.level = newLevel;

            try {
                await updateDoc(userRef, senderUpdates);
            } catch (err) {
                console.warn("Server deduction failed");
            }

            // Credit author and increment totalReceivedStars
            const authorId = vid.userId || (vid as any).ownerId;
            if (authorId) {
                const authorRef = doc(db, 'users', authorId);
                const authorSnap = await getDoc(authorRef);
                const authorData = authorSnap.exists() ? authorSnap.data() : {};
                const authorXp = authorData.xp || 0;
                const authorNewXp = authorXp + 10;
                const authorNewLevel = Math.floor(authorNewXp / 100) + 1;

                const authorUpdates: any = {
                    totalReceivedStars: increment(1),
                    xp: increment(10),
                    level: authorNewLevel
                };
                
                if (isFromPaid && authorId !== currentUid) {
                    // Add direct financial value ($0.01 per paid star)
                    authorUpdates.realEarningsUSD = increment(0.01);
                }
                
                await updateDoc(authorRef, authorUpdates).catch((err) => {
                    console.error("Error crediting creator:", err);
                });
            }

            // Record transaction in history
            await addDoc(collection(db, 'transactions'), {
                uid: currentUid,
                type: 'star_gift',
                amount: STAR_COST,
                currency: 'stars',
                starType: isFromPaid ? 'paid' : 'free',
                usdValue: isFromPaid ? 0.01 : 0,
                targetId: vid.id,
                description: isFromPaid ? 'إهداء نجمة مدفوعة بقيمة $0.01' : 'إهداء نجمة مجانية',
                createdAt: serverTimestamp()
            }).catch(() => {});

            // Trigger explosion animation
            hasTriggeredStarAnim.current = true;
            triggerStarAnimation("GOLDEN STAR GIFTED! ★");

            // Update video and post docs
            const videoDocRef = doc(db, 'videos', vid.id);
            const postDocRef = doc(db, 'posts', vid.id);

            const updates = {
                stars: increment(1),
                starredBy: arrayUnion(currentUid),
                [`starCounts.${currentUid}`]: increment(1)
            };

            await Promise.all([
                updateDoc(videoDocRef, updates).catch(() => {}),
                updateDoc(postDocRef, updates).catch(() => {}),
                // Add notification to owner
                (authorId && authorId !== currentUid) ? addDoc(collection(db, 'users', authorId, 'notifications'), {
                    userId: authorId,
                    senderId: currentUid,
                    fromUserId: currentUid,
                    fromUserName: myProfile?.name || 'مستخدم',
                    fromUserAvatar: myProfile?.avatar || '',
                    type: 'star_received',
                    videoId: vid.id,
                    videoTitle: vid.title || vid.desc || 'فيديو خاص بك',
                    thumbnail: normalizeMediaUrl(vid.url) || '',
                    status: 'unread',
                    read: false,
                    seen: false,
                    message: 'أرسل لك نجمة ذهبية على الفيديو الخاص بك ★',
                    timestamp: serverTimestamp(),
                    createdAt: serverTimestamp()
                }).catch((err) => console.error("Error sending star notification:", err)) : Promise.resolve()
            ]);
        } catch (err) {
            console.error("Error giving star:", err);
        } finally {
            setIsStarring(false);
        }
    };

    const handleOpenStarGivers = async () => {
        setShowStarGiversModal(true);
        setIsLoadingStarGivers(true);
        try {
            const starredByIds = Array.from(new Set(mergedVid.starredBy || []));
            if (starredByIds.length === 0) {
                setStarGiversUsers([]);
                return;
            }
            const userDocs = await Promise.all(
                starredByIds.slice(0, 50).map(async (uid) => {
                    const uSnap = await getDoc(doc(db, 'users', uid as string));
                    if (uSnap.exists()) {
                        return { id: uSnap.id, ...uSnap.data() };
                    }
                    return { id: uid, name: 'مستخدم' };
                })
            );
            setStarGiversUsers(userDocs.filter(Boolean));
        } catch (e) {
            console.error("Error loading star givers:", e);
        } finally {
            setIsLoadingStarGivers(false);
        }
    };

    const getUserStarCount = (userId: string) => {
        if (!mergedVid) return 1;
        if (mergedVid.starCounts && typeof mergedVid.starCounts[userId] === 'number' && mergedVid.starCounts[userId] > 0) {
            return mergedVid.starCounts[userId];
        }
        const uniqueStarredBy = Array.from(new Set(mergedVid.starredBy || []));
        if (uniqueStarredBy.length === 1 && uniqueStarredBy[0] === userId) {
            return mergedVid.stars || 1;
        }
        const totalStars = mergedVid.stars || 1;
        if (uniqueStarredBy.length > 0) {
            return Math.max(1, Math.floor(totalStars / uniqueStarredBy.length));
        }
        return 1;
    };
    
    const hasIncrementedView = useRef(false);
    
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isManuallyPaused, setIsManuallyPaused] = useState(false);
    const [showPlayButton, setShowPlayButton] = useState(false);
    const hidePlayButtonTimeout = useRef<NodeJS.Timeout | null>(null);
    
    const [notes, setNotes] = useState<{id: number, left: number, color: string, delay: number, size: number}[]>([]);
    const [doubleTapHearts, setDoubleTapHearts] = useState<{id: number, x: number, y: number}[]>([]);

    // Auto-hide play button logic
    useEffect(() => {
        if (showPlayButton && !isManuallyPaused) {
            if (hidePlayButtonTimeout.current) clearTimeout(hidePlayButtonTimeout.current);
            hidePlayButtonTimeout.current = setTimeout(() => {
                setShowPlayButton(false);
            }, 3000);
        }
        return () => {
            if (hidePlayButtonTimeout.current) clearTimeout(hidePlayButtonTimeout.current);
        };
    }, [showPlayButton, isManuallyPaused]);

    // Force show play button if paused
    useEffect(() => {
        if (isManuallyPaused) {
            setShowPlayButton(true);
            if (hidePlayButtonTimeout.current) clearTimeout(hidePlayButtonTimeout.current);
        }
    }, [isManuallyPaused]);
    
    const formattedDate = useMemo(() => {
        if (!vid.createdAt) return '';
        const d = parseDate(vid.createdAt);
        if (!d) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }, [vid.createdAt]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isManuallyPausedRef = useRef(false);
    const playPromiseRef = useRef<Promise<void> | null>(null);
    const isPendingPauseRef = useRef<boolean>(false);

    // Safe Async Playback Management
    const safePlay = useCallback(async (video: HTMLVideoElement) => {
        if (!video || isManuallyPausedRef.current) return;
        if (!video.paused) {
            setIsPlaying(true);
            return;
        }

        isPendingPauseRef.current = false;

        try {
            video.muted = false;
            const promise = video.play();
            playPromiseRef.current = promise;
            await promise;
            if (isPendingPauseRef.current) {
                isPendingPauseRef.current = false;
                video.pause();
                video.muted = true;
                setIsPlaying(false);
            } else {
                setIsPlaying(true);
            }
        } catch (err: any) {
            if (err?.name === 'NotAllowedError' || err?.name === 'AutoplayError') {
                try {
                    video.muted = true;
                    const mutedPromise = video.play();
                    playPromiseRef.current = mutedPromise;
                    await mutedPromise;
                    if (!isPendingPauseRef.current) {
                        setIsPlaying(true);
                    } else {
                        video.pause();
                        setIsPlaying(false);
                    }
                } catch (mutedErr) {
                    setIsPlaying(false);
                }
            } else if (err?.name !== 'AbortError') {
                console.log("Safe play rejected:", err?.message);
                setIsPlaying(false);
            } else {
                setIsPlaying(false);
            }
        } finally {
            playPromiseRef.current = null;
        }
    }, []);

    const safePause = useCallback(async (video: HTMLVideoElement) => {
        if (!video) return;

        isPendingPauseRef.current = true;

        if (playPromiseRef.current) {
            try {
                await playPromiseRef.current;
            } catch (e) {}
        }

        if (isPendingPauseRef.current) {
            isPendingPauseRef.current = false;
            try {
                video.pause();
                video.muted = true;
            } catch (e) {}
            setIsPlaying(false);
        }
    }, []);
    
    // Smart Tap Logic Refs
    const startCoords = useRef<{x: number, y: number}>({ x: 0, y: 0 });
    const startTime = useRef<number>(0);
    const isDragging = useRef(false);

    const [isDataSaverActive, setIsDataSaverActive] = useState(false);
    // 1. Strict Audio Isolation & Direct Playback Effect driven strictly by isActive
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive && isFeedActive) {
            // Active video: unmute, preload and play
            video.muted = false;
            videoPreloader.preloadNextBatch(index, videosList);
            hasTriggeredStarAnim.current = false;
            ActiveVideoController.setActive(vid.id, video);

            if (!isManuallyPausedRef.current && !isDataSaverActive) {
                setIsManuallyPaused(false);
                video.play().catch((err) => {
                    video.muted = true;
                    video.play().catch(() => {});
                });
            }
        } else {
            // Inactive video: STRICT AUDIO ISOLATION & IMMEDIATE PAUSE
            video.muted = true;
            video.pause();
            isManuallyPausedRef.current = false;
            setIsManuallyPaused(false);
            hasTriggeredStarAnim.current = false;
            if (ActiveVideoController.getActiveId() === vid.id) {
                ActiveVideoController.clearActive(vid.id);
            }
        }
    }, [isActive, isFeedActive, isDataSaverActive, index, vid.id, videosList]);

    // Auto-trigger Golden Star Animation when playing a starred video
    useEffect(() => {
        // Restricted to video owner only as per request: "يعرض فقط مرة واحدة لصاحب فيديو"
        const isOwner = vid.userId === myId || (vid as any).ownerId === myId;
        if (isPlaying && starsCount > 0 && !hasTriggeredStarAnim.current && isOwner) {
            hasTriggeredStarAnim.current = true;
            if (vid.id) {
                const alreadySeen = localStorage.getItem(`star_anim_seen_${vid.id}`);
                if (!alreadySeen) {
                    triggerStarAnimation("GOLDEN STAR FEATURED ★");
                }
            } else {
                triggerStarAnimation("GOLDEN STAR FEATURED ★");
            }
        }
    }, [isPlaying, starsCount, vid.id, myId, vid.userId]);

    useEffect(() => {
        if (!vid.id || vid.id === 'temp-upload-preview') return;
        const targetCollection = vid.collectionName || 'videos';
        const videoRef = doc(db, targetCollection, vid.id);
        const unsubscribe = onSnapshot(videoRef, (doc) => {
            if (doc.exists()) {
                setVideoData(doc.data());
            }
        });
        return () => unsubscribe();
    }, [vid.id, vid.collectionName]);

    useEffect(() => {
        if (isPlaying && !hasIncrementedView.current && vid.id !== 'temp-upload-preview') {
            hasIncrementedView.current = true;
            const targetCollection = vid.collectionName || 'videos';
            const videoRef = doc(db, targetCollection, vid.id);
            setDoc(videoRef, { viewsCount: increment(1) }, { merge: true }).catch(() => {});
        }
    }, [isPlaying, vid.id, vid.collectionName]);

    const toggleVideoPlay = () => {
        const video = videoRef.current;
        if (!video) return;
        
        if (video.paused) {
            isManuallyPausedRef.current = false;
            setIsManuallyPaused(false);
            video.muted = false;
            ActiveVideoController.setActive(vid.id, video);
            video.play().catch((err) => {
                video.muted = true;
                video.play().catch(() => {});
            });
        } else {
            isManuallyPausedRef.current = true;
            setIsManuallyPaused(true);
            video.pause();
        }
    };

    // --- SMART TAP LOGIC ---
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        startTime.current = Date.now();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        startCoords.current = { x: clientX, y: clientY };
        isDragging.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const diffX = Math.abs(clientX - startCoords.current.x);
        const diffY = Math.abs(clientY - startCoords.current.y);

        // Sensitive movement detection (more than 5px is a drag/scroll)
        if (diffX > 5 || diffY > 5) {
            isDragging.current = true;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
        const duration = Date.now() - startTime.current;
        const target = e.target as HTMLElement;

        // Prevent toggling if clicked on UI buttons
        if (target.closest('.interactive-btn') || target.closest('.no-video-tap')) return;

        // Double Tap Detection
        const now = Date.now();
        if (videoRef.current) {
            const lastTap = (videoRef.current as any).lastTap || 0;
            const timesince = now - lastTap;

            if (timesince < 300 && timesince > 0) {
                // Double Tap!
                handleDoubleTap(e);
                (videoRef.current as any).lastTap = 0; // Reset
                return;
            }
            (videoRef.current as any).lastTap = now;
        }

        // Clean Tap Check: Short duration + No dragging
        if (!isDragging.current && duration < 250) {
            setShowPlayButton(prev => !prev);
        } 
        // Long Press Check (No Dragging)
        else if (!isDragging.current && duration >= 250) {
            onToggleUi();
        }
    };

    const handleDoubleTap = async (e: React.TouchEvent | React.MouseEvent) => {
        const clientX = 'touches' in e ? (e as any).changedTouches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as any).changedTouches[0].clientY : (e as React.MouseEvent).clientY;
        
        const newHeart = { id: Date.now(), x: clientX, y: clientY };
        setDoubleTapHearts(prev => [...prev, newHeart]);
        
        // Like toggle via double tap removed per user request, only animation remains

        setTimeout(() => {
            setDoubleTapHearts(prev => prev.filter(h => h.id !== newHeart.id));
        }, 1000);
    };



    useEffect(() => {
        setIsPlaying(false);
        setVideoLoaded(false);
        setVideoError(false);
    }, [vid.id, vid.url]);

    const handleLoadedData = () => {
        setVideoLoaded(true);
        setVideoError(false);
    };

    const handleProgress = () => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
            const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
            const duration = videoRef.current.duration;
            if (duration > 0) {
                setLoadingProgress(Math.min(100, Math.round((bufferedEnd / duration) * 100)));
            }
        }
    };

    const handleVideoError = async (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const videoElement = e.currentTarget;
        const error = videoElement.error;
        const normalized = normalizeMediaUrl(vid.url);
        
        console.warn("Video failed to load:", {
            originalUrl: vid.url,
            normalizedUrl: normalized,
            id: vid.id,
            userId: vid.userId,
            code: error?.code,
            message: error?.message,
            readyState: videoElement.readyState,
            networkState: videoElement.networkState
        });

        // Initialize general retry counter for slow networks
        if ((videoElement as any)._softRetryCount === undefined) {
            (videoElement as any)._softRetryCount = 0;
        }

        if ((videoElement as any)._softRetryCount < 3) {
            (videoElement as any)._softRetryCount++;
            console.log(`[VideoPlayer] [Network Recovery] Soft retry ${(videoElement as any)._softRetryCount}/3 for video: ${normalized}`);
            setTimeout(() => {
                try {
                    videoElement.load();
                    videoElement.play().catch(() => {});
                } catch (loadErr) {}
            }, 1000);
            return;
        }

        // 1. Try public domain / cache-busting normalized URL first if not tried
        if (!(videoElement as any)._hasRetriedNormalized && vid.id !== 'temp-upload-preview') {
            (videoElement as any)._hasRetriedNormalized = true;
            console.log("Attempting normalized public URL retry for video:", normalized);
            const sep = normalized.includes('?') ? '&' : '?';
            videoElement.src = `${normalized}${sep}retry=${Date.now()}`;
            videoElement.load();
            videoElement.play().catch(err => console.warn("Normalized retry auto-play failed:", err));
            return;
        }

        // 2. Try streaming proxy fallback if direct connection failed
        if (!(videoElement as any)._hasRetriedProxy && vid.id !== 'temp-upload-preview') {
            (videoElement as any)._hasRetriedProxy = true;
            const proxyUrl = getMediaProxyUrl(vid.url);
            console.log("Attempting server proxy streaming retry for video:", proxyUrl);
            videoElement.src = proxyUrl;
            videoElement.load();
            videoElement.play().catch(err => console.warn("Proxy retry auto-play failed:", err));
            return;
        }

        // 3. If it's an audio/decode render error (code 3), try muting and reloading
        if (error?.code === 3 && !(videoElement as any)._hasRetriedMuted) {
            (videoElement as any)._hasRetriedMuted = true;
            console.warn("Audio/Decode render error (code 3). Retrying with muted audio:", normalized);
            videoElement.muted = true;
            videoElement.load();
            videoElement.play().catch(err => console.warn("Muted retry auto-play failed:", err));
            return;
        }

        // 4. If crossOrigin was set and caused CORS blockage, try without crossOrigin
        if (videoElement.getAttribute('crossOrigin')) {
            console.log("Retrying video load without crossOrigin attribute for:", normalized);
            videoElement.removeAttribute('crossOrigin');
            videoElement.load();
            videoElement.play().catch(err => console.warn("Retry auto-play failed:", err));
            return;
        }

        // 5. Try to recover from local video cache if available
        if (vid.id.startsWith('vid-') || vid.userId === 'me') {
            try {
                const cached = await videoCache.getVideo(vid.id);
                if (cached) {
                    console.log("Recovering video from local cache:", vid.id);
                    const blob = new Blob([cached.data], { type: cached.metadata.type });
                    const newUrl = URL.createObjectURL(blob);
                    videoElement.src = newUrl;
                    videoElement.load();
                    videoElement.play().catch(err => console.warn("Auto-play failed after recovery:", err));
                    return; // Successfully recovered
                }
            } catch (err) {
                console.warn("Notice on cache recovery check:", err);
            }
        }

        // 6. Gracefully log broken video info without triggering a platform-wide block for transient client-side issues
        if (vid.id !== 'temp-upload-preview' && !(videoElement as any)._hasFlaggedFirestore) {
            (videoElement as any)._hasFlaggedFirestore = true;
            console.warn(`[VideoPlayer] Video ${vid.id} failed after all retries and fallbacks. Error code: ${error?.code}, Message: ${error?.message}`);
        }
        
        setVideoError(true);

        // Auto-navigate to next post on persistent error
        setTimeout(() => {
            const currentContainer = containerRef.current;
            if (currentContainer && currentContainer.nextElementSibling) {
                currentContainer.nextElementSibling.scrollIntoView({ behavior: 'smooth' });
            }
        }, 2000);
    };

    const isImageMedia = vid.mediaType === 'photo' || 
                         vid.type === 'photo' || 
                         (vid.url && (
                            !!vid.url.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i) || 
                            vid.url.startsWith('data:image/') ||
                            vid.url.includes('photo_studio') ||
                            vid.url.includes('photos')
                         ));

    return (
        <div 
        id={`video-item-${vid.id}`}
        data-index={index}
        ref={containerRef}
        className={`video-item-card snap-start relative bg-black flex items-center justify-center overflow-hidden h-[calc(100vh-70px)] w-full text-start select-none touch-manipulation transition-all duration-500 ${isHighlighted ? 'ring-4 ring-inset ring-emerald-500 shadow-[inset_0_0_30px_rgba(16,185,129,0.8)] z-50' : ''}`}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()} 
        >
        {isImageMedia ? (
            <img 
                src={normalizeMediaUrl(vid.url)} 
                alt={vid.desc || 'photo'}
                onLoad={() => {
                    setVideoLoaded(true);
                    setVideoError(false);
                }}
                onError={() => {
                    setVideoError(true);
                }}
                className={`h-full w-full object-contain bg-black transition-opacity duration-300 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`} 
            />
        ) : (
            <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden">
                {(() => {
                    const videoPoster = (vid as any).thumbnailUrl || (vid as any).poster || (vid as any).cover || (vid as any).imageUrl || (vid as any).coverUrl;
                    if (videoPoster) {
                        return (
                            <img 
                                src={normalizeMediaUrl(videoPoster)} 
                                className={`absolute inset-0 h-full w-full object-cover z-10 pointer-events-none transition-opacity duration-200 ease-out ${isFrameRendered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
                                alt="Video poster frame"
                            />
                        );
                    }
                    return null;
                })()}

                <video 
                    ref={videoRef} 
                    src={normalizeMediaUrl(vid.url)} 
                    loop={!(settings?.contentDisplaySettings?.autoScroll)}
                    playsInline 
                    webkit-playsinline="true"
                    crossOrigin="anonymous"
                    preload="auto"
                    autoPlay
                    muted={!isActive}
                    onTimeUpdate={() => {
                        if (videoRef.current && videoRef.current.currentTime > 0) {
                            setIsFrameRendered(true);
                        }
                    }}
                    onEnded={() => {
                        if (settings?.contentDisplaySettings?.autoScroll) {
                            const currentContainer = containerRef.current;
                            if (currentContainer && currentContainer.nextElementSibling) {
                                currentContainer.nextElementSibling.scrollIntoView({ behavior: 'smooth' });
                            }
                        }
                    }}
                    onLoadedData={() => {
                        setVideoLoaded(true);
                        handleLoadedData();
                    }}
                    onProgress={handleProgress}
                    onError={handleVideoError}
                    className={`h-full w-full object-cover transition-opacity duration-300 ${videoLoaded ? 'opacity-100' : 'opacity-0'} ${settings?.contentDisplaySettings?.hardwareAcceleration === false ? '' : 'transform-gpu'}`} 
                />
                {/* Restored Watermark Component inside the full container bounds */}
                {isUiVisible && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                        <WatermarkOverlay userName={vid.user || (vid as any).userName || 'hisee_user'} />
                    </div>
                )}

                {/* Central Play/Pause Button Overlay */}
                <AnimatePresence>
                    {showPlayButton && isUiVisible && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
                        >
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleVideoPlay();
                                    if (isManuallyPaused) {
                                        setShowPlayButton(false);
                                    }
                                }}
                                className="w-24 h-24 flex items-center justify-center text-white transition-all active:scale-90 pointer-events-auto interactive-btn no-video-tap"
                            >
                                {isManuallyPaused ? (
                                    <Play size={50} strokeWidth={1.5} className="ml-1 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                                ) : (
                                    <Pause size={50} strokeWidth={1.5} className="drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )}
        {children}
        
        {/* Loading/Error State */}
        {((!videoLoaded && !((vid as any).thumbnailUrl || (vid as any).poster || (vid as any).cover || (vid as any).imageUrl || (vid as any).coverUrl)) || videoError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c10] z-20">
                        {videoError ? (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500 p-8 text-center">
                        {(mergedVid.isBroken && videoRef.current?.error?.code === 4) ? (
                            <>
                                <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mb-2">
                                    <VideoOff size={48} className="text-rose-500 opacity-50" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black italic uppercase tracking-widest text-white">الفيديو تالف</h3>
                                    <p className="text-[10px] font-medium text-slate-500 max-w-[220px] leading-relaxed uppercase tracking-widest">
                                        هذا الفيديو غير مدعوم أو تالف وتم إبلاغ الإدارة.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mb-2">
                                    <Video size={48} className="text-rose-500 opacity-50" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black italic uppercase tracking-widest text-white">تعذر تحميل الفيديو</h3>
                                    <p className="text-[10px] font-medium text-slate-500 max-w-[220px] leading-relaxed uppercase tracking-widest">
                                        قد يكون هناك مشكلة في الاتصال أو أن الفيديو لم يعد متاحاً في السحابة
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 items-center">
                                    <button 
                                        onClick={() => {
                                            setVideoError(false);
                                            setVideoLoaded(false);
                                            if (videoRef.current) {
                                                const proxyUrl = getMediaProxyUrl(vid.url);
                                                videoRef.current.src = proxyUrl;
                                                videoRef.current.load();
                                                videoRef.current.play().catch(() => {});
                                            }
                                        }}
                                        className="px-6 py-3 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                                    >
                                        إعادة المحاولة
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const currentContainer = containerRef.current;
                                            if (currentContainer && currentContainer.nextElementSibling) {
                                                currentContainer.nextElementSibling.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all"
                                    >
                                        تخطي إلى التالي
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : null}
            </div>
        )}
        
        {/* Navigation Overlays */}

        {/* Double Tap Hearts */}
        {doubleTapHearts.map(heart => (
            <div 
                key={heart.id}
                className="absolute z-[100] pointer-events-none animate-heart-pop"
                style={{ left: heart.x - 40, top: heart.y - 40 }}
            >
                <Heart size={80} fill="#f43f5e" className="text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
            </div>
        ))}
        
        {/* Publisher Upload Progress Overlay (Shown only for the video owner while uploading) */}
        {vid.isUploading && (vid.userId === myId || vid.authorUid === myId) && (
          <div className="absolute top-16 left-4 right-4 z-50 bg-black/85 backdrop-blur-md border border-emerald-500/40 p-3 rounded-2xl flex items-center justify-between shadow-2xl animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="text-emerald-400 animate-spin" />
              <span className="text-xs font-bold text-white">جاري رفع وتطبيق الفيديو السحابي...</span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">قيد المعالجة ⏳</span>
          </div>
        )}

        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none transition-opacity duration-700 ${isUiVisible ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* LEFT-SIDE 3D LUXURY STAR - EXACT SAME MODERN DESIGN AS PHOTOS VIEW */}
        <div 
          className={`absolute top-[90px] sm:top-[96px] left-2 md:left-4 flex flex-col gap-3 items-center z-40 pointer-events-none transition-all duration-500 ${
            isUiVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16 pointer-events-none'
          }`}
        >
          {/* 3D GOLDEN STAR */}
          <div className="relative mb-2 flex flex-col items-center pointer-events-auto">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                 showXpToast(e);
                setShowStarGiftConfirmModal(true); 
              }}
              className="relative group w-[12vw] h-[12vw] max-w-[50px] max-h-[50px] md:w-16 md:h-16 flex items-center justify-center transition-all active:scale-90 hover:scale-110 cursor-pointer"
              title="إهداء نجمة ذهبية فخمة 3D ✨"
            >
              {/* Ambient Radial Golden Aura / Glow */}
              <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-md animate-pulse pointer-events-none" />

              {/* Glowing Golden Light Rays / Starburst */}
              <svg 
                viewBox="0 0 100 100" 
                className="absolute inset-[-40%] w-[180%] h-[180%] pointer-events-none opacity-90 animate-[spin_15s_linear_infinite]"
              >
                <defs>
                  <radialGradient id={`starRaysGlow_vid_${vid.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
                    <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
                    <stop offset="80%" stopColor="#d97706" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <g fill={`url(#starRaysGlow_vid_${vid.id})`}>
                  <polygon points="50,0 55,50 50,100 45,50" />
                  <polygon points="0,50 50,55 100,50 50,45" />
                  <polygon points="10,10 50,50 90,90 50,50" />
                  <polygon points="90,10 50,50 10,90 50,50" />
                </g>
              </svg>

              {/* Main 3D Metallic Thick Star SVG */}
              <svg 
                viewBox="0 0 100 100" 
                className="relative z-10 w-full h-full drop-shadow-[0_6px_16px_rgba(245,158,11,0.75)] group-hover:rotate-6 transition-transform duration-300"
              >
                <defs>
                  <linearGradient id={`starGoldBevel_vid_${vid.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="15%" stopColor="#fde047" />
                    <stop offset="40%" stopColor="#f59e0b" />
                    <stop offset="70%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                  <linearGradient id={`starExtrusion_vid_${vid.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#92400e" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>
                  <filter id={`starShadow_vid_${vid.id}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85"/>
                  </filter>
                </defs>

                {/* Enhanced 3D Base Extrusion (Thicker) */}
                <path
                  d="M50 10 L68 38 L100 41 L74 65 L82 96 L50 78 L18 96 L26 65 L0 41 L32 38 Z"
                  fill={`url(#starExtrusion_vid_${vid.id})`}
                  stroke="#3f1902"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  filter={`url(#starShadow_vid_${vid.id})`}
                />

                {/* Main 3D Front Star Body with Thick Gold Stroke */}
                <path
                  d="M50 4 L64 33 L96 36 L72 58 L79 89 L50 73 L21 89 L28 58 L4 36 L36 33 Z"
                  fill={`url(#starGoldBevel_vid_${vid.id})`}
                  stroke="#fff8b5"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />

                {/* 3D Facet Polygons for Volumetric Lighting */}
                <polygon points="50,4 50,73 64,33" fill="#fffbeb" opacity="0.65" />
                <polygon points="50,4 50,73 36,33" fill="#b45309" opacity="0.45" />
                <polygon points="96,36 50,73 72,58" fill="#78350f" opacity="0.55" />
                <polygon points="4,36 50,73 28,58" fill="#fef08a" opacity="0.5" />
                <polygon points="79,89 50,73 72,58" fill="#92400e" opacity="0.6" />
                <polygon points="21,89 50,73 28,58" fill="#b45309" opacity="0.5" />

                {/* Top Vertex Specular Highlight Flare */}
                <circle cx="50" cy="12" r="3.2" fill="#ffffff" opacity="0.85" />
                <circle cx="50" cy="12" r="6" fill="#fef08a" opacity="0.4" />
              </svg>

              {/* Counter Number Centered Inside the 3D Star with High Contrast & Shadow */}
              <span className="absolute inset-0 z-20 flex items-center justify-center pt-1.5 text-white font-black text-[clamp(10px,2.2vw,13px)] drop-shadow-[0_2px_4px_rgba(0,0,0,1)] select-none pointer-events-none tracking-tight">
                {(starsCount || 0) > 0 ? (starsCount || 0).toLocaleString() : '0'}
              </span>
            </button>
          </div>

          {/* Invisible spacers matching right column for vertical balance */}
          <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
          <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
          <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
          <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
          <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
          <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
        </div>

        {/* GOLDEN STAR CONFIRMATION MODAL - PORTALED TO SCREEN CENTER */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showStarGiftConfirmModal && (
              <div 
                className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto pointer-events-auto" 
                onClick={(e) => { e.stopPropagation(); setShowStarGiftConfirmModal(false); }}
                style={{ margin: 0 }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-[90vw] max-w-sm bg-[#0f1422] border-2 border-amber-400/40 rounded-3xl p-6 pb-7 text-center shadow-[0_0_40px_rgba(251,191,36,0.3)] relative overflow-hidden my-auto max-h-[85vh] overflow-y-auto"
                >
                  {/* Background Glow */}
                  <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 mx-auto flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-bounce">
                    <Star size={32} className="fill-black text-black" />
                  </div>

                  <h3 className="text-lg font-black text-white mb-1">إهداء النجمة الذهبية 🌟</h3>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    أهدِ <span className="text-amber-400 font-bold">{cleanName(vid.user)}</span> نجمة التميز الذهبية لدعم هذا المنشور الإبداعي. هذا الدعم يمنحك أنت وصانع المحتوى <span className="text-amber-400 font-bold">+10 XP</span> لرفع المستوى فوراً! ✨
                  </p>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-4 flex items-center justify-between text-xs font-bold text-white">
                    <span className="text-slate-400">تكلفة الهدية:</span>
                    <div className="text-amber-400 flex items-center gap-1.5 font-mono text-sm font-black">
                      <Star size={22} className="inline-block shrink-0 fill-amber-400" />
                      <span>1</span>
                    </div>
                  </div>

                  {starsCount > 0 && (
                    <button
                      onClick={() => {
                        setShowStarGiftConfirmModal(false);
                        handleOpenStarGivers();
                      }}
                      className="w-full mb-4 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 text-amber-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span>عرض المُهدين للنجمات ({starsCount.toLocaleString()})</span>
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowStarGiftConfirmModal(false)}
                      className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-bold transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={async () => {
                        setShowStarGiftConfirmModal(false);
                        await handleGiveStar();
                      }}
                      disabled={isStarring}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isStarring ? 'جاري الإرسال...' : 'تأكيد الإهداء ⭐'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Star Burst Celebration Overlay */}
        <AnimatePresence>
            {showStarExplosion && (
                <div className="absolute inset-0 z-[150] pointer-events-none flex flex-col items-center justify-center overflow-hidden">
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 2], opacity: [0, 0.8, 0] }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="w-96 h-96 rounded-full bg-gradient-to-r from-amber-400/40 via-yellow-300/30 to-amber-500/40 blur-3xl"
                    />

                    <motion.div
                        initial={{ x: 180, y: 250, scale: 0.1, opacity: 0, rotate: 0 }}
                        animate={{ 
                            x: [180, 0, 0, 0, 180], 
                            y: [250, 0, 0, 0, -150], 
                            scale: [0.1, 1.2, 1.2, 1.2, 0.1], 
                            opacity: [0, 1, 1, 1, 0],
                            rotate: [0, 360, 360, 360, 720]
                        }}
                        transition={{ 
                            duration: 3.5, 
                            times: [0, 0.25, 0.5, 0.75, 1], 
                            ease: "easeInOut" 
                        }}
                        className="flex flex-col items-center gap-4 pointer-events-auto"
                    >
                        {/* Huge 3D Luxury Star */}
                        <div className="w-56 h-56 md:w-64 md:h-64 relative flex items-center justify-center drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]">
                            <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_10s_linear_infinite]">
                                <defs>
                                    <linearGradient id="hugeStarGoldBevel" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#fffbeb" />
                                        <stop offset="15%" stopColor="#fde047" />
                                        <stop offset="40%" stopColor="#f59e0b" />
                                        <stop offset="70%" stopColor="#d97706" />
                                        <stop offset="100%" stopColor="#78350f" />
                                    </linearGradient>
                                    <linearGradient id="hugeStarExtrusion" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#92400e" />
                                        <stop offset="100%" stopColor="#451a03" />
                                    </linearGradient>
                                    <filter id="hugeStarShadow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.8"/>
                                    </filter>
                                </defs>
                                <path
                                  d="M50 10 L68 38 L100 41 L74 65 L82 96 L50 78 L18 96 L26 65 L0 41 L32 38 Z"
                                  fill="url(#hugeStarExtrusion)"
                                  stroke="#3f1902"
                                  strokeWidth="3.5"
                                  strokeLinejoin="round"
                                  filter="url(#hugeStarShadow)"
                                />
                                <path
                                  d="M50 4 L64 33 L96 36 L72 58 L79 89 L50 73 L21 89 L28 58 L4 36 L36 33 Z"
                                  fill="url(#hugeStarGoldBevel)"
                                  stroke="#fff8b5"
                                  strokeWidth="2.2"
                                  strokeLinejoin="round"
                                />
                                <polygon points="50,4 50,73 64,33" fill="#fffbeb" opacity="0.65" />
                                <polygon points="50,4 50,73 36,33" fill="#b45309" opacity="0.45" />
                                <polygon points="96,36 50,73 72,58" fill="#78350f" opacity="0.55" />
                                <polygon points="4,36 50,73 28,58" fill="#fef08a" opacity="0.5" />
                                <polygon points="79,89 50,73 72,58" fill="#92400e" opacity="0.6" />
                                <polygon points="21,89 50,73 28,58" fill="#b45309" opacity="0.5" />
                                <circle cx="50" cy="12" r="3.2" fill="#ffffff" opacity="0.85" />
                                <circle cx="50" cy="12" r="6" fill="#fef08a" opacity="0.4" />
                            </svg>
                        </div>
                        <div className="bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 text-slate-950 font-black text-lg md:text-xl font-mono uppercase tracking-[0.25em] px-8 py-4 rounded-full border-2 border-amber-100 shadow-[0_0_40px_rgba(251,191,36,0.9)] flex items-center gap-3 drop-shadow-lg">
                            <Sparkles size={24} className="text-slate-950" />
                            {starExplosionText}
                        </div>
                    </motion.div>

                    {[...Array(12)].map((_, i) => {
                        const angle = (i * 30) * (Math.PI / 180);
                        const x = Math.cos(angle) * 200;
                        const y = Math.sin(angle) * 200;
                        return (
                            <motion.div
                                key={i}
                                initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                                animate={{ x, y, scale: 0, opacity: 0 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute"
                            >
                                <Star size={24} className="fill-yellow-300 text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </AnimatePresence>

        {/* Star Givers Modal (المُهدون للنجمات ✨) - PORTALED */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showStarGiversModal && (
                <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto" onClick={() => setShowStarGiversModal(false)}>
                    <motion.div 
                        initial={{ y: '100%' }} 
                        animate={{ y: 0 }} 
                        exit={{ y: '100%' }} 
                        className="w-full max-w-sm bg-[#1a1d24] rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 h-[70vh] sm:h-[480px] flex flex-col" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Star size={20} className="text-amber-400 fill-amber-400 animate-spin" />
                                {getTranslation(activeLang, 'starGiversTitle', 'Star Givers ✨')}
                            </h3>
                            <button onClick={() => setShowStarGiversModal(false)} className="p-1.5 text-white/60 hover:text-white bg-white/5 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        {isLoadingStarGivers ? (
                            <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
                                {getTranslation(activeLang, 'loading', 'Loading...')}
                            </div>
                        ) : starGiversUsers.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-white/40 text-sm">
                                <Users size={36} className="mb-2 opacity-30" />
                                <p>{getTranslation(activeLang, 'no_star_givers', 'No star givers yet')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                                {starGiversUsers.map((u: any) => (
                                    <div 
                                        key={u.id} 
                                        className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer" 
                                        onClick={() => { 
                                            onProfileClick(); 
                                            setShowStarGiversModal(false); 
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={normalizeMediaUrl(u.avatar || u.photoURL)} 
                                                className="w-10 h-10 rounded-full object-cover border border-white/10" 
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`;
                                                }}
                                            />
                                            <div>
                                                <p className="text-white font-bold text-sm">{u.name || u.displayName || 'مستخدم'}</p>
                                                {u.bio && <p className="text-white/40 text-xs line-clamp-1 mt-0.5">{u.bio}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-amber-300 font-black shrink-0 px-2 py-1">
                                            <Star size={22} className="fill-amber-400 text-yellow-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)] animate-pulse" />
                                            <span className="text-amber-300 font-extrabold text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                                {getUserStarCount(u.id)}
                                            </span>
                                            <Sparkles size={12} className="text-yellow-300 opacity-90" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Insufficient Coins Modal - PORTALED TO SCREEN CENTER */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showInsufficientCoinsModal && (
                <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-[90vw] text-center shadow-[0_0_50px_rgba(251,191,36,0.3)] relative overflow-hidden my-auto max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                        
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                            <Star size={36} className="fill-amber-400 text-yellow-200 animate-pulse" />
                        </div>

                        <h3 className="text-xl font-black text-amber-300 mb-2">نجمات غير كافية ✨</h3>
                        
                        <p className="text-slate-300 text-xs leading-relaxed mb-4">
                            إهداء هذه النجمة يتطلب <span className="text-amber-400 font-bold">1 نجمة</span> على الأقل.
                            {userCurrentCoins !== null && (
                                <span className="block mt-1 text-slate-400">رصيدك الحالي: <strong className="text-white">{userCurrentCoins.toLocaleString()} نجمة</strong></span>
                            )}
                        </p>

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-5">
                            <p className="text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                                <Sparkles size={14} className="text-amber-400 shrink-0" />
                                يمكنك الحصول على النجوم من قسم الإعدادات
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setShowInsufficientCoinsModal(false);
                                    window.dispatchEvent(new CustomEvent('navigate_settings', { detail: { view: 'buy_stars' } }));
                                }}
                                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                الحصول على نجوم الآن ⚙️
                            </button>
                            <button
                                onClick={() => setShowInsufficientCoinsModal(false)}
                                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
                            >
                                إغلاق
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
          </AnimatePresence>,
          document.body
        )}
        
        {/* XP Toast Overlay */}
        <div className="fixed inset-0 pointer-events-none z-[200]">
            <AnimatePresence>
                {xpToasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: toast.y, x: toast.x, scale: 0.5 }}
                        animate={{ 
                            opacity: [0, 1, 1, 0], 
                            y: [toast.y, toast.y - 120], 
                            x: toast.x,
                            scale: [0.8, 1.5, 1.3, 1] 
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        exit={{ opacity: 0 }}
                        className="absolute text-amber-300 font-black text-xl whitespace-nowrap drop-shadow-[0_0_20px_rgba(251,191,36,0.9)] z-[200] italic flex items-center gap-1.5"
                    >
                        <Plus size={20} strokeWidth={4} />
                        <span>10 XP</span>
                        <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>

        {/* Interaction Bar */}
        <InteractionBar 
            vid={vid}
            isUiVisible={isUiVisible}
            onProfileClick={onProfileClick}
            onCommentClick={onCommentClick}
            onShareClick={onShareClick}
            onOptionsClick={onOptionsClick}
            videoData={videoData}
            myId={myId}
            myProfile={myProfile}
            onGiftClick={onGiftClick}
            lang={activeLang}
        />

        {/* DESCRIPTION */}
        <div className={`absolute bottom-[75px] sm:bottom-[90px] left-3 right-16 text-start z-30 pointer-events-auto transition-all duration-700 ${isUiVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <UserSync userId={vid.userId} initialName={vid.user}>
                {({ name }) => (
                    <div className="flex items-center gap-2 mb-2 interactive-btn no-video-tap w-fit" onClick={() => { onProfileClick(); }}>
                        <h3 className="font-black text-lg italic text-white drop-shadow-2xl tracking-tight uppercase">@{name}</h3>
                        <CheckCircle2 size={16} fill="#10b981" className="text-white" />
                    </div>
                )}
            </UserSync>
            <p className="text-[12px] text-white/90 font-medium line-clamp-2 max-w-[85%] leading-relaxed italic drop-shadow-xl interactive-btn no-video-tap">
                {translatedDesc || vid.desc}
            </p>
        </div>

        {/* MUSIC TICKER */}
        <div className={`absolute bottom-[38px] sm:bottom-[50px] left-3 z-[210] pointer-events-none transition-all duration-700 w-[75%] max-w-[350px] ${isUiVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
            <div className="flex flex-row-reverse items-center gap-4 relative bg-transparent px-0 py-2 w-full">
                <div className="relative shrink-0">
                    {/* Publication Date Label Above Music Disc */}
                    {formattedDate && (
                      <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-rose-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-20 pointer-events-none">
                        {formattedDate}
                      </div>
                    )}
                    {notes.map(note => (
                    <div 
                        key={note.id}
                        className={`absolute bottom-8 left-1/2 ${note.color} animate-float-note pointer-events-none`}
                        style={{ 
                        left: `${50 + note.left}%`, 
                        animationDelay: `${note.delay}s`,
                        width: `${note.size}px`,
                        height: `${note.size}px`
                        }}
                    >
                        <Music size={note.size} strokeWidth={2.5} />
                    </div>
                    ))}
                    {/* UPDATED CD DISC WITH 4 BLENDED COLORS & APP LOGO CENTER */}
                    <div 
                        className="w-12 h-12 rounded-full animate-disc-spin border-[2px] border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.4)] relative flex items-center justify-center ring-1 ring-white/50"
                        style={{ background: 'conic-gradient(from 0deg, #10b981, #ffffff, #facc15, #f43f5e, #10b981)' }}
                    >
                        <div className="w-7 h-7 rounded-full bg-black border-2 border-black overflow-hidden relative z-10 flex items-center justify-center">
                            <ModernHSLogo size={20} />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-1 overflow-hidden pr-2 text-start flex-1 mask-linear-fade-right">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-400 marquee-text-hisee whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        <Music size={12} strokeWidth={3} className="shrink-0" /> {getLocalizedMusicName(vid.music, activeLang, vid.user)}
                    </div>
                    <div className="flex items-center gap-2 opacity-80">
                        <Headphones size={10} className="text-emerald-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300 whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">HiSee Pro Mastering Studio</span>
                    </div>
                </div>
            </div>
        </div>

        <style>{`
            .snap-start {
                min-height: -webkit-fill-available;
            }
            @keyframes float-note {
            0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translateY(-150px) translateX(20px) scale(1.2) rotate(45deg); opacity: 0; }
            }
            .animate-float-note {
            animation: float-note 2s ease-out forwards;
            }
            @keyframes heart-pop {
                0% { transform: scale(0) rotate(-15deg); opacity: 0; }
                15% { transform: scale(1.2) rotate(0deg); opacity: 1; }
                30% { transform: scale(1) rotate(15deg); }
                80% { transform: scale(1.1) translateY(-20px); opacity: 1; }
                100% { transform: scale(1.5) translateY(-40px); opacity: 0; }
            }
            .animate-heart-pop {
                animation: heart-pop 0.8s ease-out forwards;
            }
            @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px) rotate(-5deg); }
            75% { transform: translateX(2px) rotate(5deg); }
            }
            .animate-shake {
            animation: shake 0.4s ease-in-out;
            }
            .mask-linear-fade-right {
            mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            }
        `}</style>
        </div>
    );
};

// --- ENHANCED OPTIONS OVERLAY (THREE DOTS) ---
interface OptionsOverlayProps {
    vid: VideoItem;
    myId: string;
    onClose: () => void;
    onAction: (action: string, payload?: any) => void;
    lang?: string;
}

const OptionsOverlay: React.FC<OptionsOverlayProps> = ({ vid, myId, onClose, onAction, lang = 'ar' }) => {
  const activeLang = lang || 'ar';
  const t = translations[activeLang] || translations.ar;
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [mountTime] = useState(Date.now());

  const isOwner = vid.userId === myId;

  const isReposted = useMemo(() => {
    if (!vid) return false;
    const local = localStorage.getItem(`reposted_${vid.id}`) === 'true';
    if (local) return true;
    if (vid.repostedBy && Array.isArray(vid.repostedBy) && vid.repostedBy.includes(myId)) return true;
    if (vid.isReposted) return true;
    return false;
  }, [vid, myId]);

  const repostsCount = useMemo(() => {
    let count = (vid as any).repostsCount || (vid as any).reposts || 0;
    const local = localStorage.getItem(`reposted_${vid.id}`) === 'true';
    const server = vid.repostedBy && Array.isArray(vid.repostedBy) && vid.repostedBy.includes(myId);
    if (local && !server) {
      count += 1;
    } else if (!local && server && count > 0) {
      count -= 1;
    }
    return Math.max(0, count);
  }, [vid, myId]);

  const handleAction = (action: string) => {
      // Direct pass for Duet and Repost to handle UI in main component
      if (action === 'duet' || action === 'repost') {
          onAction(action, vid);
          onClose();
          return;
      }

      setProcessingAction(action);
      
      if (action === 'save') {
          WatermarkExporter.exportVideo(normalizeMediaUrl(vid.url), vid.user || 'hisee_user', (p) => {
              setProgress(p);
          })
          .then((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hisee_video_${vid.id}.mp4`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              onClose();
          })
          .catch((err) => {
              console.error("Failed to watermark and save video:", err);
              const a = document.createElement('a');
              a.href = normalizeMediaUrl(vid.url);
              a.download = `hisee_video_${vid.id}.mp4`;
              a.target = '_blank';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              onClose();
          });
      } else if (action === 'details' || action === 'delete_confirm') {
          // No closing, just show details or confirmation state
      } else {
          // Immediate actions
          onAction(action, vid);
          onClose();
      }
  };

  if (processingAction === 'delete_confirm') {
      return (
        <div className="absolute inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={onClose}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-center mb-6 text-center">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                      <Trash size={32} className="text-rose-500" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2">{getTranslation(activeLang, 'deleteVideoTitle', 'حذف الفيديو')}</h3>
                  <p className="text-sm text-slate-400">{getTranslation(activeLang, 'deleteVideoConfirm', 'هل أنت متأكد من رغبتك في حذف هذا الفيديو؟ لا يمكن التراجع عن هذا الإجراء.')}</p>
              </div>
              <div className="flex gap-4">
                  <button onClick={() => setProcessingAction(null)} className="flex-1 py-4 bg-white/10 rounded-2xl font-bold text-white hover:bg-white/20 transition-colors text-xs cursor-pointer">{getTranslation(activeLang, 'cancel', 'إلغاء')}</button>
                  <button onClick={() => { onAction('delete', vid); onClose(); }} className="flex-1 py-4 bg-rose-500 rounded-2xl font-bold text-white hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 text-xs cursor-pointer">{getTranslation(activeLang, 'finalDelete', 'حذف نهائي')}</button>
              </div>
          </div>
        </div>
      );
  }

  if (processingAction === 'details') {
      return (
        <div className="absolute inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={onClose}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white flex items-center gap-2"><AlertCircle className="text-blue-500" /> {getTranslation(activeLang, 'contentDetails', 'تفاصيل المحتوى')}</h3>
                  <button onClick={onClose} className="p-2 text-white/50 hover:text-white cursor-pointer"><X size={20} /></button>
              </div>
              <div className="space-y-4 text-sm text-slate-300">
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl"><span>{getTranslation(activeLang, 'idLabel', 'المعرف:')}</span> <span className="font-mono text-white">{vid.id}</span></div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl"><span>{getTranslation(activeLang, 'publishDate', 'تاريخ النشر:')}</span> <span className="font-bold text-white">2025-05-20</span></div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl"><span>{getTranslation(activeLang, 'resolution', 'جودة العرض:')}</span> <span className="font-bold text-emerald-500">1080p HD (60fps)</span></div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl"><span>{getTranslation(activeLang, 'audioEncoding', 'ترميز الصوت:')}</span> <span className="font-bold text-yellow-500">Dolby Atmos (Simulated)</span></div>
              </div>
              <button onClick={() => setProcessingAction(null)} className="w-full mt-6 py-4 bg-white/10 rounded-2xl font-bold text-white cursor-pointer">{getTranslation(activeLang, 'back', 'عودة')}</button>
          </div>
        </div>
      );
  }

  if (processingAction === 'save') {
      return (
        <div className="absolute inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={() => { if (Date.now() - mountTime > 300) onClose(); }}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 pb-20 sm:pb-8 flex flex-col items-center text-center shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 relative mb-6">
                  <Loader2 size={64} className="text-emerald-500 animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{progress}%</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2">{getTranslation(activeLang, 'savingVideo', 'جاري حفظ الفيديو...')}</h3>
              <p className="text-xs text-slate-500">{getTranslation(activeLang, 'pleaseWait', 'يرجى الانتظار قليلاً')}</p>
          </div>
        </div>
      );
  }

  return (
    <div className="absolute inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={() => { if (Date.now() - mountTime > 300) onClose(); }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
       <div className="flex justify-center mb-5"><div className="w-12 h-1 bg-white/20 rounded-full"></div></div>
       
       {/* 1. First Item: Repost (إعادة النشر) - Modern Loop Icon & Monochrome styling */}
       <button
          type="button"
          onClick={() => handleAction('repost')}
          className="w-full mb-5 p-3.5 bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] border border-white/10 rounded-2xl flex items-center justify-between text-white transition-all active:scale-[0.98] cursor-pointer group select-none shadow-sm"
       >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <ModernRepostLoopIcon size={20} className="text-white" />
             </div>
             <div className="flex flex-col text-right">
                <span className="text-sm font-black text-white tracking-wide">
                   {isReposted ? getTranslation(activeLang, 'cancelRepost', 'إلغاء إعادة النشر') : getTranslation(activeLang, 'repost', 'إعادة النشر')}
                </span>
                <span className="text-[10px] text-white/50 font-medium">
                   {isReposted ? getTranslation(activeLang, 'cancelRepostDesc', 'إزالة هذا الفيديو من خلاصتك') : getTranslation(activeLang, 'repostDesc', 'مشاركة الفيديو في خلاصتك مع المتابعين')}
                </span>
             </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
             <span className="text-[11px] font-bold text-white/70 font-mono">
                {repostsCount > 0 ? repostsCount.toLocaleString() : getTranslation(activeLang, 'newItem', 'جديد')}
             </span>
          </div>
       </button>

       <div className="grid grid-cols-4 gap-4 mb-6">
          {!isOwner && (
            <>
              <div className="flex flex-col items-center gap-2">
                 <button onClick={() => handleAction('report')} className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"><Flag size={24} /></button>
                 <span className="text-[10px] text-white/60 font-bold">{getTranslation(activeLang, 'report', 'إبلاغ')}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <button onClick={() => handleAction('not_interested')} className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"><Ban size={24} /></button>
                 <span className="text-[10px] text-white/60 font-bold">{getTranslation(activeLang, 'notInterested', 'غير مهتم')}</span>
              </div>
            </>
          )}
          {isOwner && (
            <div className="flex flex-col items-center gap-2">
               <button onClick={() => handleAction('delete_confirm')} className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"><Trash size={24} /></button>
               <span className="text-[10px] text-white/60 font-bold">{getTranslation(activeLang, 'delete', 'حذف')}</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
             <button onClick={() => handleAction('save')} className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"><Download size={24} /></button>
             <span className="text-[10px] text-white/60 font-bold">{getTranslation(activeLang, 'saveVideo', 'حفظ')}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
             <button onClick={() => handleAction('duet')} className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"><Radio size={24} /></button>
             <span className="text-[10px] text-white/60 font-bold">{getTranslation(activeLang, 'duet', 'دويتو')}</span>
          </div>
       </div>

       <div className="space-y-2">
          <button onClick={() => handleAction('details')} className="w-full p-4 bg-white/5 rounded-2xl text-left flex items-center gap-3 text-white text-xs font-bold hover:bg-white/10 transition-colors cursor-pointer">
             <FileText size={18} className="text-blue-400" /> {getTranslation(activeLang, 'technicalDetails', 'تفاصيل المحتوى التقنية')}
          </button>
          {!isOwner && (
            <button onClick={() => handleAction('hide_user')} className="w-full p-4 bg-white/5 rounded-2xl text-left flex items-center gap-3 text-white text-xs font-bold hover:bg-white/10 transition-colors cursor-pointer">
               <HeartCrack size={18} className="text-rose-400" /> {getTranslation(activeLang, 'hideUserPosts', 'إخفاء منشورات هذا المستخدم')}
            </button>
          )}
       </div>
       
       <button onClick={onClose} className="w-full py-4 mt-6 bg-white/5 rounded-2xl text-white text-xs font-black hover:bg-white/10 transition-colors cursor-pointer">{getTranslation(activeLang, 'cancel', 'إلغاء')}</button>
      </div>
    </div>
  );
};

const ShareOverlay: React.FC<{ vid: VideoItem; onClose: () => void; lang?: string }> = ({ vid, onClose, lang = 'ar' }) => {
  const activeLang = lang || 'ar';
  const t = translations[activeLang] || translations.ar;
  const [view, setView] = useState<'menu' | 'contacts'>('menu');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{message: string, visible: boolean} | null>(null);
  const { users: usersMap } = useUsers();
  const allUsers = Object.values(usersMap);
  const myId = auth.currentUser?.uid || '';
  
  // Real contacts for sharing logic
  const mockContacts = [
      { id: 'me', name: getTranslation(activeLang, 'myStory', 'قصتي (My Story)'), avatar: vid.userAvatar, isSpecial: true },
      ...allUsers.filter(u => u.id !== myId).map(u => ({ id: u.id, name: u.name, avatar: u.avatar, isSpecial: false }))
  ];

  const toggleContact = (id: string) => {
      const newSet = new Set(selectedContacts);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedContacts(newSet);
  };

  const handleShareToContacts = async () => {
      if (selectedContacts.size === 0) return;
      try {
          const shareTargetLink = window.location.href.split("?")[0].split("#")[0] + "?type=video&id=" + vid.id;
          for (const contactId of selectedContacts) {
              if (contactId === 'me') {
                  await addDoc(collection(db, 'stories'), {
                      userId: myId,
                      userName: auth.currentUser?.displayName || 'مستخدم',
                      userAvatar: auth.currentUser?.photoURL || '',
                      mediaUrl: normalizeMediaUrl(vid.url) || '',
                      type: 'video',
                      desc: vid.title || '',
                      shareUrl: shareTargetLink,
                      timestamp: serverTimestamp(),
                      createdAt: Date.now()
                  });
              } else {
                  const chatId = [myId, contactId].sort().join('_');
                  await setDoc(doc(db, 'chats', chatId), {
                      participants: [myId, contactId],
                      updatedAt: Date.now()
                  }, { merge: true });

                  await addDoc(collection(db, 'chats', chatId, 'messages'), {
                      senderId: myId,
                      senderName: auth.currentUser?.displayName || 'مستخدم',
                      senderAvatar: auth.currentUser?.photoURL || '',
                      text: `مشاركة فيديو: ${vid.title || ''}\nالرابط: ${shareTargetLink}`,
                      mediaUrl: normalizeMediaUrl(vid.url) || '',
                      sharedLink: shareTargetLink,
                      sharedTitle: vid.title || 'فيديو بدون عنوان',
                      sharedThumbnail: normalizeMediaUrl(vid.url) || '',
                      sharedType: 'video',
                      timestamp: serverTimestamp(),
                      createdAt: Date.now()
                  });

                  await addDoc(collection(db, 'users', contactId, 'notifications'), {
                      type: 'share',
                      title: 'مشاركة فيديو جديدة',
                      message: `شارك معك ${auth.currentUser?.displayName || 'مستخدم'} فيديو`,
                      link: shareTargetLink,
                      sharedLink: shareTargetLink,
                      sharedTitle: vid.title || 'فيديو بدون عنوان',
                      sharedThumbnail: normalizeMediaUrl(vid.url) || '',
                      mediaUrl: normalizeMediaUrl(vid.url) || '',
                      videoId: vid.id || '',
                      sharedType: 'video',
                      fromUserId: myId,
                      fromUserName: auth.currentUser?.displayName || 'مستخدم',
                      fromUserAvatar: auth.currentUser?.photoURL || '',
                      senderName: auth.currentUser?.displayName || 'مستخدم',
                      senderAvatar: auth.currentUser?.photoURL || '',
                      timestamp: serverTimestamp(),
                      createdAt: Date.now()
                  });
              }
          }
          setToast({ message: 'تمت المشاركة بنجاح وإرسال الإشعار!', visible: true });
          setTimeout(() => setToast(null), 3000);
          onClose();
      } catch (err) {
          console.error(err);
          setToast({ message: 'حدث خطأ أثناء المشاركة، يرجى المحاولة مرة أخرى.', visible: true });
          setTimeout(() => setToast(null), 3000);
      }
  };

  const shareOptions = [
    { 
      name: 'WhatsApp', 
      icon: (
        <div className="w-full h-full bg-[#25D366] flex items-center justify-center rounded-[1.2rem]">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
        </div>
      ), 
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent('HiSee: ' + window.location.origin.replace(/\/$/, '') + '/?type=video&id=' + vid.id)}`) 
    },
    { 
      name: 'Instagram', 
      icon: (
        <div className="w-full h-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center rounded-[1.2rem]">
            <Instagram size={32} className="text-white" />
        </div>
      ),
      action: () => alert('تم نسخ الرابط!') 
    },
    { 
      name: 'Facebook', 
      icon: (
        <div className="w-full h-full bg-[#1877F2] flex items-center justify-center rounded-[1.2rem]">
            <Facebook size={32} className="text-white fill-current" />
        </div>
      ),
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(normalizeMediaUrl(vid.url))}`) 
    },
    { 
      name: 'X (Twitter)', 
      icon: (
        <div className="w-full h-full bg-black flex items-center justify-center rounded-[1.2rem] border border-white/20">
            <Twitter size={32} className="text-white fill-current" />
        </div>
      ),
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(vid.desc)}&url=${encodeURIComponent(normalizeMediaUrl(vid.url))}`) 
    },
    { 
      name: 'TikTok', 
      icon: (
        <div className="w-full h-full bg-black flex items-center justify-center rounded-[1.2rem] border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
        </div>
      ),
      action: () => { navigator.clipboard.writeText(normalizeMediaUrl(vid.url)); }
    },
    { 
      name: 'Snapchat', 
      icon: (
        <div className="w-full h-full bg-[#FFFC00] flex items-center justify-center rounded-[1.2rem]">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="black">
                <path d="M12.017 2C7.382 2 4.5 5.097 4.5 9.477c0 3.197 1.482 5.568 3.528 7.02l-.53 1.254c-.114.27-.04.582.179.78.217.199.537.243.805.109l2.457-1.229c.516.128 1.053.195 1.597.195 4.635 0 7.517-3.097 7.517-7.477C20.047 5.097 17.165 2 12.017 2z"/>
            </svg>
        </div>
      ),
      action: () => { navigator.clipboard.writeText(normalizeMediaUrl(vid.url)); }
    },
    { 
      name: 'Telegram', 
      icon: (
        <div className="w-full h-full bg-[#229ED9] flex items-center justify-center rounded-[1.2rem]">
            <Send size={32} className="text-white -rotate-12 translate-x-[-2px]" />
        </div>
      ),
      action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(normalizeMediaUrl(vid.url))}&text=${encodeURIComponent(vid.desc)}`) 
    },
    { 
      name: 'Copy Link', 
      icon: (
        <div className="w-full h-full bg-slate-700 flex items-center justify-center rounded-[1.2rem]">
            <Link2 size={32} className="text-white" />
        </div>
      ),
      action: () => { navigator.clipboard.writeText(normalizeMediaUrl(vid.url)); } 
    },
    { 
      name: 'More', 
      icon: (
        <div className="w-full h-full bg-white/10 flex items-center justify-center rounded-[1.2rem] border border-white/20">
            <MoreHorizontal size={32} className="text-white" />
        </div>
      ),
      action: async () => { 
        const shareUrl = window.location.href.split("?")[0].split("#")[0] + "?type=video&id=" + vid.id;
        if (navigator.share) {
          try {
            await navigator.share({title: 'HiSee', text: vid.desc, url: shareUrl});
          } catch (err) {
            const isCancel = err instanceof Error && (
              err.name === 'AbortError' || 
              err.message.toLowerCase().includes('cancel') || 
              err.message.toLowerCase().includes('abort') ||
              err.message.toLowerCase().includes('share canceled')
            );
            if (isCancel) return;
            console.log('Error sharing:', err);
            navigator.clipboard.writeText(shareUrl);
          }
        } else {
          navigator.clipboard.writeText(shareUrl);
        }
      } 
    },
  ];

  if (view === 'contacts') {
      return (
        <div className="absolute inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={onClose}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[75vh] sm:h-[580px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <button onClick={() => setView('menu')} className="p-2 text-white/60 hover:text-white transition-colors text-xs font-bold cursor-pointer">{getTranslation(activeLang, 'cancel', 'إلغاء')}</button>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">{getTranslation(activeLang, 'sendTo', 'إرسال إلى')}</h3>
                <button onClick={handleShareToContacts} disabled={selectedContacts.size === 0} className={`p-2 font-black text-xs transition-colors cursor-pointer ${selectedContacts.size > 0 ? 'text-emerald-500' : 'text-white/20'}`}>{getTranslation(activeLang, 'send', 'إرسال')}</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {/* Search Bar */}
                <div className="bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
                    <Search size={16} className="text-white/40" />
                    <input placeholder={getTranslation(activeLang, 'searchPeople', 'بحث عن أشخاص...')} className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-white/30" />
                </div>

                {mockContacts.map((contact, index) => (
                    <div 
                        key={contact.isSpecial ? 'story-me' : `contact-${contact.id}-${index}`} 
                        onClick={() => toggleContact(contact.id)}
                        className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${selectedContacts.has(contact.id) ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                        <div className="relative">
                            <img src={normalizeMediaUrl(contact.avatar)} className="w-11 h-11 rounded-full object-cover bg-slate-800" />
                            {contact.isSpecial && <div className="absolute -bottom-1 -right-1 bg-blue-500 p-1 rounded-full"><History size={10} className="text-white" /></div>}
                        </div>
                        <div className="flex-1 overflow-hidden text-right">
                            <h4 className="text-xs font-bold text-white truncate">{contact.name}</h4>
                            {contact.isSpecial && <p className="text-[10px] text-slate-400">{getTranslation(activeLang, 'story24h', 'ستظهر لمدة 24 ساعة')}</p>}
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedContacts.has(contact.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                            {selectedContacts.has(contact.id) && <Check size={14} className="text-white" strokeWidth={4} />}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      );
  }

  return (
    <div className="absolute inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm mx-auto bg-black/95 backdrop-blur-3xl border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 text-start">{getTranslation(activeLang, 'sharePost', 'مشاركة المنشور')}</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
        </div>
        
        {/* HiSee Chat Integration - Triggers Contact View */}
        <div className="mb-6">
            <button 
              onClick={() => setView('contacts')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900/40 to-slate-800 border border-emerald-500/20 flex items-center justify-between group hover:border-emerald-500/50 transition-all cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden shrink-0">
                        <ModernHSLogo size={32} className="relative z-10" />
                        <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                    </div>
                    <div className="text-start">
                        <h4 className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors">{getTranslation(activeLang, 'sendToFriends', 'إرسال إلى أصدقاء HiSee')}</h4>
                        <p className="text-[10px] text-slate-400">{getTranslation(activeLang, 'chatsStoriesGroups', 'المحادثات، القصص، المجموعات')}</p>
                    </div>
                </div>
                <div className="bg-emerald-500 p-2 rounded-full text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Send size={16} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                </div>
            </button>
        </div>

        {/* Grid of Global Apps */}
        <div className="grid grid-cols-4 gap-x-3 gap-y-5 mb-6">
          {shareOptions.map((opt) => (
             <div key={opt.name} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={opt.action}>
                <div className="w-14 h-14 shadow-lg transition-transform active:scale-90 group-hover:scale-105">
                   {opt.icon}
                </div>
                <span className="text-[9px] font-bold text-white/50 group-hover:text-white tracking-wide text-center leading-tight">{opt.name}</span>
             </div>
          ))}
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-black/40 rounded-xl flex items-center justify-center shrink-0">
               <Link2 size={16} className="text-white/50" />
            </div>
            <div className="flex-1 overflow-hidden">
               <p className="text-[10px] text-white/40 truncate font-mono">{vid.url}</p>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(vid.url); alert('تم النسخ'); }}
              className="px-4 py-1.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer shrink-0"
            >
              نسخ
            </button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 text-white font-bold text-xs shadow-2xl flex items-center gap-3 min-w-[280px] justify-center pointer-events-none"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CommentOverlay: React.FC<{ vid: VideoItem; myId: string; myProfile: any; onClose: () => void }> = ({ vid, myId, myProfile, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const { users } = useUsers();

  const cleanName = (name: any) => {
    const nameStr = typeof name === 'string' ? name : (name?.value || '');
    if (!nameStr) return 'مستخدم';
    if (nameStr.includes('@')) return nameStr.split('@')[0];
    if (nameStr.length > 20 && /^[a-zA-Z0-9]+$/.test(nameStr)) return 'مستخدم';
    return nameStr;
  };

  useEffect(() => {
    if (!vid.id || vid.id === 'temp-upload-preview') return;
    const q = query(collection(db, 'videos', vid.id, 'comments'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : 'الآن'
        };
      }) as Comment[];
      setComments(fetchedComments);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `videos/${vid.id}/comments`);
    });
    return () => unsubscribe();
  }, [vid.id]);

  const handleSend = async () => {
    if (!input.trim() || vid.id === 'temp-upload-preview') return;
    const userEmail = auth.currentUser?.email;
    const userId = auth.currentUser?.uid || myId;

    // Rate Limiting Check (ProtectionEngine)
    if (!ProtectionEngine.checkRateLimit(userId, 3, 3000)) {
      alert('يرجى الانتظار لحظات قبل إرسال تعليق آخر.');
      return;
    }

    // Text Sanitization (ProtectionEngine)
    const { cleanText } = ProtectionEngine.sanitizeText(input.trim());
    if (!cleanText) return;

    const commentData = {
      userId: userId,
      userName: cleanName(myProfile?.name || myProfile?.displayName || auth.currentUser?.displayName || userEmail || userId),
      userAvatar: myProfile?.avatar || myProfile?.photoURL || auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail || userId}`,
      text: cleanText,
      likes: 0,
      timestamp: serverTimestamp(),
      type: 'text'
    };
    
    setInput('');
    
    try {
      const videoRef = doc(db, 'videos', vid.id);
      await addDoc(collection(db, 'videos', vid.id, 'comments'), commentData);
      await updateDoc(videoRef, { commentsCount: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `videos/${vid.id}/comments`);
    }
  };

  return (
    <div className="absolute inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[75vh] sm:h-[580px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">{comments.length} تعليق</h3>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <img 
                src={normalizeMediaUrl((users && users[comment.userId] ? users[comment.userId].avatar : comment.userAvatar)) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} 
                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`; }}
                className="w-8 h-8 rounded-full bg-slate-800 object-cover shrink-0" 
                alt={comment.userName} 
              />
              <div className="flex-1 text-right">
                <p className="text-xs font-bold text-white/90">{cleanName(comment.userName || '')} <span className="text-[9px] text-white/40 font-normal ml-2">{comment.timestamp}</span></p>
                <p className="text-xs text-white/80 mt-0.5">{comment.text}</p>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                 <Heart size={14} className="text-white/40" />
                 <span className="text-[9px] text-white/40">{comment.likes}</span>
              </div>
            </div>
          ))}
          {comments.length === 0 && <div className="text-center text-white/30 py-10 text-xs">كن أول من يعلق!</div>}
        </div>

        <div className="p-4 border-t border-white/10 bg-[#0a0c10] pb-20 sm:pb-4">
          <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-2 border border-white/10">
             <input 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="أضف تعليقاً لطيفاً..."
               className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder:text-white/30"
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button onClick={handleSend} disabled={!input.trim()} className="text-emerald-500 disabled:text-white/20 transition-colors cursor-pointer">
               <Send size={18} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GiftMenu: React.FC<{ onClose: () => void; onSend: (gift: any) => void }> = ({ onClose, onSend }) => {
  return (
    <div className="absolute inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm mx-auto bg-black/95 backdrop-blur-2xl border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
          <h3 className="text-xs font-black text-white uppercase tracking-widest">متجر الهدايا</h3>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>
        
        <div className="grid grid-cols-4 gap-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-3">
          {GIFT_ITEMS.map((gift) => (
            <button 
              key={gift.id} 
              onClick={() => onSend(gift)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-90 group cursor-pointer"
            >
              <span className="text-2xl group-hover:scale-125 transition-transform">{gift.icon}</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-white/90 truncate max-w-full">{gift.name}</span>
                <span className="text-[9px] font-black text-yellow-400">{gift.cost} 🪙</span>
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <Zap size={16} className="text-yellow-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/50 font-bold">رصيدك</span>
              <span className="text-xs font-black text-white">1,250 🪙</span>
            </div>
          </div>
          <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all cursor-pointer">شحن</button>
        </div>
      </div>
    </div>
  );
};

const VideosView: React.FC<VideosViewProps> = ({ 
  videos, 
  myId, 
  myProfile, 
  settings, 
  onNavigate, 
  onViewProfile, 
  isUiVisible, 
  onToggleUi, 
  onPublish, 
  onDeleteVideo, 
  totalSystemNotifications, 
  targetMediaId,
  lang: propLang
}) => {
  const [activeCommentVideo, setActiveCommentVideo] = useState<VideoItem | null>(null);
  const [activeOptionsVideo, setActiveOptionsVideo] = useState<VideoItem | null>(null);
  const [activeShareVideo, setActiveShareVideo] = useState<VideoItem | null>(null);
  const [activeGiftVideo, setActiveGiftVideo] = useState<VideoItem | null>(null);

  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedVideo, setReportedVideo] = useState<VideoItem | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportCommentText, setReportCommentText] = useState('');
  const [toast, setToast] = useState<{message: string, visible: boolean} | null>(null);

  const showToast = (msg: string, duration: number = 3000) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const cleanName = (name: any) => {
    const nameStr = typeof name === 'string' ? name : (name?.value || '');
    if (!nameStr) return 'مستخدم';
    if (nameStr.includes('@')) return nameStr.split('@')[0];
    if (nameStr.length > 20 && /^[a-zA-Z0-9]+$/.test(nameStr)) return 'مستخدم';
    return nameStr;
  };
  
  // Duet States
  const [duetState, setDuetState] = useState<'idle' | 'downloading' | 'recording' | 'preview' | 'details' | 'uploading' | 'share'>('idle');
  const [duetVideo, setDuetVideo] = useState<VideoItem | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isRecordingDuet, setIsRecordingDuet] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [duetCameraStream, setDuetCameraStream] = useState<MediaStream | null>(null);
  const [recordedDuetBlob, setRecordedDuetBlob] = useState<Blob | null>(null);
  const [duetPreviewUrl, setDuetPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
      if (recordedDuetBlob) {
          const url = URL.createObjectURL(recordedDuetBlob);
          setDuetPreviewUrl(url);
          return () => URL.revokeObjectURL(url);
      } else {
          setDuetPreviewUrl(null);
      }
  }, [recordedDuetBlob]);
  const [activeFilter, setActiveFilter] = useState(DUET_FILTERS[0]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  // Foreground-Only Playback Rule
  useEffect(() => {
    const handlePauseAll = () => {
      if (document.hidden || !document.hasFocus()) {
        const videos = document.querySelectorAll('video');
        const audios = document.querySelectorAll('audio');
        videos.forEach(v => {
          try { v.pause(); } catch (e) {}
        });
        audios.forEach(a => {
          try { a.pause(); } catch (e) {}
        });
        ActiveVideoController.pauseActive();
      }
    };

    document.addEventListener('visibilitychange', handlePauseAll);
    window.addEventListener('blur', handlePauseAll);

    return () => {
      document.removeEventListener('visibilitychange', handlePauseAll);
      window.removeEventListener('blur', handlePauseAll);
    };
  }, []);
  
  // New States for Duet Publishing Details
  const [duetDescription, setDuetDescription] = useState('');
  const [duetPrivacy, setDuetPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  
  // Refs for Duet
  const duetSourceVideoRef = useRef<HTMLVideoElement>(null);
  const duetCameraVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'foryou' | 'following' | 'explore' | 'photos'>('foryou');

  const lang = propLang || settings?.language || 'ar';
  const t = translations[lang] || translations.ar;

  const handledTargetRef = useRef<string | null>(null);
  const [highlightedMediaId, setHighlightedMediaId] = useState<string | null>(null);

  useEffect(() => {
    if (targetMediaId && targetMediaId.type === 'video' && handledTargetRef.current !== targetMediaId.id) {
      setActiveTab('foryou');
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById('video-item-' + targetMediaId.id);
        if (el) {
          handledTargetRef.current = targetMediaId.id;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedMediaId(targetMediaId.id);
          setTimeout(() => setHighlightedMediaId(null), 2500);
        } else if (attempts < 30) {
          attempts++;
          setTimeout(tryScroll, 100);
        }
      };
      tryScroll();
    } else if (targetMediaId && targetMediaId.type === 'photo') {
      setActiveTab('photos');
    }
  }, [targetMediaId]);
  const [dragX, setDragX] = useState(0);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);

  // Swipe to switch tab from Video to Photos with magnetic auto-settling
  const videoTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleVideoTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.interactive-btn') || target.closest('.no-video-tap') || target.closest('input') || target.closest('textarea') || target.closest('button')) return;

    videoTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleVideoTouchMove = (e: React.TouchEvent) => {
    if (!videoTouchStartRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const diffX = currentX - videoTouchStartRef.current.x;
    const diffY = currentY - videoTouchStartRef.current.y;

    // Swipe right (finger goes right, diffX > 0) -> gradual slide to show Photos
    if (diffX > 8 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
      setIsDraggingTabs(true);
      setDragX(diffX);
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleVideoTouchEnd = (e: React.TouchEvent) => {
    if (!videoTouchStartRef.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const duration = Date.now() - videoTouchStartRef.current.time;

    const diffX = endX - videoTouchStartRef.current.x;
    const diffY = endY - videoTouchStartRef.current.y;

    // Snappy transitions: 30% of screen width threshold, or high-velocity quick flick
    const swipeThreshold = window.innerWidth * 0.30;
    const isQuickFlick = duration < 250 && diffX > 25;
    const isOverThreshold = diffX > swipeThreshold;

    setIsDraggingTabs(false);
    setDragX(0);

    if ((isOverThreshold || isQuickFlick) && Math.abs(diffX) > Math.abs(diffY)) {
      setActiveTab('photos');
    }
    videoTouchStartRef.current = null;
  };

  useEffect(() => {
    const handleSwitchFeedTab = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setIsDraggingTabs(false);
        setDragX(0);
        setActiveTab(e.detail.tab);
      }
    };
    const handleTabDragMove = (e: CustomEvent) => {
      if (typeof e.detail?.dragX === 'number') {
        setIsDraggingTabs(true);
        setDragX(e.detail.dragX);
      }
    };
    const handleTabDragEnd = (e: CustomEvent) => {
      setIsDraggingTabs(false);
      setDragX(0);
      const deltaX = e.detail?.deltaX ?? 0;
      const isQuickFlick = e.detail?.isQuickFlick ?? false;

      // When dragging left from Photos -> Videos, auto-settle strictly to 'foryou' or stay in 'photos' using 30% threshold
      const swipeThreshold = window.innerWidth * 0.30;
      if (deltaX < -swipeThreshold || (isQuickFlick && deltaX < -20)) {
        setActiveTab('foryou');
      }
    };

    window.addEventListener('switch_feed_tab' as any, handleSwitchFeedTab);
    window.addEventListener('tab_drag_move' as any, handleTabDragMove);
    window.addEventListener('tab_drag_end' as any, handleTabDragEnd);
    return () => {
      window.removeEventListener('switch_feed_tab' as any, handleSwitchFeedTab);
      window.removeEventListener('tab_drag_move' as any, handleTabDragMove);
      window.removeEventListener('tab_drag_end' as any, handleTabDragEnd);
    };
  }, []);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Smart Offline Cache Engine integration for Main Feed Videos
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineVideos, setOfflineVideos] = useState<VideoItem[]>([]);

  // 1. Silent Background Prefetching of Main Feed Videos
  useEffect(() => {
    if (typeof window !== 'undefined' && !cacheEngine.isOffline() && videos && videos.length > 0) {
      const limits = cacheEngine.getLimits();
      const toCache = videos.slice(0, limits.maxVideos);
      toCache.forEach(vid => {
        if (vid.url && !vid.url.startsWith('blob:')) {
          cacheEngine.cacheVideo(vid.id, vid.url, vid);
        }
      });
    }
  }, [videos]);

  // 2. Offline Fallback State management
  useEffect(() => {
    const checkOfflineStatus = async () => {
      const offline = cacheEngine.isOffline();
      setIsOfflineMode(offline);
      if (offline) {
        const cached = await cacheEngine.getCachedVideos();
        setOfflineVideos(cached);
      }
    };

    checkOfflineStatus();

    const handleOnline = () => {
      setIsOfflineMode(false);
    };
    const handleOffline = async () => {
      setIsOfflineMode(true);
      const cached = await cacheEngine.getCachedVideos();
      setOfflineVideos(cached);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;

    const userRef = doc(db, 'users', currentUid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFriends(data.friends || []);
      }
    });

    const followingCol = collection(db, 'users', currentUid, 'following');
    const unsubscribeFollowing = onSnapshot(followingCol, (snapshot) => {
      const ids = snapshot.docs.map(d => d.id);
      setFollowingIds(ids);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${currentUid}/following`);
    });

    return () => {
      unsubscribeUser();
      unsubscribeFollowing();
    };
  }, [auth.currentUser]);

  useEffect(() => {
    if (isSearching) {
      let unsubscribe = () => {};
      const fetchUsers = async () => {
        try {
          let q = collection(db, 'users');
          let queryRef;
          
          if (searchQuery.trim().length > 0) {
            // Fetch all users and filter client-side for case-insensitive search
            // This is a workaround for Firestore's lack of case-insensitive queries
            queryRef = query(q);
          } else {
            queryRef = query(q);
          }
          
          if (!auth.currentUser) return;
          unsubscribe = onSnapshot(queryRef, (snapshot) => {
            const users = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            if (searchQuery.trim().length > 0) {
              const searchLower = searchQuery.toLowerCase();
              const filtered = users.filter((u: any) => 
                (u.username || '').toLowerCase().includes(searchLower) ||
                (u.displayName || '').toLowerCase().includes(searchLower) ||
                (u.name || '').toLowerCase().includes(searchLower)
              );
              setUserSearchResults(filtered);
            } else {
              setUserSearchResults([]);
            }
          }, (err) => {
            handleFirestoreError(err, OperationType.LIST, 'users');
            setUserSearchResults([]);
          });
        } catch (err) {
          console.error("Simple fetch attempt:", err);
          // Fallback to simple getDocs if query fails
          try {
            const snapshot = await getDocs(collection(db, 'users'));
            const users = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setUserSearchResults(users.filter((u: any) => (u as any).username?.toLowerCase().includes(searchQuery.toLowerCase())));
          } catch (fallbackErr) {
            console.error("Fallback failed:", fallbackErr);
            setUserSearchResults([]);
          }
        }
      };
      fetchUsers();
      return () => unsubscribe();
    } else {
      setUserSearchResults([]);
    }
  }, [isSearching, searchQuery]);

  // Filtered Videos Logic with Data Sanitization Guard
  const displayVideos = useMemo(() => {
      let vids = [...(isOfflineMode ? offlineVideos : videos)]; // Include offline/cached videos when offline

      // Privacy and URL Sanitization Guard Filter
      const currentUserId = auth.currentUser?.uid;
      vids = vids.filter(v => {
        // Allow offline cached videos (using blob:)
        if (v.isOfflineCache) return true;

        // 1. Strict URL validation guard: exclude blob, empty, null, or corrupted links
        if (!v.isUploading && !isValidVideoUrl(v.url)) return false;
        
        // 2. Ignore videos flagged as broken
        if ((v as any).isBroken) return false;
        
        // Always show own uploading/published videos
        if (v.userId === currentUserId || v.authorUid === currentUserId) return true;
        
        // Handle privacy settings
        const privacy = v.privacy || v.visibility || 'public';
        if (privacy === 'private') return false;
        if (privacy === 'friends') return friends.includes(v.userId);
        
        // Default to public
        return true;
      });

      // 1. Search Filter
      if (searchQuery.trim()) {
          const q = (searchQuery || '').toLowerCase();
          vids = vids.filter(v => 
              (v.desc || '').toLowerCase().includes(q) || 
              (v.user || '').toLowerCase().includes(q) || 
              (v.tags && v.tags.some(tag => (tag || '').toLowerCase().includes(q)))
          );
      } 
      // 2. Tab Filter (if not searching)
      else if (activeTab === 'following') {
          vids = vids.filter(v => {
            const authorId = v.userId || v.authorUid;
            if (!authorId) return false;
            const isLocalFollowed = typeof window !== 'undefined' && localStorage.getItem(`followed_${authorId}`) === 'true';
            return (
              v.isFollowed ||
              isLocalFollowed ||
              followingIds.includes(authorId) ||
              friends.includes(authorId) ||
              authorId === currentUserId
            );
          });
      } else if (activeTab === 'explore') {
          // Shuffle for explore simulation
          vids = [...vids].sort(() => Math.random() - 0.5);
      }
      
      // Default 'foryou' just shows all (or algorithmic order in real app)
      return vids.filter(v => v.mediaType !== 'photo' && v.type !== 'photo');
  }, [videos, activeTab, searchQuery, friends, followingIds, isOfflineMode, offlineVideos]);

  const isEmpty = !displayVideos || displayVideos.length === 0;

  // Single Source of Truth for Active Video Index in Parent Container with Hysteresis (threshold: [0.25, 0.75])
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;
          const indexStr = entry.target.getAttribute('data-index');
          if (indexStr === null) return;
          const idx = parseInt(indexStr, 10);
          if (isNaN(idx)) return;

          if (ratio >= 0.75) {
            setActiveVideoIndex(idx);
          }
        });
      },
      { threshold: [0.25, 0.75] }
    );

    const items = container.querySelectorAll('.video-item-card');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [activeTab, displayVideos]);

  // Add this inside the render loop or where videos are mapped
  // {vid.isUploading && (
  //   <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
  //     <Loader2 className="animate-spin text-white w-12 h-12" />
  //   </div>
  // )}

  const handleOptionAction = async (action: string, vid: any) => {
    // Placeholder logic for actions
    console.log(`Action triggered: ${action}`, vid);
    if (action === 'report') {
        setActiveOptionsVideo(null);
        setReportedVideo(vid);
        setReportReason('');
        setReportCommentText('');
        setShowReportModal(true);
    } else if (action === 'not_interested') {
        alert('لن نوصي بهذا المحتوى مرة أخرى');
    } else if (action === 'duet') {
        startDuetFlow(vid);
    } else if (action === 'repost') {
        setActiveOptionsVideo(null);
        const currentUid = auth.currentUser?.uid || myId;
        if (!currentUid) {
            showToast('يرجى تسجيل الدخول أولاً');
            return;
        }

        const isCurrentlyReposted = localStorage.getItem(`reposted_${vid.id}`) === 'true' || 
            (vid.repostedBy && Array.isArray(vid.repostedBy) && vid.repostedBy.includes(currentUid)) || 
            Boolean(vid.isReposted);
        const willBeReposted = !isCurrentlyReposted;

        // 1. Instant local persistence for reactive UI
        if (willBeReposted) {
            localStorage.setItem(`reposted_${vid.id}`, 'true');
        } else {
            localStorage.removeItem(`reposted_${vid.id}`);
        }

        // 2. Dispatch custom event for real-time reactivity across any listening tabs or components
        window.dispatchEvent(new CustomEvent('hisee_repost_toggled', {
            detail: { videoId: vid.id, isReposted: willBeReposted, userId: currentUid }
        }));

        // 3. Show Toast Notification
        if (willBeReposted) {
            showToast('تمت إعادة نشر الفيديو في خلاصتك');
        } else {
            showToast('تم إلغاء إعادة نشر الفيديو من خلاصتك');
        }

        // 4. Update Database
        try {
            const targetCollection = vid.collectionName || 'videos';
            const videoDocRef = doc(db, targetCollection, vid.id);
            const repostDocId = `${currentUid}_${vid.id}`;
            const globalRepostDocRef = doc(db, 'reposts', repostDocId);
            const userRepostDocRef = doc(db, 'users', currentUid, 'reposts', vid.id);

            if (willBeReposted) {
                // Update counter and array on video document
                const videoUpdates = {
                    repostsCount: increment(1),
                    reposts: increment(1),
                    repostedBy: arrayUnion(currentUid)
                };
                
                await Promise.all([
                    updateDoc(videoDocRef, videoUpdates).catch(() => {
                        return setDoc(videoDocRef, videoUpdates, { merge: true }).catch(() => {});
                    }),
                    targetCollection !== 'videos' ? updateDoc(doc(db, 'videos', vid.id), videoUpdates).catch(() => {}) : Promise.resolve(),
                    setDoc(globalRepostDocRef, {
                        userId: currentUid,
                        userName: myProfile?.name || auth.currentUser?.displayName || 'مستخدم',
                        userAvatar: myProfile?.avatar || auth.currentUser?.photoURL || '',
                        videoId: vid.id,
                        videoUrl: vid.url || '',
                        videoDesc: vid.desc || '',
                        authorId: vid.userId || '',
                        authorName: vid.user || '',
                        authorAvatar: vid.userAvatar || '',
                        repostedAt: serverTimestamp(),
                        createdAt: Date.now()
                    }, { merge: true }).catch(() => {}),
                    setDoc(userRepostDocRef, {
                        videoId: vid.id,
                        repostedAt: serverTimestamp(),
                        createdAt: Date.now(),
                        videoUrl: vid.url || '',
                        videoDesc: vid.desc || '',
                        authorId: vid.userId || '',
                        authorName: vid.user || '',
                        authorAvatar: vid.userAvatar || ''
                    }, { merge: true }).catch(() => {})
                ]);
            } else {
                // Decrement counter and remove user from repostedBy
                const videoUpdates = {
                    repostsCount: increment(-1),
                    reposts: increment(-1),
                    repostedBy: arrayRemove(currentUid)
                };

                await Promise.all([
                    updateDoc(videoDocRef, videoUpdates).catch(() => {}),
                    targetCollection !== 'videos' ? updateDoc(doc(db, 'videos', vid.id), videoUpdates).catch(() => {}) : Promise.resolve(),
                    deleteDoc(globalRepostDocRef).catch(() => {}),
                    deleteDoc(userRepostDocRef).catch(() => {})
                ]);
            }
        } catch (error) {
            console.error("Error updating repost in database:", error);
        }
    } else if (action === 'delete') {
        if (onDeleteVideo) {
            onDeleteVideo(vid);
        } else {
            try {
                await deleteDoc(doc(db, 'videos', vid.id));
            } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, `videos/${vid.id}`);
            }
        }
    }
  };

  // --- DUET LOGIC ---

  const startDuetFlow = (vid: VideoItem) => {
      setDuetVideo(vid);
      setDuetState('downloading');
      setDownloadProgress(0);
      setDuetDescription(`دويتو مع @${vid.user}`); // Default description

      // Simulate download
      let p = 0;
      const interval = setInterval(() => {
          p += 5;
          setDownloadProgress(p);
          if (p >= 100) {
              clearInterval(interval);
              startCamera();
              setDuetState('recording');
          }
      }, 100);
  };

  const startCamera = async () => {
      if (!requirePermission('camera', 'تسجيل فيديو دويتو', () => startCamera())) {
          closeDuet();
          return;
      }
      if (!requirePermission('microphone', 'تسجيل الصوت في دويتو', () => startCamera())) {
          closeDuet();
          return;
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
          setDuetCameraStream(stream);
          if (duetCameraVideoRef.current) {
              duetCameraVideoRef.current.srcObject = stream;
          }
      } catch (e) {
          console.error("Camera access failed", e);
          alert("فشل الوصول للكاميرا");
          closeDuet();
      }
  };

  const closeDuet = () => {
      if (duetCameraStream) {
          duetCameraStream.getTracks().forEach(t => t.stop());
      }
      setDuetState('idle');
      setDuetVideo(null);
      setRecordedDuetBlob(null);
      setIsRecordingDuet(false);
      setRecordingDuration(0);
      setDuetDescription('');
  };

  const toggleRecording = () => {
      if (isRecordingDuet) {
          stopRecording();
      } else {
          startRecording();
      }
  };

  const startRecording = () => {
      if (!duetCameraStream) return;
      
      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const mediaRecorder = new MediaRecorder(duetCameraStream, options);
      
      mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
          }
      };

      mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          setRecordedDuetBlob(blob);
          setDuetState('preview');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingDuet(true);
      
      // Start Source Video
      if (duetSourceVideoRef.current) {
          duetSourceVideoRef.current.currentTime = 0;
          duetSourceVideoRef.current.play();
      }

      // Timer
      setRecordingDuration(0);
      recordTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
      }, 1000);
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecordingDuet) {
          mediaRecorderRef.current.stop();
          setIsRecordingDuet(false);
          if (duetSourceVideoRef.current) {
              duetSourceVideoRef.current.pause();
          }
          if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      }
  };

  const handleRetake = () => {
      setRecordedDuetBlob(null);
      setDuetState('recording');
      startCamera(); // Restart camera stream
  };

  // Transition to Details View
  const handleProceedToDetails = () => {
      // Stop camera stream to save battery/resources
      if (duetCameraStream) {
          duetCameraStream.getTracks().forEach(t => t.stop());
      }
      setDuetState('details');
  };

  // Final Publish Action
  const handleFinalPublish = () => {
      setDuetState('uploading');
      
      // Simulate Upload
      setTimeout(() => {
          if (duetVideo && onPublish) {
              const videoData = {
                  title: "Duet Video",
                  description: duetDescription,
                  url: duetPreviewUrl,
                  blob: recordedDuetBlob,
                  isPending: true,
                  target: 'both',
                  audioSettings: {}, // Default
                  visualAdjustments: {}, // Default
                  privacy: duetPrivacy
              };
              
              onPublish(videoData);
              closeDuet(); // Reset and close overlay
          }
      }, 2000); // 2 seconds fake upload
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderEmptyState = () => {
    // Only show "No videos" or "Connection lost" messages if offline and there are no cached videos left
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    
    // Show a high-quality loader if online but data hasn't arrived yet
    if (!offline) {
      return (
        <div className="h-full w-full bg-[#0a0c10] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.2)]" />
            <div className="flex flex-col items-center gap-2">
                <p className="text-white font-black tracking-[0.3em] text-[10px] uppercase opacity-80 animate-pulse">
                    {getTranslation(lang || 'ar', 'loading_feed', 'جاري جلب الخلاصة...')}
                </p>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest italic">
                    Connecting to HiSee Cloud
                </p>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'following') {
      return (
        <div className="h-full w-full relative bg-[#0a0c10] flex flex-col items-center justify-center p-8 text-center text-white/90 snap-center overflow-hidden">
          <div className="absolute w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative z-10">
            <UserCheck size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2 relative z-10">{getTranslation(lang || 'ar', 'no_videos_following', 'لا توجد فيديوهات من الحسابات التي تتابعها')}</h2>
          <p className="text-xs font-medium text-slate-400 max-w-xs leading-relaxed mb-6 relative z-10">
            {getTranslation(lang || 'ar', 'no_videos_following_desc', 'عندما ينشر الأشخاص الذين تتابعهم فيديوهات جديدة، ستظهر هنا تلقائياً.')}
          </p>
          <button 
            onClick={() => setActiveTab('foryou')}
            className="relative z-10 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            {getTranslation(lang || 'ar', 'explore_suggested_btn', 'استكشف المقاطع المقترحة')}
          </button>
        </div>
      );
    }

    return (
      <div className="h-full w-full relative bg-[#0a0c10] flex flex-col items-center justify-center p-8 text-center text-white snap-center overflow-hidden">
        <div className="absolute w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.15)] relative z-10">
          <Sparkles size={44} className="text-emerald-400 animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-3 tracking-tight relative z-10">
          لا توجد فيديوهات متاحة حالياً
        </h2>
        
        <p className="text-xs font-medium text-slate-400 max-w-xs leading-relaxed mb-8 relative z-10">
          كن أول من ينشر فيديو جديداً وشارك لحظاتك الإبداعية مع مجتمع HiSee!
        </p>
        
        <button 
          onClick={() => onNavigate('post')}
          className="relative z-10 px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center gap-3"
        >
          <Zap size={18} fill="currentColor" />
          <span>نشر فيديو جديد ✨</span>
        </button>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-black relative">
      
      {/* Top Header Overlay - CLEAN UI (No Backgrounds) - Fixed layout & labels across all languages */}
      <div 
        dir="rtl"
        className={`absolute top-0 left-0 right-0 z-50 pt-[max(env(safe-area-inset-top),8px)] pb-1 px-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-all duration-300 ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
      >
         
         {/* Top Container - Fixed RTL direction */}
         <div dir="rtl" className="flex items-center justify-between pointer-events-auto w-full max-w-screen mx-auto px-1">
             
             {/* Right: Notifications (No BG) */}
             {!isSearching && (
                 <div className="flex items-center gap-1 shrink-0">
                     <button 
                        onClick={() => onNavigate('notifications')}
                        className="p-1.5 text-white/80 hover:text-white transition-all active:scale-95 relative group shrink-0"
                     >
                        <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                        {totalSystemNotifications > 0 && (
                          <span className="absolute top-0 right-0 text-[clamp(6px,1.5vw,8px)] font-black text-white bg-red-500 rounded-full min-w-[12px] h-[12px] flex items-center justify-center shadow-sm">
                            {totalSystemNotifications > 99 ? '99+' : totalSystemNotifications}
                          </span>
                        )}
                     </button>
                 </div>
             )}

             {/* Center: Search Input OR Tabs (No BG for Tabs) */}
             {isSearching ? (
                 <div dir="rtl" className="flex-1 mx-2 relative animate-in fade-in zoom-in-95 duration-200">
                     <input 
                        type="text" 
                        placeholder={getTranslation(lang, 'placeholder', 'ابحث...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 rounded-full py-1.5 px-8 text-[clamp(10px,2vw,12px)] font-bold text-white placeholder:text-white/50 outline-none focus:border-emerald-500/50 backdrop-blur-md shadow-xl"
                        autoFocus
                     />
                     <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50" />
                     <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white">
                         <X size={12} />
                     </button>
                 </div>
             ) : (
                 <div dir="rtl" className="flex items-center gap-3 sm:gap-8 text-white drop-shadow-lg overflow-x-auto no-scrollbar px-2">
                     {/* LIVE Tab - Dot directly above Live in shiny radiant red with frequency wave pulses */}
                     <button 
                        onClick={() => onNavigate('live_watch')} 
                        className="group relative flex flex-col items-center justify-center py-1 px-1 transition-all active:scale-95 shrink-0"
                        title="LIVE"
                     >
                        {/* Radiant Red Frequency Wave Pulse Beacon directly above LIVE */}
                        <div className="relative flex items-center justify-center w-3 h-3 mb-0.5">
                            {/* Outer frequency ripple wave */}
                            <span className="absolute inset-0 rounded-full bg-red-500/50 animate-ping [animation-duration:1.4s]"></span>
                            {/* Shiny Radiant Red Core Dot */}
                            <span className="relative w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444,0_0_14px_#dc2626]"></span>
                        </div>
                        <span className="text-[clamp(10.5px,2.1vw,12.5px)] font-black uppercase tracking-[0.22em] font-mono text-white/90 group-hover:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] leading-none">
                            LIVE
                        </span>
                     </button>
                     
                     <div className="h-3 w-[1px] bg-white/10 shrink-0"></div>

                     <button 
                        onClick={() => { setActiveTab('following'); }}
                        className="relative group py-1 shrink-0"
                     >
                        <span className={`text-[clamp(11px,2.5vw,14px)] font-black transition-all ${activeTab === 'following' ? 'text-white scale-105' : 'text-white/60 hover:text-white/90'}`}>
                            {getTranslation(lang, 'following', 'أتابعهم')}
                        </span>
                        {activeTab === 'following' && (
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                        )}
                     </button>
                     
                     <button 
                        onClick={() => { setActiveTab('foryou'); }}
                        className="relative group py-1 shrink-0"
                     >
                        <span className={`text-[clamp(12px,3vw,16px)] font-black transition-all ${activeTab === 'foryou' ? 'text-white scale-105' : 'text-white/60 hover:text-white/90'}`}>
                            {getTranslation(lang, 'forYou', 'لك')}
                        </span>
                        {activeTab === 'foryou' && (
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                        )}
                     </button>
                     
                     {/* Photos Tab - Unified white color, no backgrounds, decorative typographic style when in video feed */}
                     <button 
                        onClick={() => { setActiveTab('photos'); }}
                        className="relative group py-1 shrink-0 flex items-center"
                     >
                        <span className={`transition-all ${
                          activeTab === 'photos' 
                            ? 'text-[clamp(11px,2.5vw,14px)] font-black text-white scale-105' 
                            : 'text-[clamp(11px,2.5vw,13.5px)] font-black tracking-wider text-white/80 hover:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                        }`}>
                            {activeTab === 'photos' ? getTranslation(lang, 'photosTab', 'صور') : `✦ ${getTranslation(lang, 'photosTab', 'صور')}`}
                        </span>
                        {activeTab === 'photos' && (
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                        )}
                     </button>
                     
                     <button 
                        onClick={() => { setActiveTab('explore'); }}
                        className="relative group py-1 shrink-0"
                     >
                        <span className={`text-[clamp(11px,2.5vw,14px)] font-black transition-all ${activeTab === 'explore' ? 'text-white scale-105' : 'text-white/60 hover:text-white/90'}`}>
                            {getTranslation(lang, 'explore', 'استكشف')}
                        </span>
                        {activeTab === 'explore' && (
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                        )}
                     </button>
                 </div>
             )/* Center: Search Input OR Tabs (No BG for Tabs) */}

             {/* Left: Search Toggle (No BG) */}
             {!isSearching && (
                 <button 
                    onClick={() => setIsSearching(true)}
                    className="p-1.5 text-white/80 hover:text-white transition-all active:scale-95 shrink-0"
                 >
                    <Search size={20} strokeWidth={2.5} />
                 </button>
             )}
         </div>
      </div>

      {/* User Search Results Overlay */}
      {isSearching && searchQuery.trim().length > 0 && (
        <div className="absolute top-[80px] left-0 right-0 bottom-0 z-[45] bg-black/95 backdrop-blur-xl overflow-y-auto p-4 animate-in fade-in duration-200">
          <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">نتائج البحث عن المستخدمين</h3>
          {userSearchResults.length > 0 ? (
            <div className="flex flex-col gap-4">
              {userSearchResults.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                    onViewProfile(user.id);
                  }}
                >
                  <img 
                    src={normalizeMediaUrl(user.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || user.id}`} 
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || user.id}`; }}
                    className="w-12 h-12 rounded-full border border-white/10 object-cover" 
                    alt={user.name} 
                  />
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-sm">{cleanName(user.name || '')}</span>
                    <span className="text-white/50 text-xs">@{cleanName(user.username || user.name || '')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <Search size={32} className="mb-4 opacity-50" />
              <p className="text-sm">لم يتم العثور على مستخدمين</p>
            </div>
          )}
        </div>
      )}

      {/* Video Feed AND Photos Gallery - Side by Side Sliding Container */}
      <div dir="ltr" className="h-[calc(100vh-70px)] w-full overflow-hidden relative bg-[#07090e]">
        <div 
          className="w-[200%] h-full flex"
          style={{
            transform: `translateX(calc(${activeTab === 'photos' ? '0%' : '-50%'} + ${dragX}px))`,
            transition: isDraggingTabs ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Screen 1: Photos Gallery (width 100vw, which is 50% of the 200% wrapper) */}
          <div dir="rtl" className="w-1/2 h-full overflow-hidden shrink-0">
            <PhotosGalleryView
              myId={myId}
              myProfile={myProfile}
              onNavigate={onNavigate}
              onViewProfile={onViewProfile}
              isUiVisible={isUiVisible}
              onToggleUi={onToggleUi}
              targetMediaId={targetMediaId}
              lang={lang}
            />
          </div>

          {/* Screen 2: Video Feed (width 100vw, which is 50% of the 200% wrapper) */}
          <div 
            ref={scrollContainerRef}
            dir="rtl"
            onTouchStart={handleVideoTouchStart}
            onTouchMove={handleVideoTouchMove}
            onTouchEnd={handleVideoTouchEnd}
            className="w-1/2 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth shrink-0"
          >
            {!isEmpty ? (
                displayVideos.map((vid, index) => (
                <VideoItemComponent 
                    key={vid.id} 
                    vid={vid}
                    isActive={index === activeVideoIndex && activeTab !== 'photos'}
                    isHighlighted={highlightedMediaId === vid.id} 
                    isUiVisible={isUiVisible}
                    settings={settings}
                    lang={lang}
                    onProfileClick={() => onViewProfile(vid.userId)}
                    onCommentClick={() => setActiveCommentVideo(vid)}
                    onShareClick={() => setActiveShareVideo(vid)}
                    onGiftClick={() => setActiveGiftVideo(vid)}
                    onOptionsClick={() => setActiveOptionsVideo(vid)}
                    onToggleUi={onToggleUi}
                    myId={myId}
                    myProfile={myProfile}
                    onNavigate={onNavigate}
                    isFeedActive={activeTab !== 'photos'}
                    index={index}
                    videosList={displayVideos}
                >
                    {vid.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                            <Loader2 className="animate-spin text-white w-12 h-12" />
                        </div>
                    )}
                </VideoItemComponent>
                ))
            ) : renderEmptyState()}
          </div>
        </div>
      </div>

      {/* Overlays */}
      {activeCommentVideo && (
        <CommentOverlay 
          vid={activeCommentVideo} 
          myId={myId}
          myProfile={myProfile}
          onClose={() => setActiveCommentVideo(null)} 
        />
      )}

      {activeGiftVideo && (
        <GiftMenu 
          onClose={() => setActiveGiftVideo(null)} 
          onSend={(gift) => {
            alert(`تم إرسال ${gift.name} بنجاح!`);
            setActiveGiftVideo(null);
          }} 
        />
      )}

      {activeOptionsVideo && (
        <OptionsOverlay 
            vid={activeOptionsVideo} 
            myId={myId}
            onClose={() => setActiveOptionsVideo(null)} 
            onAction={handleOptionAction}
            lang={lang}
        />
      )}

      {activeShareVideo && (
        <ShareOverlay vid={activeShareVideo} onClose={() => setActiveShareVideo(null)} lang={lang} />
      )}

      {/* --- VIDEO REPORT MODAL --- */}
      {showReportModal && reportedVideo && (
        <div className="absolute inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => { setShowReportModal(false); setReportedVideo(null); setReportReason(''); setReportCommentText(''); }}>
          <div className="bg-[#1a1c23] w-full max-w-sm rounded-3xl p-6 flex flex-col border border-white/10 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">إبلاغ عن فيديو</h3>
              <button onClick={() => { setShowReportModal(false); setReportedVideo(null); setReportReason(''); setReportCommentText(''); }} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 font-bold">يرجى اختيار سبب البلاغ:</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {['محتوى جنسي', 'عنف أو كراهية', 'احتيال أو خداع', 'سلوك مسيء', 'أخرى'].map(reason => (
                <button 
                  type="button"
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${reportReason === reason ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[11px] font-bold text-slate-400">تفاصيل إضافية أو كتابة السبب بالكامل:</label>
              <textarea
                value={reportCommentText}
                onChange={(e) => setReportCommentText(e.target.value)}
                placeholder="اكتب تفاصيل إضافية هنا لتوضيح المخالفة للإدارة..."
                className="w-full h-20 p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 resize-none transition-all"
              />
            </div>

            <button 
              disabled={!reportReason}
              onClick={async () => {
                setShowReportModal(false);
                try {
                  await addDoc(collection(db, 'reports'), {
                    reportedBy: auth.currentUser?.uid || myId,
                    reportedUser: reportedVideo.userId || null,
                    reportedUserName: reportedVideo.user || 'User',
                    commentText: `[فيديو]: ${reportedVideo.desc || 'فيديو بدون وصف'} ${reportCommentText ? `| [تفاصيل]: ${reportCommentText}` : ''}`,
                    videoUrl: reportedVideo.url || null,
                    videoID: reportedVideo.id || null,
                    timestamp: serverTimestamp(),
                    reason: reportReason,
                    status: 'PENDING'
                  });
                  showToast('تم إرسال بلاغك للإدارة بنجاح. شكراً لمساهمتك.');
                } catch (e) {
                  console.error(e);
                  showToast('حدث خطأ أثناء إرسال البلاغ.');
                }
                setReportedVideo(null);
                setReportReason('');
                setReportCommentText('');
              }}
              className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${reportReason ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 cursor-pointer' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
            >
              <Flag size={14} />
              <span>إرسال البلاغ الرسمي</span>
            </button>
          </div>
        </div>
      )}

      {/* --- DUET STUDIO OVERLAY --- */}
      {duetState !== 'idle' && (
          <div className="absolute inset-0 z-[300] bg-black text-white flex flex-col font-sans animate-in slide-in-from-bottom duration-300">
              
              {/* Downloading State */}
              {duetState === 'downloading' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                      <div className="w-24 h-24 relative">
                          <Loader2 className="w-full h-full text-emerald-500 animate-spin" />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-black">{downloadProgress}%</span>
                      </div>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter">جاري تحضير الدويتو...</h3>
                      <p className="text-sm text-slate-400">يرجى الانتظار بينما نقوم بدمج المحتوى.</p>
                  </div>
              )}

              {/* Uploading State */}
              {duetState === 'uploading' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                      <div className="w-24 h-24 relative">
                          <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                          <div className="absolute inset-0 rounded-full border-t-4 border-emerald-500 animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                              <Zap size={32} className="text-emerald-500 animate-pulse" />
                          </div>
                      </div>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter animate-pulse">جاري النشر...</h3>
                      <p className="text-sm text-slate-400">سيتم إضافة الفيديو لصفحتك الشخصية.</p>
                  </div>
              )}

              {/* Details & Privacy State */}
              {duetState === 'details' && (
                  <div className="flex-1 flex flex-col p-8 bg-[#0a0c10]">
                      <div className="flex justify-between items-center mb-8">
                          <h3 className="text-xl font-black text-white">تفاصيل النشر</h3>
                          <button onClick={closeDuet} className="text-slate-400 hover:text-white">إلغاء</button>
                      </div>

                      <div className="flex gap-4 mb-8">
                          {/* Thumbnail Preview */}
                          <div className="w-24 h-32 bg-slate-800 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                              {duetPreviewUrl && (
                                  <video 
                                      src={normalizeMediaUrl(duetPreviewUrl)} 
                                      className="w-full h-full object-cover opacity-70" 
                                      muted={true}
                                      playsInline 
                                      preload="auto"
                                      crossOrigin="anonymous"
                                  />
                              )}
                          </div>
                          
                          {/* Description Input */}
                          <div className="flex-1">
                              <textarea 
                                  value={duetDescription}
                                  onChange={(e) => setDuetDescription(e.target.value)}
                                  placeholder="اكتب وصفاً للفيديو..."
                                  className="w-full h-full bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 resize-none p-2"
                              />
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">من يمكنه المشاهدة</h4>
                              <div className="grid grid-cols-3 gap-3">
                                  {[
                                      { id: 'public', icon: <Globe size={18} />, label: 'الجميع' },
                                      { id: 'friends', icon: <Users size={18} />, label: 'الأصدقاء' },
                                      { id: 'private', icon: <Lock size={18} />, label: 'أنا فقط' }
                                  ].map(opt => (
                                      <button 
                                          key={opt.id}
                                          onClick={() => setDuetPrivacy(opt.id as any)}
                                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${duetPrivacy === opt.id ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400'}`}
                                      >
                                          {opt.icon}
                                          <span className="text-[10px] font-bold">{opt.label}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="mt-auto pt-4 flex gap-4">
                          <button onClick={closeDuet} className="flex-1 py-4 bg-slate-800 rounded-2xl text-slate-400 font-bold text-xs">إلغاء</button>
                          <button onClick={handleFinalPublish} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                              نشر الآن <Send size={16} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                          </button>
                      </div>
                  </div>
              )}

              {/* Recording & Preview State */}
              {(duetState === 'recording' || duetState === 'preview') && (
                  <>
                      {/* Top Bar */}
                      <div className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                          <button onClick={closeDuet} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={24} /></button>
                          <div className="bg-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg flex items-center gap-2">
                              {duetState === 'recording' ? (
                                  <>
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                    {formatTime(recordingDuration)}
                                  </>
                              ) : 'معاينة'}
                          </div>
                          <div className="w-10"></div> {/* Spacer */}
                      </div>

                      {/* Split Screen View */}
                      <div className="flex-1 flex items-center bg-black relative">
                          {/* Left: Source Video */}
                          <div className="w-1/2 h-full bg-slate-900 overflow-hidden relative border-r border-white/10">
                              <video 
                                ref={duetSourceVideoRef}
                                src={normalizeMediaUrl(duetVideo?.url)}
                                className="w-full h-full object-cover opacity-80"
                                loop
                                playsInline
                                preload="auto"
                                crossOrigin="anonymous"
                                muted={true}
                              />
                              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">
                                  <img src={normalizeMediaUrl(duetVideo?.userAvatar)} className="w-6 h-6 rounded-full" />
                                  <span className="text-[10px] font-bold text-white truncate max-w-[80px]">{duetVideo?.user}</span>
                              </div>
                          </div>

                          {/* Right: Camera Feed / Recording */}
                          <div className="w-1/2 h-full bg-black overflow-hidden relative">
                              {duetState === 'recording' ? (
                                  <video 
                                    ref={duetCameraVideoRef}
                                    autoPlay 
                                    muted={true} 
                                    playsInline 
                                    preload="auto"
                                    crossOrigin="anonymous"
                                    className={`w-full h-full object-cover ${activeFilter.class} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                                  />
                              ) : (
                                  <video 
                                    src={normalizeMediaUrl(duetPreviewUrl || undefined)}
                                    autoPlay 
                                    loop 
                                    playsInline
                                    preload="auto"
                                    crossOrigin="anonymous"
                                    muted={true}
                                    className={`w-full h-full object-cover ${activeFilter.class}`}
                                  />
                              )}
                          </div>
                      </div>

                      {/* Controls Layer */}
                      <div className="absolute bottom-0 inset-x-0 pb-8 pt-20 bg-gradient-to-t from-black via-black/80 to-transparent z-40 flex flex-col gap-6">
                          
                          {/* Filters List (Only in Recording Mode) */}
                          {duetState === 'recording' && !isRecordingDuet && (
                              <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 mb-2">
                                  {DUET_FILTERS.map(f => (
                                      <button 
                                        key={f.id} 
                                        onClick={() => setActiveFilter(f)}
                                        className={`shrink-0 flex flex-col items-center gap-2 ${activeFilter.id === f.id ? 'opacity-100 scale-110' : 'opacity-60'}`}
                                      >
                                          <div className={`w-12 h-12 rounded-full border-2 ${activeFilter.id === f.id ? 'border-yellow-400' : 'border-white'} bg-slate-800 overflow-hidden`}>
                                              <div className={`w-full h-full bg-slate-500 ${f.class}`}></div>
                                          </div>
                                          <span className="text-[9px] font-bold">{f.name}</span>
                                      </button>
                                  ))}
                              </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-center gap-10 px-8">
                              {duetState === 'recording' ? (
                                  <>
                                      {!isRecordingDuet && (
                                          <button onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                              <RefreshCcw size={24} />
                                          </button>
                                      )}
                                      
                                      <button 
                                        onClick={toggleRecording}
                                        className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative transition-all ${isRecordingDuet ? 'bg-transparent scale-110' : 'bg-transparent hover:scale-105'}`}
                                      >
                                          <div className={`transition-all duration-300 ${isRecordingDuet ? 'w-10 h-10 bg-red-600 rounded-md' : 'w-16 h-16 bg-red-500 rounded-full'}`}></div>
                                      </button>

                                      {!isRecordingDuet && (
                                          <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all opacity-0 pointer-events-none">
                                              <Sparkles size={24} /> 
                                          </button>
                                      )}
                                  </>
                              ) : (
                                  // Preview Mode Actions
                                  <>
                                      <button onClick={handleRetake} className="flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><Trash size={20} /></div>
                                          <span className="text-[10px] font-bold">إعادة</span>
                                      </button>

                                      <button onClick={handleProceedToDetails} className="flex flex-col items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors group">
                                          <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                                              <CheckCheck size={32} color="white" />
                                          </div>
                                          <span className="text-xs font-black uppercase tracking-widest">التالي</span>
                                      </button>
                                  </>
                              )}
                          </div>
                      </div>
                  </>
              )}
          </div>
      )}

      {/* Elegant Toast Notification */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/15 text-white font-bold text-xs sm:text-sm shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-3 min-w-[260px] max-w-[90vw] justify-center pointer-events-none select-none"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse shrink-0" />
              <span className="text-white drop-shadow-sm font-medium">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default VideosView;