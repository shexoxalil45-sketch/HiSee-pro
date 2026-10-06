import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Shield, Star, Award, Plus, Minus, RefreshCw, Send, 
  CheckCircle2, AlertTriangle, AlertCircle, Clock, History, FileText, 
  ChevronRight, ChevronLeft, Copy, Check, Sparkles, Filter, Lock, 
  Coins, DollarSign, UserCheck, ArrowUpRight, ArrowDownRight, Eye,
  Sliders, User, X
} from 'lucide-react';
import { 
  collection, doc, getDocs, updateDoc, addDoc, 
  serverTimestamp, onSnapshot, query, limit, orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AvatarLevelBadge } from './AvatarLevelBadge';
import { normalizeMediaUrl } from '../src/lib/mediaUtils';
import { LEVEL_THRESHOLDS, calculateLevelAndBadge, addStarsAndCheckLevelUp, UserProfile } from '../services/starsEngine';

interface AdminLevelControlProps {
  onBack?: () => void;
  adminId?: string;
}

interface LevelAuditLog {
  id: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
  adminId: string;
  deltaStars: number;
  oldLevel: number;
  newLevel: number;
  oldXP: number;
  newXP: number;
  reason: string;
  createdAt: any;
}

const PRESET_REASONS = [
  'مكافأة نشاط وتفاعل مجتمعي مميز ⭐',
  'ترقية تشجيعية من الإدارة العليا 🎖️',
  'مكافأة الفوز في مسابقات وفعاليات HiSee 🏆',
  'تسوية وتصحيح نقاط الحساب يدوياً ⚖️',
  'تعويض فني عن خطأ في مزامنة النقاط 🛠️',
  'تنزيل المستوى بسبب مخالفة معايير المجتمع ⚠️',
  'تصفير نقاط تجريبية للاختبار 🔄'
];

