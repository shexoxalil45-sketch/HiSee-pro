import React, { useState, useEffect } from 'react';
import { Sparkles, Wand2, Eraser, Sliders, Image as ImageIcon, Upload, X, Loader2, AlertCircle, CheckCircle2, Crown, Zap, Check, ShieldCheck, Download, Send, RotateCcw } from 'lucide-react';

interface AIImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendImage: (imageUrl: string) => void;
    currentUserId?: string;
}

export type AIMode = 'generate' | 'edit' | 'remove_object' | 'enhance';

const FREE_DAILY_LIMIT = 5;

export const AIImageModal: React.FC<AIImageModalProps> = ({
    isOpen,
    onClose,
    onSendImage,
    currentUserId = 'guest'
}) => {
    const [mode, setMode] = useState<AIMode>('generate');
    const [prompt, setPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageMime, setSelectedImageMime] = useState<string>('image/png');
    const [generatedResultUrl, setGeneratedResultUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usedQuota, setUsedQuota] = useState<number>(0);
    const [isProPlan, setIsProPlan] = useState<boolean>(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
    const [upgradeSuccess, setUpgradeSuccess] = useState<boolean>(false);

    // Keys for localStorage daily quota and plan status
    const quotaKey = `ai_image_quota_${currentUserId}`;
    const planKey = `ai_user_plan_${currentUserId}`;

    useEffect(() => {
        if (!isOpen) return;
        const today = new Date().toISOString().split('T')[0];
        try {
            // Check plan status
            const savedPlan = localStorage.getItem(planKey);
            setIsProPlan(savedPlan === 'pro');

            // Check quota
            const stored = localStorage.getItem(quotaKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.date === today) {
                    setUsedQuota(parsed.count || 0);
                } else {
                    localStorage.setItem(quotaKey, JSON.stringify({ date: today, count: 0 }));
                    setUsedQuota(0);
                }
            } else {
                localStorage.setItem(quotaKey, JSON.stringify({ date: today, count: 0 }));
                setUsedQuota(0);
            }
        } catch (e) {
            setUsedQuota(0);
        }
    }, [isOpen, quotaKey, planKey]);

    if (!isOpen) return null;

    const remainingQuota = isProPlan ? 999 : Math.max(0, FREE_DAILY_LIMIT - usedQuota);

    const handleResetAll = () => {
        setPrompt('');
        setSelectedImage(null);
        setGeneratedResultUrl(null);
        setError(null);
    };

    const handleActivatePro = (planType: string) => {
        localStorage.setItem(planKey, 'pro');
        setIsProPlan(true);
        setUpgradeSuccess(true);
        setError(null);
        setTimeout(() => {
            setUpgradeSuccess(false);
            setShowUpgradeModal(false);
        }, 1800);
    };

    const handleDowngradeToFree = () => {
        localStorage.setItem(planKey, 'free');
        setIsProPlan(false);
        setShowUpgradeModal(false);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImageMime(file.type || 'image/png');
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSelectedImage(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        // Validation per mode - prompt required strictly for all modes
        if (!prompt.trim()) {
            if (mode === 'generate') setError("يرجى إدخال وصف نصي دقيق للصورة المراد توليدها.");
            else if (mode === 'edit') setError("يرجى إدخال الوصف النصي للتعديلات المطلوبة على الصورة.");
            else if (mode === 'remove_object') setError("يرجى تحديد اسم الكائن أو الشخص المراد إزالته من الصورة.");
            else if (mode === 'enhance') setError("يرجى إدخال الوصف النصي للنمط أو التحسين المطلوب تطبيقه.");
            return;
        }

        if ((mode === 'edit' || mode === 'remove_object' || mode === 'enhance') && !selectedImage) {
            setError("يرجى إرفاق صورة أولاً لتطبيق هذه المعالجة عليها.");
            return;
        }

        if (!isProPlan && remainingQuota <= 0) {
            setError("لقد استنفدت حصتك اليومية المجانية (5 صور يومياً). اشترك في الخطة المدفوعة للحصول على توليد غير محدود!");
            setShowUpgradeModal(true);
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedResultUrl(null);

        try {
            const res = await fetch('/api/generate-ai-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    prompt: prompt.trim(),
                    imageBase64: selectedImage,
                    mimeType: selectedImageMime,
                    aspectRatio: "1:1"
                })
            });

            let data: any = {};
            const textResponse = await res.text();
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                console.error("Non-JSON response received:", textResponse.substring(0, 200));
                throw new Error("حدث خطأ في الاستجابة من السيرفر. يرجى إعادة المحاولة.");
            }

            if (!res.ok || data.error) {
                throw new Error(data.error || "فشل معالجة الصورة بواسطة الذكاء الاصطناعي");
            }

            if (data.imageUrl) {
                // Update quota in localStorage if free plan
                if (!isProPlan) {
                    const today = new Date().toISOString().split('T')[0];
                    const newCount = usedQuota + 1;
                    localStorage.setItem(quotaKey, JSON.stringify({ date: today, count: newCount }));
                    setUsedQuota(newCount);
                }

                // Set generated result image
                setGeneratedResultUrl(data.imageUrl);
            } else {
                throw new Error("لم يتم استلام رابط الصورة المتولدة");
            }
        } catch (err: any) {
            console.warn("AI Image Generation Notice:", err?.message || err);
            setError(err.message || "حدث خطأ أثناء معالجة الصورة بالذكاء الاصطناعي. يرجى المحاولة لاحقاً.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendToChat = () => {
        if (generatedResultUrl) {
            onSendImage(generatedResultUrl);
            handleResetAll();
            onClose();
        }
    };

    const handleDownloadImage = () => {
        if (!generatedResultUrl) return;
        const link = document.createElement('a');
        link.href = generatedResultUrl;
        link.download = `ai_generated_image_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const modeTabs = [
        { id: 'generate', label: 'توليد', icon: Sparkles, desc: 'إنشاء صورة جديدة من النص' },
        { id: 'edit', label: 'تعديل', icon: Wand2, desc: 'تعديل صورة مرفقة بنص' },
        { id: 'remove_object', label: 'إزالة كائن', icon: Eraser, desc: 'إزالة عنصر أو شخص من الصورة' },
        { id: 'enhance', label: 'تحسين وتغيير', icon: Sliders, desc: 'تحسين الجودة وتغيير النمط' },
    ];

    const getPromptLabel = () => {
        switch (mode) {
            case 'generate':
                return 'وصف الصورة المراد إنشاؤها';
            case 'edit':
                return 'التعديلات المطلوبة على الصورة المرفقة';
            case 'remove_object':
                return 'اسم الكائن أو الشخص المراد إزالته';
            case 'enhance':
                return 'نمط التحسين أو التغيير المطلوب';
        }
    };

    const getPromptPlaceholder = () => {
        switch (mode) {
            case 'generate':
                return 'مثال: رائد فضاء يركب خيلاً على سطح المريخ، بطراز فن المانجا العالي...';
            case 'edit':
                return 'مثال: غير خلفية الصورة إلى شاطئ غروب الشمس، وأضف نظارات شمسية...';
            case 'remove_object':
                return 'مثال: قم بإزالة الشخص المقفز في الخلفية أو الشجرة على اليسار...';
            case 'enhance':
                return 'مثال: تحسين الإضاءة والوضوح، تحويل الصورة إلى نمط سينمائي دافئ...';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200" dir="rtl">
            <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">أدوات الذكاء الاصطناعي للصور</h3>
                            <p className="text-[11px] text-slate-400">توليد، تعديل، إزالة كائنات وتحسين جودة الصور</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => { handleResetAll(); onClose(); }}
                        disabled={isGenerating}
                        className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 4 Mode Tabs Header */}
                <div className="p-3 bg-slate-900/80 border-b border-white/5 grid grid-cols-4 gap-1.5 shrink-0">
                    {modeTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = mode === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setMode(tab.id as AIMode);
                                    setError(null);
                                    setGeneratedResultUrl(null);
                                }}
                                disabled={isGenerating}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                                    isActive
                                        ? 'bg-gradient-to-r from-purple-600 to-emerald-600 text-white shadow-md font-bold'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'animate-bounce' : ''} />
                                <span className="text-[10px] mt-1 whitespace-nowrap">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                    {/* Mode Hint */}
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center gap-2">
                        <Sparkles size={14} className="shrink-0 text-purple-400" />
                        <span>{modeTabs.find(t => t.id === mode)?.desc}</span>
                    </div>

                    {/* Quota & Pro Plan Banner */}
                    <div className="space-y-2">
                        {isProPlan ? (
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-between text-xs font-bold text-amber-300 shadow-lg">
                                <div className="flex items-center gap-2">
                                    <Crown size={18} className="text-amber-400 animate-bounce" />
                                    <div>
                                        <div className="flex items-center gap-1.5 text-white">
                                            <span>الخطة الاحترافية (AI Pro)</span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400 text-slate-950 font-black">نشط VIP</span>
                                        </div>
                                        <p className="text-[10px] text-amber-200/80 font-normal">توليد ومعالجة بلا حدود وبدقة عالية 4K</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] border border-amber-500/30 transition-colors shrink-0"
                                >
                                    إدارة الخطة
                                </button>
                            </div>
                        ) : (
                            <div className="p-3 rounded-2xl bg-slate-900 border border-purple-500/20 flex items-center justify-between text-xs font-bold transition-all">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                                        <Wand2 size={16} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-white">
                                            <span>حصة مجانية يومية:</span>
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 font-mono text-xs text-emerald-400">
                                                {remainingQuota} / {FREE_DAILY_LIMIT} صور متبقية
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-normal">تتجدد 5 صور مجاناً كل يوم تلقائياً</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Image Attachment (Required for edit, remove_object, enhance) */}
                    {mode !== 'generate' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                <span>الصورة المراد معالجتها <span className="text-rose-400">*</span></span>
                                {selectedImage && (
                                    <button 
                                        onClick={() => setSelectedImage(null)}
                                        className="text-rose-400 hover:text-rose-300 text-[11px] transition-colors"
                                    >
                                        إزالة الصورة
                                    </button>
                                )}
                            </label>

                            {selectedImage ? (
                                <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-slate-900 max-h-44 flex items-center justify-center p-2 group">
                                    <img 
                                        src={selectedImage} 
                                        alt="المرفقة للتعديل" 
                                        className="max-h-36 rounded-xl object-contain"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-purple-500/30 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition-colors text-slate-400 hover:text-white">
                                    <Upload size={22} className="text-purple-400" />
                                    <span className="text-xs font-bold text-purple-300">اضغط هنا لإرفاق الصورة من جهازك</span>
                                    <span className="text-[10px] text-slate-500">(مطلوبة لوضعية {modeTabs.find(t => t.id === mode)?.label})</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageChange}
                                        disabled={isGenerating}
                                        className="hidden" 
                                    />
                                </label>
                            )}
                        </div>
                    )}

                    {/* Prompt input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                            <span>{getPromptLabel()} <span className="text-rose-400">*</span></span>
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={getPromptPlaceholder()}
                            rows={3}
                            disabled={isGenerating}
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
                        />
                    </div>

                    {/* Optional Image Attachment for Generate Mode */}
                    {mode === 'generate' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                <span>إرفاق صورة استرشادية (اختياري)</span>
                                {selectedImage && (
                                    <button 
                                        onClick={() => setSelectedImage(null)}
                                        className="text-rose-400 hover:text-rose-300 text-[11px] transition-colors"
                                    >
                                        إزالة الصورة
                                    </button>
                                )}
                            </label>

                            {selectedImage ? (
                                <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-slate-900 max-h-32 flex items-center justify-center p-2 group">
                                    <img 
                                        src={selectedImage} 
                                        alt="صورة استرشادية" 
                                        className="max-h-28 rounded-xl object-contain"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-white/15 bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer transition-colors text-slate-400 hover:text-white">
                                    <Upload size={16} className="text-purple-400" />
                                    <span className="text-xs">إرفاق صورة كمرجع للتوليد (اختياري)</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageChange}
                                        disabled={isGenerating}
                                        className="hidden" 
                                    />
                                </label>
                            )}
                        </div>
                    )}

                    {/* MAIN GENERATE BUTTON (Moved above plan box) */}
                    <div className="pt-1">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim() || ((mode === 'edit' || mode === 'remove_object' || mode === 'enhance') && !selectedImage) || (!isProPlan && remainingQuota <= 0)}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 text-white font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>جاري التوليد والمعالجة...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    <span>توليد الصورة</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Generated Image Result Display & Action Buttons */}
                    {generatedResultUrl && (
                        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3 animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-white/10 pb-2">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={16} />
                                    <span>تم توليد الصورة بنجاح!</span>
                                </span>
                                <button 
                                    onClick={() => setGeneratedResultUrl(null)}
                                    className="text-slate-400 hover:text-slate-200 text-[11px]"
                                >
                                    إخفاء المعاينة
                                </button>
                            </div>

                            <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-2 max-h-64 border border-white/10">
                                <img 
                                    src={generatedResultUrl} 
                                    alt="الصورة المتولدة" 
                                    className="max-h-56 rounded-lg object-contain"
                                    referrerPolicy="no-referrer"
                                />
                            </div>

                            {/* Action Buttons: Send to Chat & Download */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    onClick={handleSendToChat}
                                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md"
                                >
                                    <Send size={15} />
                                    <span>إرسال إلى المحادثة</span>
                                </button>
                                <button
                                    onClick={handleDownloadImage}
                                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={15} />
                                    <span>تنزيل الصورة</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Paid Plan Subscription Card at the very bottom */}
                    {!isProPlan && (
                        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/20 flex items-center justify-between gap-2 shadow-md mt-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-purple-500 flex items-center justify-center text-slate-950 font-bold shrink-0">
                                    <Crown size={15} />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold text-white flex items-center gap-1">
                                        <span>الخطة المدفوعة الذكية (AI Pro)</span>
                                    </h4>
                                    <p className="text-[9px] text-slate-400">توليد غير محدود ودقة 4K فائقة</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-white font-bold text-[10px] hover:opacity-90 transition-all shadow-md flex items-center gap-1 shrink-0"
                            >
                                <Crown size={12} />
                                <span>ترقية ($9.99/ش)</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-white/10 bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
                    <button
                        onClick={() => { handleResetAll(); onClose(); }}
                        disabled={isGenerating}
                        className="py-2.5 px-5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
                    >
                        إغلاق
                    </button>
                    {generatedResultUrl ? (
                        <button
                            onClick={handleSendToChat}
                            className="py-2.5 px-5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all flex items-center gap-1.5 shadow-md"
                        >
                            <Send size={14} />
                            <span>إرسال الصورة الآن</span>
                        </button>
                    ) : (
                        <span className="text-[10px] text-slate-500 font-normal">اضغط توليد الصورة للبدء المعالجة</span>
                    )}
                </div>
            </div>

            {/* Paid Plan Subscription Modal Dialog */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 z-[110] animate-in fade-in" dir="rtl">
                    <div className="bg-[#0f172a] border border-amber-500/30 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-5 relative">
                        <button
                            onClick={() => setShowUpgradeModal(false)}
                            className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-amber-400 via-purple-500 to-emerald-500 flex items-center justify-center text-slate-950 mx-auto shadow-xl shadow-amber-500/20">
                                <Crown size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white">الخطة المدفوعة الاحترافية (AI Pro)</h3>
                            <p className="text-xs text-slate-300">استمتع بقدرات الذكاء الاصطناعي الكاملة دون أي قيود daily quotas</p>
                        </div>

                        {upgradeSuccess ? (
                            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center space-y-2 animate-in zoom-in-95">
                                <CheckCircle2 size={40} className="mx-auto text-emerald-400 animate-bounce" />
                                <h4 className="font-bold text-sm text-white">تم تفعيل الخطة الاحترافية بنجاح!</h4>
                                <p className="text-xs text-emerald-300">أصبحت حصتك الآن غير محدودة لجميع أدوات التوليد والتعديل.</p>
                            </div>
                        ) : (
                            <>
                                {/* Comparison plans */}
                                <div className="space-y-3">
                                    {/* Free Plan Card */}
                                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                                        !isProPlan ? 'bg-slate-800/80 border-purple-500/40 text-white' : 'bg-slate-900 border-white/10 text-slate-400'
                                    }`}>
                                        <div>
                                            <div className="font-bold">حصة مجانية يومية</div>
                                            <div className="text-[10px] opacity-75">5 صور يومياً تلقائياً</div>
                                        </div>
                                        <div className="font-bold text-slate-300">مجاناً</div>
                                    </div>

                                    {/* Pro Plan Card */}
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 via-amber-900/40 to-slate-900 border-2 border-amber-500/60 text-white space-y-3 relative overflow-hidden shadow-xl">
                                        <div className="absolute top-0 left-0 bg-amber-400 text-slate-950 text-[9px] font-black px-3 py-0.5 rounded-br-xl uppercase tracking-wider">
                                            موصى به
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-sm flex items-center gap-1.5">
                                                    <span>خطة AI Pro اللاإفراطية</span>
                                                    <Crown size={14} className="text-amber-400" />
                                                </div>
                                                <div className="text-[11px] text-amber-200/90">توليد وتعديل ومعالجة بلا حدود</div>
                                            </div>
                                            <div className="text-left">
                                                <span className="text-lg font-black text-amber-400">$9.99</span>
                                                <span className="text-[10px] text-slate-300 block">/شهرياً</span>
                                            </div>
                                        </div>

                                        <ul className="text-[11px] space-y-1.5 text-slate-200 border-t border-white/10 pt-2.5">
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-400 shrink-0" />
                                                <span>توليد ومعالجة غير محدودة 24/7</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-400 shrink-0" />
                                                <span>أولوية سرعة فائقة في الخوادم</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check size={14} className="text-emerald-400 shrink-0" />
                                                <span>دقة 4K عالية جداً لكل الأدوات</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-2">
                                    <button
                                        onClick={() => handleActivatePro('monthly')}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-emerald-600 text-white font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                                    >
                                        <ShieldCheck size={16} />
                                        <span>تفعيل اشتراك الخطة المدفوعة الآن</span>
                                    </button>

                                    {isProPlan && (
                                        <button
                                            onClick={handleDowngradeToFree}
                                            className="w-full py-2 text-slate-400 hover:text-slate-200 text-[11px] underline text-center"
                                        >
                                            التحويل إلى الحصة المجانية اليومية
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

