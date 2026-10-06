import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, MapPin, Bell, ShieldAlert, Sparkles, X, Check, ArrowRight, Settings, Loader2 } from 'lucide-react';
import { AppSystemPermissions, updateAppPermission, getStoredPermissions } from '../lib/permissionManager';

export interface PermissionPromptEventDetail {
  permission: keyof AppSystemPermissions;
  featureName?: string;
  onGranted?: () => void;
  onNavigateToSettings?: () => void;
}

interface Props {
  onOpenSettings?: () => void;
}

const PERMISSION_CONFIG: Record<keyof AppSystemPermissions, {
  title: string;
  nameAr: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  accentBorder: string;
  defaultDescription: string;
}> = {
  camera: {
    title: 'إذن الكاميرا معطل',
    nameAr: 'الكاميرا',
    icon: <Camera size={32} className="text-pink-400" />,
    color: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-500/10 via-rose-500/5 to-transparent',
    accentBorder: 'border-pink-500/30',
    defaultDescription: 'الكاميرا مطلوبة لالتقاط الصور ومقاطع الفيديو، ومكالمات الفيديو وبث LIVE وقصص HiSee.'
  },
  microphone: {
    title: 'إذن الميكروفون معطل',
    nameAr: 'الميكروفون',
    icon: <Mic size={32} className="text-indigo-400" />,
    color: 'from-indigo-500 to-purple-600',
    bgGradient: 'from-indigo-500/10 via-purple-500/5 to-transparent',
    accentBorder: 'border-indigo-500/30',
    defaultDescription: 'الميكروفون مطلوب لتسجيل الرسائل الصوتية، وإجراء المكالمات، والمشاركة في البث المباشر.'
  },
  location: {
    title: 'إذن الموقع الجغرافي (GPS) معطل',
    nameAr: 'الموقع الجغرافي GPS',
    icon: <MapPin size={32} className="text-emerald-400" />,
    color: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    accentBorder: 'border-emerald-500/30',
    defaultDescription: 'الموقع الجغرافي مطلوب لمشاركة موقعك الحالي في المحادثات وربط حسابات العائلة.'
  },
  notifications: {
    title: 'إذن الإشعارات المباشرة معطل',
    nameAr: 'الإشعارات المباشرة',
    icon: <Bell size={32} className="text-amber-400" />,
    color: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    accentBorder: 'border-amber-500/30',
    defaultDescription: 'الإشعارات مطلوبة لتنبيهك بالرسائل الجديدة والمكالمات الواردة والتفاعلات المباشرة.'
  }
};

export const PermissionRequestModal: React.FC<Props> = ({ onOpenSettings }) => {
  const [activePrompt, setActivePrompt] = useState<PermissionPromptEventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handlePromptEvent = (e: CustomEvent<PermissionPromptEventDetail>) => {
      if (e.detail && e.detail.permission) {
        // Check if permission is already enabled
        const perms = getStoredPermissions();
        if (perms[e.detail.permission]) {
          // Already allowed, trigger callback directly
          e.detail.onGranted?.();
          return;
        }
        setErrorMsg(null);
        setSuccess(false);
        setIsLoading(false);
        setActivePrompt(e.detail);
      }
    };

    window.addEventListener('hisee_show_permission_prompt' as any, handlePromptEvent);
    return () => {
      window.removeEventListener('hisee_show_permission_prompt' as any, handlePromptEvent);
    };
  }, []);

  if (!activePrompt) return null;

  const config = PERMISSION_CONFIG[activePrompt.permission];

  const handleEnableInstant = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await updateAppPermission(activePrompt.permission, true);

      if (result.grantedByBrowser || result.success) {
        setSuccess(true);
        setIsLoading(false);

        // Call success callback after brief animation
        setTimeout(() => {
          const callback = activePrompt.onGranted;
          setActivePrompt(null);
          setSuccess(false);
          if (callback) {
            callback();
          }
        }, 800);
      } else {
        setIsLoading(false);
        setErrorMsg(result.error || 'تعذر الحصول على إذن المتصفح. يرجى السماح بالوصول من شريط العنوان في المتصفح.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'حدث خطأ أثناء تفعيل الإذن.');
    }
  };

  const handleGoToSettings = () => {
    const customNav = activePrompt.onNavigateToSettings;
    setActivePrompt(null);
    window.dispatchEvent(new CustomEvent('hisee_open_settings_permissions'));
    if (customNav) {
      customNav();
    } else if (onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className={`relative w-full max-w-md bg-[#12141a] border ${config.accentBorder} rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden text-center`}
        >
          {/* Top subtle glow */}
          <div className={`absolute top-0 left-0 right-0 h-40 bg-gradient-to-b ${config.bgGradient} pointer-events-none`} />

          {/* Close button */}
          <button
            onClick={() => setActivePrompt(null)}
            className="absolute top-5 left-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          >
            <X size={18} />
          </button>

          {/* Icon with pulsing rings */}
          <div className="relative mx-auto my-3 w-20 h-20 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${config.color} opacity-20 animate-ping`} />
            <div className="relative w-20 h-20 rounded-3xl bg-[#1a1d24] border border-white/10 flex items-center justify-center shadow-xl">
              {config.icon}
            </div>
          </div>

          {/* Title & Badge */}
          <div className="mt-4 mb-2 flex items-center justify-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <ShieldAlert size={12} />
              إذن معطل
            </span>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">{config.title}</h2>

          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto mb-6">
            {activePrompt.featureName ? (
              <span>
                أنت تحاول استخدام <strong className="text-white">"{activePrompt.featureName}"</strong>، ولكن إذن {config.nameAr} مغلق حالياً في إعدادات الأمان والتطبيق.
              </span>
            ) : (
              config.defaultDescription
            )}
          </p>

          {/* Error Message if browser blocked */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-start leading-relaxed flex items-start gap-2"
            >
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={3} className="text-emerald-400" />
              <span>تم تفعيل الإذن بنجاح! جاري المتابعة...</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Instant Enable Button */}
            <button
              onClick={handleEnableInstant}
              disabled={isLoading || success}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all bg-gradient-to-r ${config.color} hover:brightness-110 active:scale-98 disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>جاري طلب الإذن وتفعيله...</span>
                </>
              ) : success ? (
                <>
                  <Check size={18} strokeWidth={3} />
                  <span>تم التفعيل بنجاح!</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>تفعيل إذن {config.nameAr} الآن</span>
                </>
              )}
            </button>

            {/* Go to Settings Button */}
            <button
              onClick={handleGoToSettings}
              disabled={isLoading || success}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-2 transition-all hover:text-white"
            >
              <Settings size={15} />
              <span>فتح شاشة إعدادات الأمان والأذونات</span>
            </button>

            {/* Cancel Button */}
            <button
              onClick={() => setActivePrompt(null)}
              disabled={isLoading}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
            >
              إلغاء
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
