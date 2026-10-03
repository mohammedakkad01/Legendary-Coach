/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../livingWorld/types';
import type { AcademyIntakeStoryKind, AcademyIntakeProspectView } from './academyTypes';
import type { RecruitmentFocusConfig } from './academyTypes';
import type { SeededRandom } from '../../../engine/prng';
import type { PlayerPosition } from '../../../types/game';

const DEFENSE: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB'];

export function pickIntakeStoryKind(input: {
  rng: SeededRandom;
  focus: RecruitmentFocusConfig;
  position: PlayerPosition;
  age: number;
  truePotential: number;
  trueOverall: number;
  isLocal: boolean;
}): AcademyIntakeStoryKind {
  const gap = input.truePotential - input.trueOverall;
  if (input.isLocal && input.truePotential >= 82 && input.rng.nextChance(0.55)) {
    return 'local_wonderkid';
  }
  if (gap >= 14 && input.age >= 17 && input.rng.nextChance(0.5)) {
    return 'late_developer';
  }
  if (input.truePotential >= 84 && gap >= 10 && input.rng.nextChance(0.45)) {
    return 'local_wonderkid';
  }
  if (DEFENSE.includes(input.position) && input.focus.primaryAxis === 'position_group') {
    return input.focus.positionGroup === 'defense' || input.focus.positionGroup === 'goalkeepers'
      ? 'promising_defender'
      : 'steady_graduate';
  }
  if (input.focus.primaryAxis === 'technical') return 'technical_playmaker';
  if (input.focus.primaryAxis === 'physical') return 'physical_athlete';
  if (input.focus.primaryAxis === 'creative') return 'creative_flair';
  if (input.focus.primaryAxis === 'international' && !input.isLocal) return 'international_prospect';
  if (input.rng.nextChance(0.22)) return 'steady_graduate';
  return 'steady_graduate';
}

const STORY_COPY: Record<
  AcademyIntakeStoryKind,
  { titleKey: string; severity: GameEvent['severity'] }
> = {
  promising_defender: { titleKey: 'promising_defender', severity: 'medium' },
  technical_playmaker: { titleKey: 'technical_playmaker', severity: 'low' },
  physical_athlete: { titleKey: 'physical_athlete', severity: 'low' },
  late_developer: { titleKey: 'late_developer', severity: 'medium' },
  local_wonderkid: { titleKey: 'local_wonderkid', severity: 'high' },
  international_prospect: { titleKey: 'international_prospect', severity: 'medium' },
  creative_flair: { titleKey: 'creative_flair', severity: 'low' },
  steady_graduate: { titleKey: 'steady_graduate', severity: 'low' },
};

export function buildAcademyIntakeStoryEvent(input: {
  worldSeed: number;
  gameWeek: number;
  season: number;
  timestampIso: string;
  clubId: string;
  prospect: AcademyIntakeProspectView;
  index: number;
}): GameEvent {
  const meta = STORY_COPY[input.prospect.storyKind];
  return {
    id: `rec_academy_intake_${input.worldSeed}_${input.gameWeek}_${input.prospect.prospectId}_${input.index}`,
    type: 'recruitment.academy.intake_story',
    timestamp: input.timestampIso,
    season: input.season,
    clubId: input.clubId,
    playerId: input.prospect.prospectId,
    severity: meta.severity,
    context: {
      storyKind: input.prospect.storyKind,
      titleKey: meta.titleKey,
      displayName: input.prospect.displayName,
      position: input.prospect.position,
      potentialEstimate: input.prospect.potentialEstimate,
      potentialEstimateBand: input.prospect.potentialEstimateBand,
      estimatedOverall: input.prospect.estimatedOverall,
      intakeWeek: input.prospect.intakeWeek,
    },
  };
}
