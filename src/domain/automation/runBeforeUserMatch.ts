/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, FootballTactics, LeagueStanding, PreMatchData } from '../../types/game';
import type { LivingWorldState } from '../livingWorld/types';
import { runPreMatchAnalyst } from '../assistant/preMatch/runPreMatchAnalyst';
import { wrapBestTacticsAsRecommendation } from '../assistant/bestTactics/wrapBestTacticsRecommendation';
import { computeInformationConfidence } from '../assistant/confidence/computeConfidence';
import { buildBestTacticsInput } from '../../hooks/bestTactics/bestTacticsInput';
import { deriveOpponentProfile } from '../tactics/bestTactics';
import type { FootballFormation } from '../../types/game';
import {
  planBenchSubstitutes,
  applyBenchSubstitutePlan,
  planRotationLineup,
  buildRotationApplyMoves,
  applySquadMovePlan,
  lineupUnchanged,
  tacticsUnchanged,
} from './squadApply';
import { createSquadState } from '../squad/squadStateAdapter';
import { playersAboveRestedInjuryBaseline, RECOVERY_SESSION_COIN_COST } from './recoveryRisk';
import type { InjuryRiskContext } from '../playerLife/injuryRisk';
import { computeInMatchInjuryProbability } from '../playerLife/injuryRisk';
import { computeExpectedMinutes } from '../playerLife/playingTimeExpectation';
import type {
  AutomationExecutionStamps,
  AutomationFeatureId,
  AutomationReport,
  AutomationRunResult,
  AutomationSettings,
} from './types';
import { buildAutomationGameEvent, createAutomationReport } from './reports';
import type { GameSaveData } from '../../types/save';

export interface BeforeMatchAutomationInput {
  settings: AutomationSettings;
  stamps: AutomationExecutionStamps;
  club: Club;
  livingWorld: LivingWorldState;
  preMatch: PreMatchData | null;
  maxSubstitutes: number;
  allowedFormations?: readonly FootballFormation[];
  analyticsDepartmentLevel: number;
  leagueStandings: readonly LeagueStanding[];
  saveSnapshot: Pick<GameSaveData, 'matchHistory' | 'simulatedMatchdays' | 'leagueFixtures'>;
  injuryCtx: Omit<InjuryRiskContext, 'minutesThisMatch'>;
  timestampIso: string;
  gameWeek: number;
}

export type BeforeMatchEffect =
  | { feature: 'bench' | 'rotation'; kind: 'squad_apply'; club: Club }
  | { feature: 'recovery'; kind: 'recovery_apply' }
  | { kind: 'none' };

export interface BeforeMatchAutomationOutput {
  result: AutomationRunResult;
  effects: BeforeMatchEffect[];
  events: ReturnType<typeof buildAutomationGameEvent>[];
  reports: AutomationReport[];
  stamps: AutomationExecutionStamps;
  prefsUndo: import('./types').AutomationUndoSnapshot | null;
}

function matchdayDone(stamps: AutomationExecutionStamps, feature: AutomationFeatureId, matchday: number): boolean {
  return stamps.lastMatchdayByFeature[feature] === matchday;
}

function stampMatchday(
  stamps: AutomationExecutionStamps,
  feature: AutomationFeatureId,
  matchday: number,
): AutomationExecutionStamps {
  return {
    ...stamps,
    lastMatchdayByFeature: { ...stamps.lastMatchdayByFeature, [feature]: matchday },
  };
}

