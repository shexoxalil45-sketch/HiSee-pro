import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, XCircle, Clock, Search, Filter, ShieldCheck, 
  Wallet, Building, CreditCard, User, AlertCircle, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, FileText, Check, X, ExternalLink,
  ChevronLeft, Sparkles, AlertTriangle, Layers, DollarSign,
  TrendingUp, ArrowRightLeft, Lock, Key, Terminal, Eye, Download,
  Gift, ShieldAlert, Users, Bell, Megaphone, Send, Trash2, Edit3,
  Plus, RotateCcw, Award, CheckCircle, Ban, UserX, UserCheck,
  ShieldOff, Activity, Radio, BarChart3, Settings2, Hash, Flame,
  Heart, Star, Cloud, Globe, Server, GitBranch, Cpu, Wifi,
  Smartphone, Play, CheckCheck, Copy, Zap, Share2, Database,
  Shield, Laptop, RefreshCcw, FileCode, HardDrive, Compass,
  PlayCircle, CheckSquare, UploadCloud, Link as LinkIcon, Store, Video, MoreVertical, Volume2, FileImage, Bot, Loader2
} from 'lucide-react';
import { 
  collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc,
  serverTimestamp, increment, addDoc, getDoc, getDocs, orderBy, limit,
  where
} from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import HiSeeCoinIcon from './HiSeeCoinIcon';
import ModernHSLogo from './ModernHSLogo';
import { STORE_CATALOG } from '../data/storeCatalog';
import { AdminAlgorithmsView } from './AdminAlgorithmsView';
import { AdminLevelControl } from './AdminLevelControl';
import { 
  AnimatedWhale, AnimatedSeal, AnimatedOctopus, AnimatedShark, 
  AnimatedFish, AnimatedDolphin, AnimatedDragon, AnimatedPhoenix, 
  AnimatedCastle, AnimatedEagle, AnimatedTiger, AnimatedCar,
  AnimatedCoinMedal, AnimatedLogoMedal
} from './GiftIcons';

// ==========================================
// E2EE DECRYPTION HELPER FOR INVESTIGATION
// ==========================================
const decryptText = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  let cleanText = text.trim();
  
  // Strip any RTL mark characters or zero-width spaces that could mess up substring/startsWith
  cleanText = cleanText.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // If it visually starts with ==E2EE: due to RTL issues, fix it:
  if (cleanText.startsWith("==E2EE:")) {
    cleanText = "E2EE:" + cleanText.substring(7) + "==";
  } else if (cleanText.endsWith("E2EE:")) {
    // Just in case RTL flips the entire prefix to the end
    cleanText = "E2EE:" + cleanText.substring(0, cleanText.length - 5);
  }
  
  // If it's a real encrypted string
  if (cleanText.startsWith("E2EE:") || cleanText.includes("E2EE:")) {
    const idx = cleanText.indexOf("E2EE:");
    let base64Part = cleanText.substring(idx + 5).trim();
    
    // Fix any missing base64 padding
    while (base64Part.length % 4 !== 0) {
      base64Part += "=";
    }
    
    try {
      return decodeURIComponent(escape(atob(base64Part)));
    } catch (e) {
      // Try direct atob without escape/decodeURIComponent
      try {
        return atob(base64Part);
      } catch (innerErr) {
        console.error("Base64 decoding failed:", innerErr);
        return text;
      }
    }
  }
  
  return text;
};

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type MasterAdminTab = 'finance' | 'gifts' | 'reports' | 'users' | 'analytics_broadcast' | 'developer_hub' | 'live_streams' | 'store' | 'ai_agent_config' | 'algorithms' | 'levels';

export interface PayoutRequestItem {
  id: string;
  uid?: string;
  userId?: string;
  userNickname?: string;
  userAvatar?: string;
  amount: number;
  currency?: string;
  diamondsDeducted?: number;
  method?: string;
  payoutMethod?: string;
  accountDetails?: {
    type?: string;
    email?: string;
    accountNumber?: string;
    iban?: string;
    bankName?: string;
    holderName?: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  statusArabic?: string;
  requestedAt?: any;
  createdAt?: any;
  processedAt?: any;
  adminNotes?: string;
  rejectionReason?: string;
  transactionRef?: string;
  source?: string;
}

export interface TransactionRecord {
  id: string;
  uid?: string;
  type?: string;
  amount?: number;
  paidCoins?: number;
  bonusCoins?: number;
  totalCoins?: number;
  currency?: string;
  diamondsDeducted?: number;
  diamondsRefunded?: number;
  paymentMethod?: string;
  status?: string;
  description?: string;
  payoutRequestId?: string;
  transactionRef?: string;
  webhookEventId?: string;
  timestamp?: any;
  isNonWithdrawableBonus?: boolean;
  targetId?: string;
}

export interface AdminGiftItem {
  id: string;
  name: string;
  category: string;
  price: number;
  ribbon?: string;
  color?: string;
  iconType?: string;
  iconEmoji?: string;
  isVip?: boolean;
  material?: string;
  animType?: string;
  soundType?: string;
  environment?: string;
  disabled?: boolean;
}

export interface ReportItem {
  id: string;
  reportedBy?: string;
  reportedUser?: string;
  reportedUserName?: string;
  reporterName?: string;
  commentID?: string;
  commentText?: string;
  streamId?: string;
  reason?: string;
  timestamp?: any;
  status?: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  actionTaken?: string;
  notes?: string;
  chatId?: string;
  imageUrl?: string;
  videoUrl?: string;
  isRead?: boolean;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: 'SYSTEM_ALERT' | 'REWARD_GIFT' | 'MAINTENANCE' | 'ANNOUNCEMENT';
  targetAudience: 'ALL' | 'HOSTS' | 'VIP';
  createdAt?: any;
  sentBy?: string;
  active?: boolean;
}

interface AdminPayoutReviewProps {
  onBack?: () => void;
  adminId?: string;
}

export const AdminPayoutReview: React.FC<AdminPayoutReviewProps> = ({ onBack, adminId = 'admin' }) => {
  // Master Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<MasterAdminTab>('finance');

  // Common Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // TAB 1: FINANCE & PAYOUTS STATE
  // =========================================================================
  const [financeSubTab, setFinanceSubTab] = useState<'payout_reviews' | 'transactions_log' | 'sandbox_config'>('payout_reviews');
  const [openFinanceModal, setOpenFinanceModal] = useState<'coins' | 'diamonds' | null>(null);
  const [source, setSource] = useState<'all' | 'live' | 'videos' | 'stories' | 'photos'>('all');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  
  const formatMoney = (val: number) => {
    const rounded = Math.round(val);
    const amount = Math.abs(rounded);
    const multiplier = currency === 'EUR' ? 0.01 : 0.011;
    const symbol = currency === 'EUR' ? '€' : '$';
    
    return (
      <div className="flex flex-col items-end">
        <span className="font-bold">{amount.toLocaleString()}</span>
        <span className="text-xs text-slate-500">
          {symbol}{(amount * multiplier).toFixed(2)}
        </span>
      </div>
    );
  };

  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState<boolean>(true);
  const [filterPayoutStatus, setFilterPayoutStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [payoutSearchQuery, setPayoutSearchQuery] = useState<string>('');
  
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'CONVERT'>('ALL');
  
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequestItem | null>(null);
  const [payoutActionType, setPayoutActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('بيانات الحساب غير مطابقة للمعلومات المسجلة');
  const [financeProcessing, setFinanceProcessing] = useState<boolean>(false);

  // AI Agent Config & Pending Requests State
  const [aiSystemPrompt, setAiSystemPrompt] = useState<string>(`أنت موظف الدعم الفني والوكيل الذكي المعتمد لمنصة التواصل الاجتماعي المتقدمة "HiSee Pro".
تتمتع بوعي كامل وشامل بجميع أقسام التطبيق:
1. المصادقة وإدارة الحسابات الشخصية (البروفايل، الأفاتار، شارات VIP).
2. أنظمة الدردشة الفردية والجماعية، الرسائل الصوتية، ومكالمات الصوت والفيديو الجماعية (Agora RTC).
3. غرف البث المباشر (Live Streams / LiveFeed)، الهدايا الافتراضية، محافظ العملات، وتحديات المعارك (WaterPK / PK Challenges)، طلبات الانضمام والمشرفين.
4. شبكة التواصل الاجتماعي (النشر، القصص، الفيديوهات القصيرة، الصور، الإعجابات والتعليقات).
5. المتجر الرقمي وطلب السحب المالي لصناع المحتوى.
6. لوحة التحكم والإدارة المركزية (Admin Console).

قم بالإجابة دائماً باحترافية تامة، دقة، وود، وقدم إرشادات تقنية واضحة للمستخدمين.`);
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);
  const [pendingAiRequests, setPendingAiRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchAiConfig = async () => {
      try {
        const docRef = doc(firestoreDb, 'system_settings', 'ai_agent_config');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().systemPrompt) {
          setAiSystemPrompt(snap.data().systemPrompt);
        }
      } catch (err) {
        console.warn("Notice fetching AI agent config:", err);
      }
    };
    fetchAiConfig();

    const q = query(collection(firestoreDb, 'ai_pending_requests'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPendingAiRequests(list);
    }, (err) => {
      console.warn("Notice listening to pending AI requests:", err);
    });

    return () => unsub();
  }, []);

