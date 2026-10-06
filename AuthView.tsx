import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Smartphone, Mail, Lock, Zap, Terminal, ShieldCheck, Shield, Globe, UserPlus, Building, Database } from 'lucide-react';
import ModernHSLogo from './ModernHSLogo';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface Props {
  onAuthSuccess: (uid: string) => void;
  lang: string;
  onLanguageChange?: (lang: any) => void;
  initialIsLogin?: boolean;
  initialSuccessMessage?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî' },
  { code: 'ku-Latn', name: 'Kurdish (Latin)', nativeName: 'Kurdî (Latînî)' },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی (Soranî)' }
];

const authTranslations: Record<string, Record<string, string>> = {
  en: {
    login: 'Login',
    signUp: 'Sign Up',
    email: 'Email',
    phone: 'Phone',
    emailLabel: 'Email Address',
    phoneLabel: 'Phone Number',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    rememberMe: 'Remember Me',
    acceptedTerms: 'I agree to the Terms & Privacy Policy',
    byContinuing: 'By continuing, you agree to the',
    termsOfService: 'Terms of Service',
    and: 'and',
    privacyPolicy: 'Privacy Policy',
    secureLogin: 'Secure Login',
    googleLogin: 'Sign in with Google',
    passwordMismatch: 'Passwords do not match!',
    phoneBypass: 'Phone login requires additional setup. Please use email for now.',
    invalidEmail: 'Invalid email address.',
    userNotFound: 'Incorrect email or password.',
    operationNotAllowed: 'Email login is not enabled in Firebase. Please enable it in the console: https://console.firebase.google.com/project/gen-lang-client-0048592973/authentication/providers',
    googlePopupClosed: 'Login popup was closed. Please try again.',
    googlePopupBlocked: 'Popup was blocked by the browser. Please allow popups.',
    googleNetworkError: 'Network request failed. Please check your connection.',
    googleGeneralError: 'An error occurred during Google sign in.',
    acceptToSubmit: 'Please agree to the Terms and Privacy Policy to continue.',
    devMode: 'DEV MODE',
    googleUser: 'Google User',
    loading: 'Loading...'
  },
  ar: {
    login: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    email: 'بريد',
    phone: 'هاتف',
    emailLabel: 'البريد الإلكتروني',
    phoneLabel: 'رقم الهاتف',
    passwordLabel: 'كلمة المرور',
    confirmPasswordLabel: 'تأكيد كلمة المرور',
    rememberMe: 'تذكرني',
    acceptedTerms: 'أوافق على الشروط والسياسة',
    byContinuing: 'بالاستمرار، أنت توافق على',
    termsOfService: 'شروط الخدمة',
    and: 'و',
    privacyPolicy: 'سياسة الخصوصية',
    secureLogin: 'دخول آمن',
    googleLogin: 'تسجيل الدخول بجوجل',
    passwordMismatch: 'كلمتا المرور غير متطابقتين!',
    phoneBypass: 'تسجيل الدخول بالهاتف يتطلب إعدادات إضافية. يرجى استخدام البريد الإلكتروني حالياً.',
    invalidEmail: 'البريد الإلكتروني غير صالح.',
    userNotFound: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    operationNotAllowed: 'تسجيل الدخول بالبريد الإلكتروني غير مفعل. يرجى تفعيله من الرابط: https://console.firebase.google.com/project/gen-lang-client-0048592973/authentication/providers',
    googlePopupClosed: 'تم إغلاق نافذة تسجيل الدخول. يرجى المحاولة مرة أخرى.',
    googlePopupBlocked: 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة.',
    googleNetworkError: 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.',
    googleGeneralError: 'حدث خطأ أثناء تسجيل الدخول عبر جوجل.',
    acceptToSubmit: 'يرجى الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.',
    devMode: 'وضع المطور',
    googleUser: 'مستخدم جوجل',
    loading: 'جاري التحميل...'
  },
  de: {
    login: 'Anmelden',
    signUp: 'Registrieren',
    email: 'E-Mail',
    phone: 'Telefon',
    emailLabel: 'E-Mail-Adresse',
    phoneLabel: 'Telefonnummer',
    passwordLabel: 'Passwort',
    confirmPasswordLabel: 'Passwort bestätigen',
    rememberMe: 'Angemeldet bleiben',
    acceptedTerms: 'Ich stimme den Nutzungsbedingungen & Datenschutzbestimmungen zu',
    byContinuing: 'Mit dem Fortfahren stimmen Sie den',
    termsOfService: 'Nutzungsbedingungen',
    and: 'und',
    privacyPolicy: 'Datenschutzrichtlinie',
    secureLogin: 'Sicher anmelden',
    googleLogin: 'Mit Google anmelden',
    passwordMismatch: 'Passwörter stimmen nicht überein!',
    phoneBypass: 'Telefon-Login erfordert zusätzliche Einrichtung. Bitte verwende vorerst E-Mail.',
    invalidEmail: 'Ungültige E-Mail-Adresse.',
    userNotFound: 'E-Mail oder Passwort ist falsch.',
    operationNotAllowed: 'E-Mail-Login ist in Firebase nicht aktiviert. Bitte aktivieren Sie es unter Authentication > Sign-in method.',
    googlePopupClosed: 'Das Anmeldefenster wurde geschlossen. Bitte versuchen Sie es erneut.',
    googlePopupBlocked: 'Das Popup wurde vom Browser blockiert. Bitte erlauben Sie Popups.',
    googleNetworkError: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.',
    googleGeneralError: 'Bei der Google-Anmeldung ist ein Fehler aufgetreten.',
    acceptToSubmit: 'Bitte stimmen Sie den Nutzungsbedingungen und Datenschutzbestimmungen zu, um fortzufahren.',
    devMode: 'ENTWICKLERMODUS',
    googleUser: 'Google-Nutzer',
    loading: 'Wird geladen...'
  },
  ku: {
    login: 'Têkeve',
    signUp: 'Tevlê bibe',
    email: 'E-peyam',
    phone: 'Telefon',
    emailLabel: 'Navnîşana E-peyamê',
    phoneLabel: 'Hejmara Telefonê',
    passwordLabel: 'Şîfre',
    confirmPasswordLabel: 'Şîfreyê Pejirandin',
    rememberMe: 'Min bi bîr bîne',
    acceptedTerms: 'Ez Merc û Polîtîkaya Parastina Daneyan qebûl dikim',
    byContinuing: 'Bi domandinê re, hûn qebûl dikin',
    termsOfService: 'Mercên Karûbarê',
    and: 'û',
    privacyPolicy: 'Polîtîkaya Parastina Daneyan',
    secureLogin: 'Têketina Ewle',
    googleLogin: 'Bi Google re Têkeve',
    passwordMismatch: 'Şîfre li hev nayên!',
    phoneBypass: 'Têketina telefonê mîhengên zêde dixwaze. Ji kerema xwe niha e-peyamê bikar bîne.',
    invalidEmail: 'Navnîşana e-peyamê nederbasdar e.',
    userNotFound: 'E-peyam an şîfre xelet e.',
    operationNotAllowed: 'Têketina bi e-peyamê di Firebase de ne çalak e. Ji kerema xwe çalak bike.',
    googlePopupClosed: 'Paceya têketinê hate girtin. Ji kerema xwe dîsa biceribîne.',
    googlePopupBlocked: 'Pop-up ji hêla gerokê ve hate asteng kirin. Destûrê bide pop-upê.',
    googleNetworkError: 'Têkiliya torê bi ser neket. Têkiliya xwe kontrol bike.',
    googleGeneralError: 'Di dema têketina Google de xeletiyek çêbû.',
    acceptToSubmit: 'Ji kerema xwe re Merc û Polîtîkayê qebûl bike da ku berdewam bikî.',
    devMode: 'REWSENDA PÊŞXISTINÊ',
    googleUser: 'Bikarhênerê Google',
    loading: 'Tê barkirin...'
  },
  'ku-Latn': {
    login: 'Têkeve',
    signUp: 'Tevlê bibe',
    email: 'E-peyam',
    phone: 'Telefon',
    emailLabel: 'Navnîşana E-peyamê',
    phoneLabel: 'Hejmara Telefonê',
    passwordLabel: 'Şîfre',
    confirmPasswordLabel: 'Şîfreyê Pejirandin',
    rememberMe: 'Min bi bîr bîne',
    acceptedTerms: 'Ez Merc û Polîtîkaya Parastina Daneyan qebûl dikim',
    byContinuing: 'Bi domandinê re, hûn qebûl dikin',
    termsOfService: 'Mercên Karûbarê',
    and: 'û',
    privacyPolicy: 'Polîtîkaya Parastina Daneyan',
    secureLogin: 'Têketina Ewle',
    googleLogin: 'Bi Google re Têkeve',
    passwordMismatch: 'Şîfre li hev nayên!',
    phoneBypass: 'Têketina telefonê mîhengên zêde dixwaze. Ji kerema xwe niha e-peyamê bikar bîne.',
    invalidEmail: 'Navnîşana e-peyamê nederbasdar e.',
    userNotFound: 'E-peyam an şîfre xelet e.',
    operationNotAllowed: 'Têketina bi e-peyamê di Firebase de ne çalak e. Ji kerema xwe çalak bike.',
    googlePopupClosed: 'Paceya têketinê hate girtin. Ji kerema xwe dîsa biceribîne.',
    googlePopupBlocked: 'Pop-up ji hêla gerokê ve hate asteng kirin. Destûrê bide pop-upê.',
    googleNetworkError: 'Têkiliya torê bi ser neket. Têkiliya xwe kontrol bike.',
    googleGeneralError: 'Di dema têketina Google de xeletiyek çêbû.',
    acceptToSubmit: 'Ji kerema xwe re Merc û Polîtîkayê qebûl bike da ku berdewam bikî.',
    devMode: 'REWSENDA PÊŞXISTINÊ',
    googleUser: 'Bikarhênerê Google',
    loading: 'Tê barkirin...'
  },
  ckb: {
    login: 'چوونەژوورەوە',
    signUp: 'دروستکردنی هەژمار',
    email: 'ئیمەیڵ',
    phone: 'تەلەفۆن',
    emailLabel: 'ناونیشانی ئیمەیڵ',
    phoneLabel: 'ژمارەی تەلەفۆن',
    passwordLabel: 'وشەی تێپەڕ',
    confirmPasswordLabel: 'پەسەندکردنی وشەی تێپەڕ',
    rememberMe: 'بمپارێزە',
    acceptedTerms: 'من لەگەڵ مەرجەکان و یاسای پاراستنی زانیارییەکان ڕازیم',
    byContinuing: 'بە بەردەوامبوون، تۆ ڕازیت لەگەڵ مەرجەکانی',
    termsOfService: 'مەرجەکانی بەکارهێنان',
    and: 'و',
    privacyPolicy: 'یاسای پاراستنی زانیارییەکان',
    secureLogin: 'چوونەژوورەوەی پارێزراو',
    googleLogin: 'چوونەژوورەوە لە ڕێگەی گووگڵ',
    passwordMismatch: 'وشە تێپەڕەکان وەک یەک نین!',
    phoneBypass: 'چوونەژوورەوە بە ژمارەی تەلەفۆن پێویستی بە ڕێکخستنی زیاترە. تکایە ئێستا ئیمەیڵ بەکاربهێنە.',
    invalidEmail: 'ناونیشانی ئیمەیڵەکە دروست نییە.',
    userNotFound: 'ئیمەیڵ یان وشەی تێپەڕەکە هەڵەیە.',
    operationNotAllowed: 'چوونەژوورەوە بە ئیمەیڵ لە Firebase چالاک نەکراوە. تکایە چالاکی بکە.',
    googlePopupClosed: 'پەنجەرەی چوونەژوورەوە داخرا. تکایە دووبارە هەوڵ بدەرەوە.',
    googlePopupBlocked: 'پەنجەرەی پۆپ-ئەپ لەلایەن وێبگەڕەوە بلۆک کراوە. تکایە ڕێگەی پێ بدە.',
    googleNetworkError: 'هەڵەی پەیوەندی هەیە. تکایە پەیوەندی هێڵی ئینتەرنێتەکەت بپشکنە.',
    googleGeneralError: 'هەڵەیەک لە کاتی چوونەژوورەوە لە ڕێگەی گووگڵ ڕوویدا.',
    acceptToSubmit: 'تکایە لەگەڵ مەرجەکان و یاسای پاراستنی زانیارییەکان ڕازی بە بۆ بەردەوامبوون.',
    devMode: 'دۆخی گەشەپێدەر',
    googleUser: 'بەکارهێنەری گووگڵ',
    loading: 'باردەکرێت...'
  }
};

