/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase D 1I — weekly recruitment orchestration (domain only, no Store).
 *
 * Execution order:
 * 1. Idempotency guard
 * 2. Transfer window + calendar sync
 * 3. Scouting (watch + reports for user club)
 * 4. Negotiation submissions (caller-provided)
 * 5. AI club transfer batch (1E) + rumors/interests (1F)
 * 6. Loan search/scoring (1G, stateless results)
 * 7. Academy intake (1H, scheduled weeks, deduped)
 * 8. Orchestration completion marker on rumor throttle
 */

import type { GameEvent } from '../../livingWorld/types';
import type { AiClubWeeklyBatchEntry, AiClubWeeklyBatchResult } from '../aiClubs/weeklyAiTransferBatch';
import { runAiClubWeeklyTransferBatch } from '../aiClubs/weeklyAiTransferBatch';
import type { TransferTargetCandidate } from '../aiClubs/clubProfileTypes';
import { getClubRecruitmentFocus, runAcademyIntake } from '../academy/runAcademyIntake';
import type { AcademyIntakeClubContext, RecruitmentFocusConfig } from '../academy/academyTypes';
import type { RunAcademyIntakeResult } from '../academy/academyTypes';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { applyRecruitmentPatches } from '../reducer';
import { buildRumorsFromAiWeeklyBatch } from '../rumors/orchestration';
import type { AgentActivityCandidate, GenerateWeeklyRumorsResult } from '../rumors/generateRumors';
import { markOrchestrationWeekComplete, isOrchestrationWeekComplete, hasAcademyIntakeForWeek } from './orchestrationIdempotency';
import type { RecruitmentPatch, RecruitmentWorldState } from '../types';
import { searchLoanTargets } from '../loans/searchLoanTargets';
import type { SearchLoanTargetsInput, SearchLoanTargetsResult } from '../loans/loanTypes';
import type { SubmitOfferInput, NegotiationFlowResult } from '../negotiation/negotiationMachine';
import {
  buildCalendarSyncPatches,
  evaluateTransferWindowForWeek,
  type TransferWindowEvaluation,
} from './weeklySteps/transferWindowStep';
import { runWeeklyScoutingStep } from './weeklySteps/scoutingStep';
import { runWeeklyNegotiationStep } from './weeklySteps/negotiationStep';

export interface RecruitmentWeeklyTickInput {
  worldSeed: number;
  gameWeek: number;
  season: number;
  timestampIso: string;
  userClubId: string;
  aiClubEntries: readonly AiClubWeeklyBatchEntry[];
  candidatesByClubId: Record<string, readonly TransferTargetCandidate[]>;
  agentActivities?: readonly AgentActivityCandidate[];
  allowFabricatedRumors?: boolean;
  /** Optional negotiation offers to advance during this week (1C). */
  negotiationSubmissions?: readonly SubmitOfferInput[];
  /** Optional loan searches (1G) — results only, no persistence. */
  loanSearches?: readonly SearchLoanTargetsInput[];
  /** When set and `enabled`, may run academy intake on configured calendar weeks. */
  academy?: {
    enabled: boolean;
    club: AcademyIntakeClubContext;
    focus?: RecruitmentFocusConfig;
  };
  /** Bypass weekly idempotency guard (tests only). */
  force?: boolean;
}

export type WeeklyRecruitmentTickSkipReason = 'already_processed_week';

export interface RecruitmentWeeklyTickResult {
  patches: RecruitmentPatch[];
  events: GameEvent[];
  skippedReason?: WeeklyRecruitmentTickSkipReason;
  transferWindow: TransferWindowEvaluation;
  scouting: { matchesWatched: number; reportsCompleted: number };
  negotiations: { processed: number; results: NegotiationFlowResult[] };
  aiBatch: AiClubWeeklyBatchResult;
  rumors: GenerateWeeklyRumorsResult;
  loans: SearchLoanTargetsResult[];
  academy?: RunAcademyIntakeResult;
}

export function shouldRunAcademyIntakeForCalendarWeek(calendarWeek: number): boolean {
  return (T.weeklyTick.intakeCalendarWeeks as readonly number[]).includes(calendarWeek);
}

