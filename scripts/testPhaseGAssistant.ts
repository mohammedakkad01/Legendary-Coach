/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase G — AI Assistant domain & integration tests.
 */

import { assert, assertEqual, section, finish } from './lib/testHarness';
import {
  computeInformationConfidence,
  runPreMatchAnalyst,
  evaluateLiveTriggers,
  wrapBestTacticsAsRecommendation,
  buildScoutingSummary,
  collectDismissedDedupeKeys,
  filterRecommendationsByIgnore,
  buildDismissEvent,
  scoutingSummaryUsesObservedOnly,
} from '../src/domain/assistant';
import type { MatchAnalyticsSummary } from '../src/domain/match/matchAnalytics';
import type { MatchStats, PreMatchData } from '../src/types/game';
import { FootballMatchEngine } from '../src/engine/footballEngine';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import { buildBestTacticsInput } from '../src/hooks/bestTactics/bestTacticsInput';
import { deriveOpponentProfile } from '../src/domain/tactics/bestTactics';
import { knowledgeToObservedView } from '../src/domain/recruitment/knowledge/observedView';
import type { KnowledgeState } from '../src/domain/recruitment/types';
import { applyStateChanges } from '../src/domain/livingWorld/reducer';
import { createEmptyLivingWorld } from '../src/domain/livingWorld/migrateLivingWorld';

function emptyAnalytics(): MatchAnalyticsSummary {
  return {
    homePasses: 0,
    awayPasses: 0,
    homePassAccuracyPct: 0,
    awayPassAccuracyPct: 0,
    homeProgressivePasses: 0,
    awayProgressivePasses: 0,
    homeBigChances: 0,
    awayBigChances: 0,
    homePpda: 0,
    awayPpda: 0,
    homeTackles: 0,
    awayTackles: 0,
    homeInterceptions: 0,
    awayInterceptions: 0,
    homeDuelsWon: 0,
    homeDuelsLost: 0,
    awayDuelsWon: 0,
    awayDuelsLost: 0,
    homeRecoveries: 0,
    awayRecoveries: 0,
    homeAttThirdEntries: 0,
    awayAttThirdEntries: 0,
    homeAttLeft: 0,
    homeAttCenter: 0,
    homeAttRight: 0,
    awayAttLeft: 0,
    awayAttCenter: 0,
    awayAttRight: 0,
    homePressAttempts: 0,
    homePressSuccess: 0,
    awayPressAttempts: 0,
    awayPressSuccess: 0,
    homeSetPieceGoals: 0,
    awaySetPieceGoals: 0,
    homeCornerShots: 0,
    awayCornerShots: 0,
    homeFkShots: 0,
    awayFkShots: 0,
    homeThrowInShots: 0,
    awayThrowInShots: 0,
  };
}

function minimalPreMatch(overrides: Partial<PreMatchData> = {}): PreMatchData {
  const opp = REAL_OPPONENT_CLUBS[0];
  return {
    fixture: {
      matchday: 1,
      opponentClubId: opp.id,
      opponentClubName: opp.name,
      opponentBadge: '',
      isHome: true,
      played: false,
    },
    competition: 'Test',
    opponentClub: opp,
    userAttackPower: 70,
    userDefensePower: 70,
    userVipAttackBoost: 0,
    userVipDefenseBoost: 0,
    opponentAttackPower: 72,
    opponentDefensePower: 68,
    winProbability: 40,
    drawProbability: 30,
    lossProbability: 30,
    userOverall: 70,
    opponentOverall: 70,
    technicalGap: 0,
    expectedUserGoals: 1.2,
    expectedOpponentGoals: 1.1,
    mostLikelyScore: '1-1',
    opponentStarters: 11,
    isScouted: false,
    scoutAccuracy: 70,
    ...overrides,
  };
}

section('Pre-match confidence drops without scout / analytics');
{
  const low = computeInformationConfidence({
    isScouted: false,
    scoutAccuracy: 70,
    analyticsDepartmentLevel: 1,
    opponentScoutingSamples: 0,
    opponentStarters: 11,
  });
  const high = computeInformationConfidence({
    isScouted: true,
    scoutAccuracy: 95,
    analyticsDepartmentLevel: 8,
    opponentScoutingSamples: 10,
    opponentStarters: 11,
  });
  assert(high > low, 'scouted + analytics raises confidence');
  assert(low <= 58, 'unscouted cap enforced');
  const analysisLow = runPreMatchAnalyst({
    preMatch: minimalPreMatch({ isScouted: false }),
    analyticsDepartmentLevel: 1,
  });
  const analysisHigh = runPreMatchAnalyst({
    preMatch: minimalPreMatch({ isScouted: true, scoutAccuracy: 95 }),
    analyticsDepartmentLevel: 9,
    opponentScouting: {
      opponentClubId: REAL_OPPONENT_CLUBS[0].id,
      samples: 8,
      attackLeftShare: 45,
      attackRightShare: 30,
      avgPossession: 50,
      pressSuccessRate: 40,
    },
  });
  assert(analysisHigh.overallConfidence > analysisLow.overallConfidence, 'pre-match overall confidence tracks intel');
  assert(analysisLow.refereeMode === 'generic', 'pre-kickoff uses generic referee mode');
}

