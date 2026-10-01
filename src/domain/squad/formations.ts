/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SINGLE SOURCE OF TRUTH for football formations.
 *
 * Before this file the slot labels lived in two hand-synchronised copies
 * (data/formationLayouts.ts and FORMATION_COORDINATES inside
 * TacticalBoardView.tsx). Both are now derived from FORMATION_DEFINITIONS.
 *
 * Slot order matters: `club.footballLineup[i]` is the player standing in
 * `slots[i]`. Slot 0 is always the goalkeeper.
 */

import type { FootballFormation, PlayerPosition } from '../../types/game';
import { normalizeSlot } from './positionTaxonomy';

export interface FormationSlot {
  readonly index: number;
  /** Tactical-board label — wider than PlayerPosition (LWB/RWB/LM/RM/LAM/RAM). */
  readonly label: string;
  /** Closest official PlayerPosition (null only for an unknown label). */
  readonly core: PlayerPosition | null;
  /** Pitch coordinates in %, (0,0) = top-left, attack pointing up. */
  readonly x: number;
  readonly y: number;
}

export interface FormationDefinition {
  readonly id: FootballFormation;
  readonly slots: readonly FormationSlot[];
}

type RawSlot = readonly [x: number, y: number, label: string];

const RAW: Record<FootballFormation, readonly RawSlot[]> = {
  '4-3-3': [
    [50, 88, 'GK'],
    [15, 70, 'RB'],
    [38, 72, 'CB'],
    [62, 72, 'CB'],
    [85, 70, 'LB'],
    [50, 52, 'CDM'],
    [30, 44, 'CM'],
    [70, 44, 'CM'],
    [18, 22, 'RW'],
    [50, 16, 'ST'],
    [82, 22, 'LW'],
  ],
  '4-4-2': [
    [50, 88, 'GK'],
    [15, 70, 'RB'],
    [38, 72, 'CB'],
    [62, 72, 'CB'],
    [85, 70, 'LB'],
    [16, 46, 'RM'],
    [38, 48, 'CM'],
    [62, 48, 'CM'],
    [84, 46, 'LM'],
    [38, 18, 'ST'],
    [62, 18, 'ST'],
  ],
  '4-2-3-1': [
    [50, 88, 'GK'],
    [15, 70, 'RB'],
    [38, 72, 'CB'],
    [62, 72, 'CB'],
    [85, 70, 'LB'],
    [35, 56, 'CDM'],
    [65, 56, 'CDM'],
    [20, 36, 'RAM'],
    [50, 34, 'CAM'],
    [80, 36, 'LAM'],
    [50, 16, 'ST'],
  ],
  '3-5-2': [
    [50, 88, 'GK'],
    [25, 72, 'CB'],
    [50, 74, 'CB'],
    [75, 72, 'CB'],
    [12, 48, 'RWB'],
    [36, 50, 'CM'],
    [50, 42, 'CAM'],
    [64, 50, 'CM'],
    [88, 48, 'LWB'],
    [38, 18, 'ST'],
    [62, 18, 'ST'],
  ],
  '5-3-2': [
    [50, 88, 'GK'],
    [12, 68, 'RWB'],
    [30, 74, 'CB'],
    [50, 75, 'CB'],
    [70, 74, 'CB'],
    [88, 68, 'LWB'],
    [30, 48, 'CM'],
    [50, 50, 'CDM'],
    [70, 48, 'CM'],
    [38, 18, 'ST'],
    [62, 18, 'ST'],
  ],
  '4-1-4-1': [
    [50, 88, 'GK'],
    [15, 70, 'RB'],
    [38, 72, 'CB'],
    [62, 72, 'CB'],
    [85, 70, 'LB'],
    [50, 56, 'CDM'],
    [16, 38, 'RM'],
    [38, 40, 'CM'],
    [62, 40, 'CM'],
    [84, 38, 'LM'],
    [50, 18, 'ST'],
  ],
  '3-4-3': [
    [50, 88, 'GK'],
    [25, 72, 'CB'],
    [50, 74, 'CB'],
    [75, 72, 'CB'],
    [15, 48, 'RM'],
    [38, 50, 'CM'],
    [62, 50, 'CM'],
    [85, 48, 'LM'],
    [20, 22, 'RW'],
    [50, 16, 'ST'],
    [80, 22, 'LW'],
  ],
};

const build = (id: FootballFormation, raw: readonly RawSlot[]): FormationDefinition => ({
  id,
  slots: raw.map(([x, y, label], index) => ({ index, label, core: normalizeSlot(label), x, y })),
});

export const FORMATION_IDS = Object.keys(RAW) as FootballFormation[];

export const FORMATION_DEFINITIONS: Readonly<Record<FootballFormation, FormationDefinition>> =
  Object.freeze(
    Object.fromEntries(FORMATION_IDS.map((id) => [id, build(id, RAW[id])])) as Record<
      FootballFormation,
      FormationDefinition
    >,
  );

export const DEFAULT_FORMATION: FootballFormation = '4-3-3';

export const isFootballFormation = (value: unknown): value is FootballFormation =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(RAW, value);

export const getFormation = (id: FootballFormation): FormationDefinition =>
  FORMATION_DEFINITIONS[id] ?? FORMATION_DEFINITIONS[DEFAULT_FORMATION];

/** Same shape the tactical board always used: `{ x, y, pos }` per slot. */
export const FORMATION_COORDINATES: Record<FootballFormation, { x: number; y: number; pos: string }[]> =
  Object.fromEntries(
    FORMATION_IDS.map((id) => [
      id,
      FORMATION_DEFINITIONS[id].slots.map((s) => ({ x: s.x, y: s.y, pos: s.label })),
    ]),
  ) as Record<FootballFormation, { x: number; y: number; pos: string }[]>;
