
import React, { useState, useMemo } from 'react';
import HiSeeCoinIcon from './HiSeeCoinIcon';
import { EMOJI_STICKERS } from '../data/constants';
import { STORE_CATALOG } from '../data/storeCatalog';

interface GiftOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userCoins: number;
    gifts: any[];
    onSendGift: (gift: any) => void;
    onSendSticker: (stickerUrl: string) => void;
    onOpenWallet: () => void;
}

export const GiftOverlay: React.FC<GiftOverlayProps> = React.memo(({
    isOpen,
    onClose,
    userCoins,
    gifts,
    onSendGift,
    onSendSticker,
    onOpenWallet
}) => {
    const [activeGiftTab, setActiveGiftTab] = useState<'gifts' | 'emoji'>('gifts');
    const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

    // Get catalog of gifts
    const rawGifts = useMemo(() => {
        return gifts.length > 0 ? gifts : STORE_CATALOG;
    }, [gifts]);

    // Available categories
    const categories = useMemo(() => {
        const unique = Array.from(new Set(rawGifts.map(g => g.category || 'عامة')));
        return ['الكل', ...unique];
    }, [rawGifts]);

    // Filter gifts by category
    const filteredGifts = useMemo(() => {
        if (selectedCategory === 'الكل') return rawGifts;
        return rawGifts.filter(g => (g.category || 'عامة') === selectedCategory);
    }, [rawGifts, selectedCategory]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-x-0 bottom-0 top-0 z-[200] bg-black/60 backdrop-blur-xs flex items-end justify-center" onClick={onClose}>
            <div 
                className="w-full max-w-md bg-[#0a0c10]/95 backdrop-blur-2xl rounded-t-[36px] p-5 shadow-[0_-15px_50px_rgba(0,0,0,0.8)] border-transparent flex flex-col h-[62vh] transition-all duration-300 animate-in slide-in-from-bottom duration-300" 
                onClick={e => e.stopPropagation()}
            >
                {/* Panel Header Handle */}
                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4 shrink-0" />

                {/* Main Tab Controller & Wallet Balance */}
                <div className="flex items-center justify-between mb-3 shrink-0 gap-3">
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-1 py-1 rounded-full shrink-0">
                        <button 
                            onClick={() => setActiveGiftTab('gifts')} 
                            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all duration-150 ${activeGiftTab === 'gifts' ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/15' : 'text-slate-400 hover:text-white'}`}
                        >
                            الهدايا
                        </button>
                        <button 
                            onClick={() => setActiveGiftTab('emoji')} 
                            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all duration-150 ${activeGiftTab === 'emoji' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/15' : 'text-slate-400 hover:text-white'}`}
                        >
                            ملصقات
                        </button>
                    </div>

                    <button 
                        onClick={() => { onClose(); onOpenWallet(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/15 rounded-full border border-yellow-400/25 text-yellow-400 text-xs font-black transition-all active:scale-95 duration-100 shrink-0 shadow-lg shadow-yellow-500/[0.04]"
                    >
                        <HiSeeCoinIcon size={14} /> 
                        <span className="font-mono">{userCoins}</span>
                    </button>
                </div>

                {/* Sub category filter tabs - displayed only for 'gifts' tab */}
                {activeGiftTab === 'gifts' && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 pt-1 shrink-0">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-wide border transition-all shrink-0 active:scale-95 uppercase ${selectedCategory === cat ? 'bg-white text-black border-white shadow-md' : 'bg-white/[0.04] text-slate-400 border-white/5 hover:bg-white/[0.08] hover:text-white'}`}
                            >
                                {cat === 'الكل' ? 'الجميع' : cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Grid list display area */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                    {activeGiftTab === 'gifts' ? (
                        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 content-start">
                            {filteredGifts.map(g => {
                                // Determine the frame glowing classes depending on the price of the gift
                                const isPremium = g.price >= 5000;
                                const isMid = g.price >= 1000 && g.price < 5000;
                                
                                let premiumBorder = 'border-white/5 bg-white/[0.03] hover:border-white/20';
                                if (isPremium) {
                                    premiumBorder = 'border-amber-500/25 bg-gradient-to-b from-amber-500/[0.06] to-transparent hover:border-amber-400';
                                } else if (isMid) {
                                    premiumBorder = 'border-rose-500/20 bg-gradient-to-b from-rose-500/[0.04] to-transparent hover:border-rose-400';
                                }

                                return (
                                    <button 
                                        key={g.id} 
                                        onClick={() => onSendGift(g)} 
                                        className={`group relative overflow-hidden rounded-2xl p-2 flex flex-col items-center justify-between border transition-all duration-300 active:scale-95 cursor-pointer h-[106px] ${premiumBorder}`}
                                    >
                                        {/* Luxury Radial Backlight */}
                                        <div className={`absolute top-2 w-12 h-12 rounded-full blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-300 pointer-events-none ${isPremium ? 'bg-amber-500/20' : isMid ? 'bg-rose-500/20' : 'bg-indigo-500/10'}`} />

                                        {/* Floating Discount Badge */}
                                        {(g as any).isDiscounted && (
                                            <div className="absolute top-0 right-0 bg-gradient-to-r from-red-600 to-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-lg shadow-md z-10 animate-pulse">
                                                -{Math.round(100 - ((g.cost !== undefined ? g.cost : g.price) / (g as any).originalCost * 100))}%
                                            </div>
                                        )}

                                        {/* Giant Premium Banner for VIP Items */}
                                        {g.isVip && (
                                            <div className="absolute top-0 left-0 bg-amber-500 text-slate-950 text-[7px] font-black px-1.5 py-0.5 rounded-br-lg shadow-md z-10 tracking-widest leading-none">
                                                VIP
                                            </div>
                                        )}

                                        {/* Gift Icon Display Stage */}
                                        <div className="w-11 h-11 flex items-center justify-center mt-1 group-hover:scale-115 transition-transform duration-300 relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                            {typeof g.icon === 'string' ? (
                                                <span className="text-3xl filter drop-shadow-md">{g.icon}</span>
                                            ) : (
                                                <div className="scale-100 group-hover:rotate-12 transition-transform duration-300">
                                                    {g.icon}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info & Price Label */}
                                        <div className="text-center w-full relative z-10 mt-auto flex flex-col items-center gap-1.5">
                                            <span className="text-[9px] font-black text-slate-200 block truncate w-full group-hover:text-white transition-colors">
                                                {g.name}
                                            </span>
                                            
                                            <div className="flex items-center justify-center gap-1 bg-black/60 border border-white/5 group-hover:border-white/10 px-1.5 py-0.5 rounded-full shadow-inner w-full max-w-[56px] mx-auto transition-all">
                                                {(g.cost !== undefined ? g.cost : g.price) > 0 ? (
                                                    <React.Fragment>
                                                        <HiSeeCoinIcon size={9} />
                                                        <span className={`text-[8px] font-black leading-none font-mono ${g.isVip ? 'text-amber-400' : (g as any).isDiscounted ? 'text-red-400' : 'text-slate-300 group-hover:text-yellow-400'}`}>
                                                            {g.cost !== undefined ? g.cost : g.price}
                                                        </span>
                                                    </React.Fragment>
                                                ) : (
                                                    <span className="text-[8px] text-emerald-400 font-extrabold leading-none">مجاني</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 content-start">
                            {EMOJI_STICKERS.map((s, i) => (
                                <button 
                                    key={i} 
                                    type="button"
                                    onClick={() => onSendSticker(s)} 
                                    className="group bg-white/[0.03] rounded-2xl p-2.5 flex items-center justify-center border border-white/5 hover:border-white/15 hover:bg-white/[0.07] transition-all duration-300 active:scale-95 h-[90px]"
                                >
                                    {s.startsWith('http') || s.startsWith('data:') ? (
                                        <img src={s} className="w-11 h-11 object-contain group-hover:scale-120 transition-all duration-300 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" alt="" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                    ) : (
                                        <span className="text-4xl group-hover:scale-125 transition-transform duration-300 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] select-none">
                                            {s}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

