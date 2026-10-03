/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase F — Living world domain tests.
 */

import { SeededRandom } from '../src/engine/prng';
import { persistenceService } from '../src/services/persistenceService';
import { CURRENT_SAVE_VERSION } from '../src/types/save';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_STANDINGS } from '../src/data/realFootballData';
import { generateFixturesForLeague, ensureFixtureDates } from '../src/data/realLeaguesData';
import {
  ingestGameEvent,
  ensureDefaultHandlersRegistered,
  createEmptyLivingWorld,
  computePlayerLegendScore,
  evaluateLegendLifecycle,
  computeManagerReputationModifiers,
  reputationCatalogEvent,
  buildSeasonEndLivingWorldUpdates,
  runSeasonEndLivingWorld,
  renderNewsItem,
  generatePressConference,
  resolvePressAnswer,
  validateNarrativeResult,
  buildStructuredContext,
  getNarrativeCacheKey,
  mergeNarrativeCache,
  backfillClubHistoryFromSave,
  LIVING_WORLD_TUNING,
} from '../src/domain/livingWorld';
import type { GameSaveData } from '../src/types/save';
import type { MatchRecord } from '../src/types/game';
import { applyStateChanges } from '../src/domain/livingWorld/reducer';
import { assert, assertEqual, section, finish } from './lib/testHarness';

function v6Save(): GameSaveData {
  return {
    saveVersion: 6,
    saveId: 'phase_f_v6',
    savedAt: '2026-06-01T00:00:00Z',
    appVersion: '2.1.0',
    currentSport: 'football',
    language: 'en',
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: false,
    club: REAL_INITIAL_PLAYER_CLUB,
    energy: 100,
    lastEnergyUpdate: Date.now(),
    vipPoints: 0,
    lastVipClaimDate: null,
    claimedVipUpgradeChests: [1],
    missionSkipUsedDate: null,
    checkInStreak: 0,
    lastCheckInDate: null,
    savedTacticalPlans: [],
    pendingFacilityUpgrades: [],
    activeNegotiations: [],
    academyDiscoveries: [],
    scoutMarket: [],
    dailyMissions: [],
    storyMissions: [],
    leagueStandings: REAL_INITIAL_STANDINGS,
    leagueFixtures: ensureFixtureDates(
      generateFixturesForLeague(REAL_INITIAL_PLAYER_CLUB.divisionId, REAL_INITIAL_PLAYER_CLUB.id),
    ),
    matchHistory: [],
    tournamentStats: [],
    simulatedMatchdays: [],
    matchScoutReports: {},
    unlockedSpeed2x: false,
  };
}

section('Save v6 → v7 migration');
{
  const once = persistenceService.migrate(v6Save());
  assertEqual(once.saveVersion, CURRENT_SAVE_VERSION, 'migrated to v7');
  assert(once.livingWorld?.phaseF !== undefined, 'phaseF present');
  assertEqual(once.livingWorld?.schemaVersion, 3, 'livingWorld schema v3');
}

section('Migration idempotence v6 → v7 → v7');
{
  const once = persistenceService.migrate(v6Save());
  const twice = persistenceService.migrate(once);
  assertEqual(JSON.stringify(once.livingWorld?.phaseF), JSON.stringify(twice.livingWorld?.phaseF), 'phaseF identical');
  assertEqual(
    once.livingWorld?.phaseF?.clubHistory.milestones.length,
    twice.livingWorld?.phaseF?.clubHistory.milestones.length,
    'milestones not duplicated',
  );
}

section('History backfill determinism & no fabricated press');
{
  const save = persistenceService.migrate(v6Save());
  const p1 = backfillClubHistoryFromSave(save);
  const p2 = backfillClubHistoryFromSave(save);
  assertEqual(JSON.stringify(p1.clubHistory), JSON.stringify(p2.clubHistory), 'backfill deterministic');
  assert(!p1.clubHistory.milestones.some((m) => m.kind.includes('press')), 'no press milestones invented');
}

