/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Feedback & UX Notification Context & Provider
 * Global React system providing non-blocking Toasts, accessible Confirmation Modals,
 * and Alert Dialogs to replace native browser window.alert and window.confirm.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  HelpCircle,
  Loader2
} from 'lucide-react';
import { ToastItem, FeedbackType, ModalAlertOptions, ModalConfirmOptions } from '../types/feedback';

interface FeedbackContextType {
  toast: {
    show: (message: string, type?: FeedbackType, title?: string, durationMs?: number) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  showAlert: (options: ModalAlertOptions) => Promise<void>;
  showConfirm: (options: ModalConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // Alert Modal State
  const [activeAlert, setActiveAlert] = useState<{
    options: ModalAlertOptions;
    resolve: () => void;
  } | null>(null);

  // Confirm Modal State
  const [activeConfirm, setActiveConfirm] = useState<{
    options: ModalConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirmConfirmBtnRef = useRef<HTMLButtonElement>(null);
  const alertConfirmBtnRef = useRef<HTMLButtonElement>(null);

  // Toast API
  const showToast = useCallback((message: string, type: FeedbackType = 'info', title?: string, durationMs = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, title, durationMs }]);

    if (durationMs > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Alert Dialog API
  const showAlert = useCallback((options: ModalAlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setActiveAlert({ options, resolve });
    });
  }, []);

  // Confirmation Dialog API
  const showConfirm = useCallback((options: ModalConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setActiveConfirm({ options, resolve });
    });
  }, []);

  // Accessibility focus management
  useEffect(() => {
    if (activeConfirm) {
      setTimeout(() => confirmConfirmBtnRef.current?.focus(), 50);
    }
  }, [activeConfirm]);

  useEffect(() => {
    if (activeAlert) {
      setTimeout(() => alertConfirmBtnRef.current?.focus(), 50);
    }
  }, [activeAlert]);

  // Keyboard navigation (Escape to dismiss/cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeConfirm) {
          activeConfirm.resolve(false);
          setActiveConfirm(null);
        } else if (activeAlert) {
          activeAlert.resolve();
          setActiveAlert(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeConfirm, activeAlert]);

  const value: FeedbackContextType = {
    toast: {
      show: showToast,
      success: (msg, title) => showToast(msg, 'success', title),
      error: (msg, title) => showToast(msg, 'error', title),
      warning: (msg, title) => showToast(msg, 'warning', title),
      info: (msg, title) => showToast(msg, 'info', title),
    },
    showAlert,
    showConfirm,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* Global Toast Stack */}
      <div 
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 inset-x-0 sm:inset-x-auto sm:left-6 z-[100] flex flex-col gap-2.5 max-w-md w-full px-4 sm:px-0 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const isSuccess = t.type === 'success';
            const isError = t.type === 'error';
            const isWarning = t.type === 'warning';

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                role="alert"
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium ${
                  isSuccess
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                    : isError
                    ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                    : isWarning
                    ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                    : 'bg-sky-950/90 border-sky-500/50 text-sky-200'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                  {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400" />}
                </div>

                <div className="flex-1 space-y-0.5">
                  {t.title && <h5 className="font-bold text-white leading-tight">{t.title}</h5>}
                  <p className="leading-relaxed">{t.message}</p>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  aria-label="Close notification"
                  className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Accessible Confirmation Modal */}
      <AnimatePresence>
        {activeConfirm && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm_dialog_title"
            aria-describedby="confirm_dialog_desc"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeConfirm.options.isDestructive
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {activeConfirm.options.isDestructive ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <HelpCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 id="confirm_dialog_title" className="font-heading font-black text-lg text-white">
                    {activeConfirm.options.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeConfirm.options.isDestructive ? 'يرجى التأكيد للمتابعة' : 'تأكيد الإجراء'}
                  </p>
                </div>
              </div>

              <p id="confirm_dialog_desc" className="text-sm text-slate-300 leading-relaxed">
                {activeConfirm.options.message}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    activeConfirm.resolve(false);
                    setActiveConfirm(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  {activeConfirm.options.cancelLabel || 'إلغاء'}
                </button>

                <button
                  ref={confirmConfirmBtnRef}
                  type="button"
                  onClick={() => {
                    activeConfirm.resolve(true);
                    setActiveConfirm(null);
                  }}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer ${
                    activeConfirm.options.isDestructive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                  }`}
                >
                  {activeConfirm.options.confirmLabel || 'تأكيد ومتابعة'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Accessible Alert Modal */}
      <AnimatePresence>
        {activeAlert && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alert_dialog_title"
            aria-describedby="alert_dialog_desc"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeAlert.options.type === 'error'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : activeAlert.options.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}>
                  {activeAlert.options.type === 'error' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : activeAlert.options.type === 'success' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Info className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 id="alert_dialog_title" className="font-heading font-black text-lg text-white">
                    {activeAlert.options.title}
                  </h3>
                </div>
              </div>

              <p id="alert_dialog_desc" className="text-sm text-slate-300 leading-relaxed">
                {activeAlert.options.message}
              </p>

              {activeAlert.options.details && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto">
                  {activeAlert.options.details}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  ref={alertConfirmBtnRef}
                  type="button"
                  onClick={() => {
                    activeAlert.resolve();
                    setActiveAlert(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
                >
                  {activeAlert.options.confirmLabel || 'حسناً'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </FeedbackContext.Provider>
  );
};

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}
