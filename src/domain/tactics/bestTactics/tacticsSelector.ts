/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Picks the tactical settings for a lineup profile by exhaustive search over
 * the discrete enum grid (1 440 combinations — microseconds, deterministic:
 * the FIRST best combination in a fixed enumeration order wins ties).
 * Extended sliders are derived from the enums (resolveTacticalState), so the
 * result is always a value the existing engine and UI already understand.
 */

import type { FootballFormation, FootballTactics, MatchMentality, PassingStyle, PressingStyle, TeamTempo } from '../../../types/game';
import { resolveTacticalState } from '../tacticalState';
import type { TacticalState } from '../tacticalTypes';
import { evaluateTactics } from './candidateScorer';
import type { LineupProfile, TacticsEvaluation } from './candidateScorer';
import type { OpponentProfile } from './types';

const MENTALITIES: readonly MatchMentality[] = ['ultra_defensive', 'defensive', 'balanced', 'attacking', 'all_out_attack'];
const PRESSINGS: readonly PressingStyle[] = ['low_block', 'mid_press', 'high_press', 'gegenpress'];
const PASSINGS: readonly PassingStyle[] = ['short_tiki_taka', 'mixed', 'direct_counter', 'long_ball'];
const TEMPOS: readonly TeamTempo[] = ['slow_patient', 'normal', 'fast_electric'];
const WIDTHS: readonly FootballTactics['width'][] = ['narrow', 'standard', 'wide'];
const OFFSIDE: readonly boolean[] = [false, true];

export interface TacticsChoice {
  readonly tactics: TacticalState;
  readonly evaluation: TacticsEvaluation;
}

export function selectTactics(
  profile: LineupProfile,
  formation: FootballFormation,
  base: FootballTactics,
  opponent: OpponentProfile | undefined,
): TacticsChoice {
  // Keep every non-searched field (captain, takers, …); drop the derived sliders.
  const {
    defensiveLine: _a, defensiveIntensity: _b, attackingIntensity: _c, counterAttacking: _d,
    possessionFocus: _e, directPlay: _f, timeWasting: _g, tacticalStateVersion: _h, ...kept
  } = base;
  void [_a, _b, _c, _d, _e, _f, _g, _h];
  let best: TacticsChoice | null = null;
  for (const mentality of MENTALITIES) {
    for (const pressing of PRESSINGS) {
      for (const passing of PASSINGS) {
        for (const tempo of TEMPOS) {
          for (const width of WIDTHS) {
            for (const offsideTrap of OFFSIDE) {
              const candidate = resolveTacticalState({
                ...kept, formation, mentality, pressing, passing, tempo, width, offsideTrap,
              });
              const evaluation = evaluateTactics(profile, candidate, opponent);
              if (!best || evaluation.score > best.evaluation.score) best = { tactics: candidate, evaluation };
            }
          }
        }
      }
    }
  }
  // The grid is never empty.
  return best as TacticsChoice;
}
