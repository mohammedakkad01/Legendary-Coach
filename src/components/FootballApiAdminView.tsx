/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Admin Football Data & API-Football Management View
 * - Displays daily quota usage (X / 100 requests)
 * - Safe limits indicator (90 requests max threshold)
 * - Free status checker
 * - Manual trigger per league (Premier League, La Liga, Ligue 1, Bundesliga, Saudi Pro, Egypt PL)
 * - Full audit logs of sync operations
 * - Two-Layer Architecture status (Layer 1 Cache vs Layer 2 User Clones)
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Globe, 
  Flame, 
  FileText, 
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { 
  checkFootballApiStatus, 
  syncRealLeague, 
  fetchFootballLayer1Cache, 
  QuotaStatus, 
  SyncResult 
} from '../services/realFootballDataService';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import confetti from 'canvas-confetti';

interface LeagueConfig {
  id: number;
  name: string;
  nameEn: string;
  country: string;
  flag: string;
}

const OFFICIAL_LEAGUES: LeagueConfig[] = [
  { id: 39, name: 'الدوري الإنجليزي الممتاز', nameEn: 'Premier League', country: 'إنجلترا', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 140, name: 'الدوري الإسباني (La Liga)', nameEn: 'La Liga', country: 'إسبانيا', flag: '🇪🇸' },
  { id: 61, name: 'الدوري الفرنسي (Ligue 1)', nameEn: 'Ligue 1', country: 'فرنسا', flag: '🇫🇷' },
  { id: 78, name: 'الدوري الألماني (Bundesliga)', nameEn: 'Bundesliga', country: 'ألمانيا', flag: '🇩🇪' },
  { id: 307, name: 'دوري روشن السعودي', nameEn: 'Saudi Pro League', country: 'السعودية', flag: '🇸🇦' },
  { id: 233, name: 'الدوري المصري الممتاز', nameEn: 'Egyptian Premier League', country: 'مصر', flag: '🇪🇬' },
];

