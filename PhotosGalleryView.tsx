import { getTranslation, translations } from '../translations';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, MessageSquare, Share, Bookmark, Star, Sparkles, Layers,
  X, Download, Plus, Check, Send,
  Eye, ZoomIn, ZoomOut, Compass, Flame, Filter, CheckCircle2,
  Image as ImageIcon, Grid, Camera, MoreHorizontal, Copy, Link2,
  Zap, ArrowRight, CornerUpLeft, Award, Play, Video, LayoutGrid,
  Flag, Ban, Trash, FileText, HeartCrack, AlertCircle, Loader2, Hash,
  Instagram, Facebook, Twitter, Search, History
} from 'lucide-react';
import { PhotoPost, Comment } from '../types';
import ModernRepostLoopIcon from './ModernRepostLoopIcon';
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, orderBy, onSnapshot, increment, arrayUnion, arrayRemove, serverTimestamp, getDoc, getDocs, limit, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { useUsers } from '../src/contexts/UserContext';
import HiSeeCoinIcon from './HiSeeCoinIcon';
import ModernHSLogo from './ModernHSLogo';
import { parseDate } from '../lib/helpers';
import { ProtectionEngine } from '../services/protectionEngine';
import { cacheEngine } from '../services/cacheEngine';

interface PhotosGalleryViewProps {
  lang?: string;
  myId: string;
  myProfile: any;
  onNavigate: (tab: any) => void;
  onViewProfile: (uid: string, initialTab?: 'gallery' | 'photos') => void;
  isUiVisible?: boolean;
  onToggleUi?: () => void;
  targetMediaId?: {type: 'video' | 'photo', id: string} | null;
}

// Curated high-res creative photo sets with fallback
export const INITIAL_CURATED_PHOTOS: PhotoPost[] = [
  {
    id: 'photo-nature-3',
    images: [
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1080&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&auto=format&fit=crop&q=80'
    ],
    aspectRatio: '4/5',
    user: 'ليلى الكردي',
    userId: 'layla_nature',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    likes: 3100,
    likesCount: 3100,
    commentsCount: 195,
    shares: 512,
    saves: 830,
    stars: 30,
    desc: 'ضباب الصباح الباكر يغطي قمم جبال الألب الخضراء 🌲🏔️ استنشقوا هدوء الطبيعة النقي.',
    tags: ['#طبيعة', '#سفر', '#جبال', '#استرخاء'],
    location: 'Swiss Alps',
    category: 'nature',
    createdAt: Date.now() - 1000 * 60 * 60 * 12
  },
  {
    id: 'photo-ai-4',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1080&auto=format&fit=crop&q=80'
    ],
    aspectRatio: '3/4',
    user: 'فهد الذكي',
    userId: 'fahad_ai',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    likes: 4520,
    likesCount: 4520,
    commentsCount: 310,
    shares: 890,
    saves: 1200,
    stars: 48,
    desc: 'تصميم ثلاثي الأبعاد مستوحى من الهندسة الحركية وأمواج الطاقة الكونية ✨ تصميم الجيل القادم!',
    tags: ['#3DArt', '#ذكاء_اصطناعي', '#تصميم', '#مستقبل'],
    location: 'HiSee AI Studio',
    category: 'ai',
    createdAt: Date.now() - 1000 * 60 * 60 * 18
  },
  {
    id: 'photo-portrait-5',
    images: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&auto=format&fit=crop&q=80'
    ],
    aspectRatio: '4/5',
    user: 'نور الهدى',
    userId: 'nour_lens',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    likes: 1980,
    likesCount: 1980,
    commentsCount: 94,
    shares: 160,
    saves: 290,
    stars: 18,
    desc: 'جلسة تصوير بورتريه سينمائي بضوء الشمس الذهبي وقت الغروب 🌅 عيون تحكي قصصاً لا تنتهي.',
    tags: ['#بورتريه', '#سينما', '#غروب', '#تصوير_احترافي'],
    location: 'بيروت، لبنان',
    category: 'portrait',
    createdAt: Date.now() - 1000 * 60 * 60 * 24
  },
  {
    id: 'photo-arch-6',
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1080&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&auto=format&fit=crop&q=80'
    ],
    aspectRatio: '1/1',
    user: 'كريم العمارة',
    userId: 'karim_arch',
    userAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
    likes: 2240,
    likesCount: 2240,
    commentsCount: 105,
    shares: 320,
    saves: 490,
    stars: 20,
    desc: 'التناغم بين الضوء والظلال في العمارة المعاصرة Minimalist Architecture 🏛️ بساطة تخطف الأنظار.',
    tags: ['#عمارة', '#تصميم_معماري', '#بساطة', '#فن'],
    location: 'الدوحة، قطر',
    category: 'art',
    createdAt: Date.now() - 1000 * 60 * 60 * 30
  }
];



