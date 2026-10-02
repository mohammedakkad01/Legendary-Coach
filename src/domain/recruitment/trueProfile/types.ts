/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INTERNAL — recruitment ground truth (sparse). Not exported from recruitment/index.ts.
 */

/** Minimum recruitment truth overlay; canonical Player / PlayerLife remain elsewhere. */
export interface TrueWorldPlayer {
  playerId: string;
  trueOverall: number;
  truePotential: number;
  trueMarketValue: number;
  attributeTruth: {
    technical: number;
    physical: number;
    mental: number;
  };
  /** Hidden injury concern severity 0–100 (observed via knowledge only). */
  injuryConcernTruth: number;
}
