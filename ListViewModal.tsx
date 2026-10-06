
import React from 'react';
import { X, User as UserIcon, MessageCircle, UserPlus, Zap, Star } from 'lucide-react';
import { User, Language } from '../types';
import { translations } from '../translations';

interface ListItem {
  id: string;
  name: string;
  avatar: string;
  type: 'user' | 'star';
  description?: string; // For users, it could be bio snippet, for stars, it could be a level/score
}

interface Props {
  lang: Language;
  title: string;
  list: ListItem[];
  onClose: () => void;
  onItemClick?: (item: ListItem) => void;
}

const ListViewModal: React.FC<Props> = ({ lang, title, list, onClose, onItemClick }) => {
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="glass p-8 rounded-[3rem] w-full max-w-md border border-white/10 shadow-2xl flex flex-col gap-6 h-[70vh]">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors" aria-label={t.close}><X size={24} aria-hidden="true" /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <UserIcon size={48} className="mb-4 opacity-50" aria-hidden="true" />
              <p className="text-sm font-black uppercase tracking-widest">{t.noItems}</p>
            </div>
          ) : (
            list.map(item => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 shadow-inner"
                onClick={() => onItemClick && onItemClick(item)}
                role="button"
                tabIndex={0}
                aria-label={item.type === 'user' ? `${t.viewProfile} ${item.name}, ${item.description}` : `${item.name}, ${item.description}`}
              >
                <div className="flex items-center gap-4">
                  <img src={item.avatar} className="w-12 h-12 rounded-xl" alt={item.name} />
                  <div className="text-start">
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {item.type === 'user' && (
                    <>
                      <button className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" aria-label={`${t.message} ${item.name}`}><MessageCircle size={18} aria-hidden="true" /></button>
                      <button className="p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" aria-label={`${t.follow} ${item.name}`}><UserPlus size={18} aria-hidden="true" /></button>
                    </>
                  )}
                  {item.type === 'star' && (
                    <div className="flex items-center gap-1 text-amber-400 font-bold text-xs" aria-label={item.description}>
                      <Star size={16} fill="currentColor" aria-hidden="true" /> {item.description}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="w-full py-4 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-600/20 active:scale-95 transition-all" aria-label={t.cancel}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
};

export default ListViewModal;