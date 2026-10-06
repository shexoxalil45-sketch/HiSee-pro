
import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Mic, X, Sparkles, Loader2, Music, Check } from 'lucide-react';
import { translations } from '../translations';
import { getVoiceCommandResponse } from '../services/geminiService';

interface Props {
  lang: 'ar' | 'en';
  onNavigate: (tab: any) => void;
}

export interface VoiceCommanderRef {
  toggleListening: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceCommander = forwardRef<VoiceCommanderRef, Props>(({ lang, onNavigate }, ref) => {
  const t = translations[lang];
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);

  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = lang === 'ar' ? 'ar-SA' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.results[event.resultIndex][0].transcript;
        setTranscript(current);
      };

      recognitionRef.current.onend = () => {
        (window as any).__isVoiceCommanderActive = false;
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setFeedback('error');
      };
    }

    return () => {
      (window as any).__isVoiceCommanderActive = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
        } catch (e) {}
      }
    };
  }, [lang]);

  const processCommand = useCallback(async (text: string) => {
    setIsProcessing(true);
    const cmd = (text || '').toLowerCase();
    
    const mappings: Record<string, any> = {
      'ar': {
        'الرئيسية': 'home',
        'الدردشة': 'chats',
        'رسائل': 'chats',
        'بث': 'live',
        'مباشر': 'live',
        'حسابي': 'profile',
        'ملفي': 'profile',
        'إعدادات': 'settings',
        'انشر': 'post',
        'نشر': 'post',
        'مساعد': 'ai_assistant',
        'ذكاء': 'ai_assistant'
      },
      'en': {
        'home': 'home',
        'chats': 'chats',
        'messages': 'chats',
        'live': 'live',
        'stream': 'live',
        'profile': 'profile',
        'me': 'profile',
        'settings': 'settings',
        'post': 'post',
        'upload': 'post',
        'ai': 'ai_assistant'
      }
    };

    let targetTab = null;
    const currentMappings = mappings[lang];

    for (const key in currentMappings) {
      if (cmd.includes(key)) {
        targetTab = currentMappings[key];
        break;
      }
    }

    if (targetTab) {
      onNavigate(targetTab);
      setFeedback('success');
    } else {
      try {
        const result = await getVoiceCommandResponse(cmd);
        if (result && result !== 'unknown') {
          onNavigate(result);
          setFeedback('success');
        } else {
          setFeedback('error');
        }
      } catch (err) {
        setFeedback('error');
      }
    }

    setIsProcessing(false);
    setTimeout(() => {
      setFeedback(null);
      setTranscript('');
    }, 2000);
  }, [lang, onNavigate]);

  useEffect(() => {
    if (!isListening && transcript) {
      processCommand(transcript);
    }
  }, [isListening, transcript, processCommand]);

  const toggleListening = () => {
    if (isListening) {
      (window as any).__isVoiceCommanderActive = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      (window as any).__isVoiceCommanderActive = true;
      setTranscript('');
      setFeedback(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  useImperativeHandle(ref, () => ({
    toggleListening
  }));

  return (
    <>
      {/* Voice Hub Overlay - Only visible when active */}
      {(isListening || transcript || isProcessing) && (
        <div className="absolute inset-x-0 bottom-0 z-[200] bg-slate-950/95 backdrop-blur-3xl p-8 border-t border-white/10 animate-in slide-in-from-bottom duration-300 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]' : 'bg-slate-700'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {isProcessing ? 'Processing Intent...' : isListening ? t.listening : t.voiceCommandHint}
              </span>
            </div>

            <div className="w-full text-center h-12 flex items-center justify-center">
              {isProcessing ? (
                <Loader2 size={32} className="text-emerald-500 animate-spin" />
              ) : feedback === 'success' ? (
                <div className="flex items-center gap-3 text-emerald-500">
                  <Check size={32} />
                  <span className="text-lg font-black uppercase italic">{t.voiceCommandSuccess}</span>
                </div>
              ) : feedback === 'error' ? (
                <div className="flex items-center gap-3 text-rose-500">
                  <X size={32} />
                  <span className="text-lg font-black uppercase italic">{t.voiceCommandError}</span>
                </div>
              ) : (
                <p className="text-xl font-black italic text-white tracking-tight uppercase">
                  {transcript || t.voiceCommandHint}
                </p>
              )}
            </div>

            {isListening && (
              <div className="flex gap-2 h-8 items-end">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-emerald-500 rounded-full animate-voice-bar" 
                    style={{ 
                      height: `${Math.random() * 100}%`,
                      animationDelay: `${i * 0.1}s` 
                    }}
                  ></div>
                ))}
              </div>
            )}
            
            <button onClick={() => { setIsListening(false); setTranscript(''); }} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes voice-bar {
          0%, 100% { height: 10%; }
          50% { height: 100%; }
        }
        .animate-voice-bar {
          animation: voice-bar 0.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
});

export default VoiceCommander;
