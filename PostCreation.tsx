import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Music, Sparkles, X, ChevronRight, Check, Upload, ArrowRight, 
  Play, Pause, Sliders, Volume2, Type, Loader2, Globe, Users, Lock, MessageSquare,
  ShieldCheck, Headphones, Zap, FastForward, Sun, Contrast, Droplets, Smile,
  History, LayoutGrid, Film
} from 'lucide-react';
import { translations, getTranslation, sanitizeForLatin } from '../translations';
import { EMOJI_STICKERS } from '../data/constants';
import { videoCache } from '../lib/videoCache';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { uploadFileResilient } from '../src/lib/mediaProcessor';

interface UploadResult {
  url: string;
  public_id?: string;
}

const checkVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(duration || 0);
    };

    video.onerror = () => {
      cleanup();
      resolve(0);
    };

    video.src = objectUrl;
  });
};

const validateVideo = async (file: File, lang: string = 'ar'): Promise<{ duration: number; width: number; height: number }> => {
  const duration = await checkVideoDuration(file);
  if (duration > 180) {
    const rawMsg = getTranslation(lang, 'validateDurationError', "Sorry, the video is longer than allowed. The maximum allowed is 3 minutes.");
    const msg = sanitizeForLatin(rawMsg, lang, 'validateDurationError');
    throw new Error(msg);
  }
  return { duration, width: 720, height: 1280 };
};

const useUploadVideo = (lang: string = 'ar') => {
  const [progress, setProgress] = useState<number>(0);

  const uploadVideo = async (
    file: File,
    onProgress: (progress: number) => void,
    trimParams?: { start: number; duration: number },
    signal?: AbortSignal
  ): Promise<UploadResult> => {
    if (!file || file.size === 0) {
      const rawMsg = getTranslation(lang, 'invalidFileError', "Selected file is invalid or empty");
      const msg = sanitizeForLatin(rawMsg, lang, 'invalidFileError');
      throw new Error(msg);
    }

    try {
      const url = await uploadFileResilient(file, '/api/upload', (prog) => {
        const rounded = Math.round(prog);
        setProgress(rounded);
        onProgress(rounded);
      });
      return { url, public_id: url };
    } catch (err: any) {
      const rawMsg = getTranslation(lang, 'uploadNetworkError', "Cloud upload failed (Network error)");
      const msg = sanitizeForLatin(rawMsg, lang, 'uploadNetworkError');
      throw new Error(err.message || msg);
    }
  };

  return { uploadVideo, progress };
};

interface Props {
  lang?: string;
  onBack: () => void;
  onPublish: (videoData: { 
    title: string; 
    description: string; 
    url: string | null; 
    file: File | null;
    blob?: File | Blob | null;
    filter: any; 
    music: string; 
    privacy: string;
    screenshotPrivacy: string;
    downloadPrivacy: string;
    cameraExposurePrivacy: string;
    target: 'story' | 'video' | 'both';
    isPending?: boolean;
    audioSettings: { 
      autoEnhance: boolean; 
      volume: number; 
      spatial: boolean; 
      noiseReduction: boolean; 
      vocalBoost: boolean; 
      bassBoost: boolean; 
    };
    visualAdjustments: {
      brightness: number;
      contrast: number;
      saturation: number;
    };
    textOverlay?: string;
    sticker?: string;
    trimStart?: number;
    trimDuration?: number;
  }) => void;
  onCancel?: () => void;
  uploadVideo?: (file: File, onProgress: (progress: number) => void, trimParams?: { start: number; duration: number }, signal?: AbortSignal) => Promise<{ url: string; public_id?: string }>;
  globalUploadProgress?: number;
}

export const FILTERS = [
  { id: 'none', key: 'filterNatural', name: 'Natural', filter: '' },
  { id: 'vivid', key: 'filterVivid', name: 'Vivid', filter: 'saturate(1.8) contrast(1.1)' },
  { id: 'lush', key: 'filterLush', name: 'Lush', filter: 'contrast(1.2) brightness(1.1) saturate(1.3) hue-rotate(5deg)' },
  { id: 'bloom', key: 'filterBloom', name: 'Bloom', filter: 'brightness(1.2) contrast(0.9) saturate(1.1) blur(0.3px)' },
  { id: 'cold', key: 'filterCold', name: 'Cold', filter: 'hue-rotate(180deg) saturate(0.8) brightness(1.1)' },
  { id: 'vintage', key: 'filterVintage', name: 'Vintage', filter: 'sepia(0.6) contrast(1.1) brightness(0.9)' },
  { id: 'cyber', key: 'filterCyber', name: 'Cyber', filter: 'hue-rotate(90deg) saturate(1.6) contrast(1.2)' },
  { id: 'mono', key: 'filterMono', name: 'Mono', filter: 'grayscale(1)' },
  { id: 'dreamy', key: 'filterDreamy', name: 'Dreamy', filter: 'blur(0.8px) brightness(1.2) saturate(0.7)' },
  { id: 'gold', key: 'filterGold', name: 'Gold', filter: 'sepia(0.4) saturate(2) contrast(1.1) brightness(1.05)' },
  { id: 'noir', key: 'filterNoir', name: 'Noir', filter: 'grayscale(1) contrast(1.5) brightness(0.8)' }
];

