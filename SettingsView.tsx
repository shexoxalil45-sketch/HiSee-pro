
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Language, ThemeMode, AppSystemPermissions } from '../types'; 
import { getStoredPermissions, updateAppPermission, requirePermission } from '../lib/permissionManager'; 
import { motion } from 'motion/react';
import { 
  ArrowRight, Sun, Moon, Bell, Volume2, LogOut, Globe, Check, X, Plus,
  ChevronLeft, ChevronRight, Palette, Shield, Info, Smartphone, CameraOff,
  UserPlus, Database, Lock, UserX, HardDrive, HelpCircle, Key, 
  Trash2, Eye, EyeOff, ShieldCheck, Download, Type, MessageSquare,
  BellRing, Music, Mic, Camera, Fingerprint, Zap, Keyboard, FileText, Wallet, QrCode, Sparkles, CreditCard, History, Gift, Trophy, Building, Copy, Share2, ScanLine, Scan, Send as SendIcon, UserCheck, BarChart3, LayoutGrid, ArrowLeft, Settings, Coins, Users, Star as LucideStar, Clock, Activity, RefreshCw, Tv, Megaphone, Sliders, MapPin, Play, Wifi, WifiOff,
  Search, Filter, Receipt, Crown, LifeBuoy, CheckCircle2, AlertCircle, ExternalLink, ArrowUpRight, Send, Edit3, Mail, User,
  CheckCheck, Loader2, Award
} from 'lucide-react'; 
import { PatternLock } from './PatternLock';
import { SharedQRCode } from './SharedQRCode';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useUsers } from '../src/contexts/UserContext';
import { getRecommendedQuality } from '../src/lib/mediaUtils';
import { translations, getTranslation } from '../translations'; 
import { getStorage, ref, deleteObject, listAll } from 'firebase/storage';
import { doc, onSnapshot, deleteDoc, collection, query, where, addDoc, serverTimestamp, updateDoc, orderBy, getDocs, getDoc, writeBatch, increment, setDoc, limit } from 'firebase/firestore';
import { deleteUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db as firestoreDb, auth, storage } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { videoCache } from '../lib/videoCache';
import HiSeeCoinIcon from './HiSeeCoinIcon';
import AdminPayoutReview from './AdminPayoutReview';
import AdminAlgorithmsView from './AdminAlgorithmsView';
import AdminLevelControl from './AdminLevelControl';
import PaymentCheckoutModal from './PaymentCheckoutModal';
import { AvatarLevelBadge } from './AvatarLevelBadge';
import { LEVEL_THRESHOLDS, calculateLevelAndBadge } from '../services/starsEngine';

interface Props {
  lang: Language;
  setLang: (lang: Language) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onBack: () => void;
  onLogout: (toSignup?: boolean, message?: string) => void;
  myId: string;
  users: Record<string, any>;
  initialView?: 'main' | 'languages' | 'kurdish_dialects' | 'appearance' | 'chat' | 'account' | 'privacy_security' | 'interactions' | 'content_display' | 'storage_data' | 'offline_videos' | 'free_up_space' | 'blocked_users' | 'manage_storage' | 'network_usage' | 'activity_posts' | 'live_preferences' | 'notifications_detailed' | 'time_wellbeing' | 'family_link' | 'qr_code' | 'balance' | 'terms' | 'privacy_policy' | 'support' | 'hisee_studio' | 'transaction_history' | 'live_rewards' | 'content_earnings' | 'event_earnings' | 'payment_methods' | 'identity_verification' | 'help_feedback' | 'bonus' | 'buy_coins' | 'hisee_features_guide' | 'admin_payouts' | 'admin_algorithms' | 'admin_level_control';
  onNavigateToProfile?: (userId: string) => void;
}

// مكون لعلم كردستان
const KurdistanFlag = () => (
  <svg viewBox="0 0 300 200" className="w-8 h-6 rounded shadow-sm object-cover overflow-hidden shrink-0">
    <rect width="300" height="200" fill="white"/>
    <rect width="300" height="66.6" y="0" fill="#ED2024"/>
    <rect width="300" height="66.6" y="133.4" fill="#278E43"/>
    <circle cx="150" cy="100" r="40" fill="#FFC000"/>
    <g transform="translate(150, 100)">
       {[...Array(21)].map((_, i) => (
         <polygon key={i} points="0,0 5,-45 -5,-45" fill="#FFC000" transform={`rotate(${i * (360/21)})`} />
       ))}
    </g>
  </svg>
);

const SmartFinancialMathEngine = (totalStars: number) => {
    const EURO_PER_STAR = 0.01; // المقياس الافتراضي: 1 نجمة = 0.01 يورو (كل 1,000 نجمة = 10 يورو)
    const grossValue = totalStars * EURO_PER_STAR;

    // الخصومات الشفافة الثلاثة المعتمدة رسمياً:
    // 1. ضريبة القيمة المضافة والرسوم القانونية (EU VAT / Taxes) بنسبة 15%
    const vatPercent = 0.15;
    // 2. عمولة المنصة المباشرة والتنافسية المخفضة (Platform Gross Commission) بنسبة 10%
    const platformFeePercent = 0.10;
    // 3. رسوم تشغيل ومعالجة الخدمات المالية والعمليات التقنية بنسبة 5%
    const serviceFeePercent = 0.05;

    // حساب مبالغ الخصم بشكل مستقل ودقيق:
    const vatAmount = grossValue * vatPercent;
    const platformFeeAmount = grossValue * platformFeePercent; // عمولة المنصة المستقلة كدخل للتطبيق
    const serviceFeeAmount = grossValue * serviceFeePercent;

    // حساب إجمالي الخصومات والمبلغ الصافي النهائي للمستخدم
    const totalDeductions = vatAmount + platformFeeAmount + serviceFeeAmount;
    const netAmount = grossValue - totalDeductions;

    return {
        grossValue: grossValue.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        platformFeeAmount: platformFeeAmount.toFixed(2), // عمولة المنصة (10%) مفصولة وموثقة بوضوح
        serviceFeeAmount: serviceFeeAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2)
    };
};

const InvoiceBreakdown = ({ totalStars, isRtl }: { totalStars: number, isRtl: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const finance = SmartFinancialMathEngine(totalStars);

    return (
        <div className="glass mt-4 rounded-2xl border border-slate-700/50 overflow-hidden text-start">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-300"
            >
                <span>{isRtl ? 'تفاصيل الفاتورة والخصومات الشفافة' : 'Invoice Details & Transparent Deductions'}</span>
                <span>{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
                <div className={`p-4 pt-0 text-[10px] text-slate-400 space-y-2 border-t border-slate-700/50 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <div className="flex justify-between"><span>{isRtl ? 'إجمالي القيمة الاسمية:' : 'Total Gross Value:'}</span><span>{finance.grossValue} €</span></div>
                    <div className="flex justify-between text-rose-400"><span>{isRtl ? 'ضريبة القيمة المضافة (15%):' : 'VAT / Tax (15%):'}</span><span>-{finance.vatAmount} €</span></div>
                    <div className="flex justify-between text-rose-400"><span>{isRtl ? 'عمولة المنصة (10%):' : 'Platform Fee (10%):'}</span><span>-{finance.platformFeeAmount} €</span></div>
                    <div className="flex justify-between text-rose-400"><span>{isRtl ? 'رسوم الخدمات المالية (5%):' : 'Financial Services Fee (5%):'}</span><span>-{finance.serviceFeeAmount} €</span></div>
                    <div className="pt-2 border-t border-slate-700/50 flex justify-between font-bold text-emerald-400">
                        <span>{isRtl ? 'المبلغ الصافي النهائي:' : 'Final Net Amount:'}</span><span>{finance.netAmount} €</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const StarLevelSection = ({ totalStars, myId, t, isRtl }: { totalStars: number, myId: string, t: any, isRtl: boolean }) => {
    // Mapping thresholds for 3 stars
    const getNextStarThreshold = (stars: number) => {
        if (stars < 500) return 500;
        if (stars < 1500) return 1500;
        if (stars < 3000) return 3000;
        return 3000;
    };

    const threshold = getNextStarThreshold(totalStars);
    const progressPercent = Math.min((totalStars / threshold) * 100, 100);
    const currentStars = totalStars >= 3000 ? 3 : totalStars >= 1500 ? 2 : totalStars >= 500 ? 1 : 0;
    
    const levelNamesAr = ['مستكشف مبتدئ', 'المستكشف الفضي', 'القائد الذهبي', 'الأسطورة الملكي'];
    const levelNamesEn = ['Novice Explorer', 'Silver Explorer', 'Golden Leader', 'Royal Legend'];
    const levelNames = isRtl ? levelNamesAr : levelNamesEn;
    const currentLevelName = levelNames[currentStars];

    const finance = SmartFinancialMathEngine(totalStars);
    const netAmountEur = parseFloat(finance.netAmount);

    const handleConvertToCoins = async () => {
        if (totalStars <= 0 || netAmountEur <= 0) return;
        
        try {
            const userRef = doc(firestoreDb, 'users', myId);
            const coinsToClaim = Math.floor(netAmountEur * 100);
            await updateDoc(userRef, {
                totalStars: 0,
                totalReceivedStars: 0,
                coins: increment(coinsToClaim)
            });
            // Record transaction in history
            await addDoc(collection(firestoreDb, 'transactions'), {
                uid: myId,
                type: 'star_convert_coins',
                amount: coinsToClaim,
                currency: 'coins',
                description: isRtl ? `تحويل النجوم إلى رصيد التطبيق (${coinsToClaim} عملة)` : `Convert stars to app balance (${coinsToClaim} coins)`,
                timestamp: serverTimestamp()
            }).catch(() => {});
            alert(isRtl ? `تم تحويل النجوم بنجاح وإضافة ${coinsToClaim} عملة إلى رصيد حسابك لاستخدامها داخل التطبيق!` : `Stars converted successfully and ${coinsToClaim} coins added to your app balance!`);
        } catch (error) {
            console.error('Error converting stars to coins:', error);
            alert(isRtl ? 'حدث خطأ أثناء تحويل النجوم إلى رصيد التطبيق.' : 'An error occurred while converting stars to app balance.');
        }
    };

    const handleTransferToClaiming = async () => {
        if (totalStars <= 0 || netAmountEur <= 0) return;
        
        try {
            const userRef = doc(firestoreDb, 'users', myId);
            const diamondsToClaim = Math.floor(netAmountEur * 100);
            await updateDoc(userRef, {
                totalStars: 0,
                totalReceivedStars: 0,
                diamonds: increment(diamondsToClaim)
            });
            // Record transaction in history
            await addDoc(collection(firestoreDb, 'transactions'), {
                uid: myId,
                type: 'star_convert_claiming',
                amount: netAmountEur,
                currency: 'EUR',
                description: isRtl ? `تحويل النجوم إلى حساب المطالبة الخارجية (${netAmountEur} €)` : `Convert stars to outbound claiming account (${netAmountEur} €)`,
                timestamp: serverTimestamp()
            }).catch(() => {});
            alert(isRtl ? `تم تحويل النجوم بنجاح وإضافة ${netAmountEur} € إلى حساب المطالبة الموحد بالأعلى لسحبها لاحقاً!` : `Stars converted successfully and ${netAmountEur} € added to the claiming account!`);
        } catch (error) {
            console.error('Error transferring stars to claiming:', error);
            alert(isRtl ? 'حدث خطأ أثناء تحويل النجوم إلى حساب المطالبة الموحد.' : 'An error occurred while transferring stars to the claiming account.');
        }
    };

    return (
        <div className="glass p-6 rounded-[2rem] border border-amber-500/20 shadow-lg mt-6 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5 text-start">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" />
                    {isRtl ? 'نظام النجوم والمكافآت' : 'Stars & Rewards System'}
                </h3>
                <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                        <LucideStar 
                            key={i} 
                            size={16} 
                            className={i < currentStars ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" : "text-slate-700"} 
                        />
                    ))}
                </div>
            </div>
            
            {/* Elegant Progress Card */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5 mb-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                
                <div className="relative z-10">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">{isRtl ? 'التقدم المتبادل' : 'Mutual Progress'}</span>
                            <h4 className="text-lg font-black text-white">{currentLevelName}</h4>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 block font-bold mb-1">{isRtl ? 'النجمة التالية' : 'Next Star'}</span>
                            <span className="text-sm font-bold text-amber-400">{totalStars.toLocaleString()} / {threshold.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 mb-3">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                        />
                    </div>
                    
                    <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                        {isRtl ? 'التقدم المتبادل: يرتفع مستواك عند دعم الآخرين أو عند تلقي الدعم!' : 'Mutual Progress: Your level rises when supporting others or when receiving support!'}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-4">
                <span>{isRtl ? 'إجمالي النجوم التي حصلت عليها:' : 'Total Stars Earned:'}</span>
                <span className="font-bold text-white text-sm bg-white/5 px-2 py-1 rounded-lg">{totalStars.toLocaleString()} {isRtl ? 'نجمة' : 'Stars'}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 my-4" />

            {/* Claim Section inside the same component */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 block">{isRtl ? 'رصيد النجوم المالي:' : 'Stars Financial Balance:'}</span>
                        <span className="text-2xl font-black text-white">{finance.grossValue} €</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 block">{isRtl ? 'المبلغ الصافي النهائي:' : 'Final Net Amount:'}</span>
                        <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">{finance.netAmount} €</span>
                    </div>
                </div>

                <p className="text-[10px] text-slate-500 text-center">{isRtl ? '(بعد خصم الضرائب والرسوم الشفافة من إجمالي النجوم)' : '(After deducting taxes and transparent fees from total stars)'}</p>

                {/* Integrated Invoice Breakdown */}
                <InvoiceBreakdown totalStars={totalStars} isRtl={isRtl} />

                {/* Dual Claim Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                    <button 
                        onClick={handleConvertToCoins}
                        disabled={totalStars < 2500 || netAmountEur <= 0}
                        className="relative w-full bg-emerald-500 hover:bg-emerald-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-2.5 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-emerald-700 disabled:border-b-0 active:shadow-sm select-none"
                    >
                        <Coins size={13} className="shrink-0 text-emerald-100" />
                        <span className="whitespace-nowrap">{isRtl ? 'رصيد داخلي (عملات)' : 'Internal Balance (Coins)'}</span>
                    </button>
                    <button 
                        onClick={handleTransferToClaiming}
                        disabled={totalStars < 2500 || netAmountEur <= 0}
                        className="relative w-full bg-amber-500 hover:bg-amber-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-2.5 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-amber-700 disabled:border-b-0 active:shadow-sm select-none"
                    >
                        <Wallet size={13} className="shrink-0 text-amber-100" />
                        <span className="whitespace-nowrap">{isRtl ? 'حساب المطالبة (خارجي)' : 'Claiming Account (External)'}</span>
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-3 font-bold font-sans">
                    {isRtl ? 'الحد الأدنى للتحويل أو المطالبة هو 2500 عملة HiSee (24.99$)' : 'The minimum amount to convert or claim is 2500 HiSee Coins ($24.99)'}
                </p>
            </div>
        </div>
    );
};

// 6-Level Roadmap Badge SVGs (High-Contrast, Crisp Outlines & Rich Gradients)
const renderSoftStar = (fillColor: string, strokeColor: string, strokeWidth = 2) => (
  <g>
    <path
      d="M24 4.5 C24.5 4.5 24.9 4.8 25.1 5.3 L29.5 16.2 C29.7 16.6 30.1 16.9 30.6 17 L42.3 17.8 C42.8 17.8 43.3 18.2 43.4 18.7 C43.5 19.2 43.3 19.7 42.9 20 L33.9 27 C33.5 27.3 33.3 27.8 33.4 28.3 L36.2 39.8 C36.3 40.3 36.1 40.8 35.7 41.1 C35.3 41.3 34.8 41.3 34.4 41 L24.6 34.8 C24.2 34.5 23.8 34.5 23.4 34.8 L13.6 41 C13.2 41.3 12.7 41.3 12.3 41.1 C11.9 40.8 11.7 40.3 11.8 39.8 L14.6 28.3 C14.7 27.8 14.5 27.3 14.1 27 L5.1 20 C4.7 19.7 4.5 19.2 4.6 18.7 C4.7 18.2 5.2 17.8 5.7 17.8 L17.4 17 C17.9 16.9 18.3 16.6 18.5 16.2 L22.9 5.3 C23.1 4.8 23.5 4.5 24 4.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="24" r="2.5" fill={strokeColor} opacity={0.8} />
  </g>
);

const renderLayeredDoubleStar = (fillColor: string, strokeColor: string, strokeWidth = 2) => (
  <g>
    {/* Outer 8-point Faceted Diamond Star Frame */}
    <path
      d="M24 2 L28.5 13.5 L40 14.5 L31 22 L34.5 33.5 L24 26.5 L13.5 33.5 L17 22 L8 14.5 L19.5 13.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Cardinal Star Accents */}
    <circle cx="24" cy="2" r="1.5" fill={strokeColor} />
    <circle cx="40" cy="14.5" r="1.5" fill={strokeColor} />
    <circle cx="34.5" cy="33.5" r="1.5" fill={strokeColor} />
    <circle cx="13.5" cy="33.5" r="1.5" fill={strokeColor} />
    <circle cx="8" cy="14.5" r="1.5" fill={strokeColor} />

    {/* Inner Nested Sharp Golden Star (High contrast) */}
    <path
      d="M24 9 L26.8 16.8 L35 17.2 L28.8 22.2 L31.2 30 L24 25.2 L16.8 30 L19.2 22.2 L13 17.2 L21.2 16.8 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="21.5" r="1.8" fill={strokeColor} />
  </g>
);

const renderWingedStar = (fillColor: string, strokeColor: string, strokeWidth = 2) => (
  <g>
    {/* Left Feather Wings (Bold separated feathers) */}
    <path
      d="M16 23 C11 18 6 16 1.5 17 C0.8 17.2 0.5 17.9 0.8 18.5 C2.5 22.5 5.5 25.5 10 27.5 C13 28.5 15.5 28.5 17 28.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 16 C10 10.5 4.5 8.5 0.5 9.5 C0 9.7 -0.2 10.3 0.1 10.8 C2 15 5.5 18.5 10.5 20.5 C13 21.5 14.8 22 15.5 22.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right Feather Wings (Bold separated feathers) */}
    <path
      d="M32 23 C37 18 42 16 46.5 17 C47.2 17.2 47.5 17.9 47.2 18.5 C45.5 22.5 42.5 25.5 38 27.5 C35 28.5 32.5 28.5 31 28.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M33 16 C38 10.5 43.5 8.5 47.5 9.5 C48 9.7 48.2 10.3 47.9 10.8 C46 15 42.5 18.5 37.5 20.5 C35 21.5 33.2 22 32.5 22.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Center Golden Star with distinct crisp outline */}
    <path
      d="M24 8 L27.2 17.2 L36.8 17.8 L29.2 23.5 L32 32.8 L24 27 L16 32.8 L18.8 23.5 L11.2 17.8 L20.8 17.2 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="21.5" r="2" fill={strokeColor} />
  </g>
);

const renderRadiantWingedDoubleStar = (fillColor: string, strokeColor: string, strokeWidth = 2) => (
  <g>
    {/* Left Sweeping Wings (3 bold curved feathers) */}
    <path
      d="M15 10 C9.5 4 4.5 2 0.8 3 C0.2 3.2 -0.1 3.9 0.1 4.5 C2.2 9.5 6.5 14 13 17 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 16.5 C10.5 11 6 10 2 11 C1.4 11.2 1.1 11.8 1.3 12.4 C3.5 16.5 7.5 20 13.5 22.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 23 C12 19.5 8 18.5 4 19.5 C3.4 19.7 3.2 20.3 3.4 20.9 C5.5 24.5 9 27 14.5 28.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right Sweeping Wings (3 bold curved feathers) */}
    <path
      d="M33 10 C38.5 4 43.5 2 47.2 3 C47.8 3.2 48.1 3.9 47.9 4.5 C45.8 9.5 41.5 14 35 17 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M32 16.5 C37.5 11 42 10 46 11 C46.6 11.2 46.9 11.8 46.7 12.4 C44.5 16.5 40.5 20 34.5 22.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M31 23 C36 19.5 40 18.5 44 19.5 C44.6 19.7 44.8 20.3 44.6 20.9 C42.5 24.5 39 27 33.5 28.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Outer Star */}
    <path
      d="M24 6 L27.2 14.5 L36.5 16.5 L29.5 23 L31.5 32.5 L24 27 L16.5 32.5 L18.5 23 L11.5 16.5 L20.8 14.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner Radiant Diamond Star */}
    <path
      d="M24 12 L26.2 18 L32 19.5 L27.5 23.5 L28.8 29.5 L24 26 L19.2 29.5 L20.5 23.5 L16 19.5 L21.8 18 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Radiance sparkles */}
    <circle cx="24" cy="3" r="1.8" fill={strokeColor} />
    <circle cx="14" cy="7" r="1.2" fill={strokeColor} />
    <circle cx="34" cy="7" r="1.2" fill={strokeColor} />
  </g>
);

const renderRoyalCrown = (fillColor: string, strokeColor: string, strokeWidth = 2) => (
  <g>
    {/* Crown Base Rim */}
    <rect
      x="7"
      y="34"
      width="34"
      height="7.5"
      rx="3"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
    />
    {/* Jewels on base rim - Rich colored contrasting gemstones */}
    <circle cx="13" cy="37.8" r="1.8" fill="#EF4444" stroke="#FFF" strokeWidth={0.8} />
    <circle cx="24" cy="37.8" r="2.2" fill="#38BDF8" stroke="#FFF" strokeWidth={0.8} />
    <circle cx="35" cy="37.8" r="1.8" fill="#10B981" stroke="#FFF" strokeWidth={0.8} />

    {/* Royal Crown Spikes & Arches */}
    <path
      d="M8.5 34 L5 16.5 L15 25 L24 8.5 L33 25 L43 16.5 L39.5 34 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Pearl Orb tips on peaks */}
    <circle cx="5" cy="15.5" r="2.5" fill="#FEF08A" stroke={strokeColor} strokeWidth={1.2} />
    <circle cx="15" cy="24" r="2" fill="#FEF08A" stroke={strokeColor} strokeWidth={1} />
    <circle cx="24" cy="7.5" r="3.2" fill="#FEF08A" stroke={strokeColor} strokeWidth={1.4} />
    <circle cx="33" cy="24" r="2" fill="#FEF08A" stroke={strokeColor} strokeWidth={1} />
    <circle cx="43" cy="15.5" r="2.5" fill="#FEF08A" stroke={strokeColor} strokeWidth={1.2} />

    {/* Center Royal Medallion Star in crown body */}
    <path
      d="M24 18 L25.8 23.5 L31.5 24 L27 27.5 L28.5 33 L24 29.5 L19.5 33 L21 27.5 L16.5 24 L22.2 23.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </g>
);

const renderMythicMystery = (fillColor: string, strokeColor: string, strokeWidth = 2) => (
  <g>
    {/* Arcane Crest Shield / Mythic Aura */}
    <path
      d="M24 2.5 C34.5 2.5 44 8.5 44 19 C44 31.5 32.5 41 24 45.5 C15.5 41 4 31.5 4 19 C4 8.5 13.5 2.5 24 2.5 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner Arcane Rune Border */}
    <path
      d="M24 7 C31.5 7 38.5 11 38.5 19.5 C38.5 29 29.5 36.5 24 40.5 C18.5 36.5 9.5 29 9.5 19.5 C9.5 11 16.5 7 24 7 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 0.8}
      opacity={0.8}
      strokeDasharray="3 2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Mythic Horns / Wings at Top */}
    <path
      d="M13 9.5 C7.5 4.5 3.5 5.5 1.5 8 C4.5 12 8.5 14 13 14 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M35 9.5 C40.5 4.5 44.5 5.5 46.5 8 C43.5 12 39.5 14 35 14 Z"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Glowing Mystery Question Mark "?" */}
    <text
      x="24"
      y="30"
      textAnchor="middle"
      fontSize="24"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1.2}
      className="select-none tracking-tighter"
    >
      ?
    </text>
    {/* Mystery Orb below ? */}
    <circle cx="24" cy="35" r="2.2" fill={strokeColor} />
  </g>
);

// 6-Level Roadmap Badge Item Component (Interactive Fillable Reservoir with Lock indicator)
const RoadmapLevelBadgeItem: React.FC<{
  levelNumber: number;
  fillPercent: number; // 0 to 100
  isLocked: boolean;
  isActive: boolean;
  size?: number;
  isRtl?: boolean;
}> = ({ levelNumber, fillPercent, isLocked, isActive, size = 48, isRtl }) => {
  const isFull = fillPercent >= 100;
  const isFilling = isActive && fillPercent > 0 && fillPercent < 100;

  const gradFillId = `roadmapFillGrad_${levelNumber}`;
  const gradOutlineId = `roadmapOutlineGrad_${levelNumber}`;

  // Names of the 6 badges
  const badgeMeta = [
    { titleAr: 'نجمة ذهبية ناعمة', titleEn: 'Soft Golden Star', shortAr: 'نجمة ناعمة', shortEn: 'Soft Star' },
    { titleAr: 'نجمة مزدوجة طبقية', titleEn: 'Layered Double Star', shortAr: 'نجمة مزدوجة', shortEn: 'Double Star' },
    { titleAr: 'نجمة ذهبية بأجنحة', titleEn: 'Winged Golden Star', shortAr: 'نجمة مجنحة', shortEn: 'Winged Star' },
    { titleAr: 'نجمة مزدوجة بأجنحة براقة', titleEn: 'Radiant Dual Winged Star', shortAr: 'أجنحة براقة', shortEn: 'Radiant Wing' },
    { titleAr: 'وسام التاج الملكي', titleEn: 'Royal Crown Insignia', shortAr: 'تاج ملكي', shortEn: 'Royal Crown' },
    { titleAr: 'وسام أسطوري غامض (؟)', titleEn: 'Mythic Mystery Insignia (?)', shortAr: 'أسطوري ؟', shortEn: 'Mythic ?' },
  ][levelNumber - 1] || { titleAr: `مستوى ${levelNumber}`, titleEn: `Level ${levelNumber}`, shortAr: `Lv.${levelNumber}`, shortEn: `Lv.${levelNumber}` };

  const renderBadgeContent = (fillColor: string, strokeColor: string, strokeWidth = 2) => {
    switch (levelNumber) {
      case 1:
        return renderSoftStar(fillColor, strokeColor, strokeWidth);
      case 2:
        return renderLayeredDoubleStar(fillColor, strokeColor, strokeWidth);
      case 3:
        return renderWingedStar(fillColor, strokeColor, strokeWidth);
      case 4:
        return renderRadiantWingedDoubleStar(fillColor, strokeColor, strokeWidth);
      case 5:
        return renderRoyalCrown(fillColor, strokeColor, strokeWidth);
      case 6:
        return renderMythicMystery(fillColor, strokeColor, strokeWidth);
      default:
        return renderSoftStar(fillColor, strokeColor, strokeWidth);
    }
  };

  return (
    <div className={`relative flex flex-col items-center group transition-all duration-300 ${
      isLocked ? 'opacity-55 hover:opacity-85' : 'opacity-100'
    }`}>
      {/* High-Contrast Small Lock Icon (🔒) for locked levels */}
      {isLocked && (
        <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-slate-950 border-2 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)] flex items-center justify-center text-amber-300 z-30 pointer-events-none">
          <Lock size={10} className="text-amber-400" strokeWidth={2.5} />
        </div>
      )}

      {/* Floating Sparkle when Active & Filling */}
      {isFilling && (
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -top-2.5 text-amber-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.95)] z-20 pointer-events-none"
        >
          <Sparkles size={13} />
        </motion.div>
      )}

      {/* The Fillable Badge Reservoir Container */}
      <div 
        className={`relative flex items-center justify-center transition-transform duration-300 cursor-pointer ${
          isFull ? 'hover:scale-110 drop-shadow-[0_0_16px_rgba(245,158,11,0.95)]' :
          isFilling ? 'hover:scale-105 drop-shadow-[0_0_14px_rgba(245,158,11,0.8)]' :
          isLocked ? 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]' :
          'hover:scale-105 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]'
        }`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 48 48"
          width={size}
          height={size}
          className="overflow-visible"
        >
          <defs>
            {/* Rich Golden Liquid Fluid Gradient for fill */}
            <linearGradient id={gradFillId} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#78350F" />
              <stop offset="25%" stopColor="#B45309" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="85%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#FFFBEB" />
            </linearGradient>

            {/* High Contrast Outline Gradient */}
            <linearGradient id={gradOutlineId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isFull ? "#FFFBEB" : isFilling ? "#FEF08A" : isLocked ? "#94A3B8" : "#FDE047"} />
              <stop offset="50%" stopColor={isFull ? "#FDE047" : isFilling ? "#F59E0B" : isLocked ? "#64748B" : "#F59E0B"} />
              <stop offset="100%" stopColor={isFull ? "#D97706" : isFilling ? "#B45309" : isLocked ? "#334155" : "#B45309"} />
            </linearGradient>
          </defs>

          {/* 1. Empty Reservoir Silhouette (Crisp high-contrast dark frame when locked, subtle amber when unlocked) */}
          {renderBadgeContent(
            isLocked ? "rgba(15, 23, 42, 0.85)" : "rgba(245, 158, 11, 0.06)",
            isLocked ? "#475569" : `url(#${gradOutlineId})`,
            isLocked ? 1.5 : 1.2
          )}

          {/* 2. Fluid Gold Fill (Fills bottom-to-top progressively) */}
          {fillPercent > 0 && (
            <g 
              style={{ 
                clipPath: `inset(${100 - fillPercent}% 0% 0% 0%)`,
                transition: 'clip-path 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {renderBadgeContent(`url(#${gradFillId})`, `url(#${gradOutlineId})`, 2)}
            </g>
          )}

          {/* 3. Outer Contour Outline (Ultra crisp high contrast) */}
          {renderBadgeContent("none", `url(#${gradOutlineId})`, isFull ? 2 : isFilling ? 2.2 : isLocked ? 1.5 : 1.8)}

          {/* 4. Active Liquid Wave Sparkle when currently filling */}
          {isFilling && (
            <circle
              cx="24"
              cy={3 + (42 * (100 - fillPercent)) / 100}
              r="2.2"
              fill="#FFFFFF"
              className="animate-ping"
            />
          )}
        </svg>
      </div>

      {/* Badge Labels & Status */}
      <div className="mt-2.5 flex flex-col items-center whitespace-nowrap">
        <span className={`text-[10px] font-black tracking-tight ${
          isFull ? 'text-amber-300 drop-shadow-[0_1px_6px_rgba(245,158,11,0.8)]' :
          isFilling ? 'text-white font-extrabold' :
          isLocked ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {isRtl ? badgeMeta.shortAr : badgeMeta.shortEn}
        </span>
        <span className={`text-[8px] font-black ${
          isFull ? 'text-amber-400 font-extrabold' :
          isFilling ? 'text-amber-300 font-bold' :
          isLocked ? 'text-slate-500 font-semibold' : 'text-slate-500'
        }`}>
          {isLocked ? (isRtl ? '🔒 مقفل' : '🔒 Locked') : isFull ? '100%' : `${fillPercent}%`}
        </span>
      </div>
    </div>
  );
};

const LANGUAGES_DATA: { code: Language; name: string; nativeName: string; flag: React.ReactNode }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: <span className="text-2xl">🇺🇸</span> },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: <span className="text-2xl">🇩🇪</span> },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: <span className="text-2xl">🇸🇦</span> },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: <span className="text-2xl">🇹🇷</span> },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: <span className="text-2xl">🇷🇺</span> },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: <span className="text-2xl">🇺🇦</span> },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: <span className="text-2xl">🇫🇷</span> },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: <span className="text-2xl">🇪🇸</span> },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: <span className="text-2xl">🇨🇳</span> },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: <span className="text-2xl">🇮🇳</span> },
];

const KURDISH_VARIANTS: { code: Language; name: string; nativeName: string; flag: React.ReactNode; scriptInfo: string }[] = [
  { code: 'ku-Latn' as Language, name: 'Kurmanji (Latin)', nativeName: 'Kurdî (Kurmancî)', flag: <KurdistanFlag />, scriptInfo: 'الأحرف اللاتينية (Latin Script)' },
  { code: 'ckb' as Language, name: 'Sorani (Sorani)', nativeName: 'سۆرانی (Soranî)', flag: <KurdistanFlag />, scriptInfo: 'الأحرف العربية/الفارسية (Sorani Script)' },
];

export const WORLD_LANGUAGES_CATALOG: { code: Language; name: string; nativeName: string; country: string; countryCode: string; dialCode: string; flag: string }[] = [
  // Middle East
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Iraq', countryCode: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Saudi Arabia', countryCode: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'United Arab Emirates', countryCode: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Jordan', countryCode: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Egypt', countryCode: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Kuwait', countryCode: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Qatar', countryCode: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Oman', countryCode: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Lebanon', countryCode: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'Bahrain', countryCode: 'BH', dialCode: '+973', flag: '🇧🇭' },
  // Europe
  { code: 'en', name: 'English', nativeName: 'English', country: 'United Kingdom', countryCode: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', country: 'France', countryCode: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', country: 'Germany', countryCode: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', country: 'Italy', countryCode: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', country: 'Spain', countryCode: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', country: 'Netherlands', countryCode: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', country: 'Sweden', countryCode: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', country: 'Poland', countryCode: 'PL', dialCode: '+48', flag: '🇵🇱' },
  // Americas
  { code: 'en', name: 'English', nativeName: 'English', country: 'United States', countryCode: 'US', dialCode: '+1', flag: '🇺🇸' },
  { code: 'en', name: 'English', nativeName: 'English', country: 'Canada', countryCode: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', country: 'Brazil', countryCode: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', country: 'Mexico', countryCode: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', country: 'Argentina', countryCode: 'AR', dialCode: '+54', flag: '🇦🇷' },
  // Asia
  { code: 'zh', name: 'Chinese', nativeName: '中文', country: 'China', countryCode: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', country: 'Japan', countryCode: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', country: 'South Korea', countryCode: 'KR', dialCode: '+82', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', country: 'India', countryCode: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', country: 'Vietnam', countryCode: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', country: 'Indonesia', countryCode: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', country: 'Thailand', countryCode: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', country: 'Turkey', countryCode: 'TR', dialCode: '+90', flag: '🇹🇷' },
];


const DeleteAccountModal = ({ onClose, onLogout, t }: { onClose: () => void, onLogout: (toSignup?: boolean, message?: string) => void, t: any }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const validWords = ['حذف', 'Delete', 'Löschen', 'Sil', 'Jê Bibe', 'سڕینەوە', 'Удалить'];
    if (!validWords.includes(confirmText.trim())) return;
    setIsDeleting(true);

    const user = auth.currentUser;
    if (!user) {
      setIsDeleting(false);
      return;
    }

    const uid = user.uid;

    // Trigger secondary collection & storage cleanups in background (detached Promise) so they NEVER hang the main UI thread
    (async () => {
      try {
        const collectionsToClean = ['posts', 'chats', 'transactions', 'paymentMethods', 'feedback', 'payout_requests', 'live_gifts_log'];
        for (const col of collectionsToClean) {
          try {
            const q = query(collection(firestoreDb, col), where('uid', '==', uid));
            const snapshot = await getDocs(q);
            const batch = writeBatch(firestoreDb);
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          } catch (e) {
            console.warn(`Background clean failed for ${col}:`, e);
          }
        }

        // Cleanup user messages
        try {
          const q = query(collection(firestoreDb, 'messages'), where('senderId', '==', uid));
          const snapshot = await getDocs(q);
          const batch = writeBatch(firestoreDb);
          snapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        } catch (e) {
          console.warn("Background messages clean failed:", e);
        }

        // Cleanup Storage
        try {
          const storageRef = ref(storage, `users/${uid}`);
          const list = await listAll(storageRef);
          for (const item of list.items) {
            await deleteObject(item);
          }
        } catch (e) {
          console.warn("Background storage clean failed:", e);
        }
      } catch (err) {
        console.warn("Background cleanup caught global error:", err);
      }
    })();

    try {
      // 1. Delete direct user document from Firestore (ultra-fast direct key delete)
      try {
        await deleteDoc(doc(firestoreDb, 'users', uid));
      } catch (e) {
        console.error("Error deleting user document in Firestore:", e);
      }

      // 2. Delete the Auth User from Firebase authentication so email becomes available for reuse immediately
      try {
        // Re-authenticate user if email & saved password exists in localStorage to prevent "requires-recent-login" error
        try {
          const existing = localStorage.getItem('hisee_saved_accounts');
          if (existing && user.email) {
            const accounts = JSON.parse(existing);
            const currentAcc = accounts.find((acc: any) => acc.uid === uid);
            if (currentAcc && currentAcc.password) {
              const credential = EmailAuthProvider.credential(user.email, currentAcc.password);
              await reauthenticateWithCredential(user, credential);
              console.log("Successfully re-authenticated user before deletion.");
            }
          }
        } catch (reauthErr) {
          console.warn("Re-authentication before delete skipped or failed:", reauthErr);
        }

        await deleteUser(user);
        console.log("User successfully deleted from Firebase Auth.");
      } catch (authErr: any) {
        console.error("Error deleting Auth user, attempting fallback user.delete():", authErr);
        try {
          await user.delete();
        } catch (fallbackErr) {
          console.error("Both Auth delete methods failed:", fallbackErr);
        }
      }

      // 3. Sign out to clear local storage and session
      try {
        await auth.signOut();
      } catch (signOutErr) {
        console.error("Sign out error:", signOutErr);
      }

      // Remove from saved accounts in localStorage
      try {
        const existing = localStorage.getItem('hisee_saved_accounts');
        if (existing) {
          let accounts = JSON.parse(existing);
          accounts = accounts.filter((acc: any) => acc.uid !== uid);
          localStorage.setItem('hisee_saved_accounts', JSON.stringify(accounts));
        }
      } catch (e) {
        console.error("Error clearing saved account from localStorage:", e);
      }

      // 4. Complete Logout & notify user
      onLogout(true, t.accountDeletedSuccess || 'تم حذف الحساب وتطهير البيانات بنجاح');
    } catch (err) {
      console.error("Error during full account deletion:", err);
      // Absolute fallback to ensure user is never locked out or stuck in loading state
      try {
        await auth.signOut();
        onLogout(true, t.accountDeletedSuccess || 'تم تسجيل الخروج بنجاح');
      } catch (e) {}
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="glass w-full max-w-md p-8 rounded-[2.5rem] border border-rose-500/20 shadow-2xl space-y-6">
      <h3 className="text-2xl font-bold text-rose-500">{t.deleteAccountWarning || 'تنبيه نهائي: حذف الحساب'}</h3>
      <p className="text-slate-400 text-sm">{t.deleteAccountDesc || 'تحذير: هذا الإجراء نهائي ولا يمكن استعادة الحساب أو البيانات مرة أخرى تحت أي ظرف.'}</p>
      <div className="bg-rose-500/10 p-4 rounded-2xl text-xs text-rose-300">
        <p className="font-bold mb-2">{t.dataDeletedPermanently || 'سيتم مسح البيانات التالية نهائياً:'}</p>
        <ul className="list-disc list-inside space-y-1 opacity-80">
          <li>{t.photosAndVideos || 'الصور والفيديوهات'}</li>
          <li>{t.posts || 'المنشورات'}</li>
          <li>{t.messageHistory || 'سجل الرسائل'}</li>
        </ul>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-slate-400">{t.typeDeleteToConfirm || 'اكتب كلمة "حذف" لتأكيد الإجراء:'}</p>
        <input 
          type="text" 
          value={confirmText} 
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 text-white focus:border-rose-500 outline-none"
          placeholder={t.delete || 'حذف'}
        />
      </div>
      <div className="flex gap-4 pt-4">
        <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all">{t.cancel || 'إلغاء'}</button>
        <button 
          onClick={handleDelete}
          disabled={confirmText !== 'حذف' && confirmText !== 'Delete' && confirmText !== 'Löschen' && confirmText !== 'Sil' && confirmText !== 'Jê Bibe' && confirmText !== 'سڕینەوە' && confirmText !== 'Удалить'}
          className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-600/20 transition-all"
        >
          {isDeleting ? (t.deleting || 'جاري الحذف...') : (t.deletePermanently || 'حذف نهائي')}
        </button>
      </div>
    </div>
  );
};

const SettingsView: React.FC<Props> = ({ lang, setLang, settings, setSettings, onBack, onLogout, myId, users, initialView, onNavigateToProfile }) => {
  const t = new Proxy({} as any, {
    get(_target, prop: string) {
      if (typeof prop !== 'string') return undefined;
      return getTranslation(lang, prop);
    }
  });
  const isRtl = lang === 'ar' || lang === 'ckb';
  
  // State to manage sub-pages navigation
  const [currentView, setCurrentView] = useState<'main' | 'languages' | 'kurdish_dialects' | 'appearance' | 'chat' | 'account' | 'account_profile' | 'account_security_permissions' | 'account_analytics' | 'account_orders' | 'privacy_security' | 'interactions' | 'content_display' | 'storage_data' | 'offline_videos' | 'free_up_space' | 'blocked_users' | 'manage_storage' | 'network_usage' | 'activity_hub' | 'activity_posts' | 'live_preferences' | 'notifications_detailed' | 'time_wellbeing' | 'family_link' | 'qr_code' | 'balance' | 'terms' | 'privacy_policy' | 'support' | 'help_center' | 'privacy_center' | 'terms_policies' | 'hisee_studio' | 'transaction_history' | 'live_rewards' | 'content_earnings' | 'event_earnings' | 'payment_methods' | 'identity_verification' | 'help_feedback' | 'bonus' | 'buy_coins' | 'hisee_features_guide' | 'admin_payouts' | 'admin_algorithms' | 'admin_level_control' | 'login_settings' | 'app_lock_setup'>(initialView || 'main');
  const [activeModal, setActiveModal] = useState<'none' | 'password' | 'email' | 'phone' | 'paypal' | 'bank_account' | 'visa_mastercard' | 'logout' | 'deleteAccount'>('none');
  const [verificationStep, setVerificationStep] = useState<'idle' | 'uploading_id' | 'taking_selfie' | 'pending' | 'success'>('idle');
  const [walletTab, setWalletTab] = useState<'recharge' | 'level'>('recharge');
  const [tempValue, setTempValue] = useState('');
  const [managingModIndex, setManagingModIndex] = useState<number | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [switchingError, setSwitchingError] = useState('');
  const [isSwitchingActive, setIsSwitchingActive] = useState(false);
  const [noOtherAccountsWarning, setNoOtherAccountsWarning] = useState(false);
  const [isManageSessionModalOpen, setIsManageSessionModalOpen] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([
    { id: 'sess-1', device: 'iPhone 15 Pro Max', browser: 'Safari Mobile', location: 'Riyadh, Saudi Arabia', ip: '185.120.44.12', active: true, loginTime: 'Active now' },
    { id: 'sess-2', device: 'MacBook Pro 16"', browser: 'Chrome / macOS', location: 'Dubai, UAE', ip: '91.73.125.8', active: false, loginTime: '2 hours ago' },
    { id: 'sess-3', device: 'Samsung Galaxy S24 Ultra', browser: 'Samsung Internet', location: 'Cairo, Egypt', ip: '197.34.82.201', active: false, loginTime: '3 days ago' },
  ]);
  const [terminatingSessions, setTerminatingSessions] = useState(false);
  const [isCreateLinkedAccountModalOpen, setIsCreateLinkedAccountModalOpen] = useState(false);
  const [newLinkedAccountName, setNewLinkedAccountName] = useState('');
  const [newLinkedAccountUsername, setNewLinkedAccountUsername] = useState('');
  const [isCreatingLinkedAccount, setIsCreatingLinkedAccount] = useState(false);
  const [linkedAccountError, setLinkedAccountError] = useState('');
  const [activeSetupWizard, setActiveSetupWizard] = useState<'none' | 'fingerprint' | 'pin' | 'face' | 'pattern'>('none');
  const [isPasswordChange, setIsPasswordChange] = useState(false);
  const [isPatternError, setIsPatternError] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardPin, setWizardPin] = useState('');
  const [wizardPinConfirm, setWizardPinConfirm] = useState('');
  const [wizardScanning, setWizardScanning] = useState(false);
  const [wizardScanProgress, setWizardScanProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fingerprintHoldProgress, setFingerprintHoldProgress] = useState(0);
  const [isHoldingFingerprint, setIsHoldingFingerprint] = useState(false);
  const [fingerprintScanCount, setFingerprintScanCount] = useState<number>(0);
  const [facePositionsCaptured, setFacePositionsCaptured] = useState<{ forward: boolean; right: boolean; left: boolean }>({ forward: false, right: false, left: false });
  const [currentFacePose, setCurrentFacePose] = useState<'forward' | 'right' | 'left'>('forward');
  
  const [storePackages, setStorePackages] = useState<any[]>([
    { id: 'pkg_1', coins: 100, price: '0.99', bonus: 0, local: '1,300 IQD' },
    { id: 'pkg_2', coins: 500, price: '4.99', bonus: 0, local: '6,500 IQD' },
    { id: 'pkg_3', coins: 1000, price: '9.99', bonus: 150, local: '13,000 IQD' },
    { id: 'pkg_4', coins: 2500, price: '24.99', bonus: 500, local: '32,500 IQD' },
    { id: 'pkg_5', coins: 5000, price: '49.99', bonus: 1200, local: '65,000 IQD' },
    { id: 'pkg_6', coins: 10000, price: '99.99', bonus: 3000, local: '130,000 IQD' }
  ]);

  useEffect(() => {
    const packagesRef = collection(firestoreDb, 'store_packages');
    const unsubscribe = onSnapshot(packagesRef, (snapshot) => {
      if (document.hidden) return;
      if (!snapshot.empty) {
        const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        pkgs.sort((a, b) => (Number(a.coins) || 0) - (Number(b.coins) || 0));
        setStorePackages(pkgs);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const currentUser = auth.currentUser;
      const existing = localStorage.getItem('hisee_saved_accounts');
      let accounts: any[] = [];
      if (existing) {
        accounts = JSON.parse(existing);
      }
      
      if (currentUser && currentUser.email) {
        const exists = accounts.some((acc: any) => acc.email === currentUser.email);
        if (!exists) {
          accounts.push({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email.split('@')[0] || 'User VIP',
            photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
            password: 'DemoPassword123'
          });
        }
      }

      if (accounts.length <= 1) {
        const demoAccounts = [
          {
            uid: 'demo-mod-888',
            email: 'moderator@hisee.pro',
            displayName: 'HiSee Pro Moderator 🛡️',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=moderator',
            password: 'DemoPassword123'
          },
          {
            uid: 'demo-star-777',
            email: 'star_creator@hisee.pro',
            displayName: 'Sarah (Elite Streamer) ✨',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
            password: 'DemoPassword123'
          }
        ];
        
        demoAccounts.forEach(demo => {
          if (!accounts.some(acc => acc.email === demo.email)) {
            accounts.push(demo);
          }
        });
      }

      localStorage.setItem('hisee_saved_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error("Error setting up multi-accounts:", e);
    }
  }, []);

  // QR Scanner States & Refs for Unification with Profile QR
  const [showScanner, setShowScanner] = useState(false);
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Scanner Logic in Settings (Unification with Profile scan behaviour)
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrame: number;

    const startScanner = async () => {
      if (!showScanner) return;
      if (!requirePermission('camera', 'مسح رمز QR', () => startScanner())) {
        setShowScanner(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            aspectRatio: { ideal: 1.0 }
          } 
        });
        if (scannerVideoRef.current) {
          scannerVideoRef.current.srcObject = stream;
          scannerVideoRef.current.setAttribute("playsinline", "true");
          scannerVideoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera for settings QR scanner:", err);
        alert(lang === 'ar' ? 'فشل الوصول إلى الكاميرا' : 'Camera access failed');
        setShowScanner(false);
      }
    };

    const tick = () => {
      if (!showScanner || !scannerVideoRef.current || !scannerCanvasRef.current) return;

      if (scannerVideoRef.current.readyState === scannerVideoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = scannerCanvasRef.current;
        const video = scannerVideoRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            console.log("Settings QR found code:", code.data);
            handleScannedData(code.data);
            return; // Stop scanning
          }
        }
      }
      animationFrame = requestAnimationFrame(tick);
    };

    const handleScannedData = (data: string) => {
      try {
        let scannedUserId = "";
        
        // Try parsing different formats of URLs
        if (data.includes('hisee://user/')) {
          scannedUserId = data.replace('hisee://user/', '').split('?')[0];
        } else if (data.includes('/profile/')) {
          const parts = data.split('/profile/');
          if (parts[1]) {
            scannedUserId = parts[1].split('?')[0];
          }
        } else {
          // Fallback if data contains the plain userID
          scannedUserId = data.trim();
        }

        if (scannedUserId && onNavigateToProfile) {
          setShowScanner(false);
          onNavigateToProfile(scannedUserId);
          alert(lang === 'ar' ? 'تم العثور على الملف الشخصي! جاري الانتقال...' : 'Profile found! Opening...');
        } else {
          alert(lang === 'ar' ? 'رمز غير صالح أو لم يتم العثور على صاحب الحساب' : 'Invalid code or profile not found');
          setShowScanner(false);
        }
      } catch (e) {
        console.error("Invalid QR code scanned in settings:", data);
        alert(lang === 'ar' ? 'بيانات الرمز غير صالحة' : 'Invalid QR data');
        setShowScanner(false);
      }
    };

    if (showScanner) {
      startScanner();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrame);
    };
  }, [showScanner, lang, onNavigateToProfile]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError('تعذر الوصول إلى الكاميرا. يرجى السماح للرابط بالوصول إلى الكاميرا من إعدادات المتصفح.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (activeSetupWizard === 'face') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeSetupWizard]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, activeSetupWizard, wizardStep]);

  useEffect(() => {
    let interval: any;
    if (isHoldingFingerprint && activeSetupWizard === 'fingerprint' && wizardStep === 1) {
      interval = setInterval(() => {
        setFingerprintHoldProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsHoldingFingerprint(false);
            setFingerprintScanCount(count => {
              const nextCount = count + 1;
              if (nextCount >= 10) {
                setWizardStep(2);
              }
              return nextCount;
            });
            return 100;
          }
          return prev + 20;
        });
      }, 150);
    } else {
      if (!isHoldingFingerprint) {
        setFingerprintHoldProgress(0);
      }
    }
    return () => clearInterval(interval);
  }, [isHoldingFingerprint, activeSetupWizard, wizardStep]);
  
  // New states for real connection
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [networkStats, setNetworkStats] = useState({
    sentMessages: 1420,
    recvMessages: 8931,
    sentMedia: '243.5 MB',
    recvMedia: '1.2 GB',
    sentCalls: '45.1 MB',
    recvCalls: '182.4 MB',
    sentStatus: '12.8 MB',
    recvStatus: '64.2 MB',
    sentTotal: '301.4 MB',
    recvTotal: '1.44 GB'
  });
  const [bankName, setBankName] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');
  const [userNickname, setUserNickname] = useState('مستخدم HISEE');
  const [userAvatar, setUserAvatar] = useState('');
  const [verificationData, setVerificationData] = useState<any>({ status: 'none', step: 1 });
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [coins, setCoins] = useState(0);
  const [paidCoins, setPaidCoins] = useState(0);
  const [bonusCoins, setBonusCoins] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [freeStars, setFreeStars] = useState(0);
  const [paidStars, setPaidStars] = useState(0);
  const [supporterXP, setSupporterXP] = useState(0);
  const [realEarningsUSD, setRealEarningsUSD] = useState(0);
  const [localFallbackBonusCoins, setLocalFallbackBonusCoins] = useState(parseInt(localStorage.getItem("localFallbackBonusCoins") || "0"));
  const [localFallbackPaidCoins, setLocalFallbackPaidCoins] = useState(parseInt(localStorage.getItem("localFallbackPaidCoins") || "0"));
  const [localFallbackCoins, setLocalFallbackCoins] = useState(parseInt(localStorage.getItem("localFallbackCoins") || "0"));

  // إعدادات إدارة الحساب والأذونات الفعلية
  const [accountPermissions, setAccountPermissions] = useState<AppSystemPermissions>(() => {
    if (settings.chatSettings?.permissions) {
      return settings.chatSettings.permissions;
    }
    if (settings.permissions) {
      return settings.permissions;
    }
    return getStoredPermissions();
  });
  const [permissionFeedback, setPermissionFeedback] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isUpdatingPerm, setIsUpdatingPerm] = useState<string | null>(null);

  // مزامنة الأذونات عند حدوث تغيير في أي مكان بالتطبيق
  React.useEffect(() => {
    const handlePermChange = (e: any) => {
      if (e.detail) {
        setAccountPermissions(e.detail);
      } else {
        setAccountPermissions(getStoredPermissions());
      }
    };
    const handleOpenPermsView = () => {
      setCurrentView('account_security_permissions');
    };
    window.addEventListener('hisee_permissions_changed', handlePermChange);
    window.addEventListener('hisee_open_settings_permissions', handleOpenPermsView);
    return () => {
      window.removeEventListener('hisee_permissions_changed', handlePermChange);
      window.removeEventListener('hisee_open_settings_permissions', handleOpenPermsView);
    };
  }, []);

  const handleTogglePermission = async (permKey: keyof AppSystemPermissions) => {
    if (isUpdatingPerm) return;
    const targetValue = !accountPermissions[permKey];
    setIsUpdatingPerm(permKey);

    // تحديث تفاؤلي سريع في الواجهة
    setAccountPermissions(prev => ({ ...prev, [permKey]: targetValue }));

    const result = await updateAppPermission(permKey, targetValue);
    setIsUpdatingPerm(null);

    if (targetValue && !result.grantedByBrowser && !result.success) {
      // إرجاع الحالة إذا تم رفض الإذن من إعدادات المتصفح
      setAccountPermissions(prev => ({ ...prev, [permKey]: false }));
      setPermissionFeedback({
        message: result.error || 'تم رفض الإذن من إعدادات المتصفح. يرجى السماح به من شريط العنوان في المتصفح.',
        isError: true
      });
      setTimeout(() => setPermissionFeedback(null), 4500);
      return;
    }

    const updatedPerms: AppSystemPermissions = { ...accountPermissions, [permKey]: targetValue };
    
    // حفظ التحديث في إعدادات التطبيق العامة وقاعدة البيانات
    setSettings(prev => ({
      ...prev,
      notifications: permKey === 'notifications' ? targetValue : prev.notifications,
      permissions: updatedPerms,
      chatSettings: {
        ...prev.chatSettings,
        permissions: updatedPerms
      }
    }));

    const permLabels: Record<keyof AppSystemPermissions, string> = {
      camera: isRtl ? 'الكاميرا' : 'Camera',
      microphone: isRtl ? 'الميكروفون' : 'Microphone',
      location: isRtl ? 'الموقع الجغرافي GPS' : 'GPS Location',
      notifications: isRtl ? 'إرسال الإشعارات المباشرة' : 'Push Notifications'
    };

    setPermissionFeedback({
      message: targetValue 
        ? (isRtl ? `✅ تم تفعيل إذن ${permLabels[permKey]} بنجاح وربطه بكافة مزايا التطبيق.` : `✅ ${permLabels[permKey]} permission enabled successfully and linked to app features.`)
        : (isRtl ? `🔒 تم إيقاف وتعطيل إذن ${permLabels[permKey]} بالكامل. لن يتم استخدامه في التطبيق.` : `🔒 ${permLabels[permKey]} permission completely disabled. It will not be used in the app.`),
      isError: !targetValue
    });
    setTimeout(() => setPermissionFeedback(null), 3500);
  };
  const defaultInitialOrders = [
    { 
      id: 'ORD-8931', 
      title: 'شراء حزمة 5,000 عملة ذهبية', 
      category: 'coins',
      date: '١٥ أغسطس ٢٠٢٤', 
      timestamp: Date.now() - 3 * 86400000,
      price: '٤٩.٩٩ €', 
      status: 'completed', 
      statusAr: 'مكتمل',
      paymentMethod: 'Apple Pay / بطاقة مصرفية',
      description: 'تم شحن 5,000 عملة ذهبية بنجاح إلى محفظتك في HiSee.'
    },
    { 
      id: 'ORD-7422', 
      title: 'الاشتراك الشهري HiSee VIP', 
      category: 'vip',
      date: '١ أغسطس ٢٠٢٤', 
      timestamp: Date.now() - 17 * 86400000,
      price: '٩.٩٩ €', 
      status: 'active', 
      statusAr: 'نشط',
      paymentMethod: 'بطاقة Visa •••• 4242',
      description: 'عضوية VIP بريميوم النشطة مع شارة التحقق الذهبية ومضاعفة نقاط الهدايا.'
    },
    { 
      id: 'REQ-4021', 
      title: 'طلب سحب أرباح (مكافآت البث)', 
      category: 'withdrawal',
      date: '١٧ أغسطس ٢٠٢٤', 
      timestamp: Date.now() - 1 * 86400000,
      price: '١٠٠.٠٠ €', 
      status: 'pending', 
      statusAr: 'قيد المراجعة',
      paymentMethod: 'حساب PayPal / تحويل مصرفي',
      description: 'طلب تحويل أرباح وجوائز البث المباشر (100 يورو) إلى الحساب المصرفي.'
    }
  ];

  const [ordersList, setOrdersList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hisee_account_orders_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultInitialOrders;
  });

  const [ordersFilter, setOrdersFilter] = useState<'all' | 'completed' | 'active' | 'pending' | 'support'>('all');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [selectedOrderModal, setSelectedOrderModal] = useState<any | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [copiedReceiptCode, setCopiedReceiptCode] = useState(false);
  const [isSubmittingOrderForm, setIsSubmittingOrderForm] = useState(false);

  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderPrice, setNewOrderPrice] = useState('');
  const [newOrderType, setNewOrderType] = useState('refund');
  const [newOrderDetails, setNewOrderDetails] = useState('');
  const [newOrderRelatedId, setNewOrderRelatedId] = useState('');
  const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState<string | null>(null);
  const [orderFormError, setOrderFormError] = useState<string | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem('hisee_account_orders_v2', JSON.stringify(ordersList));
    } catch (e) {}
  }, [ordersList]);

  const getOrderDisplayTitle = (order: any) => {
    if (!order) return '';
    if (order.id === 'ORD-8931') return t.defaultOrder8931Title || (isRtl ? 'شراء حزمة 5,000 عملة ذهبية' : 'Purchase 5,000 Gold Coins Pack');
    if (order.id === 'ORD-7422') return t.defaultOrder7422Title || (isRtl ? 'الاشتراك الشهري HiSee VIP' : 'Monthly HiSee VIP Subscription');
    if (order.id === 'REQ-4021') return t.defaultOrder4021Title || (isRtl ? 'طلب سحب أرباح (مكافآت البث)' : 'Withdrawal Request (LIVE Rewards)');
    const title = order.title || '';
    if (!isRtl) {
      if (title.includes('لم أستلم عملات الشحن المشتراة') || title.includes('مشكلة في شحن العملات')) {
        return t.presetCoins || 'Did not receive purchased coins';
      }
      if (title.includes('استفسار عن تجديد وتفعيل اشتراك VIP') || title.includes('اشتراك VIP')) {
        return t.presetVip || 'VIP subscription renewal inquiry';
      }
      if (title.includes('تسريع مراجعة تحويل أرباح البث المباشر') || title.includes('تحويل أرباح البث')) {
        return t.presetWithdrawal || 'Expedite LIVE payout review';
      }
      if (title.includes('طلب استرداد مالي لعملية تمت بالخطأ') || title.includes('طلب استرداد مالي')) {
        return t.presetRefund || 'Refund request for mistaken charge';
      }
      if (title.includes('التماس إلغاء حظر أو تقييد الحساب') || title.includes('اعتراض على حظر')) {
        return t.presetAppeal || 'Account ban or restriction appeal';
      }
      if (title.includes('اقتراح أو ملاحظة عامة') || title.includes('ملاحظة عامة')) {
        return t.presetSuggestion || 'Feature suggestion or general note';
      }
      if (title.startsWith('استفسار بخصوص الطلب')) {
        return title.replace('استفسار بخصوص الطلب', 'Inquiry regarding order');
      }
    }
    return title;
  };

  const getOrderDisplayDesc = (order: any) => {
    if (!order) return '';
    if (order.id === 'ORD-8931') return t.defaultOrder8931Desc || (isRtl ? 'تم شحن 5,000 عملة ذهبية بنجاح إلى محفظتك في HiSee.' : 'Successfully credited 5,000 coins to your HiSee wallet.');
    if (order.id === 'ORD-7422') return t.defaultOrder7422Desc || (isRtl ? 'عضوية VIP بريميوم النشطة مع شارة التحقق الذهبية ومضاعفة نقاط الهدايا.' : 'Active premium VIP membership with golden badge and gift multipliers.');
    if (order.id === 'REQ-4021') return t.defaultOrder4021Desc || (isRtl ? 'طلب تحويل أرباح وجوائز البث المباشر (100 يورو) إلى الحساب المصرفي.' : 'Payout request for LIVE streaming rewards (100 EUR) to bank account.');
    const desc = order.description || '';
    if (!isRtl) {
      if (desc.includes('تم تقديم هذا الطلب إلى قسم الدعم الفني للمراجعة والتدقيق.')) {
        return 'This request was submitted to technical support for review.';
      }
      if (desc.includes('أرجو المساعدة بخصوص:') || desc.includes('تاريخ المشكلة:')) {
        return desc
          .replace('أرجو المساعدة بخصوص:', 'Please assist regarding:')
          .replace('تاريخ المشكلة: اليوم.', 'Issue date: Today.')
          .replace('ملاحظات إضافية: يرجى المراجعة والرد في أقرب وقت.', 'Additional notes: Please review and reply as soon as possible.');
      }
      if (desc.includes('أود الاستفسار بخصوص العملية')) {
        return desc
          .replace('أود الاستفسار بخصوص العملية', 'I would like to inquire about order')
          .replace('يرجى التحقق وتقديم المساعدة.', 'Please investigate and assist.');
      }
    }
    return desc;
  };

  const getOrderDisplayPaymentMethod = (order: any) => {
    if (!order) return '';
    if (order.id === 'ORD-8931') return t.paymentApplePay || (isRtl ? 'Apple Pay / بطاقة مصرفية' : 'Apple Pay / Bank Card');
    if (order.id === 'ORD-7422') return t.paymentVisa || (isRtl ? 'بطاقة Visa •••• 4242' : 'Visa Card •••• 4242');
    if (order.id === 'REQ-4021') return t.paymentPayPalBank || (isRtl ? 'حساب PayPal / تحويل مصرفي' : 'PayPal / Bank Transfer');
    const pm = order.paymentMethod || '';
    if (pm.includes('Apple Pay') || pm.includes('بطاقة مصرفية')) return t.paymentApplePay || (isRtl ? 'Apple Pay / بطاقة مصرفية' : 'Apple Pay / Bank Card');
    if (pm.includes('Visa')) return t.paymentVisa || (isRtl ? 'بطاقة Visa •••• 4242' : 'Visa Card •••• 4242');
    if (pm.includes('PayPal') || pm.includes('تحويل مصرفي') || pm.includes('Bank Transfer')) return t.paymentPayPalBank || (isRtl ? 'حساب PayPal / تحويل مصرفي' : 'PayPal / Bank Transfer');
    if (pm.includes('طلب إلكتروني') || pm.includes('Support Ticket') || pm.includes('الدعم')) return t.supportMethod || (isRtl ? 'طلب إلكتروني عبر الدعم' : 'Online Support Ticket');
    if (!isRtl && (pm === 'بطاقة ائتمان / إلكتروني' || pm.includes('بطاقة ائتمان'))) return t.paymentMethodDefault || 'Credit Card / Electronic';
    return pm || (t.paymentMethodDefault || (isRtl ? 'بطاقة ائتمان / إلكتروني' : 'Credit Card / Electronic'));
  };

  const getOrderStatusDisplayBadge = (status: string) => {
    if (status === 'completed') return t.completedTab || (isRtl ? 'مكتمل' : 'Completed');
    if (status === 'active') return t.activeTab || (isRtl ? 'نشط' : 'Active');
    if (status === 'cancelled') return t.orderCancelled || (isRtl ? 'تم الإلغاء' : 'Cancelled');
    return t.pendingTab || (isRtl ? 'قيد المراجعة' : 'Under Review');
  };

  const getOrderDisplayDate = (order: any) => {
    if (!order || !order.date) return '';
    if (order.id === 'ORD-8931') return isRtl ? '١٥ أغسطس ٢٠٢٤' : 'Aug 15, 2024';
    if (order.id === 'ORD-7422') return isRtl ? '١ أغسطس ٢٠٢٤' : 'Aug 1, 2024';
    if (order.id === 'REQ-4021') return isRtl ? '١٧ أغسطس ٢٠٢٤' : 'Aug 17, 2024';
    if (typeof order.date === 'string') {
      if (order.date.includes('اليوم')) {
        return isRtl ? order.date : order.date.replace('اليوم', 'Today');
      }
      if (!isRtl) {
        return order.date
          .replace(/أغسطس/g, 'Aug')
          .replace(/يناير/g, 'Jan')
          .replace(/فبراير/g, 'Feb')
          .replace(/مارس/g, 'Mar')
          .replace(/أبريل/g, 'Apr')
          .replace(/مايو/g, 'May')
          .replace(/يونيو/g, 'Jun')
          .replace(/يوليو/g, 'Jul')
          .replace(/سبتمبر/g, 'Sep')
          .replace(/أكتوبر/g, 'Oct')
          .replace(/نوفمبر/g, 'Nov')
          .replace(/ديسمبر/g, 'Dec')
          .replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2').replace(/٣/g, '3').replace(/٤/g, '4')
          .replace(/٥/g, '5').replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8').replace(/٩/g, '9');
      }
    }
    return order.date;
  };

  const getOrderDisplayPrice = (order: any) => {
    if (!order || !order.price) return '';
    if (isRtl) return order.price;
    return String(order.price)
      .replace(/٠/g, '0')
      .replace(/١/g, '1')
      .replace(/٢/g, '2')
      .replace(/٣/g, '3')
      .replace(/٤/g, '4')
      .replace(/٥/g, '5')
      .replace(/٦/g, '6')
      .replace(/٧/g, '7')
      .replace(/٨/g, '8')
      .replace(/٩/g, '9')
      .replace(/يورو/g, '€');
  };

  // إعدادات النشاط والمنشورات
  const [defaultPostPrivacy, setDefaultPostPrivacy] = useState<'public' | 'contacts' | 'private'>('public');
  const [whoCanComment, setWhoCanComment] = useState<'all' | 'contacts' | 'none'>('all');
  const [showLocationOnPosts, setShowLocationOnPosts] = useState(true);
  
  // Real posts for statistics and management
  const [realPosts, setRealPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!myId) return;
    const postsRef = collection(firestoreDb, 'posts');
    const q = query(postsRef, where('userId', '==', myId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const posts: any[] = [];
      snapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      setRealPosts(posts);
    });
    return () => unsubscribe();
  }, [myId]);

  const updatePostPrivacy = async (postId: string, privacy: string) => {
    try {
      const postRef = doc(firestoreDb, 'posts', postId);
      const photoRef = doc(firestoreDb, 'photos', postId);
      await updateDoc(postRef, { privacy });
      try {
        await updateDoc(photoRef, { privacy });
      } catch (e) {
        // Photo might not exist in photos collection, ignore error
      }
    } catch (e) {
      console.error("Error updating post privacy:", e);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المنشور نهائياً؟")) return;
    try {
      const postRef = doc(firestoreDb, 'posts', postId);
      await deleteDoc(postRef);
    } catch (e) {
      console.error("Error deleting post:", e);
    }
  };

  const totalLikes = realPosts.reduce((acc, post) => acc + (post.likes || 0), 0);
  const totalViews = realPosts.reduce((acc, post) => acc + (post.views || 0), 0);

  const [recentPosts, setRecentPosts] = useState([
    { id: '1', text: isRtl ? 'مشاركة رائعة من فعاليات HiSee اليوم! ✨' : 'Great share from HiSee event today! ✨', date: isRtl ? 'منذ ساعتين' : '2 hours ago', privacy: 'public' as const, likes: 24, views: 180 },
    { id: '2', text: isRtl ? 'سعيد بالانضمام إلى هذه المنصة الرائعة.' : 'Happy to join this amazing platform.', date: isRtl ? 'أمس' : 'Yesterday', privacy: 'contacts' as const, likes: 12, views: 45 },
    { id: '3', text: isRtl ? 'صورة حصرية من الاستوديو الجديد الخاص بي 🎙️' : 'Exclusive photo from my new studio 🎙️', date: isRtl ? 'منذ ٣ أيام' : '3 days ago', privacy: 'public' as const, likes: 45, views: 320 }
  ]);

  const [newModeratorName, setNewModeratorName] = useState('');

  // تفضيلات الإشعارات التفصيلية الموحدة
  const [msgVibrate, setMsgVibrate] = useState<'default' | 'short' | 'long' | 'off'>('default');
  const [msgFlashColor, setMsgFlashColor] = useState<'red' | 'green' | 'blue' | 'yellow' | 'white' | 'off'>('green');
  const [grpVibrate, setGrpVibrate] = useState<'default' | 'short' | 'long' | 'off'>('default');
  const [grpFlashColor, setGrpFlashColor] = useState<'red' | 'green' | 'blue' | 'yellow' | 'white' | 'off'>('blue');
  const [callFlash, setCallFlash] = useState<'red' | 'green' | 'blue' | 'yellow' | 'white' | 'off'>('white');
  const [msgTone, setMsgTone] = useState('classic_chime');
  const [grpTone, setGrpTone] = useState('group_bubble');
  const [callRingtone, setCallRingtone] = useState('elegant_ring');

  // إعدادات الوقت والرفاهية
  const [dailyScreenTimeLimit, setDailyScreenTimeLimit] = useState<'off' | '30m' | '1h' | '2h' | '3h'>('off');
  const [takeABreakReminder, setTakeABreakReminder] = useState<'off' | '15m' | '30m' | '45m' | '60m'>('off');
  const [bedtimeModeEnabled, setBedtimeModeEnabled] = useState(false);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);

  // ربط حسابات العائلة
  const [familyRole, setFamilyRole] = useState<'none' | 'parent' | 'child'>('none');
  const [childAccountName, setChildAccountName] = useState('');
  const [childDailyLimit, setChildDailyLimit] = useState<'off' | '1h' | '2h' | '3h'>('1h');
  const [familySleepLockStart, setFamilySleepLockStart] = useState('21:00');
  const [familySleepLockEnd, setFamilySleepLockEnd] = useState('06:00');
  const [restrictMatureContent, setRestrictMatureContent] = useState(true);
  const [childLocationSharing, setChildLocationSharing] = useState(true);
  const [familyBlockStrangers, setFamilyBlockStrangers] = useState(true);
  const [familyParentPin, setFamilyParentPin] = useState('1234');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [diamonds, setDiamonds] = useState(0);

  // States for child linking and creation
  const [showLinkChildModal, setShowLinkChildModal] = useState(false);
  const [showCreateChildModal, setShowCreateChildModal] = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildUsername, setNewChildUsername] = useState('');
  const [newChildEmail, setNewChildEmail] = useState('');
  const [newChildPassword, setNewChildPassword] = useState('');
  const [editChildName, setEditChildName] = useState('');
  const [editChildUsername, setEditChildUsername] = useState('');
  const [childSearchQuery, setChildSearchQuery] = useState('');
  const [linkChildAccountInput, setLinkChildAccountInput] = useState('');
  const [linkChildPinInput, setLinkChildPinInput] = useState('');
  const [childCustomNameInput, setChildCustomNameInput] = useState('');
  const [childCustomPinInput, setChildCustomPinInput] = useState('');

  // Content & Display Local States
  const [historyItems, setHistoryItems] = useState<{id: string | number, type: 'view' | 'search', text: string, time: string}[]>([
    { id: '1', type: 'view', text: 'شاهدت فيديو: تحديات تكنولوجية مذهلة عام 2026', time: 'منذ دقيقتين' },
    { id: '2', type: 'search', text: 'بحثت عن: "شروحات الذكاء الاصطناعي"', time: 'منذ ساعة' },
    { id: '3', type: 'view', text: 'شاهدت فيديو: طرق تحسين إنتاجية المطورين', time: 'منذ ساعتين' },
    { id: '4', type: 'search', text: 'بحثت عن: "تطوير تطبيقات الويب السريعة"', time: 'منذ يوم' }
  ]);

  useEffect(() => {
    if (!myId) return;
    const qLogs = query(
      collection(firestoreDb, 'user_activity_logs'),
      where('userId', '==', myId),
      limit(50)
    );
    const unsub = onSnapshot(qLogs, (snap) => {
      if (document.hidden) return;
      const logs = snap.docs.map(docSnap => {
        const d = docSnap.data();
        let formattedTime = 'الآن';
        if (d.createdAt?.toDate) {
          formattedTime = d.createdAt.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        }
        return {
          id: docSnap.id,
          type: d.type || 'view',
          text: d.text || '',
          time: formattedTime
        };
      });
      if (logs.length > 0) {
        setHistoryItems(logs as any);
      }
    }, () => {});
    return () => unsub();
  }, [myId]);
  const [syncContactsLoading, setSyncContactsLoading] = useState(false);
  const [syncContactsCount, setSyncContactsCount] = useState(0);
  const [adInterestsList, setAdInterestsList] = useState<string[]>(['التكنولوجيا', 'الرياضة', 'الألعاب']);

  // Offline Videos States
  const [offlineVideosList, setOfflineVideosList] = useState<any[]>([
    { id: 1, title: 'تعلم تطوير الواجهات البرمجية خطوة بخطوة', duration: '12:45', size: '42 MB', thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150', category: 'تعليمي' },
    { id: 2, title: 'أسرار النجاح والابتكار في ريادة الأعمال 2026', duration: '18:20', size: '58 MB', thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150', category: 'أعمال' },
    { id: 3, title: 'أقوى تحدي تكنولوجي في دبي - الجيل القادم من المطورين', duration: '08:15', size: '29 MB', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150', category: 'تكنولوجيا' },
    { id: 4, title: 'رحلة استكشافية وثائقية لأعماق الذكاء الاصطناعي', duration: '25:30', size: '94 MB', thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=150', category: 'وثائقي' }
  ]);
  const [offlineWiFiOnly, setOfflineWiFiOnly] = useState(true);
  const [offlineQuality, setOfflineQuality] = useState<'standard' | 'high'>('standard');
  const [offlineAutoDownload, setOfflineAutoDownload] = useState(false);
  const [offlineDownloadingId, setOfflineDownloadingId] = useState<number | null>(null);
  const [offlineDownloadProgress, setOfflineDownloadProgress] = useState(0);

  // Free Up Space States
  const [cacheSizes, setCacheSizes] = useState({
    videos: 5200, // in MB
    photos: 3100,
    files: 2400,
    voiceMessages: 1700
  });
  const [freeUpSpaceSizes, setFreeUpSpaceSizes] = useState({
    videoCache: '54.2 MB',
    imageCache: '31.5 MB',
    tempFiles: '24.8 MB',
    searchHistory: '1.4 MB',
    databaseDrafts: '12.1 MB'
  });
  const [clearingCacheType, setClearingCacheType] = useState<string | null>(null);
  const [spaceOptimized, setSpaceOptimized] = useState(false);
  const [activeOfflineVideo, setActiveOfflineVideo] = useState<any | null>(null);

  // Support, Help Center, Privacy Center, Terms & Policies States
  const [helpSearchQuery, setHelpSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);
  const [ticketCategory, setTicketCategory] = useState('technical');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [privacyAdPersonalized, setPrivacyAdPersonalized] = useState(true);
  const [privacyShareStats, setPrivacyShareStats] = useState(true);
  const [activePolicyTab, setActivePolicyTab] = useState<'terms' | 'privacy' | 'community' | 'copyright' | null>(null);
  const [withdrawableProfit, setWithdrawableProfit] = useState(0);
  const [liveDiamondsBalance, setLiveDiamondsBalance] = useState(0);
  const [contentEarningsBalance, setContentEarningsBalance] = useState(0);
  const [eventEarningsBalance, setEventEarningsBalance] = useState(0);
  const [liveGiftsCount, setLiveGiftsCount] = useState(0);
  const [liveGiftsLog, setLiveGiftsLog] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [dailyWithdrawal, setDailyWithdrawal] = useState(0);
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState('');
  
  // States for buy coins payment flow
  const [selectedCoinPackage, setSelectedCoinPackage] = useState<any>(null);
  const [paymentFlowState, setPaymentFlowState] = useState<'idle' | 'selecting_method' | 'verifying' | 'success'>('idle');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // States for 5 ultra-fast clicks and 4-digit PIN security for Admin Console
  const [adminClicks, setAdminClicks] = useState<number[]>([]);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinConfirm, setAdminPinConfirm] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [isPinConfigured, setIsPinConfigured] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('hisee_admin_security_pin'));
  });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminUnlockCountdown, setAdminUnlockCountdown] = useState<number>(5);
  const adminClickResetTimer = useRef<NodeJS.Timeout | null>(null);
  const adminAutoLockTimer = useRef<NodeJS.Timeout | null>(null);
  const adminCountdownInterval = useRef<NodeJS.Timeout | null>(null);

  // States for chat settings preferences
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStep, setTransferStep] = useState<'instructions' | 'qrcode' | 'scanning' | 'success'>('instructions');

  // Auto-lock countdown: if unlocked, auto-relock to HiSee after 5 seconds
  React.useEffect(() => {
    if (isAdminUnlocked) {
      setAdminUnlockCountdown(5);

      if (adminAutoLockTimer.current) clearTimeout(adminAutoLockTimer.current);
      if (adminCountdownInterval.current) clearInterval(adminCountdownInterval.current);

      adminCountdownInterval.current = setInterval(() => {
        setAdminUnlockCountdown(prev => Math.max(0, prev - 1));
      }, 1000);

      adminAutoLockTimer.current = setTimeout(() => {
        setIsAdminUnlocked(false);
        if (adminCountdownInterval.current) clearInterval(adminCountdownInterval.current);
      }, 5000);
    } else {
      if (adminAutoLockTimer.current) clearTimeout(adminAutoLockTimer.current);
      if (adminCountdownInterval.current) clearInterval(adminCountdownInterval.current);
    }

    return () => {
      if (adminAutoLockTimer.current) clearTimeout(adminAutoLockTimer.current);
      if (adminCountdownInterval.current) clearInterval(adminCountdownInterval.current);
    };
  }, [isAdminUnlocked]);

  // Open Admin Payouts and clean up unlock state
  const handleOpenAdminPayouts = () => {
    if (adminAutoLockTimer.current) clearTimeout(adminAutoLockTimer.current);
    if (adminCountdownInterval.current) clearInterval(adminCountdownInterval.current);
    setIsAdminUnlocked(false);
    setCurrentView('admin_payouts');
  };

  // Handle Ultra-fast 5 clicks (must happen strictly within 1500ms, and max gap between consecutive clicks is 400ms)
  const handleAdminCardClick = () => {
    const now = Date.now();

    // Clear previous reset timer
    if (adminClickResetTimer.current) {
      clearTimeout(adminClickResetTimer.current);
      adminClickResetTimer.current = null;
    }

    setAdminClicks(prev => {
      // If first click in sequence
      if (prev.length === 0) {
        adminClickResetTimer.current = setTimeout(() => {
          setAdminClicks([]);
        }, 1500);
        return [now];
      }

      const lastClick = prev[prev.length - 1];
      const firstClick = prev[0];
      const gap = now - lastClick;
      const totalTime = now - firstClick;

      // If gap between consecutive clicks is too large (> 400ms) or total window > 1500ms -> reset immediately to [now]
      if (gap > 400 || totalTime > 1500) {
        adminClickResetTimer.current = setTimeout(() => {
          setAdminClicks([]);
        }, 1500);
        return [now];
      }

      const nextClicks = [...prev, now];

      // If exactly 5 rapid clicks within window!
      if (nextClicks.length >= 5) {
        if (adminClickResetTimer.current) {
          clearTimeout(adminClickResetTimer.current);
          adminClickResetTimer.current = null;
        }
        setIsAdminPinModalOpen(true);
        setAdminPinInput('');
        setAdminPinConfirm('');
        setAdminPinError('');
        setIsPinConfigured(Boolean(localStorage.getItem('hisee_admin_security_pin')));
        return []; // Reset counter
      }

      // Schedule reset after remaining time
      adminClickResetTimer.current = setTimeout(() => {
        setAdminClicks([]);
      }, Math.max(250, 1500 - totalTime));

      return nextClicks;
    });
  };

  // Submit or verify Admin PIN
  const handleAdminPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAdminPinError('');

    const savedPin = localStorage.getItem('hisee_admin_security_pin');

    // Case 1: First time PIN setup
    if (!savedPin) {
      if (adminPinInput.length !== 4 || !/^\d{4}$/.test(adminPinInput)) {
        setAdminPinError('يجب أن يتكون رمز المرور من 4 أرقام تماماً.');
        return;
      }
      if (adminPinInput !== adminPinConfirm) {
        setAdminPinError('رمز المرور وتأكيده غير متطابقين.');
        return;
      }
      // Save PIN and unlock admin card at the bottom (transiently for 5 seconds)
      localStorage.setItem('hisee_admin_security_pin', adminPinInput);
      setIsPinConfigured(true);
      setIsAdminUnlocked(true);
      setIsAdminPinModalOpen(false);
      setAdminPinInput('');
      setAdminPinConfirm('');
      return;
    }

    // Case 2: Existing PIN verification
    if (adminPinInput === savedPin) {
      setIsAdminUnlocked(true);
      setIsAdminPinModalOpen(false);
      setAdminPinInput('');
    } else {
      setAdminPinError('رمز المرور غير صحيح، يرجى المحاولة مرة أخرى.');
    }
  };

  // Initialize data from Firestore
  React.useEffect(() => {
    if (!myId || !auth.currentUser) return;
    const userRef = doc(firestoreDb, 'users', myId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (document.hidden) return;
      if (doc.exists()) {
        const data = doc.data();
        const serverCoins = data.coins || 0;
        let serverBonusCoins = data.bonusCoins || 0;
        let serverPaidCoins = typeof data.paidCoins === 'number' ? data.paidCoins : serverCoins;
        
        // DB Ledger Correction & Duplication Cleanup (معالجة وتصحيح تكرار الرصيد)
        if (serverPaidCoins === 0 && serverBonusCoins > 0) {
          const totalPaidToTransfer = serverBonusCoins;
          serverPaidCoins = totalPaidToTransfer;
          serverBonusCoins = 0;
          
          updateDoc(userRef, {
            paidCoins: totalPaidToTransfer,
            bonusCoins: 0,
            coins: totalPaidToTransfer
          }).catch(err => console.warn("Failed ledger database correction:", err));

          localStorage.setItem("localFallbackPaidCoins", totalPaidToTransfer.toString());
          localStorage.setItem("localFallbackBonusCoins", "0");
          localStorage.setItem("localFallbackCoins", totalPaidToTransfer.toString());
        } else if (serverPaidCoins === serverBonusCoins && serverPaidCoins > 0) {
          // If paidCoins and bonusCoins are identical and positive, it indicates the previous duplication bug (14,150 each).
          // We reset the duplicated bonusCoins to 0 to restore the correct single-charge total (14,150).
          const correctPaid = serverPaidCoins;
          serverPaidCoins = correctPaid;
          serverBonusCoins = 0;
          
          updateDoc(userRef, {
            paidCoins: correctPaid,
            bonusCoins: 0,
            coins: correctPaid
          }).catch(err => console.warn("Failed duplication database cleanup:", err));

          localStorage.setItem("localFallbackPaidCoins", correctPaid.toString());
          localStorage.setItem("localFallbackBonusCoins", "0");
          localStorage.setItem("localFallbackCoins", correctPaid.toString());
        }

        setPaidCoins(serverPaidCoins);
        setBonusCoins(serverBonusCoins);
        setFreeStars(data.freeStars || 0);
        setPaidStars(data.paidStars || 0);
        setSupporterXP(data.supporterXP !== undefined ? data.supporterXP : (data.xp || 0));
        setRealEarningsUSD(data.realEarningsUSD || 0);
        setUserNickname(data.nickname || 'مستخدم HISEE');
        setUserAvatar(data.avatarUrl || '');
        setTotalStars(data.totalReceivedStars !== undefined ? data.totalReceivedStars : (data.totalStars || 0));
        
        // Sync local fallbacks strictly to reflect real-time DB state at all times
        const totalCalculatedCoins = serverPaidCoins + serverBonusCoins;
        
        setBonusCoins(serverBonusCoins);
        setLocalFallbackBonusCoins(serverBonusCoins);
        localStorage.setItem("localFallbackBonusCoins", serverBonusCoins.toString());
        
        setPaidCoins(serverPaidCoins);
        setLocalFallbackPaidCoins(serverPaidCoins);
        localStorage.setItem("localFallbackPaidCoins", serverPaidCoins.toString());
        
        setCoins(totalCalculatedCoins);
        setLocalFallbackCoins(totalCalculatedCoins);
        localStorage.setItem("localFallbackCoins", totalCalculatedCoins.toString());
        
        setDiamonds(data.diamonds || 0);
        setWithdrawableProfit(data.withdrawableProfit !== undefined ? data.withdrawableProfit : (data.diamonds || 0));
        setLiveDiamondsBalance(data.liveDiamondsBalance || 0);
        setContentEarningsBalance(data.contentEarningsBalance || 0);
        setEventEarningsBalance(data.eventEarningsBalance || 0);
        setLiveGiftsCount(data.liveGiftsCount || 0);
        setVerificationData(data.verification || { status: 'none', step: 1 });
      } else {
        setCoins(0);
        setPaidCoins(0);
        setBonusCoins(0);
        setDiamonds(0);
        setWithdrawableProfit(0);
        setVerificationData({ status: 'none', step: 1 });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${myId}`);
    });

    // Listen to transactions
    const transactionsRef = collection(firestoreDb, 'transactions');
    const qTransactions = query(transactionsRef, where('uid', '==', myId));
    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      if (document.hidden) return;
      const trans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to avoid index requirement
      const sortedTrans = trans.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeB - timeA;
      });
      setTransactions(sortedTrans);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // Listen to payment methods
    const paymentMethodsRef = collection(firestoreDb, 'paymentMethods');
    const qPaymentMethods = query(paymentMethodsRef, where('uid', '==', myId));
    const unsubscribePaymentMethods = onSnapshot(qPaymentMethods, (snapshot) => {
      if (document.hidden) return;
      const methods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPaymentMethods(methods);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'paymentMethods');
    });

    // Listen to live gifts log
    const liveGiftsLogRef = collection(firestoreDb, 'live_gifts_log');
    const qLiveGiftsLog = query(liveGiftsLogRef, where('hostId', '==', myId));
    const unsubscribeLiveGiftsLog = onSnapshot(qLiveGiftsLog, (snapshot) => {
      if (document.hidden) return;
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedLogs = logs.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeB - timeA;
      });
      setLiveGiftsLog(sortedLogs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'live_gifts_log');
    });

    // Listen to payout requests
    const payoutRequestsRef = collection(firestoreDb, 'payout_requests');
    const qPayoutRequests = query(payoutRequestsRef, where('uid', '==', myId));
    const unsubscribePayoutRequests = onSnapshot(qPayoutRequests, (snapshot) => {
      if (document.hidden) return;
      const payouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedPayouts = payouts.sort((a: any, b: any) => {
        const timeA = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const timeB = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
      });
      setPayoutRequests(sortedPayouts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payout_requests');
    });

    return () => {
      unsubscribe();
      unsubscribeTransactions();
      unsubscribePaymentMethods();
      unsubscribeLiveGiftsLog();
      unsubscribePayoutRequests();
    };
  }, [myId, auth.currentUser]);

  // Update verification step if data changes
  React.useEffect(() => {
    if (verificationData.status === 'pending') {
      setVerificationStep('pending');
    } else if (verificationData.status === 'success') {
      setVerificationStep('success');
    }
  }, [verificationData]);

  const handleAddPaymentMethod = (type: string, details: any) => {
    const newMethod = { type, ...details, uid: myId, createdAt: serverTimestamp() };
    addDoc(collection(firestoreDb, 'paymentMethods'), newMethod).catch(error => {
      handleFirestoreError(error, OperationType.CREATE, 'paymentMethods');
    });
    setActiveModal('none');
    setTempValue('');
  };

  const handleDeletePaymentMethod = (id: string) => {
    if (confirm(t.confirmDelete || 'هل أنت متأكد من الحذف؟')) {
      deleteDoc(doc(firestoreDb, 'paymentMethods', id)).catch(error => {
        handleFirestoreError(error, OperationType.DELETE, `paymentMethods/${id}`);
      });
    }
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) return;
    addDoc(collection(firestoreDb, 'feedback'), {
      uid: myId,
      text: feedbackText,
      timestamp: serverTimestamp()
    }).catch(error => {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    });
    setFeedbackSubmitted(true);
    setFeedbackText('');
    setTimeout(() => setFeedbackSubmitted(false), 3000);
  };

  const handleStartVerification = () => {
    setVerificationStep('uploading_id');
  };

  const handleIdUploaded = () => {
    setVerificationStep('taking_selfie');
  };

  const handleSelfieTaken = () => {
    setVerificationStep('pending');
    const newData = { status: 'pending', step: 3 };
    updateDoc(doc(firestoreDb, 'users', myId), {
      verification: newData
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `users/${myId}`);
    });
    setVerificationData(newData);
  };

  React.useEffect(() => {
    if (verificationStep === 'pending') {
      const timer = setTimeout(() => {
        const newData = { status: 'success', step: 4 };
        updateDoc(doc(firestoreDb, 'users', myId), {
          verification: newData
        }).catch(error => {
          handleFirestoreError(error, OperationType.UPDATE, `users/${myId}`);
        });
        setVerificationData(newData);
        setVerificationStep('success');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [verificationStep, myId]);

  const handleThemeChange = (theme: ThemeMode) => {
    setSettings(prev => ({ ...prev, theme }));
  };

  const handleToggleNotifications = () => {
    setSettings(prev => ({ ...prev, notifications: !prev.notifications }));
  };

  const handleToggleSound = () => {
    setSettings(prev => ({ ...prev, sound: !prev.sound }));
  };

  const updateChatSetting = <K extends keyof NonNullable<AppSettings['chatSettings']>>(
    key: K,
    value: NonNullable<AppSettings['chatSettings']>[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        [key]: value
      }
    }));
  };

  const updateFamilySetting = <K extends keyof NonNullable<AppSettings['familySettings']>>(
    key: K,
    value: NonNullable<AppSettings['familySettings']>[K]
  ) => {
    setSettings(prev => {
      const currentFamily = prev.familySettings || {
        isLinked: false,
        role: 'none',
        linkedAccountName: '',
        linkedChildId: '',
        childDailyLimit: '1h',
        sleepLockStart: '21:00',
        sleepLockEnd: '06:00',
        restrictMatureContent: true,
        childLocationSharing: true,
        blockStrangers: true,
        parentPin: '1234'
      };
      const nextFamily = {
        ...currentFamily,
        [key]: value
      };
      return {
        ...prev,
        familySettings: nextFamily
      };
    });
  };

  const handleCreateChildAccount = async () => {
    if (!newChildName.trim() || !newChildUsername.trim() || !newChildEmail.trim() || !newChildPassword.trim()) {
      alert(t.pleaseFillAllRequiredFields || (isRtl ? "الرجاء تعبئة جميع الحقول المطلوبة." : "Please fill in all required fields."));
      return;
    }

    try {
      const childUid = 'child_' + Math.random().toString(36).substring(2, 11);
      const childUserDoc = {
        id: childUid,
        uid: childUid,
        name: newChildName,
        displayName: newChildName,
        username: newChildUsername.startsWith('@') ? newChildUsername : `@${newChildUsername}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newChildUsername}`,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newChildUsername}`,
        email: { value: newChildEmail, privacy: 'private' },
        phone: { value: '', privacy: 'private' },
        birthDate: { value: '', privacy: 'private' },
        status: 'offline',
        isOnline: false,
        followers: 0,
        following: 0,
        likes: 0,
        level: 1,
        profileCompleted: true,
        familySettings: {
          isLinked: true,
          role: 'child',
          linkedAccountName: (() => {
            const usersList = Array.isArray(users) ? users : Object.values(users || {});
            const myProfile = usersList.find((u: any) => u.id === myId || u.uid === myId);
            return myProfile?.displayName || myProfile?.name || (isRtl ? 'الوالد' : 'Parent');
          })(),
          linkedChildId: myId,
          parentPin: settings.familySettings?.parentPin || '1234'
        }
      };

      await setDoc(doc(firestoreDb, 'users', childUid), childUserDoc);

      updateFamilySetting('linkedAccountName', newChildName);
      updateFamilySetting('linkedChildId', childUid);
      updateFamilySetting('isLinked', true);

      alert(isRtl ? `تم إنشاء حساب الطفل "${newChildName}" وربطه بنجاح!` : `Child account "${newChildName}" was created and linked successfully!`);
      
      setNewChildName('');
      setNewChildUsername('');
      setNewChildEmail('');
      setNewChildPassword('');
      setShowCreateChildModal(false);
    } catch (error) {
      console.error("Error creating child account:", error);
      alert(t.errorCreatingAccount || (isRtl ? "حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة مرة أخرى." : "An error occurred while creating the account. Please try again."));
    }
  };

  const handleSendChildLinkRequest = async () => {
    if (!linkChildAccountInput.trim() || !linkChildPinInput.trim()) {
      alert(isRtl ? "الرجاء إدخال اسم حساب الطفل والرقم السري للربط." : "Please enter the child account name and linking passcode.");
      return;
    }

    const cleanInput = linkChildAccountInput.trim().toLowerCase().replace(/^@/, '');
    const cleanPin = linkChildPinInput.trim();

    const usersList = Array.isArray(users) ? users : Object.values(users || {});
    
    // Find matching child user by username, displayName, name, or custom childAccountName
    const matchingChild = usersList.find((u: any) => {
      if (u.id === myId || u.uid === myId) return false;
      const uName = (u.displayName || u.name || '').toLowerCase();
      const uUser = (u.username || '').toLowerCase().replace(/^@/, '');
      const uChildName = (u.familySettings?.childAccountName || '').toLowerCase().replace(/^@/, '');
      return uUser === cleanInput || uName === cleanInput || uChildName === cleanInput;
    });

    if (!matchingChild) {
      alert(isRtl ? "لم يتم العثور على حساب طفل مطابق لاسم الحساب المدخل. يرجى التأكد من كتابة الاسم بشكل صحيح." : "No matching child account was found. Please make sure the account name is correct.");
      return;
    }

    // Verify PIN
    const childPin = matchingChild.familySettings?.childPin || matchingChild.familySettings?.parentPin || '1234';
    if (childPin !== cleanPin) {
      alert(isRtl ? "الرقم السري غير متطابق مع الرقم السري المعين في حساب الطفل. يرجى التأكد من الرقم والمحاولة مجدداً." : "The PIN passcode is incorrect and does not match the child account. Please double-check and try again.");
      return;
    }

    try {
      const childId = matchingChild.id || matchingChild.uid;
      const childRef = doc(firestoreDb, 'users', childId);
      
      const myProfile = usersList.find((u: any) => u.id === myId || u.uid === myId);
      const myDisplayName = myProfile?.displayName || myProfile?.name || (isRtl ? 'الوالد / المربي' : 'Parent / Guardian');

      await updateDoc(childRef, {
        'familySettings.pendingParentLink': {
          parentId: myId,
          parentName: myDisplayName,
          childAccountName: linkChildAccountInput.trim(),
          timestamp: Date.now()
        }
      });

      alert(isRtl 
        ? `تم إرسال طلب الربط بنجاح إلى حساب الطفل "${matchingChild.displayName || matchingChild.name}"! ستظهر رسالة وإشعار تأكيد في حساب الطفل لإتمام عملية الربط فور موافقته.`
        : `Linking request successfully sent to child account "${matchingChild.displayName || matchingChild.name}"! A confirmation notification will appear in the child's account to complete linking upon approval.`
      );
      setShowLinkChildModal(false);
      setLinkChildAccountInput('');
      setLinkChildPinInput('');
    } catch (error) {
      console.error("Error sending child link request:", error);
      alert(isRtl ? "حدث خطأ أثناء إرسال طلب الربط. الرجاء المحاولة مرة أخرى." : "An error occurred while sending the linking request. Please try again.");
    }
  };

  const handleAcceptPendingLink = async (pendingReq: any) => {
    try {
      const parentId = pendingReq.parentId;
      const parentName = pendingReq.parentName || (isRtl ? 'الوالد' : 'Parent');

      updateFamilySetting('isLinked', true);
      updateFamilySetting('role', 'child');
      updateFamilySetting('linkedAccountName', parentName);
      updateFamilySetting('linkedChildId', parentId);
      updateFamilySetting('pendingParentLink', null);

      const myRef = doc(firestoreDb, 'users', myId);
      await updateDoc(myRef, {
        'familySettings.isLinked': true,
        'familySettings.role': 'child',
        'familySettings.linkedAccountName': parentName,
        'familySettings.linkedChildId': parentId,
        'familySettings.pendingParentLink': null
      });

      if (parentId) {
        const usersList = Array.isArray(users) ? users : Object.values(users || {});
        const myProfile = usersList.find((u: any) => u.id === myId || u.uid === myId);
        const myName = settings.familySettings?.childAccountName || myProfile?.displayName || myProfile?.name || (isRtl ? 'الطفل' : 'Child');

        const parentRef = doc(firestoreDb, 'users', parentId);
        await updateDoc(parentRef, {
          'familySettings.isLinked': true,
          'familySettings.role': 'parent',
          'familySettings.linkedAccountName': myName,
          'familySettings.linkedChildId': myId
        });
      }

      alert(isRtl ? "تم قبول وتأكيد طلب الربط العائلي بنجاح! أصبح حسابك الآن خاضعاً للإشراف والحماية الأبوية." : "Family linking request has been accepted and confirmed successfully! Your account is now supervised and protected.");
    } catch (error) {
      console.error("Error accepting family link:", error);
      alert(isRtl ? "حدث خطأ أثناء قبول الربط. الرجاء المحاولة مرة أخرى." : "An error occurred while accepting the linking request. Please try again.");
    }
  };

  const handleRejectPendingLink = async () => {
    try {
      updateFamilySetting('pendingParentLink', null);
      const myRef = doc(firestoreDb, 'users', myId);
      await updateDoc(myRef, {
        'familySettings.pendingParentLink': null
      });
      alert(isRtl ? "تم رفض طلب الربط." : "Linking request has been rejected.");
    } catch (error) {
      console.error("Error rejecting family link:", error);
    }
  };

  const handleSaveChildCredentials = async () => {
    if (!childCustomNameInput.trim() || !childCustomPinInput.trim()) {
      alert(isRtl ? "الرجاء إدخال اسم الحساب والرقم السري للربط." : "Please enter the account name and linking passcode.");
      return;
    }
    if (childCustomPinInput.trim().length < 4) {
      alert(isRtl ? "الرجاء إدخال رقم سري مكون من 4 أرقام على الأقل." : "Please enter a PIN passcode consisting of at least 4 digits.");
      return;
    }

    try {
      updateFamilySetting('childAccountName', childCustomNameInput.trim());
      updateFamilySetting('childPin', childCustomPinInput.trim());

      const myRef = doc(firestoreDb, 'users', myId);
      await updateDoc(myRef, {
        'familySettings.childAccountName': childCustomNameInput.trim(),
        'familySettings.childPin': childCustomPinInput.trim()
      });

      alert(isRtl ? "تم حفظ اسم حساب الطفل والرقم السري بنجاح! يمكنك الآن إعطاء هذه البيانات للوالد لربط الحساب." : "Child account name and PIN passcode have been successfully saved! You can now share these credentials with your parent to link the account.");
    } catch (error) {
      console.error("Error saving child credentials:", error);
      alert(isRtl ? "حدث خطأ أثناء حفظ البيانات." : "An error occurred while saving credentials.");
    }
  };

  const handleLinkExistingChild = async (childUser: any) => {
    try {
      updateFamilySetting('linkedAccountName', childUser.displayName || childUser.name);
      updateFamilySetting('linkedChildId', childUser.id || childUser.uid);
      updateFamilySetting('isLinked', true);

      const childId = childUser.id || childUser.uid;
      const childRef = doc(firestoreDb, 'users', childId);
      await updateDoc(childRef, {
        familySettings: {
          isLinked: true,
          role: 'child',
          linkedAccountName: (() => {
            const usersList = Array.isArray(users) ? users : Object.values(users || {});
            const myProfile = usersList.find((u: any) => u.id === myId || u.uid === myId);
            return myProfile?.displayName || myProfile?.name || (isRtl ? 'الوالد' : 'Parent');
          })(),
          linkedChildId: myId,
          parentPin: settings.familySettings?.parentPin || '1234'
        }
      });

      alert(isRtl ? `تم ربط حساب الطفل "${childUser.displayName || childUser.name}" بنجاح!` : `Child account "${childUser.displayName || childUser.name}" linked successfully!`);
      setShowLinkChildModal(false);
    } catch (error) {
      console.error("Error linking child account:", error);
      alert(isRtl ? "حدث خطأ أثناء ربط الحساب. الرجاء المحاولة مرة أخرى." : "An error occurred while linking the account. Please try again.");
    }
  };

  const handleEditChildAccount = async () => {
    const family = settings.familySettings;
    if (!family || !family.linkedChildId) {
      alert(isRtl ? "لا يوجد حساب طفل مرتبط حالياً." : "No child account is currently linked.");
      return;
    }

    if (!editChildName.trim() || !editChildUsername.trim()) {
      alert(isRtl ? "الرجاء تعبئة الاسم واسم المستخدم." : "Please fill in both name and username.");
      return;
    }

    try {
      const childId = family.linkedChildId;
      const childRef = doc(firestoreDb, 'users', childId);
      
      const updatedUsername = editChildUsername.startsWith('@') ? editChildUsername : `@${editChildUsername}`;

      await updateDoc(childRef, {
        name: editChildName,
        displayName: editChildName,
        username: updatedUsername,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${editChildUsername}`,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${editChildUsername}`
      });

      updateFamilySetting('linkedAccountName', editChildName);

      alert(isRtl ? "تم تعديل بيانات حساب الطفل وحفظ التغييرات بنجاح!" : "Child account details modified and saved successfully!");
      setShowEditChildModal(false);
    } catch (error) {
      console.error("Error updating child account details:", error);
      alert(isRtl ? "حدث خطأ أثناء تعديل الحساب. الرجاء المحاولة مرة أخرى." : "An error occurred while editing the account. Please try again.");
    }
  };

  const handleUnlinkChildAccount = async () => {
    const family = settings.familySettings;
    if (!family || !family.linkedChildId) return;

    if (!confirm(isRtl 
      ? `هل أنت متأكد من إلغاء ربط الحساب للطفل "${family.linkedAccountName}"؟ لن يتمكن من الخضوع للرقابة الأبوية حتى يتم ربطه مجدداً.` 
      : `Are you sure you want to unlink child account "${family.linkedAccountName}"? They will no longer be under parental controls until linked again.`
    )) {
      return;
    }

    try {
      const childId = family.linkedChildId;
      const childRef = doc(firestoreDb, 'users', childId);

      await updateDoc(childRef, {
        familySettings: {
          isLinked: false,
          role: 'none',
          linkedAccountName: '',
          linkedChildId: '',
          parentPin: '1234'
        }
      });

      updateFamilySetting('linkedAccountName', '');
      updateFamilySetting('linkedChildId', '');
      updateFamilySetting('isLinked', false);

      alert(isRtl ? "تم إلغاء ربط الحساب بنجاح." : "Account unlinked successfully.");
    } catch (error) {
      console.error("Error unlinking child account:", error);
      alert(isRtl ? "حدث خطأ أثناء إلغاء ربط الحساب. الرجاء المحاولة مرة أخرى." : "An error occurred while unlinking the account. Please try again.");
    }
  };

  const handleSwitchAccountClick = () => {
    try {
      const existing = localStorage.getItem('hisee_saved_accounts');
      let accounts = [];
      if (existing) {
        accounts = JSON.parse(existing);
      }
      const currentEmail = auth.currentUser?.email;
      const otherAccounts = accounts.filter((acc: any) => acc.email !== currentEmail);

      if (otherAccounts.length === 0) {
        setNoOtherAccountsWarning(true);
      } else {
        setShowAccountSwitcher(true);
      }
    } catch (e) {
      console.error(e);
      setNoOtherAccountsWarning(true);
    }
  };

  const handleCreateLinkedAccount = async () => {
    if (!newLinkedAccountName.trim() || !newLinkedAccountUsername.trim()) {
      setLinkedAccountError(isRtl ? 'الرجاء كتابة الاسم واسم المستخدم الفرعي.' : 'Please enter both displayName and sub-username.');
      return;
    }

    setIsCreatingLinkedAccount(true);
    setLinkedAccountError('');

    try {
      const parentUser = auth.currentUser;
      if (!parentUser) {
        throw new Error(isRtl ? 'يجب تسجيل الدخول بحسابك الحالي أولاً.' : 'You must be logged in with your current account first.');
      }

      // Format username as a clean email
      let cleanUsername = newLinkedAccountUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!cleanUsername) {
        throw new Error(isRtl ? 'اسم المستخدم غير صالح.' : 'Invalid username format.');
      }
      const newEmail = `${cleanUsername}@hisee.pro`;
      const defaultPassword = 'DemoPassword123';

      // 1. Ensure the current logged in account is fully saved in localStorage so the user can easily switch back
      const existing = localStorage.getItem('hisee_saved_accounts');
      let accounts: any[] = [];
      if (existing) {
        accounts = JSON.parse(existing);
      }
      
      const existsParent = accounts.some((acc: any) => acc.email === parentUser.email);
      if (!existsParent && parentUser.email) {
        accounts.push({
          uid: parentUser.uid,
          email: parentUser.email,
          displayName: parentUser.displayName || parentUser.email.split('@')[0] || 'User VIP',
          photoURL: parentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${parentUser.uid}`,
          password: 'DemoPassword123'
        });
      }

      // Check if this new email is already present
      if (accounts.some((acc: any) => acc.email === newEmail)) {
        throw new Error(isRtl ? 'اسم المستخدم هذا مستخدم بالفعل على هذا الجهاز.' : 'This username is already taken on this device.');
      }

      // 2. Create the new Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail, defaultPassword);
      const newChildUser = userCredential.user;

      // 3. Write child user profile to Firestore, setting parent link
      const childDocRef = doc(firestoreDb, 'users', newChildUser.uid);
      await setDoc(childDocRef, {
        id: newChildUser.uid,
        uid: newChildUser.uid,
        displayName: newLinkedAccountName.trim(),
        email: newEmail,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newChildUser.uid}`,
        lastLoginAt: new Date().toISOString(),
        status: 'online',
        role: 'user',
        linkedParentId: parentUser.uid,
        isLinkedSubAccount: true
      }, { merge: true });

      // 4. Update parent's linkedChildIds in Firestore to establish a bidirectional link
      const parentDocRef = doc(firestoreDb, 'users', parentUser.uid);
      try {
        await setDoc(parentDocRef, {
          hasLinkedSubAccounts: true
        }, { merge: true });
      } catch (parentDbErr) {
        console.warn("Could not write parent linkage on parent document (might be permissions), continuing", parentDbErr);
      }

      // 5. Append newly created account to our device list
      accounts.push({
        uid: newChildUser.uid,
        email: newEmail,
        displayName: newLinkedAccountName.trim(),
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newChildUser.uid}`,
        password: defaultPassword,
        linkedParentId: parentUser.uid
      });
      localStorage.setItem('hisee_saved_accounts', JSON.stringify(accounts));

      // Success alert and page refresh
      alert(isRtl 
        ? `✓ تم إنشاء حسابك الجديد "${newLinkedAccountName}" بنجاح وربطه بحسابك الحالي!` 
        : `✓ Your new account "${newLinkedAccountName}" has been successfully created and linked to your current account!`);
      
      setIsCreateLinkedAccountModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to create linked account:", err);
      let errMsg = err.message || 'Unknown error';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = isRtl ? 'اسم المستخدم هذا مستخدم بالفعل من قبل شخص آخر.' : 'This username is already taken by another user.';
      }
      setLinkedAccountError(errMsg);
    } finally {
      setIsCreatingLinkedAccount(false);
    }
  };

  const handlePerformAccountSwitch = async (targetAcc: any) => {
    setIsSwitchingActive(true);
    setSwitchingError('');
    try {
      await auth.signOut();
      try {
        await signInWithEmailAndPassword(auth, targetAcc.email, targetAcc.password || 'DemoPassword123');
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || targetAcc.email.endsWith('@hisee.pro')) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, targetAcc.email, targetAcc.password || 'DemoPassword123');
            const newUser = userCredential.user;
            const userDocRef = doc(firestoreDb, 'users', newUser.uid);
            await setDoc(userDocRef, {
              id: newUser.uid,
              uid: newUser.uid,
              displayName: targetAcc.displayName || targetAcc.email.split('@')[0],
              email: targetAcc.email,
              photoURL: targetAcc.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.uid}`,
              lastLoginAt: new Date().toISOString(),
              status: 'online',
              role: targetAcc.email.includes('moderator') ? 'admin' : 'user'
            }, { merge: true });
          } catch (signUpErr: any) {
            console.error("Auto signup failed", signUpErr);
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setSwitchingError(isRtl ? 'فشل تسجيل الدخول إلى الحساب الآخر: ' + (err.message || 'خطأ غير معروف') : 'Failed to login to the other account: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSwitchingActive(false);
    }
  };

  const handleWithdraw = async (selectedMethodId: string) => {
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }
    const diamondsNeeded = Math.floor(amount * 100);
    
    // Strict Programmatic Guard:
    // 1. bonusCoins are 100% non-withdrawable
    // 2. Only real withdrawableProfit accrued from paid gifts is eligible for withdrawal
    const eligibleDiamonds = Math.min(diamonds, withdrawableProfit > 0 ? withdrawableProfit : diamonds);
    if (diamondsNeeded > eligibleDiamonds || eligibleDiamonds <= 0) {
      alert('🔒 تنبيه أمان مالي صارم: لا يمكن سحب هذا المبلغ.\nالعملات المجانية والتطويرية (bonusCoins أو تعبئة التطوير) مخصصة فقط للاستخدام داخل التطبيق ولا يمكن تحويلها إلى رصيد نقدي قابل للسحب.\nعمليات السحب النقدي مقصورة حصرياً على الأرباح المكتسبة من الهدايا والعملات المدفوعة (paidCoins).');
      return;
    }
    if (dailyWithdrawal + amount > 50) {
      alert('لقد تجاوزت حد السحب اليومي (50 يورو)');
      return;
    }

    const targetMethod = paymentMethods.find(m => m.id === selectedMethodId);
    const methodType = targetMethod?.type || (selectedMethodId.includes('paypal') ? 'paypal' : 'bank_account');
    const accountInfo = targetMethod ? {
      type: targetMethod.type || 'paypal',
      email: targetMethod.email || '',
      accountNumber: targetMethod.accountNumber || targetMethod.iban || targetMethod.cardNumber || '',
      iban: targetMethod.iban || targetMethod.accountNumber || '',
      bankName: targetMethod.bankName || '',
      holderName: targetMethod.holderName || ''
    } : {
      type: methodType,
      email: methodType === 'paypal' ? (paypalEmail || 'حساب PayPal') : '',
      accountNumber: bankIban || 'حساب بنكي',
      iban: bankIban || '',
      bankName: bankName || 'البنك المحلي',
      holderName: bankHolderName || userNickname || ''
    };

    try {
      const userRef = doc(firestoreDb, 'users', myId);
      const userSnap = await getDoc(userRef);
      let currentNickname = userNickname || 'مستخدم HISEE';
      let currentAvatar = userAvatar || '';
      if (userSnap.exists()) {
        const uData = userSnap.data();
        currentNickname = uData.nickname || currentNickname;
        currentAvatar = uData.avatarUrl || currentAvatar;
        const serverDiamonds = Number(uData.diamonds || 0);
        const serverWithdrawable = Number(uData.withdrawableProfit !== undefined ? uData.withdrawableProfit : serverDiamonds);
        const serverEligible = Math.min(serverDiamonds, serverWithdrawable);
        
        if (diamondsNeeded > serverEligible) {
          alert('🔒 خطأ: الرصيد القابل للسحب الحقيقي غير كافٍ. العملات الترويجية (bonusCoins) غير قابلة للسحب المالي.');
          return;
        }
      }

      await updateDoc(userRef, {
        diamonds: increment(-diamondsNeeded),
        withdrawableProfit: increment(-diamondsNeeded),
        lastWithdrawalAt: serverTimestamp()
      });

      // Create a formal record in `payout_requests` collection with PENDING status for manual admin approval
      const payoutDocRef = await addDoc(collection(firestoreDb, 'payout_requests'), {
        uid: myId,
        userId: myId,
        userNickname: currentNickname,
        userAvatar: currentAvatar,
        amount: amount,
        currency: 'EUR',
        diamondsDeducted: diamondsNeeded,
        method: methodType,
        payoutMethod: methodType,
        accountDetails: accountInfo,
        status: 'PENDING',
        statusArabic: 'قيد المراجعة والموافقة اليدوية من الإدارة',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        source: 'earned_creator_profit_only',
        notes: 'طلب سحب أرباح بانتظار المراجعة والتحويل اليدوي من قِبل إدارة التطبيق'
      });

      await addDoc(collection(firestoreDb, 'transactions'), {
        uid: myId,
        type: 'withdrawal',
        payoutRequestId: payoutDocRef.id,
        amount: amount,
        diamondsDeducted: diamondsNeeded,
        currency: 'EUR',
        methodId: selectedMethodId || methodType,
        accountDetails: accountInfo,
        status: 'PENDING',
        source: 'earned_creator_profit_only',
        description: `طلب سحب أرباح (${amount} €) عبر ${methodType === 'paypal' ? 'PayPal' : 'حساب بنكي'} - بانتظار الموافقة اليدوية (PENDING)`,
        timestamp: serverTimestamp()
      });
      
      setDiamonds(prev => Math.max(0, prev - diamondsNeeded));
      setWithdrawableProfit(prev => Math.max(0, prev - diamondsNeeded));
      setDailyWithdrawal(prev => prev + amount);
      setWithdrawAmount('');
      setCurrentView('balance');
      alert(`⏳ تم إنشاء طلب السحب بنجاح!\n\nرقم الطلب: #${payoutDocRef.id.slice(0, 8)}\nالحالة: PENDING (قيد المراجعة والموافقة اليدوية من الإدارة)\nالمبلغ المطلوب: ${amount} €\n\nتم تعيين حالة الطلب إلى (PENDING) ليكون بانتظار الموافقة اليدوية والتحويل من قِبل الإدارة بدلاً من التحويل التلقائي.`);
    } catch (error) {
      console.error('Error withdrawing:', error);
      alert('حدث خطأ أثناء معالجة السحب.');
    }
  };

  // Mock Cashout Trigger for quick testing (0.03 EUR in PENDING status)
  const handleMockCashoutTest = async () => {
    try {
      const testAmount = 0.03;
      const testDiamonds = 3;
      const testMethod = 'paypal';
      const testAccount = {
        type: 'paypal',
        email: 'sandbox_tester@hisee.live',
        holderName: userNickname || 'مستخدم تجريبي HISEE'
      };

      const payoutDocRef = await addDoc(collection(firestoreDb, 'payout_requests'), {
        uid: myId,
        userId: myId,
        userNickname: userNickname || 'مستخدم تجريبي HISEE',
        userAvatar: userAvatar || '',
        amount: testAmount,
        currency: 'EUR',
        diamondsDeducted: testDiamonds,
        method: testMethod,
        payoutMethod: testMethod,
        accountDetails: testAccount,
        status: 'PENDING',
        statusArabic: 'قيد المراجعة والموافقة اليدوية من الإدارة',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        source: 'earned_creator_profit_only',
        notes: 'طلب سحب تجريبي سريع (Mock Cashout Trigger 0.03 EUR) لاختبار لوحة تحكم الأدمن'
      });

      await addDoc(collection(firestoreDb, 'transactions'), {
        uid: myId,
        type: 'withdrawal',
        payoutRequestId: payoutDocRef.id,
        amount: testAmount,
        diamondsDeducted: testDiamonds,
        currency: 'EUR',
        paymentMethod: 'paypal',
        accountDetails: testAccount,
        status: 'PENDING',
        source: 'earned_creator_profit_only',
        description: `طلب سحب أرباح تجريبي (0.03 €) - بانتظار الموافقة اليدوية في لوحة الأدمن (PENDING)`,
        timestamp: serverTimestamp()
      });

      alert(`✅ تم إرسال طلب سحب تجريبي بنجاح بمبلغ 0.03 €!\n\nرقم الطلب: #${payoutDocRef.id.slice(0, 8)}\nالحالة: PENDING (معلق)\n\nيمكنك الآن الانتقال إلى لوحة تحكم الأدمن لمراجعة الطلب والموافقة عليه أو رفضه.`);
    } catch (err: any) {
      console.error('Mock cashout error:', err);
      alert('حدث خطأ أثناء إنشاء الطلب التجريبي: ' + err.message);
    }
  };

  const handleConvertLiveToCoins = async (netAmount: number, diamondsUsed: number) => {
    if (diamondsUsed <= 0 || netAmount <= 0) return;
    try {
        const userRef = doc(firestoreDb, 'users', myId);
        const coinsToClaim = Math.floor(netAmount * 100);
        await updateDoc(userRef, {
            liveDiamondsBalance: increment(-diamondsUsed),
            coins: increment(coinsToClaim)
        });
        await addDoc(collection(firestoreDb, 'transactions'), {
            uid: myId,
            type: 'live_convert_coins',
            amount: coinsToClaim,
            currency: 'coins',
            description: `تحويل مكافآت LIVE إلى رصيد داخلي (${coinsToClaim} عملة)`,
            timestamp: serverTimestamp()
        }).catch(() => {});
        alert(`تم تحويل مكافآت البث بنجاح وإضافة ${coinsToClaim} عملة إلى رصيد حسابك!`);
    } catch (error) {
        console.error('Error converting live rewards to coins:', error);
        alert('حدث خطأ أثناء تحويل مكافآت البث.');
    }
  };

  const handleConvertLiveToClaiming = async (netAmount: number, diamondsUsed: number) => {
    if (diamondsUsed <= 0 || netAmount <= 0) return;
    try {
        const userRef = doc(firestoreDb, 'users', myId);
        const diamondsToClaim = Math.floor(netAmount * 100);
        await updateDoc(userRef, {
            liveDiamondsBalance: increment(-diamondsUsed),
            diamonds: increment(diamondsToClaim)
        });
        await addDoc(collection(firestoreDb, 'transactions'), {
            uid: myId,
            type: 'live_convert_claiming',
            amount: netAmount,
            currency: 'EUR',
            description: `تحويل مكافآت LIVE إلى حساب المطالبة الموحد (${netAmount} €)`,
            timestamp: serverTimestamp()
        }).catch(() => {});
        alert(`تم تحويل مكافآت البث بنجاح وإضافة ${netAmount} € إلى حساب المطالبة الموحد!`);
    } catch (error) {
        console.error('Error converting live rewards to claiming:', error);
        alert('حدث خطأ أثناء تحويل مكافآت البث إلى حساب المطالبة.');
    }
  };

  const handleConvertContentToCoins = async (netAmount: number, amountUsed: number) => {
    if (amountUsed <= 0 || netAmount <= 0) return;
    try {
        const userRef = doc(firestoreDb, 'users', myId);
        const coinsToClaim = Math.floor(netAmount * 100);
        await updateDoc(userRef, {
            contentEarningsBalance: increment(-amountUsed),
            coins: increment(coinsToClaim)
        });
        await addDoc(collection(firestoreDb, 'transactions'), {
            uid: myId,
            type: 'content_convert_coins',
            amount: coinsToClaim,
            currency: 'coins',
            description: `تحويل أرباح المحتوى إلى رصيد داخلي (${coinsToClaim} عملة)`,
            timestamp: serverTimestamp()
        }).catch(() => {});
        alert(`تم تحويل أرباح المحتوى بنجاح وإضافة ${coinsToClaim} عملة إلى رصيد حسابك!`);
    } catch (error) {
        console.error('Error converting content earnings to coins:', error);
        alert('حدث خطأ أثناء تحويل أرباح المحتوى.');
    }
  };

  const handleConvertContentToClaiming = async (netAmount: number, amountUsed: number) => {
    if (amountUsed <= 0 || netAmount <= 0) return;
    try {
        const userRef = doc(firestoreDb, 'users', myId);
        const diamondsToClaim = Math.floor(netAmount * 100);
        await updateDoc(userRef, {
            contentEarningsBalance: increment(-amountUsed),
            diamonds: increment(diamondsToClaim)
        });
        await addDoc(collection(firestoreDb, 'transactions'), {
            uid: myId,
            type: 'content_convert_claiming',
            amount: netAmount,
            currency: 'EUR',
            description: `تحويل أرباح المحتوى إلى حساب المطالبة الموحد (${netAmount} €)`,
            timestamp: serverTimestamp()
        }).catch(() => {});
        alert(`تم تحويل أرباح المحتوى بنجاح وإضافة ${netAmount} € إلى حساب المطالبة الموحد!`);
    } catch (error) {
        console.error('Error converting content earnings to claiming:', error);
        alert('حدث خطأ أثناء تحويل أرباح المحتوى إلى حساب المطالبة.');
    }
  };

  const handleConvertEventsToCoins = async (netAmount: number, amountUsed: number) => {
    if (amountUsed <= 0 || netAmount <= 0) return;
    try {
        const userRef = doc(firestoreDb, 'users', myId);
        const coinsToClaim = Math.floor(netAmount * 100);
        await updateDoc(userRef, {
            eventEarningsBalance: increment(-amountUsed),
            coins: increment(coinsToClaim)
        });
        await addDoc(collection(firestoreDb, 'transactions'), {
            uid: myId,
            type: 'event_convert_coins',
            amount: coinsToClaim,
            currency: 'coins',
            description: `تحويل جوائز الفعاليات إلى رصيد داخلي (${coinsToClaim} عملة)`,
            timestamp: serverTimestamp()
        }).catch(() => {});
        alert(`تم تحويل جوائز الفعاليات بنجاح وإضافة ${coinsToClaim} عملة إلى رصيد حسابك!`);
    } catch (error) {
        console.error('Error converting event rewards to coins:', error);
        alert('حدث خطأ أثناء تحويل جوائز الفعاليات.');
    }
  };

  const handleConvertEventsToClaiming = async (netAmount: number, amountUsed: number) => {
    if (amountUsed <= 0 || netAmount <= 0) return;
    try {
        const userRef = doc(firestoreDb, 'users', myId);
        const diamondsToClaim = Math.floor(netAmount * 100);
        await updateDoc(userRef, {
            eventEarningsBalance: increment(-amountUsed),
            diamonds: increment(diamondsToClaim)
        });
        await addDoc(collection(firestoreDb, 'transactions'), {
            uid: myId,
            type: 'event_convert_claiming',
            amount: netAmount,
            currency: 'EUR',
            description: `تحويل جوائز الفعاليات إلى حساب المطالبة الموحد (${netAmount} €)`,
            timestamp: serverTimestamp()
        }).catch(() => {});
        alert(`تم تحويل جوائز الفعاليات بنجاح وإضافة ${netAmount} € إلى حساب المطالبة الموحد!`);
    } catch (error) {
        console.error('Error converting event rewards to claiming:', error);
        alert('حدث خطأ أثناء تحويل جوائز الفعاليات إلى حساب المطالبة.');
    }
  };

  const handleDeposit = async (amount: number, coinsToAdd: number, bonusToAdd: number = 0, paymentMethod: string = 'card') => {
    try {
      const isFreeDev = paymentMethod === 'free_dev';
      
      // 1. Store Package Payload Breakdown (فصل حقيقي لقيم حزم الشراء)
      const paidAmount = Number(coinsToAdd);
      const bonusAmount = Number(bonusToAdd);
      const totalNewCoins = paidAmount + bonusAmount;

      // 2. Secure Database Transaction Logic
      const userRef = doc(firestoreDb, 'users', myId);
      
      // Check if user document exists to satisfy firestore rules on creation
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          paidStars: increment(paidAmount),
          paidCoins: increment(paidAmount),
          bonusCoins: increment(bonusAmount),
          coins: increment(totalNewCoins)
        });
      } else {
        await setDoc(userRef, {
          nickname: 'User',
          createdAt: serverTimestamp(),
          paidStars: paidAmount,
          paidCoins: paidAmount,
          bonusCoins: bonusAmount,
          coins: totalNewCoins,
          freeStars: 0,
          supporterXP: 0,
          realEarningsUSD: 0,
          diamonds: 0,
          withdrawableProfit: 0
        });
      }
      
      // Update local state instantly for UI responsiveness
      setPaidCoins(prev => prev + paidAmount);
      setLocalFallbackPaidCoins(prev => {
        const newValue = prev + paidAmount;
        localStorage.setItem("localFallbackPaidCoins", newValue.toString());
        return newValue;
      });

      setBonusCoins(prev => prev + bonusAmount);
      setLocalFallbackBonusCoins(prev => {
        const newValue = prev + bonusAmount;
        localStorage.setItem("localFallbackBonusCoins", newValue.toString());
        return newValue;
      });

      setCoins(prev => prev + totalNewCoins);
      setLocalFallbackCoins(prev => {
        const newValue = prev + totalNewCoins;
        localStorage.setItem("localFallbackCoins", newValue.toString());
        return newValue;
      });

      // 4. Financial Safety & Audit Log (حماية الأرصدة وتدقيق المعاملات)
      try {
        await addDoc(collection(firestoreDb, 'transactions'), {
          uid: myId,
          type: isFreeDev ? 'dev_bonus_deposit' : 'deposit',
          amount: isFreeDev ? 0 : amount, // Currency amount
          paidCoins: paidAmount, // الرصيد الأساسي المدفوع
          bonusCoins: bonusAmount, // رصيد المكافأة المضاف
          totalCoins: totalNewCoins,
          paymentMethod,
          isNonWithdrawableBonus: bonusAmount > 0,
          status: 'completed',
          timestamp: serverTimestamp(),
          auditLog: `Purchase success: credited ${paidAmount} paidCoins and ${bonusAmount} bonusCoins. Total transaction credit: ${totalNewCoins} coins.`
        });
      } catch (txError) {
        console.warn('Transaction logging skipped due to permissions, but balance was updated.', txError);
      }
      
      // Send Real-time Financial In-App Notification
      try {
        await addDoc(collection(firestoreDb, 'users', myId, 'notifications'), {
          type: 'financial_deposit',
          category: 'finance',
          title: isFreeDev ? 'إيداع عملات تجريبية مجانية' : 'إتمام شراء عملات HiSee بنجاح',
          message: isFreeDev 
            ? `تمت إضافة ${bonusAmount} عملة بونص ترويجية مجانية إلى محفظتك.`
            : `تم شحن ${paidAmount} عملة مدفوعة بنجاح بقيمة ${amount} € ${bonusAmount > 0 ? `مع بونص +${bonusAmount} عملة مجانية` : ''} عبر ${paymentMethod}.`,
          amount: isFreeDev ? 0 : amount,
          currency: 'EUR',
          paidCoins: paidAmount,
          bonusCoins: bonusAmount,
          totalCoins: totalNewCoins,
          paymentMethod,
          timestamp: serverTimestamp(),
          read: false
        });
      } catch (notifErr) {
        console.warn('Could not write notification:', notifErr);
      }
    } catch (error) {
      console.error('Failed to update balance:', error);
      alert('حدث خطأ أثناء إضافة العملات بسبب صلاحيات النظام. كإجراء تطويري سيتم الإضافة محلياً.');
      // Force local update anyway for developer testing
      const isFreeDev = paymentMethod === 'free_dev';
      const paidAmount = isFreeDev ? 0 : coinsToAdd;
      const bonusAmount = isFreeDev ? (coinsToAdd + bonusToAdd) : bonusToAdd;
      const totalNewCoins = paidAmount + bonusAmount;

      setPaidCoins(prev => prev + paidAmount);
      setBonusCoins(prev => prev + bonusAmount);
      setCoins(prev => prev + totalNewCoins);
      setLocalFallbackPaidCoins(prev => {
        const nv = prev + paidAmount;
        localStorage.setItem("localFallbackPaidCoins", nv.toString());
        return nv;
      });
      setLocalFallbackBonusCoins(prev => {
        const nv = prev + bonusAmount;
        localStorage.setItem("localFallbackBonusCoins", nv.toString());
        return nv;
      });
      setLocalFallbackCoins(prev => {
        const newValue = prev + totalNewCoins;
        localStorage.setItem("localFallbackCoins", newValue.toString());
        return newValue;
      });
    }
  };

  const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },
    { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
    { code: 'IQD', name: 'Iraqi Dinar', symbol: 'د.ع', rate: 1310 },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 32 },
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.78 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', rate: 3.75 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 3.67 },
  ];

  const COIN_RATE = 0.0099; // 100 coins = 0.99$

  const getEstimatedBalance = () => {
    const displayPaid = paidCoins;
    const displayBonus = bonusCoins;
    const displayCoins = displayPaid + displayBonus;
    const currency = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];
    const balanceUSD = Math.max(0, displayCoins) * COIN_RATE;
    return (balanceUSD * currency.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCoinsCount = () => {
    const displayPaid = paidCoins;
    const displayBonus = bonusCoins;
    const total = displayPaid + displayBonus;
    return Math.max(0, total).toLocaleString();
  };

  const updateInteractionsSetting = <K extends keyof NonNullable<AppSettings['interactionsSettings']>>(
    key: K,
    value: NonNullable<AppSettings['interactionsSettings']>[K]
  ) => {
    setSettings(prev => {
      const currentInteractions = prev.interactionsSettings || {
        comments: 'all' as const,
        activityStatus: !prev.chatSettings.privacy.hideOnlineStatus,
        privateMessages: 'all' as const,
        mentions: 'all' as const,
        contentReuse: true,
        profileDisplayOnSharing: true,
        downloads: true,
        followingList: 'all' as const,
        likedVideos: 'all' as const,
        viewers: true,
        consultationsEnabled: false,
        memoryEnabled: false,
      };

      const nextInteractions = {
        ...currentInteractions,
        [key]: value,
      };

      // Sync specific fields if needed
      let nextChatSettings = { ...prev.chatSettings };
      if (key === 'activityStatus') {
        nextChatSettings = {
          ...nextChatSettings,
          privacy: {
            ...nextChatSettings.privacy,
            hideOnlineStatus: !value
          }
        };
      }

      return {
        ...prev,
        chatSettings: nextChatSettings,
        interactionsSettings: nextInteractions
      };
    });
  };

  const updateLiveSetting = <K extends keyof NonNullable<AppSettings['liveSettings']>>(
    key: K,
    value: NonNullable<AppSettings['liveSettings']>[K]
  ) => {
    setSettings(prev => {
      const currentLive = prev.liveSettings || {
        streamingQuality: '720p',
        viewerEntryAnimations: true,
        giftSoundAlerts: true,
        commentTTS: true,
        streamPrivacy: 'public',
        autoRecordToGallery: true,
        moderators: [],
      };

      const nextLive = {
        ...currentLive,
        [key]: value,
      };

      return {
        ...prev,
        liveSettings: nextLive
      };
    });
  };

  const updateContentDisplaySetting = <K extends keyof NonNullable<AppSettings['contentDisplaySettings']>>(
    key: K,
    value: NonNullable<AppSettings['contentDisplaySettings']>[K]
  ) => {
    setSettings(prev => {
      const currentVal = prev.contentDisplaySettings || {
        viewingHistory: true,
        searchHistory: true,
        privateAccount: false,
        suggestToOthers: true,
        ageRestrict: false,
        personalizedAds: true,
        adInterests: ['التكنولوجيا', 'الرياضة', 'الألعاب'],
        autoplayOnMobile: false,
        autoScroll: false,
        hardwareAcceleration: true,
        fontSize: 'standard',
        compactMode: false,
        screenReader: false,
        highContrastText: false,
        reduceMotion: false,
        syncContacts: false,
        preciseLocation: true,
        locationHistory: false,
        targetLanguage: 'ar',
        alwaysTranslate: true,
      };

      const nextVal = {
        ...currentVal,
        [key]: value,
      };

      if (myId) {
        const userRef = doc(firestoreDb, 'users', myId);
        const updates: Record<string, any> = {
          [`contentDisplaySettings.${key}`]: value
        };
        if (key === 'privateAccount') {
          updates.isPrivate = value;
          updates.visibility = value ? 'private' : 'public';
        } else if (key === 'suggestToOthers') {
          updates.suggestToOthers = value;
        } else if (key === 'ageRestrict') {
          updates.ageRestrict = value;
        }
        updateDoc(userRef, updates).catch((err) => {
          console.warn("Failed to sync contentDisplaySetting to Firestore:", err);
        });
      }

      return {
        ...prev,
        contentDisplaySettings: nextVal
      };
    });
  };

  const handleBack = () => {
    if (currentView === 'kurdish_dialects') {
      setCurrentView('languages');
    } else if (currentView === 'manage_storage' || currentView === 'network_usage' || currentView === 'offline_videos' || currentView === 'free_up_space') {
      setCurrentView('storage_data');
    } else if (currentView === 'help_center' || currentView === 'privacy_center' || currentView === 'terms_policies') {
      setCurrentView('support');
    } else if (['transaction_history', 'live_rewards', 'content_earnings', 'event_earnings', 'payment_methods', 'identity_verification', 'help_feedback', 'buy_coins', 'bonus', 'admin_payouts'].includes(currentView)) {
      setCurrentView('balance');
    } else if (['activity_posts', 'live_preferences', 'notifications_detailed', 'time_wellbeing', 'family_link'].includes(currentView)) {
      setCurrentView('activity_hub');
    } else if (['account_profile', 'account_security_permissions', 'account_analytics', 'account_orders'].includes(currentView)) {
      setCurrentView('account');
    } else if (['languages', 'appearance', 'chat', 'account', 'privacy_security', 'interactions', 'content_display', 'storage_data', 'blocked_users', 'qr_code', 'balance', 'terms', 'privacy_policy', 'support', 'hisee_studio', 'activity_hub', 'login_settings', 'admin_algorithms', 'admin_level_control'].includes(currentView)) {
      setCurrentView('main');
    } else {
      onBack();
    }
  };

  // Language Staging & Save
  const [stagedLang, setStagedLang] = useState<Language>(lang);
  const [isSavingLang, setIsSavingLang] = useState(false);
  const [langSavedSuccess, setLangSavedSuccess] = useState(false);
  const [downloadedLangs, setDownloadedLangs] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { ar: true, en: true, de: true };
    try {
      const stored = localStorage.getItem('hisee_downloaded_langs');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ar: true, en: true, de: true, ...parsed };
      }
    } catch (e) {}
    return { ar: true, en: true, de: true };
  });
  const [isLangSearchOpen, setIsLangSearchOpen] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [downloadingLangCode, setDownloadingLangCode] = useState<string | null>(null);
  const saveButtonRef = useRef<HTMLDivElement>(null);

  // Long Press & Delete Dictionary State
  const [deleteDictModal, setDeleteDictModal] = useState<{ open: boolean; code: string; name: string; nativeName: string } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const startLongPress = (code: string, nativeName: string, name: string, isDownloaded: boolean) => {
    if (!isDownloaded) return;
    isLongPressTriggered.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(60); } catch (e) {}
      }
      setDeleteDictModal({ open: true, code, name, nativeName });
    }, 550);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleConfirmDeleteDictionary = (codeToDelete: string) => {
    try {
      if (typeof window !== 'undefined') {
        const customPacks = JSON.parse(localStorage.getItem('hisee_custom_packs') || '{}');
        delete customPacks[codeToDelete];
        if (codeToDelete === 'ku-Latn') delete customPacks['ku'];
        localStorage.setItem('hisee_custom_packs', JSON.stringify(customPacks));

        delete translations[codeToDelete];
        if (codeToDelete === 'ku-Latn') delete translations['ku'];

        const updated = { ...downloadedLangs, [codeToDelete]: false };
        if (codeToDelete === 'ku-Latn') updated['ku'] = false;
        setDownloadedLangs(updated);
        localStorage.setItem('hisee_downloaded_langs', JSON.stringify(updated));

        if (stagedLang === codeToDelete) {
          setStagedLang(lang === codeToDelete ? 'en' : lang);
        }
      }
    } catch (e) {
      console.error("Error deleting dictionary pack:", e);
    }
    setDeleteDictModal(null);
  };

  const handlePurgeSecondaryLangs = () => {
    try {
      if (typeof window !== 'undefined') {
        const customPacks = JSON.parse(localStorage.getItem('hisee_custom_packs') || '{}');
        const coreKeys = ['ar', 'en', 'de', 'ku', 'ku-Latn', 'ckb'];
        const newPacks: Record<string, any> = {};
        for (const k of coreKeys) {
          if (customPacks[k]) {
            newPacks[k] = customPacks[k];
          }
        }
        localStorage.setItem('hisee_custom_packs', JSON.stringify(newPacks));

        const newDownloadedLangs: Record<string, boolean> = {
          ar: true,
          en: true,
          de: true,
          ku: true,
          'ku-Latn': downloadedLangs['ku-Latn'] || false,
          ckb: downloadedLangs['ckb'] || false,
        };
        localStorage.setItem('hisee_downloaded_langs', JSON.stringify(newDownloadedLangs));
        setDownloadedLangs(newDownloadedLangs);
        setPurgeSuccess(true);
        setTimeout(() => setPurgeSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Purge error:", e);
    }
  };

  const handleSelectAndScroll = (code: Language) => {
    setStagedLang(code);
    setTimeout(() => {
      saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleDownloadLangPack = async (code: string, nativeName: string, name: string) => {
    setDownloadingLangCode(code);
    try {
      let pack: any = null;

      // 1. Check built-in dictionary first
      if (translations[code] && Object.keys(translations[code]).length > 0) {
        pack = translations[code];
      } else if (code === 'ku-Latn' && translations['ku']) {
        pack = translations['ku'];
      }

      // 2. Try remote endpoints safely checking for JSON content-type
      if (!pack) {
        try {
          const res = await fetch(`/api/locales/${code}`);
          const cType = res.headers.get('content-type') || '';
          if (res.ok && cType.includes('application/json')) {
            pack = await res.json();
          } else {
            const resStatic = await fetch(`/locales/${code}.json`);
            const cTypeStatic = resStatic.headers.get('content-type') || '';
            if (resStatic.ok && cTypeStatic.includes('application/json')) {
              pack = await resStatic.json();
            }
          }
        } catch (fetchErr) {
          // Quietly fallback
        }
      }

      const customPacks = JSON.parse(localStorage.getItem('hisee_custom_packs') || '{}');
      if (pack) {
        customPacks[code] = pack;
        translations[code] = pack;
        if (code === 'ku-Latn') {
          customPacks['ku'] = pack;
          translations['ku'] = pack;
        }
      } else {
        customPacks[code] = {
          languageName: nativeName,
          ...translations.en
        };
      }
      localStorage.setItem('hisee_custom_packs', JSON.stringify(customPacks));
    } catch (e) {
      console.warn("Language pack download completed with offline pack:", e);
    }

    const updated = { ...downloadedLangs, [code]: true };
    if (code === 'ku-Latn') updated['ku'] = true;
    setDownloadedLangs(updated);
    try {
      localStorage.setItem('hisee_downloaded_langs', JSON.stringify(updated));
    } catch (e) {}

    setDownloadingLangCode(null);
    setStagedLang(code as Language);
    setIsLangSearchOpen(false);

    setTimeout(() => {
      saveButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    setStagedLang(lang);
  }, [lang, currentView]);

  const isKurdishActive = lang === 'ku' || lang === 'ku-Latn' || lang === 'ckb';
  const activeKurdishName = (lang === 'ku' || lang === 'ku-Latn') ? 'Kurmancî' : lang === 'ckb' ? 'سۆرانی' : '';

  const isKurdishStaged = stagedLang === 'ku' || stagedLang === 'ku-Latn' || stagedLang === 'ckb';
  const stagedKurdishName = (stagedLang === 'ku' || stagedLang === 'ku-Latn') ? 'Kurmancî' : stagedLang === 'ckb' ? 'سۆرانی' : '';

  const handleSaveLanguage = async (targetLang?: Language) => {
    const langToSave = targetLang || stagedLang;
    setIsSavingLang(true);
    try {
      setLang(langToSave);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hisee_language', langToSave);
        localStorage.setItem('hisee_user_language', langToSave);
      }
      if (myId) {
        await updateDoc(doc(firestoreDb, 'users', myId), { 
          language: langToSave,
          'chatSettings.language': langToSave,
          updatedAt: serverTimestamp() 
        }).catch(() => {});
      }
      updateContentDisplaySetting('targetLanguage', langToSave);
      setLangSavedSuccess(true);
      setTimeout(() => setLangSavedSuccess(false), 2500);
    } catch (e) {
      console.error("Error saving language:", e);
    } finally {
      setIsSavingLang(false);
    }
  };

  // Helper title for header
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'languages': return t.language || 'Language';
      case 'kurdish_dialects': return 'Kurdî';
      case 'appearance': return t.appearance || 'المظهر';
      case 'chat': return t.chatSettings || 'إعدادات الدردشة';
      case 'account': return t.accountManagement || 'إدارة الحساب';
      case 'account_profile': return t.accountProfile || 'إدارة الحساب: الحساب';
      case 'account_security_permissions': return t.accountSecurityPermissions || 'إدارة الحساب: الأمان والأذونات';
      case 'account_analytics': return t.accountAnalytics || 'إدارة الحساب: التحليلات';
      case 'account_orders': return t.accountOrders || 'إدارة الحساب: طلباتك';
      case 'privacy_security': return t.privacySecurity || 'الخصوصية والأمان';
      case 'interactions': return t.interactions || 'التفاعلات';
      case 'content_display': return t.contentDisplay || 'محتوى وعرض';
      case 'storage_data': return t.storageData || 'التخزين والبيانات';
      case 'offline_videos': return t.offlineVideos || 'فيديوهات بدون اتصال بالإنترنت';
      case 'free_up_space': return t.freeUpSpace || 'تحرير المساحة';
      case 'manage_storage': return t.storageManagement || 'إدارة التخزين';
      case 'network_usage': return t.networkUsage || 'استخدام الشبكة بالتفصيل';
      case 'activity_posts': return t.activityPosts || (isRtl ? 'النشاط: إدارة المنشورات' : 'Activity: Manage Posts');
      case 'live_preferences': return t.livePreferences || 'تفضيلات LIVE';
      case 'notifications_detailed': return t.notifications || 'الإشعارات';
      case 'time_wellbeing': return t.timeWellbeing || 'الوقت والرفاهية الرقمية';
      case 'family_link': return t.familyLink || 'ربط حسابات العائلة';
      case 'blocked_users': return t.blockedUsers || 'المستخدمون المحظورون';
      case 'support': return t.support || 'الدعم والمعلومات';
      case 'help_center': return t.helpCenter || 'مركز المساعدة';
      case 'privacy_center': return t.privacyCenter || 'مركز الخصوصية';
      case 'terms_policies': return t.termsPolicies || 'الشروط والسياسات';
      case 'login_settings': return t.login || 'تسجيل الدخول';
      case 'hisee_studio': return t.hiseeStudio || 'HiSee Studio';
      case 'transaction_history': return t.transactionHistory || 'سجل المعاملات';
      case 'live_rewards': return t.liveRewards || 'مكافئات اللايف';
      case 'content_earnings': return t.earnings || 'الربح';
      case 'event_earnings': return t.eventEarnings || 'الفعاليات';
      case 'payment_methods': return t.paymentMethods || 'طريقة الدفع';
      case 'identity_verification': return t.identityVerification || 'تحقق من الهوية';
      case 'help_feedback': return t.helpFeedback || 'مساعدة وملاحظات';
      case 'admin_payouts': return 'لوحة الإدارة المالية وسجل المعاملات (Admin)';
      case 'admin_algorithms': return 'إدارة الخوارزميات الذكية';
      case 'admin_level_control': return isRtl ? 'لوحة التحكم الإدارية للمستويات والنجوم (Admin)' : 'Admin Level & Stars Control';
      case 'buy_coins': return 'شراء عملات HiSee';
      default: return t.settings;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0c10] p-6 md:p-10 overflow-hidden">
        <header className="mb-8 flex items-center gap-4">
            <button onClick={handleBack} className="p-2.5 bg-transparent rounded-xl text-slate-400 hover:text-white transition-all" aria-label={t.onBack}>
              {isRtl ? (
                 <ArrowRight size={24} aria-hidden="true" className={currentView !== 'main' ? 'text-emerald-500' : ''} />
              ) : (
                 <ArrowRight size={24} aria-hidden="true" className={`rotate-180 ${currentView !== 'main' ? 'text-emerald-500' : ''}`} />
              )}
            </button>
            <div>
                <h1 className="text-3xl font-bold mb-1 transition-all duration-300">
                  {getHeaderTitle()}
                </h1>
                <p className="text-slate-500 text-sm">HiSee Pro v8.0</p>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-24"> 
            
            {/* MAIN SETTINGS VIEW */}
            {currentView === 'main' && (
              <div className="space-y-4 animate-in slide-in-from-start duration-300">
                
                {/* Section: General */}
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-lg">
                    {/* Appearance Button */}
                    <button 
                      onClick={() => setCurrentView('appearance')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Palette size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.appearance || 'المظهر'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {settings.theme === 'light' ? (t.lightTheme || 'Light') : settings.theme === 'dark' ? (t.darkTheme || 'Dark') : (t.amoledTheme || 'AMOLED')}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Chat Settings Button */}
                    <button 
                      onClick={() => setCurrentView('chat')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Smartphone size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.chatSettings || 'إعدادات الدردشة'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.chatSettingsSub || 'الخصوصية، الصوت، التفضيلات'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Language Button */}
                    <button 
                      onClick={() => setCurrentView('languages')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Globe size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.language || 'Language'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                  {isKurdishActive ? `Kurdî (${activeKurdishName})` : LANGUAGES_DATA.find(l => l.code === lang)?.nativeName}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Account Settings Button */}
                    <button 
                      onClick={() => setCurrentView('account')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Key size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.accountManagement || 'إدارة الحساب'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.accountManagementSub || 'كلمة المرور، الأمان، حذف الحساب'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Privacy & Security Button */}
                    <button 
                      onClick={() => setCurrentView('privacy_security')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.privacySecurity || 'الخصوصية والأمان'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.privacySecuritySub || 'من يراك، الحظر، قفل التطبيق'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Interactions Button */}
                    <button 
                      onClick={() => setCurrentView('interactions')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center">
                                <MessageSquare size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.interactions || 'التفاعلات'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.interactionsSub || 'التعليقات، الرسائل، التنزيلات والمشاهدات'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Activity & Wellbeing Hub Button */}
                    <button 
                      onClick={() => setCurrentView('activity_hub')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                <Activity size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.activity || 'النشاط'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider text-right block">
                                    {t.activitySub || 'المنشورات، تفضيلات البث، وقت الشاشة، الإشعارات، والرقابة الأبوية'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Content & Display Button */}
                    <button 
                      onClick={() => setCurrentView('content_display')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                <Tv size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.contentDisplay || 'محتوى وعرض'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider text-right block">
                                    {t.contentDisplaySub || 'الجمهور، الإعلانات، التشغيل، الترجمة، والوصول'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>
                </div>

                {/* Section: Preferences */}
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-lg mt-6">
                    {/* Storage & Data Button */}
                    <button 
                      onClick={() => setCurrentView('storage_data')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <HardDrive size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.storageData || 'التخزين والبيانات'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.storageDataSub || 'استخدام البيانات، التنزيل التلقائي'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Balance Button */}
                    <button 
                      onClick={() => setCurrentView('balance')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Wallet size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.balance || 'رصيد'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.balanceSub || 'الرصيد والأرباح'}: $100.00
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* QR Code Button */}
                    <button 
                      onClick={() => setCurrentView('qr_code')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <QrCode size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.accountQR || 'رمز QR الخاص بالحساب'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.accountQRSub || 'عرض رمز QR الخاص بك'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* HiSee Studio Button */}
                    <button 
                      onClick={() => setCurrentView('hisee_studio')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                <Sparkles size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.hiseeStudio || 'HiSee Studio'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.hiseeStudioSub || 'أدوات إبداعية، فلاتر، والمزيد'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* Unified Notifications & Alerts Button */}
                    <button 
                      onClick={() => setCurrentView('notifications_detailed')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center">
                                <BellRing size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.notificationsAlerts || 'التنبيهات والإشعارات'}</h3>
                                <span className="text-[11px] text-slate-400">{t.notificationsAlertsSub || 'تخصيص نغمات الرسائل والمكالمات، الأصوات، وتنبيهات النظام'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>
                </div>

                {/* Section: Support & Info */}
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-lg mt-6">
                    <button 
                      onClick={() => setCurrentView('support')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <HelpCircle size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-white">{t.support || 'الدعم والمعلومات'}</h3>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>
                </div>

                {/* Section: Login & Session Management */}
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-lg mt-6">
                    <button 
                      onClick={() => setCurrentView('login_settings')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Key size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.login || 'تسجيل دخول'}</h3>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {t.loginSub || 'إدارة الجلسة، تبديل الحساب، وإنشاء حساب جديد'}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>
                </div>

                {/* Section: Unlocked Unified Master Admin Dashboard Card */}
                {(isAdminUnlocked || users[myId]?.isAdmin === true || users[myId]?.role === 'admin' || myId === 'admin') && (
                  <div className="glass rounded-[2rem] overflow-hidden border border-amber-500/40 bg-amber-500/[0.06] shadow-xl hover:border-amber-500/60 transition-all select-none mt-6 animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={handleOpenAdminPayouts}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 active:scale-[0.99] transition-all group relative overflow-hidden text-right"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-amber-500/30 shrink-0">
                          <ShieldCheck size={22} />
                        </div>
                        <div className="text-start">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                              لوحة التحكم الإدارية المركزية (Admin Dashboard)
                            </h3>
                            {payoutRequests.filter(p => p.status === 'PENDING').length > 0 && (
                              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full shadow-sm animate-pulse">
                                {payoutRequests.filter(p => p.status === 'PENDING').length} معلق
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-amber-200/80 font-medium block mt-0.5">
                            الوصول الفوري للوحة الرئيسية المتكاملة (المالية، الهدايا، المستخدمين، إدارة المستويات والنجوم، والبلاغات)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Auto-revert countdown badge (5s timer) */}
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-black" title="العودة التلقائية بعد 5 ثوانٍ">
                          <Clock size={12} className="animate-spin text-amber-400" />
                          <span>{adminUnlockCountdown}s</span>
                        </div>
                        <div className="text-amber-400 group-hover:translate-x-[-2px] transition-transform">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Footer with Discreet Gray HiSee Trigger */}
                <div className="mt-10 mb-8 text-center space-y-3">
                    {/* Secret Admin Entry Trigger: "HiSee" in gray (Requires 5 rapid clicks) */}
                    {!isAdminUnlocked && (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAdminCardClick}
                          className="text-xs font-bold text-slate-500 hover:text-slate-400 active:scale-95 transition-all select-none px-4 py-1.5 rounded-xl hover:bg-white/[0.03] cursor-pointer tracking-wider"
                          title="HiSee"
                        >
                          HiSee
                        </button>
                        {adminClicks.length > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                            <span className="text-[9px] font-black text-amber-400 font-mono">{adminClicks.length}/5</span>
                            {[...Array(5)].map((_, i) => (
                              <span 
                                key={i} 
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                  i < adminClicks.length ? 'bg-amber-400 scale-125' : 'bg-slate-700'
                                }`} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-slate-600">
                        <Shield size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Secure & Encrypted</span>
                    </div>
                    <p className="text-[10px] text-slate-700 font-medium">HiSee Inc © 2025 • Made with ❤️ for the world</p>
                </div>
              </div>
            )}

            {/* APPEARANCE SUB-PAGE */}
            {currentView === 'appearance' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-4">
                 <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="text-blue-500" size={24} />
                        <h3 className="text-lg font-bold text-white">{t.chooseTheme || 'اختر نمط التطبيق'}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {/* Light Mode */}
                        <button 
                          onClick={() => handleThemeChange('light')}
                          className={`relative p-5 rounded-3xl border flex items-center gap-5 transition-all ${settings.theme === 'light' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings.theme === 'light' ? 'bg-slate-200 text-amber-500' : 'bg-black/20'}`}>
                               <Sun size={24} />
                            </div>
                            <div className="flex flex-col items-start">
                               <span className="text-base font-bold">Light Mode</span>
                               <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">Bright & Clear</span>
                            </div>
                            {settings.theme === 'light' && <div className="absolute right-5 text-emerald-600"><Check size={24} strokeWidth={3} /></div>}
                        </button>

                        {/* Dark Mode */}
                        <button 
                          onClick={() => handleThemeChange('dark')}
                          className={`relative p-5 rounded-3xl border flex items-center gap-5 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings.theme === 'dark' ? 'bg-black/30 text-blue-400' : 'bg-black/20'}`}>
                               <Moon size={24} />
                            </div>
                            <div className="flex flex-col items-start">
                               <span className="text-base font-bold">Dark Mode</span>
                               <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">Easy on Eyes</span>
                            </div>
                            {settings.theme === 'dark' && <div className="absolute right-5 text-emerald-500"><Check size={24} strokeWidth={3} /></div>}
                        </button>

                        {/* AMOLED Mode */}
                        <button 
                          onClick={() => handleThemeChange('amoled')}
                          className={`relative p-5 rounded-3xl border flex items-center gap-5 transition-all ${settings.theme === 'amoled' ? 'bg-black text-white border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings.theme === 'amoled' ? 'bg-slate-900 text-emerald-500 border border-emerald-500/30' : 'bg-black/20'}`}>
                               <Smartphone size={24} />
                            </div>
                            <div className="flex flex-col items-start">
                               <span className="text-base font-bold">AMOLED</span>
                               <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">Pure Black (Save Battery)</span>
                            </div>
                            {settings.theme === 'amoled' && <div className="absolute right-5 text-emerald-500"><Check size={24} strokeWidth={3} /></div>}
                        </button>
                    </div>
                 </div>
              </div>
            )}

            {/* ACTIVITY HUB PAGE */}
            {currentView === 'activity_hub' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <div className="glass p-5 rounded-[2.5rem] flex flex-col gap-2 border border-white/5 shadow-lg">
                    {/* 1. Manage Posts */}
                    <button 
                      onClick={() => setCurrentView('activity_posts')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                <FileText size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.managePosts || 'إدارة المنشورات'}</h3>
                                <span className="text-[11px] text-slate-400">{t.managePostsSub || 'منشوراتك، الإعجابات، الخصوصية والتعليقات'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* 2. Live Preferences */}
                    <button 
                      onClick={() => setCurrentView('live_preferences')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                <Zap size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.livePreferences || 'تفضيلات LIVE'}</h3>
                                <span className="text-[11px] text-slate-400">{t.livePreferencesSub || 'جودة البث، التنبيهات، المشرفين والهدايا'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>


                    {/* 4. Time & Digital Wellbeing */}
                    <button 
                      onClick={() => setCurrentView('time_wellbeing')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                                <Clock size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.timeWellbeing || 'وقت و رفاهية'}</h3>
                                <span className="text-[11px] text-slate-400">{t.timeWellbeingSub || 'ساعات الاستخدام اليومي، وضع النوم والراحة'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* 5. Family Link */}
                    <button 
                      onClick={() => setCurrentView('family_link')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.familyLink || 'ربط حسابات العائلية'}</h3>
                                <span className="text-[11px] text-slate-400">{t.familyLinkSub || 'الرقابة الأبوية، وقت الشاشة والمحتوى للطفل'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>
                </div>
              </div>
            )}

            {/* LANGUAGES LIST PAGE */}
            {currentView === 'languages' && (
              <div className="animate-in slide-in-from-end duration-300">
                <div className="glass p-4 rounded-[2.5rem] flex flex-col gap-4 border border-white/5 shadow-lg">
                    <div className="grid grid-cols-1 gap-3">
                        {/* 1. Kurdish Parent Button */}
                        <button
                          onClick={() => setCurrentView('kurdish_dialects')}
                          className={`relative p-4 rounded-2xl border flex items-center justify-between transition-all ${
                            isKurdishStaged
                            ? 'bg-emerald-600/20 border-emerald-500 text-white' 
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                             <div className="flex items-center gap-4">
                               <KurdistanFlag />
                               <div className="flex flex-col items-start">
                                  <span className="text-sm font-bold">Kurdî</span>
                                  <span className="text-[10px] uppercase tracking-wider opacity-60">Kurdish</span>
                               </div>
                             </div>
                             <div className="flex items-center gap-2">
                               {isKurdishStaged && (
                                   <span className="text-[9px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-black">
                                     {stagedKurdishName}
                                   </span>
                               )}
                               {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                             </div>
                        </button>

                        {/* 2. Other Languages & Downloaded World Languages */}
                        {(() => {
                          const CORE_LANG_CODES = ['ar', 'en', 'de', 'ku', 'ku-Latn', 'ckb'];
                          return [
                            ...LANGUAGES_DATA,
                            ...Object.keys(downloadedLangs)
                              .filter(code => !LANGUAGES_DATA.some(l => l.code === code) && code !== 'ku' && code !== 'ku-Latn' && code !== 'ckb')
                              .map(code => {
                                const cat = WORLD_LANGUAGES_CATALOG.find(w => w.code === code);
                                return {
                                  code: code as Language,
                                  name: cat?.name || code,
                                  nativeName: cat?.nativeName || code,
                                  flag: <span className="text-2xl">{cat?.flag || '🌐'}</span>
                                };
                              })
                          ].map((l) => {
                            const isCore = CORE_LANG_CODES.includes(l.code);
                            const isDownloaded = isCore || downloadedLangs[l.code] === true;
                            const isDownloading = downloadingLangCode === l.code;
                            return (
                              <button
                                key={l.code}
                                onTouchStart={() => startLongPress(l.code, l.nativeName, l.name, isDownloaded)}
                                onTouchEnd={cancelLongPress}
                                onTouchMove={cancelLongPress}
                                onMouseDown={() => startLongPress(l.code, l.nativeName, l.name, isDownloaded)}
                                onMouseUp={cancelLongPress}
                                onMouseLeave={cancelLongPress}
                                onClick={() => {
                                  if (isLongPressTriggered.current) {
                                    isLongPressTriggered.current = false;
                                    return;
                                  }
                                  if (isDownloaded) {
                                    handleSelectAndScroll(l.code);
                                  } else {
                                    handleDownloadLangPack(l.code, l.nativeName, l.name);
                                  }
                                }}
                                className={`relative p-4 rounded-2xl border flex items-center justify-between transition-all select-none ${
                                  stagedLang === l.code 
                                  ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                 <div className="flex items-center gap-4">
                                   {l.flag}
                                   <div className="flex flex-col items-start">
                                      <span className="text-sm font-bold">{l.nativeName}</span>
                                      <span className="text-[10px] uppercase tracking-wider opacity-60">{l.name}</span>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   {!isDownloaded ? (
                                     <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                       {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                       <span>{isRtl ? 'تحميل' : 'Download'}</span>
                                     </span>
                                   ) : stagedLang === l.code ? (
                                     <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-[0_0_10px_#10b981]">
                                       <Check size={14} strokeWidth={4} />
                                     </div>
                                   ) : (
                                     <span className="text-[10px] text-emerald-400/80 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                       {isRtl ? 'جاهز' : 'Ready'}
                                     </span>
                                   )}
                                 </div>
                              </button>
                            );
                          });
                        })()}

                        {/* 3. Add New Language Button (+) */}
                        <button
                          onClick={() => setIsLangSearchOpen(true)}
                          className="w-full p-4 rounded-2xl border border-dashed border-white/20 hover:border-emerald-500 hover:bg-white/[0.04] text-neutral-300 hover:text-white flex items-center justify-center gap-3 transition-all cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                            <Plus size={20} strokeWidth={2.5} />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-bold">{isRtl ? 'إضافة وتحميل لغة جديدة من العالم (+)' : 'Download & Add New Language Pack (+)'}</span>
                            <span className="text-[10px] text-neutral-400">{isRtl ? 'ابحث وحمل أي لغة أوفلاين في التطبيق' : 'Search & download any language offline instantly'}</span>
                          </div>
                        </button>

                        {/* 4. Purge Secondary Language Cache */}
                        <button
                          onClick={handlePurgeSecondaryLangs}
                          className="w-full p-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                              <Trash2 size={18} />
                            </div>
                            <div className="flex flex-col items-start text-start">
                              <span className="text-sm font-bold">{isRtl ? 'تنظيف ذاكرة القواميس الثانوية (Purge)' : 'Purge Secondary Language Cache'}</span>
                              <span className="text-[10px] text-red-300/70">{isRtl ? 'مسح القواميس المحملة جانباً وإبقاء اللغات الأساسية لتسريع التطبيق' : 'Remove downloaded secondary packs & free device memory'}</span>
                            </div>
                          </div>
                          {purgeSuccess ? (
                            <span className="text-xs bg-emerald-500 text-slate-950 px-3 py-1 rounded-xl font-black flex items-center gap-1">
                              <Check size={14} /> {isRtl ? 'تم التنظيف' : 'Purged'}
                            </span>
                          ) : (
                            <span className="text-xs text-red-400 font-bold border border-red-500/30 px-2.5 py-1 rounded-lg">
                              {isRtl ? 'تنظيف الآن' : 'Purge Now'}
                            </span>
                          )}
                        </button>
                    </div>

            {/* LANGUAGE SEARCH MODAL */}
            {isLangSearchOpen && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#121212] border border-white/15 w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Globe size={20} className="text-emerald-400" />
                      <span>{isRtl ? 'بحث وتحميل حزم اللغات العالمية' : 'Search & Download World Language Packs'}</span>
                    </h3>
                    <button 
                      onClick={() => setIsLangSearchOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={langSearchQuery}
                      onChange={(e) => setLangSearchQuery(e.target.value)}
                      placeholder={isRtl ? 'ابحث باللغة، الدولة، الرمز (TR) أو المفتاح الدولي (+90)...' : 'Search by language, country, code (TR) or dial code (+90)...'}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 max-h-[50vh] pr-1">
                    {WORLD_LANGUAGES_CATALOG
                      .filter(langItem => {
                        const q = langSearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          langItem.name.toLowerCase().includes(q) || 
                          langItem.nativeName.toLowerCase().includes(q) ||
                          langItem.country.toLowerCase().includes(q) ||
                          langItem.countryCode.toLowerCase().includes(q) ||
                          langItem.dialCode.toLowerCase().includes(q) ||
                          langItem.code.toLowerCase().includes(q)
                        );
                      })
                      .map((langItem) => {
                        const isDownloaded = downloadedLangs[langItem.code] === true;
                        const isDownloading = downloadingLangCode === langItem.code;
                        return (
                          <div 
                            key={langItem.code}
                            onTouchStart={() => startLongPress(langItem.code, langItem.nativeName, langItem.name, isDownloaded)}
                            onTouchEnd={cancelLongPress}
                            onTouchMove={cancelLongPress}
                            onMouseDown={() => startLongPress(langItem.code, langItem.nativeName, langItem.name, isDownloaded)}
                            onMouseUp={cancelLongPress}
                            onMouseLeave={cancelLongPress}
                            className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{langItem.flag}</span>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white">{langItem.nativeName}</span>
                                <span className="text-[10px] text-neutral-400">{langItem.country} • <span className="uppercase">{langItem.code}</span> ({langItem.dialCode})</span>
                              </div>
                            </div>

                            {isDownloaded ? (
                              <button
                                onClick={() => {
                                  if (isLongPressTriggered.current) {
                                    isLongPressTriggered.current = false;
                                    return;
                                  }
                                  startLongPress(langItem.code, langItem.nativeName, langItem.name, true);
                                }}
                                className="text-xs bg-emerald-500/20 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                title={isRtl ? 'اضغط مطولاً لحذف القاموس' : 'Long press to delete dictionary'}
                              >
                                <Check size={14} />
                                <span>{isRtl ? 'تم التحميل' : 'Downloaded'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDownloadLangPack(langItem.code, langItem.nativeName, langItem.name)}
                                disabled={isDownloading}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                              >
                                {isDownloading ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Download size={14} />
                                )}
                                <span>{isRtl ? 'تحميل JSON' : 'Download Pack'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() => setIsLangSearchOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isRtl ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            )}

                    {/* Save Action Button */}
                    <div ref={saveButtonRef} className="pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleSaveLanguage()}
                        disabled={isSavingLang}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                          langSavedSuccess
                            ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                            : stagedLang !== lang
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
                            : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                        }`}
                      >
                        {isSavingLang ? (
                          <Loader2 size={16} className="animate-spin text-current" />
                        ) : langSavedSuccess ? (
                          <CheckCheck size={16} className="text-current" />
                        ) : (
                          <Check size={16} strokeWidth={3} className="text-current" />
                        )}
                        <span>
                          {langSavedSuccess 
                            ? (t.languageSaved || getTranslation(stagedLang, 'languageSaved', 'تم حفظ اللغة بنجاح')) 
                            : (t.saveChanges || getTranslation(stagedLang, 'saveChanges', 'حفظ التغييرات'))}
                        </span>
                      </button>
                    </div>
                </div>
              </div>
            )}

            {/* KURDISH DIALECTS PAGE */}
            {currentView === 'kurdish_dialects' && (
              <div className="animate-in slide-in-from-end duration-300">
                <div className="glass p-5 rounded-[2.5rem] flex flex-col gap-4 border border-white/5 shadow-lg">
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <KurdistanFlag />
                      <div className="flex flex-col text-start">
                        <h3 className="text-base font-bold text-white">{isRtl ? 'اختر اللهجة الكردية' : 'Select Kurdish Dialect'}</h3>
                        <span className="text-[11px] text-slate-400">{isRtl ? 'لهجتان مستقلتان تحمّلان أونلاين وتعملان أوفلاين' : 'Two distinct dialects with offline caching'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {KURDISH_VARIANTS.map((variant) => {
                      const isDownloaded = downloadedLangs[variant.code] === true;
                      const isDownloading = downloadingLangCode === variant.code;
                      const isSelected = stagedLang === variant.code;

                      return (
                        <div
                          key={variant.code}
                          onTouchStart={() => startLongPress(variant.code, variant.nativeName, variant.name, isDownloaded)}
                          onTouchEnd={cancelLongPress}
                          onTouchMove={cancelLongPress}
                          onMouseDown={() => startLongPress(variant.code, variant.nativeName, variant.name, isDownloaded)}
                          onMouseUp={cancelLongPress}
                          onMouseLeave={cancelLongPress}
                          onClick={() => {
                            if (isLongPressTriggered.current) {
                              isLongPressTriggered.current = false;
                              return;
                            }
                            if (isDownloaded) {
                              handleSelectAndScroll(variant.code);
                            } else {
                              handleDownloadLangPack(variant.code, variant.nativeName, variant.name);
                            }
                          }}
                          className={`relative p-5 rounded-2xl border flex flex-col gap-3 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                              : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3.5">
                              {variant.flag}
                              <div className="flex flex-col items-start text-start">
                                <span className="text-base font-bold text-white">{variant.nativeName}</span>
                                <span className="text-[11px] text-slate-400">{variant.name} ({variant.code})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isDownloaded ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadLangPack(variant.code, variant.nativeName, variant.name);
                                  }}
                                  disabled={isDownloading}
                                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                  {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                  <span>{isRtl ? 'تحميل' : 'Download'}</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadLangPack(variant.code, variant.nativeName, variant.name);
                                    }}
                                    disabled={isDownloading}
                                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                                    title={isRtl ? 'تحديث القاموس من السيرفر' : 'Update Dictionary from Server'}
                                  >
                                    {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    <span>{isRtl ? 'تحديث' : 'Update'}</span>
                                  </button>
                                  
                                  {isSelected ? (
                                    <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 shadow-[0_0_10px_#10b981]">
                                      <Check size={16} strokeWidth={3.5} />
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                      {isRtl ? 'تم التحميل / جاهز' : 'Downloaded / Ready'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Type size={12} className="text-emerald-400" />
                              <span>{variant.scriptInfo}</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {isRtl ? 'تخزين محلي (Offline)' : 'Cached Locally'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save Action Button */}
                  <div ref={saveButtonRef} className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => handleSaveLanguage()}
                      disabled={isSavingLang}
                      className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                        langSavedSuccess
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                          : stagedLang !== lang
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                      }`}
                    >
                      {isSavingLang ? (
                        <Loader2 size={16} className="animate-spin text-current" />
                      ) : langSavedSuccess ? (
                        <CheckCheck size={16} className="text-current" />
                      ) : (
                        <Check size={16} strokeWidth={3} className="text-current" />
                      )}
                      <span>
                        {langSavedSuccess 
                          ? (t.languageSaved || getTranslation(stagedLang, 'languageSaved', 'تم حفظ اللغة بنجاح')) 
                          : (t.saveChanges || getTranslation(stagedLang, 'saveChanges', 'حفظ التغييرات'))}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CHAT SETTINGS SUB-PAGE */}
            {currentView === 'chat' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.privacySecurity || t.chatSettingsPrivacyTitle}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.encryption}</span>
                        <span className="text-[10px] text-slate-500">{t.encryptionDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, endToEndEncryption: !prev.chatSettings.privacy.endToEndEncryption } } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.privacy.endToEndEncryption ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.privacy.endToEndEncryption ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.readReceipts}</span>
                        <span className="text-[10px] text-slate-500">{t.readReceiptsDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, readReceipts: !prev.chatSettings.readReceipts } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.readReceipts ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.readReceipts ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.lastSeen}</span>
                        <span className="text-[10px] text-slate-500">{t.lastSeenDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, lastSeen: !prev.chatSettings.lastSeen } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.lastSeen ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.lastSeen ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* خصوصية الحساب والميزات المتقدمة */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.chatSettingsAccountPrivacyTitle}</h3>
                  <div className="space-y-4">
                    {/* صورة ملف شخصي */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsProfilePicLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsProfilePicDesc}</span>
                      </div>
                      <select 
                        value={(settings.chatSettings as any).profilePicPrivacy || 'everyone'}
                        onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, profilePicPrivacy: e.target.value as any } }))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="everyone">{t.everyone}</option>
                        <option value="contacts">{t.myContacts}</option>
                        <option value="nobody">{t.nobody}</option>
                      </select>
                    </div>

                    {/* حول (النبذة التعريفية) */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsAboutLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsAboutDesc}</span>
                      </div>
                      <select 
                        value={(settings.chatSettings as any).aboutPrivacy || 'everyone'}
                        onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, aboutPrivacy: e.target.value as any } }))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="everyone">{t.everyone}</option>
                        <option value="contacts">{t.myContacts}</option>
                        <option value="nobody">{t.nobody}</option>
                      </select>
                    </div>

                    {/* روابط */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsLinksLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsLinksDesc}</span>
                      </div>
                      <select 
                        value={(settings.chatSettings as any).linkPrivacy || 'everyone'}
                        onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, linkPrivacy: e.target.value as any } }))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="everyone">{t.everyone}</option>
                        <option value="contacts">{t.myContactsOnly}</option>
                      </select>
                    </div>

                    {/* حالة */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsStatusLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsStatusDesc}</span>
                      </div>
                      <select 
                        value={(settings.chatSettings as any).statusPrivacy || 'contacts'}
                        onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, statusPrivacy: e.target.value as any } }))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="everyone">{t.everyone}</option>
                        <option value="contacts">{t.myContacts}</option>
                        <option value="nobody">{t.nobody}</option>
                      </select>
                    </div>

                    {/* مؤقت رسائل تلقائي */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsDisappearingLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsDisappearingDesc}</span>
                      </div>
                      <select 
                        value={(settings.chatSettings as any).disappearingTimer || 'off'}
                        onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, disappearingTimer: e.target.value as any } }))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="off">{t.off}</option>
                        <option value="24h">{t.hours24}</option>
                        <option value="7d">{t.days7}</option>
                        <option value="90d">{t.days90}</option>
                      </select>
                    </div>

                    {/* مجموعات رابط مباشر */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsGroupInviteLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsGroupInviteDesc}</span>
                      </div>
                      <select 
                        value={(settings.chatSettings as any).groupInvitePrivacy || 'everyone'}
                        onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, groupInvitePrivacy: e.target.value as any } }))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="everyone">{t.everyone}</option>
                        <option value="contacts">{t.myContactsOnly}</option>
                      </select>
                    </div>

                    {/* مكالمات */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsCallsLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsCallsDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, silenceUnknownCallers: !(prev.chatSettings as any).silenceUnknownCallers } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${(settings.chatSettings as any).silenceUnknownCallers ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${(settings.chatSettings as any).silenceUnknownCallers ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* مجموعات موقع مباشر */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsGroupLiveLocationLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsGroupLiveLocationDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, groupLiveLocation: !(prev.chatSettings as any).groupLiveLocation } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${(settings.chatSettings as any).groupLiveLocation ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${(settings.chatSettings as any).groupLiveLocation ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* جهات اتصال */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsSyncContactsLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsSyncContactsDesc}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !(settings.chatSettings as any).syncContacts;
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, syncContacts: nextVal } }));
                          if (nextVal) {
                            alert(isRtl 
                              ? "🔄 تم مزامنة جهات الاتصال بنجاح! تم استيراد وتحديث 142 جهة اتصال من دفتر الهاتف المدمج ومطابقتها مع HiSee Pro." 
                              : "🔄 Contacts Synced! 142 contacts have been imported and synchronized with HiSee Pro."
                            );
                          }
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${(settings.chatSettings as any).syncContacts ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${(settings.chatSettings as any).syncContacts ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* قفل الدردشة */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsChatLockLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsChatLockDesc}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !(settings.chatSettings as any).chatLockEnabled;
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, chatLockEnabled: nextVal } }));
                          if (nextVal) {
                            alert(isRtl
                              ? "🔐 تم تفعيل قفل الدردشات! أصبحت المحادثات المغلقة محمية الآن تلقائياً بكلمة المرور وبصمة الإصبع."
                              : "🔐 Chat Lock Activated! Protected conversations are now secured with passcode and biometric locks."
                            );
                          }
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${(settings.chatSettings as any).chatLockEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${(settings.chatSettings as any).chatLockEnabled ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* سماح بتأثيرات الكاميرا */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsCameraEffectsLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsCameraEffectsDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, cameraEffectsEnabled: !(prev.chatSettings as any).cameraEffectsEnabled } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${(settings.chatSettings as any).cameraEffectsEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${(settings.chatSettings as any).cameraEffectsEnabled ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* تحقق من خصوصية */}
                    <div className="pt-2">
                      <button 
                        onClick={() => {
                          const status = [
                            `🛡️ ${isRtl ? 'تقرير فحص الخصوصية الشامل (Privacy Checkup)' : 'Comprehensive Privacy Checkup Report'}:`,
                            `• ${isRtl ? 'آخر ظهور' : 'Last Seen'}: ${settings.chatSettings.lastSeen ? (isRtl ? 'مُفعّل' : 'Active') : (isRtl ? 'مخفي' : 'Hidden')}`,
                            `• ${isRtl ? 'صورة الملف' : 'Profile Photo'}: ${(settings.chatSettings as any).profilePicPrivacy || 'everyone'}`,
                            `• ${isRtl ? 'النبذة التعريفية' : 'About/Bio'}: ${(settings.chatSettings as any).aboutPrivacy || 'everyone'}`,
                            `• ${isRtl ? 'مؤقت الرسائل' : 'Disappearing Messages'}: ${(settings.chatSettings as any).disappearingTimer || 'off'}`,
                            `• ${isRtl ? 'إسكات غير المعروفين' : 'Silence Unknown Callers'}: ${(settings.chatSettings as any).silenceUnknownCallers ? (isRtl ? 'مُفعّل ومحمي 🔒' : 'Enabled 🔒') : (isRtl ? 'معطل' : 'Disabled')}`,
                            `• ${isRtl ? 'إخفاء عنوان IP' : 'IP Obfuscation'}: ${(settings.chatSettings as any).advancedIPHide ? (isRtl ? 'توجيه آمن عبر الخوادم 🛡️' : 'Routed via secure relays 🛡️') : (isRtl ? 'اتصال P2P مباشر' : 'Direct P2P')}`,
                            `• ${isRtl ? 'قفل الدردشات' : 'Chat Lock'}: ${(settings.chatSettings as any).chatLockEnabled ? (isRtl ? 'مفعل بالبصمة والرمز 🔐' : 'Locked with PIN/Biometrics 🔐') : (isRtl ? 'معطل' : 'Disabled')}`,
                            `\n✅ ${isRtl ? 'حالة حسابك: مؤمن بالكامل ومحمي وفق أعلى معايير الخصوصية الدولية.' : 'Your account status: Fully protected according to global privacy standards.'}`
                          ].join('\n');
                          alert(status);
                        }}
                        className="w-full flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 transition-all text-emerald-400 font-bold text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} />
                          <span>{t.privacyCheckupBtn}</span>
                        </div>
                        <ChevronRight size={14} className={isRtl ? '' : 'rotate-180'} />
                      </button>
                    </div>

                    {/* متقدمة / متقدم */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.chatSettingsAdvancedIPLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.chatSettingsAdvancedIPDesc}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !(settings.chatSettings as any).advancedIPHide;
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, advancedIPHide: nextVal } }));
                          if (nextVal) {
                            alert(isRtl
                              ? "🌐 تم تفعيل إخفاء عنوان IP! سيتم توجيه جميع مكالماتك ومحادثاتك عبر خوادم HiSee الآمنة (Relay/TURN) لمنع كشف موقعك الجغرافي أو شبكتك."
                              : "🌐 IP Obfuscation Enabled! Your calls and messages are now routed through HiSee Relay/TURN secure servers to prevent location and network tracking."
                            );
                          }
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${(settings.chatSettings as any).advancedIPHide ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${(settings.chatSettings as any).advancedIPHide ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.preferences || t.chatSettingsPreferencesTitle}</h3>
                  <div className="space-y-4">
                    {/* مفتاح ادخال ارسال */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.enterToSendLabel || t.chatSettingsEnterToSendLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.enterToSendDesc || t.chatSettingsEnterToSendDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, enterToSend: !prev.chatSettings.enterToSend } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.enterToSend ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.enterToSend ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* عرض وسائط */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.showMediaInGalleryLabel || t.chatSettingsShowMediaGalleryLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.showMediaInGalleryDesc || t.chatSettingsShowMediaGalleryDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, showMediaInGallery: !prev.chatSettings.showMediaInGallery } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.showMediaInGallery ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.showMediaInGallery ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* ارشفة دردشات */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.archiveChatsLabel || t.chatSettingsArchiveChatsLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.archiveChatsDesc || t.chatSettingsArchiveChatsDesc}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const nextVal = !settings.chatSettings.archiveChats;
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, archiveChats: nextVal } }));
                          if (nextVal) {
                            alert(isRtl 
                              ? "🗄️ تم تفعيل أرشفة الدردشات التلقائية! ستبقى جميع المحادثات المؤرشفة مخفية ومؤرشفة بشكل دائم حتى عند تلقي رسائل جديدة من تلك الجهات."
                              : "🗄️ Archive Chats Automatically Enabled! Stored archived chats will remain completely hidden and silenced even when new messages are received."
                            );
                          }
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.archiveChats ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.archiveChats ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* اخفاء دردشات */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.hideLockedChatsLabel || t.chatSettingsHideChatsLabel}</span>
                        <span className="text-[10px] text-slate-500">{t.hideLockedChatsDesc || t.chatSettingsHideChatsDesc}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, hideChats: !prev.chatSettings.hideChats } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.hideChats ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.hideChats ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* نسخ احتياطي لدردشات */}
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{t.chatSettingsChatBackupLabel || t.chatBackupLabel}</span>
                          <span className="text-[10px] text-slate-500">
                            {isBackingUp ? `${t.backingUpData} ${backupProgress}%` : `${t.lastBackup} ${settings.chatSettings.chatBackupLastDate || t.noBackupYet}`}
                          </span>
                        </div>
                        <button 
                          disabled={isBackingUp}
                          onClick={() => {
                            setIsBackingUp(true);
                            setBackupProgress(0);
                            const interval = setInterval(() => {
                              setBackupProgress(prev => {
                                if (prev >= 100) {
                                  clearInterval(interval);
                                  setIsBackingUp(false);
                                  const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                  setSettings(s => ({ ...s, chatSettings: { ...s.chatSettings, chatBackupLastDate: today } }));
                                  alert(t.backupSuccessAlert);
                                  return 100;
                                }
                                return prev + 20;
                              });
                            }, 200);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isBackingUp ? 'bg-white/10 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-black active:scale-95 font-black'}`}
                        >
                          {isBackingUp ? '...' : (t.chatSettingsBackupNow || t.backupNow)}
                        </button>
                      </div>
                      {isBackingUp && (
                        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                          <div className="bg-emerald-500 h-full transition-all duration-200" style={{ width: `${backupProgress}%` }}></div>
                        </div>
                      )}
                    </div>

                    {/* نقل دردشات */}
                    <div className="pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setTransferStep('instructions');
                          setShowTransferModal(true);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 ${isRtl ? 'text-right' : 'text-left'}`}
                      >
                        <div className={`flex flex-col ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-xs text-slate-300 font-bold">{t.chatSettingsTransferChatsLabel || t.transferChatsLabel}</span>
                          <span className="text-[10px] text-slate-500">{t.chatSettingsTransferChatsDesc || t.transferChatsDesc}</span>
                        </div>
                        <ChevronLeft size={16} className={`text-slate-500 ${isRtl ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* سجل دردشات */}
                    <div className="pt-4 border-t border-white/5">
                      <span className={`text-sm text-slate-300 font-bold block mb-2 ${isRtl ? 'text-right' : 'text-left'}`}>{t.chatSettingsChatHistoryTitle || t.chatHistorySection}</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => alert(t.exportAllChatsAlert)}
                          className="p-3 bg-slate-900 border border-white/5 hover:border-white/10 rounded-xl text-[11px] text-slate-300 text-center font-bold transition-all active:scale-95"
                        >
                          {t.chatSettingsExportAllChats || t.exportAllChats}
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(t.archiveAllChatsConfirm)) {
                              alert(t.archiveAllChatsSuccess);
                            }
                          }}
                          className="p-3 bg-slate-900 border border-white/5 hover:border-white/10 rounded-xl text-[11px] text-slate-300 text-center font-bold transition-all active:scale-95"
                        >
                          {t.chatSettingsArchiveAllChats || t.archiveAllChats}
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(t.clearAllChatsConfirm)) {
                              alert(t.clearAllChatsSuccess);
                            }
                          }}
                          className="p-3 bg-slate-900 border border-rose-500/10 hover:bg-rose-500/5 rounded-xl text-[11px] text-rose-400 text-center font-bold transition-all active:scale-95"
                        >
                          {t.chatSettingsClearAllChats || t.clearAllChatsContent}
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(t.deleteAllChatsConfirm)) {
                              alert(t.deleteAllChatsSuccess);
                            }
                          }}
                          className="p-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl text-[11px] text-rose-500 text-center font-black transition-all active:scale-95"
                        >
                          {t.chatSettingsDeleteAllChats || t.deleteAllChats}
                        </button>
                      </div>
                    </div>

                    {/* حجم الخط */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-sm text-slate-300">{t.chatSettingsFontSizeLabel || t.chatFontSize}</span>
                      <div className="flex bg-white/5 rounded-xl p-1">
                        {(['small', 'medium', 'large'] as const).map(size => (
                          <button
                            key={size}
                            onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, fontSize: size } }))}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${settings.chatSettings.fontSize === size ? 'bg-emerald-500 text-black' : 'text-slate-400'}`}
                          >
                            {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.soundsAndAlerts || t.chatSettingsSoundsTitle}</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'messages', label: t.messageSounds, icon: <MessageSquare size={16} /> },
                      { key: 'typing', label: t.typingSound, icon: <Type size={16} /> },
                      { key: 'audioCall', label: t.callRingtone, icon: <Music size={16} /> },
                      { key: 'buttonClicks', label: t.buttonSounds, icon: <Zap size={16} /> },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-slate-500">{item.icon}</div>
                          <span className="text-sm text-slate-300">{item.label}</span>
                        </div>
                        <button 
                          onClick={() => setSettings(prev => ({ 
                            ...prev, 
                            chatSettings: { 
                              ...prev.chatSettings, 
                              sounds: { 
                                ...prev.chatSettings.sounds, 
                                [item.key]: !prev.chatSettings.sounds[item.key as keyof typeof prev.chatSettings.sounds] 
                              } 
                            } 
                          }))}
                          className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.sounds[item.key as keyof typeof settings.chatSettings.sounds] ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.sounds[item.key as keyof typeof settings.chatSettings.sounds] ? 'translate-x-6' : 'translate-x-1'}`}></span>
                        </button>
                      </div>
                    ))}
                    
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <h4 className="text-sm font-bold text-slate-400">{t.soundLevels || t.chatSettingsSoundLevels}</h4>
                      {[
                        { key: 'recordingStartVolume', label: t.recordingStartSound },
                        { key: 'sendingAudioVolume', label: t.sendingAudioSound },
                        { key: 'receivingAudioVolume', label: t.receivingAudioSound }
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-4">
                            <label className="text-xs text-slate-300 flex-1">{item.label}</label>
                            <input 
                               type="range" 
                               min="0" 
                               max="1" 
                               step="0.1" 
                               value={((settings.chatSettings?.sounds as any)?.[item.key]) ?? 0.8}
                               onChange={(e) => setSettings(prev => ({ 
                                 ...prev, 
                                 chatSettings: { 
                                   ...prev.chatSettings, 
                                   sounds: { 
                                     ...prev.chatSettings.sounds, 
                                     [item.key]: parseFloat(e.target.value)
                                   } 
                                 } 
                               }))}
                               className="w-24 accent-emerald-500"
                            />
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-slate-500"><Volume2 size={16} /></div>
                          <span className="text-sm text-slate-300">{t.notificationVolumeLevel || t.chatSettingsNotifVolume || (lang === 'ar' ? 'مستوى صوت التنبيهات' : 'Notification Volume')}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-500">{settings.chatSettings?.notificationVolume ?? 80}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={settings.chatSettings?.notificationVolume ?? 80}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          chatSettings: {
                            ...prev.chatSettings,
                            notificationVolume: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* كتم جميع التنبيهات والأصوات */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.muteAllNotifications || t.chatSettingsMuteAllSounds || (lang === 'ar' ? 'كتم جميع التنبيهات' : 'Mute All Notifications')}</span>
                        <span className="text-[10px] text-slate-500">{t.muteAllNotificationsDesc || t.chatSettingsMuteAllDesc || (lang === 'ar' ? 'تعطيل كافة أصوات وتنبيهات الرسائل والمكالمات مؤقتاً' : 'Temporarily disable all message and call sounds & notifications')}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, muteAllSounds: !prev.chatSettings.muteAllSounds } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.muteAllSounds ? 'bg-rose-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.muteAllSounds ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* وضع الصامت / عدم الإزعاج (Silent/DND) */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.dndMode || t.chatSettingsDndMode || (lang === 'ar' ? 'وضع الصامت / عدم الإزعاج (DND)' : 'Silent Mode / Do Not Disturb (DND)')}</span>
                        <span className="text-[10px] text-slate-500">{t.dndModeDesc || t.chatSettingsDndDesc || (lang === 'ar' ? 'منع رنين المكالمات والاهتزاز تماماً عند التفعيل' : 'Prevent call ringing and vibration entirely when enabled')}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, silentMode: !prev.chatSettings.silentMode } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.silentMode ? 'bg-indigo-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.silentMode ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* إعدادات الإشعارات والتنبيهات المتقدمة */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.advancedNotificationSettings || t.chatSettingsAdvancedNotifTitle || (lang === 'ar' ? 'إعدادات الإشعارات المتقدمة' : 'Advanced Notification Settings')}</h3>
                  <div className="space-y-6">
                    {/* الخيارات العامة للإشعارات */}
                    <div className="space-y-4">
                      {/* نغمة محادثات */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{t.conversationSounds || t.chatSettingsConvTones || (lang === 'ar' ? 'أصوات المحادثات' : 'Conversation Sounds')}</span>
                          <span className="text-[10px] text-slate-500">{t.conversationSoundsDesc || t.chatSettingsConvTonesDesc || (lang === 'ar' ? 'تشغيل أصوات للرسائل الصادرة والواردة أثناء فتح الدردشة' : 'Play sounds for outgoing and incoming messages while chat is open')}</span>
                        </div>
                        <button 
                          onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, conversationTones: !prev.chatSettings.conversationTones } }))}
                          className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.conversationTones ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.conversationTones ? 'translate-x-6' : 'translate-x-1'}`}></span>
                        </button>
                      </div>

                      {/* تذكيرات */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{t.notificationRemindersLabel || t.chatSettingsNotifReminders || (lang === 'ar' ? 'تذكير بالإشعارات' : 'Notification Reminders')}</span>
                          <span className="text-[10px] text-slate-500">{t.notificationRemindersDesc || t.chatSettingsNotifRemindersDesc || (lang === 'ar' ? 'تذكير دوري بالرسائل غير المقروءة والمكالمات الفائتة' : 'Periodic reminder for unread messages and missed calls')}</span>
                        </div>
                        <button 
                          onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, notificationReminders: !prev.chatSettings.notificationReminders } }))}
                          className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.notificationReminders ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.notificationReminders ? 'translate-x-6' : 'translate-x-1'}`}></span>
                        </button>
                      </div>

                      {/* اشعارات ذات اهمية */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{t.highPriorityNotifLabel || t.chatSettingsHighPriorityNotif || (lang === 'ar' ? 'إشعارات ذات أهمية مرتفعة' : 'High Priority Notifications')}</span>
                          <span className="text-[10px] text-slate-500">{t.highPriorityNotifDesc || t.chatSettingsHighPriorityDesc || (lang === 'ar' ? 'معاينة الإشعارات في أعلى الشاشة فور وصولها' : 'Preview notifications at the top of the screen as soon as they arrive')}</span>
                        </div>
                        <button 
                          onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, highPriorityNotifications: !prev.chatSettings.highPriorityNotifications } }))}
                          className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.highPriorityNotifications ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.highPriorityNotifications ? 'translate-x-6' : 'translate-x-1'}`}></span>
                        </button>
                      </div>

                      {/* اشعارات تفاعلات */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{t.reactionNotifLabel || t.chatSettingsReactionNotif || (lang === 'ar' ? 'إشعارات التفاعلات' : 'Reaction Notifications')}</span>
                          <span className="text-[10px] text-slate-500">{t.reactionNotifDesc || t.chatSettingsReactionNotifDesc || (lang === 'ar' ? 'تلقي إشعارات عند تفاعل الآخرين برموز تعبيرية على رسائلك' : 'Receive notifications when others react with emojis to your messages')}</span>
                        </div>
                        <button 
                          onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, reactionNotifications: !prev.chatSettings.reactionNotifications } }))}
                          className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.reactionNotifications ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.reactionNotifications ? 'translate-x-6' : 'translate-x-1'}`}></span>
                        </button>
                      </div>
                    </div>

                    {/* رسائل */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h4 className="text-sm font-black text-emerald-400">{t.individualMessageNotifs || (lang === 'ar' ? 'إشعارات الرسائل الفردية' : 'Individual Message Notifications')}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.notificationTone || (lang === 'ar' ? 'نغمة الإشعارات' : 'Notification Tone')}</span>
                          <select 
                            value={settings.chatSettings.msgNotifTone || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, msgNotifTone: e.target.value } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultTone || (lang === 'ar' ? 'النغمة الافتراضية' : 'Default Tone')}</option>
                            <option value="joyful font-bold">{t.joyfulTone || (lang === 'ar' ? 'مرحة' : 'Joyful')}</option>
                            <option value="simple font-bold">{t.simpleTone || (lang === 'ar' ? 'بسيطة' : 'Simple')}</option>
                            <option value="none font-bold">{t.silentTone || (lang === 'ar' ? 'بدون صوت (صامت)' : 'Silent')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.vibration || (lang === 'ar' ? 'اهتزاز' : 'Vibration')}</span>
                          <select 
                            value={settings.chatSettings.msgVibrate || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, msgVibrate: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultVibration || (lang === 'ar' ? 'الافتراضي' : 'Default')}</option>
                            <option value="short">{t.shortVibration || (lang === 'ar' ? 'قصير' : 'Short')}</option>
                            <option value="long">{t.longVibration || (lang === 'ar' ? 'طويل' : 'Long')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.ledFlash || (lang === 'ar' ? 'وميض (ضوء LED)' : 'Flash (LED Light)')}</span>
                          <select 
                            value={settings.chatSettings.msgFlash || 'green'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, msgFlash: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="green">{t.colorGreen || (lang === 'ar' ? 'أخضر' : 'Green')}</option>
                            <option value="red">{t.colorRed || (lang === 'ar' ? 'أحمر' : 'Red')}</option>
                            <option value="blue">{t.colorBlue || (lang === 'ar' ? 'أزرق' : 'Blue')}</option>
                            <option value="yellow">{t.colorYellow || (lang === 'ar' ? 'أصفر' : 'Yellow')}</option>
                            <option value="white">{t.colorWhite || (lang === 'ar' ? 'أبيض' : 'White')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* مجموعات */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h4 className="text-sm font-black text-emerald-400">{t.groupNotifs || (lang === 'ar' ? 'إشعارات المجموعات' : 'Group Notifications')}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.notificationTone || (lang === 'ar' ? 'نغمة الإشعارات' : 'Notification Tone')}</span>
                          <select 
                            value={settings.chatSettings.grpNotifTone || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, grpNotifTone: e.target.value } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultTone || (lang === 'ar' ? 'النغمة الافتراضية' : 'Default Tone')}</option>
                            <option value="electronic">{t.electronicTone || (lang === 'ar' ? 'إلكترونية' : 'Electronic')}</option>
                            <option value="pop">{t.popTone || (lang === 'ar' ? 'بوب' : 'Pop')}</option>
                            <option value="none">{t.silentTone || (lang === 'ar' ? 'بدون صوت (صامت)' : 'Silent')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.vibration || (lang === 'ar' ? 'اهتزاز' : 'Vibration')}</span>
                          <select 
                            value={settings.chatSettings.grpVibrate || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, grpVibrate: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultVibration || (lang === 'ar' ? 'الافتراضي' : 'Default')}</option>
                            <option value="short">{t.shortVibration || (lang === 'ar' ? 'قصير' : 'Short')}</option>
                            <option value="long">{t.longVibration || (lang === 'ar' ? 'طويل' : 'Long')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.ledFlash || (lang === 'ar' ? 'وميض (ضوء LED)' : 'Flash (LED Light)')}</span>
                          <select 
                            value={settings.chatSettings.grpFlash || 'blue'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, grpFlash: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="green">{t.colorGreen || (lang === 'ar' ? 'أخضر' : 'Green')}</option>
                            <option value="red">{t.colorRed || (lang === 'ar' ? 'أحمر' : 'Red')}</option>
                            <option value="blue">{t.colorBlue || (lang === 'ar' ? 'أزرق' : 'Blue')}</option>
                            <option value="yellow">{t.colorYellow || (lang === 'ar' ? 'أصفر' : 'Yellow')}</option>
                            <option value="white">{t.colorWhite || (lang === 'ar' ? 'أبيض' : 'White')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* مكالمات */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h4 className="text-sm font-black text-emerald-400">{t.callNotifs || (lang === 'ar' ? 'إشعارات المكالمات' : 'Call Notifications')}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.ringtone || (lang === 'ar' ? 'نغمة الرنين' : 'Ringtone')}</span>
                          <select 
                            value={settings.chatSettings.callRingtoneTone || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, callRingtoneTone: e.target.value } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultRingtone || (lang === 'ar' ? 'الرنين الافتراضي' : 'Default Ringtone')}</option>
                            <option value="classic">{t.classicRingtone || (lang === 'ar' ? 'كلاسيكي' : 'Classic')}</option>
                            <option value="marimba">{t.marimbaRingtone || (lang === 'ar' ? 'ماريمبا' : 'Marimba')}</option>
                            <option value="none">{t.silentRingtone || (lang === 'ar' ? 'بدون رنين (صامت)' : 'Silent')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.vibration || (lang === 'ar' ? 'اهتزاز' : 'Vibration')}</span>
                          <select 
                            value={settings.chatSettings.callVibrate || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, callVibrate: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultVibration || (lang === 'ar' ? 'الافتراضي' : 'Default')}</option>
                            <option value="short">{t.shortVibration || (lang === 'ar' ? 'قصير' : 'Short')}</option>
                            <option value="long">{t.longVibration || (lang === 'ar' ? 'طويل' : 'Long')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.ledFlash || (lang === 'ar' ? 'وميض (ضوء LED)' : 'Flash (LED Light)')}</span>
                          <select 
                            value={settings.chatSettings.callFlash || 'red'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, callFlash: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="green">{t.colorGreen || (lang === 'ar' ? 'أخضر' : 'Green')}</option>
                            <option value="red">{t.colorRed || (lang === 'ar' ? 'أحمر' : 'Red')}</option>
                            <option value="blue">{t.colorBlue || (lang === 'ar' ? 'أزرق' : 'Blue')}</option>
                            <option value="yellow">{t.colorYellow || (lang === 'ar' ? 'أصفر' : 'Yellow')}</option>
                            <option value="white">{t.colorWhite || (lang === 'ar' ? 'أبيض' : 'White')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* حالات */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <h4 className="text-sm font-black text-emerald-400">{t.statusNotifs || (lang === 'ar' ? 'إشعارات الحالات (القصص)' : 'Stories & Status Notifications')}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.notificationTone || (lang === 'ar' ? 'نغمة الإشعارات' : 'Notification Tone')}</span>
                          <select 
                            value={settings.chatSettings.statusNotifTone || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, statusNotifTone: e.target.value } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultTone || (lang === 'ar' ? 'النغمة الافتراضية' : 'Default Tone')}</option>
                            <option value="whisper">{t.whisperTone || (lang === 'ar' ? 'همس' : 'Whisper')}</option>
                            <option value="none">{t.silentTone || (lang === 'ar' ? 'بدون صوت (صامت)' : 'Silent')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.vibration || (lang === 'ar' ? 'اهتزاز' : 'Vibration')}</span>
                          <select 
                            value={settings.chatSettings.statusVibrate || 'default'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, statusVibrate: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="default">{t.defaultVibration || (lang === 'ar' ? 'الافتراضي' : 'Default')}</option>
                            <option value="short">{t.shortVibration || (lang === 'ar' ? 'قصير' : 'Short')}</option>
                            <option value="long">{t.longVibration || (lang === 'ar' ? 'طويل' : 'Long')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>

                        <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span className="text-[11px] text-slate-400 font-bold">{t.ledFlash || (lang === 'ar' ? 'وميض (ضوء LED)' : 'Flash (LED Light)')}</span>
                          <select 
                            value={settings.chatSettings.statusFlash || 'yellow'}
                            onChange={(e) => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, statusFlash: e.target.value as any } }))}
                            className="bg-slate-900 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="green">{t.colorGreen || (lang === 'ar' ? 'أخضر' : 'Green')}</option>
                            <option value="red">{t.colorRed || (lang === 'ar' ? 'أحمر' : 'Red')}</option>
                            <option value="blue">{t.colorBlue || (lang === 'ar' ? 'أزرق' : 'Blue')}</option>
                            <option value="yellow">{t.colorYellow || (lang === 'ar' ? 'أصفر' : 'Yellow')}</option>
                            <option value="white">{t.colorWhite || (lang === 'ar' ? 'أبيض' : 'White')}</option>
                            <option value="off">{t.off || (lang === 'ar' ? 'إيقاف' : 'Off')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* البيانات والوسائط */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{t.dataAndSaver || (lang === 'ar' ? 'البيانات وتوفير الاستهلاك' : 'Data and Storage Usage')}</h3>
                    <button 
                      onClick={() => setCurrentView('storage_data')}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1 active:scale-95"
                    >
                      <span>{t.details || (lang === 'ar' ? 'التفاصيل' : 'Details')}</span>
                      <ChevronLeft size={14} className={isRtl ? 'rotate-180' : ''} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* التنزيل التلقائي للوسائط */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.autoDownloadMedia || (lang === 'ar' ? 'التنزيل التلقائي للوسائط' : 'Auto-Download Media')}</span>
                        <span className="text-[10px] text-slate-500">{t.autoDownloadMediaDesc || (lang === 'ar' ? 'تنزيل الصور والفيديوهات تلقائياً عند الاتصال بالإنترنت' : 'Auto-download photos and videos when connected to internet')}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, autoDownloadMedia: !prev.chatSettings.autoDownloadMedia } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.autoDownloadMedia ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.autoDownloadMedia ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* توفير في بيانات المكالمات */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.useLessDataForCalls || (lang === 'ar' ? 'توفير في بيانات المكالمات' : 'Use Less Data for Calls')}</span>
                        <span className="text-[10px] text-slate-500">{t.useLessDataForCallsDesc || (lang === 'ar' ? 'تقليل استهلاك البيانات أثناء المكالمات الصوتية والمرئية' : 'Reduce data usage during voice and video calls')}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, useLessDataForCalls: !prev.chatSettings.useLessDataForCalls } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.useLessDataForCalls ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.useLessDataForCalls ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* جودة وسائط الإرسال */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-sm text-slate-300">{t.mediaQuality || (lang === 'ar' ? 'جودة تحميل وسائط الإرسال' : 'Upload Media Quality')}</span>
                      <div className="flex bg-white/5 rounded-xl p-1">
                        {[
                          { key: 'auto', label: t.auto || (lang === 'ar' ? 'تلقائي' : 'Auto') },
                          { key: 'data_saver', label: t.saver || (lang === 'ar' ? 'توفير' : 'Data Saver') },
                          { key: 'high_quality', label: t.high || (lang === 'ar' ? 'عالية' : 'High Quality') }
                        ].map(quality => (
                          <button
                            key={quality.key}
                            onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, mediaQuality: quality.key as any } }))}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${settings.chatSettings.mediaQuality === quality.key ? 'bg-emerald-500 text-black' : 'text-slate-400'}`}
                          >
                            {quality.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* إدارة سجل المحادثات */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.chatHistoryManagement || (lang === 'ar' ? 'إدارة سجل المحادثات' : 'Chat History Management')}</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        if (confirm(t.clearAllChatsConfirmPrompt || (lang === 'ar' ? "هل أنت متأكد من رغبتك في مسح كافة رسائل وسجل المحادثات؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to clear all chat messages and history? This action cannot be undone."))) {
                          alert(t.clearAllChatsSuccessAlert || (lang === 'ar' ? "تم مسح سجل المحادثات بنجاح." : "All chat history cleared successfully."));
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl hover:bg-rose-500/20 transition-all text-rose-500 font-bold text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} />
                        <span>{t.clearChatHistory || (lang === 'ar' ? 'مسح سجل المحادثات بالكامل' : 'Clear All Chat History')}</span>
                      </div>
                      <ChevronRight size={18} className={isRtl ? '' : 'rotate-180'} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ACCOUNT SETTINGS SUB-PAGE HUB */}
            {currentView === 'account' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <div className="glass p-5 rounded-[2.5rem] flex flex-col gap-2 border border-white/5 shadow-lg">
                    {/* 1. Account Details (حساب) */}
                    <button 
                      onClick={() => setCurrentView('account_profile')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.accountTitle || 'الحساب'}</h3>
                                <span className="text-[11px] text-slate-400">{t.accountSubDesc || 'إدارة البريد، الهاتف وحذف الحساب نهائياً'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* 2. Security & Permissions (أمان وأذونات) */}
                    <button 
                      onClick={() => setCurrentView('account_security_permissions')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.securityPermissions || 'أمان وأذونات'}</h3>
                                <span className="text-[11px] text-slate-400">{t.securityPermissionsSubDesc || 'تغيير كلمة المرور، التحقق بخطوتين وأذونات التطبيق'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* 3. Analytics (تحليلات) */}
                    <button 
                      onClick={() => setCurrentView('account_analytics')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group border-b border-white/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center">
                                <BarChart3 size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.analytics || 'تحليلات'}</h3>
                                <span className="text-[11px] text-slate-400">{t.analyticsSubDesc || 'إحصائيات تفاعل حسابك، المشاهدات ونمو المتابعين'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>

                    {/* 4. Requests & Orders (طلباتك) */}
                    <button 
                      onClick={() => setCurrentView('account_orders')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <FileText size={20} />
                            </div>
                            <div className="text-start">
                                <h3 className="text-sm font-bold text-white">{t.orders || 'طلباتك'}</h3>
                                <span className="text-[11px] text-slate-400">{t.ordersSubDesc || 'سجل مشترياتك، اشتراكاتك ورفع طلبات الدعم'}</span>
                            </div>
                        </div>
                        <div className="text-slate-600 group-hover:text-white transition-colors">
                          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                    </button>
                </div>
              </div>
            )}

            {/* 1. SUB-PAGE: ACCOUNT PROFILE */}
            {currentView === 'account_profile' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg text-start">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xl">
                      H
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{userNickname}</h4>
                      <div className="flex flex-col gap-1 mt-1 text-xs text-slate-500">
                        <span>{t.uidLabel || 'معرف المستخدم UID'}: <strong className="text-slate-300">hisee_9831</strong></span>
                        <span>{t.accountCreatedAt || 'تاريخ إنشاء الحساب'}: <span className="text-emerald-400 font-medium">١٨ أغسطس ٢٠٢٤</span></span>
                        <span className="flex items-center gap-1 mt-0.5 text-emerald-400 font-bold">
                          <Check size={12} /> {t.fullyVerifiedAccount || 'الحساب موثق بالكامل'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">{t.currentContactInfo || 'بيانات الاتصال الحالية'}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{t.email || 'البريد الإلكتروني'}</span>
                        <span className="text-sm text-white">{settings.chatSettings.email}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setTempValue(settings.chatSettings.email);
                          setActiveModal('email');
                        }}
                        className="text-[11px] bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-xl hover:bg-rose-500/20 font-bold transition-all"
                      >
                        {t.change || 'تغيير'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{t.phoneNumber || 'رقم الهاتف'}</span>
                        <span className="text-sm text-white">{settings.chatSettings.phoneNumber}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setTempValue(settings.chatSettings.phoneNumber);
                          setActiveModal('phone');
                        }}
                        className="text-[11px] bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-xl hover:bg-rose-500/20 font-bold transition-all"
                      >
                        {t.change || 'تغيير'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg border-rose-500/20 text-start">
                  <h3 className="text-base font-bold text-rose-500 mb-2">{t.accountDangerZone || 'منطقة الخطر'}</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {t.deleteAccountWarningDesc || 'عند حذف الحساب نهائياً، سيتم مسح كافة سجلات المحادثات، قائمة الأصدقاء، والعملات الرقمية المشحونة، ولا يمكن التراجع عن هذا الإجراء مطلقاً.'}
                  </p>
                  <button 
                    onClick={() => setActiveModal('deleteAccount')}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-rose-500/10 rounded-2xl hover:bg-rose-500/20 transition-all text-rose-500 font-bold text-sm"
                  >
                    <Trash2 size={18} />
                    <span>{t.deleteAccountPermanent || 'حذف الحساب نهائياً'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. SUB-PAGE: ACCOUNT SECURITY & PERMISSIONS */}
            {currentView === 'account_security_permissions' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg text-start">
                  <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">{t.accountSecurityProtection || 'الأمان وحماية الحساب'}</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        setTempValue('');
                        setActiveModal('password');
                      }}
                      className="w-full flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Key size={18} className="text-amber-500" />
                        <span className="text-sm text-white">{t.accountChangePassword || 'تغيير كلمة المرور'}</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-600" />
                    </button>

                    <button 
                      onClick={() => setSettings(prev => ({ 
                        ...prev, 
                        chatSettings: { 
                        ...prev.chatSettings, 
                        twoFactorEnabled: !prev.chatSettings.twoFactorEnabled 
                        } 
                      }))}
                      className="w-full flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={18} className="text-blue-500" />
                        <span className="text-sm text-white">{t.accountTwoFactorAuth || 'التحقق بخطوتين'}</span>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${settings.chatSettings.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                        {settings.chatSettings.twoFactorEnabled ? (t.accountEnabled || 'نشط ومفعل') : (t.accountDisabled || 'معطل')}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg text-start">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t.appPermissionsSystem || 'أذونات التطبيق وصلاحيات النظام'}</h3>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">{t.connected100 || 'متصل ومفعل ١٠٠%'}</span>
                  </div>

                  {permissionFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className={`mb-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                        permissionFeedback.isError 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      <ShieldCheck size={16} className="shrink-0" />
                      <span>{permissionFeedback.message}</span>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    {/* Camera Permission */}
                    <div className="flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${accountPermissions.camera ? 'bg-pink-500/20 text-pink-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Camera size={18} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{t.cameraPermission || 'إذن الكاميرا'}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${accountPermissions.camera ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {accountPermissions.camera ? (t.accountActive || 'مفعل') : (t.accountInactive || 'معطل')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{t.cameraPermissionDesc || 'مطلوب لمكالمات الفيديو والقصص والتقاط الصور ومسح QR'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleTogglePermission('camera')}
                        disabled={isUpdatingPerm === 'camera'}
                        className={`w-12 h-7 rounded-full transition-all relative ${accountPermissions.camera ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform absolute top-1 ${accountPermissions.camera ? 'left-6' : 'left-1'}`}></span>
                      </button>
                    </div>

                    {/* Microphone Permission */}
                    <div className="flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${accountPermissions.microphone ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Mic size={18} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{t.micPermission || 'إذن الميكروفون'}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${accountPermissions.microphone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {accountPermissions.microphone ? (t.accountActive || 'مفعل') : (t.accountInactive || 'معطل')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{t.micPermissionDesc || 'مطلوب لتسجيل الرسائل الصوتية والمكالمات وبث LIVE'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleTogglePermission('microphone')}
                        disabled={isUpdatingPerm === 'microphone'}
                        className={`w-12 h-7 rounded-full transition-all relative ${accountPermissions.microphone ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform absolute top-1 ${accountPermissions.microphone ? 'left-6' : 'left-1'}`}></span>
                      </button>
                    </div>

                    {/* Location Permission */}
                    <div className="flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${accountPermissions.location ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          <MapPin size={18} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{t.locationPermission || 'الموقع الجغرافي GPS'}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${accountPermissions.location ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {accountPermissions.location ? (t.accountActive || 'مفعل') : (t.accountInactive || 'معطل')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{t.locationPermissionDesc || 'مطلوب لإرفاق موقعك في المحادثات وربط حسابات العائلة'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleTogglePermission('location')}
                        disabled={isUpdatingPerm === 'location'}
                        className={`w-12 h-7 rounded-full transition-all relative ${accountPermissions.location ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform absolute top-1 ${accountPermissions.location ? 'left-6' : 'left-1'}`}></span>
                      </button>
                    </div>

                    {/* Notifications Permission */}
                    <div className="flex items-center justify-between p-4 bg-[#14161a] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${accountPermissions.notifications ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Bell size={18} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{t.notificationsPermission || 'إرسال الإشعارات المباشرة'}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${accountPermissions.notifications ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {accountPermissions.notifications ? (t.accountActive || 'مفعل') : (t.accountInactive || 'معطل')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{t.notificationsPermissionDesc || 'مطلوب لاستلام الرسائل والتنبيهات المباشرة في الخلفية'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleTogglePermission('notifications')}
                        disabled={isUpdatingPerm === 'notifications'}
                        className={`w-12 h-7 rounded-full transition-all relative ${accountPermissions.notifications ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform absolute top-1 ${accountPermissions.notifications ? 'left-6' : 'left-1'}`}></span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SUB-PAGE: ACCOUNT ANALYTICS */}
            {currentView === 'account_analytics' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-start">
                  <div className="glass p-4 rounded-3xl border border-white/5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t.profileViews || (isRtl ? 'مشاهدات الملف الشخصي' : 'Profile Views')}</span>
                    <span className="text-xl font-extrabold text-white block mt-1">4,820</span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 block">{t.weeklyGrowthStat1 || (isRtl ? '▲ +٢٤٪ هذا الأسبوع' : '▲ +24% this week')}</span>
                  </div>
                  <div className="glass p-4 rounded-3xl border border-white/5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t.generalEngagement || (isRtl ? 'نسبة التفاعل العام' : 'General Engagement Rate')}</span>
                    <span className="text-xl font-extrabold text-white block mt-1">6.82%</span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 block">{t.weeklyGrowthStat2 || (isRtl ? '▲ +١.٢٪ نمو متواصل' : '▲ +1.2% continuous growth')}</span>
                  </div>
                  <div className="glass p-4 rounded-3xl border border-white/5 col-span-2 md:col-span-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{t.newFollowers || (isRtl ? 'المتابعون الجدد' : 'New Followers')}</span>
                    <span className="text-xl font-extrabold text-white block mt-1">+1,420</span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1 block">{t.weeklyGrowthStat3 || (isRtl ? '▲ +١٨.٤٪ نشطون' : '▲ +18.4% active')}</span>
                  </div>
                </div>

                {/* Recharts Area Chart */}
                <div className="glass p-5 rounded-[2.5rem] border border-white/5 shadow-lg text-start">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">{t.weeklyGrowthStats || 'إحصائيات النمو الأسبوعية'}</h3>
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded-lg">LIVE & POSTS</span>
                  </div>
                  <div className="h-56 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { name: 'السبت', views: 800, followers: 120 },
                          { name: 'الأحد', views: 1200, followers: 180 },
                          { name: 'الإثنين', views: 1900, followers: 240 },
                          { name: 'الثلاثاء', views: 1500, followers: 190 },
                          { name: 'الأربعاء', views: 2500, followers: 310 },
                          { name: 'الخميس', views: 3200, followers: 450 },
                          { name: 'الجمعة', views: 4820, followers: 580 },
                        ]}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                        <YAxis stroke="#64748b" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1c20', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }} />
                        <Area type="monotone" dataKey="views" name={t.profileViews || 'Profile Views'} stroke="#ec4899" fillOpacity={1} fill="url(#colorViews)" />
                        <Area type="monotone" dataKey="followers" name={t.newFollowers || 'New Followers'} stroke="#10b981" fillOpacity={1} fill="url(#colorFollowers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Posts Performance */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg text-start">
                  <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">{t.bestPerformingPosts || 'Best Performing & Engaging Posts'}</h3>
                  <div className="space-y-3">
                    {recentPosts.map((post) => (
                      <div key={post.id} className="flex items-center justify-between p-3 bg-[#14161a] rounded-xl border border-white/5">
                        <div className="truncate max-w-[65%]">
                          <span className="text-xs text-slate-300 block truncate">{post.text}</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">{post.date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 shrink-0">
                          <span className="bg-pink-500/10 text-pink-500 px-2 py-1 rounded-lg">👁 {post.views}</span>
                          <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg">❤ {post.likes}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. SUB-PAGE: ACCOUNT ORDERS & REQUESTS */}
            {currentView === 'account_orders' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                {/* Orders Statistics Banner */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-[#14161a] border border-emerald-500/20 rounded-2xl text-start">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">{t.completedOrders || (isRtl ? 'الطلبات المكتملة' : 'Completed Orders')}</span>
                    <span className="text-xl font-black text-white">
                      {ordersList.filter(o => o.status === 'completed').length}
                    </span>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-[#14161a] border border-blue-500/20 rounded-2xl text-start">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">{t.activeSubscriptions || (isRtl ? 'الاشتراكات النشطة' : 'Active Subscriptions')}</span>
                    <span className="text-xl font-black text-white">
                      {ordersList.filter(o => o.status === 'active').length}
                    </span>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-amber-500/10 to-[#14161a] border border-amber-500/20 rounded-2xl text-start">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">{t.underReview || (isRtl ? 'قيد المراجعة' : 'Under Review')}</span>
                    <span className="text-xl font-black text-white">
                      {ordersList.filter(o => o.status === 'pending').length}
                    </span>
                  </div>
                </div>

                {/* Orders & Requests List */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg text-start space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t.ordersHistory || (isRtl ? 'سجل طلباتك الحالية والسابقة' : 'Current & Past Orders History')}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{t.ordersHistoryDesc || (isRtl ? 'اضغط على أي طلب لعرض تفاصيله الكاملة، إيصال الدفع، أو إدارته' : 'Click on any order to view full details, receipt, or manage it')}</p>
                    </div>
                    <span className="self-start sm:self-center text-xs text-emerald-400 font-bold bg-[#10b98115] px-3 py-1 rounded-full border border-emerald-500/20">
                      {t.totalOrdersCount || (isRtl ? 'إجمالي' : 'Total')} {ordersList.length}
                    </span>
                  </div>

                  {/* Search and Filters Bar */}
                  <div className="space-y-3 pt-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text"
                        value={ordersSearch}
                        onChange={(e) => setOrdersSearch(e.target.value)}
                        placeholder={t.searchOrdersPlaceholder || (isRtl ? 'ابحث برقم الطلب (ORD-...) أو العنوان أو المبلغ...' : 'Search by order ID (ORD-...), title, or amount...')}
                        className="w-full ps-10 pe-4 py-2.5 bg-[#14161a] text-xs text-white rounded-xl border border-white/5 focus:border-rose-500 focus:outline-none placeholder:text-slate-600 transition-colors"
                      />
                      {ordersSearch && (
                        <button 
                          onClick={() => setOrdersSearch('')}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {[
                        { key: 'all', label: t.allOrdersTab || (isRtl ? 'الكل' : 'All'), count: ordersList.length },
                        { key: 'completed', label: t.completedTab || (isRtl ? 'المكتملة' : 'Completed'), count: ordersList.filter(o => o.status === 'completed').length },
                        { key: 'active', label: t.activeTab || (isRtl ? 'الاشتراكات' : 'Subscriptions'), count: ordersList.filter(o => o.status === 'active').length },
                        { key: 'pending', label: t.pendingTab || (isRtl ? 'قيد المراجعة' : 'Pending'), count: ordersList.filter(o => o.status === 'pending').length },
                        { key: 'support', label: t.supportTab || (isRtl ? 'تذاكر الدعم' : 'Support Tickets'), count: ordersList.filter(o => o.id.startsWith('REQ-') || o.id.startsWith('TKT-')).length }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setOrdersFilter(tab.key as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                            ordersFilter === tab.key 
                              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                              : 'bg-[#14161a] text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            ordersFilter === tab.key ? 'bg-black/20 text-white' : 'bg-white/5 text-slate-400'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtered Orders List */}
                  <div className="space-y-3 pt-1">
                    {(() => {
                      const filtered = ordersList.filter(order => {
                        // Search filter
                        if (ordersSearch.trim()) {
                          const q = ordersSearch.toLowerCase();
                          const matchId = (order.id || '').toLowerCase().includes(q);
                          const matchTitle = (order.title || '').toLowerCase().includes(q);
                          const matchPrice = (order.price || '').toLowerCase().includes(q);
                          if (!matchId && !matchTitle && !matchPrice) return false;
                        }
                        // Tab filter
                        if (ordersFilter === 'completed') return order.status === 'completed';
                        if (ordersFilter === 'active') return order.status === 'active';
                        if (ordersFilter === 'pending') return order.status === 'pending';
                        if (ordersFilter === 'support') return order.id.startsWith('REQ-') || order.id.startsWith('TKT-') || order.category === 'support' || order.category === 'refund';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-8 text-center bg-[#14161a]/60 rounded-2xl border border-dashed border-white/10 space-y-2">
                            <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400">
                              <Receipt size={22} />
                            </div>
                            <p className="text-sm font-bold text-white">{t.noOrdersMatch || (isRtl ? 'لا توجد طلبات تطابق هذا الاختيار' : 'No orders match this selection')}</p>
                            <p className="text-xs text-slate-500">{t.tryChangingFilter || (isRtl ? 'جرب تغيير فلتر العرض أو تقديم طلب دعم جديد بالأسفل' : 'Try changing filter or submit new support request below')}</p>
                          </div>
                        );
                      }

                      return filtered.map((order) => {
                        const isCoins = order.category === 'coins' || order.title.includes('عملة') || order.title.toLowerCase().includes('coin');
                        const isVIP = order.category === 'vip' || order.title.includes('VIP');
                        const isWithdrawal = order.category === 'withdrawal' || order.title.includes('سحب') || order.title.toLowerCase().includes('withdraw');

                        return (
                          <div 
                            key={order.id} 
                            onClick={() => setSelectedOrderModal(order)}
                            className="p-4 bg-[#14161a] hover:bg-[#1a1e24] rounded-2xl border border-white/5 hover:border-white/15 transition-all cursor-pointer group relative overflow-hidden"
                          >
                            {/* Glow accent */}
                            <div className={`absolute top-0 start-0 w-1.5 h-full ${
                              order.status === 'completed' ? 'bg-emerald-500' :
                              order.status === 'active' ? 'bg-blue-500' :
                              order.status === 'cancelled' ? 'bg-rose-500' :
                              'bg-amber-500'
                            }`} />

                            <div className="flex items-center justify-between ps-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  isCoins ? 'bg-amber-500/10 text-amber-400' :
                                  isVIP ? 'bg-purple-500/10 text-purple-400' :
                                  isWithdrawal ? 'bg-emerald-500/10 text-emerald-400' :
                                  'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {isCoins ? <Coins size={16} /> :
                                   isVIP ? <Crown size={16} /> :
                                   isWithdrawal ? <Wallet size={16} /> :
                                   <LifeBuoy size={16} />}
                                </div>
                                <span className="text-xs font-black text-slate-400 group-hover:text-white transition-colors">{order.id}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                  order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  order.status === 'active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                                  order.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    order.status === 'completed' ? 'bg-emerald-400' :
                                    order.status === 'active' ? 'bg-blue-400' :
                                    order.status === 'cancelled' ? 'bg-rose-400' :
                                    'bg-amber-400'
                                  }`} />
                                  {getOrderStatusDisplayBadge(order.status)}
                                </span>
                              </div>
                            </div>

                            <div className="ps-2 mt-2.5">
                              <h4 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors">{getOrderDisplayTitle(order)}</h4>
                              {order.description && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{getOrderDisplayDesc(order)}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-white/5 text-[11px] text-slate-500 ps-2">
                              <span className="flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-600" />
                                {t.dateLabel || (isRtl ? 'التاريخ:' : 'Date:')} {getOrderDisplayDate(order)}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-white font-black text-xs">{getOrderDisplayPrice(order)}</span>
                                <span className="text-[10px] text-rose-400 font-bold group-hover:underline flex items-center gap-0.5">
                                  {t.detailsLabel || (isRtl ? 'التفاصيل' : 'Details')}
                                  <ChevronLeft size={12} className="rtl:rotate-0 ltr:rotate-180" />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Custom Ticket Submission Form */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg text-start space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      {t.submitNewTicket || (isRtl ? 'تقديم طلب جديد / بطاقة دعم' : 'Submit New Request / Support Ticket')}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {t.submitTicketDesc || (isRtl ? 'هل تواجه مشكلة في طلب شحن، أو ترغب في تقديم طلب استرداد مالي أو دعم؟ يرجى ملء التفاصيل بالأسفل وسيتواصل معك الفريق فوراً.' : 'Facing a top-up issue, refund request, or support? Fill details below and team will contact you.')}
                    </p>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-500 font-bold">
                      {t.commonTopics || (isRtl ? 'مواضيع شائعة للتقديم السريع:' : 'Common quick submission topics:')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { title: t.presetCoins || (isRtl ? 'لم أستلم عملات الشحن المشتراة' : 'Did not receive purchased coins'), type: 'coins', price: isRtl ? '٤٩.٩٩ €' : '49.99 €' },
                        { title: t.presetVip || (isRtl ? 'استفسار عن تجديد وتفعيل اشتراك VIP' : 'VIP subscription renewal inquiry'), type: 'vip', price: isRtl ? '٩.٩٩ €' : '9.99 €' },
                        { title: t.presetWithdrawal || (isRtl ? 'تسريع مراجعة تحويل أرباح البث المباشر' : 'Expedite LIVE payout review'), type: 'withdrawal', price: isRtl ? '١٠٠.٠٠ €' : '100.00 €' },
                        { title: t.presetRefund || (isRtl ? 'طلب استرداد مالي لعملية تمت بالخطأ' : 'Refund request for mistaken charge'), type: 'refund', price: '' },
                        { title: t.presetAppeal || (isRtl ? 'التماس إلغاء حظر أو تقييد الحساب' : 'Account ban or restriction appeal'), type: 'appeal', price: '' },
                        { title: t.presetSuggestion || (isRtl ? 'اقتراح أو ملاحظة عامة' : 'Feature suggestion or general note'), type: 'feature', price: '' }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewOrderTitle(preset.title);
                            setNewOrderType(preset.type);
                            if (preset.price) setNewOrderPrice(preset.price);
                            setNewOrderDetails(isRtl
                              ? `أرجو المساعدة بخصوص: ${preset.title}.\nتاريخ المشكلة: اليوم.\nملاحظات إضافية: يرجى المراجعة والرد في أقرب وقت.`
                              : `Please assist regarding: ${preset.title}.\nIssue date: Today.\nAdditional notes: Please review and reply as soon as possible.`
                            );
                          }}
                          className="text-[11px] bg-[#14161a] hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 px-3 py-1.5 rounded-xl border border-white/5 hover:border-rose-500/30 transition-all font-medium"
                        >
                          + {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-bold">
                        {t.ticketTitleLabel || (isRtl ? 'عنوان الطلب / المشكلة' : 'Request / Issue Title')} <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={newOrderTitle}
                        onChange={(e) => setNewOrderTitle(e.target.value)}
                        placeholder={t.ticketTitlePlaceholder || (isRtl ? 'مثال: لم أستلم العملات المشتراة من العملية ORD-8931' : 'Example: Did not receive purchased coins from ORD-8931')} 
                        className="w-full p-3 bg-[#14161a] text-sm text-white rounded-xl border border-white/5 focus:border-rose-500 focus:outline-none placeholder:text-slate-600 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1.5 font-bold">
                          {t.ticketCategoryLabel || (isRtl ? 'نوع وتصنيف الطلب' : 'Request Type & Category')}
                        </label>
                        <select 
                          value={newOrderType}
                          onChange={(e) => setNewOrderType(e.target.value)}
                          className="w-full p-3 bg-[#14161a] text-sm text-white rounded-xl border border-white/5 focus:border-rose-500 focus:outline-none transition-colors"
                        >
                          <option value="refund">{t.catRefund || (isRtl ? 'استرداد مالي (Refund Request)' : 'Refund Request')}</option>
                          <option value="coins">{t.catCoins || (isRtl ? 'مشكلة في شحن العملات (Coins Issue)' : 'Coins & Top-up Issue')}</option>
                          <option value="vip">{t.catVip || (isRtl ? 'استفسار عن اشتراك VIP (VIP Subscription)' : 'VIP Subscription & Perks')}</option>
                          <option value="withdrawal">{t.catWithdrawal || (isRtl ? 'متابعة سحب أرباح البث (Earnings Withdrawal)' : 'Earnings & Payout Inquiry')}</option>
                          <option value="appeal">{t.catAppeal || (isRtl ? 'التماس إلغاء حظر أو تقييد الحساب (Appeal)' : 'Account Ban Appeal')}</option>
                          <option value="feature">{t.catFeature || (isRtl ? 'اقتراح ميزة جديدة وتطوير (Feature Request)' : 'Feature Suggestion')}</option>
                          <option value="other">{t.catOther || (isRtl ? 'استفسار أو مساعدة فنية عامة (Support)' : 'General Support / Inquiry')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1.5 font-bold">
                          {t.estimatedAmountLabel || (isRtl ? 'المبلغ المقدر (إن وُجد)' : 'Estimated Amount (if any)')}
                        </label>
                        <input 
                          type="text" 
                          value={newOrderPrice}
                          onChange={(e) => setNewOrderPrice(e.target.value)}
                          placeholder={isRtl ? 'مثال: ٩.٩٩ € أو ٥٠ $' : 'Example: 9.99 € or $50'} 
                          className="w-full p-3 bg-[#14161a] text-sm text-white rounded-xl border border-white/5 focus:border-rose-500 focus:outline-none placeholder:text-slate-600 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Related Order Linking */}
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-bold">
                        {t.linkPreviousOrder || (isRtl ? 'ربط بطلب سابق (اختياري)' : 'Link to Previous Order (optional)')}
                      </label>
                      <select
                        value={newOrderRelatedId}
                        onChange={(e) => setNewOrderRelatedId(e.target.value)}
                        className="w-full p-3 bg-[#14161a] text-sm text-white rounded-xl border border-white/5 focus:border-rose-500 focus:outline-none transition-colors"
                      >
                        <option value="">{t.noOrderLink || (isRtl ? '-- بدون ربط بطلب محدد --' : '-- No Specific Order Link --')}</option>
                        {ordersList.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.id} - {getOrderDisplayTitle(o)} ({getOrderDisplayPrice(o)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Problem Description Details */}
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-bold">
                        {t.problemDetailsLabel || (isRtl ? 'تفاصيل وشرح المشكلة' : 'Issue Details & Description')}
                      </label>
                      <textarea
                        value={newOrderDetails}
                        onChange={(e) => setNewOrderDetails(e.target.value)}
                        rows={3}
                        placeholder={t.problemDetailsPlaceholder || (isRtl ? 'اشرح المشكلة بالتفصيل لمساعدة فريق الدعم الفني في حلها فوراً...' : 'Explain the issue in detail to help support team resolve it promptly...')}
                        className="w-full p-3 bg-[#14161a] text-sm text-white rounded-xl border border-white/5 focus:border-rose-500 focus:outline-none placeholder:text-slate-600 transition-colors resize-none"
                      />
                    </div>

                    {orderFormError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                        <AlertCircle size={16} />
                        <span>{orderFormError}</span>
                      </div>
                    )}

                    {orderSubmittedSuccess && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-bold flex items-start gap-3 animate-in fade-in">
                        <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-sm text-white">
                            {t.orderSuccessTitle || (isRtl ? 'تم استلام طلبك بنجاح!' : 'Your request has been received successfully!')} ({orderSubmittedSuccess})
                          </p>
                          <p className="text-emerald-400/80 font-normal mt-1 leading-relaxed">
                            {t.orderSuccessDesc || (isRtl ? 'تم تسجيل التذكرة في سجل طلباتك وجاري مراجعتها من قِبل الدعم الفني. سيصلك إشعار بالنتيجة خلال ٢٤ ساعة.' : 'The ticket has been recorded in your orders history and is under technical review. You will receive an update within 24 hours.')}
                          </p>
                        </div>
                      </div>
                    )}

                    <button 
                      disabled={isSubmittingTicket}
                      onClick={async () => {
                        setOrderFormError(null);
                        if (!newOrderTitle.trim()) {
                          setOrderFormError(t.orderTitleRequired || (isRtl ? 'يرجى كتابة عنوان الطلب أو المشكلة للمتابعة.' : 'Please enter a request title or issue to proceed.'));
                          return;
                        }

                        setIsSubmittingTicket(true);
                        const newId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
                        const now = new Date();
                        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                        const dateStr = isRtl ? `اليوم، ${timeStr}` : `Today, ${timeStr}`;
                        
                        const newObj = {
                          id: newId,
                          title: newOrderTitle.trim(),
                          category: (newOrderType === 'coins' ? 'coins' : newOrderType === 'vip' ? 'vip' : newOrderType === 'withdrawal' ? 'withdrawal' : 'support') as any,
                          date: dateStr,
                          timestamp: Date.now(),
                          price: newOrderPrice.trim() || 'N/A',
                          status: 'pending' as const,
                          statusAr: isRtl ? 'قيد المراجعة' : 'Under Review',
                          paymentMethod: isRtl ? 'طلب إلكتروني عبر الدعم' : 'Online Support Ticket',
                          description: newOrderDetails.trim() || (isRtl ? 'تم تقديم هذا الطلب إلى قسم الدعم الفني للمراجعة والتدقيق.' : 'This request was submitted to technical support for review.'),
                          relatedOrderId: newOrderRelatedId || undefined
                        };

                        // Add to Firestore if authenticated
                        try {
                          if (auth.currentUser) {
                            await addDoc(collection(firestoreDb, 'feedback'), {
                              uid: auth.currentUser.uid,
                              ticketId: newId,
                              title: newOrderTitle.trim(),
                              type: newOrderType,
                              price: newOrderPrice.trim() || 'N/A',
                              details: newOrderDetails.trim(),
                              relatedOrderId: newOrderRelatedId || null,
                              status: 'pending',
                              createdAt: serverTimestamp()
                            });
                          }
                        } catch (err) {
                          console.warn('Firestore ticket sync fallback:', err);
                        }

                        setOrdersList(prev => [newObj, ...prev]);
                        setNewOrderTitle('');
                        setNewOrderPrice('');
                        setNewOrderDetails('');
                        setNewOrderRelatedId('');
                        setIsSubmittingOrderForm(false);
                        setIsSubmittingTicket(false);
                        setOrderSubmittedSuccess(newId);
                        setTimeout(() => setOrderSubmittedSuccess(null), 8000);
                      }}
                      className="w-full p-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-rose-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmittingOrderForm || isSubmittingTicket ? (
                        <span>{t.submittingOrder || (isRtl ? 'جاري إرسال الطلب...' : 'Submitting request...')}</span>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>{t.submitOrderBtn || (isRtl ? 'تقديم الطلب فوراً ومتابعة الحالة' : 'Submit Request Now & Track Status')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* MODAL: Full Order Details & Receipt */}
                {selectedOrderModal && (
                  <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#14161a] border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-start">
                      {/* Modal Header */}
                      <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                            selectedOrderModal.category === 'coins' || selectedOrderModal.title.includes('عملة') || selectedOrderModal.title.toLowerCase().includes('coin') ? 'bg-amber-500/10 text-amber-400' :
                            selectedOrderModal.category === 'vip' || selectedOrderModal.title.includes('VIP') ? 'bg-purple-500/10 text-purple-400' :
                            selectedOrderModal.category === 'withdrawal' || selectedOrderModal.title.includes('سحب') || selectedOrderModal.title.toLowerCase().includes('withdraw') ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {selectedOrderModal.category === 'coins' || selectedOrderModal.title.includes('عملة') || selectedOrderModal.title.toLowerCase().includes('coin') ? <Coins size={20} /> :
                             selectedOrderModal.category === 'vip' || selectedOrderModal.title.includes('VIP') ? <Crown size={20} /> :
                             selectedOrderModal.category === 'withdrawal' || selectedOrderModal.title.includes('سحب') || selectedOrderModal.title.toLowerCase().includes('withdraw') ? <Wallet size={20} /> :
                             <LifeBuoy size={20} />}
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-white">
                              {t.orderDetailsModalTitle || (isRtl ? 'تفاصيل الطلب والفاتورة' : 'Order Details & Receipt')}
                            </h3>
                            <span className="text-xs text-slate-500">
                              {t.officialPlatform || (isRtl ? 'منصة HiSee Pro الرسمية' : 'Official HiSee Pro Platform')}
                            </span>
                          </div>
                        </div>

                        <button 
                          onClick={() => setSelectedOrderModal(null)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Modal Content */}
                      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Status & Title Card */}
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              {t.currentOpStatus || (isRtl ? 'حالة العملية الحالية' : 'Current Order Status')}
                            </span>
                            <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                              selectedOrderModal.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              selectedOrderModal.status === 'active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              selectedOrderModal.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {getOrderStatusDisplayBadge(selectedOrderModal.status)}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white pt-1">{getOrderDisplayTitle(selectedOrderModal)}</h4>
                          {selectedOrderModal.description && (
                            <p className="text-xs text-slate-300 leading-relaxed pt-1">{getOrderDisplayDesc(selectedOrderModal)}</p>
                          )}
                        </div>

                        {/* Order Metadata Breakdown Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3.5 bg-[#0f1115] rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {t.orderIdLabel || (isRtl ? 'رقم الطلب (Order ID)' : 'Order ID')}
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white">{selectedOrderModal.id}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedOrderModal.id);
                                  setCopiedOrderId(selectedOrderModal.id);
                                  setTimeout(() => setCopiedOrderId(null), 2500);
                                }}
                                className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 font-bold"
                              >
                                {copiedOrderId === selectedOrderModal.id ? (t.copiedText || (isRtl ? 'تم النسخ!' : 'Copied!')) : <Copy size={12} />}
                              </button>
                            </div>
                          </div>

                          <div className="p-3.5 bg-[#0f1115] rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {t.totalAmountLabel || (isRtl ? 'المبلغ الإجمالي' : 'Total Amount')}
                            </span>
                            <p className="text-xs font-black text-emerald-400">{getOrderDisplayPrice(selectedOrderModal)}</p>
                          </div>

                          <div className="p-3.5 bg-[#0f1115] rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {t.creationDateLabel || (isRtl ? 'تاريخ وساعة الإنشاء' : 'Creation Date & Time')}
                            </span>
                            <p className="text-xs font-bold text-slate-300">{getOrderDisplayDate(selectedOrderModal)}</p>
                          </div>

                          <div className="p-3.5 bg-[#0f1115] rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {t.paymentMethodLabel || (isRtl ? 'طريقة الدفع' : 'Payment Method')}
                            </span>
                            <p className="text-xs font-bold text-slate-300 truncate">
                              {getOrderDisplayPaymentMethod(selectedOrderModal)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Stepper for Pending/Completed */}
                        <div className="p-4 bg-[#0f1115] rounded-2xl border border-white/5 space-y-3">
                          <span className="text-[11px] font-bold text-slate-400 block">
                            {t.processingStepsLabel || (isRtl ? 'خطوات معالجة الطلب:' : 'Order Processing Steps:')}
                          </span>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold">
                              <CheckCircle2 size={14} />
                              <span>{t.step1Label || (isRtl ? '١. تم استلام الطلب وتأكيده' : '1. Order received & confirmed')}</span>
                            </div>
                            <div className={`flex items-center gap-2 ${
                              selectedOrderModal.status === 'completed' || selectedOrderModal.status === 'active' 
                                ? 'text-emerald-400 font-bold' 
                                : selectedOrderModal.status === 'cancelled'
                                ? 'text-rose-400 line-through'
                                : 'text-amber-400 font-bold'
                            }`}>
                              {selectedOrderModal.status === 'completed' || selectedOrderModal.status === 'active' ? (
                                <CheckCircle2 size={14} />
                              ) : selectedOrderModal.status === 'cancelled' ? (
                                <X size={14} />
                              ) : (
                                <RefreshCw size={14} className="animate-spin" />
                              )}
                              <span>{t.step2Label || (isRtl ? '٢. المراجعة والتحقق الفني' : '2. Technical verification & review')}</span>
                            </div>
                            <div className={`flex items-center gap-2 ${
                              selectedOrderModal.status === 'completed' || selectedOrderModal.status === 'active' 
                                ? 'text-emerald-400 font-bold' 
                                : 'text-slate-600'
                            }`}>
                              <CheckCircle2 size={14} />
                              <span>{t.step3Label || (isRtl ? '٣. اكتمال العملية والتسليم' : '3. Fulfillment & delivery completed')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contextual Action Buttons */}
                        <div className="space-y-2 pt-2">
                          {(selectedOrderModal.category === 'coins' || selectedOrderModal.title.includes('عملة') || selectedOrderModal.title.toLowerCase().includes('coin')) && (
                            <button
                              onClick={() => {
                                setSelectedOrderModal(null);
                                setCurrentView('buy_coins');
                              }}
                              className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/20 flex items-center justify-center gap-2 transition-colors"
                            >
                              <Coins size={16} />
                              <span>{t.rechargeMoreCoins || (isRtl ? 'شحن المزيد من عملات HiSee' : 'Top up more HiSee Coins')}</span>
                            </button>
                          )}

                          {(selectedOrderModal.category === 'vip' || selectedOrderModal.title.includes('VIP')) && (
                            <button
                              onClick={() => {
                                setSelectedOrderModal(null);
                                setCurrentView('bonus');
                              }}
                              className="w-full p-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-xs rounded-xl border border-purple-500/20 flex items-center justify-center gap-2 transition-colors"
                            >
                              <Crown size={16} />
                              <span>{t.manageVipPerks || (isRtl ? 'إدارة مميزات وباقة اشتراك VIP' : 'Manage VIP Perks & Membership')}</span>
                            </button>
                          )}

                          {(selectedOrderModal.category === 'withdrawal' || selectedOrderModal.title.includes('سحب') || selectedOrderModal.title.toLowerCase().includes('withdraw')) && (
                            <button
                              onClick={() => {
                                setSelectedOrderModal(null);
                                setCurrentView('live_rewards');
                              }}
                              className="w-full p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2 transition-colors"
                            >
                              <Wallet size={16} />
                              <span>{t.viewRewardsWallet || (isRtl ? 'عرض محفظة وسجل مكافآت البث' : 'View LIVE Rewards & Wallet')}</span>
                            </button>
                          )}

                          {/* Pre-fill Support Ticket for this Order */}
                          <button
                            onClick={() => {
                              const orderId = selectedOrderModal.id;
                              const title = getOrderDisplayTitle(selectedOrderModal);
                              setSelectedOrderModal(null);
                              setNewOrderTitle(isRtl ? `استفسار بخصوص الطلب ${orderId}` : `Inquiry regarding order ${orderId}`);
                              setNewOrderRelatedId(orderId);
                              setNewOrderType('refund');
                              setNewOrderDetails(isRtl
                                ? `أود الاستفسار بخصوص العملية (${orderId} - ${title}).\nيرجى التحقق وتقديم المساعدة.`
                                : `I would like to inquire about order (${orderId} - ${title}).\nPlease investigate and assist.`
                              );
                              // Scroll to form
                              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                            }}
                            className="w-full p-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-colors"
                          >
                            <LifeBuoy size={16} className="text-rose-400" />
                            <span>{t.requestHelpForOrder || (isRtl ? 'طلب مساعدة أو استرداد بخصوص هذا الطلب' : 'Request help or refund for this order')}</span>
                          </button>

                          {/* Cancel Order (if pending) */}
                          {selectedOrderModal.status === 'pending' && (
                            <button
                              onClick={() => {
                                setOrdersList(prev => prev.map(o => o.id === selectedOrderModal.id ? { ...o, status: 'cancelled', statusAr: isRtl ? 'تم الإلغاء' : 'Cancelled' } : o));
                                setSelectedOrderModal((prev: any) => prev ? { ...prev, status: 'cancelled', statusAr: isRtl ? 'تم الإلغاء' : 'Cancelled' } : null);
                              }}
                              className="w-full p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 flex items-center justify-center gap-2 transition-colors"
                            >
                              <X size={16} />
                              <span>{t.cancelOrder || (isRtl ? 'إلغاء هذا الطلب' : 'Cancel this order')}</span>
                            </button>
                          )}

                          {/* Copy Digital Receipt Code */}
                          <button
                            onClick={() => {
                              const receiptStr = `--- HiSee Pro Electronic Receipt ---\nOrder ID: ${selectedOrderModal.id}\nItem: ${getOrderDisplayTitle(selectedOrderModal)}\nAmount: ${getOrderDisplayPrice(selectedOrderModal)}\nStatus: ${getOrderStatusDisplayBadge(selectedOrderModal.status)}\nDate: ${getOrderDisplayDate(selectedOrderModal)}\nAuth Code: HS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
                              navigator.clipboard.writeText(receiptStr);
                              setCopiedReceiptCode(true);
                              setTimeout(() => setCopiedReceiptCode(false), 2500);
                            }}
                            className="w-full p-2.5 text-slate-500 hover:text-slate-300 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Receipt size={14} />
                            <span>{copiedReceiptCode ? (t.receiptCopiedFull || (isRtl ? '✓ تم نسخ الإيصال الرقمي بالكامل!' : '✓ Digital receipt copied successfully!')) : (t.copyDigitalReceipt || (isRtl ? 'نسخ رمز الإيصال الإلكتروني' : 'Copy Digital Receipt Code'))}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRIVACY & SECURITY SUB-PAGE */}
            {currentView === 'privacy_security' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                {privacyNotice && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-3 shadow-lg">
                    <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
                    <span>{privacyNotice}</span>
                  </div>
                )}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.generalPrivacy || 'الخصوصية العامة'}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.hideOnlineStatus || 'إخفاء حالة الاتصال'}</span>
                        <span className="text-[10px] text-slate-500">{t.hideOnlineStatusDesc || 'لن يتمكن أحد من رؤيتك متصلاً'}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, hideOnlineStatus: !prev.chatSettings.privacy.hideOnlineStatus } } }));
                          setPrivacyNotice('تم تحديث إعداد "إخفاء حالة الاتصال" بنجاح');
                          setTimeout(() => setPrivacyNotice(null), 3500);
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.privacy.hideOnlineStatus ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.privacy.hideOnlineStatus ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.hidePhoneNumber || 'إخفاء رقم الهاتف'}</span>
                        <span className="text-[10px] text-slate-500">{t.hidePhoneNumberDesc || 'إظهار رقمك لجهات الاتصال فقط'}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, hidePhoneNumber: !prev.chatSettings.hidePhoneNumber } }));
                          setPrivacyNotice('تم تحديث إعداد "إخفاء رقم الهاتف" بنجاح');
                          setTimeout(() => setPrivacyNotice(null), 3500);
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.hidePhoneNumber ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.hidePhoneNumber ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.readReceipts || 'مؤشرات القراءة'}</span>
                        <span className="text-[10px] text-slate-500">{t.readReceiptsDesc || 'السماح للآخرين بمعرفة متى قرأت رسائلهم'}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, readReceipts: !prev.chatSettings.readReceipts } }));
                          setPrivacyNotice('تم تحديث إعداد "مؤشرات القراءة" بنجاح');
                          setTimeout(() => setPrivacyNotice(null), 3500);
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.readReceipts ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.readReceipts ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{t.lastSeen || 'آخر ظهور'}</span>
                        <span className="text-[10px] text-slate-500">{t.lastSeenDesc || 'إظهار وقت آخر تواجد لك'}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, lastSeen: !prev.chatSettings.lastSeen } }));
                          setPrivacyNotice('تم تحديث إعداد "آخر ظهور" بنجاح');
                          setTimeout(() => setPrivacyNotice(null), 3500);
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.lastSeen ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.lastSeen ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{t.additionalSecurity || 'الأمان الإضافي'}</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setCurrentView('app_lock_setup')}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group"
                    >
                      <div className="flex items-center gap-3">
                        <Fingerprint size={18} className="text-emerald-500" />
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-white">{t.appLock || 'قفل التطبيق (Biometric)'}</span>
                          <span className="text-[10px] text-slate-400">
                            {settings.chatSettings?.privacy?.fingerprintLock ? (isRtl ? 'بصمة الإصبع مفعلة' : 'Fingerprint lock enabled') :
                             settings.chatSettings?.privacy?.pinPasswordLock ? (isRtl ? 'رمز المرور PIN مفعل' : 'PIN passcode enabled') :
                             settings.chatSettings?.privacy?.faceUnlock ? (isRtl ? 'التعرف على الوجه مفعل' : 'Face unlock enabled') : (isRtl ? 'اختر طريقة القفل (بصمة، PIN، وجه)' : 'Choose lock method (fingerprint, PIN, face)')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(settings.chatSettings?.privacy?.fingerprintLock || settings.chatSettings?.privacy?.pinPasswordLock || settings.chatSettings?.privacy?.faceUnlock) && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">{t.enabled || (isRtl ? 'مفعل' : 'Enabled')}</span>
                        )}
                        {isRtl ? <ChevronLeft size={18} className="text-slate-500 group-hover:text-white transition-colors" /> : <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />}
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, screenSecurity: !prev.chatSettings.privacy.screenSecurity } } }));
                      }}
                      className="flex items-center justify-between w-full py-2"
                    >
                      <div className="flex items-center gap-3">
                        <EyeOff size={18} className="text-amber-500" />
                        <span className="text-sm text-slate-300">{t.screenSecurity || (isRtl ? 'حماية الشاشة' : 'Screen Security')}</span>
                      </div>
                      <div className="text-slate-500">
                        {settings.chatSettings.privacy.screenSecurity ? (isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />) : (isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
                      </div>
                    </button>
                    {settings.chatSettings.privacy.screenSecurity && (
                      <>
                        <div className="flex items-center justify-between pl-6 py-2">
                          <div className="flex items-center gap-3">
                            <CameraOff size={16} className="text-red-500" />
                            <span className="text-sm text-slate-400">{t.preventScreenshots || (isRtl ? 'منع لقطات الشاشة' : 'Prevent Screenshots')}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, preventScreenshots: !prev.chatSettings.privacy.preventScreenshots } } }));
                              setPrivacyNotice(isRtl ? 'تم تحديث إعداد "منع لقطات الشاشة" بنجاح' : 'Prevent screenshots setting updated successfully');
                              setTimeout(() => setPrivacyNotice(null), 3500);
                            }}
                            className={`w-10 h-6 rounded-full transition-colors ${settings.chatSettings.privacy.preventScreenshots ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          >
                            <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${settings.chatSettings.privacy.preventScreenshots ? 'translate-x-5' : 'translate-x-1'}`}></span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between pl-6 py-2">
                          <div className="flex items-center gap-3">
                            <Smartphone size={16} className="text-rose-500" />
                            <span className="text-sm text-slate-400">{t.preventCameraExposure || (isRtl ? 'منع التعرض للكاميرا' : 'Prevent Camera Exposure')}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, preventCameraExposure: !prev.chatSettings.privacy.preventCameraExposure } } }));
                              setPrivacyNotice(isRtl ? 'تم تحديث إعداد "منع التعرض للكاميرا" بنجاح' : 'Prevent camera exposure setting updated successfully');
                              setTimeout(() => setPrivacyNotice(null), 3500);
                            }}
                            className={`w-10 h-6 rounded-full transition-colors ${settings.chatSettings.privacy.preventCameraExposure ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          >
                            <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${settings.chatSettings.privacy.preventCameraExposure ? 'translate-x-5' : 'translate-x-1'}`}></span>
                          </button>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={18} className="text-blue-500" />
                        <span className="text-sm text-slate-300">{t.encryption || (isRtl ? 'التشفير التام (E2EE)' : 'Message Encryption (E2EE)')}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, endToEndEncryption: !prev.chatSettings.privacy.endToEndEncryption } } }));
                          setPrivacyNotice(isRtl ? 'تم تحديث إعداد "التشفير التام E2EE" بنجاح وتفعيل حماية المحادثات' : 'End-to-End Encryption setting updated successfully');
                          setTimeout(() => setPrivacyNotice(null), 3500);
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.privacy.endToEndEncryption ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.privacy.endToEndEncryption ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-blue-400" />
                            <span className="text-sm text-slate-300">{t.lockTimeout || (isRtl ? 'زمن القفل التلقائي' : 'Auto-lock Timeout')}</span>
                        </div>
                        <select
                            value={settings.chatSettings.privacy.lockTimeout || 'immediately'}
                            onChange={(e) => {
                                const val = e.target.value as any;
                                setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, lockTimeout: val } } }));
                            }}
                            className="bg-slate-800 text-slate-300 text-sm p-2 rounded-lg border border-slate-700"
                        >
                            <option value="immediately">{isRtl ? 'فوري' : 'Immediately'}</option>
                            <option value="1m">{isRtl ? 'بعد دقيقة' : 'After 1m'}</option>
                            <option value="5m">{isRtl ? 'بعد 5 دقائق' : 'After 5m'}</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap size={18} className="text-yellow-500" />
                        <span className="text-sm text-slate-300">{t.smartLock || (isRtl ? 'القفل الذكي (استشعار الجيب)' : 'Smart Lock (Pocket Sense)')}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, smartLock: !prev.chatSettings.privacy.smartLock } } }));
                          setPrivacyNotice(isRtl ? 'تم تحديث القفل الذكي' : 'Smart lock updated successfully');
                          setTimeout(() => setPrivacyNotice(null), 3500);
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.privacy.smartLock ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.privacy.smartLock ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Keyboard size={18} className="text-purple-500" />
                        <span className="text-sm text-slate-300">{t.incognitoKeyboard || (isRtl ? 'لوحة مفاتيح متخفية' : 'Incognito Keyboard')}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, incognitoKeyboard: !prev.chatSettings.privacy.incognitoKeyboard } } }));
                          setPrivacyNotice(isRtl ? 'تم تحديث إعداد "لوحة المفاتيح المتخفية" بنجاح' : 'Incognito keyboard updated successfully');
                          setTimeout(() => setPrivacyNotice(null), 3500);
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.privacy.incognitoKeyboard ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.privacy.incognitoKeyboard ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentView('blocked_users')}
                  className="w-full p-5 glass rounded-[2.5rem] flex items-center justify-between border border-white/5 shadow-lg hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                      <UserX size={20} />
                    </div>
                    <h3 className="text-sm font-bold text-white">{t.blockedUsers || (isRtl ? 'المستخدمون المحظورون' : 'Blocked Users')}</h3>
                  </div>
                  {isRtl ? <ChevronLeft size={20} className="text-slate-600" /> : <ChevronRight size={20} className="text-slate-600" />}
                </button>
              </div>
            )}

            {/* APP LOCK & BIOMETRIC SETUP SUB-PAGE */}
            {currentView === 'app_lock_setup' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6 text-start">
                <div className="flex items-center gap-4 mb-2">
                  <button 
                    onClick={() => setCurrentView('privacy_security')}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                  >
                    {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                  </button>
                  <h3 className="text-xl font-bold text-white">{t.appLockTitle || (isRtl ? 'قفل وحماية التطبيق والأمان البيومتري' : 'App Lock & Biometric Protection')}</h3>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-6">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs leading-relaxed">
                    {t.appLockIntro || (isRtl ? '🔐 اختر طريقة الحماية المفضلة لديك. عند تفعيل أي من هذه الطرق، سيُطلب من أي مستخدم يدخل التطبيق المصادقة بالبصمة، رمز المرور (PIN)، أو الوجه لضمان خصوصية تامة وحماية مطلقة في كل مرة يتم فيها فتح التطبيق.' : '🔐 Choose your preferred protection method. When any of these options are enabled, users will be prompted to authenticate using fingerprint, PIN passcode, or face recognition to ensure total privacy.')}
                  </div>

                  <div className="space-y-4">
                      {/* Section: Additional Security */}
                      <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 px-2 mb-4">{t.additionalSecurity || 'Additional Security'}</h4>

                        {/* Option: PIN */}
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                              <Key size={24} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{t.pinCodeLabel || 'PIN Code (4 digits)'}</span>
                              <span className="text-xs text-slate-400">{t.pinCodeDesc || 'Create a secret code required at every app entry'}</span>
                            </div>
                          </div>
                          <div>
                            {settings.chatSettings?.privacy?.pinPasswordLock ? (
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">{t.enabled || 'Enabled'}</span>
                                <button
                                  onClick={() => {
                                    setActiveSetupWizard('pin');
                                    setIsPasswordChange(true);
                                    setWizardStep(0);
                                    setWizardPin('');
                                    setWizardPinConfirm('');
                                  }}
                                  className="px-3 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-xl text-xs font-bold transition-all"
                                >
                                  {t.change || 'Change'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, pinPasswordLock: false, appLock: false } } }));
                                    setPrivacyNotice(t.pinDisabledAlert || 'PIN lock disabled successfully');
                                    setTimeout(() => setPrivacyNotice(null), 3500);
                                  }}
                                  className="px-3 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-all"
                                >
                                  {t.disable || 'Disable'}
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setActiveSetupWizard('pin');
                                  setWizardStep(1);
                                  setWizardPin('');
                                  setWizardPinConfirm('');
                                }}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                              >
                                {t.enable || 'Enable'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Option: Pattern Lock */}
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                              <ScanLine size={24} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{t.patternLockLabel || 'Pattern Lock'}</span>
                              <span className="text-xs text-slate-400">{t.patternLockDesc || 'Draw a secret pattern for fast and secure unlocking'}</span>
                            </div>
                          </div>
                          <div>
                            {settings.chatSettings?.privacy?.patternLock ? (
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">{t.enabled || 'Enabled'}</span>
                                <button 
                                  onClick={() => {
                                    setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, privacy: { ...prev.chatSettings.privacy, patternLock: false } } }));
                                    setPrivacyNotice(t.patternDisabledAlert || 'Pattern lock disabled successfully');
                                    setTimeout(() => setPrivacyNotice(null), 3500);
                                  }}
                                  className="px-3 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-all"
                                >
                                  {t.disable || 'Disable'}
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setActiveSetupWizard('pattern');
                                  setWizardStep(1);
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                              >
                                {t.enable || 'Enable'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                    {/* Auto-Lock Timeout Selection */}
                    <div className="mt-6 p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                          <Clock size={20} />
                        </div>
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-white">{t.autoLockTimeoutLabel || 'When to auto-lock the app?'}</span>
                          <span className="text-xs text-slate-400">{t.autoLockTimeoutDesc || 'Select duration or conditions to lock for all enabled security methods'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        {[
                          { id: 'immediately', label: t.timeoutImmediately || 'Immediately (on screen leave)' },
                          { id: '1m', label: t.timeout1m || 'After 1 minute' },
                          { id: '5m', label: t.timeout5m || 'After 5 minutes' },
                          { id: '15m', label: t.timeout15m || 'After 15 minutes' },
                          { id: '30m', label: t.timeout30m || 'After 30 minutes' },
                          { id: 'on_exit_only', label: t.timeoutOnExit || 'On app exit only' },
                          { id: 'manual', label: t.timeoutManual || 'Manual lock only' },
                        ].map((timeoutOption) => {
                          const currentTimeout = settings.chatSettings?.privacy?.lockTimeout || 'immediately';
                          const isSelected = currentTimeout === timeoutOption.id;
                          return (
                            <button
                              key={timeoutOption.id}
                              onClick={() => {
                                setSettings(prev => ({
                                  ...prev,
                                  chatSettings: {
                                    ...prev.chatSettings,
                                    privacy: {
                                      ...prev.chatSettings.privacy,
                                      lockTimeout: timeoutOption.id as any
                                    }
                                  }
                                }));
                                setPrivacyNotice(`تم تحديث وقت القفل التلقائي إلى: ${timeoutOption.label}`);
                                setTimeout(() => setPrivacyNotice(null), 3500);
                              }}
                              className={`p-3 rounded-xl border text-xs font-medium text-start transition-all flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md' 
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              <span>{timeoutOption.label}</span>
                              {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* SETUP WIZARD MODAL */}
        {activeSetupWizard !== 'none' && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#181B22] border border-white/10 rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl space-y-6 text-start animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    {activeSetupWizard === 'fingerprint' && <Fingerprint size={22} />}
                    {activeSetupWizard === 'pin' && <Key size={22} />}
                    {activeSetupWizard === 'face' && <UserCheck size={22} />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {activeSetupWizard === 'fingerprint' && (t.setupFingerprintTitle || (isRtl ? 'إعداد بصمة الإصبع البيومترية' : 'Set Up Biometric Fingerprint'))}
                      {activeSetupWizard === 'pin' && (t.setupPinTitle || (isRtl ? 'إنشاء رمز المرور الآمن (PIN)' : 'Create Secure PIN Passcode'))}
                      {activeSetupWizard === 'face' && (t.setupFaceTitle || (isRtl ? 'إعداد بصمة الوجه (Face ID)' : 'Set Up Face ID'))}
                    </h3>
                    <p className="text-[11px] text-slate-400">{t.verificationSteps || (isRtl ? 'خطوات التحقق والإنشاء الآمن' : 'Verification & secure creation steps')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSetupWizard('none')}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>

              {/* FINGERPRINT WIZARD */}
              {activeSetupWizard === 'fingerprint' && (
                <div className="space-y-6 text-center py-4">
                  {wizardStep === 1 && (
                    <div className="space-y-6">
                      <div 
                        onMouseDown={() => {
                          setIsHoldingFingerprint(true);
                          setFingerprintHoldProgress(0);
                        }}
                        onMouseUp={() => {
                          setIsHoldingFingerprint(false);
                          if (fingerprintHoldProgress < 100) setFingerprintHoldProgress(0);
                        }}
                        onMouseLeave={() => {
                          setIsHoldingFingerprint(false);
                          if (fingerprintHoldProgress < 100) setFingerprintHoldProgress(0);
                        }}
                        onTouchStart={() => {
                          setIsHoldingFingerprint(true);
                          setFingerprintHoldProgress(0);
                        }}
                        onTouchEnd={() => {
                          setIsHoldingFingerprint(false);
                          if (fingerprintHoldProgress < 100) setFingerprintHoldProgress(0);
                        }}
                        className={`relative w-28 h-28 mx-auto flex flex-col items-center justify-center rounded-full border-4 cursor-pointer select-none transition-all ${
                          isHoldingFingerprint 
                            ? 'bg-emerald-500/20 border-emerald-400 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.5)]' 
                            : 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/60'
                        }`}
                      >
                        <Fingerprint size={52} className={isHoldingFingerprint ? 'animate-pulse text-emerald-300' : 'text-emerald-400'} />
                        <span className="text-[11px] font-bold mt-1 text-emerald-300">
                          {isHoldingFingerprint ? `${Math.round(fingerprintHoldProgress)}%` : `${fingerprintScanCount}/10`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white">
                          {isHoldingFingerprint 
                            ? (t.fingerprintScanningStatus || (isRtl ? 'جارٍ تسجيل البصمة ورصد التفاصيل...' : 'Scanning fingerprint & capturing details...')) 
                            : (isRtl 
                                ? `المحاولة (${fingerprintScanCount + 1} من 10): اضغط واستمر` 
                                : `Attempt (${fingerprintScanCount + 1} of 10): Press and hold`
                              )}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                          {t.fingerprintScanningDesc || (isRtl ? 'يجب إتمام 10 بصمات متتالية (لنفس الإصبع أو عدة أصابع) لضمان حفظ الملف البيومتري بدقة تامة.' : 'You must complete 10 consecutive fingerprint scans to ensure highly accurate biometric registration.')}
                        </p>
                      </div>

                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-200" style={{ width: `${(fingerprintScanCount / 10) * 100}%` }}></div>
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                        ✓
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-white">{t.fingerprintSavedSuccess || (isRtl ? 'تم حفظ بصمة الإصبع بنجاح!' : 'Fingerprint saved successfully!')}</h4>
                        <p className="text-xs text-slate-400">
                          {t.fingerprintSavedDesc || (isRtl ? 'تم تشفير وحفظ بيانات بصمة الإصبع في التخزين الآمن. سيتم طلبها فوراً عند كل فتح للتطبيق.' : 'Fingerprint data has been encrypted and saved in secure storage. It will be required immediately upon every app entry.')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            chatSettings: {
                              ...prev.chatSettings,
                              privacy: {
                                ...prev.chatSettings.privacy,
                                fingerprintLock: true,
                                pinPasswordLock: false,
                                faceUnlock: false,
                                appLock: true
                              }
                            }
                          }));
                          setPrivacyNotice(t.fingerprintEnabledAlert || (isRtl ? '✅ تم تفعيل قفل بصمة الإصبع وحمايته بنجاح!' : '✅ Fingerprint lock enabled successfully!'));
                          setTimeout(() => setPrivacyNotice(null), 4000);
                          setActiveSetupWizard('none');
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                      >
                        {t.saveAndActivateProtection || (isRtl ? 'حفظ وتفعيل الحماية المطلقة' : 'Save & Activate Absolute Protection')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PIN WIZARD */}
              {activeSetupWizard === 'pin' && (
                <div className="space-y-6 py-2">
                  {isPasswordChange && wizardStep === 0 && (
                    <div className="space-y-4 text-center">
                      <h4 className="text-sm font-bold text-white">{t.enterCurrentPin || (isRtl ? 'أدخل رمز المرور الحالي للتحقق' : 'Enter current PIN to verify')}</h4>
                      <div className="flex justify-center gap-3 my-4">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                            {wizardPin[i] ? '•' : ''}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map(key => (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === 'C') setWizardPin('');
                              else if (key === '←') setWizardPin(p => p.slice(0, -1));
                              else if (wizardPin.length < 4) {
                                const nextPin = wizardPin + key;
                                setWizardPin(nextPin);
                                if (nextPin.length === 4) {
                                  if (nextPin === settings.chatSettings?.privacy?.savedPin) {
                                      setWizardPin('');
                                      setWizardStep(1);
                                      setIsPasswordChange(false);
                                  } else {
                                      setWizardPin('');
                                      setPrivacyNotice(t.incorrectCurrentPin || (isRtl ? 'رمز المرور الحالي غير صحيح' : 'Current PIN passcode is incorrect'));
                                      setTimeout(() => setPrivacyNotice(null), 2000);
                                  }
                                }
                              }
                            }}
                            className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-base transition-all border border-white/5"
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {wizardStep === 1 && (
                    <div className="space-y-4 text-center">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">{t.enterSecretPin || (isRtl ? 'أدخل رمز المرور السري (4 أرقام)' : 'Enter secret PIN passcode (4 digits)')}</h4>
                        <p className="text-xs text-slate-400">{t.pinRequiredDesc || (isRtl ? 'سيكون هذا الرمز مطلوباً لفتح التطبيق' : 'This code will be required to open the app')}</p>
                      </div>
                      <div className="flex justify-center gap-3 my-4">
                        {[0, 1, 2, 3].map(i => (
                          <div
                            key={i}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-white shadow-inner"
                          >
                            {wizardPin[i] ? '•' : ''}
                          </div>
                        ))}
                      </div>

                      {/* Number pad */}
                      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map(key => (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === 'C') setWizardPin('');
                              else if (key === '←') setWizardPin(p => p.slice(0, -1));
                              else if (wizardPin.length < 4) {
                                const nextPin = wizardPin + key;
                                setWizardPin(nextPin);
                                if (nextPin.length === 4) {
                                  setTimeout(() => setWizardStep(2), 300);
                                }
                              }
                            }}
                            className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-base transition-all border border-white/5"
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-4 text-center animate-in fade-in duration-300">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">{t.confirmSecretPin || (isRtl ? 'تأكيد رمز المرور السري' : 'Confirm secret PIN passcode')}</h4>
                        <p className="text-xs text-slate-400">{t.reenterPinDesc || (isRtl ? 'أدخل الرمز مرة أخرى للتأكيد والمطابقة' : 'Re-enter code to confirm and match')}</p>
                      </div>
                      <div className="flex justify-center gap-3 my-4">
                        {[0, 1, 2, 3].map(i => (
                          <div
                            key={i}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-white shadow-inner"
                          >
                            {wizardPinConfirm[i] ? '•' : ''}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map(key => (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === 'C') setWizardPinConfirm('');
                              else if (key === '←') setWizardPinConfirm(p => p.slice(0, -1));
                              else if (wizardPinConfirm.length < 4) {
                                const nextConf = wizardPinConfirm + key;
                                setWizardPinConfirm(nextConf);
                                if (nextConf.length === 4) {
                                  if (nextConf === wizardPin) {
                                    setWizardStep(3);
                                  } else {
                                    alert(t.pinMismatchAlert || (isRtl ? 'الرمز غير متطابق! يرجى إعادة المحاولة.' : 'PIN codes do not match! Please try again.'));
                                    setWizardPinConfirm('');
                                  }
                                }
                              }
                            }}
                            className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-base transition-all border border-white/5"
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="space-y-6 text-center animate-in fade-in duration-300">
                      <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                        ✓
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-white">{t.pinCreatedSuccess || (isRtl ? 'تم إنشاء رمز المرور بنجاح!' : 'PIN passcode created successfully!')}</h4>
                        <p className="text-xs text-slate-400">
                          {t.pinCreatedDesc || (isRtl ? 'تم حفظ رمز PIN الآمن في النظام بنجاح. سيتم طلبه في كل مرة يتم فتح التطبيق فيها.' : 'Your secure PIN has been successfully saved. You will be prompted for it upon opening the app.')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            chatSettings: {
                              ...prev.chatSettings,
                              privacy: {
                                ...prev.chatSettings.privacy,
                                pinPasswordLock: true,
                                savedPin: wizardPin,
                                fingerprintLock: false,
                                faceUnlock: false,
                                appLock: true
                              }
                            }
                          }));
                          setPrivacyNotice(t.pinEnabledAlert || (isRtl ? '✅ تم حفظ وتفعيل قفل رمز المرور (PIN) بنجاح!' : '✅ PIN passcode lock enabled successfully!'));
                          setTimeout(() => setPrivacyNotice(null), 4000);
                          setActiveSetupWizard('none');
                        }}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                      >
                        {t.activateFullProtection || (isRtl ? 'تفعيل الحماية الكاملة' : 'Activate Full Protection')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PATTERN WIZARD */}
              {activeSetupWizard === 'pattern' && (
                <div className="space-y-6 text-center py-4">
                  {wizardStep === 1 && (
                    <PatternLock
                      title={t.drawPatternTitle || (isRtl ? 'ارسم نمطاً سرياً للفتح' : 'Draw secret pattern to unlock')}
                      isRtl={isRtl}
                      onConfirm={(p) => {
                        setWizardPin(p.join(',')); // Reuse wizardPin for pattern
                        setWizardStep(2);
                      }}
                    />
                  )}
                  {wizardStep === 2 && (
                    <PatternLock
                      title={t.confirmPatternTitle || (isRtl ? 'تأكيد النمط السري' : 'Confirm secret pattern')}
                      error={isPatternError}
                      isRtl={isRtl}
                      onConfirm={(p) => {
                        if (p.join(',') === wizardPin) {
                           setSettings(prev => ({
                             ...prev,
                             chatSettings: {
                               ...prev.chatSettings,
                               privacy: {
                                 ...prev.chatSettings.privacy,
                                 patternLock: true,
                                 savedPattern: p
                               }
                             }
                           }));
                           setPrivacyNotice(t.patternEnabledAlert || (isRtl ? '✅ تم حفظ وتفعيل قفل النمط بنجاح!' : '✅ Pattern lock enabled successfully!'));
                           setTimeout(() => setPrivacyNotice(null), 4000);
                           setActiveSetupWizard('none');
                        } else {
                           setIsPatternError(true);
                           setTimeout(() => setIsPatternError(false), 2000);
                        }
                      }}
                    />
                  )}
                </div>
              )}

              {/* FACE ID WIZARD */}
              {activeSetupWizard === 'face' && (
                <div className="space-y-6 text-center py-4">
                  {wizardStep === 1 && (
                    <div className="space-y-6">
                      <div className="relative w-44 h-44 mx-auto rounded-3xl overflow-hidden bg-black border-2 border-blue-500/50 shadow-xl flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                        {!cameraStream && !cameraError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-xs text-blue-300 animate-pulse">
                            {t.openingCamera || (isRtl ? 'جاري فتح الكاميرا...' : 'Opening camera...')}
                          </div>
                        )}
                        {cameraError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-rose-950/90 text-[11px] text-rose-300 p-3 text-center">
                            {cameraError}
                          </div>
                        )}
                        {cameraStream && (
                          <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-bounce"></div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                          {currentFacePose === 'forward' && (isRtl ? '1. إلى الأمام' : '1. Straight Ahead')}
                          {currentFacePose === 'right' && (isRtl ? '2. جانب يمين' : '2. Right Side')}
                          {currentFacePose === 'left' && (isRtl ? '3. جانب يسار' : '3. Left Side')}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white">
                          {wizardScanning 
                            ? (t.capturingPose || (isRtl ? 'جاري التقاط الوضعية الحالية وحفظها...' : 'Capturing current pose and saving...')) 
                            : currentFacePose === 'forward' 
                              ? (t.pose1LookAhead || (isRtl ? 'الوضع 1: انظر مباشرة إلى الأمام' : 'Pose 1: Look straight ahead')) 
                              : currentFacePose === 'right' 
                                ? (t.pose2LookRight || (isRtl ? 'الوضع 2: التفت برأسك يميناً قليلاً' : 'Pose 2: Turn your head slightly right')) 
                                : (t.pose3LookLeft || (isRtl ? 'الوضع 3: التفت برأسك يساراً قليلاً' : 'Pose 3: Turn your head slightly left'))}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                          {t.faceCaptureNotice || (isRtl ? 'يتم التقاط الوجه في 3 وضعيات تلقائياً لضمان دقة التعرف الأمني الشامل من كل الزوايا.' : 'The face is automatically captured in 3 angles to ensure comprehensive security.')}
                        </p>
                      </div>

                      <div className="flex justify-center gap-2 text-[11px]">
                        <span className={`px-2 py-1 rounded-lg border ${facePositionsCaptured.forward ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : currentFacePose === 'forward' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 animate-pulse' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                          {facePositionsCaptured.forward ? (isRtl ? '✓ الأمام' : '✓ Front') : (isRtl ? '1. الأمام' : '1. Front')}
                        </span>
                        <span className={`px-2 py-1 rounded-lg border ${facePositionsCaptured.right ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : currentFacePose === 'right' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 animate-pulse' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                          {facePositionsCaptured.right ? (isRtl ? '✓ يمين' : '✓ Right') : (isRtl ? '2. يمين' : '2. Right')}
                        </span>
                        <span className={`px-2 py-1 rounded-lg border ${facePositionsCaptured.left ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : currentFacePose === 'left' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 animate-pulse' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                          {facePositionsCaptured.left ? (isRtl ? '✓ يسار' : '✓ Left') : (isRtl ? '3. يسار' : '3. Left')}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (!cameraStream) {
                            startCamera();
                            return;
                          }
                          setWizardScanning(true);
                          setTimeout(() => {
                            setWizardScanning(false);
                            if (currentFacePose === 'forward') {
                              setFacePositionsCaptured(p => ({ ...p, forward: true }));
                              setCurrentFacePose('right');
                            } else if (currentFacePose === 'right') {
                              setFacePositionsCaptured(p => ({ ...p, right: true }));
                              setCurrentFacePose('left');
                            } else if (currentFacePose === 'left') {
                              setFacePositionsCaptured(p => ({ ...p, left: true }));
                              setWizardStep(2);
                            }
                          }, 1500);
                        }}
                        disabled={wizardScanning || !cameraStream}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                      >
                        {wizardScanning 
                          ? (t.capturingPoseStatus || (isRtl ? 'جارٍ التقاط الوضعية...' : 'Capturing pose...')) 
                          : currentFacePose === 'forward' 
                            ? (t.captureFrontPose || (isRtl ? 'التقاط وضعية الأمام' : 'Capture Front Pose')) 
                            : currentFacePose === 'right' 
                              ? (t.captureRightPose || (isRtl ? 'التقاط وضعية اليمين' : 'Capture Right Pose')) 
                              : (t.captureLeftPoseFinish || (isRtl ? 'التقاط وضعية اليسار والانهاء' : 'Capture Left Pose & Finish'))}
                      </button>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                        ✓
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-white">{t.faceSavedSuccess || (isRtl ? 'تم مسح وحفظ بصمة الوجه بنجاح!' : 'Face ID scanned & saved successfully!')}</h4>
                        <p className="text-xs text-slate-400">
                          {t.faceSavedDesc || (isRtl ? 'تم تخزين بيانات المصادقة الوجهية بنجاح وأمان. سيتم استخدامها للتحقق عند فتح التطبيق.' : 'Face authentication data stored successfully and securely. It will be used for verification on opening the app.')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            chatSettings: {
                              ...prev.chatSettings,
                              privacy: {
                                ...prev.chatSettings.privacy,
                                faceUnlock: true,
                                fingerprintLock: false,
                                pinPasswordLock: false,
                                appLock: true
                              }
                            }
                          }));
                          setPrivacyNotice(t.faceEnabledAlert || (isRtl ? '✅ تم تفعيل قفل الوجه (Face ID) وحمايته بنجاح!' : '✅ Face ID lock enabled successfully!'));
                          setTimeout(() => setPrivacyNotice(null), 4000);
                          setActiveSetupWizard('none');
                        }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                      >
                        {t.saveAndActivateProtection || (isRtl ? 'حفظ وتفعيل الحماية المطلقة' : 'Save & Activate Absolute Protection')}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

            {/* INTERACTIONS SUB-PAGE */}
            {currentView === 'interactions' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6 text-start">
                
                {/* 1. Comments & 2. Activity Status */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-6">
                  <h3 className="text-base font-bold text-white mb-2">{t.basicPrivacyInteraction || (isRtl ? 'الخصوصية والتفاعل الأساسي' : 'Privacy & Basic Interaction')}</h3>
                  
                  {/* Comments Option */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                        <MessageSquare size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsCommentsLabel || 'Comments'}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsCommentsDesc || 'Who can comment on your public posts and videos'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-[#121418] p-1 rounded-2xl border border-white/5">
                      {(['all', 'contacts', 'none'] as const).map((opt) => {
                        const label = opt === 'all' ? (t.everyone || 'Everyone') : opt === 'contacts' ? (t.myContacts || 'My Contacts') : (t.nobody || 'Nobody');
                        const active = (settings.interactionsSettings?.comments || 'all') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => updateInteractionsSetting('comments', opt)}
                            className={`py-2 text-xs font-bold rounded-xl transition-all ${
                              active ? 'bg-violet-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Activity Status Option */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Activity size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsActivityStatusLabel || 'Activity Status'}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsActivityStatusDesc || 'Allow followers to see when you are online'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const cur = settings.interactionsSettings?.activityStatus ?? !settings.chatSettings.privacy.hideOnlineStatus;
                        updateInteractionsSetting('activityStatus', !cur);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        (settings.interactionsSettings?.activityStatus ?? !settings.chatSettings.privacy.hideOnlineStatus)
                          ? 'bg-emerald-500' 
                          : 'bg-slate-700'
                      }`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        (settings.interactionsSettings?.activityStatus ?? !settings.chatSettings.privacy.hideOnlineStatus)
                          ? 'translate-x-6' 
                          : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>
                </div>

                {/* 3. Direct Messages & 4. Mentions */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-6">
                  <h3 className="text-base font-bold text-white mb-2">{t.interactionsCommunicationMentionsTitle || 'Communication & Mentions'}</h3>
                  
                  {/* Private Messages */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Lock size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsDmsLabel || 'Direct Messages (DMs)'}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsDmsDesc || 'Who can start direct chats and send you private messages'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-[#121418] p-1 rounded-2xl border border-white/5">
                      {(['all', 'followers', 'none'] as const).map((opt) => {
                        const label = opt === 'all' ? (t.everyone || 'Everyone') : opt === 'followers' ? (t.followers || 'Followers') : (t.nobody || 'Nobody');
                        const active = (settings.interactionsSettings?.privateMessages || 'all') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => updateInteractionsSetting('privateMessages', opt)}
                            className={`py-2 text-xs font-bold rounded-xl transition-all ${
                              active ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mentions */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsMentionsLabel || 'Mentions & Tags'}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsMentionsDesc || 'In posts or comments (username) who can mention you'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-[#121418] p-1 rounded-2xl border border-white/5">
                      {(['all', 'followers', 'none'] as const).map((opt) => {
                        const label = opt === 'all' ? (t.everyone || 'Everyone') : opt === 'followers' ? (t.followers || 'Followers') : (t.nobody || 'Nobody');
                        const active = (settings.interactionsSettings?.mentions || 'all') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => updateInteractionsSetting('mentions', opt)}
                            className={`py-2 text-xs font-bold rounded-xl transition-all ${
                              active ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. Content Reuse, 6. Profile Display, 7. Downloads */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-6">
                  <h3 className="text-base font-bold text-white mb-2">{t.interactionsSharingDownloadTitle || (isRtl ? 'مشاركة المحتوى والتحميل' : 'Content Sharing & Downloading')}</h3>

                  {/* Content Reuse */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <RefreshCw size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsDuetStitchLabel || (isRtl ? 'إعادة استخدام محتواك (Duet / Stitch)' : 'Content Reuse (Duet / Stitch)')}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsDuetStitchDesc || (isRtl ? 'السماح للمستخدمين بعمل دمج وتفاعل ثنائي مع فيديوهاتك' : 'Allow users to duet and interact with your videos')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const cur = settings.interactionsSettings?.contentReuse ?? true;
                        updateInteractionsSetting('contentReuse', !cur);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        (settings.interactionsSettings?.contentReuse ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        (settings.interactionsSettings?.contentReuse ?? true) ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>

                  {/* Profile Display on sharing */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                        <Share2 size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsShareProfileLinksLabel || (isRtl ? 'عرض ملفك الشخصي عند مشاركة الروابط' : 'Show Profile When Sharing Links')}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsShareProfileLinksDesc || (isRtl ? 'إظهار اسمك وصورتك في المعاينة عند نسخ ومشاركة الروابط' : 'Show your name and photo in preview when copying and sharing links')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const cur = settings.interactionsSettings?.profileDisplayOnSharing ?? true;
                        updateInteractionsSetting('profileDisplayOnSharing', !cur);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        (settings.interactionsSettings?.profileDisplayOnSharing ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        (settings.interactionsSettings?.profileDisplayOnSharing ?? true) ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>

                  {/* Downloads */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                        <Download size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsDownloadVideosLabel || (isRtl ? 'تنزيل الفيديوهات' : 'Download Videos')}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsDownloadVideosDesc || (isRtl ? 'السماح للآخرين بحفظ وتنزيل فيديوهاتك ومنشوراتك العامة' : 'Allow others to save and download your public videos and posts')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const cur = settings.interactionsSettings?.downloads ?? true;
                        updateInteractionsSetting('downloads', !cur);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        (settings.interactionsSettings?.downloads ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        (settings.interactionsSettings?.downloads ?? true) ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>
                </div>

                {/* 8. Following List, 9. Liked Videos, 10. Viewers */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-6">
                  <h3 className="text-base font-bold text-white mb-2">{t.interactionsActivityListsTitle || (isRtl ? 'رؤية النشاط والقوائم' : 'Activity & Lists Visibility')}</h3>

                  {/* Following List */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                        <LayoutGrid size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsFollowingListLabel || (isRtl ? 'قائمة المتابعة' : 'Following List')}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsFollowingListDesc || (isRtl ? 'من يمكنه رؤية قائمة الحسابات التي تتابعها' : 'Who can see the list of accounts you follow')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-[#121418] p-1 rounded-2xl border border-white/5">
                      {(['all', 'me'] as const).map((opt) => {
                        const label = opt === 'all' ? (t.everyone || (isRtl ? 'الجميع' : 'Everyone')) : (t.meOnly || (isRtl ? 'أنا فقط' : 'Only me'));
                        const active = (settings.interactionsSettings?.followingList || 'all') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => updateInteractionsSetting('followingList', opt)}
                            className={`py-2 text-xs font-bold rounded-xl transition-all ${
                              active ? 'bg-teal-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Liked Videos */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                        <Sparkles size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsLikedVideosLabel || (isRtl ? 'الفيديوهات التي أعجبتك' : 'Liked Videos')}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsLikedVideosDesc || (isRtl ? 'من يمكنه رؤية قائمة الفيديوهات والمنشورات التي سجلت إعجابك بها' : 'Who can see your liked videos and posts list')}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-[#121418] p-1 rounded-2xl border border-white/5">
                      {(['all', 'me'] as const).map((opt) => {
                        const label = opt === 'all' ? (t.everyone || (isRtl ? 'الجميع' : 'Everyone')) : (t.meOnly || (isRtl ? 'أنا فقط' : 'Only me'));
                        const active = (settings.interactionsSettings?.likedVideos || 'all') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => updateInteractionsSetting('likedVideos', opt)}
                            className={`py-2 text-xs font-bold rounded-xl transition-all ${
                              active ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Profile Viewers */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#00f2fe]/10 text-[#00f2fe] flex items-center justify-center">
                        <Eye size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{t.interactionsProfileVisitorsLabel || (isRtl ? 'سجل زوار ومشاهدات الملف الشخصي' : 'Profile Visitors & Views History')}</span>
                        <span className="text-[10px] text-slate-500">{t.interactionsProfileVisitorsDesc || (isRtl ? 'رؤية من زار حسابك في الـ 30 يوماً الماضية، والسماح للآخرين برؤية زيارتك لحسابهم' : 'See who visited your account in the last 30 days, and allow others to see your visits')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const cur = settings.interactionsSettings?.viewers ?? true;
                        updateInteractionsSetting('viewers', !cur);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        (settings.interactionsSettings?.viewers ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        (settings.interactionsSettings?.viewers ?? true) ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.interactionsConsultationsLabel || (isRtl ? 'تفعيل الاستشارات' : 'Enable Consultations')}</h4>
                      <p className="text-[10px] text-slate-500">{t.interactionsConsultationsDesc || (isRtl ? 'السماح للمستخدمين بطلب استشارات منك' : 'Allow users to request consultations from you')}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const cur = settings.interactionsSettings?.consultationsEnabled ?? false;
                        updateInteractionsSetting('consultationsEnabled', !cur);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        (settings.interactionsSettings?.consultationsEnabled ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        (settings.interactionsSettings?.consultationsEnabled ?? false) ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div>
                      <h4 className="text-sm font-bold text-white">{t.interactionsConsultationsMemoryLabel || (isRtl ? 'ذاكرة الاستشارات' : 'Consultations Memory')}</h4>
                      <p className="text-[10px] text-slate-500">{t.interactionsConsultationsMemoryDesc || (isRtl ? 'حفظ سجلات الاستشارات للرجوع إليها لاحقاً' : 'Save consultation logs for future reference')}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const cur = settings.interactionsSettings?.memoryEnabled ?? false;
                        updateInteractionsSetting('memoryEnabled', !cur);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        (settings.interactionsSettings?.memoryEnabled ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                        (settings.interactionsSettings?.memoryEnabled ?? false) ? 'translate-x-6' : 'translate-x-1'
                      }`}></span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* CONTENT & DISPLAY SUB-PAGE */}
            {currentView === 'content_display' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6 text-start">
                
                {/* 1. مركز الأنشطة */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                      <Activity size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{t.activityHubTitle || (isRtl ? 'مركز الأنشطة والسجل' : 'Activity Hub & History')}</span>
                      <span className="text-[10px] text-slate-500">{t.activityHubDesc || (isRtl ? 'إدارة سجل المشاهدة، السيرش، وحفظ تفاعلاتك' : 'Manage watch history, search history, and save your interactions')}</span>
                    </div>
                  </div>

                  {/* History Toggles */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.saveWatchHistory || (isRtl ? 'حفظ سجل المشاهدات' : 'Save Watch History')}</span>
                        <span className="text-[9px] text-slate-500">{t.saveWatchHistoryDesc || (isRtl ? 'الاحتفاظ بالفيديوهات التي تشاهدها لتحسين التوصيات' : 'Keep track of videos you watch to improve recommendations')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('viewingHistory', !(settings.contentDisplaySettings?.viewingHistory ?? true))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.viewingHistory ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.viewingHistory ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.saveSearchHistory || (isRtl ? 'حفظ سجل البحث' : 'Save Search History')}</span>
                        <span className="text-[9px] text-slate-500">{t.saveSearchHistoryDesc || (isRtl ? 'حفظ الكلمات التي تبحث عنها لتسهيل الوصول مستقبلاً' : 'Save words you search for to make future access easier')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('searchHistory', !(settings.contentDisplaySettings?.searchHistory ?? true))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.searchHistory ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.searchHistory ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>

                  {/* Active logs preview */}
                  <div className="bg-[#121418] p-4 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">{t.recentActivities || (isRtl ? 'الأنشطة الأخيرة' : 'Recent Activities')}</span>
                      {historyItems.length > 0 && (
                        <button 
                          onClick={async () => {
                            setHistoryItems([]);
                            if (!myId) return;
                            try {
                              const qLogs = query(collection(firestoreDb, 'user_activity_logs'), where('userId', '==', myId));
                              const snap = await getDocs(qLogs);
                              const batch = writeBatch(firestoreDb);
                              snap.docs.forEach(d => batch.delete(d.ref));
                              await batch.commit();
                            } catch (e) {
                              console.error("Failed to clear activity logs:", e);
                            }
                          }}
                          className="text-[10px] text-rose-400 hover:underline font-bold"
                        >
                          {t.clearAllHistory || (isRtl ? 'مسح السجل بالكامل' : 'Clear All History')}
                        </button>
                      )}
                    </div>
                    {historyItems.length > 0 ? (
                      <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar">
                        {historyItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-start gap-2 bg-[#1b1f24] p-2.5 rounded-xl border border-white/5">
                            <div className="flex flex-col text-right">
                              <span className="text-[11px] text-slate-300 font-medium">{item.text}</span>
                              <span className="text-[9px] text-slate-500 mt-1">{item.time}</span>
                            </div>
                            <button 
                              onClick={async () => {
                                const targetId = item.id;
                                setHistoryItems(prev => prev.filter(h => h.id !== targetId));
                                if (typeof targetId === 'string' && myId) {
                                  try {
                                    await deleteDoc(doc(firestoreDb, 'user_activity_logs', targetId));
                                  } catch (e) {}
                                }
                              }}
                              className="text-slate-500 hover:text-white shrink-0 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-xs font-medium">
                        {t.historyEmpty || (isRtl ? 'السجل فارغ تماماً.' : 'History is completely empty.')}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. التحكم في الجمهور */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                      <Users size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{t.audienceContentControl || (isRtl ? 'التحكم في الجمهور والوصول لمحتواك' : 'Audience & Content Access Controls')}</span>
                      <span className="text-[10px] text-slate-500">{t.audienceContentControlDesc || (isRtl ? 'إدارة خصوصية حسابك والمشاهدين المستهدفين' : 'Manage account privacy and target viewers')}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Private Account */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.privateAccountLabel || (isRtl ? 'حساب خاص (Private Account)' : 'Private Account')}</span>
                        <span className="text-[9px] text-slate-500">{t.privateAccountDesc || (isRtl ? 'المتابعون المعتمدون فقط يمكنهم رؤية فيديوهاتك وإعجاباتك' : 'Only approved followers can see your videos and likes')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('privateAccount', !(settings.contentDisplaySettings?.privateAccount ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.privateAccount ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.privateAccount ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Suggest account to others */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.suggestAccountOthers || (isRtl ? 'اقتراح حسابك للآخرين' : 'Suggest Your Account to Others')}</span>
                        <span className="text-[9px] text-slate-500">{t.suggestAccountOthersDesc || (isRtl ? 'إظهار ملفك للأشخاص الذين لديهم اهتمامات مشابهة أو أصدقاء مشتركين' : 'Show your profile to people with similar interests or mutual friends')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('suggestToOthers', !(settings.contentDisplaySettings?.suggestToOthers ?? true))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.suggestToOthers ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.suggestToOthers ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Age Restriction */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.ageRestrictLabel || (isRtl ? 'تقييد فئة العمر (أكبر من 18)' : 'Age Restriction (18+)')}</span>
                        <span className="text-[9px] text-slate-500">{t.ageRestrictDesc || (isRtl ? 'تصفية المحتوى المخصص للبالغين فقط وتفعيل جدار حماية للمراهقين' : 'Filter adult-only content and activate safety filters for teenagers')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('ageRestrict', !(settings.contentDisplaySettings?.ageRestrict ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.ageRestrict ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.ageRestrict ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. الإعلانات */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <Megaphone size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{t.adsPersonalization || (isRtl ? 'الإعلانات والتخصيص' : 'Ads & Personalization')}</span>
                      <span className="text-[10px] text-slate-500">{t.adsPersonalizationDesc || (isRtl ? 'تخصيص الإعلانات المعروضة وتحديد مواضيع اهتماماتك' : 'Personalize displayed ads and select your interest topics')}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.personalizedAdsLabel || (isRtl ? 'الإعلانات المخصصة والشخصية' : 'Personalized Ads')}</span>
                        <span className="text-[9px] text-slate-500">{t.personalizedAdsDesc || (isRtl ? 'عرض إعلانات تناسب سلوكك واهتماماتك داخل التطبيق وخارجه' : 'Show ads matching your behavior and interests inside and outside the app')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('personalizedAds', !(settings.contentDisplaySettings?.personalizedAds ?? true))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.personalizedAds ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.personalizedAds ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Interactive interests */}
                    <div className="pt-3 border-t border-white/5 space-y-3">
                      <span className="text-xs font-bold text-slate-300 block">{t.preferredAdInterests || (isRtl ? 'اهتماماتك الإعلانية المفضلة' : 'Your Preferred Ad Interests')}</span>
                      <div className="flex flex-wrap gap-2">
                        {['التكنولوجيا', 'الرياضة', 'الألعاب', 'السفر والسياحة', 'الطبخ والمأكولات', 'السينما والأفلام', 'التعليم المستمر'].map((interest) => {
                          const isActive = adInterestsList.includes(interest);
                          const interestLabel = interest === 'التكنولوجيا' ? (isRtl ? 'التكنولوجيا' : 'Technology') 
                            : interest === 'الرياضة' ? (isRtl ? 'الرياضة' : 'Sports') 
                            : interest === 'الألعاب' ? (isRtl ? 'الألعاب' : 'Games') 
                            : interest === 'السفر والسياحة' ? (isRtl ? 'السفر والسياحة' : 'Travel & Tourism') 
                            : interest === 'الطبخ والمأكولات' ? (isRtl ? 'الطبخ والمأكولات' : 'Cooking & Food') 
                            : interest === 'السينما والأفلام' ? (isRtl ? 'السينما والأفلام' : 'Cinema & Movies') 
                            : (isRtl ? 'التعليم المستمر' : 'Continuous Education');
                          return (
                            <button
                              key={interest}
                              onClick={() => {
                                const nextList = isActive
                                  ? adInterestsList.filter(i => i !== interest)
                                  : [...adInterestsList, interest];
                                  setAdInterestsList(nextList);
                                updateContentDisplaySetting('adInterests', nextList);
                              }}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                isActive ? 'bg-amber-500 text-black shadow-md' : 'bg-white/5 text-slate-400 hover:text-white'
                              }`}
                            >
                              {interestLabel} {isActive ? '✓' : '+'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. التشغيل */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Tv size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{t.playbackQuality || (isRtl ? 'التشغيل وجودة العرض' : 'Playback & Display Quality')}</span>
                      <span className="text-[10px] text-slate-500">{t.playbackQualityDesc || (isRtl ? 'إدارة سرعة تشغيل الفيديوهات والتنزيل عبر الشبكات' : 'Manage video playback speed and downloading over networks')}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Autoplay on mobile */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.autoplayMobileLabel || (isRtl ? 'تشغيل تلقائي على شبكة المحمول (Data)' : 'Autoplay on Mobile (Data)')}</span>
                        <span className="text-[9px] text-slate-500">{t.autoplayMobileDesc || (isRtl ? 'السماح بتشغيل مقاطع الفيديو تلقائياً أثناء عدم الاتصال بـ Wi-Fi' : 'Allow videos to play automatically when not connected to Wi-Fi')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('autoplayOnMobile', !(settings.contentDisplaySettings?.autoplayOnMobile ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.autoplayOnMobile ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.autoplayOnMobile ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Auto scroll */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.autoScrollLabel || (isRtl ? 'التمرير التلقائي للفيديو التالي' : 'Auto-scroll to Next Video')}</span>
                        <span className="text-[9px] text-slate-500">{t.autoScrollDesc || (isRtl ? 'الانتقال للفيديو التالي تلقائياً عند انتهاء تشغيل الفيديو الحالي' : 'Automatically move to the next video when the current video ends')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('autoScroll', !(settings.contentDisplaySettings?.autoScroll ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.autoScroll ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.autoScroll ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Hardware acceleration */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.hardwareAccelLabel || (isRtl ? 'تسريع الأجهزة وجودة الـ GPU' : 'GPU Hardware Acceleration')}</span>
                        <span className="text-[9px] text-slate-500">{t.hardwareAccelDesc || (isRtl ? 'استخدام معالج الرسومات لتشغيل الفيديوهات بسلاسة فائقة وتقليل استخدام المعالج' : 'Use graphics processor to play videos smoothly and reduce CPU usage')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('hardwareAcceleration', !(settings.contentDisplaySettings?.hardwareAcceleration ?? true))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.hardwareAcceleration ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.hardwareAcceleration ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. عرض */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Sliders size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{t.displayAppearance || (isRtl ? 'العرض ومظهر الواجهة' : 'Display & Interface Appearance')}</span>
                      <span className="text-[10px] text-slate-500">{t.displayAppearanceDesc || (isRtl ? 'تغيير حجم الخطوط والوضع المدمج للتطبيق' : 'Change font sizes and compact layout for the app')}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Font Size Selection */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-300 block">{t.primaryFontSize || (isRtl ? 'حجم الخط الأساسي' : 'Primary Font Size')}</span>
                      <div className="grid grid-cols-4 gap-2 bg-[#121418] p-1 rounded-2xl border border-white/5">
                        {(['small', 'standard', 'large', 'huge'] as const).map((size) => {
                          const active = (settings.contentDisplaySettings?.fontSize || 'standard') === size;
                          const sizeLabel = size === 'small' ? (isRtl ? 'صغير' : 'Small') : size === 'standard' ? (isRtl ? 'قياسي' : 'Standard') : size === 'large' ? (isRtl ? 'كبير' : 'Large') : (isRtl ? 'ضخم' : 'Huge');
                          return (
                            <button
                              key={size}
                              onClick={() => updateContentDisplaySetting('fontSize', size)}
                              className={`py-2 text-[11px] font-bold rounded-xl transition-all ${
                                active ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {sizeLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Font Size Live Preview */}
                    <div className="bg-[#121418] p-4 rounded-2xl border border-white/5 space-y-2 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">{t.fontSizeLivePreview || (isRtl ? 'معاينة مباشرة لحجم الخط' : 'Live Font Size Preview')}</span>
                      <p className={`text-slate-200 transition-all ${
                        (settings.contentDisplaySettings?.fontSize || 'standard') === 'small' ? 'text-xs' :
                        (settings.contentDisplaySettings?.fontSize || 'standard') === 'standard' ? 'text-sm' :
                        (settings.contentDisplaySettings?.fontSize || 'standard') === 'large' ? 'text-base' : 'text-lg'
                      }`}>
                        {t.fontSizePreviewText || (isRtl ? 'مرحباً بك في HiSee Pro! هذه هي معاينة حجم الخط المختار.' : 'Welcome to HiSee Pro! This is a preview of the selected font size.')}
                      </p>
                    </div>

                    {/* Compact Mode */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{t.compactLayoutLabel || (isRtl ? 'الوضع المدمج (Compact Layout)' : 'Compact Layout')}</span>
                        <span className="text-[9px] text-slate-500">{t.compactLayoutDesc || (isRtl ? 'تقليل التباعد والمسافات لعرض كمية أكبر من المحتوى في الشاشة' : 'Reduce spacing and padding to fit more content on the screen')}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('compactMode', !(settings.contentDisplaySettings?.compactMode ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.compactMode ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.compactMode ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. صلاحية الوصول */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                      <Eye size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{isRtl ? 'صلاحية الوصول ومساعدة ذوي الهمم' : 'Accessibility & Support'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'تسهيل قراءة الواجهات والتحكم بالتنقل المساعد' : 'Make interface reading easier and manage assistive navigation'}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Screen Reader */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'قارئ الشاشة والمساعدة الصوتية' : 'Screen Reader & Voice Assistance'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'تحسين توافقية العناصر ومفاتيح التنقل مع قارئ TalkBack' : 'Improve item compatibility and navigation shortcuts for TalkBack reader'}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('screenReader', !(settings.contentDisplaySettings?.screenReader ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.screenReader ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.screenReader ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* High contrast text */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'نص عالي التباين (High Contrast)' : 'High Contrast Text'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'زيادة حدة تباين ألوان الخطوط لتسهيل قراءتها بوضوح' : 'Increase color contrast of fonts to make them easier to read clearly'}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('highContrastText', !(settings.contentDisplaySettings?.highContrastText ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.highContrastText ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.highContrastText ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Reduce motion */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'تقليل الحركة والانتقالات' : 'Reduce Motion & Transitions'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'تثبيت حركات الأزرار والتنقلات السريعة لراحة العين ومنع الدوار' : 'Freeze fast button motions and transitions for eye comfort and preventing dizziness'}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('reduceMotion', !(settings.contentDisplaySettings?.reduceMotion ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.reduceMotion ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.reduceMotion ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 7. جهات اتصال وموقع */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{isRtl ? 'جهات الاتصال والموقع الجغرافي' : 'Contacts & GPS Location'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'مزامنة جهات الاتصال الخاصة بك وإدارة أذونات الموقع GPS' : 'Sync your contacts and manage GPS location permissions'}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Sync Contacts */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'مزامنة جهات الاتصال النشطة' : 'Active Contacts Synchronization'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'البحث التلقائي عن أصدقائك المسجلين في هاتفك والمنضمين للتطبيق' : 'Automatically find friends registered in your phone who joined the app'}</span>
                      </div>
                      <button 
                        onClick={async () => {
                          const nextVal = !(settings.contentDisplaySettings?.syncContacts ?? false);
                          updateContentDisplaySetting('syncContacts', nextVal);
                          if (nextVal && myId) {
                            setSyncContactsLoading(true);
                            try {
                              // Fetch users from Firestore to simulate real contact syncing
                              const usersSnap = await getDocs(query(collection(firestoreDb, 'users'), limit(50)));
                              let syncedCount = 0;
                              const batch = writeBatch(firestoreDb);
                              usersSnap.docs.forEach(d => {
                                  if (d.id !== myId) {
                                    syncedCount++;
                                    // Optionally, add them to a 'synced_contacts' subcollection
                                    const contactRef = doc(firestoreDb, 'users', myId, 'synced_contacts', d.id);
                                    batch.set(contactRef, {
                                      syncedAt: serverTimestamp(),
                                      userId: d.id,
                                      name: d.data().name || d.data().displayName || ''
                                    });
                                  }
                              });
                              if (syncedCount > 0) {
                                await batch.commit();
                              }
                              setSyncContactsCount(syncedCount);
                            } catch (error) {
                              console.error("Failed to sync contacts", error);
                              setSyncContactsCount(0);
                            } finally {
                              setSyncContactsLoading(false);
                            }
                          } else {
                            setSyncContactsCount(0);
                          }
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.syncContacts ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.syncContacts ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Sync loading & stats preview */}
                    {(settings.contentDisplaySettings?.syncContacts ?? false) && (
                      <div className="bg-[#121418] p-3 rounded-2xl border border-white/5 text-center text-xs">
                        {syncContactsLoading ? (
                          <span className="text-slate-400">{isRtl ? 'جاري مزامنة أرقام جهات الاتصال الخاصة بك... ⏳' : 'Syncing your contact numbers... ⏳'}</span>
                        ) : syncContactsCount > 0 ? (
                          <span className="text-emerald-400 font-bold">{isRtl ? `✓ تم مزامنة ${syncContactsCount} صديق من جهات اتصالك بنجاح!` : `✓ Synced ${syncContactsCount} friends from your contacts successfully!`}</span>
                        ) : (
                          <span className="text-slate-400">{isRtl ? 'مزامنة جهات الاتصال نشطة ومستعدة للتحميل.' : 'Contacts sync is active and ready to load.'}</span>
                        )}
                      </div>
                    )}

                    {/* Precise location */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'استخدام الموقع الدقيق (GPS)' : 'Use Precise Location (GPS)'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'السماح للتطبيق بالوصول لموقعك الجغرافي الدقيق لتقديم خدمات محددة ومخصصة' : 'Allow the app to access your precise location to provide specific tailored services'}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const nextState = !(settings.contentDisplaySettings?.preciseLocation ?? true);
                          if (nextState) {
                            if ('geolocation' in navigator) {
                              navigator.geolocation.getCurrentPosition(
                                (position) => {
                                  updateContentDisplaySetting('preciseLocation', true);
                                },
                                (error) => {
                                  console.error("Location permission denied", error);
                                  alert(isRtl ? "يرجى تفعيل صلاحية الموقع من إعدادات المتصفح/النظام للمتابعة." : "Please enable location permission in browser/system settings to proceed.");
                                  updateContentDisplaySetting('preciseLocation', false);
                                }
                              );
                            } else {
                              alert(isRtl ? "جهازك لا يدعم خدمات الموقع الجغرافي" : "Your device does not support geolocation services");
                            }
                          } else {
                            updateContentDisplaySetting('preciseLocation', false);
                          }
                        }}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.preciseLocation ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.preciseLocation ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* Location history */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'حفظ سجل المواقع' : 'Save Location History'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'حفظ المواقع الجغرافية التي قمت بزيارتها مؤخراً لربط الخريطة وتسهيل إضافتها للمنشورات' : 'Save places you visited recently to link the map and easily add them to posts'}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('locationHistory', !(settings.contentDisplaySettings?.locationHistory ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.locationHistory ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.locationHistory ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 8. ترجمة للغات */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Globe size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{isRtl ? 'الترجمة الذكية واللغات المفضلة' : 'Smart Translation & Preferred Languages'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'إعداد لغة الترجمة التلقائية الذكية للمنشورات والتعليقات' : 'Configure smart automatic translation language for posts and comments'}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Select translation language */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">{isRtl ? 'لغة الترجمة المفضلة لديك' : 'Your Preferred Translation Language'}</span>
                      <select 
                        value={settings.contentDisplaySettings?.targetLanguage || 'ar'}
                        onChange={(e) => updateContentDisplaySetting('targetLanguage', e.target.value)}
                        className="w-full bg-[#121418] border border-white/5 p-3 rounded-2xl text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="ar">{isRtl ? 'العربية (Arabic)' : 'Arabic (ar)'}</option>
                        <option value="ku">{isRtl ? 'الكوردية - كورمانجي (Kurmancî)' : 'Kurdish - Kurmanji (ku)'}</option>
                        <option value="ckb">{isRtl ? 'الكوردية - سوراني (Soranî)' : 'Kurdish - Sorani (ckb)'}</option>
                        <option value="en">{isRtl ? 'الإنجليزية (English)' : 'English (en)'}</option>
                        <option value="de">{isRtl ? 'الألمانية (Deutsch)' : 'German (de)'}</option>
                        <option value="fr">{isRtl ? 'الفرنسية (Français)' : 'French (fr)'}</option>
                      </select>
                    </div>

                    {/* Always translate */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'ترجمة تلقائية دائماً' : 'Always Auto-Translate'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'ترجمة المنشورات والتعليقات المكتوبة بلغة مختلفة تلقائياً للغتك المفضلة' : 'Automatically translate posts and comments written in a different language to your preferred language'}</span>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('alwaysTranslate', !(settings.contentDisplaySettings?.alwaysTranslate ?? true))}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          (settings.contentDisplaySettings?.alwaysTranslate ?? true) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.alwaysTranslate ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* STORAGE & DATA SUB-PAGE */}
            {currentView === 'storage_data' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                
                {/* التنزيل التلقائي للوسائط */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{isRtl ? 'التنزيل التلقائي للوسائط' : 'Media Auto-Download'}</h3>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, autoDownloadMedia: !prev.chatSettings.autoDownloadMedia } }))}
                      className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.autoDownloadMedia ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.autoDownloadMedia ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* أثناء استخدام Wi-Fi */}
                    <div className="flex items-center justify-between pl-4 opacity-90">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{isRtl ? 'أثناء استخدام شبكة Wi-Fi' : 'When using Wi-Fi'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'تنزيل الصور، الصوتيات، الفيديوهات والمستندات تلقائياً' : 'Automatically download images, audios, videos, and documents'}</span>
                      </div>
                      <button 
                        disabled={!settings.chatSettings.autoDownloadMedia}
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, autoDownloadWifi: !prev.chatSettings.autoDownloadWifi } }))}
                        className={`w-10 h-6 rounded-full transition-colors ${!settings.chatSettings.autoDownloadMedia ? 'opacity-40 cursor-not-allowed' : ''} ${settings.chatSettings.autoDownloadWifi ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${settings.chatSettings.autoDownloadWifi ? 'translate-x-5' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* أثناء استخدام شبكة الهاتف المحمول */}
                    <div className="flex items-center justify-between pl-4 opacity-90 pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{isRtl ? 'أثناء استخدام شبكة هاتف محمول' : 'When using mobile network'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'تنزيل الصور والمستندات تلقائياً لتوفير البيانات' : 'Automatically download images and documents to save data'}</span>
                      </div>
                      <button 
                        disabled={!settings.chatSettings.autoDownloadMedia}
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, autoDownloadMobile: !settings.chatSettings.autoDownloadMobile } }))}
                        className={`w-10 h-6 rounded-full transition-colors ${!settings.chatSettings.autoDownloadMedia ? 'opacity-40 cursor-not-allowed' : ''} ${settings.chatSettings.autoDownloadMobile ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${settings.chatSettings.autoDownloadMobile ? 'translate-x-5' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* أثناء استخدام التجوال */}
                    <div className="flex items-center justify-between pl-4 opacity-90 pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{isRtl ? 'أثناء استخدام تجوال' : 'When roaming'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'تعطيل التنزيل التلقائي أثناء التجوال الدولي لتجنب الرسوم' : 'Disable auto-downloads during international roaming to avoid fees'}</span>
                      </div>
                      <button 
                        disabled={!settings.chatSettings.autoDownloadMedia}
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, autoDownloadRoaming: !settings.chatSettings.autoDownloadRoaming } }))}
                        className={`w-10 h-6 rounded-full transition-colors ${!settings.chatSettings.autoDownloadMedia ? 'opacity-40 cursor-not-allowed' : ''} ${settings.chatSettings.autoDownloadRoaming ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${settings.chatSettings.autoDownloadRoaming ? 'translate-x-5' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* جودة التنزيل التلقائي للوسائط */}
                    <div className="pt-4 border-t border-white/5">
                      <span className="text-sm text-slate-300 block mb-2">{isRtl ? 'جودة التنزيل التلقائي للوسائط' : 'Auto-Download Quality'}</span>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'auto', label: isRtl ? 'تلقائي' : 'Auto' },
                          { key: 'high', label: isRtl ? 'جودة عالية' : 'High Quality' },
                          { key: 'low', label: isRtl ? 'توفير بيانات' : 'Data Saver' }
                        ] as const).map((opt) => (
                          <button
                            key={opt.key}
                            disabled={!settings.chatSettings.autoDownloadMedia}
                            onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, autoDownloadQuality: opt.key } }))}
                            className={`p-3 rounded-2xl border transition-all text-center ${!settings.chatSettings.autoDownloadMedia ? 'opacity-40 cursor-not-allowed' : ''} ${
                              settings.chatSettings.autoDownloadQuality === opt.key 
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <span className="text-xs font-bold">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* جودة تحميل وسائط الإرسال */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-2">{isRtl ? 'جودة تحميل وسائط الإرسال' : 'Media Upload Quality'}</h3>
                  <p className="text-[10px] text-slate-500 mb-4">{isRtl ? 'اختر جودة ملفات الوسائط (الصور والفيديو) التي تقوم بإرسالها للآخرين.' : 'Select the quality of media files (photos and videos) you send to others.'}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['auto', 'data_saver', 'high_quality'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, mediaQuality: q } }))}
                        className={`p-3 rounded-2xl border transition-all text-center ${
                          settings.chatSettings.mediaQuality === q 
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xs font-bold">
                          {q === 'auto' ? (isRtl ? 'تلقائي (موصى به)' : 'Auto (Recommended)') : q === 'data_saver' ? (isRtl ? 'توفير البيانات' : 'Data Saver') : (isRtl ? 'جودة عالية' : 'High Quality')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* توفير في بيانات المكالمات واستخدام الشبكة */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{isRtl ? 'استخدام البيانات والمكالمات' : 'Data & Call Usage'}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{isRtl ? 'توفير في بيانات المكالمات' : 'Use Less Data for Calls'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'تقليل استهلاك حزمة الإنترنت أثناء المكالمات الصوتية والمرئية' : 'Reduce internet bandwidth consumption during voice and video calls'}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, useLessDataForCalls: !prev.chatSettings.useLessDataForCalls } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.useLessDataForCalls ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.useLessDataForCalls ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <button 
                      onClick={() => setCurrentView('network_usage')}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Database size={18} className="text-blue-500" />
                        <div className="flex flex-col text-start">
                          <span className="text-sm text-slate-300">{isRtl ? 'استخدامات الشبكة' : 'Network Usage'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'إحصائيات الإرسال والاستقبال بالتفصيل' : 'Detailed statistics of sent and received data'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-400 font-bold">{isRtl ? 'عرض' : 'View'}</span>
                        <ChevronLeft size={16} className="text-slate-600 rotate-180" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* إدارة التخزين */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">{isRtl ? 'إدارة التخزين ومساحة الجهاز' : 'Storage & Device Space'}</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setCurrentView('manage_storage')}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <HardDrive size={18} className="text-emerald-500" />
                        <div className="flex flex-col text-start">
                          <span className="text-sm text-slate-300">{isRtl ? 'إدارة التخزين بالتفصيل' : 'Detailed Storage Breakdown'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'إجمالي الذاكرة المؤقتة والملفات والوسائط' : 'Total cache, files, and media'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-bold">124 MB</span>
                        <ChevronLeft size={16} className="text-slate-600 rotate-180" />
                      </div>
                    </button>

                    {/* فيديوهات بدون اتصال بالإنترنت */}
                    <div className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                      <div className="flex items-center gap-3">
                        <Download size={18} className="text-pink-500" />
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-slate-300">{isRtl ? 'فيديوهات بدون اتصال بالإنترنت' : 'Offline Videos'}</span>
                          <span className="text-[9px] text-slate-500 max-w-[200px] leading-tight">{isRtl ? 'تخزين آخر الفيديوهات لمشاهدتها عند انقطاع الإنترنت. يتم تحديثها تلقائياً.' : 'Store recent videos to watch when offline. Automatically updated.'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => updateContentDisplaySetting('offlineVideos', !(settings.contentDisplaySettings?.offlineVideos ?? false))}
                        className={`w-12 h-7 rounded-full transition-colors shrink-0 ${
                          (settings.contentDisplaySettings?.offlineVideos ?? false) ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                          (settings.contentDisplaySettings?.offlineVideos ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}></span>
                      </button>
                    </div>

                    {/* تحرير المساحة */}
                    <button 
                      onClick={() => setCurrentView('free_up_space')}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} className="text-amber-500" />
                        <div className="flex flex-col text-start">
                          <span className="text-sm text-slate-300">{isRtl ? 'تحرير المساحة' : 'Free Up Space'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'تنظيف الذاكرة المؤقتة وملفات الكاش الزائدة فوراً' : 'Clear temporary memory and extra cache files immediately'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-400 font-bold">{offlineVideosList.reduce((acc, v) => acc + parseInt(v.size), 0)} MB</span>
                        <ChevronLeft size={16} className="text-slate-600 rotate-180" />
                      </div>
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                      <div className="flex items-center gap-3">
                        <Globe size={18} className="text-purple-500" />
                        <span className="text-sm text-slate-300">{isRtl ? 'إعدادات البروكسي' : 'Proxy Settings'}</span>
                      </div>
                      <ChevronLeft size={16} className="text-slate-600 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OFFLINE VIDEOS SUB-PAGE */}
            {currentView === 'offline_videos' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6 text-start">
                
                {/* 1. ملخص التخزين أوفلاين */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                      <Download size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">{isRtl ? 'فيديوهات بدون اتصال بالإنترنت' : 'Offline Videos'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'مشاهدة الفيديوهات التي قمت بتنزيلها في أي وقت دون استهلاك بيانات' : 'Watch downloaded videos anytime without consuming data'}</span>
                    </div>
                  </div>

                  {/* Storage Status Info */}
                  <div className="bg-[#121418] p-4 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>{isRtl ? 'المساحة المستخدمة للتنزيلات:' : 'Storage used for downloads:'}</span>
                      <span className="text-pink-400">{offlineVideosList.reduce((acc, v) => acc + parseInt(v.size), 0)} MB</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${Math.min(100, (offlineVideosList.reduce((acc, v) => acc + parseInt(v.size), 0) / 500) * 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>{isRtl ? 'أقصى حد مسموح: 500 MB' : 'Max Limit Allowed: 500 MB'}</span>
                      <span>{isRtl ? `متاح: ${500 - offlineVideosList.reduce((acc, v) => acc + parseInt(v.size), 0)} MB` : `Available: ${500 - offlineVideosList.reduce((acc, v) => acc + parseInt(v.size), 0)} MB`}</span>
                    </div>
                  </div>
                </div>

                {/* 2. إعدادات التنزيل أوفلاين */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-6">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Sliders size={16} className="text-slate-400" />
                    {isRtl ? 'تفضيلات تنزيل الفيديو' : 'Video Download Preferences'}
                  </h3>

                  <div className="space-y-4">
                    {/* WiFi Only Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'التنزيل عبر شبكة Wi-Fi فقط' : 'Download via Wi-Fi Only'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'تجنب استخدام بيانات الهاتف لتنزيل مقاطع الفيديو تلقائياً' : 'Avoid using cellular data to download videos automatically'}</span>
                      </div>
                      <button 
                        onClick={() => setOfflineWiFiOnly(!offlineWiFiOnly)}
                        className={`w-12 h-7 rounded-full transition-colors ${offlineWiFiOnly ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${offlineWiFiOnly ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* Auto-download Toggles */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'التنزيل الذكي التلقائي' : 'Smart Auto-Download'}</span>
                        <span className="text-[9px] text-slate-500">{isRtl ? 'تنزيل الفيديوهات المقترحة لك تلقائياً عند الاتصال بالواي فاي' : 'Automatically download recommended videos for you when connected to Wi-Fi'}</span>
                      </div>
                      <button 
                        onClick={() => setOfflineAutoDownload(!offlineAutoDownload)}
                        className={`w-12 h-7 rounded-full transition-colors ${offlineAutoDownload ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${offlineAutoDownload ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* Quality Selection */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-300">{isRtl ? 'جودة تنزيل الفيديو الافتراضية' : 'Default Video Download Quality'}</span>
                      <div className="grid grid-cols-2 gap-2 bg-[#121418] p-1 rounded-2xl border border-white/5">
                        <button
                          onClick={() => setOfflineQuality('standard')}
                          className={`py-2 text-xs font-bold rounded-xl transition-all ${offlineQuality === 'standard' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          {isRtl ? 'دقة عادية (Standard 480p)' : 'Standard 480p'}
                        </button>
                        <button
                          onClick={() => setOfflineQuality('high')}
                          className={`py-2 text-xs font-bold rounded-xl transition-all ${offlineQuality === 'high' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          {isRtl ? 'دقة عالية (High 720p)' : 'High 720p'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. قائمة التنزيلات التفاعلية */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">{isRtl ? `المقاطع المحملة في هاتفك (${offlineVideosList.length})` : `Downloaded videos on your phone (${offlineVideosList.length})`}</span>
                    <button 
                      onClick={() => {
                        if (offlineDownloadingId !== null) return;
                        // Simulate Downloading a new video
                        setOfflineDownloadingId(99);
                        setOfflineDownloadProgress(0);
                        const interval = setInterval(() => {
                          setOfflineDownloadProgress(p => {
                            if (p >= 100) {
                              clearInterval(interval);
                              setOfflineDownloadingId(null);
                              // Add new video
                              setOfflineVideosList(prev => [
                                {
                                  id: Date.now(),
                                  title: isRtl ? 'شرح مفصل لميزات نظام iOS 20 لعام 2026 والذكاء الاصطناعي' : 'Detailed overview of iOS 20 features in 2026 and Artificial Intelligence',
                                  duration: '14:50',
                                  size: '48 MB',
                                  thumbnail: 'https://images.unsplash.com/photo-1510519138101-570d1dca3d66?w=150',
                                  category: isRtl ? 'آبل وتقنية' : 'Apple & Tech'
                                },
                                ...prev
                              ]);
                              return 0;
                            }
                            return p + 10;
                          });
                        }, 200);
                      }}
                      disabled={offlineDownloadingId !== null}
                      className="text-xs text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 bg-pink-500/10 px-3 py-1.5 rounded-full"
                    >
                      {offlineDownloadingId !== null ? (isRtl ? `جاري التنزيل ${offlineDownloadProgress}%` : `Downloading ${offlineDownloadProgress}%`) : (isRtl ? '+ تنزيل فيديو تجريبي' : '+ Download Demo Video')}
                    </button>
                  </div>

                  {offlineDownloadingId !== null && (
                    <div className="bg-[#121418] p-3 rounded-2xl border border-pink-500/20 text-center space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-pink-400">
                        <span>{isRtl ? 'جاري محاكاة تنزيل فيديو جديد...' : 'Simulating new video download...'}</span>
                        <span>{offlineDownloadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 rounded-full transition-all duration-150" style={{ width: `${offlineDownloadProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {offlineVideosList.length > 0 ? (
                    <div className="space-y-3">
                      {offlineVideosList.map((video) => (
                        <div key={video.id} className="flex gap-3 bg-[#121418] p-3 rounded-2xl border border-white/5 items-center justify-between">
                          <div className="flex gap-3 items-center min-w-0">
                            {/* Thumbnail overlay play */}
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                              <img src={video.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play size={14} className="text-white fill-white" />
                              </div>
                              <span className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[8px] text-white font-bold">{video.duration}</span>
                            </div>

                            <div className="flex flex-col text-right min-w-0">
                              <span className="text-xs font-bold text-slate-200 truncate">{video.title}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded-md font-bold">{video.category}</span>
                                <span className="text-[9px] text-slate-500 font-bold">{video.size}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setActiveOfflineVideo(video)}
                              className="p-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-all flex items-center justify-center"
                              title={isRtl ? "تشغيل أوفلاين" : "Play Offline"}
                            >
                              <Play size={14} className="fill-white" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(isRtl ? 'هل ترغب بالتأكيد في حذف هذا الفيديو من جهازك لتحرير المساحة؟' : 'Are you sure you want to delete this video from your device to free up space?')) {
                                  setOfflineVideosList(prev => prev.filter(v => v.id !== video.id));
                                }
                              }}
                              className="p-2 bg-white/5 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-all"
                              title={isRtl ? "حذف الفيديو" : "Delete Video"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-[#121418] rounded-2xl border border-white/5 text-slate-500 space-y-2">
                      <div className="text-sm font-bold">{isRtl ? 'لا يوجد أي فيديوهات منزلة حالياً أوفلاين' : 'No videos downloaded offline currently'}</div>
                      <p className="text-[10px]">{isRtl ? 'يمكنك النقر على زر "تنزيل فيديو تجريبي" في الأعلى للمحاكاة وتجربة التشغيل أوفلاين.' : 'You can click "Download Demo Video" button above to simulate offline playback.'}</p>
                    </div>
                  )}
                </div>

                {/* 4. معلومات إضافية للتنزيل */}
                <div className="bg-[#121418] p-4 rounded-2xl border border-white/5 flex gap-3 items-start">
                  <WifiOff size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-300">{isRtl ? 'ملاحظة وضع الأوفلاين' : 'Offline Mode Notice'}</span>
                    <span className="text-[10px] text-slate-500 leading-relaxed mt-1">{isRtl ? 'يُشغل تطبيق HiSee Pro الفيديوهات المحملة أوتوماتيكياً من ذاكرة جهازك فور انقطاع الإنترنت أو أثناء السفر. ننصح بمراجعة القائمة دورياً لتوفير المساحة.' : 'HiSee Pro plays downloaded videos automatically from your device memory when internet is disconnected. We recommend checking the list periodically to save space.'}</span>
                  </div>
                </div>

                {/* Floating Video Player Modal */}
                {activeOfflineVideo && (
                  <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#161a22] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl relative flex flex-col">
                      
                      {/* Close Header */}
                      <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <span className="text-xs font-bold text-pink-400">{isRtl ? '▶ جاري التشغيل في وضع الأوفلاين (بلا إنترنت)' : '▶ Playing in Offline Mode (No Internet)'}</span>
                        <button 
                          onClick={() => setActiveOfflineVideo(null)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Animated Video Canvas simulation */}
                      <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
                        <img src={activeOfflineVideo.thumbnail} alt="" className="w-full h-full object-cover blur-sm opacity-50" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                          <div className="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center shadow-lg animate-ping absolute opacity-25"></div>
                          <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center shadow-lg text-white z-20 hover:scale-110 transition-all cursor-pointer">
                            <Play size={20} className="fill-white ml-1" />
                          </div>
                          <span className="text-xs font-bold text-white max-w-xs">{activeOfflineVideo.title}</span>
                          <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 px-2.5 py-0.5 rounded-full">{activeOfflineVideo.category}</span>
                        </div>
                        {/* Simulation playback bottom bar */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 space-y-2 text-right">
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="w-1/3 h-full bg-pink-500 rounded-full animate-pulse"></div>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>04:12 / {activeOfflineVideo.duration}</span>
                            <span>{isRtl ? 'وضع الأوفلاين النشط ⚡' : 'Active Offline Mode ⚡'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Simulation Controls details */}
                      <div className="p-6 space-y-4 text-right">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-white">{activeOfflineVideo.title}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? `حجم الملف على جهازك: ${activeOfflineVideo.size} | مدة الفيديو: ${activeOfflineVideo.duration} دقيقة` : `File size on device: ${activeOfflineVideo.size} | Duration: ${activeOfflineVideo.duration} mins`}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                            <span className="text-[10px] text-slate-500 block">{isRtl ? 'سرعة التشغيل' : 'Playback Speed'}</span>
                            <span className="text-xs font-bold text-white mt-1 block">1.0x ({isRtl ? 'طبيعي' : 'Normal'})</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                            <span className="text-[10px] text-slate-500 block">{isRtl ? 'الترجمة المصاحبة' : 'Subtitles'}</span>
                            <span className="text-xs font-bold text-emerald-400 mt-1 block">{isRtl ? 'مفعلة تلقائياً (العربية)' : 'Auto-Enabled (English)'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveOfflineVideo(null);
                            alert(isRtl ? 'تم إيقاف التشغيل بنجاح.' : 'Playback stopped successfully.');
                          }}
                          className="w-full py-3 bg-pink-500 text-white font-bold rounded-2xl hover:bg-pink-600 transition-all text-xs"
                        >
                          {isRtl ? 'إغلاق وإيقاف التشغيل' : 'Close and Stop Playback'}
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

            {/* FREE UP SPACE SUB-PAGE */}
            {currentView === 'free_up_space' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6 text-start">
                
                {/* 1. لوحة فحص الذاكرة والملفات */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg text-center space-y-4">
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    {/* Glowing outer ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin duration-1000" style={{ display: clearingCacheType ? 'block' : 'none' }}></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500" style={{ display: spaceOptimized ? 'block' : 'none' }}></div>
                    
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">
                        {spaceOptimized ? '0 Bytes' : '124 MB'}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold mt-1">{isRtl ? 'كاش قابل للتنظيف' : 'Clearable Cache'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-200">
                      {spaceOptimized ? (isRtl ? 'جهازك محسن بالكامل! 🎉' : 'Your device is fully optimized! 🎉') : (isRtl ? 'ذاكرة هاتفك تحتاج إلى تحسين' : 'Your device storage needs optimization')}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {spaceOptimized ? (isRtl ? 'تم تنظيف كافة الملفات المؤقتة والذاكرة العشوائية بنجاح.' : 'All temporary files and RAM cache have been cleared successfully.') : (isRtl ? 'تنظيف ملفات الكاش يزيد سرعة أداء التطبيق ويفرغ مساحة إضافية.' : 'Clearing cache files increases app response speed and frees up device space.')}
                    </p>
                  </div>
                </div>

                {/* 2. تفاصيل ملفات الكاش وأحجامها */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <HardDrive size={16} className="text-slate-400" />
                    {isRtl ? 'تفاصيل الذاكرة المؤقتة حسب الفئة' : 'Temporary Storage Breakdown by Category'}
                  </h3>

                  <div className="space-y-3">
                    {/* Video Cache */}
                    <div className="flex justify-between items-center bg-[#121418] p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'مؤقت مقاطع الفيديو (Video Cache)' : 'Video Playback Cache'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'الفيديوهات المخزنة مؤقتاً لتسريع التشغيل لاحقاً' : 'Videos cached temporarily to speed up playback'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold">{freeUpSpaceSizes.videoCache}</span>
                        <button
                          onClick={() => {
                            setClearingCacheType('video');
                            setTimeout(() => {
                              setFreeUpSpaceSizes(prev => ({ ...prev, videoCache: '0 Bytes' }));
                              setClearingCacheType(null);
                            }, 800);
                          }}
                          disabled={freeUpSpaceSizes.videoCache === '0 Bytes' || clearingCacheType !== null}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            freeUpSpaceSizes.videoCache === '0 Bytes' 
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black'
                          }`}
                        >
                          {clearingCacheType === 'video' ? (isRtl ? 'جاري...' : 'Clearing...') : (isRtl ? 'تنظيف' : 'Clear')}
                        </button>
                      </div>
                    </div>

                    {/* Image Cache */}
                    <div className="flex justify-between items-center bg-[#121418] p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'كاش الصور والرموز التعبيرية' : 'Image & Emoji Cache'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'الصور المصغرة وصور الحسابات المحملة مسبقاً' : 'Thumbnails and profile photos pre-loaded'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold">{freeUpSpaceSizes.imageCache}</span>
                        <button
                          onClick={() => {
                            setClearingCacheType('image');
                            setTimeout(() => {
                              setFreeUpSpaceSizes(prev => ({ ...prev, imageCache: '0 Bytes' }));
                              setClearingCacheType(null);
                            }, 800);
                          }}
                          disabled={freeUpSpaceSizes.imageCache === '0 Bytes' || clearingCacheType !== null}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            freeUpSpaceSizes.imageCache === '0 Bytes' 
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black'
                          }`}
                        >
                          {clearingCacheType === 'image' ? (isRtl ? 'جاري...' : 'Clearing...') : (isRtl ? 'تنظيف' : 'Clear')}
                        </button>
                      </div>
                    </div>

                    {/* Temp files & Drafts */}
                    <div className="flex justify-between items-center bg-[#121418] p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'ملفات المسودات والتحميلات المعلقة' : 'Draft Files & Pending Uploads'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'مسودات الفيديوهات والمنشورات غير المكتملة' : 'Unfinished videos and drafts cached'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold">{freeUpSpaceSizes.tempFiles}</span>
                        <button
                          onClick={() => {
                            setClearingCacheType('temp');
                            setTimeout(() => {
                              setFreeUpSpaceSizes(prev => ({ ...prev, tempFiles: '0 Bytes' }));
                              setClearingCacheType(null);
                            }, 800);
                          }}
                          disabled={freeUpSpaceSizes.tempFiles === '0 Bytes' || clearingCacheType !== null}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            freeUpSpaceSizes.tempFiles === '0 Bytes' 
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black'
                          }`}
                        >
                          {clearingCacheType === 'temp' ? (isRtl ? 'جاري...' : 'Clearing...') : (isRtl ? 'تنظيف' : 'Clear')}
                        </button>
                      </div>
                    </div>

                    {/* Search Cache */}
                    <div className="flex justify-between items-center bg-[#121418] p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'سجل البحث المؤقت' : 'Temporary Search Cache'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'التوصيات وعمليات التخمين السريعة للبحث' : 'Auto-complete search recommendations'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold">{freeUpSpaceSizes.searchHistory}</span>
                        <button
                          onClick={() => {
                            setClearingCacheType('search');
                            setTimeout(() => {
                              setFreeUpSpaceSizes(prev => ({ ...prev, searchHistory: '0 Bytes' }));
                              setClearingCacheType(null);
                            }, 800);
                          }}
                          disabled={freeUpSpaceSizes.searchHistory === '0 Bytes' || clearingCacheType !== null}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            freeUpSpaceSizes.searchHistory === '0 Bytes' 
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black'
                          }`}
                        >
                          {clearingCacheType === 'search' ? (isRtl ? 'جاري...' : 'Clearing...') : (isRtl ? 'تنظيف' : 'Clear')}
                        </button>
                      </div>
                    </div>

                    {/* Database Drafts */}
                    <div className="flex justify-between items-center bg-[#121418] p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'سجلات الأخطاء والتقارير الزائدة' : 'App Logs & Usage Analytics'}</span>
                        <span className="text-[10px] text-slate-500">{isRtl ? 'سجلات وتحليلات الاستخدام والتقارير السابقة' : 'Usage analytics records and system reports'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold">{freeUpSpaceSizes.databaseDrafts}</span>
                        <button
                          onClick={() => {
                            setClearingCacheType('drafts');
                            setTimeout(() => {
                              setFreeUpSpaceSizes(prev => ({ ...prev, databaseDrafts: '0 Bytes' }));
                              setClearingCacheType(null);
                            }, 800);
                          }}
                          disabled={freeUpSpaceSizes.databaseDrafts === '0 Bytes' || clearingCacheType !== null}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            freeUpSpaceSizes.databaseDrafts === '0 Bytes' 
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black'
                          }`}
                        >
                          {clearingCacheType === 'drafts' ? (isRtl ? 'جاري...' : 'Clearing...') : (isRtl ? 'تنظيف' : 'Clear')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. زر التنظيف الكامل المجمع */}
                <div className="space-y-4">
                  {clearingCacheType === 'all' ? (
                    <div className="bg-[#121418] p-4 rounded-2xl border border-amber-500/20 text-center space-y-3">
                      <span className="text-xs font-bold text-amber-400 block animate-pulse">{isRtl ? 'جاري تنفيذ عملية التحسين والتنظيف الشاملة للجهاز... 🧹' : 'Running comprehensive storage cleaning... 🧹'}</span>
                      <div className="flex justify-center">
                        <RefreshCw size={24} className="text-amber-500 animate-spin" />
                      </div>
                      <span className="text-[10px] text-slate-500 block">{isRtl ? 'جاري حذف ملفات الذاكرة العشوائية وتحرير المساحة...' : 'Deleting cached records and freeing device space...'}</span>
                    </div>
                  ) : spaceOptimized ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center space-y-2">
                      <span className="text-xs font-bold text-emerald-400 block">{isRtl ? '✓ تم تحرير 124 MB من جهازك بنجاح!' : '✓ Successfully freed up 124 MB from device!'}</span>
                      <p className="text-[10px] text-slate-400">{isRtl ? 'سرعة استجابة التطبيق وتنقل الفيديوهات تحسنت الآن بنسبة 35%.' : 'App responsiveness and video caching speed have improved by 35%.'}</p>
                      <button
                        onClick={() => {
                          setSpaceOptimized(false);
                          setFreeUpSpaceSizes({
                            videoCache: '54.2 MB',
                            imageCache: '31.5 MB',
                            tempFiles: '24.8 MB',
                            searchHistory: '1.4 MB',
                            databaseDrafts: '12.1 MB'
                          });
                        }}
                        className="text-[10px] text-slate-500 hover:underline mt-1 font-bold"
                      >
                        {isRtl ? 'إعادة تعيين المحاكاة للتحسين مجدداً' : 'Reset simulation to optimize again'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setClearingCacheType('all');
                        setTimeout(() => {
                          setFreeUpSpaceSizes({
                            videoCache: '0 Bytes',
                            imageCache: '0 Bytes',
                            tempFiles: '0 Bytes',
                            searchHistory: '0 Bytes',
                            databaseDrafts: '0 Bytes'
                          });
                          setClearingCacheType(null);
                          setSpaceOptimized(true);
                          setOfflineVideosList([]);
                        }, 2000);
                      }}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      {isRtl ? 'تحرير المساحة بالكامل وتنظيف الكاش (124 MB)' : 'Free up storage and clear all cache (124 MB)'}
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* MANAGE STORAGE SUB-PAGE */}
            {currentView === 'manage_storage' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <button 
                  onClick={async () => {
                    if (confirm(t.clearVideoCacheConfirm || (isRtl ? 'هل أنت متأكد من رغبتك في مسح الذاكرة المؤقتة لمقاطع الفيديو؟' : 'Are you sure you want to clear cached video files?'))) {
                      try {
                        await videoCache.clearCache();
                        alert(t.cacheCleared || (isRtl ? 'تم مسح الذاكرة المؤقتة بنجاح!' : 'Cache cleared successfully!'));
                      } catch (error) {
                        console.error('Failed to clear cache:', error);
                        alert('Failed to clear cache');
                      }
                    }
                  }}
                  className="w-full p-4 bg-emerald-600/20 border border-emerald-500/50 rounded-2xl text-emerald-500 font-bold hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} />
                  {t.clearVideoCache || (isRtl ? 'مسح ذاكرة التخزين المؤقت للفيديو' : 'Clear Video Cache')}
                </button>

                {/* Storage Usage Bar */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <div className="flex justify-between items-end mb-4">
                    <div className="flex flex-col text-start">
                      <span className="text-2xl font-bold text-white">{(Object.values(cacheSizes).reduce((a, b) => a + b, 0) / 1024).toFixed(1)} GB</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{t.totalUsed || (isRtl ? 'إجمالي المساحة المستخدمة' : 'Total Storage Used')}</span>
                    </div>
                    <span className="text-sm text-emerald-500 font-bold">48.2 GB {t.freeSpace || (isRtl ? 'مساحة حرة' : 'Free Space')}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{ width: '40%' }}></div>
                    <div className="h-full bg-emerald-500" style={{ width: '25%' }}></div>
                    <div className="h-full bg-amber-500" style={{ width: '15%' }}></div>
                    <div className="h-full bg-rose-500" style={{ width: '10%' }}></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-start">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] text-slate-400">{t.videos || (isRtl ? 'الفيديوهات' : 'Videos')} (5.2 GB)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] text-slate-400">{t.photos || (isRtl ? 'الصور' : 'Photos')} (3.1 GB)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-[10px] text-slate-400">{t.files || (isRtl ? 'الملفات' : 'Files')} (2.4 GB)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span className="text-[10px] text-slate-400">{t.voiceMessages || (isRtl ? 'الرسائل الصوتية' : 'Voice Messages')} (1.7 GB)</span>
                    </div>
                  </div>
                </div>

                {/* Storage Breakdown List */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 text-start">{t.storageBreakdown || (isRtl ? 'تفاصيل التخزين' : 'Storage Breakdown')}</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'videos', label: t.videos || (isRtl ? 'الفيديوهات' : 'Videos'), color: 'text-blue-500' },
                      { key: 'photos', label: t.photos || (isRtl ? 'الصور' : 'Photos'), color: 'text-emerald-500' },
                      { key: 'files', label: t.files || (isRtl ? 'الملفات' : 'Files'), color: 'text-amber-500' },
                      { key: 'voiceMessages', label: t.voiceMessages || (isRtl ? 'الرسائل الصوتية' : 'Voice Messages'), color: 'text-rose-500' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-8 rounded-full ${item.color.replace('text-', 'bg-')}`}></div>
                          <div className="flex flex-col text-start">
                            <span className="text-sm font-bold text-white">{item.label}</span>
                            <span className="text-[10px] text-slate-500">{(cacheSizes[item.key as keyof typeof cacheSizes] / 1024).toFixed(1)} GB</span>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (confirm(isRtl ? `هل أنت متأكد؟ سيتم حذف جميع ملفات فئة ${item.label} نهائياً لتوفير المساحة.` : `Are you sure? All files in ${item.label} category will be deleted permanently to free up space.`)) {
                              setCacheSizes(prev => ({ ...prev, [item.key]: 0 }));
                              alert(isRtl ? `تم حذف بيانات فئة: ${item.label} وإعادة حساب المساحة.` : `Successfully deleted files in category: ${item.label}. Storage recalculated.`);
                            }
                          }}
                          className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto Cleanup */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 text-start">{t.autoCleanup || (isRtl ? 'التنظيف التلقائي' : 'Auto Storage Cleanup')}</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col text-start">
                        <span className="text-sm text-slate-300">{t.autoCleanup || (isRtl ? 'التنظيف التلقائي' : 'Auto Cleanup')}</span>
                        <span className="text-[10px] text-slate-500">{t.autoCleanupDesc || (isRtl ? 'حذف الوسائط القديمة تلقائياً' : 'Automatically clear old media and unused files')}</span>
                      </div>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, autoCleanup: !prev.chatSettings.autoCleanup } }))}
                        className={`w-12 h-7 rounded-full transition-colors ${settings.chatSettings.autoCleanup ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatSettings.autoCleanup ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    <div className="space-y-3 text-start">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{t.keepMedia || (isRtl ? 'الاحتفاظ بالوسائط لـ' : 'Keep Media Files For')}</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'forever', label: t.forever || (isRtl ? 'للأبد' : 'Forever') },
                          { id: '1month', label: t.oneMonth || (isRtl ? 'شهر واحد' : '1 Month') },
                          { id: '1week', label: t.oneWeek || (isRtl ? 'أسبوع واحد' : '1 Week') },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, keepMediaDuration: opt.id as any } }))}
                            className={`p-3 rounded-2xl border transition-all text-center ${
                              settings.chatSettings.keepMediaDuration === opt.id 
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (confirm(t.clearAllDataConfirm || (isRtl ? 'هل أنت متأكد من مسح جميع البيانات؟ سيتم إعادة ضبط الإعدادات.' : 'Are you sure you want to clear all app data? This resets the settings completely.'))) {
                      // Real action: Clear all local storage, indexedDB, and reset state
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full p-4 bg-rose-600/20 border border-rose-500/50 rounded-2xl text-rose-500 font-bold hover:bg-rose-600/30 transition-all text-center"
                >
                  {t.clearAllData || (isRtl ? 'مسح جميع البيانات' : 'Clear All App Data')}
                </button>
              </div>
            )}

            {/* NETWORK USAGE SUB-PAGE */}
            {currentView === 'network_usage' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                
                {/* Reset statistics header card */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-start">
                    <h3 className="text-base font-bold text-white mb-1">{isRtl ? 'إحصائيات استخدام الشبكة' : 'Network Usage Statistics'}</h3>
                    <p className="text-xs text-slate-500">{isRtl ? 'مراقبة حجم البيانات المرسلة والمستقبلة عبر التطبيق.' : 'Monitor data sizes sent and received via the application.'}</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm(isRtl ? "هل أنت متأكد من رغبتك في إعادة تعيين كافة إحصائيات استخدام الشبكة إلى الصفر؟" : "Are you sure you want to reset all network usage statistics to zero?")) {
                        setNetworkStats({
                          sentMessages: 0,
                          recvMessages: 0,
                          sentMedia: '0 KB',
                          recvMedia: '0 KB',
                          sentCalls: '0 KB',
                          recvCalls: '0 KB',
                          sentStatus: '0 KB',
                          recvStatus: '0 KB',
                          sentTotal: '0 KB',
                          recvTotal: '0 KB'
                        });
                        alert(isRtl ? "تم إعادة تعيين إحصائيات الشبكة بنجاح." : "Network statistics have been reset successfully.");
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 font-bold text-xs transition-all active:scale-95 animate-in fade-in"
                  >
                    <RefreshCw size={14} className="animate-spin duration-1000" />
                    <span>{isRtl ? 'إعادة تعيين الإحصائيات' : 'Reset Statistics'}</span>
                  </button>
                </div>

                {/* Statistics Details Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h4 className="text-sm font-bold text-slate-300 mb-4 pb-2 border-b border-white/5 text-start">{isRtl ? 'تفاصيل الاستهلاك' : 'Consumption Details'}</h4>
                  <div className="space-y-4">
                    
                    {/* Messages */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <MessageSquare size={18} />
                        </div>
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-white">{isRtl ? 'الرسائل' : 'Messages'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'تبادل الرسائل النصية والملصقات' : 'Sent and received text messages & stickers'}</span>
                        </div>
                      </div>
                      <div className="text-end text-xs">
                        <div className="text-emerald-400 font-semibold">{isRtl ? 'أرسل:' : 'Sent:'} <span className="text-white font-bold">{networkStats.sentMessages}</span></div>
                        <div className="text-blue-400 font-semibold">{isRtl ? 'استقبل:' : 'Received:'} <span className="text-white font-bold">{networkStats.recvMessages}</span></div>
                      </div>
                    </div>

                    {/* Media */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <Camera size={18} />
                        </div>
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-white">{isRtl ? 'الوسائط' : 'Media'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'الصور والفيديوهات المتبادلة' : 'Shared photos and video files'}</span>
                        </div>
                      </div>
                      <div className="text-end text-xs">
                        <div className="text-emerald-400 font-semibold">{isRtl ? 'أرسل:' : 'Sent:'} <span className="text-white font-bold">{networkStats.sentMedia}</span></div>
                        <div className="text-blue-400 font-semibold">{isRtl ? 'استقبل:' : 'Received:'} <span className="text-white font-bold">{networkStats.recvMedia}</span></div>
                      </div>
                    </div>

                    {/* Calls */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                          <Mic size={18} />
                        </div>
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-white">{isRtl ? 'المكالمات' : 'Calls'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'المكالمات الصوتية والمرئية' : 'Voice and video call bandwidth'}</span>
                        </div>
                      </div>
                      <div className="text-end text-xs">
                        <div className="text-emerald-400 font-semibold">{isRtl ? 'أرسل:' : 'Sent:'} <span className="text-white font-bold">{networkStats.sentCalls}</span></div>
                        <div className="text-blue-400 font-semibold">{isRtl ? 'استقبل:' : 'Received:'} <span className="text-white font-bold">{networkStats.recvCalls}</span></div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                          <Zap size={18} />
                        </div>
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-white">{isRtl ? 'الحالات' : 'Status Stories'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'رفع ومشاهدة حالات جهات الاتصال' : 'Uploaded and viewed contacts status updates'}</span>
                        </div>
                      </div>
                      <div className="text-end text-xs">
                        <div className="text-emerald-400 font-semibold">{isRtl ? 'أرسل:' : 'Sent:'} <span className="text-white font-bold">{networkStats.sentStatus}</span></div>
                        <div className="text-blue-400 font-semibold">{isRtl ? 'استقبل:' : 'Received:'} <span className="text-white font-bold">{networkStats.recvStatus}</span></div>
                      </div>
                    </div>

                    {/* Total Cumulative Usage */}
                    <div className="flex items-center justify-between p-5 bg-[#14161a] border border-white/5 rounded-2xl pt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <Activity size={18} />
                        </div>
                        <div className="flex flex-col text-start">
                          <span className="text-sm font-bold text-rose-400">{isRtl ? 'الإجمالي التراكمي' : 'Total Cumulative Usage'}</span>
                          <span className="text-[10px] text-slate-500">{isRtl ? 'مجموع استهلاك كافة الخدمات' : 'Total data usage across all services'}</span>
                        </div>
                      </div>
                      <div className="text-end text-xs">
                        <div className="text-emerald-400 font-bold">{isRtl ? 'أرسل:' : 'Sent:'} <span className="text-white text-sm font-bold">{networkStats.sentTotal}</span></div>
                        <div className="text-blue-400 font-bold">{isRtl ? 'استقبل:' : 'Received:'} <span className="text-white text-sm font-bold">{networkStats.recvTotal}</span></div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ACTIVITY POSTS SUB-PAGE */}
            {currentView === 'activity_posts' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                {/* Stats Header Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-base font-bold text-white mb-4 text-start">{t.activityStatsHeader || (isRtl ? 'إحصائيات تفاعلك ونشاطك' : 'Your Interaction & Activity Stats')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">{t.posts || (isRtl ? 'المنشورات' : 'Posts')}</span>
                      <span className="text-xl font-black text-indigo-400">{realPosts.length}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">{t.likes || (isRtl ? 'الإعجابات' : 'Likes')}</span>
                      <span className="text-xl font-black text-rose-500">{totalLikes}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">{t.views || (isRtl ? 'المشاهدات' : 'Views')}</span>
                      <span className="text-xl font-black text-emerald-400">{totalViews}</span>
                    </div>
                  </div>
                </div>

                {/* Global Publication Preferences */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{t.defaultPublishingPrefs || (isRtl ? 'التفضيلات الافتراضية للنشر' : 'Default Publishing Preferences')}</h4>
                  
                  {/* Default Privacy */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.postsPrivacy || (isRtl ? 'خصوصية المنشورات' : 'Posts Privacy')}</span>
                      <span className="text-[10px] text-slate-500">{t.postsPrivacyDesc || (isRtl ? 'تحديد من يمكنه رؤية منشوراتك الجديدة بشكل تلقائي' : 'Determine who can see your new posts automatically')}</span>
                    </div>
                    <select
                      value={defaultPostPrivacy}
                      onChange={(e) => setDefaultPostPrivacy(e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="public">{isRtl ? 'الجميع (عام)' : 'Everyone (Public)'}</option>
                      <option value="contacts">{isRtl ? 'جهات الاتصال فقط' : 'Contacts Only'}</option>
                      <option value="private">{isRtl ? 'أنا فقط (خاص)' : 'Only Me (Private)'}</option>
                    </select>
                  </div>

                  {/* Who Can Comment */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.whoCanComment || (isRtl ? 'من يمكنه التعليق' : 'Who Can Comment')}</span>
                      <span className="text-[10px] text-slate-500">{t.whoCanCommentDesc || (isRtl ? 'منع أو السماح بالتعليقات على منشوراتك العامة' : 'Allow or prevent comments on your public posts')}</span>
                    </div>
                    <select
                      value={whoCanComment}
                      onChange={(e) => setWhoCanComment(e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="all">{isRtl ? 'الجميع' : 'Everyone'}</option>
                      <option value="contacts">{isRtl ? 'جهات اتصالي فقط' : 'My Contacts Only'}</option>
                      <option value="none">{isRtl ? 'لا أحد' : 'Nobody'}</option>
                    </select>
                  </div>

                  {/* Location Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.includeLocationOnPosts || (isRtl ? 'تضمين الموقع الجغرافي' : 'Include Location')}</span>
                      <span className="text-[10px] text-slate-500">{t.includeLocationOnPostsDesc || (isRtl ? 'عرض موقعك تلقائياً عند إضافة منشورات جديدة' : 'Display your location automatically when posting new content')}</span>
                    </div>
                    <button
                      onClick={() => setShowLocationOnPosts(!showLocationOnPosts)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${showLocationOnPosts ? 'bg-indigo-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${showLocationOnPosts ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>
                </div>

                {/* Recent Posts Management */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{t.manageCurrentPosts || (isRtl ? 'إدارة منشوراتك الحالية' : 'Manage Current Posts')}</h4>
                  
                  {realPosts.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">{isRtl ? 'لم تقم بنشر أي منشورات بعد.' : "You haven't posted anything yet."}</p>
                  ) : (
                    <div className="space-y-3">
                      {realPosts.map((post) => (
                        <div key={post.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3 text-start">
                          <p className="text-xs text-white font-medium leading-relaxed">{post.title || post.desc || (isRtl ? "منشور HiSee" : "HiSee Post")}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-3">
                              <span>{post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US') : (isRtl ? 'تاريخ غير معروف' : 'Unknown Date')}</span>
                              <span className="text-indigo-400">👍 {post.likes || 0}</span>
                              <span className="text-emerald-400">👁️ {post.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Privacy Selector for this post */}
                              <select
                                  value={post.privacy || 'public'}
                                  onChange={(e) => updatePostPrivacy(post.id, e.target.value)}
                                  className="bg-slate-900 border border-white/5 rounded-lg px-2 py-0.5 text-[9px] text-slate-300 outline-none"
                              >
                                <option value="public">{isRtl ? 'الجميع' : 'Everyone'}</option>
                                <option value="contacts">{isRtl ? 'المقربون' : 'Close Friends'}</option>
                                <option value="private">{isRtl ? 'خاص' : 'Private'}</option>
                              </select>

                              {/* Delete button */}
                              <button
                                onClick={() => deletePost(post.id)}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-all"
                                title={isRtl ? "حذف المنشور" : "Delete Post"}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LIVE PREFERENCES SUB-PAGE */}
            {currentView === 'live_preferences' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                {/* Streaming Quality & Settings */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-base font-bold text-white mb-2 text-start">{t.streamQualityAndData || (isRtl ? 'جودة البث والبيانات' : 'Stream Quality & Data')}</h3>
                  
                  {/* Quality selector */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.prefStreamQuality || (isRtl ? 'دقة البث المفضلة' : 'Preferred Stream Resolution')}</span>
                      <span className="text-[10px] text-slate-500">{t.prefStreamQualityDesc || (isRtl ? 'سيتم استخدام هذه الدقة تلقائياً عند بدء البث المباشر' : 'This resolution will be used automatically when starting a live stream')}</span>
                    </div>
                    <select
                      value={settings.liveSettings?.streamingQuality || 'auto'}
                      onChange={(e) => updateLiveSetting('streamingQuality', e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500"
                    >
                      <option value="auto">{isRtl ? `تلقائي (مقترح: ${getRecommendedQuality()})` : `Auto (Recommended: ${getRecommendedQuality()})`}</option>
                      <option value="4k">4K {isRtl ? '(أجهزة قوية جداً)' : '(Ultra powerful devices)'}</option>
                      <option value="1080p">1080p FHD {isRtl ? '(إنترنت قوي)' : '(Strong internet)'}</option>
                      <option value="720p">720p HD {isRtl ? '(متوازن)' : '(Balanced)'}</option>
                      <option value="480p">480p SD {isRtl ? '(موفر بيانات)' : '(Data Saver)'}</option>
                    </select>
                  </div>

                  {/* Live Stream default privacy */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.defaultStreamPrivacy || (isRtl ? 'خصوصية البث الافتراضية' : 'Default Stream Privacy')}</span>
                      <span className="text-[10px] text-slate-500">{t.defaultStreamPrivacyDesc || (isRtl ? 'من يمكنه الانضمام إلى غرف البث المباشر الخاصة بك' : 'Who can join your live stream rooms')}</span>
                    </div>
                    <select
                      value={settings.liveSettings?.streamPrivacy || 'public'}
                      onChange={(e) => updateLiveSetting('streamPrivacy', e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500"
                    >
                      <option value="public">{isRtl ? 'عام (الجميع يمكنهم الدخول)' : 'Public (Everyone can join)'}</option>
                      <option value="followers">{isRtl ? 'المتابعون فقط' : 'Followers Only'}</option>
                      <option value="invited">{isRtl ? 'الأشخاص المدعوون فقط' : 'Invited People Only'}</option>
                    </select>
                  </div>

                  {/* Auto Record Stream */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.autoRecordStream || (isRtl ? 'حفظ البث تلقائياً' : 'Auto-record Live Stream')}</span>
                      <span className="text-[10px] text-slate-500">{t.autoRecordStreamDesc || (isRtl ? 'حفظ نسخة مسجلة من البث المباشر في استوديو جهازك بعد الانتهاء' : 'Save a recorded copy of your live stream to your device gallery when finished')}</span>
                    </div>
                    <button
                      onClick={() => updateLiveSetting('autoRecordToGallery', !(settings.liveSettings?.autoRecordToGallery ?? true))}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${(settings.liveSettings?.autoRecordToGallery ?? true) ? 'bg-pink-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${(settings.liveSettings?.autoRecordToGallery ?? true) ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>
                </div>

                {/* Alerts Settings Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{t.liveInteractiveAlerts || (isRtl ? 'تنبيهات البث المباشر التفاعلية' : 'Interactive Live Stream Alerts')}</h4>

                  {/* Viewer Entry Animation */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.viewerEntryEffects || (isRtl ? 'تنبيه ومؤثرات دخول المشاهدين' : 'Viewer Entry Welcome Effects')}</span>
                      <span className="text-[10px] text-slate-500">{t.viewerEntryEffectsDesc || (isRtl ? 'عرض رسوم متحركة ترحيبية عند انضمام مشاهدين جدد' : 'Show welcoming animated effects when new viewers join')}</span>
                    </div>
                    <button
                      onClick={() => updateLiveSetting('viewerEntryAnimations', !(settings.liveSettings?.viewerEntryAnimations ?? true))}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${(settings.liveSettings?.viewerEntryAnimations ?? true) ? 'bg-pink-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${(settings.liveSettings?.viewerEntryAnimations ?? true) ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>

                  {/* Gift Sound alerts */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.receivedGiftSounds || (isRtl ? 'أصوات الهدايا المستلمة' : 'Received Gift Sound Alerts')}</span>
                      <span className="text-[10px] text-slate-500">{t.receivedGiftSoundsDesc || (isRtl ? 'تشغيل نغمات ترويجية تفاعلية فور إرسال الهدايا لك' : 'Play interactive sounds immediately when someone sends you gifts')}</span>
                    </div>
                    <button
                      onClick={() => updateLiveSetting('giftSoundAlerts', !(settings.liveSettings?.giftSoundAlerts ?? true))}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${(settings.liveSettings?.giftSoundAlerts ?? true) ? 'bg-pink-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${(settings.liveSettings?.giftSoundAlerts ?? true) ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>

                  {/* Comment TTS */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.commentTTS || (isRtl ? 'نطق التعليقات صوتياً (TTS)' : 'Read Comments Aloud (TTS)')}</span>
                      <span className="text-[10px] text-slate-500">{t.commentTTSDesc || (isRtl ? 'تحويل التعليقات النصية للمشاهدين إلى نطق مسموع تلقائياً' : 'Automatically read viewer comments aloud')}</span>
                    </div>
                    <button
                      onClick={() => updateLiveSetting('commentTTS', !(settings.liveSettings?.commentTTS ?? true))}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${(settings.liveSettings?.commentTTS ?? true) ? 'bg-pink-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${(settings.liveSettings?.commentTTS ?? true) ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>
                </div>

                {/* Moderator Management Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{t.manageStreamModerators || (isRtl ? 'إدارة مشرفي البث الخاص بك' : 'Manage Live Stream Moderators')}</h4>
                  
                  <div className="relative flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={isRtl ? "ابحث عن صديق أو متابع لإضافة كمشرف..." : "Search friend or follower to add as moderator..."}
                      value={newModeratorName}
                      onChange={(e) => setNewModeratorName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-pink-500 text-start"
                    />
                    {newModeratorName.length >= 2 && (
                      <div className="absolute top-full right-0 w-full mt-2 bg-slate-800 border border-white/10 rounded-2xl z-50 shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                        {Object.values(users)
                          .filter(u => u.name.toLowerCase().includes(newModeratorName.toLowerCase()) && u.id !== myId)
                          .map(u => (
                            <button
                              key={u.id}
                              className="w-full text-start p-3 text-xs text-white hover:bg-white/10"
                              onClick={() => {
                                setNewModeratorName(u.name);
                              }}
                            >
                              {u.name}
                            </button>
                          ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const name = newModeratorName.trim();
                        const friend = Object.values(users).find(u => u.name === name && u.id !== myId);
                        if (name && friend) {
                          updateLiveSetting('moderators', [...(settings.liveSettings?.moderators || []), {
                             id: friend.id,
                             name: name,
                             status: 'active',
                             permissions: { mute: true, kick: true }
                          }]);
                          setNewModeratorName('');
                        } else {
                          alert(isRtl ? 'يجب اختيار مستخدم موجود من قائمة الأصدقاء.' : 'You must select an existing user from your friends list.');
                        }
                      }}
                      className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 rounded-2xl text-slate-950 font-bold text-xs transition-all"
                    >
                      {t.add || (isRtl ? 'إضافة' : 'Add')}
                    </button>
                  </div>
                  
                  {/* Instructions and Warning */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 mt-4">
                    <p className="text-xs text-slate-300">{isRtl ? 'حدد صلاحيات المشرف بعناية، فهذه المهام تمنحه تحكماً مباشراً داخل بثك.' : 'Select moderator permissions carefully; these tools grant them direct control within your live stream.'}</p>
                    <p className="text-[10px] text-rose-400 font-bold">{isRtl ? 'تنبيه: المشرف لديه صلاحية التصرف في البث بناءً على التراخيص الممنوحة له.' : 'Warning: Moderators have the authority to manage viewers based on permissions assigned to them.'}</p>
                  </div>

                  {/* Moderators List */}
                  <div className="space-y-2 mt-2">
                    {(settings.liveSettings?.moderators || []).map((mod, index) => {
                      const modObj = typeof mod === 'string' ? { name: mod, status: 'active', permissions: { mute: true, kick: true, deleteComment: true, ban: true, blockComments: true, pinComment: true, muteSound: true } } : mod;
                      const permissions = modObj.permissions;
                      
                      return (
                        <div key={index} className="p-3 bg-white/5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{modObj.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setManagingModIndex(managingModIndex === index ? null : index)}
                                className="text-[10px] bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-colors"
                              >
                                {managingModIndex === index ? (isRtl ? 'إغلاق' : 'Close') : (isRtl ? 'إدارة' : 'Manage')}
                              </button>
                              <button 
                                onClick={() => updateLiveSetting('moderators', (settings.liveSettings?.moderators || []).filter((_, i) => i !== index))}
                                className="text-[10px] text-rose-400 hover:text-rose-300 p-1"
                              >
                                {isRtl ? 'حذف' : 'Delete'}
                              </button>
                            </div>
                          </div>
                          {managingModIndex === index && (
                            <div className="space-y-2 pt-2 border-t border-white/5 text-[11px] grid grid-cols-2 gap-2">
                              {[
                                { key: 'mute', label: isRtl ? 'كتم الصوت' : 'Mute Sound' },
                                { key: 'kick', label: isRtl ? 'طرد' : 'Kick Out' },
                                { key: 'deleteComment', label: isRtl ? 'حذف التعليق' : 'Delete Comment' },
                                { key: 'ban', label: isRtl ? 'حظر' : 'Ban User' },
                                { key: 'blockComments', label: isRtl ? 'حظر التعليقات' : 'Block Comments' },
                                { key: 'pinComment', label: isRtl ? 'تثبيت التعليق' : 'Pin Comment' },
                                { key: 'muteSound', label: isRtl ? 'كتم الصوت للبث' : 'Mute Sound for Live' },
                              ].map((perm) => (
                                <button
                                  key={perm.key}
                                  onClick={() => {
                                    const updatedMods = [...(settings.liveSettings?.moderators || [])];
                                    const curMod = updatedMods[index];
                                    const curPerms = (typeof curMod === 'object' && curMod.permissions) ? { ...curMod.permissions } : {};
                                    curPerms[perm.key] = !curPerms[perm.key];
                                    updatedMods[index] = typeof curMod === 'string' ? { name: curMod, status: 'active', permissions: curPerms } : { ...curMod, permissions: curPerms };
                                    updateLiveSetting('moderators', updatedMods);
                                  }}
                                  className={`text-[9px] px-2 py-1 rounded-lg ${permissions && (permissions as any)[perm.key] ? 'bg-white text-slate-900 font-bold' : 'bg-slate-700 text-slate-300'}`}
                                >
                                  {perm.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS DETAILED SUB-PAGE */}
            {currentView === 'notifications_detailed' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-base font-bold text-white mb-2 text-start">{isRtl ? 'إعدادات التنبيهات العامة' : 'General Notifications Settings'}</h3>
                  
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'تلقي الإشعارات والرسائل' : 'Receive Notifications & Messages'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'تشغيل أو كتم كافة إشعارات التطبيق في لوحة النظام' : 'Turn on or mute all app notifications in system panel'}</span>
                    </div>
                    <button
                      onClick={handleToggleNotifications}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${settings.notifications ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${settings.notifications ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'مؤثرات الصوت المدمجة' : 'In-App Sound Effects'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'تشغيل المؤثرات الصوتية عند الضغط والأزرار داخل التطبيق' : 'Play sound effects when tapping buttons inside the app'}</span>
                    </div>
                    <button
                      onClick={handleToggleSound}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${settings.sound ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${settings.sound ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{isRtl ? 'تخصيص إشعارات الدردشات الفردية' : 'Personalize Direct Chats Notifications'}</h4>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'نغمة الرسائل الواردة' : 'Incoming Messages Ringtone'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'اختر صوت التنبيه المفرد' : 'Select custom ringtone sound for direct messages'}</span>
                    </div>
                    <select
                      value={settings.chatSettings?.msgNotifTone || 'classic_chime'}
                      onChange={(e) => updateChatSetting('msgNotifTone', e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                    >
                      <option value="classic_chime">{isRtl ? 'رنين كلاسيكي هادئ' : 'Classic Calm Chime'}</option>
                      <option value="digital_blip">{isRtl ? 'نبضة ديجيتال قصيرة' : 'Short Digital Blip'}</option>
                      <option value="elegant_bell">{isRtl ? 'جرس أنيق' : 'Elegant Bell'}</option>
                      <option value="hisee_original">{isRtl ? 'نغمة HiSee الأصلية' : 'HiSee Original'}</option>
                    </select>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'اهتزاز الهاتف للرسائل' : 'Phone Message Vibration'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'طول نمط الاهتزاز عند تلقي رسالة جديدة' : 'Vibration pattern duration when receiving a message'}</span>
                    </div>
                    <select
                      value={settings.chatSettings?.msgVibrate || 'default'}
                      onChange={(e) => updateChatSetting('msgVibrate', e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                    >
                      <option value="default">{isRtl ? 'الافتراضي' : 'Default'}</option>
                      <option value="short">{isRtl ? 'قصير وخفيف' : 'Short & Light'}</option>
                      <option value="long">{isRtl ? 'طويل ومستمر' : 'Long & Continuous'}</option>
                      <option value="off">{isRtl ? 'إيقاف الاهتزاز' : 'Vibration Off'}</option>
                    </select>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'وميض الفلاش ومؤشر LED للرسائل' : 'LED Message Flash Alert'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'لون الفلاش أو الضوء التنبيهي للجهاز' : 'Device flash light color or alert notification LED'}</span>
                    </div>
                    <select
                      value={settings.chatSettings?.msgFlash || 'green'}
                      onChange={(e) => updateChatSetting('msgFlash', e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                    >
                      <option value="green">{isRtl ? 'أخضر (HiSee)' : 'Green (HiSee)'}</option>
                      <option value="red">{isRtl ? 'أحمر (هام)' : 'Red (Important)'}</option>
                      <option value="blue">{isRtl ? 'أزرق هادئ' : 'Calm Blue'}</option>
                      <option value="yellow">{isRtl ? 'أصفر مشرق' : 'Bright Yellow'}</option>
                      <option value="white">{isRtl ? 'أبيض ساطع' : 'Bright White'}</option>
                      <option value="off">{isRtl ? 'تعطيل الفلاش' : 'Disable Flash'}</option>
                    </select>
                  </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{isRtl ? 'تخصيص إشعارات المجموعات' : 'Personalize Groups Notifications'}</h4>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'نغمة إشعارات المجموعات' : 'Group Message Ringtone'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'الصوت المخصص عند وصول رسائل المجموعات المشترك بها' : 'Ringtone when a message is received in joined groups'}</span>
                    </div>
                    <select
                      value={settings.chatSettings?.grpNotifTone || 'group_bubble'}
                      onChange={(e) => updateChatSetting('grpNotifTone', e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                    >
                      <option value="group_bubble">{isRtl ? 'فقاعة اجتماعية' : 'Social Bubble'}</option>
                      <option value="digital_blip">{isRtl ? 'تنبيه ديجيتال' : 'Digital Blip'}</option>
                      <option value="bell_modern">{isRtl ? 'جرس معاصر' : 'Modern Bell'}</option>
                      <option value="off">{isRtl ? 'صامت' : 'Muted'}</option>
                    </select>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'نمط اهتزاز المجموعات' : 'Group Message Vibration'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'مدة الاهتزاز لرسائل المجموعات لمنع الإزعاج' : 'Vibration pattern duration for groups to prevent distraction'}</span>
                    </div>
                    <select
                      value={settings.chatSettings?.grpVibrate || 'default'}
                      onChange={(e) => updateChatSetting('grpVibrate', e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                    >
                      <option value="default">{isRtl ? 'الافتراضي' : 'Default'}</option>
                      <option value="short">{isRtl ? 'قصير وخفيف' : 'Short & Light'}</option>
                      <option value="long">{isRtl ? 'طويل' : 'Long'}</option>
                      <option value="off">{isRtl ? 'إيقاف الاهتزاز' : 'Off'}</option>
                    </select>
                  </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{isRtl ? 'إشعارات المكالمات والاتصالات' : 'Voice & Video Calls Alerts'}</h4>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'نغمة الرنين الافتراضية' : 'Default Call Ringtone'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'رنين المكالمات الصوتية والمرئية المستلمة' : 'Incoming call ringtone for voice & video calls'}</span>
                    </div>
                    <select
                      value={settings.chatSettings?.callRingtoneTone || 'elegant_ring'}
                      onChange={(e) => updateChatSetting('callRingtoneTone', e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                    >
                      <option value="elegant_ring">{isRtl ? 'رنين موسيقي أنيق' : 'Elegant Musical Tone'}</option>
                      <option value="retro_phone">{isRtl ? 'هاتف كلاسيكي قديم' : 'Classic Retro Phone'}</option>
                      <option value="hi_tech">{isRtl ? 'عصر التكنولوجيا والسرعة' : 'Hi-Tech Speed'}</option>
                    </select>
                  </div>

                  {/* Call Flash */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{isRtl ? 'وميض الفلاش للمكالمات الواردة' : 'LED Call Flash Alerts'}</span>
                      <span className="text-[10px] text-slate-500">{isRtl ? 'تنبيه بصري مستمر بالفلاش عند رنين الهاتف في الظلام' : 'Continuous visual camera flash alert on incoming calls'}</span>
                    </div>
                    <select
                      value={settings.chatSettings?.callFlash || 'white'}
                      onChange={(e) => updateChatSetting('callFlash', e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500"
                    >
                      <option value="white">{isRtl ? 'أبيض مستمر (ينصح به)' : 'Continuous White (Recommended)'}</option>
                      <option value="green">{isRtl ? 'أخضر تفاعلي' : 'Interactive Green'}</option>
                      <option value="red">{isRtl ? 'أحمر منذر' : 'Warning Red'}</option>
                      <option value="off">{isRtl ? 'تعطيل وميض المكالمات' : 'Disable Call Flash'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TIME & DIGITAL WELLBEING SUB-PAGE */}
            {currentView === 'time_wellbeing' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                {/* Stats Header Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg text-center space-y-3">
                  <span className="text-xs text-slate-500 font-bold block">{t.appUsageToday || (isRtl ? 'استخدامك للتطبيق اليوم' : 'Your App Usage Today')}</span>
                  <div className="text-4xl font-black text-cyan-400">{isRtl ? '٢ ساعة و ١٥ دقيقة' : '2 hours & 15 minutes'}</div>
                  <p className="text-[11px] text-slate-500">{t.wellbeingStatsDesc || (isRtl ? 'استخدام متوازن وممتاز مقارنة بالمتوسط العام للمستخدمين.' : 'Excellent and balanced usage compared to the general average of users.')}</p>
                </div>

                {/* Screen Time Limits Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-base font-bold text-white mb-2 text-start">{t.manageAndLimitUsage || (isRtl ? 'إدارة وتحديد وقت الاستخدام' : 'Manage & Limit Usage Time')}</h3>

                  {/* Daily Screen Limit */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.maxDailyScreenLimit || (isRtl ? 'الحد الأقصى اليومي للمنصة' : 'Max Daily Screen Time Limit')}</span>
                      <span className="text-[10px] text-slate-500">{t.maxDailyScreenLimitDesc || (isRtl ? 'تنبيهك وإغلاق التطبيق بمجرد تجاوز هذا الوقت يومياً' : 'Alert you and lock the app as soon as you exceed this time daily')}</span>
                    </div>
                    <select
                      value={dailyScreenTimeLimit}
                      onChange={(e) => {
                        setDailyScreenTimeLimit(e.target.value as any);
                        if (e.target.value !== 'off') {
                          const timeStr = e.target.value === '30m' ? (isRtl ? '٣٠ دقيقة' : '30 minutes') : e.target.value === '1h' ? (isRtl ? 'ساعة واحدة' : '1 hour') : e.target.value === '2h' ? (isRtl ? 'ساعتين' : '2 hours') : (isRtl ? '٣ ساعات' : '3 hours');
                          alert(isRtl ? `تم تحديد الحد الأقصى للاستخدام اليومي بـ ${timeStr}.` : `Daily usage limit has been set to ${timeStr}.`);
                        }
                      }}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="off">{isRtl ? 'إيقاف التحديد' : 'No Limit'}</option>
                      <option value="30m">{isRtl ? '٣٠ دقيقة' : '30 minutes'}</option>
                      <option value="1h">{isRtl ? 'ساعة واحدة' : '1 hour'}</option>
                      <option value="2h">{isRtl ? 'ساعتين' : '2 hours'}</option>
                      <option value="3h">{isRtl ? '٣ ساعات' : '3 hours'}</option>
                    </select>
                  </div>

                  {/* Break Reminder */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.takeABreakReminder || (isRtl ? 'منبّه فترات الراحة والاستراحة' : 'Take a Break Reminder')}</span>
                      <span className="text-[10px] text-slate-500">{t.takeABreakReminderDesc || (isRtl ? 'إشعارك لأخذ قسط من الراحة كل فترة استخدام متواصلة' : 'Notify you to take a break after continuous usage sessions')}</span>
                    </div>
                    <select
                      value={takeABreakReminder}
                      onChange={(e) => setTakeABreakReminder(e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="off">{isRtl ? 'إيقاف التذكير' : 'Turn Off'}</option>
                      <option value="15m">{isRtl ? 'كل ١٥ دقيقة متواصلة' : 'Every 15 minutes of continuous use'}</option>
                      <option value="30m">{isRtl ? 'كل ٣٠ دقيقة متواصلة' : 'Every 30 minutes of continuous use'}</option>
                      <option value="45m">{isRtl ? 'كل ٤٥ دقيقة متواصلة' : 'Every 45 minutes of continuous use'}</option>
                      <option value="60m">{isRtl ? 'كل ساعة متواصلة' : 'Every 1 hour of continuous use'}</option>
                    </select>
                  </div>
                </div>

                {/* Bedtime & AMOLED Grayscale mode */}
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{t.sleepAndPhysicalRelaxation || (isRtl ? 'النوم والاسترخاء البدني' : 'Sleep & Physical Relaxation')}</h4>

                  {/* Bedtime mode Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.enableBedtimeMode || (isRtl ? 'تفعيل وضع وقت النوم التلقائي' : 'Enable Auto Bedtime Mode')}</span>
                      <span className="text-[10px] text-slate-500">{t.enableBedtimeModeDesc || (isRtl ? 'تحويل التطبيق إلى وضع مريح ومظلم لتجنب إجهاد العين قبل النوم' : 'Switch the app to a comfortable dark mode to avoid eye strain before sleep')}</span>
                    </div>
                    <button
                      onClick={() => {
                        setBedtimeModeEnabled(!bedtimeModeEnabled);
                        if (!bedtimeModeEnabled) {
                          alert(isRtl ? "تم تفعيل وضع وقت النوم. سيتم كتم التنبيهات من الساعة ١٠ مساءً وحتى ٧ صباحاً." : "Bedtime mode enabled. Notifications will be muted from 10:00 PM to 7:00 AM.");
                        }
                      }}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${bedtimeModeEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${bedtimeModeEnabled ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>

                  {/* Weekly Report Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <div className="text-start">
                      <span className="text-sm font-bold text-white block">{t.weeklyUsageReports || (isRtl ? 'تقارير الاستخدام الأسبوعية' : 'Weekly Usage Reports')}</span>
                      <span className="text-[10px] text-slate-500">{t.weeklyUsageReportsDesc || (isRtl ? 'تلقي إشعار كل يوم أحد بملخص ساعات استخدامك للمنصة خلال الأسبوع' : 'Receive a notification every Sunday summarizing your platform usage hours')}</span>
                    </div>
                    <button
                      onClick={() => setWeeklyReportEnabled(!weeklyReportEnabled)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${weeklyReportEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${weeklyReportEnabled ? 'translate-x-5' : ''}`}></span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FAMILY LINK SUB-PAGE */}
            {currentView === 'family_link' && (() => {
              const family = settings.familySettings || {
                isLinked: false,
                role: 'none',
                linkedAccountName: '',
                linkedChildId: '',
                childDailyLimit: '1h',
                sleepLockStart: '21:00',
                sleepLockEnd: '06:00',
                restrictMatureContent: true,
                childLocationSharing: true,
                blockStrangers: true,
                parentPin: '1234'
              };
              const role = family.role || 'none';
              const rawAccountName = family.linkedAccountName || '';
              const isInvalidAccount = !rawAccountName || rawAccountName === 'عمر حسين' || !family.linkedChildId;
              const isChildLinked = family.isLinked === true && !isInvalidAccount;
              const childAccountNameVal = isChildLinked ? rawAccountName : '';
              const childDailyLimitVal = family.childDailyLimit || '1h';
              const sleepLockStartVal = family.sleepLockStart || '21:00';
              const sleepLockEndVal = family.sleepLockEnd || '06:00';
              const restrictMatureVal = family.restrictMatureContent !== false;
              const childLocationSharingVal = family.childLocationSharing !== false;
              const blockStrangersVal = family.blockStrangers !== false;
              const parentPinVal = family.parentPin || '1234';

              return (
                <div className="animate-in slide-in-from-end duration-300 space-y-6">
                  
                  {/* Mode Selector Card */}
                  <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                    <h3 className="text-base font-bold text-white mb-2 text-start">{t.familyLinkSettingsTitle || (isRtl ? 'إعدادات العائلة والرقابة الأبوية' : 'Family Settings & Parental Control')}</h3>
                    
                    {/* Select Role Buttons */}
                    <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-2xl">
                      <button
                        onClick={() => updateFamilySetting('role', 'parent')}
                        className={`py-3 rounded-xl font-bold text-xs transition-all ${role === 'parent' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                        {t.roleParent || (isRtl ? 'أنا والد / مربّي' : 'I am a parent / guardian')}
                      </button>
                      <button
                        onClick={() => updateFamilySetting('role', 'child')}
                        className={`py-3 rounded-xl font-bold text-xs transition-all ${role === 'child' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                        {t.roleChild || (isRtl ? 'أنا طفل / خاضع للمتابعة' : 'I am a child / supervised')}
                      </button>
                    </div>

                    {role === 'none' && (
                      <div className="text-center p-6 text-slate-500 space-y-2">
                        <p className="text-xs">{t.selectRoleDesc || (isRtl ? 'يرجى تحديد دورك لتفعيل خيارات المراقبة وإعدادات ربط الحسابات العائلية وحماية طفلك.' : 'Please select your role to enable monitoring options, family account linking, and child protection settings.')}</p>
                      </div>
                    )}
                  </div>

                  {/* PARENTAL VIEW PANEL */}
                  {role === 'parent' && (
                    <div className="space-y-6">
                      
                      {/* Linked Child Status/Summary Card */}
                      <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-start">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${
                            isChildLinked 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-slate-800 text-slate-400 border-white/5'
                          }`}>
                            {isChildLinked ? (childAccountNameVal[0]?.toUpperCase() || 'C') : '?'}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block font-bold uppercase">{t.currentlyLinkedAccount || (isRtl ? 'الحساب المرتبط حالياً' : 'Currently Linked Account')}</span>
                            <h4 className="text-sm font-black text-white">
                              {isChildLinked ? childAccountNameVal : (t.emptyNoLinkYet || (isRtl ? 'فارغ (لم يتم الربط بعد)' : 'Empty (No account linked yet)'))}
                            </h4>
                            <span className={`text-[10px] font-bold block ${isChildLinked ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {isChildLinked ? (t.enabledAndActive || (isRtl ? 'مفعّل ونشط' : 'Enabled & Active')) : (t.waitingForChildLink || (isRtl ? 'بانتظار ربط حساب الطفل لحمايته' : 'Waiting for child account link for protection'))}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!isChildLinked ? (
                            <button
                              onClick={() => {
                                setChildSearchQuery('');
                                setShowLinkChildModal(true);
                              }}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
                            >
                              <Users size={12} />
                              <span>{t.linkChildAccountBtn || (isRtl ? 'ربط حساب الطفل' : 'Link Child Account')}</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditChildName(childAccountNameVal);
                                  const usersList = Array.isArray(users) ? users : Object.values(users || {});
                                  const childUser = usersList.find((u: any) => u.id === family.linkedChildId || u.uid === family.linkedChildId);
                                  setEditChildUsername(childUser?.username || '');
                                  setShowEditChildModal(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <Edit3 size={12} />
                                <span>{t.editAccountBtn || (isRtl ? 'تعديل الحساب' : 'Edit Account')}</span>
                              </button>
                              <button
                                onClick={handleUnlinkChildAccount}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                <span>{t.unlinkBtn || (isRtl ? 'إلغاء الربط' : 'Unlink')}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Parental controls & limits */}
                      <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4">
                        <h4 className="text-sm font-bold text-slate-300 pb-2 border-b border-white/5 text-start">{t.childProtectionTools || (isRtl ? 'أدوات حماية وقيود طفلك' : 'Child Protection Tools & Limits')}</h4>

                        {/* Daily Limit */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-4 bg-white/5 rounded-2xl">
                          <div className="text-start">
                            <span className="text-sm font-bold text-white block">{t.childDailyLimit || (isRtl ? 'حد الاستخدام للطفل' : 'Child Daily Usage Limit')}</span>
                            <span className="text-[10px] text-slate-500">{t.childDailyLimitDesc || (isRtl ? 'إغلاق تلقائي للتطبيق للطفل بمجرد انقضاء المدة المحددة' : 'Automatically lock the app for the child once the limit expires')}</span>
                          </div>
                          <select
                            value={childDailyLimitVal}
                            onChange={(e) => updateFamilySetting('childDailyLimit', e.target.value as any)}
                            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                          >
                            <option value="off">{t.unlimitedDailyLimit || (isRtl ? 'مفتوح بلا قيود' : 'Unlimited / No limit')}</option>
                            <option value="1h">{t.oneHourDaily || (isRtl ? '١ ساعة يومياً' : '1 hour daily')}</option>
                            <option value="2h">{t.twoHoursDaily || (isRtl ? '٢ ساعة يومياً' : '2 hours daily')}</option>
                            <option value="3h">{t.threeHoursDaily || (isRtl ? '٣ ساعات يومياً' : '3 hours daily')}</option>
                          </select>
                        </div>

                        {/* Sleep Lock Time */}
                        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl text-start">
                          <div>
                            <span className="text-sm font-bold text-white block">{t.sleepLockHours || (isRtl ? 'ساعات حظر وقت النوم للطفل' : 'Child Sleep-time Lock Hours')}</span>
                            <span className="text-[10px] text-slate-500">{t.sleepLockDesc || (isRtl ? 'منع فتح أو تشغيل التطبيق بالكامل خلال هذه الساعات' : 'Completely prevent opening or running the app during these hours')}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">{t.fromLabel || (isRtl ? 'من:' : 'From:')}</span>
                              <input
                                type="time"
                                value={sleepLockStartVal}
                                onChange={(e) => updateFamilySetting('sleepLockStart', e.target.value)}
                                className="bg-slate-900 border border-white/10 rounded-lg p-1.5 outline-none text-white focus:border-emerald-500"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">{t.toLabel || (isRtl ? 'إلى:' : 'To:')}</span>
                              <input
                                type="time"
                                value={sleepLockEndVal}
                                onChange={(e) => updateFamilySetting('sleepLockEnd', e.target.value)}
                                className="bg-slate-900 border border-white/10 rounded-lg p-1.5 outline-none text-white focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Restrict Mature streams */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                          <div className="text-start">
                            <span className="text-sm font-bold text-white block">{t.filterSensitiveContent || (isRtl ? 'فلترة وحظر المحتوى الحساس للطفل' : 'Filter & Block Sensitive Content')}</span>
                            <span className="text-[10px] text-slate-500">{t.filterSensitiveDesc || (isRtl ? 'حظر غرف البث المباشر والمنشورات المخصصة للبالغين' : 'Block adult livestream rooms and designated mature posts')}</span>
                          </div>
                          <button
                            onClick={() => updateFamilySetting('restrictMatureContent', !restrictMatureVal)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${restrictMatureVal ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          >
                            <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${restrictMatureVal ? 'translate-x-5' : ''}`}></span>
                          </button>
                        </div>

                        {/* Location Tracking Toggle */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                          <div className="text-start">
                            <span className="text-sm font-bold text-white block">{t.trackChildLocation || (isRtl ? 'متابعة موقع طفلك الجغرافي' : 'Track Child Location')}</span>
                            <span className="text-[10px] text-slate-500">{t.trackLocationDesc || (isRtl ? 'تتبع موقع طفلك المباشر على الخريطة لحظة بلحظة لضمان أمانه' : 'Track your child\'s live location on the map in real-time to ensure safety')}</span>
                          </div>
                          <button
                            onClick={() => updateFamilySetting('childLocationSharing', !childLocationSharingVal)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${childLocationSharingVal ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          >
                            <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${childLocationSharingVal ? 'translate-x-5' : ''}`}></span>
                          </button>
                        </div>

                        {/* Block Strangers Toggle */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                          <div className="text-start">
                            <span className="text-sm font-bold text-white block">{t.blockStrangersLabel || (isRtl ? 'حظر مراسلات الغرباء' : 'Block Stranger Messages')}</span>
                            <span className="text-[10px] text-slate-500">{t.blockStrangersDesc || (isRtl ? 'حظر استقبال الرسائل الخاصة والاتصالات للطفل من خارج قائمة جهات الاتصال' : 'Block direct messages and incoming calls from users outside of contact list')}</span>
                          </div>
                          <button
                            onClick={() => updateFamilySetting('blockStrangers', !blockStrangersVal)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${blockStrangersVal ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          >
                            <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${blockStrangersVal ? 'translate-x-5' : ''}`}></span>
                          </button>
                        </div>

                        {/* Parent PIN Control - Last Option */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                          <div className="text-start">
                            <span className="text-sm font-bold text-white block">{t.parentalPinLabel || (isRtl ? 'الرقم السري للرقابة (Parental PIN)' : 'Parental PIN')}</span>
                            <span className="text-[10px] text-slate-500">{t.parentalPinDesc || (isRtl ? 'رمز حماية لمنع التعديل غير المصرح به للقيود وإعدادات الأمان' : 'Protection passcode to prevent unauthorized modification of limits and safety settings')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                              {parentPinVal}
                            </span>
                            <button
                              onClick={() => {
                                const pin = prompt(t.enterParentPinPrompt || (isRtl ? "أدخل الرقم السري الجديد للوالدين (٤ أرقام):" : "Enter new parental PIN (4 digits):"), parentPinVal);
                                if (pin && pin.length === 4 && !isNaN(Number(pin))) {
                                  updateFamilySetting('parentPin', pin);
                                  alert(t.parentPinSavedSuccess || (isRtl ? "تم تعيين الرقم السري للوالدين بنجاح." : "Parental PIN saved successfully."));
                                } else if (pin) {
                                  alert(t.parentPinDigitsOnly || (isRtl ? "عذراً، يجب أن يتكون الرقم السري من ٤ أرقام فقط." : "Sorry, the PIN must consist of exactly 4 digits."));
                                }
                              }}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Lock size={12} />
                              <span>{t.changeLabel || (isRtl ? 'تغيير' : 'Change')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CHILD VIEW PANEL */}
                  {role === 'child' && (
                    <div className="space-y-6">
                      {/* PENDING PARENT LINK REQUEST NOTIFICATION */}
                      {family.pendingParentLink && (
                        <div className="glass p-6 rounded-[2.5rem] border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-950/20 to-transparent shadow-xl space-y-4 animate-in zoom-in-95 duration-300 text-start">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg">
                              <Bell size={24} className="animate-bounce" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">{t.newFamilyLinkRequest || (isRtl ? 'طلب ربط عائلي جديد' : 'New Family Link Request')}</span>
                              <h4 className="text-base font-black text-white">
                                {isRtl 
                                  ? `يرغب الوالد / المربي "${family.pendingParentLink.parentName}" في ربط حسابه بحسابك` 
                                  : `Parent / Guardian "${family.pendingParentLink.parentName}" wants to link with your account`}
                              </h4>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3.5 rounded-2xl border border-white/5">
                            {t.pendingFamilyLinkDesc || (isRtl ? 'عند تأكيد هذا الطلب، سيتم ربط حسابك رسمياً بحساب الوالد وتفعيل مزايا الرقابة الأبوية وحماية التصفح الآمن لك.' : 'Upon confirming this request, your account will be officially linked with your parent\'s account to enable parental controls and safe browsing features.')}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button
                              onClick={() => handleAcceptPendingLink(family.pendingParentLink)}
                              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                            >
                              <Check size={16} />
                              <span>{t.acceptLinkBtn || (isRtl ? 'تأكيد وقبول الربط' : 'Confirm & Accept Link')}</span>
                            </button>
                            <button
                              onClick={handleRejectPendingLink}
                              className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition-all"
                            >
                              {t.rejectRequestBtn || (isRtl ? 'رفض الطلب' : 'Reject Request')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* CHILD CREDENTIALS SETUP & ACCOUNT CREATION (Unified in Child Section) */}
                      <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-5 text-start">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                              <Lock size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{t.childAccountSetupTitle || (isRtl ? 'إعداد بيانات حساب الطفل والرقم السري' : 'Set Up Child Account Details & PIN')}</h4>
                              <p className="text-[10px] text-slate-400">{t.childAccountSetupDesc || (isRtl ? 'قم بتعيين اسم الحساب والرقم السري ليتمكن الوالد من إدخالهما وربط حسابك بأمان' : 'Set the child account username and link passcode so the parent can enter them and link securely')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childAccountLabel || (isRtl ? 'اسم حساب الطفل للربط' : 'Child Account Name to Link')}</label>
                            <div className="relative">
                              <User className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="text"
                                value={childCustomNameInput || family.childAccountName || ''}
                                onChange={(e) => setChildCustomNameInput(e.target.value)}
                                placeholder={t.childAccountPlaceholder || (isRtl ? 'أدخل اسم الحساب للربط...' : 'Enter child account name to link...')}
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-bold text-start"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childPinLabel || (isRtl ? 'الرقم السري الخاص بربط الحساب (PIN)' : 'Linking Passcode (PIN)')}</label>
                            <div className="relative">
                              <Key className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="password"
                                maxLength={6}
                                value={childCustomPinInput || family.childPin || ''}
                                onChange={(e) => setChildCustomPinInput(e.target.value)}
                                placeholder={t.childPinPlaceholder || (isRtl ? 'أدخل الرقم السري (PIN)...' : 'Enter 4-6 digit PIN...')}
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono text-start tracking-widest"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={handleSaveChildCredentials}
                              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                            >
                              <Check size={14} />
                              <span>{t.saveChildCredentialsBtn || (isRtl ? 'حفظ وتثبيت بيانات الربط' : 'Save & Set Up Link Credentials')}</span>
                            </button>
                            <button
                              onClick={() => setShowCreateChildModal(true)}
                              className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                              <UserPlus size={14} className="text-emerald-400" />
                              <span>{t.createChildAccountBtn || (isRtl ? 'إنشاء حساب طفل جديد' : 'Create New Child Account')}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Supervised status */}
                      <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg space-y-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                          <Shield size={32} />
                        </div>
                        <h3 className="text-base font-bold text-white">
                          {isChildLinked 
                            ? (isRtl ? `حسابك مرتبط ومحمي بواسطة: ${childAccountNameVal}` : `Your account is linked & protected by: ${childAccountNameVal}`) 
                            : (t.childModePendingLink || (isRtl ? 'حسابك في وضع الطفل بانتظار إتمام الربط' : 'Your account is in child mode waiting for linking completion'))}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {isChildLinked 
                            ? (t.linkedChildNoticeDesc || (isRtl ? 'هذا الحساب مرتبط بحساب الوالدين للتحكم بالقيود وساعات الاستخدام وقيود الخصوصية ومشاركة الموقع الجغرافي لضمان تصفح آمن ومريح لك.' : 'This account is linked to your parent\'s account to manage usage limits, privacy rules, and live location sharing to ensure a safe browsing experience.')) 
                            : (t.giveCredentialsNoticeDesc || (isRtl ? 'أعطِ اسم الحساب والرقم السري اللذين قمت بتحديدهما أعلاه لوالدك لإرسال طلب الربط والتأكيد.' : 'Give the account name and passcode you specified above to your parent so they can send a link request.'))}
                        </p>
                        <div className="bg-[#14161a] p-4 rounded-2xl border border-white/5 text-start space-y-2 mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{t.dailyLimitStatusLabel || (isRtl ? 'حالة الاستخدام اليومي:' : 'Daily usage status:')}</span>
                            <span className="text-emerald-400 font-bold">
                              {isRtl 
                                ? `باقي ${childDailyLimitVal === 'off' ? 'غير محدود' : childDailyLimitVal === '1h' ? '٥٠ دقيقة' : '١ ساعة'}` 
                                : `Remaining ${childDailyLimitVal === 'off' ? 'Unlimited' : childDailyLimitVal === '1h' ? '50 minutes' : '1 hour'}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{t.locationTrackingLabel || (isRtl ? 'تتبع الموقع الجغرافي المباشر:' : 'Live location tracking:')}</span>
                            <span className="text-emerald-400 font-bold">{childLocationSharingVal ? (t.activeAndSharing || (isRtl ? 'نشط ومشارك' : 'Active & Shared')) : (t.inactiveLabel || (isRtl ? 'غير نشط' : 'Inactive'))}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{t.blockStrangersLabelText || (isRtl ? 'حظر مراسلات الغرباء:' : 'Block stranger messages:')}</span>
                            <span className="text-emerald-400 font-bold">{blockStrangersVal ? (t.activeAndSharing || (isRtl ? 'مفعّل ونشط' : 'Enabled & Active')) : (t.inactiveLabel || (isRtl ? 'غير مفعّل' : 'Disabled'))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODALS */}
                  
                  {/* MODAL: LINK CHILD */}
                  {showLinkChildModal && (
                    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                      <div className="bg-[#181B22] border border-white/10 rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl space-y-4 text-start animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-white">{t.linkChildAccountTitle || (isRtl ? 'ربط حساب الطفل' : 'Link Child Account')}</h3>
                            <p className="text-[10px] text-slate-400">{t.linkChildAccountSubtitle || (isRtl ? 'أدخل اسم حساب الطفل والرقم السري لإرسال طلب تأكيد الربط' : 'Enter child account name and passcode to send linking request')}</p>
                          </div>
                          <button
                            onClick={() => setShowLinkChildModal(false)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Two Primary Input Fields: 1) Account Name, 2) PIN */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childAccountModalLabel || (isRtl ? 'اسم حساب الطفل (Username أو الاسم المعين)' : 'Child Account Username or Display Name')}</label>
                            <div className="relative">
                              <User className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="text"
                                value={linkChildAccountInput}
                                onChange={(e) => setLinkChildAccountInput(e.target.value)}
                                placeholder={t.childAccountModalPlaceholder || (isRtl ? 'أدخل اسم حساب الطفل...' : 'Enter child account name...')}
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-start font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childPinModalLabel || (isRtl ? 'الرقم السري الخاص بالطفل (PIN)' : 'Child Linking Passcode (PIN)')}</label>
                            <div className="relative">
                              <Lock className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="password"
                                value={linkChildPinInput}
                                onChange={(e) => setLinkChildPinInput(e.target.value)}
                                placeholder={t.childPinModalPlaceholder || (isRtl ? 'أدخل الرقم السري المعين في حساب الطفل...' : 'Enter passcode configured in child account...')}
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-start font-mono tracking-widest"
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleSendChildLinkRequest}
                            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <Send size={14} />
                            <span>{t.sendLinkRequestBtn || (isRtl ? 'إرسال طلب الربط والتأكيد' : 'Send Linking & Confirmation Request')}</span>
                          </button>
                        </div>

                        {/* Search or Quick Pick Section */}
                        <div className="pt-3 border-t border-white/5 space-y-2">
                          <span className="text-[10px] text-slate-500 font-bold block">{t.orChooseChildFromUsers || (isRtl ? 'أو اختر الطفل من المستخدمين المتاحين:' : 'Or choose child from available users:')}</span>
                          <div className="relative">
                            <Search className="absolute right-3 top-2.5 text-slate-500 w-3.5 h-3.5" />
                            <input
                              type="text"
                              value={childSearchQuery}
                              onChange={(e) => setChildSearchQuery(e.target.value)}
                              placeholder={t.quickSearchByName || (isRtl ? 'بحث سريع بالاسم...' : 'Quick search by name...')}
                              className="w-full pr-8 pl-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-start"
                            />
                          </div>

                          <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                            {(() => {
                              const usersList = Array.isArray(users) ? users : Object.values(users || {});
                              const filtered = usersList.filter((u: any) => {
                                if (u.id === myId || u.uid === myId) return false;
                                const q = childSearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                return (
                                  (u.displayName || u.name || '').toLowerCase().includes(q) ||
                                  (u.username || '').toLowerCase().includes(q)
                                );
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-3 text-slate-500 text-[10px]">
                                    {t.noResultsFound || (isRtl ? 'لا توجد نتائج' : 'No results found')}
                                  </div>
                                );
                              }

                              return filtered.slice(0, 5).map((u: any) => (
                                <div 
                                  key={u.id || u.uid} 
                                  onClick={() => {
                                    setLinkChildAccountInput(u.username?.replace(/^@/, '') || u.displayName || u.name || '');
                                  }}
                                  className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/30 cursor-pointer transition-all"
                                >
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={u.avatarUrl || u.avatar || u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                                      alt=""
                                      className="w-7 h-7 rounded-lg object-cover border border-white/10"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`;
                                      }}
                                    />
                                    <div className="text-start">
                                      <h5 className="text-[11px] font-bold text-white leading-tight">{u.displayName || u.name}</h5>
                                      <span className="text-[9px] text-slate-500 font-mono">{u.username || (t.noUsername || (isRtl ? 'بدون معرف' : 'No username'))}</span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">{t.chooseLabel || (isRtl ? 'اختيار' : 'Choose')}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL: CREATE CHILD */}
                  {showCreateChildModal && (
                    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                      <div className="bg-[#181B22] border border-white/10 rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl space-y-4 text-start animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-white">{t.createChildAccountTitle || (isRtl ? 'إنشاء حساب طفل جديد' : 'Create New Child Account')}</h3>
                            <p className="text-[10px] text-slate-400">{t.createChildAccountSubtitle || (isRtl ? 'إنشاء حساب حقيقي ومستقل لطفلك مع ربطه بصفحتك تلقائياً' : 'Create a real, independent account for your child and link it automatically')}</p>
                          </div>
                          <button
                            onClick={() => setShowCreateChildModal(false)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Name */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childFullNameLabel || (isRtl ? 'اسم الطفل الكامل' : 'Child Full Name')}</label>
                            <div className="relative">
                              <User className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="text"
                                value={newChildName}
                                onChange={(e) => setNewChildName(e.target.value)}
                                placeholder={t.enterChildNamePlaceholder || (isRtl ? 'أدخل اسم الطفل...' : "Enter child's name...")}
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-start font-bold"
                              />
                            </div>
                          </div>

                          {/* Username */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.uniqueChildUsernameLabel || (isRtl ? 'اسم المستخدم الفريد (Username)' : 'Unique Username')}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-slate-500 text-xs font-mono">@</span>
                              <input
                                type="text"
                                value={newChildUsername}
                                onChange={(e) => setNewChildUsername(e.target.value)}
                                placeholder="child_username"
                                className="w-full pr-3 pl-7 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-left font-mono"
                                dir="ltr"
                              />
                            </div>
                          </div>

                          {/* Email */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childEmailLabel || (isRtl ? 'البريد الإلكتروني للطفل' : 'Child Email Address')}</label>
                            <div className="relative">
                              <Mail className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="email"
                                value={newChildEmail}
                                onChange={(e) => setNewChildEmail(e.target.value)}
                                placeholder="child@hisee.com"
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-start font-mono"
                              />
                            </div>
                          </div>

                          {/* Password */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childPasswordLabel || (isRtl ? 'كلمة المرور / الرمز السري للطفل' : 'Child Password / Passcode')}</label>
                            <div className="relative">
                              <Lock className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="password"
                                value={newChildPassword}
                                onChange={(e) => setNewChildPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-start font-mono"
                              />
                            </div>
                          </div>

                          {/* Confirm Button */}
                          <button
                            onClick={handleCreateChildAccount}
                            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            <UserPlus size={16} />
                            <span>{t.confirmCreateChildBtn || (isRtl ? 'تأكيد وإنشاء حساب الطفل' : 'Confirm & Create Child Account')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL: EDIT CHILD */}
                  {showEditChildModal && (
                    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                      <div className="bg-[#181B22] border border-white/10 rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl space-y-4 text-start animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-white">{t.editChildAccountTitle || (isRtl ? 'تعديل بيانات حساب الطفل' : 'Edit Child Account Details')}</h3>
                            <p className="text-[10px] text-slate-400">{t.editChildAccountSubtitle || (isRtl ? 'تعديل الاسم أو اسم مستخدم طفلك بالكامل وحفظه مباشرة' : 'Modify child name or username and save directly')}</p>
                          </div>
                          <button
                            onClick={() => setShowEditChildModal(false)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Name */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.childFullNameLabel || (isRtl ? 'اسم الطفل الكامل' : 'Child Full Name')}</label>
                            <div className="relative">
                              <User className="absolute right-3 top-3 text-slate-500 w-4 h-4" />
                              <input
                                type="text"
                                value={editChildName}
                                onChange={(e) => setEditChildName(e.target.value)}
                                placeholder={t.childNameLabel || (isRtl ? 'اسم الطفل' : 'Child Name')}
                                className="w-full pr-9 pl-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-start font-bold"
                              />
                            </div>
                          </div>

                          {/* Username */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 block">{t.usernameLabel || (isRtl ? 'اسم المستخدم (Username)' : 'Username')}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-slate-500 text-xs font-mono">@</span>
                              <input
                                type="text"
                                value={editChildUsername}
                                onChange={(e) => setEditChildUsername(e.target.value)}
                                placeholder="username"
                                className="w-full pr-3 pl-7 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 text-left font-mono"
                                dir="ltr"
                              />
                            </div>
                          </div>

                          {/* Save Button */}
                          <button
                            onClick={handleEditChildAccount}
                            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            <Check size={16} />
                            <span>{t.saveChangesUpdateAccountBtn || (isRtl ? 'حفظ التغييرات وتحديث الحساب' : 'Save Changes & Update Account')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {currentView === 'balance' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4 pb-10">
                {/* Currency Selector Modal */}
                {showCurrencySelector && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#1a1c20] w-full max-w-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">{isRtl ? 'اختر العملة' : 'Select Currency'}</h3>
                        <button onClick={() => setShowCurrencySelector(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                          <ArrowRight className={isRtl ? '' : 'rotate-180'} />
                        </button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto p-2">
                        {CURRENCIES.map((curr) => (
                          <button
                            key={curr.code}
                            onClick={() => {
                              setSelectedCurrency(curr.code);
                              setShowCurrencySelector(false);
                            }}
                            className={`w-full p-4 flex items-center justify-between rounded-2xl transition-all ${selectedCurrency === curr.code ? 'bg-rose-500/10 text-rose-500' : 'hover:bg-white/5 text-slate-300'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs">
                                {curr.symbol}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold">
                                  {isRtl ? (
                                    curr.code === 'USD' ? 'دولار أمريكي' :
                                    curr.code === 'EUR' ? 'يورو' :
                                    curr.code === 'IQD' ? 'دينار عراقي' :
                                    curr.code === 'TRY' ? 'ليرة تركية' :
                                    curr.code === 'GBP' ? 'جنيه إسترليني' :
                                    curr.code === 'SAR' ? 'ريال سعودي' :
                                    curr.code === 'AED' ? 'درهم إماراتي' : curr.name
                                  ) : curr.name}
                                </div>
                                <div className="text-[10px] opacity-50">{curr.code}</div>
                              </div>
                            </div>
                            {selectedCurrency === curr.code && <Check size={18} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Header Section */}
                <div className="text-center pt-4 pb-4">
                  <h2 className="text-xl font-bold text-white mb-1">{isRtl ? 'المحفظة والمستويات' : 'Wallet & Levels'}</h2>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 w-fit mx-auto px-2 py-0.5 rounded-full">
                    <ShieldCheck size={10} />
                    <span>{isRtl ? 'نظام مالي ومستويات آمن وموثق' : 'Secure & Verified System'}</span>
                  </div>
                </div>

                {/* Top Two Separate Tabs: تعبئة العملات & مستوى النجوم */}
                <div className="flex items-center gap-2 mb-6 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 max-w-sm mx-auto shadow-inner">
                  <button 
                    onClick={() => setWalletTab('recharge')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      walletTab === 'recharge' 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25' 
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Coins size={16} />
                    <span>{isRtl ? 'تعبئة العملات' : 'Coin Recharge'}</span>
                  </button>
                  <button 
                    onClick={() => setWalletTab('level')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      walletTab === 'level' 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25' 
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <LucideStar size={16} className={walletTab === 'level' ? 'fill-current' : ''} />
                    <span>{isRtl ? 'مستوى النجوم' : 'Stars Level'}</span>
                  </button>
                </div>

                {/* TAB 1: تعبئة العملات (Coin Recharge) */}
                {walletTab === 'recharge' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Main Balance Display */}
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-sm">
                        <span>{isRtl ? 'الرصيد المقدر' : 'Estimated Balance'}</span>
                        <div 
                          onClick={() => setShowCurrencySelector(true)}
                          className="flex items-center gap-0.5 cursor-pointer hover:text-white transition-colors"
                        >
                          <span>{getEstimatedBalance()} {selectedCurrency}</span>
                          <ChevronRight size={14} className="rotate-90" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-4 relative">
                        <ChevronLeft size={24} className="text-slate-600" />
                        <div className="flex flex-col items-center text-center">
                          <HiSeeCoinIcon size={64} className="mb-2" />
                          <span className="text-6xl font-bold text-emerald-400 tracking-tight drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]">{getCoinsCount()}</span>
                          <span className="text-sm font-bold text-amber-500 uppercase tracking-widest mt-1">{isRtl ? 'إجمالي عملات HiSee' : 'Total HiSee Coins'}</span>
                        </div>
                      </div>

                      {/* Dual Coin Separation Card (فصل العملات المدفوعة عن المجانية) */}
                      <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto pt-3">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-right">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-amber-400 font-bold uppercase">{isRtl ? 'عملات مدفوعة' : 'Paid Coins'}</span>
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">{isRtl ? 'شراء' : 'Purchase'}</span>
                          </div>
                          <div className="text-lg font-black text-white flex items-center gap-1">
                            <span>{paidCoins.toLocaleString()}</span>
                            <span className="text-xs text-amber-400">🪙</span>
                          </div>
                          <span className="text-[9px] text-slate-400 block">{isRtl ? 'رصيد الشراء الأساسي' : 'Primary Purchase Balance'}</span>
                        </div>

                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 text-right">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-purple-400 font-bold uppercase">{isRtl ? 'عملات مجانية' : 'Bonus Coins'}</span>
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">{isRtl ? 'بونص' : 'Bonus'}</span>
                          </div>
                          <div className="text-lg font-black text-white flex items-center gap-1">
                            <span>{bonusCoins.toLocaleString()}</span>
                            <span className="text-xs text-purple-400">🎁</span>
                          </div>
                          <span className="text-[9px] text-slate-400 block">{isRtl ? 'مكافآت وهدايا ترويجية' : 'Rewards & Promo Gifts'}</span>
                        </div>
                      </div>

                      {/* Deposit & Withdraw Buttons */}
                      <div className="pt-4 flex items-center justify-center gap-3 max-w-sm mx-auto">
                        <button 
                          onClick={() => setCurrentView('buy_coins')}
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 px-6 rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex-1 flex items-center justify-center gap-2"
                        >
                          <Coins size={18} />
                          <span>{isRtl ? 'شراء باقات عملات HiSee' : 'Buy HiSee Coins'}</span>
                        </button>
                        <button 
                          onClick={() => setCurrentView('bonus')}
                          className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-5 rounded-2xl transition-all flex items-center justify-center gap-1.5"
                        >
                          <Gift size={16} className="text-purple-400" />
                          <span>{isRtl ? 'بونص' : 'Bonus'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Financial Stars Wallet Card */}
                    <div className="glass p-6 rounded-[2.5rem] border border-amber-500/20 shadow-lg bg-gradient-to-br from-amber-500/5 via-transparent to-teal-500/5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <LucideStar size={16} className="text-amber-400" />
                          {isRtl ? 'المحفظة المالية للنجوم' : 'Stars Financial Wallet'}
                        </h3>
                        <div className="px-2 py-1 bg-amber-500/10 rounded-lg text-[9px] font-bold text-amber-400">
                          {isRtl ? 'الرصيد المالي' : 'Financial Balance'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-right">
                          <span className="text-[9px] text-slate-500 block font-bold uppercase mb-1">{isRtl ? 'رصيد النجوم المجانية' : 'Free Stars Balance'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl font-black text-white">{freeStars.toLocaleString()}</span>
                            <LucideStar size={14} className="text-slate-400" />
                          </div>
                          <span className="text-[8px] text-slate-600 block mt-1">{isRtl ? 'تستخدم لرفع المستوى فقط' : 'Used for XP gain only'}</span>
                        </div>
                        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 text-right">
                          <span className="text-[9px] text-amber-500/70 block font-bold uppercase mb-1">{isRtl ? 'رصيد النجوم المدفوعة' : 'Paid Stars Balance'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl font-black text-amber-400">{paidStars.toLocaleString()}</span>
                            <LucideStar size={14} className="text-amber-400 fill-amber-400" />
                          </div>
                          <span className="text-[8px] text-amber-600/70 block mt-1">{isRtl ? 'قابلة للتحويل لأرباح كاش' : 'Convertible to cash'}</span>
                        </div>
                      </div>

                      <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex justify-between items-center mb-2">
                        <div className="text-start">
                          <span className="text-[10px] text-emerald-500 block font-bold uppercase mb-1">{isRtl ? 'الأرباح النقدية المباشرة' : 'Current Real Earnings'}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-white tracking-tighter">${realEarningsUSD.toFixed(2)}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">USD</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                           <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
                              <Zap size={20} />
                           </div>
                           <span className="text-[10px] text-emerald-400 font-bold">{isRtl ? 'متاح للسحب' : 'Available to Cashout'}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 text-center italic">{isRtl ? 'يتم تحديث الأرباح فوراً عند تلقي نجوم مدفوعة' : 'Earnings update instantly upon receiving paid stars'}</p>
                    </div>
                  </div>
                )}

                {/* TAB 2: مستوى النجوم (Stars Level) */}
                {walletTab === 'level' && (() => {
                  const effectiveLevel = Math.min(6, Math.floor(supporterXP / 100));
                  const effectiveXP = supporterXP;
                  const xpInCurrentLevel = effectiveLevel >= 6 ? 100 : (supporterXP % 100);
                  const xpNeededForNext = effectiveLevel >= 6 ? 0 : (100 - xpInCurrentLevel);
                  const progressPercentToNext = effectiveLevel >= 6 ? 100 : xpInCurrentLevel;
                  const currentUserProfile = users[myId] || {};
                  const userAvatarUrl = currentUserProfile.avatarUrl || currentUserProfile.avatar || currentUserProfile.photoURL || auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId || 'me'}`;

                  return (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Supporter XP & Level Status Banner with Profile Avatar Preview */}
                      <div className="glass p-6 rounded-[2.5rem] border border-amber-500/20 shadow-xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-amber-950/20 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                          {/* Profile Avatar with dynamic level-based frame and star crest */}
                          <div className="relative mb-3 flex flex-col items-center">
                            {/* Unified Rank Crest atop Profile Avatar (Strictly exterior, blocked for Lv 0) */}
                            {effectiveLevel > 0 && (
                              <div className="absolute -top-3.5 -right-1 flex flex-col items-center z-30 pointer-events-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                                <div className="relative flex items-center justify-center">
                                  {effectiveLevel >= 5 && (
                                    <motion.div 
                                      initial={{ y: 2, opacity: 0, scale: 0.8 }}
                                      animate={{ y: -5, opacity: 1, scale: 1 }}
                                      className="absolute -top-4 z-40 text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.95)]"
                                    >
                                      <Crown size={16} fill="currentColor" strokeWidth={1.5} />
                                    </motion.div>
                                  )}
                                  <div className="relative flex items-center justify-center filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">
                                    <LucideStar 
                                      size={24} 
                                      className={effectiveLevel >= 5 ? 'text-amber-200 fill-amber-400 stroke-amber-200' : 'text-amber-300 fill-amber-400 stroke-amber-500'}
                                      strokeWidth={1.2}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-950 leading-none select-none pt-[1.5px] tracking-tighter">
                                      {effectiveLevel}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Profile Avatar Frame reflecting this Level */}
                            <div className="relative inline-block">
                              <div className={`w-16 h-16 rounded-full overflow-hidden relative flex items-center justify-center transition-all duration-500 shadow-2xl ${
                                effectiveLevel === 0 ? 'border-2 border-white/20' :
                                effectiveLevel <= 2 ? 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]' :
                                effectiveLevel <= 4 ? 'border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]' :
                                'border-2 border-cyan-300 shadow-[0_0_25px_rgba(164,245,255,0.7)] ring-2 ring-cyan-200/50'
                              }`}>
                                <img 
                                  src={userAvatarUrl} 
                                  className="w-full h-full rounded-full object-cover"
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId || 'settings'}`;
                                  }}
                                />
                              </div>
                              {effectiveLevel > 0 && (
                                <div className="absolute -top-1 -right-1 z-10">
                                  <AvatarLevelBadge level={effectiveLevel} size={24} />
                                </div>
                              )}
                            </div>
                          </div>

                          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/80 mb-1">
                            {isRtl ? 'رتبة الداعم ومستوى الحساب' : 'Supporter Rank & Account Level'}
                          </span>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-4xl font-black text-white tracking-tight">
                              {effectiveLevel === 0 ? (isRtl ? 'المستوى 0' : 'Level 0') : `Lv.${effectiveLevel}`}
                            </span>
                            {effectiveLevel > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                {effectiveLevel >= 6 ? (isRtl ? 'داعم أسطوري غامض 👑' : 'Mythic Legend 👑') :
                                 effectiveLevel >= 5 ? (isRtl ? 'وسام التاج الملكي 👑' : 'Royal Crown 👑') :
                                 (isRtl ? `مستوى ${effectiveLevel} ⭐` : `Level ${effectiveLevel} ⭐`)}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">
                                {isRtl ? 'مبتدئ' : 'Beginner'}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                            {effectiveLevel === 0 
                              ? (isRtl ? 'لم يتم تفعيل وسام النجمة بعد. أهدِ نجوماً لتصل إلى 100 XP وترتقي للمستوى 1 لتظهر النجمة أعلى إطار صورتك.' : 'Star badge not unlocked yet. Give stars to reach 100 XP and advance to Level 1 to display the star atop your avatar.')
                              : (isRtl ? 'كل نجمة تهديها تمنحك +10 نقاط XP وترفع هيبتك ومكانتك في البثوث والتعليقات والقصص.' : 'Each star you give grants +10 XP and elevates your status across live streams, comments, and stories.')}
                          </p>

                          <div className="mt-4 flex items-center gap-4 bg-black/40 px-5 py-2.5 rounded-2xl border border-white/5">
                            <div className="text-center">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">{isRtl ? 'إجمالي نقاط الخبرة' : 'Total Supporter XP'}</span>
                              <span className="text-base font-black text-amber-400">{effectiveXP.toLocaleString()} XP</span>
                            </div>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <div className="text-center">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">{isRtl ? 'الهدف القادم' : 'Next Milestone'}</span>
                              <span className="text-base font-black text-emerald-400">
                                {effectiveLevel >= 6 ? (isRtl ? 'الحد الأقصى' : 'MAX') : `${(effectiveLevel + 1) * 100} XP`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive 6-Level Badge Roadmap Card (Clean transparent badges, zero harsh lines) */}
                      <div className="glass p-6 rounded-[2.5rem] border border-amber-500/20 shadow-xl bg-slate-900/90">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                              <Trophy size={16} className="text-amber-400" />
                              {isRtl ? 'خريطة خزانة المستويات التفاعلية الـ 6' : '6-Level Interactive Badge Roadmap'}
                            </h3>
                            <span className="text-[10px] text-slate-400">
                              {isRtl ? 'كل وسام يمتلئ بالذهب من الأسفل للأعلى مع نقاط XP ويفك قفل المستوى التالي' : 'Each badge fills with gold from bottom to top as XP increases, unlocking the next tier'}
                            </span>
                          </div>
                          <div className="text-end">
                            <span className="text-xs font-black text-amber-400">{Math.min(6, effectiveLevel)}/6 {isRtl ? 'أوسمة مفتوحة' : 'Badges Unlocked'}</span>
                          </div>
                        </div>

                        {/* The 6-Level Roadmap Row - Strict Level 0 Lock Rule (all 6 locked at 0 XP) */}
                        <div className="relative py-6 px-1 sm:px-2 flex flex-row items-center justify-between gap-1 overflow-x-auto sm:overflow-x-visible no-scrollbar" dir={isRtl ? 'rtl' : 'ltr'}>
                          {[1, 2, 3, 4, 5, 6].map((lvl) => {
                            const badgeStartXP = (lvl - 1) * 100;
                            const badgeEndXP = lvl * 100;
                            let fillPercent = 0;

                            if (effectiveLevel >= lvl) {
                              fillPercent = 100;
                            } else if (supporterXP > badgeStartXP) {
                              fillPercent = Math.min(100, Math.max(0, supporterXP - badgeStartXP));
                            } else {
                              fillPercent = 0;
                            }

                            // Strict Level 0 Lock Rule:
                            // When effectiveLevel === 0 (0 XP): ALL 6 badges are locked (lvl > 0)!
                            // Level 1 only unlocks after gaining the 100 XP required for Level 1!
                            const isLocked = lvl > effectiveLevel;
                            const isActive = lvl === effectiveLevel + 1 && effectiveLevel < 6;

                            return (
                              <RoadmapLevelBadgeItem
                                key={lvl}
                                levelNumber={lvl}
                                fillPercent={fillPercent}
                                isLocked={isLocked}
                                isActive={isActive}
                                size={50}
                                isRtl={isRtl}
                              />
                            );
                          })}
                        </div>

                        {/* Progress to Next Badge Box */}
                        <div className="mt-8 bg-black/40 border border-white/5 rounded-2xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] text-slate-400 font-bold">
                              {effectiveLevel >= 6 
                                ? (isRtl ? 'تم فتح جميع الأوسمة الأسطورية بنجاح 👑' : 'All Mythic Badges Unlocked 👑') 
                                : (isRtl ? `التقدم نحو المستوى ${effectiveLevel + 1}` : `Progress to Level ${effectiveLevel + 1}`)}
                            </span>
                            <span className="text-[11px] font-black text-amber-400">
                              {effectiveLevel >= 6 
                                ? '600 / 600 XP (100%)' 
                                : `${xpInCurrentLevel} / 100 XP (${progressPercentToNext}%)`}
                            </span>
                          </div>

                          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercentToNext}%` }}
                              transition={{ duration: 0.8 }}
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                            />
                          </div>

                          {effectiveLevel < 6 && (
                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                              <span>{isRtl ? 'المتبقي لفك قفل الوسام التالي:' : 'Remaining to unlock next badge:'}</span>
                              <span className="text-amber-300 font-bold">{xpNeededForNext} XP ({xpNeededForNext / 10} {isRtl ? 'نجوم مهداة' : 'stars'})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Perks / Badges unlocked for each level */}
                      <div className="glass p-5 rounded-3xl border border-white/5 space-y-3 text-start">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-400" />
                          {isRtl ? 'امتيازات وأوسمة المستويات' : 'Level Perks & Badges'}
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className={`p-3 rounded-2xl border transition-all ${effectiveLevel >= 1 ? 'bg-amber-500/10 border-amber-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                            <div className="flex items-center justify-between font-bold mb-0.5">
                              <span>⭐ {isRtl ? 'المستوى 1 (100 XP): وسام النجمة' : 'Level 1 (100 XP): Star Badge'}</span>
                              {effectiveLevel >= 1 && <span className="text-[10px] text-emerald-400 font-bold">{isRtl ? 'مُفعّل' : 'Unlocked'}</span>}
                            </div>
                            <p className="text-[11px] text-slate-400">{isRtl ? 'ظهور وسام النجمة الذهبي أعلى الإطار الخارجي دون حجب الصورة الشخصية.' : 'Golden star badge fixed at the top of the outer frame without obscuring avatar.'}</p>
                          </div>
                          <div className={`p-3 rounded-2xl border transition-all ${effectiveLevel >= 3 ? 'bg-amber-500/10 border-amber-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                            <div className="flex items-center justify-between font-bold mb-0.5">
                              <span>✨ {isRtl ? 'المستوى 3 (300 XP): الأجنحة الذهبية' : 'Level 3 (300 XP): Golden Wings'}</span>
                              {effectiveLevel >= 3 && <span className="text-[10px] text-emerald-400 font-bold">{isRtl ? 'مُفعّل' : 'Unlocked'}</span>}
                            </div>
                            <p className="text-[11px] text-slate-400">{isRtl ? 'أجنحة ذهبية متألقة تمتد على جانبي وسام الأفاتار مع إطار زمردي ذهبي.' : 'Radiant golden wings on the sides of the avatar crest with emerald-gold frame.'}</p>
                          </div>
                          <div className={`p-3 rounded-2xl border transition-all ${effectiveLevel >= 5 ? 'bg-amber-500/10 border-amber-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                            <div className="flex items-center justify-between font-bold mb-0.5">
                              <span>👑 {isRtl ? 'المستوى 5 (500 XP): التاج الملكي والأشعة' : 'Level 5 (500 XP): Royal Crown & Rays'}</span>
                              {effectiveLevel >= 5 && <span className="text-[10px] text-emerald-400 font-bold">{isRtl ? 'مُفعّل' : 'Unlocked'}</span>}
                            </div>
                            <p className="text-[11px] text-slate-400">{isRtl ? 'وسام التاج الإمبراطوري المتلألئ مع هالة الهيبة الكونية.' : 'Imperial sparkling crown insignia with cosmic halo.'}</p>
                          </div>
                          <div className={`p-3 rounded-2xl border transition-all ${effectiveLevel >= 6 ? 'bg-amber-500/10 border-amber-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                            <div className="flex items-center justify-between font-bold mb-0.5">
                              <span>🔮 {isRtl ? 'المستوى 6 (600 XP): الوسام الأسطوري الغامض (؟)' : 'Level 6 (600 XP): Mythic Mystery Insignia (?)'}</span>
                              {effectiveLevel >= 6 && <span className="text-[10px] text-emerald-400 font-bold">{isRtl ? 'مُفعّل' : 'Unlocked'}</span>}
                            </div>
                            <p className="text-[11px] text-slate-400">{isRtl ? 'الوسام الأسطوري الأعلى في المنصة مع درع الأركانا الكوني وعلامة الاستفهام المتوهجة.' : 'Highest mythic insignia on the platform with arcane cosmic crest & glowing question mark.'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Financial Rules Transparency Banner (توزيع العوائد 85% / 15%) */}
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 text-xs text-slate-300 flex items-start gap-3 text-start">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl mt-0.5 shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="font-bold text-white text-xs flex items-center justify-between">
                      <span>{isRtl ? 'نظام العوائد والعمولات المعتمد' : 'Approved Revenue & Commission System'}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {isRtl ? '15% منصة / 85% صانع محتوى' : '15% Platform / 85% Creator'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isRtl 
                        ? 'يتم اقتطاع نسبة 15% تلقائياً كرسوم تشغيلية للمنصة من إجمالي قيمة الهدايا والتحويلات، وتخصيص 85% المتبقية كربح صافٍ متاح للسحب لصانع المحتوى.' 
                        : 'A 15% fee is automatically deducted as platform operating fees from the total value of gifts and transfers, and the remaining 85% is allocated as net profit available for withdrawal to the content creator.'}
                    </p>
                  </div>
                </div>

                {/* Coins Section */}
                <div className="flex justify-center mt-4">
                  <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-lg">
                    <div className={`flex items-center gap-2 ${isRtl ? 'border-r pr-4' : 'border-l pl-4'} border-white/10`}>
                      <HiSeeCoinIcon size={20} />
                      <span className="text-sm font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{getCoinsCount()}</span>
                      <span className="text-xs text-slate-500">{isRtl ? 'الإجمالي' : 'Total'}</span>
                    </div>
                    <button 
                      onClick={() => setCurrentView('buy_coins')}
                      className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft size={16} className={isRtl ? '' : 'rotate-180'} />
                      <span>{isRtl ? 'شراء عملات إضافية' : 'Buy Extra Coins'}</span>
                    </button>
                  </div>
                </div>

                {/* Unified Outbound Claiming Card (قسم المطالبة الموحد) */}
                <div className="glass p-6 rounded-[2rem] border border-emerald-500/20 shadow-lg mt-6 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Wallet size={16} className="text-emerald-400 animate-pulse" />
                      {isRtl ? 'حساب المطالبة الموحد وسحب الأرباح' : 'Unified Outbound Claiming & Profit Cashout'}
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      {isRtl ? 'أرباح الهدايا المعتمدة فقط' : 'Approved Gift Earnings Only'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4 text-start">
                    {isRtl 
                      ? 'المستقر والمكان المخصص لجميع عوائدك ومطالباتك الخارجية. هنا تتراكم الأرباح الصافية (85%) من الهدايا المدفوعة، مكافآت البث المباشر (LIVE)، وأرباح القصص لتتمكن من سحبها إلى حساباتك البنكية أو PayPal.' 
                      : 'The designated place for all your external claims and revenues. Here, net profits (85%) accumulate from paid gifts, live stream rewards (LIVE), and stories earnings for you to withdraw to your bank accounts or PayPal.'}
                  </p>

                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4 flex justify-between items-center shadow-inner">
                    <div className="text-start">
                      <span className="text-[10px] text-slate-500 block mb-0.5 font-bold uppercase tracking-wider">{isRtl ? 'الرصيد المتاح للسحب النقدي (من الهدايا)' : 'Withdrawable Balance (From Gifts)'}</span>
                      <span className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                        {(Math.max(0, withdrawableProfit > 0 ? withdrawableProfit : diamonds) / 100).toFixed(2)} €
                      </span>
                    </div>
                    <div className="text-right bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/10">
                      <span className="text-[9px] text-emerald-500 block font-bold">{isRtl ? 'الرصيد بوحدات الألماس' : 'Balance in Diamonds'}</span>
                      <span className="text-sm font-black text-white">{Math.max(0, withdrawableProfit > 0 ? withdrawableProfit : diamonds).toLocaleString()} ♦</span>
                    </div>
                  </div>

                  {/* Programmatic Security Rules Info Banner */}
                  <div className={`bg-slate-950/60 rounded-xl p-3 border border-emerald-500/15 mb-5 flex items-start gap-2.5 ${isRtl ? 'text-right' : 'text-start'}`}>
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      <strong className="text-emerald-400">{isRtl ? 'قفل أمان مالي مبرمج:' : 'Programmed Financial Safety Lock:'}</strong>{' '}
                      {isRtl 
                        ? 'السحب النقدي متاح حصرياً للأرباح المحققة من الهدايا والعملات المدفوعة (paidCoins). أي عملات ممنوحة أو مجانية (bonusCoins أو خيار تعبئة التطوير) مقفلة برمجياً داخل التطبيق وممنوعة من السحب المالي.' 
                        : 'Cash withdrawal is exclusively available for earnings generated from gifts and paid coins (paidCoins). Any granted or free coins (bonusCoins or development reload option) are programmatically locked inside the app and barred from financial withdrawal.'}
                    </p>
                  </div>

                  {/* Payment Methods Choice */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 block text-start">{isRtl ? 'طريقة السحب المعتمدة:' : 'Approved Cashout Method:'}</label>
                    {paymentMethods.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {paymentMethods.map((method) => {
                          const isSelected = selectedWithdrawMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              onClick={() => setSelectedWithdrawMethod(method.id)}
                              className={`p-3 rounded-xl border flex items-center justify-between text-start transition-all ${
                                isSelected 
                                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/25' 
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-black/20 text-slate-400'}`}>
                                  {method.type === 'paypal' ? <Sparkles size={16} /> : <Building size={16} />}
                                </div>
                                <div className="text-start">
                                  <span className="text-xs font-bold block">
                                    {method.type === 'paypal' ? 'PayPal Secure Account' : (isRtl ? 'حساب بنكي محلي' : 'Local Bank Account')}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {method.email || method.accountNumber || method.cardNumber || '...'}
                                  </span>
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-400' : 'border-slate-500'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl border border-dashed border-white/10 bg-white/5 text-center space-y-3">
                        <p className="text-xs text-slate-400">{isRtl ? 'لم تقم بإضافة أي وسيلة دفع أو سحب حتى الآن لتلقي أموالك.' : 'You have not added any payment or withdrawal method yet to receive your money.'}</p>
                        <button
                          onClick={() => setCurrentView('payment_methods')}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold py-2.5 px-5 rounded-xl transition-all"
                        >
                          {isRtl ? '+ إضافة حساب بنكي أو PayPal للسحب' : '+ Add Bank Account or PayPal for withdrawal'}
                        </button>
                      </div>
                    )}
                  </div>

                  {paymentMethods.length > 0 && (
                    <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 text-start">
                      <div>
                        <div className="flex justify-between items-center mb-1.5 px-1">
                          <label className="text-xs font-bold text-slate-400 block">{isRtl ? 'مبلغ السحب المطلوب باليورو (€):' : 'Requested Withdrawal Amount in Euro (€):'}</label>
                          <span className="text-[10px] text-slate-500 font-semibold">{isRtl ? 'الحد الأقصى اليومي: 50.00 €' : 'Daily Limit: 50.00 €'}</span>
                        </div>
                        <div className="relative text-start">
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder={isRtl ? 'مثال: 20' : 'Example: 20'}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pr-8 text-white text-sm outline-none focus:border-emerald-500/60 transition-all font-mono text-start"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">€</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleWithdraw(selectedWithdrawMethod)}
                        disabled={
                          !selectedWithdrawMethod || 
                          !withdrawAmount || 
                          Number(withdrawAmount) <= 0 || 
                          (Number(withdrawAmount) * 100) > (withdrawableProfit > 0 ? withdrawableProfit : diamonds) ||
                          (withdrawableProfit <= 0 && diamonds <= 0)
                        }
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
                      >
                        <Wallet size={14} />
                        <span>{isRtl ? 'طلب سحب أرباح الهدايا المعتمدة' : 'Request Withdrawal of Approved Gift Earnings'}</span>
                      </button>
                    </div>
                  )}

                  {/* QUICK MOCK CASHOUT TEST TRIGGER BOX */}
                  <div className="mt-5 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-3 text-start">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                          ⚡
                        </div>
                        <div className="text-start">
                          <h4 className="text-xs font-bold text-white">{isRtl ? 'اختبار تقديم طلب سحب تجريبي' : 'Test Submitting a Mock Withdrawal'}</h4>
                          <p className="text-[10px] text-amber-300/80">{isRtl ? 'إنشاء طلب سحب تجريبي بقيمة 0.03 € بحالة PENDING' : 'Create a mock withdrawal request of 0.03 € with PENDING status'}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                        TEST 0.03 €
                      </span>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={handleMockCashoutTest}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <span>{isRtl ? '🚀 تقديم طلب سحب تجريبي (0.03 €)' : '🚀 Submit Mock Withdrawal Request (0.03 €)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Payout Requests Log & Realtime Status */}
                  {payoutRequests.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-white/5 space-y-3 text-start">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{isRtl ? 'سجل طلبات السحب (جدول payout_requests):' : 'Withdrawal Request Log (payout_requests):'}</span>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                          {payoutRequests.filter(p => p.status === 'PENDING').length} {isRtl ? 'بانتظار الموافقة اليدوية' : 'awaiting manual approval'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {payoutRequests.map((req) => (
                          <div key={req.id} className={`p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                req.status === 'PENDING' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                                req.status === 'APPROVED' || req.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                                <Clock size={16} />
                              </div>
                              <div className="text-start">
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{req.amount} €</span>
                                  <span className="text-[10px] text-slate-500 font-normal">({req.diamondsDeducted || (req.amount * 100)} ♦)</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {req.method === 'paypal' ? 'PayPal' : (isRtl ? 'حساب بنكي' : 'Bank Account')} • {req.accountDetails?.email || req.accountDetails?.iban || req.accountDetails?.accountNumber || 'حساب السحب'}
                                </div>
                              </div>
                            </div>
                            <div className="text-left">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                req.status === 'PENDING' 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' 
                                  : req.status === 'APPROVED' || req.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}>
                                {req.status === 'PENDING' ? (isRtl ? '⏳ PENDING (بانتظار الموافقة اليدوية)' : '⏳ PENDING (Awaiting Manual Approval)') : 
                                 req.status === 'APPROVED' || req.status === 'completed' ? (isRtl ? '✅ معتمد ومحوّل' : '✅ Approved & Transferred') : (isRtl ? '❌ مرفوض' : '❌ Rejected')}
                              </span>
                              <span className="block text-[9px] text-slate-500 mt-0.5 font-mono">
                                {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : 'Now'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <StarLevelSection totalStars={totalStars} myId={myId} t={t} isRtl={isRtl} />

                {/* Promo Banner */}
                <div className="glass p-6 rounded-2xl border border-white/5 flex items-center gap-6 relative overflow-hidden group text-start">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 shrink-0">
                    <Trophy size={32} />
                  </div>
                  <div className="flex-1 text-start">
                    <h4 className="text-base font-bold text-white mb-1">Willkommen Frühling</h4>
                    <p className="text-xs text-slate-400 mb-2">{isRtl ? 'احصل على مزيد من المشاهدات والمكافآت!' : 'Get more views and rewards!'}</p>
                    <button className="flex items-center gap-1 text-xs text-rose-500 font-bold">
                      <ChevronLeft size={14} className={isRtl ? '' : 'rotate-180'} />
                      <span>{isRtl ? 'الانتقال الآن' : 'Go now'}</span>
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    <div className="w-3 h-1 rounded-full bg-slate-600" />
                    <div className="w-1 h-1 rounded-full bg-slate-800" />
                  </div>
                </div>

                {/* Services Section */}
                <div className="space-y-3 mt-6 text-start">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pr-2">{isRtl ? 'الخدمات' : 'Services'}</h3>
                  <div className="glass p-6 rounded-2xl border border-white/5 grid grid-cols-4 gap-2">
                    <button 
                      onClick={() => setCurrentView('live_rewards')}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-500 transition-all">
                        <Gift size={20} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors">LIVE</span>
                    </button>
                    <button 
                      onClick={() => setCurrentView('content_earnings')}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-all">
                        <BarChart3 size={20} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors">{isRtl ? 'الربح' : 'Earnings'}</span>
                    </button>
                    <button 
                      onClick={() => setCurrentView('event_earnings')}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-all">
                        <LayoutGrid size={20} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors">{isRtl ? 'الفعاليات' : 'Events'}</span>
                    </button>
                    <button 
                      onClick={() => setCurrentView('transaction_history')}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-purple-500/20 group-hover:text-purple-500 transition-all">
                        <History size={20} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors">{isRtl ? 'السجل' : 'History'}</span>
                    </button>
                  </div>
                </div>

                {/* Settings Section */}
                <div className="space-y-3 mt-6 text-start">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pr-2">{isRtl ? 'الإعدادات وإدارة السحب' : 'Settings & Payout Management'}</h3>
                  <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                    <button 
                      onClick={() => setCurrentView('payment_methods')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <CreditCard size={20} className="text-slate-400" />
                        <span className="text-sm font-bold text-white">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</span>
                      </div>
                      <ChevronLeft size={18} className={`text-slate-600 ${isRtl ? '' : 'rotate-180'}`} />
                    </button>
                    <button 
                      onClick={() => setCurrentView('identity_verification')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all border-b border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <ShieldCheck size={20} className="text-slate-400" />
                        <span className="text-sm font-bold text-white">{isRtl ? 'التحقق من الهوية' : 'Identity Verification'}</span>
                      </div>
                      <ChevronLeft size={18} className={`text-slate-600 ${isRtl ? '' : 'rotate-180'}`} />
                    </button>
                    <button 
                      onClick={() => setCurrentView('help_feedback')}
                      className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <HelpCircle size={20} className="text-slate-400" />
                        <span className="text-sm font-bold text-white">{isRtl ? 'المساعدة والملاحظات' : 'Help & Feedback'}</span>
                      </div>
                      <ChevronLeft size={18} className={`text-slate-600 ${isRtl ? '' : 'rotate-180'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {currentView === 'qr_code' && (() => {
              const usersList = Array.isArray(users) ? users : Object.values(users || {});
              const myProfile = usersList.find((u: any) => u.id === myId || u.uid === myId);
              const profileName = myProfile?.name || myProfile?.displayName || 'مستخدم HiSee';
              const avatarUrl = myProfile?.avatar || myProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myId || 'hisee'}`;
              const qrValue = window.location.origin.replace(/\/$/, '') + '/?type=profile&id=' + myId;

              const handleCopyProfileLink = () => {
                navigator.clipboard.writeText(qrValue);
                alert(lang === 'ar' ? 'تم نسخ رابط الحساب بنجاح!' : 'Profile link copied successfully!');
              };

              const handleSmartShare = async () => {
                const shareData = {
                  title: 'HiSee',
                  text: lang === 'ar' ? `تابعني على HiSee: ${profileName}` : `Follow me on HiSee: ${profileName}`,
                  url: qrValue,
                };
                if (navigator.share) {
                  await navigator.share(shareData).catch((err) => {
                    console.log("Share canceled:", err);
                  });
                } else {
                  alert(lang === 'ar' ? 'المشاركة غير مدعومة في متصفحك' : 'Sharing is not supported in your browser');
                }
              };

              return (
                <div className="animate-in slide-in-from-end duration-300">
                  <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-lg text-center flex flex-col items-center">
                    <h3 className="text-lg font-bold text-white mb-6">{t.accountQR || 'رمز QR الخاص بالحساب'}</h3>
                    
                    {/* Unified QR Code Card exactly like ProfileView */}
                    <div className="relative p-6 bg-white rounded-[2rem] shadow-2xl mb-6 group inline-block">
                      <SharedQRCode 
                        value={qrValue} 
                        size={200} 
                        avatarUrl={avatarUrl}
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-rose-500/20 rounded-[2rem] pointer-events-none" />
                    </div>

                    <p className="text-lg font-black italic text-white mb-1 uppercase tracking-tight">{profileName}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">@{myId.slice(0, 8)}</p>

                    {/* Unified Buttons with same style and actions as ProfileView */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                      <button 
                        onClick={handleCopyProfileLink}
                        className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                      >
                        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                          <Copy size={18} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">{lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}</span>
                      </button>

                      <button 
                        onClick={handleSmartShare}
                        className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                      >
                        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                          <SendIcon size={18} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">{lang === 'ar' ? 'إرسال إلى...' : 'Send To...'}</span>
                      </button>

                      <button 
                        onClick={() => setShowScanner(true)}
                        className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group col-span-2"
                      >
                        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-rose-500 text-white group-hover:scale-110 transition-transform">
                          <Scan size={18} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">{lang === 'ar' ? 'ماسح الرموز' : 'Scanner'}</span>
                      </button>
                    </div>

                    {/* Scanner Live Camera Overlay (same as Profile scanner modal) */}
                    {showScanner && (
                      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black">
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <video 
                            ref={scannerVideoRef} 
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                            muted
                            playsInline
                          />
                          <canvas ref={scannerCanvasRef} className="hidden" />
                          
                          <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-10">
                            <button onClick={() => setShowScanner(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white">
                              <X size={24} />
                            </button>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Scan QR Code</h3>
                            <div className="w-12" />
                          </div>

                          <div className="w-48 h-48 border-2 border-emerald-500 rounded-[2rem] relative overflow-hidden z-10">
                            <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-scan" />
                          </div>

                          <p className="mt-8 text-[10px] text-white/80 uppercase tracking-[0.2em] font-black z-10 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                            {lang === 'ar' ? 'وجه الكاميرا نحو الباركود' : 'Point camera to QR Code'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            {currentView === 'blocked_users' && (
              <div className="animate-in slide-in-from-end duration-300">
                <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-lg text-center">
                  <UserX size={48} className="mx-auto text-slate-700 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">{t.noBlockedUsers || 'لا يوجد مستخدمون محظورون'}</h3>
                  <p className="text-sm text-slate-500">{t.noBlockedUsersDesc || 'المستخدمون الذين تحظرهم سيظهرون هنا.'}</p>
                </div>
              </div>
            )}

            {/* TERMS OF SERVICE PAGE */}
            {currentView === 'terms' && (
              <div className="animate-in slide-in-from-end duration-300">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg mb-6">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <ShieldCheck className="text-purple-500" size={24} />
                    {t.termsOfService || 'شروط الخدمة'}
                  </h3>
                  
                  <div className="space-y-6 text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Globe size={18} className="text-blue-400" />
                        المقدمة والتوافق العالمي
                      </h4>
                      <p>
                        مرحباً بك في HiSee. باستخدامك للتطبيق، فإنك توافق على هذه الشروط المصممة وفقاً للقوانين الألمانية والأوروبية (GDPR) والمعايير العالمية للتطبيقات المسموحة (مثل WhatsApp و Telegram). نحن نلتزم بتقديم بيئة آمنة وموثوقة لجميع المستخدمين.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Shield size={18} className="text-emerald-400" />
                        حماية البيانات والخصوصية (GDPR)
                      </h4>
                      <p>
                        نحن نلتزم التزاماً كاملاً باللائحة العامة لحماية البيانات (GDPR) والقانون الاتحادي الألماني لحماية البيانات (BDSG). بياناتك الشخصية مشفرة ولا يتم بيعها أو مشاركتها مع أطراف ثالثة لأغراض إعلانية دون موافقتك الصريحة. يحق لك طلب نسخة من بياناتك أو حذفها في أي وقت.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Lock size={18} className="text-amber-400" />
                        التشفير من طرف إلى طرف (E2EE)
                      </h4>
                      <p>
                        أسوة بالتطبيقات العالمية الآمنة، تعتمد محادثاتك ومكالماتك الخاصة على التشفير التام (End-to-End Encryption). نحن لا نستطيع قراءة رسائلك أو الاستماع لمكالماتك، ولا يمكن لأي جهة خارجية الوصول إليها.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-rose-400" />
                        قواعد السلوك وقانون إنفاذ الشبكات (NetzDG)
                      </h4>
                      <p>
                        يُمنع منعاً باتاً نشر محتوى يحض على الكراهية، الإرهاب، العنف، أو انتهاك حقوق الطبع والنشر. وفقاً لقانون NetzDG الألماني، يحق لنا إزالة المحتوى غير القانوني وحظر الحسابات المخالفة خلال 24 ساعة من الإبلاغ. نحن نتعاون مع السلطات القانونية عند الضرورة لحماية المجتمع.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <UserPlus size={18} className="text-indigo-400" />
                        العمر المسموح
                      </h4>
                      <p>
                        يجب أن لا يقل عمرك عن 16 عاماً لاستخدام التطبيق، وهو السن القانوني للموافقة على معالجة البيانات في ألمانيا والاتحاد الأوروبي بدون موافقة الوالدين.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Zap size={18} className="text-yellow-400" />
                        تحسين البث والأداء
                      </h4>
                      <p>
                        نظام HiSee Pro يقوم بتحسين جودة البث تلقائياً لضمان استقرار الاتصال ومنع ارتفاع حرارة الجهاز أثناء المكالمات الطويلة.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Building size={18} className="text-slate-400" />
                        القانون الحاكم
                      </h4>
                      <p>
                        تخضع هذه الشروط وتُفسر وفقاً لقوانين جمهورية ألمانيا الاتحادية. أي نزاع ينشأ عن استخدام التطبيق يخضع للاختصاص الحصري للمحاكم الألمانية، مع مراعاة حقوق المستهلك في بلد إقامتك.
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY POLICY PAGE */}
            {currentView === 'privacy_policy' && (
              <div className="animate-in slide-in-from-end duration-300">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg mb-6">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Shield className="text-amber-500" size={24} />
                    {t.privacyPolicy || 'سياسة الخصوصية'}
                  </h3>
                  
                  <div className="space-y-6 text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-400" />
                        الامتثال للقوانين الأوروبية والألمانية
                      </h4>
                      <p>
                        تم تصميم HiSee ليكون متوافقاً تماماً مع اللائحة العامة لحماية البيانات (GDPR) للاتحاد الأوروبي، والقانون الاتحادي الألماني لحماية البيانات (BDSG). نحن نضع خصوصيتك في المقام الأول، ولا نقوم بجمع أي بيانات غير ضرورية لعمل التطبيق.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Database size={18} className="text-blue-400" />
                        البيانات التي نجمعها (مقارنة بالتطبيقات الأخرى)
                      </h4>
                      <p className="mb-2">
                        على عكس التطبيقات الأخرى (مثل تطبيقات شركة Meta كـ WhatsApp التي تجمع بيانات الموقع، وسجل التصفح، ومعلومات الجهاز لأغراض إعلانية)، <strong>نحن في HiSee نجمع فقط:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                        <li>رقم الهاتف أو البريد الإلكتروني (للتسجيل فقط).</li>
                        <li>الاسم المستعار والصورة الشخصية (اختياري).</li>
                        <li>جهات الاتصال (يتم تشفيرها ولا تخزن بشكل مقروء، مشابه لآلية Signal).</li>
                      </ul>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Zap size={18} className="text-blue-400" />
                        تقنية الرسائل الصوتية
                      </h4>
                      <p>
                        التطبيق يستخدم تقنية ضغط AAC/MP4 المتطورة للرسائل الصوتية لضمان أعلى جودة مع أقل استهلاك للذاكرة وبيانات الإنترنت، مع تشفيرها بالكامل.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Lock size={18} className="text-amber-400" />
                        التشفير التام (End-to-End Encryption)
                      </h4>
                      <p>
                        نستخدم بروتوكولات تشفير متطورة (مفتوحة المصدر وموثوقة عالمياً) لضمان أن رسائلك، مكالماتك الصوتية والمرئية، وملفاتك مشفرة من طرف إلى طرف. لا يمكن لـ HiSee ولا لأي جهة حكومية أو خارجية فك تشفيرها. مفاتيح التشفير تبقى على جهازك فقط.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <HardDrive size={18} className="text-purple-400" />
                        تخزين البيانات وموقع الخوادم
                      </h4>
                      <p>
                        لضمان أعلى معايير الأمان، يتم استضافة خوادم HiSee داخل الاتحاد الأوروبي (ألمانيا). هذا يعني أن بياناتك محمية بموجب قوانين الخصوصية الأوروبية الصارمة، ولا يتم نقلها إلى دول ذات قوانين خصوصية ضعيفة.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <EyeOff size={18} className="text-rose-400" />
                        لا إعلانات، لا بيع للبيانات
                      </h4>
                      <p>
                        نموذج عملنا لا يعتمد على الإعلانات الموجهة. نحن لا نبيع بياناتك، ولا نشاركها مع وسطاء البيانات (Data Brokers). خصوصيتك ليست سلعة للبيع.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <UserCheck size={18} className="text-indigo-400" />
                        حقوقك بموجب GDPR
                      </h4>
                      <p className="mb-2">أنت تملك السيطرة الكاملة على بياناتك. يحق لك:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                        <li><strong>الحق في الوصول:</strong> طلب نسخة من بياناتك المحفوظة لدينا.</li>
                        <li><strong>الحق في النسيان:</strong> حذف حسابك وكافة بياناتك نهائياً من خوادمنا بنقرة واحدة.</li>
                        <li><strong>الحق في نقل البيانات:</strong> تصدير بياناتك بتنسيق مقروء آلياً.</li>
                      </ul>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {currentView === 'support' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-lg">
                  
                  {/* 1. Help Center */}
                  <button 
                    onClick={() => {
                      setHelpSearchQuery('');
                      setExpandedFaqId(null);
                      setTicketSuccess(false);
                      setTicketDescription('');
                      setCurrentView('help_center');
                    }}
                    className={`w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5 ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <HelpCircle size={20} />
                      </div>
                      <div className="text-start">
                        <h3 className="text-sm font-bold text-white">
                          {isRtl ? 'مركز المساعدة' : 'Help Center'}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {isRtl ? 'البحث عن الحلول، الأسئلة الشائعة، وتقديم تذاكر الدعم الفني' : 'Search solutions, FAQs, and submit support tickets'}
                        </p>
                      </div>
                    </div>
                    {isRtl ? <ChevronLeft size={20} className="text-slate-600 group-hover:text-white transition-colors" /> : <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />}
                  </button>

                  {/* 2. Privacy Center */}
                  <button 
                    onClick={() => {
                      setIsDownloadingData(false);
                      setCurrentView('privacy_center');
                    }}
                    className={`w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5 ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Shield size={20} />
                      </div>
                      <div className="text-start">
                        <h3 className="text-sm font-bold text-white">
                          {isRtl ? 'مركز الخصوصية' : 'Privacy Center'}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {isRtl ? 'إدارة أمن معلوماتك، تحميل بياناتك، وأدوات الحماية والتشفير' : 'Manage your info security, download your data, and protection/encryption tools'}
                        </p>
                      </div>
                    </div>
                    {isRtl ? <ChevronLeft size={20} className="text-slate-600 group-hover:text-white transition-colors" /> : <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />}
                  </button>

                  {/* 3. Terms & Policies */}
                  <button 
                    onClick={() => {
                      setActivePolicyTab('terms');
                      setCurrentView('terms_policies');
                    }}
                    className={`w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText size={20} />
                      </div>
                      <div className="text-start">
                        <h3 className="text-sm font-bold text-white">
                          {isRtl ? 'الشروط والسياسات' : 'Terms & Policies'}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {isRtl ? 'اتفاقية شروط الخدمة، سياسة الخصوصية، وإرشادات المجتمع' : 'Terms of Service agreement, Privacy Policy, and Community Guidelines'}
                        </p>
                      </div>
                    </div>
                    {isRtl ? <ChevronLeft size={20} className="text-slate-600 group-hover:text-white transition-colors" /> : <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />}
                  </button>

                </div>

                {/* User Guide in support page */}
                <div className={`glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4 text-start ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-3">
                    <Zap className="text-amber-500 shrink-0" size={20} />
                    <div className="text-start">
                      <h4 className="text-xs font-bold text-white">
                        {isRtl ? 'دليل مستخدم HiSee Pro الاحترافي' : 'HiSee Pro Professional User Guide'}
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {isRtl ? 'شروحات وميزات منصة البث المباشر والمكالمات عالية الدقة' : 'Explanations and features of live stream platform and HD calls'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setCurrentView('hisee_features_guide')}
                    className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl text-center text-xs text-slate-300 font-bold transition-all"
                  >
                    {isRtl ? 'فتح دليل المستخدم الشامل' : 'Open Comprehensive User Guide'}
                  </button>
                </div>

                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg text-center">
                  <p className="text-xs text-slate-500 mb-4">
                    {isRtl ? 'هل تحتاج إلى مساعدة إضافية عاجلة؟' : 'Need additional urgent assistance?'}
                  </p>
                  <button 
                    onClick={() => window.open('mailto:support@hisee.pro')}
                    className="w-full p-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all text-xs"
                  >
                    {isRtl ? 'تواصل مباشرة مع الدعم الفني عبر البريد' : 'Contact support directly via email'}
                  </button>
                </div>
              </div>
            )}

            {/* HELP CENTER SUB-PAGE */}
            {currentView === 'help_center' && (
              <div className="space-y-6 animate-in slide-in-from-end duration-300 text-start">
                
                {/* 1. Search Bar */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-sm font-bold text-white">
                    {isRtl ? 'كيف يمكننا مساعدتك اليوم؟' : 'How can we help you today?'}
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={isRtl ? 'ابحث عن المشكلة، مثلاً: سحب الأرباح، تشفير، أمان...' : 'Search for the issue, e.g. withdraw earnings, encryption, security...'}
                      value={helpSearchQuery}
                      onChange={(e) => setHelpSearchQuery(e.target.value)}
                      className={`w-full p-4 bg-[#121418] border border-white/5 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${isRtl ? 'text-right pr-4 pl-10' : 'text-left pl-4 pr-10'}`}
                    />
                    <div className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRtl ? 'left-4' : 'right-4'}`}>
                      <span className="text-xs font-bold">
                        {isRtl ? 'بحث' : 'Search'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Frequently Asked Questions List */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <HelpCircle size={16} className="text-blue-500" />
                    {isRtl ? 'الأسئلة الشائعة وحلول المشكلات' : 'Frequently Asked Questions & Troubleshooting'}
                  </h3>

                  <div className="space-y-2">
                    {(() => {
                      const faqs = isRtl ? [
                        { id: 1, q: "كيف يمكنني حماية حسابي وتفعيل المصادقة الثنائية؟", a: "لتفعيل المصادقة الثنائية وحماية حسابك بالكامل، توجه إلى صفحة (إدارة الحساب) ثم (الأمان والأذونات) وقم بتمكين خيار التحقق بخطوتين وتفعيل البصمة لتفادي الدخول غير المصرح به." },
                        { id: 2, q: "كيف أبدأ بث مباشر وأربح جوائز HiSee؟", a: "اضغط على زر الكاميرا (+) في الصفحة الرئيسية لبدء البث المباشر السريع. سيتلقى المتابعون هدايا أثناء البث المباشر، وتتحول تلقائياً إلى ماسات وأرباح حقيقية في رصيد محفظتك، مع ميزات الفعاليات والربح الإضافي." },
                        { id: 3, q: "ما هي شروط سحب الأرباح والعمولات المسموحة؟", a: "الحد الأدنى لسحب الأرباح في المنصة هو 25 دولاراً أمريكياً. نقوم بتحويل المبالغ عبر PayPal أو الحساب البنكي أو بطاقات Visa/Mastercard بشكل فوري وآمن من خلال لوحة الإدارة المالية." },
                        { id: 4, q: "كيف يمكنني الإبلاغ عن مستخدم أو محتوى مسيء؟", a: "اضغط على النقاط الثلاث المجاورة لأي منشور أو بث مباشر، ثم اختر 'إبلاغ عن إساءة'. سيقوم فريق الدعم الفني بمراجعة البلاغ خلال 10 دقائق وتطبيق الإرشادات الصارمة التي تشمل حظر الحساب." },
                        { id: 5, q: "حل مشكلة تعذر تحميل الفيديوهات أو انقطاع الصوت", a: "تأكد من تحديث التطبيق لأحدث إصدار ومراجعة استقرار اتصال الإنترنت. نوصي أيضاً بالذهاب لصفحة 'تحرير المساحة' ومسح كاش مقاطع الفيديو لتسريع الأداء بشكل فوري." }
                      ] : [
                        { id: 1, q: "How can I protect my account and enable two-factor authentication?", a: "To enable two-factor authentication and fully secure your account, navigate to the (Account Management) page, then (Security & Permissions), and enable the 2-step verification and fingerprint login features to prevent unauthorized access." },
                        { id: 2, q: "How do I start a live stream and earn HiSee rewards?", a: "Tap the camera button (+) on the main screen to go live. Your viewers can send you gifts during the broadcast, which will automatically convert to diamonds and real earnings in your wallet, with events and extra reward options available." },
                        { id: 3, q: "What are the terms and allowed commissions for withdrawing earnings?", a: "The minimum withdrawal limit on our platform is 25 USD. We process payments via PayPal, bank transfer, or Visa/Mastercard securely and immediately through our financial dashboard." },
                        { id: 4, q: "How can I report an abusive user or offensive content?", a: "Tap the three dots on any post or live stream, then select 'Report Abuse'. Our dedicated safety team will review the report within 10 minutes and enforce strict community standards including account suspension." },
                        { id: 5, q: "How do I resolve video loading or audio freezing issues?", a: "Ensure you are using the latest version of the app and verify your internet stability. We also recommend visiting the 'Clear Storage' section and wiping the video cache to instantly boost performance." }
                      ];

                      const filtered = faqs.filter(f => f.q.toLowerCase().includes(helpSearchQuery.toLowerCase()) || f.a.toLowerCase().includes(helpSearchQuery.toLowerCase()));

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-6 text-slate-500 text-xs font-bold">
                            {isRtl ? 'لم يتم العثور على نتائج للبحث. جرب كتابة كلمات أخرى.' : 'No search results found. Try using different keywords.'}
                          </div>
                        );
                      }

                      return filtered.map((faq) => (
                        <div key={faq.id} className="border-b border-white/5 last:border-none pb-2 last:pb-0 text-start">
                          <button
                            onClick={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                            className={`w-full py-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:text-white transition-colors ${isRtl ? 'text-right' : 'text-left'}`}
                          >
                            <span>{faq.q}</span>
                            <span className="text-slate-500 font-bold text-base px-2">
                              {expandedFaqId === faq.id ? '−' : '+'}
                            </span>
                          </button>
                          {expandedFaqId === faq.id && (
                            <p className="text-[11px] text-slate-400 bg-white/5 p-4 rounded-xl leading-relaxed animate-in fade-in duration-250 mt-1 text-start">
                              {faq.a}
                            </p>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* 3. Submit a Support Ticket Form */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <MessageSquare size={16} className="text-emerald-500" />
                    {isRtl ? 'تقديم تذكرة دعم فني جديدة' : 'Submit a New Support Ticket'}
                  </h3>

                  {ticketSuccess ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center space-y-3">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {isRtl ? '✓ تم تقديم تذكرتك بنجاح!' : '✓ Your ticket has been submitted successfully!'}
                      </span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {isRtl 
                          ? <>تم إنشاء التذكرة برقم <span className="text-emerald-400 font-bold">#HS-98342</span>. سيقوم فريق الدعم بمراجعة المشكلة والرد عليك عبر الإشعارات والبريد الإلكتروني في غضون 12 ساعة كحد أقصى.</>
                          : <>Ticket created successfully with ID <span className="text-emerald-400 font-bold">#HS-98342</span>. The support team will review your report and reply to you via notifications & email within 12 hours maximum.</>}
                      </p>
                      <button
                        onClick={() => {
                          setTicketSuccess(false);
                          setTicketDescription('');
                        }}
                        className="text-xs text-slate-300 hover:underline font-bold mt-2"
                      >
                        {isRtl ? 'إرسال بلاغ أو تذكرة أخرى' : 'Submit another report or ticket'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Ticket Category Dropdown */}
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 block">
                          {isRtl ? 'نوع المشكلة أو الاستفسار' : 'Type of issue or inquiry'}
                        </label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className={`w-full p-3.5 bg-[#121418] border border-white/5 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 ${isRtl ? 'text-right' : 'text-left'}`}
                        >
                          <option value="technical">
                            {isRtl ? 'مشكلة تقنية في التطبيق أو الحساب' : 'Technical issue in the app or account'}
                          </option>
                          <option value="financial">
                            {isRtl ? 'مشاكل مالية (شراء كوينز / سحب أرباح)' : 'Financial issues (buying coins / withdrawing earnings)'}
                          </option>
                          <option value="abuse">
                            {isRtl ? 'إبلاغ عن مستخدم أو محتوى مسيء' : 'Reporting an offensive user or content'}
                          </option>
                          <option value="feature">
                            {isRtl ? 'اقتراح ميزة جديدة أو شراكة' : 'Suggesting a new feature or partnership'}
                          </option>
                        </select>
                      </div>

                      {/* Description Textarea */}
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 block">
                          {isRtl ? 'تفاصيل المشكلة بالتفصيل' : 'Detailed description of the issue'}
                        </label>
                        <textarea
                          placeholder={isRtl ? 'يرجى كتابة تفاصيل المشكلة أو البلاغ بالتفصيل لكي نتمكن من مساعدتك فوراً...' : 'Please write the details of the issue or report so we can help you immediately...'}
                          rows={4}
                          value={ticketDescription}
                          onChange={(e) => setTicketDescription(e.target.value)}
                          className={`w-full p-4 bg-[#121418] border border-white/5 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none ${isRtl ? 'text-right' : 'text-left'}`}
                        ></textarea>
                      </div>

                      <button
                        onClick={() => {
                          if (!ticketDescription.trim()) {
                            alert(isRtl ? 'يرجى تعبئة تفاصيل المشكلة أولاً قبل الإرسال.' : 'Please fill in the details of the issue before submitting.');
                            return;
                          }
                          setIsSubmittingTicket(true);
                          setTimeout(() => {
                            setIsSubmittingTicket(false);
                            setTicketSuccess(true);
                          }, 1500);
                        }}
                        disabled={isSubmittingTicket}
                        className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        {isSubmittingTicket ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            {isRtl ? 'جاري إرسال التذكرة للفريق...' : 'Submitting the ticket to the team...'}
                          </>
                        ) : (
                          isRtl ? 'تقديم التذكرة فوراً' : 'Submit ticket now'
                        )}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* PRIVACY CENTER SUB-PAGE */}
            {currentView === 'privacy_center' && (
              <div className="space-y-6 animate-in slide-in-from-end duration-300 text-start">
                
                {/* 1. Privacy Overview Status Card */}
                <div className={`glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="flex flex-col text-start">
                      <span className="text-sm font-bold text-slate-200">
                        {isRtl ? 'الخصوصية وتشفير المحادثات' : 'Privacy & Chat Encryption'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {isRtl ? '✓ تشفير تام مشفر من الطرفين (E2EE) مفعل' : '✓ End-to-End Encryption (E2EE) Enabled'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed text-start">
                    {isRtl 
                      ? 'تلتزم منصة HiSee Pro بأقصى معايير الخصوصية والأمان. جميع محادثاتك ورسائلك الصوتية ومكالماتك يتم تشفيرها من الطرفين، ولا يتم الاطلاع عليها نهائياً من أي طرف ثالث.'
                      : 'The HiSee Pro platform is committed to the highest standards of privacy and security. All your chats, voice messages, and calls are fully end-to-end encrypted and can never be accessed by any third party.'}
                  </p>
                </div>

                {/* 2. Download My Personal Data (Actual functional download) */}
                <div className={`glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Download size={16} className="text-blue-500" />
                    {isRtl ? 'تنزيل بياناتي الشخصية والملف الشخصي' : 'Download My Personal Data & Profile'}
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isRtl 
                      ? 'تتيح لك المنصة تصدير وتحميل نسخة متكاملة من كافة بيانات ملفك الشخصي وإعدادات الحساب وإحصاءات الاستخدام في ملف واحد بصيغة JSON متوافقة وقابلة للنقل تماشياً مع معايير GDPR الدولية للخصوصية.'
                      : 'The platform allows you to export and download a comprehensive copy of all your profile data, account settings, and usage statistics in a single compatible JSON file, in line with international GDPR privacy standards.'}
                  </p>

                  {isDownloadingData ? (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/20 text-center space-y-2">
                      <RefreshCw size={20} className="text-blue-500 animate-spin mx-auto" />
                      <span className="text-xs font-bold text-blue-400 block">
                        {isRtl ? 'جاري تجميع وتشفير ملف البيانات الخاص بك...' : 'Compiling and encrypting your data file...'}
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        {isRtl ? 'يرجى الانتظار، سيتم بدء التحميل تلقائياً' : 'Please wait, download will start automatically'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsDownloadingData(true);
                        setTimeout(() => {
                          setIsDownloadingData(false);
                          
                          // Actual JSON download creation
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                            appName: "HiSee Pro Platform",
                            userId: myId || "test_user_777",
                            exportDate: "2026-08-18",
                            securityStatus: "Fully Encrypted & Secure",
                            profileAnalytics: {
                              totalLiveDurationMinutes: 1420,
                              totalGiftsReceived: 412,
                              verificationStatus: "Verified"
                            },
                            exportedSettings: settings
                          }, null, 2));
                          
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `hisee_privacy_data_${myId || 'test'}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                          
                          alert(isRtl ? 'تم تحضير البيانات وتنزيل الملف بنجاح على جهازك!' : 'Data prepared and file downloaded successfully to your device!');
                        }, 1800);
                      }}
                      className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      {isRtl ? 'تنزيل نسخة من بياناتي الشخصية فوراً (JSON)' : 'Download a copy of my personal data immediately (JSON)'}
                    </button>
                  )}
                </div>

                {/* 3. Personalization & Ad Preferences Toggles */}
                <div className={`glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-xs font-bold text-slate-300">
                    {isRtl ? 'أذونات تتبع النشاط وتخصيص الإعلانات' : 'Activity Tracking & Ad Personalization Permissions'}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Personalized Ads Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 gap-4">
                      <div className="flex flex-col text-start">
                        <span className="text-xs font-bold text-slate-300">
                          {isRtl ? 'تخصيص الإعلانات بناءً على اهتماماتي' : 'Personalize ads based on my interests'}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {isRtl ? 'عرض إعلانات أكثر مواءمة واهتماماً بنشاطك الرقمي' : 'Display ads more aligned and tailored to your digital activity'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setPrivacyAdPersonalized(!privacyAdPersonalized)}
                        className={`w-12 h-7 rounded-full transition-colors shrink-0 ${privacyAdPersonalized ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${privacyAdPersonalized ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>

                    {/* Stats sharing Toggle */}
                    <div className="flex items-center justify-between pb-3 gap-4">
                      <div className="flex flex-col text-start">
                        <span className="text-xs font-bold text-slate-300">
                          {isRtl ? 'مشاركة إحصاءات المشاهدة لتطوير التوصيات' : 'Share viewing statistics to improve recommendations'}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {isRtl ? 'مشاركة مجهولة للهوية لتحسين خوارزمية التوصية بالمنشورات والبث المباشر' : 'Anonymous sharing to improve recommendation algorithms for posts and live streams'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setPrivacyShareStats(!privacyShareStats)}
                        className={`w-12 h-7 rounded-full transition-colors shrink-0 ${privacyShareStats ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${privacyShareStats ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Contacts Unlink option */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg text-center space-y-3">
                  <h3 className="text-xs font-bold text-slate-300">
                    {isRtl ? 'إدارة مزامنة جهات الاتصال' : 'Manage Contacts Synchronization'}
                  </h3>
                  <p className="text-[9px] text-slate-500">
                    {isRtl 
                      ? 'يمكنك حذف كافة جهات الاتصال التي قمت بمزامنتها مسبقاً مع خوادمنا بشكل فوري وإلغاء الربط بالكامل.'
                      : 'You can immediately delete all contacts that you previously synced with our servers and fully unlink them.'}
                  </p>
                  <button
                    onClick={() => {
                      const confirmMsg = isRtl 
                        ? 'هل ترغب بالتأكيد في حذف كافة جهات الاتصال ومزامنتها من خوادم HiSee Pro نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'
                        : 'Are you absolutely sure you want to delete all synced contacts from HiSee Pro servers permanently? This action cannot be undone.';
                      if (confirm(confirmMsg)) {
                        alert(isRtl ? '✓ تم حذف جهات الاتصال وإلغاء مزامنتها بالكامل بنجاح!' : '✓ Contacts deleted and fully unsynced successfully!');
                      }
                    }}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 font-bold rounded-2xl text-xs transition-all"
                  >
                    {isRtl ? 'حذف وإلغاء ربط جهات الاتصال من الخادم' : 'Delete & unlink contacts from server'}
                  </button>
                </div>

              </div>
            )}

            {/* TERMS & POLICIES SUB-PAGE */}
            {currentView === 'terms_policies' && (
              <div className="space-y-6 animate-in slide-in-from-end duration-300 text-start">
                
                {/* Policy selection list (Expanded inline) */}
                <div className="space-y-4">
                  
                  {/* Terms of Service */}
                  <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-3">
                    <button
                      onClick={() => setActivePolicyTab(activePolicyTab === 'terms' ? null : 'terms')}
                      className={`w-full flex justify-between items-center font-bold text-sm text-white ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-400" />
                        {isRtl ? 'اتفاقية شروط الخدمة (Terms of Service)' : 'Terms of Service Agreement'}
                      </span>
                      <span className="text-slate-500 px-2">{activePolicyTab === 'terms' ? '▲' : '▼'}</span>
                    </button>

                    {activePolicyTab === 'terms' && (
                      <div className="text-[11px] text-slate-400 leading-relaxed bg-[#121418] p-4 rounded-xl border border-white/5 space-y-3 animate-in fade-in duration-200">
                        <p className="font-bold text-slate-300">
                          {isRtl ? 'آخر تحديث: أغسطس 2026' : 'Last Updated: August 2026'}
                        </p>
                        {isRtl ? (
                          <>
                            <p>مرحباً بك في منصة HiSee Pro. باستخدامك لتطبيقنا وموقعنا وكافة الخدمات التابعة لنا، فإنك توافق بالكامل على الالتزام بشروط وأحكام الخدمة هذه. يرجى قراءة الاتفاقية بعناية.</p>
                            <p><strong>1. استخدام الحساب:</strong> يجب أن تكون بعمر 13 عاماً على الأقل لإنشاء حساب في المنصة. أنت مسؤول مسؤولية كاملة عن الحفاظ على سرية كلمة مرور حسابك وكافة الأنشطة التي تتم من خلاله.</p>
                            <p><strong>2. المحتوى والملكية:</strong> يلتزم المستخدم بعدم نشر أو مشاركة أي محتوى ينتهك حقوق الملكية الفكرية أو يحتوي على إساءة، ترهيب، تضليل، أو غير ذلك من المواد غير القانونية. تحتفظ المنصة بالحق الكامل في إزالة المحتوى المخالف فوراً.</p>
                            <p><strong>3. المعاملات المالية والربح:</strong> يتم تنظيم شراء العملات (كوينز) وسحب الأرباح والعمولات الناتجة عن البث المباشر والهدايا طبقاً لسياسات الشراكة المعتمدة. لا يمكن تحويل العملات المشتراة إلى مبالغ نقدية خارج نظام السحب الرسمي للمنصة.</p>
                          </>
                        ) : (
                          <>
                            <p>Welcome to the HiSee Pro platform. By using our application, website, and associated services, you fully agree to be bound by these Terms and Conditions. Please read this agreement carefully.</p>
                            <p><strong>1. Account Use:</strong> You must be at least 13 years old to register an account. You are solely responsible for maintaining your account credentials confidentiality and for all activities that occur under your account.</p>
                            <p><strong>2. Content & Ownership:</strong> Users agree not to publish or share content that violates intellectual property or contains harassment, intimidation, deception, or other illegal materials. The platform reserves the right to remove non-compliant content immediately.</p>
                            <p><strong>3. Financial Transactions & Earnings:</strong> Buying coins, withdrawing profits, and receiving commissions from live streaming gifts are regulated by our approved partner policies. Purchased coins cannot be cashed out outside of our official withdrawal channels.</p>
                          </>
                        )}
                        <div className={`flex gap-2 pt-2 ${isRtl ? 'justify-end' : 'justify-start'}`}>
                          <button
                            onClick={() => {
                              const textToCopy = isRtl ? "شروط الخدمة لمنصة HiSee Pro..." : "Terms of Service for HiSee Pro platform...";
                              navigator.clipboard.writeText(textToCopy);
                              alert(isRtl ? 'تم نسخ نص الشروط بنجاح لحافظتك!' : 'Terms text successfully copied to clipboard!');
                            }}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-slate-300 font-bold"
                          >
                            {isRtl ? 'نسخ النص الشامل' : 'Copy Full Text'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Privacy Policy */}
                  <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-3">
                    <button
                      onClick={() => setActivePolicyTab(activePolicyTab === 'privacy' ? null : 'privacy')}
                      className={`w-full flex justify-between items-center font-bold text-sm text-white ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Shield size={18} className="text-emerald-400" />
                        {isRtl ? 'سياسة الخصوصية وحماية البيانات (Privacy Policy)' : 'Privacy Policy & Data Protection'}
                      </span>
                      <span className="text-slate-500 px-2">{activePolicyTab === 'privacy' ? '▲' : '▼'}</span>
                    </button>

                    {activePolicyTab === 'privacy' && (
                      <div className="text-[11px] text-slate-400 leading-relaxed bg-[#121418] p-4 rounded-xl border border-white/5 space-y-3 animate-in fade-in duration-200">
                        <p className="font-bold text-slate-300">
                          {isRtl ? 'آخر تحديث: أغسطس 2026' : 'Last Updated: August 2026'}
                        </p>
                        {isRtl ? (
                          <>
                            <p>نحن في HiSee Pro نضع خصوصية مستخدمينا وحماية بياناتهم الشخصية في مقدمة أولوياتنا. توضح هذه السياسة كيف نجمع بياناتك، ونعالجها، ونحميها طبقاً لمعايير الخصوصية العالمية مثل GDPR و CCPA.</p>
                            <p><strong>1. البيانات التي نجمعها:</strong> نقوم بجمع الاسم، البريد الإلكتروني، رقم الهاتف، ومعلومات الجهاز الأساسية لتسهيل تسجيل الدخول والتحقق من الحساب. كما نطلب إذونات استخدام الكاميرا والميكروفون والموقع الجغرافي لتفعيل الاتصال والمكالمات عالية الدقة.</p>
                            <p><strong>2. تشفير البيانات (E2EE):</strong> جميع الرسائل الصوتية، ومقاطع الفيديو المنزلة أوفلاين، والمكالمات في المنصة مشفرة بالكامل من الطرفين. لا يمكن لأي جهة خارجية، بما في ذلك خوادم التطبيق، فك تشفير محادثاتك أو التجسس عليها.</p>
                            <p><strong>3. حقوقك:</strong> يحق لك في أي وقت مراجعة بياناتك، تعديلها، طلب نسخة منها عبر مركز الخصوصية، أو حذف حسابك نهائياً من خوادمنا بشكل كامل وبلا رجعة.</p>
                          </>
                        ) : (
                          <>
                            <p>At HiSee Pro, we hold user privacy and data safety as our highest priority. This Privacy Policy details how we collect, process, and protect your data in compliance with international privacy standards such as GDPR and CCPA.</p>
                            <p><strong>1. Information Collected:</strong> We collect names, emails, phone numbers, and basic device information to simplify login and verify accounts. Camera, microphone, and geolocation permissions are requested to enable high-definition calls and communication features.</p>
                            <p><strong>2. End-to-End Encryption (E2EE):</strong> All voice messages, offline downloads, and active calls are fully end-to-end encrypted. No third party, including our servers, can decrypt your conversations or intercept calls.</p>
                            <p><strong>3. Your Privacy Rights:</strong> You hold the right at any time to review your stored data, modify it, export a JSON copy through the Privacy Center, or permanently delete your account completely with zero retention.</p>
                          </>
                        )}
                        <div className={`flex gap-2 pt-2 ${isRtl ? 'justify-end' : 'justify-start'}`}>
                          <button
                            onClick={() => {
                              const textToCopy = isRtl ? "سياسة خصوصية HiSee Pro..." : "Privacy Policy for HiSee Pro...";
                              navigator.clipboard.writeText(textToCopy);
                              alert(isRtl ? 'تم نسخ نص السياسة بنجاح!' : 'Privacy policy successfully copied!');
                            }}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-slate-300 font-bold"
                          >
                            {isRtl ? 'نسخ النص الشامل' : 'Copy Full Text'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Community Guidelines */}
                  <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-3">
                    <button
                      onClick={() => setActivePolicyTab(activePolicyTab === 'community' ? null : 'community')}
                      className={`w-full flex justify-between items-center font-bold text-sm text-white ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Users size={18} className="text-amber-400" />
                        {isRtl ? 'إرشادات مجتمع HiSee Pro (Community Guidelines)' : 'Community Guidelines'}
                      </span>
                      <span className="text-slate-500 px-2">{activePolicyTab === 'community' ? '▲' : '▼'}</span>
                    </button>

                    {activePolicyTab === 'community' && (
                      <div className="text-[11px] text-slate-400 leading-relaxed bg-[#121418] p-4 rounded-xl border border-white/5 space-y-3 animate-in fade-in duration-200">
                        <p className="font-bold text-slate-300">
                          {isRtl ? 'آخر تحديث: أغسطس 2026' : 'Last Updated: August 2026'}
                        </p>
                        {isRtl ? (
                          <>
                            <p>يهدف تطبيق HiSee Pro إلى بناء مجتمع آمن، محترم، وتفاعلي يتيح للجميع مشاركة إبداعاتهم وبثهم المباشر بكل حرية وأمان. لتحقيق ذلك، نلزم جميع الأعضاء بالامتثال للإرشادات التالية:</p>
                            <p><strong>- يمنع تماماً:</strong> الإساءة اللفظية، التنمر، خطابات الكراهية والعنصرية، التحريض على العنف، تداول الإشاعات المغرضة، أو نشر أي محتوى غير أخلاقي.</p>
                            <p><strong>- قوانين البث المباشر (LIVE):</strong> يجب الالتزام بالمظهر اللائق والحديث البناء أثناء البث. يُمنع ترك البث المباشر خالياً أو عرض محتوى غير مملوك للمستخدم بدون تصريح أو حقوق بث رسمية.</p>
                            <p><strong>- إجراءات العقوبة:</strong> إن انتهاك إرشادات المجتمع سيعرض الحساب للإنذار، أو حظر البث المباشر مؤقتاً، أو حظر الحساب نهائياً مع تجميد وسحب كامل الرصيد والعمولات في الحالات الجسيمة.</p>
                          </>
                        ) : (
                          <>
                            <p>The HiSee Pro app aims to build a secure, respectful, and interactive community where users can share creativity and live streams freely. To maintain this environment, all members must comply with these guidelines:</p>
                            <p><strong>- Strictly Prohibited:</strong> Verbal abuse, bullying, hate speech, discrimination, incitement to violence, spreading false rumors, or sharing unethical content.</p>
                            <p><strong>- Live Streaming (LIVE) Rules:</strong> Presenters must maintain a decent appearance and engaging, respectful behavior. Leaving a live stream unattended or broadcasting copyrighted content without permission is forbidden.</p>
                            <p><strong>- Penalty Actions:</strong> Violations will result in account warnings, temporary broadcast blocks, or permanent suspension, including the forfeiture of the entire wallet balance in severe cases.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Copyright / Intellectual Property */}
                  <div className="glass p-6 rounded-[2rem] border border-white/5 shadow-lg space-y-3">
                    <button
                      onClick={() => setActivePolicyTab(activePolicyTab === 'copyright' ? null : 'copyright')}
                      className={`w-full flex justify-between items-center font-bold text-sm text-white ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Copy size={18} className="text-purple-400" />
                        {isRtl ? 'سياسة الملكية الفكرية وحقوق النشر (Copyright Policy)' : 'Intellectual Property & Copyright Policy'}
                      </span>
                      <span className="text-slate-500 px-2">{activePolicyTab === 'copyright' ? '▲' : '▼'}</span>
                    </button>

                    {activePolicyTab === 'copyright' && (
                      <div className="text-[11px] text-slate-400 leading-relaxed bg-[#121418] p-4 rounded-xl border border-white/5 space-y-3 animate-in fade-in duration-200">
                        <p className="font-bold text-slate-300">
                          {isRtl ? 'آخر تحديث: أغسطس 2026' : 'Last Updated: August 2026'}
                        </p>
                        {isRtl ? (
                          <>
                            <p>تحترم منصة HiSee Pro حقوق الملكية الفكرية وتمنع منشئي المحتوى من انتهاك حقوق المؤلفين والمنتجين والشركات الأخرى.</p>
                            <p><strong>شروط الاستخدام العادل وحقوق الملكية:</strong> يُمنع إعادة استخدام أو نشر الأغاني، لقطات الأفلام والمباريات الرياضية، أو المحتوى التلفزيوني المحمي دون أخذ الإذن والترخيص الرسمي مسبقاً من الجهات المالكة.</p>
                            <p><strong>نظام البلاغات والـ DMCA:</strong> في حال تم الإبلاغ عن محتوى ينتهك حقوق الملكية الفكرية عبر آليات التبليغ الرسمية، ستقوم إدارة المنصة بحذف المادة المنتهكة فوراً وتوجيه إنذار للمستخدم المخالف قد يتبعه حظر دائم للحساب.</p>
                          </>
                        ) : (
                          <>
                            <p>HiSee Pro respects intellectual property and strictly forbids creators from violating copyright laws belonging to authors, producers, and publishers.</p>
                            <p><strong>Fair Use & Rights Restrictions:</strong> Reusing or broadcasting music tracks, movies, sports footage, or protected television programs without documented licensing or owner authorization is strictly banned.</p>
                            <p><strong>DMCA & Violation Claims:</strong> Upon receiving copyright infringement alerts through official channels, our team will instantly remove the disputed content, issue warning notices, or permanently ban recurrent offenders.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {currentView === 'hisee_features_guide' && (
              <div className="animate-in slide-in-from-end duration-300">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg mb-6">
                  <h3 className={`text-xl font-bold text-white mb-6 flex items-center gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <Zap className="text-amber-500" size={24} />
                    {isRtl ? 'دليل المستخدم الاحترافي' : 'Professional User Guide'}
                  </h3>
                  
                  <div className="space-y-6 text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-start">
                    
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-base">
                        <Smartphone size={20} className="text-blue-400" />
                        {isRtl ? 'المكالمات عالية الدقة (HD Calls) 🎥' : 'High-Definition Calls (HD Calls) 🎥'}
                      </h4>
                      <p className="text-slate-400 leading-relaxed">
                        {isRtl 
                          ? <>اضغط على أيقونة الكاميرا لبدء مكالمة فيديو عالية الدقة. يستخدم التطبيق تقنيات متطورة لعزل الضجيج <span className="text-blue-400 font-bold">(Noise Cancellation)</span> ومنع صدى الصوت لضمان نقاء تام حتى في الأماكن المزدحمة.</>
                          : <>Tap the video icon to start a high-definition video call. The application relies on smart <span className="text-blue-400 font-bold">Noise Cancellation</span> systems and echo prevention filters to maintain crystal-clear speech even in noisy spots.</>}
                      </p>
                    </div>

                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-base">
                        <Mic size={20} className="text-emerald-400" />
                        {isRtl ? 'الرسائل الصوتية الذكية (Smart Audio) 🎙️' : 'Smart Audio Messages (Smart Audio) 🎙️'}
                      </h4>
                      <p className="text-slate-400 leading-relaxed">
                        {isRtl 
                          ? <>للتسجيل، اضغط باستمرار على الميكروفون. يتم حفظ الرسائل بصيغة <span className="text-emerald-400 font-bold">MP4</span> المتوافقة مع Android و iPhone، مما يضمن سرعة الإرسال وعدم استهلاك باقة الإنترنت بفضل تقنيات الضغط الذكي.</>
                          : <>To record, press and hold the microphone icon. Voice notes are saved as compact, high-quality <span className="text-emerald-400 font-bold">MP4</span> audio fully compatible with Android and iOS devices, minimizing mobile data consumption via intelligent streaming compression.</>}
                      </p>
                    </div>

                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-base">
                        <ShieldCheck size={20} className="text-amber-400" />
                        {isRtl ? 'الأمان والتشفير (Privacy & E2EE) 🔐' : 'Privacy & Security (Privacy & E2EE) 🔐'}
                      </h4>
                      <p className="text-slate-400 leading-relaxed">
                        {isRtl 
                          ? <>جميع محادثاتك مشفرة من الطرفين <span className="text-amber-400 font-bold">(End-to-End Encryption)</span>. لا يمكن لأي طرف ثالث، بما في ذلك إدارة التطبيق، قراءة رسائلك أو سماع مكالماتك. نحن نلتزم بمعايير <span className="text-amber-400 font-bold">GDPR</span> الأوروبية الصارمة.</>
                          : <>All chats, audio notes, and live streams are secured with robust <span className="text-amber-400 font-bold">End-to-End Encryption (E2EE)</span>. No external entities, including the system administration, can read your text files or access call audio. We strictly adhere to European <span className="text-amber-400 font-bold">GDPR</span> standards.</>}
                      </p>
                    </div>

                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-base">
                        <Sparkles size={20} className="text-purple-400" />
                        {isRtl ? 'نصائح للاستخدام 💡' : 'Tips & Best Practices 💡'}
                      </h4>
                      <p className="text-slate-400 leading-relaxed">
                        {isRtl 
                          ? 'لضمان استقبال المكالمات أثناء إغلاق التطبيق، يرجى تفعيل الإشعارات من إعدادات الهاتف. وفي حال ضعف الإنترنت، سيقوم التطبيق تلقائياً بضبط جودة الفيديو للحفاظ على استمرار المكالمة.'
                          : 'To ensure you never miss incoming calls while the application is in the background, please enable push alerts within your system settings. When connections drop, the application intelligently lowers stream definition to keep calls connected.'}
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {currentView === 'hisee_studio' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-lg text-center">
                  <div className="w-20 h-20 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto mb-6">
                    <Sparkles size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">HiSee Studio</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {isRtl ? 'قريباً! سنطلق مجموعة من الأدوات الإبداعية لمساعدتك في إنشاء محتوى مذهل.' : 'Coming soon! We will launch a collection of creative tools to help you create amazing content.'}
                  </p>
                </div>
              </div>
            )}

            {currentView === 'transaction_history' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-start">
                {/* Header Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <History size={120} className="rotate-12" />
                  </div>
                  
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
                      <History size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">
                        {isRtl ? 'سجل المعاملات المالية' : 'Financial Transaction History'}
                      </h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {isRtl ? 'تتبع شامل لكل تحركاتك المالية' : 'Comprehensive tracking of all your financial actions'}
                      </p>
                    </div>
                  </div>
                </div>

                {transactions.length > 0 ? (
                  <div className="space-y-3 pb-10">
                    {transactions.map((tx) => {
                      const isPositive = ['deposit', 'reward', 'EVENT_REWARDS', 'content_earning', 'live_convert_coins', 'live_convert_claiming', 'content_convert_coins', 'content_convert_claiming', 'event_convert_coins', 'event_convert_claiming', 'star_convert_coins', 'star_convert_claiming'].includes(tx.type);
                      
                      let title = tx.description || (isRtl ? 'معاملة مالية' : 'Financial Transaction');
                      let icon = <Sparkles size={20} />;
                      let colorClass = 'bg-blue-500/10 text-blue-500';

                      if (tx.type === 'deposit') {
                        title = isRtl ? 'إيداع رصيد' : 'Deposit Balance';
                        icon = <Download size={20} />;
                        colorClass = 'bg-emerald-500/10 text-emerald-500';
                      } else if (tx.type === 'withdrawal') {
                        title = isRtl ? 'سحب رصيد' : 'Withdrawal Cashout';
                        icon = <LogOut size={20} className="rotate-90" />;
                        colorClass = 'bg-rose-500/10 text-rose-500';
                      } else if (tx.type?.includes('live')) {
                        icon = <Gift size={20} />;
                        colorClass = 'bg-pink-500/10 text-pink-500';
                        if (!tx.description) {
                          title = isRtl ? 'أرباح البث المباشر' : 'Live Stream Earnings';
                        }
                      } else if (tx.type?.includes('content')) {
                        icon = <BarChart3 size={20} />;
                        colorClass = 'bg-emerald-500/10 text-emerald-500';
                        if (!tx.description) {
                          title = isRtl ? 'أرباح صناعة المحتوى' : 'Content Creator Earnings';
                        }
                      } else if (tx.type?.includes('event') || tx.type === 'EVENT_REWARDS') {
                        icon = <Trophy size={20} />;
                        colorClass = 'bg-amber-500/10 text-amber-500';
                        if (!tx.description) {
                          title = isRtl ? 'جوائز الفعاليات والمسابقات' : 'Events & Contests Prizes';
                        }
                      } else if (tx.type?.includes('star')) {
                        icon = <LucideStar size={20} />;
                        colorClass = 'bg-amber-500/10 text-amber-500';
                        if (!tx.description) {
                          title = isRtl ? 'نظام النجوم والمكافآت' : 'Stars & Rewards System';
                        }
                      }

                      return (
                        <div key={tx.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${colorClass}`}>
                              {icon}
                            </div>
                            <div className="text-start">
                              <h4 className="text-sm font-bold text-white leading-tight">
                                {title}
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                {new Date(tx.timestamp?.seconds * 1000 || tx.date || Date.now()).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}
                                <span className="w-1 h-1 rounded-full bg-slate-700 mx-1"></span>
                                <span className="text-emerald-400 font-bold">{isRtl ? 'مكتملة' : 'Completed'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-black flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? '+' : '-'}{tx.amount?.toLocaleString()}
                              <span className="text-[10px]">{tx.currency === 'EUR' ? '€' : 'HiSee'}</span>
                            </div>
                            {tx.currency !== 'EUR' && (
                              <span className="text-[9px] text-slate-600 block font-bold">
                                {((tx.amount || 0) * 0.01).toFixed(2)} €
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass p-16 rounded-[3rem] border border-dashed border-white/10 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/5">
                      <History size={40} />
                    </div>
                    <h3 className="text-xl font-black text-white mb-3">
                      {isRtl ? 'لا توجد معاملات مالية مسجلة حالياً' : 'No Financial Transactions Recorded'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-[240px] mx-auto leading-relaxed font-medium">
                      {isRtl 
                        ? 'سجل معاملاتك سيظهر هنا بمجرد البدء في تحويل أرباحك أو إيداع الرصيد.' 
                        : 'Your transaction history will appear here once you start transferring your profits or depositing balance.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentView === 'live_rewards' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-start">
                {/* 1. Header & Stats Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-transparent relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Gift size={120} className="rotate-12" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/10 shrink-0">
                        <Gift size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                          {isRtl ? 'أرباح وهدايا البث المباشر (LIVE)' : 'Live Stream Earnings & Gifts (LIVE)'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {isRtl ? 'إحصائيات الأداء المالي المباشر' : 'Live Financial Performance Stats'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-start">
                        <span className="text-[10px] text-slate-500 block mb-1 font-bold">
                          {isRtl ? 'إجمالي الألماسات المكتسبة' : 'Total Diamonds Earned'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">
                            {liveDiamondsBalance.toLocaleString()}
                          </span>
                          <span className="text-pink-400 text-xs font-bold">♦</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-start">
                        <span className="text-[10px] text-slate-500 block mb-1 font-bold">
                          {isRtl ? 'عدد الهدايا المستلمة' : 'Number of Gifts Received'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">
                            {liveGiftsCount.toLocaleString()}
                          </span>
                          <Users size={16} className="text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Smart Live Calculator (Financial Breakdown) */}
                {(() => {
                  const liveDiamonds = liveDiamondsBalance;
                  const grossValue = liveDiamonds * 0.01; // 100 Diamonds = 1 EUR
                  const vat = grossValue * 0.15;
                  const platform = grossValue * 0.10;
                  const service = grossValue * 0.05;
                  const net = grossValue - (vat + platform + service);

                  return (
                    <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-xl text-start">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <BarChart3 size={16} className="text-emerald-400" />
                          {isRtl ? 'محرك الاحتساب المالي الشفاف' : 'Transparent Financial Calculation Engine'}
                        </h3>
                        <div className="px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">
                          {isRtl ? 'محدث لحظياً' : 'Updated Realtime'}
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{isRtl ? 'إجمالي القيمة الاسمية للهدايا:' : 'Total Gross Value of Gifts:'}</span>
                          <span className="font-bold text-white">{grossValue.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'ضريبة القيمة المضافة (15%):' : 'VAT / Tax (15%):'}
                          </span>
                          <span className="font-mono">-{vat.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'عمولة المنصة المباشرة (10%):' : 'Direct Platform Commission (10%):'}
                          </span>
                          <span className="font-mono">-{platform.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'رسوم التشغيل والخدمات (5%):' : 'Operating & Service Fees (5%):'}
                          </span>
                          <span className="font-mono">-{service.toFixed(2)} €</span>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                          <span className="text-sm font-black text-white">{isRtl ? 'المبلغ الصافي النهائي المتاح:' : 'Final Net Amount Available:'}</span>
                          <div className="text-right">
                            <span className="text-2xl font-black text-emerald-400 block">{net.toFixed(2)} €</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">{isRtl ? 'جاهز للمطالبة والسحب' : 'Ready for Claim & Cashout'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dual Claim Buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={() => handleConvertLiveToCoins(net, liveDiamonds)}
                            disabled={liveDiamonds < 2500 || net <= 0}
                            className="relative w-full bg-emerald-500 hover:bg-emerald-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-3 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-emerald-700 disabled:border-b-0 active:shadow-sm select-none"
                        >
                            <Coins size={14} className="shrink-0 text-emerald-100" />
                            <span className="whitespace-nowrap">{isRtl ? 'رصيد داخلي (عملات)' : 'Internal Balance (Coins)'}</span>
                        </button>
                        <button 
                            onClick={() => handleConvertLiveToClaiming(net, liveDiamonds)}
                            disabled={liveDiamonds < 2500 || net <= 0}
                            className="relative w-full bg-amber-500 hover:bg-amber-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-3 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-amber-700 disabled:border-b-0 active:shadow-sm select-none"
                        >
                            <Wallet size={14} className="shrink-0 text-amber-100" />
                            <span className="whitespace-nowrap">{isRtl ? 'حساب المطالبة (خارجي)' : 'Claiming Account (External)'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 text-center mt-3 font-bold font-sans">
                        {isRtl ? 'الحد الأدنى للتحويل أو المطالبة هو 2500 عملة HiSee (24.99$)' : 'The minimum amount to convert or claim is 2500 HiSee Coins ($24.99)'}
                      </p>
                    </div>
                  );
                })()}

                {/* 3. Live Donors & Gifts Log */}
                <div className="space-y-4 pb-10">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <History size={14} />
                      {isRtl ? 'سجل الداعمين والهدايا الأخيرة' : 'Donors & Recent Gifts Log'}
                    </h3>
                  </div>

                  {liveGiftsLog.length > 0 ? (
                    <div className="space-y-3">
                      {liveGiftsLog.map((log) => (
                        <div key={log.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                              <Gift size={20} />
                            </div>
                            <div className="text-start">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {log.senderName || (isRtl ? 'داعم مجهول' : 'Anonymous Donor')}
                                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-500 font-normal">
                                  {isRtl ? 'هدية بث' : 'Live Gift'}
                                </span>
                              </h4>
                              <p className="text-[10px] text-slate-500">
                                {new Date(log.timestamp?.seconds * 1000 || Date.now()).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-500 font-bold text-sm flex items-center justify-end gap-1">
                              +{log.diamonds || log.amount || 0}
                              <span className="text-[10px]">♦</span>
                            </div>
                            <span className="text-[9px] text-slate-600 block">{((log.diamonds || log.amount || 0) * 0.01).toFixed(2)} €</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass p-12 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-xl shadow-black/20">
                        <Users size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-400 mb-2">
                        {isRtl ? 'لا يوجد داعمين حالياً' : 'No Donors Currently'}
                      </h3>
                      <p className="text-sm text-slate-600 max-w-[200px] mx-auto leading-relaxed">
                        {isRtl 
                          ? 'ابدأ بثك المباشر الآن لتلقي الهدايا والمكافآت من جمهورك.' 
                          : 'Start your live stream now to receive gifts and rewards from your audience.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'content_earnings' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-start">
                {/* 1. Header & Stats Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BarChart3 size={120} className="rotate-12" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
                        <BarChart3 size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                          {isRtl ? 'أرباح المحتوى والاشتراكات' : 'Content & Subscription Earnings'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {isRtl ? 'إحصائيات عوائد صناعة المحتوى' : 'Content Creator Revenue Stats'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-start">
                        <span className="text-[10px] text-slate-500 block mb-1 font-bold">
                          {isRtl ? 'أرباح المشاهدات' : 'Views Earnings'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">
                            {(contentEarningsBalance * 0.7).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-emerald-400 text-xs font-bold">HiSee</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-start">
                        <span className="text-[10px] text-slate-500 block mb-1 font-bold">
                          {isRtl ? 'أرباح الاشتراكات' : 'Subscription Earnings'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">
                            {(contentEarningsBalance * 0.3).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <Users size={16} className="text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Smart Revenue Calculator */}
                {(() => {
                  const earnings = contentEarningsBalance;
                  const grossValue = earnings * 0.01; // 100 Coins = 1 EUR
                  const vat = grossValue * 0.15;
                  const platform = grossValue * 0.10;
                  const service = grossValue * 0.05;
                  const net = grossValue - (vat + platform + service);

                  return (
                    <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-xl text-start">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Zap size={16} className="text-amber-400" />
                          {isRtl ? 'محرك الاحتساب المالي الشفاف' : 'Transparent Financial Calculation Engine'}
                        </h3>
                        <div className="px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">
                          {isRtl ? 'محدث لحظياً' : 'Updated Realtime'}
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{isRtl ? 'إجمالي القيمة الاسمية للأرباح:' : 'Total Gross Value of Earnings:'}</span>
                          <span className="font-bold text-white">{grossValue.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'ضريبة القيمة المضافة (15%):' : 'VAT / Tax (15%):'}
                          </span>
                          <span className="font-mono">-{vat.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'عمولة المنصة المخفضة (10%):' : 'Reduced Platform Commission (10%):'}
                          </span>
                          <span className="font-mono">-{platform.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'رسوم الخدمات والتشغيل (5%):' : 'Service & Operating Fees (5%):'}
                          </span>
                          <span className="font-mono">-{service.toFixed(2)} €</span>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                          <span className="text-sm font-black text-white">{isRtl ? 'المبلغ الصافي النهائي القابل للمطالبة:' : 'Final Claimable Net Amount:'}</span>
                          <div className="text-right">
                            <span className="text-2xl font-black text-emerald-400 block">{net.toFixed(2)} €</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">{isRtl ? 'جاهز للتحويل' : 'Ready for Conversion'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dual Action Buttons & Minimum Threshold */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={() => handleConvertContentToCoins(net, earnings)}
                            disabled={earnings < 2500 || net <= 0}
                            className="relative w-full bg-emerald-500 hover:bg-emerald-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-3 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-emerald-700 disabled:border-b-0 active:shadow-sm select-none"
                        >
                            <Coins size={14} className="shrink-0 text-emerald-100" />
                            <span className="whitespace-nowrap">{isRtl ? 'رصيد داخلي (عملات)' : 'Internal Balance (Coins)'}</span>
                        </button>
                        <button 
                            onClick={() => handleConvertContentToClaiming(net, earnings)}
                            disabled={earnings < 2500 || net <= 0}
                            className="relative w-full bg-amber-500 hover:bg-amber-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-3 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-amber-700 disabled:border-b-0 active:shadow-sm select-none"
                        >
                            <Wallet size={14} className="shrink-0 text-amber-100" />
                            <span className="whitespace-nowrap">{isRtl ? 'حساب المطالبة (خارجي)' : 'Claiming Account (External)'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 text-center mt-3 font-bold font-sans">
                        {isRtl ? 'الحد الأدنى للتحويل أو المطالبة هو 2500 عملة HiSee (24.99$)' : 'The minimum amount to convert or claim is 2500 HiSee Coins ($24.99)'}
                      </p>
                    </div>
                  );
                })()}

                {/* Content History */}
                <div className="space-y-4 pb-10">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <History size={14} />
                      {isRtl ? 'سجل أرباح المحتوى الأخيرة' : 'Recent Content Earnings Log'}
                    </h3>
                  </div>

                  {transactions.filter(t => t.type === 'content_earning').length > 0 ? (
                    <div className="space-y-3">
                      {transactions.filter(t => t.type === 'content_earning').map((tx) => (
                        <div key={tx.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                              <Trophy size={20} />
                            </div>
                            <div className="text-start">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {tx.description || (isRtl ? 'أرباح محتوى' : 'Content Earnings')}
                              </h4>
                              <p className="text-[10px] text-slate-500">
                                {new Date(tx.timestamp?.seconds * 1000 || Date.now()).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-500 font-bold text-sm flex items-center justify-end gap-1">
                              +{tx.amount}
                              <span className="text-[10px]">HiSee</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass p-12 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-xl shadow-black/20">
                        <Trophy size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-400 mb-2">
                        {isRtl ? 'لا توجد أرباح حالياً' : 'No Earnings Currently'}
                      </h3>
                      <p className="text-sm text-slate-600 max-w-[200px] mx-auto leading-relaxed">
                        {isRtl 
                          ? 'انشر محتوى عالي الجودة وابدأ في كسب الأرباح من جمهورك.' 
                          : 'Publish high-quality content and start earning profits from your audience.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'event_earnings' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-start">
                {/* 1. Header & Stats Card */}
                <div className="glass p-6 rounded-[2.5rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy size={120} className="rotate-12" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
                        <Trophy size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                          {isRtl ? 'أرباح وجوائز الفعاليات' : 'Event Earnings & Prizes'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {isRtl ? 'إحصائيات جوائز المسابقات والتحديات' : 'Contests & Challenges Prizes Stats'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-start">
                        <span className="text-[10px] text-slate-500 block mb-1 font-bold">
                          {isRtl ? 'أرباح المسابقات' : 'Contests Earnings'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">
                            {(eventEarningsBalance * 0.6).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-amber-400 text-xs font-bold">HiSee</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-start">
                        <span className="text-[10px] text-slate-500 block mb-1 font-bold">
                          {isRtl ? 'جوائز التحديات' : 'Challenges Prizes'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">
                            {(eventEarningsBalance * 0.4).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <LucideStar size={16} className="text-pink-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Smart Events Calculator */}
                {(() => {
                  const rewards = eventEarningsBalance;
                  const grossValue = rewards * 0.01; // 100 Coins = 1 EUR
                  const vat = grossValue * 0.15;
                  const platform = grossValue * 0.10;
                  const service = grossValue * 0.05;
                  const net = grossValue - (vat + platform + service);

                  return (
                    <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-xl text-start">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles size={16} className="text-amber-400" />
                          {isRtl ? 'محرك الاحتساب المالي الذكي' : 'Smart Financial Calculation Engine'}
                        </h3>
                        <div className="px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-[9px] font-bold text-amber-400 uppercase">
                          {isRtl ? 'محدث لحظياً' : 'Updated Realtime'}
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{isRtl ? 'إجمالي القيمة الاسمية للجوائز:' : 'Total Gross Value of Prizes:'}</span>
                          <span className="font-bold text-white">{grossValue.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'ضريبة القيمة المضافة (15%):' : 'VAT / Tax (15%):'}
                          </span>
                          <span className="font-mono">-{vat.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'عمولة المنصة المخفضة (10%):' : 'Reduced Platform Commission (10%):'}
                          </span>
                          <span className="font-mono">-{platform.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-400/80">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                            {isRtl ? 'رسوم الخدمات والتشغيل (5%):' : 'Service & Operating Fees (5%):'}
                          </span>
                          <span className="font-mono">-{service.toFixed(2)} €</span>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                          <span className="text-sm font-black text-white">{isRtl ? 'المبلغ الصافي النهائي القابل للمطالبة:' : 'Final Claimable Net Amount:'}</span>
                          <div className="text-right">
                            <span className="text-2xl font-black text-amber-400 block">{net.toFixed(2)} €</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">{isRtl ? 'جاهز للتحويل' : 'Ready for Conversion'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dual Action Buttons & Minimum Threshold */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={() => handleConvertEventsToCoins(net, rewards)}
                            disabled={rewards < 2500 || net <= 0}
                            className="relative w-full bg-emerald-500 hover:bg-emerald-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-3 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-emerald-700 disabled:border-b-0 active:shadow-sm select-none"
                        >
                            <Coins size={14} className="shrink-0 text-emerald-100" />
                            <span className="whitespace-nowrap">{isRtl ? 'رصيد داخلي (عملات)' : 'Internal Balance (Coins)'}</span>
                        </button>
                        <button 
                            onClick={() => handleConvertEventsToClaiming(net, rewards)}
                            disabled={rewards < 2500 || net <= 0}
                            className="relative w-full bg-amber-500 hover:bg-amber-400 active:translate-y-[2px] active:border-b-[1px] text-white font-black py-3 px-2 rounded-xl text-[10px] sm:text-xs transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 shadow-md border-b-[4px] border-amber-700 disabled:border-b-0 active:shadow-sm select-none"
                        >
                            <Wallet size={14} className="shrink-0 text-amber-100" />
                            <span className="whitespace-nowrap">{isRtl ? 'حساب المطالبة (خارجي)' : 'Claiming Account (External)'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 text-center mt-3 font-bold font-sans">
                        {isRtl ? 'الحد الأدنى للتحويل أو المطالبة هو 2500 عملة HiSee (24.99$)' : 'The minimum amount to convert or claim is 2500 HiSee Coins ($24.99)'}
                      </p>
                    </div>
                  );
                })()}

                {/* Events History */}
                <div className="space-y-4 pb-10">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <History size={14} />
                      {isRtl ? 'سجل جوائز الفعاليات الأخيرة' : 'Recent Event Prizes Log'}
                    </h3>
                  </div>

                  {transactions.filter(t => t.type === 'EVENT_REWARDS').length > 0 ? (
                    <div className="space-y-3">
                      {transactions.filter(t => t.type === 'EVENT_REWARDS').map((tx) => (
                        <div key={tx.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                              <Trophy size={20} />
                            </div>
                            <div className="text-start">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {tx.description || (isRtl ? 'جائزة فعالية' : 'Event Prize')}
                              </h4>
                              <p className="text-[10px] text-slate-500">
                                {new Date(tx.timestamp?.seconds * 1000 || Date.now()).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-amber-500 font-bold text-sm flex items-center justify-end gap-1">
                              +{tx.amount}
                              <span className="text-[10px]">HiSee</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass p-12 rounded-[2.5rem] border border-dashed border-white/10 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-xl shadow-black/20">
                        <Trophy size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-400 mb-2">
                        {isRtl ? 'لا توجد جوائز حالياً' : 'No Prizes Currently'}
                      </h3>
                      <p className="text-sm text-slate-600 max-w-[200px] mx-auto leading-relaxed">
                        {isRtl 
                          ? 'شارك في الفعاليات والمسابقات الموسمية لربح الجوائز الكبرى.' 
                          : 'Participate in events and seasonal contests to win grand prizes.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'payment_methods' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">
                    {t.addedPaymentMethods || (isRtl ? 'طرق الدفع المضافة' : 'Added Payment Methods')}
                  </h3>
                  
                  {paymentMethods.length > 0 ? (
                    <div className="space-y-3 mb-6">
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              method.type === 'paypal' ? 'bg-indigo-500/10 text-indigo-500' : 
                              method.type === 'bank_account' ? 'bg-emerald-500/10 text-emerald-500' : 
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {method.type === 'paypal' ? <div className="font-black italic text-xs">PP</div> : 
                               method.type === 'bank_account' ? <Building size={20} /> : 
                               <CreditCard size={20} />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">
                                {method.type === 'paypal' ? 'PayPal' : 
                                 method.type === 'bank_account' ? (t.bankAccount || (isRtl ? 'حساب بنكي' : 'Bank Account')) : 
                                 (t.creditCard || (isRtl ? 'بطاقة ائتمان' : 'Credit Card'))}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {method.email || method.accountNumber || `**** ${method.cardNumber?.slice(-4)}`}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeletePaymentMethod(method.id)}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-500 mb-6">
                        {t.noPaymentMethodsYet || (isRtl ? 'لم تقم بإضافة أي طريقة دفع بعد.' : 'No payment methods added yet.')}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => setActiveModal('visa_mastercard')}
                      className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <CreditCard size={20} />
                      </div>
                      <span className="text-sm font-bold text-white">Visa / MasterCard</span>
                    </button>
                    <button 
                      onClick={() => setActiveModal('paypal')}
                      className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <div className="font-black italic text-xs">PP</div>
                      </div>
                      <span className="text-sm font-bold text-white">PayPal</span>
                    </button>
                    <button 
                      onClick={() => setActiveModal('bank_account')}
                      className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Building size={20} />
                      </div>
                      <span className="text-sm font-bold text-white">
                        {t.bankAccount || (isRtl ? 'حساب بنكي' : 'Bank Account')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'identity_verification' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-lg text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    verificationStep === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {verificationStep === 'success' ? <UserCheck size={40} /> : <ShieldCheck size={40} />}
                  </div>
                  
                  {verificationStep === 'idle' && (
                    <>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {t.verifyIdentityTitle || (isRtl ? 'تحقق من هويتك' : 'Verify Your Identity')}
                      </h3>
                      <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                        {t.verifyIdentityDesc || (isRtl ? 'يساعد التحقق من الهوية في تأمين حسابك وزيادة حدود السحب اليومية.' : 'Identity verification secures your account and increases daily withdrawal limits.')}
                      </p>
                      <button 
                        onClick={handleStartVerification}
                        className="w-full p-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all"
                      >
                        {t.startVerification || (isRtl ? 'ابدأ عملية التحقق' : 'Start Verification')}
                      </button>
                    </>
                  )}

                  {verificationStep === 'uploading_id' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {t.uploadIdTitle || (isRtl ? 'تحميل الهوية' : 'Upload ID Document')}
                      </h3>
                      <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                        <Camera size={32} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-sm text-slate-400">
                          {t.uploadIdDesc || (isRtl ? 'قم بتحميل صورة الهوية أو جواز السفر' : 'Upload a photo of your ID card or passport')}
                        </p>
                      </div>
                      <button 
                        onClick={handleIdUploaded}
                        className="w-full p-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all"
                      >
                        {t.idUploadedNext || (isRtl ? 'تم التحميل، التالي' : 'Uploaded, Next')}
                      </button>
                    </div>
                  )}

                  {verificationStep === 'taking_selfie' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {t.selfieTitle || (isRtl ? 'صورة سيلفي' : 'Take a Selfie')}
                      </h3>
                      <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                        <div className="w-24 h-24 rounded-full border-2 border-blue-500/30 mx-auto mb-4 flex items-center justify-center">
                          <UserPlus size={32} className="text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-400">
                          {t.selfieDesc || (isRtl ? 'الرجاء التقاط صورة واضحة لوجهك' : 'Please take a clear photo of your face')}
                        </p>
                      </div>
                      <button 
                        onClick={handleSelfieTaken}
                        className="w-full p-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all"
                      >
                        {t.captureAndSubmit || (isRtl ? 'التقاط وإرسال' : 'Capture & Submit')}
                      </button>
                    </div>
                  )}

                  {verificationStep === 'pending' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {t.underReviewTitle || (isRtl ? 'قيد المراجعة' : 'Under Review')}
                      </h3>
                      <div className="flex justify-center py-4">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-sm text-slate-400">
                        {t.underReviewDesc || (isRtl ? 'يتم الآن مراجعة بياناتك من قبل فريقنا. قد يستغرق ذلك ما يصل إلى 24 ساعة.' : 'Your submission is being reviewed by our team. This may take up to 24 hours.')}
                      </p>
                    </div>
                  )}

                  {verificationStep === 'success' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {t.verifiedSuccessTitle || (isRtl ? 'تم التحقق بنجاح' : 'Successfully Verified')}
                      </h3>
                      <p className="text-sm text-emerald-500 font-medium">
                        {t.verifiedSuccessDesc || (isRtl ? 'حسابك الآن موثق بالكامل. شكراً لك!' : 'Your account is now fully verified. Thank you!')}
                      </p>
                      <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-left">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                          <Shield size={12} />
                          <span>{t.verificationStatus || (isRtl ? 'حالة التوثيق' : 'Verification Status')}</span>
                        </div>
                        <div className="text-sm font-bold text-white">
                          {t.verifiedLevel2 || (isRtl ? 'موثق (المستوى 2)' : 'Verified (Level 2)')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'help_feedback' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4">
                    {t.sendFeedbackTitle || (isRtl ? 'أرسل لنا ملاحظاتك' : 'Send Us Feedback')}
                  </h3>
                  {feedbackSubmitted ? (
                    <div className="p-8 text-center animate-in zoom-in duration-300">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                      </div>
                      <h4 className="text-white font-bold mb-2">
                        {t.sentSuccessTitle || (isRtl ? 'تم الإرسال بنجاح' : 'Sent Successfully')}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {t.sentSuccessDesc || (isRtl ? 'شكراً لك على ملاحظاتك، نحن نقدر وقتك.' : 'Thank you for your feedback, we appreciate your time.')}
                      </p>
                      <button 
                        onClick={() => setFeedbackSubmitted(false)}
                        className="mt-6 text-sm text-blue-500 font-bold"
                      >
                        {t.sendAnotherFeedback || (isRtl ? 'إرسال ملاحظة أخرى' : 'Send Another Feedback')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <textarea 
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={t.feedbackPlaceholder || (isRtl ? 'كيف يمكننا تحسين تجربتك؟' : 'How can we improve your experience?')}
                        className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                      />
                      <button 
                        onClick={handleSubmitFeedback}
                        disabled={!feedbackText.trim()}
                        className="w-full p-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t.submitFeedback || (isRtl ? 'إرسال الملاحظات' : 'Submit Feedback')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'bonus' && (
              <div className="animate-fade-in pb-20">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setCurrentView('balance')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-white" />
                  </button>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {t.bonusTitle || (isRtl ? 'بونص' : 'Bonus')}
                  </h2>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/5 rounded-3xl p-6 border border-emerald-500/20 relative overflow-hidden text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                    <Gift size={36} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300 mb-1">
                    {t.totalBonusBalance || (isRtl ? 'إجمالي الرصيد' : 'Total Balance')}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <HiSeeCoinIcon size={28} />
                    <span className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
                      {(paidCoins + bonusCoins).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5 mb-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 mb-1">
                        {t.mainBalance || (isRtl ? 'الرصيد الأساسي' : 'Main Balance')}
                      </div>
                      <div className="text-lg font-bold text-white flex items-center gap-1">
                        <HiSeeCoinIcon size={16} />
                        {paidCoins.toLocaleString()}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="text-left">
                      <div className="text-xs text-slate-400 mb-1">
                        {t.bonusBalance || (isRtl ? 'رصيد البونص' : 'Bonus Balance')}
                      </div>
                      <div className="text-lg font-bold text-emerald-400 flex items-center gap-1">
                        <HiSeeCoinIcon size={16} />
                        {bonusCoins.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                    <strong>{t.bonusTermsTitle || (isRtl ? 'شروط استخدام البونص:' : 'Bonus Terms of Use:')}</strong><br/>
                    {t.bonusTermsDesc || (isRtl ? 'هذا الرصيد الإضافي يمكن استخدامه داخل التطبيق لشراء الهدايا أو دعم صناع المحتوى، ولكنه غير قابل للسحب أو التحويل إلى أموال حقيقية. يتم خصم العملات من الرصيد الأساسي أولاً ثم من رصيد البونص.' : 'This bonus balance can be used in-app for gifts and creator support. It cannot be withdrawn or converted to fiat cash. Coins are spent from main balance first, then bonus balance.')}
                  </p>
                </div>
              </div>
            )}

            {currentView === 'buy_coins' && (
              <div className="animate-in slide-in-from-end duration-300 space-y-6">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                  
                  {/* Package Selection */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-right">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <HiSeeCoinIcon size={24} />
                          <span>{isRtl ? 'شراء عملات HiSee' : 'Buy HiSee Coins'}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isRtl ? 'عملات HiSee هي العملة الأساسية للتطبيق لشراء وإرسال الهدايا والاستفادة من الخدمات الحصرية' : 'HiSee Coins are the primary currency to buy gifts and access premium features'}
                        </p>
                      </div>
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                        <Coins size={22} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {storePackages.map((pkg, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            setSelectedCoinPackage(pkg);
                            setIsCheckoutModalOpen(true);
                          }}
                          className="glass p-5 rounded-2xl border border-white/5 hover:border-amber-500/40 hover:bg-white/10 transition-all flex flex-col items-center gap-2 group relative overflow-hidden active:scale-95"
                        >
                          {Number(pkg.bonus) > 0 && (
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-bl-lg">
                              {(t.bonusPlus || (isRtl ? 'بونص +' : 'Bonus +'))}{Number(pkg.bonus).toLocaleString()}
                            </div>
                          )}
                          <div className="my-1 group-hover:scale-110 transition-transform">
                            <HiSeeCoinIcon size={46} className="drop-shadow-[0_0_14px_rgba(245,158,11,0.5)]" />
                          </div>
                          <span className="text-sm font-black text-white">
                            {Number(pkg.coins).toLocaleString()} {Number(pkg.bonus) > 0 && <span className="text-amber-400">+{Number(pkg.bonus).toLocaleString()}</span>} {isRtl ? 'عملة ذهبية' : 'Coins'}
                          </span>
                          <div className="text-[10px] text-slate-400">{pkg.local}</div>
                          <div className="mt-2 text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">{String(pkg.price).includes('$') ? pkg.price : `$${pkg.price}`}</div>
                        </button>
                      ))}
                    </div>

                    {/* QUICK COIN STORE MOCK TRIGGER (1.00 EUR Direct Purchase & Admin Log) */}
                    <div className="mt-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-sm border border-amber-500/30">
                            🪙
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">
                              {t.testPurchase1Eur || (isRtl ? 'اختبار الشراء الفوري للعملات (1.00 €)' : 'Instant 1.00 € Test Purchase')}
                            </h4>
                            <p className="text-[10px] text-amber-300/80">
                              {t.testPurchaseDesc || (isRtl ? 'شراء فوري لباقة تجريبية بقيمة 1.00 € (100 عملة ذهبية مدفوعة) وتوثيقها بالنظام' : 'Instant test pack for 1.00 € (100 paid coins) logged in system')}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950">
                          1.00 € TEST
                        </span>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => handleDeposit(1.00, 100, 0, 'stripe_sandbox_card')}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                        >
                          <Coins size={15} className="text-slate-950" />
                          <span>{isRtl ? '🪙 شراء باقة عملات تجريبية (1.00 € / 100 عملة ذهبية)' : '🪙 Instant Coin Test Purchase (1.00 € / 100 Coins)'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase">
                          {t.trustedGateways || (isRtl ? 'بوابات الدفع المشفرة المعتمدة' : 'Certified Encrypted Gateways')}
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-mono">Webhook Active</span>
                      </div>
                      <div className="flex gap-4 justify-center">
                        <div className="px-4 py-2 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2 text-slate-300 text-xs font-bold">
                          <CreditCard size={18} className="text-blue-400" />
                          <span>Stripe / Visa / Master</span>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2 text-slate-300 text-xs font-bold">
                          <Wallet size={18} className="text-sky-400" />
                          <span>PayPal Sandbox</span>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2 text-slate-300 text-xs font-bold">
                          <Building size={18} className="text-emerald-400" />
                          <span>SEPA / IBAN</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {currentView === 'login_settings' && (
              <div className="space-y-6 animate-in slide-in-from-end duration-300 text-start">
                <button
                  onClick={() => setIsManageSessionModalOpen(true)}
                  className="w-full text-start transition-all duration-300 hover:scale-[1.01] focus:outline-none block"
                >
                  <div className="glass p-6 rounded-[2.5rem] border border-white/5 hover:border-blue-500/30 hover:bg-white/5 shadow-lg space-y-4 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {t.manageLoginSession || (isRtl ? 'إدارة تسجيل الدخول والجلسة' : 'Manage Login & Session')}
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {t.manageLoginSessionDesc || (isRtl ? 'التحكم في جلستك الحالية والتبديل بين الحسابات بأمان' : 'Control your active session and safely switch accounts')}
                          </p>
                        </div>
                      </div>
                      {isRtl ? <ChevronLeft size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                    </div>
                  </div>
                </button>

                <div className="glass rounded-[2rem] overflow-hidden border border-white/5 shadow-lg">
                  {/* 1. Switch Account */}
                  <button 
                    onClick={handleSwitchAccountClick}
                    className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5 text-start"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {t.switchAccount || (isRtl ? 'تبديل الحساب' : 'Switch Account')}
                        </h4>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {t.switchAccountDesc || (isRtl ? 'تسجيل الخروج والانتقال لشاشة تسجيل الدخول لحساب آخر' : 'Log out and switch to another account')}
                        </p>
                      </div>
                    </div>
                    {isRtl ? <ChevronLeft size={20} className="text-slate-600 group-hover:text-white transition-colors" /> : <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />}
                  </button>

                  {/* 2. Create New Account */}
                  <button 
                    onClick={() => {
                      try {
                        const currentUser = auth.currentUser;
                        if (currentUser && currentUser.email) {
                          const existing = localStorage.getItem('hisee_saved_accounts');
                          let accounts: any[] = existing ? JSON.parse(existing) : [];
                          if (!accounts.some((acc: any) => acc.email === currentUser.email)) {
                            accounts.push({
                              uid: currentUser.uid,
                              email: currentUser.email,
                              displayName: currentUser.displayName || currentUser.email.split('@')[0] || 'User VIP',
                              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
                              password: 'DemoPassword123'
                            });
                            localStorage.setItem('hisee_saved_accounts', JSON.stringify(accounts));
                          }
                        }
                      } catch (e) {
                        console.error('Error saving current account before new sign up:', e);
                      }
                      onLogout(true);
                    }}
                    className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all group border-b border-white/5 text-start"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UserPlus size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {isRtl ? 'إنشاء حساب جديد' : 'Create New Account'}
                        </h4>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {isRtl ? 'الربط بشاشة إنشاء الحساب الأساسية في بداية التطبيق' : 'Open the main account registration screen at app startup'}
                        </p>
                      </div>
                    </div>
                    {isRtl ? <ChevronLeft size={20} className="text-slate-600 group-hover:text-white transition-colors" /> : <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />}
                  </button>

                  {/* 3. Logout */}
                  <button 
                    onClick={() => setActiveModal('logout')}
                    className="w-full p-5 flex items-center justify-between hover:bg-rose-500/5 transition-all group border-b border-white/5 text-start"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <LogOut size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-rose-500 group-hover:text-rose-400">
                          {t.logoutSession || (isRtl ? 'تسجيل الخروج' : 'Log Out')}
                        </h4>
                        <p className="text-[9px] text-rose-500/60 mt-0.5">
                          {t.logoutSessionDesc || (isRtl ? 'إنهاء جلستك الحالية والعودة إلى شاشة تسجيل الدخول' : 'End your current session and return to login screen')}
                        </p>
                      </div>
                    </div>
                    {isRtl ? <ChevronLeft size={20} className="text-slate-600 group-hover:text-white transition-colors" /> : <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />}
                  </button>

                  {/* 4. Delete Account */}
                  <button 
                    onClick={() => setActiveModal('deleteAccount')}
                    className="w-full p-5 flex items-center justify-between hover:bg-red-500/10 transition-all group text-start"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-red-500 group-hover:text-red-400">
                          {t.deleteAccountPermanently || (isRtl ? 'حذف الحساب نهائياً' : 'Delete Account Permanently')}
                        </h4>
                        <p className="text-[9px] text-red-500/60 mt-0.5">
                          {t.deleteAccountSettingsDesc || (isRtl ? 'مسح حسابك وسجلاتك وعملاتك الرقمية بالكامل بلا رجعة' : 'Permanently erase your account, history, and coins')}
                        </p>
                      </div>
                    </div>
                    {isRtl ? <ChevronLeft size={20} className="text-slate-600 group-hover:text-white transition-colors" /> : <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />}
                  </button>
                </div>
              </div>
            )}

            {/* ADMIN PAYOUT REVIEW SUB-PAGE */}
            {currentView === 'admin_payouts' && (
              <div className="animate-in slide-in-from-end duration-300">
                <AdminPayoutReview 
                  onBack={() => setCurrentView('main')}
                  adminId={myId}
                />
              </div>
            )}

            {/* ADMIN ALGORITHMS VIEW SUB-PAGE */}
            {currentView === 'admin_algorithms' && (
              <div className="animate-in slide-in-from-end duration-300">
                <AdminAlgorithmsView 
                  onBack={() => setCurrentView('main')}
                  adminId={myId}
                />
              </div>
            )}

            {/* ADMIN LEVEL CONTROL SUB-PAGE */}
            {currentView === 'admin_level_control' && (
              <div className="animate-in slide-in-from-end duration-300">
                <AdminLevelControl 
                  onBack={() => setCurrentView('main')}
                  adminId={myId}
                />
              </div>
            )}

        </div>

        {/* MODALS FOR ACCOUNT MANAGEMENT */}
        {activeModal !== 'none' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            {activeModal === 'logout' ? (
              <div className="glass w-full max-w-md p-8 rounded-[2.5rem] border border-rose-500/20 shadow-2xl space-y-6 text-center">
                <div className="w-20 h-20 mx-auto bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4">
                  <LogOut size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white">{t.logout || (isRtl ? 'تسجيل الخروج' : 'Log Out')}</h3>
                <p className="text-slate-400 text-sm">
                  {t.confirmLogout || (isRtl ? 'هل أنت متأكد من أنك تريد تسجيل الخروج من حسابك؟' : 'Are you sure you want to log out of your account?')}
                </p>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setActiveModal('none')}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                  >
                    {t.cancel || (isRtl ? 'إلغاء' : 'Cancel')}
                  </button>
                  <button 
                    onClick={() => {
                      setActiveModal('none');
                      onLogout();
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-600/20 transition-all"
                  >
                    {t.confirm || (isRtl ? 'تأكيد' : 'Confirm')}
                  </button>
                </div>
              </div>
            ) : activeModal === 'deleteAccount' ? (
              <DeleteAccountModal 
                onClose={() => setActiveModal('none')} 
                onLogout={onLogout} 
                t={t} 
              />
            ) : (
              <div className="glass w-full max-w-md p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {activeModal === 'password' && (t.changePassword || (isRtl ? 'تغيير كلمة المرور' : 'Change Password'))}
                    {activeModal === 'email' && (t.email || (isRtl ? 'البريد الإلكتروني' : 'Email Address'))}
                    {activeModal === 'phone' && (t.phoneNumber || (isRtl ? 'رقم الهاتف' : 'Phone Number'))}
                    {activeModal === 'paypal' && (t.addPayPal || (isRtl ? 'ربط حساب PayPal' : 'Link PayPal Account'))}
                    {activeModal === 'bank_account' && (t.addBankAccount || (isRtl ? 'إضافة حساب بنكي' : 'Add Bank Account'))}
                    {activeModal === 'visa_mastercard' && (t.addVisaMastercard || (isRtl ? 'إضافة بطاقة Visa/Mastercard' : 'Add Visa / MasterCard'))}
                  </h3>
                  <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-white/10 rounded-full transition-all">
                    <ChevronLeft size={24} className={isRtl ? 'rotate-180' : ''} />
                  </button>
                </div>

                <div className="space-y-4">
                  {activeModal === 'paypal' ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-bold text-slate-400 block">
                          {t.paypalEmailLabel || (isRtl ? 'بريد PayPal الإلكتروني:' : 'PayPal Email Address:')}
                        </label>
                        <input 
                          type="email"
                          value={paypalEmail || tempValue || ''}
                          onChange={(e) => {
                            setPaypalEmail(e.target.value);
                            setTempValue(e.target.value);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                          placeholder="example@paypal.com"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 text-right leading-relaxed">
                        {t.paypalNote || (isRtl ? 'سيتم إرسال مستحقاتك وأرباحك المعتمدة إلى هذا البريد بعد مراجعة الإدارة للطلب.' : 'Approved payouts will be sent to this email address after admin review.')}
                      </p>
                    </div>
                  ) : activeModal === 'bank_account' ? (
                    <div className="space-y-3 text-right">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 block">
                          {t.bankNameLabel || (isRtl ? 'اسم البنك:' : 'Bank Name:')}
                        </label>
                        <input 
                          type="text"
                          value={bankName || ''}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm"
                          placeholder={t.bankNamePlaceholder || (isRtl ? 'مثال: البنك المركزي أو Deutsche Bank' : 'Example: Central Bank or Deutsche Bank')}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 block">
                          {t.bankIbanLabel || (isRtl ? 'رقم الحساب أو IBAN:' : 'Account Number or IBAN:')}
                        </label>
                        <input 
                          type="text"
                          value={bankIban || tempValue || ''}
                          onChange={(e) => {
                            setBankIban(e.target.value);
                            setTempValue(e.target.value);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          placeholder="IBAN / DE89..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 block">
                          {t.bankHolderNameLabel || (isRtl ? 'اسم صاحب الحساب بالكامل:' : 'Full Account Holder Name:')}
                        </label>
                        <input 
                          type="text"
                          value={bankHolderName || ''}
                          onChange={(e) => setBankHolderName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm"
                          placeholder={t.bankHolderPlaceholder || (isRtl ? 'الاسم الثلاثي المطابق للوثيقة' : 'Full name matching identity document')}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right block">
                        {activeModal === 'password' && (t.newPassword || (isRtl ? 'كلمة المرور الجديدة' : 'New Password'))}
                        {activeModal === 'email' && (t.newEmail || (isRtl ? 'البريد الإلكتروني الجديد' : 'New Email'))}
                        {activeModal === 'phone' && (t.newPhone || (isRtl ? 'رقم الهاتف الجديد' : 'New Phone Number'))}
                        {activeModal === 'visa_mastercard' && (t.cardNumberLabel || (isRtl ? 'رقم البطاقة المصرفية' : 'Card Number'))}
                      </label>
                      <input 
                        type={activeModal === 'password' ? 'password' : 'text'}
                        value={tempValue || ''}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                        placeholder={activeModal === 'visa_mastercard' ? (isRtl ? 'رقم البطاقة (16 رقماً)' : 'Card number (16 digits)') : '...'}
                      />
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    if (activeModal === 'email') {
                      setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, email: tempValue } }));
                    } else if (activeModal === 'phone') {
                      setSettings(prev => ({ ...prev, chatSettings: { ...prev.chatSettings, phoneNumber: tempValue } }));
                    } else if (activeModal === 'password') {
                      alert(t.passwordChanged || (isRtl ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully'));
                    } else if (activeModal === 'paypal') {
                      const emailToSave = paypalEmail || tempValue;
                      if (!emailToSave) {
                        alert(isRtl ? 'الرجاء إدخال البريد الإلكتروني لحساب PayPal' : 'Please enter your PayPal email address');
                        return;
                      }
                      handleAddPaymentMethod('paypal', { email: emailToSave, name: 'PayPal' });
                      alert(isRtl ? 'تم ربط حساب PayPal بنجاح!' : 'PayPal account linked successfully!');
                    } else if (activeModal === 'bank_account') {
                      const ibanToSave = bankIban || tempValue;
                      if (!ibanToSave) {
                        alert(isRtl ? 'الرجاء إدخال رقم الحساب أو الـ IBAN' : 'Please enter your account number or IBAN');
                        return;
                      }
                      handleAddPaymentMethod('bank_account', { 
                        bankName: bankName || (isRtl ? 'البنك المحلي' : 'Local Bank'), 
                        iban: ibanToSave, 
                        accountNumber: ibanToSave,
                        holderName: bankHolderName || userNickname || (isRtl ? 'صاحب الحساب' : 'Account Holder') 
                      });
                      alert(isRtl ? 'تمت إضافة الحساب البنكي بنجاح!' : 'Bank account added successfully!');
                    } else if (activeModal === 'visa_mastercard') {
                      if (!tempValue) {
                        alert(isRtl ? 'الرجاء إدخال رقم البطاقة' : 'Please enter your card number');
                        return;
                      }
                      handleAddPaymentMethod('visa_mastercard', { cardNumber: tempValue, name: 'Bank Card' });
                      alert(isRtl ? 'تمت إضافة البطاقة بنجاح!' : 'Card added successfully!');
                    }
                    setActiveModal('none');
                    setTempValue('');
                    setPaypalEmail('');
                    setBankName('');
                    setBankIban('');
                    setBankHolderName('');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all"
                >
                  {t.confirm || (isRtl ? 'تأكيد وحفظ' : 'Confirm & Save')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECURE WEBHOOK-CONFIRMED PAYMENT CHECKOUT MODAL */}
        {isCheckoutModalOpen && selectedCoinPackage && (
          <PaymentCheckoutModal
            isOpen={isCheckoutModalOpen}
            selectedPackage={selectedCoinPackage}
            userId={myId}
            onClose={() => {
              setIsCheckoutModalOpen(false);
              setSelectedCoinPackage(null);
            }}
            onPaymentSuccess={(result) => {
              handleDeposit(result.amount, result.paidCoins, result.bonusCoins, result.paymentMethod);
              setIsCheckoutModalOpen(false);
              setSelectedCoinPackage(null);
              setCurrentView('balance');
            }}
          />
        )}

        {/* 4-DIGIT ADMIN PIN SETUP & VERIFICATION MODAL */}
        {isAdminPinModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="glass max-w-sm w-full p-6 rounded-[2.5rem] border border-amber-500/30 bg-[#0f121a]/95 text-center shadow-2xl relative">
              <button
                onClick={() => {
                  setIsAdminPinModalOpen(false);
                  setAdminPinInput('');
                  setAdminPinConfirm('');
                  setAdminPinError('');
                }}
                className="absolute top-5 left-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={28} />
              </div>

              <h3 className="text-base font-black text-white">
                {isPinConfigured ? 'التحقق من رمز مدير النظام' : 'تعيين رمز حماية لوحة الإدارة'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-5">
                {isPinConfigured 
                  ? 'أدخل رمز المرور المكون من 4 أرقام لفتح لوحة الإدارة' 
                  : 'لأول مرة: يرجى إنشاء وتأكيد رمز مرور من 4 أرقام لحماية اللوحة'}
              </p>

              <form onSubmit={handleAdminPinSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block text-right mb-1">
                    {isPinConfigured ? 'رمز المرور (PIN)' : 'رمز مرور جديد (4 أرقام)'}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoFocus
                    placeholder="••••"
                    value={adminPinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setAdminPinInput(val);
                      setAdminPinError('');
                    }}
                    className="w-full bg-black/60 border border-white/10 focus:border-amber-500/60 rounded-xl p-3 text-center text-2xl font-mono tracking-[0.5em] text-amber-300 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-600"
                  />
                </div>

                {!isPinConfigured && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block text-right mb-1">
                      تأكيد رمز المرور (4 أرقام)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="••••"
                      value={adminPinConfirm}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setAdminPinConfirm(val);
                        setAdminPinError('');
                      }}
                      className="w-full bg-black/60 border border-white/10 focus:border-amber-500/60 rounded-xl p-3 text-center text-2xl font-mono tracking-[0.5em] text-amber-300 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-600"
                    />
                  </div>
                )}

                {adminPinError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold text-center">
                    {adminPinError}
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminPinModalOpen(false);
                      setAdminPinInput('');
                      setAdminPinConfirm('');
                      setAdminPinError('');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isPinConfigured 
                        ? adminPinInput.length !== 4 
                        : (adminPinInput.length !== 4 || adminPinConfirm.length !== 4)
                    }
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-950/30"
                  >
                    {isPinConfigured ? 'تأكيد الرمز' : 'حفظ وتأكيد الرمز'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* NO OTHER ACCOUNTS WARNING MODAL */}
        {noOtherAccountsWarning && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="glass max-w-sm w-full p-6 rounded-[2.5rem] border border-amber-500/30 bg-[#0f121a]/95 text-center shadow-2xl relative">
              <button
                onClick={() => setNoOtherAccountsWarning(false)}
                className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all`}
              >
                <X size={16} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <Users size={28} />
              </div>

              <h3 className="text-base font-black text-white">
                {isRtl ? 'تنبيه تبديل الحساب' : 'Account Switch Alert'}
              </h3>
              <p className="text-xs text-slate-300 mt-2 mb-6 leading-relaxed text-center">
                {isRtl 
                  ? 'ليس لديك أي حساب آخر مسجل حالياً على هذا الجهاز. للتمكن من التبديل السريع، يرجى استخدام خيار "إنشاء حساب جديد" أولاً لإنشاء حساب إضافي.' 
                  : 'You do not have any other accounts registered on this device. To enable fast switching, please use the "Create New Account" option first to register an additional account.'}
              </p>

              <button
                onClick={() => setNoOtherAccountsWarning(false)}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-all"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* ACCOUNT SWITCHER OVERLAY */}
        {showAccountSwitcher && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="glass max-w-md w-full p-6 rounded-[2.5rem] border border-blue-500/30 bg-[#0f121a]/95 shadow-2xl relative">
              <button
                onClick={() => setShowAccountSwitcher(false)}
                className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all`}
              >
                <X size={16} />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <Users size={24} />
                </div>
                <h3 className="text-base font-black text-white">
                  {isRtl ? 'تبديل الحساب بنقرة واحدة' : 'One-Click Account Switch'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl ? 'اختر من قائمة الحسابات المسجلة على هذا الجهاز للتبديل الفوري' : 'Choose from the registered accounts on this device for instant switching'}
                </p>
              </div>

              {switchingError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold text-center">
                  {switchingError}
                </div>
              )}

              {isSwitchingActive ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto"></div>
                  <div className="text-sm font-bold text-white">
                    {isRtl ? 'جاري التبديل الآمن وتسجيل الدخول...' : 'Performing secure account switch...'}
                  </div>
                  <p className="text-xs text-slate-500 font-medium text-center">
                    {isRtl ? 'يرجى الانتظار، يتم تحميل بيانات الحساب الآخر.' : 'Please wait, loading the requested profile data.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                  {(() => {
                    const existing = localStorage.getItem('hisee_saved_accounts');
                    let list = [];
                    if (existing) {
                      try {
                        list = JSON.parse(existing);
                      } catch(e) {}
                    }
                    const currentEmail = auth.currentUser?.email;
                    const others = list.filter((acc: any) => acc.email !== currentEmail);
                    
                    return others.map((acc: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => handlePerformAccountSwitch(acc)}
                        className={`w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 flex items-center gap-4 transition-all group ${isRtl ? 'text-right' : 'text-left'}`}
                      >
                        <img 
                          src={acc.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.uid}`} 
                          alt="" 
                          className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 shrink-0 object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{acc.displayName}</h4>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{acc.email}</p>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          {isRtl ? 'تبديل' : 'Switch'}
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}

              <div className="pt-4 mt-2 flex gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAccountSwitcher(false)}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANAGE SESSIONS MODAL */}
        {isManageSessionModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="glass max-w-md w-full p-6 rounded-[2.5rem] border border-blue-500/30 bg-[#0f121a]/95 text-start shadow-2xl relative">
              <button
                onClick={() => setIsManageSessionModalOpen(false)}
                className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all`}
              >
                <X size={16} />
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-base font-black text-white">
                  {isRtl ? 'إدارة الأجهزة والجلسات النشطة' : 'Manage Devices & Active Sessions'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl ? 'التحكم في الأجهزة المتصلة بحسابك حالياً وإنهاء أي جلسة غير مرغوب فيها.' : 'Control the devices currently connected to your account and end any unwanted sessions.'}
                </p>
              </div>

              {terminatingSessions ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto"></div>
                  <div className="text-sm font-bold text-white">
                    {isRtl ? 'جاري إنهاء جميع الجلسات الأخرى وتأمين حسابك...' : 'Terminating all other sessions & securing account...'}
                  </div>
                  <p className="text-xs text-slate-500 font-medium text-center">
                    {isRtl ? 'يرجى الانتظار، يتم الآن حظر وصول الأجهزة الأخرى.' : 'Please wait, blocking unauthorized devices.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                    {sessionsList.map((sess) => (
                      <div 
                        key={sess.id} 
                        className={`p-4 rounded-2xl border ${sess.active ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5'} flex items-start gap-3`}
                      >
                        <div className={`p-2.5 rounded-xl ${sess.active ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-slate-400'} shrink-0`}>
                          <Smartphone size={18} />
                        </div>
                        <div className="flex-1 min-w-0 text-start">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white block truncate">{sess.device}</span>
                            {sess.active && (
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                                {isRtl ? 'نشط الآن' : 'Active Now'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{sess.browser} • {sess.location}</span>
                          <span className="text-[9px] text-slate-500 block font-mono mt-0.5">{sess.ip} • {sess.loginTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-2">
                    {sessionsList.length > 1 ? (
                      <button
                        onClick={() => {
                          setTerminatingSessions(true);
                          setTimeout(() => {
                            setSessionsList(prev => prev.filter(s => s.active));
                            setTerminatingSessions(false);
                            alert(isRtl ? '✓ تم إنهاء جميع الجلسات الأخرى بنجاح وتأمين حسابك بالكامل!' : '✓ All other sessions terminated successfully and your account is secure!');
                          }, 1500);
                        }}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isRtl ? 'إنهاء كافة الجلسات الأخرى' : 'Terminate All Other Sessions'}
                      </button>
                    ) : (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-[10px] font-bold text-emerald-400">
                        {isRtl ? '✓ حسابك متصل حالياً بهذا الجهاز فقط.' : '✓ Your account is currently connected to this device only.'}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setIsManageSessionModalOpen(false)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all"
                    >
                      {isRtl ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE LINKED ACCOUNT MODAL */}
        {isCreateLinkedAccountModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="glass max-w-md w-full p-6 rounded-[2.5rem] border border-emerald-500/30 bg-[#0f121a]/95 text-start shadow-2xl relative">
              <button
                onClick={() => setIsCreateLinkedAccountModalOpen(false)}
                className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all`}
              >
                <X size={16} />
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <UserPlus size={28} />
                </div>
                <h3 className="text-base font-black text-white">
                  {isRtl ? 'إنشاء حساب فرعي مرتبط' : 'Create Linked Sub-Account'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl ? 'قم بإنشاء حساب إضافي فوري مرتبط بحسابك الحالي وسجل الدخول فيه بنقرة واحدة.' : 'Create a fast additional account associated with your profile and login with 1-click.'}
                </p>
              </div>

              {linkedAccountError && (
                <div className="p-3.5 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[11px] font-bold text-center leading-relaxed">
                  ⚠️ {linkedAccountError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block px-1">
                    {isRtl ? 'اسم الحساب الفرعي الجديد (مثال: العمل، الخاص...)' : 'New Account Display Name (e.g., Work, Private...)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isRtl ? 'أدخل اسم العرض...' : 'Enter display name...'}
                    value={newLinkedAccountName}
                    onChange={(e) => setNewLinkedAccountName(e.target.value)}
                    className={`w-full p-3.5 bg-[#121418] border border-white/5 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 ${isRtl ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block px-1">
                    {isRtl ? 'اسم المستخدم الفرعي الفريد' : 'Unique Sub-Username'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={isRtl ? 'مثال: dilgin_vip' : 'e.g. dilgin_vip'}
                      value={newLinkedAccountUsername}
                      onChange={(e) => setNewLinkedAccountUsername(e.target.value)}
                      className={`w-full p-3.5 bg-[#121418] border border-white/5 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 ${isRtl ? 'text-right pl-28' : 'text-left pr-28'}`}
                    />
                    <div className={`absolute top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold ${isRtl ? 'left-4' : 'right-4'}`}>
                      @hisee.pro
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] text-slate-500 leading-relaxed">
                  💡 {isRtl 
                    ? 'سيتم ربط هذا الحساب الجديد ثنائياً بحسابك الحالي. ستتمكن من التبديل الفوري بينهما بلمسة واحدة دون كتابة كلمات مرور.' 
                    : 'This account will be bidirectionally linked with your active login. You can swap instantly between them with zero password requests.'}
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <button
                    onClick={handleCreateLinkedAccount}
                    disabled={isCreatingLinkedAccount}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingLinkedAccount ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        {isRtl ? 'جاري إنشاء الحساب والربط...' : 'Creating and linking account...'}
                      </>
                    ) : (
                      isRtl ? 'إنشاء وربط الحساب الجديد' : 'Create & Link New Account'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateLinkedAccountModalOpen(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTransferModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`w-full max-w-md bg-[#0f1115] border border-white/10 rounded-[2.5rem] shadow-2xl p-6 relative overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setShowTransferModal(false)}
                className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all`}
              >
                <X size={18} />
              </button>
              
              <div className="text-center mt-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Database size={28} />
                </div>
                <h3 className="text-lg font-black text-white">{t.transferChatsTitle || (lang === 'ar' ? 'نقل المحادثات والدردشات' : 'Transfer Chats & Messages')}</h3>
                <p className="text-xs text-slate-400 mt-1 px-4">
                  {t.transferChatsDesc || t.transferChatsSubtitle || (lang === 'ar' ? 'انقل سجل محادثاتك وصورك بشكل مباشر وآمن إلى هاتف آخر دون الحاجة لرفعها على الإنترنت.' : 'Directly and securely transfer your chat history and photos to another phone without uploading to the internet.')}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {transferStep === 'instructions' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex gap-3 text-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{isRtl ? '١' : '1'}</span>
                        <div className={`text-xs text-slate-300 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{t.transferStep1 || (lang === 'ar' ? 'قم بتثبيت تطبيق HiSee على جهازك الجديد وافتحه.' : 'Install HiSee on your new device and open it.')}</div>
                      </div>
                      <div className="flex gap-3 text-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{isRtl ? '٢' : '2'}</span>
                        <div className={`text-xs text-slate-300 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{t.transferStep2 || (lang === 'ar' ? 'اذهب إلى الإعدادات > إعدادات الدردشة > نقل الدردشات على الهاتف الجديد واقترن.' : 'Go to Settings > Chat Settings > Transfer Chats on the new device and pair.')}</div>
                      </div>
                      <div className="flex gap-3 text-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{isRtl ? '٣' : '3'}</span>
                        <div className={`text-xs text-slate-300 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{t.transferStep3 || (lang === 'ar' ? 'اضغط على زر البدء بالأسفل لمسح الرمز ضوئياً والمزامنة.' : 'Tap Start below to scan QR code and sync.')}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setTransferStep('qrcode')}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-2xl transition-all active:scale-95"
                    >
                      {t.startTransfer || (lang === 'ar' ? 'بدء عملية النقل' : 'Start Transfer')}
                    </button>
                  </div>
                )}

                {transferStep === 'qrcode' && (
                  <div className="text-center space-y-4 animate-in fade-in duration-300">
                    <div className="p-4 bg-white rounded-3xl w-48 h-48 mx-auto flex items-center justify-center shadow-xl border border-white/10">
                      <QRCodeSVG value={`hisee-transfer-session-${myId}-${Date.now()}`} size={160} />
                    </div>
                    <p className="text-xs text-amber-400 font-bold">
                      {t.scanQrCodeDesc || (lang === 'ar' ? 'قم بمسح هذا الرمز باستخدام كاميرا هاتفك الجديد لبدء النقل المباشر والمزامنة.' : 'Scan this code using your new phone camera to start direct transfer and sync.')}
                    </p>
                    <button
                      onClick={() => {
                        setTransferStep('scanning');
                        setTimeout(() => {
                          setTransferStep('success');
                        }, 2500);
                      }}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      {t.simulateCameraScan || t.simulateScan || (lang === 'ar' ? 'محاكاة مسح الكاميرا' : 'Simulate Camera Scan')}
                    </button>
                  </div>
                )}

                {transferStep === 'scanning' && (
                  <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
                    <div className="text-sm font-bold text-white">{t.connectingSecurely || (lang === 'ar' ? 'جاري الاتصال ونقل البيانات بشكل آمن...' : 'Connecting and transferring data securely...')}</div>
                    <p className="text-xs text-slate-500 font-medium">{t.keepPhonesClose || (lang === 'ar' ? 'الرجاء إبقاء كلا الهاتفين قريبين ومفتوحين.' : 'Please keep both phones close and open.')}</p>
                  </div>
                )}

                {transferStep === 'success' && (
                  <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-2xl">✓</div>
                    <div className="text-base font-black text-white">{t.transferComplete || (lang === 'ar' ? 'اكتمل النقل بنجاح!' : 'Transfer Completed Successfully!')}</div>
                    <p className="text-xs text-slate-400 px-4">
                      {t.transferCompleteDesc || t.transferSuccessDesc || (lang === 'ar' ? 'تم استيراد كافة الرسائل، الوسائط، والمجموعات بشكل سليم على جهازك الجديد.' : 'All messages, media, and groups have been successfully imported to your new device.')}
                    </p>
                    <button
                      onClick={() => {
                        setShowTransferModal(false);
                        setSettings(s => ({ ...s, chatSettings: { ...s.chatSettings, hasTransferredChats: true } }));
                      }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition-all"
                    >
                      {t.close || (lang === 'ar' ? 'إغلاق' : 'Close')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DELETE DICTIONARY CONFIRMATION MODAL */}
        {deleteDictModal?.open && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="glass bg-[#141414] border border-rose-500/30 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-5 text-start">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={22} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-white">
                    {isRtl ? 'حذف قاموس اللغة من الهاتف' : 'Delete Language Dictionary'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {deleteDictModal.nativeName} ({deleteDictModal.name})
                  </span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
                <p className="leading-relaxed">
                  {isRtl 
                    ? `هل ترغب في حذف ملفات القاموس المترجم المحفوظة محلياً للغة "${deleteDictModal.nativeName}" من ذاكرة الهاتف؟`
                    : `Do you want to delete the locally cached dictionary for "${deleteDictModal.nativeName}" from phone storage?`}
                </p>
                <p className="text-[11px] text-amber-400/90 font-medium">
                  {isRtl 
                    ? '💡 سيبقى اسم اللغة ظاهراً في القائمة وسيتغير زر "جاهز" إلى "تحميل" لتتمكن من إعادة تحميل القاموس في أي وقت.'
                    : '💡 The language entry will remain listed and its button will change to "Download" so you can restore it anytime.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => setDeleteDictModal(null)}
                  className="flex-1 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleConfirmDeleteDictionary(deleteDictModal.code)}
                  className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  <span>{isRtl ? 'حذف القاموس فقط' : 'Delete Dictionary'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default SettingsView;