export function runBeforeUserMatchAutomations(input: BeforeMatchAutomationInput): BeforeMatchAutomationOutput {
  const reports: AutomationReport[] = [];
  const events: ReturnType<typeof buildAutomationGameEvent>[] = [];
  const effects: BeforeMatchEffect[] = [];
  const appliedFeatureIds: AutomationFeatureId[] = [];
  let stamps = { ...input.stamps };
  let prefsUndo: import('./types').AutomationUndoSnapshot | null = null;

  const preMatch = input.preMatch;
  const matchday = preMatch?.fixture.matchday;
  const season = input.livingWorld.currentSeason;
  const clubId = input.club.id;

  const pushReport = (report: AutomationReport, event: ReturnType<typeof buildAutomationGameEvent>) => {
    reports.push(report);
    events.push(event);
  };

  // --- tactics (7) ---
  if (input.settings.tactics.enabled) {
    const feature: AutomationFeatureId = 'tactics';
    const mode = 'suggest' as const;
    if (matchday !== undefined && matchdayDone(stamps, feature, matchday)) {
      pushReport(
        createAutomationReport({
          id: `auto_${feature}_${matchday}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_ran_matchday',
          reasonCodes: ['already_ran_matchday'],
          undoable: false,
          matchday,
          season,
          createdAt: input.timestampIso,
          changeSummary: {},
        }),
        buildAutomationGameEvent({
          reportId: `auto_${feature}_${matchday}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_ran_matchday',
          reasonCodes: ['already_ran_matchday'],
          matchday,
          changeSummary: {},
          undoable: false,
        }),
      );
    } else if (!preMatch) {
      pushReport(
        createAutomationReport({
          id: `auto_${feature}_skip_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_no_preview',
          reasonCodes: ['no_preview'],
          undoable: false,
          season,
          createdAt: input.timestampIso,
          changeSummary: {},
        }),
        buildAutomationGameEvent({
          reportId: `auto_${feature}_skip_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_no_preview',
          reasonCodes: ['no_preview'],
          changeSummary: {},
          undoable: false,
        }),
      );
    } else {
      const oppProfile = deriveOpponentProfile(preMatch.opponentClub);
      const btInput = buildBestTacticsInput(
        input.club,
        oppProfile,
        input.maxSubstitutes,
        input.allowedFormations,
      );
      const infoConf = computeInformationConfidence({
        isScouted: !!preMatch.isScouted,
        scoutAccuracy: preMatch.scoutAccuracy ?? 70,
        analyticsDepartmentLevel: input.analyticsDepartmentLevel,
        opponentScoutingSamples:
          input.livingWorld.opponentTacticalScouting?.[preMatch.fixture.opponentClubId]?.samples ?? 0,
        opponentStarters: preMatch.opponentStarters,
      });
      const wrapped = wrapBestTacticsAsRecommendation(btInput, infoConf);
      const reasonCodes: string[] = [];
      let summaryCode = 'automation_tactics_suggested';
      if (!wrapped.raw.ok) {
        reasonCodes.push(wrapped.raw.error.code);
        summaryCode = 'automation_tactics_skipped';
        pushReport(
          createAutomationReport({
            id: `auto_tactics_${matchday}_${season}`,
            feature: 'tactics',
            mode,
            status: 'skipped',
            summaryCode,
            reasonCodes,
            undoable: false,
            matchday,
            season,
            createdAt: input.timestampIso,
            changeSummary: {},
            tacticsRecommendation: null,
          }),
          buildAutomationGameEvent({
            reportId: `auto_tactics_${matchday}_${season}`,
            clubId,
            season,
            timestampIso: input.timestampIso,
            feature: 'tactics',
            mode,
            status: 'skipped',
            summaryCode,
            reasonCodes,
            matchday,
            changeSummary: {},
            undoable: false,
          }),
        );
      } else {
        const rec = wrapped.recommendation;
        pushReport(
          createAutomationReport({
            id: `auto_tactics_${matchday}_${season}`,
            feature: 'tactics',
            mode,
            status: 'suggested',
            summaryCode,
            reasonCodes: rec?.reasonCodes ?? [],
            undoable: false,
            matchday,
            season,
            createdAt: input.timestampIso,
            changeSummary: {},
            tacticsRecommendation: rec,
          }),
          buildAutomationGameEvent({
            reportId: `auto_tactics_${matchday}_${season}`,
            clubId,
            season,
            timestampIso: input.timestampIso,
            feature: 'tactics',
            mode,
            status: 'suggested',
            summaryCode,
            reasonCodes: rec?.reasonCodes ?? [],
            matchday,
            changeSummary: {},
            undoable: false,
          }),
        );
        if (matchday !== undefined) stamps = stampMatchday(stamps, feature, matchday);
      }
    }
  }

  // --- opponent (8) ---
  if (input.settings.opponent.enabled) {
    const feature: AutomationFeatureId = 'opponent';
    const mode = 'suggest' as const;
    if (matchday !== undefined && matchdayDone(stamps, feature, matchday)) {
      pushReport(
        createAutomationReport({
          id: `auto_${feature}_${matchday}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_ran_matchday',
          reasonCodes: ['already_ran_matchday'],
          undoable: false,
          matchday,
          season,
          createdAt: input.timestampIso,
          changeSummary: {},
        }),
        buildAutomationGameEvent({
          reportId: `auto_${feature}_${matchday}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_ran_matchday',
          reasonCodes: ['already_ran_matchday'],
          matchday,
          changeSummary: {},
          undoable: false,
        }),
      );
    } else if (!preMatch) {
      pushReport(
        createAutomationReport({
          id: `auto_opponent_skip_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_no_preview',
          reasonCodes: ['no_next_fixture'],
          undoable: false,
          season,
          createdAt: input.timestampIso,
          changeSummary: {},
        }),
        buildAutomationGameEvent({
          reportId: `auto_opponent_skip_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_no_preview',
          reasonCodes: ['no_next_fixture'],
          changeSummary: {},
          undoable: false,
        }),
      );
    } else {
      const oppId = preMatch.fixture.opponentClubId;
      const oppScout = input.livingWorld.opponentTacticalScouting?.[oppId];
      const standing = input.leagueStandings.find((s) => s.clubId === oppId);
      const analysis = runPreMatchAnalyst({
        preMatch,
        analyticsDepartmentLevel: input.analyticsDepartmentLevel,
        opponentScouting: oppScout,
        opponentStanding: standing,
        assignedReferee: null,
      });
      const findingCodes = [
        ...analysis.strengths.map((f) => f.code),
        ...analysis.weaknesses.map((f) => f.code),
        ...analysis.defensiveVulnerabilities.map((f) => f.code),
      ];
      pushReport(
        createAutomationReport({
          id: `auto_opponent_${matchday}_${season}`,
          feature,
          mode,
          status: 'suggested',
          summaryCode: 'automation_opponent_dossier',
          reasonCodes: [`findings_${findingCodes.length}`, `confidence_${analysis.overallConfidence}`],
          undoable: false,
          matchday,
          season,
          createdAt: input.timestampIso,
          changeSummary: { playerIds: [oppId] },
          preMatchAnalysis: analysis,
        }),
        buildAutomationGameEvent({
          reportId: `auto_opponent_${matchday}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'suggested',
          summaryCode: 'automation_opponent_dossier',
          reasonCodes: [`findings_${findingCodes.length}`, `confidence_${analysis.overallConfidence}`],
          matchday,
          changeSummary: { playerIds: [oppId] },
          undoable: false,
        }),
      );
      if (matchday !== undefined) stamps = stampMatchday(stamps, feature, matchday);
    }
  }

  // --- bench (1) ---
  if (input.settings.bench.enabled && matchday !== undefined) {
    const feature: AutomationFeatureId = 'bench';
    const mode = input.settings.bench.mode;
    const already = matchdayDone(stamps, feature, matchday);
    if (already && mode === 'apply') {
      pushReport(
        createAutomationReport({
          id: `auto_bench_${matchday}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_applied_matchday',
          reasonCodes: ['already_applied_matchday'],
          undoable: false,
          matchday,
          season,
          createdAt: input.timestampIso,
          changeSummary: {},
        }),
        buildAutomationGameEvent({
          reportId: `auto_bench_${matchday}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_applied_matchday',
          reasonCodes: ['already_applied_matchday'],
          matchday,
          changeSummary: {},
          undoable: false,
        }),
      );
    } else if (!already) {
      const plan = planBenchSubstitutes(input.club, input.maxSubstitutes);
      const tacticsBefore = { ...input.club.footballTactics };
      const lineupBefore = [...input.club.footballLineup];
      if (!plan.ok) {
        pushReport(
          createAutomationReport({
            id: `auto_bench_${matchday}_${season}`,
            feature,
            mode,
            status: 'skipped',
            summaryCode: 'automation_bench_skipped',
            reasonCodes: plan.reasonCodes,
            undoable: false,
            matchday,
            season,
            createdAt: input.timestampIso,
            changeSummary: { excludedPlayerIds: plan.excludedPlayerIds },
          }),
          buildAutomationGameEvent({
            reportId: `auto_bench_${matchday}_${season}`,
            clubId,
            season,
            timestampIso: input.timestampIso,
            feature,
            mode,
            status: 'skipped',
            summaryCode: 'automation_bench_skipped',
            reasonCodes: plan.reasonCodes,
            matchday,
            changeSummary: { excludedPlayerIds: plan.excludedPlayerIds },
            undoable: false,
          }),
        );
        stamps = stampMatchday(stamps, feature, matchday);
      } else {
        const changeSummary = {
          playerIds: [...plan.targetSubstituteIds],
          leavingSubstituteIds: [...plan.leavingSubstituteIds],
          excludedPlayerIds: [...plan.excludedPlayerIds],
        };
        if (mode === 'suggest') {
          pushReport(
            createAutomationReport({
              id: `auto_bench_${matchday}_${season}`,
              feature,
              mode,
              status: 'suggested',
              summaryCode: 'automation_bench_suggested',
              reasonCodes: ['bench_pick_substitutes'],
              undoable: false,
              matchday,
              season,
              createdAt: input.timestampIso,
              changeSummary,
            }),
            buildAutomationGameEvent({
              reportId: `auto_bench_${matchday}_${season}`,
              clubId,
              season,
              timestampIso: input.timestampIso,
              feature,
              mode,
              status: 'suggested',
              summaryCode: 'automation_bench_suggested',
              reasonCodes: ['bench_pick_substitutes'],
              matchday,
              changeSummary,
              undoable: false,
            }),
          );
          stamps = stampMatchday(stamps, feature, matchday);
        } else {
          const applied = applyBenchSubstitutePlan(
            input.club,
            input.maxSubstitutes,
            plan.targetSubstituteIds,
          );
          if (!applied.ok) {
            pushReport(
              createAutomationReport({
                id: `auto_bench_${matchday}_${season}`,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_bench_skipped',
                reasonCodes: [applied.reasonCode],
                undoable: false,
                matchday,
                season,
                createdAt: input.timestampIso,
                changeSummary,
              }),
              buildAutomationGameEvent({
                reportId: `auto_bench_${matchday}_${season}`,
                clubId,
                season,
                timestampIso: input.timestampIso,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_bench_skipped',
                reasonCodes: [applied.reasonCode],
                matchday,
                changeSummary,
                undoable: false,
              }),
            );
          } else if (
            !lineupUnchanged(lineupBefore, applied.club.footballLineup) ||
            !tacticsUnchanged(tacticsBefore, (applied.club as Club).footballTactics)
          ) {
            pushReport(
              createAutomationReport({
                id: `auto_bench_${matchday}_${season}`,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_bench_skipped',
                reasonCodes: ['xi_or_tactics_changed'],
                undoable: false,
                matchday,
                season,
                createdAt: input.timestampIso,
                changeSummary,
              }),
              buildAutomationGameEvent({
                reportId: `auto_bench_${matchday}_${season}`,
                clubId,
                season,
                timestampIso: input.timestampIso,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_bench_skipped',
                reasonCodes: ['xi_or_tactics_changed'],
                matchday,
                changeSummary,
                undoable: false,
              }),
            );
          } else {
            effects.push({ feature: 'bench', kind: 'squad_apply', club: applied.club as Club });
            prefsUndo = {
              feature: 'bench',
              footballLineup: lineupBefore,
              footballBench: [...input.club.footballBench],
              appliedAtIso: input.timestampIso,
            };
            appliedFeatureIds.push(feature);
            pushReport(
              createAutomationReport({
                id: `auto_bench_${matchday}_${season}`,
                feature,
                mode,
                status: 'applied',
                summaryCode: 'automation_bench_applied',
                reasonCodes: ['bench_pick_substitutes'],
                undoable: true,
                matchday,
                season,
                createdAt: input.timestampIso,
                changeSummary,
              }),
              buildAutomationGameEvent({
                reportId: `auto_bench_${matchday}_${season}`,
                clubId,
                season,
                timestampIso: input.timestampIso,
                feature,
                mode,
                status: 'applied',
                summaryCode: 'automation_bench_applied',
                reasonCodes: ['bench_pick_substitutes'],
                matchday,
                changeSummary,
                undoable: true,
              }),
            );
            stamps = stampMatchday(stamps, feature, matchday);
          }
        }
      }
    }
  }

  // --- rotation (2) ---
  if (input.settings.rotation.enabled && matchday !== undefined) {
    const feature: AutomationFeatureId = 'rotation';
    const mode = input.settings.rotation.mode;
    const already = matchdayDone(stamps, feature, matchday);
    if (already && mode === 'apply') {
      pushReport(
        createAutomationReport({
          id: `auto_rotation_${matchday}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_applied_matchday',
          reasonCodes: ['already_applied_matchday'],
          undoable: false,
          matchday,
          season,
          createdAt: input.timestampIso,
          changeSummary: {},
        }),
        buildAutomationGameEvent({
          reportId: `auto_rotation_${matchday}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_already_applied_matchday',
          reasonCodes: ['already_applied_matchday'],
          matchday,
          changeSummary: {},
          undoable: false,
        }),
      );
    } else if (!already) {
      const rot = planRotationLineup(input.club, input.maxSubstitutes);
      const tacticsBefore = { ...input.club.footballTactics };
      const lineupBefore = [...input.club.footballLineup];
      const benchBefore = [...input.club.footballBench];
      const annotationCodes: string[] = [];
      for (const diff of rot.slotDiffs.slice(0, 5)) {
        const p = input.club.footballSquad.find((x) => x.id === diff.toPlayerId);
        if (p) {
          const inj = computeInMatchInjuryProbability(p, { ...input.injuryCtx, minutesThisMatch: 90 });
          const { role, expected } = computeExpectedMinutes(p, input.club.footballLineup, input.club.footballBench);
          annotationCodes.push(`slot_${diff.slotIndex}_inj_${Math.round(inj * 1000)}`);
          annotationCodes.push(`slot_${diff.slotIndex}_role_${role}_exp_${expected}`);
        }
      }
      if (!rot.ok) {
        pushReport(
          createAutomationReport({
            id: `auto_rotation_${matchday}_${season}`,
            feature,
            mode,
            status: 'skipped',
            summaryCode: 'automation_rotation_skipped',
            reasonCodes: rot.reasonCodes,
            undoable: false,
            matchday,
            season,
            createdAt: input.timestampIso,
            changeSummary: { excludedPlayerIds: rot.excludedPlayerIds },
          }),
          buildAutomationGameEvent({
            reportId: `auto_rotation_${matchday}_${season}`,
            clubId,
            season,
            timestampIso: input.timestampIso,
            feature,
            mode,
            status: 'skipped',
            summaryCode: 'automation_rotation_skipped',
            reasonCodes: rot.reasonCodes,
            matchday,
            changeSummary: { excludedPlayerIds: rot.excludedPlayerIds },
            undoable: false,
          }),
        );
        stamps = stampMatchday(stamps, feature, matchday);
      } else {
        const changeSummary = {
          slotDiffs: rot.slotDiffs,
          excludedPlayerIds: rot.excludedPlayerIds,
          playerIds: rot.targetSlots.filter((id) => id !== ''),
        };
        if (mode === 'suggest') {
          pushReport(
            createAutomationReport({
              id: `auto_rotation_${matchday}_${season}`,
              feature,
              mode,
              status: 'suggested',
              summaryCode: 'automation_rotation_suggested',
              reasonCodes: ['optimize_lineup', ...annotationCodes],
              undoable: false,
              matchday,
              season,
              createdAt: input.timestampIso,
              changeSummary,
            }),
            buildAutomationGameEvent({
              reportId: `auto_rotation_${matchday}_${season}`,
              clubId,
              season,
              timestampIso: input.timestampIso,
              feature,
              mode,
              status: 'suggested',
              summaryCode: 'automation_rotation_suggested',
              reasonCodes: ['optimize_lineup', ...annotationCodes],
              matchday,
              changeSummary,
              undoable: false,
            }),
          );
          stamps = stampMatchday(stamps, feature, matchday);
        } else {
          const { state } = createSquadState(input.club, { maxSubstitutes: input.maxSubstitutes });
          const moves = buildRotationApplyMoves(state, rot.targetSlots);
          const applied = applySquadMovePlan(input.club, input.maxSubstitutes, moves);
          if (!applied.ok) {
            pushReport(
              createAutomationReport({
                id: `auto_rotation_${matchday}_${season}`,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_rotation_skipped',
                reasonCodes: [applied.reasonCode],
                undoable: false,
                matchday,
                season,
                createdAt: input.timestampIso,
                changeSummary,
              }),
              buildAutomationGameEvent({
                reportId: `auto_rotation_${matchday}_${season}`,
                clubId,
                season,
                timestampIso: input.timestampIso,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_rotation_skipped',
                reasonCodes: [applied.reasonCode],
                matchday,
                changeSummary,
                undoable: false,
              }),
            );
          } else if (!tacticsUnchanged(tacticsBefore, (applied.club as Club).footballTactics)) {
            pushReport(
              createAutomationReport({
                id: `auto_rotation_${matchday}_${season}`,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_rotation_skipped',
                reasonCodes: ['tactics_changed'],
                undoable: false,
                matchday,
                season,
                createdAt: input.timestampIso,
                changeSummary,
              }),
              buildAutomationGameEvent({
                reportId: `auto_rotation_${matchday}_${season}`,
                clubId,
                season,
                timestampIso: input.timestampIso,
                feature,
                mode,
                status: 'skipped',
                summaryCode: 'automation_rotation_skipped',
                reasonCodes: ['tactics_changed'],
                matchday,
                changeSummary,
                undoable: false,
              }),
            );
          } else {
            effects.push({ feature: 'rotation', kind: 'squad_apply', club: applied.club as Club });
            prefsUndo = {
              feature: 'rotation',
              footballLineup: lineupBefore,
              footballBench: benchBefore,
              appliedAtIso: input.timestampIso,
            };
            appliedFeatureIds.push(feature);
            pushReport(
              createAutomationReport({
                id: `auto_rotation_${matchday}_${season}`,
                feature,
                mode,
                status: 'applied',
                summaryCode: 'automation_rotation_applied',
                reasonCodes: ['optimize_lineup', ...annotationCodes],
                undoable: true,
                matchday,
                season,
                createdAt: input.timestampIso,
                changeSummary,
              }),
              buildAutomationGameEvent({
                reportId: `auto_rotation_${matchday}_${season}`,
                clubId,
                season,
                timestampIso: input.timestampIso,
                feature,
                mode,
                status: 'applied',
                summaryCode: 'automation_rotation_applied',
                reasonCodes: ['optimize_lineup', ...annotationCodes],
                matchday,
                changeSummary,
                undoable: true,
              }),
            );
            stamps = stampMatchday(stamps, feature, matchday);
          }
        }
      }
    }
  }

  // --- recovery (3) before match if not run this game week ---
  if (input.settings.recovery.enabled && stamps.lastRecoveryGameWeek !== input.gameWeek) {
    const feature: AutomationFeatureId = 'recovery';
    const mode = input.settings.recovery.mode;
    const squadPool = input.club.footballSquad.filter((p) => {
      const inXi = input.club.footballLineup.includes(p.id);
      const onBench = input.club.footballBench.includes(p.id);
      return inXi || onBench;
    });
    const atRisk = playersAboveRestedInjuryBaseline(squadPool, input.injuryCtx);
    if (atRisk.length === 0) {
      pushReport(
        createAutomationReport({
          id: `auto_recovery_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['recovery_not_needed'],
          undoable: false,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { wholeSquad: true },
        }),
        buildAutomationGameEvent({
          reportId: `auto_recovery_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['recovery_not_needed'],
          gameWeek: input.gameWeek,
          changeSummary: { wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: false,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    } else if (mode === 'suggest') {
      pushReport(
        createAutomationReport({
          id: `auto_recovery_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'suggested',
          summaryCode: 'automation_recovery_suggested',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          undoable: false,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
        }),
        buildAutomationGameEvent({
          reportId: `auto_recovery_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'suggested',
          summaryCode: 'automation_recovery_suggested',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          gameWeek: input.gameWeek,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: false,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    } else if (input.club.finances.coins < RECOVERY_SESSION_COIN_COST) {
      pushReport(
        createAutomationReport({
          id: `auto_recovery_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['insufficient_coins'],
          undoable: false,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
        }),
        buildAutomationGameEvent({
          reportId: `auto_recovery_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['insufficient_coins'],
          gameWeek: input.gameWeek,
          changeSummary: { wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: false,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    } else {
      effects.push({ feature: 'recovery', kind: 'recovery_apply' });
      appliedFeatureIds.push(feature);
      pushReport(
        createAutomationReport({
          id: `auto_recovery_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'applied',
          summaryCode: 'automation_recovery_applied',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          undoable: true,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
        }),
        buildAutomationGameEvent({
          reportId: `auto_recovery_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'applied',
          summaryCode: 'automation_recovery_applied',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          gameWeek: input.gameWeek,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: true,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    }
  }

  return {
    result: { reports, appliedFeatureIds },
    effects,
    events,
    reports,
    stamps,
    prefsUndo,
  };
}