export const MUSIC_TRACKS = [
  { id: 'm1', name: 'Creative Beats', artist: 'HiSee Beats' },
  { id: 'm2', name: 'City Pulse', artist: 'Cyber Soul' },
  { id: 'm3', name: 'Morning Calm', artist: 'Nature Flow' },
  { id: 'm4', name: 'Neon Vibes', artist: 'Synth Wave' }
];

// Local backup translation map to ensure complete UI coverage with absolute reliability
const localDict: Record<string, Record<string, string>> = {
  ar: {
    shareYourMoment: "شارك لحظتك للعالم",
    filters: "الفلاتر",
    adjust: "تعديل",
    text: "نص",
    stickers: "ملصق",
    music: "موسيقى",
    audio: "الصوت",
    speed: "سرعة",
    beauty: "تجميل",
    trim: "قص",
    processingVideo: "جاري معالجة الفيديو...",
    processingHelp: "نحن نجهز ملفك بأفضل جودة",
    cancelAndRetry: "إلغاء ومعاودة المحاولة ✖",
    videoTrimmer: "مقص الفيديو (الحد الأقصى 3 دقائق)",
    durationWarning: "الفيديو أطول من 3 دقائق، نرجو تحديد وقص مقطع حتى 180 ثانية قبل الرفع ✂️",
    trimConfirm: "تأكيد القص والمتابعة ✂️",
    eyelashes: "الرموش",
    lipstick: "حمرة الشفاه",
    faceSlimming: "نحافة الوجه",
    brightness: "السطوع",
    contrast: "التباين",
    saturation: "التشبع",
    addTextPlaceholder: "أضف نصاً للفيديو...",
    removeText: "حذف النص",
    nextBtn: "التالي",
    reselectBtn: "إعادة اختيار",
    contentStory: "قصة المحتوى",
    contentPlaceholder: "أخبر العالم عن إبداعك... #HiSee #Creative",
    publishSettings: "إعدادات النشر",
    onlyMyStory: "قصتي فقط",
    onlyMyVideos: "فيديوهاتي فقط",
    myStoryAndVideos: "قصتي وفيديوهاتي",
    communityPrivacy: "خصوصية المجتمع",
    advancedPrivacy: "خصوصية متقدمة",
    screenshots: "لقطات الشاشة",
    download: "تحميل",
    cameraExposure: "عرض للكاميرا",
    everyone: "الجميع",
    friends: "الأصدقاء",
    noOne: "لا أحد",
    requestPerm: "طلب إذن",
    everyoneExcept: "الجميع باستثناء",
    saveDraft: "حفظ كمسودة",
    publishingMoment: "نشر اللحظة",
    publishNow: "نشر الآن",
    processingFile: "جاري معالجة الملف...",
    okay: "حسناً",
    public: "عام",
    private: "خاص"
  },
  en: {
    shareYourMoment: "Share your moment with the world",
    filters: "Filters",
    adjust: "Adjust",
    text: "Text",
    stickers: "Stickers",
    music: "Music",
    audio: "Audio",
    speed: "Speed",
    beauty: "Beauty",
    trim: "Trim",
    processingVideo: "Processing video...",
    processingHelp: "We are preparing your file in the highest quality",
    cancelAndRetry: "Cancel & Retry ✖",
    videoTrimmer: "Video Trimmer (Max 3 minutes)",
    durationWarning: "Video is longer than 3 minutes, please select and trim a clip up to 180 seconds before upload ✂️",
    trimConfirm: "Confirm Trim & Proceed ✂️",
    eyelashes: "Eyelashes",
    lipstick: "Lipstick",
    faceSlimming: "Face Slimming",
    brightness: "Brightness",
    contrast: "Contrast",
    saturation: "Saturation",
    addTextPlaceholder: "Add text to video...",
    removeText: "Remove Text",
    nextBtn: "Next",
    reselectBtn: "Reselect",
    contentStory: "Content Story",
    contentPlaceholder: "Tell the world about your creation... #HiSee #Creative",
    publishSettings: "Publish Settings",
    onlyMyStory: "Only My Story",
    onlyMyVideos: "Only My Videos",
    myStoryAndVideos: "My Story & Videos",
    communityPrivacy: "Community Privacy",
    advancedPrivacy: "Advanced Privacy",
    screenshots: "Screenshots",
    download: "Download",
    cameraExposure: "Camera Exposure",
    everyone: "Everyone",
    friends: "Friends",
    noOne: "No One",
    requestPerm: "Request Permission",
    everyoneExcept: "Everyone Except",
    saveDraft: "Save Draft",
    publishingMoment: "Publishing Moment",
    publishNow: "Publish Now",
    processingFile: "Processing file...",
    okay: "Okay",
    public: "Public",
    private: "Private"
  }
};

