
import React, { useState } from 'react';
import { Camera, Mic, MapPin, Bell, Check, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { updateAppPermission, getStoredPermissions, AppSystemPermissions } from '../lib/permissionManager';

interface Props {
  onComplete: () => void;
}

const PermissionsView: React.FC<Props> = ({ onComplete }) => {
  const [granted, setGranted] = useState<Record<string, boolean>>(() => {
    const stored = getStoredPermissions();
    return {
      camera: stored.camera,
      microphone: stored.microphone,
      location: stored.location,
      notifications: stored.notifications
    };
  });

  const requestPermission = async (type: keyof AppSystemPermissions) => {
    try {
      const res = await updateAppPermission(type, true);
      if (res.grantedByBrowser || res.success) {
        setGranted(prev => ({ ...prev, [type]: true }));
      }
    } catch (e) {
      console.error("تعذر الوصول للصلاحية. يرجى التأكد من إعدادات المتصفح والسماح بالوصول.", e);
    }
  };

  const handleAllowAll = async () => {
    // Attempt to trigger all in sequence
    await requestPermission('camera');
    await requestPermission('microphone');
    await requestPermission('location');
    await requestPermission('notifications');
    setTimeout(onComplete, 1000);
  };

  const allGranted = Object.values(granted).every(Boolean);

  return (
    <div className="h-[100dvh] w-full bg-[#0a0c10] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-md flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/10 mb-4">
            <ShieldCheck size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tight">إعداد التجربة</h1>
          <p className="text-slate-400 text-sm font-medium">للحصول على أفضل تجربة في HiSee Pro، نحتاج إلى الصلاحيات التالية:</p>
        </div>

        <div className="space-y-3">
          {[
            { id: 'camera' as const, icon: <Camera size={20} />, label: 'الكاميرا', desc: 'للبث المباشر والقصص' },
            { id: 'microphone' as const, icon: <Mic size={20} />, label: 'الميكروفون', desc: 'للتواصل الصوتي والدردشة' },
            { id: 'location' as const, icon: <MapPin size={20} />, label: 'الموقع', desc: 'لاكتشاف المبدعين حولك' },
            { id: 'notifications' as const, icon: <Bell size={20} />, label: 'الإشعارات', desc: 'لتبقى على اطلاع دائم' },
          ].map((perm) => (
            <button
              key={perm.id}
              onClick={() => requestPermission(perm.id)}
              disabled={granted[perm.id]}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                granted[perm.id] 
                  ? 'bg-emerald-500/10 border-emerald-500/50' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${granted[perm.id] ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                  {perm.icon}
                </div>
                <div className="text-start">
                  <h3 className={`text-sm font-bold ${granted[perm.id] ? 'text-white' : 'text-slate-300'}`}>{perm.label}</h3>
                  <p className="text-[10px] text-slate-500">{perm.desc}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${granted[perm.id] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                {granted[perm.id] && <Check size={12} className="text-white" strokeWidth={4} />}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={handleAllowAll}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-emerald-900/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {allGranted ? 'متابعة' : 'منح الجميع'} <ArrowRight size={18} />
          </button>
          <button 
            onClick={onComplete}
            className="text-slate-500 text-xs font-bold hover:text-white transition-colors py-2"
          >
            تخطي والدخول للتطبيق
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsView;
