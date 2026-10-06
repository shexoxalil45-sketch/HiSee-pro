import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { updateDoc, doc, serverTimestamp, increment, onSnapshot } from 'firebase/firestore';
import { Lock } from 'lucide-react';
import { db, auth } from '../lib/firebase';

interface WaterPKChallengeProps {
  roomID: string;
  blueScore: number;
  redScore: number;
  hostId?: string;
  onClose?: () => void;
}

const WinnerTrophy = () => (
   <motion.div 
     animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }} 
     transition={{ repeat: Infinity, duration: 1.2 }}
     className="relative flex flex-col items-center justify-center mb-1 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]"
   >
     <div className="text-[110px] leading-none">🏆</div>
     <div className="absolute top-[35%] left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-700 via-yellow-600 to-yellow-700 border-[1.5px] border-yellow-300 px-3.5 py-1 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] pointer-events-none flex items-center justify-center">
        <span className="text-[11px] font-black text-yellow-50 uppercase tracking-[0.2em] drop-shadow-md whitespace-nowrap">WINNER</span>
     </div>
   </motion.div>
);

const LoserFace = () => (
   <div className="flex flex-col items-center">
      <div className="relative w-[110px] h-[110px] mb-1 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-[100px] h-[100px] drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
          <circle cx="50" cy="50" r="45" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
          <motion.g animate={{ x: [-2, 2, -2] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <path d="M 28 35 Q 33 28 38 35" fill="none" stroke="#713f12" strokeWidth="3" strokeLinecap="round" />
            <circle cx="33" cy="44" r="4" fill="#713f12" />
            <path d="M 72 35 Q 67 28 62 35" fill="none" stroke="#713f12" strokeWidth="3" strokeLinecap="round" />
            <circle cx="67" cy="44" r="4" fill="#713f12" />
          </motion.g>
          <motion.path 
             animate={{ 
               d: [
                 "M 35 65 Q 50 58 65 65 Q 50 63 35 65", 
                 "M 30 65 Q 50 48 70 65 Q 50 85 30 65"  
               ],
               fill: ["#facc15", "#713f12"]
             }}
             transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
             stroke="#713f12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
          />
          <motion.path 
             d="M 33 50 Q 38 58 33 62 Q 28 58 33 50"
             fill="#3b82f6"
             animate={{ y: [0, 20, 25], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.8] }}
             transition={{ duration: 1.2, repeat: Infinity, ease: "easeIn" }}
          />
          <motion.path 
             d="M 67 50 Q 72 58 67 62 Q 62 58 67 50"
             fill="#3b82f6"
             animate={{ y: [0, 20, 25], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.8] }}
             transition={{ duration: 1.4, repeat: Infinity, ease: "easeIn", delay: 0.6 }}
          />
        </svg>
      </div>
      <div className="text-[11px] font-black text-red-500/90 italic tracking-[0.2em] uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">LOSER</div>
   </div>
);

