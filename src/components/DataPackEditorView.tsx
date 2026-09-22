/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Custom Data Pack & Editor View
 * JSON Import/Export, local modding support, and fictional IP legal safeguards.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { Database, Download, Upload, ShieldCheck, AlertTriangle, Cloud, CloudUpload, CloudDownload, LogIn, Trash2 } from 'lucide-react';

export const DataPackEditorView: React.FC = () => {
  const { club, exportGameData, importCustomDataPack, resetCareer, language } = useGameStore();
  const { 
    user, 
    isOnline, 
    cloudSaves, 
    loginWithGoogle, 
    saveCareerToCloud, 
    loadCareerFromCloud, 
    deleteCloudSave 
  } = useFirebase();

  const isAr = language === 'ar';

  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [cloudStatus, setCloudStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);

  const handleCloudSave = async () => {
    setIsCloudSaving(true);
    setCloudStatus(null);
    const res = await saveCareerToCloud(club.name);
    setCloudStatus(res);
    setIsCloudSaving(false);
  };

  const handleCloudLoad = async (save: any) => {
    if (!window.confirm(isAr ? `استرجاع مسيرة "${save.clubName}"؟ سيتم استبدال البيانات المحلية.` : `Load save "${save.clubName}"?`)) return;
    const res = await loadCareerFromCloud(save);
    setCloudStatus(res);
  };

  const handleExport = () => {
    const dataStr = exportGameData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LegendaryCoach_Save_${club.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!jsonInput.trim()) return;
    const res = importCustomDataPack(jsonInput);
    setImportStatus(res);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
            <Database className="w-4 h-4" />
            <span>{isAr ? 'حزم البيانات والتعديل المحلي' : 'Data Packs & Local Modding'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'محرر الحزم واستيراد/تصدير البيانات' : 'Custom Packs & JSON Save Editor'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr ? 'خصص أنديتك ولاعبيك أو شارك ملفات الحفظ المخصصة عبر ملفات JSON المتوافقة.' : 'Customize clubs, squads, or export/import full career saves via validated JSON.'}
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-sky-600/30 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isAr ? 'تصدير نسخة الحفظ (JSON)' : 'Export Save File'}</span>
        </button>
      </div>

      {/* Legal & Intellectual Property Guarantee Banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-5 flex items-start gap-4 shadow-md">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xl">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-heading font-black text-sm text-emerald-300">
            {isAr ? 'بيان الحماية القانونية والملكية الفكرية (Legal & IP Safe)' : '100% Legal & Fictional Data Safe'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isAr 
              ? 'كافة أسماء الأندية، اللاعبين، البطولات، والشعارات الافتراضية داخل "المدرب الأسطورة" هي بيانات خيالية ومبتكرة بالكامل بنسبة 100%، مستوحاة من البيئة الرياضية العربية والدولية دون انتهاك أي حقوق ملكية أو علامات تجارية لأي كيان رياضي حقيقي.'
              : 'All default clubs, players, leagues, and emblems in "The Legendary Coach" are 100% fictional and legal-safe, inspired by authentic Arab and world sports culture.'}
          </p>
        </div>
      </div>

      {/* Firebase Cloud Firestore Saves Hub */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/60 border border-sky-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-base text-white">
                  {isAr ? 'الحفظ السحابي الآمن (Firebase Cloud Storage)' : 'Secure Cloud Saves (Firestore)'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isOnline ? (isAr ? 'السحابة متصلة' : 'Online') : (isAr ? 'غير متصل' : 'Offline')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'احفظ مسيرتك تلقائياً على قاعدة بيانات Firestore للوصول إليها من أي متصفح أو هاتف.' : 'Sync your career progress securely to Firestore across all your devices.'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              onClick={handleCloudSave}
              disabled={isCloudSaving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-sky-500/20 cursor-pointer transition-all"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{isAr ? 'حفظ المسيرة الحالية في السحابة' : 'Backup Current Career'}</span>
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الدخول لتفعيل الحفظ السحابي' : 'Sign in to enable Cloud'}</span>
            </button>
          )}
        </div>

        {cloudStatus && (
          <div className={`p-3 rounded-xl text-xs font-bold ${
            cloudStatus.success ? 'bg-emerald-950/60 border border-emerald-500/60 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/60 text-rose-300'
          }`}>
            {cloudStatus.message}
          </div>
        )}

        {/* Existing Saves List */}
        {user && cloudSaves.length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? `النسخ المحفوظة باسمك (${cloudSaves.length}):` : `Your Cloud Backups (${cloudSaves.length}):`}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cloudSaves.map((save) => (
                <div key={save.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-white">{save.clubName}</h5>
                    <span className="text-[11px] text-slate-400 block">
                      {new Date(save.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')} • VIP {save.vipPoints}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCloudLoad(save)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
                    >
                      <CloudDownload className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تحميل' : 'Load'}</span>
                    </button>
                    <button
                      onClick={() => deleteCloudSave(save.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Import Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-400" />
            <h3 className="font-heading font-black text-base text-white">
              {isAr ? 'استيراد حزمة بيانات مخصصة (JSON)' : 'Import Custom Pack'}
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          {isAr 
            ? 'الصق نص الـ JSON الخاص بحزمة البيانات أو ملف الحفظ هنا، وسيتم التحقق من سلامة البنية قبل التطبيق.'
            : 'Paste valid game JSON schema below to load customized data.'}
        </p>

        <textarea
          rows={6}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{ "club": { "name": "نادي المستقبل", ... } }'
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
        />

        {importStatus && (
          <div className={`p-3 rounded-xl text-xs font-bold ${
            importStatus.success ? 'bg-emerald-950/60 border border-emerald-500/60 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/60 text-rose-300'
          }`}>
            {importStatus.message}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!jsonInput.trim()}
          className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
            jsonInput.trim()
              ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer shadow-sky-500/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isAr ? 'التحقق وتطبيق الحزمة' : 'Validate & Apply Pack'}
        </button>
      </div>

      {/* Danger Zone: Reset Career */}
      <div className="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h4 className="font-heading font-black text-sm text-rose-300">
              {isAr ? 'إعادة ضبط المسيرة والبدء من جديد' : 'Reset Career & Wipe Save'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? 'حذف كافة البيانات المحفوظة محلياً والعودة إلى اليوم الأول لنادي اليرموك الرياضي.' : 'Resets all local progress back to initial day 1.'}
            </p>
          </div>
        </div>

        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetCareer();
                setShowResetConfirm(false);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-rose-600/30"
            >
              {isAr ? 'نعم، مسح كل شيء' : 'Yes, Wipe Everything'}
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-black cursor-pointer"
          >
            {isAr ? 'إعادة تعيين المسيرة' : 'Reset Progress'}
          </button>
        )}
      </div>

    </div>
  );
};