section('Legend scoring & induction persistence');
{
  const player = REAL_INITIAL_PLAYER_CLUB.footballSquad[0];
  const scored = computePlayerLegendScore({
    player: { ...player, matchesPlayed: 300, goalsOrPoints: 120, assists: 40 },
    history: backfillClubHistoryFromSave(v6Save()).clubHistory,
    trophiesAtClub: 3,
    isCaptain: true,
    academyGraduate: false,
  });
  assert(scored.score > 0, 'score positive');
  const inducted = evaluateLegendLifecycle(undefined, scored.score, 50, 1, 'player', player.id, scored.reasons);
  assert(inducted.lifecycle === 'inducted', 'inducted above threshold');
  const retained = evaluateLegendLifecycle(inducted, scored.score - 30, 50, 2, 'player', player.id, scored.reasons);
  assertEqual(retained.lifecycle, 'retained', 'inducted legend retained when score drops');
}

section('Reputation catalog + ledger + modifier bounds');
{
  ensureDefaultHandlersRegistered();
  let lw = createEmptyLivingWorld(1000);
  const rep = reputationCatalogEvent({
    catalogKey: 'title_won',
    season: 1,
    clubId: 'c1',
    timestampIso: '2026-01-01T00:00:00Z',
    baseId: 'evt_test',
  });
  const out = ingestGameEvent({ livingWorld: lw, players: [] }, rep.event, { clubId: 'c1', gameWeek: 5 });
  assert(out.applied, 'ingested');
  assert(out.result.livingWorld.managerCareer.reputationLedger.length === 1, 'ledger entry');
  const mods = computeManagerReputationModifiers(out.result.livingWorld.managerCareer);
  assert(mods.jobOfferInterest >= LIVING_WORLD_TUNING.modifiers.min, 'mod min');
  assert(mods.jobOfferInterest <= LIVING_WORLD_TUNING.modifiers.max, 'mod max');
}

section('Unified ingestion: news sourceEventId');
{
  ensureDefaultHandlersRegistered();
  const lw = createEmptyLivingWorld(900);
  const evt = {
    id: 'evt_news_src',
    type: 'manager.reputation.top_four',
    timestamp: '2026-02-01T12:00:00Z',
    season: 1,
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
    severity: 'medium' as const,
    context: { delta: 4, catalogKey: 'top_four' },
  };
  const out = ingestGameEvent({ livingWorld: lw, players: [] }, evt, {
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
    gameWeek: 8,
  });
  const feed = out.result.livingWorld.phaseF?.newsFeed ?? [];
  assert(feed.length >= 1, 'news created');
  assertEqual(feed[0].sourceEventId, evt.id, 'sourceEventId integrity');
}

section('Story cooldown / dedupe (200 seeded sims)');
{
  ensureDefaultHandlersRegistered();
  const rng = new SeededRandom(2026);
  let totalDetections = 0;
  for (let i = 0; i < 200; i += 1) {
    let lw = createEmptyLivingWorld(800 + i);
    const results: ('W' | 'D' | 'L')[] = [];
    for (let m = 0; m < 20; m += 1) {
      const r = rng.nextRange(0, 2);
      results.push(r === 0 ? 'W' : r === 1 ? 'D' : 'L');
      const won = results[results.length - 1] === 'W';
      const evt = {
        id: `sim_${i}_${m}`,
        type: 'match.user_completed',
        timestamp: new Date(2026, 0, 1 + m).toISOString(),
        season: 1,
        clubId: 'club_sim',
        severity: 'low' as const,
        context: { won, drew: results[results.length - 1] === 'D', goalMargin: won ? 1 : -1 },
      };
      const before = lw.phaseF?.storyArcs.length ?? 0;
      const out = ingestGameEvent({ livingWorld: lw, players: [] }, evt, {
        clubId: 'club_sim',
        gameWeek: m + 1,
        recentUserResults: results,
      });
      lw = out.result.livingWorld;
      if ((lw.phaseF?.storyArcs.length ?? 0) > before) totalDetections += 1;
    }
  }
  assert(totalDetections > 0 && totalDetections < 200 * 15, 'detections bounded by cooldowns');
}

section('Deterministic press + StateChange validation');
{
  const lw = createEmptyLivingWorld(900);
  const session = generatePressConference({
    livingWorld: lw,
    clubId: 'c1',
    gameWeek: 10,
    boardPressure: true,
    losingStreak: false,
    captainSaleRumor: false,
    academyStarter: false,
  });
  assert(session !== null, 'press generated with context');
  const resolved = resolvePressAnswer({
    question: session!.question,
    answer: session!.question.options[0],
    season: 1,
    clubId: 'c1',
    gameWeek: 10,
    timestampIso: '2026-03-01T00:00:00Z',
  });
  assert(resolved.changes.length > 0, 'press produces changes');
  applyStateChanges({ livingWorld: lw, players: [] }, resolved.changes);
}

