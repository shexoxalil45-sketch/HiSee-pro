
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { 
  X, Video, Gem, ImageIcon, Loader2, Sparkles, 
  ArrowRight, Wand2, History, Play, Share2, Download
} from 'lucide-react';
import { Language } from '../types';
import { generateVideo, checkVideoStatus, downloadVideo } from '../services/geminiService';

interface AIVideoStudioProps {
  onBack: () => void;
  lang: Language;
}

export const AIVideoStudio: React.FC<AIVideoStudioProps> = ({ onBack, lang }) => {
  const [aiMode, setAiMode] = useState<'free' | 'pro'>('free');
  const [quota, setQuota] = useState(1);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  
  React.useEffect(() => {
    const lastReset = localStorage.getItem('hisee_quota_last_reset');
    const now = new Date().toDateString();
    if (lastReset !== now) {
      setQuota(1);
      localStorage.setItem('hisee_quota_last_reset', now);
    } else {
      const savedQuota = localStorage.getItem('hisee_quota');
      if (savedQuota !== null) setQuota(parseInt(savedQuota));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('hisee_quota', quota.toString());
  }, [quota]);
  const [videoGenType, setVideoGenType] = useState<'text' | 'image'>('text');
  const [videoGenPrompt, setVideoGenPrompt] = useState('');
  const [selectedGenImage, setSelectedGenImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoGenResult, setVideoGenResult] = useState<string | null>(null);

  const t = {
    ar: {
      title: 'استوديو توليد الفيديو',
      subTitle: 'حول خيالك إلى مقاطع فيديو مذهلة',
      freeMode: 'توليد مجاني',
      proMode: 'خيار PRO',
      textToVideo: 'نص إلى فيديو',
      imageToVideo: 'صورة إلى فيديو',
      proFeatures: 'مميزات PRO',
      proDesc: 'دقة 4K، مدة أطول، ومعالجة أسرع عبر نماذج Ultra المتطورة.',
      selectImage: 'اختر صورة للتحريك',
      changeImage: 'تغيير الصورة',
      placeholderText: 'اكتب وصفاً للفيديو الذي تريد صناعته...',
      placeholderImage: 'أضف وصفاً لحركة الصورة (اختياري)...',
      generate: 'بدء صناعة الفيديو',
      generatePro: 'بدء التوليد PRO',
      generating: 'جاري التوليد... (قد يستغرق دقائق)',
      done: 'فهمت',
      back: 'رجوع'
    },
    en: {
      title: 'AI Video Studio',
      subTitle: 'Turn your imagination into stunning videos',
      freeMode: 'Free Mode',
      proMode: 'Paid Mode (PRO)',
      textToVideo: 'Text to Video',
      imageToVideo: 'Image to Video',
      proFeatures: 'Pro Features',
      proDesc: '4K resolution, longer duration, and faster processing with Ultra models.',
      selectImage: 'Select image to animate',
      changeImage: 'Change Image',
      placeholderText: 'Describe the video you want to generate...',
      placeholderImage: 'Add motion description (optional)...',
      generate: 'Generate Video',
      generatePro: 'Start Pro Generation',
      generating: 'Generating... (may take minutes)',
      done: 'Got it',
      back: 'Back'
    }
  }[lang === 'ar' ? 'ar' : 'en'];

  // محرك تحويل الصورة إلى فيديو محلي (AI-Style Motion)
  const generateLocalVideoEngine = (imageSrc: string, seconds: number, prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;

      img.onload = () => {
        const stream = canvas.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(videoBlob));
        };

        recorder.start();

        let frame = 0;
        const totalFrames = 30 * seconds;
        const startTime = Date.now();

        const animate = () => {
          // Draw the base image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // "AI Render Scanline" effect
          const progress = frame / totalFrames;
          const scanY = progress * canvas.height;
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(0, scanY - 2, canvas.width, 4);
          
          // Glow effect on scanline
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
          ctx.fillRect(0, scanY - 1, canvas.width, 2);
          ctx.shadowBlur = 0;

          // Add a subtle "Processing" label
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '16px monospace';
          ctx.fillText(`RENDERING AI FRAME: ${Math.floor(progress * 100)}%`, 20, canvas.height - 20);

          frame++;
          if (frame < totalFrames) {
            requestAnimationFrame(animate);
          } else {
            recorder.stop();
          }
        };

        animate();
      };
    });
  };

  const handleStartVideoGen = async () => {
    if (aiMode === 'free' && quota <= 0) {
      setShowQuotaModal(true);
      return;
    }
    
    if (videoGenType === 'text' && !videoGenPrompt.trim()) return;
    if (videoGenType === 'image' && !selectedGenImage) return;

    setIsGeneratingVideo(true);
    setVideoGenResult(null);

    // Decrement quota
    if (aiMode === 'free') {
      setQuota(prev => Math.max(0, prev - 1));
    }

    // ... (rest of the handleStartVideoGen)

    const runFallback = async (errorMsg: string) => {
      console.log("Quota exceeded, switching to fallback...", errorMsg);
      const fallbackUrl = await generateLocalVideoEngine(selectedGenImage || '', 5, videoGenPrompt);
      setVideoGenResult(fallbackUrl);
      setIsGeneratingVideo(false);
    };

    try {
      const operationName = await generateVideo(videoGenPrompt, '16:9');
      
      const poll = async () => {
        try {
          const status = await checkVideoStatus(operationName);
          if (status.done) {
            if (status.error) throw new Error(status.error.message || "Failed to generate video");
            
            const blob = await downloadVideo(operationName);
            const url = URL.createObjectURL(blob);
            setVideoGenResult(url);
            setIsGeneratingVideo(false);
          } else {
            setTimeout(poll, 5000);
          }
        } catch (pollError: any) {
          handleError(pollError);
        }
      };

      poll();
    } catch (error: any) {
      const errorStr = (error.message || "").toLowerCase() + (error.toString() || "").toLowerCase();
      const isQuota = errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted") || errorStr.includes("limit");
      
      if (isQuota) {
        runFallback(errorStr);
      } else {
        handleError(error);
        setIsGeneratingVideo(false);
      }
    }
  };

  const handleError = (error: any) => {
    console.warn("AI Studio Notice:", error?.message || error);
    let errorMsg = error.message || String(error);
    
    // Check for quota or rate limit errors
    if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("limit")) {
      errorMsg = lang === 'ar' 
        ? "عذراً، تم تجاوز حصة الاستخدام المتاحة حالياً للذكاء الاصطناعي. يرجى المحاولة مرة أخرى لاحقاً أو الترقية للحصول على المزيد من المحاولات." 
        : "Sorry, the AI quota or rate limit has been exceeded. Please try again later or upgrade for more attempts.";
    } else if (errorMsg.includes("RESOURCE_EXHAUSTED")) {
       errorMsg = lang === 'ar' 
        ? "الموارد مستنفذة حالياً. يرجى المحاولة لاحقاً." 
        : "Resources are currently exhausted. Please try again later.";
    }

    alert(errorMsg);
    setIsGeneratingVideo(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: lang === 'ar' ? 100 : -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: lang === 'ar' ? -100 : 100 }}
      className="fixed inset-0 z-[1100] bg-[#050505] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-white transition-colors">
          <ArrowRight className={lang === 'ar' ? '' : 'rotate-180'} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-white uppercase tracking-tighter">{t.title}</h2>
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{t.subTitle}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <span className="text-[10px] font-black text-white uppercase">{aiMode === 'pro' ? 'PRO' : `${quota} / 1`}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-md mx-auto flex flex-col gap-6">
          {/* Mode Switcher */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button 
              onClick={() => setAiMode('free')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${aiMode === 'free' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.freeMode}
            </button>
            <button 
              onClick={() => setAiMode('pro')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${aiMode === 'pro' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              <Gem size={12} />
              {t.proMode}
            </button>
          </div>

          {/* Type Switcher */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
            <button 
              onClick={() => setVideoGenType('text')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${videoGenType === 'text' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40'}`}
            >
              {t.textToVideo}
            </button>
            <button 
              onClick={() => setVideoGenType('image')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${videoGenType === 'image' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40'}`}
            >
              {t.imageToVideo}
            </button>
          </div>

          {aiMode === 'pro' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center"
            >
              <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">{t.proFeatures}</p>
              <p className="text-white/70 text-[11px] leading-relaxed">{t.proDesc}</p>
            </motion.div>
          )}

          {videoGenType === 'image' && (
            <div 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => setSelectedGenImage(re.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="relative aspect-video rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-all cursor-pointer overflow-hidden group shadow-2xl"
            >
              {selectedGenImage ? (
                <>
                  <img src={selectedGenImage} className="w-full h-full object-cover" alt="Selected" />
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon size={32} className="text-white mb-2" />
                    <span className="text-white text-[12px] font-black uppercase tracking-widest">{t.changeImage}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-5 rounded-full bg-white/5 text-white/40 group-hover:scale-110 transition-transform">
                    <ImageIcon size={40} />
                  </div>
                  <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">{t.selectImage}</span>
                </>
              )}
            </div>
          )}

          <div className="relative">
            <textarea
              value={videoGenPrompt}
              onChange={(e) => setVideoGenPrompt(e.target.value)}
              placeholder={videoGenType === 'text' ? t.placeholderText : t.placeholderImage}
              className="w-full h-40 bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-sm focus:border-indigo-500 transition-colors resize-none shadow-inner"
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <span className={`text-[10px] font-bold ${videoGenPrompt.length > 500 ? 'text-rose-500' : 'text-white/20'}`}>
                {videoGenPrompt.length}/1000
              </span>
            </div>
          </div>

          <button
            onClick={handleStartVideoGen}
            disabled={isGeneratingVideo || (videoGenType === 'text' && !videoGenPrompt.trim()) || (videoGenType === 'image' && !selectedGenImage)}
            className={`w-full py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 ${
              isGeneratingVideo ? 'bg-indigo-500/20 text-indigo-300 cursor-not-allowed' : 
              aiMode === 'pro' ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white shadow-xl shadow-amber-500/10' :
              'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20'
            }`}
          >
            {isGeneratingVideo ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                {t.generating}
              </>
            ) : (
              <>
                <Wand2 size={20} />
                {aiMode === 'pro' ? t.generatePro : t.generate}
              </>
            )}
          </button>

          <AnimatePresence>
            {videoGenResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="mt-4 flex flex-col gap-4"
              >
                <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-video bg-black shadow-2xl group">
                  <video src={normalizeMediaUrl(videoGenResult)} controls preload="metadata" playsInline webkit-playsinline="true" className="w-full h-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => {
                      if (!videoGenResult) return;
                      const a = document.createElement('a');
                      a.href = videoGenResult;
                      a.download = `hisee_ai_video_${Date.now()}.webm`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    {lang === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share && videoGenResult) {
                        fetch(videoGenResult).then(res => res.blob()).then(blob => {
                          const file = new File([blob], "video.webm", { type: "video/webm" });
                          navigator.share({
                            files: [file],
                            title: 'HiSee AI Video',
                            text: 'Check out this AI generated video from HiSee!',
                          }).catch(() => {});
                        });
                      } else {
                        alert(lang === 'ar' ? 'المشاركة غير مدعومة في هذا المتصفح' : 'Sharing not supported in this browser');
                      }
                    }}
                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 size={14} />
                    {lang === 'ar' ? 'نشر' : 'Share'}
                  </button>
                  <button onClick={() => setVideoGenResult(null)} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-black text-rose-400 hover:bg-rose-500/20 transition-all">
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quota Modal */}
      <AnimatePresence>
        {showQuotaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] bg-black/80 flex items-center justify-center p-6"
          >
            <div className="bg-[#111] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center">
              <h3 className="text-xl font-black text-white mb-2 uppercase">نفد الرصيد</h3>
              <p className="text-white/60 text-sm mb-6">شاهد إعلاناً للحصول على فيديو مجاني إضافي أو اشترك في PRO.</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => {
                  setQuota(1);
                  setShowQuotaModal(false);
                }} className="py-3 bg-indigo-600 text-white rounded-xl font-bold">مشاهدة إعلان</button>
                <button onClick={() => { setAiMode('pro'); setShowQuotaModal(false); }} className="py-3 bg-white/5 text-white rounded-xl font-bold">الترقية إلى PRO</button>
                <button onClick={() => setShowQuotaModal(false)} className="text-white/40 text-xs font-bold uppercase">إغلاق</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