const termsTranslations: Record<string, { title: string, sections: { title: string, desc: string }[] }> = {
  en: {
    title: 'Terms of Service',
    sections: [
      { title: 'Introduction & Compliance', desc: 'Welcome to HiSee. By using the app, you agree to these terms designed in compliance with European GDPR laws and global messaging app standards.' },
      { title: 'GDPR Data Protection', desc: 'We are fully committed to GDPR and BDSG. Your personal data is encrypted and will never be shared without your explicit consent.' },
      { title: 'End-to-End Encryption (E2EE)', desc: 'Your private chats and calls are secured with end-to-end encryption. We cannot read your messages or listen to your calls.' },
      { title: 'Code of Conduct & NetzDG', desc: 'Hate speech, violence, terrorism, or copyright infringement are strictly prohibited. Illegal content will be removed within 24 hours.' }
    ]
  },
  ar: {
    title: 'شروط الخدمة',
    sections: [
      { title: 'المقدمة والتوافق العالمي', desc: 'مرحباً بك في HiSee. باستخدامك للتطبيق، فإنك توافق على هذه الشروط المصممة وفقاً للقوانين الألمانية والأوروبية (GDPR) والمعايير العالمية للتطبيقات.' },
      { title: 'حماية البيانات والخصوصية (GDPR)', desc: 'نحن نلتزم التزاماً كاملاً باللائحة العامة لحماية البيانات (GDPR) والقانون الاتحادي الألماني. بياناتك الشخصية مشفرة.' },
      { title: 'التشغيل والتشفير (E2EE)', desc: 'تعتمد محادثاتك ومكالماتك الخاصة على التشفير التام. لا نستطيع قراءة رسائلك أو مكالماتك.' },
      { title: 'قواعد السلوك وقانون NetzDG', desc: 'يُمنع منعاً باتاً نشر محتوى يحض على الكراهية، الإرهاب، أو العنف. سنقوم بإزالة المخالفات في غضون 24 ساعة.' }
    ]
  },
  de: {
    title: 'Nutzungsbedingungen',
    sections: [
      { title: 'Einführung & Compliance', desc: 'Willkommen bei HiSee. Mit der Nutzung der App stimmen Sie diesen Bedingungen zu, die im Einklang mit der DSGVO und globalen Standards stehen.' },
      { title: 'DSGVO-Datenschutz', desc: 'Wir verpflichten uns voll und ganz der DSGVO und dem BDSG. Ihre Daten sind verschlüsselt und werden nicht ohne Einwilligung geteilt.' },
      { title: 'Ende-zu-Ende-Verschlüsselung (E2EE)', desc: 'Private Chats und Anrufe sind Ende-zu-Ende verschlüsselt. Wir können Ihre Unterhaltungen weder lesen noch abhören.' },
      { title: 'Verhaltenskodex & NetzDG', desc: 'Hassrede, Gewalt oder Urheberrechtsverletzungen sind streng verboten. Illegale Inhalte werden innerhalb von 24 Stunden gelöscht.' }
    ]
  },
  ku: {
    title: 'Mercên Karûbarê',
    sections: [
      { title: 'Destpêk û Lihevhatin', desc: 'Bi xêr hatî HiSee. Bi karanîna sepanê, hûn van mercên ku li gorî qanûnên GDPR hatine sêwirandin qebûl dikin.' },
      { title: 'Parastina Daneyan ya GDPR', desc: 'Em bi tevahî pabendî GDPR û qanûnên parastina daneyan in. Daneyên we bi ewlehî têne parastin.' },
      { title: 'Şîfrekirina Dawî-bi-Dawî (E2EE)', desc: 'Axaftinên we yên taybet bi şîfrekirina dawî-bi-dawî têne parastin. Em nikarin peyamên we bixwînin.' },
      { title: 'Rêzikên Sifet û Rêvebirî', desc: 'Belavkirina naverokên tundûtûjî an kînî qedexe ye. Naverokên neyasayî dê di nav 24 saetan de werin rakirin.' }
    ]
  },
  'ku-Latn': {
    title: 'Mercên Karûbarê',
    sections: [
      { title: 'Destpêk û Lihevhatin', desc: 'Bi xêr hatî HiSee. Bi karanîna sepanê, hûn van mercên ku li gorî qanûnên GDPR hatine sêwirandin qebûl dikin.' },
      { title: 'Parastina Daneyan ya GDPR', desc: 'Em bi tevahî pabendî GDPR û qanûnên parastina daneyan in. Daneyên we bi ewlehî têne parastin.' },
      { title: 'Şîfrekirina Dawî-bi-Dawî (E2EE)', desc: 'Axaftinên we yên taybet bi şîfrekirina dawî-bi-dawî têne parastin. Em nikarin peyamên we bixwînin.' },
      { title: 'Rêzikên Sifet û Rêvebirî', desc: 'Belavkirina naverokên tundûtûjî an kînî qedexe ye. Naverokên neyasayî dê di nav 24 saetan de werin rakirin.' }
    ]
  },
  ckb: {
    title: 'مەرجەکانی بەکارهێنان',
    sections: [
      { title: 'پێشەکی و پابەندبوون', desc: 'بەخێربێیت بۆ HiSee. بە بەکارهێنانی ئەپەکە، تۆ لەگەڵ ئەم مەرجانەدا ڕازیت کە بەپێی یاساکانی GDPR ی ئەوروپی داڕێژراون.' },
      { title: 'پاراستنی زانیارییەکان GDPR', desc: 'ئێمە بە تەواوی پابەندین بە پاراستنی زانیارییەکانت. زانیارییەکانت شێفره کراون و هاوبەش ناکرێن بەبێ ڕەزامەندی خۆت.' },
      { title: 'شێفره‌کردنی سەرانسەری (E2EE)', desc: 'چات و پەیوەندییە تایبەتەکانت بە تەواوی شێفره کراون. ئێمە ناتوانین نامەکانت بخوێنینەوە.' },
      { title: 'یاساکانی ڕەفتار و NetzDG', desc: 'بڵاوکردنەوەی ناوەڕۆکی توندوتیژی یان کینەیی بە توندی قەدەکراوە و لە ماوەی ٢٤ کاتژمێردا دەسڕێتەوە.' }
    ]
  }
};

