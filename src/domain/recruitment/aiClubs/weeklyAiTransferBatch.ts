/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { hashStringToSeed } from '../../shared/seed';
import { SeededRandom } from '../../../engine/prng';
import { identifyTransferTargets } from './identifyTransferTargets';
import type {
  AiClubFinanceContext,
  AiClubTransferProfile,
  IdentifiedTransferTarget,
  SquadNeedContext,
  TransferTargetCandidate,
} from './clubProfileTypes';

export interface AiClubWeeklyBatchEntry {
  clubId: string;
  profile: AiClubTransferProfile;
  finances: AiClubFinanceContext;
  squadNeeds: SquadNeedContext;
  candidates: readonly TransferTargetCandidate[];
}

export interface AiClubWeeklyBatchInput {
  worldSeed: number;
  gameWeek: number;
  transferWindowOpen: boolean;
  permanentTransferAllowed: boolean;
  clubs: readonly AiClubWeeklyBatchEntry[];
  maxClubsPerWeek?: number;
  maxTargetsPerClub?: number;
  maxCandidatesEvaluatedPerClub?: number;
}

export interface AiClubWeeklyBatchResult {
  processedClubIds: readonly string[];
  skippedClubIds: readonly string[];
  targetsByClubId: Record<string, readonly IdentifiedTransferTarget[]>;
  capApplied: {
    maxClubsPerWeek: number;
    maxCandidatesEvaluatedPerClub: number;
    maxTargetsPerClub: number;
  };
}

function shuffleClubOrder(worldSeed: number, gameWeek: number, clubIds: readonly string[]): string[] {
  const rng = new SeededRandom(hashStringToSeed(`ai_weekly_batch_${worldSeed}_${gameWeek}`));
  const ids = [...clubIds];
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = rng.nextRange(0, i);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function runAiClubWeeklyTransferBatch(input: AiClubWeeklyBatchInput): AiClubWeeklyBatchResult {
  const maxClubs = input.maxClubsPerWeek ?? T.aiClubs.maxClubsPerWeek;
  const maxTargets = input.maxTargetsPerClub ?? T.aiClubs.maxTargetsPerClub;
  const maxCandidates =
    input.maxCandidatesEvaluatedPerClub ?? T.aiClubs.maxCandidatesEvaluatedPerClub;

  const byId = new Map(input.clubs.map((c) => [c.clubId, c]));
  const ordered = shuffleClubOrder(input.worldSeed, input.gameWeek, input.clubs.map((c) => c.clubId));
  const processedClubIds: string[] = [];
  const skippedClubIds: string[] = [];
  const targetsByClubId: Record<string, readonly IdentifiedTransferTarget[]> = {};

  for (const clubId of ordered) {
    if (processedClubIds.length >= maxClubs) {
      skippedClubIds.push(clubId);
      continue;
    }
    const entry = byId.get(clubId);
    if (!entry) continue;

    const cappedCandidates = entry.candidates.slice(0, maxCandidates);
    const targets = identifyTransferTargets({
      worldSeed: input.worldSeed,
      gameWeek: input.gameWeek,
      actingClubId: clubId,
      profile: entry.profile,
      finances: entry.finances,
      squadNeeds: entry.squadNeeds,
      transferWindowOpen: input.transferWindowOpen,
      permanentTransferAllowed: input.permanentTransferAllowed,
      candidates: cappedCandidates,
      maxTargets,
    });

    targetsByClubId[clubId] = targets;
    processedClubIds.push(clubId);
  }

  return {
    processedClubIds,
    skippedClubIds,
    targetsByClubId,
    capApplied: {
      maxClubsPerWeek: maxClubs,
      maxCandidatesEvaluatedPerClub: maxCandidates,
      maxTargetsPerClub: maxTargets,
    },
  };
}
