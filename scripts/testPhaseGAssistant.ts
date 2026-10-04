/**
 * Phase G — assistant domain + store wiring smoke tests.
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { generatePreMatchAnalysis } from '../src/domain/assistant/preMatchAnalyst';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import { generateFixturesForLeague } from '../src/data/realLeaguesData';
import { createEmptyAssistantState, getExplainableBestTactics } from '../src/domain/assistant';
import { tacticsPatchFromAssistantChanges } from '../src/domain/assistant/applyTacticalChanges';

section('Pre-match analyst returns recommendations from real club state');
{
  const fixture = generateFixturesForLeague(REAL_INITIAL_PLAYER_CLUB.divisionId, REAL_INITIAL_PLAYER_CLUB.id)[0];
  const analysis = generatePreMatchAnalysis({
    userClub: REAL_INITIAL_PLAYER_CLUB,
    opponentClub: REAL_OPPONENT_CLUBS[0],
    fixture,
    isScouted: true,
    scoutAccuracy: 85,
    analyticsLevel: 2,
  });
  assert(analysis.recommendations.length >= 1, 'at least one recommendation');
  assert(analysis.overallConfidence >= 25 && analysis.overallConfidence <= 92, 'confidence bounded');
}

section('Explainable best tactics wraps Phase 4 engine');
{
  const result = getExplainableBestTactics({ club: REAL_INITIAL_PLAYER_CLUB, maxSubstitutes: 7 });
  assert(result !== null, 'produces recommendation');
  assert(result!.assistantRecommendation.source === 'tactics', 'source tactics');
}

section('Tactics patch uses canonical enum values');
{
  const patch = tacticsPatchFromAssistantChanges({ pressing: 'high_press', tempo: 'fast_electric' });
  assertEqual(patch.pressing, 'high_press', 'pressing enum');
  assertEqual(patch.tempo, 'fast_electric', 'tempo enum');
}

section('Empty assistant state shape');
{
  const s = createEmptyAssistantState();
  assertEqual(s.ignoredRecommendationIds.length, 0, 'no ignored');
  assertEqual(Object.keys(s.explanationCache).length, 0, 'empty cache');
}

finish('Phase G Assistant');
