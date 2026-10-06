
import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Rss, MapPin, Hash, ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { translations, getTranslation } from '../translations';
import { Language, User as UserType } from '../types';
import { auth, db } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

interface Props {
  lang: Language;
  currentUser: UserType;
  onSave: (updatedUser: UserType) => void;
  onClose: () => void;
}

const EditProfileModal: React.FC<Props> = ({ lang, currentUser, onSave, onClose }) => {
  const t = translations[lang] || translations.en || translations.ar;
  const tr = (key: string, fallback?: string) => getTranslation(lang, key, fallback);
  
  const extractValue = (field: any) => typeof field === 'object' ? field?.value : field;
  const extractPrivacy = (field: any) => typeof field === 'object' ? field?.privacy : 'private';

  const [name, setName] = useState(currentUser.name || '');
  const [bio, setBio] = useState(extractValue(currentUser.bio) || '');
  const [bioPrivacy, setBioPrivacy] = useState<'public' | 'friends' | 'private'>(extractPrivacy(currentUser.bio));
  const [website, setWebsite] = useState(extractValue(currentUser.website) || '');
  const [websitePrivacy, setWebsitePrivacy] = useState<'public' | 'friends' | 'private'>(extractPrivacy(currentUser.website));
  const [location, setLocation] = useState(extractValue(currentUser.location) || '');
  const [locationPrivacy, setLocationPrivacy] = useState<'public' | 'friends' | 'private'>(extractPrivacy(currentUser.location));
  const [interests, setInterests] = useState(extractValue(currentUser.interests) || '');
  const [interestsPrivacy, setInterestsPrivacy] = useState<'public' | 'friends' | 'private'>(extractPrivacy(currentUser.interests));
  const [phone, setPhone] = useState(extractValue(currentUser.phone) || '');
  const [phonePrivacy, setPhonePrivacy] = useState<'public' | 'friends' | 'private'>(extractPrivacy(currentUser.phone));
  const [email, setEmail] = useState(extractValue(currentUser.email) || '');
  const [emailPrivacy, setEmailPrivacy] = useState<'public' | 'friends' | 'private'>(extractPrivacy(currentUser.email));
  const [birthDate, setBirthDate] = useState(extractValue(currentUser.birthDate) || '');
  const [birthDatePrivacy, setBirthDatePrivacy] = useState<'public' | 'friends' | 'private'>(extractPrivacy(currentUser.birthDate));
  const [videoPrivacy, setVideoPrivacy] = useState<'public' | 'private' | 'friends'>(currentUser.privacy || 'public');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // Phone Verification States
  const [phoneVerified, setPhoneVerified] = useState(currentUser.phoneVerified || false);
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

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
    if (!phone || phoneVerified) return;
    setVerifyLoading(true);
    setVerifyError(null);
    const formattedPhone = formatPhoneNumber(phone);
    console.log('Attempting OTP for:', formattedPhone);

    try {
      if (!recaptchaRef.current) return;
      
      // Clear previous recaptcha if exists
      const container = recaptchaRef.current;
      if (container) container.innerHTML = '';

      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        }
      });
      
      (window as any).recaptchaVerifier = recaptchaVerifier;
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setShowVerifyInput(true);
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setVerifyError(tr('phoneInvalidAlert', 'Invalid phone number format. Please ensure international format (+964...)'));
      } else if (err.code === 'auth/operation-not-allowed') {
        setVerifyError(tr('phoneAuthDisabledAlert', 'Phone Authentication must be enabled in Firebase console first.'));
      } else if (err.code === 'auth/billing-not-enabled') {
        setVerifyError(tr('phoneAuthBlazeAlert', 'Firebase project must be on Blaze plan for Phone Authentication.'));
      } else {
        setVerifyError(tr('phoneSendFailedAlert', 'Failed to send code. Please check the number.'));
      }
      // Reset recaptcha on error
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
          delete (window as any).recaptchaVerifier;
        } catch (e) {}
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const confirmCode = async (code: string) => {
    if (!confirmationResult || code.length !== 6) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await confirmationResult.confirm(code);
      // Update Firestore immediately for verification status
      await updateDoc(doc(db, 'users', currentUser.id), {
        phoneVerified: true
      });
      setPhoneVerified(true);
      setShowVerifyInput(false);
      setVerificationCode('');
    } catch (err: any) {
      setVerifyError(tr('codeInvalidAlert', 'Invalid code. Please try again.'));
    } finally {
      setVerifyLoading(false);
    }
  };

  useEffect(() => {
    if (verificationCode.length === 6) {
      confirmCode(verificationCode);
    }
  }, [verificationCode]);

  useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        delete (window as any).recaptchaVerifier;
      }
    };
  }, []);

  const hasChanges = 
    name !== (currentUser.name || '') ||
    bio !== (extractValue(currentUser.bio) || '') ||
    bioPrivacy !== extractPrivacy(currentUser.bio) ||
    website !== (extractValue(currentUser.website) || '') ||
    websitePrivacy !== extractPrivacy(currentUser.website) ||
    location !== (extractValue(currentUser.location) || '') ||
    locationPrivacy !== extractPrivacy(currentUser.location) ||
    interests !== (extractValue(currentUser.interests) || '') ||
    interestsPrivacy !== extractPrivacy(currentUser.interests) ||
    phone !== (extractValue(currentUser.phone) || '') ||
    phonePrivacy !== extractPrivacy(currentUser.phone) ||
    email !== (extractValue(currentUser.email) || '') ||
    emailPrivacy !== extractPrivacy(currentUser.email) ||
    birthDate !== (extractValue(currentUser.birthDate) || '') ||
    birthDatePrivacy !== extractPrivacy(currentUser.birthDate) ||
    videoPrivacy !== (currentUser.privacy || 'public') ||
    phoneVerified !== (currentUser.phoneVerified || false);

  const onFieldChange = () => {
    if (saveStatus === 'success') setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !birthDate.trim()) {
      alert(tr('fillRequiredFieldsAlert', 'Please fill in all required fields (Name, Email, Phone, Birth Date)'));
      return;
    }

    setSaveStatus('loading');
    try {
      await onSave({
        ...currentUser,
        name,
        bio: { value: bio, privacy: bioPrivacy as any },
        website: { value: website, privacy: websitePrivacy as any },
        location: { value: location, privacy: locationPrivacy as any },
        interests: { value: interests, privacy: interestsPrivacy as any },
        phone: { value: phone, privacy: phonePrivacy as any },
        email: { value: email, privacy: emailPrivacy as any },
        birthDate: { value: birthDate, privacy: birthDatePrivacy as any },
        privacy: videoPrivacy,
        phoneVerified,
      });
      
      setSaveStatus('success');
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

      // Delay closing to allow user to see success state
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="glass p-8 rounded-[3rem] w-full max-w-md border border-white/10 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={onClose} 
            className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            aria-label={t.onBack}
          >
            <ArrowRight size={24} aria-hidden="true" />
          </button>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex-1">
            {t.editAccount}
          </h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="username-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{t.username}</label>
            <input
              id="username-input"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); onFieldChange(); }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 shadow-inner"
              placeholder={t.username}
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="email-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{tr('emailLabel', 'Email')}</label>
            <div className="flex gap-2">
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); onFieldChange(); }}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 shadow-inner"
                placeholder={tr('emailLabel', 'Email')}
              />
              <select value={emailPrivacy} onChange={(e) => { setEmailPrivacy(e.target.value as any); onFieldChange(); }} className="bg-white/5 border border-white/10 rounded-2xl px-2 text-xs text-slate-300">
                <option value="public">🌍</option>
                <option value="friends">👥</option>
                <option value="private">🔒</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="phone-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{tr('phoneLabel', 'Phone Number')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => { 
                    const newPhone = e.target.value;
                    setPhone(newPhone); 
                    if (newPhone !== (extractValue(currentUser.phone) || '')) {
                      setPhoneVerified(false);
                    }
                    onFieldChange(); 
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pr-6 pl-24 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 shadow-inner"
                  placeholder={tr('phoneLabel', 'Phone Number')}
                />
                {phone && !phoneVerified && !showVerifyInput && (
                  <button
                    onClick={startPhoneVerification}
                    disabled={verifyLoading}
                    className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                  >
                    {verifyLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                    {tr('verifyAction', 'Verify')}
                  </button>
                )}
                {phoneVerified && (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-bold uppercase">{tr('phoneVerifiedBadge', 'Verified')}</span>
                  </div>
                )}
              </div>
              <select value={phonePrivacy} onChange={(e) => { setPhonePrivacy(e.target.value as any); onFieldChange(); }} className="bg-white/5 border border-white/10 rounded-2xl px-2 text-xs text-slate-300">
                <option value="public">🌍</option>
                <option value="friends">👥</option>
                <option value="private">🔒</option>
              </select>
            </div>

            {showVerifyInput && (
              <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-6 py-4 text-center text-lg font-black tracking-[0.5em] text-emerald-500 outline-none focus:border-emerald-500 shadow-inner"
                    placeholder="000000"
                  />
                  {verifyLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 size={20} className="animate-spin text-emerald-500" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 text-center font-bold">
                  {tr('enterVerificationCode6', 'Enter the 6-digit code sent to your phone')}
                </p>
                {verifyError && <p className="text-[10px] text-rose-500 text-center font-bold">{verifyError}</p>}
              </div>
            )}
            <div ref={recaptchaRef} className="min-h-[1px]"></div>
          </div>

          <div className="space-y-3">
            <label htmlFor="birthdate-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{tr('birthDateLabel', 'Birth Date')}</label>
            <div className="flex gap-2">
              <input
                id="birthdate-input"
                type="date"
                value={birthDate}
                onChange={(e) => { setBirthDate(e.target.value); onFieldChange(); }}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 shadow-inner"
              />
              <select value={birthDatePrivacy} onChange={(e) => { setBirthDatePrivacy(e.target.value as any); onFieldChange(); }} className="bg-white/5 border border-white/10 rounded-2xl px-2 text-xs text-slate-300">
                <option value="public">🌍</option>
                <option value="friends">👥</option>
                <option value="private">🔒</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="bio-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{t.userBio}</label>
            <div className="flex gap-2">
              <textarea
                id="bio-input"
                value={bio}
                onChange={(e) => { setBio(e.target.value); onFieldChange(); }}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 text-xs font-medium h-32 resize-none placeholder:text-slate-700 outline-none focus:border-emerald-500/50 shadow-inner leading-relaxed"
                placeholder={t.userBio}
              />
              <select value={bioPrivacy} onChange={(e) => { setBioPrivacy(e.target.value as any); onFieldChange(); }} className="bg-white/5 border border-white/10 rounded-2xl px-2 text-xs text-slate-300 h-10">
                <option value="public">🌍</option>
                <option value="friends">👥</option>
                <option value="private">🔒</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="website-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{t.userWebsite}</label>
            <div className="flex gap-2">
              <input
                id="website-input"
                type="url"
                value={website}
                onChange={(e) => { setWebsite(e.target.value); onFieldChange(); }}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 shadow-inner"
                placeholder="https://yourwebsite.com"
              />
              <select value={websitePrivacy} onChange={(e) => { setWebsitePrivacy(e.target.value as any); onFieldChange(); }} className="bg-white/5 border border-white/10 rounded-2xl px-2 text-xs text-slate-300">
                <option value="public">🌍</option>
                <option value="friends">👥</option>
                <option value="private">🔒</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="location-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{t.userLocation}</label>
            <div className="flex gap-2">
              <input
                id="location-input"
                type="text"
                value={location}
                onChange={(e) => { setLocation(e.target.value); onFieldChange(); }}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-emerald-500/50 shadow-inner"
                placeholder={tr('cityCountryPlaceholder', 'City, Country')}
              />
              <select value={locationPrivacy} onChange={(e) => { setLocationPrivacy(e.target.value as any); onFieldChange(); }} className="bg-white/5 border border-white/10 rounded-2xl px-2 text-xs text-slate-300">
                <option value="public">🌍</option>
                <option value="friends">👥</option>
                <option value="private">🔒</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="interests-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">{t.userInterests}</label>
            <textarea
              id="interests-input"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xs font-medium h-24 resize-none placeholder:text-slate-700 outline-none focus:border-emerald-500/50 shadow-inner leading-relaxed"
              placeholder={tr('interestsPlaceholder', 'e.g. #photography, #gaming, #travel, #tech')}
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2">
              {tr('videoPrivacySetting', 'Video Privacy')}
            </label>
            <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5">
              {[
                { id: 'public', label: tr('publicPrivacy', 'Public') },
                { id: 'friends', label: tr('friendsPrivacy', 'Friends') },
                { id: 'private', label: tr('privatePrivacy', 'Private') }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setVideoPrivacy(filter.id as any)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    videoPrivacy === filter.id 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 font-bold px-2">
              {tr('videoPrivacyHint', '* This setting determines who can see your videos when visiting your profile.')}
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-8 sticky bottom-0 pt-4 bg-slate-950/20 backdrop-blur-md">
          <button 
            onClick={onClose} 
            className="flex-1 py-5 bg-slate-900 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl border border-white/5 hover:bg-slate-800 transition-all"
          >
            {t.cancel}
          </button>
          
          {(hasChanges || saveStatus !== 'idle') && (
            <button 
              onClick={handleSave} 
              disabled={saveStatus === 'loading'}
              className={`flex-[2] py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest ${
                saveStatus === 'success'
                  ? 'bg-green-500 text-white shadow-green-500/20'
                  : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-500'
              }`}
            >
              {saveStatus === 'loading' ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {tr('savingChanges', 'Saving...')}
                </>
              ) : saveStatus === 'success' ? (
                <>
                  {tr('savedSuccess', 'Saved Successfully ✅')}
                </>
              ) : (
                <>
                  <Save size={18} aria-hidden="true" /> {tr('saveChanges', 'Save Changes')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
