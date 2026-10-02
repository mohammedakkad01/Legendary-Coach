/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeededRandom } from '../../../engine/prng';
import { hashStringToSeed } from '../../shared/seed';

export type RecruitmentRngOperation =
  | 'knowledge_init'
  | 'knowledge_error'
  | 'confidence_adjust';

export function recruitmentRng(
  worldSeed: number,
  gameWeek: number,
  observerClubId: string,
  playerId: string,
  operation: RecruitmentRngOperation,
): SeededRandom {
  const key = `${worldSeed}|${gameWeek}|${observerClubId}|${playerId}|${operation}`;
  return new SeededRandom(hashStringToSeed(key));
}
