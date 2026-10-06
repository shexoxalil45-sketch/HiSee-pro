import React, { memo } from 'react';
import { Mic, MicOff, Video, VideoOff, Plus, UserCircle2 } from 'lucide-react';

export interface GuestBoxProps {
    id: string;
    name: string;
    avatar: string;
    isMuted: boolean;
    isCameraOff: boolean;
    isCurrentUser: boolean;
    isEmpty?: boolean;
    onGuestClick?: (id: string, isEmpty: boolean) => void;
    // stream logic handled externally or via refs, we just provide the UI frame
    videoRef?: React.RefCallback<HTMLDivElement>;
}

export const GuestBox = memo(({ 
    id, 
    name, 
    avatar, 
    isMuted, 
    isCameraOff, 
    isCurrentUser, 
    isEmpty = false,
    onGuestClick,
    videoRef
}: GuestBoxProps) => {
    
    if (isEmpty) {
        return (
            <div 
                className="guest-box relative overflow-hidden bg-slate-900 border border-slate-700 shadow-lg rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                style={{ width: 'var(--guest-box-size, 80px)', height: 'var(--guest-box-size, 80px)' }}
                onClick={() => onGuestClick && onGuestClick(id, true)}
            >
                <Plus size={24} className="text-slate-400" />
            </div>
        );
    }

    return (
        <div 
            className="guest-box relative overflow-hidden bg-slate-950 border border-white/10 shadow-lg rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            style={{ width: 'var(--guest-box-size, 80px)', height: 'var(--guest-box-size, 80px)' }}
            onClick={() => onGuestClick && onGuestClick(id, false)}
        >
            {/* Background / Avatar when Camera is off */}
            {isCameraOff ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-0">
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-1/2 h-1/2 rounded-full object-cover shadow-md" />
                    ) : (
                        <UserCircle2 size={32} className="text-slate-400" />
                    )}
                </div>
            ) : null}

            {/* Video Container injected via ref */}
            <div 
                className="absolute inset-0 z-10" 
                ref={videoRef} 
                id={`video-slot-${id}`} 
            />
            
            {/* Overlay Info */}
            <div className="absolute bottom-0 inset-x-0 p-1 flex flex-col justify-end z-20 pointer-events-none bg-gradient-to-t from-black/80 to-transparent">
                
                {/* 1. Icon Wrapper: Conditional based on isCurrentUser */}
                {isCurrentUser && (
                    <div className="flex items-center justify-center gap-1.5 mb-0.5 opacity-80 pointer-events-auto">
                        <div className="bg-black/60 rounded-full p-1 backdrop-blur-sm">
                            {isMuted ? <MicOff size={10} className="text-red-500" /> : <Mic size={10} className="text-emerald-400" />}
                        </div>
                        <div className="bg-black/60 rounded-full p-1 backdrop-blur-sm">
                            {isCameraOff ? <VideoOff size={10} className="text-red-500" /> : <Video size={10} className="text-emerald-400" />}
                        </div>
                    </div>
                )}
                
                <span className="text-[9px] sm:text-[10px] font-semibold text-white drop-shadow-md truncate text-center w-full block">
                    {name}
                </span>
            </div>
        </div>
    );
});

export interface GuestGridProps {
    guests: any[];
    currentUserId: string;
    onGuestClick?: (id: string, isEmpty: boolean) => void;
    assignVideoRef?: (id: string, el: HTMLDivElement | null) => void;
}

export const GuestGrid = memo(({ guests, currentUserId, onGuestClick, assignVideoRef }: GuestGridProps) => {
    return (
        <div className="flex flex-wrap gap-2 items-center justify-center w-full h-full content-center z-[100] bg-transparent">
            {guests.map((guest) => (
                <GuestBox 
                    key={guest.id}
                    id={guest.id}
                    name={guest.name}
                    avatar={guest.avatar}
                    isMuted={guest.isMuted}
                    isCameraOff={guest.isCameraOff}
                    isCurrentUser={guest.id === currentUserId}
                    isEmpty={guest.isEmpty}
                    onGuestClick={onGuestClick}
                    videoRef={assignVideoRef ? (el) => assignVideoRef(guest.id, el) : undefined}
                />
            ))}
        </div>
    );
});
