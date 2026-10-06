import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Image as ImageIcon, RotateCw, FlipHorizontal, Sparkles, X, Check, 
  Type, Sliders, Sun, Contrast, Droplets, Smile, ArrowRight, Upload, 
  RefreshCw, Layers, ShieldCheck, Wand2, Eye, Share2, Tag,
  Globe, Users, Lock, History, Film, MessageSquare, LayoutGrid
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { uploadFileResilient } from '../src/lib/mediaProcessor';
import { getTranslation, sanitizeForLatin } from '../translations';

interface PhotoStudioProps {
  initialMode?: 'camera' | 'gallery';
  onBack: () => void;
  onPublishSuccess?: () => void;
  myProfile?: any;
  lang?: string;
}

const PHOTO_FILTERS = [
  { id: 'normal', nameAr: 'العادي', nameEn: 'Normal', class: '', style: {} },
  { id: 'vivid', nameAr: 'زاهي', nameEn: 'Vivid', class: '', style: { filter: 'saturate(1.5) contrast(1.1)' } },
  { id: 'dramatic', nameAr: 'درامي', nameEn: 'Dramatic', class: '', style: { filter: 'contrast(1.4) saturate(1.2)' } },
  { id: 'vintage', nameAr: 'كلاسيكي', nameEn: 'Vintage', class: '', style: { filter: 'sepia(0.3) contrast(1.1) brightness(0.95)' } },
  { id: 'cinematic', nameAr: 'سينمائي', nameEn: 'Cinematic', class: '', style: { filter: 'hue-rotate(-10deg) saturate(1.3) contrast(1.2)' } },
  { id: 'bw', nameAr: 'أسود وأبيض', nameEn: 'B&W', class: '', style: { filter: 'grayscale(1) contrast(1.2)' } },
  { id: 'warm', nameAr: 'دافئ', nameEn: 'Warm', class: '', style: { filter: 'sepia(0.2) saturate(1.2) hue-rotate(-5deg)' } },
  { id: 'cool', nameAr: 'بارد', nameEn: 'Cool', class: '', style: { filter: 'hue-rotate(15deg) saturate(1.1)' } },
  { id: 'neon', nameAr: 'نيون', nameEn: 'Neon', class: '', style: { filter: 'saturate(2) contrast(1.3) hue-rotate(20deg)' } },
];

const EMOJI_STICKERS = ['✨', '🔥', '❤️', '👑', '⭐', '💎', '🎨', '🚀', '📸', '⚡', '🌟', '🕊️'];

const FONT_OPTIONS = [
  { id: 'Cairo', nameAr: 'قاهرة (عصري)', nameEn: 'Cairo (Modern)', family: 'Cairo, sans-serif' },
  { id: 'Tajawal', nameAr: 'تجول (أنيق)', nameEn: 'Tajawal (Elegant)', family: 'Tajawal, sans-serif' },
  { id: 'Amiri', nameAr: 'أميري (نسخ)', nameEn: 'Amiri (Classic)', family: 'Amiri, serif' },
  { id: 'Reem Kufi', nameAr: 'ريم كوفي (كوفي)', nameEn: 'Reem Kufi', family: "'Reem Kufi', sans-serif" },
  { id: 'Changa', nameAr: 'تشانجا (بارز)', nameEn: 'Changa (Bold)', family: 'Changa, sans-serif' },
  { id: 'Playfair Display', nameAr: 'بلايفير (كلاسيكي)', nameEn: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'Courier New', nameAr: 'آلة كاتبة (Monospace)', nameEn: 'Courier (Typewriter)', family: "'Courier New', monospace" },
];

