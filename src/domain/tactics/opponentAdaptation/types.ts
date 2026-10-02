/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TacticalInstructions } from '../instructionTypes';
import { normalizeTacticalInstructions } from '../instructionTypes';

export interface ObservableMatchSignals {
  readonly homeAttLeft: number;
  readonly homeAttRight: number;
  readonly homeAttCenter: number;
  readonly awayAttLeft: number;
  readonly awayAttRight: number;
  readonly awayAttCenter: number;
  readonly homePressSuccess: number;
  readonly homePressAttempts: number;
  readonly awayPressSuccess: number;
  readonly awayPressAttempts: number;
  readonly homePossessionPct: number;
}

export interface InMatchAdaptationState {
  readonly confidence: number;
  readonly flankBiasObserved: 'left' | 'right' | 'balanced';
  readonly heavyPressObserved: boolean;
}

export interface OpponentScoutingCompact {
  readonly opponentClubId: string;
  readonly samples: number;
  readonly attackLeftShare: number;
  readonly attackRightShare: number;
  readonly avgPossession: number;
  readonly pressSuccessRate: number;
}

export function createAdaptationState(): InMatchAdaptationState {
  return { confidence: 0, flankBiasObserved: 'balanced', heavyPressObserved: false };
}

export function observeSignals(state: InMatchAdaptationState, signals: ObservableMatchSignals, isHomeUser: boolean): InMatchAdaptationState {
  const attL = isHomeUser ? signals.homeAttLeft : signals.awayAttLeft;
  const attR = isHomeUser ? signals.homeAttRight : signals.awayAttRight;
  const attC = isHomeUser ? signals.homeAttCenter : signals.awayAttCenter;
  const total = attL + attR + attC;
  let flank: InMatchAdaptationState['flankBiasObserved'] = 'balanced';
  if (total >= 4) {
    if (attL > attR + 1 && attL > attC) flank = 'left';
    else if (attR > attL + 1 && attR > attC) flank = 'right';
  }
  const pressAtt = isHomeUser ? signals.awayPressAttempts : signals.homePressAttempts;
  const pressSucc = isHomeUser ? signals.awayPressSuccess : signals.homePressSuccess;
  const heavyPress = pressAtt >= 6 && pressSucc / Math.max(1, pressAtt) > 0.45;
  const confidence = Math.min(10, state.confidence + (total >= 3 ? 1 : 0));
  return { confidence, flankBiasObserved: flank, heavyPressObserved: heavyPress };
}

/** AI adjustment from observable data only (delayed until confidence threshold). */
export function applyInMatchAdaptation(
  base: TacticalInstructions,
  state: InMatchAdaptationState,
  adaptingForUserAttack: boolean,
): TacticalInstructions {
  if (state.confidence < 3) return base;
  const next = normalizeTacticalInstructions(base);
  if (!adaptingForUserAttack) return next;

  let width = next.inPossession.width;
  let directness = next.inPossession.passingDirectness;
  let tempo = next.inPossession.tempo;
  let line = next.outOfPossession.lineHeight;

  if (state.flankBiasObserved === 'left') {
    line = Math.min(100, line + 4);
    width = Math.max(0, width - 5);
  } else if (state.flankBiasObserved === 'right') {
    line = Math.min(100, line + 4);
    width = Math.max(0, width - 5);
  }
  if (state.heavyPressObserved) {
    directness = Math.min(100, directness + 8);
    tempo = Math.max(0, tempo - 6);
  }
  return {
    ...next,
    inPossession: { ...next.inPossession, width, passingDirectness: directness, tempo },
    outOfPossession: { ...next.outOfPossession, lineHeight: line },
  };
}

export function mergeScouting(
  prev: OpponentScoutingCompact | undefined,
  opponentClubId: string,
  snapshot: {
    attackLeftShare: number;
    attackRightShare: number;
    possession: number;
    pressSuccessRate: number;
  },
  cap = 12,
): OpponentScoutingCompact {
  const samples = Math.min(cap, (prev?.samples ?? 0) + 1);
  const blend = (a: number, b: number) => Math.round(a * 0.7 + b * 0.3);
  return {
    opponentClubId,
    samples,
    attackLeftShare: prev ? blend(prev.attackLeftShare, snapshot.attackLeftShare) : snapshot.attackLeftShare,
    attackRightShare: prev ? blend(prev.attackRightShare, snapshot.attackRightShare) : snapshot.attackRightShare,
    avgPossession: prev ? blend(prev.avgPossession, snapshot.possession) : snapshot.possession,
    pressSuccessRate: prev ? blend(prev.pressSuccessRate, snapshot.pressSuccessRate) : snapshot.pressSuccessRate,
  };
}
