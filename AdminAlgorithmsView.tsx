import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Rocket, Radio, Gift, Check, RefreshCcw, Save, 
  Plus, Trash2, AlertTriangle, Sparkles, Cpu, Zap, Activity, 
  ChevronLeft, Info, CheckCircle2, RotateCcw, Sliders,
  Database, Wifi
} from 'lucide-react';
import { 
  getAppConfig, 
  updateAppConfig, 
  subscribeAppConfig,
  CentralAppConfig, 
  DEFAULT_APP_CONFIG 
} from '../services/appConfig';

interface AdminAlgorithmsViewProps {
  onBack?: () => void;
  adminId?: string;
}

type AlgorithmTab = 'protection' | 'recommendation' | 'live' | 'combo';

export const AdminAlgorithmsView: React.FC<AdminAlgorithmsViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AlgorithmTab>('protection');
  const [config, setConfig] = useState<CentralAppConfig>(getAppConfig());
  const [newBannedWord, setNewBannedWord] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  // Real-time Subscription to Configuration Updates (OnSnapshot Listener)
  useEffect(() => {
    const unsubscribe = subscribeAppConfig((newConfig) => {
      setConfig(newConfig);
      setLastSyncedAt(new Date());
    });
    return () => unsubscribe();
  }, []);

  const handleUpdate = <K extends keyof CentralAppConfig>(
    section: K, 
    key: keyof CentralAppConfig[K], 
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const handleAddBannedWord = () => {
    const trimmed = newBannedWord.trim();
    if (!trimmed) return;
    if (config.protection.bannedWords.includes(trimmed)) {
      setNewBannedWord('');
      return;
    }
    const updatedWords = [...config.protection.bannedWords, trimmed];
    handleUpdate('protection', 'bannedWords', updatedWords);
    setNewBannedWord('');
  };

  const handleRemoveBannedWord = (wordToRemove: string) => {
    const updatedWords = config.protection.bannedWords.filter(w => w !== wordToRemove);
    handleUpdate('protection', 'bannedWords', updatedWords);
  };

  // Save to Firestore: settings/appConfig
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await updateAppConfig(config);
      setSavedSuccess(true);
      setHasChanges(false);
      setLastSyncedAt(new Date());
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (error) {
      console.error('Failed to save algorithm settings to Firestore:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات في Firestore، يرجى التحقق من اتصال الشبكة.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (confirm('هل ترغب بالتأكيد في استعادة كافة معايير الخوارزميات إلى القيم الافتراضية الموصى بها؟')) {
      setConfig(DEFAULT_APP_CONFIG);
      setHasChanges(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-slate-950 select-none" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-amber-500/20 shadow-2xl">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all hover:scale-105 active:scale-95"
                title="الرجوع"
              >
                <ChevronLeft size={22} className="rotate-180" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Cpu size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  إدارة الخوارزميات الذكية
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-black tracking-wider font-mono">
                  FIRESTORE LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                التحكم المباشر في أوزان التوصية، حماية المحتوى، ترتيب البثوث المباشرة، ومضاعفات الكومبو
              </p>
            </div>
          </div>

          {/* Quick Engine Status Indicator & Firestore Sync Info */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>مزامنة سحابية: settings/appConfig</span>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
                <AlertTriangle size={14} />
                <span>تعديلات غير محفوظة</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Main Tabs Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
          
          {/* Tab 1: Protection */}
          <button
            onClick={() => setActiveTab('protection')}
            className={`flex items-center justify-center gap-2.5 py-3.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'protection'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-lg shadow-rose-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield size={18} className={activeTab === 'protection' ? 'text-slate-950' : 'text-rose-400'} />
            <span>🛡️ الحماية والأمان</span>
          </button>

          {/* Tab 2: Recommendation */}
          <button
            onClick={() => setActiveTab('recommendation')}
            className={`flex items-center justify-center gap-2.5 py-3.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'recommendation'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Rocket size={18} className={activeTab === 'recommendation' ? 'text-slate-950' : 'text-amber-400'} />
            <span>🚀 التوصية والمحتوى</span>
          </button>

          {/* Tab 3: Live Streams */}
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center justify-center gap-2.5 py-3.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio size={18} className={activeTab === 'live' ? 'text-slate-950' : 'text-emerald-400'} />
            <span>🎥 البث المباشر</span>
          </button>

          {/* Tab 4: Gifts & Combo */}
          <button
            onClick={() => setActiveTab('combo')}
            className={`flex items-center justify-center gap-2.5 py-3.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'combo'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-slate-950 shadow-lg shadow-purple-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gift size={18} className={activeTab === 'combo' ? 'text-slate-950' : 'text-purple-400'} />
            <span>🎁 الهدايا والكومبو</span>
          </button>

        </div>

        {/* Tab Content Panes */}
        <div className="glass p-6 sm:p-8 rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl space-y-6">

          {/* ========================================================= */}
          {/* TAB 1: PROTECTION & SECURITY (الحماية والأمان) */}
          {/* ========================================================= */}
          {activeTab === 'protection' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Shield className="text-rose-400" size={22} />
                    خوارزميات مكافحة السبام والأمان (Protection Engine)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    تتحكم في وتيرة إرسال التعليقات، الفلترة الذكية للألفاظ والروابط، وضمان استقرار المجتمع
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5">
                  <span className="text-xs font-bold text-slate-300">مكافحة السبام:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdate('protection', 'isAntiSpamEnabled', !config.protection.isAntiSpamEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.protection.isAntiSpamEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 right-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        config.protection.isAntiSpamEnabled ? 'translate-x-0' : '-translate-x-6'
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-black ${config.protection.isAntiSpamEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {config.protection.isAntiSpamEnabled ? 'مفعل' : 'معطل'}
                  </span>
                </div>
              </div>

              {/* Grid of Protection Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Max Comments Limit */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">
                      الحد الأقصى للتعليقات المسموحة (maxCommentsLimit)
                    </label>
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg">
                      {config.protection.maxCommentsLimit} تعليقات
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.protection.maxCommentsLimit}
                    onChange={(e) => handleUpdate('protection', 'maxCommentsLimit', Number(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-amber-500 outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500">
                    أقصى عدد رسائل أو تعليقات يسمح بها للمستخدم خلال النافذة الزمنية المحددة.
                  </p>
                </div>

                {/* Window Duration (ms) */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">
                      النافذة الزمنية للتقييد (windowMs)
                    </label>
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg">
                      {config.protection.windowMs} ms ({(config.protection.windowMs / 1000).toFixed(1)} ثانية)
                    </span>
                  </div>
                  <input
                    type="number"
                    min="500"
                    max="30000"
                    step="500"
                    value={config.protection.windowMs}
                    onChange={(e) => handleUpdate('protection', 'windowMs', Number(e.target.value) || 1000)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-amber-500 outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500">
                    المدة الزمنية بالميللي ثانية التي يتم خلالها احتساب محاولات الإرسال المتتالية.
                  </p>
                </div>

              </div>

              {/* Banned Words Management */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-rose-400" />
                    قائمة الكلمات والعبارات المحظورة تلقائياً (bannedWords)
                  </label>
                  <span className="text-xs text-slate-500 font-bold">
                    إجمالي الكلمات: {config.protection.bannedWords.length}
                  </span>
                </div>

                {/* Input to add word */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBannedWord}
                    onChange={(e) => setNewBannedWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBannedWord();
                      }
                    }}
                    placeholder="اكتب كلمة أو عبارة محظورة ثم اضغط إضافة..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs placeholder:text-slate-600 focus:border-rose-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddBannedWord}
                    className="px-5 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={16} />
                    <span>إضافة كلمة</span>
                  </button>
                </div>

                {/* Chips of Banned Words */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {config.protection.bannedWords.map((word) => (
                    <span 
                      key={word}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium group transition-all hover:bg-rose-500/20"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBannedWord(word)}
                        className="text-rose-400/60 hover:text-rose-300 p-0.5 rounded transition-colors"
                        title="حذف الكلمة"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: RECOMMENDATION & CONTENT (التوصية والمحتوى) */}
          {/* ========================================================= */}
          {activeTab === 'recommendation' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Rocket className="text-amber-400" size={22} />
                    خوارزميات التوصية والموجز الذكي (Recommendation Engine)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    تحدد معادلات ترشيح الفيديوهات، أوزان التفاعل، نسبة الإكمال، والانطلاقة الباردة للمبدعين الجدد
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5">
                  <span className="text-xs font-bold text-slate-300">دعم المبدعين الجدد:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdate('recommendation', 'enableColdStartBoost', !config.recommendation.enableColdStartBoost)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      config.recommendation.enableColdStartBoost ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 right-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        config.recommendation.enableColdStartBoost ? 'translate-x-0' : '-translate-x-6'
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-black ${config.recommendation.enableColdStartBoost ? 'text-amber-400' : 'text-slate-500'}`}>
                    {config.recommendation.enableColdStartBoost ? 'مفعل' : 'معطل'}
                  </span>
                </div>
              </div>

              {/* Grid of Weights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Watch Time / Completion Weight */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">وزن نسبة الإكمال</label>
                    <span className="text-xs font-mono font-black text-amber-400">{config.recommendation.watchTimeWeight}x</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={config.recommendation.watchTimeWeight}
                    onChange={(e) => handleUpdate('recommendation', 'watchTimeWeight', Number(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono focus:border-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">مضاعف نقاط نسبة المشاهدة من إجمالي الفيديو</p>
                </div>

                {/* Likes Weight */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">وزن الإعجابات (Likes)</label>
                    <span className="text-xs font-mono font-black text-amber-400">{config.recommendation.likesWeight}x</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={config.recommendation.likesWeight}
                    onChange={(e) => handleUpdate('recommendation', 'likesWeight', Number(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono focus:border-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">النقاط المكتسبة لكل إعجاب بالفيديو</p>
                </div>

                {/* Comments Weight */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">وزن التعليقات (Comments)</label>
                    <span className="text-xs font-mono font-black text-amber-400">{config.recommendation.commentsWeight}x</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={config.recommendation.commentsWeight}
                    onChange={(e) => handleUpdate('recommendation', 'commentsWeight', Number(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono focus:border-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">النقاط المكتسبة لكل تعليق نشط</p>
                </div>

                {/* Shares Weight */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">وزن المشاركات (Shares)</label>
                    <span className="text-xs font-mono font-black text-amber-400">{config.recommendation.sharesWeight}x</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={config.recommendation.sharesWeight}
                    onChange={(e) => handleUpdate('recommendation', 'sharesWeight', Number(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono focus:border-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">النقاط المكتسبة لكل مشاركة خارجية</p>
                </div>

                {/* Skip Penalty */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">عقوبة التخطي الفوري</label>
                    <span className="text-xs font-mono font-black text-rose-400">-{config.recommendation.skipPenalty} pts</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.recommendation.skipPenalty}
                    onChange={(e) => handleUpdate('recommendation', 'skipPenalty', Number(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono focus:border-rose-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">خصم النقاط عند تخطي الفيديو في أقل من 1.5 ثانية</p>
                </div>

                {/* Cold Start Bonus */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">دفعة المبدع الجديد (Bonus)</label>
                    <span className="text-xs font-mono font-black text-emerald-400">+{config.recommendation.coldStartBonus} pts</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.recommendation.coldStartBonus}
                    onChange={(e) => handleUpdate('recommendation', 'coldStartBonus', Number(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-sm font-mono focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">نقاط ترشيح إضافية للمبدعين أصحاب أقل من 5 فيديوهات</p>
                </div>

              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: LIVE STREAMS RANKING (البث المباشر) */}
          {/* ========================================================= */}
          {activeTab === 'live' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Radio className="text-emerald-400" size={22} />
                  خوارزميات ترتيب وتصنيف البث المباشر (Live Ranking Engine)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  تحدد سرعة تصاعد البث النشط لحظياً (Live Velocity) وجودة الشبكة ومعدل الإطارات (Stream Health)
                </p>
              </div>

              {/* Grid of Live Weights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Gifts Weight */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">وزن الهدايا اللحظية</label>
                    <span className="text-xs font-mono font-black text-emerald-400">{config.liveRanking.giftsWeight}x</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.liveRanking.giftsWeight}
                    onChange={(e) => handleUpdate('liveRanking', 'giftsWeight', Number(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">مضاعف سرعة التفاعل للهدايا المرسلة في آخر 5 دقائق</p>
                </div>

                {/* Comments Weight */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">وزن تعليقات البث</label>
                    <span className="text-xs font-mono font-black text-emerald-400">{config.liveRanking.commentsWeight}x</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.liveRanking.commentsWeight}
                    onChange={(e) => handleUpdate('liveRanking', 'commentsWeight', Number(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">مضاعف سرعة التفاعل للدردشة اللحظية في البث</p>
                </div>

                {/* Viewers Weight */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">وزن المشاهدين المتواجدين</label>
                    <span className="text-xs font-mono font-black text-emerald-400">{config.liveRanking.viewersWeight}x</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.liveRanking.viewersWeight}
                    onChange={(e) => handleUpdate('liveRanking', 'viewersWeight', Number(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">مضاعف الحضور الحي للمشاهدين</p>
                </div>

                {/* Packet Loss Threshold */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">حد ضياع الحزم (Packet Loss)</label>
                    <span className="text-xs font-mono font-black text-amber-400">{(config.liveRanking.packetLossThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.5"
                    value={config.liveRanking.packetLossThreshold}
                    onChange={(e) => handleUpdate('liveRanking', 'packetLossThreshold', Number(e.target.value) || 0.05)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-amber-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">إذا تجاوز ضياع الحزم هذه النسبة يتم تطبيق عقوبة جودة الاتصال</p>
                </div>

                {/* Min FPS Threshold */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">الحد الأدنى للإطارات (Min FPS)</label>
                    <span className="text-xs font-mono font-black text-amber-400">{config.liveRanking.fpsThreshold} FPS</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={config.liveRanking.fpsThreshold}
                    onChange={(e) => handleUpdate('liveRanking', 'fpsThreshold', Number(e.target.value) || 15)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-amber-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">معدل الإطارات الذي إذا هبط البث تحته يتم خفض أولوية ظهوره</p>
                </div>

              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: GIFTS & COMBO (الهدايا والكومبو) */}
          {/* ========================================================= */}
          {activeTab === 'combo' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Gift className="text-purple-400" size={22} />
                  خوارزميات السلسلة المترادفة ومضاعف الهدايا (Combo Multiplier Engine)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  تحدد مدة مهلة الكومبو ومستويات المضاعفة (X1.5, X2, X3) لتحفيز الدعم والتفاعل في البثوث
                </p>
              </div>

              {/* Grid of Combo Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Combo Timeout */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">مهلة استمرار الكومبو (Timeout)</label>
                    <span className="text-xs font-mono font-black text-purple-400">
                      {config.combo.comboTimeoutMs} ms ({(config.combo.comboTimeoutMs / 1000).toFixed(1)}s)
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1000"
                    max="10000"
                    step="500"
                    value={config.combo.comboTimeoutMs}
                    onChange={(e) => handleUpdate('combo', 'comboTimeoutMs', Number(e.target.value) || 3000)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-purple-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">الفارق الزمني الأقصى بين هديتين متتاليتين لاحتساب الكومبو</p>
                </div>

                {/* FX Trigger Interval */}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">معدل تشغيل المؤثرات البصرية (FX Interval)</label>
                    <span className="text-xs font-mono font-black text-purple-400">كل {config.combo.fxInterval} هدايا</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.combo.fxInterval}
                    onChange={(e) => handleUpdate('combo', 'fxInterval', Number(e.target.value) || 5)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:border-purple-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">إطلاق وميض واحتفالات بصرية كل عدد معين من الضربات المتتالية</p>
                </div>

              </div>

              {/* Multiplier Tiers */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-bold text-slate-300">مستويات المضاعفة المتتالية (Multiplier Tiers)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Tier 1 */}
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-purple-300">المستوى الأول (Tier 1)</span>
                      <span className="text-xs font-mono font-black text-purple-400">X{config.combo.tier1Multiplier}</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">الحد الأدنى للهدايا المتتالية:</label>
                      <input
                        type="number"
                        min="2"
                        value={config.combo.tier1Threshold}
                        onChange={(e) => handleUpdate('combo', 'tier1Threshold', Number(e.target.value) || 2)}
                        className="w-full bg-black/50 border border-purple-500/30 rounded-lg p-2 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">معامل المضاعفة (Multiplier):</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={config.combo.tier1Multiplier}
                        onChange={(e) => handleUpdate('combo', 'tier1Multiplier', Number(e.target.value) || 1.5)}
                        className="w-full bg-black/50 border border-purple-500/30 rounded-lg p-2 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-pink-300">المستوى الثاني (Tier 2)</span>
                      <span className="text-xs font-mono font-black text-pink-400">X{config.combo.tier2Multiplier}</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">الحد الأدنى للهدايا المتتالية:</label>
                      <input
                        type="number"
                        min="3"
                        value={config.combo.tier2Threshold}
                        onChange={(e) => handleUpdate('combo', 'tier2Threshold', Number(e.target.value) || 5)}
                        className="w-full bg-black/50 border border-pink-500/30 rounded-lg p-2 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">معامل المضاعفة (Multiplier):</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={config.combo.tier2Multiplier}
                        onChange={(e) => handleUpdate('combo', 'tier2Multiplier', Number(e.target.value) || 2.0)}
                        className="w-full bg-black/50 border border-pink-500/30 rounded-lg p-2 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-amber-300">المستوى الثالث (Tier 3)</span>
                      <span className="text-xs font-mono font-black text-amber-400">X{config.combo.tier3Multiplier}</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">الحد الأدنى للهدايا المتتالية:</label>
                      <input
                        type="number"
                        min="5"
                        value={config.combo.tier3Threshold}
                        onChange={(e) => handleUpdate('combo', 'tier3Threshold', Number(e.target.value) || 10)}
                        className="w-full bg-black/50 border border-amber-500/30 rounded-lg p-2 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">معامل المضاعفة (Multiplier):</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={config.combo.tier3Multiplier}
                        onChange={(e) => handleUpdate('combo', 'tier3Multiplier', Number(e.target.value) || 3.0)}
                        className="w-full bg-black/50 border border-amber-500/30 rounded-lg p-2 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Bottom Unified Action Bar */}
        <div className="p-5 rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-4 sticky bottom-4 z-40">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <RotateCcw size={16} />
              <span>استعادة الإعدادات الافتراضية</span>
            </button>
            {savedSuccess && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20"
              >
                <CheckCircle2 size={16} />
                <span>تم الحفظ والمزامنة مع Firestore (settings/appConfig) بنجاح!</span>
              </motion.div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCcw size={18} className="animate-spin" />
                <span>جاري الحفظ في Firestore...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>حفظ وتطبيق التغييرات سحابياً</span>
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};

export default AdminAlgorithmsView;
