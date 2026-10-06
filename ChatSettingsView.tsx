import React, { useState } from 'react';
import { AppSettings, Language } from '../types';
import { Bell, Volume2, Search, Trash2, Shield, Lock, Smartphone, Database, Download, Upload, HardDrive } from 'lucide-react';
import { getTranslation } from '../translations';
// import { ChatBackupModal } from '../src/components/chat/ChatBackupModal';

interface ChatSettingsViewProps {
  chatSettings: AppSettings['chatSettings'];
  setChatSettings: (settings: AppSettings['chatSettings'] | ((prev: AppSettings['chatSettings']) => AppSettings['chatSettings'])) => void;
  lang: Language;
}

export const ChatSettingsView: React.FC<ChatSettingsViewProps> = ({ chatSettings, setChatSettings, lang }) => {
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const updateSettings = (key: keyof AppSettings['chatSettings'], value: any) => {
    setChatSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateSoundSettings = (key: keyof AppSettings['chatSettings']['sounds'], value: any) => {
    setChatSettings(prev => ({ 
      ...prev, 
      sounds: { ...prev.sounds, [key]: value } 
    }));
  };

  const isRtl = lang === 'ar' || lang === 'ku' || lang === 'ckb';

  return (
    <div className={`p-6 space-y-6 ${isRtl ? 'text-right' : 'text-left'}`}>
      <h2 className="text-xl font-black text-white">{getTranslation(lang, 'chatSettings', 'Chat Settings')}</h2>
      
      {/* Sound Settings */}
      <div className="glass rounded-[2rem] p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <Volume2 size={16} /> {getTranslation(lang, 'notificationsAndSounds', 'Notifications & Sounds')}
        </h3>
        <div className="flex items-center justify-between">
            <span className="text-white text-sm">{getTranslation(lang, 'messageNotifications', 'Message Alerts')}</span>
            <input type="checkbox" checked={chatSettings.sounds.messages} onChange={(e) => updateSoundSettings('messages', e.target.checked)} className="toggle" />
        </div>
        <div className="flex items-center justify-between">
            <span className="text-white text-sm">{getTranslation(lang, 'callNotifications', 'Call Alerts')}</span>
            <input type="checkbox" checked={chatSettings.sounds.audioCall} onChange={(e) => updateSoundSettings('audioCall', e.target.checked)} className="toggle" />
        </div>
      </div>

      {/* Local Storage & Backup (Dexie.js IndexedDB) */}
      <div className="glass rounded-[2rem] p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <Database size={16} className="text-indigo-400" /> {isRtl ? 'التخزين المحلي والنسخ الاحتياطي (Dexie.js)' : 'Local Storage & Backup (Dexie.js)'}
        </h3>
        <p className="text-xs text-slate-400">
          {isRtl 
            ? 'حفظ وسجل المحادثات مخزن تلقائياً وبشكل دائم على جهازك. يمكنك تصدير أو استيراد نسخة احتياطية بصيغة JSON.'
            : 'Chat logs are automatically stored permanently on your device. You can export or import JSON backups.'}
        </p>
        <button 
          onClick={() => setIsBackupModalOpen(true)} 
          className="w-full flex items-center justify-center gap-3 p-3.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-600/20"
        >
            <Download size={16} /> {isRtl ? 'إدارة النسخ الاحتياطي وتصدير JSON' : 'Manage Backup & Export JSON'}
        </button>
      </div>

      {/* Privacy Settings */}
      <div className="glass rounded-[2rem] p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <Shield size={16} /> {getTranslation(lang, 'privacy', 'Privacy')}
        </h3>
        <div className="flex items-center justify-between">
            <span className="text-white text-sm">{getTranslation(lang, 'endToEndEncryption', 'End-to-End Chat Encryption')}</span>
            <input type="checkbox" checked={chatSettings.privacy.endToEndEncryption} onChange={(e) => setChatSettings(prev => ({...prev, privacy: {...prev.privacy, endToEndEncryption: e.target.checked}}))} className="toggle" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="glass rounded-[2rem] p-5 space-y-4">
        <button onClick={() => alert(getTranslation(lang, 'clearingHistory', 'Clearing chat history...'))} className="w-full flex items-center justify-start gap-3 p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all text-sm font-bold">
            <Trash2 size={16} /> {getTranslation(lang, 'clearChatHistory', 'Clear Chat History')}
        </button>
      </div>

      {/* Backup Modal Placeholder */}
      {/* <ChatBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        lang={lang}
      /> */}
    </div>
  );
};