const photoTranslations: Record<string, Record<string, string>> = {
  ar: {
    photo_all: '✨ الكل',
    photo_trending: '🔥 شائع',
    photo_nature: '🌲 طبيعة',
    photo_portrait: '👤 بورتريه',
    photo_ai: '⚡ ذكاء اصطناعي',
    photo_art: '🎨 فن وتصميم',
    photo_following: '👥 أتابعهم',
    photo_dislike: 'Dislike',
    photo_viewGrid: 'التبديل إلى العرض الشبكي',
    photo_viewVertical: 'التبديل إلى العرض الرأسي بملء الشاشة',
    photo_grid: 'شبكة',
    photo_vertical: 'رأسي',
    photo_updatingFeed: 'جاري التحديث وبث أحدث اللقطات...',
    photo_pullToRefresh: 'اسحب للإفلات والتحديث ✨',
    photo_noPhotos: 'لا توجد صور في هذا التصنيف',
    photo_beFirstToPost: 'كن أول من ينشر صوراً وإبداعات فوتوغرافية متميزة',
    photo_viewAllPhotos: 'عرض كل الصور',
    photo_commentsTitle: 'التعليقات',
    photo_noCommentsYet: 'لا توجد تعليقات بعد.. كن أول من يعلق!',
    photo_addCommentPlaceholder: 'أضف تعليقاً لطيفاً...',
    photo_giftGoldenStar: 'إهداء النجمة الذهبية 🌟',
    photo_giftStarDescriptionPart1: 'أهدِ نجمة التميز الذهبية لدعم هذا المنشور الإبداعي بقيمة',
    photo_giftStarDescriptionPart2: 'عملة HiSee ($10) ويعزز أيضاً مستواك في النجوم! ✨',
    photo_giftCost: 'تكلفة الهدية:',
    photo_cancel: 'إلغاء',
    photo_sending: 'جاري الإرسال...',
    photo_confirmGift: 'تأكيد الإهداء ⭐',
    photo_shareWithFriend: 'مشاركة مع صديق / في دردشة',
    photo_searchFriendsPlaceholder: 'بحث عن أصدقاء أو مجموعات...',
    photo_myStory: 'قصتي (My Story)',
    photo_storyDurationInfo: 'ستظهر لمدة 24 ساعة',
    photo_shareCreativePost: 'مشاركة المنشور الفوتوغرافي 🚀',
    photo_copyLink: 'نسخ الرابط',
    photo_copied: 'تم النسخ!',
    photo_shareVia: 'مشاركة عبر...',
    photo_deletePostTitle: 'حذف المنشور',
    photo_deletePostConfirm: 'هل أنت متأكد من رغبتك في حذف هذه الصورة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
    photo_deletePermanently: 'حذف نهائي',
    photo_imageDetailsTitle: 'تفاصيل ومواصفات الصورة',
    photo_postId: 'معرف المنشور:',
    photo_creator: 'المصور / المبدع:',
    photo_imagesCount: 'عدد الصور في الألبوم:',
    photo_aspectRatio: 'نسبة الأبعاد:',
    photo_locationLabel: 'الموقع:',
    photo_backToOptions: 'عودة للخيارات',
    photo_savingAndDownloading: 'جاري حفظ وتنزيل الصورة...',
    photo_savingQualityNote: 'يتم تحميل النسخة الأصلية بأعلى دقة متوفرة',
    photo_repost: 'إعادة النشر',
    photo_undoRepost: 'إلغاء إعادة النشر',
    photo_repostDesc: 'مشاركة المنشور في خلاصتك مع المتابعين',
    photo_undoRepostDesc: 'إزالة هذا المنشور من خلاصتك',
    photo_newBadge: 'جديد',
    photo_report: 'إبلاغ',
    photo_notInterested: 'غير مهتم',
    photo_deleteOption: 'حذف',
    photo_saveOption: 'حفظ',
    photo_copyLinkOption: 'نسخ الرابط',
    photo_detailsOption: 'تفاصيل ومواصفات المحتوى',
    photo_hideUserOption: 'إخفاء منشورات هذا المستخدم'
  },
  en: {
    photo_all: '✨ All',
    photo_trending: '🔥 Trending',
    photo_nature: '🌲 Nature',
    photo_portrait: '👤 Portrait',
    photo_ai: '⚡ AI',
    photo_art: '🎨 Art & Design',
    photo_following: '👥 Following',
    photo_dislike: 'Dislike',
    photo_viewGrid: 'Switch to Grid View',
    photo_viewVertical: 'Switch to Fullscreen Vertical View',
    photo_grid: 'Grid',
    photo_vertical: 'Vertical',
    photo_updatingFeed: 'Updating and streaming latest photos...',
    photo_pullToRefresh: 'Pull to release and refresh ✨',
    photo_noPhotos: 'No photos in this category',
    photo_beFirstToPost: 'Be the first to post creative photographs!',
    photo_viewAllPhotos: 'View All Photos',
    photo_commentsTitle: 'Comments',
    photo_noCommentsYet: 'No comments yet.. Be the first to comment!',
    photo_addCommentPlaceholder: 'Add a nice comment...',
    photo_giftGoldenStar: 'Gift Golden Star 🌟',
    photo_giftStarDescriptionPart1: 'Gift the golden star of excellence to support this creative post with a value of',
    photo_giftStarDescriptionPart2: 'HiSee coins ($10) and boost your star level! ✨',
    photo_giftCost: 'Gift Cost:',
    photo_cancel: 'Cancel',
    photo_sending: 'Sending...',
    photo_confirmGift: 'Confirm Gift ⭐',
    photo_shareWithFriend: 'Share with a friend / in chat',
    photo_searchFriendsPlaceholder: 'Search friends or groups...',
    photo_myStory: 'My Story',
    photo_storyDurationInfo: 'Will appear for 24 hours',
    photo_shareCreativePost: 'Share Photographic Post 🚀',
    photo_copyLink: 'Copy Link',
    photo_copied: 'Copied!',
    photo_shareVia: 'Share via...',
    photo_deletePostTitle: 'Delete Post',
    photo_deletePostConfirm: 'Are you sure you want to permanently delete this photo? This action cannot be undone.',
    photo_deletePermanently: 'Delete Permanently',
    photo_imageDetailsTitle: 'Image Details & Specifications',
    photo_postId: 'Post ID:',
    photo_creator: 'Photographer / Creator:',
    photo_imagesCount: 'Photos in Album:',
    photo_aspectRatio: 'Aspect Ratio:',
    photo_locationLabel: 'Location:',
    photo_backToOptions: 'Back to Options',
    photo_savingAndDownloading: 'Saving and downloading photo...',
    photo_savingQualityNote: 'Downloading the original version in highest quality',
    photo_repost: 'Repost',
    photo_undoRepost: 'Undo Repost',
    photo_repostDesc: 'Share this post in your feed with followers',
    photo_undoRepostDesc: 'Remove this post from your feed',
    photo_newBadge: 'New',
    photo_report: 'Report',
    photo_notInterested: 'Not Interested',
    photo_deleteOption: 'Delete',
    photo_saveOption: 'Save',
    photo_copyLinkOption: 'Copy Link',
    photo_detailsOption: 'Image Details & Specs',
    photo_hideUserOption: 'Hide posts from this user'
  },
  de: {
    photo_all: '✨ Alle',
    photo_trending: '🔥 Angesagt',
    photo_nature: '🌲 Natur',
    photo_portrait: '👤 Porträt',
    photo_ai: '⚡ KI',
    photo_art: '🎨 Kunst & Design',
    photo_following: '👥 Ich folge',
    photo_dislike: 'Dislike',
    photo_viewGrid: 'In die Rasteransicht wechseln',
    photo_viewVertical: 'In die Vollbild-Vertikalansicht wechseln',
    photo_grid: 'Raster',
    photo_vertical: 'Vertikal',
    photo_updatingFeed: 'Feed wird aktualisiert und neueste Bilder geladen...',
    photo_pullToRefresh: 'Zum Aktualisieren ziehen ✨',
    photo_noPhotos: 'Keine Fotos in dieser Kategorie',
    photo_beFirstToPost: 'Sei der Erste, der kreative Fotografien teilt!',
    photo_viewAllPhotos: 'Alle Fotos anzeigen',
    photo_commentsTitle: 'Kommentare',
    photo_noCommentsYet: 'Noch keine Kommentare.. Schreibe den ersten Kommentar!',
    photo_addCommentPlaceholder: 'Nette Kommentare hinzufügen...',
    photo_giftGoldenStar: 'Goldenen Stern verschenken 🌟',
    photo_giftStarDescriptionPart1: 'Schenke den goldenen Stern der Exzellenz, um diesen kreativen Beitrag im Wert von',
    photo_giftStarDescriptionPart2: 'HiSee-Coins ($10) zu unterstützen und dein Sternenlevel zu erhöhen! ✨',
    photo_giftCost: 'Geschenkkosten:',
    photo_cancel: 'Abbrechen',
    photo_sending: 'Wird gesendet...',
    photo_confirmGift: 'Geschenk bestätigen ⭐',
    photo_shareWithFriend: 'Mit Freund / im Chat teilen',
    photo_searchFriendsPlaceholder: 'Freunde oder Gruppen suchen...',
    photo_myStory: 'Meine Story',
    photo_storyDurationInfo: 'Erscheint für 24 voraus',
    photo_shareCreativePost: 'Fotobeitrag teilen 🚀',
    photo_copyLink: 'Link kopieren',
    photo_copied: 'Kopiert!',
    photo_shareVia: 'Teilen über...',
    photo_deletePostTitle: 'Beitrag löschen',
    photo_deletePostConfirm: 'Möchtest du dieses Foto wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    photo_deletePermanently: 'Dauerhaft löschen',
    photo_imageDetailsTitle: 'Bilddetails & Spezifikationen',
    photo_postId: 'Beitrags-ID:',
    photo_creator: 'Fotograf / Ersteller:',
    photo_imagesCount: 'Fotos im Album:',
    photo_aspectRatio: 'Seitenverhältnis:',
    photo_locationLabel: 'Ort:',
    photo_backToOptions: 'Zurück zu den Optionen',
    photo_savingAndDownloading: 'Foto wird gespeichert und heruntergeladen...',
    photo_savingQualityNote: 'Originalversion in höchster Qualität wird heruntergeladen',
    photo_repost: 'Repost',
    photo_undoRepost: 'Repost rückgängig machen',
    photo_repostDesc: 'Teile diesen Beitrag in deinem Feed mit deinen Followern',
    photo_undoRepostDesc: 'Entferne diesen Beitrag aus deinem Feed',
    photo_newBadge: 'Neu',
    photo_report: 'Melden',
    photo_notInterested: 'Nicht interessiert',
    photo_deleteOption: 'Löschen',
    photo_saveOption: 'Speichern',
    photo_copyLinkOption: 'Link kopieren',
    photo_detailsOption: 'Bilddetails & Spezifikationen',
    photo_hideUserOption: 'Beiträge von diesem Nutzer ausblenden'
  },
  ku: {
    photo_all: '✨ Hemû',
    photo_trending: '🔥 Trend',
    photo_nature: '🌲 Xweza',
    photo_portrait: '👤 Portre',
    photo_ai: '⚡ AI',
    photo_art: '🎨 Huner',
    photo_following: '👥 Tên Şopandin',
    photo_dislike: 'Dislike',
    photo_viewGrid: 'Biçe Dîmena Torê (Grid)',
    photo_viewVertical: 'Biçe Dîmena Vertîkal a Dîmendera Tev',
    photo_grid: 'Tor',
    photo_vertical: 'Vertîkal',
    photo_updatingFeed: 'Nûkirin û weşandina wêneyên dawîn...',
    photo_pullToRefresh: 'Bikişîne da ku nû bikî ✨',
    photo_noPhotos: 'Di vê kategoriyê de wêne tune',
    photo_beFirstToPost: 'Yekem kes be ku wêneyên afirîner parve dike!',
    photo_viewAllPhotos: 'Hemû Wêneyan Bibîne',
    photo_commentsTitle: 'Şirove',
    photo_noCommentsYet: 'Hîn şirove tune.. Yekem kes be ku şirove dike!',
    photo_addCommentPlaceholder: 'Şiroveyeke xweş lê zêde bike...',
    photo_giftGoldenStar: 'Stêrka Zêrîn Diyarî Bike 🌟',
    photo_giftStarDescriptionPart1: 'Stêrka zêrîn a jêhatîbûnê bidin da ku piştgirî bidin vê posta afirîner bi bihayê',
    photo_giftStarDescriptionPart2: 'HiSee coin ($10) û her weha asta stêrka xwe zêde bikin! ✨',
    photo_giftCost: 'Bihayê Diyariyê:',
    photo_cancel: 'Betal bike',
    photo_sending: 'Tê şandin...',
    photo_confirmGift: 'Diyariyê Pejirandin ⭐',
    photo_shareWithFriend: 'Bi hevalek re parve bike / di chatê de',
    photo_searchFriendsPlaceholder: 'Li heval an koman bigere...',
    photo_myStory: 'Çîroka Min',
    photo_storyDurationInfo: 'Dê 24 demjimêran xuya bibe',
    photo_shareCreativePost: 'Posta Wênekêşiyê Parve Bike 🚀',
    photo_copyLink: 'Girêdanê Kopî bike',
    photo_copied: 'Hate Kopîkirin!',
    photo_shareVia: 'Parvekirin bi rêya...',
    photo_deletePostTitle: 'Postê Jê bibe',
    photo_deletePostConfirm: 'Ma hûn guman dikin ku hûn dixwazin vê wêneyê bi domdarî jê bibin? Ev çalakî nayê vegerandin.',
    photo_deletePermanently: 'Bi Temamî Jê bibe',
    photo_imageDetailsTitle: 'Hûrgulî û Taybetmendiyên Wêneyê',
    photo_postId: 'ID ya Postê:',
    photo_creator: 'Wênekêş / Afirîner:',
    photo_imagesCount: 'Hejmara Wêneyan:',
    photo_aspectRatio: 'Rêjeya Alî (Aspect Ratio):',
    photo_locationLabel: 'Cih:',
    photo_backToOptions: 'Vegere Bijaran',
    photo_savingAndDownloading: 'Wêne tê tomarkirin û daxistin...',
    photo_savingQualityNote: 'Guhartoya orîjînal di kalîteya herî bilind de tê daxistin',
    photo_repost: 'Dûbare Parvekirin',
    photo_undoRepost: 'Betalkirina Dûbare Parvekirinê',
    photo_repostDesc: 'Vê postê di feeda xwe de bi şopînerên xwe re parve bike',
    photo_undoRepostDesc: 'Vê postê ji feeda xwe rake',
    photo_newBadge: 'Nû',
    photo_report: 'Raport bike',
    photo_notInterested: 'Ne eleqedar e',
    photo_deleteOption: 'Jê bibe',
    photo_saveOption: 'Tomar bike',
    photo_copyLinkOption: 'Girêdanê Kopî bike',
    photo_detailsOption: 'Hûrguliyên Wêneyê',
    photo_hideUserOption: 'Postên vê bikarhênerê veşêre'
  },
  'ku-Latn': {
    photo_all: '✨ Hemû',
    photo_trending: '🔥 Trend',
    photo_nature: '🌲 Xweza',
    photo_portrait: '👤 Portre',
    photo_ai: '⚡ AI',
    photo_art: '🎨 Huner',
    photo_following: '👥 Tên Şopandin',
    photo_dislike: 'Dislike',
    photo_viewGrid: 'Biçe Dîmena Torê (Grid)',
    photo_viewVertical: 'Biçe Dîmena Vertîkal a Dîmendera Tev',
    photo_grid: 'Tor',
    photo_vertical: 'Vertîkal',
    photo_updatingFeed: 'Nûkirin û weşandina wêneyên dawîn...',
    photo_pullToRefresh: 'Bikişîne da ku nû bikî ✨',
    photo_noPhotos: 'Di vê kategoriyê de wêne tune',
    photo_beFirstToPost: 'Yekem kes be ku wêneyên afirîner parve dike!',
    photo_viewAllPhotos: 'Hemû Wêneyan Bibîne',
    photo_commentsTitle: 'Şirove',
    photo_noCommentsYet: 'Hîn şirove tune.. Yekem kes be ku şirove dike!',
    photo_addCommentPlaceholder: 'Şiroveyeke xweş lê zêde bike...',
    photo_giftGoldenStar: 'Stêrka Zêrîn Diyarî Bike 🌟',
    photo_giftStarDescriptionPart1: 'Stêrka zêrîn a jêhatîbûnê bidin da ku piştgirî bidin vê posta afirîner bi bihayê',
    photo_giftStarDescriptionPart2: 'HiSee coin ($10) û her weha asta stêrka xwe zêde bikin! ✨',
    photo_giftCost: 'Bihayê Diyariyê:',
    photo_cancel: 'Betal bike',
    photo_sending: 'Tê şandin...',
    photo_confirmGift: 'Diyariyê Pejirandin ⭐',
    photo_shareWithFriend: 'Bi hevalek re parve bike / di chatê de',
    photo_searchFriendsPlaceholder: 'Li heval an koman bigere...',
    photo_myStory: 'Çîroka Min',
    photo_storyDurationInfo: 'Dê 24 demjimêran xuya bibe',
    photo_shareCreativePost: 'Posta Wênekêşiyê Parve Bike 🚀',
    photo_copyLink: 'Girêdanê Kopî bike',
    photo_copied: 'Hate Kopîkirin!',
    photo_shareVia: 'Parvekirin bi rêya...',
    photo_deletePostTitle: 'Postê Jê bibe',
    photo_deletePostConfirm: 'Ma hûn guman dinivîsin ku hûn dixwazin vê wêneyê bi domdarî jê bibin? Ev çalakî nayê vegerandin.',
    photo_deletePermanently: 'Bi Temamî Jê bibe',
    photo_imageDetailsTitle: 'Hûrgulî û Taybetmendiyên Wêneyê',
    photo_postId: 'ID ya Postê:',
    photo_creator: 'Wênekêş / Afirîner:',
    photo_imagesCount: 'Hejmara Wêneyan:',
    photo_aspectRatio: 'Rêjeya Alî (Aspect Ratio):',
    photo_locationLabel: 'Cih:',
    photo_backToOptions: 'Vegere Bijaran',
    photo_savingAndDownloading: 'Wêne tê tomarkirin û daxistin...',
    photo_savingQualityNote: 'Guhartoya orîjînal di kalîteya herî bilind de tê daxistin',
    photo_repost: 'Dûbare Parvekirin',
    photo_undoRepost: 'Betalkirina Dûbare Parvekirinê',
    photo_repostDesc: 'Vê postê di feeda xwe de bi şopînerên xwe re parve bike',
    photo_undoRepostDesc: 'Vê postê ji feeda xwe rake',
    photo_newBadge: 'Nû',
    photo_report: 'Raport bike',
    photo_notInterested: 'Ne eleqedar e',
    photo_deleteOption: 'Jê bibe',
    photo_saveOption: 'Tomar bike',
    photo_copyLinkOption: 'Girêdanê Kopî bike',
    photo_detailsOption: 'Hûrguliyên Wêneyê',
    photo_hideUserOption: 'Postên vê bikarhênerê veşêre'
  },
  ckb: {
    photo_all: '✨ هەموو',
    photo_trending: '🔥 باو',
    photo_nature: '🌲 سروشت',
    photo_portrait: '👤 پۆرترێت',
    photo_ai: '⚡ ژیریی دەستکرد',
    photo_art: '🎨 هونەر و دیزاین',
    photo_following: '👥 شۆپێنراوەکان',
    photo_dislike: 'Dislike',
    photo_viewGrid: 'گۆڕین بۆ پیشاندانی تۆڕی (Grid)',
    photo_viewVertical: 'گۆڕین بۆ پیشاندانی ستوونی پڕ بە شاشە',
    photo_grid: 'تۆڕ',
    photo_vertical: 'ستوونی',
    photo_updatingFeed: 'نوێکردنەوە و بڵاوکردنەوەی دوایین دیمەنەکان...',
    photo_pullToRefresh: 'ڕابکێشە بۆ بەردان و نوێکردنەوە ✨',
    photo_noPhotos: 'هیچ وێنەیەک لەم پۆلێنەدا نییە',
    photo_beFirstToPost: 'ببەرە یەکەم کەس کە وێنەی جیاواز و داهێنەرانە بڵاودەکاتەوە!',
    photo_viewAllPhotos: 'پیشاندانی هەموو وێنەکان',
    photo_commentsTitle: 'لێدوانەکان',
    photo_noCommentsYet: 'هێشتا چوونەژوورەوەی لێدوان نییە.. ببەرە یەکەم لێدوان نووس!',
    photo_addCommentPlaceholder: 'لێدوانێکی جوان بنووسە...',
    photo_giftGoldenStar: 'پێشکەشکردنی ئەستێرەی زێڕین 🌟',
    photo_giftStarDescriptionPart1: 'ئەستێرەی زێڕینی نایابی ببەخشە بۆ پشتگیریکردنی ئەم بڵاوکراوە داهێنەرانەیە بە بەهای',
    photo_giftStarDescriptionPart2: 'دراوی HiSee ($10) و هەروەها ئاستی ئەستێرەکەت بەرز بکەرەوە! ✨',
    photo_giftCost: 'تێچووی دیاری:',
    photo_cancel: 'پاشگەزبوونەوە',
    photo_sending: 'دەنێردرێت...',
    photo_confirmGift: 'پەسەندکردنی دیاری ⭐',
    photo_shareWithFriend: 'هاوبەشکردن لەگەڵ هاوڕێیەک / لە چاتدا',
    photo_searchFriendsPlaceholder: 'گەڕان بۆ هاوڕێیان یاخود کۆمەڵەکان...',
    photo_myStory: 'چیرۆکی من',
    photo_storyDurationInfo: 'بۆ ماوەی ٢٤ کاتژمێر دەمێنێتەوە',
    photo_shareCreativePost: 'بڵاوکردنەوەی بڵاوکراوەی فۆتۆگرافی 🚀',
    photo_copyLink: 'کۆپیکردنی بەستەر',
    photo_copied: 'کۆپی کرا!',
    photo_shareVia: 'هاوبەشکردن لە ڕێگەی...',
    photo_deletePostTitle: 'سڕینەوەی بڵاوکراوە',
    photo_deletePostConfirm: 'ئایا دڵنیایت لە سڕینەوەی یەکجارەكيی ئەم وێنەیە؟ ئەم کارە ناگەڕێنرێتەوە.',
    photo_deletePermanently: 'سڕینەوەی هەمیشەیی',
    photo_imageDetailsTitle: 'وردەکاريی و تایبەتمەندییەکانی وێنەکە',
    photo_postId: 'ناسنامەی بڵاوکراوە:',
    photo_creator: 'وێنەگر / داهێنەر:',
    photo_imagesCount: 'ژمارەی وێنەکان لە ئەلبوومەکەدا:',
    photo_aspectRatio: 'ڕێژەی ڕەهەندەکان (Aspect Ratio):',
    photo_locationLabel: 'شوێن:',
    photo_backToOptions: 'گەڕانەوە بۆ بژاردەکان',
    photo_savingAndDownloading: 'وێنەکە پاشەکەوت و دادەگیرێت...',
    photo_savingQualityNote: 'وەشانی ڕەسەن بە بەرزترین کوالێتی دادەگیرێت',
    photo_repost: 'دووبارە بڵاوکردنەوە',
    photo_undoRepost: 'پاشگەزبوونەوە لە دووبارە بڵاوکردنەوە',
    photo_repostDesc: 'ئەم بابەتە لەگەڵ شوێنکەوتووانتدا لە فیدەکەتدا هاوبەش بکە',
    photo_undoRepostDesc: 'ئەم بڵاوکراوەیە لە فیدەکەت لابەرە',
    photo_newBadge: 'نوێ',
    photo_report: 'ڕاپۆرتکردن',
    photo_notInterested: 'گرنگی پێ نادەم',
    photo_deleteOption: 'سڕینەوە',
    photo_saveOption: 'پاشەکەوتکردن',
    photo_copyLinkOption: 'کۆپیکردنی بەستەر',
    photo_detailsOption: 'وردەکارییەکانی وێنەکە',
    photo_hideUserOption: 'شاردنەوەی بڵاوکراوەکانی ئەم بەکارهێنەرە'
  }
};

