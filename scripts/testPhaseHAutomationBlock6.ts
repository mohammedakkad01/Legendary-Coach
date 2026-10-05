/**
 * Phase H Block 6 — automation domain + store integration tests.
 */

import { REAL_INITIAL_PLAYER_CLUB } from '../src/data/realFootballData';
import type { Club, Player } from '../src/types/game';
import { SeededRandom } from '../src/engine/prng';
import {
  defaultAutomationSettings,
  loadAutomationPrefs,
  patchAutomationFeature,
  AUTOMATION_PREFS_STORAGE_KEY,
  clearRuntimeAutomationReportsForTests,
  planBenchSubstitutes,
  applyBenchSubstitutePlan,
  applySquadMovePlan,
  buildRotationApplyMoves,
  planRotationLineup,
  buildRotationApplyMoves,
  playersAboveRestedInjuryBaseline,
  runBeforeUserMatchAutomations,
  runWeeklyAutomations,
} from '../src/domain/automation';
import { partitionSquad } from '../src/domain/tactics/bestTactics/availability';
import { pickSubstitutes } from '../src/domain/tactics/bestTactics/roles';
import { computeInMatchInjuryProbability } from '../src/domain/playerLife/injuryRisk';
import { validateForKickoff } from '../src/domain/squad/squadRules';
import { createSquadState } from '../src/domain/squad/squadStateAdapter';
import { EMPTY_SLOT } from '../src/domain/squad/squadTypes';
import { toBestTacticsPlayer } from '../src/hooks/bestTactics/bestTacticsInput';
import { persistenceService } from '../src/services/persistenceService';
import { assert, assertEqual, section, finish } from './lib/testHarness';
import { createEmptyLivingWorld } from '../src/domain/livingWorld';
import { defaultDelegationSlice } from '../src/domain/clubManagement/delegation/runDelegation';
import { createOpeningFinance } from '../src/domain/clubManagement/finance/financeLedger';
import type { ClubManagementState } from '../src/domain/clubManagement/types';
import { ensureRecruitmentV5 } from '../src/domain/recruitment/migration/migrateRecruitmentV5';

class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

// @ts-expect-error node global
globalThis.localStorage = new MockLocalStorage();

function minimalClub(overrides: Partial<Club> = {}): Club {
  return { ...REAL_INITIAL_PLAYER_CLUB, ...overrides };
}

function minimalCm(): ClubManagementState {
  const finance = createOpeningFinance({
    coins: 1_000_000,
    squadWeeklyWages: 50_000,
    season: 1,
    gameWeek: 1,
    timestampIso: new Date().toISOString(),
    entryId: 'open_test',
  });
  return {
    finance,
    staff: { members: [] },
    board: {
      trust: 60,
      objectives: [],
      consequenceLevel: 'stable',
      ultimatumWeek: null,
      warningCount: 0,
    },
    fans: { mood: 60, trust: 60 },
    facilities: { analyticsDepartmentLevel: 3 },
    delegation: defaultDelegationSlice(),
    scheduled: { lastProcessedGameWeek: 0, lastMonthlySummaryWeek: 0 },
    influence: { score: 40, tier: 'developing' },
  };
}

section('Settings defaults off and not in career save');
{
  localStorage.removeItem(AUTOMATION_PREFS_STORAGE_KEY);
  const settings = defaultAutomationSettings();
  assert(!settings.bench.enabled, 'bench off');
  assert(!settings.tactics.enabled, 'tactics off');
  patchAutomationFeature('scout', { enabled: true, mode: 'apply' });
  const loaded = loadAutomationPrefs();
  assertEqual(loaded.settings.scout.mode, 'suggest', 'apply normalized to suggest for scout');
  const exported = persistenceService.exportJson(
    {
      club: minimalClub(),
      livingWorld: createEmptyLivingWorld(1),
    } as never,
    true,
  );
  assert(!exported.includes(AUTOMATION_PREFS_STORAGE_KEY), 'save export excludes automation prefs key');
  assert(!exported.includes('MODAREB_AUTOMATION'), 'save export excludes automation blob');
}

