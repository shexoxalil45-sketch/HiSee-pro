import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Save, User, FileText, Phone, Calendar, Mail, CheckCircle, ArrowRight, Loader2, ShieldCheck, Plus, Sparkles, LogOut, ArrowLeft } from 'lucide-react';
import { db, auth, storage } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, updateProfile } from 'firebase/auth';
import { WORLD_LANGUAGES_CATALOG } from './SettingsView';
import { t } from '../translations';

interface Props {
  onComplete: () => void;
  lang?: string;
}

const CompleteProfileView: React.FC<Props> = ({ onComplete, lang }) => {
  const activeLang = lang || (typeof window !== 'undefined' ? localStorage.getItem('hisee_language') : null) || 'en';
  const isRtl = activeLang === 'ar' || activeLang === 'ckb';
  const dir = isRtl ? 'rtl' : 'ltr';

  const user = auth.currentUser;

  const [realName, setRealName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Phone Verification States
  const [phoneVerified, setPhoneVerified] = useState(!!user?.phoneNumber);
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const [countrySearch, setCountrySearch] = useState('');
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const countryInputRef = useRef<HTMLDivElement>(null);

  const filteredCountries = useMemo(() => {
    return WORLD_LANGUAGES_CATALOG.filter(c => 
      c.country.toLowerCase().includes(countrySearch.toLowerCase()) || 
      c.dialCode.includes(countrySearch)
    );
  }, [countrySearch]);

  // Handle click outside to close country dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryInputRef.current && !countryInputRef.current.contains(event.target as Node)) {
        setShowCountrySelect(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCountry = useMemo(() => {
    const code = phoneNumber.match(/^\+\d+/)?.[0] || '+964';
    return WORLD_LANGUAGES_CATALOG.find(c => c.dialCode === code) || WORLD_LANGUAGES_CATALOG[0];
  }, [phoneNumber]);

  useEffect(() => {
    // Initialize reCAPTCHA
    if (!(window as any).recaptchaVerifier && recaptchaRef.current) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        }
      });
    }
    return () => {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = undefined;
      }
    };
  }, []);

  const formatPhoneNumber = (phone: string) => {
    let trimmed = phone.trim();
    if (trimmed.startsWith('+')) {
      return '+' + trimmed.replace(/\D/g, '');
    }
    let digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('00')) {
      return '+' + digits.substring(2);
    }
    if (digits.startsWith('0') && digits.length >= 10) {
      digits = digits.substring(1);
    }
    if (!digits.startsWith('964')) {
      digits = '964' + digits;
    }
    return '+' + digits;
  };

  const startPhoneVerification = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      setError(t('profile.invalid_phone_error', 'Please enter a valid phone number', activeLang));
      return;
    }
    
    setVerifyLoading(true);
    setError(null);
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Attempting OTP for:', formattedPhone);

    try {
      // Ensure container is clean
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';

      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          console.warn('Error clearing recaptcha:', e);
        }
      }

      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        }
      });
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
      setConfirmationResult(result);
      setShowVerifyInput(true);
    } catch (err: any) {
      console.error('Verification Error:', err);
      setError(t('profile.phone_auth_unsupported', 'Phone number incorrect format or not allowed.', activeLang));
      
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = undefined;
        } catch (e) {}
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!confirmationResult || verificationCode.length !== 6) return;
    setVerifyLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(verificationCode);
      setPhoneVerified(true);
      setShowVerifyInput(false);
      setVerificationCode('');
    } catch (err: any) {
      console.error('Confirm Code Error:', err);
      setError(t('profile.otp_error', 'Invalid OTP code', activeLang));
    } finally {
      setVerifyLoading(false);
    }
  };

  const calculateAge = (birthDateString: string) => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFieldChange = () => {
    if (saveStatus === 'success') setSaveStatus('idle');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    
    setUploading(true);
    try {
      // Create a unique path for the avatar
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
      
      // Upload the file directly
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const url = await getDownloadURL(storageRef);
      
      // Update state with timestamp to force UI refresh
      const urlWithTimestamp = `${url}?t=${new Date().getTime()}`;
      setPhotoURL(urlWithTimestamp);
      
      console.log('Upload successful, URL set to state:', urlWithTimestamp);
    } catch (err) {
      console.error('Upload error:', err);
      // Fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoURL(event.target?.result as string);
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleFinalSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const birthDate = (day && month && year) ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
    
    if (!realName || !displayName || !birthDate) {
      setError(t('profile.required_fields_error', 'Please fill in all mandatory fields', activeLang));
      return;
    }

    // Age constraint check
    const age = calculateAge(birthDate);
    if (age < 12) {
      setError(t('profile.age_limit_error', 'You must be at least 12 years old to use HiSee.', activeLang));
      return;
    }

    setSaveStatus('loading');
    setError(null);
    try {
      const formattedPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : '';
      
      await updateProfile(currentUser, {
        displayName: displayName,
        photoURL: photoURL
      });

      await setDoc(doc(db, 'users', currentUser.uid), {
        id: currentUser.uid,
        uid: currentUser.uid,
        name: realName,
        displayName: displayName,
        nickname: displayName,
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || formattedPhone,
        phone: currentUser.phoneNumber || formattedPhone,
        birthDate: birthDate,
        bio: bio,
        photoURL: photoURL,
        profileCompleted: true,
        phoneVerified: phoneVerified || !!currentUser.phoneNumber,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSaveStatus('success');
      
      setTimeout(async () => {
        await auth.signOut();
      }, 2000);

    } catch (err) {
      console.error('Error saving profile:', err);
      setError(t('profile.save_error', 'Failed to save data. Please try again.', activeLang));
      setSaveStatus('idle');
    }
  };

  const handleBackToLogin = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Error signing out on back to login:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0c10] text-white overflow-y-auto font-sans" dir={dir}>
      <div className="min-h-full flex flex-col items-center justify-start p-4 py-12 relative">
        
        {/* Back to Login Button */}
        <div className="w-full max-w-md flex justify-start mb-4">
          <button 
            onClick={handleBackToLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-black transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={14} className={isRtl ? 'rotate-180' : ''} />
            <span>{t('profile.back_to_login', 'Back to Login', activeLang)}</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative mb-12">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black mb-2">{t('profile.title', 'Complete Profile', activeLang)}</h2>
            <p className="text-slate-400 text-sm">{t('profile.subtitle', 'Welcome to HiSee! Let\'s complete your profile to get started.', activeLang)}</p>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 bg-zinc-950 rounded-full border-2 border-white/10 flex items-center justify-center relative cursor-pointer group hover:border-emerald-500/50 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {photoURL ? (
                <img key={photoURL} src={photoURL} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Avatar" />
              ) : uploading ? (
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              ) : (
                <div className="flex flex-col items-center gap-2">
                    <Camera size={32} className="text-white/20 group-hover:text-emerald-500 transition-colors" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-emerald-500 p-2 rounded-full shadow-lg border-2 border-zinc-900">
                <Plus size={16} className="text-black" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <span className="text-[10px] font-bold text-slate-500 mt-2">{t('profile.avatar_label', 'Profile Photo', activeLang)}</span>
          </div>

          <div className="space-y-5">
            
            {/* Real Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">{t('profile.real_name', 'Real Name', activeLang)}</label>
              <div className="relative">
                <User className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-500`} size={18} />
                <input 
                  type="text"
                  value={realName}
                  onChange={(e) => { setRealName(e.target.value); onFieldChange(); }}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl py-4 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:border-emerald-500/50 outline-none transition-all`}
                  placeholder=""
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">{t('profile.display_name', 'Nickname', activeLang)}</label>
              <div className="relative">
                <Sparkles className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-500`} size={18} />
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); onFieldChange(); }}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl py-4 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:border-emerald-500/50 outline-none transition-all`}
                  placeholder={t('profile.display_name_placeholder', 'e.g., The Creator', activeLang)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">{t('profile.email', 'Email Address', activeLang)}</label>
              <div className={`relative ${user?.email ? 'opacity-60' : ''}`}>
                <Mail className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-500`} size={18} />
                <input 
                  type="email"
                  value={user?.email || ''}
                  readOnly={!!user?.email}
                  disabled={!!user?.email}
                  placeholder="name@example.com"
                  className={`w-full border rounded-2xl py-4 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm outline-none transition-all ${
                    user?.email 
                      ? 'bg-zinc-950/40 border-emerald-500/20 text-emerald-400 cursor-not-allowed font-semibold' 
                      : 'bg-white/5 border-white/10 focus:border-emerald-500/50'
                  }`}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">{t('profile.phone', 'Phone Number', activeLang)}</label>
              <div className={`relative flex gap-2 ${user?.phoneNumber ? 'opacity-60' : ''}`}>
                <div className="relative flex-1">
                  <Phone className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-500`} size={18} />
                  <div className="flex gap-2" ref={countryInputRef}>
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowCountrySelect(!showCountrySelect)}
                        className="bg-white/5 border border-white/10 rounded-2xl py-4 px-3 text-sm text-white outline-none focus:border-emerald-500/50 min-w-[80px] flex items-center justify-between gap-1"
                      >
                        {selectedCountry.flag} {selectedCountry.dialCode}
                      </button>
                      {showCountrySelect && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
                          <input 
                            type="text"
                            placeholder="Search..."
                            className="w-full p-2 mb-2 bg-white/5 rounded-lg text-xs outline-none"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                          />
                          {filteredCountries.map(c => (
                            <div 
                              key={c.dialCode}
                              className="p-2 text-xs text-white hover:bg-white/10 cursor-pointer flex items-center gap-2"
                              onClick={() => {
                                const local = phoneNumber.replace(/^\+\d+/, '');
                                setPhoneNumber(c.dialCode + local);
                                setShowCountrySelect(false);
                                setCountrySearch('');
                              }}
                            >
                              <span>{c.flag}</span>
                              <span className="flex-1">{c.country.split('/')[0]}</span>
                              <span className="text-emerald-500">{c.dialCode}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input 
                      type="tel"
                      value={phoneNumber.split(selectedCountry.dialCode)[1] || ''}
                      readOnly={!!user?.phoneNumber}
                      disabled={!!user?.phoneNumber}
                      onChange={(e) => { 
                        const val = e.target.value.replace(/\D/g, '');
                        setPhoneNumber(selectedCountry.dialCode + val); 
                        onFieldChange(); 
                        if(phoneVerified) setPhoneVerified(false); 
                      }}
                      placeholder="7XX XXX XXXX"
                      className={`w-full border rounded-2xl py-4 ${isRtl ? 'pr-4 pl-4' : 'pl-4 pr-4'} text-sm outline-none transition-all ${
                        user?.phoneNumber 
                          ? 'bg-zinc-950/40 border-emerald-500/20 text-emerald-400 cursor-not-allowed font-semibold' 
                          : 'bg-white/5 border-white/10 focus:border-emerald-500/50'
                      }`}
                    />
                  </div>
                  {phoneNumber && !phoneVerified && !showVerifyInput && !user?.phoneNumber && (
                    <button
                      type="button"
                      onClick={startPhoneVerification}
                      disabled={verifyLoading}
                      className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer`}
                    >
                      {verifyLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      {t('profile.verify', 'Verify', activeLang)}
                    </button>
                  )}
                  {phoneVerified && (
                    <div className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500 flex items-center gap-1`}>
                      <CheckCircle size={16} />
                      <span className="text-[10px] font-bold uppercase">{t('profile.verified', 'Verified', activeLang)}</span>
                    </div>
                  )}
                </div>
              </div>

              {showVerifyInput && (
                <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setVerificationCode(val);
                        if (val.length === 6) confirmCode();
                      }}
                      className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl py-4 text-center text-lg font-black tracking-[0.5em] text-emerald-500 outline-none focus:border-emerald-500 shadow-inner"
                      placeholder={t('profile.otp_placeholder', '000000', activeLang)}
                    />
                    {verifyLoading && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Loader2 size={20} className="animate-spin text-emerald-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 text-center font-bold">{t('profile.otp_sent_desc', 'Enter the 6-digit code sent to your phone', activeLang)}</p>
                </div>
              )}
            </div>

            {/* Birth Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">{t('profile.birth_date', 'Birth Date', activeLang)}</label>
              <div className="relative flex gap-2">
                <Calendar className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none`} size={18} />
                <div className={`flex-1 flex gap-2 ${isRtl ? 'pr-10' : 'pl-10'}`}>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={day}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val === '' || (parseInt(val) <= 31)) setDay(val.slice(0, 2));
                      onFieldChange();
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 text-center text-sm focus:border-emerald-500/50 outline-none transition-all"
                    placeholder={t('profile.day', 'Day', activeLang)}
                  />
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={month}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val === '' || (parseInt(val) <= 12)) setMonth(val.slice(0, 2));
                      onFieldChange();
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 text-center text-sm focus:border-emerald-500/50 outline-none transition-all"
                    placeholder={t('profile.month', 'Month', activeLang)}
                  />
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setYear(val.slice(0, 4));
                      onFieldChange();
                    }}
                    className="w-[120px] bg-white/5 border border-white/10 rounded-2xl py-4 text-center text-sm focus:border-emerald-500/50 outline-none transition-all"
                    placeholder={t('profile.year', 'Year', activeLang)}
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">{t('profile.bio', 'About You', activeLang)}</label>
              <textarea 
                value={bio}
                onChange={(e) => { setBio(e.target.value); onFieldChange(); }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm h-24 focus:border-emerald-500/50 outline-none transition-all resize-none"
                placeholder={t('profile.bio_placeholder', 'Write something about yourself...', activeLang)}
              />
            </div>

            {error && <p className="text-rose-500 text-xs text-center font-bold">{error}</p>}

            <button 
              onClick={handleFinalSave}
              disabled={saveStatus === 'loading'}
              className={`w-full py-4 rounded-2xl font-black text-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                saveStatus === 'success' 
                  ? 'bg-green-500 shadow-green-500/20' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
              }`}
            >
              {saveStatus === 'loading' ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('profile.save_loading', 'Saving...', activeLang)}
                </>
              ) : saveStatus === 'success' ? (
                <>
                  {t('profile.save_success', 'Saved Successfully ✅', activeLang)}
                </>
              ) : (
                t('profile.save_btn', 'Save Changes', activeLang)
              )}
            </button>
          </div>
        </div>
        <div id="recaptcha-container" ref={recaptchaRef}></div>
      </div>
    </div>
  );
};

export default CompleteProfileView;