// Merge photo translations into central translation store at runtime
Object.keys(photoTranslations).forEach(langKey => {
  if (translations[langKey]) {
    Object.assign(translations[langKey], photoTranslations[langKey]);
  } else {
    translations[langKey] = photoTranslations[langKey] as any;
  }
});

const getTPhotos = (lang: string) => {
  const activeLang = lang || 'en';
  return {
    all: getTranslation(activeLang, 'photo_all', '✨ All'),
    trending: getTranslation(activeLang, 'photo_trending', '🔥 Trending'),
    nature: getTranslation(activeLang, 'photo_nature', '🌲 Nature'),
    portrait: getTranslation(activeLang, 'photo_portrait', '👤 Portrait'),
    ai: getTranslation(activeLang, 'photo_ai', '⚡ AI'),
    art: getTranslation(activeLang, 'photo_art', '🎨 Art & Design'),
    following: getTranslation(activeLang, 'photo_following', '👥 Following'),
    dislike: 'Dislike',
    viewGrid: getTranslation(activeLang, 'photo_viewGrid', 'Switch to Grid View'),
    viewVertical: getTranslation(activeLang, 'photo_viewVertical', 'Switch to Fullscreen Vertical View'),
    grid: getTranslation(activeLang, 'photo_grid', 'Grid'),
    vertical: getTranslation(activeLang, 'photo_vertical', 'Vertical'),
    updatingFeed: getTranslation(activeLang, 'photo_updatingFeed', 'Updating and streaming latest photos...'),
    pullToRefresh: getTranslation(activeLang, 'photo_pullToRefresh', 'Pull to release and refresh ✨'),
    noPhotos: getTranslation(activeLang, 'photo_noPhotos', 'No photos in this category'),
    beFirstToPost: getTranslation(activeLang, 'photo_beFirstToPost', 'Be the first to post creative photographs!'),
    viewAllPhotos: getTranslation(activeLang, 'photo_viewAllPhotos', 'View All Photos'),
    commentsTitle: getTranslation(activeLang, 'photo_commentsTitle', 'Comments'),
    noCommentsYet: getTranslation(activeLang, 'photo_noCommentsYet', 'No comments yet.. Be the first to comment!'),
    addCommentPlaceholder: getTranslation(activeLang, 'photo_addCommentPlaceholder', 'Add a nice comment...'),
    giftGoldenStar: getTranslation(activeLang, 'photo_giftGoldenStar', 'Gift Golden Star 🌟'),
    giftStarDescriptionPart1: getTranslation(activeLang, 'photo_giftStarDescriptionPart1', 'Gift the golden star of excellence to support this creative post with a value of'),
    giftStarDescriptionPart2: getTranslation(activeLang, 'photo_giftStarDescriptionPart2', 'HiSee coins ($10) and boost your star level! ✨'),
    giftCost: getTranslation(activeLang, 'photo_giftCost', 'Gift Cost:'),
    cancel: getTranslation(activeLang, 'photo_cancel', 'Cancel'),
    sending: getTranslation(activeLang, 'photo_sending', 'Sending...'),
    confirmGift: getTranslation(activeLang, 'photo_confirmGift', 'Confirm Gift ⭐'),
    shareWithFriend: getTranslation(activeLang, 'photo_shareWithFriend', 'Share with a friend / in chat'),
    searchFriendsPlaceholder: getTranslation(activeLang, 'photo_searchFriendsPlaceholder', 'Search friends or groups...'),
    myStory: getTranslation(activeLang, 'photo_myStory', 'My Story'),
    storyDurationInfo: getTranslation(activeLang, 'photo_storyDurationInfo', 'Will appear for 24 hours'),
    shareCreativePost: getTranslation(activeLang, 'photo_shareCreativePost', 'Share Photographic Post 🚀'),
    copyLink: getTranslation(activeLang, 'photo_copyLink', 'Copy Link'),
    copied: getTranslation(activeLang, 'photo_copied', 'Copied!'),
    shareVia: getTranslation(activeLang, 'photo_shareVia', 'Share via...'),
    deletePostTitle: getTranslation(activeLang, 'photo_deletePostTitle', 'Delete Post'),
    deletePostConfirm: getTranslation(activeLang, 'photo_deletePostConfirm', 'Are you sure you want to permanently delete this photo? This action cannot be undone.'),
    deletePermanently: getTranslation(activeLang, 'photo_deletePermanently', 'Delete Permanently'),
    imageDetailsTitle: getTranslation(activeLang, 'photo_imageDetailsTitle', 'Image Details & Specifications'),
    postId: getTranslation(activeLang, 'photo_postId', 'Post ID:'),
    creator: getTranslation(activeLang, 'photo_creator', 'Photographer / Creator:'),
    imagesCount: getTranslation(activeLang, 'photo_imagesCount', 'Photos in Album:'),
    aspectRatio: getTranslation(activeLang, 'photo_aspectRatio', 'Aspect Ratio:'),
    locationLabel: getTranslation(activeLang, 'photo_locationLabel', 'Location:'),
    backToOptions: getTranslation(activeLang, 'photo_backToOptions', 'Back to Options'),
    savingAndDownloading: getTranslation(activeLang, 'photo_savingAndDownloading', 'Saving and downloading photo...'),
    savingQualityNote: getTranslation(activeLang, 'photo_savingQualityNote', 'Downloading the original version in highest quality'),
    repost: getTranslation(activeLang, 'photo_repost', 'Repost'),
    undoRepost: getTranslation(activeLang, 'photo_undoRepost', 'Undo Repost'),
    repostDesc: getTranslation(activeLang, 'photo_repostDesc', 'Share this post in your feed with followers'),
    undoRepostDesc: getTranslation(activeLang, 'photo_undoRepostDesc', 'Remove this post from your feed'),
    newBadge: getTranslation(activeLang, 'photo_newBadge', 'New'),
    report: getTranslation(activeLang, 'photo_report', 'Report'),
    notInterested: getTranslation(activeLang, 'photo_notInterested', 'Not Interested'),
    deleteOption: getTranslation(activeLang, 'photo_deleteOption', 'Delete'),
    saveOption: getTranslation(activeLang, 'photo_saveOption', 'Save'),
    copyLinkOption: getTranslation(activeLang, 'photo_copyLinkOption', 'Copy Link'),
    detailsOption: getTranslation(activeLang, 'photo_detailsOption', 'Image Details & Specs'),
    hideUserOption: getTranslation(activeLang, 'photo_hideUserOption', 'Hide posts from this user')
  };
};