export const FootballApiAdminView: React.FC = () => {
  const { language } = useGameStore();
  const { user } = useFirebase();
  const isAr = language === 'ar';

  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [syncingLeagueId, setSyncingLeagueId] = useState<number | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [activeMessage, setActiveMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [cachedData, setCachedData] = useState<{ leagues: any; clubs: any; players: any } | null>(null);

  const loadStatusAndCache = async () => {
    setLoadingStatus(true);
    try {
      const statusRes = await checkFootballApiStatus();
      setQuota(statusRes);

      const cacheRes = await fetchFootballLayer1Cache();
      setCachedData({
        leagues: cacheRes.leagues || {},
        clubs: cacheRes.clubs || {},
        players: cacheRes.players || {},
      });
      if (cacheRes.syncLogs && cacheRes.syncLogs.length > 0) {
        setSyncLogs(cacheRes.syncLogs);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatusAndCache();
  }, []);

  const handleSyncLeague = async (leagueId: number, leagueName: string) => {
    setSyncingLeagueId(leagueId);
    setActiveMessage(null);

    const result: SyncResult = await syncRealLeague(leagueId);
    setSyncingLeagueId(null);

    if (result.success) {
      confetti({ particleCount: 70, spread: 70 });
      setActiveMessage({
        type: 'success',
        text: `🎉 تمت مزامنة ${leagueName} بنجاح! تم استهلاك ${result.requestsUsed} طلبات فقط، والمتبقي من كوتتك: ${result.quotaRemaining} طلب.`,
      });
      // Refresh status and logs
      loadStatusAndCache();
    } else {
      setActiveMessage({
        type: result.quotaRemaining !== undefined && result.quotaRemaining <= 10 ? 'warning' : 'error',
        text: result.message || 'تعذر استكمال المزامنة. تأكد من توفر المفتاح وصلاحية الكوتا.',
      });
      if (result.log) {
        setSyncLogs(prev => [result.log, ...prev]);
      }
    }
  };

  const currentRequests = quota?.requests?.current || 0;
  const limitDay = quota?.requests?.limit_day || 100;
  const remainingSafe = Math.max(0, 90 - currentRequests);
  const usagePercentage = Math.min(100, Math.round((currentRequests / limitDay) * 100));

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
            <Database className="w-4 h-4" />
            <span>{isAr ? 'نظام مزامنة بيانات كرة القدم الحقيقية (API-Sports)' : 'API-Football Official Integration'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {isAr ? 'لوحة تحكم الكوتا والمزامنة الاقتصادية' : 'Economic Quota & Live Sync Dashboard'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isAr
              ? 'تصميم اقتصادي متطور بهندسة من طبقتين: جلب لمرة واحدة وتخزين في الطبقة المرجعية (Layer 1 Cache) مع التزام صارم بحد الكوتا (100 طلب/يوم) وهامش أمان عند 90 طلباً لمنع استنزاف الاشتراك.'
              : 'Two-Layer Data Architecture: One-time economical sync cached to Layer 1, strictly enforcing the 100 req/day cap with an automatic safety stop at 90.'}
          </p>
        </div>

        <button
          onClick={loadStatusAndCache}
          disabled={loadingStatus}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow transition active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{isAr ? 'تحديث الكوتا مجاناً (0 طلب)' : 'Refresh Quota Free (0 Cost)'}</span>
        </button>
      </div>

      {/* Quota & Guard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Daily Requests */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'استهلاك الكوتا اليومية' : 'Daily Quota Consumption'}</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{currentRequests}</span>
            <span className="text-sm font-bold text-slate-500">/ {limitDay} {isAr ? 'طلب' : 'reqs'}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                currentRequests >= 90 ? 'bg-red-500' : currentRequests >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 block">
            {isAr ? `المتبقي الآمن قبل حد الأمان: ${remainingSafe} طلبات` : `Safe remaining before 90 cutoff: ${remainingSafe}`}
          </span>
        </div>

        {/* Metric 2: Guard Policy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'سياسة حماية الكوتا' : 'Quota Guard Policy'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-black text-emerald-400 flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'مفعّل بنظام التوقف التلقائي عند 90' : 'Active: Auto-Aborts at 90 Reqs'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'الاستدعاءات تتم يدوياً بالتدريج فقط. يُمنع استدعاء قوائم اللاعبين بالجملة لحماية الكوتا تماماً.'
              : 'Direct API requests are manual and controlled. Mass scraping is strictly forbidden.'}
          </p>
        </div>

        {/* Metric 3: Layer Architecture */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'هندسة البيانات (طبقتان)' : 'Two-Layer Data Guard'}</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-purple-300 pt-1">
            <span>{isAr ? 'Layer 1: مرجعي للقراءة فقط' : 'Layer 1: Read-Only Cache'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'عند اختيار النادي، يتم الاستنساخ إلى Layer 2 وتطبّق التدريبات والـ VIP محلياً دون المساس بالبيانات الأصلية.'
              : 'Cloned into Layer 2 upon club appointment. Personal progression never taints official caches.'}
          </p>
        </div>

      </div>

      {/* Alert / Feedback message */}
      {activeMessage && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-bold ${
          activeMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : activeMessage.type === 'warning'
            ? 'bg-amber-950/40 border-amber-800 text-amber-300'
            : 'bg-red-950/40 border-red-800 text-red-300'
        }`}>
          {activeMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{activeMessage.text}</span>
        </div>
      )}

      {/* Manual Sync Control Panel (Official Leagues) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>{isAr ? 'المزامنة اليدوية للدوريات الرسمية المعتمدة (4 طلبات لكل دوري)' : 'Manual Sync by Official League (4 Reqs / League)'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'يشمل: جدول الترتيب (1) + قائمة الأندية (1) + الهدافين وصناع اللعب لمعايرة التقييم الواقعي (2).'
                : 'Includes: Standings (1) + Clubs (1) + Top Scorers/Assists calibration (2).'}
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
            {isAr ? 'الموسم المعتمد: 2025-2026' : 'Active Season: 2025-2026'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {OFFICIAL_LEAGUES.map((league) => {
            const isSyncing = syncingLeagueId === league.id;
            const isCached = Boolean(cachedData?.leagues?.[`league_${league.id}`]);

            return (
              <div 
                key={league.id}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{league.flag}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{isAr ? league.name : league.nameEn}</h4>
                      <span className="text-[11px] text-slate-400">{league.country} (ID: {league.id})</span>
                    </div>
                  </div>
                  {isCached && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                      {isAr ? 'مخزن محلياً' : 'Cached'}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-indigo-400 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>{isAr ? 'التكلفة: 4 طلبات' : 'Cost: 4 calls'}</span>
                  </span>

                  <button
                    onClick={() => handleSyncLeague(league.id, league.name)}
                    disabled={isSyncing || currentRequests >= 90}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      currentRequests >= 90
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isSyncing
                        ? 'bg-indigo-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? (isAr ? 'جارِ الجلب...' : 'Syncing...') : (isAr ? 'مزامنة الدوري' : 'Sync League')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>{isAr ? 'سجل العمليات والتدقيق (Sync Audit Logs)' : 'Sync Audit Logs'}</span>
          </h3>
          <span className="text-xs text-slate-500">{isAr ? 'تتبع فوري لكل استدعاء' : 'Real-time traceability'}</span>
        </div>

        {syncLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            {isAr ? 'لم تسجل أي عمليات مزامنة في هذه الجلسة بعد. انقر على مزامنة أي دوري بالأعلى للبدء.' : 'No sync audit logs recorded yet in this session.'}
          </div>
        ) : (
          <div className="space-y-2">
            {syncLogs.map((log, index) => (
              <div 
                key={log.id || index}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    log.status === 'success' ? 'bg-emerald-400' : log.status === 'aborted_quota' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  <span className="font-bold text-slate-200">{log.summary}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono">
                    {log.requestsUsed} {isAr ? 'طلب مستهلك' : 'reqs'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