section('Bench suggest plan matches pickSubstitutes');
{
  const club = minimalClub();
  const maxSubs = 7;
  const plan = planBenchSubstitutes(club, maxSubs);
  assert(plan.ok, 'bench plan ok');
  const { state } = createSquadState(club, { maxSubstitutes: maxSubs });
  const squad = club.footballSquad.map(toBestTacticsPlayer);
  const { available } = partitionSquad(squad);
  const xi = new Set(state.slots.filter((id) => id !== EMPTY_SLOT));
  const expected = pickSubstitutes(available, xi, maxSubs);
  assertEqual([...plan.targetSubstituteIds], [...expected], 'bench targets equal pickSubstitutes');
}

section('Bench apply keeps XI and tactics, mutates bench only');
{
  const club = minimalClub();
  const maxSubs = 7;
  const plan = planBenchSubstitutes(club, maxSubs);
  const lineupBefore = [...club.footballLineup];
  const tacticsBefore = JSON.stringify(club.footballTactics);
  const applied = applyBenchSubstitutePlan(club, maxSubs, plan.targetSubstituteIds);
  assert(applied.ok, 'bench apply ok');
  assertEqual(applied.club.footballLineup, lineupBefore, 'XI unchanged');
  assertEqual(JSON.stringify(applied.club.footballTactics), tacticsBefore, 'tactics unchanged');
  assertEqual([...applied.club.footballBench], [...plan.targetSubstituteIds], 'bench matches plan');
  const { state: after } = createSquadState(applied.club, { maxSubstitutes: maxSubs });
  assert(validateForKickoff(after).length === 0, 'kickoff valid');
}

section('Rotation 200-seed injury/fatigue margin');
{
  let pass = 0;
  let failKickoff = 0;
  for (let seed = 0; seed < 200; seed += 1) {
    const rng = new SeededRandom(seed);
    const squad: Player[] = REAL_INITIAL_PLAYER_CLUB.footballSquad.map((p, i) => ({
      ...p,
      id: `p_${seed}_${i}`,
      fatigue: i < 11 ? rng.nextRange(55, 95) : rng.nextRange(5, 35),
      morale: rng.nextRange(40, 90),
      form: rng.nextRange(40, 90) / 10,
    }));
    const lineup = squad.slice(0, 11).map((p) => p.id);
    const club = minimalClub({
      footballSquad: squad,
      footballLineup: lineup,
      footballBench: squad.slice(11, 18).map((p) => p.id),
    });
    const rot = planRotationLineup(club, 7);
    if (!rot.ok) continue;
    const ctx = { medicalCenterLevel: 5, recentMatchesIn7Days: 2, minutesThisMatch: 90, medicalInjuryRiskMult: 1 };
    const unrotatedIds = club.footballLineup.filter((id) => id !== EMPTY_SLOT);
    const rotatedIds = rot.targetSlots.filter((id) => id !== EMPTY_SLOT);
    if (rotatedIds.length !== 11) continue;
    const unrotatedPlayers = squad.filter((p) => unrotatedIds.includes(p.id));
    const rotatedPlayers = squad.filter((p) => rotatedIds.includes(p.id));
    const meanUnrot =
      unrotatedPlayers.reduce((s, p) => s + computeInMatchInjuryProbability(p, ctx), 0) /
      Math.max(1, unrotatedPlayers.length);
    const meanRot =
      rotatedPlayers.reduce((s, p) => s + computeInMatchInjuryProbability(p, ctx), 0) /
      Math.max(1, rotatedPlayers.length);
    const meanFatUnrot =
      unrotatedPlayers.reduce((s, p) => s + (p.fatigue ?? 0), 0) / Math.max(1, unrotatedPlayers.length);
    const meanFatRot =
      rotatedPlayers.reduce((s, p) => s + (p.fatigue ?? 0), 0) / Math.max(1, rotatedPlayers.length);
    const relDrop = meanUnrot > 0 ? (meanUnrot - meanRot) / meanUnrot : 0;
    const fatDrop = meanFatUnrot - meanFatRot;
    const { state } = createSquadState(club, { maxSubstitutes: 7 });
    const moves = buildRotationApplyMoves(state, rot.targetSlots);
    const applied = applySquadMovePlan(club, 7, moves);
    if (!applied.ok || validateForKickoff(createSquadState(applied.club, { maxSubstitutes: 7 }).state).length > 0) {
      failKickoff += 1;
      continue;
    }
    if (relDrop >= 0.05 && fatDrop >= 2) pass += 1;
  }
  assert(pass >= 120, `rotation margin met in ${pass}/200 seeds (kickoff fails ${failKickoff})`);
}

