/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase Cloud Sync & Saves Modal
 * Google Sign In, Firestore Cloud Backups, and Community Tactics Hub.
 */

import React, { useState } from 'react';
import { useFirebase } from '../firebase/FirebaseContext';
import { useGameStore } from '../state/useGameStore';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  Trash2, 
  LogOut, 
  LogIn, 
  Share2, 
  Heart, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Users
} from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const { 
    user, 
    loading, 
    isOnline, 
    cloudSaves, 
    communityTactics, 
    loginWithGoogle, 
    logout, 
    saveCareerToCloud, 
    loadCareerFromCloud, 
    deleteCloudSave,
    shareCurrentTactic,
    likeTactic
  } = useFirebase();

  const { club, language } = useGameStore();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'saves' | 'tactics'>('saves');
  const [saveName, setSaveName] = useState('');
  const [tacticTitle, setTacticTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSaveToCloud = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    const res = await saveCareerToCloud(saveName.trim() || club.name);
    setStatusMessage({ text: res.message, isError: !res.success });
    setIsProcessing(false);
    if (res.success) setSaveName('');
  };

  const handleLoadSave = async (save: any) => {
    if (!window.confirm(isAr ? `هل ترغب حقاً في استرجاع مسيرة "${save.clubName}"؟ سيتم استبدال الوضع المحلي الحالي.` : `Load save "${save.clubName}"? Current local progress will be replaced.`)) {
      return;
    }
    setIsProcessing(true);
    setStatusMessage(null);
    const res = await loadCareerFromCloud(save);
    setStatusMessage({ text: res.message, isError: !res.success });
    setIsProcessing(false);
  };

  const handleShareTactic = async () => {
    if (!tacticTitle.trim()) return;
    setIsProcessing(true);
    setStatusMessage(null);
    const res = await shareCurrentTactic(tacticTitle);
    setStatusMessage({ text: res.message, isError: !res.success });
    setIsProcessing(false);
    if (res.success) setTacticTitle('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div 
        id="cloud_sync_modal"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-heading text-white">
                  {isAr ? 'المزامنة السحابية (Firebase Cloud)' : 'Firebase Cloud Sync & Saves'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {isOnline ? (isAr ? 'متصل بالسحابة' : 'Firestore Online') : (isAr ? 'وضع عدم الاتصال' : 'Offline')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr ? 'احفظ مسيرة ناديك واسترجعها عبر كافة الأجهزة وشارك خططك' : 'Sync your career progress across devices and explore community tactics'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Bar */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || ''} 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-sky-400/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center">
                  {(user.displayName || 'C')[0]}
                </div>
              )}
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'المدرب المسجل:' : 'Signed in as:'}</span>
                <span className="text-sm font-bold text-white">{user.displayName || user.email}</span>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-sm font-bold text-white block">
                {isAr ? 'حساب غير متصل بالسحابة' : 'Guest Mode (Local Only)'}
              </span>
              <span className="text-xs text-slate-400">
                {isAr ? 'سجل الدخول بحساب Google لحفظ وتأمين بيانات ناديك في Firestore.' : 'Sign in with Google to enable persistent cloud backups.'}
              </span>
            </div>
          )}

          {user ? (
            <button
              onClick={logout}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 text-xs font-bold transition-colors border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الدخول عبر Google' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            statusMessage.isError 
              ? 'bg-rose-950/60 border border-rose-500/60 text-rose-300' 
              : 'bg-emerald-950/60 border border-emerald-500/60 text-emerald-300'
          }`}>
            {statusMessage.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('saves')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
              activeTab === 'saves' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isAr ? 'ملفات الحفظ السحابية' : 'Cloud Saves'}</span>
          </button>
          <button
            onClick={() => setActiveTab('tactics')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${
              activeTab === 'tactics' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'مجتمع التكتيكات المشتركة' : 'Community Tactics'}</span>
          </button>
        </div>

        {/* Tab 1: Cloud Saves */}
        {activeTab === 'saves' && (
          <div className="space-y-4">
            
            {/* Quick Cloud Save Action */}
            {user && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5">
                <label className="text-xs font-bold text-slate-300 block">
                  {isAr ? 'حفظ النادي الحالي إلى السحابة (Snapshot):' : 'Backup Current Club Career:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder={isAr ? `تسمية الحفظ (افتراضي: ${club.name})` : `Save label (default: ${club.name})`}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={handleSaveToCloud}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer shadow-md shadow-sky-500/20"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{isAr ? 'حفظ الآن' : 'Save Now'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of saves */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block">
                {isAr ? `النسخ المحفوظة على خوادم Firestore (${cloudSaves.length}):` : `Saved Careers in Firestore (${cloudSaves.length}):`}
              </span>

              {!user ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
                  {isAr ? 'سجل الدخول لعرض وإدارة نسخك المحفوظة في السحابة.' : 'Sign in to access your cloud saves.'}
                </div>
              ) : cloudSaves.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
                  {isAr ? 'لا توجد نسخ سحابية محفوظة حتى الآن. اضغط "حفظ الآن" لأخذ أول نسخة احتياطية!' : 'No cloud saves found yet. Click "Save Now" to back up your progress.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cloudSaves.map((save) => (
                    <div 
                      key={save.id}
                      className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-white">{save.clubName}</h5>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold uppercase">
                            {save.currentSport}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span>💰 {save.coins.toLocaleString()}</span>
                          <span>👑 VIP {save.vipPoints}</span>
                          <span>📅 {new Date(save.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleLoadSave(save)}
                          disabled={isProcessing}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer transition-colors"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تحميل' : 'Load'}</span>
                        </button>
                        <button
                          onClick={() => deleteCloudSave(save.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Community Tactics */}
        {activeTab === 'tactics' && (
          <div className="space-y-4">
            
            {/* Share Current Tactic */}
            {user && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2.5">
                <label className="text-xs font-bold text-slate-300 block">
                  {isAr ? 'مشاركة خطة فريقك الحالية مع المجتمع:' : 'Share Your Current Formation & Tactics:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tacticTitle}
                    onChange={(e) => setTacticTitle(e.target.value)}
                    placeholder={isAr ? 'عنوان التكتيك (مثال: تكتيك الضغط العالي الخانق)' : 'Title (e.g. Master Gegenpress)'}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={handleShareTactic}
                    disabled={isProcessing || !tacticTitle.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'مشاركة' : 'Share'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Community Tactics */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block">
                {isAr ? `تكتيكات مقترحة من المدربين (${communityTactics.length}):` : `Coaches Shared Tactics (${communityTactics.length}):`}
              </span>

              {communityTactics.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
                  {isAr ? 'لا توجد تكتيكات منشورة حتى الآن. كن أول من يشارك خطته!' : 'No community tactics yet. Be the first to share one!'}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {communityTactics.map((tactic) => (
                    <div 
                      key={tactic.id}
                      className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-white">{tactic.title}</h5>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            {tactic.formation}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span>{isAr ? `بواسطة: ${tactic.authorName}` : `By: ${tactic.authorName}`}</span>
                          <span>•</span>
                          <span>{tactic.mentality}</span>
                          <span>•</span>
                          <span>{tactic.pressing}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => likeTactic(tactic.id, tactic.likesCount)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 text-xs font-bold transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        <span>{tactic.likesCount}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
