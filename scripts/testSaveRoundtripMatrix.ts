/**
 * Save migration & roundtrip matrix (v1→v7).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { persistenceService } from '../src/services/persistenceService';
import { saveService } from '../src/services/persistence/saveService';
import { CURRENT_SAVE_VERSION } from '../src/types/save';
import {
  FIXTURE_BUILDERS,
  buildLegacyV1Raw,
  buildOversizedMatchHistoryFixture,
  buildV7Fixture,
} from './lib/saveFixtures';
import {
  MATCH_HISTORY_MAX_RECENT_RECORDS,
  storyResultsPreservedAfterBound,
} from '../src/services/persistence/matchHistoryBounds';
import { finalizePersistedGameSave } from '../src/services/persistence/finalizePersistedSave';
import { ensureClubManagementV6 } from '../src/domain/clubManagement/migration/migrateClubManagementV6';
import { assert, assertEqual, finish, section } from './lib/testHarness';

const FIXTURE_DIR = join(process.cwd(), 'scripts/fixtures/saves');

function stableCanonicalJson(data: ReturnType<typeof persistenceService.migrate>): string {
  const extracted = saveService.extractSaveData(data as unknown as Record<string, unknown>);
  const { savedAt: _savedAt, ...rest } = extracted;
  return JSON.stringify(rest);
}

function writeFixtureFiles(): void {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(join(FIXTURE_DIR, 'v1.json'), JSON.stringify(buildLegacyV1Raw(), null, 2));
  for (const v of [2, 3, 4, 5, 6, 7]) {
    const builder = FIXTURE_BUILDERS[v] as () => ReturnType<typeof buildV7Fixture>;
    writeFileSync(join(FIXTURE_DIR, `v${v}.json`), JSON.stringify(builder(), null, 2));
  }
}

if (!existsSync(join(FIXTURE_DIR, 'v7.json'))) {
  writeFixtureFiles();
}

function loadFixture(version: number): unknown {
  if (version === 1) {
    return JSON.parse(readFileSync(join(FIXTURE_DIR, 'v1.json'), 'utf8'));
  }
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `v${version}.json`), 'utf8'));
}

section('v1→v7 migrate → extract → serialize → reload → extract stability');
{
  for (const version of [1, 2, 3, 4, 5, 6, 7]) {
    const raw = loadFixture(version);
    const migrated = persistenceService.migrate(raw as Record<string, unknown>);
    assertEqual(migrated.saveVersion, CURRENT_SAVE_VERSION, `v${version} → current saveVersion`);
    assert(!!migrated.clubManagement, `v${version} has canonical clubManagement`);
    assert(
      !migrated.savePassthrough?.clubManagement,
      `v${version} clubManagement not duplicated in passthrough`,
    );

    const pass1 = stableCanonicalJson(migrated);
    const serialized = persistenceService.serialize(JSON.parse(pass1));
    const reloaded = persistenceService.deserialize(serialized);
    assert(reloaded.success && reloaded.data, `v${version} reload succeeds`);
    const pass2 = stableCanonicalJson(reloaded.data!);
    assertEqual(pass1, pass2, `v${version} roundtrip canonical stable`);
  }
}

section('Migration determinism & v7 idempotence');
{
  const raw = loadFixture(6);
  const once = persistenceService.migrate(raw as Record<string, unknown>);
  const twice = persistenceService.migrate(once as unknown as Record<string, unknown>);
  assertEqual(stableCanonicalJson(once), stableCanonicalJson(twice), 'migrate twice is stable');
}

section('Unknown root field preservation');
{
  const raw = loadFixture(2);
  const migrated = persistenceService.migrate(raw as Record<string, unknown>);
  assertEqual(migrated.savePassthrough?.futurePhaseField, { probe: true, n: 2 }, 'passthrough preserved');
  const exported = persistenceService.serialize(migrated);
  const back = persistenceService.deserialize(exported);
  assertEqual(back.data?.savePassthrough?.futurePhaseField, { probe: true, n: 2 }, 'survives roundtrip');
}

section('clubManagement passthrough duplicate recovery');
{
  const canonical = ensureClubManagementV6(buildV7Fixture());
  const duplicate = {
    ...canonical,
    clubManagement: undefined,
    savePassthrough: {
      clubManagement: canonical.clubManagement,
      futurePhaseField: { recovered: true },
    },
  };
  const fixed = persistenceService.migrate(duplicate as unknown as Record<string, unknown>);
  assert(!!fixed.clubManagement, 'recovered clubManagement from passthrough');
  assert(!fixed.savePassthrough?.clubManagement, 'duplicate stripped from passthrough');
  assertEqual(fixed.savePassthrough?.futurePhaseField, { recovered: true }, 'unrelated passthrough kept');
}

section('Assistant + aiNarrationEnabled persistence contract');
{
  const storeLike = {
    ...buildV7Fixture(),
    assistant: {
      ignoredRecommendationIds: ['a1'],
      appliedRecommendationIds: ['b2'],
      explanationCache: { k: { explanation: 'secret', keyPoints: [], timestamp: 'x' } },
      activeRecommendations: [{ id: 'live' }],
      liveTriggerCooldowns: { x: 1 },
    },
    aiNarrationEnabled: false,
  };
  const extracted = saveService.extractSaveData(storeLike as unknown as Record<string, unknown>);
  assertEqual(extracted.aiNarrationEnabled, false, 'ai preference saved');
  assertEqual(extracted.assistant?.ignoredRecommendationIds, ['a1'], 'ignored ids saved');
  assertEqual(extracted.assistant?.appliedRecommendationIds, ['b2'], 'applied ids saved');
  assert(extracted.assistant && !('explanationCache' in extracted.assistant), 'no explanation cache in save');
  const reloaded = persistenceService.deserialize(persistenceService.serialize(extracted));
  assertEqual(reloaded.data?.aiNarrationEnabled, false, 'ai preference roundtrip');
}

section('aiNarrationEnabled default when absent on old saves');
{
  const v3 = loadFixture(3);
  const migrated = persistenceService.migrate(v3 as Record<string, unknown>);
  assert(migrated.aiNarrationEnabled === undefined || migrated.aiNarrationEnabled === true, 'default path ok');
}

section('matchHistory bound preserves story window & caps size');
{
  const huge = buildOversizedMatchHistoryFixture(100);
  assertEqual(huge.matchHistory.length, 100, 'fixture oversized');
  const bounded = finalizePersistedGameSave(huge);
  assertEqual(bounded.matchHistory.length, MATCH_HISTORY_MAX_RECENT_RECORDS, 'history capped');
  assert(
    storyResultsPreservedAfterBound(huge, huge.club.id),
    'story window results unchanged by cap',
  );
  assert(bounded.livingWorld?.phaseF?.clubHistory, 'phaseF history present after fold');
}

section('Transient UI fields not in extractSaveData output');
{
  const extracted = saveService.extractSaveData({
    ...buildV7Fixture(),
    activeTab: 'match',
    preMatchModalOpen: true,
    isMatchLive: true,
    activeEngine: { minute: 44 },
  } as unknown as Record<string, unknown>);
  const json = JSON.stringify(extracted);
  assert(!json.includes('activeTab'), 'no activeTab');
  assert(!json.includes('preMatchModalOpen'), 'no modal flag');
  assert(!json.includes('activeEngine'), 'no engine');
  assert(!json.includes('isMatchLive'), 'no live flag');
}

finish('Save roundtrip matrix');
