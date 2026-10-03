/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInitialKnowledge } from '../knowledge/knowledgeState';
import type { RecruitmentPatch, RecruitmentWorldState } from '../types';
import type {
  RunAcademyIntakeInput,
  RunAcademyIntakeResult,
  AcademyIntakeRecord,
} from './academyTypes';
import { generateAcademyIntakeProspects } from './intakeGenerator';
import { buildAcademyIntakeStoryEvent } from './intakeStories';
import { normalizeRecruitmentFocus } from './recruitmentFocus';

export function getClubRecruitmentFocus(
  world: RecruitmentWorldState,
  clubId: string,
  regionCode = 'SA',
): import('./academyTypes').RecruitmentFocusConfig {
  const stored = world.academyFocusByClubId[clubId];
  return normalizeRecruitmentFocus(stored, regionCode);
}

export function patchesForRecruitmentFocus(
  clubId: string,
  focus: import('./academyTypes').RecruitmentFocusConfig,
): RecruitmentPatch[] {
  return [{ kind: 'setAcademyFocus', clubId, focus: normalizeRecruitmentFocus(focus) }];
}

export function runAcademyIntake(
  world: RecruitmentWorldState,
  input: RunAcademyIntakeInput,
): RunAcademyIntakeResult {
  const focus = normalizeRecruitmentFocus(input.focus, input.club.regionCode);
  const generated = generateAcademyIntakeProspects({
    worldSeed: input.worldSeed,
    gameWeek: input.gameWeek,
    club: input.club,
    focus,
    maxProspects: input.maxProspects,
  });

  const patches: RecruitmentPatch[] = [];
  const events = generated.map((row, index) => {
    patches.push({ kind: 'upsertWorldPlayer', player: row.truth });
    const knowledge = createInitialKnowledge({
      worldSeed: input.worldSeed,
      gameWeek: input.gameWeek,
      observerClubId: input.club.clubId,
      playerId: row.truth.playerId,
      isOwnSquad: true,
      truth: row.truth,
    });
    patches.push({ kind: 'upsertKnowledge', knowledge });

    const record: AcademyIntakeRecord = {
      id: `academy_intake_${input.worldSeed}_${input.gameWeek}_${row.view.prospectId}`,
      clubId: input.club.clubId,
      prospectId: row.view.prospectId,
      intakeWeek: input.gameWeek,
      storyKind: row.view.storyKind,
      prospect: row.view,
    };
    patches.push({ kind: 'appendAcademyIntakeRecord', record });

    return buildAcademyIntakeStoryEvent({
      worldSeed: input.worldSeed,
      gameWeek: input.gameWeek,
      season: input.season,
      timestampIso: input.timestampIso,
      clubId: input.club.clubId,
      prospect: row.view,
      index,
    });
  });

  return { prospects: generated.map((g) => g.view), patches, events };
}
