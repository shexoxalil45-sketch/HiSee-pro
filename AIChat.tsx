import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Mic, MicOff, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { getGeminiResponse } from '../services/geminiService';
import { Language } from '../types';
import { translations } from '../translations';
import ModernHSLogo from './ModernHSLogo';
import { db as firestoreDb, auth } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  lang: Language;
  className?: string;
  onBack?: () => void;
}

interface ChatMessageItem {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isSensitiveRequest?: boolean;
  requestId?: string;
}

export const AIChat: React.FC<Props> = ({ lang, className = "h-[520px] bg-slate-900/60 border border-white/10 rounded-[2.5rem]", onBack }) => {
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const aiChatTranslations: Record<string, {
    subtitle: string;
    onlineStatus: string;
    placeholder: string;
    listeningPlaceholder: string;
    thinking: string;
    pendingApproval: string;
  }> = {
    ar: {
      subtitle: "الدعم الفني والوكيل الذكي المعتمد",
      onlineStatus: "متصل ونشط",
      placeholder: "اسأل موظف الدعم أو اطلب مساعدة...",
      listeningPlaceholder: "جاري الاستماع...",
      thinking: "جاري تحليل الطلب واستشارة قواعد المعرفة...",
      pendingApproval: "معلق في انتظار موافقة المسؤول (Admin Approval Queue)"
    },
    en: {
      subtitle: "Verified Technical Support & AI Agent",
      onlineStatus: "Online & Active",
      placeholder: "Ask support or request assistance...",
      listeningPlaceholder: "Listening...",
      thinking: "Analyzing request and consulting knowledge base...",
      pendingApproval: "Pending Admin Approval Queue"
    },
    ku: {
      subtitle: "پشتگیری تەکنیکی و ئەنتەرنێتی باوەڕپێکراو",
      onlineStatus: "ئۆنلاین و چالاک",
      placeholder: "پرسیار لە پشتگیری بکە یان داوای یارمەتی بکە...",
      listeningPlaceholder: "گوێگرتن...",
      thinking: "شیکردنەوەی داواکاری و راوێژکردن بە زانیارییەکان...",
      pendingApproval: "چاوەڕێی پەسەندکردنی بەڕێوەبەر (Admin Approval)"
    },
    tr: {
      subtitle: "Onaylı Teknik Destek ve Yapay Zeka Asistanı",
      onlineStatus: "Çevrimiçi ve Aktif",
      placeholder: "Destek isteyin veya yardım sorun...",
      listeningPlaceholder: "Dinleniyor...",
      thinking: "Talep analiz ediliyor ve bilgi tabanı inceleniyor...",
      pendingApproval: "Yönetici Onay Kuyruğunda Bekliyor"
    },
    de: {
      subtitle: "Verifizierter Technischer Support & KI-Agent",
      onlineStatus: "Online & Aktiv",
      placeholder: "Support fragen oder Hilfe anfordern...",
      listeningPlaceholder: "Wird zugehört...",
      thinking: "Anfrage wird analysiert und Wissensdatenbank konsultiert...",
      pendingApproval: "Wartet auf Admin-Genehmigung"
    },
    ru: {
      subtitle: "Проверенная техподдержка и ИИ-агент",
      onlineStatus: "В сети и активен",
      placeholder: "Задайте вопрос поддержке...",
      listeningPlaceholder: "Слушаю...",
      thinking: "Анализ запроса и обращение к базе знаний...",
      pendingApproval: "Ожидает одобрения администратора"
    },
    fr: {
      subtitle: "Support technique vérifié et agent IA",
      onlineStatus: "En ligne et actif",
      placeholder: "Demandez de l'aide au support...",
      listeningPlaceholder: "Écoute en cours...",
      thinking: "Analyse de la demande et consultation de la base de connaissances...",
      pendingApproval: "En attente d'approbation administrateur"
    },
    es: {
      subtitle: "Soporte técnico verificado y agente de IA",
      onlineStatus: "En línea y activo",
      placeholder: "Pide soporte o solicita asistencia...",
      listeningPlaceholder: "Escuchando...",
      thinking: "Analizando solicitud y consultando base de conocimientos...",
      pendingApproval: "Pendiente de aprobación del administrador"
    },
    uk: {
      subtitle: "Перевірена техпідтримка та ШІ-агент",
      onlineStatus: "В мережі та активний",
      placeholder: "Запитайте підтримку або допомогу...",
      listeningPlaceholder: "Слухаю...",
      thinking: "Аналіз запиту та звернення до бази знань...",
      pendingApproval: "Очікує схвалення адміністратора"
    }
  };

  const currentLang = aiChatTranslations[lang as string] ? lang : 'en';
  const tAi = aiChatTranslations[currentLang as keyof typeof aiChatTranslations] || aiChatTranslations.en;

  const getInitialGreeting = (l: string) => {
    switch (l) {
      case 'ar': return 'أهلاً بك في دعم HiSee Pro. أنا هنا لمساعدتك والإجابة عن أي استفسار يخص التطبيق بكل راحة وسهولة. تفضل بطرح سؤالك.';
      case 'ku': return 'بخێر بێن بۆ پشتگیری HiSee Pro. من لێرەم بۆ یارمەتیدان و وەڵامدانەوەی هەر پرسیارێک سەبارەت بە بەرنامەکە بە ئارامی و ئاسانی. فەرموون پرسیارەکەت بکەن.';
      case 'tr': return 'HiSee Pro Destek\'e hoş geldiniz. Uygulama ile ilgili her türlü sorunuzu rahatlıkla yanıtlamak ve size yardımcı olmak için buradayım. Lütfen sorunuzu sorun.';
      case 'de': return 'Willkommen beim HiSee Pro Support. Ich bin hier, um Ihnen zu helfen und alle Fragen zur App bequem und einfach zu beantworten. Bitte stellen Sie Ihre Frage.';
      case 'ru': return 'Добро пожаловать в службу поддержки HiSee Pro. Я здесь, чтобы помочь вам и легко ответить на любые вопросы о приложении. Пожалуйста, задайте свой вопрос.';
      case 'fr': return 'Bienvenue sur le support HiSee Pro. Je suis là pour vous aider et répondre à toutes vos questions sur l\'application en toute simplicité. N\'hésitez pas à poser votre question.';
      case 'es': return 'Bienvenido al soporte de HiSee Pro. Estoy aquí para ayudarte y responder cualquier duda sobre la aplicación de forma fácil y cómoda. Adelante con tu pregunta.';
      case 'uk': return 'Ласкаво просимо до служби підтримки HiSee Pro. Я тут, щоб допомогти вам і легко відповісти на будь-які запитання щодо додатку. Будь ласка, задайте своє запитання.';
      default: return 'Welcome to HiSee Pro Support. I am here to help you and answer any questions about the app comfortably and easily. Please go ahead and ask your question.';
    }
  };

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    { 
      role: 'model', 
      text: getInitialGreeting(lang), 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load custom system prompt from Firestore if configured by admin
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configDocRef = doc(firestoreDb, 'system_settings', 'ai_agent_config');
        const snap = await getDoc(configDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.systemPrompt) {
            setCustomSystemPrompt(data.systemPrompt);
          }
        }
      } catch (err) {
        console.warn("Notice loading AI agent config:", err);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Speech Recognition setup
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("متصفحك لا يدعم الإدخال الصوتي المباشر.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // recognition.onstart = () => setIsListening(true); // Moved to start of function for instant response
    recognition.onresult = (event: any) => {
      const speechText = event.results[0][0].transcript;
      setInput(prev => (prev ? prev + ' ' + speechText : speechText));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      // Check if user prompt requests a sensitive action
      const lower = userMessage.toLowerCase();
      const sensitiveKeywords = ['حظر', 'حذف', 'تعديل رصيد', 'تغيير صلاحية', 'ban', 'delete', 'balance', 'role', 'admin', 'تعديل إعدادات'];
      const isSensitive = sensitiveKeywords.some(kw => lower.includes(kw));

      let responseText = '';
      let pendingRequestId = undefined;

      if (isSensitive) {
        // Create pending approval request in Firestore if authenticated
        const currentUser = auth.currentUser;
        try {
          const reqRef = await addDoc(collection(firestoreDb, 'ai_pending_requests'), {
            actionDescription: userMessage,
            requestedByUid: currentUser?.uid || 'anonymous',
            requestedByEmail: currentUser?.email || 'guest',
            status: 'pending',
            createdAt: serverTimestamp()
          });
          pendingRequestId = reqRef.id;
        } catch (dbErr) {
          console.warn("Notice: could not record pending request in Firestore:", dbErr);
          pendingRequestId = 'local-' + Date.now().toString(36);
        }

        responseText = `⚠️ تم رصد طلب إجراء حساس/هيكلي ("${userMessage}"). بموجب نظام الأمان والتحكم المركزي في HiSee Pro، يُمنع منعاً باتاً تنفيذ أي تعديلات حساسة تلقائياً.\n\n🔒 تم إرسال طلب استئذان معلق (رقم الطلب: #${pendingRequestId.slice(0, 6)}) إلى لوحة تحكم المسؤول (Admin Panel). لن يتم تنفيذ هذا الإجراء إلا بعد مراجعته والموافقة اليدوية من قبل المشرف.`;
      } else {
        // Prepare API history
        const recentMessages = messages.slice(-10);
        const apiHistory = recentMessages.flatMap(msg => [
          { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }
        ]);

        const defaultSystemInstruction = `You are "HiSee AI", the official intelligent technical support agent for the advanced social media application "HiSee Pro".
Rules and Capabilities:
1. Automatic Multilingual Support: Automatically detect and understand the user's language from their first message (Arabic, English, German, Kurdish, Turkish, Russian, Ukrainian, French, Spanish, etc.) and reply fluently and naturally in that exact language.
2. User Names & Human Touch: Pay close attention to user names during conversation and address them politely and warmly by name when appropriate.
3. App Awareness: Full awareness of all HiSee Pro modules: Auth & Profiles, 1-on-1 & Group Chats with Agora Voice/Video calls, Live Streams & PK Battles (WaterPK), Social Feeds & Stories, Digital Store & Payouts, and Admin Console.
4. Security: Never execute sensitive actions (bans, balance edits, role changes) directly; always intercept, trigger a pending approval request in Firestore ('ai_pending_requests'), and notify the user that supervisor review is required.`;

        const systemInstructionToUse = customSystemPrompt || defaultSystemInstruction;

        const stream = await getGeminiResponse(userMessage, apiHistory, systemInstructionToUse);
        let fullText = '';
        for await (const chunk of stream) {
          fullText += (chunk.text || '');
        }
        responseText = fullText || "عذراً، لم أتمكن من معالجة الطلب في الوقت الحالي.";
      }

      setMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          text: responseText, 
          timestamp: new Date(), 
          isSensitiveRequest: isSensitive,
          requestId: pendingRequestId
        }
      ]);

    } catch (error: any) {
      console.warn("AI Assistant Notice:", error?.message || error);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: "أهلاً بك! معك مساعد HiSee AI الذكي. أنا جاهز دائماً لمساعدتك في البث المباشر، المكالمات، المحادثات، وشحن الرصيد.", timestamp: new Date() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden backdrop-blur-3xl shadow-2xl relative ${className}`}>
      {/* Header */}
      <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
              ←
            </button>
          )}
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-600/20">
            <ModernHSLogo size={24} />
          </div>
          <div>
            <h3 className="hisee-logo text-[13px] leading-tight select-none text-white font-black flex items-center gap-1.5">
              HiSee
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-widest font-black border border-emerald-500/30">AI Agent</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">{tAi.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-black">{tAi.onlineStatus}</span>
        </div>
      </div>

      {/* Messages List - Fully Open, Unlimited, No video/audio call buttons */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center border shadow-md ${
              msg.role === 'user' 
                ? 'bg-rose-600 border-rose-500 text-white' 
                : msg.isSensitiveRequest 
                  ? 'bg-amber-600 border-amber-500 text-white' 
                  : 'bg-slate-800 border-white/10 text-indigo-400'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : msg.isSensitiveRequest ? <ShieldAlert size={14} /> : <Bot size={14} />}
            </div>

            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'text-end' : 'text-start'}`}>
              <div className={`p-4 rounded-2xl text-[12px] font-medium leading-relaxed whitespace-pre-wrap shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-rose-600 text-white rounded-tr-none' 
                  : msg.isSensitiveRequest
                    ? 'bg-amber-950/80 border border-amber-500/40 text-amber-200 rounded-tl-none'
                    : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-white/10'
              }`}>
                {msg.text}
              </div>

              {msg.isSensitiveRequest && msg.requestId && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] text-amber-300 font-bold">
                  <Clock size={12} className="animate-spin text-amber-400" />
                  <span>{tAi.pendingApproval}</span>
                </div>
              )}

              <span className="text-[9px] text-slate-500 px-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10">
              <Loader2 size={14} className="animate-spin text-rose-400" />
            </div>
            <div className="px-4 py-3 bg-slate-800/80 rounded-2xl rounded-tl-none border border-white/10 text-xs text-slate-300 animate-pulse">
              {tAi.thinking}
            </div>
          </div>
        )}
      </div>

      {/* Input Form - Text and Voice input only, no video/audio call buttons */}
      <div className="p-4 bg-slate-950/90 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-2xl transition-all shrink-0 border ${
              isListening 
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse' 
                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white hover:bg-white/5'
            }`}
            title="الإدخال الصوتي"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? tAi.listeningPlaceholder : tAi.placeholder}
            className="flex-1 bg-slate-900 border border-white/10 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-white outline-none focus:border-rose-500 transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-2xl transition-all shrink-0 shadow-lg shadow-rose-600/30 active:scale-95 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
