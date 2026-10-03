/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase D 1I — weekly recruitment orchestration (domain only, no Store).
 */

import type { GameEvent } from '../../livingWorld/types';
import type { AiClubWeeklyBatchEntry, AiClubWeeklyBatchResult } from '../aiClubs/weeklyAiTransferBatch';
import { runAiClubWeeklyTransferBatch } from '../aiClubs/weeklyAiTransferBatch';
import type { TransferTargetCandidate } from '../aiClubs/clubProfileTypes';
import { getClubRecruitmentFocus, runAcademyIntake } from '../academy/runAcademyIntake';
import type { AcademyIntakeClubContext, RecruitmentFocusConfig } from '../academy/academyTypes';
import type { RunAcademyIntakeResult } from '../academy/academyTypes';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { buildRumorsFromAiWeeklyBatch } from '../rumors/orchestration';
import type { AgentActivityCandidate, GenerateWeeklyRumorsResult } from '../rumors/generateRumors';
import type { RecruitmentPatch, RecruitmentWorldState } from '../types';
import { calendarWeekFromGameWeek } from '../world/gameWeek';
import {
  buildTransferWindowState,
  checkPermanentTransferAllowed,
  isTransferWindowOpen,
} from '../world/transferWindow';

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
  aiBatch: AiClubWeeklyBatchResult;
  rumors: GenerateWeeklyRumorsResult;
  academy?: RunAcademyIntakeResult;
  skippedReason?: WeeklyRecruitmentTickSkipReason;
}

export function shouldRunAcademyIntakeForCalendarWeek(calendarWeek: number): boolean {
  return (T.weeklyTick.intakeCalendarWeeks as readonly number[]).includes(calendarWeek);
}

export function runWeeklyRecruitmentTick(
  world: RecruitmentWorldState,
  input: RecruitmentWeeklyTickInput,
): RecruitmentWeeklyTickResult {
  const lastProcessed = world.weeklyTick.lastProcessedGameWeek;
  if (!input.force && input.gameWeek <= lastProcessed) {
    return {
      patches: [],
      events: [],
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
      skippedReason: 'already_processed_week',
    };
  }

  const calendarWeek = calendarWeekFromGameWeek(input.gameWeek);
  const transferWindow = buildTransferWindowState(calendarWeek);
  const transferWindowOpen = isTransferWindowOpen(transferWindow);
  const permanentTransferAllowed = checkPermanentTransferAllowed(transferWindow).allowed;

  const patches: RecruitmentPatch[] = [];
  if (world.gameWeek !== input.gameWeek) {
    patches.push({ kind: 'setGameWeek', gameWeek: input.gameWeek });
  }
  if (
    world.transferWindow.calendarWeek !== transferWindow.calendarWeek ||
    world.transferWindow.phase !== transferWindow.phase
  ) {
    patches.push({ kind: 'setTransferWindow', transferWindow });
  }

  const aiBatch = runAiClubWeeklyTransferBatch({
    worldSeed: input.worldSeed,
    gameWeek: input.gameWeek,
    transferWindowOpen,
    permanentTransferAllowed,
    clubs: input.aiClubEntries,
  });

  const rumors = buildRumorsFromAiWeeklyBatch({
    worldSeed: input.worldSeed,
    gameWeek: input.gameWeek,
    userClubId: input.userClubId,
    throttle: world.rumorThrottle,
    batch: aiBatch,
    candidatesByClubId: input.candidatesByClubId,
    agentActivities: input.agentActivities ?? [],
    allowFabricatedRumors: input.allowFabricatedRumors,
  });
  patches.push(...rumors.patches);

  const events: GameEvent[] = [...rumors.events];

  let academy: RunAcademyIntakeResult | undefined;
  if (
    input.academy?.enabled &&
    shouldRunAcademyIntakeForCalendarWeek(calendarWeek)
  ) {
    const focus =
      input.academy.focus ??
      getClubRecruitmentFocus(world, input.academy.club.clubId, input.academy.club.regionCode);
    academy = runAcademyIntake(world, {
      worldSeed: input.worldSeed,
      gameWeek: input.gameWeek,
      season: input.season,
      timestampIso: input.timestampIso,
      club: input.academy.club,
      focus,
    });
    patches.push(...academy.patches);
    events.push(...academy.events);
  }

  patches.push({
    kind: 'setWeeklyTickState',
    weeklyTick: { lastProcessedGameWeek: input.gameWeek },
  });

  return { patches, events, aiBatch, rumors, academy };
}
