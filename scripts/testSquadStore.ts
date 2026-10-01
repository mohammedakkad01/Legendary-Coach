/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 1 store integration: useGameStore.moveSquadEntity applies validated
 * moves to the real club state and refuses invalid ones without touching it.
 */

class MockLocalStorage {
  private data: Record<string, string> = {};
  getItem(k: string) { return k in this.data ? this.data[k] : null; }
  setItem(k: string, v: string) { this.data[k] = String(v); }
  removeItem(k: string) { delete this.data[k]; }
  clear() { this.data = {}; }
}
// @ts-ignore — Node has no localStorage; must exist before the store module loads.
globalThis.localStorage = new MockLocalStorage();

import { assert, assertEqual, finish, section } from './lib/testHarness';

async function run() {
  const { soundEffects } = await import('../src/audio/soundFX');
  soundEffects.enabled = false; // Node has no Web Audio
  const { useGameStore } = await import('../src/state/useGameStore');
  const { REAL_INITIAL_PLAYER_CLUB } = await import('../src/data/realFootballData');
  const { createSquadState } = await import('../src/domain/squad/squadStateAdapter');
  const { validateSquadState } = await import('../src/domain/squad/squadRules');
  const { EMPTY_SLOT } = await import('../src/domain/squad/squadTypes');

  section('Test 1: moveSquadEntity on the real starting club');
  const club0 = JSON.parse(JSON.stringify(REAL_INITIAL_PLAYER_CLUB));
  useGameStore.setState({ club: club0 });
  const before = useGameStore.getState().club;
  const startingSquad = createSquadState(before);
  assertEqual(startingSquad.repairs, [], 'the shipped starting club needs no repairs');
  assertEqual(validateSquadState(startingSquad.state), [], 'the shipped starting club satisfies every squad rule');

  const xi = before.footballLineup;
  const a = xi[2], b = xi[3];
  const r = useGameStore.getState().moveSquadEntity(a, { section: 'starting', slotIndex: 3 });
  const after = useGameStore.getState().club;
  assert(r.ok && r.value.kind === 'swapped', 'valid move returns an ok Result');
  assert(after.footballLineup[3] === a && after.footballLineup[2] === b, 'the store lineup reflects the swap');
  assert(before.footballLineup[2] === a, 'the previous club object was not mutated (immutability)');

  section('Test 2: invalid move leaves the store untouched');
  const snap = JSON.stringify(useGameStore.getState().club.footballLineup);
  const gk = useGameStore.getState().club.footballLineup[0];
  const bad = useGameStore.getState().moveSquadEntity(gk, { section: 'starting', slotIndex: 5 });
  assert(!bad.ok && bad.error.code === 'RULE_VIOLATION', 'goalkeeper into an outfield slot is refused with a typed error');
  assertEqual(JSON.stringify(useGameStore.getState().club.footballLineup), snap, 'lineup unchanged after a refused move');
  const unknown = useGameStore.getState().moveSquadEntity('no-such-player', { section: 'bench' });
  assert(!unknown.ok && unknown.error.code === 'PLAYER_NOT_IN_SQUAD', 'unknown player refused');

  section('Test 3: sections round-trip through the store');
  const starter = useGameStore.getState().club.footballLineup[7];
  const toBench = useGameStore.getState().moveSquadEntity(starter, { section: 'bench' });
  const c1 = useGameStore.getState().club;
  assert(toBench.ok && c1.footballLineup[7] === EMPTY_SLOT && !c1.footballBench.includes(starter), 'XI → bench leaves an empty slot');
  const back = useGameStore.getState().moveSquadEntity(starter, { section: 'starting', slotIndex: 7 });
  assert(back.ok && useGameStore.getState().club.footballLineup[7] === starter, 'bench → the empty slot restores him');
  assertEqual(validateSquadState(createSquadState(useGameStore.getState().club).state), [], 'squad still fully valid afterwards');

  finish('Squad store tests');
}
run().catch((e) => { console.error('❌ Test crashed:', e); process.exit(1); });