export const AdminLevelControl: React.FC<AdminLevelControlProps> = ({ 
  onBack, 
  adminId = auth.currentUser?.uid || 'admin' 
}) => {
  // State for Users List & Search
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'zero' | 'active' | 'elite'>('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Unit Operation State
  const [operationMode, setOperationMode] = useState<'add' | 'deduct' | 'direct_level'>('add');
  const [amountInput, setAmountInput] = useState<number>(100);
  const [directTargetLevel, setDirectTargetLevel] = useState<number>(1);
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [lastSuccessInfo, setLastSuccessInfo] = useState<{ delta: number; oldLevel: number; newLevel: number; time: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<LevelAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [activeTab, setActiveTab] = useState<'control' | 'history'>('control');

  // Load Users from Firestore (Live onSnapshot)
  useEffect(() => {
    setLoadingUsers(true);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(150));

    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const emailStr = typeof data.email === 'string' ? data.email : (data.email?.value || '');
        const emailPrefix = emailStr ? emailStr.split('@')[0] : '';
        const name = data.nickname || data.displayName || data.name || emailPrefix || docSnap.id;
        const avatar = normalizeMediaUrl(data.photoURL || data.profileImage || data.avatarUrl || data.avatar) || 
                       `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailStr || docSnap.id}`;

        const stars = Number(data.starsCount !== undefined ? data.starsCount : (data.freeStars || data.supporterXP || data.xp || 0));
        const { level: lvl, badge: uBadge } = calculateLevelAndBadge(stars);

        users.push({
          id: docSnap.id,
          ...data,
          displayName: name,
          avatarUrl: avatar,
          starsCount: stars,
          supporterXP: stars,
          xp: stars,
          level: lvl,
          badge: uBadge,
          freeStars: Number(data.freeStars || 0),
          totalReceivedStars: Number(data.totalReceivedStars !== undefined ? data.totalReceivedStars : (data.totalStars || 0)),
          totalSentStars: Number(data.totalSentStars !== undefined ? data.totalSentStars : (data.starsSent || 0)),
          withdrawableProfit: Number(data.withdrawableProfit || 0),
          diamonds: Number(data.diamonds || 0),
          realEarningsUSD: Number(data.realEarningsUSD || 0)
        });
      });

      setUsersList(users);
      setLoadingUsers(false);

      // Keep selected user in sync if already selected
      if (selectedUser) {
        const updated = users.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    }, (error) => {
      console.warn("Could not listen to users collection:", error);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [selectedUser?.id]);

  // Load Audit Logs (Live onSnapshot)
  useEffect(() => {
    setLoadingLogs(true);
    const logsRef = collection(db, 'admin_level_logs');
    const q = query(logsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: LevelAuditLog[] = [];
      snapshot.forEach((d) => {
        logs.push({
          id: d.id,
          ...d.data()
        } as LevelAuditLog);
      });
      setAuditLogs(logs);
      setLoadingLogs(false);
    }, (err) => {
      console.warn("Could not fetch audit logs:", err);
      // Fallback from localStorage
      try {
        const stored = localStorage.getItem('hisee_admin_level_logs');
        if (stored) setAuditLogs(JSON.parse(stored));
      } catch (e) {
        // ignore
      }
      setLoadingLogs(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return usersList.filter(user => {
      const matchesSearch = !q || 
        user.id.toLowerCase().includes(q) ||
        (user.displayName && user.displayName.toLowerCase().includes(q)) ||
        (user.username && user.username.toLowerCase().includes(q)) ||
        (user.nickname && user.nickname.toLowerCase().includes(q)) ||
        (user.email && typeof user.email === 'string' && user.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterLevel === 'zero') return (user.level || 0) === 0;
      if (filterLevel === 'active') return (user.level || 0) >= 1 && (user.level || 0) < 5;
      if (filterLevel === 'elite') return (user.level || 0) >= 5;

      return true;
    });
  }, [usersList, searchQuery, filterLevel]);

  // Compute Delta, New XP, and New Level based on operation using starsEngine thresholds
  const { deltaXP, newXP, newLevel } = useMemo(() => {
    if (!selectedUser) return { deltaXP: 0, newXP: 0, newLevel: 0 };

    const currentStars = Number(selectedUser.starsCount !== undefined ? selectedUser.starsCount : (selectedUser.supporterXP || 0));

    if (operationMode === 'direct_level') {
      const targetThreshold = LEVEL_THRESHOLDS.find(t => t.level === directTargetLevel) || LEVEL_THRESHOLDS[0];
      const targetStars = targetThreshold.requiredStars;
      const delta = targetStars - currentStars;
      return {
        deltaXP: delta,
        newXP: targetStars,
        newLevel: directTargetLevel
      };
    }

    if (operationMode === 'add') {
      const delta = Math.max(0, Number(amountInput) || 0);
      const computedStars = currentStars + delta;
      const { level: computedLevel } = calculateLevelAndBadge(computedStars);
      return {
        deltaXP: delta,
        newXP: computedStars,
        newLevel: computedLevel
      };
    }

    // Deduct
    const delta = Math.max(0, Number(amountInput) || 0);
    const computedStars = Math.max(0, currentStars - delta);
    const { level: computedLevel } = calculateLevelAndBadge(computedStars);
    return {
      deltaXP: -delta,
      newXP: computedStars,
      newLevel: computedLevel
    };
  }, [selectedUser, operationMode, amountInput, directTargetLevel]);

  // Copy User ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackToast({ type, message });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Execute Level Adjustment
  const handleApplyAdjustment = async () => {
    if (!selectedUser) {
      showToast('يرجى اختيار مستخدم أولاً من القائمة أو البحث', 'error');
      return;
    }

    const finalReason = customReason.trim() || selectedReason;
    if (!finalReason) {
      showToast('يرجى تحديد أو كتابة سبب الإجراء لتوثيقه في السجلات الإدارية', 'error');
      return;
    }

    if (deltaXP === 0) {
      showToast('لا يوجد تغيير في النقاط أو المستوى لتطبيقه', 'info');
      return;
    }

    setIsProcessing(true);

    try {
      const targetUserRef = doc(db, 'users', selectedUser.id);
      const oldStars = Number(selectedUser.starsCount !== undefined ? selectedUser.starsCount : (selectedUser.supporterXP || 0));
      const oldXP = oldStars;
      const oldLevel = Number(selectedUser.level || 0);
      const currentFreeStars = Number(selectedUser.freeStars || 0);
      const newFreeStars = Math.max(0, currentFreeStars + deltaXP);

      const userProfileForEngine: UserProfile = {
        id: selectedUser.id,
        name: selectedUser.displayName || selectedUser.name || '',
        starsCount: oldStars,
        currentLevel: oldLevel,
        badge: selectedUser.badge || ''
      };

      const result = addStarsAndCheckLevelUp(userProfileForEngine, deltaXP);

      // 1. UPDATE USER: Strict Financial Isolation Guarantee!
      // ONLY modify starsCount, supporterXP, xp, level, badge, freeStars!
      // withdrawableProfit, diamonds, realEarningsUSD are NEVER touched!
      await updateDoc(targetUserRef, {
        starsCount: result.updatedUser.starsCount,
        supporterXP: result.updatedUser.starsCount,
        xp: result.updatedUser.starsCount,
        level: result.updatedUser.currentLevel,
        badge: result.updatedUser.badge,
        freeStars: newFreeStars,
        lastLevelAdjustment: {
          delta: deltaXP,
          oldLevel,
          newLevel: result.updatedUser.currentLevel,
          reason: finalReason,
          adminId: adminId || 'admin',
          timestamp: Date.now()
        }
      });

      // 2. DISPATCH INSTANT SYSTEM NOTIFICATION TO USER
      try {
        const notifRef = collection(db, 'users', selectedUser.id, 'notifications');
        await addDoc(notifRef, {
          type: 'SYSTEM_BROADCAST',
          category: 'SYSTEM',
          isSystem: true,
          title: deltaXP > 0 
            ? '🎉 ترقية مستوى الحساب ونقاط الدعم' 
            : '⚠️ تحديث إداري لمستوى الحساب',
          message: deltaXP > 0
            ? `تهانينا! قامت الإدارة بمنحك ${Math.abs(deltaXP)} نجمة ترقية مجانية. مستواك الجديد: (المستوى ${newLevel} ⭐). السبب: ${finalReason}`
            : `تنبيه: تم تعديل مستوى حسابك إلى (المستوى ${newLevel}) بخصم ${Math.abs(deltaXP)} نجمة. السبب: ${finalReason}`,
          amount: deltaXP,
          newLevel: newLevel,
          reason: finalReason,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          read: false
        });
      } catch (notifErr) {
        console.warn("Could not dispatch user notification:", notifErr);
      }

      // 3. LOG TO TRANSACTIONS COLLECTION (Activity Record)
      try {
        await addDoc(collection(db, 'transactions'), {
          uid: selectedUser.id,
          type: 'admin_level_adjustment',
          amount: deltaXP,
          oldLevel,
          newLevel,
          oldXP,
          newXP,
          reason: finalReason,
          adminId: adminId || 'admin',
          status: 'completed',
          createdAt: serverTimestamp()
        });
      } catch (txErr) {
        console.warn("Could not write transaction log:", txErr);
      }

      // 4. WRITE TO AUDIT LOGS (Admin Audit Log)
      const auditPayload: any = {
        targetUserId: selectedUser.id,
        targetUserName: selectedUser.displayName || selectedUser.name || 'مستخدم',
        targetUserAvatar: selectedUser.avatarUrl || '',
        adminId: adminId || 'admin',
        deltaStars: deltaXP,
        oldLevel,
        newLevel,
        oldXP,
        newXP,
        reason: finalReason,
        createdAt: serverTimestamp()
      };

      try {
        await addDoc(collection(db, 'admin_level_logs'), auditPayload);
      } catch (logErr) {
        console.warn("Could not write to admin_level_logs collection:", logErr);
      }

      // Local fallback for audit log in case firestore offline
      try {
        const localLog: LevelAuditLog = {
          id: 'log_' + Date.now(),
          ...auditPayload,
          createdAt: new Date().toISOString()
        };
        const updatedLogs = [localLog, ...auditLogs].slice(0, 50);
        setAuditLogs(updatedLogs);
        localStorage.setItem('hisee_admin_level_logs', JSON.stringify(updatedLogs));
      } catch (e) {
        // ignore
      }

      // Update local selectedUser state immediately
      setSelectedUser((prev: any) => prev ? ({
        ...prev,
        starsCount: result.updatedUser.starsCount,
        supporterXP: result.updatedUser.starsCount,
        xp: result.updatedUser.starsCount,
        level: result.updatedUser.currentLevel,
        badge: result.updatedUser.badge,
        freeStars: newFreeStars
      }) : null);

      setLastSuccessInfo({
        delta: deltaXP,
        oldLevel,
        newLevel,
        time: new Date().toLocaleTimeString('ar-EG')
      });

      showToast(`تم بنجاح تطبيق الإجراء: ${deltaXP > 0 ? '+' : ''}${deltaXP} نجمة (Lv.${oldLevel} ➡️ Lv.${newLevel}) وإرسال الإشعار وتوثيق الحركة!`, 'success');
      setCustomReason('');
    } catch (err: any) {
      console.error("Error updating user level:", err);
      showToast(`فشل تطبيق التعديل: ${err?.message || 'خطأ غير معروف'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get Rank Title reading dynamically from LEVEL_THRESHOLDS
  const getRankTitle = (lvl: number) => {
    const threshold = LEVEL_THRESHOLDS.find(t => t.level === lvl);
    if (threshold) {
      return `المستوى ${lvl} (${threshold.badge}) - المطلوب: ${threshold.requiredStars} نجمة`;
    }
    return `المستوى ${lvl}`;
  };

  return (
    <div className="space-y-6 pb-20 select-none text-right" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-md z-[500] p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
              feedbackToast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' 
                : feedbackToast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-amber-950/90 border-amber-500/40 text-amber-200'
            }`}
          >
            {feedbackToast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />}
            {feedbackToast.type === 'error' && <AlertCircle size={20} className="text-rose-400 shrink-0" />}
            {feedbackToast.type === 'info' && <AlertTriangle size={20} className="text-amber-400 shrink-0" />}
            <p className="text-xs font-bold leading-relaxed">{feedbackToast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="glass rounded-[2rem] p-6 border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all shrink-0"
                title="رجوع"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <Award size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  لوحة التحكم الإدارية للمستويات والنجوم المجانية
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black tracking-wider">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5 font-medium">
                محرك بحث المستخدمين، تعديل المستويات، ونظام عزل النجوم المجانية التام عن الأرباح المالية
              </p>
            </div>
          </div>

          {/* Sub Navigation: Control Panel vs History Logs */}
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('control')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'control'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders size={14} />
              <span>وحدة التحكم والترقية</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History size={14} />
              <span>سجل الحركات الإدارية</span>
              {auditLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-950 text-amber-400 font-mono font-bold">
                  {auditLogs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Protection Guarantee Tag */}
        <div className="mt-4 pt-4 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-[11px] text-amber-300/90 font-medium">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-emerald-400" />
            <span>نظام عزل مالي صارم: التعديلات تقتصر حصراً على (النقاط، الرتب، الشارات) دون مساس بأرباح السحب</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
            <span>المشرف الحالي:</span>
            <span className="text-amber-400 font-bold">{adminId}</span>
          </div>
        </div>
      </div>

      {activeTab === 'control' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ========================================================================= */}
          {/* SECTION A: ADVANCED USER SEARCH & SELECTION LIST (lg:col-span-5)           */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass rounded-[2rem] p-5 border border-white/10 bg-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search size={18} className="text-amber-400" />
                  <h2 className="text-sm font-black text-white">محرك بحث المستخدمين</h2>
                </div>
                <span className="text-[11px] text-slate-400 font-bold font-mono">
                  {filteredUsers.length} مستخدم
                </span>
              </div>

              {/* Search Input Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بواسطة المعرف ID، الاسم، أو @اسم_المستخدم..."
                  className="w-full bg-black/40 border border-white/15 focus:border-amber-400/80 rounded-2xl py-3 pr-10 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/30 transition-all font-medium"
                />
                <Search size={16} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-3 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/10"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                <button
                  onClick={() => setFilterLevel('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    filterLevel === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({usersList.length})
                </button>
                <button
                  onClick={() => setFilterLevel('zero')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    filterLevel === 'zero'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  🔒 مستوى 0 ({usersList.filter(u => (u.level || 0) === 0).length})
                </button>
                <button
                  onClick={() => setFilterLevel('active')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    filterLevel === 'active'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  ⭐ مستوى 1 - 4 ({usersList.filter(u => (u.level || 0) >= 1 && (u.level || 0) < 5).length})
                </button>
                <button
                  onClick={() => setFilterLevel('elite')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    filterLevel === 'elite'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  👑 رتب التاج 5 - 6 ({usersList.filter(u => (u.level || 0) >= 5).length})
                </button>
              </div>

              {/* Users Scrollable List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {loadingUsers ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-amber-400" />
                    <p className="text-xs font-bold">جاري تحميل قائمة المستخدمين...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                    <AlertCircle size={28} className="text-amber-400/60" />
                    <p className="text-xs font-bold">لم يتم العثور على أي مستخدم مطابق</p>
                    <span className="text-[10px] text-slate-500">جرب البحث بكلمة أخرى أو تفقد المعرف</span>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    const uLevel = Number(u.level || 0);

                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setLastSuccessInfo(null);
                        }}
                        className={`w-full p-3 rounded-2xl text-right transition-all flex items-center justify-between gap-3 border ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-black/20 hover:bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with Badge */}
                          <div className="relative shrink-0">
                            {uLevel > 0 && (
                              <div className="absolute -top-2 -right-1 z-20 pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                                <AvatarLevelBadge level={uLevel} size={20} />
                              </div>
                            )}
                            <img
                              src={u.avatarUrl}
                              alt={u.displayName}
                              className="w-11 h-11 rounded-2xl object-cover border border-white/10 bg-slate-800"
                              onError={(e: any) => {
                                e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`;
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-white truncate max-w-[150px]">
                                {u.displayName}
                              </h4>
                              {u.isAdmin && (
                                <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[8px] font-black">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[150px]">
                              {u.id}
                            </span>
                          </div>
                        </div>

                        {/* Level & XP Info */}
                        <div className="text-left shrink-0">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block ${
                            uLevel >= 5 
                              ? 'bg-amber-400 text-slate-950 font-black' 
                              : uLevel > 0 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            Lv.{uLevel}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                            {u.supporterXP || 0} XP
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION B & C: USER DETAIL CARD & LEVEL ADJUSTMENT UNIT (lg:col-span-7)   */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {selectedUser ? (
              <>
                {/* =================================================================== */}
                {/* SUBSECTION B: COMPLETE USER DETAIL CARD                             */}
                {/* =================================================================== */}
                <div className="glass rounded-[2rem] p-6 border border-amber-500/20 bg-slate-900/80 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-5 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      {/* Avatar with Outer Rank Badge */}
                      <div className="relative">
                        {selectedUser.level > 0 && (
                          <div className="absolute -top-3.5 -right-2 z-30 pointer-events-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                            <AvatarLevelBadge level={selectedUser.level} size={28} />
                          </div>
                        )}
                        <img
                          src={selectedUser.avatarUrl}
                          alt={selectedUser.displayName}
                          className="w-16 h-16 rounded-3xl object-cover border-2 border-amber-400/40 shadow-xl bg-slate-800"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">
                            {selectedUser.displayName}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            selectedUser.level >= 5
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950'
                              : selectedUser.level > 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            Lv.{selectedUser.level}
                          </span>
                        </div>

                        {/* ID with Copy Button */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {selectedUser.id}
                          </span>
                          <button
                            onClick={() => handleCopyId(selectedUser.id)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="نسخ المعرف"
                          >
                            {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>

                        <span className="text-[10px] text-amber-300 font-bold block mt-0.5">
                          {getRankTitle(selectedUser.level)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all shrink-0"
                    >
                      إلغاء التحديد
                    </button>
                  </div>

                  {/* 5 Core Metrics Grid (Prompt Requirement ب) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-5">
                    {/* 1. Current Level */}
                    <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold">المستوى الحالي</span>
                        <Award size={14} className="text-amber-400" />
                      </div>
                      <div className="text-base font-black text-amber-300">
                        Lv.{selectedUser.level}
                      </div>
                      <span className="text-[9px] text-slate-500 block truncate">
                        {selectedUser.level >= 6 ? 'الحد الأقصى للمستويات' : `${100 - (selectedUser.supporterXP % 100)} XP للترقية`}
                      </span>
                    </div>

                    {/* 2. Supporter XP */}
                    <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold">نقاط الترقية XP</span>
                        <Sparkles size={14} className="text-yellow-400" />
                      </div>
                      <div className="text-base font-black text-white font-mono">
                        {selectedUser.supporterXP || 0} XP
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        {(selectedUser.supporterXP || 0) % 100} / 100 XP الحالية
                      </span>
                    </div>

                    {/* 3. Received Stars */}
                    <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold">النجوم المستلمة</span>
                        <Star size={14} className="text-amber-400" />
                      </div>
                      <div className="text-base font-black text-amber-400 font-mono">
                        {(selectedUser.totalReceivedStars || 0).toLocaleString()} ⭐
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        إجمالي الهدايا المتلقاة
                      </span>
                    </div>

                    {/* 4. Sent Stars */}
                    <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold">النجوم المرسلة</span>
                        <Send size={14} className="text-sky-400" />
                      </div>
                      <div className="text-base font-black text-sky-400 font-mono">
                        {(selectedUser.totalSentStars || 0).toLocaleString()} ⭐
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        مساهمات الدعم والإهداء
                      </span>
                    </div>

                    {/* 5. Withdrawable Financial Balance (Strictly Isolated!) */}
                    <div className="col-span-2 sm:col-span-2 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 relative overflow-hidden">
                      <div className="flex items-center justify-between text-emerald-400 mb-1">
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={14} />
                          <span className="text-[10px] font-bold">الرصيد المالي القابل للسحب (محمي ومعزول)</span>
                        </div>
                        <Lock size={12} className="text-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-black text-emerald-300 font-mono">
                          €{(selectedUser.withdrawableProfit || 0).toFixed(2)}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-400/80 font-mono block">
                            {(selectedUser.diamonds || 0).toLocaleString()} ماسة 💎
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-emerald-300/70 block mt-1">
                        🛡️ معزول كلياً: أي تعديل للنجوم المجانية لن يمس هذه القيمة إطلاقاً
                      </span>
                    </div>
                  </div>
                </div>

                {/* =================================================================== */}
                {/* SUBSECTION C: ADD / DEDUCT LEVEL ADJUSTMENT CONTROLLER (Prompt ج، د) */}
                {/* =================================================================== */}
                <div className="glass rounded-[2rem] p-6 border border-white/10 bg-slate-900/90 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders size={18} className="text-amber-400" />
                      <h3 className="text-sm font-black text-white">
                        وحدة إضافة وسحب النجوم المجانية لترقية أو تنزيل المستوى
                      </h3>
                    </div>
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                      تعديل نقاط الترقية XP
                    </span>
                  </div>

                  {/* Operation Mode Tabs: Add (+), Deduct (-), Direct Level Jump */}
                  <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10">
                    <button
                      onClick={() => setOperationMode('add')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        operationMode === 'add'
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Plus size={16} />
                      <span>إضافة نجوم ترقية (+)</span>
                    </button>

                    <button
                      onClick={() => setOperationMode('deduct')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        operationMode === 'deduct'
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Minus size={16} />
                      <span>سحب نجوم تنزيل (-)</span>
                    </button>

                    <button
                      onClick={() => setOperationMode('direct_level')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        operationMode === 'direct_level'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Award size={16} />
                      <span>تعيين مستوى مباشر</span>
                    </button>
                  </div>

                  {/* Operational Controls based on Mode */}
                  {operationMode === 'direct_level' ? (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-300 block">
                        اختر المستوى المطلوب تعيينه للمستخدم فوراً:
                      </label>
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {LEVEL_THRESHOLDS.map((t) => {
                          const lvl = t.level;
                          const isTarget = directTargetLevel === lvl;
                          const isCurrent = selectedUser.level === lvl;

                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setDirectTargetLevel(lvl)}
                              className={`py-3 px-1 rounded-2xl text-center font-black transition-all flex flex-col items-center justify-center gap-1 border ${
                                isTarget
                                  ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                                  : 'bg-black/30 hover:bg-white/5 text-slate-300 border-white/5'
                              }`}
                            >
                              <span className="text-xs leading-none">Lv.{lvl}</span>
                              <span className="text-[8px] opacity-80 leading-none truncate max-w-[55px]">
                                {t.badge}
                              </span>
                              <span className="text-[7px] text-amber-400 block font-mono">
                                {t.requiredStars} ⭐
                              </span>
                              {isCurrent && (
                                <span className="text-[7px] font-black text-amber-300 bg-slate-900/80 px-1 rounded">
                                  الحالي
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">
                          {operationMode === 'add' ? 'حدد عدد النجوم المجانية للإضافة:' : 'حدد عدد النجوم المجانية للسحب:'}
                        </label>
                        <span className="text-[10px] text-slate-400">
                          كل 100 نقطة تمثل مستوى كاملاً
                        </span>
                      </div>

                      {/* Numeric Input */}
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="600"
                          step="10"
                          value={amountInput}
                          onChange={(e) => setAmountInput(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full bg-black/40 border border-white/15 focus:border-amber-400 rounded-2xl py-3 px-4 text-base font-black text-white font-mono focus:outline-none"
                          placeholder="أدخل عدد النجوم..."
                        />
                        <span className="absolute left-4 top-3.5 text-xs text-amber-400 font-bold">
                          ⭐ نجمة / XP
                        </span>
                      </div>

                      {/* Quick Presets Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {operationMode === 'add' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setAmountInput(50)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-xs font-bold border border-white/5 transition-all"
                            >
                              +50 (نصف مستوى)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmountInput(100)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-xs font-bold border border-white/5 transition-all"
                            >
                              +100 (مستوى كامل)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmountInput(200)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-xs font-bold border border-white/5 transition-all"
                            >
                              +200 (مستويين)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmountInput(300)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-xs font-bold border border-white/5 transition-all"
                            >
                              +300 (3 مستويات)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmountInput(600)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all"
                            >
                              +600 (الحد الأقصى Lv.6)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setAmountInput(50)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-bold border border-white/5 transition-all"
                            >
                              -50 (نصف مستوى)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmountInput(100)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-bold border border-white/5 transition-all"
                            >
                              -100 (مستوى كامل)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmountInput(200)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-bold border border-white/5 transition-all"
                            >
                              -200 (مستويين)
                            </button>
                            <button
                              type="button"
                              onClick={() => setAmountInput(selectedUser.supporterXP || 0)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all"
                            >
                              تصفير النقاط إلى 0
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reason for Action (Mandatory Administrative Requirement) */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-amber-400" />
                      <span>سبب الإجراء (ضروري لتوثيقه في سجل الحركات وإشعار المستخدم):</span>
                    </label>

                    {/* Predefined Reasons Dropdown/Chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {PRESET_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setSelectedReason(r);
                            setCustomReason('');
                          }}
                          className={`p-2 rounded-xl text-[11px] text-right font-medium transition-all border ${
                            selectedReason === r && !customReason
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-black/20 hover:bg-white/5 border-white/5 text-slate-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {/* Custom Reason Input */}
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="أو اكتب سبباً مخصصاً للإجراء..."
                      className="w-full bg-black/40 border border-white/15 focus:border-amber-400 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  {/* Real-time Impact Preview Before Execution */}
                  <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>معاينة التأثير قبل الاعتماد:</span>
                      <span className="font-mono">
                        {deltaXP >= 0 ? `+${deltaXP}` : `${deltaXP}`} XP
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {/* Old State */}
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                        <span className="text-[10px] text-slate-400 block mb-0.5">الحالة الحالية</span>
                        <span className="font-black text-white block">Lv.{selectedUser.level}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{selectedUser.supporterXP || 0} XP</span>
                      </div>

                      {/* Direction Arrow */}
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-amber-400 text-lg font-black">➔</span>
                        <span className="text-[9px] text-amber-300/80 font-bold">
                          {deltaXP > 0 ? 'ترقية' : deltaXP < 0 ? 'تنزيل' : 'بدون تغيير'}
                        </span>
                      </div>

                      {/* New State */}
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40">
                        <span className="text-[10px] text-amber-300 block mb-0.5">الحالة الجديدة</span>
                        <span className="font-black text-amber-300 block">Lv.{newLevel}</span>
                        <span className="text-[9px] text-amber-200 font-mono">{newXP} XP</span>
                      </div>
                    </div>

                    {/* Financial Safety Confirmation */}
                    <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <Lock size={12} className="shrink-0" />
                      <span>
                        الرصيد المالي القابل للسحب سيبقى: <strong>€{(selectedUser.withdrawableProfit || 0).toFixed(2)}</strong> دون أي تغيير إطلاقاً.
                      </span>
                    </div>
                    {/* Success Confirmation Banner */}
                    {lastSuccessInfo && (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-emerald-400 shrink-0 animate-bounce" />
                        <div>
                          <p className="text-xs font-black">
                            تم بنجاح تحديث مستوى المستخدم وإرسال إشعار النظام الموثق! ({lastSuccessInfo.time})
                          </p>
                          <p className="text-[10px] text-emerald-300 mt-0.5">
                            التغيير: {lastSuccessInfo.delta > 0 ? `+${lastSuccessInfo.delta}` : lastSuccessInfo.delta} نقطة | المستوى: Lv.{lastSuccessInfo.oldLevel} ➡️ Lv.{lastSuccessInfo.newLevel}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Action Confirmation Button */}
                  <button
                    type="button"
                    onClick={handleApplyAdjustment}
                    disabled={isProcessing || deltaXP === 0}
                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] ${
                      isProcessing || deltaXP === 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                        : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-amber-500/25 border border-amber-300'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin text-slate-950" />
                        <span>جاري تطبيق التعديل وتوثيق السجلات...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>
                          {deltaXP > 0 ? `تأكيد إضافة (+${deltaXP}) نقطة وترقية الحساب` : `تأكيد خصم (${Math.abs(deltaXP)}) نقطة وتنزيل الحساب`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Empty Selection Placeholder */
              <div className="glass rounded-[2rem] p-12 border border-white/10 bg-slate-900/40 text-center flex flex-col items-center justify-center space-y-4 min-h-[450px]">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-lg">
                  <User size={36} />
                </div>
                <div className="max-w-md">
                  <h3 className="text-base font-black text-white">اختر مستخدماً من القائمة لبدء التحكم</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    استخدم محرك البحث في الجانب الأيمن للبحث عن أي مستخدم بواسطة معرفه أو اسمه، لعرض بياناته والبدء في تعديل مستواه ونقاطه المجانية.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SECTION D: ADMINISTRATIVE AUDIT LOGS (سجل الحركات الإدارية)                 */
        /* ========================================================================= */
        <div className="glass rounded-[2rem] p-6 border border-white/10 bg-slate-900/80 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-amber-400" />
              <h3 className="text-sm font-black text-white">
                سجل الحركات والترقيات الإدارية الموثقة
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {auditLogs.length} حركة مسجلة
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
            {loadingLogs ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                <RefreshCw size={24} className="animate-spin text-amber-400" />
                <p className="text-xs font-bold">جاري تحميل سجل الحركات...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                <FileText size={28} className="text-slate-600" />
                <p className="text-xs font-bold">لا توجد حركات إدارية مسجلة بعد</p>
                <span className="text-[10px] text-slate-500">أي تعديل في المستويات سيتم توثيقه هنا تلقائياً</span>
              </div>
            ) : (
              auditLogs.map((log) => {
                const isPositive = log.deltaStars >= 0;
                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {isPositive ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white">
                            {log.targetUserName || log.targetUserId}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            (ID: {log.targetUserId.slice(0, 10)}...)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          السبب: <span className="text-amber-300 font-medium">{log.reason}</span>
                        </p>
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          بواسطة المشرف: {log.adminId}
                        </span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-xs font-black font-mono ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isPositive ? `+${log.deltaStars}` : log.deltaStars} ⭐
                        </span>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          Lv.{log.oldLevel} ➔ Lv.{log.newLevel}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 block font-mono mt-1">
                        {log.createdAt ? (typeof log.createdAt === 'string' ? new Date(log.createdAt).toLocaleString('ar-EG') : 'منذ قليل') : 'الآن'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLevelControl;
