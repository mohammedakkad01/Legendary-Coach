/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scores a (lineup, tactics, opponent) triple with ONE deterministic model:
 *   composite = expected points (opponent-aware) + suitability + condition
 *               + natural-position share (team-level "chemistry" proxy)
 *               + style fit of the tactics to this squad's traits.
 * Split in two so the tactics grid search never recomputes the lineup part.
 */

import { BEST_TACTICS as B } from '../../../config/gameTuning';
import type { FootballFormation } from '../../../types/game';
import { clamp } from '../../shared/math';
import { SUITABILITY_RANK } from '../../squad/positionSuitability';
import type { TacticalState } from '../tacticalTypes';
import { attr, slotCore } from './slotValue';
import type { OptimizedPlacement } from './lineupOptimizer';
import type { OpponentProfile } from './types';

const WIDE_LABELS = new Set(['LW', 'RW', 'LB', 'RB', 'LWB', 'RWB', 'LM', 'RM', 'LAM', 'RAM']);

export interface LineupProfile {
  readonly attack: number;
  readonly defense: number;
  readonly suitability01: number;
  readonly naturalShare: number;
  readonly condition01: number;
  readonly midfielders: number;
  readonly attackersPace: number;
  readonly attackersPhysical: number;
  readonly midPassing: number;
  readonly defendersDefending: number;
  readonly widePace: number;
  readonly avgStamina: number;
}

export interface ScoreComponent {
  readonly code: string;
  /** Rating points (+ helps, − hurts). */
  readonly value: number;
  readonly params?: Readonly<Record<string, string | number>>;
}

export interface TacticsEvaluation {
  readonly score: number; // 0–100
  readonly expectedPoints: number; // 0–3
  readonly components: readonly ScoreComponent[];
}

const avg = (xs: readonly number[], fallback: number): number =>
  xs.length === 0 ? fallback : xs.reduce((a, b) => a + b, 0) / xs.length;

/** Middle lines of "4-2-3-1" → 6 midfielders; used for the opponent's formation too. */
export function countMidfielders(formation: FootballFormation): number {
  const lines = formation.split('-').map(Number);
  return lines.slice(1, -1).reduce((a, b) => a + b, 0);
}

export function buildLineupProfile(formation: FootballFormation, placements: readonly OptimizedPlacement[]): LineupProfile {
  let attNum = 0, attDen = 0, defNum = 0, defDen = 0;
  const attackers: OptimizedPlacement[] = [];
  const mids: OptimizedPlacement[] = [];
  const defenders: OptimizedPlacement[] = [];
  const wide: OptimizedPlacement[] = [];

  for (const pl of placements) {
    const core = slotCore(pl.slotLabel);
    const aw = B.attackWeight[core as keyof typeof B.attackWeight] ?? 0.3;
    const dw = B.defenseWeight[core as keyof typeof B.defenseWeight] ?? 0.3;
    attNum += aw * pl.slot.value; attDen += aw;
    defNum += dw * pl.slot.value; defDen += dw;
    if (core === 'ST' || core === 'LW' || core === 'RW' || core === 'CAM') attackers.push(pl);
    if (core === 'CM' || core === 'CDM' || core === 'CAM') mids.push(pl);
    if (core === 'CB' || core === 'LB' || core === 'RB' || core === 'CDM') defenders.push(pl);
    if (WIDE_LABELS.has(pl.slotLabel)) wide.push(pl);
  }

  const suitability01 = avg(placements.map((p) => SUITABILITY_RANK[p.slot.breakdown.suitability.level] / 4), 0);
  const naturalShare = avg(placements.map((p) => (p.slot.breakdown.suitability.level === 'natural' ? 1 : 0)), 0);
  const condition01 = avg(
    placements.map((p) => 0.6 * (1 - (p.player.fatigue ?? 0) / 100) + 0.4 * ((p.player.stamina ?? 70) / 100)),
    0.5,
  );
  const attackersPace = avg(attackers.map((p) => attr(p.player, 'pace')), 65);

  return {
    attack: attDen ? attNum / attDen : 0,
    defense: defDen ? defNum / defDen : 0,
    suitability01,
    naturalShare,
    condition01: clamp(condition01, 0, 1),
    midfielders: countMidfielders(formation),
    attackersPace,
    attackersPhysical: avg(attackers.map((p) => attr(p.player, 'physical')), 65),
    midPassing: avg(mids.map((p) => attr(p.player, 'passing')), 65),
    defendersDefending: avg(defenders.map((p) => attr(p.player, 'defending')), 65),
    widePace: avg(wide.map((p) => attr(p.player, 'pace')), attackersPace),
    avgStamina: avg(placements.map((p) => p.player.stamina ?? 70), 70),
  };
}

const isHighPress = (p?: string): boolean => p === 'high_press' || p === 'gegenpress';

