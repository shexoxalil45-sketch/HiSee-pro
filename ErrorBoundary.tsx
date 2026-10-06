import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'Unknown Error';
      let isFirestoreError = false;
      let firestoreInfo = null;

      try {
        if (errorMessage.startsWith('{') && errorMessage.endsWith('}')) {
          firestoreInfo = JSON.parse(errorMessage);
          if (firestoreInfo.error && firestoreInfo.operationType) {
            isFirestoreError = true;
            errorMessage = firestoreInfo.error;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden relative">
          {/* Animated Background Elements */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

          <div className="relative z-10 flex flex-col items-center max-w-md w-full">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.1)]">
              <AlertCircle size={48} className="text-emerald-400" />
            </div>
            
            <h1 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">
              {isFirestoreError ? 'خطأ في مزامنة البيانات' : 'جاري استعادة الواجهة'}
            </h1>
            
            <p className="text-sm text-slate-400 mb-10 leading-relaxed font-medium">
              نعتذر عن هذا العطل المفاجئ. يتم الآن العمل على استعادة الحالة المستقرة من قاعدة البيانات المحلية لضمان استمرارية الخدمة.
            </p>
            
            <div className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 mb-10 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 opacity-50">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diagnostic Log</span>
                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{isFirestoreError ? '0xDB_SYNC' : '0xUI_CRASH'}</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono break-all leading-tight text-left bg-black/40 p-3 rounded-xl border border-white/5 mb-3 font-semibold">
                {errorMessage}
              </p>
              {this.state.error?.stack && (
                <div className="text-left mt-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1 px-1">Stack Trace</span>
                  <pre className="text-[9px] text-rose-300/80 font-mono break-all leading-tight bg-black/60 p-3 rounded-xl border border-white/5 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={this.handleReset}
                className="group relative flex items-center justify-center gap-3 py-4.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_15px_35px_rgba(5,150,105,0.3)] active:scale-95 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> 
                تحديث واستعادة النظام
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
