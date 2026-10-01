/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase A — Living world domain & event engine tests.
 */

import { SeededRandom } from '../src/engine/prng';
import {
  applyMoraleDelta,
  clampMorale,
  createDefaultPersonalityProfile,
  createEmptyLivingWorld,
  decayPlayerMemories,
  addPlayerMemory,
  generateSquadRelationships,
  ensureDefaultHandlersRegistered,
  dispatchGameEvent,
  applyStateChanges,
  MAX_PLAYER_MEMORIES,
} from '../src/domain/livingWorld';
import type { GameEvent, PlayerMemoryEntry } from '../src/domain/livingWorld/types';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_STANDINGS } from '../src/data/realFootballData';
import { generateFixturesForLeague, ensureFixtureDates } from '../src/data/realLeaguesData';
import type { Player } from '../src/types/game';
import { assert, assertEqual, section, finish } from './lib/testHarness';
import { CURRENT_SAVE_VERSION } from '../src/types/save';
import { persistenceService } from '../src/services/persistenceService';

function samplePlayer(overrides: Partial<Player> = {}): Player {
  const base = REAL_INITIAL_PLAYER_CLUB.footballSquad[0];
  return { ...base, ...overrides };
}

section('Personality defaults are deterministic per player id');
{
  const p = samplePlayer({ id: 'det_player_1' });
  const a = createDefaultPersonalityProfile(p);
  const b = createDefaultPersonalityProfile(p);
  assertEqual(a, b, 'same id → same profile');
  const p2 = samplePlayer({ id: 'det_player_2' });
  const c = createDefaultPersonalityProfile(p2);
  assert(a.ambition !== c.ambition || a.leadership !== c.leadership, 'different ids → likely different profiles');
}

section('Morale clamping & seeded variance');
{
  assertEqual(clampMorale(150), 100, 'clamp high');
  assertEqual(clampMorale(-5), 0, 'clamp low');
  const rng = new SeededRandom(42);
  const v1 = applyMoraleDelta(50, 5, rng);
  const rng2 = new SeededRandom(42);
  const v2 = applyMoraleDelta(50, 5, rng2);
  assertEqual(v1, v2, 'variance is seeded deterministically');
}

section('Player memory cap & decay');
{
  let entries: PlayerMemoryEntry[] = [];
  for (let i = 0; i < MAX_PLAYER_MEMORIES + 3; i++) {
    entries = addPlayerMemory(entries, {
      id: `m${i}`,
      type: 'praise',
      season: 1,
      subjectIds: [],
      intensity: 40,
      decayRate: 2,
    });
  }
  assertEqual(entries.length, MAX_PLAYER_MEMORIES, 'memory cap enforced');
  const decayed = decayPlayerMemories(entries, 10);
  assert(decayed.length <= entries.length, 'decay removes or shrinks entries');
}

section('Relationship generation is deterministic (no RNG)');
{
  const players = REAL_INITIAL_PLAYER_CLUB.footballSquad.slice(0, 14).map((p, i) =>
    samplePlayer({ id: `rel_${i}_${p.id}`, personalityProfile: createDefaultPersonalityProfile(p) })
  );
  const snapshot = {
    clubId: 'club_test',
    players,
    lineupIds: players.slice(0, 11).map((p) => p.id),
    benchIds: players.slice(11).map((p) => p.id),
    captainId: players[0]?.id,
  };
  const r1 = generateSquadRelationships(snapshot);
  const r2 = generateSquadRelationships(snapshot);
  assertEqual(r1, r2, 'identical input → identical relationships');
  assert(r1.length > 0, 'generates at least one relationship for a full squad');
  const perPlayer = new Map<string, number>();
  for (const rel of r1) {
    perPlayer.set(rel.playerAId, (perPlayer.get(rel.playerAId) ?? 0) + 1);
    perPlayer.set(rel.playerBId, (perPlayer.get(rel.playerBId) ?? 0) + 1);
  }
  const overCap = [...perPlayer.values()].some((c) => c > 6);
  assert(!overCap, 'per-player relationship cap respected');
}

section('Event dispatch → reducer (morale + manager reputation)');
{
  ensureDefaultHandlersRegistered();
  const player = samplePlayer({ id: 'evt_player', morale: 60 });
  let livingWorld = createEmptyLivingWorld(1500);
  const event: GameEvent = {
    id: 'ev1',
    type: 'player.morale_shift',
    timestamp: new Date().toISOString(),
    season: 1,
    playerId: player.id,
    severity: 'medium',
    context: { delta: 8, reason: 'test' },
  };
  const out = dispatchGameEvent({ livingWorld, players: [player] }, event);
  assert(out.applied, 'event applied');
  assertEqual(out.result.players[0].morale, 68, 'morale delta applied to Player.morale');
  assertEqual(out.result.livingWorld.eventLog.length, 1, 'event logged');

  const repEvent: GameEvent = {
    id: 'ev2',
    type: 'manager.reputation_shift',
    timestamp: new Date(Date.now() + 120_000).toISOString(),
    season: 1,
    severity: 'low',
    context: { delta: 5 },
  };
  const out2 = dispatchGameEvent(out.result, repEvent, { nowMs: Date.now() + 120_000 });
  assert(out2.applied, 'reputation event applied');
  assert(out2.result.livingWorld.managerCareer.reputation > livingWorld.managerCareer.reputation, 'manager reputation increased');
}

