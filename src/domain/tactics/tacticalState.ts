/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TacticalState — versioned, fully-resolved tactics.
 *
 * The persisted shape stays `FootballTactics` (old saves keep loading; the new
 * sliders are optional there). `resolveTacticalState` turns any FootballTactics
 * — old or new — into a complete, clamped, versioned TacticalState that the
 * engine, Best Tactics and the AI all consume identically.
 *
 * Pure: no React, no Firebase, no store.
 */

import { TACTICAL_DEFAULTS as D, TACTICAL_STATE_VERSION } from '../../config/gameTuning';
import type { FootballTactics } from '../../types/game';
import { clamp } from '../shared/math';
import type { TacticalState } from './tacticalTypes';

const slider = (value: number | undefined, fallback: number): number =>
  Math.round(clamp(typeof value === 'number' && Number.isFinite(value) ? value : fallback, D.sliderMin, D.sliderMax));

/** Enum → default lookups tolerate unknown/legacy enum values (fall back to the middle). */
const pick = <K extends string>(table: Readonly<Record<K, number>>, key: string | undefined, fallback = 50): number =>
  (key !== undefined && key in table ? table[key as K] : fallback);

export function resolveTacticalState(tactics: FootballTactics): TacticalState {
  const { tacticalStateVersion: _v, ...rest } = tactics;
  void _v;
  return {
    ...rest,
    version: TACTICAL_STATE_VERSION,
    defensiveLine: slider(tactics.defensiveLine, pick(D.defensiveLineFromPressing, tactics.pressing)),
    defensiveIntensity: slider(tactics.defensiveIntensity, pick(D.defensiveIntensityFromPressing, tactics.pressing)),
    attackingIntensity: slider(tactics.attackingIntensity, pick(D.attackingIntensityFromMentality, tactics.mentality)),
    counterAttacking: slider(tactics.counterAttacking, pick(D.counterAttackingFromPassing, tactics.passing, 40)),
    possessionFocus: slider(tactics.possessionFocus, pick(D.possessionFocusFromPassing, tactics.passing)),
    directPlay: slider(tactics.directPlay, pick(D.directPlayFromPassing, tactics.passing, 45)),
    timeWasting: slider(tactics.timeWasting, pick(D.timeWastingFromMentality, tactics.mentality, 0)),
  };
}

/** Back to the persisted shape (extended fields written explicitly + version stamp). */
export function toFootballTactics(state: TacticalState): FootballTactics {
  const { version, ...rest } = state;
  return { ...rest, tacticalStateVersion: version };
}

/**
 * Upgrade whatever was saved to the current version. Older saves (no version,
 * no sliders) are resolved with the derived defaults; a save written by a NEWER
 * app version is passed through resolve as well (unknown fields are kept,
 * known sliders are re-clamped) rather than rejected.
 */
export function migrateTacticalState(raw: FootballTactics): TacticalState {
  return resolveTacticalState(raw);
}