export const PhotosGalleryView: React.FC<PhotosGalleryViewProps> = ({
  myId,
  myProfile,
  onNavigate,
  onViewProfile,
  isUiVisible: externalIsUiVisible = true,
  onToggleUi,
  targetMediaId,
  lang = "ar"
}) => {
  const activeLang = lang || "ar";
  const tPhotos = getTPhotos(activeLang);
  const { following, users, currentUser } = useUsers();
  const [localUiVisible, setLocalUiVisible] = useState<boolean>(true);

  const isUiVisible = onToggleUi ? externalIsUiVisible : localUiVisible;

  const handleToggleUi = () => {
    if (onToggleUi) {
      onToggleUi();
    } else {
      setLocalUiVisible(prev => !prev);
    }
  };

  // Mode: Default is 'feed' (Full-screen vertical scroll)
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');

  const handledTargetRef = useRef<string | null>(null);
  const [highlightedMediaId, setHighlightedMediaId] = useState<string | null>(null);

  useEffect(() => {
    if (targetMediaId && targetMediaId.type === 'photo' && handledTargetRef.current !== targetMediaId.id) {
      setViewMode('feed');
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById('photo-item-' + targetMediaId.id);
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
    }
  }, [targetMediaId, viewMode]); // depend less to avoid spamming the loop

  // Categories Filter
  const [activeCategory, setActiveCategory] = useState<'all' | 'trending' | 'ai' | 'nature' | 'portrait' | 'art' | 'following'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Realtime photo posts state
  const [photoPosts, setPhotoPosts] = useState<PhotoPost[]>(INITIAL_CURATED_PHOTOS);
  const [realtimeOverrides, setRealtimeOverrides] = useState<Record<string, Partial<PhotoPost>>>({});

  // Active comments drawer
  const [activeCommentsPost, setActiveCommentsPost] = useState<PhotoPost | null>(null);
  const [postComments, setPostComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [isSendingComment, setIsSendingComment] = useState<boolean>(false);

  // Active Gift / Golden Star Modal
  const [activeStarPost, setActiveStarPost] = useState<PhotoPost | null>(null);
  const [showStarExplosion, setShowStarExplosion] = useState<boolean>(false);
  const [starExplosionText, setStarExplosionText] = useState<string>('GOLDEN STAR ★ 1,000 COINS');
  const [isStarring, setIsStarring] = useState<boolean>(false);

  // Share overlay
  const [showShareModal, setShowShareModal] = useState<PhotoPost | null>(null);
  const [shareView, setShareView] = useState<'menu' | 'contacts'>('menu');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Options overlay
  const [activeOptionsPost, setActiveOptionsPost] = useState<PhotoPost | null>(null);
  const [optionsSubView, setOptionsSubView] = useState<'main' | 'details' | 'delete_confirm' | 'saving'>('main');
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(new Set());

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedPhoto, setReportedPhoto] = useState<PhotoPost | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportCommentText, setReportCommentText] = useState('');
  const [toast, setToast] = useState<{message: string, visible: boolean} | null>(null);

  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const showToast = (msg: string, duration: number = 3000) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  // Auto-scroll to top when viewMode, activeCategory, or posts change
  useEffect(() => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = 0;
    }
  }, [viewMode, activeCategory, photoPosts.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (feedContainerRef.current && feedContainerRef.current.scrollTop === 0) {
      const touch = e.touches[0];
      pullTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullTouchStartRef.current || !feedContainerRef.current) return;
    if (feedContainerRef.current.scrollTop > 0) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - pullTouchStartRef.current.y;
    const deltaX = Math.abs(touch.clientX - pullTouchStartRef.current.x);

    // If swiping down and vertical movement is major
    if (deltaY > 0 && deltaY > deltaX) {
      const distance = Math.min(80, deltaY * 0.4);
      setPullDistance(distance);
      
      if (distance > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!pullTouchStartRef.current) return;
    pullTouchStartRef.current = null;

    if (pullDistance > 55 && !isRefreshing) {
      triggerManualRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const triggerManualRefresh = () => {
    setIsRefreshing(true);
    setPullDistance(50); // Keep it visible during loading

    setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
      showToast("✨ تم تحديث المنشورات وجلب أحدث الصور بنجاح!");
      if (feedContainerRef.current) {
        feedContainerRef.current.scrollTop = 0;
      }
    }, 1500);
  };

  // Clean Name Helper
  const cleanName = (name: any) => {
    const nameStr = typeof name === 'string' ? name : (name?.value || '');
    if (!nameStr) return 'مستخدم';
    if (nameStr.includes('@')) return nameStr.split('@')[0];
    if (nameStr.length > 20 && /^[a-zA-Z0-9]+$/.test(nameStr)) return 'مستخدم';
    return nameStr;
  };

  // 1. Listen to Firestore photo posts from 'posts' and 'photos' collections
  useEffect(() => {
    let active = true;

    if (cacheEngine.isOffline()) {
      cacheEngine.getCachedPhotos().then(cached => {
        if (active && cached && cached.length > 0) {
          setPhotoPosts(cached);
        } else if (active) {
          setPhotoPosts(INITIAL_CURATED_PHOTOS);
        }
      });

      const handleOnline = () => {
        window.location.reload();
      };
      window.addEventListener('online', handleOnline);
      return () => {
        active = false;
        window.removeEventListener('online', handleOnline);
      };
    }

    let postsList: PhotoPost[] = [];
    let photosList: PhotoPost[] = [];

    const updateCombinedPhotos = () => {
      if (!active) return;
      const allFetched = [...postsList, ...photosList];

      // Remove duplicate posts
      const uniqueMap = new Map<string, PhotoPost>();
      const seenImageUrls = new Set<string>();

      allFetched.forEach(item => {
        // Use ID for primary deduplication
        if (!uniqueMap.has(item.id)) {
          // Additional check for duplicate content by image URL
          const firstImage = item.images && item.images.length > 0 ? item.images[0] : '';
          if (firstImage && seenImageUrls.has(firstImage)) {
            return; // Skip if we've seen this image already
          }
          if (firstImage) seenImageUrls.add(firstImage);
          uniqueMap.set(item.id, item);
        }
      });

      const sortedList = Array.from(uniqueMap.values());
      sortedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const combined = [...sortedList];
      INITIAL_CURATED_PHOTOS.forEach(curated => {
        if (!combined.some(p => p.id === curated.id)) {
          combined.push(curated);
        }
      });

      // Sort the entire combined list to ensure that the newest posts always appear first
      combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setPhotoPosts(combined.length > 0 ? combined : INITIAL_CURATED_PHOTOS);
    };

    // Helper parser for document snapshot
    const parseDocToPhoto = (docSnap: any): PhotoPost | null => {
      const d = docSnap.data();
      if (!d) return null;

      const isPhoto = d.mediaType === 'photo' || 
                      d.mediaType === 'image' || 
                      d.mediaType === 'gallery' || 
                      d.type === 'photo' || 
                      (d.images && Array.isArray(d.images) && d.images.length > 0) ||
                      (d.imageUrl && !d.imageUrl.match(/\.(mp4|webm|ogg|mov)($|\?)/i)) ||
                      (d.url && !d.url.match(/\.(mp4|webm|ogg|mov)($|\?)/i));

      if (!isPhoto) return null;

      const imagesList: string[] = d.images && Array.isArray(d.images) && d.images.length > 0
        ? d.images
        : (d.imageUrl ? [d.imageUrl] : (d.url ? [d.url] : []));

      if (imagesList.length === 0) return null;

      return {
        id: docSnap.id,
        images: imagesList,
        aspectRatio: d.aspectRatio || '4/5',
        user: d.userName || d.user || d.nickname || 'مبدع HiSee',
        userId: d.userId || d.authorUid || 'unknown',
        userAvatar: normalizeMediaUrl(d.userAvatar || d.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`,
        likes: d.likesCount || d.likes || 0,
        likesCount: d.likesCount || d.likes || 0,
        commentsCount: d.commentsCount || (d.comments ? d.comments.length : 0),
        shares: d.sharesCount || d.shares || 0,
        saves: d.savesCount || d.saves || 0,
        stars: d.stars || 0,
        desc: d.desc || d.description || d.caption || '',
        tags: d.tags || ['#HiSeePhotos'],
        location: d.location || '',
        category: d.category || 'all',
        createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : (d.createdAt?.seconds ? d.createdAt.seconds * 1000 : Date.now())
      };
    };

    // Query 1: collection 'posts'
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      postsList = snap.docs.map(parseDocToPhoto).filter((item): item is PhotoPost => item !== null);
      updateCombinedPhotos();
    }, (err) => {
      console.warn("Posts collection onSnapshot warning:", err);
    });

    // Query 2: collection 'photos'
    const qPhotos = query(collection(db, 'photos'), orderBy('createdAt', 'desc'), limit(100));
    const unsubPhotos = onSnapshot(qPhotos, (snap) => {
      photosList = snap.docs.map(parseDocToPhoto).filter((item): item is PhotoPost => item !== null);
      updateCombinedPhotos();
    }, (err) => {
      console.warn("Photos collection onSnapshot warning:", err);
    });

    return () => {
      active = false;
      unsubPosts();
      unsubPhotos();
    };
  }, []);

  // 1.1 Silent Background Prefetching of Main Feed Photos
  useEffect(() => {
    if (typeof window !== 'undefined' && !cacheEngine.isOffline() && photoPosts && photoPosts.length > 0) {
      const limits = cacheEngine.getLimits();
      const toCache = photoPosts.slice(0, limits.maxPhotos);
      toCache.forEach(post => {
        const url = post.images && post.images.length > 0 ? post.images[0] : '';
        if (url && !url.startsWith('blob:')) {
          cacheEngine.cachePhoto(post.id, url, post);
        }
      });
    }
  }, [photoPosts]);

  // 2. Fetch comments when comments drawer is opened
  useEffect(() => {
    if (!activeCommentsPost) {
      setPostComments([]);
      return;
    }

    const postId = activeCommentsPost.id;
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const qComments = query(commentsRef, orderBy('timestamp', 'asc'), limit(50));

    const unsubComments = onSnapshot(qComments, (snap) => {
      if (!snap.empty) {
        const loaded: Comment[] = snap.docs.map(docSnap => {
          const c = docSnap.data();
          return {
            id: docSnap.id,
            userId: c.userId,
            userName: c.userName || 'مستخدم',
            userAvatar: normalizeMediaUrl(c.userAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`,
            text: c.text,
            likes: c.likes || 0,
            timestamp: c.timestamp ? new Date(c.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'الآن',
            type: c.type || 'text',
            stickerUrl: c.stickerUrl,
            giftUrl: c.giftUrl
          };
        });
        setPostComments(loaded);
      } else {
        // Provide rich engaging mock comments for curated posts
        setPostComments([
          {
            id: 'c-1',
            userId: 'fan1',
            userName: 'أحمد التميمي',
            userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
            text: 'ما شاء الله تبارك الله! زاوية وإضاءة خيالية جداً 👏✨',
            likes: 12,
            timestamp: 'منذ 15 د'
          },
          {
            id: 'c-2',
            userId: 'fan2',
            userName: 'ريما العلي',
            userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80',
            text: 'مبدع ومتميز كالعادة.. استمر في هذا الإلهام! 💫',
            likes: 8,
            timestamp: 'منذ 5 د'
          }
        ]);
      }
    }, (err) => {
      console.warn("Comments snapshot fallback:", err);
    });

    return () => unsubComments();
  }, [activeCommentsPost]);

  // Handle Like Toggle with optimistic UI
  const handleToggleLike = async (post: PhotoPost) => {
    const currentUid = auth.currentUser?.uid || myId;
    const isLiked = realtimeOverrides[post.id]?.isLiked ?? (localStorage.getItem(`photo_liked_${post.id}`) === 'true');
    const currentLikes = realtimeOverrides[post.id]?.likes ?? (post.likes || 0);

    const newLiked = !isLiked;
    const newLikesCount = newLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);

    // Save to local storage
    if (newLiked) localStorage.setItem(`photo_liked_${post.id}`, 'true');
    else localStorage.removeItem(`photo_liked_${post.id}`);

    // Update overrides immediately
    setRealtimeOverrides(prev => ({
      ...prev,
      [post.id]: {
        ...prev[post.id],
        isLiked: newLiked,
        likes: newLikesCount
      }
    }));

    // Update Firestore if available
    try {
      const postRef = doc(db, 'posts', post.id);
      await setDoc(postRef, {
        likesCount: increment(newLiked ? 1 : -1)
      }, { merge: true });

      // Add like notification to creator
      if (newLiked && post.userId && post.userId !== currentUid) {
        await addDoc(collection(db, 'users', post.userId, 'notifications'), {
          type: 'photo_like',
          fromUserId: currentUid,
          fromUserName: cleanName(myProfile?.name || auth.currentUser?.displayName || 'مستخدم'),
          fromUserAvatar: myProfile?.avatar || auth.currentUser?.photoURL || '',
          postId: post.id,
          postCover: post.images[0] || '',
          timestamp: serverTimestamp(),
          isRead: false
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Firestore like update error:", e);
    }
  };

  // Handle Send Comment
  const handleSendComment = async () => {
    if (!commentInput.trim() || !activeCommentsPost) return;
    const currentUid = auth.currentUser?.uid || myId;

    // Rate Limiting Check (ProtectionEngine)
    if (!ProtectionEngine.checkRateLimit(currentUid, 3, 3000)) {
      alert('يرجى الانتظار لحظات قبل إرسال تعليق آخر.');
      return;
    }

    // Text Sanitization (ProtectionEngine)
    const { cleanText } = ProtectionEngine.sanitizeText(commentInput.trim());
    if (!cleanText) return;

    const textToSend = cleanText;
    setCommentInput('');
    setIsSendingComment(true);

    const newComment: Comment = {
      id: `c-local-${Date.now()}`,
      userId: currentUid,
      userName: cleanName(myProfile?.name || auth.currentUser?.displayName || 'أنا'),
      userAvatar: normalizeMediaUrl(myProfile?.avatar || auth.currentUser?.photoURL) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUid}`,
      text: textToSend,
      likes: 0,
      timestamp: 'الآن'
    };

    setPostComments(prev => [...prev, newComment]);

    // Update post comment count optimistically
    const currentCount = realtimeOverrides[activeCommentsPost.id]?.commentsCount ?? (activeCommentsPost.commentsCount || 0);
    setRealtimeOverrides(prev => ({
      ...prev,
      [activeCommentsPost.id]: {
        ...prev[activeCommentsPost.id],
        commentsCount: currentCount + 1
      }
    }));

    try {
      const commentsRef = collection(db, 'posts', activeCommentsPost.id, 'comments');
      await addDoc(commentsRef, {
        userId: currentUid,
        userName: cleanName(myProfile?.name || auth.currentUser?.displayName || 'مستخدم'),
        userAvatar: myProfile?.avatar || auth.currentUser?.photoURL || '',
        text: textToSend,
        timestamp: serverTimestamp(),
        likes: 0
      });

      const postRef = doc(db, 'posts', activeCommentsPost.id);
      await setDoc(postRef, {
        commentsCount: increment(1)
      }, { merge: true });

      // Notify post author
      if (activeCommentsPost.userId && activeCommentsPost.userId !== currentUid) {
        await addDoc(collection(db, 'users', activeCommentsPost.userId, 'notifications'), {
          type: 'photo_comment',
          fromUserId: currentUid,
          fromUserName: cleanName(myProfile?.name || auth.currentUser?.displayName || 'مستخدم'),
          fromUserAvatar: myProfile?.avatar || auth.currentUser?.photoURL || '',
          postId: activeCommentsPost.id,
          postCover: activeCommentsPost.images[0] || '',
          text: textToSend,
          timestamp: serverTimestamp(),
          isRead: false
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Firestore comment error:", e);
    } finally {
      setIsSendingComment(false);
    }
  };

  // Handle Golden Star (1,000 Coins)
  const handleSendGoldenStar = async (post: PhotoPost) => {
    const currentUid = auth.currentUser?.uid || myId;
    if (isStarring) return;
    setIsStarring(true);

    try {
      // 1. Check user coins
      const userRef = doc(db, 'users', currentUid);
      const userSnap = await getDoc(userRef).catch(() => null);
      const userData = userSnap && userSnap.exists() ? userSnap.data() : {};
      
      const serverPaid = typeof userData.paidCoins === 'number' ? userData.paidCoins : (userData.coins || 0);
      const serverBonus = typeof userData.bonusCoins === 'number' ? userData.bonusCoins : 0;
      const myCoins = serverPaid + serverBonus;

      if (myCoins < 1000) {
        alert("رصيدك الحالي غير كافٍ لإهداء النجمة الذهبية (1000 عملة). يرجى شحن رصيدك من المحفظة.");
        setIsStarring(false);
        return;
      }

      // 2. Deduct 1000 coins from sender using the standard consumer friendly pattern (bonus first, then paid)
      let newBonus = serverBonus;
      let newPaid = serverPaid;
      if (serverBonus >= 1000) {
        newBonus = serverBonus - 1000;
      } else {
        newBonus = 0;
        newPaid = serverPaid - (1000 - serverBonus);
      }

      await setDoc(userRef, {
        paidCoins: newPaid,
        bonusCoins: newBonus,
        coins: newPaid + newBonus
      }, { merge: true }).catch(() => {});

      // Synchronize local storage fallbacks immediately
      localStorage.setItem("localFallbackPaidCoins", newPaid.toString());
      localStorage.setItem("localFallbackBonusCoins", newBonus.toString());
      localStorage.setItem("localFallbackCoins", (newPaid + newBonus).toString());

      const postRef = doc(db, 'posts', post.id);
      await setDoc(postRef, {
        stars: increment(1),
        starCounts: { [currentUid]: increment(1) }
      }, { merge: true }).catch(() => {});

      if (post.userId && post.userId !== currentUid) {
        const creatorRef = doc(db, 'users', post.userId);
        await setDoc(creatorRef, {
          diamonds: increment(1000),
          totalStarsReceived: increment(1)
        }, { merge: true }).catch(() => {});

        // Send Golden Star notification
        await addDoc(collection(db, 'users', post.userId, 'notifications'), {
          type: 'golden_star',
          fromUserId: currentUid,
          fromUserName: cleanName(myProfile?.name || auth.currentUser?.displayName || 'مستخدم مميز'),
          fromUserAvatar: myProfile?.avatar || auth.currentUser?.photoURL || '',
          postId: post.id,
          postCover: post.images[0] || '',
          amount: 1000,
          timestamp: serverTimestamp(),
          isRead: false
        }).catch(() => {});
      }

      // Update local override
      const currentStars = realtimeOverrides[post.id]?.stars ?? (post.stars || 0);
      setRealtimeOverrides(prev => ({
        ...prev,
        [post.id]: {
          ...prev[post.id],
          stars: currentStars + 1,
          isStarred: true
        }
      }));

      // Trigger Celebration Animation
      setStarExplosionText(`تم إهداء نجمة ذهبية إلى ${post.user} ⭐ (+1000 ماسة)`);
      setShowStarExplosion(true);
      setActiveStarPost(null);
      setTimeout(() => setShowStarExplosion(false), 3800);

    } catch (e) {
      console.error("Star gift error:", e);
      alert("حدث خطأ أثناء إرسال النجمة الذهبية.");
    } finally {
      setIsStarring(false);
    }
  };

  // Handle Option Menu Action (Report, Not Interested, Save Photo, Delete, Copy Link, Details, Hide User)
  const handleOptionAction = async (action: string, post: PhotoPost) => {
    const currentUid = auth.currentUser?.uid || myId;
    if (action === 'report') {
      setActiveOptionsPost(null);
      setReportedPhoto(post);
      setReportReason('');
      setReportCommentText('');
      setShowReportModal(true);
    } else if (action === 'not_interested') {
      alert("تم حفظ تفضيلك، سنقلل من اقتراح مثل هذا المحتوى لك.");
      setActiveOptionsPost(null);
    } else if (action === 'copy_link') {
      const shareUrl = showShareModal ? window.location.href.split("?")[0].split("#")[0] + "?type=photo&id=" + showShareModal.id : window.location.href.split("?")[0].split("#")[0];
      navigator.clipboard.writeText(shareUrl);
      alert("تم نسخ رابط الصورة بنجاح إلى الحافظة!");
      setActiveOptionsPost(null);
    } else if (action === 'save') {
      let showMediaInGallery = true;
      try {
        const saved = localStorage.getItem('hisee_chat_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.showMediaInGallery === false) {
            showMediaInGallery = false;
          }
        }
      } catch (e) {}

      if (!showMediaInGallery) {
        alert("⚠️ عذراً، لا يمكنك حفظ الوسائط لأن خيار 'عرض الوسائط في معرض الهاتف' معطل في إعدادات خصوصية المعرض لديك.");
        setActiveOptionsPost(null);
        return;
      }

      setOptionsSubView('saving');
      let p = 0;
      const interval = setInterval(() => {
        p += 25;
        setSaveProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Trigger image download
            const link = document.createElement('a');
            link.href = normalizeMediaUrl(post.images[0]);
            link.download = `HiSee_Photo_${post.id}.jpg`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            alert("تم حفظ الصورة بنجاح بأعلى دقة متوفرة!");
            setActiveOptionsPost(null);
            setOptionsSubView('main');
            setSaveProgress(0);
          }, 300);
        }
      }, 150);
    } else if (action === 'details') {
      setOptionsSubView('details');
    } else if (action === 'delete_confirm') {
      setOptionsSubView('delete_confirm');
    } else if (action === 'delete') {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'posts', post.id));
        batch.delete(doc(db, 'photos', post.id));
        await batch.commit();
        setPhotoPosts(prev => prev.filter(p => p.id !== post.id));
        alert("تم حذف الصورة بنجاح من كافة الأقسام.");
      } catch (err) {
        console.error("Delete photo error:", err);
        setPhotoPosts(prev => prev.filter(p => p.id !== post.id));
        alert("تم حذف الصورة بنجاح.");
      }
      setActiveOptionsPost(null);
      setOptionsSubView('main');
    } else if (action === 'repost') {
      setActiveOptionsPost(null);
      if (!currentUid) {
        showToast('يرجى تسجيل الدخول أولاً');
        return;
      }
      const isCurrentlyReposted = localStorage.getItem(`reposted_${post.id}`) === 'true' || 
        (post.repostedBy && Array.isArray(post.repostedBy) && post.repostedBy.includes(currentUid)) || 
        Boolean(post.isReposted);
      const willBeReposted = !isCurrentlyReposted;

      if (willBeReposted) {
        localStorage.setItem(`reposted_${post.id}`, 'true');
      } else {
        localStorage.removeItem(`reposted_${post.id}`);
      }

      window.dispatchEvent(new CustomEvent('hisee_repost_toggled', {
        detail: { videoId: post.id, isReposted: willBeReposted, userId: currentUid }
      }));

      if (willBeReposted) {
        showToast('تمت إعادة نشر الفيديو في خلاصتك');
      } else {
        showToast('تم إلغاء إعادة نشر الفيديو من خلاصتك');
      }

      try {
        const postDocRef = doc(db, 'posts', post.id);
        const photoDocRef = doc(db, 'photos', post.id);
        const repostDocId = `${currentUid}_${post.id}`;
        const globalRepostDocRef = doc(db, 'reposts', repostDocId);
        const userRepostDocRef = doc(db, 'users', currentUid, 'reposts', post.id);

        if (willBeReposted) {
          const updates = {
            repostsCount: increment(1),
            reposts: increment(1),
            repostedBy: arrayUnion(currentUid)
          };
          await Promise.all([
            updateDoc(postDocRef, updates).catch(() => setDoc(postDocRef, updates, { merge: true }).catch(() => {})),
            updateDoc(photoDocRef, updates).catch(() => {}),
            setDoc(globalRepostDocRef, {
              userId: currentUid,
              userName: myProfile?.name || auth.currentUser?.displayName || 'مستخدم',
              userAvatar: myProfile?.avatar || auth.currentUser?.photoURL || '',
              videoId: post.id,
              mediaUrl: post.images?.[0] || post.url || '',
              desc: post.desc || '',
              authorId: post.userId || '',
              authorName: post.user || '',
              authorAvatar: post.userAvatar || '',
              repostedAt: serverTimestamp(),
              createdAt: Date.now()
            }, { merge: true }).catch(() => {}),
            setDoc(userRepostDocRef, {
              postId: post.id,
              repostedAt: serverTimestamp(),
              createdAt: Date.now()
            }, { merge: true }).catch(() => {})
          ]);
        } else {
          const updates = {
            repostsCount: increment(-1),
            reposts: increment(-1),
            repostedBy: arrayRemove(currentUid)
          };
          await Promise.all([
            updateDoc(postDocRef, updates).catch(() => {}),
            updateDoc(photoDocRef, updates).catch(() => {}),
            deleteDoc(globalRepostDocRef).catch(() => {}),
            deleteDoc(userRepostDocRef).catch(() => {})
          ]);
        }
      } catch (err) {
        console.error("Error updating repost in photos:", err);
      }
    } else if (action === 'hide_user') {
      setHiddenUserIds(prev => new Set(prev).add(post.userId));
      alert(`تم إخفاء جميع منشورات @${cleanName(post.user)}.`);
      setActiveOptionsPost(null);
    }
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return photoPosts.filter(p => {
      if (hiddenUserIds.has(p.userId)) return false;
      if (activeCategory === 'following') {
        return following.has(p.userId);
      }
      if (activeCategory !== 'all') {
        if (p.category !== activeCategory && !p.tags?.some(t => t.includes(activeCategory))) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser = p.user.toLowerCase().includes(q);
        const matchesDesc = p.desc.toLowerCase().includes(q);
        const matchesTags = p.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesUser && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });
  }, [photoPosts, activeCategory, searchQuery, following, hiddenUserIds]);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden select-none font-sans" dir="rtl">
      
      {/* Category Sub-Filters & View Mode Switcher (Positioned cleanly below the main TopBar) */}
      {isUiVisible && (
        <div className="absolute top-12 sm:top-14 left-0 right-0 z-30 px-2 sm:px-4 flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-center justify-between gap-2 p-1">
            {/* Sub-Categories Horizontal Scrollable Bar */}
            <div className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none py-0.5 px-1">
              {[
                { id: 'all', label: tPhotos.all },
                { id: 'trending', label: tPhotos.trending },
                { id: 'nature', label: tPhotos.nature },
                { id: 'portrait', label: tPhotos.portrait },
                { id: 'ai', label: tPhotos.ai },
                { id: 'art', label: tPhotos.art },
                { id: 'following', label: tPhotos.following }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${
                    activeCategory === cat.id
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-105'
                      : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher (Feed vs Grid) */}
            <button
              onClick={() => setViewMode(prev => prev === 'feed' ? 'grid' : 'feed')}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center gap-1 text-[11px] font-black shadow-md transition-all shrink-0 cursor-pointer"
              title={viewMode === 'feed' ? tPhotos.viewGrid : tPhotos.viewVertical}
            >
              {viewMode === 'feed' ? (
                <>
                  <LayoutGrid size={13} className="text-emerald-400" />
                  <span className="hidden sm:inline">{tPhotos.grid}</span>
                </>
              ) : (
                <>
                  <Layers size={13} className="text-emerald-400" />
                  <span className="hidden sm:inline">{tPhotos.vertical}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Pull to Refresh Indicator - Positioned cleanly below the category bar */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          style={{ 
            top: isUiVisible ? '105px' : '48px',
            opacity: Math.min(1, pullDistance / 40),
            transform: `translateY(${Math.min(25, pullDistance * 0.35)}px) scale(${Math.min(1, 0.85 + (pullDistance / 200))})`,
            transition: isRefreshing ? 'all 0.25s ease-out' : 'opacity 0.15s ease-out, transform 0.15s ease-out'
          }}
          className="absolute left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-all"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/90 border border-emerald-500/30 backdrop-blur-xl shadow-[0_8px_25px_rgba(0,0,0,0.8)]">
            {isRefreshing ? (
              <Loader2 size={16} className="text-emerald-400 animate-spin shrink-0" />
            ) : (
              <Compass 
                size={16} 
                className="text-emerald-400 shrink-0" 
                style={{ transform: `rotate(${pullDistance * 6}deg)` }} 
              />
            )}
            <span className="text-[11px] font-bold text-white/95 whitespace-nowrap">
              {isRefreshing ? tPhotos.updatingFeed : tPhotos.pullToRefresh}
            </span>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: FULL-SCREEN VERTICAL FEED (DEFAULT) */}
      {viewMode === 'feed' ? (
        <div 
          ref={feedContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth relative"
        >
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const liveData = {
                ...post,
                ...realtimeOverrides[post.id]
              };
              return (
                <FullScreenPhotoFeedCard
                  key={post.id}
                  post={liveData}
                  isHighlighted={highlightedMediaId === post.id}
                  myId={myId}
                  myProfile={myProfile}
                  users={users}
                  isUiVisible={isUiVisible}
                  onToggleLike={() => handleToggleLike(post)}
                  onOpenComments={() => setActiveCommentsPost(post)}
                  onOpenStarGift={() => setActiveStarPost(post)}
                  onOpenShare={() => setShowShareModal(post)}
                  onOpenOptions={() => {
                    setActiveOptionsPost(post);
                    setOptionsSubView('main');
                  }}
                  onViewProfile={onViewProfile}
                  onToggleUi={handleToggleUi}
                />
              );
            })
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <ImageIcon size={32} className="text-emerald-400" />
              </div>
              <h4 className="text-lg font-black text-white mb-1">{tPhotos.noPhotos}</h4>
              <p className="text-xs text-white/50 mb-4">{tPhotos.beFirstToPost}</p>
              <button
                onClick={() => setActiveCategory('all')}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                عرض كل الصور
              </button>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: MASONRY GRID VIEW */
        <div className="h-full w-full overflow-y-auto no-scrollbar pt-28 pb-24 px-3">
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {filteredPosts.map((post) => {
              const liveData = { ...post, ...realtimeOverrides[post.id] };
              return (
                <div
                  key={post.id}
                  onClick={() => {
                    // Switch to feed mode and scroll to post or open full-screen
                    setViewMode('feed');
                  }}
                  className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-[#11141d] border border-white/10 shadow-xl cursor-pointer hover:scale-[1.02] transition-all duration-300"
                >
                  <img
                    src={normalizeMediaUrl(post.images[0])}
                    alt={post.desc}
                    className="w-full object-cover rounded-2xl"
                    loading="lazy"
                  />

                  {/* Multi-image indicator */}
                  {post.images.length > 1 && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center gap-1 text-[10px] font-black">
                      <Layers size={10} className="text-emerald-400" />
                      <span>{post.images.length}</span>
                    </div>
                  )}

                  {/* Stars Badge */}
                  {(liveData.stars || 0) > 0 && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md border border-amber-300/60 text-black flex items-center gap-1 text-[10px] font-black shadow-lg">
                      <Star size={10} className="fill-black text-black" />
                      <span>{liveData.stars}</span>
                    </div>
                  )}

                  {/* Bottom details overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <div className="flex items-center gap-1.5 mb-1">
                      <img
                        src={(users && users[post.userId] ? users[post.userId].avatar : post.userAvatar) || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.userId}
                        alt={post.user}
                        className="w-5 h-5 rounded-full object-cover border border-white/30"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`; }}
                      />
                      <span className="text-[11px] font-bold text-white truncate">{cleanName(post.user)}</span>
                    </div>
                    <p className="text-[10px] text-white/80 line-clamp-1 mb-1.5">{post.desc}</p>
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <div className="flex items-center gap-1">
                        <Heart size={10} className={liveData.isLiked ? "fill-rose-500 text-rose-500" : ""} />
                        <span>{liveData.likes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare size={10} />
                        <span>{liveData.commentsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMMENTS SLIDE-UP DRAWER */}
      <AnimatePresence>
        {activeCommentsPost && (
          <div className="absolute inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCommentsPost(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg mx-auto bg-[#0c0f17] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl z-10 flex flex-col shadow-2xl overflow-hidden pb-16 sm:pb-3 max-h-[80vh] sm:max-h-[85vh] h-[540px] sm:h-[580px]"
            >
              {/* Drawer Header */}
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-black text-white">{tPhotos.commentsTitle}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                    {postComments.length}
                  </span>
                </div>
                <button
                  onClick={() => setActiveCommentsPost(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                {postComments.length > 0 ? (
                  postComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <img
                        src={(users && users[c.userId] ? users[c.userId].avatar : c.userAvatar) || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + c.userId}
                        alt={c.userName}
                        className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`; }}
                      />
                      <div className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-emerald-400">{cleanName(c.userName)}</span>
                          <span className="text-[10px] text-white/40">{c.timestamp}</span>
                        </div>
                        <p className="text-xs text-white/90 leading-relaxed break-words">{c.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <MessageSquare size={32} className="text-white/20 mb-2" />
                    <p className="text-xs text-white/40">{tPhotos.noCommentsYet}</p>
                  </div>
                )}
              </div>

              {/* Comment Input Bar */}
              <div className="p-3 bg-[#080a10] border-t border-white/10 flex items-center gap-2 mb-1 sm:mb-0">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                  placeholder={tPhotos.addCommentPlaceholder}
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/10 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentInput.trim() || isSendingComment}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Send size={16} className={isSendingComment ? "animate-pulse" : ""} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GOLDEN STAR CONFIRMATION MODAL - PORTALED TO SCREEN CENTER */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeStarPost && (
            <div 
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto pointer-events-auto bg-black/80 backdrop-blur-md"
              onClick={(e) => { e.stopPropagation(); setActiveStarPost(null); }}
              style={{ margin: 0 }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-[90vw] max-w-sm mx-auto my-auto bg-[#0f1422] border-2 border-amber-400/40 rounded-3xl p-6 pb-7 text-center shadow-[0_0_40px_rgba(251,191,36,0.3)] overflow-hidden max-h-[85vh] overflow-y-auto"
              >
                {/* Background Glow */}
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 mx-auto flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-bounce">
                  <Star size={32} className="fill-black text-black" />
                </div>

                <h3 className="text-lg font-black text-white mb-1">{tPhotos.giftGoldenStar}</h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  {activeLang === 'ar' ? (
                    <>أهدِ <span className="text-amber-400 font-bold">{cleanName(activeStarPost.user)}</span> نجمة التميز الذهبية لدعم هذا المنشور الإبداعي بقيمة <span className="text-amber-400 font-bold">1,000 عملة HiSee ($10)</span> ويعزز أيضاً مستواك في النجوم! ✨</>
                  ) : activeLang === 'de' ? (
                    <>Schenke <span className="text-amber-400 font-bold">{cleanName(activeStarPost.user)}</span> den goldenen Stern der Exzellenz, um diesen kreativen Beitrag im Wert von <span className="text-amber-400 font-bold">1.000 HiSee-Coins ($10)</span> zu unterstützen und dein Sternenlevel zu erhöhen! ✨</>
                  ) : activeLang === 'ckb' ? (
                    <>ئەستێرەی زێڕینی نایابی ببەخشە بە <span className="text-amber-400 font-bold">{cleanName(activeStarPost.user)}</span> بۆ پشتگیریکردنی ئەم بڵاوکراوە داهێنەرانەیە بە بەهای <span className="text-amber-400 font-bold">١,٠٠٠ دراوی HiSee ($10)</span> و هەروەها ئاستی ئەستێرەکەت بەرز بکەرەوە! ✨</>
                  ) : activeLang.startsWith('ku') ? (
                    <>Stêrka zêrîn a jêhatîbûnê bidin <span className="text-amber-400 font-bold">{cleanName(activeStarPost.user)}</span> da ku piştgirî bidin vê posta afirîner bi bihayê <span className="text-amber-400 font-bold">1.000 HiSee coin ($10)</span> û her weha asta stêrka xwe zêde bikin! ✨</>
                  ) : (
                    <>Gift <span className="text-amber-400 font-bold">{cleanName(activeStarPost.user)}</span> the golden star of excellence to support this creative post with a value of <span className="text-amber-400 font-bold">1,000 HiSee coins ($10)</span> and also boost your star level! ✨</>
                  )}
                </p>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-5 flex items-center justify-between text-xs font-bold text-white">
                  <span className="text-slate-400">{tPhotos.giftCost}</span>
                  <div className="text-amber-400 flex items-center gap-1.5 font-mono text-sm font-black">
                    <HiSeeCoinIcon size={22} className="inline-block shrink-0" />
                    <span>1,000</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveStarPost(null)}
                    className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-bold transition-all cursor-pointer"
                  >
                    {tPhotos.cancel}
                  </button>
                  <button
                    onClick={() => handleSendGoldenStar(activeStarPost)}
                    disabled={isStarring}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isStarring ? tPhotos.sending : tPhotos.confirmGift}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* CELEBRATION STAR EXPLOSION BANNER */}
      <AnimatePresence>
        {showStarExplosion && (
          <div className="fixed inset-0 z-[150] pointer-events-none flex flex-col items-center justify-center overflow-hidden bg-black/40">
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
                            <linearGradient id="hugeStarGoldBevelPhoto" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fffbeb" />
                                <stop offset="15%" stopColor="#fde047" />
                                <stop offset="40%" stopColor="#f59e0b" />
                                <stop offset="70%" stopColor="#d97706" />
                                <stop offset="100%" stopColor="#78350f" />
                            </linearGradient>
                            <linearGradient id="hugeStarExtrusionPhoto" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#92400e" />
                                <stop offset="100%" stopColor="#451a03" />
                            </linearGradient>
                            <filter id="hugeStarShadowPhoto" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.8"/>
                            </filter>
                        </defs>
                        <path
                          d="M50 10 L68 38 L100 41 L74 65 L82 96 L50 78 L18 96 L26 65 L0 41 L32 38 Z"
                          fill="url(#hugeStarExtrusionPhoto)"
                          stroke="#3f1902"
                          strokeWidth="3.5"
                          strokeLinejoin="round"
                          filter="url(#hugeStarShadowPhoto)"
                        />
                        <path
                          d="M50 4 L64 33 L96 36 L72 58 L79 89 L50 73 L21 89 L28 58 L4 36 L36 33 Z"
                          fill="url(#hugeStarGoldBevelPhoto)"
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

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && (
          <div className="absolute inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowShareModal(null); setShareView('menu'); setSelectedContacts(new Set()); }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            {shareView === 'contacts' ? (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] h-[75vh] sm:h-[580px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <button onClick={() => setShareView('menu')} className="p-2 text-white/60 hover:text-white transition-colors text-xs font-bold cursor-pointer">إلغاء</button>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">مشاركة مع صديق / في دردشة</h3>
                    <button 
                      onClick={async () => {
                        if (selectedContacts.size === 0) return;
                        try {
                            const shareTargetLink = showShareModal ? window.location.href.split("?")[0].split("#")[0] + "?type=photo&id=" + showShareModal.id : window.location.href.split("?")[0].split("#")[0];
                            for (const contactId of selectedContacts) {
                                if (contactId === 'me') {
                                    await addDoc(collection(db, 'stories'), {
                                        userId: myId,
                                        userName: auth.currentUser?.displayName || 'مستخدم',
                                        userAvatar: auth.currentUser?.photoURL || '',
                                        mediaUrl: showShareModal.images[0] || '',
                                        type: 'image',
                                        desc: showShareModal.desc || '',
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
                                        text: `مشاركة منشور: ${showShareModal.desc || ''}\nالرابط: ${shareTargetLink}`,
                                        mediaUrl: showShareModal.images[0] || '',
                                        sharedLink: shareTargetLink,
                                        sharedTitle: showShareModal.desc || 'منشور بدون عنوان',
                                        sharedThumbnail: showShareModal.images[0] || '',
                                        sharedType: 'image',
                                        timestamp: serverTimestamp(),
                                        createdAt: Date.now()
                                    });

                                    await addDoc(collection(db, 'users', contactId, 'notifications'), {
                                        type: 'share',
                                        title: 'مشاركة منشور جديد',
                                        message: `شارك معك ${auth.currentUser?.displayName || 'مستخدم'} صورة`,
                                        link: shareTargetLink,
                                        sharedLink: shareTargetLink,
                                        sharedTitle: showShareModal.desc || 'منشور بدون عنوان',
                                        sharedThumbnail: showShareModal.images[0] || '',
                                        mediaUrl: showShareModal.images[0] || '',
                                        photoId: showShareModal.id || '',
                                        sharedType: 'image',
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
                            setShowShareModal(null);
                            setShareView('menu');
                            setSelectedContacts(new Set());
                        } catch (err) {
                            console.error(err);
                            setToast({ message: 'حدث خطأ أثناء المشاركة، يرجى المحاولة مرة أخرى.', visible: true });
                            setTimeout(() => setToast(null), 3000);
                        }
                      }} 
                      disabled={selectedContacts.size === 0} 
                      className={`p-2 font-black text-xs transition-colors cursor-pointer ${selectedContacts.size > 0 ? 'text-emerald-500' : 'text-white/25'}`}
                    >
                      إرسال
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    <div className="bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
                        <Search size={16} className="text-white/40" />
                        <input placeholder="بحث عن أصدقاء أو مجموعات..." className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-white/30" />
                    </div>
                    {[
                      { id: 'me', name: 'قصتي (My Story)', avatar: showShareModal.userAvatar, isSpecial: true },
                      ...(Object.values(users) as any[]).filter((u: any) => u.id !== myId).map((u: any) => ({ id: u.id, name: u.name, avatar: u.avatar, isSpecial: false }))
                    ].map((contact, index) => (
                        <div 
                            key={contact.isSpecial ? 'story-me' : `contact-${contact.id}-${index}`} 
                            onClick={() => {
                                const newSet = new Set(selectedContacts);
                                if (newSet.has(contact.id)) newSet.delete(contact.id);
                                else newSet.add(contact.id);
                                setSelectedContacts(newSet);
                            }}
                            className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${selectedContacts.has(contact.id) ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="relative">
                                <img src={normalizeMediaUrl(contact.avatar)} className="w-11 h-11 rounded-full object-cover bg-slate-800" />
                                {contact.isSpecial && <div className="absolute -bottom-1 -right-1 bg-blue-500 p-1 rounded-full"><History size={10} className="text-white" /></div>}
                            </div>
                            <div className="flex-1 overflow-hidden text-right">
                                <h4 className="text-xs font-bold text-white truncate">{contact.name}</h4>
                                {contact.isSpecial && <p className="text-[10px] text-slate-400">ستظهر لمدة 24 ساعة</p>}
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedContacts.has(contact.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                {selectedContacts.has(contact.id) && <Check size={14} className="text-white" strokeWidth={4} />}
                            </div>
                        </div>
                    ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm mx-auto bg-[#0e121c] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 pb-20 sm:pb-6 shadow-2xl text-center max-h-[85vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 text-start">مشاركة المنشور الفوتوغرافي 🚀</h3>
                  <button onClick={() => { setShowShareModal(null); setShareView('menu'); }} className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                </div>
                
                {/* Sharing HiSee in Chat / With Friend */}
                <div className="mb-5">
                    <button 
                      onClick={() => setShareView('contacts')}
                      className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900/40 to-slate-800 border border-emerald-500/20 flex items-center justify-between group hover:border-emerald-500/50 transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden shrink-0">
                                <ModernHSLogo size={32} className="relative z-10" />
                                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                            </div>
                            <div className="text-start">
                                <h4 className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors">مشاركة في دردشة (Sharing HiSee)</h4>
                                <p className="text-[10px] text-slate-400">مشاركة مع صديق، في دردشة أو قصة</p>
                            </div>
                        </div>
                        <div className="bg-emerald-500 p-2 rounded-full text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                            <Send size={16} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                        </div>
                    </button>
                </div>

                {/* Social Share Apps Grid */}
                <div className="grid grid-cols-4 gap-x-3 gap-y-5 mb-5">
                  {[
                    { 
                      name: 'WhatsApp', 
                      icon: (
                        <div className="w-full h-full bg-[#25D366] flex items-center justify-center rounded-[1.2rem]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                        </div>
                      ), 
                      action: () => window.open(`https://wa.me/?text=${encodeURIComponent('شاهد هذه الصورة الرائعة على HiSee: ' + window.location.origin.replace(/\/$/, '') + '/?type=photo&id=' + (showShareModal ? showShareModal.id : ''))}`) 
                    },
                    { 
                      name: 'Instagram', 
                      icon: (
                        <div className="w-full h-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center rounded-[1.2rem]">
                            <Instagram size={28} className="text-white" />
                        </div>
                      ),
                      action: () => alert('تم نسخ الرابط! يمكنك الآن لصقه في قصتك على انستجرام.') 
                    },
                    { 
                      name: 'Facebook', 
                      icon: (
                        <div className="w-full h-full bg-[#1877F2] flex items-center justify-center rounded-[1.2rem]">
                            <Facebook size={28} className="text-white fill-current" />
                        </div>
                      ),
                      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`) 
                    },
                    { 
                      name: 'X (Twitter)', 
                      icon: (
                        <div className="w-full h-full bg-black flex items-center justify-center rounded-[1.2rem] border border-white/20">
                            <Twitter size={28} className="text-white fill-current" />
                        </div>
                      ),
                      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(showShareModal.desc)}&url=${encodeURIComponent(`${window.location.origin}/?type=photo&id=${showShareModal.id}`)}`) 
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
                      action: () => { navigator.clipboard.writeText(window.location.href); alert('تم نسخ الرابط! يمكنك مشاركته على تيك توك (TikTok).'); }
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
                      action: () => { navigator.clipboard.writeText(window.location.href); alert('تم نسخ الرابط! يمكنك مشاركته على سناب شات (Snapchat).'); }
                    }
                  ].map((opt) => (
                     <div key={opt.name} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={opt.action}>
                        <div className="w-12 h-12 shadow-lg transition-transform active:scale-90 group-hover:scale-105">
                           {opt.icon}
                        </div>
                        <span className="text-[9px] font-bold text-white/60 group-hover:text-white tracking-wide text-center leading-tight">{opt.name}</span>
                     </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10 mb-4 text-right">
                  <img
                    src={normalizeMediaUrl(showShareModal.images[0])}
                    alt="cover"
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{cleanName(showShareModal.user)}</p>
                    <p className="text-[11px] text-white/60 line-clamp-1">{showShareModal.desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopiedLink(true);
                      setTimeout(() => {
                        setCopiedLink(false);
                        setShowShareModal(null);
                        setShareView('menu');
                      }, 1500);
                    }}
                    className="py-3 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: `صورة مبدعة من ${showShareModal.user} على HiSee`,
                            text: showShareModal.desc,
                            url: `${window.location.origin}/?type=photo&id=${showShareModal.id}`
                          });
                        } catch (e) {}
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert("تم نسخ الرابط!");
                      }
                      setShowShareModal(null);
                      setShareView('menu');
                    }}
                    className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Share size={16} />
                    <span>مشاركة عبر...</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* OPTIONS OVERLAY MODAL (Three dots menu) */}
      <AnimatePresence>
        {activeOptionsPost && (
          <div className="absolute inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveOptionsPost(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            {optionsSubView === 'delete_confirm' ? (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[80vh] overflow-y-auto"
              >
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-500">
                    <Trash size={28} />
                  </div>
                  <h3 className="text-base font-black text-white mb-1">{tPhotos.deletePostTitle}</h3>
                  <p className="text-xs text-slate-400">{tPhotos.deletePostConfirm}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setOptionsSubView('main')}
                    className="flex-1 py-3 bg-white/10 rounded-2xl font-bold text-white hover:bg-white/15 transition-colors text-xs cursor-pointer"
                  >
                    {tPhotos.cancel}
                  </button>
                  <button
                    onClick={() => handleOptionAction('delete', activeOptionsPost)}
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 rounded-2xl font-bold text-white transition-colors shadow-lg shadow-rose-500/20 text-xs cursor-pointer"
                  >
                    {tPhotos.deletePermanently}
                  </button>
                </div>
              </motion.div>
            ) : optionsSubView === 'details' ? (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[80vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <AlertCircle className="text-blue-400" size={18} /> {tPhotos.imageDetailsTitle}
                  </h3>
                  <button onClick={() => setActiveOptionsPost(null)} className="p-1 text-white/50 hover:text-white cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-slate-400">{tPhotos.postId}</span>
                    <span className="font-mono text-white text-[11px]">{activeOptionsPost.id}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-slate-400">{tPhotos.creator}</span>
                    <span className="font-bold text-emerald-400">@{cleanName(activeOptionsPost.user)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-slate-400">{tPhotos.imagesCount}</span>
                    <span className="font-bold text-white">{activeLang === 'ar' ? `${activeOptionsPost.images.length} صورة` : activeLang === 'de' ? `${activeOptionsPost.images.length} Fotos` : activeLang === 'ckb' ? `${activeOptionsPost.images.length} وێنە` : activeLang.startsWith('ku') ? `${activeOptionsPost.images.length} wêne` : `${activeOptionsPost.images.length} photos`}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-slate-400">{tPhotos.aspectRatio}</span>
                    <span className="font-mono text-white">{activeOptionsPost.aspectRatio || '4:5'} HD</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-slate-400">{tPhotos.locationLabel}</span>
                    <span className="font-bold text-blue-400">{activeOptionsPost.location || 'عام'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setOptionsSubView('main')}
                  className="w-full mt-5 py-3 bg-white/10 hover:bg-white/15 rounded-2xl font-bold text-white text-xs transition-colors cursor-pointer"
                >
                  {tPhotos.backToOptions}
                </button>
              </motion.div>
            ) : optionsSubView === 'saving' ? (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 pb-20 sm:pb-8 flex flex-col items-center text-center shadow-2xl max-h-[80vh] overflow-y-auto"
              >
                <div className="w-16 h-16 relative mb-4 flex items-center justify-center">
                  <Loader2 size={56} className="text-emerald-500 animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                    {saveProgress}%
                  </span>
                </div>
                <h3 className="text-base font-black text-white mb-1">{tPhotos.savingAndDownloading}</h3>
                <p className="text-xs text-slate-400">{tPhotos.savingQualityNote}</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm mx-auto bg-[#0a0c10] border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-20 sm:pb-6 shadow-2xl max-h-[80vh] overflow-y-auto"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>

                {/* 1. First Item: Repost (إعادة النشر) - Modern Loop Icon & Monochrome styling */}
                {(() => {
                  const currentUid = auth.currentUser?.uid || myId;
                  const isReposted = localStorage.getItem(`reposted_${activeOptionsPost.id}`) === 'true' || 
                    (activeOptionsPost.repostedBy && Array.isArray(activeOptionsPost.repostedBy) && activeOptionsPost.repostedBy.includes(currentUid)) ||
                    Boolean(activeOptionsPost.isReposted);
                  const baseCount = (activeOptionsPost as any).repostsCount || (activeOptionsPost as any).reposts || 0;
                  const local = localStorage.getItem(`reposted_${activeOptionsPost.id}`) === 'true';
                  const server = activeOptionsPost.repostedBy && Array.isArray(activeOptionsPost.repostedBy) && activeOptionsPost.repostedBy.includes(currentUid);
                  const count = Math.max(0, baseCount + (local && !server ? 1 : (!local && server ? -1 : 0)));

                  return (
                    <button
                      type="button"
                      onClick={() => handleOptionAction('repost', activeOptionsPost)}
                      className="w-full mb-4 p-3.5 bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] border border-white/10 rounded-2xl flex items-center justify-between text-white transition-all active:scale-[0.98] cursor-pointer group select-none shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                          <ModernRepostLoopIcon size={20} className="text-white" />
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-sm font-black text-white tracking-wide">
                            {isReposted ? tPhotos.undoRepost : tPhotos.repost}
                          </span>
                          <span className="text-[10px] text-white/50 font-medium">
                            {isReposted ? tPhotos.undoRepostDesc : tPhotos.repostDesc}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
                        <span className="text-[11px] font-bold text-white/70 font-mono">
                          {count > 0 ? count.toLocaleString() : tPhotos.newBadge}
                        </span>
                      </div>
                    </button>
                  );
                })()}

                {/* Primary Quick Circles */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {/* Flag / Report */}
                  {activeOptionsPost.userId !== (auth.currentUser?.uid || myId) && (
                    <>
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => handleOptionAction('report', activeOptionsPost)}
                          className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer active:scale-95"
                        >
                          <Flag size={20} />
                        </button>
                        <span className="text-[10px] text-white/60 font-bold">{tPhotos.report}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => handleOptionAction('not_interested', activeOptionsPost)}
                          className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                        >
                          <Ban size={20} />
                        </button>
                        <span className="text-[10px] text-white/60 font-bold">{tPhotos.notInterested}</span>
                      </div>
                    </>
                  )}

                  {/* If Owner: Delete */}
                  {activeOptionsPost.userId === (auth.currentUser?.uid || myId) && (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => handleOptionAction('delete_confirm', activeOptionsPost)}
                        className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer active:scale-95"
                      >
                        <Trash size={20} />
                      </button>
                      <span className="text-[10px] text-white/60 font-bold">{tPhotos.deleteOption}</span>
                    </div>
                  )}

                  {/* Save/Download */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => handleOptionAction('save', activeOptionsPost)}
                      className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer active:scale-95"
                    >
                      <Download size={20} />
                    </button>
                    <span className="text-[10px] text-white/60 font-bold">{tPhotos.saveOption}</span>
                  </div>

                  {/* Copy Link */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => handleOptionAction('copy_link', activeOptionsPost)}
                      className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                    >
                      <Link2 size={20} />
                    </button>
                    <span className="text-[10px] text-white/60 font-bold">{tPhotos.copyLinkOption}</span>
                  </div>
                </div>

                {/* Additional Option Rows */}
                <div className="space-y-2 mb-4">
                  <button
                    onClick={() => handleOptionAction('details', activeOptionsPost)}
                    className="w-full p-3 bg-white/5 rounded-2xl text-right flex items-center gap-3 text-white text-xs font-bold hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <FileText size={16} className="text-blue-400 shrink-0" />
                    <span>{tPhotos.detailsOption}</span>
                  </button>
                  {activeOptionsPost.userId !== (auth.currentUser?.uid || myId) && (
                    <button
                      onClick={() => handleOptionAction('hide_user', activeOptionsPost)}
                      className="w-full p-3 bg-white/5 rounded-2xl text-right flex items-center gap-3 text-white text-xs font-bold hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <HeartCrack size={16} className="text-rose-400 shrink-0" />
                      <span>{tPhotos.hideUserOption}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setActiveOptionsPost(null)}
                  className="w-full py-3 bg-white/10 rounded-2xl text-white text-xs font-black hover:bg-white/15 transition-colors cursor-pointer"
                >
                  {tPhotos.cancel}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* --- PHOTO REPORT MODAL --- */}
      <AnimatePresence>
        {showReportModal && reportedPhoto && (
          <div className="absolute inset-0 z-[600] flex items-center justify-center p-6 overflow-hidden pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm" 
              onClick={() => { setShowReportModal(false); setReportedPhoto(null); setReportReason(''); setReportCommentText(''); }}
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative z-10 bg-[#1a1c23] w-full max-w-sm mx-auto rounded-3xl p-6 flex flex-col border border-white/10 shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">إبلاغ عن منشور صورة</h3>
                <button onClick={() => { setShowReportModal(false); setReportedPhoto(null); setReportReason(''); setReportCommentText(''); }} className="text-slate-400 hover:text-white cursor-pointer">
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
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${reportReason === reason ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
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
                      reportedUser: reportedPhoto.userId || null,
                      reportedUserName: cleanName(reportedPhoto.user),
                      commentText: `[صورة]: ${reportedPhoto.desc || 'صورة بدون وصف'} ${reportCommentText ? `| [تفاصيل]: ${reportCommentText}` : ''}`,
                      imageUrl: reportedPhoto.images?.[0] || null,
                      photoID: reportedPhoto.id || null,
                      timestamp: serverTimestamp(),
                      reason: reportReason,
                      status: 'PENDING'
                    });
                    showToast('تم إرسال بلاغك للإدارة بنجاح. شكراً لمساهمتك.');
                  } catch (e) {
                    console.error(e);
                    showToast('حدث خطأ أثناء إرسال البلاغ.');
                  }
                  setReportedPhoto(null);
                  setReportReason('');
                  setReportCommentText('');
                }}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${reportReason ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 cursor-pointer' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
              >
                <Flag size={14} />
                <span>إرسال البلاغ الرسمي</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

// ==========================================
// FULL-SCREEN PHOTO FEED CARD COMPONENT
// ==========================================
interface FullScreenPhotoFeedCardProps {
  lang?: string;
  post: PhotoPost;
  myId: string;
  myProfile: any;
  users: any;
  isUiVisible: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenStarGift: () => void;
  onOpenShare: () => void;
  onOpenOptions: () => void;
  onViewProfile: (uid: string, initialTab?: 'gallery' | 'photos') => void;
  onToggleUi?: () => void;
  isHighlighted?: boolean;
}

const FullScreenPhotoFeedCard: React.FC<FullScreenPhotoFeedCardProps> = ({
  lang = "ar",
  post,
  myId,
  myProfile,
  users,
  isUiVisible,
  onToggleLike,
  onOpenComments,
  onOpenStarGift,
  onOpenShare,
  onOpenOptions,
  onViewProfile,
  onToggleUi,
  isHighlighted
}) => {
  const tPhotos = getTPhotos(lang || "ar");
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [touchOffset, setTouchOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [isDislikedLocal, setIsDislikedLocal] = useState<boolean>(() => {
    return localStorage.getItem(`photo_disliked_${post.id}`) === 'true';
  });
  const [dislikesCount, setDislikesCount] = useState<number>(() => {
    return post.dislikesCount ?? post.dislikes ?? 0;
  });

  const [isSavedLocal, setIsSavedLocal] = useState<boolean>(() => {
    return localStorage.getItem(`photo_saved_${post.id}`) === 'true';
  });
  const [savesCount, setSavesCount] = useState<number>(() => {
    return post.saves || 0;
  });

  useEffect(() => {
    if (post.isLiked && isDislikedLocal) {
      setIsDislikedLocal(false);
      localStorage.removeItem(`photo_disliked_${post.id}`);
      setDislikesCount(prev => Math.max(0, prev - 1));
      try {
        const postRef = doc(db, 'posts', post.id);
        updateDoc(postRef, {
          dislikesCount: increment(-1)
        });
      } catch (e) {}
    }
  }, [post.isLiked]);

  const tapTimeoutRef = useRef<any>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const { following } = useUsers();
  const isFollowed = following.has(post.userId);

  // Follow Button Action with 100% parity to InteractionBar.tsx
  const handleFollowClick = async () => {
    if (!post?.userId) return;
    const currentUid = auth.currentUser?.uid || myId;
    if (!currentUid || currentUid === post.userId) return;
    
    try {
      const userRef = doc(db, 'users', post.userId);
      if (isFollowed) {
        await setDoc(userRef, { followersCount: increment(-1) }, { merge: true });
        await setDoc(doc(db, 'users', currentUid), { followingCount: increment(-1) }, { merge: true });
        await deleteDoc(doc(db, 'users', currentUid, 'following', post.userId));
        await deleteDoc(doc(db, 'users', post.userId, 'followers', currentUid));
        await deleteDoc(doc(db, 'users', post.userId, 'notifications', `follow_${currentUid}_${post.userId}`));
        
        // Handle notification from them to me
        const theirNotificationRef = doc(db, 'users', currentUid, 'notifications', `follow_${post.userId}_${currentUid}`);
        const theirNotificationSnap = await getDoc(theirNotificationRef);
        if (theirNotificationSnap.exists()) {
          const theyFollowMe = await getDoc(doc(db, 'users', post.userId, 'following', currentUid));
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
        await setDoc(doc(db, 'users', currentUid, 'following', post.userId), { timestamp: serverTimestamp() });
        await setDoc(doc(db, 'users', post.userId, 'followers', currentUid), { timestamp: serverTimestamp() });

        // Check if the other user follows me
        const theyFollowMe = await getDoc(doc(db, 'users', post.userId, 'following', currentUid));
        const status = theyFollowMe.exists() ? 'mutual' : 'pending';

        // Send notification
        await setDoc(doc(db, 'users', post.userId, 'notifications', `follow_${currentUid}_${post.userId}`), {
          type: 'follow',
          fromUserId: currentUid,
          fromUserName: cleanName(myProfile?.name || myProfile?.displayName || auth.currentUser?.displayName || auth.currentUser?.email || auth.currentUser?.uid),
          fromUserAvatar: myProfile?.avatar || myProfile?.photoURL || auth.currentUser?.photoURL || '',
          timestamp: serverTimestamp(),
          read: false,
          status: status,
          message: 'قام بمتابعتك'
        });

        if (status === 'mutual') {
          const theirNotiRef = doc(db, 'users', currentUid, 'notifications', `follow_${post.userId}_${currentUid}`);
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

  // Dislike Handler
  const handleDislikeClick = async () => {
    const newDisliked = !isDislikedLocal;
    setIsDislikedLocal(newDisliked);
    const newCount = newDisliked ? dislikesCount + 1 : Math.max(0, dislikesCount - 1);
    setDislikesCount(newCount);

    if (newDisliked) {
      localStorage.setItem(`photo_disliked_${post.id}`, 'true');
      if (post.isLiked) {
        onToggleLike();
      }
    } else {
      localStorage.removeItem(`photo_disliked_${post.id}`);
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        dislikesCount: increment(newDisliked ? 1 : -1)
      });
    } catch (e) {
      // offline / fallback
    }
  };

  // Save / Bookmark Handler
  const handleSaveClick = async () => {
    const currentUid = auth.currentUser?.uid || myId;
    const newSaved = !isSavedLocal;
    setIsSavedLocal(newSaved);
    const newCount = newSaved ? savesCount + 1 : Math.max(0, savesCount - 1);
    setSavesCount(newCount);

    if (newSaved) {
      localStorage.setItem(`photo_saved_${post.id}`, 'true');
    } else {
      localStorage.removeItem(`photo_saved_${post.id}`);
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        savesCount: increment(newSaved ? 1 : -1)
      });
      if (currentUid) {
        const userSaveRef = doc(db, 'users', currentUid, 'saved_photos', post.id);
        if (newSaved) {
          await setDoc(userSaveRef, {
            postId: post.id,
            images: post.images,
            timestamp: serverTimestamp()
          });
        } else {
          await deleteDoc(userSaveRef);
        }
      }
    } catch (e) {
      // offline / fallback
    }
  };

  // Clean Name Helper
  const cleanName = (name: any) => {
    const nameStr = typeof name === 'string' ? name : (name?.value || '');
    if (!nameStr) return 'مستخدم';
    if (nameStr.includes('@')) return nameStr.split('@')[0];
    if (nameStr.length > 20 && /^[a-zA-Z0-9]+$/.test(nameStr)) return 'مستخدم';
    return nameStr;
  };

  const formattedDate = useMemo(() => {
    if (!post.createdAt) return '';
    const d = parseDate(post.createdAt);
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }, [post.createdAt]);

  // Single Tap vs Double Tap Handler
  const handleCardClick = (e: React.MouseEvent) => {
    // If dragging horizontally, ignore tap
    if (isDragging || Math.abs(touchOffset) > 8) return;

    if (tapTimeoutRef.current) {
      // Double tapped! -> Trigger Heart Animation & Like
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
      if (!post.isLiked) {
        onToggleLike();
      }
    } else {
      // Single tap -> Wait 260ms, then toggle all UI buttons
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        if (onToggleUi) {
          onToggleUi();
        }
      }, 260);
    }
  };

  // Smooth Gradual Horizontal Dragging & Multi-image Carousel Slider
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isHorizontalSwipeRef.current = true;
        } else {
          isHorizontalSwipeRef.current = false;
        }
      }
    }

    if (isHorizontalSwipeRef.current === true) {
      // Apply smooth resistance if dragging past edges
      let currentOffset = deltaX;
      if (currentImgIndex === post.images.length - 1 && deltaX < 0) {
        // Gradual slide of the parent container
        window.dispatchEvent(new CustomEvent('tab_drag_move', { detail: { dragX: deltaX } }));
        currentOffset = deltaX * 0.4; // Let it slide more of the parent
      } else if (currentImgIndex === 0 && deltaX > 0) {
        currentOffset = deltaX * 0.3;
      }
      setTouchOffset(currentOffset);
    }
  };

  const handleTouchEnd = (e?: React.TouchEvent) => {
    if (touchStartRef.current && isHorizontalSwipeRef.current === true) {
      const minSwipeDistance = window.innerWidth * 0.30; // Strictly 30% of screen width for instant snappy transition
      const deltaTime = Date.now() - touchStartRef.current.time;
      const isQuickFlick = deltaTime < 250 && Math.abs(touchOffset) > 25;

      const wasOnLastImageDraggingLeft = (currentImgIndex === post.images.length - 1 && touchOffset < 0);

      // Calculate raw deltaX for parent container drag decisions
      let rawDeltaX = touchOffset;
      if (e && e.changedTouches && e.changedTouches.length > 0) {
        rawDeltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      }

      if (touchOffset < -minSwipeDistance || (isQuickFlick && touchOffset < -15)) {
        // Swiped Left -> Move to Next Image without hesitation
        if (currentImgIndex < post.images.length - 1) {
          setCurrentImgIndex(prev => prev + 1);
        } else if (wasOnLastImageDraggingLeft) {
          window.dispatchEvent(new CustomEvent('tab_drag_end', { 
            detail: { 
              deltaX: rawDeltaX, 
              isQuickFlick: isQuickFlick 
            } 
          }));
        }
      } else if (touchOffset > minSwipeDistance || (isQuickFlick && touchOffset > 15)) {
        // Swiped Right -> Move to Previous Image without hesitation
        if (currentImgIndex > 0) {
          setCurrentImgIndex(prev => prev - 1);
        }
      } else if (wasOnLastImageDraggingLeft) {
        // Snaps back immediately to current tab if swipe threshold not met
        window.dispatchEvent(new CustomEvent('tab_drag_end', { detail: { deltaX: 0, isQuickFlick: false } }));
      }
    }

    setTouchOffset(0);
    setIsDragging(false);
    isHorizontalSwipeRef.current = null;
    touchStartRef.current = null;
  };

  return (
    <div 
      id={`photo-item-${post.id}`}
      className={`h-[calc(100vh-70px)] w-full snap-start snap-always relative flex items-center justify-center bg-[#07090e] overflow-hidden select-none transition-all duration-500 ${isHighlighted ? 'ring-4 ring-inset ring-emerald-500 shadow-[inset_0_0_30px_rgba(16,185,129,0.8)] z-50' : ''}`}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Centered Multi-image Smooth Slider Track */}
      <div className="absolute inset-0 overflow-hidden" dir="ltr">
        <div
          className={`flex h-full w-full ${isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'}`}
          style={{
            transform: `translateX(calc(-${currentImgIndex * 100}% + ${touchOffset}px))`,
          }}
        >
          {post.images.map((img, idx) => (
            <div key={idx} className="w-full h-full shrink-0 relative flex items-center justify-center overflow-hidden">
              <img
                src={normalizeMediaUrl(img)}
                alt={post.desc}
                className="w-full h-full object-contain sm:object-cover pointer-events-none select-none"
                loading="eager"
              />
            </div>
          ))}
        </div>

        {/* Soft dark shadow gradient at bottom and top for maximum legibility */}
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* TOP-LEFT 3D LUXURY STAR - Aligned with thumbnail strip top */}
      <div 
        className={`absolute top-[90px] sm:top-[96px] left-2 md:left-4 flex flex-col gap-3 items-center z-40 pointer-events-none transition-all duration-500 ${
          isUiVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16 pointer-events-none'
        }`}
      >
        {/* 1. 3D GOLDEN STAR - Level with Profile Avatar */}
        <div className="relative mb-2 flex flex-col items-center pointer-events-auto">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onOpenStarGift(); 
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
                <radialGradient id={`starRaysGlow_${post.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
                  <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="80%" stopColor="#d97706" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g fill={`url(#starRaysGlow_${post.id})`}>
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
                <linearGradient id={`starGoldBevel_${post.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fffbeb" />
                  <stop offset="15%" stopColor="#fde047" />
                  <stop offset="40%" stopColor="#f59e0b" />
                  <stop offset="70%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id={`starExtrusion_${post.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#92400e" />
                  <stop offset="100%" stopColor="#451a03" />
                </linearGradient>
                <filter id={`starShadow_${post.id}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85"/>
                </filter>
              </defs>

              {/* Enhanced 3D Base Extrusion (Thicker) */}
              <path
                d="M50 10 L68 38 L100 41 L74 65 L82 96 L50 78 L18 96 L26 65 L0 41 L32 38 Z"
                fill={`url(#starExtrusion_${post.id})`}
                stroke="#3f1902"
                strokeWidth="3.5"
                strokeLinejoin="round"
                filter={`url(#starShadow_${post.id})`}
              />

              {/* Main 3D Front Star Body with Thick Gold Stroke */}
              <path
                d="M50 4 L64 33 L96 36 L72 58 L79 89 L50 73 L21 89 L28 58 L4 36 L36 33 Z"
                fill={`url(#starGoldBevel_${post.id})`}
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
              {(post.stars || 0) > 0 ? (post.stars || 0).toLocaleString() : '0'}
            </span>
          </button>
        </div>

        {/* Matching invisible spacers to maintain exact mathematical vertical symmetry with right column */}
        <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
        <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
        <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
        <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
        <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
        <div className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] opacity-0 pointer-events-none flex flex-col items-center gap-1" aria-hidden="true"><div className="w-full h-full" /><span className="text-[clamp(8px,1.8vw,11px)]">0</span></div>
      </div>

      {/* HORIZONTAL THUMBNAIL STRIP: Positioned cleanly below sub-category bar without background */}
      {post.images.length > 1 && (
        <div 
          className={`absolute top-[98px] sm:top-[104px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto transition-all duration-300 ${
            isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
          dir="ltr"
        >
          <div className="flex items-center gap-2 p-1 max-w-[90vw] overflow-x-auto no-scrollbar scrollbar-none [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]">
            {post.images.map((imgUrl, idx) => {
              const isActive = idx === currentImgIndex;
              return (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImgIndex(idx);
                  }}
                  className={`relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'border-[1.5px] border-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.9)] opacity-100 z-10' 
                      : 'border border-white/30 opacity-55 hover:opacity-100 hover:scale-105 hover:border-white/70'
                  }`}
                  title={`صورة ${idx + 1}`}
                >
                  <img
                    src={normalizeMediaUrl(imgUrl)}
                    alt=""
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />
                  {/* Subtle index number pill on corner */}
                  <span className={`absolute bottom-0 right-0 px-1 text-[7.5px] font-black rounded-tl ${
                    isActive ? 'bg-white text-black font-extrabold' : 'bg-black/70 text-white/90'
                  }`}>
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Double Tap Floating Heart Burst Animation */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 350 }}
            className="absolute z-30 pointer-events-none"
          >
            <Heart size={90} className="text-rose-500 fill-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT-SIDE FLOATING INTERACTION BAR (Unified 100% with InteractionBar.tsx in Videos) */}
      <div 
        className={`absolute bottom-[80px] sm:bottom-[90px] right-2 md:right-4 flex flex-col gap-3 items-center z-40 transition-all duration-500 ${
          isUiVisible ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-16 opacity-0 pointer-events-none'
        }`}
      >
        {/* 1. Author Avatar with Mini Star Badges & Quick Follow (+) */}
        <div className="relative mb-2 flex flex-col items-center">
          {/* Mini Golden Stars Badge Arc */}
          {(post.stars || 0) > 0 && (
            <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 flex items-end justify-center gap-0 w-16 pointer-events-none z-20">
              {[0, 1, 2].map((i) => {
                const totalStars = post.stars || 0;
                const currentStars = totalStars >= 50 ? 3 : totalStars >= 20 ? 2 : 1;
                const isFilled = i < currentStars;
                const isMiddle = i === 1;
                const translateY = isMiddle ? "-2px" : "3px";
                const rotate = i === 0 ? "-25deg" : i === 2 ? "25deg" : "0deg";
                const size = isMiddle ? 12 : 10;

                return (
                  <div
                    key={i}
                    style={{ transform: `translateY(${translateY}) rotate(${rotate})` }}
                    className={isMiddle ? "z-10" : "z-0"}
                  >
                    <Star 
                      size={size} 
                      className={`transition-all ${
                        isFilled 
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]' 
                          : 'text-white/40 fill-transparent stroke-[2]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div 
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(post.userId, 'photos');
            }} 
            className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] md:w-16 md:h-16 rounded-full p-[2px] bg-gradient-to-tr from-emerald-500 to-rose-500 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-2xl"
          >
            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-slate-900">
              <img
                src={(users && users[post.userId] ? users[post.userId].avatar : post.userAvatar) || '/default-avatar.png'}
                alt={post.user}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Quick Follow (+) Button */}
          <div 
            role="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFollowClick();
            }} 
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-[6vw] h-[6vw] max-w-[24px] max-h-[24px] md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border z-30 ${
              isFollowed 
                ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                : 'border-white/80 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]'
            }`}
          >
            {isFollowed ? (
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

        {/* 2. Like Button (Heart) */}
        <div className="flex flex-col items-center gap-1">
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            className={`w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center transition-all active:scale-75 drop-shadow-xl cursor-pointer ${
              post.isLiked ? 'text-rose-500' : 'text-white/90 hover:text-white'
            }`}
          >
            <Heart 
              className="w-[70%] h-[70%]" 
              strokeWidth={2} 
              fill={post.isLiked ? "currentColor" : "none"} 
            />
          </div>
          <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase text-center">
            {(post.likes || 0).toLocaleString()}
          </span>
        </div>

        {/* 3. Dislike Button (Broken Heart) */}
        <div className="flex flex-col items-center gap-1">
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDislikeClick();
            }}
            className={`w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center transition-all active:scale-75 drop-shadow-xl cursor-pointer ${
              isDislikedLocal ? 'text-indigo-500 animate-shake' : 'text-white/90 hover:text-white'
            }`}
            title="Dislike"
          >
            <HeartCrack 
              className="w-[70%] h-[70%]" 
              strokeWidth={2} 
              fill={isDislikedLocal ? "currentColor" : "none"} 
            />
          </div>
          <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase text-center">
            DISLIKE
          </span>
        </div>

        {/* 4. Comment Button (MessageSquare) */}
        <div className="flex flex-col items-center gap-1">
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments();
            }}
            className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 drop-shadow-xl cursor-pointer"
          >
            <MessageSquare className="w-[70%] h-[70%]" strokeWidth={2} fill="white" fillOpacity={0.1} />
          </div>
          <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase text-center">
            {(post.commentsCount || 0).toLocaleString()}
          </span>
        </div>

        {/* 5. Save Button (Bookmark) */}
        <div className="flex flex-col items-center gap-1">
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSaveClick();
            }}
            className={`w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center transition-all active:scale-75 drop-shadow-xl cursor-pointer ${
              isSavedLocal ? 'text-yellow-400' : 'text-white/90 hover:text-white'
            }`}
            title="حفظ"
          >
            <Bookmark 
              className="w-[70%] h-[70%]" 
              strokeWidth={2} 
              fill={isSavedLocal ? "currentColor" : "none"} 
            />
          </div>
          <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase text-center">
            {savesCount.toLocaleString()}
          </span>
        </div>

        {/* 6. Share Button */}
        <div className="flex flex-col items-center gap-1">
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenShare();
            }}
            className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 drop-shadow-xl cursor-pointer"
            title="مشاركة"
          >
            <Share className="w-[70%] h-[70%]" strokeWidth={2} />
          </div>
          <span className="text-[clamp(8px,1.8vw,11px)] font-black text-white drop-shadow-md uppercase text-center">
            {(post.shares || 0).toLocaleString()}
          </span>
        </div>

        {/* 7. More Options Button */}
        <div className="flex flex-col items-center gap-1">
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenOptions();
            }}
            className="w-[10vw] h-[10vw] max-w-[45px] max-h-[45px] flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-75 drop-shadow-xl cursor-pointer"
            title="المزيد من الخيارات"
          >
            <MoreHorizontal className="w-[70%] h-[70%]" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT POST DETAILS (Author, Caption, Tags, Location) - Positioned safely above bottom bar */}
      <div className={`absolute bottom-20 sm:bottom-24 right-16 sm:right-20 left-4 sm:left-6 z-20 flex flex-col items-start text-left transition-opacity duration-300 ${isUiVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Author Header */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile(post.userId, 'photos');
          }}
          className="flex items-center gap-2 mb-2 cursor-pointer group"
        >
          <h3 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors drop-shadow-md flex items-center gap-1.5">
            <span>@{cleanName(post.user)}</span>
            <CheckCircle2 size={14} className="text-emerald-400 fill-emerald-400/20" />
          </h3>

          {/* Location Badge */}
          {post.location && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-white/80 border border-white/10 flex items-center gap-1">
              📍 {post.location}
            </span>
          )}
        </div>

        {formattedDate && (
          <div className="hidden">
            {formattedDate}
          </div>
        )}

        {/* Description & Caption */}
        <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium line-clamp-3 mb-2 drop-shadow-md">
          {post.desc}
        </p>

        {/* Hashtags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button className="text-white/50 hover:text-white transition-colors">
                <Hash size={14} />
            </button>
            {post.tags.map((tag, i) => (
              <span 
                key={i} 
                className="text-[11px] sm:text-xs font-bold text-emerald-400/90 hover:text-emerald-300 cursor-pointer drop-shadow"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Date */}
        {formattedDate && (
          <div className="text-[10px] text-white/50 font-medium mt-auto text-left">
            {formattedDate}
          </div>
        )}

      </div>

    </div>
  );
};

export default PhotosGalleryView;