export const WaterPKChallenge: React.FC<WaterPKChallengeProps> = ({
  roomID,
  blueScore,
  redScore,
  hostId,
  onClose
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [lastHit, setLastHit] = useState<'left' | 'right' | null>(null);
  const [bubbleBoost, setBubbleBoost] = useState(0);
  const [pkStartedAt, setPkStartedAt] = useState<any>(null);
  const [roomHostUid, setRoomHostUid] = useState<string>(hostId || '');
  
  const [roomGuestUid, setRoomGuestUid] = useState<string>('');
  const [isActiveGuest, setIsActiveGuest] = useState(false);
  const [playersOrder, setPlayersOrder] = useState<string[]>([]);
  
  // Unify Host UID dynamically from the Room ID to avoid race conditions or DB delay
  const hostUid = useMemo(() => {
    return hostId || roomHostUid || (roomID ? roomID.replace('room_', '') : '');
  }, [roomID, hostId, roomHostUid]);

  const currentUserUid = auth.currentUser?.uid;

  // Check if current user is the Host (Left side / Yellow)
  const isHost = useMemo(() => {
    if (!currentUserUid) return true; // Default to host in single-user preview
    const normHost = (hostUid || '').replace('room_', '');
    const normUser = (currentUserUid || '').replace('room_', '');
    return normHost === normUser;
  }, [currentUserUid, hostUid]);

  // Left side is Sender/Host Team (Yellow):
  // Enabled for the host, or players at index 0 and 2
  const isOnLeftTeam = useMemo(() => {
    if (!currentUserUid) return true;
    if (playersOrder.length > 0) {
      const idx = playersOrder.indexOf(currentUserUid);
      if (idx !== -1) {
        return idx === 0 || idx === 2;
      }
    }
    return isHost;
  }, [currentUserUid, playersOrder, isHost]);

  // Right side is Opponent/Guest Team (Red):
  // Enabled for the opponent/guest, or players at index 1 and 3
  const isOnRightTeam = useMemo(() => {
    if (!currentUserUid) return false;
    if (playersOrder.length > 0) {
      const idx = playersOrder.indexOf(currentUserUid);
      if (idx !== -1) {
        return idx === 1 || idx === 3;
      }
    }
    return !isHost && (roomGuestUid === currentUserUid || isActiveGuest);
  }, [currentUserUid, playersOrder, isHost, roomGuestUid, isActiveGuest]);

  // Explicit UI States tied to actual IDs, not variable "left/right" positions
  const [hostWaterLevel, setHostWaterLevel] = useState(blueScore);
  const [guestWaterLevel, setGuestWaterLevel] = useState(redScore);
  const prevHostWater = React.useRef(blueScore);
  const prevGuestWater = React.useRef(redScore);

  const [leftWins, setLeftWins] = useState(0);
  const [rightWins, setRightWins] = useState(0);

  const [hostName, setHostName] = useState('المضيف');
  const [hostAvatar, setHostAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=host');
  const [opponentName, setOpponentName] = useState('الخصم');
  const [opponentAvatar, setOpponentAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=opponent');
  const [pkEnded, setPkEnded] = useState(false);
  const [pkWinner, setPkWinner] = useState<'left' | 'right' | 'draw' | null>(null);
  const [localDismissed, setLocalDismissed] = useState(false);
  const [showTransientOverlay, setShowTransientOverlay] = useState(false);
  const [pkStatus, setPkStatus] = useState<string>('none');
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof blueScore === 'number') {
        if (isMounted.current) {
            setHostWaterLevel(blueScore);
            prevHostWater.current = blueScore;
        }
    }
  }, [blueScore]);

  useEffect(() => {
    if (typeof redScore === 'number') {
        if (isMounted.current) {
            setGuestWaterLevel(redScore);
            prevGuestWater.current = redScore;
        }
    }
  }, [redScore]);

  const isPKVisible = useMemo(() => {
    return pkStatus === 'active' || pkStatus === 'starting' || pkStatus === 'results' || pkStatus === 'swapping' || (pkStartedAt && secondsRemaining > 0) || (pkEnded && !localDismissed);
  }, [pkStatus, pkStartedAt, secondsRemaining, pkEnded, localDismissed]);

  // Sync Timer from pkStartedAt (Firestore Timestamp or Object) - 4 minutes (240 seconds)
  useEffect(() => {
    if (!pkStartedAt) {
      setSecondsRemaining(240);
      return;
    }

    const calculateTime = () => {
      let startTimeMillis = 0;
      if (typeof pkStartedAt.toMillis === 'function') {
          startTimeMillis = pkStartedAt.toMillis();
      } else if (pkStartedAt.seconds) {
          startTimeMillis = pkStartedAt.seconds * 1000;
      } else if (pkStartedAt._seconds) { // Some SDK versions use _seconds
          startTimeMillis = pkStartedAt._seconds * 1000;
      } else {
          startTimeMillis = new Date(pkStartedAt).getTime();
      }
      
      const now = Date.now();
      const elapsedSeconds = (now - startTimeMillis) / 1000;
      const remaining = Math.max(0, 240 - elapsedSeconds);
      
      if (isMounted.current) {
        setSecondsRemaining(remaining);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [pkStartedAt]);

  const bubbles = React.useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      bd: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 5
    }));
  }, []);

  const handlePkHit = async (side: 'left' | 'right') => {
    if (!roomID) return;
    console.log("Sending click to room:", roomID, "side:", side);
    
    // Target both roomID and variations with/without room_ prefix to ensure robust sync
    const targetRoomIds = [roomID];
    if (roomID.startsWith('room_')) {
      targetRoomIds.push(roomID.replace('room_', ''));
    } else {
      targetRoomIds.push(`room_${roomID}`);
    }

    for (const rId of targetRoomIds) {
      const roomRef = doc(db, 'live_rooms', rId);
      if (side === 'left') {
        updateDoc(roomRef, {
          blueScore: increment(1),
          lastInteractionAt: serverTimestamp()
        }).catch(() => {});
      } else {
        updateDoc(roomRef, {
          redScore: increment(1),
          lastInteractionAt: serverTimestamp()
        }).catch(() => {});
      }
    }
  };

  const onTap = (side: 'left' | 'right') => {
    // Role-based validation matching the visual disabled states
    if (side === 'left' && isYellowDisabled) return;
    if (side === 'right' && isRedDisabled) return;

    setLastHit(side);
    setBubbleBoost(prev => Math.min(prev + 20, 40));

    // Haptic feedback
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    } catch (_) {}
    
    // Optimistic local state update for zero latency feel - strictly separated per side
    if (side === 'left') {
        if (isMounted.current) {
            setHostWaterLevel(prev => {
                const next = prev + 1;
                prevHostWater.current = next;
                return next;
            });
        }
    } else {
        if (isMounted.current) {
            setGuestWaterLevel(prev => {
                const next = prev + 1;
                prevGuestWater.current = next;
                return next;
            });
        }
    }
    
    handlePkHit(side);
    const hitTimer = setTimeout(() => {
      if (isMounted.current) setLastHit(null);
    }, 300);
    return () => clearTimeout(hitTimer);
  };
  
  // الارتفاع التلقائي للماء (Default Water Rise): يبدأ منسوب الماء في الارتفاع التلقائي والتدريجي المتساوي ليصل إلى 50% بانتهاء 4 دقائق (240 ثانية)
  const elapsedTime = 240 - Math.max(0, secondsRemaining);
  const baseLevel = (Math.min(240, elapsedTime) / 240) * 50;

  // كل ضغطة تعادل شخطة صغيرة واحدة (-1 لجهتك، +1 لجهة الخصم). الهدايا: كل 100 عملة = 1 شخطة.
  const hostContribution = Math.max(0, hostWaterLevel);
  const guestContribution = Math.max(0, guestWaterLevel);

  // فرق النقاط / دفع الماء الصافي
  const netHostAdvantage = hostContribution - guestContribution;

  // المضيف (أصفر - يسار): يبدأ من baseLevel وينخفض مع تفاعل المضيف ويزيد مع تفاعل المنافس
  const yellowWaterHeight = Math.min(100, Math.max(0, baseLevel - netHostAdvantage));

  // المنافس (أحمر - يمين): يبدأ من baseLevel وينخفض مع تفاعل المنافس ويزيد مع تفاعل المضيف
  const redWaterHeight = Math.min(100, Math.max(0, baseLevel + netHostAdvantage));

  const yellowWaterHeightDisplay = yellowWaterHeight;
  const redWaterHeightDisplay = redWaterHeight;

  // شرط الفوز: الفريق صاحب منسوب الماء الأقل عند انتهاء الوقت (4 دقائق) هو الرابح
  const finalWinner = useMemo<'left' | 'right' | 'draw' | null>(() => {
    if (pkWinner) return pkWinner;
    if (secondsRemaining <= 0) {
      if (yellowWaterHeight < redWaterHeight) return 'left';
      if (redWaterHeight < yellowWaterHeight) return 'right';
      return 'draw';
    }
    return null;
  }, [pkWinner, secondsRemaining, yellowWaterHeight, redWaterHeight]);

  const hasEnded = useMemo(() => {
    return pkEnded || secondsRemaining <= 0;
  }, [pkEnded, secondsRemaining]);

  useEffect(() => {
    if (!hasEnded) {
      setLocalDismissed(false);
      setShowTransientOverlay(false);
      return;
    }

    if (hasEnded && !localDismissed) {
      if (finalWinner) {
        if (isMounted.current) setShowTransientOverlay(true);
        const timer = setTimeout(() => {
          if (isMounted.current) {
            setShowTransientOverlay(false);
            setLocalDismissed(true);
          }
        }, 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [hasEnded, localDismissed, finalWinner]);

  // 1. Dynamic Host Side Tracking: myHostSide = 'left' or 'right' or 'viewer'
  const myHostSide = useMemo<'left' | 'right' | 'viewer'>(() => {
    if (!currentUserUid) return 'left';
    const isUserHost = isHost || (hostUid && hostUid === currentUserUid);
    const isUserGuest = roomGuestUid && roomGuestUid === currentUserUid;

    if (isUserHost || isOnLeftTeam) return 'left';
    if (isUserGuest || isOnRightTeam) return 'right';

    if (!isHost && (!roomGuestUid || roomGuestUid !== currentUserUid) && !isOnLeftTeam && !isOnRightTeam) {
      return 'viewer';
    }
    return 'left';
  }, [currentUserUid, isHost, hostUid, roomGuestUid, isOnLeftTeam, isOnRightTeam]);

  // Fixed 30-second active window schedule (twice per challenge: 30-60s and 210-240s) - simultaneous for both sides
  const challengeElapsed = Math.max(0, 240 - secondsRemaining);
  const isInRound1 = challengeElapsed >= 30 && challengeElapsed < 60;
  const isInRound2 = challengeElapsed >= 210 && challengeElapsed <= 240;
  const isAnyActiveWindow = isInRound1 || isInRound2;

  let windowSecondsRemaining = 0;
  if (isInRound1) {
    windowSecondsRemaining = Math.max(0, Math.floor(60 - challengeElapsed));
  } else if (isInRound2) {
    windowSecondsRemaining = Math.max(0, Math.floor(240 - challengeElapsed));
  }

  // Vibration on window start or critical last 4 seconds
  useEffect(() => {
    if (isAnyActiveWindow && (windowSecondsRemaining === 30 || windowSecondsRemaining === 4)) {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
          window.navigator.vibrate([100, 50, 100]);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [isAnyActiveWindow, windowSecondsRemaining]);

  // Both Yellow and Red buttons activate and lock together simultaneously (تفعيل وقفل الطرفين معاً)
  const isYellowDisabled = !isAnyActiveWindow || hasEnded;
  const isRedDisabled = !isAnyActiveWindow || hasEnded;

  // Yellow Button (Left Side)
  const yellowBtnSide = 'right';
  const yellowBtnPositionClass = 'right-4';
  const yellowBtnShake = lastHit === 'left';

  // Red Button (Right Side)
  const redBtnSide = 'left';
  const redBtnPositionClass = 'left-4';
  const redBtnShake = lastHit === 'right';

  // Pipe heads dynamic positions (Fixed Left and Right)
  const yellowPipePositionClass = 'left-[25%] -translate-x-1/2';
  const redPipePositionClass = 'right-[25%] translate-x-1/2';

  // Real-time synchronization fallback: subscribe to the room document directly to ensure reactivity
  useEffect(() => {
    if (!roomID) return;
    const roomRef = doc(db, 'live_rooms', roomID);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
        if (document.hidden || !isMounted.current) return;
        if (!snapshot.exists()) {
            setHostWaterLevel(0);
            setGuestWaterLevel(0);
            prevHostWater.current = 0;
            prevGuestWater.current = 0;
            return;
        }
        const data = snapshot.data();
        if (data && isMounted.current) {
            if (!data.pkStatus || data.pkStatus === 'none' || data.pkStatus === '') {
                setHostWaterLevel(0);
                setGuestWaterLevel(0);
                prevHostWater.current = 0;
                prevGuestWater.current = 0;
                setPkStatus('none');
            } else {
                if (typeof data.blueScore === 'number') {
                    setHostWaterLevel(data.blueScore);
                    prevHostWater.current = data.blueScore;
                }
                
                if (typeof data.redScore === 'number') {
                    setGuestWaterLevel(data.redScore);
                    prevGuestWater.current = data.redScore;
                }
                
                setPkStatus(data.pkStatus);
            }
            setLeftWins(data.pkLeftWins ?? 0);
            setRightWins(data.pkRightWins ?? 0);
            setPkEnded(data.pkEnded ?? false);
            setPkWinner(data.pkWinner ?? null);

            // Fetch dynamic host name / avatars for 3D layout representation
            if (data.streamer) {
                setHostName(data.streamer.name || 'المضيف');
                if (data.streamer.avatar) {
                    setHostAvatar(data.streamer.avatar);
                } else {
                    setHostAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid || 'host'}`);
                }
            } else if (data.hostName) {
                setHostName(data.hostName);
                if (data.hostAvatar) setHostAvatar(data.hostAvatar);
            }

            if (data.activeGuests && Array.isArray(data.activeGuests)) {
                const guest = data.activeGuests.find((g: any) => !g.isInitiator);
                if (guest) {
                    setOpponentName(guest.user || guest.name || 'الخصم');
                    setOpponentAvatar(guest.avatar || guest.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guest.uid || 'guest'}`);
                }
            } else if (data.pkState?.opponent) {
                setOpponentName(data.pkState.opponent.name || 'الخصم');
                setOpponentAvatar(data.pkState.opponent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`);
            }

            if (data.playersOrder && Array.isArray(data.playersOrder)) {
                setPlayersOrder(data.playersOrder);
            } else {
                const defaultOrderList = [data.uid || ''];
                if (data.activeGuests && Array.isArray(data.activeGuests)) {
                    data.activeGuests.forEach((g: any) => {
                        if (g.uid && g.uid !== data.uid) {
                            defaultOrderList.push(g.uid);
                        }
                    });
                }
                setPlayersOrder(defaultOrderList);
            }
            if (data.uid) {
                setRoomHostUid(data.uid);
            }
            if (data.pkStartedAt) {
                setPkStartedAt(data.pkStartedAt);
            } else if (data.pkState?.pkStartedAt) {
                setPkStartedAt(data.pkState.pkStartedAt);
            }
            if (data.activeGuests && Array.isArray(data.activeGuests)) {
                const guest = data.activeGuests.find((g: any) => !g.isInitiator);
                setRoomGuestUid(guest && guest.uid ? guest.uid : '');
                
                // Double check backup role determination
                const hasMyUid = data.activeGuests.some((g: any) => g.uid === currentUserUid && !g.isInitiator);
                setIsActiveGuest(hasMyUid);
            } else {
                setRoomGuestUid('');
                setIsActiveGuest(false);
            }
        }
    });
    return () => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    };
  }, [roomID, currentUserUid]);

  // Victory or Time Expired check (Auto-Exit / End Challenge)
  useEffect(() => {
      // Strictly triggered on Timer Zero
      const isTimeExpired = pkStartedAt && secondsRemaining <= 0;
      
      if (!isTimeExpired) return;
      if (pkEnded) return; // Wait for database sync

      if (hostUid && hostUid === auth.currentUser?.uid) {
          console.log("PK Time Expired Triggered!");
          const roomRef = doc(db, 'live_rooms', roomID);
          
          let leftWinsIncrement = 0;
          let rightWinsIncrement = 0;
          let winner: 'left' | 'right' | 'draw' = 'draw';
          
          // Compare heights. Whoever has LESS water survived & wins!
          if (yellowWaterHeight < redWaterHeight) {
              leftWinsIncrement = 1;
              winner = 'left';
          } else if (redWaterHeight < yellowWaterHeight) {
              rightWinsIncrement = 1;
              winner = 'right';
          } else {
              winner = 'draw';
          }

          const updateData: any = {
              pkEnded: true,
              pkWinner: winner,
              lastInteractionAt: serverTimestamp()
          };
          
          if (leftWinsIncrement > 0) {
              updateData.pkLeftWins = increment(leftWinsIncrement);
          }
          if (rightWinsIncrement > 0) {
              updateData.pkRightWins = increment(rightWinsIncrement);
          }

          updateDoc(roomRef, updateData).catch(err => console.error("Time Expired End PK failed:", err));
      }
  }, [yellowWaterHeight, redWaterHeight, secondsRemaining, pkStartedAt, hostUid, roomID, pkEnded]);

  const handleEndChallenge = async (challengeId: string) => {
    try {
      // 1. Update status in Firebase so the other side knows it's ended
      const roomRef = doc(db, 'live_rooms', challengeId);
      await updateDoc(roomRef, {
        pkStatus: 'none',
        pkEnded: true,
        pkWinner: null,
        lastInteractionAt: serverTimestamp()
      });
      
      // 2. Call local close UI
      if (onClose) onClose();
    } catch (error) {
      console.error("Error ending challenge:", error);
    }
  };

  const handleResetChallenge = async () => {
    if (!roomID) return;
    try {
        const roomRef = doc(db, 'live_rooms', roomID);
        await updateDoc(roomRef, {
            pkStatus: 'none',
            blueScore: 0,
            redScore: 0,
            pkStartedAt: null,
            pkEnded: false,
            pkWinner: null,
            lastInteractionAt: serverTimestamp()
        });
        if (onClose) onClose();
    } catch (err) {
        console.error("Failed to reset/close PK challenge:", err);
    }
  };

  // Host-side automatic cleanup 10 seconds after the challenge ends
  useEffect(() => {
    if (pkEnded && hostUid && auth.currentUser?.uid === hostUid) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          handleResetChallenge();
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [pkEnded, hostUid]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCloseButton = () => {
    if (hostUid && currentUserUid === hostUid) {
      handleResetChallenge();
    } else {
      setLocalDismissed(true);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000]">
      {/* Real-time PK Results Overlay (Transient 5-second view) */}
      <AnimatePresence>
        {showTransientOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'absolute', 
              top: '35%', 
              left: 0, 
              width: '100%', 
              display: 'flex', 
              flexDirection: 'row', 
              justifyContent: 'space-around', 
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 999999
            }}
          >
            {finalWinner === 'draw' ? (
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <motion.div 
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }} 
                  transition={{ repeat: Infinity, duration: 1.5 }} 
                  className="text-[100px] mb-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >🤝</motion.div>
                <div className="text-[11px] font-medium text-white/80 italic tracking-[0.2em] uppercase">DRAW</div>
              </motion.div>
            ) : (
              <div className="w-full flex flex-row items-center justify-around px-12">
                 {/* Team Host Result (Left Side) */}
                 <motion.div 
                   initial={{ x: -100, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="flex flex-col items-center"
                 >
                   {finalWinner === 'left' ? <WinnerTrophy /> : <LoserFace />}
                 </motion.div>
                 
                 {/* Team Guest Result (Right Side) */}
                 <motion.div 
                   initial={{ x: 100, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="flex flex-col items-center"
                 >
                   {finalWinner === 'right' ? <WinnerTrophy /> : <LoserFace />}
                 </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent summary view is removed to allow returning to normal view immediately after transient overlay */}

      {/* Absolute Wins Label - Left (Top-left container showing Left Team's wins - Yellow side) */}
      <div className="absolute top-[10px] left-[10px] text-white font-mono text-[10px] font-black uppercase tracking-widest z-[120] pointer-events-none flex items-center gap-1.5 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Wins: {leftWins}
      </div>

      {/* Absolute Wins Label - Right (Top-right container showing Right Team's wins - Red side) */}
      <div className="absolute top-[10px] right-[10px] text-white font-mono text-[10px] font-black uppercase tracking-widest z-[120] pointer-events-none flex items-center gap-1.5 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Wins: {rightWins}
      </div>

      {/* 1. Global Water Overlays (Fixed layout: Left is Yellow, Right is Red) */}
      {isPKVisible && (
        <div className="absolute inset-0 overflow-hidden flex flex-row">
             {/* Yellow Water Side (Sender / Host Team - Left) */}
             <div className="relative h-full w-1/2">
                {/* Main Body with Yellow Gradient */}
                <div 
                   className="absolute left-0 bottom-0 w-full bg-gradient-to-t from-transparent via-yellow-500/5 to-amber-600/10 transition-all duration-700 ease-out border-r border-white/5 backdrop-blur-[0px] shadow-none"
                   style={{ height: `${yellowWaterHeightDisplay}%`, transform: 'translateZ(0)', willChange: 'height' }}
                >
                   {/* Energetic Surface Pulse */}
                   <motion.div 
                     animate={{ opacity: [0.2, 0.4, 0.2], scaleY: [1, 1.1, 1] }}
                     transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute top-0 left-0 w-full h-8 bg-gradient-to-t from-transparent to-yellow-500/20 -translate-y-1/2 blur-sm"
                     style={{ willChange: 'opacity, transform' }}
                   />

                   {/* Moving Surface Wave */}
                   <motion.div 
                     animate={{ x: [-10, 10, -10] }}
                     transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                     className="absolute top-0 left-0 w-full h-1 bg-white/40 blur-[1px] -translate-y-1/2"
                     style={{ willChange: 'transform' }}
                   />

                   {/* Percentage Counter */}
                   <div className="absolute top-[-18px] right-2 text-white font-mono text-[9px] font-bold flex items-center gap-1 whitespace-nowrap pointer-events-none opacity-90 drop-shadow-md">
                     <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
                     {Math.round(yellowWaterHeightDisplay)}%
                   </div>

                   {/* Water Surface Line - Clipped strictly within container */}
                   <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/50 blur-[0.5px] -translate-y-1/2 z-20" />
                   
                   {/* Surface Glow and Wave - Internal Only */}
                   <div className="absolute top-0 left-0 right-0 h-[8px] bg-gradient-to-b from-yellow-400/50 to-transparent shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-pulse z-10 overflow-hidden" />
                   <div className="absolute top-[-4px] left-0 right-0 h-[4px] bg-white/30 animate-surface-wave blur-[1px] overflow-hidden" />
                </div>
                
                {/* Bubbles rising through the space */}
                {bubbles.slice(0, 10 + (lastHit === yellowBtnSide ? bubbleBoost : Math.floor(bubbleBoost/5))).map((b, i) => (
                  <div 
                    key={i}
                    className="absolute bg-white/40 rounded-full animate-bubble pointer-events-none z-[5]"
                    style={{
                      left: `${b.left}%`,
                      width: `${b.size}px`,
                      height: `${b.size}px`,
                      '--bh': `${yellowWaterHeightDisplay}%`,
                      '--bd': `${b.bd}s`,
                      animationDelay: `${b.delay}s`,
                      boxShadow: '0 0 4px rgba(255,255,255,0.4)',
                      willChange: 'bottom, transform'
                    } as any}
                  />
                ))}
             </div>
             
             {/* Red Water Side (Receiver / Opponent Team - Right) */}
             <div className="relative h-full w-1/2">
                {/* Main Body with Red Gradient */}
                <div 
                   className="absolute left-0 bottom-0 w-full bg-gradient-to-t from-transparent via-red-500/5 to-rose-600/10 transition-all duration-700 ease-out border-l border-white/5 backdrop-blur-[0px] shadow-none"
                   style={{ height: `${redWaterHeightDisplay}%`, transform: 'translateZ(0)', willChange: 'height' }}
                >
                   {/* Energetic Surface Pulse */}
                   <motion.div 
                     animate={{ opacity: [0.15, 0.35, 0.15], scaleY: [1, 1.1, 1] }}
                     transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute top-0 left-0 w-full h-8 bg-gradient-to-t from-transparent to-red-500/20 -translate-y-1/2 blur-sm"
                     style={{ willChange: 'opacity, transform' }}
                   />

                   {/* Moving Surface Wave */}
                   <motion.div 
                     animate={{ x: [10, -10, 10] }}
                     transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
                     className="absolute top-0 right-0 w-full h-1 bg-white/30 blur-[1px] -translate-y-1/2"
                     style={{ willChange: 'transform' }}
                   />

                   {/* Percentage Counter */}
                   <div className="absolute top-[-18px] left-2 text-white font-mono text-[9px] font-bold flex items-center gap-1 whitespace-nowrap pointer-events-none opacity-90 drop-shadow-md">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                     {Math.round(redWaterHeightDisplay)}%
                   </div>

                   {/* Water Surface Line - Clipped strictly within container */}
                   <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/50 blur-[0.5px] -translate-y-1/2 z-20" />

                   {/* Surface Glow and Wave - Internal Only */}
                   <div className="absolute top-0 left-0 right-0 h-[8px] bg-gradient-to-b from-red-400/50 to-transparent shadow-[0_0_15px_rgba(248,113,113,0.4)] animate-pulse z-10 overflow-hidden" />
                   <div className="absolute top-[-4px] left-0 right-0 h-[4px] bg-white/30 animate-surface-wave blur-[1px] overflow-hidden" />
                </div>

                {/* Bubbles rising through the space */}
                {bubbles.slice(0, 10 + (lastHit === redBtnSide ? bubbleBoost : Math.floor(bubbleBoost/5))).map((b, i) => (
                  <div 
                    key={i}
                    className="absolute bg-white/40 rounded-full animate-bubble pointer-events-none z-[5]"
                    style={{
                      left: `${b.left}%`,
                      width: `${b.size}px`,
                      height: `${b.size}px`,
                      '--bh': `${redWaterHeightDisplay}%`,
                      '--bd': `${b.bd}s`,
                      animationDelay: `${b.delay}s`,
                      boxShadow: '0 0 4px rgba(255,255,255,0.4)',
                      willChange: 'bottom, transform'
                    } as any}
                  />
                ))}
             </div>
        </div>
      )}

      {/* 2. Vertical Measurement Line */}
      {isPKVisible && (
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/40 -translate-x-1/2 flex flex-col justify-between items-center py-2 z-[110]">
          {/* Depth Ticks */}
          {Array.from({ length: 100 }).map((_, i) => {
            const isTenth = i % 10 === 0;
            const isFifth = i % 5 === 0 && !isTenth;
            return (
              <div 
                key={i} 
                className={`bg-white/70 drop-shadow-md ${isTenth ? 'w-4 h-[2px]' : isFifth ? 'w-3 h-[1px]' : 'w-1.5 h-[1px] opacity-60'}`} 
              />
            );
          })}
        </div>
      )}

      {/* 3. Bottom Pipe & Controls */}
      <div className="absolute top-[100%] left-0 w-full flex flex-col items-center pointer-events-none z-[45]">
          {/* Timer and Pipeline shown when active */}
          {isPKVisible && (
            <div className="relative w-full h-[40px] bg-gradient-to-b from-[#2a303c] via-[#1d232a] to-[#0d1015] border-y border-[#3b4252] shadow-[0_15px_30px_rgba(0,0,0,0.8)] flex items-center justify-center z-[80]">
                 
                 {/* Internal pipe highlights */}
                 <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10" />
                 <div className="absolute top-1 left-0 right-0 h-[10px] bg-gradient-to-b from-white/10 to-transparent" />
                 
                 {/* Left Upward Pipe Head (Yellow) */}
                 <div className={`absolute ${yellowPipePositionClass} bottom-[95%] w-[42px] h-[30px] bg-gradient-to-b from-[#2a303c] to-[#1d232a] border-x border-t border-[#3b4252] rounded-t-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] pointer-events-none z-0`}>
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-yellow-400/90 shadow-[0_0_8px_rgba(250,204,21,1)]" />
                 </div>
                 
                 {/* Right Upward Pipe Head (Red) */}
                 <div className={`absolute ${redPipePositionClass} bottom-[95%] w-[42px] h-[30px] bg-gradient-to-b from-[#2a303c] to-[#1d232a] border-x border-t border-[#3b4252] rounded-t-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] pointer-events-none z-0`}>
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-red-500/90 shadow-[0_0_8px_rgba(239,68,68,1)]" />
                 </div>

                 {/* Water Track Inside the Horizontal Pipe */}
                 <div className="absolute top-1/2 -translate-y-1/2 px-[3px] left-[20%] right-[20%] h-[16px] bg-[#050608] rounded-full overflow-hidden flex flex-row border-y border-[#2e3440] shadow-[inset_0_4px_10px_rgba(0,0,0,1)] pointer-events-none z-10">
                   {/* Left Water (Yellow) */}
                   <div 
                     className="h-full bg-gradient-to-r from-black via-yellow-700 to-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)] origin-left"
                     style={{ flexBasis: `${Math.min(100, Math.max(0, 50 + netHostAdvantage))}%`, transition: 'flex-basis 0.3s ease-out' }}
                   />
                   <div className="w-[1px] h-full bg-white/10 z-10 shrink-0" />
                   {/* Right Water (Red) */}
                   <div 
                     className="h-full bg-gradient-to-l from-black via-red-700 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] origin-right"
                     style={{ flexBasis: `${Math.min(100, Math.max(0, 50 - netHostAdvantage))}%`, transition: 'flex-basis 0.3s ease-out' }}
                   />
                 </div>

                 {/* Left Tap Button (Yellow - أصفر) - Below Left Screen / Host */}
                 <div className={`absolute ${yellowBtnPositionClass} top-1/2 -translate-y-1/2 z-20 transition-all duration-200 pointer-events-auto`}>
                    <button 
                       id="pk-tap-yellow-btn"
                       type="button"
                       disabled={isYellowDisabled}
                       onClick={() => !isYellowDisabled && onTap('left')}
                       aria-label="Yellow Challenge Tap Button"
                       className={`w-[54px] h-[54px] rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 border-[2px] border-yellow-200 flex items-center justify-center relative select-none opacity-100 ${
                         isYellowDisabled 
                           ? 'cursor-not-allowed select-none pointer-events-none shadow-none' 
                           : 'cursor-pointer hover:scale-105 active:scale-90 ring-2 ring-yellow-400 animate-pulse shadow-[0_0_24px_rgba(250,204,21,0.8)]'
                       } ${yellowBtnShake ? 'animate-tap-shake animate-tap-glow' : ''}`}
                    >
                       <span className="text-white font-black text-xl drop-shadow-md pb-[2px] select-none">⚡</span>
                       {!isYellowDisabled && (
                         <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded font-mono font-black shadow-md whitespace-nowrap ${
                           windowSecondsRemaining <= 4 
                             ? 'bg-red-600 text-white text-[10px] border border-white animate-bounce animate-pulse' 
                             : 'bg-black/90 text-white text-[9px] border border-yellow-400/50'
                         }`}>
                           {windowSecondsRemaining}s
                         </div>
                       )}
                       {isYellowDisabled && (
                         <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/85 border border-white/80 shadow-[0_2px_5px_rgba(0,0,0,0.6)] flex items-center justify-center z-30 pointer-events-none">
                           <Lock className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                         </div>
                       )}
                    </button>
                 </div>

                 {/* Centered Timer ON the pipe */}
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0c10] px-4 py-1.5 rounded-md border border-[#3b4252] shadow-[0_0_20px_rgba(0,0,0,0.9)] z-20 flex items-center justify-center pointer-events-none">
                   <span className="text-white drop-shadow-md font-mono text-[12px] font-black tracking-wider">{formatTime(Math.max(0, secondsRemaining))}</span>
                 </div>

                 {/* Right Tap Button (Red - أحمر) - Below Right Screen / Opponent */}
                 <div className={`absolute ${redBtnPositionClass} top-1/2 -translate-y-1/2 z-20 transition-all duration-200 pointer-events-auto`}>
                    <button 
                       id="pk-tap-red-btn"
                       type="button"
                       disabled={isRedDisabled}
                       onClick={() => !isRedDisabled && onTap('right')}
                       aria-label="Red Challenge Tap Button"
                       className={`w-[54px] h-[54px] rounded-full bg-gradient-to-bl from-rose-400 via-red-600 to-red-700 border-[2px] border-red-300 flex items-center justify-center relative select-none opacity-100 ${
                         isRedDisabled 
                           ? 'cursor-not-allowed select-none pointer-events-none shadow-none' 
                           : 'cursor-pointer hover:scale-105 active:scale-90 ring-2 ring-rose-400 animate-pulse shadow-[0_0_24px_rgba(239,68,68,0.8)]'
                       } ${redBtnShake ? 'animate-tap-shake animate-tap-glow' : ''}`}
                    >
                       <span className="text-white font-black text-xl drop-shadow-md pb-[2px] select-none">🔥</span>
                       {!isRedDisabled && (
                         <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded font-mono font-black shadow-md whitespace-nowrap ${
                           windowSecondsRemaining <= 4 
                             ? 'bg-red-600 text-white text-[10px] border border-white animate-bounce animate-pulse' 
                             : 'bg-black/90 text-white text-[9px] border border-rose-400/50'
                         }`}>
                           {windowSecondsRemaining}s
                         </div>
                       )}
                       {isRedDisabled && (
                         <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/85 border border-white/80 shadow-[0_2px_5px_rgba(0,0,0,0.6)] flex items-center justify-center z-30 pointer-events-none">
                           <Lock className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                         </div>
                       )}
                    </button>
                 </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default WaterPKChallenge;