section('Recovery risk gate uses rested baseline');
{
  const tired = minimalClub().footballSquad[0];
  const tiredPlayer: Player = {
    ...tired,
    fatigue: 90,
    playerLife: {
      ...(tired.playerLife ?? {}),
      condition: { ...(tired.playerLife?.condition ?? {}), trainingLoad: 80, sharpness: 50, matchFitness: 70, recoveryQuality: 60, injury: null },
    } as Player['playerLife'],
  };
  const ctx = { medicalCenterLevel: 3, recentMatchesIn7Days: 3, minutesThisMatch: 90 };
  const atRisk = playersAboveRestedInjuryBaseline([tiredPlayer], ctx);
  assert(atRisk.includes(tiredPlayer.id), 'tired player above rested baseline');
  const rested: Player = {
    ...tiredPlayer,
    fatigue: 0,
    playerLife: {
      ...tiredPlayer.playerLife!,
      condition: { ...tiredPlayer.playerLife!.condition, trainingLoad: 0 },
    },
  };
  const atRisk2 = playersAboveRestedInjuryBaseline([rested], ctx);
  assertEqual(atRisk2.length, 0, 'rested player not at risk');
}

section('Before-match automations default off produce no reports');
{
  clearRuntimeAutomationReportsForTests();
  localStorage.removeItem(AUTOMATION_PREFS_STORAGE_KEY);
  const out = runBeforeUserMatchAutomations({
    settings: defaultAutomationSettings(),
    stamps: { lastMatchdayByFeature: {} },
    club: minimalClub(),
    livingWorld: createEmptyLivingWorld(1),
    preMatch: null,
    maxSubstitutes: 7,
    analyticsDepartmentLevel: 3,
    leagueStandings: [],
    saveSnapshot: { matchHistory: [], simulatedMatchdays: [], leagueFixtures: [] },
    injuryCtx: { medicalCenterLevel: 3, recentMatchesIn7Days: 1, minutesThisMatch: 90 },
    timestampIso: new Date().toISOString(),
    gameWeek: 1,
  });
  assertEqual(out.reports.length, 0, 'no reports when all off');
}

section('Weekly scout mirror skips manual delegation');
{
  clearRuntimeAutomationReportsForTests();
  patchAutomationFeature('scout', { enabled: true, mode: 'suggest' });
  const cm = minimalCm();
  cm.delegation.modes.scouting = 'manual';
  const out = runWeeklyAutomations({
    settings: loadAutomationPrefs().settings,
    stamps: { lastMatchdayByFeature: {} },
    club: minimalClub(),
    livingWorld: createEmptyLivingWorld(1),
    clubManagement: cm,
    recruitmentWorld: ensureRecruitmentV5({
      saveVersion: 5,
      saveId: 't',
      savedAt: new Date().toISOString(),
      appVersion: '2.1.0',
      currentSport: 'football',
      language: 'ar',
      soundEnabled: true,
      hasSelectedInitialClub: true,
      isGuest: true,
      hasClaimedLoginBonus: false,
      club: minimalClub(),
    } as never),
    gameWeek: 3,
    matchday: 3,
    timestampIso: new Date().toISOString(),
    injuryCtx: { medicalCenterLevel: 3, recentMatchesIn7Days: 1, minutesThisMatch: 90 },
    weeklyTickEvents: [],
  });
  const scoutReport = out.reports.find((r) => r.feature === 'scout');
  assert(!!scoutReport && scoutReport.status === 'skipped', 'scout skipped manual');
  assert(scoutReport?.reasonCodes.includes('delegation_mode_manual'), 'manual reason');
}

finish('Phase H Block 6 automation');