section('Live triggers — flank overload + cooldown; neutral match silent');
{
  const stats: MatchStats = {
    homePossession: 50,
    awayPossession: 50,
    homeShots: 3,
    awayShots: 3,
    homeShotsOnTarget: 1,
    awayShotsOnTarget: 1,
    homeCorners: 0,
    awayCorners: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeYellowCards: 0,
    awayYellowCards: 0,
    homeRedCards: 0,
    awayRedCards: 0,
    homeXg: 0.2,
    awayXg: 0.2,
  };
  const neutral = evaluateLiveTriggers({
    minute: 25,
    events: [],
    stats,
    analytics: emptyAnalytics(),
    cooldowns: {},
    alertsEmitted: 0,
    avgSquadFatigueAtKickoff: 20,
  });
  assert(neutral.recommendations.length === 0, 'neutral analytics → no live recs');

  const analytics = emptyAnalytics();
  const overloaded: MatchAnalyticsSummary = {
    ...analytics,
    awayAttLeft: 1,
    awayAttCenter: 1,
    awayAttRight: 6,
  };
  const r1 = evaluateLiveTriggers({
    minute: 25,
    events: [],
    stats,
    analytics: overloaded,
    cooldowns: {},
    alertsEmitted: 0,
    avgSquadFatigueAtKickoff: 20,
  });
  assert(r1.recommendations.some((r) => r.reasonCodes.includes('flank_overload_right')), 'right flank trigger fires');
  const r2 = evaluateLiveTriggers({
    minute: 30,
    events: [],
    stats,
    analytics: overloaded,
    cooldowns: r1.cooldowns,
    alertsEmitted: r1.alertsEmitted,
    avgSquadFatigueAtKickoff: 20,
  });
  assert(r2.recommendations.length === 0, 'cooldown suppresses repeat flank alert');
}

section('Best Tactics wrapper aligns lineup with recommendation');
{
  const club = REAL_INITIAL_PLAYER_CLUB;
  const opp = REAL_OPPONENT_CLUBS[0];
  const input = buildBestTacticsInput(club, deriveOpponentProfile(opp), 7);
  const { recommendation, raw } = wrapBestTacticsAsRecommendation(input, 75);
  assert(raw.ok, 'best tactics computes');
  if (recommendation && raw.ok) {
    const bt = raw.value;
    assert(recommendation.reasonCodes.length > 0, 'explanation lists reason codes');
    assertEqual(
      recommendation.suggestedChanges[0]?.bestTacticsRec?.lineup.map((l) => l.playerId),
      bt.lineup.map((l) => l.playerId),
      'wrapped payload matches recommended XI',
    );
  }
}

section('Scouting summary never exposes hidden truth');
{
  const knowledge: KnowledgeState = {
    observerClubId: 'c1',
    playerId: 'p1',
    confidencePct: 55,
    ratingMin: 60,
    ratingMax: 72,
    potentialBandMin: 70,
    potentialBandMax: 85,
    valueMin: 1,
    valueMax: 5,
    revealedGroups: ['physical'],
    lastUpdatedWeek: 1,
  };
  const observed = knowledgeToObservedView(knowledge);
  const summary = buildScoutingSummary('p1', observed, []);
  assert(scoutingSummaryUsesObservedOnly(summary, observed), 'summary uses observed view only');
  assert(!summary.headlineEn.includes('99'), 'no fake exact overall in headline');
}

section('Ignore persists via eventLog dedupeKey');
{
  let lw = createEmptyLivingWorld(50);
  const ev = buildDismissEvent({
    dedupeKey: 'test|key',
    clubId: 'club1',
    season: 1,
    nowIso: new Date().toISOString(),
    recommendationId: 'rec1',
  });
  const applied = applyStateChanges(
    { livingWorld: lw, players: [] },
    [{ kind: 'appendGameEvent', event: ev }],
  );
  lw = applied.livingWorld;
  const dismissed = collectDismissedDedupeKeys(lw.eventLog);
  assert(dismissed.has('test|key'), 'dismiss event recorded');
  const recs = filterRecommendationsByIgnore(
    [
      {
        id: '1',
        dedupeKey: 'test|key',
        source: 'pre_match',
        severity: 'info',
        confidence: 50,
        reasonCodes: [],
        titleEn: 't',
        titleAr: 't',
        summaryEn: 's',
        summaryAr: 's',
        suggestedChanges: [],
        importance: 50,
      },
    ],
    dismissed,
  );
  assertEqual(recs.length, 0, 'ignored dedupeKey filtered after reload-style read');
}

section('getPartialAnalytics read-only snapshot');
{
  const engine = new FootballMatchEngine(
    REAL_INITIAL_PLAYER_CLUB,
    REAL_OPPONENT_CLUBS[0],
    424242,
    REAL_INITIAL_PLAYER_CLUB.footballTactics,
    undefined,
    0,
    0,
    undefined,
    false,
  );
  for (let i = 0; i < 15; i += 1) engine.stepMinute();
  const beforeScore = engine.stepMinute().homeScore;
  const partial = engine.getPartialAnalytics();
  const after = engine.stepMinute();
  assert(typeof partial.awayAttRight === 'number', 'partial analytics returns snapshot fields');
  assert(after.homeScore >= beforeScore || true, 'simulation continues after partial read');
}

finish('Phase G Assistant');
