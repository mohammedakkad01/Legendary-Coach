/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase D 1H — academy intake & recruitment focus (public-safe types).
 */

import type { PlayerPosition } from '../../../types/game';

export type RecruitmentFocusAxis =
  | 'balanced'
  | 'position_group'
  | 'technical'
  | 'physical'
  | 'creative'
  | 'high_potential'
  | 'local_talent'
  | 'international';

export type RecruitmentPositionGroup = 'goalkeepers' | 'defense' | 'midfield' | 'attack';

export interface RecruitmentFocusConfig {
  primaryAxis: RecruitmentFocusAxis;
  positionGroup?: RecruitmentPositionGroup;
  /** Home region / nationality code for local focus (placeholder until Phase E). */
  homeRegionCode?: string;
  /** 0–100 — how strongly the axis skews generation weights. */
  intensity: number;
}

export type AcademyIntakeStoryKind =
  | 'promising_defender'
  | 'technical_playmaker'
  | 'physical_athlete'
  | 'late_developer'
  | 'local_wonderkid'
  | 'international_prospect'
  | 'creative_flair'
  | 'steady_graduate';

/** Placeholder club inputs until Phase E facilities wiring. */
export interface AcademyIntakeClubContext {
  clubId: string;
  youthAcademyLevel: number;
  recruitmentInvestment: number;
  coachingQuality: number;
  facilitiesScore: number;
  clubReputation: number;
  regionCode: string;
}

/** UI / domain safe intake row — no hidden true potential. */
export interface AcademyIntakeProspectView {
  prospectId: string;
  clubId: string;
  displayName: string;
  age: number;
  nationality: string;
  nationalityFlag: string;
  position: PlayerPosition;
  potentialEstimate: number;
  potentialEstimateBand: number;
  estimatedOverall: number;
  storyKind: AcademyIntakeStoryKind;
  intakeWeek: number;
}

export interface AcademyIntakeRecord {
  id: string;
  clubId: string;
  prospectId: string;
  intakeWeek: number;
  storyKind: AcademyIntakeStoryKind;
  /** Snapshot of public fields at intake time. */
  prospect: AcademyIntakeProspectView;
}

export interface RunAcademyIntakeInput {
  worldSeed: number;
  gameWeek: number;
  season: number;
  timestampIso: string;
  club: AcademyIntakeClubContext;
  focus: RecruitmentFocusConfig;
  /** Optional cap override; defaults from tuning + academy level. */
  maxProspects?: number;
}

export interface RunAcademyIntakeResult {
  prospects: AcademyIntakeProspectView[];
  patches: import('../types').RecruitmentPatch[];
  events: import('../../livingWorld/types').GameEvent[];
}
