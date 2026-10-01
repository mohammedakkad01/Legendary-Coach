/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * How good is THIS player in THIS slot. Builds on Phase 1's
 * computeEffectiveRating (overall × position × fatigue × morale) and adds
 * role-relevant attributes, form and stamina. Not "highest overall".
 */

import { BEST_TACTICS as B } from '../../../config/gameTuning';
import type { PlayerPosition } from '../../../types/game';
import { clamp } from '../../shared/math';
import { computeEffectiveRating } from '../../squad/positionSuitability';
import type { EffectiveRatingBreakdown } from '../../squad/positionSuitability';
import { normalizeSlot } from '../../squad/positionTaxonomy';
import type { BestTacticsPlayer } from './types';

export type AttrKey = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'goalkeeping';

/** Slot label (LWB/RM/…) → official position; unknown labels behave like CM. */
export const slotCore = (label: string): PlayerPosition => normalizeSlot(label) ?? 'CM';

/** Attribute with a safe fallback (overall) so partial data never crashes or skews to 0. */
export const attr = (p: BestTacticsPlayer, key: AttrKey): number => {
  const v = p.attributes?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : p.overall;
};

export interface SlotValue {
  readonly value: number;
  readonly breakdown: EffectiveRatingBreakdown;
}

export function slotValue(player: BestTacticsPlayer, slotLabel: string): SlotValue {
  const breakdown = computeEffectiveRating(player, slotLabel);
  const core = slotCore(slotLabel);
  const weights = B.slotAttributes[core as keyof typeof B.slotAttributes] ?? B.slotAttributes.CM;

  let attrFit = 0;
  for (const [key, w] of Object.entries(weights)) attrFit += attr(player, key as AttrKey) * (w as number);
  // Attributes are only as good as the player's fit, fatigue and morale in that slot.
  const attrComponent = attrFit * breakdown.positionMultiplier * breakdown.fatigueFactor * breakdown.moraleFactor;

  const form = clamp(player.form ?? 5.5, 1, 10);
  const formBonus = ((form - 5.5) / 4.5) * B.formBonusMax;
  const stamina = clamp(player.stamina ?? 70, 0, 100);
  const staminaPenalty = (1 - stamina / 100) * B.staminaPenaltyMax;

  const value = (1 - B.attributeBlend) * breakdown.effective + B.attributeBlend * attrComponent + formBonus - staminaPenalty;
  return { value, breakdown };
}
