/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScoutSpecialty =
  | 'youth'
  | 'european'
  | 'south_american'
  | 'data'
  | 'technical'
  | 'physical';

export interface ScoutStaff {
  id: string;
  name: string;
  specialties: readonly ScoutSpecialty[];
  /** 0–100 */
  judgingAbility: number;
  potentialEvaluation: number;
  leagueKnowledge: number;
  adaptability: number;
  reliability: number;
}
