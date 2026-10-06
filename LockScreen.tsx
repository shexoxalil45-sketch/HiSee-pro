
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { PatternLock } from './PatternLock';

interface LockScreenProps {
  onUnlock: () => void;
  enabledMethods: ('pin' | 'pattern')[];
  savedPin?: string;
  savedPattern?: number[];
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, enabledMethods, savedPin, savedPattern }) => {
  const [method, setMethod] = useState<'pin' | 'pattern'>(enabledMethods[0] || 'pin');
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);

  const handlePinInput = (digit: string) => {
    const newPin = pin + digit;
    
    if (newPin.length <= 4) {
      setPin(newPin);
    }
    
    if (newPin.length === 4) {
      if (savedPin && newPin === savedPin) { 
        onUnlock();
      } else {
        // Give visual feedback for wrong PIN, then reset
        setPin('');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[30000] bg-[#0a0c10] flex flex-col items-center justify-center text-center p-6"
    >
      <Lock size={48} className="text-emerald-500 mb-8" />
      <h2 className="text-2xl font-bold text-white mb-8">
        {method === 'pin' ? 'إدخال رمز PIN' : 'رسم النمط'}
      </h2>

      {method === 'pin' ? (
        <>
          <div className="flex gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-4 h-4 rounded-full ${pin.length >= i ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
              <motion.button
                key={digit}
                whileTap={{ scale: 0.9 }}
                onClick={() => handlePinInput(digit.toString())}
                className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center text-xl font-bold hover:bg-slate-700 transition-colors"
              >
                {digit}
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <PatternLock 
          title="ارسم النمط للفتح"
          error={isError}
          onConfirm={(p) => {
            if (savedPattern && p.join(',') === savedPattern.join(',')) {
              onUnlock();
            } else {
              setIsError(true);
              setTimeout(() => setIsError(false), 2000);
            }
          }} 
        />
      )}

      {enabledMethods.length > 1 && (
        <button 
          onClick={() => setMethod(method === 'pin' ? 'pattern' : 'pin')}
          className="mt-8 text-sm text-emerald-400 hover:underline"
        >
          التبديل إلى {method === 'pin' ? 'النمط' : 'رمز PIN'}
        </button>
      )}
    </motion.div>
  );
};
