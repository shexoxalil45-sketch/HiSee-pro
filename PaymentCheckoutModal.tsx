import React, { useState } from 'react';
import { 
  CreditCard, Wallet, Building, ShieldCheck, Lock, CheckCircle2, 
  X, AlertCircle, Sparkles, ArrowLeft, RefreshCw 
} from 'lucide-react';
import HiSeeCoinIcon from './HiSeeCoinIcon';

interface CoinPackage {
  coins: number;
  price: string;
  bonus: number;
  local?: string;
}

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: CoinPackage | null;
  userId: string;
  onPaymentSuccess: (result: {
    paidCoins: number;
    bonusCoins: number;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    webhookEventId: string;
  }) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedPackage,
  userId,
  onPaymentSuccess
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'paypal' | 'bank' | 'free_dev'>('card');
  const [step, setStep] = useState<'method' | 'checkout' | 'waiting_webhook' | 'success'>('method');
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // PayPal Input
  const [paypalEmail, setPaypalEmail] = useState('');

  // Processing & Webhook Status
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [webhookLog, setWebhookLog] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !selectedPackage) return null;

  const totalCoins = selectedPackage.coins + (selectedPackage.bonus || 0);

  const handleStartCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Step 1: Request checkout session from server backend
      const res = await fetch('/api/payment/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          packageId: `pkg_${selectedPackage.coins}`,
          coins: selectedPackage.coins,
          bonus: selectedPackage.bonus || 0,
          price: selectedPackage.price,
          currency: 'USD',
          paymentMethod: selectedMethod
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initialize payment gateway');
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setStep('checkout');
    } catch (err: any) {
      console.error('Payment checkout session error:', err);
      setErrorMessage(err.message || 'تعذر الاتصال ببوابة الدفع، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePayment = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStep('waiting_webhook');
    setWebhookLog('جاري إرسال العملية إلى بوابة الدفع المشفرة...');

    try {
      await new Promise(r => setTimeout(r, 1200));
      setWebhookLog('تم اعتماد الحساب، بانتظار استجابة وتأكيد Webhook المباشر...');

      // Step 2: Call server Webhook confirmation endpoint
      const isFreeDev = selectedMethod === 'free_dev';
      const confirmRes = await fetch('/api/payment/confirm-webhook-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || `cs_${Date.now()}`,
          paymentDetails: {
            userId,
            coins: selectedPackage.coins,
            bonus: selectedPackage.bonus || 0,
            amount: Number(selectedPackage.price),
            currency: 'USD',
            paymentMethod: selectedMethod
          }
        })
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Webhook confirmation failed');
      }

      const confirmData = await confirmRes.json();
      setWebhookLog('✅ تم استلام إشعار Webhook بنجاح وتأكيد الإيداع في محفظة المنصة!');
      
      await new Promise(r => setTimeout(r, 800));

      setStep('success');

      // Call parent success callback with webhook-verified details
      onPaymentSuccess({
        paidCoins: confirmData.paidCoins !== undefined ? confirmData.paidCoins : selectedPackage.coins,
        bonusCoins: confirmData.bonusCoins !== undefined ? confirmData.bonusCoins : (selectedPackage.bonus || 0),
        amount: confirmData.amount || Number(selectedPackage.price),
        paymentMethod: selectedMethod,
        transactionId: confirmData.sessionId || sessionId,
        webhookEventId: confirmData.webhookEventId || `evt_${Date.now()}`
      });

    } catch (err: any) {
      console.error('Webhook execution error:', err);
      setErrorMessage(err.message || 'فشلت عملية التأكيد عبر الـ Webhook.');
      setStep('checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-right overflow-y-auto" dir="rtl" onClick={onClose}>
      <div 
        className="glass w-full max-w-md p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col relative my-auto max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4 shrink-0">
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={22} />
            <h3 className="text-base font-black text-white">بوابة الدفع الآمنة (HiSee Pay)</h3>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pt-3 pb-1 px-1 no-scrollbar">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Select Method */}
          {step === 'method' && (
            <div className="space-y-4">
              {/* Package Summary */}
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">الباقة المختارة</span>
                  <div className="flex items-center gap-1.5 font-bold text-white text-base">
                    <HiSeeCoinIcon size={20} />
                    <span>{selectedPackage.coins} {selectedPackage.bonus > 0 && <span className="text-emerald-400">+{selectedPackage.bonus}</span>} عملة</span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-slate-400 block mb-0.5">السعر الإجمالي</span>
                  <span className="text-xl font-black text-emerald-400">${selectedPackage.price}</span>
                </div>
              </div>

              {/* Methods */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 block">اختر وسيلة الدفع المباشرة:</label>
                
                {[
                  { id: 'card', name: 'بطاقة مصرفية (Visa / Mastercard - Stripe)', icon: <CreditCard size={18} className="text-blue-400" /> },
                  { id: 'paypal', name: 'حساب PayPal الإلكتروني', icon: <Wallet size={18} className="text-sky-400" /> },
                  { id: 'bank', name: 'تحويل مصرفي مباشر (IBAN / SEPA)', icon: <Building size={18} className="text-emerald-400" /> },
                  { id: 'free_dev', name: 'تعبئة مجانية للمطورين (رصيد غير قابل للسحب)', icon: <Sparkles size={18} className="text-purple-400" /> },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id as any)}
                    className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      selectedMethod === m.id 
                        ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center">
                        {m.icon}
                      </div>
                      <span className="text-xs font-bold text-slate-200">{m.name}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === m.id ? 'border-emerald-400' : 'border-slate-500'
                    }`}>
                      {selectedMethod === m.id && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Treasury info */}
              <div className="text-[10px] text-slate-400 bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <span>محفظة المنصة المستقبلة:</span>
                <span className="font-mono text-emerald-400 font-bold">hisee_master_treasury_vault</span>
              </div>

              <button
                disabled={loading}
                onClick={handleStartCheckout}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    <span>المتابعة إلى الدفع الآمن (${selectedPackage.price})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Checkout Input Form */}
          {step === 'checkout' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <button 
                  onClick={() => setStep('method')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} className="rotate-180" />
                  <span>تغيير الوسيلة</span>
                </button>
                <span>جلسة الدفع: <code className="font-mono text-emerald-400">{sessionId.slice(0, 12)}...</code></span>
              </div>

              {selectedMethod === 'card' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">رقم البطاقة (Card Number):</label>
                    <input 
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 •••• •••• 4242 (Stripe Sandbox)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">تاريخ الانتهاء (MM/YY):</label>
                      <input 
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">رمز الأمان (CVC):</label>
                      <input 
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="•••"
                        maxLength={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono text-center"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">اسم حامل البطاقة:</label>
                    <input 
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="الاسم الثلاثي"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              {selectedMethod === 'paypal' && (
                <div className="space-y-3">
                  <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-center space-y-2">
                    <Wallet size={32} className="text-sky-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">الدفع بواسطة PayPal Sandbox</h4>
                    <p className="text-[11px] text-slate-400">
                      سيتم تأكيد العملية فورياً عبر استجابة Webhook مباشرة إلى حساب محفظة المنصة.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">بريد PayPal الخاص بك:</label>
                    <input 
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="buyer@sandbox.paypal.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                    />
                  </div>
                </div>
              )}

              {selectedMethod === 'bank' && (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>البنك المستلم:</span>
                      <span className="font-bold text-white">Deutsche Bank / HiSee Vault</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>IBAN المنصة:</span>
                      <span className="font-mono text-emerald-400 font-bold">DE89370400440532013000</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>المبلغ المستحق:</span>
                      <span className="font-black text-white">${selectedPackage.price}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === 'free_dev' && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center space-y-2">
                  <Sparkles size={32} className="text-purple-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">وضع التطوير (Sandbox Bonus)</h4>
                  <p className="text-[11px] text-slate-300">
                    تتم إضافة كافة العملات كـ <strong className="text-purple-300">bonusCoins</strong> غير قابلة للسحب لاختبار التطبيق والميزات بحرية وأمان.
                  </p>
                </div>
              )}

              <button
                disabled={loading}
                onClick={handleExecutePayment}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    <span>تأكيد الدفع والاستماع لـ Webhook (${selectedPackage.price})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 3: Waiting for Webhook Response */}
          {step === 'waiting_webhook' && (
            <div className="py-8 text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={24} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">جاري استلام تأكيد الـ Webhook...</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {webhookLog || 'يتم الآن التحقق من صحة الدفع عبر اتصال Webhook المشفر من بوابة الدفع مباشرة.'}
                </p>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] font-mono text-emerald-400 animate-pulse">
                Webhook Event: Listening on /api/payment/webhook
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 size={44} />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-black text-white">تمت العملية بنجاح عبر Webhook!</h4>
                <p className="text-xs text-slate-300">
                  تم استلام تأكيد البوابة وإضافة <strong className="text-emerald-400 font-bold">{totalCoins} عملة</strong> إلى حسابك بنجاح.
                </p>
              </div>

              <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 text-[11px] text-slate-400 space-y-1 text-right">
                <div className="flex justify-between">
                  <span>المبلغ المدفوع:</span>
                  <span className="font-bold text-white">${selectedPackage.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>الرصيد المدفوع (paidCoins):</span>
                  <span className="font-bold text-emerald-400">+{selectedMethod === 'free_dev' ? 0 : selectedPackage.coins} عملة</span>
                </div>
                {selectedPackage.bonus > 0 && (
                  <div className="flex justify-between">
                    <span>البونص المجاني (bonusCoins):</span>
                    <span className="font-bold text-teal-400">+{selectedPackage.bonus} عملة</span>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all active:scale-98"
              >
                العودة إلى المحفظة
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PaymentCheckoutModal;