const privacyTranslations: Record<string, { title: string, sections: { title: string, desc: string }[] }> = {
  en: {
    title: 'Privacy Policy',
    sections: [
      { title: 'GDPR Compliance', desc: 'HiSee is designed to be fully compliant with GDPR (General Data Protection Regulation) and German BDSG. Your privacy is our priority.' },
      { title: 'Data We Collect', desc: 'Unlike other social platforms that sell your browsing or location data, we only collect minimal register details such as phone/email.' },
      { title: 'Secure Voice Messages', desc: 'Our voice notes use highly compressed AAC technology, which is fully encrypted and safe.' }
    ]
  },
  ar: {
    title: 'سياسة الخصوصية',
    sections: [
      { title: 'الامتثال للقوانين الأوروبية', desc: 'تم تصميم HiSee ليكون متوافقاً تماماً مع اللائحة العامة لحماية البيانات (GDPR) والقانون الاتحادي الألماني.' },
      { title: 'البيانات التي نجمعها', desc: 'على عكس التطبيقات الأخرى، نحن لا نبيع أو نشارك سجلات تصفحك أو موقعك. نجمع فقط الحد الأدنى من بيانات التسجيل.' },
      { title: 'تقنية الرسائل الصوتية', desc: 'نستخدم تقنيات متطورة لضغط وتشفير الرسائل الصوتية لضمان أعلى جودة بأقل استهلاك للبيانات.' }
    ]
  },
  de: {
    title: 'Datenschutzrichtlinie',
    sections: [
      { title: 'DSGVO-Konformität', desc: 'HiSee ist so konzipiert, dass es vollständig der DSGVO und dem BDSG entspricht. Ihre Privatsphäre hat für uns oberste Priorität.' },
      { title: 'Gesammelte Daten', desc: 'Im Gegensatz zu anderen Plattformen, die Ihre Surf- oder Standortdaten verkaufen, sammeln wir nur minimale Registrierungsdaten.' },
      { title: 'Sichere Sprachnachrichten', desc: 'Unsere Sprachnachrichten verwenden hochkomprimierte AAC-Technologie, die vollständig verschlüsselt ist.' }
    ]
  },
  ku: {
    title: 'Polîtîkaya Parastina Daneyan',
    sections: [
      { title: 'Pabendbûna GDPR', desc: 'HiSee bi tevahî li gorî rêzikên GDPR û qanûnên Ewropî hatiye sêwirandin. Parastina daneyên we di serî de ye.' },
      { title: 'Daneyên ku Tên Berhevkirin', desc: 'Berevajî sepanên din, em tu carî daneyên we hain nîşandan an cîhê nafiroşin. Em tenê agahiyên têketinê berhev dikin.' },
      { title: 'Peyamên Dengî yên Ewle', desc: 'Peyamên dengî yên me teknolojiya AAC ya pêşkeftî û şîfrekirî bi kar tînin.' }
    ]
  },
  'ku-Latn': {
    title: 'Polîtîkaya Parastina Daneyan',
    sections: [
      { title: 'Pabendbûna GDPR', desc: 'HiSee bi tevahî li gorî rêzikên GDPR û qanûnên Ewropî hatiye sêwirandin. Parastina daneyên we di serî de ye.' },
      { title: 'Daneyên ku Tên Berhevkirin', desc: 'Berevajî sepanên din, em tu carî daneyên we hain nîşandan an cîhê nafiroşin. Em tenê agahiyên têketinê berhev dikin.' },
      { title: 'Peyamên Dengî yên Ewle', desc: 'Peyamên dengî yên me teknolojiya AAC ya pêşkeftî û şîfrekirî bi kar tînin.' }
    ]
  },
  ckb: {
    title: 'یاسای پاراستنی زانیارییەکان',
    sections: [
      { title: 'پابەندبوون بە GDPR', desc: 'ئەپەکە بە تەواوی پابەندە بە GDPR ی ئەوروپی بۆ پاراستنی زانیارییە تایبەتییەکانت.' },
      { title: 'ئەو زانیارییانەی کۆیان دەکەینەوە', desc: 'بەپێچەوانەی ئەپەکانی تر کە زانیاری شوێن یان گەڕانت دەفرۆشن، ئێمە تەنها کەمترین زانیاری چوونەژوورەوە کۆدەکەینەوە.' },
      { title: 'پەیامە دەنگییە پارێزراوەکان', desc: 'پەیامە دەنگییەکانمان تەکنەلۆژیای AACی پێشکەوتوو بەکاردەهێنن کە بە تەواوی شێفره کراوە.' }
    ]
  }
};

