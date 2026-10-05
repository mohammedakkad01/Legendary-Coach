/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club } from '../../../types/game';
import type { GameEvent } from '../../livingWorld/types';
import { getClubRecruitmentFocus, runAcademyIntake } from '../../recruitment/academy/runAcademyIntake';
import { hasAcademyIntakeForWeek } from '../../recruitment/tick/orchestrationIdempotency';
import type { RecruitmentPatch, RecruitmentWorldState } from '../../recruitment/types';
import type { ClubSystemModifiers } from '../types';

export interface DelegatedYouthIntakeResult {
  patches: RecruitmentPatch[];
  events: GameEvent[];
  reasonCodes: string[];
  summaryCode: string;
  ok: boolean;
}

export function runDelegatedYouthIntake(params: {
  world: RecruitmentWorldState;
  club: Club;
  modifiers: ClubSystemModifiers;
  gameWeek: number;
  season: number;
  timestampIso: string;
  quality: number;
}): DelegatedYouthIntakeResult {
  const reasonCodes: string[] = [];
  const clubId = params.club.id;

  if (hasAcademyIntakeForWeek(params.world.academyIntakeRecords, params.gameWeek, clubId)) {
    reasonCodes.push('intake_skipped_duplicate_week');
    return {
      patches: [],
      events: [],
      reasonCodes,
      summaryCode: 'delegation_youth_skipped',
      ok: false,
    };
  }

  const focus = getClubRecruitmentFocus(params.world, clubId);
  const capacityBase = Math.max(1, Math.round(1 + params.quality * 2));
  const maxProspects = Math.min(4, capacityBase);

  const intake = runAcademyIntake(params.world, {
    worldSeed: params.world.worldSeed,
    gameWeek: params.gameWeek,
    season: params.season,
    timestampIso: params.timestampIso,
    club: {
      clubId,
      youthAcademyLevel: params.club.facilities.youthAcademyLevel,
      recruitmentInvestment: params.modifiers.academyRecruitmentInvestment,
      coachingQuality: params.modifiers.academyCoachingQuality,
      facilitiesScore: params.club.facilities.trainingGroundLevel * 10,
      clubReputation: Math.round(params.club.finances.reputation / 100),
      regionCode: 'SA',
    },
    focus,
    maxProspects,
  });

  reasonCodes.push(`intake_count_${intake.prospects.length}`);

  return {
    patches: intake.patches,
    events: intake.events,
    reasonCodes,
    summaryCode: 'delegation_youth_intake',
    ok: intake.prospects.length > 0,
  };
}