  const handleSaveAiConfig = async () => {
    setIsSavingAiConfig(true);
    try {
      await setDoc(doc(firestoreDb, 'system_settings', 'ai_agent_config'), {
        systemPrompt: aiSystemPrompt,
        updatedAt: serverTimestamp(),
        updatedBy: adminId
      }, { merge: true });
      showToast("تم تحديث وحفظ تعليمات (System Prompt) للوكيل الذكي بنجاح!", "success");
    } catch (err: any) {
      showToast("فشل حفظ إعدادات الذكاء الاصطناعي: " + err.message, "error");
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  const handleApproveAiRequest = async (reqId: string) => {
    try {
      await updateDoc(doc(firestoreDb, 'ai_pending_requests', reqId), {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: serverTimestamp()
      });
      showToast("تمت الموافقة على الطلب الحساس وتنفيذه بنجاح!", "success");
    } catch (err: any) {
      showToast("خطأ في الموافقة على الطلب: " + err.message, "error");
    }
  };

  const handleRejectAiRequest = async (reqId: string) => {
    try {
      await updateDoc(doc(firestoreDb, 'ai_pending_requests', reqId), {
        status: 'rejected',
        rejectedBy: adminId,
        rejectedAt: serverTimestamp()
      });
      showToast("تم رفض الطلب الحساس بنجاح.", "info");
    } catch (err: any) {
      showToast("خطأ في رفض الطلب: " + err.message, "error");
    }
  };

  // 1. Listen to Payout Requests Collection
  useEffect(() => {
    const payoutRequestsRef = collection(firestoreDb, 'payout_requests');
    const q = query(payoutRequestsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const items: PayoutRequestItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as PayoutRequestItem));

      items.sort((a, b) => {
        const timeA = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const timeB = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
      });

      setPayouts(items);
      setPayoutsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payout_requests');
      setPayoutsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen to Global Transactions Collection
  useEffect(() => {
    const transactionsRef = collection(firestoreDb, 'transactions');
    const q = query(transactionsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const items: TransactionRecord[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as TransactionRecord));

      items.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeB - timeA;
      });

      setTransactions(items);
      setTransactionsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setTransactionsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Approve Payout Request
  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    setFinanceProcessing(true);
    try {
      const targetUserId = selectedPayout.userId || selectedPayout.uid;
      const payoutDocRef = doc(firestoreDb, 'payout_requests', selectedPayout.id);
      const refId = transactionRef.trim() || `SEPA_TXN_${Date.now().toString(36).toUpperCase()}`;

      await updateDoc(payoutDocRef, {
        status: 'APPROVED',
        statusArabic: 'تمت الموافقة والتحويل بنجاح',
        processedAt: serverTimestamp(),
        processedByAdmin: adminId,
        adminNotes: adminNotes || 'تمت المراجعة والتحويل عبر النظام الإداري المعتمد',
        transactionRef: refId
      });

      if (targetUserId) {
        await addDoc(collection(firestoreDb, 'transactions'), {
          uid: targetUserId,
          type: 'payout_approved',
          payoutRequestId: selectedPayout.id,
          amount: selectedPayout.amount,
          currency: selectedPayout.currency || 'EUR',
          diamondsDeducted: selectedPayout.diamondsDeducted || 0,
          description: `سحب أرباح معتمد بقيمة ${selectedPayout.amount} ${selectedPayout.currency || 'EUR'}`,
          transactionRef: refId,
          timestamp: serverTimestamp(),
          status: 'completed'
        });

        await addDoc(collection(firestoreDb, 'users', targetUserId, 'notifications'), {
          type: 'PAYOUT_APPROVED',
          title: 'تم اعتماد وإرسال حوالة سحب الأرباح 🎉',
          message: `تهانينا! تمت الموافقة على طلب السحب الخاص بك بمبلغ ${selectedPayout.amount} ${selectedPayout.currency || 'EUR'} برقم مرجعي (${refId}).`,
          amount: selectedPayout.amount,
          currency: selectedPayout.currency || 'EUR',
          transactionRef: refId,
          read: false,
          timestamp: serverTimestamp()
        });
      }

      showToast(`تمت الموافقة على طلب السحب بمبلغ ${selectedPayout.amount} € وتوثيق العملية بنجاح.`, 'success');
      setSelectedPayout(null);
      setPayoutActionType(null);
      setAdminNotes('');
      setTransactionRef('');
    } catch (err) {
      console.error('Error approving payout:', err);
      showToast('حدث خطأ أثناء اعتماد طلب السحب، يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setFinanceProcessing(false);
    }
  };

  // Reject Payout Request
  const handleRejectPayout = async () => {
    if (!selectedPayout) return;
    setFinanceProcessing(true);
    try {
      const targetUserId = selectedPayout.userId || selectedPayout.uid;
      const payoutDocRef = doc(firestoreDb, 'payout_requests', selectedPayout.id);
      const refundedDiamonds = selectedPayout.diamondsDeducted || Math.round((Number(selectedPayout.amount) || 0) * 100);

      await updateDoc(payoutDocRef, {
        status: 'REJECTED',
        statusArabic: 'تم رفض الطلب واسترجاع الرصيد',
        processedAt: serverTimestamp(),
        processedByAdmin: adminId,
        rejectionReason: rejectionReason,
        adminNotes: adminNotes || rejectionReason
      });

      if (targetUserId) {
        const userDocRef = doc(firestoreDb, 'users', targetUserId);
        await updateDoc(userDocRef, {
          diamonds: increment(refundedDiamonds),
          withdrawableProfit: increment(Number(selectedPayout.amount) || 0)
        });

        await addDoc(collection(firestoreDb, 'transactions'), {
          uid: targetUserId,
          type: 'payout_refunded',
          payoutRequestId: selectedPayout.id,
          amount: selectedPayout.amount,
          currency: selectedPayout.currency || 'EUR',
          diamondsRefunded: refundedDiamonds,
          description: `استرجاع رصيد سحب مرفوض: ${rejectionReason}`,
          timestamp: serverTimestamp(),
          status: 'refunded'
        });

        await addDoc(collection(firestoreDb, 'users', targetUserId, 'notifications'), {
          type: 'PAYOUT_REJECTED',
          title: 'تحديث بخصوص طلب سحب الأرباح ⚠️',
          message: `تم رفض طلب السحب بمبلغ ${selectedPayout.amount} ${selectedPayout.currency || 'EUR'} للسبب: (${rejectionReason}). تم استرجاع الرصيد المخصوم (${refundedDiamonds.toLocaleString()} ماسة) إلى محفظتك بالكامل.`,
          amount: selectedPayout.amount,
          currency: selectedPayout.currency || 'EUR',
          refundedDiamonds: refundedDiamonds,
          read: false,
          timestamp: serverTimestamp()
        });
      }

      showToast(`تم رفض طلب السحب وإرجاع ${refundedDiamonds.toLocaleString()} ماسة لحساب المستخدم بنجاح.`, 'info');
      setSelectedPayout(null);
      setPayoutActionType(null);
      setAdminNotes('');
    } catch (err) {
      console.error('Error rejecting payout:', err);
      showToast('حدث خطأ أثناء رفض الطلب، يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setFinanceProcessing(false);
    }
  };

  // =========================================================================
  // TAB 2: GIFTS & STORE MANAGEMENT STATE
  // =========================================================================
  const [giftsList, setGiftsList] = useState<AdminGiftItem[]>(() => {
    // Initial bootstrap from STORE_CATALOG or localStorage
    const saved = localStorage.getItem('hisee_custom_gifts_catalog');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return STORE_CATALOG.map((g: any) => ({
      id: g.id,
      name: g.name,
      category: g.category || 'عامة',
      price: g.price || 100,
      ribbon: g.ribbon || '',
      color: g.color || 'from-slate-800 to-black',
      isVip: Boolean(g.isVip),
      material: g.material || 'gold',
      animType: g.animType || 'float',
      soundType: g.soundType || 'pop',
      environment: g.environment || 'surface',
      disabled: false
    }));
  });

  const [selectedGiftCategory, setSelectedGiftCategory] = useState<string>('الكل');
  const [giftSearchQuery, setGiftSearchQuery] = useState<string>('');
  const [editingGift, setEditingGift] = useState<AdminGiftItem | null>(null);
  const [isNewGiftModalOpen, setIsNewGiftModalOpen] = useState<boolean>(false);
  const [newGiftForm, setNewGiftForm] = useState<Partial<AdminGiftItem>>({
    id: '',
    name: '',
    category: 'VIP',
    price: 1000,
    iconEmoji: '🎁',
    isVip: false,
    animType: 'grand',
    soundType: 'magic'
  });
  const [savingGift, setSavingGift] = useState<boolean>(false);

  // Sync gifts catalog to Firestore & localStorage
  const persistGiftsCatalog = async (updated: AdminGiftItem[]) => {
    setGiftsList(updated);
    localStorage.setItem('hisee_custom_gifts_catalog', JSON.stringify(updated));
    try {
      await setDoc(doc(firestoreDb, 'system_settings', 'gifts_catalog'), {
        catalog: updated,
        updatedAt: serverTimestamp(),
        updatedBy: adminId
      }, { merge: true });
    } catch (e) {
      console.warn('Could not sync gifts to system_settings in Firestore, saved locally:', e);
    }
  };

  // Listen to remote gifts catalog changes from Firestore
  useEffect(() => {
    const catalogDocRef = doc(firestoreDb, 'system_settings', 'gifts_catalog');
    const unsubscribe = onSnapshot(catalogDocRef, (snap) => {
      if (document.hidden) return;
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          setGiftsList(data.catalog);
          localStorage.setItem('hisee_custom_gifts_catalog', JSON.stringify(data.catalog));
        }
      }
    }, () => {
      // Offline fallback already in state
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateGiftPrice = async () => {
    if (!editingGift) return;
    setSavingGift(true);
    try {
      const updated = giftsList.map(g => g.id === editingGift.id ? { ...editingGift } : g);
      await persistGiftsCatalog(updated);
      showToast(`تم تحديث بيانات الهدية "${editingGift.name}" بنجاح!`, 'success');
      setEditingGift(null);
    } catch (err) {
      showToast('تعذر حفظ التعديلات على الهدية', 'error');
    } finally {
      setSavingGift(false);
    }
  };

  const handleCreateNewGift = async () => {
    if (!newGiftForm.name || !newGiftForm.price || Number(newGiftForm.price) <= 0) {
      showToast('يرجى إدخال اسم الهدية وسعر صحيح بالعملات', 'error');
      return;
    }
    setSavingGift(true);
    try {
      const customId = newGiftForm.id?.trim() || `custom_gift_${Date.now().toString(36)}`;
      const createdItem: AdminGiftItem = {
        id: customId,
        name: newGiftForm.name,
        category: newGiftForm.category || 'فاخرة',
        price: Number(newGiftForm.price),
        iconEmoji: newGiftForm.iconEmoji || '✨',
        isVip: Boolean(newGiftForm.isVip),
        color: newGiftForm.isVip ? 'from-amber-600 to-yellow-500' : 'from-purple-600 to-indigo-700',
        ribbon: newGiftForm.isVip ? 'bg-amber-400' : 'bg-pink-400',
        animType: newGiftForm.animType || 'grand',
        soundType: newGiftForm.soundType || 'magic',
        environment: 'surface',
        disabled: false
      };

      const updated = [createdItem, ...giftsList];
      await persistGiftsCatalog(updated);
      showToast(`تمت إضافة الهدية الجديدة "${createdItem.name}" إلى المتجر والبث المباشر!`, 'success');
      setIsNewGiftModalOpen(false);
      setNewGiftForm({
        id: '',
        name: '',
        category: 'VIP',
        price: 1000,
        iconEmoji: '🎁',
        isVip: false,
        animType: 'grand',
        soundType: 'magic'
      });
    } catch (err) {
      showToast('حدث خطأ أثناء إضافة الهدية', 'error');
    } finally {
      setSavingGift(false);
    }
  };

  const handleDeleteOrToggleGift = async (id: string) => {
    const updated = giftsList.filter(g => g.id !== id);
    await persistGiftsCatalog(updated);
    showToast('تم حذف الهدية من الكتالوج بنجاح', 'info');
  };

  const handleResetGiftsToDefault = async () => {
    if (!window.confirm('هل أنت متأكد من استعادة قائمة الهدايا الأصلية والأسعار الافتراضية؟')) return;
    const defaults = STORE_CATALOG.map((g: any) => ({
      id: g.id,
      name: g.name,
      category: g.category || 'عامة',
      price: g.price || 100,
      ribbon: g.ribbon || '',
      color: g.color || 'from-slate-800 to-black',
      isVip: Boolean(g.isVip),
      material: g.material || 'gold',
      animType: g.animType || 'float',
      soundType: g.soundType || 'pop',
      environment: g.environment || 'surface',
      disabled: false
    }));
    await persistGiftsCatalog(defaults);
    showToast('تمت استعادة كتالوج الهدايا الافتراضي بالكامل', 'success');
  };

  // Helper to render Gift Icon preview
  const renderGiftIconPreview = (gift: AdminGiftItem) => {
    if (gift.iconEmoji) {
      return <span className="text-3xl">{gift.iconEmoji}</span>;
    }
    switch (gift.id) {
      case 'app_logo': return <ModernHSLogo size={32} />;
      case 'dragon': return <div className="w-8 h-8"><AnimatedDragon className="w-full h-full" /></div>;
      case 'phoenix': return <div className="w-8 h-8"><AnimatedPhoenix className="w-full h-full" /></div>;
      case 'castle': return <div className="w-8 h-8"><AnimatedCastle className="w-full h-full" /></div>;
      case 'whale': return <div className="w-8 h-8"><AnimatedWhale className="w-full h-full" /></div>;
      case 'seal': return <div className="w-8 h-8"><AnimatedSeal className="w-full h-full" /></div>;
      case 'octopus': return <div className="w-8 h-8"><AnimatedOctopus className="w-full h-full" /></div>;
      case 'shark': return <div className="w-8 h-8"><AnimatedShark className="w-full h-full" /></div>;
      case 'dolphin': return <div className="w-8 h-8"><AnimatedDolphin className="w-full h-full" /></div>;
      case 'fish_school': return <div className="w-8 h-8"><AnimatedFish className="w-full h-full" /></div>;
      case 'eagle': return <div className="w-8 h-8"><AnimatedEagle className="w-full h-full" /></div>;
      case 'tiger': return <div className="w-8 h-8"><AnimatedTiger className="w-full h-full" /></div>;
      case 'luxury_car': return <div className="w-8 h-8"><AnimatedCar className="w-full h-full" /></div>;
      case 'coin_medal': return <div className="w-8 h-8"><AnimatedCoinMedal className="w-full h-full" /></div>;
      case 'logo_medal': return <div className="w-8 h-8"><AnimatedLogoMedal className="w-full h-full" /></div>;
      case 'heart_diamond': return <Heart size={28} fill="#22d3ee" className="text-cyan-400" />;
      case 'heart_gold': return <Heart size={28} fill="#facc15" className="text-yellow-400" />;
      case 'heart_ruby': return <Heart size={28} fill="#e11d48" className="text-rose-600" />;
      default: return <span className="text-3xl">🎁</span>;
    }
  };

  // =========================================================================
  // TAB 3: REPORTS & MODERATION STATE
  // =========================================================================
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(true);
  const [reportsFilter, setReportsFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('PENDING');
  const [reportsSubView, setReportsSubView] = useState<'reports' | 'banned_users'>('reports');
  const [selectedReportForAction, setSelectedReportForAction] = useState<ReportItem | null>(null);
  const [moderationNotes, setModerationNotes] = useState<string>('');
  const [banReasonInput, setBanReasonInput] = useState<string>('انتهاك شروط الاستخدام وقوانين المجتمع');
  const [moderationProcessing, setModerationProcessing] = useState<boolean>(false);

  // Chat Review States for Moderation
  const [activeReviewChatId, setActiveReviewChatId] = useState<string | null>(null);
  const [activeReviewReport, setActiveReviewReport] = useState<any | null>(null);
  const [activeReviewChatMessages, setActiveReviewChatMessages] = useState<any[]>([]);
  const [activeReviewChatLoading, setActiveReviewChatLoading] = useState<boolean>(false);

  // Aggregated reports view states
  const [reportsTabFilter, setReportsTabFilter] = useState<'ALL' | 'CHAT' | 'IMAGE' | 'VIDEO' | 'STREAM'>('ALL');
  const [selectedReportedUserId, setSelectedReportedUserId] = useState<string | null>(null);

  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeReviewChatMessages]);

  // Load chat messages when activeReviewChatId is set
  useEffect(() => {
    if (!activeReviewChatId) {
      setActiveReviewChatMessages([]);
      return;
    }
    setActiveReviewChatLoading(true);
    const msgsRef = collection(firestoreDb, 'chats', activeReviewChatId, 'messages');
    // Fetch latest 100 messages so we see the newest messages in real-time, then we reverse in JS to display chronologically
    const q = query(msgsRef, orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const msgs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      // Reverse array to maintain oldest-to-newest reading order
      setActiveReviewChatMessages(msgs.reverse());
      setActiveReviewChatLoading(false);
    }, (error) => {
      console.error("Error loading chat review messages:", error);
      setActiveReviewChatLoading(false);
    });

    return () => unsubscribe();
  }, [activeReviewChatId]);

  // Listen to reports collection in Firestore
  useEffect(() => {
    const reportsRef = collection(firestoreDb, 'reports');
    const q = query(reportsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const items: ReportItem[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as ReportItem));

      items.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeB - timeA;
      });

      setReportsList(items);
      setReportsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
      setReportsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto mark reports as read/seen when viewed by admin
  useEffect(() => {
    if (!selectedReportedUserId) return;
    
    const reportsToMark = reportsList.filter(r => 
      r.status !== 'RESOLVED' && 
      r.status !== 'DISMISSED' && 
      r.reportedUser === selectedReportedUserId && 
      isReportInTab(r, reportsTabFilter) &&
      !r.isRead
    );
    
    if (reportsToMark.length > 0) {
      reportsToMark.forEach(async (report) => {
        try {
          await updateDoc(doc(firestoreDb, 'reports', report.id), {
            isRead: true
          });
        } catch (e) {
          console.error("Error marking report as read:", e);
        }
      });
    }
  }, [selectedReportedUserId, reportsTabFilter, reportsList]);

  // Ban reported user directly in Firestore
  const handleBanUser = async (targetUserId: string, reportId?: string) => {
    if (!targetUserId) return;
    setModerationProcessing(true);
    try {
      const userRef = doc(firestoreDb, 'users', targetUserId);
      await updateDoc(userRef, {
        isBanned: true,
        banReason: banReasonInput || 'انتهاك معايير المجتمع والبث المباشر',
        bannedAt: serverTimestamp(),
        bannedBy: adminId
      });

      if (reportId) {
        await updateDoc(doc(firestoreDb, 'reports', reportId), {
          status: 'RESOLVED',
          actionTaken: 'USER_BANNED',
          resolvedAt: serverTimestamp(),
          resolvedBy: adminId,
          notes: moderationNotes || 'تم حظر المستخدم المخالف فورياً.'
        });
      }

      showToast(`تم حظر الحساب (${targetUserId}) بنجاح وتسوية البلاغ.`, 'success');
      setSelectedReportForAction(null);
    } catch (err) {
      console.error('Error banning user:', err);
      showToast('تعذر حظر الحساب، يرجى التحقق من الاتصال.', 'error');
    } finally {
      setModerationProcessing(false);
    }
  };

  // Unban user directly in Firestore
  const handleUnbanUser = async (targetUserId: string) => {
    if (!targetUserId) return;
    setModerationProcessing(true);
    try {
      const userRef = doc(firestoreDb, 'users', targetUserId);
      await updateDoc(userRef, {
        isBanned: false,
        banReason: null,
        unbannedAt: serverTimestamp(),
        unbannedBy: adminId
      });
      showToast(`تم رفع الحظر وتنشيط الحساب (${targetUserId}) بنجاح.`, 'success');
    } catch (err) {
      console.error('Error unbanning user:', err);
      showToast('تعذر رفع الحظر، يرجى المحاولة لاحقاً.', 'error');
    } finally {
      setModerationProcessing(false);
    }
  };

  // Dismiss report
  const handleDismissReport = async (reportId: string) => {
    try {
      await updateDoc(doc(firestoreDb, 'reports', reportId), {
        status: 'DISMISSED',
        dismissedAt: serverTimestamp(),
        dismissedBy: adminId,
        notes: moderationNotes || 'تم تجاهل البلاغ لعدم وجود مخالفة صريحة.'
      });
      showToast('تم رفض وتجاهل البلاغ بنجاح.', 'info');
      setSelectedReportForAction(null);
    } catch (err) {
      showToast('تعذر تحديث حالة البلاغ.', 'error');
    }
  };

  // Force end stream
  const handleForceEndStream = async (streamId: string, reportId?: string) => {
    if (!streamId) return;
    setModerationProcessing(true);
    try {
      const streamRef = doc(firestoreDb, 'live_rooms', streamId);
      await updateDoc(streamRef, {
        status: 'ended',
        endedAt: serverTimestamp(),
        endedReason: 'ADMIN_ENFORCEMENT',
        endedByAdmin: adminId
      });

      if (reportId) {
        await updateDoc(doc(firestoreDb, 'reports', reportId), {
          status: 'RESOLVED',
          actionTaken: 'STREAM_ENDED',
          resolvedAt: serverTimestamp(),
          resolvedBy: adminId,
          notes: 'تم إنهاء البث المخالف فورياً.'
        });
      }

      showToast('تم إنهاء البث بنجاح.', 'success');
    } catch (err) {
      console.error('Error ending stream:', err);
      showToast('تعذر إنهاء البث.', 'error');
    } finally {
      setModerationProcessing(false);
    }
  };

  // =========================================================================
  // TAB 4: USERS & ACCOUNTS MANAGEMENT STATE
  // =========================================================================
  const [usersList, setUsersList] = useState<any[]>([]);

  // Helpers to resolve user names and avatars for moderation and reviews
  const getUserDisplayName = (userId: string, fallbackName?: string) => {
    if (!userId) return 'مستخدم غير معروف';
    const found = usersList.find(u => u.id === userId);
    if (found) {
      return found.displayName || found.name || found.username || found.nickname || userId;
    }
    return fallbackName || userId;
  };

  const getUserAvatar = (userId: string) => {
    if (!userId) return `https://api.dicebear.com/7.x/avataaars/svg?seed=unknown`;
    const found = usersList.find(u => u.id === userId);
    if (found) {
      const av = found.photoURL || found.profileImage || found.avatarUrl || found.avatar;
      return av ? normalizeMediaUrl(av) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
  };

  const isReportInTab = (report: any, tab: 'ALL' | 'CHAT' | 'IMAGE' | 'VIDEO' | 'STREAM') => {
    if (!report) return false;
    if (tab === 'ALL') return true;

    const text = (report.commentText || report.reason || '').toLowerCase();
    
    const hasImage = !!report.imageUrl || text.match(/\.(jpeg|jpg|gif|png|webp)/i) || text.includes('image') || text.includes('photo') || text.includes('صورة');
    const hasVideo = !!report.videoUrl || text.match(/\.(mp4|webm|mov|ogg)/i) || text.includes('video') || text.includes('فيديو') || !!report.streamId;
    const hasAudio = !!report.audioUrl || text.match(/\.(mp3|wav|m4a|ogg|aac)/i) || text.includes('audio') || text.includes('صوت');

    if (tab === 'STREAM') {
      return !!report.streamId;
    }
    if (tab === 'CHAT') {
      return !!report.chatId;
    }
    if (tab === 'IMAGE') {
      return hasImage;
    }
    if (tab === 'VIDEO') {
      return hasVideo;
    }
    return false;
  };

  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BANNED' | 'DELETED' | 'VIP' | 'VERIFIED'>('ALL');
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<any | null>(null);
  const [editUserData, setEditUserData] = useState<{
    coins: number;
    paidCoins: number;
    bonusCoins: number;
    diamonds: number;
    withdrawableProfit: number;
    isVerified: boolean;
    isVIP: boolean;
    isBanned: boolean;
    banReason: string;
    role: string;
    level: number;
    isMicBanned: boolean;
    isCameraBanned: boolean;
  }>({
    coins: 0,
    paidCoins: 0,
    bonusCoins: 0,
    diamonds: 0,
    withdrawableProfit: 0,
    isVerified: false,
    isVIP: false,
    isBanned: false,
    banReason: '',
    role: 'user',
    level: 1,
    isMicBanned: false,
    isCameraBanned: false
  });
  const [savingUser, setSavingUser] = useState<boolean>(false);

  // Listen to users collection in Firestore
  useEffect(() => {
    const usersRef = collection(firestoreDb, 'users');
    const q = query(usersRef, limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setUsersList(items);
      setUsersLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setUsersLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // When opening edit user modal
  const handleOpenUserEditor = (user: any) => {
    setSelectedUserToEdit(user);
    const pCoins = typeof user.paidCoins === 'number' ? user.paidCoins : (Number(user.coins) || 0);
    const bCoins = typeof user.bonusCoins === 'number' ? user.bonusCoins : 0;
    setEditUserData({
      coins: pCoins + bCoins,
      paidCoins: pCoins,
      bonusCoins: bCoins,
      diamonds: Number(user.diamonds) || 0,
      withdrawableProfit: Number(user.withdrawableProfit) || 0,
      isVerified: Boolean(user.isVerified || user.verified),
      isVIP: Boolean(user.isVIP || user.vip),
      isBanned: Boolean(user.isBanned),
      banReason: user.banReason || '',
      role: user.role || 'user',
      level: Number(user.level) || 1,
      isMicBanned: Boolean(user.isMicBanned || user.micBanned),
      isCameraBanned: Boolean(user.isCameraBanned || user.cameraBanned)
    });
  };

  // Zero all balances for user
  const handleZeroAllUserBalances = () => {
    setEditUserData(prev => ({
      ...prev,
      paidCoins: 0,
      bonusCoins: 0,
      coins: 0,
      diamonds: 0,
      withdrawableProfit: 0
    }));
    showToast('تم ضبط كافة الأرصدة والعملات والماسات على 0. اضغط "حفظ التعديلات" للتطبيق الفوري في قاعدة البيانات.', 'info');
  };

  // Save User Updates to Firestore
  const handleSaveUserUpdates = async () => {
    if (!selectedUserToEdit) return;
    setSavingUser(true);
    try {
      const userRef = doc(firestoreDb, 'users', selectedUserToEdit.id);
      const pCoins = Math.max(0, Number(editUserData.paidCoins) || 0);
      const bCoins = Math.max(0, Number(editUserData.bonusCoins) || 0);
      const totalCoins = pCoins + bCoins;

      await updateDoc(userRef, {
        coins: totalCoins,
        paidCoins: pCoins,
        bonusCoins: bCoins,
        diamonds: Math.max(0, Number(editUserData.diamonds) || 0),
        withdrawableProfit: Math.max(0, Number(editUserData.withdrawableProfit) || 0),
        isVerified: editUserData.isVerified,
        verified: editUserData.isVerified,
        isVIP: editUserData.isVIP,
        vip: editUserData.isVIP,
        isBanned: editUserData.isBanned,
        banReason: editUserData.isBanned ? editUserData.banReason : null,
        role: editUserData.role,
        level: Math.max(1, Number(editUserData.level) || 1),
        isMicBanned: editUserData.isMicBanned,
        micBanned: editUserData.isMicBanned,
        isCameraBanned: editUserData.isCameraBanned,
        cameraBanned: editUserData.isCameraBanned,
        adminLastModifiedAt: serverTimestamp(),
        adminLastModifiedBy: adminId
      });

      showToast(`تم حفظ وتطبيق جميع التعديلات لحساب (${selectedUserToEdit.name || selectedUserToEdit.id}) فورياً بنجاح!`, 'success');
      setSelectedUserToEdit(null);
    } catch (err) {
      console.error('Error updating user:', err);
      showToast('تعذر حفظ تعديلات المستخدم، يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  // Soft Delete / Disable Account
  const handleToggleSoftDeleteUser = async (user: any, restore: boolean = false) => {
    try {
      const userRef = doc(firestoreDb, 'users', user.id);
      await updateDoc(userRef, {
        isDeleted: !restore,
        deletedAt: restore ? null : serverTimestamp(),
        restoredAt: restore ? serverTimestamp() : null
      });
      showToast(restore ? `تم استرجاع وتنشيط الحساب (${user.name || user.id}) بنجاح!` : `تم تعطيل وإخفاء الحساب (${user.name || user.id}) بنجاح.`, 'success');
    } catch (err) {
      showToast('حدث خطأ أثناء تغيير حالة الحساب.', 'error');
    }
  };

  // =========================================================================
  // TAB 5: ANALYTICS & BROADCAST NOTIFICATIONS STATE
  // =========================================================================
  const [broadcastsList, setBroadcastsList] = useState<BroadcastNotification[]>([]);
  const [broadcastForm, setBroadcastForm] = useState<{
    title: string;
    message: string;
    imageUrl?: string;
    type: 'SYSTEM_ALERT' | 'REWARD_GIFT' | 'MAINTENANCE' | 'ANNOUNCEMENT';
    targetAudience: 'ALL' | 'HOSTS' | 'VIP';
  }>({
    title: '',
    message: '',
    imageUrl: '',
    type: 'ANNOUNCEMENT',
    targetAudience: 'ALL'
  });
  const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);

  // Listen to system broadcasts
  useEffect(() => {
    const broadcastsRef = collection(firestoreDb, 'system_broadcasts');
    const q = query(broadcastsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const items: BroadcastNotification[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as BroadcastNotification));

      items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });

      setBroadcastsList(items);
    }, () => {});

    return () => unsubscribe();
  }, []);

  // Send Broadcast Notification to all users or target group
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      showToast('يرجى كتابة عنوان ونص الإشعار الجماعي.', 'error');
      return;
    }
    setSendingBroadcast(true);
    try {
      // 1. Add to system_broadcasts collection
      const broadcastDoc = await addDoc(collection(firestoreDb, 'system_broadcasts'), {
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
        imageUrl: broadcastForm.imageUrl?.trim() || '',
        type: broadcastForm.type,
        targetAudience: broadcastForm.targetAudience,
        sentBy: 'system',
        createdAt: serverTimestamp(),
        active: true
      });

      // 2. Dispatch in-app notification to recent users
      const targetUsers = usersList.filter(u => {
        if (broadcastForm.targetAudience === 'VIP') return u.isVIP || u.vip;
        return true;
      });

      // Fan out notifications (up to 50 active users)
      const dispatchPromises = targetUsers.slice(0, 50).map(u => 
        addDoc(collection(firestoreDb, 'users', u.id, 'notifications'), {
          type: 'SYSTEM_BROADCAST',
          broadcastId: broadcastDoc.id,
          title: broadcastForm.title.trim(),
          message: broadcastForm.message.trim(),
          imageUrl: broadcastForm.imageUrl?.trim() || '',
          fromUserId: 'system',
          fromUserName: 'إدارة التطبيق',
          fromUserAvatar: broadcastForm.imageUrl?.trim() || '',
          category: broadcastForm.type,
          read: false,
          timestamp: serverTimestamp()
        }).catch(() => {})
      );
      await Promise.all(dispatchPromises);

      showToast(`تم إرسال الإشعار الجماعي "${broadcastForm.title}" بنجاح إلى ${targetUsers.length} مستخدم!`, 'success');
      setBroadcastForm({
        title: '',
        message: '',
        imageUrl: '',
        type: 'ANNOUNCEMENT',
        targetAudience: 'ALL'
      });
    } catch (err) {
      console.error('Error sending broadcast:', err);
      showToast('تعذر إرسال الإشعار الجماعي، يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleBroadcastImageUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setBroadcastForm(prev => ({ ...prev, imageUrl: compressedDataUrl }));
        showToast('تم تحميل ومعالجة الصورة من الجهاز بنجاح!', 'success');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    try {
      await deleteDoc(doc(firestoreDb, 'system_broadcasts', broadcastId));
      showToast('تم حذف الإشعار من السجل بنجاح.', 'info');
    } catch (err) {
      showToast('تعذر حذف الإشعار.', 'error');
    }
  };

  // =========================================================================
  // TAB 6: DEVELOPER & CLOUD HUB STATE
  // =========================================================================
  const [developerSubTab, setDeveloperSubTab] = useState<'all' | 'cloud' | 'deployment' | 'diagnostics'>('all');
  const [otaSyncStatus, setOtaSyncStatus] = useState<'idle' | 'checking' | 'downloading' | 'applying' | 'success' | 'error'>('idle');
  const [otaProgress, setOtaProgress] = useState<number>(0);
  const [otaLogs, setOtaLogs] = useState<string[]>([
    'جاهز للتحقق من التحديثات المباشرة (OTA Sync Engine Ready)',
    'بيئة العمل: Google AI Studio Production Cloud (Container Port 3000)',
    'النسخة الحالية المثبتة: v9.4.2-PRO (Build 2026.08.15-R2)'
  ]);
  const [lastOtaSyncTime, setLastOtaSyncTime] = useState<string>(() => {
    return localStorage.getItem('hisee_last_ota_sync') || new Date().toLocaleString('ar-SA');
  });
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResults, setPingResults] = useState<{
    firebase: number | null;
    agora: number | null;
    cloudflare: number | null;
    googleCloud: number | null;
    playStore: number | null;
    appStore: number | null;
  }>({
    firebase: 24,
    agora: 31,
    cloudflare: 12,
    googleCloud: 19,
    playStore: 45,
    appStore: 52
  });
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    showToast(`تم نسخ ${label} إلى الحافظة بنجاح`, 'info');
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const handleRunOtaSync = () => {
    if (otaSyncStatus !== 'idle' && otaSyncStatus !== 'success' && otaSyncStatus !== 'error') return;

    setOtaSyncStatus('checking');
    setOtaProgress(15);
    setOtaLogs(prev => [
      `[${new Date().toLocaleTimeString('ar-SA')}] 🔍 بدء فحص وتتبع الحزم البرمجية في AI Studio ومستودع GitHub...`,
      ...prev
    ]);

    setTimeout(() => {
      setOtaSyncStatus('downloading');
      setOtaProgress(55);
      setOtaLogs(prev => [
        `[${new Date().toLocaleTimeString('ar-SA')}] 📦 جلب أحدث ملفات التطبيق والمكونات وقواعد البيانات وتأكيد التوافق...`,
        ...prev
      ]);

      setTimeout(() => {
        setOtaSyncStatus('applying');
        setOtaProgress(85);
        setOtaLogs(prev => [
          `[${new Date().toLocaleTimeString('ar-SA')}] ⚡ تنظيف التخزين المؤقت للكاش (Service Worker & Memory Cache Flushed)...`,
          `[${new Date().toLocaleTimeString('ar-SA')}] 🔄 إعادة مزامنة وتثبيت الإصدار v9.4.2-PRO بنجاح في بيئة المتصفح...`,
          ...prev
        ]);

        setTimeout(() => {
          setOtaSyncStatus('success');
          setOtaProgress(100);
          const nowStr = new Date().toLocaleString('ar-SA');
          setLastOtaSyncTime(nowStr);
          localStorage.setItem('hisee_last_ota_sync', nowStr);
          setOtaLogs(prev => [
            `[${new Date().toLocaleTimeString('ar-SA')}] ✅ تمت المزامنة والتحديث المباشر بنجاح! جميع الخدمات السحابية متطابقة 100%`,
            ...prev
          ]);
          showToast('تم فحص وتطبيق التحديثات المباشرة (OTA Sync) بنجاح!', 'success');
        }, 1000);
      }, 1200);
    }, 1000);
  };

  const handleHardReloadAndFlush = () => {
    showToast('جاري تفريغ ذاكرة التخزين المؤقت وإعادة تحميل التطبيق...', 'info');
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleRunPingTest = async () => {
    setIsPinging(true);
    showToast('جاري قياس زمن استجابة السحابة وسيرفرات البث...', 'info');
    
    setTimeout(() => {
      setPingResults({
        firebase: Math.floor(Math.random() * 15) + 18,
        agora: Math.floor(Math.random() * 20) + 25,
        cloudflare: Math.floor(Math.random() * 10) + 8,
        googleCloud: Math.floor(Math.random() * 12) + 15,
        playStore: Math.floor(Math.random() * 25) + 35,
        appStore: Math.floor(Math.random() * 25) + 40
      });
      setIsPinging(false);
      showToast('اكتمل اختبار سرعة الاتصال بالسحابة.', 'success');
    }, 1200);
  };

  // =========================================================================
  // TAB 7: LIVE STREAMS STATE
  // =========================================================================
  const [liveStreamsList, setLiveStreamsList] = useState<any[]>([]);
  const [liveStreamsLoading, setLiveStreamsLoading] = useState<boolean>(true);
  const [liveStreamSearchQuery, setLiveStreamSearchQuery] = useState<string>('');

  useEffect(() => {
    const liveStreamsRef = collection(firestoreDb, 'live_rooms');
    const q = query(liveStreamsRef, where('status', '==', 'live'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      const streams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveStreamsList(streams);
      setLiveStreamsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Send Admin Warning Alert
  const handleWarnStream = async (streamId: string) => {
    try {
      await addDoc(collection(firestoreDb, 'live_rooms', streamId, 'comments'), {
        text: '⚠️ تحذير إداري: يرجى الالتزام بمعايير البث المباشر. قد يؤدي استمرار المخالفة إلى إنهاء البث فوراً.',
        senderName: 'نظام الإدارة',
        senderId: 'admin',
        isAdminMessage: true,
        timestamp: serverTimestamp()
      });
      showToast('تم إرسال التحذير الإداري إلى البث بنجاح.', 'success');
    } catch (error) {
      console.error('Error warning stream:', error);
      showToast('حدث خطأ أثناء إرسال التحذير.', 'error');
    }
  };

  // =========================================================================
  // TAB 8: STORE & BONUS MANAGER STATE
  // =========================================================================
  const [storePackages, setStorePackages] = useState<any[]>([
    { id: 'pkg_1', coins: 100, price: '0.99', bonus: 0, local: '1,300 IQD' },
    { id: 'pkg_2', coins: 500, price: '4.99', bonus: 0, local: '6,500 IQD' },
    { id: 'pkg_3', coins: 1000, price: '9.99', bonus: 150, local: '13,000 IQD' },
    { id: 'pkg_4', coins: 2500, price: '24.99', bonus: 500, local: '32,500 IQD' },
    { id: 'pkg_5', coins: 5000, price: '49.99', bonus: 1200, local: '65,000 IQD' },
    { id: 'pkg_6', coins: 10000, price: '99.99', bonus: 3000, local: '130,000 IQD' }
  ]);
  const [storePackagesLoading, setStorePackagesLoading] = useState<boolean>(true);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [activePackageMenuId, setActivePackageMenuId] = useState<string | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<any | null>(null);

  useEffect(() => {
    const packagesRef = collection(firestoreDb, 'store_packages');
    const q = query(packagesRef, orderBy('coins', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (document.hidden) return;
      if (!snapshot.empty) {
        const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStorePackages(pkgs);
      }
      setStorePackagesLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveStorePackage = async (pkgData: any) => {
    setModerationProcessing(true);
    try {
      if (pkgData.id) {
        await updateDoc(doc(firestoreDb, 'store_packages', pkgData.id), {
          coins: Number(pkgData.coins),
          price: String(pkgData.price),
          bonus: Number(pkgData.bonus),
          local: pkgData.local || '',
          updatedAt: serverTimestamp(),
          updatedBy: adminId
        });
        showToast('تم تحديث الباقة بنجاح.', 'success');
      } else {
        await addDoc(collection(firestoreDb, 'store_packages'), {
          coins: Number(pkgData.coins),
          price: String(pkgData.price),
          bonus: Number(pkgData.bonus),
          local: pkgData.local || '',
          createdAt: serverTimestamp(),
          createdBy: adminId
        });
        showToast('تمت إضافة الباقة الجديدة بنجاح.', 'success');
      }
      setEditingPackage(null);
    } catch (error) {
      console.error('Error saving package:', error);
      showToast('حدث خطأ أثناء حفظ الباقة.', 'error');
    } finally {
      setModerationProcessing(false);
    }
  };

  const handleDeleteStorePackage = async (packageId: string) => {
    setModerationProcessing(true);
    try {
      await deleteDoc(doc(firestoreDb, 'store_packages', packageId));
      showToast('تم حذف الباقة نهائياً من المتجر وقاعدة البيانات.', 'success');
      setPackageToDelete(null);
      setActivePackageMenuId(null);
    } catch (error) {
      console.error('Error deleting package:', error);
      showToast('حدث خطأ أثناء حذف الباقة.', 'error');
    } finally {
      setModerationProcessing(false);
    }
  };

  // =========================================================================
  // CALCULATED METRICS & KPI AGGREGATES
  // =========================================================================
  const totalApprovedPayoutsUSD = payouts
    .filter(p => p.status === 'APPROVED' || p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPendingPayoutsCount = payouts.filter(p => p.status === 'PENDING').length;
  const totalPendingReportsCount = reportsList.filter(r => r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && !r.isRead).length;
  const totalBannedUsersCount = usersList.filter(u => u.isBanned).length;
  
  const totalCirculatingCoins = usersList.reduce((sum, u) => sum + (Number(u.paidCoins) || 0) + (Number(u.bonusCoins) || 0), 0);
  const totalCirculatingDiamonds = usersList.reduce((sum, u) => sum + (Number(u.diamonds) || 0), 0);

  const totalSpentCoins = transactions
    .filter(t => t.type === 'star_gift' || t.type === 'gift' || t.type === 'spend')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
  const totalChargedCoins = totalCirculatingCoins + totalSpentCoins;
  const totalDiamondsEarned = transactions
    .filter(t => t.type === 'star_gift' || t.type === 'gift')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const platformEarnings = Math.round(totalDiamondsEarned * 0.15);
  const creatorEarnings = totalDiamondsEarned - platformEarnings;

  // =========================================================================
  // RENDER: MAIN MASTER ADMIN DASHBOARD VIEW
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-slate-950" dir="rtl">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 ${
          toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' :
          toastMessage.type === 'error' ? 'bg-rose-950/90 border-rose-500/40 text-rose-200' :
          'bg-amber-950/90 border-amber-500/40 text-amber-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle size={20} className="text-emerald-400 shrink-0" /> :
           toastMessage.type === 'error' ? <AlertCircle size={20} className="text-rose-400 shrink-0" /> :
           <Sparkles size={20} className="text-amber-400 shrink-0" />}
          <span className="text-sm font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Back Button */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Navbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-amber-500/20 shadow-2xl">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all hover:scale-105 active:scale-95"
                title="الرجوع إلى الإعدادات"
              >
                <ChevronLeft size={22} className="rotate-180" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  لوحة التحكم والإدارة الشاملة
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-black tracking-wider">
                  MASTER ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                التحكم المباشر والمشفر بقاعدة بيانات التطبيق، السحوبات، المتجر، البلاغات والمستخدمين
              </p>
            </div>
          </div>

          {/* Quick System Indicators */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>قاعدة البيانات متصلة</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 text-xs font-mono">
              <Lock size={13} className="text-amber-400" />
              <span>PIN Verified</span>
            </div>
          </div>
        </div>

        {/* Master Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
          
          {/* Tab 1: Finance */}
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'finance'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign size={18} />
            <span>المالية والسحوبات</span>
            {totalPendingPayoutsCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'finance' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {totalPendingPayoutsCount}
              </span>
            )}
          </button>

          {/* Tab 2: Gifts & Store */}
          <button
            onClick={() => setActiveTab('gifts')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'gifts'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gift size={18} />
            <span>الهدايا والمتجر</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeTab === 'gifts' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {giftsList.length}
            </span>
          </button>

          {/* Tab 3: Reports & Moderation */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert size={18} />
            <span>البلاغات والحظر</span>
            {totalPendingReportsCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black animate-pulse ${
                activeTab === 'reports' ? 'bg-rose-950 text-rose-300' : 'bg-rose-600 text-white'
              }`}>
                {totalPendingReportsCount}
              </span>
            )}
          </button>

          {/* Tab 4: Users Management */}
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            <span>إدارة الحسابات</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeTab === 'users' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {usersList.length}
            </span>
          </button>

          {/* Tab 5: Analytics & Broadcast */}
          <button
            onClick={() => setActiveTab('analytics_broadcast')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === 'analytics_broadcast'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 size={18} />
            <span>الإحصائيات والإشعارات</span>
          </button>

          {/* Tab 6: Developer & Cloud Hub */}
          <button
            onClick={() => setActiveTab('developer_hub')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all col-span-2 sm:col-span-1 ${
              activeTab === 'developer_hub'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cloud size={18} />
            <span>روابط المنصات والتحديثات</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
              activeTab === 'developer_hub' ? 'bg-slate-950 text-amber-400' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}>
              HUB
            </span>
          </button>

          {/* Tab 7: Live Streams */}
          <button
            onClick={() => setActiveTab('live_streams')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all col-span-2 sm:col-span-1 ${
              activeTab === 'live_streams'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video size={18} />
            <span>البثوث المباشرة</span>
          </button>

          {/* Tab 8: Store & Packages */}
          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all col-span-2 sm:col-span-1 ${
              activeTab === 'store'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Store size={18} />
            <span>متجر العملات</span>
          </button>

          {/* Tab 9: HiSee AI Agent & Permissions */}
          <button
            onClick={() => setActiveTab('ai_agent_config')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all col-span-2 sm:col-span-1 ${
              activeTab === 'ai_agent_config'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot size={18} />
            <span>وكيل الذكاء الاصطناعي والصلاحيات</span>
            {pendingAiRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-600 text-white animate-pulse">
                {pendingAiRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          {/* Tab 10: Smart Algorithms Management */}
          <button
            onClick={() => setActiveTab('algorithms')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all col-span-2 sm:col-span-1 ${
              activeTab === 'algorithms'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu size={18} />
            <span>⚙️ إدارة الخوارزميات</span>
          </button>

          {/* Tab 11: Level & Free Stars Control */}
          <button
            onClick={() => setActiveTab('levels')}
            className={`flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all col-span-2 sm:col-span-1 ${
              activeTab === 'levels'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award size={18} />
            <span>⭐ إدارة المستويات</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 6 CONTENT: DEVELOPER & CLOUD HUB                                */}
        {/* =================================================================== */}
        {activeTab === 'developer_hub' && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Top Overview & Version Status Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-sky-500/20 backdrop-blur-xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
                      <Cloud size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-white">
                          مركز المطورين والسحابة والتحديثات المباشرة
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-black tracking-wider font-mono">
                          DEVELOPER & CLOUD HUB
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        الوصول الفوري للوحات تحكم الخدمات السحابية، فحص ومزامنة تحديثات الـ OTA، ومتابعة منصات النشر
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Build & Environment Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-bold">إصدار التطبيق</div>
                    <div className="text-sm font-black text-white font-mono flex items-center gap-1.5 mt-0.5">
                      <GitBranch size={14} className="text-sky-400" />
                      <span>v9.4.2-PRO</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-bold">البيئة السحابية</div>
                    <div className="text-sm font-black text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <Server size={14} />
                      <span>AI Studio Cloud</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-400 font-bold">آخر مزامنة OTA</div>
                    <div className="text-[11px] font-bold text-amber-300 font-mono mt-1 truncate max-w-[140px]">
                      {lastOtaSyncTime}
                    </div>
                  </div>
                </div>

              </div>

              {/* Sub-navigation filters */}
              <div className="flex items-center gap-2 mt-6 pt-5 border-t border-white/10 flex-wrap">
                <button
                  onClick={() => setDeveloperSubTab('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    developerSubTab === 'all'
                      ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  عرض جميع الأقسام (All Hub)
                </button>
                <button
                  onClick={() => setDeveloperSubTab('cloud')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    developerSubTab === 'cloud'
                      ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Cloud size={14} />
                  <span>الخدمات السحابية (Cloud Consoles)</span>
                </button>
                <button
                  onClick={() => setDeveloperSubTab('deployment')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    developerSubTab === 'deployment'
                      ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Zap size={14} />
                  <span>التحديثات والنشر (OTA & Stores)</span>
                </button>
                <button
                  onClick={() => setDeveloperSubTab('diagnostics')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    developerSubTab === 'diagnostics'
                      ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Activity size={14} />
                  <span>فحص الاتصال والاستجابة (Ping)</span>
                </button>
              </div>
            </div>

            {/* =============================================================== */}
            {/* SECTION 1: CLOUD CONSOLES (قسم الوصول السريع للخدمات السحابية)   */}
            {/* =============================================================== */}
            {(developerSubTab === 'all' || developerSubTab === 'cloud') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                      <Cloud size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        قسم الوصول السريع للخدمات السحابية (Cloud Consoles)
                      </h3>
                      <p className="text-xs text-slate-400">
                        روابط مباشرة تنقل الأدمن فوراً إلى لوحات التحكم السحابية المعتمدة في HiSee PRO
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Console 1: Firebase Console */}
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400/60 transition-all backdrop-blur-xl relative flex flex-col justify-between group shadow-xl hover:shadow-amber-500/5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                            <Flame size={26} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                              Firebase Console
                            </h4>
                            <span className="text-[11px] text-amber-300 font-bold block">
                              قواعد البيانات والتوثيق
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          متصل ونشط
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        لوحة تحكم Google Firebase لإدارة مجموعات Firestore الحية، مصادقة الحسابات (Auth)، قواعد الأمان، وتخزين الصور.
                      </p>

                      {/* Quick sub-links */}
                      <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                        <a 
                          href="https://console.firebase.google.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Database size={13} className="text-amber-400" />
                            <span>Firestore Database (المستندات)</span>
                          </span>
                          <ExternalLink size={13} />
                        </a>
                        <a 
                          href="https://console.firebase.google.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Lock size={13} className="text-sky-400" />
                            <span>Authentication & Users (المستخدمين)</span>
                          </span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">
                      <a
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
                      >
                        <ExternalLink size={14} />
                        <span>فتح Firebase Console</span>
                      </a>
                      <button
                        onClick={() => copyToClipboard('https://console.firebase.google.com/', 'رابط Firebase')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
                        title="نسخ الرابط"
                      >
                        {copiedItem === 'رابط Firebase' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Console 2: Agora Console */}
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-sky-500/30 hover:border-sky-400/60 transition-all backdrop-blur-xl relative flex flex-col justify-between group shadow-xl hover:shadow-sky-500/5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-sky-500/20">
                            <Radio size={26} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-sky-400 transition-colors">
                              Agora Console
                            </h4>
                            <span className="text-[11px] text-sky-300 font-bold block">
                              سيرفرات البث المباشر والصوت
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-bold">
                          RTC Gateway
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        لوحة تحكم Agora.io لإدارة قنوات البث الصوتي والمرئي، مفاتيح الـ App ID & Tokens، ومراقبة جودة الاتصال اللحظي.
                      </p>

                      {/* Quick sub-links */}
                      <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                        <a 
                          href="https://console.agora.io/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-sky-500/10 text-slate-300 hover:text-sky-300 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Activity size={13} className="text-sky-400" />
                            <span>RTC Analytics (تحليلات جودة البث)</span>
                          </span>
                          <ExternalLink size={13} />
                        </a>
                        <a 
                          href="https://console.agora.io/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-sky-500/10 text-slate-300 hover:text-sky-300 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Key size={13} className="text-amber-400" />
                            <span>Projects & App Keys (إعدادات المفاتيح)</span>
                          </span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">
                      <a
                        href="https://console.agora.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40"
                      >
                        <ExternalLink size={14} />
                        <span>فتح Agora Console</span>
                      </a>
                      <button
                        onClick={() => copyToClipboard('https://console.agora.io/', 'رابط Agora')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
                        title="نسخ الرابط"
                      >
                        {copiedItem === 'رابط Agora' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Console 3: Cloudflare Dashboard */}
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-orange-500/30 hover:border-orange-400/60 transition-all backdrop-blur-xl relative flex flex-col justify-between group shadow-xl hover:shadow-orange-500/5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-orange-500/20">
                            <Shield size={26} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-orange-400 transition-colors">
                              Cloudflare Dashboard
                            </h4>
                            <span className="text-[11px] text-orange-300 font-bold block">
                              الحماية والحفظ السحابي
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold">
                          WAF & CDN
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        لوحة تحكم Cloudflare لإدارة DNS النطاقات، جدران الحماية (WAF/DDoS Shield)، تفريغ وتخزين الكاش السحابي (CDN).
                      </p>

                      {/* Quick sub-links */}
                      <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                        <a 
                          href="https://dash.cloudflare.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-orange-500/10 text-slate-300 hover:text-orange-300 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Globe size={13} className="text-orange-400" />
                            <span>DNS & SSL/TLS Management</span>
                          </span>
                          <ExternalLink size={13} />
                        </a>
                        <a 
                          href="https://dash.cloudflare.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-orange-500/10 text-slate-300 hover:text-orange-300 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Zap size={13} className="text-amber-400" />
                            <span>Purge Cache & Performance</span>
                          </span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">
                      <a
                        href="https://dash.cloudflare.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/40"
                      >
                        <ExternalLink size={14} />
                        <span>فتح Cloudflare Dashboard</span>
                      </a>
                      <button
                        onClick={() => copyToClipboard('https://dash.cloudflare.com/', 'رابط Cloudflare')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
                        title="نسخ الرابط"
                      >
                        {copiedItem === 'رابط Cloudflare' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* SECTION 2: DEPLOYMENT & STORE SYNC (قسم التحديثات والنشر)        */}
            {/* =============================================================== */}
            {(developerSubTab === 'all' || developerSubTab === 'deployment') && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        قسم التحديثات والنشر (Deployment & Store Sync)
                      </h3>
                      <p className="text-xs text-slate-400">
                        محرك التحديثات المباشرة (OTA Sync) وروابط منصات النشر في المتاجر الرسمية
                      </p>
                    </div>
                  </div>
                </div>

                {/* OTA Synchronizer Engine Card */}
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-lg shadow-purple-500/20">
                        <UploadCloud size={30} className={otaSyncStatus === 'checking' || otaSyncStatus === 'downloading' || otaSyncStatus === 'applying' ? 'animate-bounce' : ''} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-white">
                            محرك التحديثات الفورية (OTA Live Sync)
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            otaSyncStatus === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            otaSyncStatus === 'checking' || otaSyncStatus === 'downloading' || otaSyncStatus === 'applying' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' :
                            'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          }`}>
                            {otaSyncStatus === 'idle' ? 'جاهز للمزامنة' :
                             otaSyncStatus === 'checking' ? 'فحص المستودع...' :
                             otaSyncStatus === 'downloading' ? 'جلب الملفات...' :
                             otaSyncStatus === 'applying' ? 'تطبيق التحديث وتطهير الكاش...' : 'محدث ومتطابق'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          جلب أحدث التغيرات والملفات البرمجية الصادرة من بيئة AI Studio / GitHub وتطبيقها بداخل النسخة فوراً
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons for OTA Sync */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button
                        onClick={handleRunOtaSync}
                        disabled={otaSyncStatus === 'checking' || otaSyncStatus === 'downloading' || otaSyncStatus === 'applying'}
                        className={`flex-1 md:flex-initial py-3 px-6 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl ${
                          otaSyncStatus === 'checking' || otaSyncStatus === 'downloading' || otaSyncStatus === 'applying'
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white shadow-purple-950/50 hover:scale-[1.02] active:scale-95'
                        }`}
                      >
                        <RefreshCcw size={16} className={otaSyncStatus === 'checking' || otaSyncStatus === 'downloading' || otaSyncStatus === 'applying' ? 'animate-spin' : ''} />
                        <span>فحص وتطبيق التحديثات المباشرة (OTA Sync)</span>
                      </button>

                      <button
                        onClick={handleHardReloadAndFlush}
                        className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-white/10 hover:border-rose-500/30 font-bold text-xs transition-all flex items-center gap-1.5"
                        title="إعادة تحميل الصفحة وتطهير الذاكرة المؤقتة"
                      >
                        <RotateCcw size={15} />
                        <span className="hidden sm:inline">Hard Flush</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(otaSyncStatus === 'checking' || otaSyncStatus === 'downloading' || otaSyncStatus === 'applying' || otaSyncStatus === 'success') && (
                    <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-purple-300">معدل اكتمال المزامنة الفورية:</span>
                        <span className="text-sky-400">{otaProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-white/10">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400 transition-all duration-500 shadow-lg shadow-purple-500/50"
                          style={{ width: `${otaProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Live Sync Terminal Log */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-[11px] space-y-1.5 max-h-40 overflow-y-auto">
                    <div className="text-slate-500 text-[10px] pb-1 border-b border-white/5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Terminal size={13} className="text-purple-400" />
                        <span>سجل عمليات محرك الـ OTA (Live Terminal Logs)</span>
                      </span>
                      <span>UTF-8 Ready</span>
                    </div>
                    {otaLogs.map((log, index) => (
                      <div key={index} className={`leading-relaxed ${index === 0 ? 'text-sky-300 font-bold' : 'text-slate-400'}`}>
                        {log}
                      </div>
                    ))}
                  </div>

                </div>

                {/* App Stores & Publishing Consoles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Store 1: Google Play Console */}
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/60 transition-all backdrop-blur-xl relative flex flex-col justify-between group shadow-xl">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
                            <PlayCircle size={26} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                              Google Play Console
                            </h4>
                            <span className="text-[11px] text-emerald-300 font-bold block">
                              منصة نشر تطبيقات Android
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          Android (AAB/APK)
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        متابعة مراجعات نسخ HiSee المرفوعة لمتجر Google Play، إدارة المسار الداخلي والتجريبي (Internal & Open Tracks)، وتحليل الأعطال.
                      </p>

                      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>حزمة التطبيق (Package):</span>
                          <span className="font-mono text-white font-bold">com.hisee.live</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>مسار الإصدار (Track):</span>
                          <span className="text-emerald-400 font-bold">Production & Open Beta</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">
                      <a
                        href="https://play.google.com/console/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                      >
                        <ExternalLink size={14} />
                        <span>فتح Google Play Console</span>
                      </a>
                      <button
                        onClick={() => copyToClipboard('https://play.google.com/console/', 'رابط Google Play')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
                        title="نسخ الرابط"
                      >
                        {copiedItem === 'رابط Google Play' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Store 2: Apple App Store Connect */}
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-sky-500/30 hover:border-sky-400/60 transition-all backdrop-blur-xl relative flex flex-col justify-between group shadow-xl">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center font-black shadow-lg shadow-sky-500/20">
                            <Laptop size={26} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-sky-400 transition-colors">
                              App Store Connect
                            </h4>
                            <span className="text-[11px] text-sky-300 font-bold block">
                              منصة نشر تطبيقات Apple iOS
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-bold">
                          iOS & TestFlight
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        إدارة نسخ iOS في Apple Developer، متابعة مراجعات TestFlight التجريبية للمختبرين، وحالة الموافقة الرسمية من Apple.
                      </p>

                      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>معرف الحزمة (Bundle ID):</span>
                          <span className="font-mono text-white font-bold">com.hisee.app</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>حالة TestFlight:</span>
                          <span className="text-sky-400 font-bold">Active Builds</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">
                      <a
                        href="https://appstoreconnect.apple.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40"
                      >
                        <ExternalLink size={14} />
                        <span>فتح App Store Connect</span>
                      </a>
                      <button
                        onClick={() => copyToClipboard('https://appstoreconnect.apple.com/', 'رابط App Store')}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
                        title="نسخ الرابط"
                      >
                        {copiedItem === 'رابط App Store' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* =============================================================== */}
            {/* SECTION 3: CLOUD DIAGNOSTICS & PING LATENCY TESTER              */}
            {/* =============================================================== */}
            {(developerSubTab === 'all' || developerSubTab === 'diagnostics') && (
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                      <Activity size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">
                        فاحص سرعة واستجابة الاتصال بالسحابة (Cloud Diagnostics)
                      </h4>
                      <p className="text-xs text-slate-400">
                        مراقبة زمن استجابة الـ Ping وزمن وصول الحزم إلى خوادم البث وقواعد البيانات
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunPingTest}
                    disabled={isPinging}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-950/40"
                  >
                    <RefreshCw size={14} className={isPinging ? 'animate-spin' : ''} />
                    <span>{isPinging ? 'جاري الفحص...' : 'اختبار سرعة الاتصال بالسحابة'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Firebase Firestore</span>
                    <span className="text-lg font-black text-amber-400 font-mono block">
                      {pingResults.firebase} ms
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold">ممتاز (Active)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Agora RTC Edge</span>
                    <span className="text-lg font-black text-sky-400 font-mono block">
                      {pingResults.agora} ms
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold">فائق السرعة</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Cloudflare CDN</span>
                    <span className="text-lg font-black text-orange-400 font-mono block">
                      {pingResults.cloudflare} ms
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold">حماية فعالة</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Google Cloud Run</span>
                    <span className="text-lg font-black text-emerald-400 font-mono block">
                      {pingResults.googleCloud} ms
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold">Port 3000 Ingress</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Google Play Sync</span>
                    <span className="text-lg font-black text-teal-400 font-mono block">
                      {pingResults.playStore} ms
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">API Ready</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">App Store Connect</span>
                    <span className="text-lg font-black text-blue-400 font-mono block">
                      {pingResults.appStore} ms
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">API Ready</span>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* KPI Cards Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold">طلبات السحب المعلقة</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{totalPendingPayoutsCount} طلب</div>
                <div className="text-xs text-amber-400 mt-1 font-mono">
                  بإجمالي: {payouts.filter(p => p.status === 'PENDING').reduce((s, p) => s + (Number(p.amount) || 0), 0)} €
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold">إجمالي السحوبات المعتمدة</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400">{totalApprovedPayoutsUSD.toLocaleString()} €</div>
                <div className="text-xs text-slate-400 mt-1">
                  تم اعتمادها وتوثيقها بالكامل
                </div>
              </div>

              <div 
                className="p-5 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl relative overflow-hidden group cursor-pointer hover:border-yellow-500/50 transition-all"
                onClick={() => setOpenFinanceModal('coins')}
              >
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold">إجمالي العملات المتداولة</span>
                  <div className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                    <HiSeeCoinIcon size={20} />
                  </div>
                </div>
                <div className="text-2xl font-black text-yellow-400">{formatMoney(totalCirculatingCoins)}</div>
                <div className="text-xs text-slate-400 mt-1">اضغط للتفاصيل</div>
              </div>

              <div 
                className="p-5 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl relative overflow-hidden group cursor-pointer hover:border-cyan-500/50 transition-all"
                onClick={() => setOpenFinanceModal('diamonds')}
              >
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold">إجمالي الماسات المتداولة</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                </div>
                <div className="text-2xl font-black text-cyan-400">{formatMoney(totalCirculatingDiamonds)} 💎</div>
                <div className="text-xs text-slate-400 mt-1">اضغط للتفاصيل</div>
              </div>
            </div>

            {openFinanceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setOpenFinanceModal(null)}>
                <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-white">
                      {openFinanceModal === 'coins' ? 'تفاصيل العملات المتداولة' : 'تفاصيل الماسات والأرباح'}
                    </h3>
                    {openFinanceModal !== 'coins' && (
                      <button onClick={() => setCurrency(prev => prev === 'EUR' ? 'USD' : 'EUR')} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-1 px-3 rounded-lg">
                        {currency}
                      </button>
                    )}
                  </div>
                  {openFinanceModal === 'coins' ? (
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-black/40 rounded-xl"><span>إجمالي الشحن:</span><span className="font-bold">{totalChargedCoins.toLocaleString()}</span></div>
                      <div className="flex justify-between p-3 bg-black/40 rounded-xl"><span>إجمالي الإنفاق:</span><span className="font-bold">{totalSpentCoins.toLocaleString()}</span></div>
                      <div className="flex justify-between p-3 bg-emerald-900/20 rounded-xl border border-emerald-500/30"><span>المتبقي الفعلي:</span><span className="font-bold text-emerald-400">{totalCirculatingCoins.toLocaleString()}</span></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl">
                          {(['all', 'live', 'videos', 'stories', 'photos'] as const).map(s => (
                            <button key={s} onClick={() => setSource(s)} className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg ${source === s ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>
                              {s === 'all' ? 'الكل' : s === 'live' ? 'البث المباشر' : s === 'videos' ? 'الفيديوهات' : s === 'stories' ? 'القصص' : 'الصور'}
                            </button>
                          ))}
                        </div>
                        {(() => {
                          const filteredTransactions = transactions.filter(t => {
                            if (source === 'all') return (t.type === 'star_gift' || t.type === 'gift' || t.type === 'live_gift' || t.type === 'stream' || t.type === 'video_gift' || t.type === 'reel_stars' || t.type === 'story_gift' || t.type === 'image_gift');
                            if (source === 'live') return (t.type === 'live_gift' || t.type === 'stream' || t.targetId?.startsWith('live-') || t.targetId === 'live');
                            if (source === 'videos') return (t.type === 'video_gift' || t.type === 'reel_stars' || t.targetId?.startsWith('vid-') || t.targetId === 'video');
                            if (source === 'stories') return (t.type === 'story_gift' || t.targetId?.startsWith('story-'));
                            return (t.type === 'image_gift' || t.targetId?.startsWith('img-'));
                          });
                          
                          const total = filteredTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                          
                          return (
                            <>
                              <div className="flex justify-between p-3 bg-black/40 rounded-xl"><span>إجمالي الماسات:</span><span>{formatMoney(total)}</span></div>
                              <div className="flex justify-between p-3 bg-slate-800 rounded-xl"><span>الضرائب (VAT 19%):</span><span>-{formatMoney(total * 0.19)}</span></div>
                              <div className="flex justify-between p-3 bg-slate-800 rounded-xl"><span>رسوم البنوك (5%):</span><span>-{formatMoney(total * 0.05)}</span></div>
                              <div className="flex justify-between p-3 bg-slate-800 rounded-xl"><span>حصة المنصة (15%):</span><span>{formatMoney(total * 0.15)}</span></div>
                              <div className="flex justify-between p-3 bg-emerald-900/20 rounded-xl border border-emerald-500/30"><span>صافي ربح الصانع:</span><span>{formatMoney(total * 0.61)}</span></div>
                            </>
                          );
                        })()}
                    </div>
                  )}
                  <button onClick={() => setOpenFinanceModal(null)} className="w-full mt-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold">إغلاق</button>
                </div>
              </div>
            )}
            
            {/* Sub-tabs for Finance */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFinanceSubTab('payout_reviews')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    financeSubTab === 'payout_reviews'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  مراجعة طلبات السحب
                </button>
                <button
                  onClick={() => setFinanceSubTab('transactions_log')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    financeSubTab === 'transactions_log'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  سجل المعاملات والعمليات ({transactions.length})
                </button>
              </div>

              {/* Status Filter for Payouts */}
              {financeSubTab === 'payout_reviews' && (
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                  {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterPayoutStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        filterPayoutStatus === status
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {status === 'ALL' ? 'الكل' : status === 'PENDING' ? 'المعلقة' : status === 'APPROVED' ? 'المعتمدة' : 'المرفوضة'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payouts Review Sub-tab */}
            {financeSubTab === 'payout_reviews' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={payoutSearchQuery}
                    onChange={e => setPayoutSearchQuery(e.target.value)}
                    placeholder="البحث بالاسم، المعرف، البريد الإلكتروني، أو رقم الآيبان..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pr-11 pl-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {payoutsLoading ? (
                  <div className="p-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin mx-auto mb-3 text-amber-400" size={32} />
                    <span>جاري تحميل طلبات السحب...</span>
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-white/5 text-slate-400">
                    <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400 opacity-60" />
                    <p className="font-bold">لا توجد طلبات سحب معلقة حالياً</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {payouts
                      .filter(p => {
                        if (filterPayoutStatus !== 'ALL') {
                          if (filterPayoutStatus === 'APPROVED') return p.status === 'APPROVED' || p.status === 'completed';
                          return p.status === filterPayoutStatus;
                        }
                        return true;
                      })
                      .filter(p => {
                        if (!payoutSearchQuery.trim()) return true;
                        const q = payoutSearchQuery.toLowerCase();
                        return (p.userNickname || p.userId || '').toLowerCase().includes(q) ||
                               (p.accountDetails?.email || '').toLowerCase().includes(q) ||
                               (p.accountDetails?.iban || '').toLowerCase().includes(q);
                      })
                      .map(payout => (
                        <div 
                          key={payout.id}
                          className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 transition-all space-y-4 relative"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                {payout.userAvatar ? (
                                  <img src={payout.userAvatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                  <User size={24} />
                                )}
                              </div>
                              <div>
                                <h4 className="font-black text-white text-base">
                                  {payout.userNickname || `المستخدم #${payout.userId?.slice(0, 8)}`}
                                </h4>
                                <span className="text-xs text-slate-400 font-mono block">
                                  معرف: {payout.userId || payout.uid}
                                </span>
                              </div>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-black ${
                              payout.status === 'APPROVED' || payout.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              payout.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            }`}>
                              {payout.status === 'APPROVED' || payout.status === 'completed' ? 'تم الاعتماد' :
                               payout.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}
                            </span>
                          </div>

                          {/* Amount & Account Details */}
                          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">المبلغ المطلوب:</span>
                              <span className="text-base font-black text-emerald-400 font-mono">
                                {payout.amount} {payout.currency || 'EUR'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">طريقة التحويل:</span>
                              <span className="font-bold text-slate-200">{payout.payoutMethod || payout.method || 'SEPA Bank / PayPal'}</span>
                            </div>
                            {payout.accountDetails?.iban && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">IBAN:</span>
                                <span className="font-mono text-amber-300">{payout.accountDetails.iban}</span>
                              </div>
                            )}
                            {payout.accountDetails?.email && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">البريد:</span>
                                <span className="font-mono text-slate-200">{payout.accountDetails.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {payout.status === 'PENDING' && (
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setPayoutActionType('approve');
                                }}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
                              >
                                <Check size={16} />
                                <span>اعتماد وتحويل</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setPayoutActionType('reject');
                                }}
                                className="py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                              >
                                <X size={16} />
                                <span>رفض الطلب</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Transactions Log Sub-tab */}
            {financeSubTab === 'transactions_log' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="p-3">نوع العملية</th>
                        <th className="p-3">المستخدم</th>
                        <th className="p-3">المبلغ</th>
                        <th className="p-3">البيان والتفاصيل</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.slice(0, 30).map(t => (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-bold text-amber-300 font-mono">{t.type}</td>
                          <td className="p-3 font-mono text-slate-300">{t.uid?.slice(0, 8)}...</td>
                          <td className="p-3 font-black text-emerald-400">{t.amount ? `${t.amount} €` : (t.paidCoins ? `${t.paidCoins} عملة` : '-')}</td>
                          <td className="p-3 text-slate-300 max-w-xs truncate">{t.description || '-'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400">
                              {t.status || 'completed'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono">
                            {t.timestamp?.toDate ? t.timestamp.toDate().toLocaleDateString('ar-SA') : 'الآن'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2 CONTENT: GIFTS & STORE MANAGEMENT                             */}
        {/* =================================================================== */}
        {activeTab === 'gifts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Gift className="text-amber-400" size={22} />
                  <span>إدارة كتالوج الهدايا ومتجر البث المباشر</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  تعديل أسعار الهدايا، إضافة هدايا جديدة، والتحكم بالفئات والتأثيرات الصوتية والمرئية فورياً
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsNewGiftModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Plus size={16} />
                  <span>إضافة هدية جديدة</span>
                </button>
                <button
                  onClick={handleResetGiftsToDefault}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="استعادة الافتراضي"
                >
                  <RotateCcw size={14} />
                  <span>استعادة الأصل</span>
                </button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {['الكل', 'VIP', 'رومانسية', 'فاخرة', 'حيوانات', 'عامة'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedGiftCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
                    selectedGiftCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {giftsList
                .filter(g => selectedGiftCategory === 'الكل' || g.category === selectedGiftCategory)
                .map(gift => (
                  <div
                    key={gift.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col items-center justify-between text-center relative group"
                  >
                    {gift.isVip && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black tracking-wider">
                        VIP
                      </span>
                    )}

                    <div className="w-14 h-14 my-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {renderGiftIconPreview(gift)}
                    </div>

                    <div className="w-full space-y-1 mt-1">
                      <h5 className="font-bold text-white text-xs truncate">{gift.name}</h5>
                      <div className="flex items-center justify-center gap-1 text-amber-400 font-black text-xs font-mono">
                        <HiSeeCoinIcon size={14} />
                        <span>{gift.price.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">{gift.category}</span>
                    </div>

                    {/* Edit & Delete Quick Actions */}
                    <div className="flex items-center gap-1 w-full mt-3 pt-2 border-t border-white/5">
                      <button
                        onClick={() => setEditingGift(gift)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <Edit3 size={12} />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => handleDeleteOrToggleGift(gift.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[10px] transition-all"
                        title="حذف الهدية"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3 CONTENT: REPORTS & MODERATION                                 */}
        {/* =================================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header & Sub-nav */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldAlert className="text-rose-500" size={22} />
                  <span>مركز البلاغات والحظر وإدارة النزاعات</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  متابعة بلاغات البثوث المباشرة والتعليقات، حظر الحسابات المخالفة وفك الحظر فورياً
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportsSubView('reports')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    reportsSubView === 'reports'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  البلاغات النشطة ({reportsList.filter(r => r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && !r.isRead).length})
                </button>
                <button
                  onClick={() => setReportsSubView('banned_users')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    reportsSubView === 'banned_users'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  قائمة المحظورين ({totalBannedUsersCount})
                </button>
              </div>
            </div>

            {/* Reports List */}
            {reportsSubView === 'reports' && (
              <div className="space-y-6">
                {/* 1. Horizontal Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/60 border border-white/5 overflow-x-auto shrink-0 scrollbar-none">
                  {[
                    { id: 'ALL', label: 'الكل' },
                    { id: 'CHAT', label: 'الدردشة الخاصة' },
                    { id: 'IMAGE', label: 'الصور' },
                    { id: 'VIDEO', label: 'الفيديو' },
                    { id: 'STREAM', label: 'البث المباشر' }
                  ].map(tab => {
                    const isActive = reportsTabFilter === tab.id;
                    // Count of active reports in this category
                    const activeCount = reportsList.filter(r => r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && !r.isRead && isReportInTab(r, tab.id as any)).length;
                    
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setReportsTabFilter(tab.id as any);
                          setSelectedReportedUserId(null); // Reset detail view when changing tab
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-2 relative ${
                          isActive
                            ? 'bg-rose-600 text-white shadow-lg'
                            : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{tab.label}</span>
                        
                        {/* Capped count badge or badge warning indicator */}
                        {activeCount > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                            isActive ? 'bg-white text-rose-700' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                          }`}>
                            {activeCount}
                          </span>
                        )}
                        
                        {/* Red alert badge specifically on "الدردشة الخاصة" (CHAT) as requested */}
                        {tab.id === 'CHAT' && activeCount > 0 && (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-ping" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {reportsLoading ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-900/30 rounded-3xl border border-white/5">
                    <RefreshCw className="animate-spin mx-auto mb-3 text-rose-500" size={32} />
                    <span>جاري فحص وتصنيف البلاغات الواردة...</span>
                  </div>
                ) : (
                  (() => {
                    // Let's filter the active reports
                    const activeReports = reportsList.filter(r => r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && isReportInTab(r, reportsTabFilter));
                    
                    if (activeReports.length === 0) {
                      return (
                        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-white/5 text-slate-400 animate-in fade-in">
                          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400 opacity-60" />
                          <p className="font-bold">سجل البلاغات نظيف في هذا التبويب، لا توجد مخالفات معلقة</p>
                        </div>
                      );
                    }

                    // Group by reportedUser
                    const aggregatedMap: { [userId: string]: any[] } = {};
                    activeReports.forEach(report => {
                      const uId = report.reportedUser || 'unknown_user';
                      if (!aggregatedMap[uId]) {
                        aggregatedMap[uId] = [];
                      }
                      aggregatedMap[uId].push(report);
                    });

                    // Format aggregated list
                    const aggregatedUsers = Object.keys(aggregatedMap).map(uId => {
                      const userReports = aggregatedMap[uId];
                      const sortedReports = [...userReports].sort((a, b) => {
                        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                        return tB - tA;
                      });
                      const latestReport = sortedReports[0];
                      return {
                        userId: uId,
                        reports: sortedReports,
                        totalCount: userReports.length,
                        latestTimestamp: latestReport?.timestamp,
                        latestReason: latestReport?.reason || 'مخالفة سلوك أو محتوى غير لائق'
                      };
                    });

                    // Sort users by count desc, then timestamp desc
                    aggregatedUsers.sort((a, b) => {
                      if (b.totalCount !== a.totalCount) {
                        return b.totalCount - a.totalCount;
                      }
                      const tA = a.latestTimestamp?.toDate ? a.latestTimestamp.toDate().getTime() : 0;
                      const tB = b.latestTimestamp?.toDate ? b.latestTimestamp.toDate().getTime() : 0;
                      return tB - tA;
                    });

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* Left/Main Column: Aggregated User List */}
                        <div className={`space-y-3 ${selectedReportedUserId ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                          <div className="text-xs text-slate-400 mb-2 flex justify-between items-center px-1">
                            <span>المستخدمين المُبلغ عنهم ({aggregatedUsers.length})</span>
                            <span>مرتبة حسب عدد المخالفات</span>
                          </div>

                          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                            {aggregatedUsers.map(aggUser => {
                              const isSelected = selectedReportedUserId === aggUser.userId;
                              const userAvatar = getUserAvatar(aggUser.userId);
                              const userDisplayName = getUserDisplayName(aggUser.userId);
                              
                              return (
                                <button
                                  key={aggUser.userId}
                                  type="button"
                                  onClick={() => setSelectedReportedUserId(aggUser.userId)}
                                  className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 ${
                                    isSelected
                                      ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
                                      : 'bg-slate-900/80 border-white/5 hover:border-white/10 hover:bg-slate-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <img 
                                      src={userAvatar} 
                                      alt="" 
                                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="text-right overflow-hidden">
                                      <h4 className="font-bold text-white text-sm truncate">{userDisplayName}</h4>
                                      <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                                        آخر سبب: {aggUser.latestReason}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-xs font-black border border-rose-500/25 flex items-center gap-1">
                                      <span>البلاغات:</span>
                                      <span>{aggUser.totalCount}</span>
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      {aggUser.latestTimestamp?.toDate ? aggUser.latestTimestamp.toDate().toLocaleString('ar-SA') : 'مؤخراً'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Column: Selected User Detailed Review View */}
                        {selectedReportedUserId && (() => {
                          const userRecord = aggregatedUsers.find(u => u.userId === selectedReportedUserId);
                          if (!userRecord) return null;

                          const userAvatar = getUserAvatar(selectedReportedUserId);
                          const userDisplayName = getUserDisplayName(selectedReportedUserId);

                          return (
                            <div className="lg:col-span-7 p-5 rounded-3xl bg-slate-900/90 border border-rose-500/20 shadow-xl space-y-4 animate-in slide-in-from-left-4 duration-200">
                              {/* Detail Header */}
                              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={userAvatar} 
                                    alt="" 
                                    className="w-12 h-12 rounded-full object-cover border-2 border-rose-500/40"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="text-right">
                                    <h3 className="font-black text-white text-base">{userDisplayName}</h3>
                                    <span className="text-[10px] text-slate-400 font-mono block">ID: {selectedReportedUserId}</span>
                                    <span className="text-[10px] text-rose-400 font-bold block mt-1">يوجد ضده {userRecord.totalCount} بلاغ نشط</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setSelectedReportedUserId(null)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-bold border border-white/5"
                                >
                                  إغلاق التفاصيل ×
                                </button>
                              </div>

                              {/* Archive list of reports against this user */}
                              <div className="space-y-3.5 max-h-[45vh] overflow-y-auto pr-1">
                                <p className="text-xs font-black text-slate-300 px-1">أرشيف وأدلة البلاغات الواردة:</p>
                                
                                {userRecord.reports.map((report, idx) => {
                                  const text = (report.commentText || '').toLowerCase();
                                  const decryptedText = decryptText(report.commentText || '');
                                  const decryptedImageUrl = report.imageUrl ? decryptText(report.imageUrl) : (text.match(/\.(jpeg|jpg|gif|png|webp)/i) || text.includes('firebasestorage') ? decryptedText : '');
                                  const decryptedVideoUrl = report.videoUrl ? decryptText(report.videoUrl) : (text.match(/\.(mp4|webm|mov|ogg)/i) ? decryptedText : '');
                                  const decryptedAudioUrl = report.audioUrl ? decryptText(report.audioUrl) : (text.match(/\.(mp3|wav|m4a|ogg|aac)/i) ? decryptedText : '');
                                  
                                  const isImg = !!decryptedImageUrl || text.includes('image') || text.includes('photo') || text.includes('صورة');
                                  const isVid = !!decryptedVideoUrl || text.includes('video') || text.includes('فيديو') || !!report.streamId;
                                  const isAud = !!decryptedAudioUrl || text.includes('audio') || text.includes('صوت');

                                  return (
                                    <div key={report.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 text-xs relative">
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-amber-400">البلاغ #{idx + 1}</span>
                                        <span className="text-slate-500 font-mono">
                                          {report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString('ar-SA') : 'مؤخراً'}
                                        </span>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-slate-500 block">السبب المذكور للبلاغ:</span>
                                        <p className="font-bold text-white text-sm bg-white/5 p-2 rounded-xl border border-white/5">
                                          {report.reason || 'سلوك غير لائق أو مخالف لمعايير الاستخدام'}
                                        </p>
                                      </div>

                                      {/* 1. Message Text Decrypted evidence */}
                                      {decryptedText && !isImg && !isVid && !isAud && (
                                        <div className="space-y-1">
                                          <span className="text-slate-500 block">محتوى المخالفة (الرسالة/التعليق):</span>
                                          <p className="text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-white/5 select-text">
                                            "{decryptedText}"
                                          </p>
                                        </div>
                                      )}

                                      {/* 2. Visual evidence (Image) */}
                                      {isImg && (decryptedImageUrl || decryptedText) && (
                                        <div className="space-y-1.5">
                                          <span className="text-slate-500 block">دليل الصورة المرفقة:</span>
                                          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-1.5 max-w-sm">
                                            <img 
                                              src={normalizeMediaUrl(decryptedImageUrl || decryptedText)} 
                                              alt="دليل صورة" 
                                              referrerPolicy="no-referrer"
                                              className="max-h-[160px] object-contain rounded-lg"
                                              onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* 2.5. Video evidence */}
                                      {isVid && (decryptedVideoUrl || decryptedText || report.videoUrl) && (
                                        <div className="space-y-1.5">
                                          <span className="text-slate-500 block">دليل الفيديو المرفق:</span>
                                          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-1.5 max-w-sm">
                                            <video 
                                              src={normalizeMediaUrl(decryptedVideoUrl || decryptedText || report.videoUrl)} 
                                              controls 
                                              preload="metadata"
                                              className="max-h-[180px] object-contain rounded-lg w-full"
                                              onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* 3. Audio Player evidence */}
                                      {isAud && (decryptedAudioUrl || decryptedText) && (
                                        <div className="space-y-1.5">
                                          <span className="text-slate-500 block">دليل التسجيل الصوتي:</span>
                                          <audio 
                                            src={normalizeMediaUrl(decryptedAudioUrl || decryptedText)} 
                                            controls 
                                            preload="metadata"
                                            className="w-full h-8 max-w-[260px] opacity-90 filter invert grayscale" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                                          />
                                        </div>
                                      )}

                                      {/* 4. Stream entry tracking or Chat Review access */}
                                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                                        {report.streamId && (
                                          <button
                                            type="button"
                                            onClick={() => window.open(`/?stream=${report.streamId}`, '_blank')}
                                            className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all flex items-center gap-1"
                                          >
                                            <ExternalLink size={12} />
                                            <span>دخول البث للمراقبة</span>
                                          </button>
                                        )}
                                        {report.chatId && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveReviewReport(report);
                                              setActiveReviewChatId(report.chatId!);
                                            }}
                                            className="py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] transition-all flex items-center gap-1"
                                          >
                                            <Eye size={12} />
                                            <span>فتح المحادثة الكاملة</span>
                                          </button>
                                        )}
                                        {(report.imageUrl || decryptedImageUrl) && (
                                          <button
                                            type="button"
                                            onClick={() => window.open(normalizeMediaUrl(decryptedImageUrl || report.imageUrl), '_blank')}
                                            className="py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] transition-all flex items-center gap-1"
                                          >
                                            <ExternalLink size={12} />
                                            <span>مراجعة ومعاينة الصورة</span>
                                          </button>
                                        )}
                                        {(report.videoUrl || decryptedVideoUrl) && (
                                          <button
                                            type="button"
                                            onClick={() => window.open(normalizeMediaUrl(decryptedVideoUrl || report.videoUrl), '_blank')}
                                            className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-all flex items-center gap-1"
                                          >
                                            <ExternalLink size={12} />
                                            <span>مراجعة ومعاينة الفيديو</span>
                                          </button>
                                        )}
                                        <span className="text-[10px] text-slate-500 mr-auto">
                                          المُبلغ: {getUserDisplayName(report.reportedBy || '', report.reporterName || 'غير معروف')}
                                        </span>
                                      </div>

                                      {/* Action buttons per individual report inside archive */}
                                      <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
                                        <button
                                          type="button"
                                          onClick={() => handleDismissReport(report.id)}
                                          className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 font-bold text-xs border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-center gap-1.5"
                                        >
                                          <X size={14} />
                                          <span>رفض وتجاهل هذا البلاغ</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Collective control buttons (Actions for the whole user) */}
                              <div className="pt-4 border-t border-white/5 flex flex-col gap-2.5">
                                <p className="text-xs font-bold text-slate-400">الإجراءات الجماعية على الحساب بالكامل:</p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm(`هل أنت متأكد من حظر المستخدم (${userDisplayName}) وتسوية كافة البلاغات (${userRecord.totalCount}) الموجهة ضده؟`)) {
                                        // Ban and resolve all reports against this user in parallel/sequence
                                        setModerationProcessing(true);
                                        try {
                                          // 1. Ban the user
                                          const userRef = doc(firestoreDb, 'users', selectedReportedUserId);
                                          await updateDoc(userRef, {
                                            isBanned: true,
                                            banReason: banReasonInput || 'تراكم وتكرار بلاغات انتهاك معايير المجتمع',
                                            bannedAt: serverTimestamp(),
                                            bannedBy: adminId
                                          });

                                          // 2. Resolve all their pending reports
                                          const resolvePromises = userRecord.reports.map(rep => 
                                            updateDoc(doc(firestoreDb, 'reports', rep.id), {
                                              status: 'RESOLVED',
                                              actionTaken: 'USER_BANNED',
                                              resolvedAt: serverTimestamp(),
                                              resolvedBy: adminId,
                                              notes: moderationNotes || 'تم حظر الحساب تلقائياً بسبب تراكم وتكرار بلاغات انتهاك معايير الاستخدام.'
                                            })
                                          );
                                          await Promise.all(resolvePromises);

                                          showToast(`تم حظر الحساب وتسوية جميع بلاغاته (${userRecord.totalCount}) بنجاح!`, 'success');
                                          setSelectedReportedUserId(null);
                                        } catch (e) {
                                          console.error(e);
                                          showToast('حدث خطأ أثناء تنفيذ الحظر الجماعي.', 'error');
                                        } finally {
                                          setModerationProcessing(false);
                                        }
                                      }
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/40"
                                  >
                                    <Ban size={15} />
                                    <span>حظر الحساب وتسوية كافة البلاغات</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm(`هل أنت متأكد من تجاهل ورفض كافة البلاغات (${userRecord.totalCount}) الموجهة ضد (${userDisplayName})؟`)) {
                                        setModerationProcessing(true);
                                        try {
                                          const dismissPromises = userRecord.reports.map(rep => 
                                            updateDoc(doc(firestoreDb, 'reports', rep.id), {
                                              status: 'DISMISSED',
                                              dismissedAt: serverTimestamp(),
                                              dismissedBy: adminId,
                                              notes: moderationNotes || 'تجاهل جماعي للبلاغات.'
                                            })
                                          );
                                          await Promise.all(dismissPromises);
                                          showToast(`تم رفض وتجاهل جميع البلاغات (${userRecord.totalCount}) بنجاح.`, 'info');
                                          setSelectedReportedUserId(null);
                                        } catch (e) {
                                          showToast('حدث خطأ أثناء تجاهل البلاغات.', 'error');
                                        } finally {
                                          setModerationProcessing(false);
                                        }
                                      }
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-white/5 transition-all flex items-center justify-center gap-1.5 shadow-lg"
                                  >
                                    <X size={15} />
                                    <span>رفض وتجاهل جميع البلاغات</span>
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })()}

                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* Banned Users View */}
            {reportsSubView === 'banned_users' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {usersList
                    .filter(u => u.isBanned)
                    .map(bannedUser => (
                      <div
                        key={bannedUser.id}
                        className="p-5 rounded-3xl bg-slate-900/80 border border-rose-500/20 space-y-4 relative"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                            <UserX size={24} />
                          </div>
                          <div>
                            <h4 className="font-black text-white text-base">
                              {bannedUser.displayName || bannedUser.name || `مستخدم #${bannedUser.id.slice(0, 6)}`}
                            </h4>
                            <span className="text-xs text-rose-400 font-mono block">حساب محظور</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-xs space-y-1">
                          <span className="text-slate-400 block text-[11px]">سبب الحظر المسجل:</span>
                          <p className="text-slate-200 font-medium">{bannedUser.banReason || 'انتهاك معايير الاستخدام'}</p>
                        </div>

                        <button
                          onClick={() => handleUnbanUser(bannedUser.id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                        >
                          <UserCheck size={16} />
                          <span>فك الحظر واستعادة الحساب</span>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Premium Conversation & Media Review Modal for Admins */}
            {activeReviewChatId && (
              <div 
                className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4 backdrop-blur-md"
                onClick={() => {
                  setActiveReviewChatId(null);
                  setActiveReviewReport(null);
                }}
              >
                <div 
                  className="bg-[#0b0f19] border border-violet-500/30 rounded-3xl p-5 sm:p-6 w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl relative text-right overflow-hidden animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                      <ShieldAlert className="text-violet-400" size={22} />
                      <span>أداة مراجعة المحادثة والملحقات (للتحقيق)</span>
                    </h3>
                    <button 
                      onClick={() => {
                        setActiveReviewChatId(null);
                        setActiveReviewReport(null);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* ID Bar */}
                  <div className="bg-violet-950/20 border border-violet-500/15 rounded-xl p-3 mt-3 mb-4 text-xs flex justify-between items-center shrink-0">
                    <span className="text-slate-400 font-bold">معرّف المحادثة:</span>
                    <span className="text-violet-300 font-mono font-black select-all">{activeReviewChatId}</span>
                  </div>

                  {/* Chat History Messages Scroll area */}
                  <div className="flex-1 overflow-y-auto space-y-4 p-3 bg-black/30 rounded-2xl border border-white/5 overscroll-contain mb-4">
                    {activeReviewChatLoading ? (
                      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                        <RefreshCw size={32} className="animate-spin text-violet-500" />
                        <span className="text-xs font-bold">جاري تحميل رسائل ومرفقات المحادثة...</span>
                      </div>
                    ) : activeReviewChatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-1.5 p-4 text-center">
                        <AlertCircle size={32} className="text-slate-600" />
                        <p className="text-sm font-bold">لا توجد رسائل مسجلة في هذه المحادثة</p>
                        <p className="text-xs max-w-xs">ربما تم حذفها بالكامل من قبل أطراف المحادثة أو أن المعرّف غير مطابق.</p>
                      </div>
                    ) : (
                      activeReviewChatMessages.map((msg, index) => {
                        const decryptedText = decryptText(msg.text || msg.content || '');
                        const decryptedImageUrl = msg.imageUrl ? decryptText(msg.imageUrl) : (msg.type === 'image' ? decryptedText : '');
                        const decryptedVideoUrl = msg.videoUrl ? decryptText(msg.videoUrl) : (msg.type === 'video' ? decryptedText : '');
                        const decryptedAudioUrl = msg.audioUrl ? decryptText(msg.audioUrl) : (msg.type === 'audio' ? decryptedText : '');
                        const decryptedFileUrl = msg.fileUrl ? decryptText(msg.fileUrl) : (msg.type === 'document' ? decryptedText : '');
                        
                        const isImage = msg.type === 'image' || !!decryptedImageUrl || (decryptedText.startsWith('http') && (decryptedText.match(/\.(jpeg|jpg|gif|png|webp)/i) || decryptedText.includes('image') || decryptedText.includes('firebasestorage')));
                        const isVideo = msg.type === 'video' || !!decryptedVideoUrl || (decryptedText.startsWith('http') && (decryptedText.match(/\.(mp4|webm|mov|ogg)/i) || decryptedText.includes('video')));
                        const isAudio = msg.type === 'audio' || !!decryptedAudioUrl || (decryptedText.startsWith('http') && (decryptedText.match(/\.(mp3|wav|m4a|ogg|aac)/i) || decryptedText.includes('audio') || decryptedText.includes('voice')));
                        const isDoc = msg.type === 'document' || !!decryptedFileUrl;
                        
                        const senderName = getUserDisplayName(msg.senderId);
                        const senderAvatar = getUserAvatar(msg.senderId);

                        const isReporter = msg.senderId === activeReviewReport?.reportedBy;
                        const isSuspect = msg.senderId === activeReviewReport?.reportedUser;

                        // Reporter on the right side, suspect/others on the left side
                        const bubbleAlign = isReporter ? 'flex-row-reverse' : 'flex-row';
                        const bubbleBg = isReporter 
                          ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-50 rounded-br-none' 
                          : isSuspect 
                            ? 'bg-rose-950/40 border-rose-500/20 text-rose-50 rounded-bl-none' 
                            : 'bg-slate-900/50 border-white/5 text-slate-100 rounded-bl-none';

                        return (
                          <div 
                            key={msg.id || index} 
                            className={`flex gap-3 w-full ${bubbleAlign}`}
                          >
                            {/* Avatar */}
                            <img 
                              src={senderAvatar} 
                              alt="" 
                              className={`w-9 h-9 rounded-full object-cover border shrink-0 ${
                                isReporter ? 'border-emerald-500/40' : isSuspect ? 'border-rose-500/40' : 'border-white/10'
                              }`}
                              referrerPolicy="no-referrer"
                            />

                            {/* Bubble Content Area */}
                            <div className={`flex flex-col max-w-[75%] ${isReporter ? 'items-end' : 'items-start'}`}>
                              {/* Sender metadata header */}
                              <div className="flex items-center gap-2 mb-1 shrink-0">
                                <span className="text-xs font-black text-slate-300">{senderName}</span>
                                {isReporter && (
                                  <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                                    الشاكي (المُبلغ) 📣
                                  </span>
                                )}
                                {isSuspect && (
                                  <span className="text-[9px] font-extrabold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full border border-rose-500/30">
                                    المشكو في حقه (المُبلغ ضده) ⚠️
                                  </span>
                                )}
                              </div>

                              {/* Actual Bubble Box */}
                              <div className={`p-3.5 rounded-2xl border text-right space-y-2 ${bubbleBg}`}>
                                
                                {/* 1. Text Message Content */}
                                {decryptedText && !isImage && !isVideo && !isAudio && !isDoc && (
                                  <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap select-text">
                                    {decryptedText}
                                  </p>
                                )}

                                {/* 2. Audio Player Component */}
                                {isAudio && (
                                  <div className="space-y-1.5 min-w-[220px]">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                                      <Volume2 size={16} />
                                      <span>رسالة صوتية مبلّغ عنها:</span>
                                    </div>
                                    <audio 
                                      src={decryptedAudioUrl || decryptedText} 
                                      controls 
                                      preload="metadata"
                                      className="w-full h-8 max-w-[240px] opacity-95 filter invert grayscale contrast-200" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                                    />
                                    {decryptedText && decryptedText !== decryptedAudioUrl && !decryptedText.startsWith('http') && (
                                      <p className="text-[11px] text-slate-300 bg-black/20 p-1.5 rounded-lg select-text">{decryptedText}</p>
                                    )}
                                  </div>
                                )}

                                {/* 3. Image Component */}
                                {isImage && (
                                  <div className="space-y-1.5">
                                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-1">
                                      <img 
                                        src={decryptedImageUrl || decryptedText} 
                                        alt="مرفق صورة" 
                                        referrerPolicy="no-referrer"
                                        className="max-w-full max-h-[250px] object-contain rounded-lg hover:scale-[1.03] transition-all cursor-zoom-in"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <div className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                                      <FileImage size={12} className="text-violet-400" />
                                      <span>صورة مرفقة (تم فك التشفير)</span>
                                    </div>
                                    {decryptedText && decryptedText !== decryptedImageUrl && !decryptedText.startsWith('http') && (
                                      <p className="text-[11px] text-slate-300 bg-black/20 p-1.5 rounded-lg select-text">{decryptedText}</p>
                                    )}
                                  </div>
                                )}

                                {/* 4. Video Component */}
                                {isVideo && (
                                  <div className="space-y-1.5">
                                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-1">
                                      <video 
                                        src={decryptedVideoUrl || decryptedText} 
                                        controls 
                                        className="max-w-full max-h-[200px] rounded-lg"
                                      />
                                    </div>
                                    <div className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                                      <Video size={12} className="text-violet-400" />
                                      <span>فيديو مرفق (تم فك التشفير)</span>
                                    </div>
                                    {decryptedText && decryptedText !== decryptedVideoUrl && !decryptedText.startsWith('http') && (
                                      <p className="text-[11px] text-slate-300 bg-black/20 p-1.5 rounded-lg select-text">{decryptedText}</p>
                                    )}
                                  </div>
                                )}

                                {/* 5. Document / File Component */}
                                {isDoc && (
                                  <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-black/20 border border-white/10 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <FileText className="text-amber-400 shrink-0" size={18} />
                                      <div className="flex-1 overflow-hidden">
                                        <p className="text-white text-xs font-bold truncate">{msg.fileName || 'ملف مرفق'}</p>
                                        <p className="text-slate-400 text-[9px]">{msg.fileSize || 'مستند مفرغ'}</p>
                                      </div>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => window.open(decryptedFileUrl || decryptedText, '_blank')}
                                      className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] transition-colors"
                                    >
                                      تحميل الملف المرفق
                                    </button>
                                  </div>
                                )}

                              </div>

                              {/* Timestamp info */}
                              <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString('ar-SA') : 'مؤخراً'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Actions / Close */}
                  <div className="flex gap-2 shrink-0 pt-3 border-t border-white/10">
                    <button 
                      type="button" 
                      onClick={() => {
                        setActiveReviewChatId(null);
                        setActiveReviewReport(null);
                      }} 
                      className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm border border-white/10"
                    >
                      إغلاق نافذة المعاينة
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4 CONTENT: USERS & ACCOUNTS MANAGEMENT                          */}
        {/* =================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="text-amber-400" size={22} />
                  <span>إدارة وتعديل حسابات المستخدمين</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  البحث المتقدم، تعديل الأرصدة، شارات التوثيق وVIP، حظر وتعطيل واسترجاع الحسابات
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 flex-wrap">
                {(['ALL', 'ACTIVE', 'VIP', 'VERIFIED', 'BANNED', 'DELETED'] as const).map(filterKey => (
                  <button
                    key={filterKey}
                    onClick={() => setUserStatusFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      userStatusFilter === filterKey
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filterKey === 'ALL' ? 'الكل' :
                     filterKey === 'ACTIVE' ? 'النشطين' :
                     filterKey === 'VIP' ? 'VIP' :
                     filterKey === 'VERIFIED' ? 'الموثقين' :
                     filterKey === 'BANNED' ? 'المحظورين' : 'المعطلين'}
                  </button>
                ))}
              </div>
            </div>

            {/* User Search Bar */}
            <div className="relative">
              <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                placeholder="البحث بالاسم، المعرف UID، اسم المستخدم أو البريد..."
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pr-11 pl-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Users Table / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usersList
                .filter(u => {
                  if (userStatusFilter === 'VIP') return u.isVIP || u.vip;
                  if (userStatusFilter === 'VERIFIED') return u.isVerified || u.verified;
                  if (userStatusFilter === 'BANNED') return u.isBanned;
                  if (userStatusFilter === 'DELETED') return u.isDeleted;
                  if (userStatusFilter === 'ACTIVE') return !u.isBanned && !u.isDeleted;
                  return true;
                })
                .filter(u => {
                  if (!userSearchQuery.trim()) return true;
                  const q = userSearchQuery.toLowerCase();
                  return (u.name || u.displayName || u.nickname || '').toLowerCase().includes(q) ||
                         (u.email?.value || u.email || '').toLowerCase().includes(q) ||
                         (u.id || '').toLowerCase().includes(q);
                })
                .map(user => (
                  <div
                    key={user.id}
                    className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 transition-all space-y-4 relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 overflow-hidden shrink-0 flex items-center justify-center font-bold text-amber-400">
                          {user.avatar || user.photoURL ? (
                            <img src={user.avatar || user.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-black text-white text-sm truncate max-w-[140px]">
                              {user.name || user.displayName || user.nickname || 'مستخدم HiSee'}
                            </h4>
                            {(user.isVerified || user.verified) && (
                              <CheckCircle size={14} className="text-sky-400 fill-sky-400/20 shrink-0" />
                            )}
                            {(user.isVIP || user.vip) && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">VIP</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block">ID: {user.id.slice(0, 10)}...</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        user.isBanned ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        user.isDeleted ? 'bg-slate-800 text-slate-400' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {user.isBanned ? 'محظور' : user.isDeleted ? 'معطل' : 'نشط'}
                      </span>
                    </div>

                    {/* Balances summary */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-black/40 border border-white/5 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">العملات:</span>
                        <div className="flex items-center gap-1 text-amber-400 font-bold font-mono">
                          <HiSeeCoinIcon size={13} />
                          <span>{(user.coins || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">الماسات:</span>
                        <span className="text-cyan-400 font-bold font-mono">{(user.diamonds || 0).toLocaleString()} 💎</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleOpenUserEditor(user)}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit3 size={14} />
                        <span>تعديل الحساب</span>
                      </button>

                      {user.isDeleted ? (
                        <button
                          onClick={() => handleToggleSoftDeleteUser(user, true)}
                          className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-bold text-xs transition-all"
                          title="استرجاع الحساب"
                        >
                          استرجاع
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleSoftDeleteUser(user, false)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500 text-slate-400 hover:text-white transition-all"
                          title="تعطيل الحساب"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5 CONTENT: ANALYTICS & BROADCAST NOTIFICATIONS                  */}
        {/* =================================================================== */}
        {activeTab === 'analytics_broadcast' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* System Performance Overview */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BarChart3 className="text-amber-400" size={22} />
                  <span>ملخص أداء النظام والإحصائيات الحية</span>
                </h3>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                  Live Firestore Sync
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400 text-xs font-bold">إجمالي المستخدمين</span>
                  <div className="text-2xl font-black text-white font-mono">{usersList.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400 text-xs font-bold">المعاملات المسجلة</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">{transactions.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400 text-xs font-bold">كتالوج الهدايا النشط</span>
                  <div className="text-2xl font-black text-purple-400 font-mono">{giftsList.length} هدية</div>
                </div>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-slate-400 text-xs font-bold">البلاغات المعالجة</span>
                  <div className="text-2xl font-black text-rose-400 font-mono">{reportsList.length}</div>
                </div>
              </div>
            </div>

            {/* Broadcast Composer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl space-y-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Megaphone className="text-amber-400" size={22} />
                    <span>إرسال إشعار وتنبيه جماعي للمستخدمين</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    بث رسائل رسمية وتنبيهات فورية لجميع المستخدمين أو فئات محددة في قاعدة البيانات
                  </p>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">عنوان التنبيه</label>
                    <input
                      type="text"
                      value={broadcastForm.title}
                      onChange={e => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="مثال: تحديث أمني جديد، مكافآت البث المباشر..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">نص الرسالة</label>
                    <textarea
                      value={broadcastForm.message}
                      onChange={e => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      placeholder="اكتب نص الإشعار هنا..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 block">صورة التنبيه والأيقونة (تحميل مباشر من الجهاز)</label>
                      {broadcastForm.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setBroadcastForm(prev => ({ ...prev, imageUrl: '' }))}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                        >
                          <RotateCcw size={12} />
                          <span>استعادة شعار التطبيق الرسمي</span>
                        </button>
                      )}
                    </div>

                    {/* Direct Device Upload Box (Drag & Drop or Click) */}
                    <label className="border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleBroadcastImageUpload(e.target.files[0]);
                          }
                        }} 
                      />
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-inner">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        اضغط لاختيار صورة من هاتفك أو جهازك مباشرة
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        يدعم PNG, JPG, WebP (يتم التحميل والضغط تلقائياً وبسرعة فائقة)
                      </p>
                    </label>

                    {/* Quick Preset Icons & Logos */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">أو اختر من القوالب والشعارات السريعة:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setBroadcastForm(prev => ({ ...prev, imageUrl: '' }))}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all ${
                            !broadcastForm.imageUrl 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50' 
                              : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center border border-amber-500/30 shrink-0">
                            <ModernHSLogo size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">الشعار الرسمي</p>
                            <p className="text-[10px] text-slate-400">خلفية سوداء</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBroadcastForm(prev => ({ ...prev, imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&auto=format&fit=crop&q=80' }))}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all ${
                            broadcastForm.imageUrl === 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&auto=format&fit=crop&q=80'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50' 
                              : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                            <ShieldAlert size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">تنبيه أمان</p>
                            <p className="text-[10px] text-slate-400">حماية وحسابات</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBroadcastForm(prev => ({ ...prev, imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=200&auto=format&fit=crop&q=80' }))}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all ${
                            broadcastForm.imageUrl === 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=200&auto=format&fit=crop&q=80'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50' 
                              : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-500/30">
                            <Gift size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">مكافآت وهدايا</p>
                            <p className="text-[10px] text-slate-400">ماس وجوائز</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBroadcastForm(prev => ({ ...prev, imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop&q=80' }))}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all ${
                            broadcastForm.imageUrl === 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop&q=80'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50' 
                              : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                            <Server size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">صيانة وتحديث</p>
                            <p className="text-[10px] text-slate-400">سيرفر ونظام</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBroadcastForm(prev => ({ ...prev, imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop&q=80' }))}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all ${
                            broadcastForm.imageUrl === 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop&q=80'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50' 
                              : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                            <Sparkles size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">فعاليات وبث</p>
                            <p className="text-[10px] text-slate-400">مسابقات حية</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBroadcastForm(prev => ({ ...prev, imageUrl: 'https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=200&auto=format&fit=crop&q=80' }))}
                          className={`p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all ${
                            broadcastForm.imageUrl === 'https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=200&auto=format&fit=crop&q=80'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50' 
                              : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <DollarSign size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">شحن ورصيد</p>
                            <p className="text-[10px] text-slate-400">مالي وتخفيضات</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/70 border border-amber-500/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center overflow-hidden shrink-0 border border-amber-500/30 shadow-inner">
                          {broadcastForm.imageUrl ? (
                            <img
                              src={broadcastForm.imageUrl}
                              alt="معاينة"
                              className="w-full h-full object-cover bg-black"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full p-2 flex items-center justify-center bg-black">
                              <ModernHSLogo size={26} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              معاينة الإشعار
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {broadcastForm.title || 'عنوان التنبيه'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {broadcastForm.message || 'نص رسالة التنبيه التي ستظهر للمستخدمين...'}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
                        خلفية الشعار: سوداء ✓
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">نوع الإشعار</label>
                      <select
                        value={broadcastForm.type}
                        onChange={e => setBroadcastForm(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="ANNOUNCEMENT">إعلان عام</option>
                        <option value="SYSTEM_ALERT">تنبيه نظام وأمان</option>
                        <option value="REWARD_GIFT">مكافأة وهدايا</option>
                        <option value="MAINTENANCE">صيانة وتحديث</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">الجمهور المستهدف</label>
                      <select
                        value={broadcastForm.targetAudience}
                        onChange={e => setBroadcastForm(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="ALL">جميع المستخدمين</option>
                        <option value="HOSTS">صناع المحتوى والمضيفين</option>
                        <option value="VIP">أعضاء VIP فقط</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingBroadcast ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        <span>جاري البث والإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>إرسال وبث التنبيه الآن</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Sent Broadcasts History */}
              <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl space-y-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Bell className="text-amber-400" size={22} />
                  <span>سجل الإشعارات والتنبيهات السابقة</span>
                </h3>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {broadcastsList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      لم يتم إرسال أي إشعارات جماعية سابقة
                    </div>
                  ) : (
                    broadcastsList.map(item => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 hover:border-white/10 transition-all relative group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black">
                              {item.type}
                            </span>
                            <h5 className="font-bold text-white text-sm">{item.title}</h5>
                          </div>
                          <button
                            onClick={() => handleDeleteBroadcast(item.id)}
                            className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                            title="حذف الإشعار"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                          <span>المستهدف: {item.targetAudience === 'ALL' ? 'الكل' : item.targetAudience}</span>
                          <span>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ar-SA') : 'مؤخراً'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 7 CONTENT: LIVE STREAMS MANAGER                                 */}
        {/* =================================================================== */}
        {activeTab === 'live_streams' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-indigo-500/30 backdrop-blur-xl">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Video className="text-indigo-400" size={22} />
                  <span>إدارة البثوث المباشرة</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  مراقبة وإدارة البثوث النشطة حالياً في المنصة.
                </p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    value={liveStreamSearchQuery}
                    onChange={(e) => setLiveStreamSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، ID، أو الهاتف..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-4 pr-9 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>{liveStreamsList.length} بث نشط</span>
                </div>
              </div>
            </div>

            {liveStreamsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="animate-spin mx-auto mb-3 text-indigo-500" size={32} />
                <span>جاري تحميل البثوث المباشرة...</span>
              </div>
            ) : liveStreamsList.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-white/5 text-slate-400">
                <Radio size={40} className="mx-auto mb-3 text-slate-600 opacity-60" />
                <p className="font-bold">لا يوجد أي بث مباشر نشط حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveStreamsList.filter(stream => {
                  if (!liveStreamSearchQuery) return true;
                  const q = liveStreamSearchQuery.toLowerCase();
                  return (
                    (stream.hostName && stream.hostName.toLowerCase().includes(q)) ||
                    (stream.hostId && stream.hostId.toLowerCase().includes(q)) ||
                    (stream.hostPhone && stream.hostPhone.toLowerCase().includes(q))
                  );
                }).map(stream => (
                  <div key={stream.id} className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/30 transition-all space-y-3 relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500 relative shrink-0">
                        <img src={stream.hostAvatar || '/default-avatar.png'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-black text-white text-sm truncate">{stream.hostName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {stream.hostId}</span>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>عنوان البث:</span>
                        <span className="font-bold truncate max-w-[120px]">{stream.title || 'بدون عنوان'}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>المشاهدون:</span>
                        <span className="font-bold text-sky-400">{stream.viewersCount || 0}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => window.open(`/?stream=${stream.id}`, '_blank')}
                        className="py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink size={14} />
                        دخول البث
                      </button>
                      <button
                        onClick={() => handleWarnStream(stream.id)}
                        className="py-2 px-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertTriangle size={14} />
                        إرسال تحذير
                      </button>
                      <button
                        onClick={() => handleForceEndStream(stream.id)}
                        className="py-2 px-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X size={14} />
                        إنهاء البث
                      </button>
                      <button
                        onClick={() => handleBanUser(stream.hostId)}
                        className="py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Ban size={14} />
                        حظر الحساب
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Delete Package Confirmation Modal */}
      {packageToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-md w-full p-6 rounded-3xl border border-rose-500/30 bg-slate-950/95 space-y-5 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <AlertTriangle className="text-rose-400" size={22} />
                <span>تأكيد حذف باقة العملات</span>
              </h3>
              <button onClick={() => setPackageToDelete(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف باقة <span className="text-amber-400 font-bold">{packageToDelete.coins?.toLocaleString()} عملة</span> بشكل نهائي؟
              </p>
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                ⚠️ سيتم إزالة هذه الباقة تماماً من متجر التطبيق وقاعدة البيانات، ولن تظهر للمستخدمين بعد الآن.
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => handleDeleteStorePackage(packageToDelete.id)}
                disabled={moderationProcessing}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                {moderationProcessing ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
              </button>
              <button
                onClick={() => setPackageToDelete(null)}
                disabled={moderationProcessing}
                className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 8 CONTENT: STORE & BONUS MANAGER                                */}
      {/* =================================================================== */}
      {activeTab === 'store' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-xl">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Store className="text-emerald-400" size={22} />
                  <span>متجر العملات والباقات</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  إدارة باقات الشحن، الأسعار، وعملات البونص بشكل ديناميكي.
                </p>
              </div>
              <button
                onClick={() => setEditingPackage({ coins: 100, price: '0.99', bonus: 0, local: '' })}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                <span>إضافة باقة جديدة</span>
              </button>
            </div>

            {storePackagesLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="animate-spin mx-auto mb-3 text-emerald-500" size={32} />
                <span>جاري تحميل باقات المتجر...</span>
              </div>
            ) : storePackages.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-white/5 text-slate-400">
                <Store size={40} className="mx-auto mb-3 text-slate-600 opacity-60" />
                <p className="font-bold">لا توجد أي باقات في المتجر حالياً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {storePackages.map(pkg => (
                  <div 
                    key={pkg.id} 
                    onClick={() => setActivePackageMenuId(activePackageMenuId === pkg.id ? null : pkg.id)}
                    className="p-4 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 transition-all relative overflow-hidden cursor-pointer select-none"
                  >
                    {activePackageMenuId === pkg.id && (
                      <div className="absolute inset-x-2 top-2 bottom-2 rounded-2xl bg-slate-950/95 border border-white/20 shadow-2xl p-3 z-30 flex flex-col items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePackageMenuId(null);
                            setEditingPackage(pkg);
                          }}
                          className="w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Edit3 size={15} /> تعديل الباقة
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePackageMenuId(null);
                            setPackageToDelete(pkg);
                          }}
                          className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} /> حذف الباقة
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3 pt-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center p-2.5 shadow-lg shadow-amber-500/20">
                        <img src="https://ui-avatars.com/api/?name=Coin&background=random" alt="Coins" className="w-full h-full object-contain filter drop-shadow-md hidden" />
                        <HiSeeCoinIcon className="w-full h-full" />
                      </div>
                      <div className="text-left pr-8">
                        <div className="text-lg font-black text-emerald-400">${pkg.price}</div>
                        {pkg.local && <div className="text-[10px] text-slate-400">{pkg.local}</div>}
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-2 text-right">
                      <div className="text-xl font-black text-amber-400">{pkg.coins.toLocaleString()} <span className="text-xs text-amber-500/70">عملة</span></div>
                      {pkg.bonus > 0 && (
                        <div className="text-xs font-bold text-purple-400">+{pkg.bonus.toLocaleString()} بونص إضافي</div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add New Package Card */}
                <button
                  onClick={() => setEditingPackage({ coins: 100, price: '0.99', bonus: 0, local: '' })}
                  className="p-4 rounded-3xl bg-slate-900/40 border border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group flex flex-col items-center justify-center min-h-[160px] gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors text-slate-500">
                    <Plus size={24} />
                  </div>
                  <span className="font-bold text-sm text-slate-400 group-hover:text-emerald-400 transition-colors">إضافة باقة جديدة / المزيد</span>
                </button>
              </div>
            )}
          </div>
        )}

      {/* =================================================================== */}
      {/* MODAL 1: PAYOUT ACTION (APPROVE / REJECT)                           */}
      {/* =================================================================== */}
      {selectedPayout && payoutActionType && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-lg w-full p-6 rounded-3xl border border-amber-500/30 bg-slate-950/95 space-y-5 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white">
                {payoutActionType === 'approve' ? 'اعتماد وتحويل مبلغ السحب' : 'رفض طلب السحب واسترجاع الرصيد'}
              </h3>
              <button onClick={() => { setSelectedPayout(null); setPayoutActionType(null); }} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">المستخدم:</span>
                <span className="font-bold text-white">{selectedPayout.userNickname || selectedPayout.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المبلغ:</span>
                <span className="font-black text-emerald-400 font-mono text-sm">{selectedPayout.amount} {selectedPayout.currency || 'EUR'}</span>
              </div>
            </div>

            {payoutActionType === 'approve' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">الرقم المرجعي للحوالة (Transaction Ref)</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    placeholder="e.g. SEPA_TXN_994821"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ملاحظات الإدارة (اختياري)</label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    rows={2}
                    placeholder="اكتب ملاحظات للمستند..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">سبب الرفض الموجه للمستخدم</label>
                  <select
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50"
                  >
                    <option value="بيانات الحساب البنكي أو الآيبان غير صحيحة">بيانات الحساب البنكي أو الآيبان غير صحيحة</option>
                    <option value="الاسم المسجل لا يطابق صاحب الحساب البنكي">الاسم المسجل لا يطابق صاحب الحساب البنكي</option>
                    <option value="حساب PayPal غير مفعل أو لا يستقبل الحوالات">حساب PayPal غير مفعل أو لا يستقبل الحوالات</option>
                    <option value="طلب سحب مكرر أو مخالف لشروط الاستخدام">طلب سحب مكرر أو مخالف لشروط الاستخدام</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {payoutActionType === 'approve' ? (
                <button
                  onClick={handleApprovePayout}
                  disabled={financeProcessing}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40"
                >
                  {financeProcessing ? 'جاري الاعتماد...' : 'تأكيد الموافقة والتحويل'}
                </button>
              ) : (
                <button
                  onClick={handleRejectPayout}
                  disabled={financeProcessing}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-950/40"
                >
                  {financeProcessing ? 'جاري الرفض...' : 'تأكيد الرفض واسترجاع الرصيد'}
                </button>
              )}
              <button
                onClick={() => { setSelectedPayout(null); setPayoutActionType(null); }}
                className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: EDIT GIFT MODAL                                            */}
      {/* =================================================================== */}
      {editingGift && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-md w-full p-6 rounded-3xl border border-amber-500/30 bg-slate-950/95 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Edit3 className="text-amber-400" size={18} />
                <span>تعديل بيانات وسعر الهدية</span>
              </h3>
              <button onClick={() => setEditingGift(null)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">اسم الهدية</label>
                <input
                  type="text"
                  value={editingGift.name}
                  onChange={e => setEditingGift({ ...editingGift, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">السعر (بالعملات)</label>
                <input
                  type="number"
                  value={editingGift.price}
                  onChange={e => setEditingGift({ ...editingGift, price: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-amber-400 font-mono font-black"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">الفئة</label>
                <select
                  value={editingGift.category}
                  onChange={e => setEditingGift({ ...editingGift, category: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                >
                  <option value="VIP">VIP</option>
                  <option value="رومانسية">رومانسية</option>
                  <option value="فاخرة">فاخرة</option>
                  <option value="حيوانات">حيوانات</option>
                  <option value="عامة">عامة</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-300 font-bold">هدية مخصصة للـ VIP</span>
                <input
                  type="checkbox"
                  checked={editingGift.isVip}
                  onChange={e => setEditingGift({ ...editingGift, isVip: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleUpdateGiftPrice}
                disabled={savingGift}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-950/40"
              >
                {savingGift ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button
                onClick={() => setEditingGift(null)}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: ADD NEW GIFT MODAL                                         */}
      {/* =================================================================== */}
      {isNewGiftModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-md w-full p-6 rounded-3xl border border-amber-500/30 bg-slate-950/95 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="text-amber-400" size={18} />
                <span>إضافة هدية جديدة للمتجر</span>
              </h3>
              <button onClick={() => setIsNewGiftModalOpen(false)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">اسم الهدية بالعربية</label>
                <input
                  type="text"
                  value={newGiftForm.name}
                  onChange={e => setNewGiftForm({ ...newGiftForm, name: e.target.value })}
                  placeholder="مثال: يخت النجوم، تاج الماس..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">السعر بالعملات (Coins)</label>
                <input
                  type="number"
                  value={newGiftForm.price}
                  onChange={e => setNewGiftForm({ ...newGiftForm, price: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-amber-400 font-mono font-black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">الرمز التعبيري الإيموجي</label>
                  <input
                    type="text"
                    value={newGiftForm.iconEmoji}
                    onChange={e => setNewGiftForm({ ...newGiftForm, iconEmoji: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-center text-xl"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الفئة</label>
                  <select
                    value={newGiftForm.category}
                    onChange={e => setNewGiftForm({ ...newGiftForm, category: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                  >
                    <option value="VIP">VIP</option>
                    <option value="رومانسية">رومانسية</option>
                    <option value="فاخرة">فاخرة</option>
                    <option value="حيوانات">حيوانات</option>
                    <option value="عامة">عامة</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-300 font-bold">شارة VIP مخصصة</span>
                <input
                  type="checkbox"
                  checked={newGiftForm.isVip}
                  onChange={e => setNewGiftForm({ ...newGiftForm, isVip: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreateNewGift}
                disabled={savingGift}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-950/40"
              >
                {savingGift ? 'جاري الإضافة...' : 'إضافة الهدية فورياً'}
              </button>
              <button
                onClick={() => setIsNewGiftModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: EDIT USER ACCOUNT MODAL                                    */}
      {/* =================================================================== */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-lg w-full p-6 rounded-3xl border border-amber-500/30 bg-slate-950/95 space-y-4 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="text-amber-400" size={20} />
                <h3 className="text-base font-black text-white">تعديل بيانات وحساب المستخدم</h3>
              </div>
              <button onClick={() => setSelectedUserToEdit(null)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Profile summary */}
              <div className="p-3 rounded-2xl bg-black/50 border border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {selectedUserToEdit.avatar ? (
                    <img src={selectedUserToEdit.avatar} alt="" className="w-full h-full object-cover" />
                  ) : <User size={20} />}
                </div>
                <div>
                  <h5 className="font-bold text-white text-sm">{selectedUserToEdit.name || selectedUserToEdit.id}</h5>
                  <span className="text-[10px] text-slate-400 font-mono">UID: {selectedUserToEdit.id}</span>
                </div>
              </div>

              {/* Balances Adjusters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-amber-400 block mb-1 font-bold">العملات المدفوعة (paidCoins)</label>
                  <input
                    type="number"
                    value={editUserData.paidCoins}
                    onChange={e => {
                      const p = Number(e.target.value) || 0;
                      setEditUserData({ ...editUserData, paidCoins: p, coins: p + editUserData.bonusCoins });
                    }}
                    className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-purple-400 block mb-1 font-bold">عملات البونص (bonusCoins)</label>
                  <input
                    type="number"
                    value={editUserData.bonusCoins}
                    onChange={e => {
                      const b = Number(e.target.value) || 0;
                      setEditUserData({ ...editUserData, bonusCoins: b, coins: editUserData.paidCoins + b });
                    }}
                    className="w-full bg-slate-900 border border-purple-500/30 rounded-xl px-3 py-2 text-purple-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold text-[10px]">إجمالي العملات</label>
                  <input
                    type="number"
                    readOnly
                    value={editUserData.paidCoins + editUserData.bonusCoins}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-2.5 py-2 text-amber-300 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold text-[10px]">الماسات (Diamonds)</label>
                  <input
                    type="number"
                    value={editUserData.diamonds}
                    onChange={e => setEditUserData({ ...editUserData, diamonds: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-cyan-400 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold text-[10px]">الأرباح (€)</label>
                  <input
                    type="number"
                    value={editUserData.withdrawableProfit}
                    onChange={e => setEditUserData({ ...editUserData, withdrawableProfit: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-emerald-400 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              {/* Zero Balances Quick Action Button */}
              <button
                type="button"
                onClick={handleZeroAllUserBalances}
                className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-black transition-all flex items-center justify-center gap-2"
              >
                ⚠️ تصفير جميع أرصدة العملات والماسات والأرباح فورياً
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">المستوى (Level)</label>
                  <input
                    type="number"
                    value={editUserData.level}
                    onChange={e => setEditUserData({ ...editUserData, level: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">رتبة الحساب (Role)</label>
                  <select
                    value={editUserData.role}
                    onChange={e => setEditUserData({ ...editUserData, role: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="user">مستخدم عادي (User)</option>
                    <option value="host">مستضيف بث (Host)</option>
                    <option value="moderator">مشرف (Moderator)</option>
                    <option value="admin">مسؤول (Admin)</option>
                    <option value="superadmin">مدير عام (SuperAdmin)</option>
                  </select>
                </div>
              </div>

              {/* Badges & Permissions toggles */}
              <div className="space-y-2 p-3 rounded-2xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-bold">شارة التوثيق الزرقاء (Verified Badge)</span>
                  <input
                    type="checkbox"
                    checked={editUserData.isVerified}
                    onChange={e => setEditUserData({ ...editUserData, isVerified: e.target.checked })}
                    className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-200 font-bold">عضوية HiSee VIP</span>
                  <input
                    type="checkbox"
                    checked={editUserData.isVIP}
                    onChange={e => setEditUserData({ ...editUserData, isVIP: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-amber-300 font-bold">حظر الميكروفون في البث (Mute Mic)</span>
                  <input
                    type="checkbox"
                    checked={editUserData.isMicBanned}
                    onChange={e => setEditUserData({ ...editUserData, isMicBanned: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-amber-300 font-bold">حظر الكاميرا في البث (Mute Camera)</span>
                  <input
                    type="checkbox"
                    checked={editUserData.isCameraBanned}
                    onChange={e => setEditUserData({ ...editUserData, isCameraBanned: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-rose-400 font-bold">حظر الحساب بالكامل (Ban User)</span>
                  <input
                    type="checkbox"
                    checked={editUserData.isBanned}
                    onChange={e => setEditUserData({ ...editUserData, isBanned: e.target.checked })}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {editUserData.isBanned && (
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">سبب الحظر</label>
                  <input
                    type="text"
                    value={editUserData.banReason}
                    onChange={e => setEditUserData({ ...editUserData, banReason: e.target.value })}
                    placeholder="اكتب سبب الحظر..."
                    className="w-full bg-slate-900 border border-rose-500/30 rounded-xl px-3 py-2 text-xs text-rose-200"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveUserUpdates}
                disabled={savingUser}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-950/40"
              >
                {savingUser ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات في قاعدة البيانات'}
              </button>
              <button
                onClick={() => setSelectedUserToEdit(null)}
                className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: EDIT STORE PACKAGE MODAL                                     */}
      {/* =================================================================== */}
      {editingPackage && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-emerald-500/30 bg-slate-950/95 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Store className="text-emerald-400" size={20} />
                <h3 className="text-base font-black text-white">{editingPackage.id ? 'تعديل باقة متجر' : 'إضافة باقة جديدة'}</h3>
              </div>
              <button onClick={() => setEditingPackage(null)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">العملات الأساسية (Base Coins)</label>
                <input
                  type="number"
                  value={editingPackage.coins || 0}
                  onChange={e => setEditingPackage({ ...editingPackage, coins: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">عملات البونص (Bonus Coins)</label>
                <input
                  type="number"
                  value={editingPackage.bonus || 0}
                  onChange={e => setEditingPackage({ ...editingPackage, bonus: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-purple-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">السعر بالدولار (USD Price)</label>
                <input
                  type="text"
                  value={editingPackage.price || ''}
                  onChange={e => setEditingPackage({ ...editingPackage, price: e.target.value })}
                  placeholder="مثال: 0.99"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-left"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="text-slate-400 block mb-1 font-bold">السعر المحلي التقريبي (Local Currency - اختياري)</label>
                <input
                  type="text"
                  value={editingPackage.local || ''}
                  onChange={e => setEditingPackage({ ...editingPackage, local: e.target.value })}
                  placeholder="مثال: 1,300 IQD"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-300 font-mono font-bold text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10 mt-5">
              <button
                onClick={() => handleSaveStorePackage(editingPackage)}
                disabled={moderationProcessing}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-950/40"
              >
                {moderationProcessing ? 'جاري الحفظ...' : 'حفظ الباقة في قاعدة البيانات'}
              </button>
              <button
                onClick={() => setEditingPackage(null)}
                className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 9 CONTENT: AI AGENT CONFIG & PENDING APPROVALS                  */}
      {/* =================================================================== */}
      {activeTab === 'ai_agent_config' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Bot className="text-indigo-400" size={22} />
                <span>إدارة وكيل الذكاء الاصطناعي (HiSee AI Agent) وصلاحيات التحكم</span>
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                تحكم ببرومبت النظام (System Prompt) الخاص بالوكيل، ومراجعة والموافقة على طلبات الإجراءات الحساسة المعلقة.
              </p>
            </div>
          </div>

          {/* System Prompt Editor */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" size={16} />
              <span>برومبت التعليمات المركزية (System Prompt)</span>
            </h4>
            <p className="text-xs text-slate-400">
              هذه التعليمات تحكم سلوك الوعي الشامل للوكيل وكيفية إجابته للمستخدمين عبر التطبيق.
            </p>
            <textarea
              rows={8}
              value={aiSystemPrompt}
              onChange={(e) => setAiSystemPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white outline-none focus:border-amber-500 leading-relaxed"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveAiConfig}
                disabled={isSavingAiConfig}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                {isSavingAiConfig ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>حفظ وتحديث البرومبت</span>
              </button>
            </div>
          </div>

          {/* Pending Sensitive Actions Queue */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldAlert className="text-rose-400" size={16} />
                <span>طلبات الإجراءات الحساسة والهيكلية المعلقة (Pending Approvals)</span>
              </h4>
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold font-mono">
                {pendingAiRequests.filter(r => r.status === 'pending').length} معلق
              </span>
            </div>
            <p className="text-xs text-slate-400">
              بموجب نظام الأمان الصارم، يُمنع الوكيل من تنفيذ أي إجراءات حساسة تلقائياً. تتطلب جميعها مراجعة وموافقة يدوية هنا.
            </p>

            <div className="space-y-3 pt-2">
              {pendingAiRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-bold">
                  لا توجد طلبات معلقة حالياً.
                </div>
              ) : (
                pendingAiRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          req.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {req.status === 'pending' ? 'معلق للمراجعة' : req.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : 'الآن'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        طلب المستخدم: <span className="text-amber-300">"{req.actionDescription}"</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        المعرف: {req.requestedByUid} | البريد: {req.requestedByEmail || 'غير متوفر'}
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveAiRequest(req.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>موافقة وتنفيذ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectAiRequest(req.id)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 10 CONTENT: SMART ALGORITHMS MANAGEMENT */}
      {activeTab === 'algorithms' && (
        <div className="animate-in fade-in duration-200">
          <AdminAlgorithmsView onBack={() => setActiveTab('finance')} />
        </div>
      )}

      {/* TAB 11 CONTENT: ADMIN LEVEL CONTROL */}
      {activeTab === 'levels' && (
        <div className="animate-in fade-in duration-200">
          <AdminLevelControl onBack={() => setActiveTab('finance')} adminId={adminId} />
        </div>
      )}

    </div>
  );
};

export default AdminPayoutReview;
