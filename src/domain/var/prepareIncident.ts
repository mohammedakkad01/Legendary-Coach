/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Classify one qualifying incident and, when the referee and the review
 * budget allow, build the review. Every random draw comes from the VAR
 * stream passed in — never from the engine's main PRNG.
 *
 * Draw order (fixed, so the same seed replays):
 *   1. mistake roll (goals: offside label; penalties / reds: error roll)
 *   2. penalty mistakes only: withhold-the-kick vs wrongly-award
 *   3. intervention roll (always consumed, even after the review cap)
 *   4. awarded penalty only: the spot-kick, on this same stream
 *
 * KNOWN LIMITATION — offside:
 * An open-play goal is labeled offside only by step 1 above. The engine
 * never generates an offside incident. See gameTuning.VAR.offsideLabelRate.
 */

import { REFEREE, VAR } from '../../config/gameTuning';
import type { SeededRandom } from '../../engine/prng';
import { VAR_TEXT } from '../../i18n/var';
import type { MatchEvent } from '../../types/game';
import { projectScores } from './projectScores';
import {
  goalOffsideLabelRate,
  interventionRate,
  maxReviewsPerMatch,
  penaltyErrorRate,
  redErrorRate,
  reviewConfidence,
} from './varRates';
import type { RefereeProfile } from '../referee/refereeTypes';
import type { VARReview, VarDecision, VarMatchState, VarPlayerRef, VarReviewType } from './varTypes';

export function rollIntervention(rng: SeededRandom, referee: RefereeProfile, reviewsSoFar: number): boolean {
  const rolled = rng.nextChance(interventionRate(referee.varTendency));
  if (reviewsSoFar >= maxReviewsPerMatch()) return false;
  return rolled;
}

function tagEvent(state: VarMatchState, eventIndex: number): { state: VarMatchState; eventId: string } {
  const source = state.events[eventIndex];
  if (!source) throw new Error('VAR incident is missing its event');
  const eventId = source.eventId ?? `e${eventIndex}`;
  const events = state.events.map((event, index) => (index === eventIndex ? { ...event, eventId } : { ...event }));
  return { state: { ...state, events }, eventId };
}

function explanation(reviewType: VarReviewType, initial: VarDecision, finalDecision: VarDecision, scored?: boolean): { explanationAr: string; explanationEn: string } {
  if (reviewType === 'goal' && finalDecision === 'no_goal') return { explanationAr: VAR_TEXT.goalOverturned.ar, explanationEn: VAR_TEXT.goalOverturned.en };
  if (reviewType === 'goal') return { explanationAr: VAR_TEXT.goalConfirmed.ar, explanationEn: VAR_TEXT.goalConfirmed.en };
  if (reviewType === 'red_card' && finalDecision === 'no_red') return { explanationAr: VAR_TEXT.redOverturned.ar, explanationEn: VAR_TEXT.redOverturned.en };
  if (reviewType === 'red_card') return { explanationAr: VAR_TEXT.redConfirmed.ar, explanationEn: VAR_TEXT.redConfirmed.en };
  if (initial === 'no_penalty' && finalDecision === 'penalty') {
    return scored
      ? { explanationAr: VAR_TEXT.penaltyAwardedScored.ar, explanationEn: VAR_TEXT.penaltyAwardedScored.en }
      : { explanationAr: VAR_TEXT.penaltyAwardedMissed.ar, explanationEn: VAR_TEXT.penaltyAwardedMissed.en };
  }
  if (finalDecision === 'no_penalty') return { explanationAr: VAR_TEXT.penaltyCancelled.ar, explanationEn: VAR_TEXT.penaltyCancelled.en };
  return { explanationAr: VAR_TEXT.penaltyConfirmed.ar, explanationEn: VAR_TEXT.penaltyConfirmed.en };
}

function makeReview(
  state: VarMatchState,
  eventId: string,
  reviewType: VarReviewType,
  initialDecision: VarDecision,
  finalDecision: VarDecision,
  referee: RefereeProfile,
  kick?: { scored: boolean; player: VarPlayerRef },
): VARReview {
  const text = explanation(reviewType, initialDecision, finalDecision, kick?.scored);
  const review: VARReview = {
    reviewId: `var_${state.matchId}_${eventId}`,
    matchId: state.matchId,
    eventId,
    reviewType,
    initialDecision,
    finalDecision,
    confidence: reviewConfidence(referee),
    timestamp: state.minute,
    explanationAr: text.explanationAr,
    explanationEn: text.explanationEn,
  };
  if (!kick) return review;
  return {
    ...review,
    awardedKickScored: kick.scored,
    awardedPlayerId: kick.player.id,
    awardedPlayerName: kick.player.name,
    awardedPlayerNameEn: kick.player.nameEn,
  };
}

