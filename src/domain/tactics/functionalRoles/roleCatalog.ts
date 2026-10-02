/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Functional role catalog (data-driven weights + positional tendencies).
 */

import type { PlayerPosition } from '../../../types/game';

export type FunctionalRoleId =
  | 'gk_sweeper_keeper'
  | 'fb_fullback'
  | 'fb_wingback'
  | 'fb_inverted'
  | 'cb_ball_playing'
  | 'cb_stopper'
  | 'cb_cover'
  | 'mf_anchor'
  | 'mf_deep_playmaker'
  | 'mf_box_to_box'
  | 'mf_mezzala'
  | 'w_inside_forward'
  | 'w_inverted_winger'
  | 'w_traditional_winger'
  | 'st_advanced'
  | 'st_target'
  | 'st_pressing'
  | 'st_false_nine';

export type RoleAttrKey = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'goalkeeping';

export interface FunctionalRoleDefinition {
  readonly id: FunctionalRoleId;
  readonly preferredSlots: readonly string[];
  readonly corePositions: readonly PlayerPosition[];
  readonly attributeWeights: Readonly<Partial<Record<RoleAttrKey, number>>>;
}

export const FUNCTIONAL_ROLE_CATALOG: readonly FunctionalRoleDefinition[] = [
  {
    id: 'gk_sweeper_keeper',
    preferredSlots: ['GK'],
    corePositions: ['GK'],
    attributeWeights: { goalkeeping: 0.55, passing: 0.25, pace: 0.1, defending: 0.1 },
  },
  {
    id: 'fb_fullback',
    preferredSlots: ['LB', 'RB', 'LWB', 'RWB'],
    corePositions: ['LB', 'RB'],
    attributeWeights: { defending: 0.35, pace: 0.25, passing: 0.2, physical: 0.2 },
  },
  {
    id: 'fb_wingback',
    preferredSlots: ['LWB', 'RWB', 'LB', 'RB'],
    corePositions: ['LB', 'RB'],
    attributeWeights: { pace: 0.35, passing: 0.25, defending: 0.25, physical: 0.15 },
  },
  {
    id: 'fb_inverted',
    preferredSlots: ['LB', 'RB'],
    corePositions: ['LB', 'RB'],
    attributeWeights: { passing: 0.3, dribbling: 0.25, defending: 0.25, pace: 0.2 },
  },
  {
    id: 'cb_ball_playing',
    preferredSlots: ['CB'],
    corePositions: ['CB'],
    attributeWeights: { passing: 0.35, defending: 0.35, physical: 0.2, pace: 0.1 },
  },
  {
    id: 'cb_stopper',
    preferredSlots: ['CB'],
    corePositions: ['CB'],
    attributeWeights: { defending: 0.45, physical: 0.35, pace: 0.1, passing: 0.1 },
  },
  {
    id: 'cb_cover',
    preferredSlots: ['CB'],
    corePositions: ['CB'],
    attributeWeights: { defending: 0.35, pace: 0.3, physical: 0.2, passing: 0.15 },
  },
  {
    id: 'mf_anchor',
    preferredSlots: ['CDM'],
    corePositions: ['CDM', 'CM'],
    attributeWeights: { defending: 0.35, passing: 0.3, physical: 0.25, pace: 0.1 },
  },
  {
    id: 'mf_deep_playmaker',
    preferredSlots: ['CDM', 'CM'],
    corePositions: ['CDM', 'CM'],
    attributeWeights: { passing: 0.45, defending: 0.2, dribbling: 0.15, physical: 0.2 },
  },
  {
    id: 'mf_box_to_box',
    preferredSlots: ['CM', 'CDM'],
    corePositions: ['CM', 'CDM'],
    attributeWeights: { passing: 0.25, defending: 0.25, physical: 0.25, pace: 0.15, shooting: 0.1 },
  },
  {
    id: 'mf_mezzala',
    preferredSlots: ['CM', 'CAM', 'LAM', 'RAM'],
    corePositions: ['CM', 'CAM'],
    attributeWeights: { dribbling: 0.3, passing: 0.3, shooting: 0.2, pace: 0.2 },
  },
  {
    id: 'w_inside_forward',
    preferredSlots: ['LW', 'RW', 'LAM', 'RAM'],
    corePositions: ['LW', 'RW', 'ST'],
    attributeWeights: { dribbling: 0.3, shooting: 0.3, pace: 0.25, passing: 0.15 },
  },
  {
    id: 'w_inverted_winger',
    preferredSlots: ['LW', 'RW'],
    corePositions: ['LW', 'RW'],
    attributeWeights: { dribbling: 0.35, shooting: 0.25, pace: 0.25, passing: 0.15 },
  },
  {
    id: 'w_traditional_winger',
    preferredSlots: ['LW', 'RW', 'LM', 'RM'],
    corePositions: ['LW', 'RW'],
    attributeWeights: { pace: 0.4, dribbling: 0.25, passing: 0.2, shooting: 0.15 },
  },
  {
    id: 'st_advanced',
    preferredSlots: ['ST'],
    corePositions: ['ST'],
    attributeWeights: { shooting: 0.4, pace: 0.25, dribbling: 0.2, physical: 0.15 },
  },
  {
    id: 'st_target',
    preferredSlots: ['ST'],
    corePositions: ['ST'],
    attributeWeights: { physical: 0.35, shooting: 0.35, passing: 0.15, defending: 0.15 },
  },
  {
    id: 'st_pressing',
    preferredSlots: ['ST'],
    corePositions: ['ST'],
    attributeWeights: { pace: 0.3, defending: 0.25, physical: 0.25, shooting: 0.2 },
  },
  {
    id: 'st_false_nine',
    preferredSlots: ['ST', 'CAM'],
    corePositions: ['ST', 'CAM'],
    attributeWeights: { passing: 0.35, dribbling: 0.3, shooting: 0.2, pace: 0.15 },
  },
] as const;

const catalogById = new Map(FUNCTIONAL_ROLE_CATALOG.map((r) => [r.id, r]));

export function getRoleDefinition(roleId: FunctionalRoleId): FunctionalRoleDefinition {
  const def = catalogById.get(roleId);
  if (!def) throw new Error(`Unknown functional role: ${roleId}`);
  return def;
}

/** Default functional role for a formation slot label. */
export function defaultRoleForSlot(slotLabel: string): FunctionalRoleId {
  const label = slotLabel.toUpperCase();
  if (label === 'GK') return 'gk_sweeper_keeper';
  if (label === 'CB') return 'cb_stopper';
  if (label === 'LB' || label === 'RB') return 'fb_fullback';
  if (label === 'LWB' || label === 'RWB') return 'fb_wingback';
  if (label === 'CDM') return 'mf_anchor';
  if (label === 'CM') return 'mf_box_to_box';
  if (label === 'CAM' || label === 'LAM' || label === 'RAM') return 'mf_mezzala';
  if (label === 'LW' || label === 'RW') return 'w_traditional_winger';
  if (label === 'LM' || label === 'RM') return 'w_traditional_winger';
  if (label === 'ST') return 'st_advanced';
  return 'mf_box_to_box';
}
