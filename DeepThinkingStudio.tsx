
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Brain, Gem, Loader2, Sparkles, 
  ArrowRight, Lightbulb, Zap, Send, History,
  MessageSquare, Terminal
} from 'lucide-react';
import { Language } from '../types';
import { generateThinkingResponse } from '../services/geminiService';

interface ThinkingEntry {
  prompt: string;
  response: string;
  timestamp: number;
}

interface DeepThinkingStudioProps {
  onBack: () => void;
  lang: Language;
}

export const DeepThinkingStudio: React.FC<DeepThinkingStudioProps> = ({ onBack, lang }) => {
  const [aiMode, setAiMode] = useState<'free' | 'pro'>('free');
  const [thinkingPrompt, setThinkingPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState<ThinkingEntry[]>([]);

  const t = {
    ar: {
      title: 'مركز التفكير الفائق',
      subTitle: 'تحليل إبداعي ومنطقي لا حدود له',
      freeMode: 'تفكير مجاني',
      proMode: 'تفكير عميق (PRO)',
      proFeatures: 'مميزات التفكير الاحترافي',
      proDesc: 'تحليل بيانات ضخم، استنتاجات منطقية غير محدودة، ودعم اللغات المعقدة بدقة عالية.',
      placeholder: 'اطرح سؤالاً معقداً للتفكير فيه بعمق...',
      analyze: 'بدء التحليل العميق',
      analyzePro: 'بدء التحليل الاحترافي',
      thinking: 'جاري التفكير بعمق...',
      aiAnalysis: 'تحليل الذكاء الاصطناعي',
      done: 'فهمت',
      back: 'رجوع'
    },
    en: {
      title: 'Deep Thinking Center',
      subTitle: 'Unlimited creative and logical analysis',
      freeMode: 'Free Thinking',
      proMode: 'Deep Thinking (PRO)',
      proFeatures: 'Pro Thinking Features',
      proDesc: 'Large data analysis, unlimited logical conclusions, and high-precision support for complex languages.',
      placeholder: 'Ask a complex question for deep thinking...',
      analyze: 'Analyze Deeply',
      analyzePro: 'Start Pro Analysis',
      thinking: 'Thinking deeply...',
      aiAnalysis: 'AI Analysis',
      done: 'Got it',
      back: 'Back'
    }
  }[lang === 'ar' ? 'ar' : 'en'];

  const handleStartThinking = async () => {
    if (!thinkingPrompt.trim()) return;
    setIsThinking(true);
    
    try {
      // Prepare history for the API - Limit to last 4 entries to save tokens (thinking mode uses more)
      const recentHistory = history.slice(0, 4);
      const apiHistory = recentHistory.slice().reverse().flatMap(entry => [
        { role: 'user', parts: [{ text: entry.prompt }] },
        { role: 'model', parts: [{ text: entry.response }] }
      ]);
      
      // Append current prompt
      apiHistory.push({ role: 'user', parts: [{ text: thinkingPrompt }] });

      const result = await generateThinkingResponse(thinkingPrompt, apiHistory);
      const newEntry: ThinkingEntry = {
        prompt: thinkingPrompt,
        response: result,
        timestamp: Date.now()
      };
      setHistory(prev => [newEntry, ...prev]);
      setThinkingPrompt('');
    } catch (error: any) {
      console.warn("AI Studio Notice:", error?.message || error);
      const errorStr = JSON.stringify(error).toLowerCase() + (error.message || "").toLowerCase();
      let errorMsg = error.message || String(error);
      
      if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted") || errorStr.includes("limit")) {
        errorMsg = lang === 'ar' 
          ? "عذراً، تم تجاوز حصة التفكير العميق المتاحة حالياً. يرجى المحاولة بعد قليل أو الترقية لفتح المزيد من الإمكانيات." 
          : "Deep thinking quota exceeded. Please try again in a moment or upgrade for more capacity.";
      } else if (errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = lang === 'ar' 
          ? "الموارد مستنفذة حالياً. يرجى المحاولة لاحقاً." 
          : "Resources are currently exhausted. Please try again later.";
      }
      
      alert(errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[1100] bg-[#050505] flex flex-col"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-purple-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 relative z-10">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-white transition-colors">
          <ArrowRight className={lang === 'ar' ? '' : 'rotate-180'} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-white uppercase tracking-tighter">{t.title}</h2>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{t.subTitle}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
        <div className="max-w-md mx-auto flex flex-col gap-8">
          {/* Central Icon */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 animate-pulse" />
              <div className="relative w-20 h-20 rounded-[30px] bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl">
                <Brain size={40} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
            <button 
              onClick={() => setAiMode('free')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${aiMode === 'free' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.freeMode}
            </button>
            <button 
              onClick={() => setAiMode('pro')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${aiMode === 'pro' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              <Gem size={12} />
              {t.proMode}
            </button>
          </div>

          {aiMode === 'pro' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles size={14} className="text-emerald-400" />
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{t.proFeatures}</p>
              </div>
              <p className="text-white/70 text-[11px] leading-relaxed">{t.proDesc}</p>
            </motion.div>
          )}

          <div className="flex flex-col gap-4">
            <div className="relative group">
              <textarea
                value={thinkingPrompt}
                onChange={(e) => setThinkingPrompt(e.target.value)}
                placeholder={t.placeholder}
                className="w-full h-48 bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 text-white text-sm focus:border-purple-500 transition-all resize-none shadow-2xl focus:shadow-purple-500/10"
              />
              <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1 bg-[#151515] border border-white/10 rounded-full">
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Input Stream</span>
              </div>
            </div>

            <button
              onClick={handleStartThinking}
              disabled={isThinking || !thinkingPrompt.trim()}
              className={`w-full py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 ${
                isThinking ? 'bg-purple-500/20 text-purple-300 cursor-not-allowed' : 
                aiMode === 'pro' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white shadow-xl' :
                'bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-500/20'
              }`}
            >
              {isThinking ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t.thinking}
                </>
              ) : (
                <>
                  <Zap size={20} className="fill-current" />
                  {aiMode === 'pro' ? t.analyzePro : t.analyze}
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {history.map((entry, idx) => (
              <motion.div 
                key={entry.timestamp}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4"
              >
                <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded-[32px] text-right relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                  
                  {/* User Prompt */}
                  <div className="mb-4 text-white/40 text-[10px] font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                    {lang === 'ar' ? 'سؤالك:' : 'Your Question:'} {entry.prompt}
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Terminal size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{t.aiAnalysis}</span>
                  </div>
                  <p className="text-white text-base leading-[1.8] whitespace-pre-wrap font-medium">
                    {entry.response}
                  </p>
                  
                  <div className="mt-8 flex items-center gap-4 border-t border-white/5 pt-6">
                    <button 
                      onClick={() => navigator.clipboard.writeText(entry.response)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white transition-all uppercase tracking-tighter"
                    >
                      {lang === 'ar' ? 'نسخ التحليل' : 'Copy Analysis'}
                    </button>
                    <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white transition-all uppercase tracking-tighter">
                      {lang === 'ar' ? 'مشاركة الاستنتاج' : 'Share Conclusion'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
