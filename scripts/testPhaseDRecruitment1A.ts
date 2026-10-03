/**
 * Phase D Part 1A — recruitment foundation tests.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { CURRENT_SAVE_VERSION } from '../src/types/save';
import { persistenceService } from '../src/services/persistenceService';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import {
  ensureRecruitmentV5,
  getObservedPlayerView,
  applyProgressiveReveal,
  adjustKnowledgeConfidence,
  createInitialKnowledge,
  checkPermanentTransferAllowed,
  buildTransferWindowState,
  resolveTransferWindowPhase,
  RECRUITMENT_TUNING,
} from '../src/domain/recruitment';
import type { GameSaveData } from '../src/types/save';
import type { KnowledgeState } from '../src/domain/recruitment';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function minimalV4Save(): GameSaveData {
  const withLife = ensurePlayerLifeV4({
    saveVersion: 4,
    saveId: 'phase_d_test_save',
    savedAt: new Date(0).toISOString(),
    appVersion: 'test',
    currentSport: 'football',
    language: 'en',
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: false,
    club: clone(REAL_INITIAL_PLAYER_CLUB),
    energy: 100,
    lastEnergyUpdate: 0,
    vipPoints: 0,
    lastVipClaimDate: null,
    claimedVipUpgradeChests: [],
    missionSkipUsedDate: null,
    checkInStreak: 0,
    lastCheckInDate: null,
    savedTacticalPlans: [],
    pendingFacilityUpgrades: [],
    activeNegotiations: [],
    academyDiscoveries: [],
    scoutMarket: clone(REAL_INITIAL_SCOUT_MARKET.slice(0, 5)),
    dailyMissions: [],
    storyMissions: [],
    leagueStandings: [],
    leagueFixtures: [],
    matchHistory: [],
    tournamentStats: [],
    simulatedMatchdays: [1, 2],
    matchScoutReports: {},
    unlockedSpeed2x: false,
  });
  return withLife;
}

section('Save v4 → v5 migration adds recruitmentWorld');
{
  const v4 = minimalV4Save();
  assertEqual(v4.saveVersion, 4, 'fixture still v4 before recruitment migrate');
  assert(!v4.recruitmentWorld, 'no recruitment slice yet');
  const v5 = ensureRecruitmentV5(v4);
  assertEqual(v5.saveVersion, CURRENT_SAVE_VERSION, 'bumped to current save version');
  assert(!!v5.recruitmentWorld, 'recruitmentWorld present');
  assertEqual(v5.recruitmentWorld!.schemaVersion, 9, 'recruitment schema v9');
}

section('Migration idempotency');
{
  const once = ensureRecruitmentV5(minimalV4Save());
  const twice = ensureRecruitmentV5(clone(once));
  assertEqual(
    JSON.stringify(once.recruitmentWorld),
    JSON.stringify(twice.recruitmentWorld),
    'recruitmentWorld stable on re-migrate',
  );
}

section('Phase C PlayerLife preserved through v5 migration');
{
  const v4 = minimalV4Save();
  const before = v4.club.footballSquad[0].playerLife?.development.truePotential;
  assert(typeof before === 'number', 'setup has playerLife');
  const v5 = ensureRecruitmentV5(v4);
  const after = v5.club.footballSquad[0].playerLife?.development.truePotential;
  assertEqual(after, before, 'truePotential unchanged');
  assert(!!v5.club.footballSquad[0].playerLife?.development.potentialEstimate, 'estimate still present');
}

section('Transfer window rules');
{
  assertEqual(resolveTransferWindowPhase(10), 'closed', 'mid-season closed');
  assertEqual(resolveTransferWindowPhase(25), 'summer', 'summer window');
  assertEqual(resolveTransferWindowPhase(50), 'winter', 'winter window');
  const closed = buildTransferWindowState(10);
  assert(!checkPermanentTransferAllowed(closed).allowed, 'blocked when closed');
  const summer = buildTransferWindowState(25);
  assert(checkPermanentTransferAllowed(summer).allowed, 'allowed in summer');
}

section('KnowledgeState — own squad vs external market');
{
  const v5 = ensureRecruitmentV5(minimalV4Save());
  const clubId = v5.club.id;
  const squadId = v5.club.footballSquad[0].id;
  const marketId = v5.scoutMarket[0].id;
  const own = v5.recruitmentWorld!.knowledgeByObserverClubId[clubId][squadId];
  const ext = v5.recruitmentWorld!.knowledgeByObserverClubId[clubId][marketId];
  assert(own.confidencePct >= RECRUITMENT_TUNING.knowledge.baseConfidenceOwnSquad - 1, 'own high confidence');
  assert(ext.confidencePct <= RECRUITMENT_TUNING.knowledge.baseConfidenceExternal + 5, 'external low confidence');
  const extWidth = ext.potentialBandMax - ext.potentialBandMin;
  const ownWidth = own.potentialBandMax - own.potentialBandMin;
  assert(extWidth > ownWidth, 'external wider potential band than own squad');
}

section('Observed view never exposes canonical Player fields');
{
  const v5 = ensureRecruitmentV5(minimalV4Save());
  const clubId = v5.club.id;
  const marketId = v5.scoutMarket[0].id;
  const player = v5.scoutMarket[0];
  const view = getObservedPlayerView(v5.recruitmentWorld!, clubId, marketId)!;
  assert(!!view, 'observed view exists');
  const keySet = new Set(Object.keys(view));
  assert(!keySet.has('trueOverall'), 'no trueOverall key');
  assert(!keySet.has('potential'), 'no exact potential key');
  assert(!keySet.has('overall'), 'no exact overall key');
  assert(
    view.estimatedPotential < player.potential || view.estimatedPotential > player.potential || view.potentialBand.max - view.potentialBand.min > 4,
    'market target not pinned to exact true potential via midpoint',
  );
}

section('Progressive reveal unlocks stages with confidence');
{
  const base: KnowledgeState = {
    observerClubId: 'c1',
    playerId: 'p1',
    confidencePct: 0,
    ratingMin: 60,
    ratingMax: 80,
    potentialBandMin: 70,
    potentialBandMax: 90,
    valueMin: 1,
    valueMax: 2,
    revealedGroups: [],
    lastUpdatedWeek: 1,
  };
  const low = applyProgressiveReveal(base);
  assert(low.revealedGroups.includes('technical'), 'technical at 0%');
  assert(!low.revealedGroups.includes('personality'), 'personality gated');
  const high = applyProgressiveReveal({ ...base, confidencePct: 85 });
  assert(high.revealedGroups.includes('personality'), 'personality at 85%');
  assert(high.revealedGroups.includes('injury_concerns'), 'injury at 85%');
}

section('Deterministic knowledge — identical seeds');
{
  const truth = {
    playerId: 'p_det',
    trueOverall: 77,
    truePotential: 88,
    trueMarketValue: 500_000,
    attributeTruth: { technical: 75, physical: 76, mental: 74 },
    injuryConcernTruth: 10,
  };
  const a = createInitialKnowledge({
    worldSeed: 12345,
    gameWeek: 3,
    observerClubId: 'obs_a',
    playerId: 'p_det',
    isOwnSquad: false,
    truth,
  });
  const b = createInitialKnowledge({
    worldSeed: 12345,
    gameWeek: 3,
    observerClubId: 'obs_a',
    playerId: 'p_det',
    isOwnSquad: false,
    truth,
  });
  assertEqual(JSON.stringify(a), JSON.stringify(b), 'same inputs → same knowledge');
}

section('Different seeds may vary external estimates');
{
  const truth = {
    playerId: 'p_var',
    trueOverall: 77,
    truePotential: 88,
    trueMarketValue: 500_000,
    attributeTruth: { technical: 75, physical: 76, mental: 74 },
    injuryConcernTruth: 10,
  };
  const a = createInitialKnowledge({
    worldSeed: 1,
    gameWeek: 3,
    observerClubId: 'obs',
    playerId: 'p_var',
    isOwnSquad: false,
    truth,
  });
  const b = createInitialKnowledge({
    worldSeed: 999_999,
    gameWeek: 3,
    observerClubId: 'obs',
    playerId: 'p_var',
    isOwnSquad: false,
    truth,
  });
  const varied =
    a.ratingMin !== b.ratingMin ||
    a.ratingMax !== b.ratingMax ||
    a.potentialBandMin !== b.potentialBandMin;
  assert(varied, 'different world seeds produce different observed ranges');
}

section('Confidence adjustment narrows ranges');
{
  const v5 = ensureRecruitmentV5(minimalV4Save());
  const clubId = v5.club.id;
  const marketId = v5.scoutMarket[0].id;
  const rw = v5.recruitmentWorld!;
  const before = rw.knowledgeByObserverClubId[clubId][marketId];
  const truth = rw.worldPlayers[marketId];
  const after = adjustKnowledgeConfidence(before, truth, rw.worldSeed, rw.gameWeek, 25);
  const wBefore = before.ratingMax - before.ratingMin;
  const wAfter = after.ratingMax - after.ratingMin;
  assert(after.confidencePct > before.confidencePct, 'confidence increased');
  assert(wAfter <= wBefore, 'range narrows or stays equal');
}

section('Public export surface excludes true-profile accessors');
{
  const indexSrc = readFileSync('src/domain/recruitment/index.ts', 'utf8');
  const forbidden = [
    'buildTrueWorldPlayerFromCanonical',
    'getInternalTruePlayer',
    'TrueWorldPlayer',
    'worldPlayers',
  ];
  for (const token of forbidden) {
    assert(!indexSrc.includes(token), `index must not mention ${token}`);
  }
}

section('No Math.random in recruitment domain sources');
{
  const root = 'src/domain/recruitment';
  const walk = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) files.push(...walk(p));
      else if (e.name.endsWith('.ts')) files.push(p);
    }
    return files;
  };
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    assert(!src.includes('Math.random'), `Math.random forbidden in ${file}`);
  }
}

section('Persistence pipeline applies recruitment v5');
{
  const raw = minimalV4Save() as unknown as Record<string, unknown>;
  const migrated = persistenceService.migrate(raw, (c) => c, (s) => s as GameSaveData);
  assertEqual(migrated.saveVersion, CURRENT_SAVE_VERSION, 'pipeline current version');
  assert(!!migrated.recruitmentWorld, 'pipeline adds recruitmentWorld');
}

finish();