const PostCreation: React.FC<Props> = ({ lang = 'ar', onBack, onPublish, onCancel, uploadVideo, globalUploadProgress = 0 }) => {
  const activeLang = lang || 'ar';

  // Strict Translation with Latin Text Guard
  const t = (key: string, fallback: string): string => {
    const fromCentral = getTranslation(activeLang, key, '');
    if (fromCentral) {
      return sanitizeForLatin(fromCentral, activeLang, key);
    }
    const fromLocal = localDict[activeLang]?.[key] || localDict['en']?.[key] || fallback;
    return sanitizeForLatin(fromLocal, activeLang, key);
  };

  const [step, setStep] = useState<'upload' | 'edit' | 'details' | 'uploading'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSavedToCache, setIsSavedToCache] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [preLoadedBuffer, setPreLoadedBuffer] = useState<ArrayBuffer | null>(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[0]);
  const [activeTool, setActiveTool] = useState<'none' | 'filters' | 'adjust' | 'music' | 'audio' | 'text' | 'stickers' | 'speed' | 'beauty' | 'trim'>('none');
  
  // Beauty states
  const [eyelashes, setEyelashes] = useState(0);
  const [lipstick, setLipstick] = useState(0);
  const [faceSlimming, setFaceSlimming] = useState(0);
  const [textOverlay, setTextOverlay] = useState('');
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  
  // Visual Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  
  // Advanced Audio States
  const [autoEnhanceAudio, setAutoEnhanceAudio] = useState(true);
  const [spatialAudio, setSpatialAudio] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState(true);
  const [vocalBoost, setVocalBoost] = useState(false);
  const [bassBoost, setBassBoost] = useState(false);
  const [volume, setVolume] = useState(90);
  
  // Privacy & Target State
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [screenshotPrivacy, setScreenshotPrivacy] = useState<'everyone' | 'friends' | 'none' | 'request'>('everyone');
  const [downloadPrivacy, setDownloadPrivacy] = useState<'everyone' | 'friends' | 'none' | 'request' | 'everyone_except'>('everyone');
  const [cameraExposurePrivacy, setCameraExposurePrivacy] = useState<'everyone' | 'friends' | 'none' | 'request'>('everyone');
  const [publishTarget, setPublishTarget] = useState<'story' | 'video' | 'both'>('both');
  
  // Trimmer states
  const [videoDuration, setVideoDuration] = useState(0);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);
  const [trimDuration, setTrimDuration] = useState(60);
  const [isTrimConfirmed, setIsTrimConfirmed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const combinedFilter = `${activeFilter.filter} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  const resetAll = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (onCancel) {
      onCancel();
    }
    setVideoUrl(null);
    setVideoFile(null);
    setPreLoadedBuffer(null);
    setStep('upload');
    setIsProcessing(false);
    setProcessingError(null);
    setUploadProgress(0);
  };

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.volume = volume / 100;
      videoPreviewRef.current.playbackRate = videoSpeed;
    }
  }, [volume, videoSpeed, step]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      setVideoFile(file);
      setPreLoadedBuffer(null);

      // Read duration without blocking video from entering processing/edit screen
      const duration = await checkVideoDuration(file);
      setVideoDuration(duration);
      setShowTrimmer(duration > 60);
      setTrimStart(0);
      setTrimEnd(duration > 0 ? Math.min(duration, 180) : 180);
      setTrimDuration(duration > 0 ? Math.min(duration, 180) : 180);
      setIsTrimConfirmed(duration <= 180);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      // Best-effort pre-read of ArrayBuffer using a detached slice
      try {
        const slice = file.slice(0, file.size, file.type);
        if (typeof slice.arrayBuffer === 'function') {
          slice.arrayBuffer().then(buffer => {
            setPreLoadedBuffer(buffer);
          }).catch((err) => {
            console.warn("[PostCreation] Best-effort ArrayBuffer pre-read skipped:", err?.message || err);
          });
        }
      } catch (err) {
        console.warn("[PostCreation] ArrayBuffer slice skipped:", err);
      }
      
      setStep('edit'); 
      setIsProcessing(false);
      setProcessingError(null);
    }
  };

  const handlePublish = async () => {
    if (!videoFile) return;

    const currentDuration = (isTrimConfirmed || showTrimmer) ? (trimEnd - trimStart) : (videoDuration || 0);
    if (currentDuration > 180 || (videoDuration > 180 && !isTrimConfirmed)) {
      setStep('edit');
      setActiveTool('trim');
      setShowTrimmer(true);
      alert(t('validateDurationError', "validateDurationError"));
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsProcessing(true);
    setProcessingError(null);
    try {
      let arrayBuffer: ArrayBuffer | null = preLoadedBuffer;
      if (!arrayBuffer && videoFile) {
        try {
          const slice = videoFile.slice(0, videoFile.size, videoFile.type);
          if (typeof slice.arrayBuffer === 'function') {
            arrayBuffer = await slice.arrayBuffer().catch(() => null);
          }
        } catch {
          arrayBuffer = null;
        }
      }
      
      onPublish({ 
        title: "HiSee Post",
        description, 
        url: videoUrl,
        file: null, 
        blob: videoFile, 
        filter: activeFilter, 
        music: selectedMusic ? `${selectedMusic.name} - ${selectedMusic.artist}` : "", 
        privacy,
        screenshotPrivacy,
        downloadPrivacy,
        cameraExposurePrivacy,
        target: publishTarget,
        isPending: true,
        audioSettings: { 
          autoEnhance: autoEnhanceAudio, 
          volume: volume,
          spatial: spatialAudio,
          noiseReduction: noiseReduction,
          vocalBoost,
          bassBoost
        },
        visualAdjustments: {
          brightness,
          contrast,
          saturation
        },
        textOverlay: textOverlay || undefined,
        sticker: activeSticker || undefined,
        trimStart: (isTrimConfirmed || showTrimmer) ? trimStart : undefined,
        trimDuration: (isTrimConfirmed || showTrimmer) ? (trimEnd - trimStart) : undefined,
        // @ts-ignore
        arrayBuffer: arrayBuffer || undefined
      });
    } catch (err: any) {
      console.error("Error preparing video file pre-publish:", err);
      setProcessingError(t('uploadNetworkError', "uploadNetworkError"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0c10] text-white overflow-hidden">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-3xl z-50">
        <button onClick={onBack} disabled={step === 'uploading'} className="p-2.5 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-75">
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] italic text-rose-500">HiSee Studio Pro</h2>
            <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest text-center">Visual Mastering Engine v6.0</span>
        </div>
        <div className="w-12"></div>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-72 h-72 bg-white/5 border-4 border-dashed border-white/10 rounded-[5rem] flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group shadow-2xl mb-12 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Upload size={72} className="text-emerald-500 group-hover:scale-110 transition-transform mb-8 relative z-10" />
              <p className="text-sm font-black uppercase tracking-[0.2em] italic text-slate-400 group-hover:text-white relative z-10">{t('shareYourMoment', "Share your moment with the world")}</p>
            </div>
            <input type="file" accept="video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>
        )}

        {step === 'edit' && (
          <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
             {(isProcessing || globalUploadProgress > 0) && (
                <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500 p-8 text-center">
                  {processingError ? (
                    <>
                      <div className="text-rose-500 mb-2">⚠️</div>
                      <p className="text-white font-black uppercase tracking-widest text-sm mb-4">{processingError}</p>
                      <button 
                        onClick={resetAll}
                        className="px-8 py-3 bg-white text-black font-black uppercase rounded-full text-xs"
                      >
                        {t('okay', "Okay")}
                      </button>
                    </>
                  ) : (
                     <>
                       <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                       <div className="flex flex-col items-center gap-1">
                         <p className="text-white font-black uppercase tracking-widest text-xs">{t('processingVideo', "Processing video...")} {globalUploadProgress > 0 ? `${globalUploadProgress}%` : '🔄'}</p>
                         {globalUploadProgress > 0 && (
                           <div className="w-48 h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
                             <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${globalUploadProgress}%` }} />
                           </div>
                         )}
                         <p className="text-white/40 text-[10px]">{t('processingHelp', "We are preparing your file in the highest quality")}</p>
                       </div>
                       <button 
                         onClick={resetAll}
                         className="mt-8 px-6 py-2 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all font-black uppercase text-[10px] tracking-widest rounded-full"
                       >
                         {t('cancelAndRetry', "Cancel & Retry ✖")}
                       </button>
                     </>
                  )}
                </div>
             )}

             <video 
                ref={videoPreviewRef}
                src={normalizeMediaUrl(videoUrl!)} 
                autoPlay 
                muted={true}
                loop={!showTrimmer || activeTool !== 'trim'} 
                playsInline
                crossOrigin="anonymous"
                preload="auto"
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (d && Number.isFinite(d)) {
                    setVideoDuration(d);
                    setShowTrimmer(d > 60);
                    if (trimEnd === 60 || trimEnd > d) {
                      setTrimEnd(Math.min(d, 180));
                    }
                  }
                }}
                onError={() => {
                  console.warn("Local video preview failed; browser might not support this codec locally.");
                }}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  setCurrentTime(video.currentTime);
                  
                  if (showTrimmer && activeTool === 'trim' && video) {
                    if (video.currentTime >= trimEnd) {
                      try {
                        video.pause();
                      } catch (e) {}
                      setIsPlaying(false);
                      if (Number.isFinite(trimStart)) video.currentTime = trimStart;
                    }
                    if (video.currentTime < trimStart) {
                      if (Number.isFinite(trimStart)) video.currentTime = trimStart;
                    }
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className={`h-full w-full object-cover transition-opacity duration-300 ${isProcessing ? 'opacity-0' : 'opacity-100'}`} 
                style={{ filter: combinedFilter }}
             />
             
             {/* Text Overlay Preview */}
             {textOverlay && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                     <p className="text-2xl md:text-4xl font-black italic text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] px-6 py-2 bg-black/20 backdrop-blur-sm rounded-2xl uppercase tracking-widest animate-bounce-subtle">
                         {textOverlay}
                     </p>
                 </div>
              )}

              {/* Sticker Overlay Preview */}
              {activeSticker && (
                 <div className="absolute top-1/3 left-1/4 z-30 pointer-events-none select-none animate-pulse">
                    {activeSticker.startsWith('http') || activeSticker.startsWith('data:') ? (
                       <img src={activeSticker} className="w-24 h-24 object-contain drop-shadow-2xl" alt="sticker" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    ) : (
                       <span className="text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] block">{activeSticker}</span>
                    )}
                 </div>
              )}
              
              <div className="absolute top-10 right-6 flex flex-col gap-4 z-50">
                 {[
                  { id: 'filters', icon: <Sparkles size={20} />, label: t('filters', "Filters") },
                  { id: 'adjust', icon: <Sliders size={20} />, label: t('adjust', "Adjust") },
                  { id: 'text', icon: <Type size={20} />, label: t('text', "Text") },
                  { id: 'stickers', icon: <Smile size={20} />, label: t('stickers', "Stickers") },
                  { id: 'music', icon: <Music size={20} />, label: t('music', "Music") },
                  { id: 'audio', icon: <Volume2 size={20} />, label: t('audio', "Audio") },
                  { id: 'speed', icon: <FastForward size={20} />, label: t('speed', "Speed") },
                  { id: 'beauty', icon: <Sparkles size={20} />, label: t('beauty', "Beauty") },
                  ...(videoDuration > 0 ? [{ id: 'trim', icon: <Film size={20} />, label: t('trim', "Trim") }] : [])
                ].map(tool => (
                   <button 
                    key={tool.id} 
                    onClick={() => {
                      if (tool.id === 'trim') setShowTrimmer(true);
                      setActiveTool(activeTool === tool.id ? 'none' : tool.id as any);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-all border ${activeTool === tool.id ? 'bg-rose-600 border-rose-400 text-white scale-110' : 'bg-white/10 backdrop-blur-md border-white/10 text-white'}`}
                   >
                     {tool.icon}
                     <span className="text-[6px] font-black uppercase tracking-tighter">{tool.label}</span>
                   </button>
                ))}
              </div>

              {/* Trimmer UI Overlay */}
              {showTrimmer && activeTool === 'trim' && !isProcessing && (
                 <div className="absolute inset-x-6 bottom-32 z-[70] bg-black/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 animate-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center mb-4">
                         <div className="flex flex-col gap-1">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{t('videoTrimmer', "Video Trimmer (Max 3 minutes)")}</h4>
                           {videoDuration > 180 && (
                             <p className="text-[9px] text-amber-400 font-bold">{t('durationWarning', "Video is longer than 3 minutes, please select and trim a clip up to 180 seconds before upload ✂️")}</p>
                           )}
                           <div className="flex items-center gap-2 mt-1">
                             <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                             <span className="text-[14px] font-mono font-black text-rose-500">
                               {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}
                             </span>
                             <span className="text-[10px] text-white/30">/</span>
                             <span className="text-[10px] font-mono text-white/50">
                               {Math.floor(trimEnd / 60)}:{(Math.floor(trimEnd % 60)).toString().padStart(2, '0')}
                             </span>
                           </div>
                         </div>

                         {/* Play/Pause Button */}
                         <button 
                           onClick={async () => {
                             if (videoPreviewRef.current) {
                               if (isPlaying) {
                                 if (playPromiseRef.current) {
                                   try {
                                     await playPromiseRef.current;
                                   } catch (e) {}
                                 }
                                 if (videoPreviewRef.current) {
                                   videoPreviewRef.current.pause();
                                 }
                               } else {
                                 if (videoPreviewRef.current) {
                                   if (videoPreviewRef.current.currentTime >= trimEnd) {
                                     if (Number.isFinite(trimStart)) videoPreviewRef.current.currentTime = trimStart;
                                   }
                                   playPromiseRef.current = videoPreviewRef.current.play();
                                   try {
                                     await playPromiseRef.current;
                                   } catch (e) {
                                     console.warn("Play request was interrupted");
                                   }
                                 }
                               }
                             }
                           }}
                           className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all active:scale-90"
                         >
                           {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                         </button>

                         <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                           {Math.floor(trimEnd - trimStart)}s / 180s
                         </span>
                     </div>
                     <div className="space-y-6">
                         <div className="relative h-20 bg-white/5 rounded-xl overflow-hidden border border-white/10">
                             <div className="absolute inset-0 flex items-center justify-around opacity-20">
                               {[...Array(30)].map((_, i) => (
                                 <div key={i} className="w-1 bg-white rounded-full" style={{ height: `${20 + Math.random() * 60}%` }} />
                               ))}
                             </div>
                             <div 
                                 className="absolute h-full bg-emerald-500/10 border-x-4 border-emerald-500 z-10"
                                 style={{ 
                                     left: `${(trimStart / videoDuration) * 100}%`,
                                     width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                                 }}
                             >
                               <div className="absolute -left-1 top-0 bottom-0 w-1 bg-white/50" />
                               <div className="absolute -right-1 top-0 bottom-0 w-1 bg-white/50" />
                             </div>

                             <div 
                                 className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-20 shadow-[0_0_12px_rgba(244,63,94,0.8)] transition-all duration-75"
                                 style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                             >
                                 <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white shadow-lg" />
                             </div>
                         </div>
                         
                         <div className="space-y-4">
                           <div className="space-y-1 text-start">
                             <div className="flex justify-between items-center">
                               <label className="text-[8px] text-white/40 uppercase tracking-widest">{t('speed', "Speed")}</label>
                               <span className="text-[8px] font-mono text-rose-500">{currentTime.toFixed(1)}s</span>
                             </div>
                             <input 
                                 type="range" 
                                 min={trimStart} 
                                 max={trimEnd} 
                                 step="0.1"
                                 value={currentTime}
                                 onChange={(e) => {
                                   const val = Number(e.target.value);
                                   setCurrentTime(val);
                                   if (videoPreviewRef.current && Number.isFinite(val)) {
                                     videoPreviewRef.current.currentTime = val;
                                   }
                                 }}
                                 className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-rose-500"
                             />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1 text-start">
                               <label className="text-[8px] text-white/40 uppercase tracking-widest">Start ({trimStart.toFixed(1)}s)</label>
                               <input 
                                   type="range" 
                                   min="0" 
                                   max={videoDuration} 
                                   step="0.1"
                                   value={trimStart}
                                   onChange={(e) => {
                                     const val = Number(e.target.value);
                                     setTrimStart(val);
                                     if (trimEnd - val > 60) setTrimEnd(val + 60);
                                     if (trimEnd <= val) setTrimEnd(Math.min(videoDuration, val + 1));
                                     setIsTrimConfirmed(false);
                                   }}
                                   className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-500"
                               />
                             </div>
                             <div className="space-y-1 text-start">
                               <label className="text-[8px] text-white/40 uppercase tracking-widest">End ({trimEnd.toFixed(1)}s)</label>
                               <input 
                                   type="range" 
                                   min="0" 
                                   max={videoDuration} 
                                   step="0.1"
                                   value={trimEnd}
                                   onChange={(e) => {
                                     const val = Number(e.target.value);
                                     setTrimEnd(val);
                                     if (val - trimStart > 60) setTrimStart(Math.max(0, val - 60));
                                     if (val <= trimStart) setTrimStart(Math.max(0, val - 1));
                                     setIsTrimConfirmed(false);
                                   }}
                                   className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-500"
                               />
                             </div>
                           </div>
                         </div>

                         <button 
                           onClick={() => {
                             setIsTrimConfirmed(true);
                             setActiveTool('none');
                           }}
                           className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 group"
                         >
                           <Check size={18} className="group-hover:scale-125 transition-transform" />
                           {t('trimConfirm', "Confirm Trim & Proceed ✂️")}
                         </button>
                     </div>
                 </div>
              )}

              {activeTool !== 'none' && (
                 <div className="absolute inset-x-6 bottom-32 z-[60] animate-in slide-in-from-bottom-6 duration-300">
                    <div className="p-8 bg-black/90 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl">
                       <div className="flex justify-between items-center mb-6">
                         <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50">Visual Mastering Console</h4>
                         <button onClick={() => setActiveTool('none')} className="p-2 text-white/50 hover:text-white transition-all"><X size={18} /></button>
                       </div>

                       <div className="max-h-[35vh] overflow-y-auto no-scrollbar">
                         {activeTool === 'beauty' && (
                           <div className="space-y-6">
                              {[
                                { key: 'eyelashes', label: t('eyelashes', "Eyelashes"), val: eyelashes, set: setEyelashes },
                                { key: 'lipstick', label: t('lipstick', "Lipstick"), val: lipstick, set: setLipstick },
                                { key: 'faceSlimming', label: t('faceSlimming', "Face Slimming"), val: faceSlimming, set: setFaceSlimming },
                              ].map(adj => (
                                <div key={adj.key} className="space-y-2">
                                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      <span>{adj.label}</span>
                                      <span className="text-emerald-500">{adj.val}%</span>
                                   </div>
                                   <input type="range" min="0" max="100" value={adj.val} onChange={(e) => adj.set(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-500" />
                                </div>
                              ))}
                           </div>
                         )}
                         {activeTool === 'adjust' && (
                           <div className="space-y-6">
                              {[
                                { key: 'brightness', icon: <Sun size={16}/>, label: t('brightness', "Brightness"), val: brightness, set: setBrightness, min: 50, max: 150 },
                                { key: 'contrast', icon: <Contrast size={16}/>, label: t('contrast', "Contrast"), val: contrast, set: setContrast, min: 50, max: 150 },
                                { key: 'saturation', icon: <Droplets size={16}/>, label: t('saturation', "Saturation"), val: saturation, set: setSaturation, min: 0, max: 200 },
                              ].map(adj => (
                                <div key={adj.key} className="space-y-2">
                                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      <div className="flex items-center gap-2">{adj.icon} {adj.label}</div>
                                      <span className="text-emerald-500">{adj.val}%</span>
                                   </div>
                                   <input type="range" min={adj.min} max={adj.max} value={adj.val} onChange={(e) => adj.set(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-500" />
                                </div>
                              ))}
                           </div>
                         )}

                         {activeTool === 'filters' && (
                           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                               {FILTERS.map(f => (
                                  <button key={f.id} onClick={() => setActiveFilter(f)} className={`shrink-0 flex flex-col items-center gap-3 p-2 rounded-full transition-all ${activeFilter.id === f.id ? 'ring-2 ring-rose-500 scale-110' : 'opacity-70'}`}>
                                     <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                                        <div className="w-full h-full" style={{ filter: f.filter, background: 'linear-gradient(45deg, #111, #333)' }}></div>
                                     </div>
                                     <span className="text-[9px] font-black uppercase whitespace-nowrap text-white drop-shadow-md">{t(f.key, f.name)}</span>
                                  </button>
                               ))}
                           </div>
                         )}

                         {activeTool === 'stickers' && (
                           <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pb-2 max-h-52 overflow-y-auto no-scrollbar">
                              {EMOJI_STICKERS.map((s, idx) => (
                                <button 
                                  key={idx} 
                                  type="button"
                                  onClick={() => setActiveSticker(activeSticker === s ? null : s)}
                                  className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${activeSticker === s ? 'bg-emerald-500/20 border-emerald-500 scale-105' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                  {s.startsWith('http') || s.startsWith('data:') ? (
                                    <img src={s} className="w-10 h-10 object-contain" alt="" />
                                  ) : (
                                    <span className="text-3xl select-none leading-none">{s}</span>
                                  )}
                                </button>
                              ))}
                           </div>
                         )}

                         {activeTool === 'audio' && (
                           <div className="space-y-8 p-2">
                              <div className="flex justify-center items-end gap-1.5 h-12 bg-black/40 rounded-[2rem] border border-white/5 p-4 mb-4" aria-hidden="true">
                                 {[...Array(16)].map((_, i) => (
                                   <div key={i} className="w-1 bg-emerald-500 rounded-full animate-audio-studio" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }} />
                                 ))}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <button onClick={() => setAutoEnhanceAudio(!autoEnhanceAudio)} className={`p-4 rounded-3xl border flex flex-col gap-2 transition-all ${autoEnhanceAudio ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                     <ShieldCheck size={18} />
                                     <span className="text-[10px] font-black">Studio Hi-Fi</span>
                                 </button>
                                 <button onClick={() => setVocalBoost(!vocalBoost)} className={`p-4 rounded-3xl border flex flex-col gap-2 transition-all ${vocalBoost ? 'bg-rose-600/20 border-rose-500' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                     <MessageSquare size={18} />
                                     <span className="text-[10px] font-black">Vocal Boost</span>
                                 </button>
                                 <button onClick={() => setBassBoost(!bassBoost)} className={`p-4 rounded-3xl border flex flex-col gap-2 transition-all ${bassBoost ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                     <Zap size={18} />
                                     <span className="text-[10px] font-black">Bass Boost</span>
                                 </button>
                                 <button onClick={() => setSpatialAudio(!spatialAudio)} className={`p-4 rounded-3xl border flex flex-col gap-2 transition-all ${spatialAudio ? 'bg-amber-600/20 border-amber-500' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                     <Headphones size={18} />
                                     <span className="text-[10px] font-black">3D Spatial</span>
                                 </button>
                              </div>
                              <div className="space-y-3">
                                 <div className="flex justify-between text-[10px] font-black text-slate-400"><span>MASTER GAIN</span><span className="text-emerald-500">{volume}%</span></div>
                                 <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-rose-500" />
                              </div>
                           </div>
                         )}

                         {activeTool === 'text' && (
                           <div className="space-y-4">
                              <input type="text" value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} placeholder={t('addTextPlaceholder', "Add text to video...")} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500 text-white" />
                              {textOverlay && <button onClick={() => setTextOverlay('')} className="w-full text-[9px] font-black text-rose-500 uppercase tracking-widest">{t('removeText', "Remove Text")}</button>}
                           </div>
                         )}

                         {activeTool === 'music' && (
                           <div className="space-y-3">
                              {MUSIC_TRACKS.map(m => (
                                 <button key={m.id} onClick={() => setSelectedMusic(m)} className={`w-full flex items-center justify-between p-4 rounded-3xl border transition-all ${selectedMusic.id === m.id ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-white/5 text-slate-500 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 bg-black/40 rounded-2xl flex items-center justify-center text-rose-500"><Music size={18} /></div>
                                       <div className="text-start">
                                         <span className="text-xs font-black block">{m.name}</span>
                                         <span className="text-[8px] opacity-60 uppercase">{m.artist}</span>
                                       </div>
                                    </div>
                                 </button>
                              ))}
                           </div>
                         )}

                         {activeTool === 'speed' && (
                            <div className="flex justify-around gap-2">
                               {[0.5, 1, 1.5, 2].map(s => (
                                  <button key={s} onClick={() => setVideoSpeed(s)} className={`px-8 py-4 rounded-2xl border transition-all ${videoSpeed === s ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                                     <span className="text-xs font-black">{s}x</span>
                                  </button>
                               ))}
                            </div>
                         )}
                       </div>
                    </div>
                 </div>
              )}

              <div className="absolute bottom-10 left-0 right-0 px-10 flex justify-between items-center z-20">
                 <button onClick={resetAll} className="p-5 bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 text-white/60 hover:text-white transition-all uppercase text-[10px] font-black tracking-widest italic">{t('reselectBtn', "Reselect")}</button>
                 <button 
                   onClick={() => {
                     const currentDuration = (isTrimConfirmed || showTrimmer) ? (trimEnd - trimStart) : (videoDuration || 0);
                     if (currentDuration > 180 || (videoDuration > 180 && !isTrimConfirmed)) {
                       setActiveTool('trim');
                       setShowTrimmer(true);
                       alert(t('validateDurationError', "validateDurationError"));
                       return;
                     }
                     setStep('details');
                   }} 
                   className={`bg-white text-black px-14 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center gap-4 active:scale-95 transition-all ${videoDuration > 60 && !isTrimConfirmed ? 'opacity-50' : ''}`}
                 >
                   {t('nextBtn', "Next")} <ChevronRight size={18} strokeWidth={4} />
                 </button>
              </div>
           </div>
        )}

        {step === 'details' && (
          <div className="flex-1 p-10 space-y-12 overflow-y-auto no-scrollbar animate-in slide-in-from-right-10 duration-500">
             <div className="flex gap-8 items-start">
                 <div className="w-32 h-48 bg-slate-900 rounded-[2.5rem] border-4 border-white/10 overflow-hidden shrink-0 relative shadow-2xl">
                    <video 
                      src={videoUrl!} 
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover" 
                      style={{ filter: combinedFilter }} 
                      onError={() => console.warn("Details preview failed.")}
                    />
                    <div className="absolute inset-0 flex items-center justify-center"><Play size={24} className="text-white/40" /></div>
                 </div>
                 <div className="flex-1 space-y-3 text-start">
                     <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">{t('contentStory', "Content Story")}</label>
                     <textarea 
                       value={description} 
                       onChange={(e) => setDescription(e.target.value)} 
                       placeholder={t('contentPlaceholder', "Tell the world about your creation... #HiSee #Creative")} 
                       className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-sm font-medium h-40 resize-none outline-none focus:border-rose-500/50 leading-relaxed text-white shadow-inner" 
                     />
                 </div>
              </div>

              <div className="space-y-6">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 border-b border-white/5 pb-4 italic text-start">{t('publishSettings', "Publish Settings")}</h4>
                 
                 <div className="flex gap-4">
                     <button 
                       onClick={() => setPublishTarget('story')}
                       className={`flex-1 p-6 rounded-[2.5rem] border transition-all flex flex-col items-center justify-center gap-2 ${publishTarget === 'story' ? 'bg-amber-600/20 border-amber-500 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}
                     >
                        <History size={24} className={publishTarget === 'story' ? 'text-amber-500' : 'text-slate-400'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('onlyMyStory', "Only My Story")}</span>
                     </button>
                     <button 
                       onClick={() => setPublishTarget('video')}
                       className={`flex-1 p-6 rounded-[2.5rem] border transition-all flex flex-col items-center justify-center gap-2 ${publishTarget === 'video' ? 'bg-blue-600/20 border-blue-500 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}
                     >
                        <Film size={24} className={publishTarget === 'video' ? 'text-blue-500' : 'text-slate-400'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('onlyMyVideos', "Only My Videos")}</span>
                     </button>
                     <button 
                       onClick={() => setPublishTarget('both')}
                       className={`flex-1 p-6 rounded-[2.5rem] border transition-all flex flex-col items-center justify-center gap-2 ${publishTarget === 'both' ? 'bg-purple-600/20 border-purple-500 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}
                     >
                        <LayoutGrid size={24} className={publishTarget === 'both' ? 'text-purple-500' : 'text-slate-400'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('myStoryAndVideos', "My Story & Videos")}</span>
                     </button>
                 </div>

                 <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 border-b border-white/5 pb-4 italic text-start mt-6">{t('communityPrivacy', "Community Privacy")}</h4>
                 <div className="grid grid-cols-3 gap-4">
                     {[
                       { id: 'public', icon: <Globe size={20} />, label: t('public', "Public") },
                       { id: 'friends', icon: <Users size={20} />, label: t('friends', "Friends") },
                       { id: 'private', icon: <Lock size={20} />, label: t('private', "Private") }
                     ].map(opt => (
                        <button 
                          key={opt.id} 
                          onClick={() => setPrivacy(opt.id as any)}
                          className={`flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border transition-all ${privacy === opt.id ? 'bg-emerald-600/20 border-emerald-500 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'}`}
                        >
                           <div className={privacy === opt.id ? 'text-emerald-500' : 'text-slate-400'}>{opt.icon}</div>
                           <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                        </button>
                     ))}
                 </div>

                 <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 border-b border-white/5 pb-4 italic text-start mt-6">{t('advancedPrivacy', "Advanced Privacy")}</h4>
                 <div className="space-y-6">
                   {[
                     { key: 'screenshots', label: t('screenshots', "Screenshots"), val: screenshotPrivacy, set: setScreenshotPrivacy, options: [{id: 'everyone', label: t('everyone', "Everyone")}, {id: 'friends', label: t('friends', "Friends")}, {id: 'none', label: t('noOne', "No One")}, {id: 'request', label: t('requestPerm', "Request Permission")}] },
                     { key: 'download', label: t('download', "Download"), val: downloadPrivacy, set: setDownloadPrivacy, options: [{id: 'everyone', label: t('everyone', "Everyone")}, {id: 'friends', label: t('friends', "Friends")}, {id: 'none', label: t('noOne', "No One")}, {id: 'request', label: t('requestPerm', "Request Permission")}, {id: 'everyone_except', label: t('everyoneExcept', "Everyone Except")}] },
                     { key: 'cameraExposure', label: t('cameraExposure', "Camera Exposure"), val: cameraExposurePrivacy, set: setCameraExposurePrivacy, options: [{id: 'everyone', label: t('everyone', "Everyone")}, {id: 'friends', label: t('friends', "Friends")}, {id: 'none', label: t('noOne', "No One")}, {id: 'request', label: t('requestPerm', "Request Permission")}] }
                   ].map(setting => (
                     <div key={setting.key} className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-white/50">{setting.label}</label>
                       <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                         {setting.options.map(opt => (
                           <button 
                             key={opt.id}
                             onClick={() => setting.set(opt.id as any)}
                             className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${setting.val === opt.id ? 'bg-rose-600/20 border-rose-500' : 'bg-white/5 border-white/5 opacity-50'}`}
                           >
                             {opt.label}
                           </button>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

              <div className="flex gap-4 pt-10 pb-20">
                 <button onClick={onBack} disabled={isProcessing} className="flex-1 py-6 bg-slate-950 text-slate-500 rounded-[2.5rem] font-black uppercase text-xs tracking-widest border border-white/5 disabled:opacity-50">{t('saveDraft', "Save Draft")}</button>
                 <button 
                   onClick={handlePublish} 
                   disabled={isProcessing}
                   className="flex-[2] py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] md:text-sm md:tracking-[0.4em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                     {isProcessing ? (
                       <>{t('processingFile', "Processing file...")} <Loader2 className="animate-spin" size={20} /></>
                     ) : (
                       <>{t('publishNow', "Publish Now")} <Zap size={20} fill="currentColor" /></>
                     )}
                 </button>
              </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes audio-studio {
          0%, 100% { height: 10%; }
          50% { height: 100%; }
        }
        .animate-audio-studio {
          animation: audio-studio 0.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PostCreation;

export { validateVideo, useUploadVideo };