/** Fast: lineup-independent arithmetic only. */
export function evaluateTactics(
  profile: LineupProfile,
  tactics: TacticalState,
  opponent: OpponentProfile | undefined,
): TacticsEvaluation {
  const S = B.style;
  const M = B.matchup;
  const oppAtt = opponent?.attack ?? B.defaultOpponent.attack;
  const oppDef = opponent?.defense ?? B.defaultOpponent.defense;
  const components: ScoreComponent[] = [];
  const add = (code: string, value: number, params?: Record<string, string | number>): void => {
    if (value !== 0) components.push({ code, value, params });
  };

  // --- slider effect on team power -----------------------------------------
  const attack = profile.attack + (tactics.attackingIntensity - 50) * B.sliderEffect.attackPerAttackingIntensity;
  const defense =
    profile.defense +
    (tactics.attackingIntensity - 50) * B.sliderEffect.defensePerAttackingIntensity +
    (tactics.defensiveIntensity - 50) * B.sliderEffect.defensePerDefensiveIntensity;

  // --- opponent-aware mentality --------------------------------------------
  const gap = (profile.attack + profile.defense) / 2 - (oppAtt + oppDef) / 2;
  const desired = 50 + clamp(gap * B.mentality.gapScale, -B.mentality.maxShift, B.mentality.maxShift);
  add('mentality_fit', -Math.abs(tactics.attackingIntensity - desired) * B.mentality.penaltyPerPoint,
    { gap: Math.round(gap), mentality: tactics.mentality });

  // --- matchup terms (only when the opponent info exists) ------------------
  if (opponent?.formation) {
    const diff = profile.midfielders - countMidfielders(opponent.formation);
    add('midfield_control', diff * M.midfieldPerPlayer, { mine: profile.midfielders, theirs: countMidfielders(opponent.formation) });
    const backThree = opponent.formation.startsWith('3') || opponent.formation.startsWith('5');
    if (backThree && tactics.width === 'wide' && profile.widePace >= S.skillReference) {
      add('wide_vs_back_three', M.wideVsBackThree, { opponentFormation: opponent.formation });
    }
  }
  if (isHighPress(opponent?.pressing)) {
    if (tactics.passing === 'direct_counter' || tactics.passing === 'long_ball') add('press_resistance', M.directVsHighPress);
    if (tactics.passing === 'short_tiki_taka' && profile.midPassing < M.tikiSkillOk) add('press_resistance', M.tikiVsHighPress);
  }
  if ((opponent?.mentality === 'attacking' || opponent?.mentality === 'all_out_attack')
    && tactics.counterAttacking >= 60 && profile.attackersPace >= M.counterPaceMin) {
    add('counter_vs_attacking', M.counterVsAttacking);
  }
  if (tactics.offsideTrap) {
    const ok = tactics.defensiveLine >= M.offsideLineMin && profile.defendersDefending >= M.offsideDefendingMin;
    add('offside_trap', ok ? M.offsideTrapBonus : M.offsideTrapRisk);
  }

  // --- squad-trait fit (style) ---------------------------------------------
  const ref = S.skillReference;
  const skill = (v: number): number => (v - ref) * S.perSkillPoint;
  const style: ScoreComponent[] = [];
  const addStyle = (code: string, value: number, params?: Record<string, string | number>): void => {
    if (value !== 0) style.push({ code, value, params });
  };
  if (tactics.tempo === 'fast_electric') addStyle('tempo_fit', skill(profile.attackersPace), { tempo: tactics.tempo });
  if (tactics.tempo === 'slow_patient') addStyle('tempo_fit', skill(profile.midPassing), { tempo: tactics.tempo });
  if (tactics.width === 'wide') addStyle('width_fit', skill(profile.widePace), { width: tactics.width });
  if (tactics.width === 'narrow') addStyle('width_fit', skill(profile.midPassing) * 0.7, { width: tactics.width });
  if (tactics.passing === 'short_tiki_taka') addStyle('passing_fit', skill(profile.midPassing), { passing: tactics.passing });
  if (tactics.passing === 'direct_counter' || tactics.passing === 'long_ball') {
    addStyle('passing_fit', skill((profile.attackersPace + profile.attackersPhysical) / 2), { passing: tactics.passing });
  }
  const pressLoad = clamp((tactics.defensiveIntensity - 50) / 50, 0, 1);
  if (pressLoad > 0) {
    const shortfall = Math.max(0, S.pressingStaminaReference - profile.avgStamina) / S.pressingStaminaReference;
    addStyle('pressing_stamina', -shortfall * pressLoad * S.pressingStaminaPenalty,
      { stamina: Math.round(profile.avgStamina) });
  }
  const styleSum = clamp(style.reduce((a, c) => a + c.value, 0), -S.maxAdjust, S.maxAdjust);
  components.push(...style);

  const bonus = components.reduce((a, c) => a + c.value, 0) - style.reduce((a, c) => a + c.value, 0) + styleSum;

  // --- expected points ------------------------------------------------------
  const strengthDiff = (attack - oppDef + (defense - oppAtt)) / 2 + bonus;
  const pWinRaw = 1 / (1 + Math.exp(-strengthDiff / B.logisticScale));
  const pDraw = B.drawMax * (1 - Math.abs(2 * pWinRaw - 1));
  const expectedPoints = 3 * pWinRaw * (1 - pDraw) + pDraw;

  const W = B.weights;
  const total = W.expectedPoints + W.suitability + W.condition + W.naturalShare + W.styleFit || 1;
  const styleFit01 = clamp(0.5 + styleSum / (2 * S.maxAdjust || 1), 0, 1);
  const composite =
    (W.expectedPoints * (expectedPoints / 3) +
      W.suitability * profile.suitability01 +
      W.condition * profile.condition01 +
      W.naturalShare * profile.naturalShare +
      W.styleFit * styleFit01) / total;

  return { score: Math.round(clamp(composite, 0, 1) * 10000) / 100, expectedPoints, components };
}