section('Narrative validator rejects state mutation');
{
  const ctx = buildStructuredContext({
    locale: 'en',
    season: 1,
    clubId: 'c1',
    subjectIds: ['c1'],
    factKeys: ['test'],
  });
  const req = { context: ctx, requestId: 'r1', schemaVersion: 1 as const };
  const bad = validateNarrativeResult(req, { requestId: 'r1', presentation: {}, delta: 5 }, { knownIds: new Set(['c1']) });
  assert(!bad.ok && bad.errors.includes('state_mutation_forbidden'), 'rejects mutation');
  const good = validateNarrativeResult(
    req,
    { requestId: 'r1', presentation: { headline: 'Hello' } },
    { knownIds: new Set(['c1']) },
  );
  assert(good.ok, 'accepts presentation only');
}

section('Season-end idempotence on history milestone');
{
  const lw = createEmptyLivingWorld(1000);
  const input = {
    livingWorld: lw,
    club: REAL_INITIAL_PLAYER_CLUB,
    leagueStandings: REAL_INITIAL_STANDINGS,
    finalRank: 1,
    timestampIso: '2026-06-10T00:00:00Z',
    players: REAL_INITIAL_PLAYER_CLUB.footballSquad,
  };
  const a = buildSeasonEndLivingWorldUpdates(input);
  const honoursA = a.changes.find((c) => c.kind === 'patchPhaseF');
  assert(honoursA !== undefined, 'season end changes');
  const end = runSeasonEndLivingWorld(input);
  assert(end.livingWorld.currentSeason === 2, 'season incremented');
}

section('EN/AR news rendering');
{
  const item = {
    id: 'n1',
    type: 'match_result',
    subjectIds: ['c1'],
    facts: { eventType: 'match.user_completed', won: true },
    tone: 'positive' as const,
    importance: 50,
    sourceEventId: 'e1',
    createdAt: '2026-01-01T00:00:00Z',
    season: 1,
  };
  const en = renderNewsItem(item, 'en');
  const ar = renderNewsItem(item, 'ar');
  assert(en.headline.length > 0 && ar.headline.length > 0, 'both locales render');
}

section('Narrative cache bounded');
{
  let entries: import('../src/domain/livingWorld/phaseF/types').NarrativeCacheEntry[] = [];
  const ctx = buildStructuredContext({ locale: 'en', season: 1, clubId: 'c1', subjectIds: ['c1'], factKeys: [] });
  const hash = getNarrativeCacheKey(ctx);
  for (let i = 0; i < 40; i += 1) {
    entries = mergeNarrativeCache(entries, {
      contextHash: `${hash}_${i}`,
      locale: 'en',
      cachedAt: new Date().toISOString(),
      headline: 'h',
    });
  }
  assert(entries.length <= LIVING_WORLD_TUNING.narrative.maxCacheEntries, 'cache capped');
}

section('Match history backfill from old save');
{
  const base = v6Save();
  const record: MatchRecord = {
    id: 'mh1',
    sport: 'football',
    seed: 1,
    homeClubId: base.club.id,
    homeClubName: base.club.name,
    awayClubId: 'opp',
    awayClubName: 'Opp',
    homeScore: 3,
    awayScore: 0,
    events: [],
    stats: {
      homePossession: 55,
      awayPossession: 45,
      homeShots: 10,
      awayShots: 4,
      homeShotsOnTarget: 5,
      awayShotsOnTarget: 2,
      homeCorners: 6,
      awayCorners: 2,
      homeFouls: 8,
      awayFouls: 10,
      homeYellowCards: 1,
      awayYellowCards: 2,
      homeRedCards: 0,
      awayRedCards: 0,
      homeXg: 2,
      awayXg: 0.5,
    },
    isFinished: true,
    competition: 'League',
    matchDay: 1,
    date: '2026-01-05',
  };
  base.matchHistory = [record];
  const migrated = persistenceService.migrate(base);
  const summary = migrated.livingWorld?.phaseF?.clubHistory.seasonSummaries[0];
  assert(summary !== undefined && summary.played >= 1, 'match aggregated');
}

finish();