const photoStudioTranslations: Record<string, Record<string, string>> = {
  ar: {
    photoStudioTitle: "استوديو الإبداع للصور",
    next: "التالي",
    publishNow: "نشر الآن",
    studio: "الاستوديو",
    cameraStarting: "جاري تشغيل الكاميرا أو يمكنك رفع صورة من الاستوديو",
    chooseFromGallery: "اختر من المعرض",
    chooseFromStudioTooltip: "اختر صورة من الاستوديو",
    switchCamera: "تبديل الكاميرا",
    dragWithFinger: "✋ حرك باصبعك",
    tabText: "الكتابة والتنسيق",
    tabFilter: "الفلاتر",
    tabAdjust: "التعديل",
    tabTransform: "تدوير وعكس",
    tabStickers: "ملصقات",
    topTextLabel: "1. الكتابة في أعلى الصورة (خارج الصورة فوق):",
    topTextPlaceholder: "عنوان أو وصف في الشريط العلوي...",
    centerTextLabel: "2. النص المباشر على الصورة (قابل للتحريك باصبعك):",
    dragOnPreview: "حرك النص مباشرة على المعاينة",
    centerTextPlaceholder: "اكتب نصاً ليظهر فوق الصورة مباشرة...",
    fontType: "نوع الخط واللغة:",
    textScale: "تكبير وتصغير النص:",
    recenter: "إعادة التمركز",
    bottomTextLabel: "3. الكتابة في أسفل الصورة (خارج الصورة تحت):",
    bottomTextPlaceholder: "عنوان أو توقيع في الشريط السفلي...",
    textColor: "لون النص:",
    textBg: "الخلفية:",
    brightness: "السطوع:",
    contrast: "التباين:",
    saturation: "التشبع:",
    rotate90: "تدوير 90°",
    flipHoriz: "عكس أفقي",
    resetAdjust: "إعادة ضبط",
    detailsTitle: "تفاصيل الصورة الإبداعية",
    detailsSub: "أضف وصفاً ووسوماً لتميز منشورك في معرض الصور",
    captionLabel: "وصف الصورة (التعليق):",
    captionPlaceholder: "اكتب وصفاً جذاباً لعرضه تحت الصورة...",
    hashtagsLabel: "الوسوم (Hashtags):",
    categoryLabel: "التصنيف:",
    catCreative: "إبداع وثقافة",
    catNature: "طبيعة ومناظر",
    catArt: "فن وتصميم",
    catLifestyle: "يوميات وحياة",
    catPortrait: "بورتريه شخصي",
    destinationLabel: "وجهة النشر:",
    destPhotosOnly: "الصور فقط",
    destStoryOnly: "القصة فقط",
    destBoth: "الصور والقصة",
    destChat: "إرسال إلى الدردشة",
    chooseChat: "اختر المحادثة المستلمة:",
    selectedPrefix: "المحدد:",
    noActiveChats: "لا توجد محادثات نشطة حالياً",
    visibilityLabel: "من يمكنه رؤية الصورة:",
    visEveryone: "الجميع",
    visFriends: "الأصدقاء فقط",
    visPrivate: "خاص",
    advPrivacyTitle: "خصوصية متقدمة للحماية:",
    screenshots: "لقطات الشاشة",
    downloadPhoto: "تحميل الصورة",
    cameraExposure: "عرض للكاميرا",
    optEveryone: "الجميع",
    optFriends: "الأصدقاء",
    optNone: "لا أحد",
    optRequest: "طلب إذن",
    backToEdit: "العودة للتعديل",
    confirmAndPublish: "تأكيد ونشر",
    toastStorySuccess: "تم نشر الصورة في قصتك بنجاح ✨",
    toastPhotosSuccess: "تم نشر الصورة في قسم الصور بنجاح ✨",
    toastBothSuccess: "تم النشر بنجاح في الصور والقصة ✨",
    toastChatSuccess: "تم إرسال الصورة إلى الدردشة بنجاح ✨",
    toastError: "حدث خطأ أثناء النشر، حاول مجدداً.",
    toastSelectChat: "يرجى اختيار دردشة لإرسال الصورة إليها."
  },
  en: {
    photoStudioTitle: "Photo Creative Studio",
    next: "Next",
    publishNow: "Publish Now",
    studio: "Studio",
    cameraStarting: "Starting camera or upload a photo from gallery",
    chooseFromGallery: "Choose from Gallery",
    chooseFromStudioTooltip: "Choose photo from gallery",
    switchCamera: "Switch Camera",
    dragWithFinger: "✋ Drag to move",
    tabText: "Text & Style",
    tabFilter: "Filters",
    tabAdjust: "Adjust",
    tabTransform: "Rotate & Flip",
    tabStickers: "Stickers",
    topTextLabel: "1. Top banner text (above photo):",
    topTextPlaceholder: "Title or caption on top banner...",
    centerTextLabel: "2. Text directly on photo (draggable):",
    dragOnPreview: "Drag text directly on preview",
    centerTextPlaceholder: "Type text to appear directly over photo...",
    fontType: "Font Style:",
    textScale: "Text Scale:",
    recenter: "Recenter",
    bottomTextLabel: "3. Bottom banner text (below photo):",
    bottomTextPlaceholder: "Text or caption on bottom banner...",
    textColor: "Text Color:",
    textBg: "Background:",
    brightness: "Brightness:",
    contrast: "Contrast:",
    saturation: "Saturation:",
    rotate90: "Rotate 90°",
    flipHoriz: "Flip Horizontally",
    resetAdjust: "Reset",
    detailsTitle: "Photo Details",
    detailsSub: "Add description and tags for your photo post",
    captionLabel: "Photo Description (Caption):",
    captionPlaceholder: "Write an engaging caption for your photo...",
    hashtagsLabel: "Hashtags:",
    categoryLabel: "Category:",
    catCreative: "Creative & Culture",
    catNature: "Nature & Landscapes",
    catArt: "Art & Design",
    catLifestyle: "Lifestyle & Daily",
    catPortrait: "Portrait & Selfie",
    destinationLabel: "Publish Destination:",
    destPhotosOnly: "Photos Only",
    destStoryOnly: "Story Only",
    destBoth: "Photos & Story",
    destChat: "Send to Chat",
    chooseChat: "Choose recipient chat:",
    selectedPrefix: "Selected:",
    noActiveChats: "No active chats currently",
    visibilityLabel: "Who Can See This Photo:",
    visEveryone: "Everyone",
    visFriends: "Friends Only",
    visPrivate: "Private",
    advPrivacyTitle: "Advanced Privacy & Protection:",
    screenshots: "Screenshots",
    downloadPhoto: "Download Photo",
    cameraExposure: "Camera Exposure",
    optEveryone: "Everyone",
    optFriends: "Friends",
    optNone: "No One",
    optRequest: "Request",
    backToEdit: "Back to Edit",
    confirmAndPublish: "Confirm & Publish",
    toastStorySuccess: "Photo published to your story successfully ✨",
    toastPhotosSuccess: "Photo published to photos gallery successfully ✨",
    toastBothSuccess: "Published successfully to photos and story ✨",
    toastChatSuccess: "Photo sent to chat successfully ✨",
    toastError: "Error publishing photo, please try again.",
    toastSelectChat: "Please select a chat to send the photo."
  }
};

