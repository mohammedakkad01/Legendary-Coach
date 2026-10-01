/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referee profile (Phase 5). Pure data — consumed by the user-match engine only.
 * All traits are 0–100 (50 = neutral). varTendency is stored for Phase 6 VAR.
 */

export interface RefereeProfile {
  readonly id: string;
  readonly name: string;
  readonly nameEn: string;
  readonly strictness: number;
  readonly foulSensitivity: number;
  readonly cardTendency: number;
  readonly penaltyTendency: number;
  readonly advantageTendency: number;
  readonly varTendency: number;
}
