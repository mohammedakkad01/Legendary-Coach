/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Auth & Guest Selection Modal
 * Prompts user to Sign In with Google (earning 300 Free Diamonds!) or continue as Guest.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../firebase/FirebaseContext';
import { useGameStore } from '../state/useGameStore';
import { 
  Gem, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  LogIn, 
  User, 
  X, 
  CheckCircle2, 
  Trophy, 
  Cloud 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, loginWithGoogle, logout, loading, isOnline } = useFirebase();
  const { language, club, setIsGuest, hasClaimedLoginBonus, claimLoginBonus } = useGameStore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAr = language === 'ar';

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true);
      setAuthError(null);
      await loginWithGoogle();
      setIsGuest(false);
      onClose();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(isAr ? 'تعذر إتمام تسجيل الدخول، يرجى المحاولة مرة أخرى.' : 'Failed to complete sign in, please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleContinueAsGuest = () => {
    setIsGuest(true);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
          id="auth_modal_container"
        >
          {/* Header Banner */}
          <div className="relative p-6 bg-gradient-to-r from-sky-950 via-indigo-950 to-purple-950 border-b border-slate-800">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 sm:left-auto sm:right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              id="btn_close_auth_modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 text-2xl">
                ⚽
              </div>
              <div>
                <h2 className="text-xl font-bold font-heading text-white">
                  {user 
                    ? (isAr ? 'الملف الشخصي والتوثيق' : 'Coach Profile & Cloud') 
                    : (isAr ? 'تسجيل الدخول ومكافأة البداية' : 'Coach Sign In & Welcome Reward')}
                </h2>
                <p className="text-xs text-slate-300">
                  {isAr ? 'لعبة المدرب الأسطورة — مسيرة واقعية' : 'The Legendary Coach — Official Real Career'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* If User Already Logged In */}
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || ''} 
                      className="w-14 h-14 rounded-full border-2 border-emerald-400 object-cover shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-xl text-white">
                      <User className="w-6 h-6 text-sky-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">{user.displayName || 'الكابتن'}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {isAr ? 'موثق' : 'Verified'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    <p className="text-xs text-fuchsia-400 mt-1 flex items-center gap-1 font-semibold">
                      <Gem className="w-3.5 h-3.5 text-fuchsia-400" />
                      {isAr ? `رصيدك: ${club.finances.diamonds || 0} جوهرة` : `Balance: ${club.finances.diamonds || 0} Diamonds`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-all shadow-lg shadow-sky-600/25"
                  >
                    {isAr ? 'العودة للملعب' : 'Return to Game'}
                  </button>
                  <button
                    onClick={logout}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-300 font-bold text-sm transition-all"
                  >
                    {isAr ? 'تسجيل الخروج' : 'Log Out'}
                  </button>
                </div>
              </div>
            ) : (
              /* User Not Logged In */
              <div className="space-y-5">
                {/* 300 DIAMONDS REWARD HIGHLIGHT BANNER */}
                <div className="relative overflow-hidden rounded-xl border border-fuchsia-500/40 bg-gradient-to-r from-purple-950/70 via-fuchsia-950/60 to-pink-950/70 p-4 shadow-lg shadow-fuchsia-500/10">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-fuchsia-600/30 border border-fuchsia-400/40 flex items-center justify-center shrink-0">
                      <Gem className="w-7 h-7 text-fuchsia-300 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs uppercase tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isAr ? 'مكافأة ترحيبية خاصة' : 'Special Welcome Reward'}</span>
                      </div>
                      <h4 className="text-base font-black text-white mt-0.5">
                        {isAr ? '300 جوهرة 💎 مجاناً عند تسجيل الدخول!' : '300 Free Diamonds 💎 Upon Google Login!'}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isAr 
                          ? 'سجل دخولك بحساب Google للحصول فوراً على 300 جوهرة في خزينة ناديك واستخدمها للتعاقد مع أفضل لاعبي كرة القدم الواقعيين وحفظ تقدمك سحابياً!' 
                          : 'Sign in with Google to immediately claim 300 diamonds in your club vault, sign world-class football stars, and back up your career to the cloud!'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isAr ? 'الحصول الفوري على 300 جوهرة (Diamonds) في خزينة النادي' : 'Instant 300 Diamonds in your club treasury'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{isAr ? 'حفظ مسيرة النادي سحابياً والوصول إليها من أي جهاز' : 'Cloud saves across all your devices via Firestore'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{isAr ? 'إمكانية التعاقد مع ألمع النجوم وتدريب أندية المركز الأول والنخبة' : 'Sign world superstar players and manage top-tier champion clubs'}</span>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-300">
                    {authError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  {/* Google Login Button */}
                  <button
                    id="btn_google_sign_in_modal"
                    onClick={handleGoogleLogin}
                    disabled={isSigningIn}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-sm shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>
                      {isSigningIn 
                        ? (isAr ? 'جاري تسجيل الدخول...' : 'Signing in...') 
                        : (isAr ? 'تسجيل الدخول بحساب Google (واحصل على 300 💎)' : 'Sign In with Google (Get 300 💎)')}
                    </span>
                  </button>

                  {/* Continue as Guest Button */}
                  <button
                    id="btn_continue_as_guest"
                    onClick={handleContinueAsGuest}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>
                      {isAr 
                        ? 'المتابعة كـ ضيف (Guest) — البدء من الصفر بدون جواهر' 
                        : 'Continue as Guest — Start from zero without gems'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