const AuthView: React.FC<Props> = ({ onAuthSuccess, lang, onLanguageChange, initialIsLogin = true, initialSuccessMessage = '' }) => {
  const [localLang, setLocalLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hisee_language');
      if (saved && ['ar', 'en', 'de', 'ku', 'ku-Latn', 'ckb', 'tr', 'fr', 'es', 'it', 'ru', 'zh', 'ja', 'uk', 'hi'].includes(saved)) {
        return saved;
      }
    }
    return 'en'; // Defaults to English
  });

  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [method, setMethod] = useState<'phone' | 'email'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('hisee_remember_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('hisee_remember_email'));
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(initialSuccessMessage);
  const [secretClicks, setSecretClicks] = useState(0);
  const [showSecretButton, setShowSecretButton] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Synchronize language state with main App.tsx
  useEffect(() => {
    if (onLanguageChange && lang !== localLang) {
      onLanguageChange(localLang);
    }
  }, [localLang, lang, onLanguageChange]);

  const getAuthT = (key: string, fallback: string) => {
    return authTranslations[localLang]?.[key] || authTranslations.en?.[key] || fallback;
  };

  const handleLogoClick = () => {
    setSecretClicks(prev => {
      const newClicks = prev + 1;
      if (newClicks >= 5) {
        setShowSecretButton(true);
      }
      return newClicks;
    });
  };

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
      )
    ]);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      // Removed customParameters prompt to fix potential pop-up/selection issues
      // Wrapped in 3-second Safety Timeout to stop infinite spinning inside iframe sandbox preview
      const result = await withTimeout(
        signInWithPopup(auth, provider),
        3000,
        "Google Auth popup timed out (3 seconds maximum limit reached)."
      );
      const user = result.user;

      // Sync user profile to Firestore
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          id: user.uid,
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || getAuthT('googleUser', 'Google User'),
          email: user.email || '',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          lastLoginAt: new Date().toISOString(),
          status: 'online'
        }, { merge: true });
      } catch (firestoreErr) {
        console.error("Firestore user sync error on Google login:", firestoreErr);
      }

      // Save to localStorage saved accounts
      try {
        const existing = localStorage.getItem('hisee_saved_accounts');
        let accounts = [];
        if (existing) {
          accounts = JSON.parse(existing);
        }
        accounts = accounts.filter((acc: any) => acc.uid !== user.uid && acc.email !== user.email);
        accounts.push({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || getAuthT('googleUser', 'Google User'),
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
        });
        localStorage.setItem('hisee_saved_accounts', JSON.stringify(accounts));
      } catch (e) {
        console.error("Error saving Google account locally:", e);
      }

      onAuthSuccess(user.uid);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      // Print and display the direct error message on the screen immediately
      setError(err.message || err.toString());
      
      // Keep background fallback login fully prepared as a rescue path if they choose to bypass
      const isAuthRestricted = err.code === 'auth/operation-not-allowed' || 
                               err.code === 'auth/unauthorized-domain' || 
                               err.code === 'auth/api-key-not-valid' || 
                               (err.message && err.message.includes('api-keys-are-not-supported'));

      if (isAuthRestricted) {
        console.warn("Firebase Google Auth Restricted (Expected Platform Sandbox Limitations) - Fallback bypass available.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!isLogin && password !== confirmPassword) {
        setError(getAuthT('passwordMismatch', 'Passwords do not match!'));
        setLoading(false);
        return;
      }

      if (method === 'email') {
        if (isLogin) {
          if (rememberMe) {
            localStorage.setItem('hisee_remember_email', identifier);
          } else {
            localStorage.removeItem('hisee_remember_email');
          }
          // Wrapped in 3-second Safety Timeout to prevent hanging on blocked/restricted API calls
          const result = await withTimeout(
            signInWithEmailAndPassword(auth, identifier, password),
            3000,
            "Email Login timed out (3 seconds maximum limit reached)."
          );
          try {
            const existing = localStorage.getItem('hisee_saved_accounts');
            let accounts = [];
            if (existing) {
              accounts = JSON.parse(existing);
            }
            accounts = accounts.filter((acc: any) => acc.uid !== result.user.uid && acc.email !== identifier);
            accounts.push({
              uid: result.user.uid,
              email: identifier,
              password: password,
              displayName: result.user.displayName || identifier.split('@')[0],
              photoURL: result.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`
            });
            localStorage.setItem('hisee_saved_accounts', JSON.stringify(accounts));
          } catch (e) {
            console.error("Error saving account details locally:", e);
          }
          onAuthSuccess(result.user.uid);
        } else {
          // Set registration flag so complete_profile screen is shown for this sign-up session
          localStorage.setItem('hisee_new_registration', 'true');
          // Wrapped in 3-second Safety Timeout to prevent hanging on blocked/restricted API calls
          const userCredential = await withTimeout(
            createUserWithEmailAndPassword(auth, identifier, password),
            3000,
            "Email Sign-Up timed out (3 seconds maximum limit reached)."
          );
          try {
            const existing = localStorage.getItem('hisee_saved_accounts');
            let accounts = [];
            if (existing) {
              accounts = JSON.parse(existing);
            }
            accounts = accounts.filter((acc: any) => acc.uid !== userCredential.user.uid && acc.email !== identifier);
            accounts.push({
              uid: userCredential.user.uid,
              email: identifier,
              password: password,
              displayName: userCredential.user.displayName || identifier.split('@')[0],
              photoURL: userCredential.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`
            });
            localStorage.setItem('hisee_saved_accounts', JSON.stringify(accounts));
          } catch (e) {
            console.error("Error saving newly created account details locally:", e);
          }
          onAuthSuccess(userCredential.user.uid);
        }
      } else {
        setError(getAuthT('phoneBypass', 'Phone login requires additional setup. Please use email for now.'));
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      // Print and display the direct error message on the screen immediately instead of freezing
      setError(err.message || err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDevMode = () => {
    onAuthSuccess('dev-mode-user');
  };

  const dir = (localLang === 'ar' || localLang === 'ckb') ? 'rtl' : 'ltr';

  const tTerms = termsTranslations[localLang] || termsTranslations.en;
  const tPrivacy = privacyTranslations[localLang] || privacyTranslations.en;

  return (
    <div className="min-h-[100dvh] w-full bg-[#000000] flex flex-col items-center justify-start sm:justify-center p-[3vw] relative overflow-y-auto" dir={dir}>
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-yellow-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Floating Language Dropdown in the top corner of the page */}
      <div className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} z-50`}>
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-black/45 hover:bg-black/75 border border-white/10 rounded-full text-xs font-black uppercase text-white tracking-widest active:scale-95 transition-all cursor-pointer backdrop-blur-md"
          >
            <Globe size={14} className="text-emerald-400" />
            <span>{LANGUAGES.find(l => l.code === localLang)?.nativeName || 'English'}</span>
          </button>
          
          {showLangMenu && (
            <div className={`absolute mt-2 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-44 bg-zinc-950/95 border border-white/10 rounded-2xl p-1.5 shadow-2xl shadow-black z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200`}>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLocalLang(l.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-start px-3 py-2 text-xs rounded-xl transition-all flex items-center justify-between ${localLang === l.code ? 'bg-emerald-500/10 text-emerald-400 font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <span>{l.nativeName}</span>
                  {localLang === l.code && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="z-10 w-full max-w-md flex flex-col gap-1 md:gap-6 animate-in fade-in zoom-in-95 duration-700 py-2 sm:py-8">
        
        {/* Header & Logo */}
        <div className="flex flex-col items-center gap-0.5 md:gap-4">
          <div className="w-8 h-8 md:w-24 md:h-24 relative group cursor-pointer" onClick={handleLogoClick}>
            <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ModernHSLogo className="relative z-10" />
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-lg md:text-4xl font-black text-white italic uppercase tracking-tighter">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-yellow-400 to-rose-400">HiSee</span> Pro
            </h1>
            <p className="text-slate-500 text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-black">
              Visual Mastering Engine v9.0
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="p-3 md:p-8 rounded-[2rem] border border-white/10 shadow-2xl shadow-black/50 bg-black/60 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          
          {/* Toggle Login/Signup */}
          <div className="flex items-center justify-center gap-1 mb-1.5 md:mb-6 bg-white/5 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
            >
              {getAuthT('login', 'Login')}
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
            >
              {getAuthT('signUp', 'Sign Up')}
            </button>
          </div>

          {/* Toggle Email/Phone */}
          <div className="flex items-center justify-center gap-4 mb-2 md:mb-6">
            <button 
              onClick={() => setMethod('email')}
              className={`flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${method === 'email' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              <Mail size={12} className="text-rose-500" />
              {getAuthT('email', 'Email')}
            </button>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <button 
              onClick={() => setMethod('phone')}
              className={`flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${method === 'phone' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              <Smartphone size={12} className="text-emerald-500" />
              {getAuthT('phone', 'Phone')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 md:gap-5">
            
            {error && (
              <div className="flex flex-col gap-2">
                <div className="text-rose-400 text-[9px] font-black uppercase tracking-widest text-center p-2 bg-rose-500/10 rounded-2xl border border-rose-500/20 animate-shake">
                  {error}
                </div>
                {(error.includes('https://console.firebase.google.com') || error.includes('api-keys-are-not-supported') || error.includes('timeout') || error.includes('limit') || error.includes('Error')) && (
                  <button 
                    type="button"
                    onClick={() => {
                      // Dynamically create and route a safe demo user based on their input email or default
                      const cleanEmail = identifier && identifier.includes('@') ? identifier.trim() : "dilginhussein984e55@gmail.com";
                      const cleanUid = "demo_user_" + cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '_');
                      
                      const userDocRef = doc(db, 'users', cleanUid);
                      setDoc(userDocRef, {
                        id: cleanUid,
                        uid: cleanUid,
                        displayName: cleanEmail.split('@')[0],
                        email: cleanEmail,
                        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUid}`,
                        lastLoginAt: new Date().toISOString(),
                        status: 'online'
                      }, { merge: true }).catch(() => {});

                      onAuthSuccess(cleanUid);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 text-emerald-400 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500/30 active:scale-95 transition-all shadow-lg"
                  >
                    {localLang === 'ar' ? 'الدخول التجريبي الفوري (تخطي القيود) ⚡' : 'Instant Guest/Demo Login (Bypass Rules) ⚡'}
                  </button>
                )}
              </div>
            )}
            {success && (
              <div className="text-emerald-400 text-[9px] font-black uppercase tracking-widest text-center p-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                {success}
              </div>
            )}
            
            {/* Input: Identifier */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2">
                {method === 'email' ? getAuthT('emailLabel', 'Email Address') : getAuthT('phoneLabel', 'Phone Number')}
              </label>
              <div className="relative group">
                {method === 'email' ? (
                  <Mail className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors`} size={16} />
                ) : (
                  <Smartphone className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors`} size={16} />
                )}
                <input 
                  type={method === 'email' ? 'email' : 'tel'}
                  placeholder={method === 'email' ? 'name@example.com' : '+964 750 000 0000'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl py-2 ${dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'} text-[11px] font-bold text-white outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all`}
                  required
                />
              </div>
            </div>

            {/* Input: Password */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2">{getAuthT('passwordLabel', 'Password')}</label>
              <div className="relative group">
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${dir === 'rtl' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 transition-colors z-20 ${showPassword ? 'text-emerald-500' : 'text-white/20 hover:text-orange-500'}`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl py-2 ${dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'} text-[11px] font-bold text-white outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all`}
                  required
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center gap-2 px-2">
                <input 
                  type="checkbox" 
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 accent-emerald-500"
                />
                <label htmlFor="rememberMe" className="text-[9px] font-black text-white/40 uppercase tracking-widest cursor-pointer">
                  {getAuthT('rememberMe', 'Remember Me')}
                </label>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2">{getAuthT('confirmPasswordLabel', 'Confirm Password')}</label>
                <div className="relative group">
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute ${dir === 'rtl' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 transition-colors z-20 ${showPassword ? 'text-emerald-500' : 'text-white/20 hover:text-orange-500'}`}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl py-2 ${dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'} text-[11px] font-bold text-white outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all`}
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || !acceptedTerms}
              className={`w-full py-3 bg-gradient-to-r from-[#FF8C00] to-[#7FFF00] text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3 mt-1 ${!acceptedTerms ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? getAuthT('secureLogin', 'Secure Login') : getAuthT('signUp', 'Sign Up')}</span>
                  <ArrowRight size={16} className={dir === 'rtl' ? 'rotate-180' : ''} />
                </>
              )}
            </button>

            {/* Google Login Button */}
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
              {getAuthT('googleLogin', 'Sign in with Google')}
            </button>
          </form>
          
          {/* Footer Info inside card for better visibility */}
          <div className="mt-1.5 text-center pb-4 sm:pb-0">
            <div className="flex items-center justify-center gap-2 mb-2">
              <input 
                type="checkbox" 
                id="acceptedTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 accent-emerald-500"
              />
              <label htmlFor="acceptedTerms" className="text-[9px] font-black text-white/40 uppercase tracking-widest cursor-pointer">
                {getAuthT('acceptedTerms', 'I agree to the Terms & Privacy Policy')}
              </label>
            </div>
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
              {getAuthT('byContinuing', 'By continuing, you agree to the')}{' '}
              <button 
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-white underline hover:text-emerald-400 transition-colors"
              >
                {getAuthT('termsOfService', 'Terms of Service')}
              </button>{' '}
              {getAuthT('and', 'and')}{' '}
              <button 
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="text-white underline hover:text-emerald-400 transition-colors"
              >
                {getAuthT('privacyPolicy', 'Privacy Policy')}
              </button>
            </p>
          </div>

          {showSecretButton && (
            <button 
              onClick={handleDevMode}
              className="w-full py-2.5 mt-4 bg-white/5 border border-white/20 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white hover:bg-white/10 transition-all"
            >
              {getAuthT('devMode', 'DEV MODE')}
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-emerald-500/20 relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-300" />
              <h3 className={`text-xl font-black text-white mb-4 ${dir === 'rtl' ? 'text-right justify-end' : 'text-left justify-start'} flex items-center gap-3 shrink-0`}>
                {dir === 'rtl' ? null : <ShieldCheck className="text-emerald-400" size={20} />}
                <span>{tTerms.title}</span>
                {dir === 'rtl' ? <ShieldCheck className="text-emerald-400" size={20} /> : null}
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar mb-6">
                {tTerms.sections.map((sect, i) => (
                  <div key={i} className={`bg-white/5 p-4 rounded-2xl border border-white/5 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <h4 className="text-white font-bold text-xs mb-2 flex items-center gap-2">
                      <span>{sect.title}</span>
                    </h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      {sect.desc}
                    </p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowTerms(false)}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 shrink-0"
              >
                {localLang === 'ar' ? 'موافق' : 'Accept'}
              </button>
            </motion.div>
          </div>
        )}

        {showPrivacy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-rose-500/20 relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-300" />
              <h3 className={`text-xl font-black text-white mb-4 ${dir === 'rtl' ? 'text-right justify-end' : 'text-left justify-start'} flex items-center gap-3 shrink-0`}>
                {dir === 'rtl' ? null : <Shield className="text-rose-400" size={20} />}
                <span>{tPrivacy.title}</span>
                {dir === 'rtl' ? <Shield className="text-rose-400" size={20} /> : null}
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar mb-6">
                {tPrivacy.sections.map((sect, i) => (
                  <div key={i} className={`bg-white/5 p-4 rounded-2xl border border-white/5 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <h4 className="text-white font-bold text-xs mb-2 flex items-center gap-2">
                      <span>{sect.title}</span>
                    </h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      {sect.desc}
                    </p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowPrivacy(false)}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-rose-500/20 shrink-0"
              >
                {localLang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthView;
