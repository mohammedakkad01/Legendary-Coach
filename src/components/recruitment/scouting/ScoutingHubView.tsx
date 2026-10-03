/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScoutingHubView — Scouting Center Dashboard (Phase D)
 * Scout list, active assignments, scouting reports inbox, and observed cards.
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Eye,
  FileText,
  Clock,
  Award,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { useGameStore } from '../../../state/useGameStore';
import type { Player } from '../../../types/game';
import type { ObservedPlayerView } from '../../../domain/recruitment/types';
import { getObservedPlayerView, knowledgeToObservedView } from '../../../domain/recruitment/knowledge/observedView';
import { createInitialKnowledge } from '../../../domain/recruitment/knowledge/knowledgeState';
import { createScoutingAssignment, runCompleteScoutingReport } from '../../../domain/recruitment/scouting/orchestration';
import { ScoutConfidenceMeter } from '../shared/ScoutConfidenceMeter';
import { RangeDisplay } from '../shared/RangeDisplay';
import { ScoutAssignmentModal } from './ScoutAssignmentModal';
import { ScoutReportDetailModal } from './ScoutReportDetailModal';

interface ScoutingHubViewProps {
  onStartNegotiation: (player: Player) => void;
}

export const ScoutingHubView: React.FC<ScoutingHubViewProps> = ({ onStartNegotiation }) => {
  const { club, language, recruitmentWorld, scoutMarket, saveId, livingWorld } = useGameStore();
  const isAr = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'targets' | 'assignments' | 'scouts' | 'reports'>('targets');
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [inspectingPlayer, setInspectingPlayer] = useState<Player | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const scouts = recruitmentWorld?.scoutNetwork ?? [];
  const assignments = recruitmentWorld?.scoutingAssignments ?? [];
  const reports = recruitmentWorld?.scoutingReports ?? [];

  // Filter assignments & reports for user club
  const clubAssignments = useMemo(
    () => assignments.filter((a) => a.observerClubId === club.id),
    [assignments, club.id],
  );

  const clubReports = useMemo(
    () => reports.filter((r) => r.observerClubId === club.id),
    [reports, club.id],
  );

  // Helper to obtain safe observed view for any player without reading truth directly
  const getPlayerObservedView = (player: Player): ObservedPlayerView => {
    if (!recruitmentWorld) {
      return {
        playerId: player.id,
        observerClubId: club.id,
        confidencePct: 20,
        ratingRange: { min: player.overall - 4, max: player.overall + 4 },
        potentialBand: { min: player.potential - 5, max: player.potential + 5 },
        valueRange: { min: Math.round(player.marketValue * 0.8), max: Math.round(player.marketValue * 1.2) },
        revealedGroups: ['technical'],
        estimatedRating: player.overall,
        estimatedPotential: player.potential,
        estimatedValue: player.marketValue,
      };
    }

    const existing = getObservedPlayerView(recruitmentWorld, club.id, player.id);
    if (existing) return existing;

    // Build initial knowledge safely if not existing
    const truth = recruitmentWorld.worldPlayers[player.id];
    if (truth) {
      const knowledge = createInitialKnowledge({
        worldSeed: recruitmentWorld.worldSeed,
        gameWeek: recruitmentWorld.gameWeek,
        observerClubId: club.id,
        playerId: player.id,
        isOwnSquad: false,
        truth,
      });
      return knowledgeToObservedView(knowledge);
    }

    return {
      playerId: player.id,
      observerClubId: club.id,
      confidencePct: 18,
      ratingRange: { min: player.overall - 4, max: player.overall + 4 },
      potentialBand: { min: player.potential - 5, max: player.potential + 5 },
      valueRange: { min: Math.round(player.marketValue * 0.8), max: Math.round(player.marketValue * 1.2) },
      revealedGroups: ['technical'],
      estimatedRating: player.overall,
      estimatedPotential: player.potential,
      estimatedValue: player.marketValue,
    };
  };

  const handleCreateAssignment = (params: {
    scoutId: string;
    targetKind: 'player' | 'league' | 'region' | 'role_focus';
    playerId?: string;
    leagueId?: string;
    regionId?: string;
    roleFocus?: string;
  }) => {
    if (!recruitmentWorld) {
      return { ok: false, message: isAr ? 'نظام الكشافة غير متاح' : 'Scouting system unavailable' };
    }

    const res = createScoutingAssignment(recruitmentWorld, {
      observerClubId: club.id,
      scoutId: params.scoutId,
      targetKind: params.targetKind,
      playerId: params.playerId,
      leagueId: params.leagueId,
      regionId: params.regionId,
      roleFocus: params.roleFocus,
      gameWeek: recruitmentWorld.gameWeek,
      assignmentId: `asgn_${Date.now()}`,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: isAr
          ? res.code === 'max_assignments'
            ? 'وصلت للحد الأقصى للتكليفات النشطة'
            : 'تعذر إنشاء التكليف'
          : `Failed: ${res.code}`,
      };
    }

    useGameStore.setState((state) => ({
      recruitmentWorld: {
        ...state.recruitmentWorld,
        scoutingAssignments: [
          ...state.recruitmentWorld.scoutingAssignments,
          res.assignment!,
        ],
      },
    }));

    setFeedbackToast(isAr ? 'تم إرسال الكشاف للمهمة بنجاح!' : 'Scout deployed successfully!');
    return { ok: true, message: isAr ? 'تم بدء المهمة' : 'Assignment started' };
  };

  const handleRequestDeeperReport = (playerId: string) => {
    if (!recruitmentWorld) {
      return { ok: false, message: isAr ? 'تعذر إعداد التقرير' : 'Unable to run report' };
    }

    // Find active assignment for player or create one
    let targetAssignment = recruitmentWorld.scoutingAssignments.find(
      (a) => a.playerId === playerId && a.observerClubId === club.id,
    );

    if (!targetAssignment) {
      const defaultScout = scouts[0];
      if (!defaultScout) {
        return { ok: false, message: isAr ? 'لا يوجد كشاف متاح' : 'No scout available' };
      }
      const created = createScoutingAssignment(recruitmentWorld, {
        observerClubId: club.id,
        scoutId: defaultScout.id,
        targetKind: 'player',
        playerId,
        gameWeek: recruitmentWorld.gameWeek,
        assignmentId: `asgn_${Date.now()}`,
      });
      if (!created.ok || !created.assignment) {
        return { ok: false, message: isAr ? 'فشل تعيين الكشاف' : 'Failed to assign scout' };
      }
      targetAssignment = created.assignment;
    }

    const flow = runCompleteScoutingReport(recruitmentWorld, {
      observerClubId: club.id,
      assignmentId: targetAssignment.id,
      gameWeek: recruitmentWorld.gameWeek,
      reportId: `rep_${Date.now()}`,
      timestampIso: new Date().toISOString(),
      season: livingWorld?.currentSeason ?? 1,
    });

    if (!flow.ok) {
      return {
        ok: false,
        message: isAr ? 'تعذر إكمال التقرير الآن' : `Scouting report failed: ${flow.code}`,
      };
    }

    useGameStore.setState({ recruitmentWorld: flow.world });
    setFeedbackToast(
      isAr
        ? 'تم تحديث التقرير وتوسيع معرفة الكشافين باللاعب!'
        : 'Scouting report updated and attributes revealed!',
    );
    return { ok: true, message: isAr ? 'تم تجهيز التقرير بنجاح' : 'Report generated' };
  };

  return (
    <div className="space-y-6" id="scouting_hub_view">
      {/* Subtab Header Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveSubTab('targets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'targets'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isAr ? 'أهداف المراقبة' : 'Scouted Targets'}</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">
              {scoutMarket.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('assignments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'assignments'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isAr ? 'المهام والتكليفات' : 'Assignments'}</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">
              {clubAssignments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isAr ? 'صندوق التقارير' : 'Report Inbox'}</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">
              {clubReports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('scouts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'scouts'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'طاقم الكشافة' : 'Scout Staff'}</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px]">
              {scouts.length}
            </span>
          </button>
        </div>

        <button
          onClick={() => setIsAssignmentModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'تكليف كشاف جديد' : 'New Assignment'}</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{feedbackToast}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="text-emerald-400 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* SUBTAB 1: SCOUTED TARGETS (Observed Cards Grid) */}
      {activeSubTab === 'targets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scoutMarket.map((player) => {
            const observed = getPlayerObservedView(player);

            return (
              <div
                key={player.id}
                className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-white">{player.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {player.realTeam ?? 'Free Agent'} • {player.age} {isAr ? 'سنة' : 'yrs'} • {player.nationality}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-extrabold text-xs">
                      {player.position}
                    </span>
                  </div>

                  {/* Confidence Meter */}
                  <div className="mt-2.5">
                    <ScoutConfidenceMeter
                      confidencePct={observed.confidencePct}
                      size="sm"
                      isAr={isAr}
                    />
                  </div>

                  {/* Observed Ranges (Never true values!) */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-slate-800/80 text-center">
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">
                        {isAr ? 'المستوى' : 'Rating'}
                      </div>
                      <RangeDisplay
                        min={observed.ratingRange.min}
                        max={observed.ratingRange.max}
                        type="rating"
                        className="text-xs text-amber-400"
                      />
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">
                        {isAr ? 'الإمكانية' : 'Potential'}
                      </div>
                      <RangeDisplay
                        min={observed.potentialBand.min}
                        max={observed.potentialBand.max}
                        type="rating"
                        className="text-xs text-emerald-400"
                      />
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">
                        {isAr ? 'القيمة' : 'Value'}
                      </div>
                      <RangeDisplay
                        min={observed.valueRange.min}
                        max={observed.valueRange.max}
                        type="currency"
                        isAr={isAr}
                        className="text-[11px] text-sky-400"
                      />
                    </div>
                  </div>

                  {/* Revealed Tags Pill Preview */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {observed.revealedGroups.map((g) => (
                      <span
                        key={g}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium"
                      >
                        ✓ {g}
                      </span>
                    ))}
                    {observed.revealedGroups.length < 7 && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] text-slate-500 font-medium border border-slate-800/60">
                        🔒 +{7 - observed.revealedGroups.length} {isAr ? 'مغلق' : 'locked'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setInspectingPlayer(player)}
                    className="flex-1 py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isAr ? 'تفاصيل التقرير' : 'Full Report'}</span>
                  </button>

                  <button
                    onClick={() => onStartNegotiation(player)}
                    className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md cursor-pointer"
                  >
                    {isAr ? 'تفاوض' : 'Negotiate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 2: ACTIVE ASSIGNMENTS */}
      {activeSubTab === 'assignments' && (
        <div className="space-y-3">
          {clubAssignments.length === 0 ? (
            <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">
                {isAr ? 'لا توجد تكليفات كشافة جارية حالياً' : 'No active scouting assignments'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isAr
                  ? 'أرسل كشافيك لمراقبة لاعبين محددين أو دوريات أو مراكز معينة للحصول على تقارير تفصيلية.'
                  : 'Deploy scouts to observe specific players, leagues, or role focuses to discover targets.'}
              </p>
              <button
                onClick={() => setIsAssignmentModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
              >
                {isAr ? 'بدء تكليف كشاف' : 'Start an Assignment'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clubAssignments.map((asgn) => {
                const scout = scouts.find((s) => s.id === asgn.scoutId);
                const targetPlayer = scoutMarket.find((p) => p.id === asgn.playerId);

                return (
                  <div
                    key={asgn.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {asgn.targetKind.toUpperCase()} ASSIGNMENT
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              asgn.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {asgn.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {isAr ? 'الكشاف:' : 'Scout:'}{' '}
                          <span className="text-slate-200 font-semibold">
                            {scout?.name ?? asgn.scoutId}
                          </span>
                        </p>
                      </div>

                      <div className="text-right text-[11px] font-mono text-slate-400">
                        {isAr ? `أسبوع ${asgn.createdWeek}` : `Wk ${asgn.createdWeek}`}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1">
                      <div className="text-slate-300 font-bold">
                        {asgn.targetKind === 'player' &&
                          (targetPlayer
                            ? `${targetPlayer.name} (${targetPlayer.position} — ${targetPlayer.realTeam ?? 'Free Agent'})`
                            : asgn.playerId)}
                        {asgn.targetKind === 'role_focus' && `Focus: ${asgn.roleFocus}`}
                        {asgn.targetKind === 'league' && `League: ${asgn.leagueId}`}
                        {asgn.targetKind === 'region' && `Region: ${asgn.regionId}`}
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                        <span>
                          {isAr ? 'مباريات تمت مشاهدتها:' : 'Matches watched:'}{' '}
                          <strong className="text-sky-400 font-mono">{asgn.matchesWatched}</strong>
                        </span>
                        <span>
                          {isAr ? 'تقارير مكتملة:' : 'Reports:'}{' '}
                          <strong className="text-emerald-400 font-mono">
                            {asgn.reportsCompleted}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {asgn.playerId && targetPlayer && (
                      <button
                        onClick={() => setInspectingPlayer(targetPlayer)}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>{isAr ? 'عرض تقرير اللاعب' : 'View Target Report'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: REPORT INBOX */}
      {activeSubTab === 'reports' && (
        <div className="space-y-3">
          {clubReports.length === 0 ? (
            <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">
                {isAr ? 'صندوق التقارير فارغ' : 'Scouting Report Inbox is empty'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isAr
                  ? 'ستصلك تقارير الكشافة فور انتهاء مباريات المراقبة أو طلبك لتقارير أعمق.'
                  : 'Reports will arrive here once scouts observe fixtures or when you request deeper insights.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clubReports.map((report) => {
                const targetPlayer = scoutMarket.find((p) => p.id === report.playerId);

                return (
                  <div
                    key={report.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-black text-white">
                          {targetPlayer?.name ?? report.playerId}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {isAr ? 'الكشاف:' : 'Scout:'} {report.scoutId} •{' '}
                          {isAr ? `أسبوع ${report.gameWeek}` : `Week ${report.gameWeek}`}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                        +{report.confidenceDeltaApplied}% {isAr ? 'دقة' : 'confidence'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">
                          {isAr ? 'تقدير المستوى' : 'Stated Overall'}
                        </div>
                        <span className="font-mono font-extrabold text-amber-400">
                          ~{report.statedOverall}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">
                          {isAr ? 'تقدير الإمكانية' : 'Stated Potential Mid'}
                        </div>
                        <span className="font-mono font-extrabold text-emerald-400">
                          ~{report.statedPotentialMid}
                        </span>
                      </div>
                    </div>

                    {targetPlayer && (
                      <button
                        onClick={() => setInspectingPlayer(targetPlayer)}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                        <span>{isAr ? 'فحص الملف الكامل' : 'Inspect Full Profile'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: SCOUT STAFF */}
      {activeSubTab === 'scouts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scouts.map((scout) => {
            const activeAsgn = assignments.filter((a) => a.scoutId === scout.id && a.status === 'active');

            return (
              <div
                key={scout.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">{scout.name}</h4>
                    <p className="text-xs text-sky-400 font-semibold">{scout.specialties.join(', ')}</p>
                  </div>
                  <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1 text-xs font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>{scout.judgingAbility}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-slate-400 font-medium">
                    {isAr ? 'التكليفات الجارية:' : 'Active Assignments:'}
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {activeAsgn.length} {isAr ? 'مهمة' : 'active'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREATE SCOUTING ASSIGNMENT */}
      <ScoutAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        scouts={scouts}
        availablePlayers={scoutMarket}
        onAssign={handleCreateAssignment}
        isAr={isAr}
      />

      {/* MODAL 2: INSPECT SCOUT REPORT DETAIL */}
      {inspectingPlayer && (
        <ScoutReportDetailModal
          isOpen={!!inspectingPlayer}
          onClose={() => setInspectingPlayer(null)}
          player={inspectingPlayer}
          observedView={getPlayerObservedView(inspectingPlayer)}
          latestReport={clubReports.find((r) => r.playerId === inspectingPlayer.id)}
          onRequestDeeperReport={handleRequestDeeperReport}
          onStartNegotiation={onStartNegotiation}
          isAr={isAr}
        />
      )}
    </div>
  );
};
