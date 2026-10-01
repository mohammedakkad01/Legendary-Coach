/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic football tactics for AI / pre-match opponent clubs. Each club
 * id maps to a stable style (formation, mentality, pressing, …) so Best Tactics
 * and the match engine see real variety instead of every opponent inheriting
 * REAL_INITIAL_PLAYER_CLUB's 4-3-3 high press.
 *
 * VIP formation locks apply to the human coach only — opponents may use any
 * formation from FORMATION_IDS.
 */

import type {
  FootballFormation,
  FootballTactics,
  MatchMentality,
  PassingStyle,
  PressingStyle,
  TeamTempo,
} from '../../types/game';
import { FORMATION_IDS } from '../squad/formations';

const MENTALITIES: readonly MatchMentality[] = [
  'ultra_defensive', 'defensive', 'balanced', 'attacking', 'all_out_attack',
];
const PRESSINGS: readonly PressingStyle[] = ['low_block', 'mid_press', 'high_press', 'gegenpress'];
const PASSING: readonly PassingStyle[] = ['short_tiki_taka', 'mixed', 'direct_counter', 'long_ball'];
const TEMPOS: readonly TeamTempo[] = ['slow_patient', 'normal', 'fast_electric'];
const WIDTHS: readonly FootballTactics['width'][] = ['narrow', 'standard', 'wide'];

/** FNV-1a — same algorithm as realLeaguesData.hashStringToSeed (kept local to avoid a data→domain cycle). */
const hashClubId = (str: string): number => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const pick = <T,>(arr: readonly T[], seed: number): T => arr[seed % arr.length] as T;

export type SyntheticOpponentTacticsCore = Pick<
  FootballTactics,
  'formation' | 'mentality' | 'pressing' | 'passing' | 'tempo' | 'width' | 'offsideTrap'
>;

/**
 * @param clubId Stable opponent club id (fixture / cache key).
 * @param starRating Optional 3–5 club strength; nudges mentality toward attack when high.
 */
export function deriveSyntheticOpponentTactics(clubId: string, starRating?: number): SyntheticOpponentTacticsCore {
  let s = hashClubId(`${clubId}#footballTactics`);
  const next = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };

  const formation = pick(FORMATION_IDS, next());
  let mentality = pick(MENTALITIES, next());
  const stars = starRating ?? 3.5;
  if (stars >= 4.5 && mentality === 'defensive') mentality = 'balanced';
  if (stars >= 4.5 && mentality === 'balanced' && (next() & 3) === 0) mentality = 'attacking';
  if (stars <= 3.5 && mentality === 'all_out_attack' && (next() & 1) === 0) mentality = 'attacking';

  return {
    formation,
    mentality,
    pressing: pick(PRESSINGS, next()),
    passing: pick(PASSING, next()),
    tempo: pick(TEMPOS, next()),
    width: pick(WIDTHS, next()),
    offsideTrap: (next() & 3) === 0,
  };
}

/** Role ids from the opponent's starting XI (engine does not simulate set-piece takers for AI). */
export function opponentTacticsWithRoles(
  core: SyntheticOpponentTacticsCore,
  lineupIds: readonly string[],
): FootballTactics {
  const fallback = lineupIds.find(Boolean) ?? '';
  const outfield = lineupIds.filter(Boolean).slice(1);
  const st = outfield[outfield.length - 1] ?? fallback;
  return {
    ...core,
    captainId: outfield[0] ?? fallback,
    penaltyTakerId: st,
    freeKickTakerId: outfield[Math.min(2, outfield.length - 1)] ?? fallback,
    cornerTakerId: outfield[Math.min(1, outfield.length - 1)] ?? fallback,
  };
}