function emptyTickResult(
  world: RecruitmentWorldState,
  transferWindow: TransferWindowEvaluation,
  skippedReason: WeeklyRecruitmentTickSkipReason,
): RecruitmentWeeklyTickResult {
  return {
    patches: [],
    events: [],
    skippedReason,
    transferWindow,
    scouting: { matchesWatched: 0, reportsCompleted: 0 },
    negotiations: { processed: 0, results: [] },
    aiBatch: {
      processedClubIds: [],
      skippedClubIds: [],
      targetsByClubId: {},
      capApplied: {
        maxClubsPerWeek: T.aiClubs.maxClubsPerWeek,
        maxCandidatesEvaluatedPerClub: T.aiClubs.maxCandidatesEvaluatedPerClub,
        maxTargetsPerClub: T.aiClubs.maxTargetsPerClub,
      },
    },
    rumors: {
      rumors: [],
      interests: [],
      patches: [],
      events: [],
      throttle: world.rumorThrottle,
    },
    loans: [],
  };
}

export function runWeeklyRecruitmentTick(
  world: RecruitmentWorldState,
  input: RecruitmentWeeklyTickInput,
): RecruitmentWeeklyTickResult {
  const windowEval = evaluateTransferWindowForWeek(input.gameWeek);

  if (!input.force && isOrchestrationWeekComplete(world.rumorThrottle, input.gameWeek)) {
    return emptyTickResult(world, windowEval, 'already_processed_week');
  }

  const patches: RecruitmentPatch[] = [];
  const events: GameEvent[] = [];

  patches.push(...buildCalendarSyncPatches(world, input.gameWeek, windowEval.transferWindow));
  let working = applyRecruitmentPatches(world, patches);

  const scouting = runWeeklyScoutingStep(working, {
    userClubId: input.userClubId,
    gameWeek: input.gameWeek,
    season: input.season,
    timestampIso: input.timestampIso,
    worldSeed: input.worldSeed,
  });
  patches.push(...scouting.patches);
  events.push(...scouting.events);
  working = scouting.world;

  const negotiationSubmissions = input.negotiationSubmissions ?? [];
  const negotiations = runWeeklyNegotiationStep(working, negotiationSubmissions);
  patches.push(...negotiations.patches);
  events.push(...negotiations.events);
  working = negotiations.world;

  const aiBatch = runAiClubWeeklyTransferBatch({
    worldSeed: input.worldSeed,
    gameWeek: input.gameWeek,
    transferWindowOpen: windowEval.transferWindowOpen,
    permanentTransferAllowed: windowEval.permanentTransferAllowed,
    clubs: input.aiClubEntries,
  });

  const rumors = buildRumorsFromAiWeeklyBatch({
    worldSeed: input.worldSeed,
    gameWeek: input.gameWeek,
    userClubId: input.userClubId,
    throttle: working.rumorThrottle,
    batch: aiBatch,
    candidatesByClubId: input.candidatesByClubId,
    agentActivities: input.agentActivities ?? [],
    allowFabricatedRumors: input.allowFabricatedRumors,
  });
  patches.push(...rumors.patches);
  events.push(...rumors.events);
  working = applyRecruitmentPatches(working, rumors.patches);

  const loans: SearchLoanTargetsResult[] = (input.loanSearches ?? []).map((search) =>
    searchLoanTargets(search),
  );

  let academy: RunAcademyIntakeResult | undefined;
  const calendarWeek = windowEval.transferWindow.calendarWeek;
  const academyClubId = input.academy?.club.clubId;
  const academyAlreadyDone =
    academyClubId !== undefined &&
    hasAcademyIntakeForWeek(working.academyIntakeRecords, input.gameWeek, academyClubId);

  if (
    input.academy?.enabled &&
    shouldRunAcademyIntakeForCalendarWeek(calendarWeek) &&
    !academyAlreadyDone
  ) {
    const focus =
      input.academy.focus ??
      getClubRecruitmentFocus(working, input.academy.club.clubId, input.academy.club.regionCode);
    academy = runAcademyIntake(working, {
      worldSeed: input.worldSeed,
      gameWeek: input.gameWeek,
      season: input.season,
      timestampIso: input.timestampIso,
      club: input.academy.club,
      focus,
    });
    patches.push(...academy.patches);
    events.push(...academy.events);
    working = applyRecruitmentPatches(working, academy.patches);
  }

  const completedThrottle = markOrchestrationWeekComplete(working.rumorThrottle, input.gameWeek);
  patches.push({ kind: 'setRumorThrottle', throttle: completedThrottle });

  return {
    patches,
    events,
    transferWindow: windowEval,
    scouting: {
      matchesWatched: scouting.matchesWatched,
      reportsCompleted: scouting.reportsCompleted,
    },
    negotiations: {
      processed: negotiationSubmissions.length,
      results: negotiations.results,
    },
    aiBatch,
    rumors,
    loans,
    academy,
  };
}