export const PhotoStudio: React.FC<PhotoStudioProps> = ({
  initialMode = 'camera',
  onBack,
  onPublishSuccess,
  myProfile,
  lang = 'ar'
}) => {
  const activeLang = lang || 'ar';
  const isRtl = activeLang === 'ar';

  const t = (key: string, fallback?: string): string => {
    const fromCentral = getTranslation(activeLang, key, '');
    if (fromCentral) {
      return sanitizeForLatin(fromCentral, activeLang, key);
    }
    const fromLocal = photoStudioTranslations[activeLang]?.[key] || photoStudioTranslations['en']?.[key] || fallback || key;
    return sanitizeForLatin(fromLocal, activeLang, key);
  };

  const [mode, setMode] = useState<'capture' | 'edit' | 'details' | 'publishing'>(
    initialMode === 'gallery' ? 'edit' : 'capture'
  );

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Image Source
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 3 Text Overlay Fields
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [centerText, setCenterText] = useState('');

  // Interactive Center Text State (On Image)
  const [centerTextX, setCenterTextX] = useState(50);
  const [centerTextY, setCenterTextY] = useState(50);
  const [centerTextScale, setCenterTextScale] = useState(1);
  const [selectedFont, setSelectedFont] = useState('Cairo');
  const isDraggingText = useRef(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Editing parameters
  const [activeFilter, setActiveFilter] = useState('normal');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFlippedHorizontally, setIsFlippedHorizontally] = useState(false);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textBgColor, setTextBgColor] = useState('rgba(0, 0, 0, 0.5)');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);

  // Pointer drag handlers for text on image
  const handlePointerDownText = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingText.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMoveText = (e: React.PointerEvent) => {
    if (!isDraggingText.current || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCenterTextX(Math.max(8, Math.min(92, x)));
    setCenterTextY(Math.max(8, Math.min(92, y)));
  };

  const handlePointerUpText = (e: React.PointerEvent) => {
    if (isDraggingText.current) {
      isDraggingText.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // Post details state
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState(isRtl ? '#HiSeePhotos #إبداع' : '#HiSeePhotos #Creative');
  const [category, setCategory] = useState('Creative');
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Privacy & target destination states
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [screenshotPrivacy, setScreenshotPrivacy] = useState<'everyone' | 'friends' | 'none' | 'request'>('everyone');
  const [downloadPrivacy, setDownloadPrivacy] = useState<'everyone' | 'friends' | 'none' | 'request' | 'everyone_except'>('everyone');
  const [cameraExposurePrivacy, setCameraExposurePrivacy] = useState<'everyone' | 'friends' | 'none' | 'request'>('everyone');
  const [publishTarget, setPublishTarget] = useState<'both' | 'photos_only' | 'story' | 'chat'>('both');

  // Chats states
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);

  // Listen to active chats in Firestore
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const myId = currentUser.uid;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', myId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const otherUserId = data.participants?.find((id: string) => id !== myId);
        
        return {
          id: docSnap.id,
          ...data,
          user: data.user || {
            id: otherUserId || '',
            name: otherUserId ? `User ${otherUserId.slice(0, 5)}` : 'Chat',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId || docSnap.id}`,
            status: 'offline'
          }
        };
      }).filter(c => c.id !== 'hisee-ai-bot');
      
      const finalChats: any[] = [...chatList];
      if (!finalChats.some(c => c.id === 'mock-suze')) {
        finalChats.push({
          id: 'mock-suze',
          user: { id: 'mock-suze', name: 'Suze 🎙️', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suze', status: 'online' },
          participants: [myId, 'mock-suze']
        });
      }
      if (!finalChats.some(c => c.id === 'mock-natalia')) {
        finalChats.push({
          id: 'mock-natalia',
          user: { id: 'mock-natalia', name: 'Natalia 🎥', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Natalia', status: 'online' },
          participants: [myId, 'mock-natalia']
        });
      }

      setActiveChats(finalChats);
    }, (err) => {
      console.warn("Firestore chats fetch error:", err);
    });

    return () => unsubscribe();
  }, [publishTarget]);

  // Active Tool Tab in Editor
  const [editorTab, setEditorTab] = useState<'text' | 'filter' | 'adjust' | 'transform' | 'stickers'>('text');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Setup Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (mode === 'capture') {
      navigator.mediaDevices?.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1350 } },
        audio: false
      }).then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
          setCameraActive(true);
        }
      }).catch((err) => {
        console.warn("Camera access failed or non-existent:", err);
        setCameraActive(false);
      });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [mode, facingMode]);

  // Open file picker automatically if started in gallery mode
  useEffect(() => {
    if (initialMode === 'gallery' && images.length === 0) {
      fileInputRef.current?.click();
    }
  }, [initialMode]);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1350;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setImages([dataUrl]);
      setCurrentImageIndex(0);
      setMode('edit');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newImages: string[] = [];
    let processedCount = 0;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          processedCount++;
          if (processedCount === files.length) {
            setImages(newImages);
            setCurrentImageIndex(0);
            setMode('edit');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const currentFilterStyle = PHOTO_FILTERS.find(f => f.id === activeFilter)?.style || {};

  const combinedStyle = {
    ...currentFilterStyle,
    filter: `
      ${currentFilterStyle.filter || ''}
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
    `.trim(),
    transform: `rotate(${rotation}deg) scaleX(${isFlippedHorizontally ? -1 : 1})`,
  };

  const generateFinalImage = (imgData: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!imgData) {
        resolve('');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgW = img.naturalWidth || 1080;
        const imgH = img.naturalHeight || 1350;

        const topBannerH = topText.trim() ? Math.round(imgH * 0.08) : 0;
        const bottomBannerH = bottomText.trim() ? Math.round(imgH * 0.08) : 0;

        const canvas = document.createElement('canvas');
        canvas.width = imgW;
        canvas.height = imgH + topBannerH + bottomBannerH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imgData);
          return;
        }

        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Top Banner
        if (topText.trim()) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, topBannerH);
          ctx.font = `bold ${Math.round(topBannerH * 0.42)}px Cairo, sans-serif`;
          ctx.fillStyle = '#f43f5e';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(topText.trim(), canvas.width / 2, topBannerH / 2);
        }

        // 2. Draw Main Image
        const photoY = topBannerH;
        ctx.save();
        ctx.translate(canvas.width / 2, photoY + imgH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(isFlippedHorizontally ? -1 : 1, 1);

        const filterObj = PHOTO_FILTERS.find(f => f.id === activeFilter)?.style || {};
        const filterStr = `${filterObj.filter || ''} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`.trim();
        if (filterStr && ctx.filter !== undefined) {
          ctx.filter = filterStr;
        }
        ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
        ctx.restore();

        // 3. Draw Center Text
        if (centerText.trim()) {
          const baseSize = imgW * (fontSize === 'sm' ? 0.04 : fontSize === 'lg' ? 0.07 : fontSize === 'xl' ? 0.09 : 0.055) * centerTextScale;
          const fontFam = FONT_OPTIONS.find(f => f.id === selectedFont)?.family || 'Cairo, sans-serif';
          ctx.font = `bold ${Math.round(baseSize)}px ${fontFam}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const textX = (imgW * centerTextX) / 100;
          const textY = photoY + (imgH * centerTextY) / 100;

          const textMetrics = ctx.measureText(centerText);
          const paddingX = baseSize * 0.5;
          const paddingY = baseSize * 0.35;
          ctx.fillStyle = textBgColor;
          ctx.fillRect(textX - textMetrics.width / 2 - paddingX, textY - baseSize / 2 - paddingY, textMetrics.width + paddingX * 2, baseSize + paddingY * 2);

          ctx.fillStyle = textColor;
          ctx.fillText(centerText, textX, textY);
        }

        // 4. Render Stickers
        if (selectedStickers.length > 0) {
          ctx.font = `${Math.round(imgW * 0.1)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          selectedStickers.forEach((stk, idx) => {
            const stkX = imgW * (0.2 + (idx % 3) * 0.3);
            const stkY = photoY + imgH * (0.25 + Math.floor(idx / 3) * 0.25);
            ctx.fillText(stk, stkX, stkY);
          });
        }

        // 5. Draw Bottom Banner
        if (bottomText.trim()) {
          const btmY = photoY + imgH;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, btmY, canvas.width, bottomBannerH);
          ctx.font = `bold ${Math.round(bottomBannerH * 0.38)}px Cairo, sans-serif`;
          ctx.fillStyle = '#facc15';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bottomText.trim(), canvas.width / 2, btmY + bottomBannerH / 2);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.90));
      };
      img.onerror = () => resolve(imgData);
      img.src = imgData;
    });
  };

  const handlePublish = async () => {
    if (images.length === 0) return;
    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const imgData of images) {
        const finalImageBase64 = await generateFinalImage(imgData);

        let imageUrl = finalImageBase64;
        try {
          const res = await fetch(finalImageBase64);
          const blob = await res.blob();
          const fileToUpload = new File([blob], `photo_studio_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const uploadedUrl = await uploadFileResilient(fileToUpload, '/api/upload', () => {});
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        } catch (err) {
          console.warn("Server upload fallback to direct data url:", err);
        }
        imageUrls.push(imageUrl);
      }

      const currentUser = auth.currentUser;
      const userName = myProfile?.name || myProfile?.displayName || currentUser?.displayName || 'HiSee Creator';
      const userAvatar = myProfile?.avatar || currentUser?.photoURL || '';

      const normalizedImageUrls = imageUrls.map(url => normalizeMediaUrl(url));
      const primaryUrl = normalizedImageUrls[0] || '';

      const photoPayload = {
        mediaType: 'photo',
        type: 'photo',
        target: publishTarget,
        images: normalizedImageUrls,
        imageUrl: primaryUrl,
        url: primaryUrl,
        desc: caption || 'New Photo Creation ✨',
        caption: caption || 'New Photo Creation ✨',
        topText,
        bottomText,
        centerText,
        category: category || 'Creative',
        tags: tags ? tags.split(' ').filter(t => t.startsWith('#')) : ['#HiSeePhotos'],
        userId: currentUser?.uid || 'guest_user',
        userName,
        user: userName,
        userAvatar,
        avatarUrl: userAvatar,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        privacy,
        screenshotPrivacy,
        downloadPrivacy,
        cameraExposurePrivacy,
        createdAt: serverTimestamp()
      };

      if (publishTarget === 'chat') {
        if (!selectedChat) {
          showToast(t('toastSelectChat', "Please select a chat to send the photo."));
          setUploading(false);
          return;
        }

        const messageData = {
          senderId: currentUser?.uid || 'guest_user',
          receiverId: selectedChat.user?.id || '',
          createdAt: serverTimestamp(),
          isRead: false,
          type: 'image',
          text: caption || 'Photo',
          imageUrl: primaryUrl,
          isUploading: false,
          isEncrypted: false,
          disappearingDuration: null
        };

        await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), messageData);

        const chatRef = doc(db, 'chats', selectedChat.id);
        await updateDoc(chatRef, {
          lastMessage: caption || 'Photo 🖼️',
          lastMessageType: 'image',
          lastMessageSenderId: currentUser?.uid || 'guest_user',
          lastMessageTimestamp: Date.now(),
          updatedAt: Date.now()
        }).catch((err) => {
          console.warn("Could not update parent chat document:", err);
        });

        showToast(t('toastChatSuccess', "Photo sent to chat successfully ✨"));
      } else if (publishTarget === 'story') {
        await addDoc(collection(db, 'stories'), {
          ...photoPayload,
          target: 'story',
          mediaType: 'image',
          url: primaryUrl
        });

        if (currentUser) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            latestStoryAt: serverTimestamp()
          }).catch(() => {});
        }

        showToast(t('toastStorySuccess', "Photo published to your story successfully ✨"));
      } else if (publishTarget === 'photos_only') {
        await addDoc(collection(db, 'photos'), photoPayload);
        showToast(t('toastPhotosSuccess', "Photo published to photos gallery successfully ✨"));
        window.dispatchEvent(new CustomEvent('switch_feed_tab', { detail: { tab: 'photos' } }));
      } else {
        await addDoc(collection(db, 'photos'), photoPayload);
        await addDoc(collection(db, 'stories'), {
          ...photoPayload,
          target: 'story',
          mediaType: 'image',
          url: primaryUrl
        });
        await addDoc(collection(db, 'posts'), photoPayload).catch(() => {});

        if (currentUser) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            latestStoryAt: serverTimestamp()
          }).catch(() => {});
        }

        showToast(t('toastBothSuccess', "Published successfully to photos and story ✨"));
        window.dispatchEvent(new CustomEvent('switch_feed_tab', { detail: { tab: 'photos' } }));
      }

      setTimeout(() => {
        setUploading(false);
        if (onPublishSuccess) onPublishSuccess();
        else onBack();
      }, 1200);

    } catch (error) {
      console.error("Error publishing photo:", error);
      showToast(t('toastError', "Error publishing photo, please try again."));
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black text-white flex flex-col font-sans overflow-hidden select-none">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        multiple
        onChange={handleFileSelect} 
        className="hidden" 
      />

      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-black px-6 py-3 rounded-full font-bold shadow-2xl text-xs sm:text-sm animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Sparkles size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md z-30 shrink-0">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-pink-500 animate-pulse" />
          <span className="font-black text-sm sm:text-base tracking-wide bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 bg-clip-text text-transparent">
            {t('photoStudioTitle', "Photo Creative Studio")}
          </span>
        </div>

        {mode === 'edit' ? (
          <button 
            onClick={() => setMode('details')}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>{t('next', "Next")}</span>
            <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
          </button>
        ) : mode === 'details' ? (
          <button 
            onClick={handlePublish}
            disabled={uploading}
            className="px-5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}
            <span>{t('publishNow', "Publish Now")}</span>
          </button>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 flex items-center gap-1 text-xs font-bold"
          >
            <ImageIcon size={18} />
            <span className="hidden sm:inline">{t('studio', "Studio")}</span>
          </button>
        )}
      </div>

      {/* CAMERA CAPTURE STAGE */}
      {mode === 'capture' && (
        <div className="flex-1 relative bg-black flex flex-col justify-between overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center bg-slate-950 overflow-hidden">
            {cameraActive ? (
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-500 text-center px-4">
                <Camera size={48} className="animate-bounce text-pink-500/50" />
                <p className="text-xs font-bold">{t('cameraStarting', "Starting camera or upload a photo from gallery")}</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center gap-2"
                >
                  <ImageIcon size={16} />
                  {t('chooseFromGallery', "Choose from Gallery")}
                </button>
              </div>
            )}
          </div>

          <div className="h-28 px-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between relative z-20 shrink-0">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
              title={t('chooseFromStudioTooltip', "Choose photo from gallery")}
            >
              <ImageIcon size={22} />
            </button>

            <button 
              onClick={handleCapturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-tr from-pink-500 to-rose-600 shadow-[0_0_25px_rgba(244,63,94,0.6)] active:scale-90 transition-all flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full border-2 border-white/60 bg-white/20" />
            </button>

            <button 
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
              title={t('switchCamera', "Switch Camera")}
            >
              <RotateCw size={22} />
            </button>
          </div>
        </div>
      )}

      {/* PHOTO EDITING STAGE */}
      {mode === 'edit' && images.length > 0 && (
        <div className="flex-1 flex flex-col justify-between bg-slate-950 overflow-hidden relative">
          
          <div className="flex-1 relative flex flex-col items-center justify-center p-3 overflow-hidden bg-black/90">
            
            {images.length > 1 && (
              <div className="absolute top-4 left-4 z-40 bg-black/60 text-white text-xs px-3 py-1 rounded-full font-bold">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
            {images.length > 1 && (
                <>
                    <button className="absolute left-2 z-40 p-2 bg-black/50 rounded-full text-white" onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))} disabled={currentImageIndex === 0}>◀</button>
                    <button className="absolute right-2 z-40 p-2 bg-black/50 rounded-full text-white" onClick={() => setCurrentImageIndex(i => Math.min(images.length - 1, i + 1))} disabled={currentImageIndex === images.length - 1}>▶</button>
                </>
            )}
            
            <div className="w-full max-w-md flex flex-col items-center shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
              
              {/* 1. TOP TEXT */}
              {topText.trim() && (
                <div className="w-full bg-slate-900 border-b border-white/10 px-4 py-2.5 text-center shrink-0">
                  <span className="text-pink-400 font-extrabold text-xs sm:text-sm tracking-wide block truncate">
                    {topText}
                  </span>
                </div>
              )}

              {/* 2. MAIN PHOTO IMAGE CONTAINER */}
              <div 
                ref={imageContainerRef}
                className="relative w-full max-h-[50vh] flex items-center justify-center bg-black overflow-hidden select-none touch-none"
              >
                <img 
                  src={images[currentImageIndex]} 
                  alt="preview" 
                  style={combinedStyle}
                  className="max-h-[50vh] w-auto object-contain transition-all duration-200 pointer-events-none"
                />

                {/* DRAGGABLE CENTER TEXT */}
                {centerText.trim() && (
                  <div 
                    onPointerDown={handlePointerDownText}
                    onPointerMove={handlePointerMoveText}
                    onPointerUp={handlePointerUpText}
                    onPointerCancel={handlePointerUpText}
                    className="absolute z-30 cursor-grab active:cursor-grabbing p-2 touch-none select-none"
                    style={{
                      left: `${centerTextX}%`,
                      top: `${centerTextY}%`,
                      transform: `translate(-50%, -50%) scale(${centerTextScale})`,
                      fontFamily: FONT_OPTIONS.find(f => f.id === selectedFont)?.family || 'Cairo, sans-serif',
                    }}
                  >
                    <div 
                      className="px-4 py-2 rounded-2xl font-black shadow-2xl border border-white/20 whitespace-nowrap flex items-center gap-2 group transition-all hover:scale-105"
                      style={{ 
                        backgroundColor: textBgColor,
                        color: textColor,
                        fontSize: fontSize === 'sm' ? '13px' : fontSize === 'lg' ? '20px' : fontSize === 'xl' ? '24px' : '16px'
                      }}
                    >
                      <span>{centerText}</span>
                      <span className="text-[10px] opacity-70 bg-white/20 px-1.5 py-0.5 rounded-full font-sans">{t('dragWithFinger', "✋ Drag to move")}</span>
                    </div>
                  </div>
                )}

                {/* STICKERS OVERLAY */}
                {selectedStickers.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none flex flex-wrap items-center justify-around p-6 gap-4">
                    {selectedStickers.map((stk, idx) => (
                      <span key={idx} className="text-3xl sm:text-4xl drop-shadow-lg animate-bounce">
                        {stk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. BOTTOM TEXT */}
              {bottomText.trim() && (
                <div className="w-full bg-slate-900 border-t border-white/10 px-4 py-2.5 text-center shrink-0">
                  <span className="text-amber-300 font-bold text-xs sm:text-sm tracking-wide block truncate">
                    {bottomText}
                  </span>
                </div>
              )}

            </div>
          </div>

          {/* EDITING TOOLS PANEL */}
          <div className="bg-black/95 border-t border-white/10 flex flex-col shrink-0">
            <div className="flex items-center justify-around border-b border-white/10 px-2 py-2 text-xs font-bold">
              <button 
                onClick={() => setEditorTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${editorTab === 'text' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'text-slate-400'}`}
              >
                <Type size={14} />
                <span>{t('tabText', "Text & Style")}</span>
              </button>

              <button 
                onClick={() => setEditorTab('filter')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${editorTab === 'filter' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'text-slate-400'}`}
              >
                <Wand2 size={14} />
                <span>{t('tabFilter', "Filters")}</span>
              </button>

              <button 
                onClick={() => setEditorTab('adjust')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${editorTab === 'adjust' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'text-slate-400'}`}
              >
                <Sliders size={14} />
                <span>{t('tabAdjust', "Adjust")}</span>
              </button>

              <button 
                onClick={() => setEditorTab('transform')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${editorTab === 'transform' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'text-slate-400'}`}
              >
                <RotateCw size={14} />
                <span>{t('tabTransform', "Rotate & Flip")}</span>
              </button>

              <button 
                onClick={() => setEditorTab('stickers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${editorTab === 'stickers' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'text-slate-400'}`}
              >
                <Smile size={14} />
                <span>{t('tabStickers', "Stickers")}</span>
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="p-3 max-h-52 overflow-y-auto custom-scrollbar">
              
              {editorTab === 'text' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">{t('topTextLabel', "1. Top banner text (above photo):")}</label>
                    <input 
                      type="text" 
                      value={topText} 
                      onChange={(e) => setTopText(e.target.value)}
                      placeholder={t('topTextPlaceholder', "Title or caption on top banner...")} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="text-pink-400 font-bold block mb-1 flex items-center justify-between">
                      <span>{t('centerTextLabel', "2. Text directly on photo (draggable):")}</span>
                      <span className="text-[10px] text-slate-400">{t('dragOnPreview', "Drag text directly on preview")}</span>
                    </label>
                    <input 
                      type="text" 
                      value={centerText} 
                      onChange={(e) => setCenterText(e.target.value)}
                      placeholder={t('centerTextPlaceholder', "Type text to appear directly over photo...")} 
                      className="w-full bg-white/5 border border-pink-500/30 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-bold"
                    />
                  </div>

                  {centerText.trim() && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-slate-300 font-bold block">{t('fontType', "Font Style:")}</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        {FONT_OPTIONS.map(f => (
                          <button
                            key={f.id}
                            onClick={() => setSelectedFont(f.id)}
                            className={`px-3 py-1.5 rounded-xl border text-[11px] whitespace-nowrap font-bold transition-all ${selectedFont === f.id ? 'bg-pink-500 text-white border-pink-400 shadow-md scale-105' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                            style={{ fontFamily: f.family }}
                          >
                            {isRtl ? f.nameAr : f.nameEn}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10">
                        <span className="text-slate-300 font-bold">{t('textScale', "Text Scale:")}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setCenterTextScale(s => Math.max(0.6, s - 0.1))}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                          >
                            -
                          </button>
                          <span className="font-mono text-pink-400 font-bold">{Math.round(centerTextScale * 100)}%</span>
                          <button 
                            onClick={() => setCenterTextScale(s => Math.min(2.5, s + 0.1))}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => { setCenterTextX(50); setCenterTextY(50); setCenterTextScale(1); }}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 text-[10px]"
                          >
                            {t('recenter', "Recenter")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">{t('bottomTextLabel', "3. Bottom banner text (below photo):")}</label>
                    <input 
                      type="text" 
                      value={bottomText} 
                      onChange={(e) => setBottomText(e.target.value)}
                      placeholder={t('bottomTextPlaceholder', "Text or caption on bottom banner...")} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">{t('textColor', "Text Color:")}</span>
                      {['#FFFFFF', '#FF3B30', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#000000'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setTextColor(c)}
                          className={`w-5 h-5 rounded-full border border-white/20 ${textColor === c ? 'ring-2 ring-pink-500 scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">{t('textBg', "Background:")}</span>
                      {['rgba(0,0,0,0.6)', 'rgba(244,63,94,0.7)', 'rgba(0,0,0,0)', 'rgba(255,255,255,0.8)'].map((bg, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTextBgColor(bg)}
                          className={`w-5 h-5 rounded-lg border border-white/20 ${textBgColor === bg ? 'ring-2 ring-pink-500 scale-110' : ''}`}
                          style={{ backgroundColor: bg }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editorTab === 'filter' && (
                <div className="flex items-center gap-3 overflow-x-auto py-2 px-1">
                  {PHOTO_FILTERS.map(f => (
                    <button 
                      key={f.id} 
                      onClick={() => setActiveFilter(f.id)}
                      className={`flex flex-col items-center gap-1 shrink-0 ${activeFilter === f.id ? 'text-pink-400 font-bold' : 'text-slate-400'}`}
                    >
                      <div className={`w-14 h-14 rounded-xl overflow-hidden border-2 bg-slate-900 transition-all ${activeFilter === f.id ? 'border-pink-500 scale-105 shadow-lg' : 'border-white/10'}`}>
                        <img 
                          src={images[currentImageIndex] || ''} 
                          alt={isRtl ? f.nameAr : f.nameEn} 
                          style={f.style}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[10px]">{isRtl ? f.nameAr : f.nameEn}</span>
                    </button>
                  ))}
                </div>
              )}

              {editorTab === 'adjust' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Sun size={14} /> {t('brightness', "Brightness:")}</span>
                    <input 
                      type="range" min="50" max="150" value={brightness} 
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-48 accent-pink-500"
                    />
                    <span className="font-mono">{brightness}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Contrast size={14} /> {t('contrast', "Contrast:")}</span>
                    <input 
                      type="range" min="50" max="150" value={contrast} 
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-48 accent-pink-500"
                    />
                    <span className="font-mono">{contrast}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Droplets size={14} /> {t('saturation', "Saturation:")}</span>
                    <input 
                      type="range" min="0" max="200" value={saturation} 
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-48 accent-pink-500"
                    />
                    <span className="font-mono">{saturation}%</span>
                  </div>
                </div>
              )}

              {editorTab === 'transform' && (
                <div className="flex items-center justify-around py-3">
                  <button 
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="flex flex-col items-center gap-1 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all text-xs"
                  >
                    <RotateCw size={18} />
                    <span>{t('rotate90', "Rotate 90°")}</span>
                  </button>

                  <button 
                    onClick={() => setIsFlippedHorizontally(f => !f)}
                    className="flex flex-col items-center gap-1 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all text-xs"
                  >
                    <FlipHorizontal size={18} />
                    <span>{t('flipHoriz', "Flip Horizontally")}</span>
                  </button>

                  <button 
                    onClick={() => { setRotation(0); setIsFlippedHorizontally(false); setBrightness(100); setContrast(100); setSaturation(100); setActiveFilter('normal'); }}
                    className="flex flex-col items-center gap-1 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-xl hover:bg-rose-500/30 active:scale-95 transition-all text-xs"
                  >
                    <RefreshCw size={18} />
                    <span>{t('resetAdjust', "Reset")}</span>
                  </button>
                </div>
              )}

              {editorTab === 'stickers' && (
                <div className="flex items-center gap-2 flex-wrap py-2">
                  {EMOJI_STICKERS.map(s => (
                    <button 
                      key={s} 
                      onClick={() => {
                        if (selectedStickers.includes(s)) {
                          setSelectedStickers(selectedStickers.filter(item => item !== s));
                        } else {
                          setSelectedStickers([...selectedStickers, s]);
                        }
                      }}
                      className={`text-2xl p-2 rounded-xl transition-all ${selectedStickers.includes(s) ? 'bg-pink-500/30 border border-pink-500 scale-110' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* DETAILS / PUBLISH STAGE */}
      {mode === 'details' && (
        <div className="flex-1 p-4 sm:p-6 bg-slate-950 overflow-y-auto max-w-xl mx-auto w-full space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-white">{t('detailsTitle', "Photo Details")}</h2>
            <p className="text-xs text-slate-400">{t('detailsSub', "Add description and tags for your photo post")}</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">{t('captionLabel', "Photo Description (Caption):")}</label>
              <textarea 
                rows={3}
                value={caption} 
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('captionPlaceholder', "Write an engaging caption for your photo...")}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none text-sm"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">{t('hashtagsLabel', "Hashtags:")}</label>
              <input 
                type="text" 
                value={tags} 
                onChange={(e) => setTags(e.target.value)}
                placeholder="#HiSeePhotos #Creative #Photography" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">{t('categoryLabel', "Category:")}</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-pink-500 text-sm font-bold"
              >
                <option value="Creative">{t('catCreative', "Creative & Culture")}</option>
                <option value="Nature">{t('catNature', "Nature & Landscapes")}</option>
                <option value="Art">{t('catArt', "Art & Design")}</option>
                <option value="Lifestyle">{t('catLifestyle', "Lifestyle & Daily")}</option>
                <option value="Portrait">{t('catPortrait', "Portrait & Selfie")}</option>
              </select>
            </div>

            {/* 1. PUBLISH DESTINATION */}
            <div className="space-y-2 pt-2">
              <label className="text-slate-300 font-bold block">{t('destinationLabel', "Publish Destination:")}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPublishTarget('photos_only')}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${publishTarget === 'photos_only' ? 'bg-pink-600/20 border-pink-500 text-pink-300 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <ImageIcon size={20} className={publishTarget === 'photos_only' ? 'text-pink-400' : 'text-slate-400'} />
                  <span className="text-[11px] font-bold">{t('destPhotosOnly', "Photos Only")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishTarget('story')}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${publishTarget === 'story' ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <History size={20} className={publishTarget === 'story' ? 'text-amber-400' : 'text-slate-400'} />
                  <span className="text-[11px] font-bold">{t('destStoryOnly', "Story Only")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishTarget('both')}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${publishTarget === 'both' ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <LayoutGrid size={20} className={publishTarget === 'both' ? 'text-purple-400' : 'text-slate-400'} />
                  <span className="text-[11px] font-bold">{t('destBoth', "Photos & Story")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishTarget('chat')}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${publishTarget === 'chat' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <MessageSquare size={20} className={publishTarget === 'chat' ? 'text-emerald-400' : 'text-slate-400'} />
                  <span className="text-[11px] font-bold">{t('destChat', "Send to Chat")}</span>
                </button>
              </div>

              {publishTarget === 'chat' && (
                <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <MessageSquare size={14} />
                      {t('chooseChat', "Choose recipient chat:")}
                    </span>
                    {selectedChat && (
                      <span className="text-[10px] text-slate-400">
                        {t('selectedPrefix', "Selected:")} {selectedChat.user?.name || 'Chat'}
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-36 overflow-y-auto space-y-1.5 no-scrollbar">
                    {activeChats.length === 0 ? (
                      <p className="text-[10px] text-slate-500 text-center py-2">{t('noActiveChats', "No active chats currently")}</p>
                    ) : (
                      activeChats.map(c => {
                        const isSelected = selectedChat?.id === c.id;
                        return (
                          <div 
                            key={c.id} 
                            onClick={() => setSelectedChat(c)}
                            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-emerald-500/20 border border-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}
                          >
                            <div className="flex items-center gap-2">
                              <img 
                                src={c.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`} 
                                alt="" 
                                className="w-7 h-7 rounded-full object-cover border border-white/20"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-xs font-bold">{c.user?.name || 'Chat'}</span>
                            </div>
                            {isSelected && <Check size={14} className="text-emerald-400" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. VISIBILITY CONTROLS */}
            <div className="space-y-2 pt-2">
              <label className="text-slate-300 font-bold block">{t('visibilityLabel', "Who Can See This Photo:")}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'public', icon: <Globe size={18} />, label: t('visEveryone', "Everyone") },
                  { id: 'friends', icon: <Users size={18} />, label: t('visFriends', "Friends Only") },
                  { id: 'private', icon: <Lock size={18} />, label: t('visPrivate', "Private") }
                ].map(opt => (
                  <button 
                    key={opt.id} 
                    type="button"
                    onClick={() => setPrivacy(opt.id as any)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${privacy === opt.id ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 opacity-60 hover:opacity-100'}`}
                  >
                    <div className={privacy === opt.id ? 'text-emerald-400' : 'text-slate-400'}>{opt.icon}</div>
                    <span className="text-[11px] font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. ADVANCED PRIVACY */}
            <div className="space-y-3 pt-2">
              <label className="text-slate-400 font-bold block text-[11px]">{t('advPrivacyTitle', "Advanced Privacy & Protection:")}</label>
              <div className="space-y-2">
                {[
                  { label: t('screenshots', "Screenshots"), val: screenshotPrivacy, set: setScreenshotPrivacy, options: [{id: 'everyone', label: t('optEveryone', "Everyone")}, {id: 'friends', label: t('optFriends', "Friends")}, {id: 'none', label: t('optNone', "No One")}, {id: 'request', label: t('optRequest', "Request")}] },
                  { label: t('downloadPhoto', "Download Photo"), val: downloadPrivacy, set: setDownloadPrivacy, options: [{id: 'everyone', label: t('optEveryone', "Everyone")}, {id: 'friends', label: t('optFriends', "Friends")}, {id: 'none', label: t('optNone', "No One")}, {id: 'request', label: t('optRequest', "Request")}] },
                  { label: t('cameraExposure', "Camera Exposure"), val: cameraExposurePrivacy, set: setCameraExposurePrivacy, options: [{id: 'everyone', label: t('optEveryone', "Everyone")}, {id: 'friends', label: t('optFriends', "Friends")}, {id: 'none', label: t('optNone', "No One")}, {id: 'request', label: t('optRequest', "Request")}] }
                ].map(setting => (
                  <div key={setting.label} className="space-y-1 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-300 block">{setting.label}:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {setting.options.map(opt => (
                        <button 
                          key={opt.id} 
                          type="button"
                          onClick={() => setting.set(opt.id as any)}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all ${setting.val === opt.id ? 'bg-pink-600/30 border-pink-500 text-pink-300' : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={() => setMode('edit')}
              className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
            >
              {t('backToEdit', "Back to Edit")}
            </button>

            <button 
              onClick={handlePublish}
              disabled={uploading}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-xs text-white shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Share2 size={16} />}
              <span>{t('confirmAndPublish', "Confirm & Publish")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoStudio;
