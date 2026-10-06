// ... (imports)
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } from 'react';
import { 
  ArrowLeft, ArrowRight, MoreVertical, Phone, Video, Search, Smile, Mic, Image as ImageIcon, 
  Send, Check, CheckCheck, Clock, MapPin, User as UserIcon, BarChart2, FileText, Download, 
  Eye, Pause, Play, Settings2, Camera, X, Sparkles, RefreshCcw, Aperture,
  PhoneOff, MicOff, VideoOff, Square, Volume2, VolumeX, Smartphone, StopCircle, Sticker, Gift, Zap, Plus,
  PlusCircle, MinusCircle, Users, BarChart3, Navigation, Crosshair, UserPlus, UserMinus, Scissors,
  Trash2, Ban, Flag, Bell, BellOff, Search as SearchIcon, LayoutGrid, Palette, Lock, Info, ChevronDown, ChevronUp, Activity, Maximize2, Wrench, LogOut,
  Reply, Heart, Share2, Forward, Loader2, Globe, AlertCircle, Radio, Star, Headphones, Music, EyeOff, Pin, UserCheck,
  Archive, UserX, Type, Shield, Languages
} from 'lucide-react';
import { ChatTranslatorBar } from '../src/components/chat/translation/ChatTranslatorBar';
import { 
  onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, 
  where, doc, setDoc, deleteDoc, updateDoc, getDocs, getDoc, limit, increment, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { auth, db as firestoreDb, storage } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

// End-to-End Encryption Helpers removed (moved to useEncryptedChat hook)

import { Chat, Message, Language, User as UserType, AppSettings } from '../types';
import { parseDate, formatLastSeenArabic, isUserOnline, cleanUsername, extractStringValue } from '../lib/helpers';
import { peerService } from '../services/peerService';
import { translations, getTranslation } from '../translations';
import ProfileView from './ProfileView';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { translateTextFree, resolveBidirectionalLanguages, AVAILABLE_TRANSLATOR_LANGUAGES } from '../src/lib/freeTranslator';
import { ChatMessageList } from './ChatMessageList';
import { AIImageModal } from './AIImageModal';
import ModernHSLogo from './ModernHSLogo';
import { motion, AnimatePresence } from 'motion/react';
import { useUsers } from '../src/contexts/UserContext';
import { ChatHeader } from '../src/components/chat/ChatHeader';
import { MessageInputBar } from '../src/components/chat/MessageInputBar';
import { CallManagerModal } from '../src/components/calls/CallManagerModal';
import { PinnedMediaCard, PinnedItem } from '../src/components/chat/PinnedMediaCard';
import { AudioCallModal } from '../src/components/calls/AudioCallModal';
import { VideoCallModal } from '../src/components/calls/VideoCallModal';
import { AvatarRippleLoader } from '../src/components/calls/AvatarRippleLoader';
import { ChatMediaViewer } from '../src/components/chat/ChatMediaViewer';
import { useEncryptedChat } from '../src/hooks/useEncryptedChat';
import { useChatMessages } from '../src/hooks/useChatMessages';
import { getOptimizedVoiceMimeType } from '../src/hooks/useVoiceRecorder';
import { useCall } from '../src/contexts/CallContext';
import { useGroupCallManager } from '../src/hooks/useGroupCallManager';

import { routeAudioOutput } from '../src/library/audioUtils';
import { isPermissionAllowed, requirePermission } from '../lib/permissionManager';
import { ProtectionEngine } from '../services/protectionEngine';

// ... (SFX constants and CAM_FILTERS remain the same)
const BOT_ID = 'hisee-ai-bot';

const getAudioColorClasses = (color: string | undefined, isMe: boolean) => {
    if (isMe) {
        switch (color) {
            case 'green': return 'bg-gradient-to-br from-[#2d3a23] via-[#242f1f] to-[#1a2216] text-white border-white/20 shadow-md';
            case 'red': return 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 text-white border-white/20 shadow-md';
            case 'white': return 'bg-gradient-to-br from-white to-slate-100 text-slate-800 border-slate-200 shadow-md';
            case 'yellow': return 'bg-gradient-to-br from-amber-400 via-orange-500 to-orange-700 text-amber-950 border-white/20 shadow-md';
            default: return 'bg-gradient-to-br from-[#2d3a23] via-[#242f1f] to-[#1a2216] text-white border-white/20 shadow-xl shadow-black/40';
        }
    } else {
        switch (color) {
            case 'green': return 'bg-gradient-to-br from-emerald-800/95 to-emerald-950/95 text-emerald-50 border-white/5 shadow-sm';
            case 'red': return 'bg-gradient-to-br from-rose-800/95 to-rose-950/95 text-rose-50 border-white/5 shadow-sm';
            case 'white': return 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-800 border-white/5 shadow-sm';
            case 'yellow': return 'bg-gradient-to-br from-amber-700/90 to-amber-950/95 text-amber-50 border-white/5 shadow-sm';
            default: return 'bg-gradient-to-br from-[#453a16] via-[#2d260e] to-[#1a1608] text-white border-white/10 shadow-sm';
        }
    }
};

const createAudio = (url: string) => {
    try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = 1.0;
        return audio;
    } catch (e) {
        console.error("Audio initialization failed for", url, e);
        return {
            play: () => Promise.resolve(),
            pause: () => {},
            cloneNode: (deep?: boolean) => createAudio(url),
            currentTime: 0,
            volume: 1.0,
            loop: false,
            autoplay: false,
            srcObject: null
        } as any;
    }
};

import { RingtonePicker } from './RingtonePicker';
// ... rest of imports
const SFX = {
    recordStart: createAudio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'),
    callRing: createAudio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3'), // Outgoing: Distinct modern digital ringtone
    connect: createAudio('https://assets.mixkit.co/active_storage/sfx/1353/1353-preview.mp3'),
    callEnd: createAudio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    toggle: createAudio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    typing: createAudio('https://assets.mixkit.co/active_storage/sfx/2364/2364-preview.mp3'),
    send: createAudio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'),
};

const CAM_FILTERS = [
    { id: 'normal', name: 'Normal', css: '', img: 'https://picsum.photos/seed/normal/100/100' },
    { id: 'warm', name: 'Warm', css: 'sepia(0.4) saturate(1.5)', img: 'https://picsum.photos/seed/warm/100/100' },
    { id: 'cool', name: 'Cool', css: 'hue-rotate(180deg) saturate(0.8)', img: 'https://picsum.photos/seed/cool/100/100' },
    { id: 'bw', name: 'B&W', css: 'grayscale(1)', img: 'https://picsum.photos/seed/bw/100/100' },
    { id: 'vivid', name: 'Vivid', css: 'saturate(2) contrast(1.1)', img: 'https://picsum.photos/seed/vivid/100/100' },
    { id: 'soft', name: 'Soft', css: 'blur(0.5px) brightness(1.05) contrast(0.9)', img: 'https://picsum.photos/seed/soft/100/100' },
    { id: 'glow', name: 'Glow', css: 'brightness(1.2) saturate(1.2) contrast(0.8)', img: 'https://picsum.photos/seed/glow/100/100' },
    { id: 'dramatic', name: 'Dramatic', css: 'contrast(1.5) grayscale(0.2)', img: 'https://picsum.photos/seed/dramatic/100/100' },
];

const LIPSTICK_COLORS = [
    { id: 'none', color: 'transparent', name: 'بدون' },
    { id: 'red', color: '#ff0000', name: 'أحمر' },
    { id: 'pink', color: '#ff69b4', name: 'وردي' },
    { id: 'nude', color: '#bc8f8f', name: 'طبيعي' },
    { id: 'purple', color: '#800080', name: 'بنفسجي' },
];

const HAIR_COLORS = [
    { id: 'none', color: 'transparent', name: 'أصلي' },
    { id: 'blonde', color: '#f0e68c', name: 'أشقر' },
    { id: 'pink', color: '#ffc0cb', name: 'وردي' },
    { id: 'blue', color: '#add8e6', name: 'أزرق' },
    { id: 'purple', color: '#a020f0', name: 'بنفسجي' },
];

const ACCESSORIES = [
    { id: 'none', icon: '🚫', name: 'بدون' },
    { id: 'hat_1', icon: '🎩', name: 'قبعة' },
    { id: 'hat_2', icon: '🧢', name: 'كاب' },
    { id: 'earrings_1', icon: '💎', name: 'حلق' },
    { id: 'glasses_1', icon: '🕶️', name: 'نظارة' },
    { id: 'crown', icon: '👑', name: 'تاج' },
];

const EYELASHES = [
    { id: 'none', name: 'بدون', intensity: 0 },
    { id: 'natural', name: 'طبيعي', intensity: 0.3 },
    { id: 'thick', name: 'كثيف', intensity: 0.6 },
    { id: 'glam', name: 'جذاب', intensity: 0.9 },
];

const EYELINER = [
    { id: 'none', name: 'بدون' },
    { id: 'classic', name: 'كلاسيك' },
    { id: 'cat', name: 'قطة' },
    { id: 'smokey', name: 'سموكي' },
];

const CINEMATIC_FILTERS = [
    { id: 'none', name: 'أصلي', css: '', img: 'https://picsum.photos/seed/normal/100/100' },
    { id: 'hollywood', name: 'هوليوود', css: 'contrast(1.2) saturate(1.1) sepia(0.2)', img: 'https://picsum.photos/seed/hollywood/100/100' },
    { id: 'vintage', name: 'كلاسيكي', css: 'sepia(0.6) contrast(1.1) brightness(0.9)', img: 'https://picsum.photos/seed/vintage/100/100' },
    { id: 'cyberpunk', name: 'سايبر بانك', css: 'hue-rotate(90deg) saturate(1.5) contrast(1.2)', img: 'https://picsum.photos/seed/cyberpunk/100/100' },
    { id: 'noir', name: 'نوار', css: 'grayscale(1) contrast(1.5) brightness(0.8)', img: 'https://picsum.photos/seed/noir/100/100' },
];

const BACKGROUNDS = [
    { id: 'none', name: 'بدون', img: 'https://picsum.photos/seed/bg_none/100/100' },
    { id: 'blur', name: 'ضبابي', img: 'https://picsum.photos/seed/bg_blur/100/100', css: 'blur(10px)' },
    { id: 'office', name: 'مكتب', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=100&h=100&fit=crop' },
    { id: 'beach', name: 'شاطئ', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&h=100&fit=crop' },
    { id: 'space', name: 'فضاء', img: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=100&h=100&fit=crop' },
];

const EMOJI_CATEGORIES = [
    { id: 'recent', icon: <Clock size={16} />, label: 'مؤخراً' },
    { id: 'faces', icon: <Smile size={16} />, label: 'وجوه' },
    { id: 'stickers', icon: <Sticker size={16} />, label: 'ملصقات' },
    { id: 'ai', icon: <Sparkles size={16} className="text-purple-400" />, label: 'AI' },
    { id: 'premium', icon: <Star size={16} className="text-yellow-400" />, label: 'مميزة' },
    { id: 'gifs', icon: <Zap size={16} />, label: 'GIF' },
];

const MOCK_PREMIUM_STICKERS = [
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvTVBncUp0N0ZtWVFDRS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvSFFkUlU5U0I5U3pIQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvNXlQYlJ1QWlXQWlWQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvR1JmS3VvRkJSUElKQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvUURyYlR3U1NTU1NTUvZ2lwaHkuZ2lm/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvUjB0UlpSdTVuR0VpQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHhwTmRWUjdidndYSk80L2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh1S0x2SExXcm1GNHdXL2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh2aGR1YVNoRzlURzNxL2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh6T2pYSmY4YVNoRzlURzNxL2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh0amZ1YVNoRzlURzNxL2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh6S0x2SExXcm1GNHdXL2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/v6aOebdclI4uVqU4gV/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/Lp8Z8M9Ua9WfS/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVfV8pLxW5s5pS/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/26vUxO1Vl6H0g/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l0ExdPhS2O984D7Hi/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVvV8pLxW5s5pS/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKMGpxP5O0jF68w/giphy.gif',
];

const MOCK_EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "😭", "😡", "👍", "🔥", "❤️", "🎉", "✨", "👀", "🚀", "💯", "🌹", "🎁", "👋", "✅", "🛑", "😇", "🤩", "🥳", "🙄", "😴", "🤤", "🤢", "🥵", "🥶", "🤯", "🤡", "💩", "👻", "💀", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🤲", "👐", "🙌", "👏", "🤝", "🤘", "🤟", "✌️", "🤞", "🤟", "🤙", "🤚", "🖐️", "✋", "🖖", "👋", "✍️", "🙏", "💪", "🤳", "💅", "👂", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸", "🌍", "🌎", "🌏", "🌕", "🌙", "☀️", "⭐", "☁️", "⚡", "❄️", "🌊", "🔥", "🌈", "🎈", "🎂", "🍕", "🍔", "🍟", "🍦", "🍩", "🍪", "🍫", "🍎", "🍓", "🍉", "🥑", "🥦", "🥕", "☕", "🍺", "🍷", "🍹", "⚽", "🏀", "🏈", "🎾", "🎮", "🎸", "🎵", "🎨", "🎬", "📚", "💡", "📱", "💻", "⌚", "📷", "🔍", "🔑", "🛡️", "🏹", "⚔️", "💊", "🩹", "🧺", "🧹", "🧻", "🧼", "🪣", "🪒", "🧴", "🧷", "🧶", "🧵", "🪡", "👕", "👖", "👗", "👘", "👙", "👚", "👛", "👜", "👝", "🎒", "👞", "👟", "👠", "👡", "👢", "👑", "👒", "🎩", "🎓", "🧢", "⛑️", "💄", "💍", "💼"];
const MOCK_STICKERS = [
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvTVBncUp0N0ZtWVFDRS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvSFFkUlU5U0I5U3pIQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvNXlQYlJ1QWlXQWlWQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvR1JmS3VvRkJSUElKQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvUURyYlR3U1NTU1NTUvZ2lwaHkuZ2lm/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvUjB0UlpSdTVuR0VpQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHhwTmRWUjdidndYSk80L2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh1S0x2SExXcm1GNHdXL2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh2aGR1YVNoRzlURzNxL2dpcGh5LmdpZg/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTRkMWY1NGI4NWUyYmU5YjI5ZTVmNGI4NWUyYmU5YjI5ZTVmNGI4NSZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvM29SOHh6T2pYSmY4YVNoRzlURzNxL2dpcGh5LmdpZg/giphy.gif',
];
const _OLD_STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/742/742752.png',
  'https://cdn-icons-png.flaticon.com/512/742/742920.png',
  'https://cdn-icons-png.flaticon.com/512/742/742823.png',
  'https://cdn-icons-png.flaticon.com/512/742/742860.png',
  'https://cdn-icons-png.flaticon.com/512/742/742745.png',
  'https://cdn-icons-png.flaticon.com/512/742/742759.png',
  'https://cdn-icons-png.flaticon.com/512/742/742781.png',
  'https://cdn-icons-png.flaticon.com/512/742/742783.png',
  'https://cdn-icons-png.flaticon.com/512/742/742805.png',
  'https://cdn-icons-png.flaticon.com/512/742/742813.png',
  'https://cdn-icons-png.flaticon.com/512/742/742816.png',
  'https://cdn-icons-png.flaticon.com/512/742/742818.png',
  'https://cdn-icons-png.flaticon.com/512/742/742820.png',
  'https://cdn-icons-png.flaticon.com/512/742/742822.png',
  'https://cdn-icons-png.flaticon.com/512/742/742751.png',
  'https://cdn-icons-png.flaticon.com/512/742/742752.png',
  'https://cdn-icons-png.flaticon.com/512/742/742753.png',
  'https://cdn-icons-png.flaticon.com/512/742/742754.png',
  'https://cdn-icons-png.flaticon.com/512/742/742755.png',
  'https://cdn-icons-png.flaticon.com/512/742/742756.png',
  'https://cdn-icons-png.flaticon.com/512/742/742757.png',
  'https://cdn-icons-png.flaticon.com/512/742/742758.png',
  'https://cdn-icons-png.flaticon.com/512/742/742760.png',
  'https://cdn-icons-png.flaticon.com/512/742/742761.png',
  'https://cdn-icons-png.flaticon.com/512/742/742762.png',
  'https://cdn-icons-png.flaticon.com/512/742/742763.png',
  'https://cdn-icons-png.flaticon.com/512/742/742764.png',
  'https://cdn-icons-png.flaticon.com/512/742/742765.png',
  'https://cdn-icons-png.flaticon.com/512/742/742766.png',
  'https://cdn-icons-png.flaticon.com/512/742/742767.png',
  'https://cdn-icons-png.flaticon.com/512/742/742768.png',
  'https://cdn-icons-png.flaticon.com/512/742/742769.png',
  'https://cdn-icons-png.flaticon.com/512/742/742770.png',
  'https://cdn-icons-png.flaticon.com/512/742/742771.png',
  'https://cdn-icons-png.flaticon.com/512/742/742772.png',
  'https://cdn-icons-png.flaticon.com/512/742/742773.png',
  'https://cdn-icons-png.flaticon.com/512/742/742774.png',
  'https://cdn-icons-png.flaticon.com/512/742/742775.png',
  'https://cdn-icons-png.flaticon.com/512/742/742776.png',
  'https://cdn-icons-png.flaticon.com/512/742/742777.png',
  'https://cdn-icons-png.flaticon.com/512/742/742778.png',
  'https://cdn-icons-png.flaticon.com/512/742/742779.png',
  'https://cdn-icons-png.flaticon.com/512/742/742780.png',
  'https://cdn-icons-png.flaticon.com/512/742/742782.png',
  'https://cdn-icons-png.flaticon.com/512/742/742784.png',
  'https://cdn-icons-png.flaticon.com/512/742/742785.png',
  'https://cdn-icons-png.flaticon.com/512/742/742786.png',
  'https://cdn-icons-png.flaticon.com/512/742/742787.png',
  'https://cdn-icons-png.flaticon.com/512/742/742788.png',
  'https://cdn-icons-png.flaticon.com/512/742/742789.png',
  'https://cdn-icons-png.flaticon.com/512/742/742790.png',
  'https://cdn-icons-png.flaticon.com/512/742/742791.png',
  'https://cdn-icons-png.flaticon.com/512/742/742792.png',
  'https://cdn-icons-png.flaticon.com/512/742/742793.png',
  'https://cdn-icons-png.flaticon.com/512/742/742794.png',
  'https://cdn-icons-png.flaticon.com/512/742/742795.png',
  'https://cdn-icons-png.flaticon.com/512/742/742796.png',
  'https://cdn-icons-png.flaticon.com/512/742/742797.png',
  'https://cdn-icons-png.flaticon.com/512/742/742798.png',
  'https://cdn-icons-png.flaticon.com/512/742/742799.png',
  'https://cdn-icons-png.flaticon.com/512/742/742800.png',
  'https://cdn-icons-png.flaticon.com/512/742/742801.png',
  'https://cdn-icons-png.flaticon.com/512/742/742802.png',
  'https://cdn-icons-png.flaticon.com/512/742/742803.png',
  'https://cdn-icons-png.flaticon.com/512/742/742804.png',
  'https://cdn-icons-png.flaticon.com/512/742/742806.png',
  'https://cdn-icons-png.flaticon.com/512/742/742807.png',
  'https://cdn-icons-png.flaticon.com/512/742/742808.png',
  'https://cdn-icons-png.flaticon.com/512/742/742809.png',
  'https://cdn-icons-png.flaticon.com/512/742/742810.png',
  'https://cdn-icons-png.flaticon.com/512/742/742811.png',
];

const MOCK_GIFS = [
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKMGpxP5O0jF68w/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l0HlIDHe7K5r7Zp28/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o6Zt481isOdHczWz6/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/26gsjCZpPolPr3sBy/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVUn7iM8FMEU24/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/l0HlBO7eyXzSZkJri/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZiZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvSFFkUlU5U0I5U3pIQS9naWloeS5naWY/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZiZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvTVBncUp0N0ZtWVFDRS9naWloeS5naWY/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZiZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvNXlQYlJ1QWlXQWlWQS9naWloeS5naWY/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZiZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvR1JmS3VvRkJSUElKQS9naWloeS5naWY/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZiZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvUURyYlR3U1NTU1NTUvZ2lwaHkuZ2lm/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTRiZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZjg1ZTNmZiZlcD12MV9pbnRlcm5hbV9naWZzX2dpZklkJmN0PXMvUjB0UlpSdTVuR0VpQS9naWloeS5naWY/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVfV8pLxW5s5pS/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/26vUxO1Vl6H0g/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKH6PFfCUv3yBkA/giphy.gif',
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqZndqJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKvVpWvU5vV9w24/giphy.gif',
];

interface Props {
  chat: Chat;
  originChat?: Chat | null;
  onBack: () => void;
  onSelectChat: (chat: Chat, origin?: Chat | null, forwardMsg?: Message | null) => void;
  myId: string;
  lang: Language;
  isUiVisible: boolean;
  onToggleUi: () => void;
  autoAnswerCallId?: string | null;
  settings: AppSettings;
  pendingForwardMessage?: Message | null;
  onClearForward?: () => void;
  onNavigateToHome?: () => void;
}

const AudioWaveform = ({ isPlaying, progress, isRead, isActive, isPlayed = true, isMe = false }: { isPlaying: boolean, progress: number, isRead: boolean, isActive: boolean, isPlayed?: boolean, isMe?: boolean }) => {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i} 
          className={`w-0.5 rounded-full transition-all duration-300 ${
            isActive && (i / 20) * 100 < progress 
              ? 'bg-amber-400 h-3' 
              : (!isPlayed && isMe) 
                ? 'bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400 h-2 shadow-[0_0_5px_rgba(239,68,68,0.5)] animate-pulse' 
                : isRead ? 'bg-indigo-300/40 h-1.5' : 'bg-emerald-200/40 h-1.5'
          }`}
          style={{ 
             height: isPlaying ? `${Math.random() * 10 + 4}px` : undefined 
          }}
        />
      ))}
      <div className="flex items-center gap-2.5 ml-8">
        {!isPlayed && !isMe && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Headphones size={14} className="text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
          </motion.div>
        )}
        <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${
          (!isPlayed && isMe) 
            ? 'bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
            : (!isPlayed && !isMe)
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
              : 'bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.4)]'
        }`} />
      </div>
    </div>
  );
};

export default function ChatWindow({ chat, originChat, onBack, onSelectChat, myId, lang, isUiVisible, onToggleUi, autoAnswerCallId, settings, pendingForwardMessage, onClearForward, onNavigateToHome }: Props) {
    if (!chat?.id) return null;
    
    const [currentChat, setCurrentChat] = useState<Chat>(chat);
    const typingTimeoutRef = useRef<any>(null);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [swipeX, setSwipeX] = useState(0);
    const [swipeY, setSwipeY] = useState(0);
    const [upperMicSwipeY, setUpperMicSwipeY] = useState(0);
    const upperMicSwipeYRef = useRef(0);
    const updateUpperMicSwipeY = (val: number) => {
        upperMicSwipeYRef.current = val;
        setUpperMicSwipeY(val);
    };
    const [isLockingRecording, setIsLockingRecording] = useState(false);
    const [isRecordingPaused, setIsRecordingPaused] = useState(false);
    const [isFlyingMic, setIsFlyingMic] = useState(false);
    const [isMicHolding, setIsMicHolding] = useState(false);
    const [flyingMicX, setFlyingMicX] = useState(0);
    const [forwardedMedia, setForwardedMedia] = useState<Message | null>(null);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const [previewLevels, setPreviewLevels] = useState<number[]>(new Array(16).fill(15));
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const startXRef = useRef<number>(0);
    const startYRef = useRef<number>(0);
    const isDeletingRef = useRef(false);
    const isDeletedRef = useRef(false);
    const isLockedRef = useRef(false);
    const isEditingRef = useRef(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const previewBlobRef = useRef<Blob | null>(null);
    const completedBlobsRef = useRef<Blob[]>([]);
    const isPausingForLockRef = useRef<boolean>(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    const longPressTimer = useRef<any>(null);
    const callTimerRef = useRef<any>(null);
    const recordTimerRef = useRef<any>(null);
    const recordingTimeoutRef = useRef<any>(null);
    const isRecordingIntentRef = useRef<boolean>(false);
    const recordingPressStartTimeRef = useRef<number>(0);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const audioFileInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const activeStreamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const filterScrollRef = useRef<HTMLDivElement>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentAudioIdRef = useRef<string | null>(null);
    const playPromiseRef = useRef<Promise<void> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const chatId = [myId, chat.user.id].sort().join('_');
    const firestoreChatId = chat.isGroup || chat.id === 'hisee-ai-bot' ? chat.id : chatId;
    
    // Reset local states when switching chats (since key prop was removed in App.tsx)
    useEffect(() => {
        setInput('');
        setReplyingTo(null);
        setIsRecording(false);
        setIsRecordingPaused(false);
        setRecordingDuration(0);
        setIsLockingRecording(false);
        setForwardedMedia(null);
        setShowMoreMenu(false);
        setShowEmojiPicker(false);
        setShowMediaMenu(false);
        setSearchCategory(null);
        setReactionPickerMsgId(null);
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    }, [chat.id]);

    const stopHardwareMicrophone = useCallback(() => {
        console.log("Audio: stopHardwareMicrophone strictly releasing all resources");
        try {
            // 1. Explicitly stop and nullify the MediaRecorder
            if (mediaRecorderRef.current) {
                if (mediaRecorderRef.current.state !== 'inactive') {
                    try { mediaRecorderRef.current.stop(); } catch (e) {}
                }
                
                // Stop tracks inside the recorder's stream
                const anyRecorder = mediaRecorderRef.current as any;
                if (anyRecorder.stream && typeof anyRecorder.stream.getTracks === 'function') {
                    try {
                        anyRecorder.stream.getTracks().forEach((track: MediaStreamTrack) => {
                            track.stop();
                            track.enabled = false;
                        });
                    } catch (e) {}
                }
                mediaRecorderRef.current = null;
            }

            // 2. Stop main recording stream tracks
            if (recordingStreamRef.current) {
                try {
                    recordingStreamRef.current.getTracks().forEach(track => {
                        track.stop();
                        track.enabled = false;
                    });
                } catch (e) {}
                recordingStreamRef.current = null;
            }

            // 3. Stop active stream ref (used in calls/preview)
            if (activeStreamRef.current) {
                try {
                    activeStreamRef.current.getTracks().forEach(track => {
                        track.stop();
                        track.enabled = false;
                    });
                } catch (e) {}
                activeStreamRef.current = null;
            }

            // 4. Final safety cleanup for any window-level or leaked streams
            const leakedStreamKeys = ['localStream', '_previewStream', '_currentStream', '_recordingStream'];
            leakedStreamKeys.forEach(key => {
                const s = (window as any)[key];
                if (s && typeof s.getTracks === 'function') {
                    try {
                        s.getTracks().forEach((t: any) => {
                            t.stop();
                            t.enabled = false;
                        });
                    } catch (e) {}
                }
                (window as any)[key] = null;
            });

            // 5. Suspend audio context to save CPU
            if (audioContextRef.current && audioContextRef.current.state === 'running') {
                try { audioContextRef.current.suspend().catch(() => {}); } catch (e) {}
            }
        } catch (err) {
            console.warn("Notice during hardware mic shutdown:", err);
        }
    }, []);

    
    useEffect(() => {
        if (!chat.id || !firestoreDb) return;
        setCurrentChat(chat);
        
        // Auto-Clear notifications on open (unread messages, missed calls)
        const clearNotifications = async () => {
            try {
                const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
                const chatSnap = await getDoc(chatRef);
                if (chatSnap.exists()) {
                    const data = chatSnap.data();
                    const isLastSender = data.lastMessageSenderId === myId;
                    const isCaller = data.lastCallCallerId === myId || data.callerId === myId;
                    
                    const updates: any = {};
                    
                    // Only recipient can clear message notifications
                    if (!isLastSender) {
                        updates.unreadCount = 0;
                    }
                    
                    // Only receiver of call can clear missed call notifications
                    if (!isCaller) {
                        updates.missedAudioCalls = 0;
                        updates.missedVideoCalls = 0;
                    }
                    
                    // Always clear callStatus and update messageCount tracking if opening chat
                    updates[`messageCount_${myId}`] = data[`messageCount_${chat.user.id}`] || 0;
                    updates.callStatus = 'none';

                    if (Object.keys(updates).length > 0) {
                        await updateDoc(chatRef, updates);
                    }

                    // Mark all messages as read (Simplified query to avoid index error)
                    const messagesRef = collection(firestoreDb, 'chats', firestoreChatId, 'messages');
                    const unreadQuery = query(messagesRef, where('isRead', '==', false));
                    const unreadSnap = await getDocs(unreadQuery);
                    
                    const updatePromises = unreadSnap.docs
                        .filter(msgDoc => msgDoc.data().senderId !== myId)
                        .map(msgDoc => updateDoc(msgDoc.ref, { isRead: true }));
                    
                    await Promise.all(updatePromises);

                    console.log("Chat: Notifications and messages cleared on open (Optimized)");
                }
            } catch (error) {
                console.error("Chat: Error clearing notifications:", error);
            }
        };
        clearNotifications();

        const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
        const unsubscribe = onSnapshot(chatRef, (docSnap) => {
            if (document.hidden) return;
            if (!docSnap.exists()) return;
            const data = docSnap.data();
            console.log("Chat: Real-time update received", { id: docSnap.id, isTyping: data.isTyping, isRecording: data.isRecording });
            setCurrentChat(prev => ({ ...prev, id: docSnap.id, ...data } as Chat));
            
            // Consolidated message counts
            setMyMessageCount(data[`messageCount_${myId}`] || 0);
            setTheirMessageCount(data[`messageCount_${chat.user.id}`] || 0);

            // Real-time notification clearing while chat is open
            const isLastSender = data.lastMessageSenderId === myId;
            const isCaller = data.lastCallCallerId === myId || data.callerId === myId;
            
            if (!isLastSender && data.unreadCount > 0) {
                updateDoc(chatRef, { unreadCount: 0 }).catch(() => {});
            }
            
            if (!isCaller && (data.missedAudioCalls > 0 || data.missedVideoCalls > 0)) {
                updateDoc(chatRef, { missedAudioCalls: 0, missedVideoCalls: 0 }).catch(() => {});
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, `chats/${firestoreChatId}`);
        });
        return () => unsubscribe();
    }, [chat.id, myId, chat.user.id, firestoreChatId]);

    useEffect(() => {
        if (!chat.id || !myId) return;

        const handleCleanup = () => {
            (window as any).__isVoiceRecording = false;
            stopHardwareMicrophone();
            if (firestoreDb && firestoreChatId) {
                updateChatStatus('isTyping', false).catch(() => {});
                updateChatStatus('isRecording', false).catch(() => {});
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleCleanup();
            }
        };

        // Heartbeat for chat status to prevent stale indicators
        const chatHeartbeat = setInterval(() => {
            if (document.visibilityState === 'visible') {
                if (typingTimeoutRef.current) {
                    updateChatStatus('isTyping', true).catch(() => {});
                }
                if (isRecording && !isRecordingPaused) {
                    updateChatStatus('isRecording', true).catch(() => {});
                }
            }
        }, 15000); // 15 seconds heartbeat

        window.addEventListener('beforeunload', handleCleanup);
        window.addEventListener('pagehide', handleCleanup);
        window.addEventListener('visibilitychange', handleVisibilityChange);

        if (isRecording && !isRecordingPaused) {
            updateChatStatus('isRecording', true).catch(() => {});
        } else {
            updateChatStatus('isRecording', false).catch(() => {});
        }

        return () => {
            handleCleanup();
            clearInterval(chatHeartbeat);
            window.removeEventListener('beforeunload', handleCleanup);
            window.removeEventListener('pagehide', handleCleanup);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [chat.id, myId, firestoreChatId, isRecording, isRecordingPaused]);

    useEffect(() => {
        if (pendingForwardMessage) {
            if (pendingForwardMessage.type === 'text') {
                setInput(decryptText(pendingForwardMessage.text || ""));
                setForwardedMedia(null);
            } else {
                setForwardedMedia(pendingForwardMessage);
                setInput(decryptText(pendingForwardMessage.text || ""));
            }
            if (onClearForward) onClearForward();
        }
    }, [pendingForwardMessage]);

    const updateChatStatus = async (field: 'isTyping' | 'isRecording', value: boolean) => {
        console.log(`Chat: updateChatStatus called for ${field} with value ${value}`);
        if (!chat.id || !myId || !firestoreDb) {
            console.warn(`Chat: Cannot update ${field} - missing chat.id, myId, or firestoreDb`, { chatId: chat.id, myId, firestoreDb: !!firestoreDb });
            return;
        }
        // Respect per-chat isolated privacy settings
        if (field === 'isTyping' && value) {
            const typingEnabled = localStorage.getItem(`hisee_typing_ind_${chat.id}`) !== 'false' && (currentChat as any)?.privacyOverrides?.[myId]?.typing !== false;
            if (!typingEnabled) return;
        }
        if (field === 'isRecording' && value) {
            const recordingEnabled = localStorage.getItem(`hisee_recording_ind_${chat.id}`) !== 'false' && (currentChat as any)?.privacyOverrides?.[myId]?.recording !== false;
            if (!recordingEnabled) return;
        }
        try {
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            console.log(`Chat: Updating ${field} for ${myId} to ${value}`);
            await setDoc(chatRef, {
                [field]: {
                    [myId]: value
                }
            }, { merge: true });
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
        }
    };

    const handleTyping = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        } else {
            updateChatStatus('isTyping', true);
        }

        typingTimeoutRef.current = setTimeout(() => {
            updateChatStatus('isTyping', false);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const { encryptText, decryptText, decryptMessage, createReportPayload } = useEncryptedChat();
    const { messages, setMessages, loading, loadMoreMessages, hasMore, addPendingMessage } = useChatMessages(chat.id, myId);
    
    const isInitialLoad = useRef(true);

    useLayoutEffect(() => {
        if (isInitialLoad.current && messages.length > 0 && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            isInitialLoad.current = false;
        }
    }, [messages.length]);

    const [friendStatus, setFriendStatus] = useState<'friends' | 'pending' | 'none'>('none');

    // Message useEffect moved to useChatMessages hook

    useEffect(() => {
        if (!myId || !chat.user.id) return;
        let isCancelled = false;
        const userRef = doc(firestoreDb, 'users', myId);
        const unsubscribe = onSnapshot(userRef, async (userDoc) => {
            if (document.hidden || isCancelled) return;
            const data = userDoc.data();
            if (data?.friends?.includes(chat.user.id)) {
                if (!isCancelled) setFriendStatus('friends');
            } else {
                try {
                    // Check if I sent them a request
                    const outgoingRef = doc(firestoreDb, 'users', chat.user.id, 'pendingRequests', myId);
                    const snapOut = await getDoc(outgoingRef);
                    if (isCancelled) return;
                    if (snapOut.exists()) {
                        setFriendStatus('pending');
                    } else {
                        // Check if they sent me a request
                        const incomingRef = doc(firestoreDb, 'users', myId, 'pendingRequests', chat.user.id);
                        const snapIn = await getDoc(incomingRef);
                        if (isCancelled) return;
                        if (snapIn.exists()) {
                            setFriendStatus('pending');
                        } else {
                            setFriendStatus('none');
                        }
                    }
                } catch (e) {
                    console.error('Error checking pending friend requests:', e);
                }
            }
        });
        return () => {
            isCancelled = true;
            unsubscribe();
        };
    }, [myId, chat.user.id]);

    const { users: usersMap, currentUser } = useUsers();
    
    const [isBlocked, setIsBlocked] = useState(chat.isBlocked || false);
    const [iBlockedThem, setIBlockedThem] = useState(false);
    const [theyBlockedMe, setTheyBlockedMe] = useState(false);
    
    useEffect(() => {
        const otherUserId = chat.user.id;
        const blockedUsers = currentUser?.blockedUsers || [];
        const blockedBy = currentUser?.blockedBy || [];
        const iBlocked = blockedUsers.includes(otherUserId) || (currentChat?.blockedBy === myId);
        const theyBlocked = blockedBy.includes(otherUserId) || (usersMap[otherUserId]?.blockedUsers || []).includes(myId) || (currentChat?.isBlocked && currentChat?.blockedBy && currentChat.blockedBy !== myId);
        const isAnyBlocked = iBlocked || theyBlocked || chat.isBlocked || currentChat?.isBlocked || false;
        
        const finalIBlocked = Boolean(iBlocked || (isAnyBlocked && !theyBlocked && blockedUsers.includes(otherUserId)) || (chat.isBlocked && !theyBlocked));
        const finalTheyBlocked = Boolean(theyBlocked || (isAnyBlocked && !finalIBlocked));
        
        setIBlockedThem(finalIBlocked);
        setTheyBlockedMe(finalTheyBlocked);
        setIsBlocked(Boolean(isAnyBlocked));
    }, [chat.isBlocked, currentChat?.isBlocked, currentChat?.blockedBy, chat.user.id, currentUser?.blockedUsers, currentUser?.blockedBy, usersMap, myId]);

    const [myMessageCount, setMyMessageCount] = useState(0);
    const [theirMessageCount, setTheirMessageCount] = useState(0);

    const isGroup = chat.isGroup || false;
    const canSendMessage = !isBlocked && (isGroup || friendStatus === 'friends' || myMessageCount < 2);
    const showLimitMessage = !isBlocked && !isGroup && friendStatus !== 'friends' && myMessageCount >= 2;

    useEffect(() => {
        if (!canSendMessage) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try { mediaRecorderRef.current.stop(); } catch (e) {}
            }
            if (recordingStreamRef.current) {
                recordingStreamRef.current.getTracks().forEach(track => track.stop());
                recordingStreamRef.current = null;
            }
            setIsRecording(false);
            setRecordingDuration(0);
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        }
    }, [canSendMessage]);

    const [input, setInput] = useState('');
    const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Dedicated Isolated Group Call Manager Hook
    const {
        activeGroupCallInChat,
        isStartingCall: isStartingGroupCall,
        startGroupCall,
        joinGroupCall
    } = useGroupCallManager({
        myId,
        myProfile: currentUser,
        currentChat: chat
    });

    const activeGroupCall = activeGroupCallInChat;

    const handleDynamicJoin = () => {
        if (activeGroupCallInChat) {
            (window as any).__USER_MANUAL_CALL_CLICK__ = true;
            joinGroupCall(chat.id, activeGroupCallInChat.callType || 'voice', chat.id);
        }
    };

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [currentAudioTime, setCurrentAudioTime] = useState('0:00');
    const [openAudioMenuId, setOpenAudioMenuId] = useState<string | null>(null);
    const [audioSpeeds, setAudioSpeeds] = useState<Record<string, number>>({});
    
    const [msgStatuses, setMsgStatuses] = useState<Record<string, string>>({});
    const [currentChatUser, setCurrentChatUser] = useState<UserType | null>(chat.user ? {
        id: chat.user.id,
        name: cleanUsername((chat.user as any).nickname || (chat.user as any).displayName || chat.user.name || chat.user.id),
        avatar: (chat.user as any).photoURL || (chat.user as any).profileImage || (chat.user as any).avatarUrl || chat.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(chat.user as any).email || chat.user.id}`,
        status: chat.user.status,
        lastActive: chat.user.lastActive,
        followers: 0,
        following: 0,
        likes: 0,
        level: 0,
        email: { value: (chat.user as any).email || '', privacy: 'private' },
        phone: { value: '', privacy: 'private' },
        birthDate: { value: '', privacy: 'private' }
    } : null);

    useEffect(() => {
        if (!chat.user.id) return;
        const userRef = doc(firestoreDb, 'users', chat.user.id);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (document.hidden) return;
            if (doc.exists()) {
                const data = doc.data();
                setCurrentChatUser(prev => ({
                    ...(prev || {
                        id: chat.user.id,
                        name: '',
                        avatar: '',
                        status: 'offline',
                        followers: 0,
                        following: 0,
                        likes: 0,
                        level: 0
                    }),
                    ...data,
                    name: data.displayName || data.name || data.username || prev?.name || chat.user.id,
                    avatar: data.photoURL || data.profileImage || data.avatarUrl || data.avatar || prev?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email?.value || chat.user.id}`,
                    status: data.status || 'offline',
                    isOnline: data.isOnline || false,
                    lastSeen: data.lastSeen || data.lastActive,
                    lastActive: typeof data.lastActive === 'number' ? data.lastActive : (data.lastActive?.toDate ? data.lastActive.toDate().getTime() : undefined),
                    email: data.email || { value: '', privacy: 'private' },
                    phone: data.phone || { value: '', privacy: 'private' },
                    birthDate: data.birthDate || { value: '', privacy: 'private' }
                } as UserType));
            }
        });
        return () => unsubscribe();
    }, [chat.user.id]);
    const [now, setNow] = useState(Date.now());

    const ChatSkeleton = () => (
        <div className="flex flex-col gap-4 p-4 mt-auto w-full">
            {[...Array(6)].map((_, i) => (
                <div 
                    key={i} 
                    className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}
                >
                    <div className={`max-w-[70%] h-12 rounded-2xl ${i % 2 === 0 ? 'bg-emerald-500/10' : 'bg-white/5'} border border-white/5`} style={{ width: `${Math.random() * 40 + 30}%` }} />
                </div>
            ))}
        </div>
    );

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    const formatLastSeen = (lastActive: any, user?: any) => {
        return formatLastSeenArabic(lastActive, user?.isOnline, lang);
    };

    const [profileUserId, setProfileUserId] = useState<string | null>(null);
    const [showProfileInfo, setShowProfileInfo] = useState(false);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const [headerMenuPage, setHeaderMenuPage] = useState<'main' | 'filters' | 'pinned' | 'unified_pinned' | 'favorite_users' | 'sounds' | 'disappearing' | 'permissions' | 'actions'>('main');
    const [hideNameInNotifications, setHideNameInNotifications] = useState(() => {
        return localStorage.getItem(`hisee_hide_name_${chat.id}`) === 'true';
    });
    const [autoSaveToDevice, setAutoSaveToDevice] = useState(() => {
        return localStorage.getItem(`hisee_autosave_${chat.id}`) === 'true';
    });
    const [isTypingIndicatorEnabled, setIsTypingIndicatorEnabled] = useState(() => {
        return localStorage.getItem(`hisee_typing_ind_${chat.id}`) !== 'false';
    });
    const [isRecordingIndicatorEnabled, setIsRecordingIndicatorEnabled] = useState(() => {
        return localStorage.getItem(`hisee_recording_ind_${chat.id}`) !== 'false';
    });
    const [hideActivityAndLastSeen, setHideActivityAndLastSeen] = useState(() => {
        return localStorage.getItem(`hisee_hide_activity_${chat.id}`) === 'true';
    });
    const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(() => {
        return localStorage.getItem(`hisee_read_rec_${chat.id}`) !== 'false';
    });
    const [isFavorite, setIsFavorite] = useState(() => {
        return localStorage.getItem(`hisee_fav_${chat.id}`) === 'true';
    });
    const [isRestricted, setIsRestricted] = useState(() => {
        return localStorage.getItem(`hisee_restrict_${chat.id}`) === 'true';
    });
    const [isArchived, setIsArchived] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [toast, setToast] = useState<{message: string, id: number, type: 'success' | 'warning' | 'info'} | null>(null);
    const showToast = (message: string) => {
        let type: 'success' | 'warning' | 'info' = 'info';
        if (message.includes('إيقاف') || message.includes('إلغاء') || message.includes('إخفاء') || message.includes('إزالة')) type = 'warning';
        if (message.includes('تفعيل') || message.includes('بنجاح') || message.includes('إظهار') || message.includes('إضافة')) type = 'success';
        setToast({ message, id: Date.now(), type });
    };
    
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [previewMedia, setPreviewMedia] = useState<Message | null>(null);
    const [previewAudioFile, setPreviewAudioFile] = useState<{ url: string, file: File } | null>(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [trimmingVideo, setTrimmingVideo] = useState<{ url: string, duration: number, file: File, caption?: string } | null>(null);
    const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });

    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [activeCamFilter, setActiveCamFilter] = useState(CAM_FILTERS[0]);
    const [isBeautyOn, setIsBeautyOn] = useState(false);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeEmojiTab, setActiveEmojiTab] = useState('faces');
    const [recentItems, setRecentItems] = useState<{ type: 'emoji' | 'sticker', value: string }[]>([]);
    
    // AI Sticker States
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAiSticker, setIsGeneratingAiSticker] = useState(false);
    const [dailyQuota, setDailyQuota] = useState(5);
    const [generatedStickers, setGeneratedStickers] = useState<string[]>([]);
    const [aiError, setAiError] = useState<string | null>(null);

    const handleGenerateAiSticker = async () => {
        if (!aiPrompt.trim() || dailyQuota <= 0) return;
        setIsGeneratingAiSticker(true);
        setAiError(null);
        
        try {
            const response = await fetch('/api/generate-sticker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: aiPrompt })
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to generate sticker');
            }
            
            const data = await response.json();
            
            if (data.imageUrl) {
                setGeneratedStickers(prev => [data.imageUrl, ...prev]);
                setDailyQuota(prev => Math.max(0, prev - 1));
            } else {
                throw new Error('No image was generated');
            }
        } catch (error: any) {
            console.error("Error generating sticker:", error);
            setAiError(error.message || 'حدث خطأ أثناء توليد الملصق');
        } finally {
            setIsGeneratingAiSticker(false);
            setAiPrompt('');
        }
    };

    const addToRecent = (type: 'emoji' | 'sticker', value: string) => {
        setRecentItems(prev => {
            const filtered = prev.filter(item => item.value !== value);
            return [{ type, value }, ...filtered].slice(0, 24);
        });
    };

    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showAIImageModal, setShowAIImageModal] = useState(false);
    const [hasKey, setHasKey] = useState<boolean | null>(null);
    const [myProfile, setMyProfile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [localAudioUrls, setLocalAudioUrls] = useState<Record<string, string>>({});
    const [localVideoUrls, setLocalVideoUrls] = useState<Record<string, string>>({});
    const [localImageUrls, setLocalImageUrls] = useState<Record<string, string>>({});
    const [localDocUrls, setLocalDocUrls] = useState<Record<string, string>>({});
    const isSendingAudioRef = useRef(false);
    const recordingStartTimeRef = useRef<number>(0);
    const recordingDurationRef = useRef(0);
    
    const displayUser = useMemo(() => {
        const u = usersMap[chat.user.id];
        const email = (u as any)?.email || (chat.user as any)?.email;
        const emailStr = typeof email === 'string' ? email : (email?.value || '');
        const emailPrefix = emailStr ? emailStr.split('@')[0] : '';
        const extractValue = (field: any) => typeof field === 'object' ? field.value : field;
        const nameVal = extractValue(u?.name || (u as any)?.displayName || (u as any)?.nickname || chat.user.name);
        const cleanName = cleanUsername(nameVal || emailPrefix || 'جاري التحميل...');
        
        // Prioritize data from live usersMap (from UserContext) then currentChatUser (local snapshot)
        const sourceUser = u || currentChatUser || chat.user;

        // Mutual Privacy Logic:
        // 1. If I hide my last seen/online, I can't see others.
        // 2. If they hide their last seen/online, I can't see them.
        const myLastSeenEnabled = settings.chatSettings.lastSeen !== false;
        const myOnlineEnabled = settings.chatSettings.privacy?.hideOnlineStatus !== true;
        
        const otherLastSeenEnabled = (sourceUser as any)?.chatSettings?.lastSeen !== false;
        const otherOnlineEnabled = (sourceUser as any)?.chatSettings?.privacy?.hideOnlineStatus !== true;
        
        const otherReadReceiptsEnabled = (sourceUser as any)?.chatSettings?.readReceipts !== false && (currentChat as any).privacyOverrides?.[chat.user.id]?.readReceipts !== false;
        const myReadReceiptsEnabled = settings.chatSettings.readReceipts !== false && readReceiptsEnabled && (currentChat as any).privacyOverrides?.[myId]?.readReceipts !== false;
        
        const otherVoiceReadReceiptsEnabled = (sourceUser as any)?.chatSettings?.voiceReadReceipts !== false;
        
        const myActivityHidden = hideActivityAndLastSeen || (currentChat as any)?.privacyOverrides?.[myId]?.hideActivity === true;
        const otherActivityHidden = (currentChat as any)?.privacyOverrides?.[chat.user.id]?.hideActivity === true;
        
        const canShowPresence = myLastSeenEnabled && myOnlineEnabled && otherLastSeenEnabled && otherOnlineEnabled && !myActivityHidden && !otherActivityHidden && !isBlocked;
        const canShowReadReceipts = myReadReceiptsEnabled && otherReadReceiptsEnabled;
        const canShowVoiceReadReceipts = (settings.chatSettings.voiceReadReceipts !== false) && otherVoiceReadReceiptsEnabled;
          
        return {
            name: cleanName,
            avatar: isBlocked ? `https://api.dicebear.com/7.x/avataaars/svg?seed=user_${chat.user.id}` : ((sourceUser as any)?.photoURL || (sourceUser as any)?.profileImage || (sourceUser as any)?.avatarUrl || sourceUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailStr || chat.user.id}`),
            status: sourceUser?.status || 'offline',
            isOnline: sourceUser?.isOnline || false,
            lastSeen: (sourceUser as any)?.lastSeen || (sourceUser as any)?.lastActive,
            lastActive: (sourceUser as any)?.lastActive,
            canShowPresence,
            canShowReadReceipts,
            canShowVoiceReadReceipts
        };
    }, [usersMap, chat.user, currentChatUser, settings.chatSettings.lastSeen, settings.chatSettings.privacy.hideOnlineStatus, settings.chatSettings.readReceipts, settings.chatSettings.voiceReadReceipts, hideActivityAndLastSeen, currentChat, isBlocked]);
    const allUsers: UserType[] = Object.values(usersMap);
    const [showPollModal, setShowPollModal] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    const [showLocationModal, setShowLocationModal] = useState(false);
    const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; live: boolean; address?: string } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const liveLocationMsgIdRef = useRef<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (myId && auth.currentUser) {
            const userRef = doc(firestoreDb, 'users', myId);
            const unsubscribe = onSnapshot(userRef, (doc) => {
                if (document.hidden) return;
                if (doc.exists()) {
                    const data = doc.data();
                    const profileData: any = { id: doc.id, ...data };
                    // Fallback to Auth data if key fields are missing
                    if (!data.displayName && !data.name && !data.nickname && auth.currentUser) {
                        profileData.displayName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || auth.currentUser.uid;
                    }
                    if (!data.photoURL && !data.profileImage && !data.avatar && !data.avatarUrl && auth.currentUser) {
                        profileData.photoURL = auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`;
                    }
                    setMyProfile(profileData);
                } else if (auth.currentUser) {
                    setMyProfile({
                        id: myId,
                        displayName: auth.currentUser.displayName || auth.currentUser.email || auth.currentUser.uid,
                        photoURL: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`,
                        email: auth.currentUser.email
                    });
                }
            }, (error) => {
                handleFirestoreError(error, OperationType.GET, `users/${myId}`);
            });
            return () => unsubscribe();
        }
    }, [myId]);

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (currentAudioRef.current) {
                const audio = currentAudioRef.current;
                if (playPromiseRef.current) {
                    playPromiseRef.current.then(() => audio.pause()).catch(() => {});
                } else {
                    audio.pause();
                }
                currentAudioRef.current = null;
            }
            // Ensure hardware is released on unmount
            stopCamera(true);
        };
    }, []);

    const [showContactModal, setShowContactModal] = useState(false);
    const [availableContacts, setAvailableContacts] = useState<UserType[]>([]);
    const [stagedContactToSend, setStagedContactToSend] = useState<UserType | null>(null);

    const chatWindowRef = useRef<HTMLDivElement>(null);

    const defaultSettings = {
        background: 'default',
        fontSize: 'medium',
        enterToSend: true,
        autoDownloadMedia: true,
        readReceipts: true,
        lastSeen: true,
        liveLocation: true,
        hidePhoneNumber: false,
        muteAllSounds: false,
        notificationVolume: 100,
        sounds: {
            messages: true,
            typing: true,
            audioCall: true as boolean | string,
            buttonClicks: true,
            ringtone: 'classic',
            notificationSound: 'default',
            customNotificationSound: null as string | null
        },
        privacy: {
            hideOnlineStatus: false,
            incognitoKeyboard: false,
            screenSecurity: false,
            endToEndEncryption: true
        }
    };

    const [chatSettings, setChatSettings] = useState<typeof defaultSettings>(() => {
        const saved = localStorage.getItem('hisee_chat_settings');
        if (saved) {
            try { return { ...defaultSettings, ...JSON.parse(saved) }; } catch (e) {}
        }
        return defaultSettings;
    });

    useEffect(() => {
        return () => {
            stopHardwareMicrophone();
            if (currentAudioRef.current) {
                try {
                    currentAudioRef.current.pause();
                    currentAudioRef.current.src = "";
                    currentAudioRef.current = null;
                } catch (e) {}
            }
            if (audioPlayerRef.current) {
                try {
                    audioPlayerRef.current.pause();
                    audioPlayerRef.current.src = "";
                    audioPlayerRef.current = null;
                } catch (e) {}
            }
        };
    }, [stopHardwareMicrophone]);

    useEffect(() => {
        const handleSettingsChange = () => {
            const saved = localStorage.getItem('hisee_chat_settings');
            if (saved) {
                try { setChatSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch (e) {}
            }
        };
        window.addEventListener('chatSettingsChanged', handleSettingsChange);
        return () => window.removeEventListener('chatSettingsChanged', handleSettingsChange);
    }, []);

    const playSound = (key: keyof typeof SFX) => {
        if (chatSettings.muteAllSounds) return;
        if (key === 'recordStart' && !chatSettings.sounds.buttonClicks) return;
        // if (key === 'callRing' && !chatSettings.sounds.audioCall) return; // معطل مؤقتاً
        if (key === 'connect' && !chatSettings.sounds.audioCall) return;
        if (key === 'callEnd' && !chatSettings.sounds.audioCall) return;
        if (key === 'toggle' && !chatSettings.sounds.buttonClicks) return;
        if (key === 'typing' && !chatSettings.sounds.typing) return;
        if (key === 'send' && !chatSettings.sounds.messages) return;

        try {
            if (key === 'callRing') {
                stopAllRingtones();
                return;
            }

            if (SFX[key]) {
                SFX[key].volume = ((chatSettings as any).notificationVolume ?? 100) / 100;
                SFX[key].currentTime = 0;
                SFX[key].play().catch(() => {}); 
            }
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const StatusIndicator = ({ isRead, type, customStatus }: { isRead: boolean, type: string, customStatus?: string }) => {
        if (customStatus === 'sending') return <Clock size={12} className="text-white/40 animate-pulse" />;
        if (customStatus === 'sent') return <Check size={15} className="text-slate-200 drop-shadow-sm" />;
        
        // Reciprocal Read Receipts: Only show blue double check if both enabled
        if (!displayUser.canShowReadReceipts) {
            if (isRead) return <CheckCheck size={15} className="text-slate-300/80" />;
            return <CheckCheck size={15} className="text-slate-300/80" />;
        }

        if (isRead) return <CheckCheck size={15} className="text-blue-400 filter drop-shadow-[0_0_5px_rgba(96,165,250,0.9)]" />;
        return <CheckCheck size={15} className="text-slate-300/80" />;
    };

    const renderMessageStatus = (msg: Message, isMe: boolean) => (
        <div className="absolute bottom-1 left-2 flex items-center gap-1.5 opacity-90 z-20 pointer-events-none">
            {(typeof msg.disappearingDuration === 'number' && msg.disappearingDuration > 0) && (
                <div className="flex items-center gap-0.5">
                    <Clock size={9} className="text-white/70" />
                </div>
            )}
            <span className="text-[8px] text-white font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{msg.timestamp}</span>
            {isMe && <StatusIndicator isRead={msg.isRead} type={msg.type} customStatus={msgStatuses[msg.id]} />}
        </div>
    );

    const getFontSizeClass = () => {
        switch (chatSettings.fontSize) {
            case 'small': return 'text-xs';
            case 'medium': return 'text-sm';
            case 'large': return 'text-lg';
            default: return 'text-sm';
        }
    };

    const [participantSearch, setParticipantSearch] = useState('');


    const [focusedParticipantId, setFocusedParticipantId] = useState<string | null>(null);
    const [showCallPreview, setShowCallPreview] = useState<'voice' | 'video' | null>(null);
    const [isPreviewMuted, setIsPreviewMuted] = useState(false);
    const [isCallingFromPreview, setIsCallingFromPreview] = useState<boolean>(false);
    const isInitiatingCallRef = useRef<boolean>(false);
    const [showCallFilters, setShowCallFilters] = useState(false);
    const [activeBeautyTab, setActiveBeautyTab] = useState<'filters' | 'background' | 'beauty' | 'cinematic'>('filters');
    const [beautySmoothness, setBeautySmoothness] = useState(50);
    const [beautyLighting, setBeautyLighting] = useState(50);
    const [activeCinematicFilter, setActiveCinematicFilter] = useState(CINEMATIC_FILTERS[0]);
    const [lipstick, setLipstick] = useState<string | null>(null);
    const [eyelashes, setEyelashes] = useState<string | null>(null);
    const [eyeliner, setEyeliner] = useState<string | null>(null);
    const [hairColor, setHairColor] = useState<string | null>(null);
    const [accessory, setAccessory] = useState<string | null>(null);
    const [videoBackground, setVideoBackground] = useState<string | null>(null);
    const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
    const [showCallBeautyMenu, setShowCallBeautyMenu] = useState(false);
    const [showRingtoneModal, setShowRingtoneModal] = useState(false);
    const [isIntercomExternal, setIsIntercomExternal] = useState(false);
    const [showTranslatorBar, setShowTranslatorBar] = useState(false);
    const [isTranslatorActive, setIsTranslatorActive] = useState(false);
    const [translatorMode, setTranslatorMode] = useState<'auto' | 'manual'>('manual');
    const [translatorLang, setTranslatorLang] = useState('en');
    const [translatorSourceLang, setTranslatorSourceLang] = useState('ar');
    const [autoTranslatorActivatedAt, setAutoTranslatorActivatedAt] = useState<number | null>(null);
    const [translatedInput, setTranslatedInput] = useState('');
    const [isTranslatingInput, setIsTranslatingInput] = useState(false);
    const [cachedTranslations, setCachedTranslations] = useState<Record<string, string>>({});
    const [cachedVoiceData, setCachedVoiceData] = useState<Record<string, { transcript: string; translated: string }>>({});

    // Bidirectional Paired Language Logic:
    // User selects two paired languages (e.g. Arabic & English, or Kurdish & German)
    // The system automatically detects input language/script and translates into the counterpart language.
    const activePairLanguages = useMemo(() => {
        const langA = translatorSourceLang || 'ar';
        const langB = translatorLang || 'en';
        const resolved = resolveBidirectionalLanguages(input, langA, langB);
        const targetObj = AVAILABLE_TRANSLATOR_LANGUAGES.find(l => l.code === resolved.targetLang) || {
            code: resolved.targetLang,
            name: resolved.targetLang,
            flag: '🌐'
        };
        const sourceObj = AVAILABLE_TRANSLATOR_LANGUAGES.find(l => l.code === resolved.sourceLang) || {
            code: resolved.sourceLang,
            name: resolved.sourceLang,
            flag: '🌐'
        };
        return {
            sourceLang: resolved.sourceLang,
            targetLang: resolved.targetLang,
            sourceObj,
            targetObj,
            outgoingTargetLang: resolved.targetLang,
            incomingTargetLang: resolved.sourceLang
        };
    }, [input, translatorLang, translatorSourceLang]);

    const { outgoingTargetLang, incomingTargetLang } = activePairLanguages;

    const handleToggleTranslatorActive = useCallback((active: boolean) => {
        setIsTranslatorActive(active);
        if (active && translatorMode === 'auto') {
            setAutoTranslatorActivatedAt(Date.now());
        } else if (!active) {
            setAutoTranslatorActivatedAt(null);
        }
    }, [translatorMode]);

    const handleTranslatorModeChange = useCallback((mode: 'auto' | 'manual') => {
        setTranslatorMode(mode);
        if (mode === 'auto' && isTranslatorActive) {
            setAutoTranslatorActivatedAt(Date.now());
        } else if (mode === 'manual') {
            setAutoTranslatorActivatedAt(null);
        }
    }, [isTranslatorActive]);

    // Handle translated input when text changes
    useEffect(() => {
        if (!input.trim()) {
            setTranslatedInput('');
            setIsTranslatingInput(false);
            return;
        }
        
        // Auto translation mode
        if (isTranslatorActive && translatorMode === 'auto') {
            const delayDebounceFn = setTimeout(() => {
                handleManualTranslateInput();
            }, 500); // 500ms debounce
            return () => clearTimeout(delayDebounceFn);
        }
    }, [input, isTranslatorActive, translatorMode]);

    // Explicit manual translate for input bar (Bidirectional Smart Translation)
    const handleManualTranslateInput = useCallback(async () => {
        if (!input.trim() || isTranslatingInput) return;
        setIsTranslatingInput(true);
        try {
            const { sourceLang, targetLang } = resolveBidirectionalLanguages(
                input,
                translatorSourceLang || 'ar',
                translatorLang || 'en'
            );
            const translated = await translateTextFree(
                input,
                targetLang,
                sourceLang
            );
            setTranslatedInput(translated || input);
        } catch (err: any) {
            console.warn('Manual input translation notice:', err);
            setTranslatedInput(input);
        } finally {
            setIsTranslatingInput(false);
        }
    }, [input, isTranslatingInput, translatorSourceLang, translatorLang]);

    const handleSaveTranslation = useCallback((msgId: string, text: string) => {
        setCachedTranslations(prev => {
            if (prev[msgId] === text) return prev;
            return { ...prev, [msgId]: text };
        });
    }, []);

    const handleSaveVoiceData = useCallback((audioId: string, data: { transcript: string; translated: string }) => {
        setCachedVoiceData(prev => {
            const existing = prev[audioId];
            if (existing && existing.transcript === data.transcript && existing.translated === data.translated) return prev;
            return { ...prev, [audioId]: data };
        });
    }, []);

    // Listen for global translation cache clear event
    useEffect(() => {
        const handleGlobalClear = () => {
            setCachedTranslations({});
            setCachedVoiceData({});
        };
        window.addEventListener('hisee_translation_cache_cleared', handleGlobalClear);
        return () => window.removeEventListener('hisee_translation_cache_cleared', handleGlobalClear);
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '40px';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);



    useEffect(() => {
        const checkKey = async () => {
            if ((window as any).aistudio) {
                const selected = await (window as any).aistudio.hasSelectedApiKey();
                setHasKey(selected);
            } else {
                setHasKey(true);
            }
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        if ((window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
            setHasKey(true);
        }
    };

    const updateParentChat = async (lastMessage: string, type: string = 'text') => {
        if (!firestoreChatId) return;
        const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
        const processedLastMessage = chatSettings.privacy.endToEndEncryption ? encryptText(lastMessage) : lastMessage;
        try {
            const participants = (chat as any).participants || (chat.isGroup ? [...(chat.members || []), myId] : [myId, chat.user.id]);
            await setDoc(chatRef, {
                lastMessage: processedLastMessage,
                lastMessageType: type,
                lastMessageSenderId: myId,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                updatedAt: serverTimestamp(),
                lastMessageTimestamp: Date.now(),
                participants: participants,
                unreadCount: increment(1),
                user: {
                    ...chat.user,
                    lastActive: chat.user.lastActive || Date.now()
                }, // Keep user info for the list
                isGroup: !!chat.isGroup
            }, { merge: true });

            // Send notification to receiver if it's a private chat
            if (!chat.isGroup && chat.user.id !== myId && chat.id !== 'hisee-ai-bot') {
                const notiRef = collection(firestoreDb, 'users', chat.user.id, 'notifications');
                await addDoc(notiRef, {
                    type: 'message',
                    fromUserId: myId,
                    fromUserName: myProfile?.name || myProfile?.nickname || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.uid,
                    text: lastMessage,
                    createdAt: serverTimestamp(),
                    chatId: firestoreChatId
                });
            }
        } catch (error) {
            console.error("Error updating parent chat:", error);
        }
    };

    useEffect(() => {
        if (!firestoreChatId || !auth.currentUser) return;
        // Mark incoming messages as read in real-time while in chat
        messages.forEach(msg => {
            if (msg.senderId !== myId && !msg.isRead) {
                updateDoc(doc(firestoreDb, 'chats', firestoreChatId, 'messages', msg.id), { isRead: true }).catch(() => {});
            }
        });
    }, [messages, firestoreChatId, myId]);

    useEffect(() => {
        if (scrollRef.current && !isInitialLoad.current) {
            const container = scrollRef.current;
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
            const lastMsg = messages[0]; // messages is desc, so [0] is newest
            const isMyMessage = lastMsg?.senderId === myId;
            
            if (isAtBottom || isMyMessage) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
            }
        }
    }, [messages.length, myId]);

    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Call Management Context
    const {
        activeCall,
        setActiveCall,
        callStream,
        setCallStream,
        remoteStream,
        setRemoteStream,
        isCallMinimized,
        setIsCallMinimized,
        isCallHidden,
        setIsCallHidden,
        isLocalVideoFocused,
        setIsLocalVideoFocused,
        isCallMuted,
        setIsCallMuted,
        isCallCameraOff,
        setIsCallCameraOff,
        isSpeakerOn,
        setIsSpeakerOn,
        callVolume,
        setCallVolume,
        isScreenSharing,
        setIsScreenSharing,
        callVideoRequest,
        setCallVideoRequest,
        facingMode,
        setFacingMode,
        callParticipants,
        setCallParticipants,
        showAddParticipants,
        setShowAddParticipants,
        localCallVideoRef,
        remoteCallVideoRef,
        startCall,
        endCall,
        endCallAndCloseHardware,
        acceptCall,
        rejectCall,
        switchCamera,
        toggleCallMute,
        toggleCallCamera,
        toggleSpeaker,
        toggleScreenShare,
        stopScreenSharingDirectly,
        upgradeToVideo,
        acceptVideoUpgrade,
        rejectVideoUpgrade,
        initiateVideoUpgradeAsRequester,
        stopAllRingtones,
        formatDuration
    } = useCall();

    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setCustomBackgroundUrl(url);
            setVideoBackground('custom');
        }
        if (bgInputRef.current) {
            bgInputRef.current.value = '';
        }
    };



    const uploadAndSendAudio = async (audioBlob: Blob, durationSeconds: number) => {
        stopHardwareMicrophone();
        const localUrl = URL.createObjectURL(audioBlob);
        try {
            const messagesRef = collection(firestoreDb, 'chats', firestoreChatId, 'messages');
            const docRef = doc(messagesRef);
            const messageId = docRef.id;
            const messageText = 'رسالة صوتية';
            const processedText = chatSettings.privacy.endToEndEncryption ? encryptText(messageText) : messageText;

            // 1. Immediately convert blob to base64 Data URL so both sender and receiver have instant playable audio
            let audioDataUrl = localUrl;
            try {
                audioDataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string) || localUrl);
                    reader.onerror = () => resolve(localUrl);
                    reader.readAsDataURL(audioBlob);
                });
            } catch (e) {
                console.warn("Base64 audio conversion fallback:", e);
            }

            const initialAudioUrl = audioDataUrl;

            const messageData = {
                id: messageId,
                senderId: myId,
                receiverId: chat.user.id,
                createdAt: serverTimestamp(),
                timestamp: new Date().toISOString(),
                isRead: false,
                isPlayed: false,
                type: 'audio',
                audioDuration: formatDuration(durationSeconds),
                text: processedText,
                isUploading: false,
                audioUrl: initialAudioUrl,
                mediaUrl: audioDataUrl,
                mediaType: 'audio',
                isEncrypted: chatSettings.privacy.endToEndEncryption,
                disappearingDuration: (currentChat?.disappearingMessages?.enabled && typeof currentChat?.disappearingMessages?.duration === 'number' && currentChat.disappearingMessages.duration > 0) ? currentChat.disappearingMessages.duration : null
            };
            await setDoc(docRef, messageData);
            setLocalAudioUrls(prev => ({ ...prev, [messageId]: audioDataUrl }));
            await updateParentChat(messageText, 'audio');
            if (!isGroup && friendStatus !== 'friends') {
                const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
                await updateDoc(chatRef, {
                    [`messageCount_${myId}`]: increment(1)
                }).catch(() => {});
            }
            (async () => {
                try {
                    let downloadURL = '';

                    // 1. Try Firebase Storage first (Primary fast reliable cloud storage)
                    try {
                        const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.wav`;
                        const storagePath = `chats/${firestoreChatId}/${fileName}`;
                        const storageRef = ref(storage, storagePath);
                        const file = new File([audioBlob], fileName, { type: audioBlob.type || 'audio/wav' });
                        const uploadTask = uploadBytesResumable(storageRef, file);

                        downloadURL = await new Promise<string>((resolve, reject) => {
                            uploadTask.on(
                                'state_changed',
                                (snapshot) => {
                                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                                    setUploadProgress(prev => ({
                                        ...prev,
                                        [messageId]: progress
                                    }));
                                },
                                (err) => reject(err),
                                async () => {
                                    try {
                                        const dURL = await getDownloadURL(uploadTask.snapshot.ref);
                                        resolve(dURL);
                                    } catch (e) {
                                        reject(e);
                                    }
                                }
                            );
                        });
                    } catch (fbStorageErr) {
                        console.warn("Firebase Storage audio upload skipped/failed, trying server endpoint:", fbStorageErr);
                    }

                    // 2. Fallback to /api/upload if Firebase Storage was not used or failed
                    if (!downloadURL) {
                        try {
                            const formData = new FormData();
                            formData.append('file', audioBlob, `audio_${Date.now()}.wav`);
                            
                            downloadURL = await new Promise<string>((resolve) => {
                                const xhr = new XMLHttpRequest();
                                xhr.open('POST', '/api/upload', true);
                                xhr.upload.onprogress = (event) => {
                                    if (event.lengthComputable) {
                                        const percentComplete = (event.loaded / event.total) * 100;
                                        setUploadProgress(prev => ({
                                            ...prev,
                                            [messageId]: percentComplete
                                        }));
                                    }
                                };
                                xhr.onload = () => {
                                    if (xhr.status >= 200 && xhr.status < 300) {
                                        try {
                                            const response = JSON.parse(xhr.responseText);
                                            if (response.url) {
                                                resolve(response.url);
                                                return;
                                            }
                                        } catch (e) {
                                            // Non-JSON response
                                        }
                                        resolve('');
                                    } else {
                                        resolve('');
                                    }
                                };
                                xhr.onerror = () => resolve('');
                                xhr.send(formData);
                            });
                        } catch (apiErr) {
                            console.warn("API upload failed:", apiErr);
                        }
                    }

                    // If a valid cloud URL was obtained, update Firestore document
                    if (downloadURL && downloadURL.startsWith('http')) {
                        const finalAudioUrl = chatSettings.privacy.endToEndEncryption ? encryptText(downloadURL) : downloadURL;
                        await updateDoc(docRef, {
                            audioUrl: finalAudioUrl,
                            mediaUrl: downloadURL,
                            isUploading: false
                        }).catch(() => {});
                    }

                    setUploadProgress(prev => {
                        const next = { ...prev };
                        delete next[messageId];
                        return next;
                    });
                } catch (error) {
                    console.error("Background Audio Upload Error:", error);
                    setUploadProgress(prev => {
                        const next = { ...prev };
                        delete next[messageId];
                        return next;
                    });
                }
            })();
        } catch (error) {
            console.error("Error sending optimistic audio message:", error);
            setIsUploading(false);
        }
    };

    const getSupportedMimeType = () => {
        return getOptimizedVoiceMimeType() || 'audio/webm';
    };

    const playMicSound = (type: 'start' | 'stop') => {
        if (settings?.chatSettings?.muteAllSounds) return;
        if (settings?.chatSettings?.sounds && settings.chatSettings.sounds.buttonClicks === false) return;

        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                const audioCtx = new AudioCtx();
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.type = 'sine';
                if (type === 'start') {
                    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
                } else {
                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.08);
                }

                const volSetting = settings?.chatSettings?.sounds?.recordingStartVolume ?? 1;
                const safeVol = isFinite(volSetting) ? volSetting : 1;
                const notifVol = ((settings?.chatSettings?.notificationVolume ?? 100) / 100);
                const volume = 0.15 * safeVol * notifVol;

                gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.12);

                setTimeout(() => {
                    try { audioCtx.close(); } catch (e) {}
                }, 250);
            }
        } catch (e) {
            console.error("Mic sound WebAudio error:", e);
        }

        try {
            const url = type === 'start'
                ? 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
                : 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
            const audio = new Audio(url);
            audio.volume = Math.min(1, Math.max(0, ((settings?.chatSettings?.notificationVolume ?? 100) / 100)));
            audio.play().catch(() => {});
        } catch (e) {}
    };


    const startRecording = async (e?: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        if (isRecording) return;
        (window as any).__isVoiceRecording = true;
        
        // --- Immediate UI Feedback (Start) ---
        setIsRecording(true);
        setIsLockingRecording(false);
        setIsRecordingPaused(false);
        setRecordingDuration(0);
        updateChatStatus('isRecording', true).catch(() => {});
        // --- Immediate UI Feedback (End) ---

        stopHardwareMicrophone();
        isRecordingIntentRef.current = true;
        isLockedRef.current = false;
        isDeletedRef.current = false;
        isDeletingRef.current = false;
        isEditingRef.current = false;
        isSendingAudioRef.current = false;
        isPausingForLockRef.current = false;
        setSwipeX(0);
        setSwipeY(0);
        recordingPressStartTimeRef.current = Date.now();
        
        playMicSound('start');
        if (e) {
            const clientX = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX;
            const clientY = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY;
            if (typeof clientX === 'number') startXRef.current = clientX;
            if (typeof clientY === 'number') startYRef.current = clientY;
            if ('pointerId' in e && e.currentTarget && typeof (e.currentTarget as any).setPointerCapture === 'function') {
                try { (e.currentTarget as any).setPointerCapture((e as React.PointerEvent).pointerId); } catch (err) {}
            }
        }

        console.log("Audio: startRecording called");
        if (!requirePermission('microphone', 'تسجيل الرسائل الصوتية', () => startRecording())) {
            return;
        }
        try {
            previewBlobRef.current = null;
            completedBlobsRef.current = [];
            isPausingForLockRef.current = false;

            if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop(); } catch (e) {} mediaRecorderRef.current = null; }
            stopHardwareMicrophone();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            }).catch(async () => {
                return await navigator.mediaDevices.getUserMedia({ audio: true });
            });
            
            if (!isRecordingIntentRef.current) {
                stream.getTracks().forEach(track => {
                    try { track.stop(); track.enabled = false; } catch (e) {}
                });
                return;
            }
            
            recordingStreamRef.current = stream;
            
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume().catch(() => {});
            }
            
            const mimeType = getSupportedMimeType();
            const recorderOptions: MediaRecorderOptions = {};
            if (mimeType) {
                recorderOptions.mimeType = mimeType;
            }

            const mediaRecorder = new MediaRecorder(stream, recorderOptions);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => { 
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data); 
                    try {
                        const mType = audioChunksRef.current[0]?.type || mediaRecorderRef.current?.mimeType || mimeType || 'audio/webm';
                        previewBlobRef.current = new Blob(audioChunksRef.current, { type: mType });
                    } catch (e) {
                        console.error("Error creating preview Blob dynamically:", e);
                    }
                }
            };

            mediaRecorder.onstop = async () => {
                // Immediate hardware release (Zero latency)
                stopHardwareMicrophone();

                const effectiveMime = mimeType || mediaRecorder.mimeType || 'audio/webm';
                const finalBlob = new Blob(audioChunksRef.current, { type: effectiveMime });
                previewBlobRef.current = finalBlob;
                
                // If recording was deleted or cancelled -> strictly do not send
                if (isDeletedRef.current || isDeletingRef.current) {
                    console.log("Audio: onstop ignored send because recording was cancelled/deleted");
                    isSendingAudioRef.current = false;
                    setIsRecording(false);
                    setIsLockingRecording(false);
                    setIsRecordingPaused(false);
                    stopHardwareMicrophone();
                    return;
                }

                // If locked for preview -> keep preview state active, do not send
                if (isLockedRef.current || isPausingForLockRef.current || isLockingRecording) {
                    console.log("Audio: onstop compiled previewBlob for locked preview mode. Size:", finalBlob.size);
                    isPausingForLockRef.current = false;
                    isSendingAudioRef.current = false;
                    setIsRecording(true);
                    setIsLockingRecording(true);
                    setIsRecordingPaused(true);
                    stopHardwareMicrophone();
                    return;
                }

                if (isSendingAudioRef.current) {
                    if (finalBlob && finalBlob.size > 0) {
                        const finalDuration = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
                        await uploadAndSendAudio(finalBlob, finalDuration);
                    }
                    isSendingAudioRef.current = false;
                    setIsRecording(false);
                    setIsLockingRecording(false);
                    setIsRecordingPaused(false);
                    setRecordingDuration(0);
                }
                stopHardwareMicrophone();
                if (recordTimerRef.current) clearInterval(recordTimerRef.current);
                if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
            };

            mediaRecorder.start(100);
            // setIsRecording(true); // Moved to start of function for instant UI response
            if (!isLockedRef.current) {
                setIsLockingRecording(false);
                setIsRecordingPaused(false);
            }
            // setRecordingDuration(0); // Moved to start
            
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            recordingStartTimeRef.current = Date.now();
            recordTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Microphone access denied:", err);
            (window as any).__isVoiceRecording = false;
            setIsRecording(false);
            updateChatStatus('isRecording', false).catch(() => {});
            stopHardwareMicrophone();
            showToast("يرجى السماح بصلاحية الميكروفون.");
        }
    };

    const cancelRecording = () => {
        (window as any).__isVoiceRecording = false;
        playMicSound('stop');
        stopHardwareMicrophone();
        isRecordingIntentRef.current = false;
        isSendingAudioRef.current = false;
        isPausingForLockRef.current = false;
        isLockedRef.current = false;
        isDeletedRef.current = true;
        isDeletingRef.current = false;
        isEditingRef.current = false;
        completedBlobsRef.current = [];
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            if (audioPlayerRef.current.src) {
                URL.revokeObjectURL(audioPlayerRef.current.src);
            }
            audioPlayerRef.current.src = "";
            audioPlayerRef.current = null;
            setIsPreviewPlaying(false);
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setPreviewLevels(new Array(16).fill(15));
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {}
        }
        stopHardwareMicrophone();
        setIsRecording(false);
        setIsLockingRecording(false);
        setIsRecordingPaused(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
        previewBlobRef.current = null;
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };

    const handleDeleteRecording = () => {
        cancelRecording();
        setIsLockingRecording(false);
        setIsRecordingPaused(false);
    };

    const pauseRecording = () => {
        (window as any).__isVoiceRecording = false;
        isPausingForLockRef.current = true;
        isLockedRef.current = true;
        setIsLockingRecording(true);
        setIsRecordingPaused(true);
        updateChatStatus('isRecording', false).catch(() => {});
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
        if ('vibrate' in navigator) navigator.vibrate(50);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try {
                mediaRecorderRef.current.stop();
            } catch (err) {
                console.error("Error stopping media recorder for pause:", err);
            }
        }
        stopHardwareMicrophone();
    };

    const resumeRecording = async () => {
        (window as any).__isVoiceRecording = true;
        isRecordingIntentRef.current = true;
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            if (audioPlayerRef.current.src) {
                URL.revokeObjectURL(audioPlayerRef.current.src);
            }
            audioPlayerRef.current.src = "";
            audioPlayerRef.current = null;
            setIsPreviewPlaying(false);
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setPreviewLevels(new Array(16).fill(15));

        console.log("Audio: resumeRecording called (starting a new segment)");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            }).catch(async () => {
                return await navigator.mediaDevices.getUserMedia({ audio: true });
            });
            
            if (!isRecordingIntentRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            
            recordingStreamRef.current = stream;
            
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume().catch(() => {});
            }
            
            const mimeType = getSupportedMimeType();
            const recorderOptions: MediaRecorderOptions = {};
            if (mimeType) {
                recorderOptions.mimeType = mimeType;
            }

            const mediaRecorder = new MediaRecorder(stream, recorderOptions);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => { 
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data); 
                    try {
                        const mType = audioChunksRef.current[0]?.type || mediaRecorderRef.current?.mimeType || mimeType || 'audio/webm';
                        previewBlobRef.current = new Blob(audioChunksRef.current, { type: mType });
                    } catch (e) {
                        console.error("Error creating preview Blob dynamically on resume:", e);
                    }
                }
            };
            mediaRecorder.onstop = async () => {
                // Immediate hardware release (Zero latency)
                stopHardwareMicrophone();

                const effectiveMime = mimeType || mediaRecorder.mimeType || 'audio/webm';
                const finalBlob = new Blob(audioChunksRef.current, { type: effectiveMime });
                previewBlobRef.current = finalBlob;
                
                // If recording was deleted or cancelled -> strictly do not send
                if (isDeletedRef.current || isDeletingRef.current) {
                    console.log("Audio: onstop (resume) ignored send because recording was cancelled/deleted");
                    isSendingAudioRef.current = false;
                    setIsRecording(false);
                    setIsLockingRecording(false);
                    setIsRecordingPaused(false);
                    stopHardwareMicrophone();
                    return;
                }

                // If locked for preview -> keep preview state active, do not send
                if (isLockedRef.current || isPausingForLockRef.current || isLockingRecording) {
                    console.log("Audio: onstop (resume) compiled previewBlob for locked preview mode. Size:", finalBlob.size);
                    isPausingForLockRef.current = false;
                    isSendingAudioRef.current = false;
                    setIsRecording(true);
                    setIsLockingRecording(true);
                    setIsRecordingPaused(true);
                    return;
                }

                if (isSendingAudioRef.current) {
                    const finalDuration = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
                    await uploadAndSendAudio(finalBlob, finalDuration);
                    isSendingAudioRef.current = false;
                    setIsRecording(false);
                    setIsLockingRecording(false);
                    setIsRecordingPaused(false);
                    setRecordingDuration(0);
                }
                
                if (recordTimerRef.current) clearInterval(recordTimerRef.current);
                if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
            };

            mediaRecorder.start(250);
            setIsRecordingPaused(false);
            updateChatStatus('isRecording', true).catch(() => {});
            
            playMicSound('start');
            
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            recordingTimeoutRef.current = setTimeout(() => {
                recordingStartTimeRef.current = Date.now() - (recordingDuration * 1000);
                recordTimerRef.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);
            }, 150);

            if ('vibrate' in navigator) navigator.vibrate(30);
        } catch (err) {
            console.error("Microphone access denied on resume:", err);
            showToast("يرجى السماح بصلاحية الميكروفون.");
        }
    };

    const startVisualizer = (audio: HTMLAudioElement) => {
        try {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            const startTime = Date.now();
            
            const updateWaveform = () => {
                try {
                    if (audioPlayerRef.current === audio && !audio.paused && !audio.ended) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        
                        // Generate a beautifully fluid, highly organic voice waveform animation
                        const levels = Array.from({ length: 16 }, (_, i) => {
                            const base = Math.sin(i * 0.45 + elapsed * 7.5) * 0.35;
                            const harmonic = Math.sin(i * 0.85 - elapsed * 13) * 0.25;
                            const highFreq = Math.sin(i * 1.4 + elapsed * 21) * 0.15;
                            const noise = (Math.random() - 0.5) * 0.12;
                            
                            const combined = 0.52 + base + harmonic + highFreq + noise;
                            return Math.max(15, Math.min(95, Math.round(combined * 100)));
                        });
                        
                        setPreviewLevels(levels);
                        animationFrameRef.current = requestAnimationFrame(updateWaveform);
                    } else {
                        setPreviewLevels(new Array(16).fill(15));
                        if (animationFrameRef.current) {
                            cancelAnimationFrame(animationFrameRef.current);
                            animationFrameRef.current = null;
                        }
                    }
                } catch (frameErr) {
                    console.error("Visualizer frame update error:", frameErr);
                    setPreviewLevels(new Array(16).fill(15));
                    if (animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                        animationFrameRef.current = null;
                    }
                }
            };
            
            updateWaveform();
        } catch (err) {
            console.error("Error setting up audio visualizer:", err);
            setPreviewLevels(new Array(16).fill(15));
        }
    };

    const previewRecording = () => {
        try {
            const previewId = 'preview';

            // 1. If currently playing, pause it and reset visualizer
            if (currentAudioIdRef.current === previewId && isPreviewPlaying) {
                if (currentAudioRef.current) {
                    const audio = currentAudioRef.current;
                    if (playPromiseRef.current) {
                        playPromiseRef.current.then(() => {
                            if (currentAudioRef.current === audio) audio.pause();
                        }).catch(() => {});
                    } else {
                        try {
                            audio.pause();
                        } catch (e) {
                            console.error("Error pausing preview audio:", e);
                        }
                    }
                }
                setIsPreviewPlaying(false);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                setPreviewLevels(new Array(16).fill(15));
                return;
            }

            // Before starting/resuming playback, validate that we have valid recorded audio data
            const totalSize = audioChunksRef.current ? audioChunksRef.current.reduce((acc, chunk) => acc + (chunk?.size || 0), 0) : 0;
            const hasPersistedBlob = previewBlobRef.current && previewBlobRef.current.size > 0;

            if (totalSize <= 0 && !hasPersistedBlob) {
                console.warn("No valid audio chunks or previewBlob available for preview (size is 0)");
                setIsPreviewPlaying(false);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                setPreviewLevels(new Array(16).fill(15));
                return;
            }

            // Pause any other active chat bubble audio player
            if (currentAudioRef.current && currentAudioIdRef.current !== previewId) {
                const audio = currentAudioRef.current;
                if (playPromiseRef.current) {
                    playPromiseRef.current.then(() => audio.pause()).catch(() => {});
                } else {
                    try {
                        audio.pause();
                    } catch (e) {}
                }
                setIsAudioPlaying(false);
                currentAudioRef.current = null;
                currentAudioIdRef.current = null;
            }

            // 2. Assemble a fresh standard Audio player from the persisted blob or audioChunksRef
            let preferredType = getSupportedMimeType() || 'audio/webm';
            if (audioChunksRef.current && audioChunksRef.current.length > 0 && audioChunksRef.current[0].type) {
                preferredType = audioChunksRef.current[0].type;
            } else if (mediaRecorderRef.current && mediaRecorderRef.current.mimeType) {
                preferredType = mediaRecorderRef.current.mimeType;
            }

            const audioBlob = previewBlobRef.current && previewBlobRef.current.size > 0 
                ? previewBlobRef.current 
                : new Blob(audioChunksRef.current, { type: preferredType });

            previewBlobRef.current = audioBlob;
            
            // Create temporary Object URL
            const url = URL.createObjectURL(audioBlob);
            
            // Create/Assign Audio instance matching the bubble player logic
            const audio = new Audio(url);
            audioPlayerRef.current = audio;
            currentAudioRef.current = audio;
            currentAudioIdRef.current = previewId;
            
            audio.onended = () => {
                if (audio.currentTime < 0.5 && recordingDuration > 1) {
                    console.log("Audio: Premature onended fired, ignoring.");
                    return;
                }
                setIsPreviewPlaying(false);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                setPreviewLevels(new Array(16).fill(15));
                if (currentAudioIdRef.current === previewId) {
                    currentAudioRef.current = null;
                    currentAudioIdRef.current = null;
                }
                if (audioPlayerRef.current === audio) {
                    audioPlayerRef.current = null;
                }
            };

            audio.onerror = (e) => {
                console.error("Audio playback error event:", e);
                setIsPreviewPlaying(false);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                setPreviewLevels(new Array(16).fill(15));
                if (currentAudioIdRef.current === previewId) {
                    currentAudioRef.current = null;
                    currentAudioIdRef.current = null;
                }
                if (audioPlayerRef.current === audio) {
                    audioPlayerRef.current = null;
                }
            };

            audio.currentTime = 0;
            setIsPreviewPlaying(true);
            const playPromise = audio.play();
            playPromiseRef.current = playPromise;
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    if (playPromiseRef.current === playPromise) {
                        playPromiseRef.current = null;
                    }
                    startVisualizer(audio);
                })
                .catch(err => {
                    if (playPromiseRef.current === playPromise) {
                        playPromiseRef.current = null;
                    }
                    if (err.name === 'AbortError') {
                        return;
                    }
                    console.error("Preview play start error:", err);
                    setIsPreviewPlaying(false);
                    if (animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                        animationFrameRef.current = null;
                    }
                    setPreviewLevels(new Array(16).fill(15));
                    if (currentAudioIdRef.current === previewId) {
                        currentAudioRef.current = null;
                        currentAudioIdRef.current = null;
                    }
                    if (audioPlayerRef.current === audio) {
                        audioPlayerRef.current = null;
                    }
                });
            }
        } catch (globalErr) {
            console.error("Global previewRecording error caught safely:", globalErr);
            setIsPreviewPlaying(false);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            setPreviewLevels(new Array(16).fill(15));
        }
    };

    // Alias to align perfectly with potential external references
    const handleTogglePreviewOnly = previewRecording;

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isRecordingIntentRef.current && !isRecording && !isMicHolding) return;
        
        const deltaX = e.clientX - startXRef.current;
        const deltaY = e.clientY - startYRef.current;
        
        setSwipeY(deltaY);

        // 1. Swipe Up to Pause/Lock and enter Preview mode (مع استمرار الضغط وسحب لأعلى يتم إيقاف التسجيل وتعليق الميكروفون وإظهار أدوات المعاينة)
        if (deltaY <= -40) {
            setSwipeX(0);
            isDeletingRef.current = false;
            isDeletedRef.current = false;
            isEditingRef.current = true;
            isLockedRef.current = true;
            if (!isLockingRecording) {
                setIsLockingRecording(true);
                setIsMicHolding(false);
                pauseRecording();
                if (e.currentTarget && typeof (e.currentTarget as any).releasePointerCapture === 'function') {
                    try { (e.currentTarget as any).releasePointerCapture(e.pointerId); } catch (err) {}
                }
            }
            return;
        } 
        
        // 2. Swipe Right to Delete (مع استمرار الضغط وسحب إلى اليمين يتم الحذف)
        if (!isLockedRef.current && !isLockingRecording) {
            isEditingRef.current = false;
            if (deltaX >= 40) {
                isDeletingRef.current = true;
                isDeletedRef.current = true;
                setSwipeX(deltaX);
                // Dragged far right (>= 90px) -> Trigger immediate cancel & trash animation
                if (deltaX >= 90) {
                    cancelRecording();
                    setFlyingMicX(deltaX);
                    setIsFlyingMic(true);
                    setTimeout(() => setIsFlyingMic(false), 800);
                    setSwipeX(0);
                    setSwipeY(0);
                    isDeletingRef.current = false;
                    setIsMicHolding(false);
                    if (e.currentTarget && typeof (e.currentTarget as any).releasePointerCapture === 'function') {
                        try { (e.currentTarget as any).releasePointerCapture(e.pointerId); } catch (err) {}
                    }
                }
            } else if (deltaX < 20) {
                setSwipeX(0);
                isDeletingRef.current = false;
                isDeletedRef.current = false;
            }
        }
    };

    const sendRecording = async (e?: React.PointerEvent | React.MouseEvent, forceSend: boolean = false) => {
        console.log("Audio: sendRecording called, forceSend:", forceSend);
        (window as any).__isVoiceRecording = false;

        if (isSendingAudioRef.current) {
            console.log("Audio: Already sending audio, ignoring duplicate call");
            return;
        }

        // Release pointer capture if event provided
        if (e && 'pointerId' in e && e.currentTarget && typeof (e.currentTarget as any).releasePointerCapture === 'function') {
            try { (e.currentTarget as any).releasePointerCapture((e as React.PointerEvent).pointerId); } catch (err) {}
        }

        if (!forceSend) {
            // Check if we should delete based on swipe right
            if (isDeletedRef.current || isDeletingRef.current || swipeX >= 40) {
                console.log("Audio: Slide to delete triggered, strictly cancelling without sending");
                setFlyingMicX(swipeX || 70);
                setIsFlyingMic(true);
                setTimeout(() => setIsFlyingMic(false), 800);
                cancelRecording();
                setSwipeX(0);
                setSwipeY(0);
                isDeletingRef.current = false;
                isDeletedRef.current = true;
                setIsMicHolding(false);
                return;
            }

            // If user swiped up to preview mode or is locked, strictly do not send on finger release
            if (isLockedRef.current || isLockingRecording || isEditingRef.current || swipeY <= -40) {
                console.log("Audio: Locked in preview mode, skipping automatic send on release");
                return;
            }
        }

        playMicSound('stop');
        setIsLockingRecording(false);
        setIsRecordingPaused(false);
        isRecordingIntentRef.current = false;
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            try { mediaRecorderRef.current.resume(); } catch (err) {}
        }
        
        setSwipeX(0);
        setSwipeY(0);
        isDeletingRef.current = false;
        isEditingRef.current = false;
        
        // Quota check
        if (friendStatus !== 'friends' && myMessageCount >= 2) {
            console.warn("Audio: Quota reached, blocking send");
            cancelRecording();
            return;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            isSendingAudioRef.current = true;
            setIsUploading(true);
            // Force data collection before stopping
            try {
                mediaRecorderRef.current.requestData();
                await new Promise((resolve) => setTimeout(resolve, 80));
            } catch (e) {
                console.error("Error requesting data:", e);
            }
            try { mediaRecorderRef.current.stop(); } catch (e) {}
            
            // Stop hardware mic tracks immediately
            stopHardwareMicrophone();
            setIsRecording(false);
            setRecordingDuration(0);
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        } else {
            // Send the paused/locked audio segments directly
            stopHardwareMicrophone();
            const finalBlob = previewBlobRef.current || (completedBlobsRef.current.length > 0 ? new Blob(completedBlobsRef.current, { type: getSupportedMimeType() || 'audio/webm' }) : null);
            if (finalBlob && finalBlob.size > 0) {
                isSendingAudioRef.current = true;
                setIsUploading(true);
                const finalDuration = Math.max(1, recordingDuration);
                await uploadAndSendAudio(finalBlob, finalDuration);
                
                isSendingAudioRef.current = false;
                setIsRecording(false);
                setIsLockingRecording(false);
                setIsRecordingPaused(false);
                setRecordingDuration(0);
                previewBlobRef.current = null;
                completedBlobsRef.current = [];
                audioChunksRef.current = [];
                if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            } else {
                cancelRecording();
            }
        }
    };

    const onSendAudio = async (blob: Blob | null) => {
        stopHardwareMicrophone();
        const mimeType = getSupportedMimeType() || 'audio/webm';
        const finalBlob = blob || previewBlobRef.current || (completedBlobsRef.current.length > 0 ? new Blob(completedBlobsRef.current, { type: mimeType }) : null);
        if (finalBlob && finalBlob.size > 0) {
            isSendingAudioRef.current = true;
            setIsUploading(true);
            const finalDuration = Math.max(1, recordingDuration);
            await uploadAndSendAudio(finalBlob, finalDuration);
            
            isSendingAudioRef.current = false;
            stopHardwareMicrophone();
            setIsRecording(false);
            setIsLockingRecording(false);
            setIsRecordingPaused(false);
            setRecordingDuration(0);
            previewBlobRef.current = null;
            completedBlobsRef.current = [];
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        } else {
            console.warn("onSendAudio called but no audio blob found");
            cancelRecording();
        }
    };

    const handleUpperMicRelease = async (currentSwipeY?: number) => {
        isRecordingIntentRef.current = false;
        const effectiveSwipeY = currentSwipeY !== undefined ? currentSwipeY : upperMicSwipeYRef.current;
        if (effectiveSwipeY >= 15) {
            if (isSendingAudioRef.current) return;
            isSendingAudioRef.current = true;

            if (recordTimerRef.current) {
                clearInterval(recordTimerRef.current);
            }
            if (recordingTimeoutRef.current) {
                clearTimeout(recordingTimeoutRef.current);
            }

            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
                try {
                    mediaRecorderRef.current.resume();
                } catch (err) {
                    console.error("Error resuming media recorder prior to release:", err);
                }
            }

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                setIsUploading(true);
                try {
                    mediaRecorderRef.current.requestData();
                    await new Promise((resolve) => setTimeout(resolve, 50));
                } catch (e) {
                    console.error("Error requesting data:", e);
                }
                try {
                    mediaRecorderRef.current.stop();
                } catch (err) {
                    console.error("Error stopping media recorder on upper mic release:", err);
                }
                stopHardwareMicrophone();
            } else {
                const finalBlob = previewBlobRef.current || (completedBlobsRef.current.length > 0 ? new Blob(completedBlobsRef.current, { type: getSupportedMimeType() || 'audio/webm' }) : null);
                if (finalBlob && finalBlob.size > 0) {
                    setIsUploading(true);
                    const finalDuration = Math.max(1, recordingDuration);
                    await uploadAndSendAudio(finalBlob, finalDuration);
                }
                stopHardwareMicrophone();
            }
            setIsRecording(false);
            setIsLockingRecording(false);
            setIsRecordingPaused(false);
            setRecordingDuration(0);
            updateUpperMicSwipeY(0);
        } else {
            updateUpperMicSwipeY(0);
        }
    };

    useEffect(() => {
        if (isRecording) {
            if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
            recordingTimeoutRef.current = setTimeout(() => {
                if (isRecording) {
                    setIsRecording(false);
                    setIsLockingRecording(false);
                    setIsRecordingPaused(false);
                    updateChatStatus('isRecording', false);
                }
            }, 300000); // 5 minutes safety timeout
        } else {
            if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
        }
        return () => {
            if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
        };
    }, [isRecording]);

    useEffect(() => {
        if (!chat.id || !myId || !firestoreDb) return;
        updateChatStatus('isRecording', isRecording);
        
        if ((isRecording || isMicHolding) && !isLockingRecording) {
            const handleMove = (clientX: number, clientY: number) => {
                if (!startXRef.current || !startYRef.current) {
                    startXRef.current = clientX;
                    startYRef.current = clientY;
                    return;
                }

                const deltaX = clientX - startXRef.current;
                const deltaY = clientY - startYRef.current;
                setSwipeY(deltaY);

                // 1. Swipe Up -> Lock into Preview Mode
                if (deltaY <= -35) {
                    setSwipeX(0);
                    isDeletingRef.current = false;
                    isDeletedRef.current = false;
                    isEditingRef.current = true;
                    isLockedRef.current = true;
                    setIsLockingRecording(true);
                    setIsMicHolding(false);
                    pauseRecording();
                    return;
                }

                // 2. Swipe Right -> Delete
                if (!isLockedRef.current && !isLockingRecording) {
                    isEditingRef.current = false;
                    if (deltaX >= 35) {
                        isDeletingRef.current = true;
                        setSwipeX(deltaX);
                        if (deltaX >= 75) {
                            isDeletedRef.current = true;
                            setFlyingMicX(deltaX);
                            setIsFlyingMic(true);
                            setTimeout(() => setIsFlyingMic(false), 800);
                            cancelRecording();
                            setSwipeX(0);
                            setSwipeY(0);
                            isDeletingRef.current = false;
                            setIsMicHolding(false);
                        }
                    } else if (deltaX < 15) {
                        setSwipeX(0);
                        isDeletingRef.current = false;
                    }
                }
            };

            const onWindowPointerMove = (e: PointerEvent) => {
                handleMove(e.clientX, e.clientY);
            };

            const onWindowTouchMove = (e: TouchEvent) => {
                if (e.touches && e.touches.length > 0) {
                    if (e.cancelable) e.preventDefault();
                    handleMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            };

            const onWindowEnd = () => {
                setIsMicHolding(false);
                const pressDuration = Date.now() - (recordingPressStartTimeRef.current || 0);

                // If swipe to delete was active or triggered -> strictly cancel & delete
                if (isDeletedRef.current || isDeletingRef.current || swipeX >= 35) {
                    console.log("Audio: Cancelled/Deleted by gesture on release");
                    cancelRecording();
                    setFlyingMicX(swipeX || 70);
                    setIsFlyingMic(true);
                    setTimeout(() => setIsFlyingMic(false), 800);
                    setSwipeX(0);
                    setSwipeY(0);
                    isDeletingRef.current = false;
                    isDeletedRef.current = true;
                    return;
                }

                // If locked into preview mode -> stay in preview mode (STRICTLY DO NOT SEND)
                if (isLockedRef.current || isLockingRecording || isEditingRef.current || swipeY <= -35) {
                    console.log("Audio: Locked in preview mode on release, not sending");
                    return;
                }

                // If quick tap (< 400ms), stay in instant 1-click recording mode with controls visible
                if (pressDuration < 400) {
                    console.log("Audio: Quick single-click tap detected, keeping recording active for hands-free speaking");
                    return;
                }

                // Only send if held for longer (> 400ms) and released (WhatsApp style)
                console.log("Audio: Hold release without swipe, sending audio");
                sendRecording(undefined, false);
            };

            window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
            window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
            window.addEventListener('pointerup', onWindowEnd);
            window.addEventListener('touchend', onWindowEnd);
            window.addEventListener('mouseup', onWindowEnd);
            window.addEventListener('pointercancel', onWindowEnd);
            window.addEventListener('touchcancel', onWindowEnd);

            return () => {
                window.removeEventListener('pointermove', onWindowPointerMove);
                window.removeEventListener('touchmove', onWindowTouchMove);
                window.removeEventListener('pointerup', onWindowEnd);
                window.removeEventListener('touchend', onWindowEnd);
                window.removeEventListener('mouseup', onWindowEnd);
                window.removeEventListener('pointercancel', onWindowEnd);
                window.removeEventListener('touchcancel', onWindowEnd);
            };
        }
    }, [isRecording, isMicHolding, isLockingRecording, swipeX, swipeY, chat.id, myId]);

    // Synchronize preview lifecycle with active call connection
    useEffect(() => {
        // When the call connects, seamlessly dismiss preview modal and hand over to VideoCallModal
        if (activeCall && (activeCall.status === 'connected' || (remoteStream && remoteStream.getVideoTracks().some((t: any) => t.readyState === 'live')))) {
            if (showCallPreview === 'video') {
                // Hand over stream to VideoCallModal without stopping tracks or nulling videoRef
                // We keep showCallPreview active for an extra moment to bridge the UI gap
                setIsCallingFromPreview(false);
                isInitiatingCallRef.current = false;
                
                // Close preview UI after a longer delay to ensure VideoCallModal is fully rendered and stable
                setTimeout(() => {
                    setShowCallPreview(null);
                    activeStreamRef.current = null;
                    if (videoRef.current) {
                        videoRef.current.srcObject = null;
                    }
                }, 1500);
            }
        }
    }, [activeCall?.status, remoteStream, showCallPreview]);

    useEffect(() => {
        if (isCallingFromPreview && !activeCall) {
            // Call was rejected, cancelled, or terminated
            setIsCallingFromPreview(false);
            isInitiatingCallRef.current = false;
            setShowCallPreview(null);
            stopCamera(true);
        }
    }, [activeCall, isCallingFromPreview]);

    useEffect(() => {
        if (!showCallPreview) return;
        const timer = setTimeout(() => {
            if (activeBeautyTab === 'filters') {
                scrollToItem(activeCamFilter.id);
            } else if (activeBeautyTab === 'cinematic') {
                scrollToItem(activeCinematicFilter.id);
            } else if (activeBeautyTab === 'background') {
                scrollToItem(videoBackground || 'none');
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [activeBeautyTab, showCallPreview]);

    useEffect(() => {
        let isMounted = true;
        const initCamera = async () => {
            if (activeCall || isInitiatingCallRef.current) return; // Don't touch camera if in a call or initiating
            
            if ((showCamera && !capturedImage) || showCallPreview === 'video') {
                await startCamera();
            } else {
                stopCamera(true);
            }
        };
        initCamera();
        return () => {
            isMounted = false;
            // Only stop camera if not handing over to an active call or initiating one
            // This is the CRITICAL fix for the "camera closing" issue
            if (!activeCall && !isInitiatingCallRef.current && !isCallingFromPreview) {
                stopCamera(true);
            }
        };
    }, [showCamera, facingMode, capturedImage, showCallPreview, activeCall]);

    const startCamera = async () => {
        stopCamera(true); // Ensure previous stream is completely stopped
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: facingMode },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            activeStreamRef.current = stream;
            (window as any)._previewStream = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.warn("Primary camera access failed, trying video-only basic constraints:", err);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true,
                    audio: false
                });
                activeStreamRef.current = stream;
                (window as any)._previewStream = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err2) {
                console.warn("Video-only camera access failed, trying audio-only basic constraints:", err2);
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: false,
                        audio: true
                    });
                    activeStreamRef.current = stream;
                    (window as any)._previewStream = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err3) {
                    console.warn("All physical camera attempts failed, initiating virtual canvas camera stream fallback...", err3);
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 640;
                        canvas.height = 480;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            let virtualStream: MediaStream | null = null;
                            let angle = 0;
                            const drawInterval = setInterval(() => {
                                if (!videoRef.current || activeStreamRef.current !== virtualStream) {
                                    clearInterval(drawInterval);
                                    return;
                                }
                                // Draw slate background
                                ctx.fillStyle = '#0f172a';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);

                                // Pulsing pink circle
                                const pulse = 100 + Math.sin(angle) * 15;
                                ctx.beginPath();
                                ctx.arc(canvas.width / 2, canvas.height / 2, pulse, 0, Math.PI * 2);
                                ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)'; // pink-500
                                ctx.lineWidth = 6;
                                ctx.stroke();

                                // Inner solid pink circle
                                ctx.beginPath();
                                ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
                                ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
                                ctx.fill();

                                // Informative fallback text
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
                                ctx.textAlign = 'center';
                                ctx.fillText(lang === 'ar' ? 'كاميرا افتراضية نشطة' : 'Virtual Camera Active', canvas.width / 2, canvas.height / 2 - 10);
                                ctx.font = '14px system-ui, -apple-system, sans-serif';
                                ctx.fillStyle = '#94a3b8';
                                ctx.fillText(lang === 'ar' ? 'الكاميرا الحقيقية مشغولة أو غير متاحة' : 'Real camera busy or unavailable', canvas.width / 2, canvas.height / 2 + 20);

                                angle += 0.05;
                            }, 33);

                            const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : null;
                            if (stream) {
                                virtualStream = stream;
                                activeStreamRef.current = virtualStream;
                                (window as any)._previewStream = virtualStream;
                                if (videoRef.current) {
                                    videoRef.current.srcObject = virtualStream;
                                }
                                return;
                            }
                        }
                    } catch (canvasErr) {
                        console.error("Virtual canvas fallback creation failed:", canvasErr);
                    }

                    console.error("Camera Error:", err);
                    setShowCamera(false);
                    setShowCallPreview(null);
                    stopCamera(true);
                }
            }
        }
    };

    const scrollToItem = (id: string) => {
        if (!filterScrollRef.current) return;
        const container = filterScrollRef.current;
        const item = container.querySelector(`[data-id="${id}"]`) as HTMLElement;
        if (item) {
            const scrollLeft = item.offsetLeft - (container.offsetWidth / 2) + (item.offsetWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    };

    const handleFilterScroll = () => {
        if (!filterScrollRef.current) return;
        const container = filterScrollRef.current;
        const center = container.scrollLeft + container.offsetWidth / 2;
        
        const children = Array.from(container.children) as HTMLElement[];
        let closestChild: HTMLElement | null = null;
        let minDistance = Infinity;

        children.forEach((child) => {
            const childCenter = child.offsetLeft + child.offsetWidth / 2;
            const distance = Math.abs(center - childCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestChild = child;
            }
        });

        if (closestChild) {
            const targetId = (closestChild as HTMLElement).getAttribute('data-id');
            if (!targetId || targetId === 'add-custom') return;

            if (activeBeautyTab === 'filters') {
                const filter = CAM_FILTERS.find(f => f.id === targetId);
                if (filter && activeCamFilter.id !== filter.id) {
                    setActiveCamFilter(filter);
                }
            } else if (activeBeautyTab === 'cinematic') {
                const filter = CINEMATIC_FILTERS.find(f => f.id === targetId);
                if (filter && activeCinematicFilter.id !== filter.id) {
                    setActiveCinematicFilter(filter);
                }
            } else if (activeBeautyTab === 'background') {
                if (targetId === 'custom') {
                    if (videoBackground !== 'custom') setVideoBackground('custom');
                } else {
                    const bg = BACKGROUNDS.find(b => b.id === targetId);
                    if (bg && videoBackground !== bg.id) {
                        setVideoBackground(bg.id === 'none' ? null : bg.id);
                    }
                }
            }
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                
                context.filter = activeCamFilter.css;
                if (isBeautyOn) context.filter += ' brightness(1.1) contrast(0.95)';

                context.translate(facingMode === 'user' ? videoRef.current.videoWidth : 0, 0);
                context.scale(facingMode === 'user' ? -1 : 1, 1);
                context.drawImage(videoRef.current, 0, 0);
                
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
            }
        }
    };

    const stopCamera = (forceKill = false) => {
        // Guard: If a call is being initiated or currently active, DO NOT kill the tracks and keep the srcObject
        if (!forceKill && (activeCall || isInitiatingCallRef.current || isCallingFromPreview)) {
            return;
        }
        
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach(track => {
                try { 
                    track.enabled = false;
                    track.stop(); 
                } catch (e) {
                    console.error("Error stopping track:", e);
                }
            });
            activeStreamRef.current = null;
        }

        try {
            if ((window as any)._previewStream) {
                (window as any)._previewStream.getTracks().forEach((track: any) => {
                    try {
                        track.enabled = false;
                        track.stop();
                    } catch (e) {}
                });
                (window as any)._previewStream = null;
            }
        } catch (e) {}

        if (recordingStreamRef.current && forceKill) {
            recordingStreamRef.current.getTracks().forEach(track => {
                try {
                    track.enabled = false;
                    track.stop();
                } catch (e) {}
            });
            recordingStreamRef.current = null;
        }

        if (videoRef.current) {
            if (videoRef.current.srcObject) {
                const s = videoRef.current.srcObject as MediaStream;
                if (s && typeof s.getTracks === 'function') {
                    s.getTracks().forEach(t => {
                        try {
                            t.enabled = false;
                            t.stop();
                        } catch (e) {}
                    });
                }
                videoRef.current.srcObject = null;
            }
            try {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            } catch (e) {}
        }
    };

    const handleStartVideoCallFromPreview = async () => {
        if (isCallingFromPreview) return;
        try {
            setIsCallingFromPreview(true);
            isInitiatingCallRef.current = true;
            (window as any).__USER_MANUAL_CALL_CLICK__ = true;
            
            // Pass activeStreamRef.current directly so the camera feed never flickers, drops, or closes
            await startCall('video', undefined, undefined, true, chat, activeStreamRef.current || undefined);
        } catch (err) {
            console.error("Error starting call from preview:", err);
            setIsCallingFromPreview(false);
            isInitiatingCallRef.current = false;
        }
    };

    const handleCancelCallFromPreview = async () => {
        if (activeCall) {
            try {
                await endCall();
            } catch (e) {}
        }
        setIsCallingFromPreview(false);
        isInitiatingCallRef.current = false;
        setShowCallPreview(null);
        stopCamera(true);
    };

    const [isMuted, setIsMuted] = useState(chat.isMuted || false);
    const [showFiltersMenu, setShowFiltersMenu] = useState(false);
    const [searchCategory, setSearchCategory] = useState<string | null>(null);
    const [showClearChatMenu, setShowClearChatMenu] = useState(false);
    const [showRingtoneMenu, setShowRingtoneMenu] = useState(false);
    const [pendingClearType, setPendingClearType] = useState<string | null>(null);
    const [showReportMenu, setShowReportMenu] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [isDeletingMembers, setIsDeletingMembers] = useState(false);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [showGroupConfirm, setShowGroupConfirm] = useState(false);
    const [showCallModeMenu, setShowCallModeMenu] = useState<{show: boolean, type: 'video' | 'voice' | null}>({show: false, type: null});
    const [callModeSelection, setCallModeSelection] = useState<'all' | 'except'>('all');
    const [includedMemberIds, setIncludedMemberIds] = useState<string[]>([]);
    const [callMemberSearchQuery, setCallMemberSearchQuery] = useState<string>('');

    // List of candidate group members excluding current user and bots
    const allGroupMembers = useMemo(() => {
        if (!chat.isGroup) return [];
        return Array.from(new Set([
            ...(chat.members || []),
            ...(chat.participants || [])
        ])).filter(id => id && id !== myId && id !== 'me' && id !== 'hisee-ai-bot');
    }, [chat.members, chat.participants, chat.isGroup, myId]);

    const openGroupCallModeMenu = (type: 'voice' | 'video') => {
        setShowMembersModal(false);
        setIncludedMemberIds(allGroupMembers);
        setCallModeSelection('all');
        setCallMemberSearchQuery('');
        setShowCallModeMenu({show: true, type});
    };

    const handleHeaderBack = () => {
        stopCamera(true);
        onBack();
    };

    const handleExitActiveGroup = async () => {
        if (!chat.isGroup) return;
        try {
            const chatRef = doc(firestoreDb, 'chats', chat.id);
            const newMembers = (chat.members || []).filter(id => id !== myId);
            const newParticipants = (chat.participants || []).filter(id => id !== myId);
            await updateDoc(chatRef, {
                members: newMembers,
                participants: newParticipants
            });
            setShowMembersModal(false);
            setShowGroupConfirm(false);
            onBack(); // Close chat window
        } catch (error) {
            console.error("Error exiting group:", error);
        }
    };

    const handleDeleteActiveGroup = async () => {
        if (!chat.isGroup) return;
        try {
            await deleteDoc(doc(firestoreDb, 'chats', chat.id));
            setShowMembersModal(false);
            setShowGroupConfirm(false);
            onBack(); // Close chat window
        } catch (error) {
            console.error("Error deleting group:", error);
        }
    };

    const handleStartGroupCallMode = async () => {
        if (!showCallModeMenu.type || !chat.isGroup) return;
        
        let participantsToCall: string[] = [];
        if (callModeSelection === 'all') {
            participantsToCall = allGroupMembers;
        } else {
            // 'except': filter members who remain included (i.e. not excluded)
            participantsToCall = allGroupMembers.filter(id => includedMemberIds.includes(id));
        }

        if (participantsToCall.length === 0 && allGroupMembers.length > 0) {
            showToast('يرجى تحديد عضو واحد على الأقل للمكالمة');
            return;
        }

        const callType = showCallModeMenu.type;
        setShowCallModeMenu({show: false, type: null});

        try {
            (window as any).__USER_MANUAL_CALL_CLICK__ = true;
            await startGroupCall(chat, callType, participantsToCall);
        } catch (error) {
            console.error('[ChatWindow] Error starting group call:', error);
            showToast('تعذر بدء المكالمة الجماعية، يرجى المحاولة ثانية');
        }
    };

    const handleRemoveMemberFromGroup = async (memberId: string) => {
        if (!chat.isGroup) return;
        try {
            const chatRef = doc(firestoreDb, 'chats', chat.id);
            const newMembers = (chat.members || []).filter(id => id !== memberId);
            const newParticipants = (chat.participants || []).filter(id => id !== memberId);
            await updateDoc(chatRef, {
                members: newMembers,
                participants: newParticipants
            });
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    const handleAddMemberToGroup = async (memberId: string) => {
        if (!chat.isGroup) return;
        try {
            const chatRef = doc(firestoreDb, 'chats', chat.id);
            await updateDoc(chatRef, {
                members: arrayUnion(memberId),
                participants: arrayUnion(memberId)
            });
        } catch (error) {
            console.error("Error adding member:", error);
        }
    };

    const handleMemberClick = (member: any) => {
        // Find or create private chat with member
        const memberUser = usersMap[member.id];
        let privateChatId = [myId, member.id].sort().join('_');
        
        let privateChat = {
            id: privateChatId,
            user: memberUser ? {
                id: memberUser.id,
                name: extractStringValue(memberUser.name || memberUser.displayName, extractStringValue(memberUser.email, memberUser.id)),
                avatar: memberUser.avatar || memberUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberUser.id}`,
                status: memberUser.status || 'offline'
            } : member,
                isGroup: false,
                lastMessage: '',
                timestamp: Date.now().toString(),
                unreadCount: 0,
                isOnline: false
            };
            
            // Save to Firestore instead of local db
            setDoc(doc(firestoreDb, 'chats', privateChat.id), privateChat, { merge: true });
        
        // Navigate to chat
        setShowMembersModal(false);
        onSelectChat(privateChat, chat);
    };

    const handleHeaderOption = (action: string) => {
        switch(action) {
            case 'search':
                setSearchCategory('main');
                setShowHeaderMenu(false);
                break;
            case 'mute':
                const newMuteState = !isMuted;
                setIsMuted(newMuteState);
                updateDoc(doc(firestoreDb, 'chats', firestoreChatId), { isMuted: newMuteState });
                showToast(newMuteState ? 'تم كتم إشعارات هذا المستخدم.' : 'تم إلغاء كتم إشعارات هذا المستخدم.');
                setShowHeaderMenu(false);
                break;
            case 'ringtones':
                setShowRingtoneMenu(true);
                break;
            case 'callRingtones':
                setShowHeaderMenu(false);
                setShowRingtoneModal(true);
                break;
            case 'clear':
                setShowClearChatMenu(true);
                break;
            case 'block':
                if (iBlockedThem) {
                    // Unblock directly
                    handleConfirmBlock(false);
                } else if (theyBlockedMe) {
                    showToast('الدردشة معطلة حالياً');
                } else {
                    setShowBlockConfirm(true);
                    setShowHeaderMenu(false);
                }
                break;
            case 'report':
                setShowReportMenu(true);
                break;
        }
    };

    const handleConfirmBlock = async (shouldBlock: boolean) => {
        try {
            setIsBlocked(shouldBlock);
            setIBlockedThem(shouldBlock);
            if (!shouldBlock) {
                setTheyBlockedMe(false);
            }
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            await updateDoc(chatRef, { 
                isBlocked: shouldBlock,
                blockedBy: shouldBlock ? myId : null 
            });
            
            // Global Block (Mutual)
            const myUserRef = doc(firestoreDb, 'users', myId);
            const theirUserRef = doc(firestoreDb, 'users', chat.user.id);
            
            if (shouldBlock) {
                // Add to my blocked list
                await updateDoc(myUserRef, {
                    blockedUsers: arrayUnion(chat.user.id)
                });
                // Add me to their 'blockedBy' list
                await updateDoc(theirUserRef, {
                    blockedBy: arrayUnion(myId)
                });
            } else {
                // Remove from my blocked list
                await updateDoc(myUserRef, {
                    blockedUsers: arrayRemove(chat.user.id)
                });
                // Remove me from their 'blockedBy' list
                await updateDoc(theirUserRef, {
                    blockedBy: arrayRemove(myId)
                });
            }

            showToast(shouldBlock ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم');
            setShowBlockConfirm(false);
        } catch (error) {
            console.error("Error blocking user:", error);
            showToast("حدث خطأ أثناء تنفيذ الإجراء");
        }
    };

    const handleSendReport = async () => {
        if (!reportReason) {
            showToast('يرجى تحديد سبب البلاغ.');
            return;
        }
        
        try {
            const reporterName = (myProfile as any)?.displayName || (myProfile as any)?.name || (myProfile as any)?.nickname || myId;
            const reportedUserName = currentChatUser?.name || chat.user.name || chat.user.id;
            
            // توليد حزمة البلاغ المشفرة للمشرفين (E2EE Admin Payload)
            let e2eeReportData: any = null;
            try {
                const latestMsg = messages.length > 0 ? messages[0] : { text: reportDescription };
                e2eeReportData = await createReportPayload(myId, latestMsg, reportReason);
            } catch (cryptoErr) {
                console.warn('E2EE report payload generation fallback:', cryptoErr);
            }

            await addDoc(collection(firestoreDb, 'reports'), {
                reportedBy: myId,
                reporterName: reporterName,
                reportedUser: chat.user.id,
                reportedUserName: reportedUserName,
                reason: reportReason,
                commentText: reportDescription || `بلاغ من محادثة خاصة عن المستخدم ${reportedUserName}`,
                status: 'PENDING',
                timestamp: serverTimestamp(),
                notes: reportDescription || '',
                actionTaken: '',
                chatId: firestoreChatId,
                e2eeReportPayload: e2eeReportData ? e2eeReportData.encryptedReportData : null,
                isE2EEReported: Boolean(e2eeReportData?.isE2EEReported)
            });
            
            console.log('Report sent to Firestore with E2EE payload:', { reason: reportReason, description: reportDescription, chatId: chat.id });
            showToast('تم إرسال البلاغ للمسؤولين بنجاح.');
        } catch (error) {
            console.error("Error sending report to Firestore:", error);
            showToast('حدث خطأ أثناء إرسال البلاغ، يرجى المحاولة لاحقاً.');
        }
        
        setShowReportMenu(false);
        setReportReason('');
        setReportDescription('');
        setShowHeaderMenu(false);
    };


    const handleTogglePinMessage = async (msgId: string) => {
        try {
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            const currentPinned = ((currentChat as any)['pinnedMessageIds_' + myId]) || [];
            const isPinned = currentPinned.includes(msgId);
            const updatedPinned = isPinned 
                ? currentPinned.filter((id: string) => id !== msgId)
                : [...currentPinned, msgId];
            
            await updateDoc(chatRef, { ['pinnedMessageIds_' + myId]: updatedPinned });
            
            // update state locally
            setCurrentChat(prev => ({
                ...prev,
                ['pinnedMessageIds_' + myId]: updatedPinned
            }));

            // Sync with unified pinned localStorage
            try {
                const savedUnified = JSON.parse(localStorage.getItem('hisee_unified_pinned_msgs') || '[]');
                if (isPinned) {
                    const filtered = savedUnified.filter((p: any) => p.id !== msgId);
                    localStorage.setItem('hisee_unified_pinned_msgs', JSON.stringify(filtered));
                } else {
                    const targetMsg = messages.find(m => m.id === msgId);
                    if (targetMsg) {
                        const cleanTxt = decryptText(targetMsg.text || "");
                        const newItem: PinnedItem = {
                            id: targetMsg.id,
                            type: targetMsg.type,
                            text: cleanTxt,
                            audioUrl: targetMsg.audioUrl ? decryptText(targetMsg.audioUrl) : (targetMsg.type === 'audio' ? cleanTxt : undefined),
                            imageUrl: targetMsg.imageUrl ? decryptText(targetMsg.imageUrl) : (targetMsg.type === 'image' ? cleanTxt : undefined),
                            videoUrl: targetMsg.videoUrl ? decryptText(targetMsg.videoUrl) : (targetMsg.type === 'video' ? cleanTxt : undefined),
                            fileUrl: targetMsg.fileUrl ? decryptText(targetMsg.fileUrl) : (targetMsg.type === 'document' ? cleanTxt : undefined),
                            fileName: targetMsg.fileName,
                            fileSize: targetMsg.fileSize,
                            stickerUrl: targetMsg.stickerUrl,
                            giftUrl: targetMsg.giftUrl,
                            location: targetMsg.location,
                            contact: targetMsg.contact,
                            chatId: currentChat.id,
                            chatName: currentChat.isGroup ? (currentChat.name || 'الدردشة العامة') : (currentChat.user?.name || 'محادثة خاصة'),
                            senderId: targetMsg.senderId,
                            senderName: targetMsg.senderName,
                            timestamp: Date.now()
                        };
                        const updated = [newItem, ...savedUnified.filter((p: any) => p.id !== msgId)];
                        localStorage.setItem('hisee_unified_pinned_msgs', JSON.stringify(updated));
                    }
                }
            } catch (err) {
                console.error("Error syncing unified pinned msgs:", err);
            }
            
            showToast(isPinned ? 'تم إلغاء تثبيت الرسالة 📌' : 'تم تثبيت الرسالة بنجاح! 📌');
        } catch (error) {
            console.error("Error pinning message:", error);
        }
    };

    const handleSetDisappearing = async (duration: number) => {
        try {
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            const isEnabled = typeof duration === 'number' && duration > 0;
            const updatedConfig = {
                enabled: isEnabled,
                duration: isEnabled ? duration : 0,
                updatedAt: Date.now()
            };
            await updateDoc(chatRef, {
                disappearingMessages: updatedConfig
            });
            setCurrentChat(prev => ({
                ...prev,
                disappearingMessages: updatedConfig
            }));
            showToast(isEnabled ? `تم تفعيل {getTranslation(lang, "disappearingMessages", "Disappearing Messages")} بنجاح!` : 'تم إيقاف {getTranslation(lang, "disappearingMessages", "Disappearing Messages")}.');
        } catch (e) {
            console.error(e);
        }
    };

    const handleTogglePermission = async (field: 'allowAudio' | 'allowMedia' | 'allowDocuments') => {
        try {
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            const currentPermissions = currentChat.permissions || { allowAudio: true, allowMedia: true, allowDocuments: true };
            const nextPermissions = {
                ...currentPermissions,
                [field]: !currentPermissions[field]
            };
            await updateDoc(chatRef, { permissions: nextPermissions });
            setCurrentChat(prev => ({
                ...prev,
                permissions: nextPermissions
            }));
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleFavorite = async () => {
        try {
            const nextState = !isFavorite;
            setIsFavorite(nextState);
            localStorage.setItem(`hisee_fav_${chat.id}`, String(nextState));
            if (chat?.user?.id) {
                localStorage.setItem(`hisee_fav_user_${chat.user.id}`, String(nextState));
            }
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            await updateDoc(chatRef, { isFavorite: nextState });
            showToast(nextState ? 'تمت إضافة هذا الشخص والدردشة إلى المفضلة ⭐' : 'تمت الإزالة من المفضلة');
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleRestrict = async () => {
        try {
            const nextState = !isRestricted;
            setIsRestricted(nextState);
            localStorage.setItem(`hisee_restrict_${chat.id}`, String(nextState));
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            await updateDoc(chatRef, { isRestricted: nextState });
            showToast(nextState ? 'تم تقييد الحساب بنجاح ⚠️' : 'تم إلغاء تقييد الحساب');
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteContact = async () => {
        if (confirm('هل أنت متأكد من رغبتك في حذف جهة الاتصال هذه من قائمة أصدقائك؟')) {
            try {
                const myUserRef = doc(firestoreDb, 'users', myId);
                const myUserSnap = await getDoc(myUserRef);
                if (myUserSnap.exists()) {
                    const friends = myUserSnap.data().friends || [];
                    const updatedFriends = friends.filter((f: string) => f !== chat.user.id);
                    await updateDoc(myUserRef, { friends: updatedFriends });
                    
                    // Also update their friends list
                    const peerRef = doc(firestoreDb, 'users', chat.user.id);
                    const peerSnap = await getDoc(peerRef);
                    if (peerSnap.exists()) {
                        const peerFriends = peerSnap.data().friends || [];
                        const updatedPeerFriends = peerFriends.filter((f: string) => f !== myId);
                        await updateDoc(peerRef, { friends: updatedPeerFriends });
                    }
                    
                    showToast('تم حذف جهة الاتصال بنجاح.');
                    setShowHeaderMenu(false);
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleMoveChat = async () => {
        try {
            setIsArchived(true);
            showToast('تم نقل هذه الدردشة بنجاح إلى الأرشيف الآمن والمشفر 📁');
            setShowHeaderMenu(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleClearChat = async (type: string) => {
        console.log('handleClearChat called with type:', type);
        let messagesToDelete: Message[] = [];
        if (type === 'all') {
            messagesToDelete = messages;
        } else if (type === 'images') {
            messagesToDelete = messages.filter(m => m.type === 'image');
        } else if (type === 'videos') {
            messagesToDelete = messages.filter(m => m.type === 'video');
        } else if (type === 'documents') {
            messagesToDelete = messages.filter(m => m.type === 'document');
        } else if (type === 'text') {
            messagesToDelete = messages.filter(m => m.type === 'text');
        }
        
        console.log('Messages to delete:', messagesToDelete);
        try {
            const deletePromises = messagesToDelete.map(msg => 
                updateDoc(doc(firestoreDb, 'chats', firestoreChatId, 'messages', msg.id), {
                    deletedFor: arrayUnion(myId)
                })
            );
            await Promise.all(deletePromises);

            if (type === 'all') {
                // We don't update the parent chat's lastMessage here because it might still be visible to the other user.
                // The ChatList component should handle filtering out deleted messages when displaying the last message.
            }
        } catch (error) {
            console.error("Error clearing chat:", error);
        }
        
        setShowClearChatMenu(false);
        setShowHeaderMenu(false);
        setPendingClearType(null);
    };

    const handleDeleteMessage = async (msg: Message) => {
        setSelectedIds(new Set([msg.id]));
        setIsSelectionMode(true);
        setShowDeleteModal(true);
    };

    const handleDeleteSelected = async (deleteForEveryone: boolean) => {
        if (selectedIds.size === 0) return;
        
        const lockedSelected = Array.from(selectedIds).filter(id => messages.find(m => m.id === id)?.isLocked);
        if (lockedSelected.length > 0) {
            showToast('لا يمكن حذف الرسائل المحفوظة بأمان. يرجى إلغاء الحفظ أولاً.');
            setShowDeleteModal(false);
            setIsSelectionMode(false);
            setSelectedIds(new Set());
            return;
        }
        
        const idsToDelete = Array.from(selectedIds);
        const isLastDeleted = messages.length > 0 && idsToDelete.includes(messages[messages.length - 1].id);

        try {
            const deletePromises = idsToDelete.map(id => {
                const msgRef = doc(firestoreDb, 'chats', firestoreChatId, 'messages', id);
                if (deleteForEveryone) {
                    return deleteDoc(msgRef);
                } else {
                    return updateDoc(msgRef, {
                        deletedFor: arrayUnion(myId)
                    }).catch((e: any) => {
                        if (e.code === 'not-found') return;
                        throw e;
                    });
                }
            });
            await Promise.all(deletePromises);

            if (isLastDeleted && deleteForEveryone) {
                const remainingMessages = messages.filter(m => !selectedIds.has(m.id));
                const newLastMsg = remainingMessages.length > 0 ? remainingMessages[remainingMessages.length - 1] : null;
                const displayMessage = newLastMsg ? (newLastMsg.text || (newLastMsg.type === 'image' ? 'صورة' : 'رسالة')) : 'لا توجد رسائل';
                
                await updateDoc(doc(firestoreDb, 'chats', firestoreChatId), {
                    lastMessage: displayMessage,
                    updatedAt: newLastMsg?.createdAt || serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error deleting selected messages:", error);
        }

        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setShowDeleteModal(false);
    };

    const handleReply = () => {
        if (selectedIds.size === 0) return;
        const msgId = Array.from(selectedIds)[0];
        const msg = messages.find(m => m.id === msgId);
        if (msg) {
            setReplyingTo(msg);
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }
    };

    const handleReaction = (msgId: string, emoji: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;

        if (emoji === '🗑️') {
            handleDeleteMessage(msg);
            setReactionPickerMsgId(null);
            return;
        }

        const reactions = { ...(msg.reactions || {}) };
        const users = reactions[emoji] || [];
        if (!users.includes(myId)) {
            reactions[emoji] = [...users, myId];
        } else {
            reactions[emoji] = users.filter(uid => uid !== myId);
            if (reactions[emoji].length === 0) {
                delete reactions[emoji];
            }
        }
        updateDoc(doc(firestoreDb, 'chats', firestoreChatId, 'messages', msgId), { reactions });
        setReactionPickerMsgId(null);
    };

    const handleStarMessages = () => {
        if (selectedIds.size === 0) return;
        selectedIds.forEach(id => {
            const msg = messages.find(m => m.id === id);
            if (msg) {
                updateDoc(doc(firestoreDb, 'chats', firestoreChatId, 'messages', id), { 
                    ['isStarred_' + myId]: !((msg as any)['isStarred_' + myId]) 
                });
            }
        });
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handlePinSelectedMessages = async () => {
        if (selectedIds.size === 0) return;
        try {
            const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
            const currentPinned = ((currentChat as any)['pinnedMessageIds_' + myId]) || [];
            const selectedArr = Array.from(selectedIds);
            const newPinned = Array.from(new Set([...currentPinned, ...selectedArr]));
            
            await updateDoc(chatRef, { ['pinnedMessageIds_' + myId]: newPinned });
            
            setCurrentChat(prev => ({
                ...prev,
                ['pinnedMessageIds_' + myId]: newPinned
            }));

            try {
                const savedUnified = JSON.parse(localStorage.getItem('hisee_unified_pinned_msgs') || '[]');
                const newItems: PinnedItem[] = messages.filter(m => selectedIds.has(m.id)).map(m => {
                    const cleanTxt = decryptText(m.text || "");
                    return {
                        id: m.id,
                        type: m.type,
                        text: cleanTxt,
                        audioUrl: m.audioUrl ? decryptText(m.audioUrl) : (m.type === 'audio' ? cleanTxt : undefined),
                        imageUrl: m.imageUrl ? decryptText(m.imageUrl) : (m.type === 'image' ? cleanTxt : undefined),
                        videoUrl: m.videoUrl ? decryptText(m.videoUrl) : (m.type === 'video' ? cleanTxt : undefined),
                        fileUrl: m.fileUrl ? decryptText(m.fileUrl) : (m.type === 'document' ? cleanTxt : undefined),
                        fileName: m.fileName,
                        fileSize: m.fileSize,
                        stickerUrl: m.stickerUrl,
                        giftUrl: m.giftUrl,
                        location: m.location,
                        contact: m.contact,
                        chatId: currentChat.id,
                        chatName: currentChat.isGroup ? (currentChat.name || 'الدردشة العامة') : (currentChat.user?.name || 'محادثة خاصة'),
                        senderId: m.senderId,
                        senderName: m.senderName,
                        timestamp: Date.now()
                    };
                });
                const updatedUnified = [...newItems, ...savedUnified.filter((p: any) => !selectedIds.has(p.id))];
                localStorage.setItem('hisee_unified_pinned_msgs', JSON.stringify(updatedUnified));
            } catch (err) {
                console.error(err);
            }
            
            setIsSelectionMode(false);
            setSelectedIds(new Set());
            showToast('تم نقل وتثبيت الرسائل المحددة إلى قسم المثبت الموحد بنجاح 📌');
        } catch (error) {
            console.error("Error pinning selected messages:", error);
        }
    };

    const handleResend = () => {
        if (selectedIds.size === 0) return;
        const msgId = Array.from(selectedIds)[0];
        const msg = messages.find(m => m.id === msgId);
        if (msg) {
            if (msg.type === 'text') {
                setInput(decryptText(msg.text || ""));
                setForwardedMedia(null);
            } else {
                setForwardedMedia(msg);
                setInput(decryptText(msg.text || ""));
            }
            setIsSelectionMode(false);
            setSelectedIds(new Set());
            setReplyingTo(null);
        }
    };

    const handleShare = async () => {
        if (selectedIds.size === 0) return;
        const msgsToShare = messages.filter(m => selectedIds.has(m.id));
        const textToShare = msgsToShare.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.senderId === myId ? 'أنا' : m.senderId}: ${m.text || m.type}`).join('\n');
        
        let shared = false;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'مشاركة رسائل',
                    text: textToShare,
                });
                shared = true;
            } catch (err) {
                // Ignore Abort/Cancel (user canceled)
                const isCancel = err instanceof Error && (
                    err.name === 'AbortError' || 
                    err.message.toLowerCase().includes('cancel') || 
                    err.message.toLowerCase().includes('abort') ||
                    err.message.toLowerCase().includes('share canceled')
                );
                if (isCancel) {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                    return;
                }
                console.log('Error sharing:', err);
            }
        }

        if (!shared) {
            // Fallback to clipboard if sharing failed or is not supported
            try {
                await navigator.clipboard.writeText(textToShare);
                showToast('تم نسخ الرسائل إلى الحافظة بنجاح');
            } catch (clipErr) {
                console.error('Clipboard error:', clipErr);
                showToast('عذراً، تعذر نسخ الرسائل أو مشاركتها');
            }
        }

        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleForward = () => {
        if (selectedIds.size === 0) return;
        setShowForwardModal(true);
    };

    const handleOpenMessage = (msg: Message) => {
        if (msg.type === 'image' || msg.type === 'video') {
            setPreviewMedia(msg);
        } else if (msg.type === 'document' && msg.fileUrl) {
            window.open(msg.fileUrl, '_blank');
        } else if (msg.type === 'audio' && msg.audioUrl) {
            window.open(decryptText(msg.audioUrl), '_blank');
        }
    };

    const handleOpenLocationMenu = () => {
        setShowMoreMenu(false);
        setLocationError(null);
        setShowLocationModal(true);
    };

    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [liveLocationWatchId, setLiveLocationWatchId] = useState<number | null>(null);

    const handleSendLocationType = (isLive: boolean) => {
        setIsGettingLocation(true);
        setLocationError(null);
        setPendingLocation(null);

        if (!requirePermission('location', 'مشاركة وتحديد موقعك الجغرافي', () => handleSendLocationType(isLive))) {
            setLocationError('تم تعطيل إذن الموقع الجغرافي (GPS) من إعدادات الأمان والأذونات.');
            setIsGettingLocation(false);
            return;
        }

        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    let addressName: string | undefined = undefined;
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.address) {
                                const a = data.address;
                                const place = a.road || a.suburb || a.neighbourhood || a.quarter || a.amenity || a.building || a.district;
                                const city = a.city || a.town || a.village || a.county || a.state;
                                const country = a.country;
                                const parts = [place, city, country].filter(Boolean);
                                if (parts.length > 0) addressName = parts.join('، ');
                            }
                            if (!addressName && data && data.display_name) {
                                addressName = data.display_name.split(', ').slice(0, 3).join('، ');
                            }
                        }
                    } catch (e) {
                        console.warn("Reverse geocode failed:", e);
                    }
                    setPendingLocation({ lat, lng, live: isLive, address: addressName });
                    setIsGettingLocation(false);
                },
                (err) => {
                    console.warn("Geolocation access failed or GPS disabled:", err?.message || err);
                    setLocationError("خدمة الموقع (GPS) غير مفعلة على جهازك أو لم يتم إعطاء إذن الوصول. يرجى تفعيل الموقع من إعدادات جهازك أولاً ثم الضغط لمتابعة التحديد الدقيق على خرائط جوجل.");
                    setPendingLocation(null);
                    setIsGettingLocation(false);
                },
                geoOptions
            );
        } else {
            setLocationError("جهازك أو متصفحك لا يدعم تحديد الموقع الجغرافي (GPS).");
            setPendingLocation(null);
            setIsGettingLocation(false);
        }
    };

    const handleStopLiveLocation = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setLiveLocationWatchId(null);
            
            if (liveLocationMsgIdRef.current) {
                // Mark the message as no longer live
                const msg = messages.find(m => m.id === liveLocationMsgIdRef.current);
                if (msg && msg.location) {
                    updateDoc(doc(firestoreDb, 'chats', firestoreChatId, 'messages', liveLocationMsgIdRef.current), {
                        location: { ...msg.location, live: false }
                    });
                }
                liveLocationMsgIdRef.current = null;
            }
        }
    };

    const handleOpenPollCreator = () => {
        setShowMoreMenu(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setShowPollModal(true);
    };

    const handleAddPollOption = () => {
        if (pollOptions.length < 5) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const handleRemovePollOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    const handlePollOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const handleOpenContactPicker = async () => {
        setShowMoreMenu(false);
        setShowHeaderMenu(false);
        let contacts = Object.values(usersMap).filter(u => u.id !== myId);
        if (contacts.length === 0) {
            try {
                const snap = await getDocs(collection(firestoreDb, 'users'));
                contacts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(u => u.id !== myId);
            } catch (e) {
                console.error("Error loading contacts for contact picker:", e);
            }
        }
        setAvailableContacts(contacts);
        setShowContactModal(true);
    };

    const handleSelectContactToStage = (contact: UserType) => {
        setStagedContactToSend(contact);
        setShowContactModal(false);
    };

    const submitContact = async (contactToSubmit?: UserType) => {
        const contact = contactToSubmit || stagedContactToSend;
        if (!contact) return;
        const messagesRef = collection(firestoreDb, 'chats', firestoreChatId, 'messages');
        const docRef = doc(messagesRef);
        const messageId = docRef.id;
        const newMsg: any = {
            id: messageId,
            text: chatSettings.privacy.endToEndEncryption ? encryptText('جهة اتصال') : 'جهة اتصال',
            senderId: myId,
            receiverId: chat.user.id,
            isRead: false,
            type: 'contact',
            contact: {
                name: contact.name || (contact as any).displayName || (contact as any).email?.value || contact.id,
                phone: (contact as any).phone?.value || `ID: ${contact.id}`,
                avatar: contact.avatar || (contact as any).photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`
            },
            isEncrypted: chatSettings.privacy.endToEndEncryption,
            disappearingDuration: (currentChat?.disappearingMessages?.enabled && typeof currentChat?.disappearingMessages?.duration === 'number' && currentChat.disappearingMessages.duration > 0) ? currentChat.disappearingMessages.duration : null,
            createdAt: serverTimestamp(),
            timestamp: new Date().toISOString(),
            mediaUrl: "",
            mediaType: 'contact'
        };
        try {
            await setDoc(docRef, newMsg);
            await updateParentChat('جهة اتصال', 'contact');
            playSound('send');
        } catch (error) {
            console.error("Error sending contact:", error);
        }
        setStagedContactToSend(null);
        setShowContactModal(false);
    };

    const playJoinSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.volume = ((chatSettings as any).notificationVolume ?? 100) / 100;
        audio.play().catch(() => {});
    };

    useEffect(() => {
        if (!activeCall) return;
        
        const interval = setInterval(() => {
            setCallParticipants((prev: any[]) => {
                const now = Date.now();
                const filtered = prev.filter((p: any) => {
                    if (p.status === 'ringing') {
                        const startTime = p.inviteTime || now;
                        if (now - startTime > 30000) return false;
                    }
                    return true;
                });
                return filtered;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [activeCall]);

    const handleAddParticipant = (contact: any) => {
        if (callParticipants.length >= 14) { // 14 + original peer = 15
            showToast('لقد وصلت للحد الأقصى للمشاركين (15 شخص)');
            return;
        }
        if (callParticipants.find((p: any) => p.id === contact.id)) return;
        
        const newParticipant = { ...contact, status: 'ringing', inviteTime: Date.now(), isMuted: false };
        setCallParticipants((prev: any[]) => [...prev, newParticipant]);
    };

    const inviteParticipants = async () => {
        if (!activeCall?.id) return;
        
        const newParticipants = callParticipants.filter((p: any) => p.status === 'ringing');
        if (newParticipants.length === 0) {
            setShowAddParticipants(false);
            return;
        }

        try {
            const callRef = doc(firestoreDb, 'calls', activeCall.id);
            const callSnap = await getDoc(callRef);
            if (callSnap.exists()) {
                const data = callSnap.data();
                const currentParticipants = data.participants || [];
                const newIds = newParticipants.map((p: any) => p.id);
                const updatedParticipants = Array.from(new Set([...currentParticipants, ...newIds]));
                
                await updateDoc(callRef, {
                    participants: updatedParticipants
                });
            }
            
            // Simulate answering for prototype
            setTimeout(() => {
                setCallParticipants((prev: any[]) => prev.map((p: any) => 
                    newParticipants.some((np: any) => np.id === p.id) ? { ...p, status: 'connected', isMuted: Math.random() > 0.7 } : p
                ));
                playJoinSound();
            }, 2000);

            setShowAddParticipants(false);
        } catch (error) {
            console.error("Error inviting participants:", error);
        }
    };

    const startNewGroupCall = async (type: 'video' | 'voice') => {
        const selectedIds = callParticipants.filter((p: any) => p.status === 'ringing').map((p: any) => p.id);
        if (selectedIds.length === 0) return;
        
        setShowAddParticipants(false);
        (window as any).__USER_MANUAL_CALL_CLICK__ = true;

        if (chat.isGroup) {
            const baseParticipants = [...(chat.members || []), ...(chat.participants || [])];
            const allParticipantIds = Array.from(new Set([...baseParticipants, ...selectedIds]));
            await startGroupCall(chat, type, allParticipantIds).catch(err => {
                console.error('[ChatWindow] Error in startNewGroupCall:', err);
            });
        } else {
            const baseParticipants = [chat.user.id];
            const allParticipantIds = Array.from(new Set([...baseParticipants, ...selectedIds]));
            startCall(type, allParticipantIds, undefined, true);
        }
    };

    const handleRemoveParticipant = (id: string) => {
        setCallParticipants((prev: any[]) => prev.filter((p: any) => p.id !== id));
    };

    const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleSendMedia('document', '', { file: file, fileName: file.name, fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB` });
            setShowMoreMenu(false);
        }
    };

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max = 1200;
                    if (width > height && width > max) {
                        height *= max / width;
                        width = max;
                    } else if (height > max) {
                        width *= max / height;
                        height = max;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else resolve(file);
                    }, 'image/jpeg', 0.7);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('video/')) {
                const url = URL.createObjectURL(file);
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                    if (video.duration > 180) {
                        showToast("عذراً، الفيديو أطول من الحجم المسموح به. الحد الأقصى المسموح هو ثلاث دقائق.");
                        URL.revokeObjectURL(url);
                        if (e.target) e.target.value = '';
                        return;
                    }
                    setTrimmingVideo({ url, duration: video.duration, file, caption: input });
                    setTrimRange({ start: 0, end: Math.min(video.duration, 30) }); 
                    setInput('');
                };
                video.src = url;
            } else if (file.type.startsWith('image/')) {
                const compressed = await compressImage(file);
                handleSendMedia('image', URL.createObjectURL(compressed), { file: compressed }, input);
                setInput('');
            } else if (file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                setPreviewAudioFile({ url, file });
                setShowMediaMenu(false);
            } else {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    handleSendMedia('image', result, { file }, input);
                    setInput('');
                };
                reader.readAsDataURL(file);
            }
        }
        setShowMediaMenu(false);
        if (e.target) e.target.value = '';
    };

    const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleSendMedia('document', URL.createObjectURL(file), { 
                file, 
                fileName: file.name, 
                fileSize: file.size > 1024 * 1024 
                    ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
                    : (file.size / 1024).toFixed(1) + ' KB'
            }, input);
            setInput('');
        }
        setShowMoreMenu(false);
        if (e.target) e.target.value = '';
    };

    const handleSendForwardedMedia = async (msg: Message, caption: string) => {
        const type = msg.type;
        let url = '';
        if (type === 'image') url = msg.imageUrl || '';
        else if (type === 'video') url = msg.videoUrl || '';
        else if (type === 'audio') url = msg.audioUrl ? decryptText(msg.audioUrl) : '';
        else if (type === 'sticker') url = msg.stickerUrl || '';
        else if (type === 'document') url = msg.fileUrl || '';
        else if (type === 'gift') url = msg.giftUrl || '';
        
        const extra: any = { isForwarded: true };
        if (type === 'audio') extra.duration = msg.audioDuration;
        if (type === 'document') {
            extra.fileName = msg.fileName;
            extra.fileSize = msg.fileSize;
        }
        if (type === 'location') {
            await handleSendMedia('location', '', msg.location, caption, true);
            return;
        }

        await handleSendMedia(type, url, extra, caption, true);
    };

    // Physical Video Trimming for 30s or manual range
    const trimVideoFile = async (file: File, start: number, end: number): Promise<File> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            
            video.onloadedmetadata = () => {
                const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;
                if (!stream || (end - start) <= 0) {
                    URL.revokeObjectURL(video.src);
                    resolve(file); // Fallback
                    return;
                }
                
                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                const chunks: Blob[] = [];
                
                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/mp4' });
                    const trimmedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_trimmed.mp4", { type: 'video/mp4' });
                    URL.revokeObjectURL(video.src);
                    resolve(trimmedFile);
                };
                
                video.playbackRate = 10; // Speed up trimming process
                video.currentTime = start;
                video.onseeked = () => {
                    video.play();
                    recorder.start();
                    
                    const duration = (end - start) / 10;
                    setTimeout(() => {
                        video.pause();
                        recorder.stop();
                    }, duration * 1000 + 100);
                };
            };
            
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                resolve(file);
            };
        });
    };

    const handleMessageAction = (msg: Message, action: string) => {
        if (action === 'reply') {
            setReplyingTo(msg);
        } else if (action === 'forward_same') {
            if (msg.type === 'text') {
                setInput(decryptText(msg.text || ""));
                setForwardedMedia(null);
            } else {
                setForwardedMedia(msg);
                setInput(decryptText(msg.text || ""));
            }
        } else if (action === 'forward_others') {
            setSelectedIds(new Set([msg.id]));
            setShowForwardModal(true);
        }
    };

    const handleSendMedia = async (type: Message['type'], url: string, extra?: any, caption?: string, isForwarded: boolean = false) => {
        if (isBlocked) {
            showToast(iBlockedThem ? "الغاء الحظر لتواصل" : "دردشة مع هذا شخص معطل حاليا يمكنكم دردشة في حال اصلاح");
            return;
        }
        if (type === 'sticker' || type === 'image') {
            addToRecent('sticker', url);
            setShowEmojiPicker(false);
        }
        if (!chatId) return;
        let fileToUpload = extra?.file;
        const finalTrimRange = extra?.trimRange;
        if ((url.startsWith('blob:') || url.startsWith('data:')) && !fileToUpload) {
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                const mime = blob.type || (type === 'image' ? 'image/png' : type === 'document' ? 'application/pdf' : 'application/octet-stream');
                const ext = mime.split('/')[1] || (type === 'document' ? 'pdf' : 'png');
                fileToUpload = new File([blob], `file_${Date.now()}.${ext}`, { type: mime });
            } catch (e) {
                console.warn("Failed to convert URL to file object:", e);
            }
        }
        if (type === 'video' && fileToUpload && finalTrimRange) {
            try {
                fileToUpload = await trimVideoFile(fileToUpload, finalTrimRange.start, finalTrimRange.end);
            } catch (e) {
                console.error("Physical trimming failed:", e);
            }
        }

        const messagesRef = collection(firestoreDb, 'chats', firestoreChatId, 'messages');
        const docRef = doc(messagesRef);
        const messageId = docRef.id;

        // Quick conversion to Data URL for instant delivery of small files (documents, images, audio)
        let initialDataUrl = url;
        if (fileToUpload && fileToUpload.size < 6 * 1024 * 1024) {
            try {
                initialDataUrl = await new Promise<string>((resolve) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve((r.result as string) || url);
                    r.onerror = () => resolve(url);
                    r.readAsDataURL(fileToUpload);
                });
            } catch (e) {}
        }

        if (url.startsWith('blob:') || url.startsWith('data:')) {
            if (type === 'audio') setLocalAudioUrls(prev => ({ ...prev, [messageId]: initialDataUrl || url }));
            if (type === 'video') setLocalVideoUrls(prev => ({ ...prev, [messageId]: initialDataUrl || url }));
            if (type === 'image') setLocalImageUrls(prev => ({ ...prev, [messageId]: initialDataUrl || url }));
            if (type === 'document') setLocalDocUrls(prev => ({ ...prev, [messageId]: initialDataUrl || url }));
        }

        const messageText = caption ? (chatSettings.privacy.endToEndEncryption ? encryptText(caption) : caption) : (chatSettings.privacy.endToEndEncryption
            ? encryptText(type === 'location' ? 'الموقع الجغرافي' : type === 'image' ? 'صورة' : type === 'video' ? 'فيديو' : type === 'audio' ? 'رسالة صوتية' : type === 'sticker' ? 'ملصق' : type === 'gift' ? 'هدية' : type === 'document' ? 'مستند' : '')
            : (type === 'location' ? 'الموقع الجغرافي' : type === 'image' ? 'صورة' : type === 'video' ? 'فيديو' : type === 'audio' ? 'رسالة صوتية' : type === 'sticker' ? 'ملصق' : type === 'gift' ? 'هدية' : type === 'document' ? 'مستند' : ''));

        const processedInitialUrl = chatSettings.privacy.endToEndEncryption ? encryptText(initialDataUrl || url) : (initialDataUrl || url);

        const messageData: any = {
            id: messageId,
            senderId: myId,
            receiverId: chat.user.id,
            createdAt: serverTimestamp(),
            timestamp: new Date().toISOString(),
            isRead: false,
            type,
            text: messageText,
            mediaUrl: initialDataUrl || url || "",
            mediaType: type,
            isUploading: !!fileToUpload && !initialDataUrl.startsWith('data:'),
            uploadProgress: fileToUpload ? 15 : 100,
            isEncrypted: chatSettings.privacy.endToEndEncryption,
            disappearingDuration: (currentChat?.disappearingMessages?.enabled && typeof currentChat?.disappearingMessages?.duration === 'number' && currentChat.disappearingMessages.duration > 0) ? currentChat.disappearingMessages.duration : null,
            isForwarded: isForwarded || !!extra?.isForwarded,
            isAudioFile: !!extra?.isAudioFile,
            isMusic: !!extra?.isMusic,
            status: 'sent'
        };

        if (type === 'image') messageData.imageUrl = initialDataUrl || url;
        if (type === 'video') messageData.videoUrl = processedInitialUrl;
        if (type === 'audio') {
            messageData.audioUrl = processedInitialUrl;
            if (extra?.duration !== undefined) {
                messageData.audioDuration = extra.duration;
            }
        }
        if (type === 'location') messageData.location = extra;
        if (type === 'sticker') messageData.stickerUrl = initialDataUrl || url;
        if (type === 'gift') messageData.giftUrl = initialDataUrl || url;
        if (type === 'document') {
            messageData.fileUrl = processedInitialUrl;
            messageData.fileName = extra?.fileName || (fileToUpload ? fileToUpload.name : 'Document.pdf');
            messageData.fileSize = extra?.fileSize || (fileToUpload ? (fileToUpload.size > 1024 * 1024 ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB` : `${(fileToUpload.size / 1024).toFixed(1)} KB`) : 'PDF');
        }
        if (finalTrimRange) messageData.trimRange = finalTrimRange;

        // 1. Instantly save to local IndexedDB and update UI state for zero-latency rendering
        addPendingMessage({
            ...messageData,
            createdAt: new Date().toISOString()
        }).catch(() => {});

        // 2. Perform Firestore write and parent updates asynchronously in background
        (async () => {
            try {
                await setDoc(docRef, messageData);
                if (!isGroup && friendStatus !== 'friends') {
                    const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
                    await updateDoc(chatRef, {
                        [`messageCount_${myId}`]: increment(1)
                    }).catch(() => {});
                }
                await updateParentChat(messageData.text, type);
            } catch (error) {
                console.error("Background sync error sending media message to Firestore:", error);
            }
        })();

        // Resilient background upload if there is a file object
        if (fileToUpload) {
            const file = fileToUpload;
            (async () => {
                let finalUrl = '';
                try {
                    setUploadProgress(prev => ({ ...prev, [messageId]: 15 }));

                    // Tier 1: Firebase Storage
                    try {
                        const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : `file_${Date.now()}`;
                        const storagePath = `chats/${firestoreChatId}/${Date.now()}_${safeName}`;
                        const storageRef = ref(storage, storagePath);
                        const uploadTask = uploadBytesResumable(storageRef, file);
                        finalUrl = await new Promise<string>((resolve, reject) => {
                            uploadTask.on('state_changed',
                                (snapshot) => {
                                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                                    setUploadProgress(prev => ({ ...prev, [messageId]: progress }));
                                },
                                (error) => { reject(error); },
                                async () => {
                                    try {
                                        const dURL = await getDownloadURL(uploadTask.snapshot.ref);
                                        resolve(dURL);
                                    } catch (err) {
                                        reject(err);
                                    }
                                }
                            );
                        });
                    } catch (fbErr) {
                        console.warn("Firebase Storage media upload skipped/failed, trying server endpoint:", fbErr);
                    }

                    // Tier 2: Server endpoint /api/upload
                    if (!finalUrl) {
                        try {
                            const formData = new FormData();
                            formData.append('file', file, file.name || `file_${Date.now()}`);
                            finalUrl = await new Promise<string>((resolve) => {
                                const xhr = new XMLHttpRequest();
                                xhr.open('POST', '/api/upload', true);
                                xhr.upload.onprogress = (event) => {
                                    if (event.lengthComputable) {
                                        const percentComplete = (event.loaded / event.total) * 100;
                                        setUploadProgress(prev => ({ ...prev, [messageId]: percentComplete }));
                                    }
                                };
                                xhr.onload = () => {
                                    if (xhr.status >= 200 && xhr.status < 300) {
                                        try {
                                            const response = JSON.parse(xhr.responseText);
                                            if (response.url) {
                                                resolve(response.url);
                                                return;
                                            }
                                        } catch (e) {}
                                    }
                                    resolve('');
                                };
                                xhr.onerror = () => resolve('');
                                xhr.send(formData);
                            });
                        } catch (apiErr) {
                            console.warn("API upload failed:", apiErr);
                        }
                    }

                    // Tier 3: Fallback to Data URL
                    if (!finalUrl && initialDataUrl.startsWith('data:')) {
                        finalUrl = initialDataUrl;
                    }

                    if (finalUrl) {
                        const finalProcessedUrl = chatSettings.privacy.endToEndEncryption ? encryptText(finalUrl) : finalUrl;
                        const updates: any = {
                            mediaUrl: finalUrl,
                            isUploading: false,
                            uploadProgress: 100
                        };
                        if (type === 'image') updates.imageUrl = finalUrl;
                        if (type === 'video') updates.videoUrl = finalProcessedUrl;
                        if (type === 'audio') updates.audioUrl = finalProcessedUrl;
                        if (type === 'sticker') updates.stickerUrl = finalUrl;
                        if (type === 'gift') updates.giftUrl = finalUrl;
                        if (type === 'document') updates.fileUrl = finalProcessedUrl;

                        await updateDoc(docRef, updates).catch(() => {});
                    } else {
                        await updateDoc(docRef, { isUploading: false, uploadProgress: 100 }).catch(() => {});
                    }

                    setUploadProgress(prev => ({ ...prev, [messageId]: 100 }));
                    setTimeout(() => {
                        setUploadProgress(prev => {
                            const next = { ...prev };
                            delete next[messageId];
                            return next;
                        });
                    }, 2000);
                } catch (err) {
                    console.error("Media upload error:", err);
                    await updateDoc(docRef, { isUploading: false, uploadProgress: 100 }).catch(() => {});
                    setUploadProgress(prev => {
                        const next = { ...prev };
                        delete next[messageId];
                        return next;
                    });
                }
            })();
        }
    };

    // دالة لتسجيل الصوت من الميكروفون، تحويله إلى نص حقيقي، ثم ترجمته تلقائياً
    const startRealVoiceRecording = (onTranscriptionReady: (text: string) => void) => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast("متصفحك لا يدعم ميزة التعرف الصوتي المباشر.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = translatorSourceLang || 'ar-SA';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        showToast("جاري الاستماع للتسجيل الصوتي...");
        console.info("جاري الاستماع للتسجيل الصوتي...");
        
        recognition.start();
        
        recognition.onresult = async (event: any) => {
            const spokenText = event.results[0][0].transcript;
            console.log("النص المنطوق المحول:", spokenText);
            if (onTranscriptionReady) {
                onTranscriptionReady(spokenText);
            }
        };
        
        recognition.onerror = (event: any) => {
            console.error("حدث خطأ أثناء التعرف على الصوت:", event.error);
            showToast("حدث خطأ أثناء التعرف على الصوت.");
        };
        
        recognition.onend = () => {
            console.info("انتهى التسجيل الصوتي.");
        };
    };

    async function processMessageTranslation(messageText: string, translationMode: string) {
        if (translationMode === 'auto') {
            console.info("الترجمة التلقائية مفعلة: يتم ترجمة الرسالة في الخلفية للنص الجديد.");
            try {
                const translated = await translateTextFree(messageText, translatorLang, translatorSourceLang);
                return translated || messageText;
            } catch (err) {
                console.error("Translation error", err);
            }
        }
        return messageText;
    }

    const handleSendMessage = async (isAuto: boolean = false, autoText?: string) => {
        if (isBlocked) {
            showToast(iBlockedThem ? "الغاء الحظر لتواصل" : "دردشة مع هذا شخص معطل حاليا يمكنكم دردشة في حال اصلاح");
            return;
        }
        if (!canSendMessage) return;
        if (stagedContactToSend) {
            await submitContact(stagedContactToSend);
            if (!isAuto) {
                setInput('');
            }
            return;
        }
        if (previewAudioFile) {
            const caption = isAuto ? autoText : input;
            await handleSendMedia('audio', previewAudioFile.url, { file: previewAudioFile.file, isAudioFile: true }, caption || "");
            setPreviewAudioFile(null);
            setShowMediaMenu(false);
            setShowMoreMenu(false);
            if (!isAuto) {
                setInput('');
                setReplyingTo(null);
            }
            return;
        }
        if (forwardedMedia && forwardedMedia.type !== 'text') {
            const caption = isAuto ? autoText : input;
            await handleSendForwardedMedia(forwardedMedia, caption || "");
            setForwardedMedia(null);
            if (!isAuto) {
                setInput('');
                setReplyingTo(null);
            }
            return;
        }
        let originalInputText = isAuto ? (autoText || input) : input;
        let messageText = originalInputText;
        if (!messageText?.trim() || !chatId) return;

        // Rate Limiting Check (ProtectionEngine)
        if (!ProtectionEngine.checkRateLimit(myId, 3, 3000)) {
            showToast('يرجى الانتظار لحظات قبل إرسال رسالة أخرى.');
            return;
        }

        // Text Sanitization (ProtectionEngine)
        const { cleanText } = ProtectionEngine.sanitizeText(messageText);
        messageText = cleanText;
        if (!messageText?.trim()) return;
        
        // ربط الترجمة التلقائية قبل حفظه في شاشة المحادثة
        let translatedResult = '';
        let translationTypeVal: 'auto' | 'manual' | 'none' = 'none';
        if (isTranslatorActive && !isAuto && !translatedInput) {
            messageText = await processMessageTranslation(messageText, translatorMode);
            translatedResult = messageText;
            translationTypeVal = 'auto';
        } else if (translatedInput) {
            translatedResult = messageText;
            translationTypeVal = 'manual';
        }
        
        playSound('send');
        const messagesRef = collection(firestoreDb, 'chats', firestoreChatId, 'messages');
        const docRef = doc(messagesRef);
        const messageId = docRef.id;
        const messageData = {
            id: messageId,
            senderId: myId,
            receiverId: chat.user.id,
            createdAt: serverTimestamp(),
            timestamp: new Date().toISOString(),
            isRead: false,
            type: 'text',
            replyToId: replyingTo?.id || null,
            isEncrypted: chatSettings.privacy.endToEndEncryption,
            disappearingDuration: (currentChat?.disappearingMessages?.enabled && typeof currentChat?.disappearingMessages?.duration === 'number' && currentChat.disappearingMessages.duration > 0) ? currentChat.disappearingMessages.duration : null,
            text: chatSettings.privacy.endToEndEncryption ? encryptText(messageText) : messageText,
            originalText: originalInputText,
            translatedText: translatedResult,
            translationType: translationTypeVal,
            isTranslated: !!translatedResult,
            mediaUrl: "",
            mediaType: 'text'
        };
        // 1. Instantly save to local IndexedDB and update UI state for zero-latency rendering
        addPendingMessage({
            ...messageData,
            createdAt: new Date().toISOString()
        } as any).catch(() => {});

        // Clear UI states instantly
        setShowMediaMenu(false);
        setShowMoreMenu(false);
        setShowEmojiPicker(false);
        setInput('');
        setTranslatedInput('');
        setReplyingTo(null);

        // 2. Perform Firestore write and parent updates asynchronously in background
        (async () => {
            try {
                await setDoc(docRef, messageData);
                if (!isGroup && friendStatus !== 'friends') {
                    const chatRef = doc(firestoreDb, 'chats', firestoreChatId);
                    await updateDoc(chatRef, {
                        [`messageCount_${myId}`]: increment(1)
                    }).catch(() => {});
                }
                await updateParentChat(messageData.text, 'text');
            } catch (error) {
                console.error("Background sync error sending message to Firestore:", error);
            }
        })();
    };

    const confirmSendLocation = async () => {
        if (!pendingLocation || !chatId) return;
        const { lat, lng, live, address } = pendingLocation;
        const displayLabel = address || (live ? 'موقع مباشر' : 'موقع ثابت');
        const messagesRef = collection(firestoreDb, 'chats', firestoreChatId, 'messages');
        const docRef = doc(messagesRef);
        const messageId = docRef.id;
        const messageData = {
            id: messageId,
            senderId: myId,
            receiverId: chat.user.id,
            createdAt: serverTimestamp(),
            timestamp: new Date().toISOString(),
            isRead: false,
            type: 'location',
            location: { lat, lng, live, ...(address ? { address } : {}) },
            text: chatSettings.privacy.endToEndEncryption ? encryptText(displayLabel) : displayLabel,
            mediaUrl: "",
            mediaType: 'location',
            isEncrypted: chatSettings.privacy.endToEndEncryption,
            disappearingDuration: (currentChat?.disappearingMessages?.enabled && typeof currentChat?.disappearingMessages?.duration === 'number' && currentChat.disappearingMessages.duration > 0) ? currentChat.disappearingMessages.duration : null
        };
        try {
            await setDoc(docRef, messageData);
            await updateParentChat(messageData.text, 'location');
            setPendingLocation(null);
            setShowLocationModal(false);
            if (live) {
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                }
                liveLocationMsgIdRef.current = docRef.id;
                const watchId = navigator.geolocation.watchPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            await updateDoc(doc(firestoreDb, 'chats', firestoreChatId, 'messages', docRef.id), {
                                location: { lat: latitude, lng: longitude, live: true }
                            });
                        } catch (err) {
                            console.error("Error updating live location:", err);
                        }
                    },
                    (err) => console.error("Error watching position:", err),
                    { enableHighAccuracy: true }
                );
                watchIdRef.current = watchId;
                setLiveLocationWatchId(watchId);
            }
        } catch (error) {
            console.error("Error sending location:", error);
        }
    };

    const submitPoll = async () => {
        const validOptions = pollOptions.filter(o => o.trim() !== '');
        if (pollQuestion.trim() && validOptions.length >= 2 && chatId) {
            const messagesRef = collection(firestoreDb, 'chats', firestoreChatId, 'messages');
            const docRef = doc(messagesRef);
            const messageId = docRef.id;
            const messageData = {
                id: messageId,
                senderId: myId,
                receiverId: chat.user.id,
                createdAt: serverTimestamp(),
                timestamp: new Date().toISOString(),
                isRead: false,
                type: 'poll',
                poll: {
                    question: pollQuestion,
                    options: validOptions.map((text, i) => ({ id: i.toString(), text, votes: 0 }))
                },
                text: chatSettings.privacy.endToEndEncryption ? encryptText('استطلاع رأي') : 'استطلاع رأي',
                mediaUrl: "",
                mediaType: 'poll',
                isEncrypted: chatSettings.privacy.endToEndEncryption,
                disappearingDuration: (currentChat?.disappearingMessages?.enabled && typeof currentChat?.disappearingMessages?.duration === 'number' && currentChat.disappearingMessages.duration > 0) ? currentChat.disappearingMessages.duration : null
            };
            try {
                await setDoc(docRef, messageData);
                await updateParentChat(messageData.text, 'poll');
                setShowPollModal(false);
                setPollQuestion('');
                setPollOptions(['', '']);
            } catch (error) {
                console.error("Error sending poll:", error);
            }
        }
    };

    const handleToggleAudioSpeed = (id: string) => {
        setAudioSpeeds(prev => {
            const current = prev[id] || 1;
            const next = current === 1 ? 1.5 : current === 1.5 ? 2 : 1;
            if (currentAudioRef.current && currentAudioIdRef.current === id) {
                currentAudioRef.current.playbackRate = next;
            }
            return { ...prev, [id]: next };
        });
    };

    const handleToggleAudioLock = async (msg: Message) => {
        try {
            const docRef = doc(firestoreDb, 'chats', firestoreChatId, 'messages', msg.id);
            await updateDoc(docRef, { isLocked: !msg.isLocked });
            setOpenAudioMenuId(null);
        } catch (error) {
            console.error("Error toggling audio lock:", error);
        }
    };

    const handleSetAudioColor = async (msg: Message, color: 'green' | 'red' | 'white' | 'yellow' | null) => {
        try {
            const docRef = doc(firestoreDb, 'chats', firestoreChatId, 'messages', msg.id);
            await updateDoc(docRef, { audioColor: color === undefined ? null : color });
            setOpenAudioMenuId(null);
        } catch (error) {
            console.error("Error setting audio color:", error);
        }
    };

    const toggleAudioPlay = (id: string, url: string) => {
        // Stop any recording preview that might be playing to prevent overlap
        if (audioPlayerRef.current) {
            try {
                audioPlayerRef.current.pause();
                setIsPreviewPlaying(false);
            } catch (e) {}
        }

        const msg = messages.find(m => m.id === id);
        let rawAudioUrl = localAudioUrls[id] || url;
        if ((!rawAudioUrl || rawAudioUrl === '') && msg) {
            const candidate = msg.audioUrl || msg.mediaUrl || '';
            rawAudioUrl = candidate.startsWith('E2EE:') ? decryptText(candidate) : candidate;
        }
        
        const audioUrl = normalizeMediaUrl(rawAudioUrl);
        
        // التحقق من صحة الرابط قبل المحاولة
        if (!audioUrl || audioUrl === '') {
            console.warn("Audio URL is not ready yet.");
            return;
        }

        // Mark as played if not already (only if I am the receiver)
        const isMe = msg && (msg.senderId === myId || msg.senderId === 'me');
        if (msg && msg.type === 'audio' && (!msg.isPlayed || !msg.isRead) && !isMe) {
            setMessages(prev => prev.map(m => m.id === id ? { ...m, isPlayed: true, isRead: true } : m));
            updateDoc(doc(firestoreDb, 'chats', firestoreChatId, 'messages', id), { isPlayed: true, isRead: true }).catch(err => {
                console.error("Error updating isPlayed/isRead:", err);
            });
        }

        if (activeAudioId === id && isAudioPlaying) {
            if (currentAudioRef.current) {
                const audio = currentAudioRef.current;
                if (playPromiseRef.current) {
                    playPromiseRef.current.then(() => {
                        if (currentAudioRef.current === audio) {
                            audio.pause();
                        }
                    }).catch(() => {});
                } else {
                    audio.pause();
                }
            }
            setIsAudioPlaying(false);
        } else {
            // Strictly use and reuse a single Audio element to satisfy constraints
            if (!currentAudioRef.current) {
                currentAudioRef.current = new Audio();
            }
            
            const audio = currentAudioRef.current;
            
            // If it's the same audio and it was just paused, we don't need to reset src and listeners
            if (currentAudioIdRef.current !== id || !audio.src || audio.src === '') {
                // Cleanup previous event listeners to prevent memory leaks and duplicate logic
                audio.onended = null;
                audio.onerror = null;
                audio.ontimeupdate = null;
                
                audio.src = audioUrl;
                audio.preload = "auto";
                currentAudioIdRef.current = id;
                
                audio.onended = () => {
                    if (currentAudioIdRef.current === id) {
                        setIsAudioPlaying(false);
                        setAudioProgress(0);
                        setCurrentAudioTime('00:00');
                        currentAudioIdRef.current = null;
                    }
                };

                audio.onerror = (err) => {
                    console.warn("Audio element playback error for message:", id, err);
                    if (currentAudioIdRef.current === id) {
                        setIsAudioPlaying(false);
                        setAudioProgress(0);
                        currentAudioIdRef.current = null;
                    }
                };
                
                audio.ontimeupdate = () => {
                    // Only update if this is still the active audio to prevent background updates re-triggering logic
                    if (audio && currentAudioIdRef.current === id) {
                        let duration = audio.duration;
                        if (!duration || duration === Infinity) {
                            const msg = messages.find(m => m.id === id);
                            if (msg && msg.audioDuration) {
                                const parts = msg.audioDuration.split(':');
                                if (parts.length === 2) {
                                    duration = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                                }
                            }
                        }
                        
                        if (duration && duration !== Infinity && duration > 0) {
                            setAudioProgress((audio.currentTime / duration) * 100);
                            const remaining = Math.max(0, duration - audio.currentTime);
                            const mins = Math.floor(remaining / 60);
                            const secs = Math.floor(remaining % 60);
                            setCurrentAudioTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                        } else {
                            setAudioProgress(0);
                            const mins = Math.floor(audio.currentTime / 60);
                            const secs = Math.floor(audio.currentTime % 60);
                            setCurrentAudioTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                        }
                    }
                };
            }
            
            setActiveAudioId(id);
            setIsAudioPlaying(true);
            audio.playbackRate = audioSpeeds[id] || 1;
            
            const p = audio.play();
            playPromiseRef.current = p;
            if (p !== undefined) {
                p.then(() => {
                    if (playPromiseRef.current === p) {
                        playPromiseRef.current = null;
                    }
                }).catch(e => {
                    if (playPromiseRef.current === p) {
                        playPromiseRef.current = null;
                    }
                    if (e.name !== 'AbortError') {
                        console.warn("Audio playback issue:", e);
                    }
                    setIsAudioPlaying(false);
                });
            }
        }
    };

    const handleToggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
        if (newSet.size === 0) setIsSelectionMode(false);
    };

    const handleTouchStart = (msg: Message) => {
        longPressTimer.current = setTimeout(() => {
            if (!isSelectionMode) {
                setReactionPickerMsgId(msg.id);
            }
        }, 600);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const filteredMessages = messages.filter(msg => {
        if (!searchCategory || searchCategory === 'main') return true;
        if (searchCategory === 'documents') return msg.type === 'document';
        if (searchCategory === 'audio') return msg.type === 'audio';
        if (searchCategory === 'media') return msg.type === 'image' || msg.type === 'video';
        if (searchCategory === 'maps') return msg.type === 'location';
        if (searchCategory === 'links') {
            return msg.type === 'text' && !!msg.text && (msg.text.includes('http://') || msg.text.includes('https://') || msg.text.includes('www.'));
        }
        if (searchCategory === 'text') {
            return msg.type === 'text' && !!msg.text && !(msg.text.includes('http://') || msg.text.includes('https://') || msg.text.includes('www.'));
        }
        if (searchCategory === 'stickers') return msg.type === 'sticker';
        return true;
    }).map(msg => {
        const localAudio = localAudioUrls[msg.id];
        const localVideo = localVideoUrls[msg.id];
        const localImage = localImageUrls[msg.id];
        const localDoc = localDocUrls[msg.id];
        
        if (localAudio || localVideo || localImage || localDoc) {
            return {
                ...msg,
                audioUrl: localAudio || msg.audioUrl,
                videoUrl: localVideo || msg.videoUrl,
                imageUrl: localImage || msg.imageUrl,
                fileUrl: localDoc || msg.fileUrl
            };
        }
        return msg;
    });

    // Render Full Profile Overlay
    if (showProfileInfo) {
        return (
            <div className="absolute inset-0 z-[150] bg-[#0a0c10]">
                <ProfileView 
                    myId={myId} 
                    userId={profileUserId || chat.user.id} 
                    onBack={() => { setShowProfileInfo(false); setProfileUserId(null); }} 
                    lang="ar" 
                    isUiVisible={true} 
                    onToggleUi={() => {}}
                    onChat={(uid) => {
                        if (uid === chat.user.id) {
                            setShowProfileInfo(false);
                            setProfileUserId(null);
                        } else {
                            const newChat: Chat = {
                                id: uid,
                                user: { id: uid, name: uid, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`, status: 'online' },
                                lastMessage: '',
                                timestamp: new Date().toISOString(),
                                unreadCount: 0,
                                isOnline: true
                            };
                            onSelectChat(newChat);
                            setShowProfileInfo(false);
                            setProfileUserId(null);
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div 
            ref={chatWindowRef} 
            className={`flex flex-col h-full w-full bg-[#0a0c10] relative ${chatSettings.privacy.screenSecurity ? 'select-none' : ''} recording-interface`}
        >
            {/* Elegant Toast Notification */}
            <div className={`absolute top-4 left-0 right-0 mt-[env(safe-area-inset-top)] z-[200] flex justify-center pointer-events-none transition-all duration-400 ease-out ${toast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}>
                {toast && (
                    <div className="bg-[#1a1f2e]/95 backdrop-blur-2xl border border-white/10 shadow-2xl px-5 py-3 rounded-full flex items-center gap-3 max-w-[90%]">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'warning' ? 'bg-rose-400' : toast.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'} ${toast.type === 'success' ? 'animate-pulse' : ''}`}></div>
                        <span className="text-white text-xs sm:text-sm font-bold tracking-wide text-center leading-relaxed drop-shadow-sm">{toast.message}</span>
                    </div>
                )}
            </div>
            <style>{`
                .recording-interface {
                    -webkit-user-select: none;
                }
            `}</style>
            {/* CALL PREVIEW MODAL */}
            <AnimatePresence>
                {showCallPreview === 'video' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1001] bg-black flex flex-col"
                    >
                        {/* Camera Feed or Professional Calling UI */}
                        <div className="flex-1 relative overflow-hidden bg-slate-950">
                            {isCallingFromPreview ? (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950 overflow-hidden">
                                    {/* Ambient Glows */}
                                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
                                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
                                    
                                    <AvatarRippleLoader 
                                        avatarUrl={chat.user?.avatar}
                                        userName={chat.user?.name || 'مستلم'}
                                        type="video"
                                        status={activeCall?.status === 'ringing' ? 'يرن...' : 'يتصل...'}
                                        customMainText={`جاري الاتصال بـ ${chat.user?.name || 'المستلم'}...`}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Background Overlay */}
                                    {videoBackground && videoBackground !== 'none' && (
                                        <div className="absolute inset-0 z-0">
                                            <img 
                                                src={videoBackground === 'custom' ? customBackgroundUrl! : BACKGROUNDS.find(b => b.id === videoBackground)?.img} 
                                                className="w-full h-full object-cover"
                                                style={videoBackground !== 'custom' && BACKGROUNDS.find(b => b.id === videoBackground)?.css ? { filter: BACKGROUNDS.find(b => b.id === videoBackground)?.css } : {}}
                                                alt=""
                                            />
                                        </div>
                                    )}
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        webkit-playsinline="true"
                                        preload="metadata"
                                        muted={true}
                                        className={`w-full h-full object-cover scale-x-[-1] transition-all duration-500 relative z-10 ${videoBackground && videoBackground !== 'none' ? 'mix-blend-screen opacity-80' : ''}`}
                                        onError={(e) => console.error("Chat camera preview error:", e.currentTarget.error)}
                                        style={(activeCamFilter.id !== 'normal' || activeCinematicFilter.id !== 'none' || isBeautyOn) ? { filter: `${activeCamFilter.css} ${activeCinematicFilter.css} ${isBeautyOn ? `brightness(${0.8 + (beautyLighting / 100) * 0.6}) contrast(${0.8 + (beautySmoothness / 100) * 0.4}) saturate(${1 + (beautySmoothness / 100) * 0.5}) blur(${beautySmoothness > 50 ? (beautySmoothness - 50) / 50 * 1 : 0}px)` : ''}` } : {}}
                                    />
                                </>
                            )}

                            {/* Beauty Overlays */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                                {/* Lipstick Overlay */}
                                {lipstick && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.3 }}
                                        className="absolute inset-0"
                                        style={{ 
                                            background: `radial-gradient(circle at 50% 60%, ${lipstick} 0%, transparent 15%)`,
                                            mixBlendMode: 'multiply'
                                        }}
                                    />
                                )}
                                
                                {/* Hair Color Overlay */}
                                {hairColor && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.2 }}
                                        className="absolute inset-0"
                                        style={{ 
                                            backgroundColor: hairColor,
                                            mixBlendMode: 'hue'
                                        }}
                                    />
                                )}

                                {/* Eyelashes/Eyeliner Effect */}
                                {(eyelashes || eyeliner) && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.5 }}
                                        className="absolute inset-0"
                                        style={{ 
                                            background: `radial-gradient(circle at 40% 45%, black 0%, transparent 5.5%), radial-gradient(circle at 60% 45%, black 0%, transparent 5.5%)`,
                                            filter: eyeliner === 'smokey' ? 'blur(4px)' : 'blur(1.5px)'
                                        }}
                                    />
                                )}

                                {/* Accessories */}
                                {accessory && (
                                    <motion.div 
                                        initial={{ scale: 0, y: -50 }}
                                        animate={{ scale: 1, y: 0 }}
                                        className="absolute top-[15%] left-1/2 -translate-x-1/2 text-7xl drop-shadow-2xl z-20"
                                    >
                                        {ACCESSORIES.find(a => a.id === accessory)?.icon}
                                    </motion.div>
                                )}
                            </div>
                            
                            {/* Overlay Controls */}
                            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                                <button 
                                    onClick={isCallingFromPreview ? handleCancelCallFromPreview : () => { setShowCallPreview(null); stopCamera(true); }}
                                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black/60 transition-colors"
                                    title={isCallingFromPreview ? "إلغاء المكالمة" : "إغلاق"}
                                >
                                    <X size={24} />
                                </button>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setFacingMode((prev: any) => prev === 'user' ? 'environment' : 'user')}
                                        className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black/60 transition-colors"
                                        title="تبديل الكاميرا"
                                    >
                                        <RefreshCcw size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Active Calling Status Banner - Only for camera mode */}
                            {isCallingFromPreview && false && (
                                <div className="absolute top-20 left-6 right-6 flex flex-col items-center z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/80 backdrop-blur-xl border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                                        <span className="relative flex h-3.5 w-3.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-white text-sm sm:text-base font-black tracking-wide">
                                            {activeCall?.status === 'ringing' 
                                                ? `يرن عند ${chat.user?.name || 'المستلم'}...` 
                                                : `جاري الاتصال بـ ${chat.user?.name || 'المستلم'}...`}
                                        </span>
                                    </div>
                                    <span className="text-xs text-white/80 font-medium mt-2 drop-shadow-md">
                                        الكاميرا تعمل مباشرة ومستمرة حتى يتم الرد
                                    </span>
                                </div>
                            )}

                            {/* Beauty Studio Tabs - only shown prior to placing call */}
                            {!isCallingFromPreview && (
                                <div className="absolute bottom-20 left-0 right-0 z-10">
                                    <div className="flex justify-center gap-4 mb-2">
                                        {[
                                            { id: 'filters', name: 'فلاتر' },
                                            { id: 'background', name: 'خلفية' },
                                            { id: 'beauty', name: 'تجميل' },
                                            { id: 'cinematic', name: 'سينما' }
                                        ].map(tab => (
                                            <button 
                                                key={tab.id}
                                                onClick={() => setActiveBeautyTab(tab.id as any)}
                                                className={`text-[10px] font-bold transition-all px-3 py-1 rounded-full ${activeBeautyTab === tab.id ? 'text-emerald-400 bg-emerald-500/20' : 'text-white/40'}`}
                                            >
                                                {tab.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content with Exact Geometric Center Alignment */}
                                    <div className="relative min-h-[96px] flex flex-col items-center justify-center">
                                        {activeBeautyTab !== 'beauty' ? (
                                            <>
                                                {/* The 64px Fixed Height Aperture Row */}
                                                <div className="relative w-full h-16 flex items-center justify-center">
                                                    {/* Stationary Center Activation Circle: 64px x 64px, exactly aligned and matching the active filter size */}
                                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-emerald-400 rounded-full pointer-events-none z-20 shadow-[0_0_20px_rgba(52,211,153,0.45)] ring-2 ring-emerald-500/20" />
                                                    
                                                    {/* Scrollable Items: Same 64px height, px-[calc(50%-32px)] ensures exact center snap */}
                                                    <div 
                                                        ref={filterScrollRef}
                                                        onScroll={handleFilterScroll}
                                                        className="flex gap-3 overflow-x-auto no-scrollbar items-center px-[calc(50%-32px)] snap-x snap-mandatory w-full h-full"
                                                    >
                                                        {activeBeautyTab === 'filters' && (
                                                            <>
                                                                {CAM_FILTERS.map(filter => {
                                                                    const isSelected = activeCamFilter.id === filter.id;
                                                                    return (
                                                                        <button 
                                                                            key={filter.id}
                                                                            data-id={filter.id}
                                                                            onClick={() => {
                                                                                setActiveCamFilter(filter);
                                                                                scrollToItem(filter.id);
                                                                            }}
                                                                            className="w-16 h-16 shrink-0 snap-center flex items-center justify-center focus:outline-none"
                                                                        >
                                                                            <div className={`rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
                                                                                isSelected 
                                                                                    ? 'w-16 h-16 shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
                                                                                    : 'w-10 h-10 border border-white/20 opacity-40 hover:opacity-75'
                                                                            }`}>
                                                                                <img 
                                                                                    src={filter.img} 
                                                                                    className={`w-full h-full object-cover rounded-full pointer-events-none transition-transform duration-300 ${isSelected ? 'scale-105' : 'scale-100'}`} 
                                                                                    style={{ filter: filter.css }} 
                                                                                    alt={filter.name} 
                                                                                    referrerPolicy="no-referrer"
                                                                                />
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </>
                                                        )}

                                                        {activeBeautyTab === 'cinematic' && (
                                                            <>
                                                                {CINEMATIC_FILTERS.map(filter => {
                                                                    const isSelected = activeCinematicFilter.id === filter.id;
                                                                    return (
                                                                        <button 
                                                                            key={filter.id}
                                                                            data-id={filter.id}
                                                                            onClick={() => {
                                                                                setActiveCinematicFilter(filter);
                                                                                scrollToItem(filter.id);
                                                                            }}
                                                                            className="w-16 h-16 shrink-0 snap-center flex items-center justify-center focus:outline-none"
                                                                        >
                                                                            <div className={`rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
                                                                                isSelected 
                                                                                    ? 'w-16 h-16 shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
                                                                                    : 'w-10 h-10 border border-white/20 opacity-40 hover:opacity-75'
                                                                            }`}>
                                                                                <img 
                                                                                    src={filter.img} 
                                                                                    className={`w-full h-full object-cover rounded-full pointer-events-none transition-transform duration-300 ${isSelected ? 'scale-105' : 'scale-100'}`} 
                                                                                    style={{ filter: filter.css }} 
                                                                                    alt={filter.name} 
                                                                                    referrerPolicy="no-referrer"
                                                                                />
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </>
                                                        )}

                                                        {activeBeautyTab === 'background' && (
                                                            <>
                                                                <button 
                                                                    data-id="add-custom"
                                                                    onClick={() => bgInputRef.current?.click()}
                                                                    className="w-16 h-16 shrink-0 snap-center flex items-center justify-center opacity-50 hover:opacity-100 transition-all focus:outline-none"
                                                                >
                                                                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center bg-white/5">
                                                                        <Plus size={18} className="text-white/80" />
                                                                    </div>
                                                                </button>
                                                                {customBackgroundUrl && (
                                                                    <button 
                                                                        data-id="custom"
                                                                        onClick={() => {
                                                                            setVideoBackground('custom');
                                                                            scrollToItem('custom');
                                                                        }}
                                                                        className="w-16 h-16 shrink-0 snap-center flex items-center justify-center focus:outline-none"
                                                                    >
                                                                        <div className={`rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
                                                                            videoBackground === 'custom' 
                                                                                ? 'w-16 h-16 shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
                                                                                : 'w-10 h-10 border border-white/20 opacity-40 hover:opacity-75'
                                                                        }`}>
                                                                            <img 
                                                                                src={customBackgroundUrl} 
                                                                                className={`w-full h-full object-cover rounded-full pointer-events-none transition-transform duration-300 ${videoBackground === 'custom' ? 'scale-105' : 'scale-100'}`} 
                                                                                alt="خلفية مخصصة" 
                                                                            />
                                                                        </div>
                                                                    </button>
                                                                )}
                                                                {BACKGROUNDS.map(bg => {
                                                                    const isSelected = videoBackground === bg.id || (bg.id === 'none' && !videoBackground);
                                                                    return (
                                                                        <button 
                                                                            key={bg.id}
                                                                            data-id={bg.id}
                                                                            onClick={() => {
                                                                                setVideoBackground(bg.id === 'none' ? null : bg.id);
                                                                                scrollToItem(bg.id);
                                                                            }}
                                                                            className="w-16 h-16 shrink-0 snap-center flex items-center justify-center focus:outline-none"
                                                                        >
                                                                            <div className={`rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
                                                                                isSelected 
                                                                                    ? 'w-16 h-16 shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
                                                                                    : 'w-10 h-10 border border-white/20 opacity-40 hover:opacity-75'
                                                                            }`}>
                                                                                <img 
                                                                                    src={bg.img} 
                                                                                    className={`w-full h-full object-cover rounded-full pointer-events-none transition-transform duration-300 ${isSelected ? 'scale-105' : 'scale-100'}`} 
                                                                                    style={bg.css ? { filter: bg.css } : {}} 
                                                                                    alt={bg.name} 
                                                                                    referrerPolicy="no-referrer"
                                                                                />
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Active Filter Name Badge - Centered directly beneath the ring */}
                                                <div className="h-6 flex items-center justify-center mt-1">
                                                    <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10 shadow-sm animate-in fade-in duration-150">
                                                        {activeBeautyTab === 'filters'
                                                            ? (activeCamFilter?.name || 'طبيعي')
                                                            : activeBeautyTab === 'cinematic'
                                                            ? (activeCinematicFilter?.name || 'عادي')
                                                            : activeBeautyTab === 'background'
                                                            ? (videoBackground === 'custom' ? 'خلفية مخصصة' : (BACKGROUNDS.find(b => b.id === videoBackground)?.name || 'بدون خلفية'))
                                                            : ''}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-4 w-full px-4 h-24 justify-center">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-bold text-white w-20">نعومة البشرة</span>
                                                    <input 
                                                        type="range" 
                                                        min="0" max="100" 
                                                        value={beautySmoothness}
                                                        onChange={(e) => {
                                                            setBeautySmoothness(Number(e.target.value));
                                                            setIsBeautyOn(true);
                                                        }}
                                                        className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-bold text-white w-20">الإضاءة</span>
                                                    <input 
                                                        type="range" 
                                                        min="0" max="100" 
                                                        value={beautyLighting}
                                                        onChange={(e) => {
                                                            setBeautyLighting(Number(e.target.value));
                                                            setIsBeautyOn(true);
                                                        }}
                                                        className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Bottom Actions */}
                            <div className="absolute bottom-2 left-0 right-0 px-8 z-30">
                                {isCallingFromPreview ? (
                                    <div className="flex flex-col items-center gap-2">
                                        {/* Professional Call Controls */}
                                        <div className="flex items-center justify-center gap-4 sm:gap-8">
                                            {/* Mic Toggle */}
                                            <button 
                                                onClick={() => {
                                                    const newState = !isPreviewMuted;
                                                    setIsPreviewMuted(newState);
                                                    if (activeStreamRef.current) {
                                                        const audioTrack = activeStreamRef.current.getAudioTracks()[0];
                                                        if (audioTrack) {
                                                            audioTrack.enabled = !newState;
                                                            setToast({ message: !newState ? "الميكروفون يعمل" : "الميكروفون صامت", type: 'info', id: Date.now() });
                                                            setTimeout(() => setToast(null), 2000);
                                                        }
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-1 group"
                                            >
                                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 active:scale-90 shadow-2xl relative overflow-hidden ${isPreviewMuted ? 'bg-rose-500/20 border-rose-500/50 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-white/5 border-white/20 text-white hover:bg-white/10 backdrop-blur-3xl'}`}>
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    {isPreviewMuted ? <MicOff size={20} /> : <Mic size={20} />}
                                                </div>
                                                <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${isPreviewMuted ? 'text-rose-500' : 'text-white/40'}`}>صامت</span>
                                            </button>

                                            {/* End Call Circular */}
                                            <button 
                                                onClick={handleCancelCallFromPreview}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-rose-600 via-rose-500 to-orange-500 border-[3px] border-white/20 flex items-center justify-center text-white hover:scale-105 shadow-[0_10px_30px_rgba(244,63,94,0.4)] transition-all duration-500 cursor-pointer active:scale-95 group-hover:-translate-y-1 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                    <div className="absolute inset-0 rounded-full animate-ping-slow bg-white/10" />
                                                    <PhoneOff size={24} className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] z-10" />
                                                </div>
                                                <span className="text-rose-500 font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">إلغاء</span>
                                            </button>

                                            {/* Camera Switch */}
                                            <button 
                                                onClick={() => setFacingMode((prev: any) => prev === 'user' ? 'environment' : 'user')}
                                                className="flex flex-col items-center gap-1 group"
                                            >
                                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center text-white hover:bg-white/10 backdrop-blur-3xl transition-all duration-500 active:scale-90 shadow-2xl relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <RefreshCcw size={20} />
                                                </div>
                                                <span className="text-white/40 text-[7px] font-black uppercase tracking-[0.2em]">تبديل</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-4">
                                        <button 
                                            onClick={() => { setShowCallPreview(null); stopCamera(true); }}
                                            className="flex-1 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-[2rem] text-xs font-bold border border-white/10 active:scale-95 transition-all hover:bg-white/15"
                                        >
                                            إلغاء
                                        </button>
                                        <button 
                                            onClick={handleStartVideoCallFromPreview}
                                            className="flex-[2] py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] text-xs font-black shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                        >
                                            <Video size={16} fill="currentColor" />
                                            <span>بدء المكالمة</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CALL OVERLAY - REMOVED (Unified Room Flow handled in App.tsx) */}
            {/* ADD PARTICIPANTS MODAL */}
            <AnimatePresence>
                {showAddParticipants && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
                        onClick={() => setShowAddParticipants(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-[#1a1c22]/95 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/15 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-white">إضافة مشاركين</h3>
                                    <p className="text-xs text-white/40 mt-1">يمكنك إضافة حتى 15 شخصاً للمكالمة</p>
                                </div>
                                <button onClick={() => { setShowAddParticipants(false); setParticipantSearch(''); }} className="p-2 bg-white/5 rounded-full text-white/50">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="relative mb-6">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input 
                                    type="text"
                                    placeholder="بحث بالاسم أو رقم الهاتف..."
                                    value={participantSearch}
                                    onChange={(e) => setParticipantSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto space-y-3 no-scrollbar pr-1">
                                {allUsers
                                    .filter(u => u.id !== 'hisee-ai-bot' && u.id !== chat?.user?.id && u.id !== myId && (!chat?.isGroup || !chat?.members?.includes(u.id)))
                                    .filter(u => {
                                        const searchLower = participantSearch.toLowerCase();
                                        if (!searchLower) return true;
                                        
                                        const name = extractStringValue(u.name, '').toLowerCase();
                                        const displayName = extractStringValue((u as any).displayName, '').toLowerCase();
                                        const nickname = extractStringValue((u as any).nickname, '').toLowerCase();
                                        const username = extractStringValue((u as any).username, '').toLowerCase();
                                        const phone = extractStringValue((u as any).phone, `05${u.id.padStart(8, '0').replace(/[^0-9]/g, '').slice(0, 8)}`).toLowerCase();
                                        
                                        return name.includes(searchLower) || 
                                               displayName.includes(searchLower) || 
                                               nickname.includes(searchLower) || 
                                               username.includes(searchLower) || 
                                               phone.includes(searchLower);
                                    })
                                    .map(user => {
                                        const isAdded = callParticipants.some((p: any) => p.id === user.id);
                                        const userName = extractStringValue(user.name, (user as any).displayName || 'مستخدم');
                                        const rawPhone = (user as any).phone;
                                        const displayPhone = extractStringValue(rawPhone, `05${user.id.padStart(8, '0').replace(/[^0-9]/g, '').slice(0, 8)}`);
                                        return (
                                            <div 
                                                key={user.id}
                                                className={`flex items-center justify-between p-3 rounded-2xl transition-all ${isAdded ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-10 h-10 rounded-full object-cover" alt="" />
                                                        {isAdded && (
                                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-[#1a1c22]">
                                                                <Check size={12} strokeWidth={4} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{userName}</p>
                                                        <p className="text-[10px] text-white/40 font-mono">{displayPhone}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => isAdded ? handleRemoveParticipant(user.id) : handleAddParticipant({ id: user.id, name: userName, avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}` })}
                                                    className={`p-2 rounded-xl transition-all active:scale-90 ${isAdded ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}
                                                >
                                                    {isAdded ? <MinusCircle size={20} /> : <Plus size={20} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                {allUsers.length === 0 && (
                                    <div className="py-12 text-center">
                                        <Users size={48} className="mx-auto text-white/10 mb-4" />
                                        <p className="text-sm text-white/40">لا يوجد جهات اتصال مسجلة حالياً</p>
                                    </div>
                                )}
                            </div>

                            {!activeCall ? (
                                <div className="flex gap-2 mt-6">
                                    <button 
                                        onClick={() => startNewGroupCall('video')}
                                        disabled={callParticipants.filter((p: any) => p.status === 'ringing').length === 0}
                                        className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                            callParticipants.filter((p: any) => p.status === 'ringing').length > 0 
                                            ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 active:scale-95' 
                                            : 'bg-white/10 text-white/20 cursor-not-allowed'
                                        }`}
                                    >
                                        <Video size={18} /> فيديو ({callParticipants.length + 1}/15)
                                    </button>
                                    <button 
                                        onClick={() => startNewGroupCall('voice')}
                                        disabled={callParticipants.filter((p: any) => p.status === 'ringing').length === 0}
                                        className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                            callParticipants.filter((p: any) => p.status === 'ringing').length > 0 
                                            ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20 active:scale-95' 
                                            : 'bg-white/10 text-white/20 cursor-not-allowed'
                                        }`}
                                    >
                                        <Phone size={18} /> صوت ({callParticipants.length + 1}/15)
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={inviteParticipants}
                                    disabled={callParticipants.filter((p: any) => p.status === 'ringing').length === 0}
                                    className={`w-full mt-6 py-4 rounded-2xl font-black text-sm transition-all ${
                                        callParticipants.filter((p: any) => p.status === 'ringing').length > 0 
                                        ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 active:scale-95' 
                                        : 'bg-white/10 text-white/20 cursor-not-allowed'
                                    }`}
                                >
                                    تم ({callParticipants.length + 1}/15)
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CAMERA OVERLAY */}
            {showCamera && (
                <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                        <button onClick={() => { setShowCamera(false); setCapturedImage(null); }} className="text-red-500 drop-shadow-md hover:scale-110 transition-transform">
                            <X size={32} />
                        </button>
                        <button onClick={() => setIsBeautyOn(!isBeautyOn)} className={`${isBeautyOn ? 'text-yellow-400' : 'text-white'} drop-shadow-md transition-colors hover:scale-110`}>
                            <Sparkles size={28} />
                        </button>
                        <button onClick={() => setFacingMode((prev: string) => prev === 'user' ? 'environment' : 'user')} className="text-white drop-shadow-md hover:scale-110 transition-transform">
                            <RefreshCcw size={28} />
                        </button>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
                        {capturedImage ? (
                            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                        ) : (
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                webkit-playsinline="true"
                                preload="metadata"
                                muted={true}
                                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                                onError={(e) => console.error("Chat camera capture error:", e.currentTarget.error)}
                                style={{ 
                                    filter: `${activeCamFilter.css} ${isBeautyOn ? 'brightness(1.1) contrast(0.95)' : ''}`
                                }}
                            />
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="absolute bottom-0 inset-x-0 pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent z-20 flex flex-col items-center gap-6">
                        {!capturedImage && (
                            <div className="flex gap-4 overflow-x-auto w-full px-6 no-scrollbar">
                                {CAM_FILTERS.map(f => (
                                    <button 
                                        key={f.id} 
                                        onClick={() => setActiveCamFilter(f)}
                                        className={`shrink-0 flex flex-col items-center gap-1 ${activeCamFilter.id === f.id ? 'opacity-100' : 'opacity-60'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-full border-2 ${activeCamFilter.id === f.id ? 'border-yellow-400' : 'border-white'} overflow-hidden bg-gray-800`}>
                                            <div className="w-full h-full bg-gray-600" style={{ filter: f.css }}></div>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase ${activeCamFilter.id === f.id ? 'text-yellow-400' : 'text-white'}`}>{f.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {capturedImage ? (
                            <div className="flex items-center gap-12">
                                <button onClick={() => setCapturedImage(null)} className="p-4 rounded-full bg-white/10 text-red-500 border border-red-500/50 hover:bg-white/20 transition-all">
                                    <RefreshCcw size={24} />
                                </button>
                                <button onClick={() => handleSendMedia('image', capturedImage)} className="p-6 rounded-full bg-green-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition-transform border-4 border-white/20">
                                    <Send size={28} className={translations.ar.dir === 'rtl' ? 'rotate-180' : ''} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={handleCapture} 
                                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative active:scale-95 transition-transform shadow-2xl"
                            >
                                <div className="w-16 h-16 bg-white rounded-full"></div>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Active Call Indicator (When hidden) */}
            <AnimatePresence>
                {activeCall && isCallHidden && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 32, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onClick={() => {
                            setIsCallHidden(false);
                            setIsCallMinimized(false);
                        }}
                        className="absolute top-0 inset-x-0 z-[60] bg-emerald-500 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-400 transition-colors"
                    >
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">مكالمة نشطة - انقر للعودة</span>
                        <Video size={14} className="text-white" />
                    </motion.div>
                )}
            </AnimatePresence>

            
            {/* Dynamic Join Banner for Active Group Call */}
            <AnimatePresence>
                {activeGroupCall && !isSelectionMode && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-16 inset-x-0 z-40 bg-gradient-to-r from-emerald-600/95 via-teal-600/95 to-emerald-700/95 backdrop-blur-md border-b border-emerald-400/40 px-4 py-3 flex items-center justify-between shadow-xl"
                    >
                        <div className="flex items-center gap-3 text-white">
                            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                {activeGroupCall.callType === 'video' ? <Video size={20} className="text-white" /> : <Phone size={20} className="text-white" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                    <span>مكالمة {activeGroupCall.callType === 'video' ? 'فيديو' : 'صوتية'} جماعية نشطة</span>
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                                </h4>
                                <p className="text-xs text-emerald-100 font-medium tracking-wide">
                                    {activeGroupCall.activeParticipantsCount > 1 
                                        ? `${activeGroupCall.activeParticipantsCount} أعضاء متصلون الآن`
                                        : `المضيف: ${activeGroupCall.hostName || 'مستخدم'}`
                                    } • انقر للانضمام الآن
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleDynamicJoin}
                            className="px-6 py-2 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-black rounded-full shadow-lg transition-transform text-sm cursor-pointer border border-white/50"
                        >
                            انضمام
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Header */}
            <div className="absolute top-0 inset-x-0 h-16 bg-black/30 backdrop-blur-md border-b border-white/5 z-50 flex items-center justify-between px-2 sm:px-4 max-w-[100vw] overflow-visible box-border">
                {isSelectionMode ? (
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="p-2 text-white hover:bg-white/10 rounded-full">
                                <X size={18} />
                            </button>
                            <span className="text-white font-bold text-sm">{selectedIds.size} محدد</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="p-2 text-white hover:bg-white/10 rounded-full" title="إعادة إرسال" onClick={handleResend}><ArrowRight size={18} /></button>
                            <button className="p-2 text-white hover:bg-white/10 rounded-full" title="تمييز بنجمة" onClick={handleStarMessages}><Star size={18} /></button>
                            <button className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-full" title="تثبيت في المثبت الموحد 📌" onClick={handlePinSelectedMessages}><Pin size={18} className="fill-amber-400" /></button>
                            <button className="p-2 text-white hover:bg-white/10 rounded-full" title="مشاركة" onClick={handleShare}><Share2 size={18} /></button>
                            <button className="p-2 text-white hover:bg-white/10 rounded-full" title="توجيه" onClick={handleForward}><ArrowLeft size={18} /></button>
                            <button className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full" title="حذف" onClick={() => setShowDeleteModal(true)}><Trash2 size={18} /></button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 overflow-hidden">
                            {originChat && (
                                <button 
                                    onClick={() => onSelectChat(originChat, null)}
                                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
                                >
                                    <Users size={12} />
                                </button>
                            )}

                            {/* User Info (Clickable for Profile) */}
                            <div 
                                onClick={() => {
                                    setProfileUserId(chat.user.id);
                                    setShowProfileInfo(true);
                                }}
                                className="flex items-center gap-2 p-1 rounded-xl transition-colors group cursor-pointer hover:bg-white/5 overflow-hidden"
                            >
                                <div className="relative flex-shrink-0">
                                    {(chat.id === 'hisee-ai-bot' || chat.user?.id === 'hisee-ai-bot') ? (
                                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center p-1 shadow-md">
                                            <ModernHSLogo size={24} />
                                        </div>
                                    ) : (
                                        <img 
                                            src={normalizeMediaUrl(chat.isGroup ? (chat.image || chat.user.avatar) : displayUser.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.isGroup ? chat.id : chat.user.id}`} 
                                            onError={(e) => { 
                                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.isGroup ? chat.id : chat.user.id}`; 
                                            }}
                                            className="w-8 h-8 rounded-full bg-slate-800 object-cover" 
                                            alt="" 
                                        />
                                    )}
                                    {!chat.isGroup && displayUser.canShowPresence && isUserOnline(displayUser?.lastSeen || displayUser?.lastActive, displayUser?.isOnline) && (
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00ff66] rounded-full border border-white/40 ring-1 ring-black shadow-[0_0_8px_#00ff66]"></div>
                                    )}
                                    {(isFavorite || localStorage.getItem(`hisee_fav_user_${(displayUser as any)?.id}`) === 'true') && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-black shadow z-10" title="شخص مفضل ⭐">
                                            <Star size={8} className="fill-white text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate flex items-center gap-1">
                                        <span>{displayUser.name}</span>
                                        {(isFavorite || localStorage.getItem(`hisee_fav_user_${(displayUser as any)?.id}`) === 'true') && (
                                            <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                                        )}
                                    </h3>
                                    <div className="flex flex-col">
                                        {chat.isGroup ? (
                                            <span className="text-[9px] text-slate-400 font-medium truncate block">
                                                {(chat.members?.length || chat.participants?.length || 0)} {getTranslation(lang, 'members', 'أعضاء')}
                                            </span>
                                        ) : (
                                            displayUser.canShowPresence && (
                                                <span className={`text-[9px] font-medium truncate block ${isUserOnline(displayUser?.lastSeen || displayUser?.lastActive, displayUser?.isOnline) ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {isUserOnline(displayUser?.lastSeen || displayUser?.lastActive, displayUser?.isOnline) ? getTranslation(lang, 'onlineNow', 'متصل الآن') : formatLastSeen((displayUser as any).lastSeen || displayUser.lastActive, displayUser)}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative flex items-center gap-1 flex-shrink-0">
                            {chat.isGroup && (
                                <button 
                                    onClick={() => setShowMembersModal(!showMembersModal)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center"
                                    title="عرض الأعضاء"
                                >
                                    <Users size={18} />
                                </button>
                            )}

                             <button 
                                onClick={() => {
                                    if (chat.isGroup) {
                                        if (activeGroupCallInChat) {
                                            (window as any).__USER_MANUAL_CALL_CLICK__ = true;
                                            joinGroupCall(chat.id, activeGroupCallInChat.callType || 'voice', chat.id);
                                        } else {
                                            openGroupCallModeMenu('voice');
                                        }
                                    } else if (!isBlocked && friendStatus === 'friends') {
                                        (window as any).__USER_MANUAL_CALL_CLICK__ = true;
                                        startCall('voice', undefined, undefined, true, chat);
                                    }
                                }}
                                disabled={isBlocked || (friendStatus !== 'friends' && !chat.isGroup)}
                                className={`relative p-2 rounded-lg bg-white/5 transition-all ${
                                    (!isBlocked && (friendStatus === 'friends' || chat.isGroup)) 
                                    ? 'hover:bg-white/10 text-green-400 cursor-pointer border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)] active:scale-95' 
                                    : 'opacity-20 grayscale cursor-not-allowed text-slate-500'
                                }`}
                                 title={isBlocked ? getTranslation(lang, 'chatDisabled', 'المحادثة معطلة بسبب الحظر') : (chat.isGroup ? (activeGroupCallInChat ? getTranslation(lang, 'joinActiveGroupCall', 'انضمام للمكالمة الجماعية الجارية') : getTranslation(lang, 'startGroupVoiceCall', 'بدء مكالمة صوتية جماعية')) : (friendStatus === 'friends' ? getTranslation(lang, 'voiceCall', 'اتصال صوتي') : getTranslation(lang, 'mustBeFriendsToCall', 'يجب أن تكونوا أصدقاء للاتصال')))}
                             >
                                <Phone size={18} strokeWidth={2} />
                                {chat.isGroup && activeGroupCallInChat && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
                                )}
                             </button>

                            {!chat.isGroup && (
                                <button 
                                    onClick={() => {
                                        if (!isBlocked && friendStatus === 'friends') {
                                            setCallParticipants([]);
                                            setShowAddParticipants(true);
                                        }
                                    }}
                                    disabled={isBlocked || friendStatus !== 'friends'}
                                    className={`p-2 rounded-lg bg-white/5 transition-all flex items-center ${
                                        (!isBlocked && friendStatus === 'friends')
                                            ? 'hover:bg-white/10 text-white border border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.25)] cursor-pointer'
                                            : 'opacity-20 grayscale cursor-not-allowed text-slate-500 border border-transparent'
                                    }`}
                                    title={isBlocked ? getTranslation(lang, 'chatDisabled', 'المحادثة معطلة بسبب الحظر') : (friendStatus === 'friends' ? getTranslation(lang, 'addParticipants', 'إضافة أشخاص') : getTranslation(lang, 'mustBeFriendsToCall', 'يجب أن تكونوا أصدقاء لإضافة أشخاص'))}
                                    id="add-participants-header-btn"
                                >
                                    <UserPlus size={18} strokeWidth={2} />
                                </button>
                            )}

                             <button 
                                onClick={() => {
                                    if (chat.isGroup) {
                                        if (activeGroupCallInChat) {
                                            (window as any).__USER_MANUAL_CALL_CLICK__ = true;
                                            joinGroupCall(chat.id, activeGroupCallInChat.callType || 'video', chat.id);
                                        } else {
                                            openGroupCallModeMenu('video');
                                        }
                                    } else if (!isBlocked && friendStatus === 'friends') {
                                        setShowCallPreview('video');
                                    }
                                }}
                                disabled={isBlocked || (friendStatus !== 'friends' && !chat.isGroup)}
                                className={`relative p-2 rounded-lg bg-white/5 transition-all ${
                                    (!isBlocked && (friendStatus === 'friends' || chat.isGroup)) 
                                    ? 'hover:bg-white/10 text-yellow-400 cursor-pointer border border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.4)] active:scale-95' 
                                    : 'opacity-20 grayscale cursor-not-allowed text-slate-500'
                                }`}
                                title={isBlocked ? getTranslation(lang, 'chatDisabled', 'المحادثة معطلة بسبب الحظر') : (chat.isGroup ? (activeGroupCallInChat ? getTranslation(lang, 'joinActiveGroupCall', 'انضمام لمكالمة الفيديو الجارية') : getTranslation(lang, 'startGroupVideoCall', 'بدء مكالمة فيديو جماعية')) : (friendStatus === 'friends' ? getTranslation(lang, 'videoCall', 'اتصال فيديو') : getTranslation(lang, 'mustBeFriendsToCall', 'يجب أن تكونوا أصدقاء للاتصال')))}
                             >
                                <Video size={18} strokeWidth={2} />
                                {chat.isGroup && activeGroupCallInChat && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
                                )}
                             </button>

                             {/* More Options Button & Dropdown */}
                             <div className="flex items-center gap-2">
                                 <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHeaderMenuPage('main');
                                        setShowHeaderMenu(!showHeaderMenu);
                                    }}
                                    className="p-2 rounded-lg text-white transition-colors hover:bg-white/10"
                                    title={getTranslation(lang, "chatSettings", "Chat Settings")}
                                 >
                                    <MoreVertical size={18} />
                                 </button>
                             </div>

                             {/* Header Dropdown Menu */}
                             {showHeaderMenu && (
                                <div 
                                    className="absolute top-14 left-0 w-[calc(100vw-1rem)] sm:w-72 max-w-[288px] bg-[#0b0f17] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto overflow-x-hidden max-h-[calc(100dvh-120px)] animate-in fade-in slide-in-from-top-2 duration-200 z-[60]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Sub-menu: SEARCH / FILTERS */}
                                    {headerMenuPage === 'filters' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "backToMainMenu", "Back to Main Menu")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-slate-500 px-3 py-1 font-semibold uppercase">{getTranslation(lang, "filterMessagesByType", "Filter chat messages by type")}</p>
                                            
                                            <button onClick={() => { setSearchCategory(null); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === null ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><LayoutGrid size={16} /> {getTranslation(lang, "showAllMessages", "Show All Messages")}</div>
                                                {searchCategory === null && <Check size={14} />}
                                            </button>
                                            <button onClick={() => { setSearchCategory('documents'); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === 'documents' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><FileText size={16} /> {getTranslation(lang, "documentsAndFiles", "Documents & Files")}</div>
                                                {searchCategory === 'documents' && <Check size={14} />}
                                            </button>
                                            <button onClick={() => { setSearchCategory('audio'); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === 'audio' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><Mic size={16} /> {getTranslation(lang, "audioRecordings", "Audio Recordings")}</div>
                                                {searchCategory === 'audio' && <Check size={14} />}
                                            </button>
                                            <button onClick={() => { setSearchCategory('media'); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === 'media' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><ImageIcon size={16} /> {getTranslation(lang, "photosAndVideos", "Photos & Videos")}</div>
                                                {searchCategory === 'media' && <Check size={14} />}
                                            </button>
                                            <button onClick={() => { setSearchCategory('maps'); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === 'maps' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><MapPin size={16} /> {getTranslation(lang, "locationsAndMaps", "Locations & Maps")}</div>
                                                {searchCategory === 'maps' && <Check size={14} />}
                                            </button>
                                            <button onClick={() => { setSearchCategory('links'); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === 'links' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><Globe size={16} /> {getTranslation(lang, "linksAndWebsites", "Links & Websites")}</div>
                                                {searchCategory === 'links' && <Check size={14} />}
                                            </button>
                                            <button onClick={() => { setSearchCategory('text'); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === 'text' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><FileText size={16} /> {getTranslation(lang, "textMessagesOnly", "Text Messages Only")}</div>
                                                {searchCategory === 'text' && <Check size={14} />}
                                            </button>
                                            <button onClick={() => { setSearchCategory('stickers'); setHeaderMenuPage('main'); }} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold text-right w-full ${searchCategory === 'stickers' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}>
                                                <div className="flex items-center gap-3"><Smile size={16} /> {getTranslation(lang, "stickersAndEmojis", "Stickers & Emojis")}</div>
                                                {searchCategory === 'stickers' && <Check size={14} />}
                                            </button>
                                        </div>
                                    )}

                                    {/* Sub-menu: PINNED MESSAGES LIST */}
                                    {headerMenuPage === 'pinned' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "backToMainMenu", "Back to Main Menu")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-amber-400 px-3 py-1 font-bold uppercase">{getTranslation(lang, "pinnedMessagesInChat", "Pinned Messages in this Chat 📌")}</p>
                                            
                                            {(!((currentChat as any)['pinnedMessageIds_' + myId]) || ((currentChat as any)['pinnedMessageIds_' + myId]).length === 0) ? (
                                                <div className="text-center p-6 text-slate-500 text-xs font-semibold">
                                                    {getTranslation(lang, "noPinnedMessagesInChat", "No pinned messages or media in this chat.")}
                                                </div>
                                            ) : (
                                                <div className="max-h-80 overflow-y-auto flex flex-col gap-2 p-1">
                                                    {messages.filter(m => (((currentChat as any)['pinnedMessageIds_' + myId]) || []).includes(m.id)).map(pinnedMsg => (
                                                        <PinnedMediaCard
                                                            key={pinnedMsg.id}
                                                            item={{
                                                                id: pinnedMsg.id,
                                                                type: pinnedMsg.type,
                                                                text: pinnedMsg.text,
                                                                audioUrl: pinnedMsg.audioUrl,
                                                                imageUrl: pinnedMsg.imageUrl,
                                                                videoUrl: pinnedMsg.videoUrl,
                                                                fileUrl: pinnedMsg.fileUrl,
                                                                fileName: pinnedMsg.fileName,
                                                                fileSize: pinnedMsg.fileSize,
                                                                stickerUrl: pinnedMsg.stickerUrl,
                                                                giftUrl: pinnedMsg.giftUrl,
                                                                location: pinnedMsg.location,
                                                                contact: pinnedMsg.contact,
                                                                chatId: currentChat.id,
                                                                chatName: currentChat.isGroup ? (currentChat.name || 'الدردشة العامة') : (currentChat.user?.name || 'محادثة خاصة'),
                                                                senderId: pinnedMsg.senderId,
                                                                senderName: pinnedMsg.senderName,
                                                                timestamp: pinnedMsg.timestamp
                                                            }}
                                                            myId={myId}
                                                            onUnpin={(id) => handleTogglePinMessage(id)}
                                                            onGoToProfile={(userId) => {
                                                                setProfileUserId(userId);
                                                                setShowProfileInfo(true);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-menu: UNIFIED PINNED MESSAGES LIST (All Chats) */}
                                    {headerMenuPage === 'unified_pinned' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "backToMainMenu", "Back to Main Menu")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <div className="flex items-center justify-between px-2">
                                                <p className="text-[10px] text-amber-400 font-bold uppercase">📌 {getTranslation(lang, "unifiedPinnedTitle", "Unified Pinned Messages (All Chats)")}</p>
                                                <span className="text-[9px] text-slate-400">{getTranslation(lang, "fullVersion", "Full Version")}</span>
                                            </div>
                                            
                                            <div className="max-h-80 overflow-y-auto flex flex-col gap-2 p-1 mt-1">
                                                {(() => {
                                                    let savedUnified: PinnedItem[] = [];
                                                    try {
                                                        savedUnified = JSON.parse(localStorage.getItem('hisee_unified_pinned_msgs') || '[]');
                                                    } catch (e) {
                                                        savedUnified = [];
                                                    }
                                                    const currentChatPinned = messages.filter(m => (((currentChat as any)['pinnedMessageIds_' + myId]) || []).includes(m.id)).map(m => ({
                                                        id: m.id,
                                                        type: m.type,
                                                        text: m.text,
                                                        audioUrl: m.audioUrl,
                                                        imageUrl: m.imageUrl,
                                                        videoUrl: m.videoUrl,
                                                        fileUrl: m.fileUrl,
                                                        fileName: m.fileName,
                                                        fileSize: m.fileSize,
                                                        stickerUrl: m.stickerUrl,
                                                        giftUrl: m.giftUrl,
                                                        location: m.location,
                                                        contact: m.contact,
                                                        chatId: currentChat.id,
                                                        chatName: currentChat.isGroup ? (currentChat.name || 'الدردشة العامة') : (currentChat.user?.name || 'محادثة خاصة'),
                                                        senderId: m.senderId,
                                                        senderName: m.senderName,
                                                        timestamp: m.timestamp
                                                    }));

                                                    const allPinnedMap = new Map<string, PinnedItem>();
                                                    [...currentChatPinned, ...savedUnified].forEach(item => {
                                                        allPinnedMap.set(item.id, item);
                                                    });
                                                    const allPinnedList = Array.from(allPinnedMap.values());

                                                    if (allPinnedList.length === 0) {
                                                        return <p className="text-xs text-slate-400 text-center py-4">{getTranslation(lang, "noUnifiedPinnedMessages", "No unified pinned messages or media.")}</p>;
                                                    }

                                                    return allPinnedList.map(item => (
                                                        <PinnedMediaCard 
                                                            key={item.id}
                                                            item={item}
                                                            myId={myId}
                                                            onUnpin={(id) => handleTogglePinMessage(id)}
                                                            onGoToProfile={(userId) => {
                                                                setProfileUserId(userId);
                                                                setShowProfileInfo(true);
                                                            }}
                                                        />
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-menu: FAVORITE USERS LIST (الأشخاص المفضلين) */}
                                    {headerMenuPage === 'favorite_users' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "backToMainMenu", "Back to Main Menu")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <div className="flex items-center justify-between px-2">
                                                <p className="text-[10px] text-emerald-400 font-bold uppercase">⭐ {getTranslation(lang, "favoritePeopleTitle", "Favorite People & Friends")}</p>
                                                <span className="text-[9px] text-slate-400">{getTranslation(lang, "publicAndPrivateChat", "Public & Private Chat")}</span>
                                            </div>

                                            <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 p-1 mt-1">
                                                {allUsers.filter(u => u.id !== myId && u.id !== 'hisee-ai-bot').slice(0, 10).map(userItem => {
                                                    const isFav = localStorage.getItem(`hisee_fav_user_${userItem.id}`) === 'true' || (userItem.id === chat?.user?.id && isFavorite);
                                                    const online = isUserOnline(userItem.lastSeen || userItem.lastActive, userItem.isOnline);
                                                    return (
                                                        <div key={userItem.id} className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-right">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-slate-800">
                                                                    <img 
                                                                        src={normalizeMediaUrl(userItem.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.id}`} 
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.id}`; }}
                                                                    />
                                                                    {online && <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-black"></div>}
                                                                </div>
                                                                <div className="flex flex-col text-right">
                                                                    <span className="text-xs font-bold text-slate-200">{extractStringValue(userItem.name, getTranslation(lang, 'user', 'User'))}</span>
                                                                    <span className="text-[9px] text-slate-400">{online ? getTranslation(lang, 'online', 'Online') : getTranslation(lang, 'offline', 'Offline')}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        const next = !isFav;
                                                                        localStorage.setItem(`hisee_fav_user_${userItem.id}`, String(next));
                                                                        if (userItem.id === chat?.user?.id) setIsFavorite(next);
                                                                        setHeaderMenuPage('favorite_users');
                                                                    }}
                                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                                                                    title={getTranslation(lang, "favorite", "Favorite")}
                                                                >
                                                                    <Star size={14} className={isFav ? "text-amber-400 fill-amber-400" : ""} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowHeaderMenu(false);
                                                                        onSelectChat?.({
                                                                            id: userItem.id,
                                                                            user: userItem,
                                                                            lastMessage: '',
                                                                            timestamp: '',
                                                                            unreadCount: 0,
                                                                            isOnline: !!userItem.isOnline,
                                                                            messages: []
                                                                        });
                                                                    }}
                                                                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg transition-all"
                                                                >
                                                                    {getTranslation(lang, "chat", "Chat")}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-menu: SOUNDS & NOTIFICATIONS */}
                                    {headerMenuPage === 'sounds' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "back", "Back")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-slate-500 px-3 py-1 font-semibold uppercase">{getTranslation(lang, "notificationsAndSounds", "Notifications & Sounds")}</p>

                                            <button onClick={() => {
                                                const newMuteState = !isMuted;
                                                setIsMuted(newMuteState);
                                                updateDoc(doc(firestoreDb, 'chats', firestoreChatId), { isMuted: newMuteState });
                                                showToast(newMuteState ? 'تم كتم إشعارات هذا المستخدم.' : 'تم إلغاء كتم إشعارات هذا المستخدم.');
                                            }} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3">
                                                    <VolumeX size={16} className={isMuted ? "text-rose-500" : "text-slate-400"} />
                                                    <span>{getTranslation(lang, "muteNotificationsAll", "Mute Notifications Completely")}</span>
                                                </div>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isMuted ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isMuted ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                </div>
                                            </button>

                                            <button onClick={() => {
                                                const next = !hideNameInNotifications;
                                                setHideNameInNotifications(next);
                                                localStorage.setItem(`hisee_hide_name_${chat.id}`, String(next));
                                                showToast(next ? 'سيتم إخفاء اسم المرسل في الإشعارات للحفاظ على الخصوصية 🔒' : 'تم تفعيل إظهار اسم المرسل في الإشعارات.');
                                            }} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3">
                                                    <EyeOff size={16} className="text-slate-400" />
                                                    <span>{getTranslation(lang, "hideSenderNameInNotif", "Hide Sender Name in Notifications")}</span>
                                                </div>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${hideNameInNotifications ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${hideNameInNotifications ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                </div>
                                            </button>

                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-slate-500 px-3 py-1 font-semibold uppercase">{getTranslation(lang, "messageNotificationRingtone", "Message Notification Tone")}</p>
                                            
                                            {[
                                                { id: 'default', name: getTranslation(lang, 'default', 'Default') },
                                                { id: 'hisee_1', name: getTranslation(lang, 'hiseeTone1', 'HiSee Tone 1') },
                                                { id: 'hisee_2', name: getTranslation(lang, 'hiseeTone2', 'HiSee Tone 2') },
                                                { id: 'hisee_3', name: getTranslation(lang, 'hiseeTone3', 'HiSee Tone 3') },
                                                { id: 'hisee_4', name: getTranslation(lang, 'hiseeTone4', 'HiSee Tone 4') },
                                            ].map(tone => (
                                                <button 
                                                    key={tone.id}
                                                    onClick={() => {
                                                        const newSettings = { ...chatSettings, sounds: { ...chatSettings.sounds, notificationSound: tone.id } };
                                                        setChatSettings(newSettings);
                                                        localStorage.setItem('hisee_chat_settings', JSON.stringify(newSettings));
                                                        window.dispatchEvent(new Event('chatSettingsChanged'));
                                                        
                                                        let audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
                                                        if (tone.id === 'hisee_1') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3';
                                                        else if (tone.id === 'hisee_2') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3';
                                                        else if (tone.id === 'hisee_3') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3';
                                                        else if (tone.id === 'hisee_4') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
                                                        
                                                        const audio = new Audio(audioUrl);
                                                        audio.volume = (chatSettings.notificationVolume ?? 100) / 100;
                                                        audio.play().catch(() => {});
                                                    }}
                                                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right"
                                                >
                                                    <span>{tone.name}</span>
                                                    {chatSettings.sounds.notificationSound === tone.id && <Check size={14} className="text-emerald-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Sub-menu: DISAPPEARING MESSAGES */}
                                    {headerMenuPage === 'disappearing' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "back", "Back")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-slate-500 px-3 py-1 font-semibold uppercase">{getTranslation(lang, "disappearingMessagesFeature", "Disappearing Messages Feature")}</p>
                                            
                                            {[
                                                { label: getTranslation(lang, 'disabled', 'Off'), value: 0 },
                                                { label: getTranslation(lang, 'twentyFourHours', '24 Hours (1 Day)'), value: 86400000 },
                                                { label: getTranslation(lang, 'sevenDays', '7 Days (1 Week)'), value: 604800000 },
                                                { label: getTranslation(lang, 'ninetyDays', '90 Days (3 Months)'), value: 7776000000 },
                                            ].map(item => {
                                                const currentDuration = (currentChat?.disappearingMessages?.enabled && typeof currentChat.disappearingMessages.duration === 'number') ? currentChat.disappearingMessages.duration : 0;
                                                const isActive = currentDuration === item.value;
                                                return (
                                                    <button 
                                                        key={item.value}
                                                        onClick={() => handleSetDisappearing(item.value)}
                                                        className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold w-full text-right ${isActive ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}
                                                    >
                                                        <span>{item.label}</span>
                                                        {isActive && <Check size={14} className="text-emerald-500" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Sub-menu: CHAT PERMISSIONS */}
                                    {headerMenuPage === 'permissions' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "back", "Back")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-slate-500 px-3 py-1 font-semibold uppercase">{getTranslation(lang, "chatMessagingPermissions", "Chat Messaging Permissions")}</p>
                                            
                                            {[
                                                { key: 'allowAudio', label: getTranslation(lang, 'sendVoiceMessages', 'Send Voice Messages'), icon: <Mic size={16} /> },
                                                { key: 'allowMedia', label: getTranslation(lang, 'sendPhotosAndVideos', 'Send Photos & Videos'), icon: <ImageIcon size={16} /> },
                                                { key: 'allowDocuments', label: getTranslation(lang, 'sendFilesAndDocuments', 'Send Files & Documents'), icon: <FileText size={16} /> },
                                            ].map(perm => {
                                                const permissions = currentChat.permissions || { allowAudio: true, allowMedia: true, allowDocuments: true };
                                                const val = permissions[perm.key as 'allowAudio' | 'allowMedia' | 'allowDocuments'] !== false;
                                                return (
                                                    <button 
                                                        key={perm.key}
                                                        onClick={() => handleTogglePermission(perm.key as 'allowAudio' | 'allowMedia' | 'allowDocuments')}
                                                        className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl text-xs font-bold w-full text-right"
                                                    >
                                                        <div className="flex items-center gap-3 text-slate-300">
                                                            {perm.icon}
                                                            <span>{perm.label}</span>
                                                        </div>
                                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${val ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${val ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Sub-menu: OTHER ACTIONS (Security, Clear, etc) */}
                                    {headerMenuPage === 'actions' && (
                                        <div className="flex flex-col p-2 gap-1 text-slate-200">
                                            <div onClick={() => setHeaderMenuPage('main')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-xs font-bold cursor-pointer text-slate-400 hover:text-white transition-all">
                                                <ArrowLeft size={16} /> {getTranslation(lang, "back", "Back")}
                                            </div>
                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-slate-500 px-3 py-1 font-semibold uppercase">{getTranslation(lang, "clearChatContent", "Clear Chat Content")}</p>
                                            
                                            <button onClick={() => { setShowClearChatMenu(true); setShowHeaderMenu(false); setHeaderMenuPage('main'); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <Trash2 size={16} className="text-slate-400" /> {getTranslation(lang, "customClearMessages", "Custom Clear Messages")}
                                            </button>

                                            <div className="h-[1px] bg-white/5 my-1"></div>
                                            <p className="text-[10px] text-slate-500 px-3 py-1 font-semibold uppercase">{getTranslation(lang, "securityAndControlActions", "Security & Control Actions")}</p>

                                            <button onClick={handleMoveChat} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <Archive size={16} className="text-slate-400" /> {getTranslation(lang, "moveToArchive", "Move Chat to Secure Archive")}
                                            </button>

                                            <button onClick={handleDeleteContact} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <UserX size={16} className="text-slate-400" /> {getTranslation(lang, "deleteContactFromFriends", "Delete Contact from Friends")}
                                            </button>

                                            <button onClick={() => handleHeaderOption('report')} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <Flag size={16} className="text-slate-400" /> {getTranslation(lang, "reportAbuse", "Report Abuse")}
                                            </button>

                                            {iBlockedThem ? (
                                                <button onClick={() => handleHeaderOption('block')} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-xs font-bold w-full text-right text-emerald-400">
                                                    <Ban size={16} className="text-emerald-400" />
                                                    <span>{getTranslation(lang, "unblockUser", "Unblock User")}</span>
                                                </button>
                                            ) : theyBlockedMe ? (
                                                <button disabled={true} className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold w-full text-right opacity-40 cursor-not-allowed text-slate-500 bg-white/[0.02]" title="الدردشة معطلة حالياً">
                                                    <Ban size={16} className="text-slate-500" />
                                                    <span>{getTranslation(lang, "blockUser", "Block User")}</span>
                                                </button>
                                            ) : (
                                                <button onClick={() => handleHeaderOption('block')} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-xs font-bold w-full text-right text-slate-300 hover:text-white">
                                                    <Ban size={16} className="text-slate-400" />
                                                    <span>{getTranslation(lang, "blockUser", "Block User")}</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Main Menu Page */}
                                    {headerMenuPage === 'main' && (
                                        <div className="flex flex-col p-2 pb-6 gap-0.5 text-slate-200">

            {/* Header */}
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 mb-1 bg-white/5 rounded-t-xl">
                                                <span className="text-xs font-black text-emerald-400">{getTranslation(lang, "unifiedChatSettings", "Unified Chat Settings")}</span>
                                                {/* Hidden encryption icon */}
                                            </div>

                                            {/* Block: Quick Tools */}
                                            <p className="text-[9px] text-slate-500 px-3 py-1 font-extrabold uppercase tracking-wider text-right">{getTranslation(lang, "quickToolsAndFiltering", "Quick Tools & Filtering")}</p>
                                            
                                            <button onClick={() => setHeaderMenuPage('filters')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold text-right w-full">
                                                <div className="flex items-center gap-3"><LayoutGrid size={16} className="text-slate-400" /> {getTranslation(lang, "searchAndFilterContent", "Search & Filter Content")}</div>
                                                <span className="text-[10px] text-slate-500 font-normal">{getTranslation(lang, "recordingsPhotosMaps", "Audio, Photos, Maps...")}</span>
                                            </button>

                                            <button onClick={() => setHeaderMenuPage('pinned')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold text-right w-full">
                                                <div className="flex items-center gap-3"><Pin size={16} className="text-slate-400" /> {getTranslation(lang, "pinnedMessages", "Pinned Messages 📌")}</div>
                                                <span className="text-[10px] text-slate-500 font-normal">{(((currentChat as any)['pinnedMessageIds_' + myId]) || []).length} رسائل</span>
                                            </button>

                                            <button onClick={() => setHeaderMenuPage('unified_pinned')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold text-right w-full">
                                                <div className="flex items-center gap-3"><Pin size={16} className="text-amber-400" /> {getTranslation(lang, "unifiedPinnedMessages", "Unified Pinned Messages 📌")}</div>
                                                <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">جميع الدردشات</span>
                                            </button>

                                            <button onClick={() => setHeaderMenuPage('favorite_users')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold text-right w-full">
                                                <div className="flex items-center gap-3"><Users size={16} className="text-emerald-400" /> {getTranslation(lang, "favoritePeople", "Favorite People ⭐")}</div>
                                                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">دخول وتفاعل</span>
                                            </button>

                                            {/* Toggle: Mark Favorite */}
                                            <button onClick={handleToggleFavorite} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3">
                                                    <Star size={16} className={isFavorite ? "text-amber-400 fill-amber-400" : "text-slate-400"} />
                                                    <span>{getTranslation(lang, "addToFavorites", "Add to Favorites ⭐")}</span>
                                                </div>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isFavorite ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isFavorite ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                </div>
                                            </button>

                                            {/* Button: Share Contact */}
                                            <button onClick={handleOpenContactPicker} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <Share2 size={16} className="text-slate-400" /> مشاركة جهة اتصال بال{getTranslation(lang, "chat", "Chat")}
                                            </button>

                                            <div className="h-[1px] bg-white/5 my-1"></div>

                                            {/* Block: Configuration */}
                                            <p className="text-[9px] text-slate-500 px-3 py-1 font-extrabold uppercase tracking-wider text-right">{getTranslation(lang, "settingsAndCustomization", "Settings & Customization")}</p>

                                            <button onClick={() => setHeaderMenuPage('permissions')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3"><Settings2 size={16} className="text-slate-400" /> أذونات مراسلة المحادثة</div>
                                                <span className="text-[10px] text-slate-500">{getTranslation(lang, "controlVoiceAndFiles", "Manage Audio & Files")}</span>
                                            </button>

                                            <button onClick={() => setHeaderMenuPage('sounds')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3"><Bell size={16} className="text-slate-400" /> {getTranslation(lang, "notificationsAndSounds", "Notifications & Sounds")}</div>
                                                <span className="text-[10px] text-slate-500">{getTranslation(lang, "muteAndTones", "Mute & Ringing Tones")}</span>
                                            </button>

                                            <button onClick={() => setHeaderMenuPage('disappearing')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3"><Clock size={16} className="text-slate-400" /> {getTranslation(lang, "disappearingMessages", "Disappearing Messages")}</div>
                                                <span className="text-[10px] text-slate-500">{(currentChat?.disappearingMessages?.enabled && typeof currentChat?.disappearingMessages?.duration === 'number' && currentChat.disappearingMessages.duration > 0) ? 'مفعّلة' : 'متوقفة'}</span>
                                            </button>

                                            {/* Toggle: Auto-Save */}
                                            <button onClick={() => {
                                                const next = !autoSaveToDevice;
                                                setAutoSaveToDevice(next);
                                                localStorage.setItem(`hisee_autosave_${chat.id}`, String(next));
                                                showToast(next ? 'تم تفعيل الحفظ التلقائي للوسائط المستلمة إلى جهازك.' : 'تم إيقاف الحفظ التلقائي للوسائط.');
                                            }} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3">
                                                    <Smartphone size={16} className="text-slate-400" />
                                                    <span>{getTranslation(lang, "autoSaveToDevice", "Auto-Save to Device")}</span>
                                                </div>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${autoSaveToDevice ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${autoSaveToDevice ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                </div>
                                            </button>

                                            {/* Toggle: Read Receipts */}
                                            <button onClick={() => {
                                                const next = !readReceiptsEnabled;
                                                setReadReceiptsEnabled(next);
                                                localStorage.setItem(`hisee_read_rec_${chat.id}`, String(next));
                                                if (firestoreChatId) {
                                                    updateDoc(doc(firestoreDb, 'chats', firestoreChatId), {
                                                        [`privacyOverrides.${myId}.readReceipts`]: next
                                                    }).catch(e => console.error(e));
                                                }
                                                showToast(next ? 'سيتم إظهار مؤشر قراءة الرسائل (صحين أزرق).' : 'تم إيقاف مؤشر القراءة للطرفين.');
                                            }} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                <div className="flex items-center gap-3">
                                                    <CheckCheck size={16} className="text-slate-400" />
                                                    <span>{getTranslation(lang, "readReceipts", "Read Receipts")}</span>
                                                </div>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${readReceiptsEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${readReceiptsEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                </div>
                                            </button>

                                             {/* Toggle: Typing Indicators */}
                                             <button onClick={() => {
                                                 const next = !isTypingIndicatorEnabled;
                                                 setIsTypingIndicatorEnabled(next);
                                                 localStorage.setItem(`hisee_typing_ind_${chat.id}`, String(next));
                                                 showToast(next ? 'سيتم مشاركة حالة الكتابة (جاري الكتابة...) في هذه الدردشة.' : 'تم إيقاف مؤشر الكتابة لهذه الدردشة الخاصة.');
                                             }} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                 <div className="flex items-center gap-3">
                                                     <Activity size={16} className="text-slate-400" />
                                                     <span>{getTranslation(lang, "typingIndicator", "Typing Indicator")}</span>
                                                 </div>
                                                 <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isTypingIndicatorEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                     <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isTypingIndicatorEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                 </div>
                                             </button>

                                             {/* Toggle: Recording Indicators */}
                                             <button onClick={() => {
                                                 const next = !isRecordingIndicatorEnabled;
                                                 setIsRecordingIndicatorEnabled(next);
                                                 localStorage.setItem(`hisee_recording_ind_${chat.id}`, String(next));
                                                 if (firestoreChatId) {
                                                     updateDoc(doc(firestoreDb, 'chats', firestoreChatId), {
                                                         [`privacyOverrides.${myId}.recording`]: next
                                                     }).catch(e => console.error(e));
                                                 }
                                                 showToast(next ? 'سيتم مشاركة حالة التسجيل الصوتي (جاري تسجيل...) في هذه الدردشة.' : 'تم إيقاف مؤشر التسجيل الصوتي لهذه الدردشة الخاصة.');
                                             }} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                 <div className="flex items-center gap-3">
                                                     <Radio size={16} className="text-slate-400" />
                                                     <span>{getTranslation(lang, "recordingIndicator", "Recording Indicator")}</span>
                                                 </div>
                                                 <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isRecordingIndicatorEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                     <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isRecordingIndicatorEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                 </div>
                                             </button>

                                             {/* Toggle: Hide Activity & Last Seen */}
                                             <button onClick={() => {
                                                 const next = !hideActivityAndLastSeen;
                                                 setHideActivityAndLastSeen(next);
                                                 localStorage.setItem(`hisee_hide_activity_${chat.id}`, String(next));
                                                 if (firestoreChatId) {
                                                     updateDoc(doc(firestoreDb, 'chats', firestoreChatId), {
                                                         [`privacyOverrides.${myId}.hideActivity`]: next
                                                     }).catch(e => console.error(e));
                                                 }
                                                 showToast(next ? 'تم إخفاء حالة النشاط وتاريخ آخر ظهور لهذه المحادثة الخاصة.' : 'تم إظهار حالة النشاط وتاريخ الظهور في هذه المحادثة.');
                                             }} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                 <div className="flex items-center gap-3">
                                                     <EyeOff size={16} className={hideActivityAndLastSeen ? "text-emerald-400" : "text-slate-400"} />
                                                     <span>{getTranslation(lang, "hideActivityAndLastSeen", "Hide Online & Last Seen")}</span>
                                                 </div>
                                                 <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${hideActivityAndLastSeen ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                     <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${hideActivityAndLastSeen ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                 </div>
                                             </button>

                                             <div className="h-[1px] bg-white/5 my-1"></div>

                                             {/* Toggle: Restrict Account */}
                                             <button onClick={handleToggleRestrict} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-bold w-full text-right">
                                                 <div className="flex items-center gap-3">
                                                     <AlertCircle size={16} className={isRestricted ? "text-orange-500" : "text-slate-400"} />
                                                     <span>{getTranslation(lang, "restrictAccount", "Restrict Account ⚠️")}</span>
                                                 </div>
                                                 <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isRestricted ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                                     <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isRestricted ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                 </div>
                                             </button>

                                             <button onClick={() => setHeaderMenuPage('actions')} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all w-full text-right">
                                                 <div className="flex items-center gap-3"><Shield size={16} className="text-emerald-500" /> {getTranslation(lang, "moreSecurityOptions", "More Security Options")}</div>
                                                 <span>&larr;</span>
                                             </button>

                                             <div className="h-[1px] bg-white/5 my-1"></div>

                                             {iBlockedThem ? (
                                                 <button onClick={() => handleHeaderOption('block')} className="flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold w-full text-right border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                                                     <Ban size={16} className="text-emerald-400" />
                                                     <span>{getTranslation(lang, "unblockUser", "Unblock User")}</span>
                                                 </button>
                                             ) : theyBlockedMe ? (
                                                 <button disabled={true} className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold w-full text-right border bg-rose-500/5 text-rose-400/40 border-rose-500/10 opacity-40 cursor-not-allowed" title="الدردشة معطلة حالياً">
                                                     <Ban size={16} className="text-rose-400/40" />
                                                     <span>{getTranslation(lang, "blockUser", "Block User")}</span>
                                                 </button>
                                             ) : (
                                                 <button onClick={() => handleHeaderOption('block')} className="flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold w-full text-right border bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20">
                                                     <Ban size={16} className="text-rose-400" />
                                                     <span>{getTranslation(lang, "blockUser", "Block User")}</span>
                                                 </button>
                                             )}
                                        </div>
                                    )}
                                </div>
                             )}
                </div>
                </>
                )}
            </div>

            {/* Background Layer */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {chatSettings.background === 'default' && (
                    <div className="w-full h-full bg-[#0a0c10] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50"></div>
                )}
                {chatSettings.background === 'pattern1' && (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-emerald-900 opacity-80"></div>
                )}
                {chatSettings.background === 'pattern2' && (
                    <div className="w-full h-full bg-gradient-to-tr from-rose-900 to-slate-900 opacity-80"></div>
                )}
                {chatSettings.background !== 'default' && chatSettings.background !== 'pattern1' && chatSettings.background !== 'pattern2' && (
                    <img src={chatSettings.background} alt="Background" className="w-full h-full object-cover opacity-80" />
                )}
            </div>

            {/* Messages List */}
            <div 
                ref={scrollRef} 
                onScroll={(e) => {
                    if (e.currentTarget.scrollTop < 50 && hasMore && !loading) {
                        loadMoreMessages();
                    }
                }}
                className={`flex-1 overflow-y-auto p-4 pt-24 ${showTranslatorBar ? 'pb-44 sm:pb-36' : 'pb-24'} no-scrollbar flex flex-col relative z-10 [overflow-anchor:preserve]`}
                onClick={(e) => {
                    onToggleUi();
                    setShowHeaderMenu(false); // Close menu on click outside
                    if (reactionPickerMsgId) setReactionPickerMsgId(null);
                }} 
            >
                <div className="mt-auto space-y-4 w-full flex flex-col relative">
                    {loading && messages.length > 0 && (
                        <div className="flex justify-center py-2">
                            <Loader2 size={20} className="text-emerald-500 animate-spin" />
                        </div>
                    )}
                    {chatSettings.privacy.endToEndEncryption && (
                        <div className="hidden justify-center my-4">
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 border border-yellow-500/20 shadow-sm">
                                <Lock size={10} /> الرسائل والمكالمات مشفرة تماماً بين الطرفين
                            </span>
                        </div>
                    )}
                    {searchCategory && (
                        <div className="flex justify-center my-2 z-20 relative">
                            <div className="bg-slate-800/80 backdrop-blur-sm text-slate-200 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-white/10 shadow-lg">
                                <span>تصفية حسب: {searchCategory === 'documents' ? 'مستندات' : searchCategory === 'audio' ? 'تسجيلات صوتية' : '{getTranslation(lang, "photosAndVideos", "Photos & Videos")}'}</span>
                                <button onClick={() => setSearchCategory(null)} className="text-rose-400 hover:text-rose-300">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                {loading && messages.length === 0 ? (
                    <ChatSkeleton />
                ) : (
                    <ChatMessageList
                        filteredMessages={filteredMessages}
                        myId={myId}
                        allUsers={allUsers}
                        myProfile={myProfile}
                        displayUser={displayUser}
                        isSelectionMode={isSelectionMode}
                        selectedIds={selectedIds}
                        searchCategory={searchCategory}
                        reactionPickerMsgId={reactionPickerMsgId}
                        activeAudioId={activeAudioId}
                        isAudioPlaying={isAudioPlaying}
                        audioProgress={audioProgress}
                        currentAudioTime={currentAudioTime}
                        audioSpeeds={audioSpeeds}
                        openAudioMenuId={openAudioMenuId}
                        uploadProgress={uploadProgress}
                        chatSettings={chatSettings}
                        firestoreChatId={firestoreChatId}
                        chat={currentChat}
                        messages={messages}
                        msgStatuses={msgStatuses}
                        myMessageCount={myMessageCount}
                        friendStatus={friendStatus}
                        showLimitMessage={showLimitMessage}
                        isTranslatorActive={isTranslatorActive}
                        translatorMode={translatorMode}
                        targetLanguage={incomingTargetLang}
                        sourceLanguage={outgoingTargetLang}
                        autoTranslatorActivatedAt={autoTranslatorActivatedAt}
                        cachedTranslations={cachedTranslations}
                        cachedVoiceData={cachedVoiceData}
                        onSaveTranslation={handleSaveTranslation}
                        onSaveVoiceData={handleSaveVoiceData}
                        handleOpenMessage={handleOpenMessage}
                        handleDeleteMessage={handleDeleteMessage}
                        handleToggleSelection={handleToggleSelection}
                        setProfileUserId={setProfileUserId}
                        setShowProfileInfo={setShowProfileInfo}
                        handleTouchStart={handleTouchStart}
                        handleTouchEnd={handleTouchEnd}
                        setIsSelectionMode={setIsSelectionMode}
                        setReactionPickerMsgId={setReactionPickerMsgId}
                        handleReaction={handleReaction}
                        handleStopLiveLocation={handleStopLiveLocation}
                        onSelectChat={onSelectChat}
                        toggleAudioPlay={toggleAudioPlay}
                        setOpenAudioMenuId={setOpenAudioMenuId}
                        handleToggleAudioSpeed={handleToggleAudioSpeed}
                        handleToggleAudioLock={handleToggleAudioLock}
                        handleSetAudioColor={handleSetAudioColor}
                        decryptText={decryptText}
                        decryptMessage={decryptMessage}
                        handleMessageAction={handleMessageAction}
                    />
                )}
                </div>
            </div>

                {/* Input Area - Fixed Visibility above Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 p-2 pb-[env(safe-area-inset-bottom)] bg-[#111318]/95 backdrop-blur-md border-t border-white/5 z-[100]">
                {(() => {
                    const myRecordingEnabled = isRecordingIndicatorEnabled && (currentChat as any).privacyOverrides?.[myId]?.recording !== false;
                    const otherRecordingEnabled = (currentChat as any).privacyOverrides?.[chat.user.id]?.recording !== false;
                    const mutualRecordingEnabled = myRecordingEnabled && otherRecordingEnabled;
                    const myActivityHidden = hideActivityAndLastSeen || (currentChat as any)?.privacyOverrides?.[myId]?.hideActivity === true;
                    const otherActivityHidden = (currentChat as any)?.privacyOverrides?.[chat.user.id]?.hideActivity === true;
                    return mutualRecordingEnabled && !myActivityHidden && !otherActivityHidden && Object.entries(currentChat.isRecording || {}).some(([uid, recording]) => {
                        if (uid === myId || !recording) return false;
                        const u = allUsers.find(user => user.id === uid);
                        return u ? isUserOnline(u.lastSeen || u.lastActive, u.isOnline) : true;
                    });
                })() && (
                    <div className="absolute -top-10 left-4 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl">
                            <span className="text-[10px] font-bold text-white animate-pulse">جاري تسجيل...</span>
                        </div>
                    </div>
                )}
                
                {(() => {
                    const myTypingEnabled = isTypingIndicatorEnabled && (currentChat as any).privacyOverrides?.[myId]?.typing !== false;
                    const otherTypingEnabled = (currentChat as any).privacyOverrides?.[chat.user.id]?.typing !== false;
                    const mutualTypingEnabled = myTypingEnabled && otherTypingEnabled;
                    const myActivityHidden = hideActivityAndLastSeen || (currentChat as any)?.privacyOverrides?.[myId]?.hideActivity === true;
                    const otherActivityHidden = (currentChat as any)?.privacyOverrides?.[chat.user.id]?.hideActivity === true;
                    return mutualTypingEnabled && !myActivityHidden && !otherActivityHidden && Object.entries(currentChat.isTyping || {}).some(([uid, typing]) => {
                        if (uid === myId || !typing) return false;
                        const u = allUsers.find(user => user.id === uid);
                        return u ? isUserOnline(u.lastSeen || u.lastActive, u.isOnline) : true;
                    });
                })() && (
                    <div className="absolute -top-10 left-4 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl">
                            <div className="flex gap-1">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-[10px] font-bold text-white">جاري الكتابة...</span>
                        </div>
                    </div>
                )}
                
                {/* Reply Preview */}
                {replyingTo && (
                    <div className="absolute bottom-full left-0 right-0 bg-slate-800 border-t border-white/10 p-3 flex items-center justify-between z-40">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Reply size={20} className="text-emerald-500 shrink-0" />
                            <div className="flex-1 overflow-hidden border-r-4 border-emerald-500 pr-3">
                                <p className="text-emerald-500 text-xs font-bold mb-1">
                                    {(() => {
                                        const sender = allUsers.find(u => u.id === replyingTo.senderId);
                                        return replyingTo.senderId === myId || replyingTo.senderId === 'me' ? 'أنا' : (sender?.name || replyingTo.senderId);
                                    })()}
                                </p>
                                <p className="text-slate-300 text-sm truncate">{replyingTo.text || replyingTo.type}</p>
                            </div>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full shrink-0">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Forwarded Media Preview */}
                {forwardedMedia && (
                    <div className="absolute bottom-full left-0 right-0 bg-slate-900 border-t border-white/10 p-3 flex items-center justify-between z-[45]">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <ArrowLeft size={20} className="text-blue-500 shrink-0" />
                            <div className="flex-1 overflow-hidden border-r-4 border-blue-500 pr-3">
                                <p className="text-blue-500 text-xs font-bold mb-1">توجيه رسالة</p>
                                <div className="flex items-center gap-2">
                                    {forwardedMedia.type === 'image' && forwardedMedia.imageUrl && <img src={forwardedMedia.imageUrl} className="w-8 h-8 rounded object-cover" />}
                                    {forwardedMedia.type === 'video' && <div className="w-8 h-8 rounded bg-black flex items-center justify-center"><Play size={12} className="text-white" /></div>}
                                    {forwardedMedia.type === 'audio' && <Mic size={16} className="text-slate-400" />}
                                    <p className="text-slate-300 text-sm truncate">
                                        {forwardedMedia.type === 'image' ? 'صورة' : forwardedMedia.type === 'audio' ? 'رسالة صوتية' : forwardedMedia.type}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setForwardedMedia(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full shrink-0">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Audio File Preview */}
                {previewAudioFile && (
                    <div className="absolute bottom-full left-0 right-0 bg-slate-900 border-t border-white/10 p-3 flex items-center justify-between z-[45]">
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg">
                                <Music size={20} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-indigo-400 text-xs font-bold mb-1 truncate" dir="auto">{previewAudioFile.file.name}</p>
                                <audio src={previewAudioFile.url} controls className="h-8 w-full max-w-[300px] outline-none grayscale invert-[0.8]" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                            </div>
                        </div>
                        <button onClick={() => {
                            URL.revokeObjectURL(previewAudioFile.url);
                            setPreviewAudioFile(null);
                        }} className="p-2 text-slate-400 hover:text-white hover:bg-rose-500/20 rounded-full shrink-0 ml-2 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Staged Contact Preview Bar */}
                {stagedContactToSend && (
                    <div className="absolute bottom-full left-0 right-0 bg-slate-900 border-t border-emerald-500/30 p-3 flex items-center justify-between z-[45]">
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/40 shrink-0">
                                <img 
                                    src={stagedContactToSend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stagedContactToSend.id}`} 
                                    className="w-full h-full object-cover" 
                                    alt="" 
                                />
                            </div>
                            <div className="flex-1 overflow-hidden text-right">
                                <p className="text-emerald-400 text-xs font-bold mb-0.5 truncate flex items-center gap-1.5">
                                    <UserCheck size={14} className="text-emerald-400 shrink-0" />
                                    جهة اتصال محددة
                                </p>
                                <p className="text-white text-sm font-bold truncate">
                                    {stagedContactToSend.name || (stagedContactToSend as any).displayName || stagedContactToSend.id}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pr-2">
                            <button 
                                onClick={() => submitContact(stagedContactToSend)} 
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-md"
                            >
                                <Send size={12} /> إرسال
                            </button>
                            <button 
                                onClick={() => setStagedContactToSend(null)} 
                                className="p-2 text-slate-400 hover:text-white hover:bg-rose-500/20 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Media Selection Popup Menu */}
                {showMediaMenu && (
                    <div className="absolute bottom-20 right-16 bg-white rounded-2xl shadow-2xl p-2 flex flex-col gap-1 w-32 animate-in slide-in-from-bottom duration-200 z-[60]">
                        <button 
                            onClick={() => setShowCamera(true)} 
                            className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-xl transition-colors text-black"
                        >
                            <Camera size={18} className="text-red-500" />
                            <span className="text-xs font-bold">{getTranslation(lang, "camera", "Camera")}</span>
                        </button>
                        <div className="h-[1px] bg-gray-100 w-full"></div>
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-xl transition-colors text-black"
                        >
                            <ImageIcon size={18} className="text-emerald-500" />
                            <span className="text-xs font-bold">{getTranslation(lang, "gallery", "Gallery")}</span>
                        </button>
                    </div>
                )}

                {/* MORE ACTIONS MENU (Plus Button Popup) */}
                {showMoreMenu && (
                    <div className="absolute bottom-20 right-4 bg-[#0d1117] border border-white/10 rounded-[1.5rem] p-3 shadow-2xl flex flex-col gap-2 w-56 animate-in slide-in-from-bottom duration-200 z-[65]">
                        <button 
                            onClick={() => {
                                setShowAIImageModal(true);
                                setShowMoreMenu(false);
                            }} 
                            className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-white group"
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                <Sparkles size={16} />
                            </div>
                            <span className="text-xs font-bold truncate">{getTranslation(lang, "aiPhotoGenerator", "AI Image Generator")}</span>
                        </button>
                        <button onClick={handleOpenLocationMenu} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-white group">
                            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                <MapPin size={16} />
                            </div>
                            <span className="text-xs font-bold">{getTranslation(lang, "location", "Location")}</span>
                        </button>
                        <button onClick={() => docInputRef.current?.click()} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-white group">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <FileText size={16} />
                            </div>
                            <span className="text-xs font-bold">{getTranslation(lang, "document", "Document")}</span>
                        </button>
                        <button onClick={() => audioFileInputRef.current?.click()} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-white group">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                <Music size={16} />
                            </div>
                            <span className="text-xs font-bold">{getTranslation(lang, "audioMusic", "Audio / Music")}</span>
                        </button>
                        <button onClick={handleOpenPollCreator} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-white group">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                                <BarChart3 size={16} />
                            </div>
                            <span className="text-xs font-bold">{getTranslation(lang, "createPoll", "Create Poll")}</span>
                        </button>
                        <button onClick={handleOpenContactPicker} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-white group">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <Users size={16} />
                            </div>
                            <span className="text-xs font-bold">{getTranslation(lang, "contacts", "Contacts")}</span>
                        </button>
                    </div>
                )}

                {/* LOCATION MODAL */}
                {showLocationModal && (
                    <div className="absolute inset-x-4 bottom-24 bg-[#0d1117] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 z-[70]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-white flex items-center gap-2"><MapPin className="text-rose-500" size={18} /> {getTranslation(lang, "location", "Location")}</h3>
                            <button 
                                onClick={() => window.open('https://www.google.com/maps', '_blank')}
                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                            >
                                <Globe size={12} /> {getTranslation(lang, "openGoogleMaps", "Open Google Maps")}
                            </button>
                        </div>
                        
                        {locationError && (
                            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs text-center">
                                {locationError}
                            </div>
                        )}

                        {pendingLocation ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center space-y-1.5">
                                    <p className="font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                                        <Check size={16} /> {getTranslation(lang, "locationSuccess", "Device location retrieved successfully!")}
                                    </p>
                                    {pendingLocation.address && (
                                        <p className="text-xs font-bold text-slate-100 bg-white/5 py-1.5 px-3 rounded-lg border border-white/10 flex items-center justify-center gap-1">
                                            <MapPin size={14} className="text-rose-400 shrink-0" />
                                            <span className="truncate">{pendingLocation.address}</span>
                                        </p>
                                    )}
                                    <p className="text-xs font-mono text-slate-300">
                                        {pendingLocation.lat.toFixed(6)}, {pendingLocation.lng.toFixed(6)}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {pendingLocation.live ? getTranslation(lang, 'liveLocationRealtime', 'Live Location (Real-time)') : getTranslation(lang, 'currentLocationFixed', 'Current Location (Fixed)')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={`https://www.google.com/maps?q=${pendingLocation.lat},${pendingLocation.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-3 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/20"
                                    >
                                        <Globe size={14} /> {getTranslation(lang, "previewInGoogle", "Preview in Maps")}
                                    </a>
                                    <button
                                        onClick={confirmSendLocation}
                                        className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
                                    >
                                        <Send size={14} /> {getTranslation(lang, "sendDirect", "Send Direct")}
                                    </button>
                                </div>

                                <button 
                                    onClick={confirmSendLocation}
                                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs"
                                >
                                    <Navigation size={16} /> {getTranslation(lang, "sendLocation", "Send Location")} ({pendingLocation.live ? getTranslation(lang, "live", "Live") : getTranslation(lang, "fixed", "Fixed")})
                                </button>
                                <button 
                                    onClick={() => setPendingLocation(null)}
                                    className="w-full py-3 rounded-xl bg-slate-800/80 text-slate-400 font-bold hover:bg-slate-700 transition-colors text-xs"
                                >
                                    {getTranslation(lang, "reselect", "Reselect")}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* ... existing buttons ... */}
                                <button 
                                    onClick={() => handleSendLocationType(false)}
                                    disabled={isGettingLocation}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group text-start disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                        {isGettingLocation ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{getTranslation(lang, "openLocationNow", "Share Current Location")}</h4>
                                        <p className="text-[10px] text-slate-500">{isGettingLocation ? getTranslation(lang, "gettingLocation", "Locating...") : getTranslation(lang, "accurateFixed", "Accurate • Fixed")}</p>
                                    </div>
                                </button>

                                {chatSettings.liveLocation && (
                                    <button 
                                        onClick={() => handleSendLocationType(true)}
                                        disabled={isGettingLocation}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group text-start disabled:opacity-50"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                            <Navigation size={20} className={isGettingLocation ? "animate-spin" : "animate-pulse"} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{getTranslation(lang, "shareLiveLocation", "Share Live Location")}</h4>
                                            <p className="text-[10px] text-slate-500">{getTranslation(lang, "updatedOnMove", "Updates in real-time as you move")}</p>
                                        </div>
                                    </button>
                                )}
                                <button onClick={() => setShowLocationModal(false)} className="w-full mt-4 py-3 bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-700">{getTranslation(lang, "cancel", "Cancel")}</button>
                            </div>
                        )}
                    </div>
                )}

                {/* RINGTONE MODAL */}
                {showRingtoneModal && (
                    <div className="absolute inset-0 bg-black/80 z-[60] flex items-center justify-center">
                        <div className="bg-[#1a1c22] border border-white/10 rounded-2xl w-[90%] max-w-sm p-4 animate-in zoom-in-95 duration-200">
                            <RingtonePicker 
                                lang={lang} 
                                currentRingtoneUrl={typeof chatSettings.sounds.audioCall === 'string' ? chatSettings.sounds.audioCall : 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'} 
                                onSelect={(url) => {
                                    const newSettings = { ...chatSettings, sounds: { ...chatSettings.sounds, audioCall: url } };
                                    setChatSettings(newSettings);
                                    localStorage.setItem('hisee_chat_settings', JSON.stringify(newSettings));
                                    window.dispatchEvent(new Event('chatSettingsChanged'));
                                    setShowRingtoneModal(false);
                                }}
                                onBack={() => setShowRingtoneModal(false)}
                            />
                        </div>
                    </div>
                )}

                {isGettingLocation && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-2xl relative z-10">
                                <MapPin size={40} className="text-emerald-500 animate-bounce" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-white font-black text-lg mb-1">{getTranslation(lang, "locatingYou", "Locating you...")}</h3>
                            <p className="text-slate-400 text-xs">{getTranslation(lang, "pleaseWaitLocation", "Please wait for accurate coordinates...")}</p>
                        </div>
                    </div>
                )}

                {/* POLL CREATOR MODAL */}
                {showPollModal && (
                    <div className="absolute inset-x-4 bottom-14 bg-[#0d1117] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 z-[70]">
                        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2"><BarChart2 className="text-yellow-500" size={18} /> {getTranslation(lang, "createPoll", "Create Poll")}</h3>
                        <div className="space-y-3">
                            <input 
                                value={pollQuestion}
                                onChange={(e) => setPollQuestion(e.target.value)}
                                placeholder={getTranslation(lang, "askQuestionPlaceholder", "Ask your question here...")}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-yellow-500/50"
                            />
                            <div className="space-y-2">
                                {pollOptions.map((opt, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input 
                                            value={opt}
                                            onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                                            placeholder={`خيار ${idx + 1}`}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-yellow-500/30"
                                        />
                                        {pollOptions.length > 2 && (
                                            <button onClick={() => handleRemovePollOption(idx)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg"><MinusCircle size={16} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {pollOptions.length < 5 && (
                                <button onClick={handleAddPollOption} className="text-xs font-bold text-emerald-500 flex items-center gap-1 hover:text-emerald-400">
                                    <PlusCircle size={14} /> {getTranslation(lang, "addOption", "Add Option")}
                                </button>
                            )}
                            <div className="flex gap-2 mt-4 pt-2 border-t border-white/5">
                                <button onClick={() => setShowPollModal(false)} className="flex-1 py-3 bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-700">{getTranslation(lang, "cancel", "Cancel")}</button>
                                <button onClick={submitPoll} className="flex-[2] py-3 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl text-xs font-black text-black shadow-lg hover:scale-[1.02] transition-transform">إنشاء</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTACT PICKER MODAL */}
                {showContactModal && (
                    <div className="absolute inset-x-4 bottom-14 bg-[#0d1117] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 z-[70] max-h-[60vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-white flex items-center gap-2"><Users className="text-emerald-500" size={18} /> {getTranslation(lang, "selectContact", "Select Contact")}</h3>
                            <button onClick={() => setShowContactModal(false)} className="bg-white/5 p-1 rounded-full text-slate-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                            {availableContacts.map(contact => (
                                <div 
                                    key={contact.id}
                                    onClick={() => handleSelectContactToStage(contact)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10"
                                >
                                    <img src={contact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`} className="w-10 h-10 rounded-full border border-white/10 shrink-0" alt="" />
                                    <div className="text-right flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{contact.name || (contact as any).displayName || contact.id}</h4>
                                        <p className="text-[10px] text-slate-500 truncate">ID: {contact.id}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectContactToStage(contact);
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-white/5 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors text-[11px] font-bold flex items-center gap-1"
                                            title={getTranslation(lang, "copyToInput", "Copy to Input")}
                                        >
                                            <UserCheck size={14} /> {getTranslation(lang, "select", "Select")}
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                submitContact(contact);
                                            }}
                                            className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                                            title={getTranslation(lang, "sendDirect", "Send Direct")}
                                        >
                                            <Send size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {availableContacts.length === 0 && <p className="text-center text-[10px] text-slate-500 py-4">{getTranslation(lang, "noContactsFound", "No contacts found")}</p>}
                        </div>
                    </div>
                )}

                {/* EMOJI STORE & PICKER (Comprehensive) */}
                {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 right-0 h-72 bg-[#0d1117] border-t border-white/10 z-[60] animate-in slide-in-from-bottom duration-300 flex flex-col shadow-2xl">
                        {/* Store Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                            <h3 className="text-xs font-black text-white flex items-center gap-2">
                                <Smile className="text-yellow-400" size={16} />
                                متجر الإيموجي
                            </h3>
                            <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"><X size={16} /></button>
                        </div>
                        
                        {/* Tabs */}
                        <div className="flex justify-around p-2 bg-black/20">
                            {EMOJI_CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => setActiveEmojiTab(cat.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${activeEmojiTab === cat.id ? 'bg-white/10 text-yellow-400 border border-yellow-400/30' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {cat.icon} {cat.label}
                                </button>
                            ))}
                        </div>


                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 no-scrollbar bg-black/40">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeEmojiTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    {activeEmojiTab === 'recent' ? (
                                        <div className="grid grid-cols-8 gap-2">
                                            {recentItems.length > 0 ? (
                                                recentItems.map((item, idx) => (
                                                    <motion.button 
                                                        key={`recent-${idx}`} 
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            if (item.type === 'emoji') {
                                                                setInput(prev => prev + item.value);
                                                            } else {
                                                                handleSendMedia('sticker', item.value);
                                                            }
                                                        }}
                                                        className="flex items-center justify-center hover:bg-white/10 rounded-lg p-1 transition-colors"
                                                    >
                                                        {item.type === 'emoji' ? (
                                                            <span className="text-2xl">{item.value}</span>
                                                        ) : (
                                                            <img src={item.value} className="w-8 h-8 object-contain" alt="recent" />
                                                        )}
                                                    </motion.button>
                                                ))
                                            ) : (
                                                <div className="col-span-8 flex flex-col items-center justify-center py-8 text-slate-500">
                                                    <Clock size={32} className="mb-2 opacity-20" />
                                                    <p className="text-[10px]">لا توجد عناصر مستخدمة مؤخراً</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : activeEmojiTab === 'faces' ? (
                                        <div className="grid grid-cols-8 gap-2">
                                            {MOCK_EMOJIS.map((emoji, idx) => (
                                                <motion.button 
                                                    key={idx} 
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        setInput(prev => prev + emoji);
                                                        addToRecent('emoji', emoji);
                                                    }}
                                                    className="text-2xl hover:bg-white/10 rounded-lg p-1 transition-colors"
                                                >
                                                    {emoji}
                                                </motion.button>
                                            ))}
                                        </div>
                                    ) : activeEmojiTab === 'gifs' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {MOCK_GIFS.map((gif, idx) => (
                                                <motion.button 
                                                    key={idx} 
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
                                                    animate={{ 
                                                        opacity: 1, 
                                                        scale: 1, 
                                                        rotate: 0,
                                                        y: [0, -4, 0]
                                                    }}
                                                    transition={{ 
                                                        opacity: { delay: idx * 0.05 },
                                                        scale: { delay: idx * 0.05 },
                                                        rotate: { delay: idx * 0.05 },
                                                        y: { 
                                                            duration: 2 + (idx % 3) * 0.5, 
                                                            repeat: Infinity, 
                                                            ease: "easeInOut",
                                                            delay: idx * 0.1
                                                        }
                                                    }}
                                                    whileHover={{ 
                                                        scale: 1.05, 
                                                        zIndex: 10,
                                                        boxShadow: "0 0 25px rgba(59, 130, 246, 0.4)"
                                                    }}
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={() => handleSendMedia('image', gif)}
                                                    className="relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/80 transition-all group bg-slate-800/50"
                                                >
                                                    <img src={gif} className="w-full h-full object-cover" alt="GIF" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 duration-300">
                                                        <div className="bg-blue-600 p-1.5 rounded-lg shadow-xl border border-white/20">
                                                            <Zap size={14} className="text-white fill-white" />
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    ) : activeEmojiTab === 'premium' ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {MOCK_PREMIUM_STICKERS.map((sticker, idx) => (
                                                <motion.button 
                                                    key={idx} 
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    whileHover={{ scale: 1.15, rotate: [0, -3, 3, 0] }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleSendMedia('sticker', sticker)}
                                                    className="p-3 hover:bg-white/10 rounded-2xl transition-all group"
                                                >
                                                    <img 
                                                        src={sticker} 
                                                        className="w-28 h-28 object-contain mx-auto drop-shadow-2xl group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                                                        alt="premium sticker" 
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </motion.button>
                                            ))}
                                        </div>
                                    ) : activeEmojiTab === 'ai' ? (
                                        <div className="flex flex-col h-full gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-purple-400">
                                                    <Sparkles size={16} />
                                                    <span className="font-bold text-xs">{getTranslation(lang, "aiStickerMaker", "Smart AI Sticker Maker")}</span>
                                                </div>
                                                <div className="bg-purple-500/20 px-2 py-1 rounded-full text-purple-300 text-[10px] font-bold">
                                                    {dailyQuota} محاولات متبقية
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text"
                                                    value={aiPrompt}
                                                    onChange={(e) => setAiPrompt(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleGenerateAiSticker();
                                                    }}
                                                    placeholder={getTranslation(lang, "stickerPromptPlaceholder", "Sticker prompt (e.g. laughing cat)")}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
                                                    disabled={isGeneratingAiSticker || dailyQuota <= 0}
                                                />
                                                <button
                                                    onClick={handleGenerateAiSticker}
                                                    disabled={!aiPrompt.trim() || isGeneratingAiSticker || dailyQuota <= 0}
                                                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                                                >
                                                    {isGeneratingAiSticker ? <Loader2 size={16} className="animate-spin" /> : getTranslation(lang, 'generate', 'Generate')}
                                                </button>
                                            </div>

                                            {aiError && (
                                                <div className="text-rose-400 text-[10px] px-1 bg-rose-500/10 py-1.5 rounded-lg border border-rose-500/20">
                                                    ⚠️ {aiError}
                                                </div>
                                            )}

                                            <div className="flex-1 overflow-y-auto no-scrollbar pt-2 border-t border-white/5">
                                                {generatedStickers.length > 0 ? (
                                                    <div className="grid grid-cols-4 gap-3">
                                                        {generatedStickers.map((sticker, idx) => (
                                                            <motion.button 
                                                                key={idx}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleSendMedia('sticker', sticker)}
                                                                className="hover:bg-white/5 rounded-xl p-2 transition-all relative group"
                                                            >
                                                                <img src={sticker} className="w-16 h-16 object-contain mx-auto drop-shadow-xl" alt="AI sticker" />
                                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-purple-500 w-4 h-4 rounded-full flex items-center justify-center shadow-lg">
                                                                    <Sparkles size={8} className="text-white" />
                                                                </div>
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-[120px] text-slate-500 gap-2 opacity-50">
                                                        <Sparkles size={24} />
                                                        <p className="text-[10px]">{getTranslation(lang, "writePromptSticker", "Enter a description to generate a sticker")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-4">
                                            {/* Default Stickers */}
                                            {MOCK_STICKERS.map((sticker, idx) => (
                                                <motion.button 
                                                    key={idx} 
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleSendMedia('sticker', sticker)}
                                                    className="hover:bg-white/5 rounded-xl p-2 transition-all"
                                                >
                                                    <img src={sticker} className="w-16 h-16 object-contain mx-auto drop-shadow-xl" alt="sticker" />
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                )}

            {/* Chat Translator Options - خيارات إضافية للمترجم الذكي فوق شريط الكتابة مباشرة */}
            {showTranslatorBar && (
                <div className="px-2 mb-2 w-full max-w-full">
                    <ChatTranslatorBar 
                        defaultActive={isTranslatorActive}
                        mode={translatorMode}
                        targetLanguage={translatorLang}
                        sourceLanguage={translatorSourceLang}
                        onToggleActive={handleToggleTranslatorActive}
                        onModeChange={handleTranslatorModeChange}
                        onLanguageChange={(lang) => {
                            setTranslatorLang(lang);
                            setCachedTranslations({});
                            setCachedVoiceData({});
                        }}
                        onSourceLanguageChange={(src) => {
                            setTranslatorSourceLang(src);
                            setCachedTranslations({});
                            setCachedVoiceData({});
                        }}
                        onClose={() => setShowTranslatorBar(false)}
                        onClearCache={() => {
                            setCachedTranslations({});
                            setCachedVoiceData({});
                        }}
                    />
                </div>
            )}

            {/* Smart Input Translation Box - يظهر عند كتابة نص مع إمكانية الترجمة اليدوية فوراً */}
            {(isTranslatorActive || showTranslatorBar) && input.trim() && !isRecording && (
                <div id="smart-input-translation-card" className="px-2 mb-1.5 w-full max-w-full">
                    <div className="bg-[#111622]/95 backdrop-blur-md border border-indigo-500/40 rounded-xl px-3 py-2 shadow-2xl flex flex-col gap-1 transition-all">
                        <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold border-b border-white/10 pb-1">
                            <span className="flex items-center gap-1.5">
                                <Languages size={13} className="text-indigo-400" />
                                <span>{getTranslation(lang, "smartTranslator", "Smart Bidirectional Translation")} ({activePairLanguages.targetObj.flag} {activePairLanguages.targetObj.name}):</span>
                                {isTranslatingInput && <span className="animate-pulse text-amber-400 font-normal">{getTranslation(lang, "translating", "Translating...")}</span>}
                            </span>
                            <div className="flex items-center gap-1.5">
                                {!translatedInput && (
                                    <button
                                        type="button"
                                        id="manual-translate-input-action-btn"
                                        onClick={handleManualTranslateInput}
                                        disabled={isTranslatingInput}
                                        className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-md transition-all active:scale-95 shadow flex items-center gap-1"
                                        title={getTranslation(lang, "sendTranslationRequest", "Send translation request")}
                                    >
                                        <span>{getTranslation(lang, "translateTextNow", "Translate Text Now 👆")}</span>
                                    </button>
                                )}
                                {translatedInput && (
                                    <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        {getTranslation(lang, "translatedCheck", "Translated ✓")}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-white text-xs select-text font-medium leading-relaxed py-0.5" dir="auto">
                            {isTranslatingInput ? 'جاري الترجمة...' : (translatedInput || (translatorMode === 'auto' ? 'تتم الترجمة تلقائياً...' : 'اضغط لترجمة النص قبل الإرسال 👆'))}
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-1 px-2 pb-0">
                    <div className={`flex items-center justify-between gap-1 max-[360px]:gap-0.5 bg-white/5 rounded-xl px-1.5 py-0 w-full max-w-full box-border relative ${!canSendMessage ? 'opacity-50' : ''}`}>
                        {isRecording && !isLockingRecording && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                                animate={{ opacity: 1, y: -80, scale: 1 }}
                                className="fixed bottom-[20px] left-[20px] flex flex-col items-center gap-3 z-[999999] pointer-events-none"
                            >
                                <motion.div 
                                    animate={{ scale: [1, 1.05, 1] }}
                                    className={`flex flex-col items-center bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)] p-2 rounded-2xl border border-white/20 pointer-events-auto p-1.5`}
                                >
                                    <ChevronUp size={14} className="text-white" />
                                </motion.div>

                                <div className="flex flex-col items-center gap-1.5 py-2">
                                    {[...Array(4)].map((_, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={!isRecordingPaused ? { 
                                                opacity: [0, 1, 0.4],
                                                y: [-10, -30],
                                                scale: [0.8, 1.2, 0.8]
                                            } : { opacity: 0.2, scale: 0.8 }}
                                            transition={{ 
                                                repeat: Infinity, 
                                                duration: 1.8, 
                                                delay: i * 0.45,
                                                ease: "easeOut"
                                            }}
                                            className="w-12 h-4 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent relative"
                                            style={{ 
                                                clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                                                transform: 'rotate(180deg)'
                                            }}
                                        />
                                    ))}
                                </div>
                                
                                <div className="flex flex-col items-center">
                                    <motion.div
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        <ChevronUp size={16} className="text-blue-400" />
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {isRecording ? (
                            <div className="flex-1 min-w-0 flex items-center gap-2 max-[360px]:gap-1 transition-all overflow-hidden mr-2 touch-none relative">
                                {/* Swipe right to delete indicator */}
                                <div className="absolute -top-9 left-0 right-0 flex items-center justify-center pointer-events-none z-50 animate-in fade-in">
                                    <div className="bg-black/85 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-center">
                                        <span className="text-amber-400 animate-pulse">➡️</span>
                                        <span>{getTranslation(lang, "swipeToDelete", "Swipe to Delete")}</span>
                                    </div>
                                </div>
                                {swipeX > 50 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                        animate={{ opacity: 1, scale: 1.2, y: 0, rotate: [0, -15, 15, 0] }}
                                        className="absolute bottom-16 right-6 z-[60]"
                                    >
                                        <Trash2 size={48} className="text-rose-500" />
                                    </motion.div>
                                )}
                                <div className={`flex-1 flex items-center gap-2 ${!isRecordingPaused ? 'animate-pulse' : ''}`}>
                                    <motion.button
                                        type="button"
                                        animate={swipeX > 35 ? { scale: 1.3, color: '#f43f5e' } : { scale: 1 }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            cancelRecording();
                                        }}
                                        className={`w-10 h-10 max-[360px]:w-8 max-[360px]:h-8 rounded-full flex items-center justify-center shadow-lg transition-colors shrink-0 ${swipeX > 35 ? 'bg-rose-600 text-white shadow-rose-500/40' : 'bg-white/10 text-slate-400'}`}
                                    >
                                        <Trash2 size={20} strokeWidth={2.5} />
                                    </motion.button>
                                    
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <span className={`text-xs font-black tracking-wider truncate transition-colors flex items-center gap-1.5 ${swipeX > 35 ? 'text-rose-500' : 'text-slate-400'}`}>
                                            {swipeX > 35 ? (
                                                getTranslation(lang, 'swipeToDelete', 'Swipe to Delete')
                                            ) : isLockingRecording ? (
                                                <>
                                                    <span>{isPreviewPlaying ? 'إيقاف واكمال' : 'متوقف مؤقتاً'}</span>
                                                    <span className="bg-white/10 text-slate-300 font-mono text-[10px] px-1.5 py-0.5 rounded-md">
                                                        {formatDuration(recordingDuration)}
                                                    </span>
                                                </>
                                            ) : (
                                                formatDuration(recordingDuration)
                                            )}
                                        </span>
                                        {isLockingRecording ? (
                                            <div className="flex items-end gap-1 h-6 overflow-hidden mt-1.5 mb-1 bg-black/10 rounded-lg px-2 py-0.5 max-w-[200px]">
                                                {previewLevels.map((level, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-[3px] rounded-full shrink-0 transition-all duration-75 ${isPreviewPlaying ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-slate-600'}`}
                                                        style={{ 
                                                            height: `${level}%`, 
                                                        }}
                                                    ></div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-end gap-0.5 h-4 overflow-hidden">
                                                {[...Array(10)].map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 rounded-full shrink-0 transition-colors ${isRecordingPaused ? '' : 'animate-bounce'} ${swipeX > 35 ? 'bg-rose-500' : 'bg-slate-500'}`}
                                                        style={{ 
                                                            height: `${Math.random() * 80 + 20}%`, 
                                                            animationDuration: `${Math.random() * 0.5 + 0.5}s`, 
                                                            animationDelay: `${i * 0.05}s`
                                                        }}
                                                    ></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Right Side Icons Group (Back, Plus, Emoji, Media, Translator) - Responsive sizing */}
                                <div className="flex items-center gap-0.5 max-[400px]:gap-0 shrink-0 pb-0">
                                    <button type="button" onClick={handleHeaderBack} className="p-1 max-[380px]:p-0.5 text-white hover:bg-white/10 rounded-xl transition-all shrink-0"><ArrowLeft size={16} className="rotate-[270deg] max-[380px]:w-3.5 max-[380px]:h-3.5" /></button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                        disabled={!canSendMessage}
                                        className={`p-1 max-[380px]:p-0.5 transition-all shrink-0 ${!canSendMessage ? 'opacity-50 cursor-not-allowed' : ''} ${showMoreMenu ? 'text-white bg-white/10 rounded-xl' : 'text-white hover:bg-white/10 rounded-xl hover:scale-105'}`}
                                    >
                                        <Plus size={18} strokeWidth={2.5} className="max-[380px]:w-4 max-[380px]:h-4" />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        disabled={!canSendMessage}
                                        className={`p-1 max-[380px]:p-0.5 transition-all shrink-0 ${!canSendMessage ? 'opacity-50 cursor-not-allowed' : ''} ${showEmojiPicker ? 'text-yellow-400 bg-white/10 rounded-xl' : 'text-yellow-400 hover:text-yellow-300 hover:scale-105'}`}
                                    >
                                        <Smile size={18} strokeWidth={2.5} className="max-[380px]:w-4 max-[380px]:h-4" />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowMediaMenu(!showMediaMenu)}
                                        disabled={!canSendMessage}
                                        className={`p-1 max-[380px]:p-0.5 transition-colors shrink-0 ${!canSendMessage ? 'opacity-50 cursor-not-allowed' : ''} ${showMediaMenu ? 'text-white bg-white/10 rounded-xl' : 'text-white hover:bg-white/10 rounded-xl'}`}
                                        title={getTranslation(lang, "filesAndMedia", "Files & Media")}
                                    >
                                        <ImageIcon size={18} className="max-[380px]:w-4 max-[380px]:h-4" />
                                    </button>
                                    {/* Translation Button next to files on the typing engine */}
                                    <button
                                        id="chat-input-translator-btn"
                                        type="button"
                                        onClick={() => {
                                            setShowTranslatorBar(prev => {
                                                const next = !prev;
                                                if (next && !isTranslatorActive) {
                                                    handleToggleTranslatorActive(true);
                                                }
                                                return next;
                                            });
                                        }}
                                        disabled={!canSendMessage}
                                        className={`p-1 max-[380px]:p-0.5 transition-all shrink-0 rounded-xl ${
                                            !canSendMessage ? 'opacity-50 cursor-not-allowed' : ''
                                        } ${
                                            showTranslatorBar
                                                ? 'text-indigo-400 bg-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                                                : isTranslatorActive
                                                ? 'text-indigo-400 bg-white/10'
                                                : 'text-white hover:bg-white/10 hover:scale-105'
                                        }`}
                                        title={getTranslation(lang, "translatorOptions", "Smart Translator Options")}
                                    >
                                        <Languages size={18} className={`max-[380px]:w-4 max-[380px]:h-4 ${isTranslatorActive ? 'animate-pulse text-indigo-300' : ''}`} />
                                    </button>
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-center px-1">
                                    <textarea 
                                        ref={textareaRef}
                                        value={
                                            isBlocked 
                                                ? (iBlockedThem ? 'الغاء الحظر لتواصل' : 'دردشة مع هذا شخص معطل حاليا يمكنكم دردشة في حال اصلاح') 
                                                : input
                                        }
                                        disabled={isBlocked || !canSendMessage}
                                        onChange={(e) => {
                                            if (!isBlocked && canSendMessage) {
                                                setInput(e.target.value);
                                                handleTyping();
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && chatSettings.enterToSend) {
                                                e.preventDefault();
                                                if (!isBlocked && canSendMessage) {
                                                    if ((isTranslatorActive || showTranslatorBar) && translatedInput) {
                                                        handleSendMessage(true, translatedInput);
                                                    } else {
                                                        handleSendMessage();
                                                    }
                                                }
                                            }
                                        }}
                                        placeholder={isBlocked ? '' : getTranslation(lang, 'typeMessage', 'Type a message...')}
                                        className={`w-full min-w-0 bg-transparent border-none outline-none text-white text-sm max-[380px]:text-xs min-h-[32px] max-h-[100px] px-1 py-1 chat-input resize-none text-right leading-relaxed ${isBlocked || !canSendMessage ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        dir="auto"
                                        autoComplete={chatSettings.privacy.incognitoKeyboard ? "off" : "on"}
                                        autoCorrect={chatSettings.privacy.incognitoKeyboard ? "off" : "on"}
                                        spellCheck={!chatSettings.privacy.incognitoKeyboard}
                                    />
                                </div>
                            </>
                        )}
                        
                        <div className="shrink-0 flex items-center gap-1 max-[380px]:gap-0.5 pb-0">
                            {(input.trim() || previewAudioFile || (forwardedMedia && forwardedMedia.type !== 'text')) && !isRecording ? (
                                (isTranslatorActive || showTranslatorBar) && input.trim() && !previewAudioFile && !(forwardedMedia && forwardedMedia.type !== 'text') ? (
                                    <div className="flex items-center gap-1 max-[380px]:gap-0.5">
                                        <button 
                                            id="send-translated-msg-btn"
                                            type="button"
                                            onClick={(e) => { 
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                                handleSendMessage(true, translatedInput || input); 
                                            }} 
                                            disabled={!canSendMessage}
                                            title={getTranslation(lang, "sendTranslatedText", "Send translated text directly")}
                                            className={`px-2.5 py-1.5 max-[420px]:px-1.5 max-[420px]:py-1 rounded-xl text-white shadow-lg shrink-0 border transition-all flex items-center gap-1 text-xs max-[380px]:text-[10px] font-semibold whitespace-nowrap ${!canSendMessage ? 'bg-indigo-600/40 text-white/50 cursor-not-allowed border-indigo-500/20' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/40 shadow-indigo-600/30 active:scale-95'}`}
                                        >
                                            <Send size={13} className="shrink-0" />
                                            <span className="hidden min-[500px]:inline">إرسال </span>
                                            <span>{getTranslation(lang, "translated", "Translated")}</span>
                                            <span className="shrink-0 text-[10px]">{activePairLanguages.targetObj.flag}</span>
                                        </button>
                                        <button 
                                            id="send-original-msg-btn"
                                            type="button"
                                            onClick={(e) => { 
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                                handleSendMessage(false, input); 
                                            }} 
                                            disabled={!canSendMessage}
                                            title={getTranslation(lang, "sendOriginalText", "Send original text")}
                                            className="px-2 py-1.5 max-[420px]:px-1.5 max-[420px]:py-1 rounded-xl text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 text-xs max-[380px]:text-[10px] shrink-0 transition-all font-normal whitespace-nowrap active:scale-95"
                                        >
                                            <span>{getTranslation(lang, "original", "Original")}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendMessage(); }} 
                                        disabled={!canSendMessage}
                                        className={`p-2 max-[380px]:p-1.5 rounded-xl text-white shadow-lg shrink-0 border transition-all active:scale-90 ${!canSendMessage ? 'bg-black/50 text-white/50 cursor-not-allowed border-white/10' : 'bg-black hover:bg-zinc-900 border-white/20 shadow-black/40'}`}
                                    >
                                        <Send size={18} className="rotate-0 max-[380px]:w-4 max-[380px]:h-4" />
                                    </button>
                                )
                            ) : (isRecording && isLockingRecording) ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {isRecordingPaused ? (
                                        <>
                                            <button 
                                                type="button" 
                                                title={getTranslation(lang, "listenToRecording", "Listen to recording")}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    previewRecording();
                                                }}
                                                className={`p-2 rounded-full transition-all shrink-0 flex items-center justify-center w-[38px] h-[38px] max-[380px]:w-[34px] max-[380px]:h-[34px] ${isPreviewPlaying ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                            >
                                                {isPreviewPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="text-white" />}
                                            </button>
                                            <button 
                                                type="button" 
                                                title={getTranslation(lang, "resumeRecording", "Resume recording")}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    resumeRecording();
                                                }}
                                                className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 transition-all shrink-0 flex items-center justify-center w-[38px] h-[38px] max-[380px]:w-[34px] max-[380px]:h-[34px] active:scale-95"
                                            >
                                                <Mic size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            type="button" 
                                            title={getTranslation(lang, "pauseRecording", "Pause recording")}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                pauseRecording();
                                            }}
                                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shrink-0 flex items-center justify-center w-[38px] h-[38px] max-[380px]:w-[34px] max-[380px]:h-[34px] active:scale-95"
                                        >
                                            <Pause size={16} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        title={getTranslation(lang, "sendVoiceRecording", "Send voice recording")}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            sendRecording(undefined, true);
                                        }}
                                        className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all shrink-0 flex items-center justify-center w-[38px] h-[38px] max-[380px]:w-[34px] max-[380px]:h-[34px] active:scale-95"
                                    >
                                        <Send size={16} className="-rotate-45" />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    type="button"
                                    title={getTranslation(lang, "recordVoiceMessage", "Record voice message")}
                                    onContextMenu={(e) => e.preventDefault()}
                                    onPointerDown={(e) => {
                                        if (canSendMessage && !isRecording) {
                                            setIsMicHolding(true);
                                            startRecording(e);
                                        }
                                    }}
                                    disabled={!canSendMessage}
                                    className={`p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all shrink-0 relative z-50 flex items-center justify-center w-[40px] h-[40px] max-[380px]:w-[36px] max-[380px]:h-[36px] select-none touch-none ${!canSendMessage ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                >
                                    {/* تأثير الترددات والأشعة الدائرية البصرية باللون الأبيض عند الضغط أو أثناء التسجيل */}
                                    {(isMicHolding || isRecording) && (
                                        <>
                                            <span className="absolute -inset-1 rounded-full border-2 border-white/80 animate-ping pointer-events-none" />
                                            <span className="absolute -inset-2.5 rounded-full border border-white/50 animate-pulse pointer-events-none" />
                                            <span className="absolute -inset-4 rounded-full border border-white/30 animate-ping [animation-duration:1.5s] pointer-events-none" />
                                        </>
                                    )}

                                    <AnimatePresence>
                                        {isFlyingMic && (
                                            <motion.div
                                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                                animate={{ 
                                                    x: Math.max(160, flyingMicX + 120),
                                                    y: -15,
                                                    opacity: 0,
                                                    scale: 0.2,
                                                    rotate: 360
                                                }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                            >
                                                <Mic size={20} fill="#000000" className="text-white" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* ميكروفون مدمج باللونين الأبيض والأسود بشكل بسيط وأنيق */}
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="shrink-0 transition-transform duration-150 select-none pointer-events-none"
                                    >
                                        {/* رأس الميكروفون بالأسود مع تحديد أبيض ناصع */}
                                        <path 
                                            d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" 
                                            fill="#000000" 
                                            stroke="#ffffff" 
                                            strokeWidth="1.8"
                                        />
                                        {/* القوس المحيط بالأبيض */}
                                        <path 
                                            d="M19 10v2a7 7 0 0 1-14 0v-2" 
                                            stroke="#ffffff" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                        />
                                        {/* عمود الميكروفون بالأبيض */}
                                        <line x1="12" y1="19" x2="12" y2="22" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                                        {/* القاعدة بالأبيض */}
                                        <line x1="8" y1="22" x2="16" y2="22" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
            </div>

            
            {showClearChatMenu && (
                <div 
                    className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setShowClearChatMenu(false)}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: -330 }}
                        exit={{ opacity: 0, scale: 0.9, y: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="bg-[#0d1117] border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with Title and Close Button */}
                        <div className="flex items-center justify-between mb-4 shrink-0 pb-2 border-b border-white/5">
                            <h2 className="text-white font-bold text-base flex items-center gap-2">
                                <Trash2 size={18} className="text-rose-500" /> 
                                <span>{getTranslation(lang, "customClearMessages", "Custom Clear Messages")}</span>
                            </h2>
                            <button 
                                onClick={() => setShowClearChatMenu(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Options list */}
                        <div className="flex flex-col gap-2 mb-4 overflow-y-auto shrink overscroll-contain pb-2">
                            {[
                                { id: 'all', label: getTranslation(lang, 'clearAllMessages', 'Clear All Messages'), icon: <Trash2 size={16} /> },
                                { id: 'images', label: getTranslation(lang, 'clearImagesOnly', 'Clear Photos Only'), icon: <ImageIcon size={16} /> },
                                { id: 'videos', label: getTranslation(lang, 'clearVideosOnly', 'Clear Videos Only'), icon: <Video size={16} /> },
                                { id: 'documents', label: getTranslation(lang, 'clearDocumentsOnly', 'Clear Files Only'), icon: <FileText size={16} /> },
                                { id: 'text', label: getTranslation(lang, 'clearTextOnly', 'Clear Text Only'), icon: <Type size={16} /> },
                            ].map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => setPendingClearType(option.id)}
                                    className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-bold w-full text-right shrink-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
                                            {option.icon}
                                        </div>
                                        <span>{option.label}</span>
                                    </div>
                                </button>
                             ))}
                        </div>

                        {/* Footer with elegant Cancel button */}
                        <div className="flex items-center gap-2 pt-3 border-t border-white/10 shrink-0">
                            <button
                                onClick={() => setShowClearChatMenu(false)}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm border border-white/10"
                            >
                                إلغاء
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showReportMenu && (
                <div 
                    className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setShowReportMenu(false)}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: -330 }}
                        exit={{ opacity: 0, scale: 0.9, y: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="bg-[#0d1117] border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with Title and Close Button */}
                        <div className="flex items-center justify-between mb-4 shrink-0 pb-2 border-b border-white/5">
                            <h2 className="text-white font-bold text-base flex items-center gap-2">
                                <Flag size={18} className="text-rose-500" /> 
                                <span>{getTranslation(lang, "reportUser", "Report User")}</span>
                            </h2>
                            <button 
                                onClick={() => setShowReportMenu(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 mb-4 overflow-y-auto shrink pb-2">
                            {[getTranslation(lang, 'inappropriateContent', 'Inappropriate Content'), getTranslation(lang, 'spam', 'Spam / Harassment'), getTranslation(lang, 'impersonation', 'Impersonation'), getTranslation(lang, 'otherReason', 'Other')].map(reason => (
                                <button type="button" key={reason} onClick={() => setReportReason(reason)} className={`p-3 rounded-xl text-right shrink-0 font-semibold text-sm border transition-all ${reportReason === reason ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'}`}>
                                    {reason}
                                </button>
                            ))}
                            <textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder={getTranslation(lang, "optionalDescription", "Optional description...")} className="w-full bg-white/5 p-3 rounded-xl text-white text-sm shrink-0 mt-2 min-h-[80px] border border-white/5 focus:border-rose-500/30 focus:outline-none focus:ring-0" />
                        </div>

                        <div className="flex gap-2 shrink-0 pt-3 border-t border-white/10">
                            <button type="button" onClick={() => setShowReportMenu(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm border border-white/10">{getTranslation(lang, "cancel", "Cancel")}</button>
                            <button type="button" onClick={handleSendReport} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all text-sm">{getTranslation(lang, "send", "Send")}</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {pendingClearType && (
                <div 
                    className="fixed inset-0 bg-black/85 z-[300] flex items-center justify-center p-4 backdrop-blur-md"
                    onClick={() => setPendingClearType(null)}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: -150 }}
                        exit={{ opacity: 0, scale: 0.9, y: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="bg-[#0d1117] border border-rose-500/20 rounded-2xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative text-right"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                                <Trash2 size={26} className="animate-pulse" />
                            </div>
                            <h3 className="text-white font-bold text-lg">{getTranslation(lang, "confirmFinalDeletion", "Confirm Final Deletion")}</h3>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                هل أنت متأكد من رغبتك في <span className="text-rose-400 font-bold">{
                                    pendingClearType === 'all' ? 'مسح جميع الرسائل' :
                                    pendingClearType === 'images' ? 'مسح الصور فقط' :
                                    pendingClearType === 'videos' ? 'مسح الفيديوهات فقط' :
                                    pendingClearType === 'documents' ? 'مسح الملفات فقط' :
                                    pendingClearType === 'text' ? 'مسح النصوص فقط' : 'مسح المحتوى المخصص'
                                }</span>؟
                            </p>
                            <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl w-full text-right">
                                <p className="text-rose-400 text-xs font-semibold leading-relaxed">
                                    {getTranslation(lang, "clearWarningText", "⚠️ Important: This content will be permanently deleted from your device and cannot be restored.")}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                            <button 
                                type="button" 
                                onClick={() => setPendingClearType(null)} 
                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm border border-white/10"
                            >
                                إلغاء
                            </button>
                            <button 
                                type="button" 
                                onClick={() => handleClearChat(pendingClearType)} 
                                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all text-sm shadow-lg shadow-rose-950/40"
                            >
                                {getTranslation(lang, "confirmDelete", "Confirm Deletion")}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            
            </div>

            {/* Forward Modal */}
            {showForwardModal && (
                <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForwardModal(false)}>
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">{getTranslation(lang, "forwardTo", "Forward to...")}</h3>
                            <button onClick={() => setShowForwardModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 flex-1">
                            {Object.values(usersMap).filter(u => u.id !== myId).map(u => (
                                <button 
                                    key={u.id}
                                    onClick={() => {
                                        const msgId = Array.from(selectedIds)[0];
                                        const msg = messages.find(m => m.id === msgId);
                                        if (!msg) return;

                                        const targetChatId = [myId, u.id].sort().join('_');
                                        const targetChat: Chat = {
                                            id: targetChatId,
                                            user: u,
                                            updatedAt: serverTimestamp() as any,
                                            participants: [myId, u.id],
                                            isGroup: false,
                                            lastMessage: '',
                                            timestamp: new Date().toISOString(),
                                            unreadCount: 0,
                                            isOnline: u.isOnline || false
                                        };
                                        
                                        // Update/Ensure chat document in background
                                        setDoc(doc(firestoreDb, 'chats', targetChatId), {
                                            id: targetChatId,
                                            participants: [myId, u.id],
                                            isGroup: false,
                                            updatedAt: serverTimestamp()
                                        }, { merge: true });

                                        onSelectChat(targetChat, null, msg);
                                        setShowForwardModal(false);
                                        setIsSelectionMode(false);
                                        setSelectedIds(new Set());
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-right"
                                >
                                    <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} className="w-10 h-10 rounded-full" alt="" />
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="text-white font-bold truncate">{u.name}</h4>
                                    </div>
                                    <Forward size={16} className="text-emerald-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Video Trimmer Modal */}
            {trimmingVideo && (
                <div className="absolute inset-0 z-[350] bg-black flex flex-col animate-in fade-in zoom-in duration-300">
                    <div className="p-4 flex items-center justify-between border-b border-white/10">
                        <button onClick={() => { URL.revokeObjectURL(trimmingVideo.url); setTrimmingVideo(null); }} className="p-2 text-slate-400 hover:text-white">
                            <X size={24} />
                        </button>
                        <h3 className="text-white font-bold">{getTranslation(lang, "trimVideo", "Trim Video")}</h3>
                        <button 
                            onClick={() => {
                                handleSendMedia('video', trimmingVideo.url, { ...trimRange, file: trimmingVideo.file }, trimmingVideo.caption);
                                setTrimmingVideo(null);
                            }} 
                            className="p-2 bg-emerald-500 text-white rounded-full px-4 font-bold flex items-center gap-2"
                        >
                            <Check size={20} /> {getTranslation(lang, "send", "Send")}
                        </button>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
                        <div className="relative w-full max-w-2xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            <video 
                                src={normalizeMediaUrl(trimmingVideo.url)} 
                                className="w-full h-full object-contain"
                                controls
                                playsInline
                                webkit-playsinline="true"
                                preload="metadata"
                                onError={(e) => console.error("Video trimming preview error:", trimmingVideo.url, e.currentTarget.error)}
                                onTimeUpdate={(e) => {
                                    const video = e.target as HTMLVideoElement;
                                    if (video.currentTime >= trimRange.end) {
                                        if (Number.isFinite(trimRange.start)) video.currentTime = trimRange.start;
                                    }
                                }}
                                onLoadedMetadata={(e) => {
                                    const video = e.target as HTMLVideoElement;
                                    if (Number.isFinite(trimRange.start)) video.currentTime = trimRange.start;
                                }}
                            />
                        </div>
                        
                        <div className="w-full max-w-2xl bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs text-slate-400 font-mono">{getTranslation(lang, "start", "Start")}: {trimRange.start.toFixed(1)}s</span>
                                <div className="flex items-center gap-2 text-emerald-500">
                                    <Scissors size={16} />
                                    <span className="text-sm font-bold">{getTranslation(lang, "duration", "Selected Duration")}: {(trimRange.end - trimRange.start).toFixed(1)}s</span>
                                </div>
                                <span className="text-xs text-slate-400 font-mono">{getTranslation(lang, "end", "End")}: {trimRange.end.toFixed(1)}s</span>
                            </div>
                            
                            <div className="relative h-12 bg-slate-800 rounded-lg overflow-hidden flex items-center px-2">
                                <div className="absolute inset-y-0 left-0 bg-black/60 z-10" style={{ width: `${(trimRange.start / trimmingVideo.duration) * 100}%` }}></div>
                                <div className="absolute inset-y-0 right-0 bg-black/60 z-10" style={{ width: `${(1 - trimRange.end / trimmingVideo.duration) * 100}%` }}></div>
                                
                                <input 
                                    type="range" 
                                    min={0} 
                                    max={trimmingVideo.duration} 
                                    step={0.1}
                                    value={trimRange.start}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (val < trimRange.end - 1) setTrimRange(prev => ({ ...prev, start: val }));
                                    }}
                                    className="absolute inset-x-0 top-0 h-1/2 opacity-0 cursor-pointer z-20"
                                />
                                <input 
                                    type="range" 
                                    min={0} 
                                    max={trimmingVideo.duration} 
                                    step={0.1}
                                    value={trimRange.end}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (val > trimRange.start + 1) setTrimRange(prev => ({ ...prev, end: val }));
                                    }}
                                    className="absolute inset-x-0 bottom-0 h-1/2 opacity-0 cursor-pointer z-20"
                                />
                                
                                <div className="w-full h-2 bg-slate-700 rounded-full relative">
                                    <div 
                                        className="absolute h-full bg-emerald-500 rounded-full"
                                        style={{ 
                                            left: `${(trimRange.start / trimmingVideo.duration) * 100}%`,
                                            right: `${(1 - trimRange.end / trimmingVideo.duration) * 100}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4 text-center">{getTranslation(lang, "dragHandlesToTrim", "Drag handles to select segment to send")}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Preview Modal */}
            <ChatMediaViewer 
                previewMedia={previewMedia}
                setPreviewMedia={setPreviewMedia}
                allUsers={allUsers}
                myId={myId}
                displayUser={displayUser}
            />

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{getTranslation(lang, "deleteMessagesTitle", "Delete Messages")}</h3>
                            <p className="text-slate-400 text-sm mb-6">{getTranslation(lang, "confirmDeleteMessagesCount", )}</p>
                            
                            <div className="flex flex-col gap-3">
                                {Array.from(selectedIds).every(id => messages.find(m => m.id === id)?.senderId === myId) && (
                                    <button 
                                        onClick={() => handleDeleteSelected(true)}
                                        className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-colors"
                                    >
                                        {getTranslation(lang, "deleteForEveryone", "Delete for Everyone")}
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDeleteSelected(false)}
                                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
                                >
                                    {getTranslation(lang, "deleteForMe", "Delete for Me")}
                                </button>
                                <button 
                                    onClick={() => setShowDeleteModal(false)}
                                    className="w-full py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-bold transition-colors mt-2"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <AIImageModal
                isOpen={showAIImageModal}
                onClose={() => setShowAIImageModal(false)}
                onSendImage={(imageUrl) => handleSendMedia('image', imageUrl)}
                currentUserId={myId}
            />

            {/* Block Confirmation Modal */}
            <AnimatePresence>
                {showBlockConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" 
                        onClick={() => setShowBlockConfirm(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1a1c22] border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative" 
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Ban size={40} className="text-rose-500" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-4">{getTranslation(lang, "blockConfirmTitle", "Are you sure you want to block?")}</h3>
                                <div className="bg-white/5 rounded-2xl p-4 mb-6 text-right">
                                    <p className="text-slate-300 text-xs leading-relaxed flex flex-col gap-2">
                                        <span className="flex items-center gap-2 text-rose-400 font-bold">{getTranslation(lang, "whenYouBlockUser", "⚠️ When you block this user:")}</span>
                                        <span>{getTranslation(lang, "blockRule1", "• They will not be able to message you and you cannot message them.")}</span>
                                        <span>{getTranslation(lang, "blockRule2", "• They will not see your Stories and you will not see theirs.")}</span>
                                        <span>{getTranslation(lang, "blockRule3", "• Online status and last seen will be hidden between you.")}</span>
                                        <span>{getTranslation(lang, "blockRule4", "• All mutual interactions, comments, and notifications will be hidden.")}</span>
                                        <span className="text-white/50 text-[10px] mt-1 italic">{getTranslation(lang, "blockRule5", "* Blocking remains mutual until you manually unblock.")}</span>
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => handleConfirmBlock(true)}
                                        className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                                    >
                                        {getTranslation(lang, "confirmBlock", "Confirm Block")}
                                    </button>
                                    <button 
                                        onClick={() => setShowBlockConfirm(false)}
                                        className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold transition-all active:scale-95"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,video/*"
                multiple={false}
            />
            <input 
                type="file" 
                ref={audioFileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                multiple={false}
            />
            <input 
                type="file" 
                ref={docInputRef} 
                onChange={handleDocSelect} 
                className="hidden" 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/*"
                multiple={false}
            />
            {/* Members Modal - Centered, high z-index */}
            {showMembersModal && (
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowMembersModal(false); setIsDeletingMembers(false); setShowAddMembers(false); }}>
                    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-bold text-lg">
                                {showAddMembers ? getTranslation(lang, 'addMembers', 'Add Members') : isDeletingMembers ? getTranslation(lang, 'removeMembers', 'Remove Members') : getTranslation(lang, 'groupMembers', 'Group Members')}
                            </h2>
                            <button onClick={() => { 
                                if (showAddMembers) setShowAddMembers(false);
                                else if (isDeletingMembers) setIsDeletingMembers(false);
                                else setShowMembersModal(false);
                            }} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {!showAddMembers && !isDeletingMembers && chat.isGroup && (chat.adminId === 'me' || chat.adminId === myId) && (
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={() => setShowAddMembers(true)}
                                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors text-sm font-bold"
                                >
                                    <Plus size={18} /> {getTranslation(lang, "add", "Add")}
                                </button>
                                <button 
                                    onClick={() => setIsDeletingMembers(true)}
                                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors text-sm font-bold"
                                >
                                    <Trash2 size={18} /> {getTranslation(lang, "delete", "Delete")}
                                </button>
                            </div>
                        )}

                        {showAddMembers ? (
                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder={getTranslation(lang, "searchPeople", "Search people...")}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                                        value={memberSearchQuery}
                                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
                                    {Object.values(usersMap)
                                        .filter(u => u.id !== myId && !chat.members?.includes(u.id))
                                        .filter(u => !memberSearchQuery || u.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || u.id.includes(memberSearchQuery))
                                        .map(user => (
                                            <button 
                                                key={user.id}
                                                onClick={() => handleAddMemberToGroup(user.id)}
                                                className="p-3 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-8 h-8 rounded-full" alt="" />
                                                    <span className="text-right text-sm">{extractStringValue(user.name || user.displayName, user.id)}</span>
                                                </div>
                                                <Plus size={18} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))
                                    }
                                    {Object.values(usersMap).filter(u => u.id !== myId && !chat.members?.includes(u.id)).length === 0 && (
                                        <p className="text-slate-500 text-center py-4 text-sm">{getTranslation(lang, "noMoreMembersToAdd", "No more members to add")}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {!isDeletingMembers && chat.image && <img src={chat.image} className="w-full h-32 rounded-xl object-cover mb-4" alt="Group" />}
                                {!isDeletingMembers && chat.description && <p className="text-slate-400 text-sm mb-4">{chat.description}</p>}
                                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
                                    {Array.from(new Set(chat.members || chat.participants || [])).map(memberId => {
                                        let member = usersMap[memberId];
                                        if (!member) {
                                            if (memberId === 'me' || memberId === myId) {
                                                member = { id: myId, name: getTranslation(lang, 'me', 'Me'), avatar: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId}`, status: 'online' } as any;
                                            } else {
                                                member = { id: memberId, name: `عضو ${memberId}`, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`, status: 'offline' } as any;
                                            }
                                        }
                                        if (!member) return null;
                                        return (
                                            <div key={member.id} className="flex items-center gap-2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => !isDeletingMembers && handleMemberClick(member)} 
                                                    className={`flex-1 p-3 rounded-xl bg-white/5 text-slate-300 ${!isDeletingMembers ? 'hover:bg-white/10' : ''} text-right flex items-center gap-3 transition-colors`}
                                                >
                                                    <img src={member.avatar} className="w-8 h-8 rounded-full" alt="" />
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-sm font-medium">{extractStringValue(member.name, member.id)}</span>
                                                        {member.id === chat.adminId && <span className="text-[10px] text-emerald-500 font-bold">{getTranslation(lang, "admin", "Admin")}</span>}
                                                    </div>
                                                </button>
                                                {isDeletingMembers && member.id !== myId && member.id !== chat.adminId && (
                                                    <button 
                                                        onClick={() => handleRemoveMemberFromGroup(member.id)}
                                                        className="p-3 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                        
                        {!showAddMembers && !isDeletingMembers && chat.isGroup && (
                            <button 
                                onClick={() => setShowGroupConfirm(true)}
                                className="w-full mt-4 p-3 rounded-xl bg-rose-600/20 text-rose-500 font-bold hover:bg-rose-600/30 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                {(chat.adminId === 'me' || chat.adminId === myId) ? <Trash2 size={18} /> : <LogOut size={18} />}
                                {(chat.adminId === 'me' || chat.adminId === myId) ? getTranslation(lang, 'deleteGroupForEveryone', 'Delete Group for Everyone') : getTranslation(lang, 'leaveGroup', 'Leave Group')}
                            </button>
                        )}
                        
                        <button 
                            type="button" 
                            onClick={() => {
                                if (showAddMembers) setShowAddMembers(false);
                                else if (isDeletingMembers) setIsDeletingMembers(false);
                                else setShowMembersModal(false);
                            }} 
                            className="w-full mt-2 p-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors text-sm"
                        >
                            {showAddMembers || isDeletingMembers ? getTranslation(lang, 'back', 'Back') : getTranslation(lang, 'close', 'Close')}
                        </button>
                    </div>

                    {/* Inner Confirmation Overlay */}
                    {showGroupConfirm && (
                        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                                {(chat.adminId === 'me' || chat.adminId === myId) ? <Trash2 className="text-rose-500" size={28} /> : <LogOut className="text-rose-500" size={28} />}
                            </div>
                            <h3 className="text-white font-black text-lg mb-2">
                                {(chat.adminId === 'me' || chat.adminId === myId) ? getTranslation(lang, 'deleteGroupTitle', 'Delete Group?') : getTranslation(lang, 'leaveGroupTitle', 'Leave Group?')}
                            </h3>
                            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                {(chat.adminId === 'me' || chat.adminId === myId) 
                                    ? getTranslation(lang, 'deleteGroupConfirm', 'Are you sure you want to delete this group? It will be permanently removed for all members.') 
                                    : getTranslation(lang, 'leaveGroupConfirm', 'Are you sure you want to leave this group? You can only return with a new invite.')}
                            </p>
                            <div className="flex flex-col gap-2 w-full">
                                <button 
                                    onClick={(chat.adminId === 'me' || chat.adminId === myId) ? handleDeleteActiveGroup : handleExitActiveGroup}
                                    className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-500 transition-colors"
                                >
                                    {getTranslation(lang, 'confirm', 'Confirm')} {(chat.adminId === 'me' || chat.adminId === myId) ? getTranslation(lang, 'delete', 'Delete') : getTranslation(lang, 'exit', 'Exit')}
                                </button>
                                <button 
                                    onClick={() => setShowGroupConfirm(false)}
                                    className="w-full py-3 bg-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/20 transition-colors"
                                >
                                    تراجع
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Call Mode Selection Menu (Group Calls) - Independent Top-Level Dialog */}
            <AnimatePresence>
                {showCallModeMenu.show && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
                                onClick={() => setShowCallModeMenu({show: false, type: null})}
                            >
                                <motion.div 
                                    initial={{ scale: 0.94, opacity: 0, y: 16 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.94, opacity: 0, y: 16 }}
                                    transition={{ duration: 0.18 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#0d1117] border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                                >
                                    {/* Modal Header */}
                                    <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
                                                showCallModeMenu.type === 'voice' 
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {showCallModeMenu.type === 'voice' ? <Phone size={22} /> : <Video size={22} />}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-base sm:text-lg">
                                                    {showCallModeMenu.type === 'voice' ? getTranslation(lang, 'groupVoiceCall', 'Group Voice Call') : getTranslation(lang, 'groupVideoCall', 'Group Video Call')}
                                                </h3>
                                                <p className="text-slate-400 text-xs">
                                                    {chat.name || 'المجموعة'} • {allGroupMembers.length} {getTranslation(lang, "membersAvailable", "members available")}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowCallModeMenu({show: false, type: null})}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                            title={getTranslation(lang, "close", "Close")}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Modal Body (Scrollable) */}
                                    <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
                                        {/* The 2 Direct Choices */}
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {/* Choice 1: All Members */}
                                            <button
                                                type="button"
                                                onClick={() => setCallModeSelection('all')}
                                                className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center gap-3.5 ${
                                                    callModeSelection === 'all'
                                                        ? showCallModeMenu.type === 'voice'
                                                            ? 'bg-emerald-500/10 border-emerald-500/70 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                                            : 'bg-amber-400/10 border-amber-400/70 text-white shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                                                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                    callModeSelection === 'all'
                                                        ? showCallModeMenu.type === 'voice'
                                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                            : 'bg-amber-400 text-slate-900 font-bold shadow-md shadow-amber-400/30'
                                                        : 'bg-white/10 text-slate-400'
                                                }`}>
                                                    <Users size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-white flex items-center justify-between">
                                                        <span>{getTranslation(lang, "callAllMembers", "Call All Members")}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-normal text-slate-300">
                                                            {allGroupMembers.length}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {getTranslation(lang, "instantRingAll", "Instant ring for all group members")}
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    callModeSelection === 'all'
                                                        ? showCallModeMenu.type === 'voice'
                                                            ? 'border-emerald-500 bg-emerald-500'
                                                            : 'border-amber-400 bg-amber-400'
                                                        : 'border-white/20'
                                                }`}>
                                                    {callModeSelection === 'all' && (
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Choice 2: Exclude Some Members */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCallModeSelection('except');
                                                    if (includedMemberIds.length === 0) {
                                                        setIncludedMemberIds(allGroupMembers);
                                                    }
                                                }}
                                                className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center gap-3.5 ${
                                                    callModeSelection === 'except'
                                                        ? showCallModeMenu.type === 'voice'
                                                            ? 'bg-emerald-500/10 border-emerald-500/70 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                                            : 'bg-amber-400/10 border-amber-400/70 text-white shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                                                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                    callModeSelection === 'except'
                                                        ? showCallModeMenu.type === 'voice'
                                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                            : 'bg-amber-400 text-slate-900 font-bold shadow-md shadow-amber-400/30'
                                                        : 'bg-white/10 text-slate-400'
                                                }`}>
                                                    <UserMinus size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-white flex items-center justify-between">
                                                        <span>{getTranslation(lang, "excludeSomeMembers", "Exclude Some Members")}</span>
                                                        {callModeSelection === 'except' && allGroupMembers.length - includedMemberIds.length > 0 && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                                                                مستثنى ({allGroupMembers.length - includedMemberIds.length})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {getTranslation(lang, "unselectMembersToExclude", "Uncheck specific members to exclude from ringing")}
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    callModeSelection === 'except'
                                                        ? showCallModeMenu.type === 'voice'
                                                            ? 'border-emerald-500 bg-emerald-500'
                                                            : 'border-amber-400 bg-amber-400'
                                                        : 'border-white/20'
                                                }`}>
                                                    {callModeSelection === 'except' && (
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                            </button>
                                        </div>

                                        {/* Member Exclusion & Filtering Section */}
                                        {callModeSelection === 'except' && (
                                            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-white text-xs font-bold">
                                                            {getTranslation(lang, "memberFilterList", "Member Filter List")}
                                                        </h4>
                                                        <p className="text-[11px] text-slate-400">
                                                            {getTranslation(lang, "clickToExcludeMember", "Click any member to exclude")}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIncludedMemberIds(allGroupMembers)}
                                                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                                                        >
                                                            {getTranslation(lang, "selectAll", "Select All")}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIncludedMemberIds([])}
                                                            className="text-[11px] font-semibold text-slate-400 hover:text-rose-300 px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-500/10 transition-colors"
                                                        >
                                                            {getTranslation(lang, "deselectAll", "Unselect All")}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Search Filter for members */}
                                                {allGroupMembers.length > 3 && (
                                                    <div className="relative">
                                                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder={getTranslation(lang, "searchGroupMember", "Search group member...")}
                                                            value={callMemberSearchQuery}
                                                            onChange={(e) => setCallMemberSearchQuery(e.target.value)}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-9 pl-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-white/20"
                                                        />
                                                    </div>
                                                )}

                                                {/* Members List */}
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
                                                    {allGroupMembers
                                                        .filter(memberId => {
                                                            if (!callMemberSearchQuery) return true;
                                                            const member = usersMap[memberId];
                                                            const name = member ? extractStringValue(member.name, member.id) : memberId;
                                                            return name.toLowerCase().includes(callMemberSearchQuery.toLowerCase());
                                                        })
                                                        .map(memberId => {
                                                            const member = usersMap[memberId] || {
                                                                id: memberId,
                                                                name: `عضو ${memberId.slice(0, 6)}`,
                                                                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`
                                                            };
                                                            const isIncluded = includedMemberIds.includes(memberId);
                                                            const displayName = extractStringValue(member.name, member.id);

                                                            return (
                                                                <button
                                                                    key={memberId}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isIncluded) {
                                                                            // Exclude member
                                                                            setIncludedMemberIds(prev => prev.filter(id => id !== memberId));
                                                                        } else {
                                                                            // Include member
                                                                            setIncludedMemberIds(prev => [...prev, memberId]);
                                                                        }
                                                                    }}
                                                                    className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between border ${
                                                                        isIncluded
                                                                            ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                                                                            : 'bg-black/20 border-white/5 opacity-55 hover:opacity-85'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className={`relative w-8 h-8 rounded-full overflow-hidden border ${
                                                                            isIncluded 
                                                                                ? showCallModeMenu.type === 'voice' ? 'border-emerald-500/50' : 'border-amber-400/50'
                                                                                : 'border-white/10 grayscale'
                                                                        }`}>
                                                                            <img 
                                                                                src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`} 
                                                                                alt="" 
                                                                                className="w-full h-full object-cover"
                                                                                referrerPolicy="no-referrer"
                                                                            />
                                                                        </div>
                                                                        <div className="text-right min-w-0">
                                                                            <div className={`text-xs font-semibold truncate ${isIncluded ? 'text-white' : 'text-slate-400 line-through'}`}>
                                                                                {displayName}
                                                                            </div>
                                                                            <div className="text-[10px]">
                                                                                {isIncluded ? (
                                                                                    <span className="text-emerald-400 font-medium">{getTranslation(lang, "includedInCall", "Included in Call")}</span>
                                                                                ) : (
                                                                                    <span className="text-rose-400 font-medium">{getTranslation(lang, "excludedFromCall", "Excluded")}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Checkbox / Exclusion Badge */}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                                            isIncluded 
                                                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                                        }`}>
                                                                            {isIncluded ? getTranslation(lang, "included", "Included") : getTranslation(lang, "excluded", "Excluded")}
                                                                        </span>
                                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                                                            isIncluded 
                                                                                ? showCallModeMenu.type === 'voice'
                                                                                    ? 'bg-emerald-500 border-emerald-400 text-white'
                                                                                    : 'bg-amber-400 border-amber-300 text-slate-900'
                                                                                : 'border-white/20 bg-white/5 text-transparent'
                                                                        }`}>
                                                                            <Check size={12} strokeWidth={3} className={isIncluded ? 'opacity-100' : 'opacity-0'} />
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                </div>

                                                {/* Dynamic Summary */}
                                                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-white/5">
                                                    <span>{getTranslation(lang, "callTargets", "Targeted for call")}: <strong className="text-white font-bold">{allGroupMembers.filter(id => includedMemberIds.includes(id)).length}</strong></span>
                                                    <span>{getTranslation(lang, "excludedCount", "Excluded")}: <strong className="text-rose-400 font-bold">{allGroupMembers.length - allGroupMembers.filter(id => includedMemberIds.includes(id)).length}</strong></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Modal Footer (Action Button) */}
                                    <div className="p-5 border-t border-white/5 bg-black/20 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleStartGroupCallMode}
                                            disabled={
                                                isStartingGroupCall ||
                                                (callModeSelection === 'except' && allGroupMembers.filter(id => includedMemberIds.includes(id)).length === 0)
                                            }
                                            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white ${
                                                showCallModeMenu.type === 'voice'
                                                    ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                                                    : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/25'
                                            }`}
                                        >
                                            {isStartingGroupCall ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={18} />
                                                    <span>{getTranslation(lang, "startingCallRoom", "Creating room and starting call...")}</span>
                                                </>
                                            ) : (
                                                <>
                                                    {showCallModeMenu.type === 'voice' ? <Phone size={18} /> : <Video size={18} />}
                                                    <span>
                                                        {callModeSelection === 'all'
                                                            ? `الاتصال بجميع الأعضاء (${allGroupMembers.length})`
                                                            : allGroupMembers.filter(id => includedMemberIds.includes(id)).length === 0
                                                                ? getTranslation(lang, 'selectAtLeastOneMember', 'Please select at least one member')
                                                                : `تأكيد وبدء الاتصال بـ (${allGroupMembers.filter(id => includedMemberIds.includes(id)).length}) من الأعضاء`
                                                        }
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
        </div>
    );
}

