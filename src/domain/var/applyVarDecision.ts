/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one VAR reducer. Pure: it never mutates the input state.
 * On any thrown error, commitIncident returns the pre-review state so the
 * match keeps the referee's call and nothing is half-applied.
 */

import { awardedGoalText, awardedMissText } from '../../i18n/var';
import type { MatchEvent } from '../../types/game';
import { hasIncidentTruth, projectScores } from './projectScores';
import type { VARReview, VarDecision, VarMatchState, VarReviewType } from './varTypes';

const decisionsFor: Record<VarReviewType, readonly VarDecision[]> = {
  goal: ['goal', 'no_goal'],
  penalty: ['penalty', 'no_penalty'],
  red_card: ['red', 'no_red'],
};

function assertDecision(review: VARReview): void {
  const allowed = decisionsFor[review.reviewType];
  if (!allowed.includes(review.initialDecision) || !allowed.includes(review.finalDecision)) {
    throw new Error(`VAR decision ${review.initialDecision}->${review.finalDecision} does not match ${review.reviewType}`);
  }
}

function withoutTruth(state: VarMatchState): VarMatchState {
  if (!hasIncidentTruth(state.events)) return state;
  const projected = projectScores(state.events);
  return { ...state, events: projected.events, homeScore: projected.homeScore, awayScore: projected.awayScore };
}

function runningBefore(events: readonly MatchEvent[]): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const event of events) {
    if (event.type === 'goal' && !event.annulled) {
      if (event.team === 'home') home += 1;
      else away += 1;
    }
  }
  return { home, away };
}

function awardedGoal(source: MatchEvent, review: VARReview, home: number, away: number): MatchEvent {
  const name = review.awardedPlayerName || source.playerName || '';
  const nameEn = review.awardedPlayerNameEn || name;
  const text = awardedGoalText(name, nameEn, source.minute, home, away);
  return {
    minute: source.minute,
    sport: 'football',
    type: 'goal',
    team: source.team,
    playerId: review.awardedPlayerId || source.playerId,
    playerName: name,
    textAr: text.ar,
    textEn: text.en,
    homeScore: home,
    awayScore: away,
    eventId: `${review.eventId}_awarded`,
  };
}

function awardedMiss(source: MatchEvent, review: VARReview): MatchEvent {
  const name = review.awardedPlayerName || source.playerName || '';
  const nameEn = review.awardedPlayerNameEn || name;
  const text = awardedMissText(name, nameEn, source.minute);
  return {
    minute: source.minute,
    sport: 'football',
    type: 'foul',
    team: source.team,
    playerId: review.awardedPlayerId || source.playerId,
    playerName: name,
    textAr: text.ar,
    textEn: text.en,
    homeScore: source.homeScore,
    awayScore: source.awayScore,
    eventId: `${review.eventId}_awarded_miss`,
  };
}

export function applyVarDecision(state: VarMatchState, review: VARReview): VarMatchState {
  assertDecision(review);
  const index = state.events.findIndex((event) => event.eventId === review.eventId);
  if (index < 0) throw new Error(`VAR event ${review.eventId} not found`);
  const source = state.events[index];
  if (!source) throw new Error(`VAR event ${review.eventId} not found`);

  let events = state.events.map((event) => ({ ...event }));
  const stats = { ...state.stats };
  const overturns = review.finalDecision !== review.initialDecision;

  if (review.reviewType === 'goal') {
    if (source.type !== 'goal') throw new Error('VAR goal review is not attached to a goal');
    if (overturns && review.finalDecision === 'no_goal') {
      events[index] = { ...events[index], annulled: true };
    }
  } else if (review.reviewType === 'penalty') {
    if (source.type !== 'goal' && source.type !== 'foul') {
      throw new Error('VAR penalty review is not attached to a penalty incident');
    }
    if (review.initialDecision === 'penalty' && review.finalDecision === 'no_penalty') {
      events[index] = { ...events[index], annulled: true };
    } else if (review.initialDecision === 'no_penalty' && review.finalDecision === 'penalty') {
      if (review.awardedKickScored) {
        const tally = runningBefore(events);
        const home = source.team === 'home' ? tally.home + 1 : tally.home;
        const away = source.team === 'away' ? tally.away + 1 : tally.away;
        events = [...events, awardedGoal(source, review, home, away)];
      } else {
        events = [...events, awardedMiss(source, review)];
      }
    }
  } else if (review.reviewType === 'red_card') {
    if (source.type !== 'red_card') throw new Error('VAR red review is not attached to a red card');
    if (overturns && review.finalDecision === 'no_red') {
      events[index] = { ...events[index], annulled: true };
      if (source.team === 'home') stats.homeRedCards = Math.max(0, (stats.homeRedCards ?? 0) - 1);
      else stats.awayRedCards = Math.max(0, (stats.awayRedCards ?? 0) - 1);
    }
  }

  const projected = projectScores(events);
  return {
    ...state,
    homeScore: projected.homeScore,
    awayScore: projected.awayScore,
    events: projected.events,
    stats,
    varReviews: [...state.varReviews, review],
  };
}

/**
 * Apply one incident. A thrown reducer rolls all the way back to `before`
 * (the referee's call), including any withheld penalty that had been staged
 * in `prepared`.
 */
export function commitIncident(
  before: VarMatchState,
  prepared: VarMatchState,
  review: VARReview | null,
): VarMatchState {
  try {
    if (!review) return withoutTruth(prepared);
    return withoutTruth(applyVarDecision(prepared, review));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[VAR] review failed; match continues unchanged (${message})`);
    return before;
  }
}

export function scoresAreConsistent(state: Pick<VarMatchState, 'homeScore' | 'awayScore' | 'events' | 'stats'>): boolean {
  let home = 0;
  let away = 0;
  for (const event of state.events) {
    if (event.incidentTruth !== undefined) return false;
    if (event.type === 'goal' && !event.annulled) {
      if (event.team === 'home') home += 1;
      else away += 1;
    }
    if (event.homeScore !== home || event.awayScore !== away) return false;
  }
  if (home !== state.homeScore || away !== state.awayScore) return false;
  const redsHome = state.events.filter((event) => event.type === 'red_card' && !event.annulled && event.team === 'home').length;
  const redsAway = state.events.filter((event) => event.type === 'red_card' && !event.annulled && event.team === 'away').length;
  return redsHome === state.stats.homeRedCards && redsAway === state.stats.awayRedCards;
}