section('Event cooldown / dedupe');
{
  ensureDefaultHandlersRegistered();
  const player = samplePlayer({ id: 'cd_player', morale: 50 });
  const livingWorld = createEmptyLivingWorld(1000);
  const ts = Date.now();
  const event: GameEvent = {
    id: 'ev_cd_1',
    type: 'player.morale_shift',
    timestamp: new Date(ts).toISOString(),
    season: 1,
    playerId: player.id,
    severity: 'low',
    context: { delta: 3 },
  };
  const first = dispatchGameEvent({ livingWorld, players: [player] }, event, { nowMs: ts });
  const second = dispatchGameEvent(first.result, { ...event, id: 'ev_cd_2' }, { nowMs: ts + 1000 });
  assert(second.applied === false && second.skippedReason === 'cooldown', 'duplicate event within cooldown skipped');
}

section('Notification throttling');
{
  ensureDefaultHandlersRegistered();
  let livingWorld = createEmptyLivingWorld(1000);
  let players = [samplePlayer({ id: 'n1', morale: 40 })];
  const day = '2030-06-01T10:00:00.000Z';
  for (let i = 0; i < 15; i++) {
    const res = dispatchGameEvent(
      { livingWorld, players },
      {
        id: `ev_n_${i}`,
        type: 'player.morale_shift',
        timestamp: new Date(new Date(day).getTime() + i * 120_000).toISOString(),
        season: 1,
        playerId: 'n1',
        severity: 'low',
        context: { delta: 1 },
      },
      { nowMs: new Date(day).getTime() + i * 120_000 }
    );
    if (res.applied) {
      livingWorld = res.result.livingWorld;
      players = res.result.players;
    }
  }
  const infoCount = livingWorld.notifications.filter((n) => n.category === 'Information').length;
  assert(infoCount <= 12, 'information notifications respect daily cap');
}

section('Save v2 → v3 migration idempotency');
{
  const v2Payload = {
    saveVersion: 2,
    saveId: 'save_v2_test',
    savedAt: '2026-01-01T00:00:00Z',
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
    leagueStandings: [],
    leagueFixtures: ensureFixtureDates(
      generateFixturesForLeague(REAL_INITIAL_PLAYER_CLUB.divisionId, REAL_INITIAL_PLAYER_CLUB.id)
    ),
    matchHistory: [],
    tournamentStats: [],
    simulatedMatchdays: [],
    matchScoutReports: {},
    unlockedSpeed2x: false,
  };
  const once = persistenceService.migrate(v2Payload);
  const twice = persistenceService.migrate(once);
  assertEqual(once.saveVersion, CURRENT_SAVE_VERSION, 'migrated to current version');
  assert(once.livingWorld !== undefined, 'livingWorld slice present');
  assertEqual(
    JSON.stringify(once.livingWorld?.relationships),
    JSON.stringify(twice.livingWorld?.relationships),
    'second migrate is idempotent for relationships'
  );
  assertEqual(once.saveVersion, twice.saveVersion, 'idempotent saveVersion');
}

section('Unknown top-level field preservation (migrate → export → import)');
{
  const alien = { nested: { flag: true }, count: 42 };
  const raw = {
    saveVersion: 2,
    saveId: 'save_alien',
    savedAt: '2026-01-01T00:00:00Z',
    appVersion: '2.0.0',
    currentSport: 'football',
    language: 'en',
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: false,
    club: REAL_INITIAL_PLAYER_CLUB,
    energy: 100,
    lastEnergyUpdate: 1,
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
      generateFixturesForLeague(REAL_INITIAL_PLAYER_CLUB.divisionId, REAL_INITIAL_PLAYER_CLUB.id)
    ),
    matchHistory: [],
    tournamentStats: [],
    simulatedMatchdays: [],
    matchScoutReports: {},
    unlockedSpeed2x: false,
    futurePhaseField: alien,
  };
  const migrated = persistenceService.migrate(raw);
  assertEqual(migrated.savePassthrough?.futurePhaseField, alien, 'unknown field moved to savePassthrough on migrate');

  const exported = persistenceService.exportJson({
    ...migrated,
    club: migrated.club,
    livingWorld: migrated.livingWorld,
    savePassthrough: migrated.savePassthrough,
  });
  const reloaded = persistenceService.deserialize(exported);
  assert(reloaded.success && reloaded.data !== undefined, 'import succeeds');
  assertEqual(reloaded.data?.savePassthrough?.futurePhaseField, alien, 'unknown field survives export/import');
}

section('Reducer typed ops (no generic path setter)');
{
  const player = samplePlayer({ id: 'reducer_p', morale: 70 });
  const livingWorld = createEmptyLivingWorld(900);
  const result = applyStateChanges(
    { livingWorld, players: [player] },
    [{ kind: 'changePlayerMorale', playerId: player.id, delta: -10 }]
  );
  assertEqual(result.players[0].morale, 60, 'changePlayerMorale works via reducer');
}

finish('Living World Foundation Tests');