export function prepareGoalReview(
  state: VarMatchState,
  eventIndex: number,
  rng: SeededRandom,
  referee: RefereeProfile,
): { prepared: VarMatchState; review: VARReview | null } {
  const source = state.events[eventIndex];
  if (!source || source.type !== 'goal') throw new Error('VAR goal review requires a goal event');
  // Known limitation: this labels an existing goal. It is not an engine offside event.
  const offside = rng.nextChance(goalOffsideLabelRate(referee));
  const truth: VarDecision = offside ? 'no_goal' : 'goal';
  if (!rollIntervention(rng, referee, state.varReviews.length)) {
    return { prepared: state, review: null };
  }
  const tagged = tagEvent(state, eventIndex);
  return {
    prepared: tagged.state,
    review: makeReview(tagged.state, tagged.eventId, 'goal', 'goal', truth, referee),
  };
}

/** Referee's initial call withholds the kick, so the Phase-5 penalty event stops counting. */
export function withholdPenalty(state: VarMatchState, eventIndex: number): VarMatchState {
  const source = state.events[eventIndex];
  if (!source) throw new Error('VAR penalty event missing');
  const events: MatchEvent[] = state.events.map((event, index) => {
    if (index !== eventIndex) return { ...event };
    return {
      minute: event.minute,
      sport: event.sport,
      type: 'foul',
      team: event.team,
      playerId: event.playerId,
      playerName: event.playerName,
      textAr: VAR_TEXT.playOnAr,
      textEn: VAR_TEXT.playOnEn,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
    };
  });
  const projected = projectScores(events);
  return { ...state, events: projected.events, homeScore: projected.homeScore, awayScore: projected.awayScore };
}

export function preparePenaltyReview(
  state: VarMatchState,
  eventIndex: number,
  rng: SeededRandom,
  referee: RefereeProfile,
  taker: VarPlayerRef,
): { prepared: VarMatchState; review: VARReview | null } {
  const source = state.events[eventIndex];
  if (!source || (source.type !== 'goal' && source.type !== 'foul')) {
    throw new Error('VAR penalty review requires the penalty event');
  }
  const erred = rng.nextChance(penaltyErrorRate(referee));
  let prepared = state;
  let initial: VarDecision = 'penalty';
  let truth: VarDecision = 'penalty';
  if (erred) {
    const withheld = rng.nextChance(VAR.penaltyWithholdShare);
    if (withheld) {
      initial = 'no_penalty';
      truth = 'penalty';
      prepared = withholdPenalty(state, eventIndex);
    } else {
      initial = 'penalty';
      truth = 'no_penalty';
    }
  }
  if (!rollIntervention(rng, referee, prepared.varReviews.length)) {
    return { prepared, review: null };
  }
  const tagged = tagEvent(prepared, eventIndex);
  const awarding = initial === 'no_penalty' && truth === 'penalty';
  const kick = awarding
    ? { scored: rng.nextChance(REFEREE.penaltyGoalChance), player: taker }
    : undefined;
  return {
    prepared: tagged.state,
    review: makeReview(tagged.state, tagged.eventId, 'penalty', initial, truth, referee, kick),
  };
}

export function prepareRedReview(
  state: VarMatchState,
  eventIndex: number,
  rng: SeededRandom,
  referee: RefereeProfile,
): { prepared: VarMatchState; review: VARReview | null } {
  const source = state.events[eventIndex];
  if (!source || source.type !== 'red_card') throw new Error('VAR red review requires a red card');
  const wrong = rng.nextChance(redErrorRate(referee));
  const truth: VarDecision = wrong ? 'no_red' : 'red';
  if (!rollIntervention(rng, referee, state.varReviews.length)) {
    return { prepared: state, review: null };
  }
  const tagged = tagEvent(state, eventIndex);
  return {
    prepared: tagged.state,
    review: makeReview(tagged.state, tagged.eventId, 'red_card', 'red', truth, referee),
  };
}
