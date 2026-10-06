
import React, { useState } from 'react';
import { Play, Check, ChevronLeft } from 'lucide-react';
import { translations } from '../translations';

const MODERN_RINGTONES = [
  { id: 'm1', name: 'Digital Marimba', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'm2', name: 'Tech Notification', url: 'https://assets.mixkit.co/active_storage/sfx/2858/2858-preview.mp3' },
  { id: 'm3', name: 'Modern Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3' },
];

const CLASSIC_RINGTONES = [
  { id: 'c1', name: 'Old Telephone', url: 'https://assets.mixkit.co/active_storage/sfx/2360/2360-preview.mp3' },
  { id: 'c2', name: 'Classic Desk Phone', url: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3' },
  { id: 'c3', name: 'Retro Ring', url: 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3' },
];

const QUIET_RINGTONES = [
  { id: 'q1', name: 'Soft Bells', url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' },
  { id: 'q2', name: 'Gentle Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3' },
  { id: 'q3', name: 'Calm Notification', url: 'https://assets.mixkit.co/active_storage/sfx/2851/2851-preview.mp3' },
];

interface Props {
  lang: any;
  currentRingtoneUrl: string;
  onSelect: (url: string) => void;
  onBack: () => void;
}

export const RingtonePicker: React.FC<Props> = ({ lang, currentRingtoneUrl, onSelect, onBack }) => {
  const t = translations[lang] || translations.ar;
  const [activeTab, setActiveTab] = useState<'modern' | 'classic' | 'quiet' | 'default'>('modern');
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const playAudio = (url: string) => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }

    if (playingUrl === url) {
        setPlayingUrl(null);
        return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(err => console.warn("Ringtone preview play failed:", err));
    setPlayingUrl(url);
    audio.onended = () => {
        setPlayingUrl(null);
        audioRef.current = null;
    };
  };

  React.useEffect(() => {
    const handlePauseAll = () => {
        if (document.hidden || !document.hasFocus()) {
            if (audioRef.current) {
                audioRef.current.pause();
                setPlayingUrl(null);
            }
        }
    };

    document.addEventListener('visibilitychange', handlePauseAll);
    window.addEventListener('blur', handlePauseAll);

    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        document.removeEventListener('visibilitychange', handlePauseAll);
        window.removeEventListener('blur', handlePauseAll);
    };
  }, []);

  const renderRingtones = (ringtones: {id: string, name: string, url: string}[]) => (
    <div className="space-y-2">
      {ringtones.map(r => (
        <div key={r.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
          <span className="text-sm text-slate-300">{r.name}</span>
          <div className="flex gap-2">
            <button onClick={() => playAudio(r.url)} className={`p-2 rounded-full ${playingUrl === r.url ? 'text-emerald-500' : 'text-slate-400 hover:text-white'}`}>
              <Play size={18} fill={playingUrl === r.url ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => onSelect(r.url)}
              className={`p-2 rounded-full ${currentRingtoneUrl === r.url ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-white/10'}`}
            >
              <Check size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-white"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-bold text-white">اختر نغمة الرنين</h2>
      </div>

      <div className="grid grid-cols-4 gap-2 bg-white/5 rounded-xl p-1">
        {(['modern', 'classic', 'quiet', 'default'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-emerald-500 text-black' : 'text-slate-400'}`}
          >
            {tab === 'modern' ? 'حديث' : tab === 'classic' ? 'كلاسيكي' : tab === 'quiet' ? 'هادئ' : 'افتراضي'}
          </button>
        ))}
      </div>

      {activeTab === 'modern' && renderRingtones(MODERN_RINGTONES)}
      {activeTab === 'classic' && renderRingtones(CLASSIC_RINGTONES)}
      {activeTab === 'quiet' && renderRingtones(QUIET_RINGTONES)}
      {activeTab === 'default' && (
        <div className="p-4 text-center text-slate-500 text-sm">
          ملاحظة: لا يمكن الوصول المباشر لنغمات النظام عبر المتصفح. يرجى استخدام إحدى النغمات المتوفرة أعلاه.
        </div>
      )}
    </div>
  );
};
