/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 1 domain tests: position suitability, formations, tuning config,
 * SquadRules + moveEntity, club adapter, TacticalState.
 */

import { assert, assertEqual, assertThrows, finish, section } from './lib/testHarness';
import { LEGACY_FORMATION_LABELS, LEGACY_RATING_MATRIX, LEGACY_SLOTS } from './lib/legacyGolden';
import { SeededRandom } from '../src/engine/prng';
import { POSITION_SUITABILITY, SQUAD_LIMITS, TACTICAL_DEFAULTS } from '../src/config/gameTuning';
import { FORMATION_COORDINATES, FORMATION_DEFINITIONS, FORMATION_IDS, isFootballFormation } from '../src/domain/squad/formations';
import { FORMATION_POSITIONS } from '../src/data/formationLayouts';
import { computeEffectiveRating, evaluatePositionSuitability, isOutOfPosition } from '../src/domain/squad/positionSuitability';
import { getEffectivePlayerRating } from '../src/utils/playerCalculations';
import { positionGroupOf } from '../src/domain/squad/positionTaxonomy';
import { createSquadRules, validateForKickoff, validateSquadState } from '../src/domain/squad/squadRules';
import { moveEntity } from '../src/domain/squad/moveEntity';
import { getAssignments, getBenchIds, locatePlayer } from '../src/domain/squad/squadQueries';
import { applySquadState, createSquadState } from '../src/domain/squad/squadStateAdapter';
import { EMPTY_SLOT } from '../src/domain/squad/squadTypes';
import type { SquadPlayerRef, SquadState } from '../src/domain/squad/squadTypes';
import { migrateTacticalState, resolveTacticalState, toFootballTactics } from '../src/domain/tactics/tacticalState';
import type { FootballTactics, Player, PlayerPosition } from '../src/types/game';

// ---------------------------------------------------------------- fixtures
const ref = (id: string, position: PlayerPosition, overall = 70, extra: Partial<SquadPlayerRef> = {}): SquadPlayerRef =>
  ({ id, position, overall, ...extra });

/** 4-3-3 slot order: GK RB CB CB LB CDM CM CM RW ST LW */
const STARTERS: SquadPlayerRef[] = [
  ref('gk1', 'GK', 80), ref('rb1', 'RB', 74), ref('cb1', 'CB', 78), ref('cb2', 'CB', 77), ref('lb1', 'LB', 73),
  ref('cdm1', 'CDM', 76), ref('cm1', 'CM', 79), ref('cm2', 'CM', 75), ref('rw1', 'RW', 78), ref('st1', 'ST', 82), ref('lw1', 'LW', 77),
];
const SUBS: SquadPlayerRef[] = [
  ref('gk2', 'GK', 65), ref('cb3', 'CB', 70), ref('cm3', 'CM', 68), ref('st2', 'ST', 72), ref('lw2', 'LW', 66),
];
const BENCH: SquadPlayerRef[] = [ref('gk3', 'GK', 50), ref('cb4', 'CB', 60), ref('st3', 'ST', 61), ref('cm4', 'CM', 55)];

function makeState(over: Partial<{ subs: string[]; slots: string[]; max: number; formation: SquadState['formation'] }> = {}): SquadState {
  const all = [...STARTERS, ...SUBS, ...BENCH];
  return {
    formation: over.formation ?? '4-3-3',
    slots: over.slots ?? STARTERS.map((p) => p.id),
    substitutes: over.subs ?? SUBS.map((p) => p.id),
    players: new Map(all.map((p) => [p.id, p])),
    rules: createSquadRules(over.max ?? 5),
  };
}
const codes = (r: ReturnType<typeof moveEntity>) => (!r.ok && r.error.code === 'RULE_VIOLATION' ? r.error.violations.map((v) => v.code) : []);

// ------------------------------------------------------------- 1. tuning
section('Test 1: Tuning config');
assertThrows(() => { (POSITION_SUITABILITY.multiplier as { natural: number }).natural = 0.1; }, 'tuning object is frozen (mutation throws)');
assert(Object.values(POSITION_SUITABILITY.multiplier).every((v) => v >= 0.05 && v <= 1), 'all suitability multipliers are inside [0.05, 1]');
assert(SQUAD_LIMITS.startingSlots === 11, 'starting slots = 11');
assert(Object.values(TACTICAL_DEFAULTS.defensiveLineFromPressing).every((v) => v >= 0 && v <= 100), 'derived tactical defaults are inside 0-100');

// ------------------------------------------------- 2. suitability (golden)
section('Test 2: Position suitability keeps every legacy number');
let matrixOk = true;
for (const [natural, row] of Object.entries(LEGACY_RATING_MATRIX)) {
  LEGACY_SLOTS.forEach((slot, i) => {
    const player = { position: natural as PlayerPosition, secondaryPositions: [] as PlayerPosition[], overall: 80, fatigue: 20, morale: 70 } as Player;
    const now = getEffectivePlayerRating(player, slot);
    const direct = computeEffectiveRating(player, slot).effective;
    if (now !== row[i] || direct !== row[i]) { matrixOk = false; console.error(`    mismatch ${natural}@${slot}: legacy ${row[i]} now ${now}/${direct}`); }
  });
}
assert(matrixOk, `170 natural×slot ratings identical to the original implementation`);

section('Test 3: Suitability levels & reason breakdown');
const P = (position: PlayerPosition, secondaryPositions: PlayerPosition[] = []) => ({ position, secondaryPositions, overall: 80, fatigue: 0, morale: 50 });
const lv = (pos: PlayerPosition, slot: string, sec: PlayerPosition[] = []) => evaluatePositionSuitability(P(pos, sec), slot);
assertEqual([lv('ST', 'ST').level, lv('ST', 'ST').reason], ['natural', 'natural_position'], 'ST at ST → natural');
assertEqual([lv('LB', 'LWB').level, lv('LB', 'LWB').reason], ['natural', 'natural_position'], 'LB at LWB (alias) → natural');
assertEqual([lv('LB', 'RB').level, lv('LB', 'RB').multiplier], ['very_suitable', 1], 'LB at RB → very_suitable, full efficiency (same family, as before)');
assertEqual([lv('CM', 'ST', ['ST']).level, lv('CM', 'ST', ['ST']).reason], ['very_suitable', 'secondary_position'], 'declared secondary → very_suitable');
assertEqual([lv('CM', 'CAM').level, lv('CM', 'CAM').familyDistance], ['suitable', 1], 'CM at CAM → suitable (1 line)');
assertEqual([lv('CB', 'CDM').level, lv('CB', 'CDM').reason], ['acceptable', 'distant_position_family'], 'CB at CDM → acceptable');
assertEqual([lv('CB', 'ST').level, lv('CB', 'ST').multiplier], ['poor', 0.4], 'CB at ST → poor 0.40');
assertEqual([lv('ST', 'GK').level, lv('ST', 'GK').multiplier, lv('ST', 'GK').reason], ['poor', 0.15, 'goalkeeper_mismatch'], 'outfielder in goal → poor 0.15');
assertEqual([lv('GK', 'ST').reason, lv('GK', 'ST').multiplier], ['goalkeeper_mismatch', 0.15], 'goalkeeper in the field → poor 0.15');
assertEqual([lv('CM', 'XYZ').level, lv('CM', 'XYZ').reason], ['acceptable', 'unknown_slot'], 'unknown slot label → acceptable');
const bd = computeEffectiveRating({ position: 'CB', overall: 80, fatigue: 50, morale: 100 }, 'ST');
assert(Math.abs(bd.effective - Math.round(80 * 0.4 * (1 - 0.5 * 0.3) * 1.1)) < 1e-9, 'breakdown multiplies overall × position × fatigue × morale');
assertEqual([bd.baseOverall, bd.positionMultiplier, bd.delta], [80, 0.4, bd.effective - 80], 'breakdown exposes base, multiplier and delta');
assert(!isOutOfPosition('natural') && !isOutOfPosition('very_suitable') && isOutOfPosition('suitable') && isOutOfPosition('poor'), 'warning icon shows from "suitable" downwards');
const sparse = computeEffectiveRating({ position: 'ST', overall: 70 }, 'ST');
assert(Number.isFinite(sparse.effective), 'missing fatigue/morale/secondaryPositions never produces NaN');
assertEqual(['GK', 'CB', 'CM', 'ST', 'PG'].map((p) => positionGroupOf(p as PlayerPosition)), ['GK', 'DEF', 'MID', 'ATT', null], 'position groups (basketball → null)');

// ----------------------------------------------------------- 4. formations
section('Test 4: Formations — single source of truth');
assertEqual(FORMATION_IDS.slice().sort(), Object.keys(LEGACY_FORMATION_LABELS).sort(), 'same 7 formations as before');
let formationsOk = true;
for (const id of FORMATION_IDS) {
  const def = FORMATION_DEFINITIONS[id];
  const labels = def.slots.map((s) => s.label);
  if (JSON.stringify(labels) !== JSON.stringify(LEGACY_FORMATION_LABELS[id])) formationsOk = false;
  if (JSON.stringify(FORMATION_POSITIONS[id]) !== JSON.stringify(labels)) formationsOk = false;
  if (JSON.stringify(FORMATION_COORDINATES[id].map((c) => c.pos)) !== JSON.stringify(labels)) formationsOk = false;
  if (def.slots.length !== 11 || def.slots[0].core !== 'GK' || def.slots.filter((s) => s.core === 'GK').length !== 1) formationsOk = false;
  if (def.slots.some((s) => s.x < 0 || s.x > 100 || s.y < 0 || s.y > 100 || s.core === null)) formationsOk = false;
}
assert(formationsOk, 'labels equal the original data; derived views agree; 11 slots, exactly one GK at slot 0, coordinates valid');
assert(isFootballFormation('4-3-3') && !isFootballFormation('9-9-9') && !isFootballFormation(undefined), 'isFootballFormation guards unknown values');

// ------------------------------------------------------ 5. validation rules
section('Test 5: SquadRules validation');
assertEqual(validateSquadState(makeState()), [], 'a normal squad has no violations');
assertEqual(validateForKickoff(makeState()), [], 'a normal squad passes the kickoff check');
{
  const v = validateSquadState(makeState({ subs: [...SUBS.map((p) => p.id), 'gk3'] })).map((x) => x.code);
  assert(v.includes('TOO_MANY_SUBSTITUTES'), 'more substitutes than the VIP cap is reported');
  const dup = validateSquadState(makeState({ subs: ['cb1'] })).map((x) => x.code);
  assert(dup.includes('DUPLICATE_PLAYER'), 'a player in XI and substitutes is reported (never in two sections)');
  const unk = validateSquadState(makeState({ subs: ['ghost'] })).map((x) => x.code);
  assert(unk.includes('UNKNOWN_PLAYER'), 'unknown player id is reported');
  const twoGk = ['gk1', 'gk2', ...STARTERS.slice(2).map((p) => p.id)];
  const gkv = validateSquadState(makeState({ slots: twoGk, subs: [] })).map((x) => x.code);
  assert(gkv.includes('MULTIPLE_GOALKEEPERS_IN_XI') && gkv.includes('GOALKEEPER_OUTSIDE_GK_SLOT'), 'two goalkeepers in the XI are reported');
  const noGk = validateSquadState(makeState({ slots: ['cb4', ...STARTERS.slice(1).map((p) => p.id)] })).map((x) => x.code);
  assert(noGk.includes('NO_GOALKEEPER_IN_XI'), 'complete XI without a goalkeeper is reported');
  const holey = makeState({ slots: [EMPTY_SLOT, ...STARTERS.slice(1).map((p) => p.id)] });
  assertEqual(validateSquadState(holey), [], 'a hole in the XI is fine while editing');
  assertEqual(validateForKickoff(holey).map((x) => x.code).sort(), ['INCOMPLETE_XI', 'NO_GOALKEEPER_IN_XI'], 'but not at kickoff');
  const badF = validateSquadState({ ...makeState(), formation: '9-9-9' as SquadState['formation'] }).map((x) => x.code);
  assertEqual(badF, ['INVALID_FORMATION'], 'invalid formation is reported');
}

// ------------------------------------------------------------ 6. moveEntity
section('Test 6: moveEntity — every direction');
{
  const s0 = makeState();
  const snapshot = JSON.stringify([s0.slots, s0.substitutes]);

  let r = moveEntity(s0, 'cb1', { section: 'starting', slotIndex: 3 });
  assert(r.ok && r.value.kind === 'swapped' && r.value.state.slots[2] === 'cb2' && r.value.state.slots[3] === 'cb1' && r.value.displacedPlayerId === 'cb2', 'XI ↔ XI: two starters swap slots');
  assert(JSON.stringify([s0.slots, s0.substitutes]) === snapshot, 'the input state is never mutated');

  r = moveEntity(s0, 'st2', { section: 'starting', slotIndex: 9 });
  assert(r.ok && r.value.state.slots[9] === 'st2' && r.value.state.substitutes[3] === 'st1' && r.value.kind === 'swapped', 'substitute → occupied XI slot: swap, starter takes the substitute\'s place');

  r = moveEntity(s0, 'st3', { section: 'starting', slotIndex: 9 });
  assert(r.ok && r.value.state.slots[9] === 'st3' && !r.value.state.substitutes.includes('st1') && getBenchIds(r.value.state).includes('st1'), 'bench → occupied XI slot: displaced starter goes to the bench');

  r = moveEntity(s0, 'st1', { section: 'substitutes', index: 3 });
  assert(r.ok && r.value.state.slots[9] === 'st2' && r.value.state.substitutes[3] === 'st1', 'XI → occupied substitute index: swap');

  const room = makeState({ subs: ['gk2', 'cb3', 'cm3', 'st2'] });
  r = moveEntity(room, 'cm2', { section: 'substitutes' });
  assert(r.ok && r.value.kind === 'moved' && r.value.state.slots[7] === EMPTY_SLOT && r.value.state.substitutes.length === 5 && r.value.state.substitutes[4] === 'cm2', 'XI → substitutes with room: appended, slot left empty');

  r = moveEntity(s0, 'cm2', { section: 'substitutes' });
  assert(r.ok && r.value.kind === 'swapped' && r.value.displacedPlayerId === 'cm3' && r.value.state.slots[7] === 'cm3', 'XI → FULL substitutes: swaps with the best-fitting substitute (CM slot → cm3)');
  r = moveEntity(s0, 'st1', { section: 'substitutes' });
  assert(r.ok && r.value.displacedPlayerId === 'st2' && r.value.state.slots[9] === 'st2', 'XI → FULL substitutes: striker swaps with the substitute striker');

  r = moveEntity(s0, 'cb4', { section: 'substitutes' });
  assert(r.ok && r.value.displacedPlayerId === 'lw2' && r.value.state.substitutes.includes('cb4') && getBenchIds(r.value.state).includes('lw2'), 'bench → FULL substitutes: lowest-overall substitute is displaced, but the only backup goalkeeper (gk2, 65) is protected');
  r = moveEntity(s0, 'gk3', { section: 'substitutes' });
  assert(r.ok && r.value.displacedPlayerId === 'gk2', 'bench goalkeeper → FULL substitutes: the goalkeeper may replace the lowest-overall substitute (gk2)');
  const twoGkSubs = makeState({ subs: ['gk2', 'gk3', 'cb3', 'cm3', 'st2'] });
  r = moveEntity(twoGkSubs, 'cb4', { section: 'substitutes' });
  assert(r.ok && r.value.displacedPlayerId === 'gk3', 'with two backup goalkeepers either may leave: the lowest-overall one (gk3, 50) does');

  r = moveEntity(room, 'cb4', { section: 'substitutes' });
  assert(r.ok && r.value.kind === 'moved' && r.value.state.substitutes.length === 5 && !r.value.state.substitutes.includes('gk3'), 'bench → substitutes with room: appended');

  r = moveEntity(s0, 'gk2', { section: 'substitutes' });
  assert(r.ok && r.value.kind === 'reordered' && r.value.state.substitutes[4] === 'gk2' && r.value.state.substitutes[0] === 'cb3', 'inside substitutes, no index: moved to the end');
  r = moveEntity(s0, 'gk2', { section: 'substitutes', index: 2 });
  assert(r.ok && r.value.kind === 'swapped' && r.value.state.substitutes[2] === 'gk2' && r.value.state.substitutes[0] === 'cm3', 'inside substitutes, with index: the two swap');
  r = moveEntity(s0, 'gk2', { section: 'substitutes', index: 0 });
  assert(r.ok && r.value.kind === 'noop' && r.value.state === s0, 'dropping a substitute on his own index is a no-op');

  r = moveEntity(s0, 'cm2', { section: 'bench' });
  assert(r.ok && r.value.state.slots[7] === EMPTY_SLOT && getBenchIds(r.value.state).includes('cm2'), 'XI → bench: slot left empty, player is bench');
  r = moveEntity(s0, 'cm3', { section: 'bench' });
  assert(r.ok && !r.value.state.substitutes.includes('cm3') && getBenchIds(r.value.state).includes('cm3'), 'substitutes → bench');
  r = moveEntity(s0, 'cb4', { section: 'bench' });
  assert(r.ok && r.value.kind === 'noop', 'bench → bench is a no-op');

  const hole = moveEntity(s0, 'cm2', { section: 'bench' });
  assert(hole.ok, 'setup: empty slot created');
  if (hole.ok) {
    const filled = moveEntity(hole.value.state, 'cm4', { section: 'starting', slotIndex: 7 });
    assert(filled.ok && filled.value.kind === 'moved' && filled.value.state.slots[7] === 'cm4' && filled.value.displacedPlayerId === null, 'bench → EMPTY XI slot: plain move, no swap');
  }
}

section('Test 7: moveEntity — goalkeeper rules & typed errors');
{
  const s0 = makeState();
  let r = moveEntity(s0, 'gk2', { section: 'starting', slotIndex: 0 });
  assert(r.ok && r.value.state.slots[0] === 'gk2' && r.value.state.substitutes[0] === 'gk1', 'backup goalkeeper replaces the starter (allowed)');

  r = moveEntity(s0, 'cb3', { section: 'starting', slotIndex: 0 });
  assert(!r.ok && codes(r).includes('NO_GOALKEEPER_IN_XI'), 'outfielder into goal with the XI complete → rejected (no goalkeeper)');
  r = moveEntity(s0, 'gk1', { section: 'starting', slotIndex: 5 });
  assert(!r.ok && codes(r).includes('GOALKEEPER_OUTSIDE_GK_SLOT'), 'goalkeeper into an outfield slot → rejected');

  const hole = moveEntity(s0, 'cm2', { section: 'bench' });
  if (hole.ok) {
    r = moveEntity(hole.value.state, 'gk3', { section: 'starting', slotIndex: 7 });
    assert(!r.ok && codes(r).includes('MULTIPLE_GOALKEEPERS_IN_XI'), 'second goalkeeper into an empty slot → rejected');
  }

  r = moveEntity(s0, 'nobody', { section: 'bench' });
  assertEqual(!r.ok && r.error.code, 'PLAYER_NOT_IN_SQUAD', 'unknown player → PLAYER_NOT_IN_SQUAD');
  for (const bad of [-1, 11, 1.5, Number.NaN]) {
    r = moveEntity(s0, 'cb1', { section: 'starting', slotIndex: bad });
    assert(!r.ok && r.error.code === 'INVALID_SLOT_INDEX', `slot index ${bad} → INVALID_SLOT_INDEX`);
  }
  r = moveEntity(s0, 'cb4', { section: 'substitutes', index: -2 });
  assertEqual(!r.ok && r.error.code, 'INVALID_SUBSTITUTE_INDEX', 'negative substitute index → INVALID_SUBSTITUTE_INDEX');
  r = moveEntity(makeState({ max: 0, subs: [] }), 'cb4', { section: 'substitutes' });
  assertEqual(!r.ok && r.error.code, 'SUBSTITUTES_UNAVAILABLE', 'cap 0 → SUBSTITUTES_UNAVAILABLE');
  r = moveEntity({ ...s0, formation: '1-1-1' as SquadState['formation'] }, 'cb4', { section: 'bench' });
  assertEqual(!r.ok && r.error.code, 'INVALID_FORMATION', 'invalid formation → INVALID_FORMATION');

  // Legacy save that is already over the cap can still be repaired by moves.
  const over = makeState({ subs: [...SUBS.map((p) => p.id), 'gk3', 'cb4'], max: 5 });
  const swap = moveEntity(over, 'st3', { section: 'substitutes', index: 0 });
  assert(swap.ok, 'over-cap legacy state: a swap that does not add substitutes is allowed');
  const shrink = moveEntity(over, 'cb4', { section: 'bench' });
  assert(shrink.ok && shrink.value.state.substitutes.length === 6, 'over-cap legacy state: moving a substitute to the bench is allowed');
}

section('Test 8: Invariants hold over 3000 random seeded moves');
{
  const rng = new SeededRandom(20260928);
  let state = makeState();
  const ids = [...state.players.keys()];
  const total = ids.length;
  let accepted = 0; let rejected = 0; let invariantOk = true; let firstBad = '';
  for (let n = 0; n < 3000; n++) {
    const id = ids[rng.nextInt() % total];
    const pick = rng.nextInt() % 3;
    const target = pick === 0
      ? { section: 'starting' as const, slotIndex: rng.nextInt() % 11 }
      : pick === 1
        ? { section: 'substitutes' as const, index: rng.nextInt() % 3 === 0 ? undefined : rng.nextInt() % 7 }
        : { section: 'bench' as const };
    const r = moveEntity(state, id, target);
    if (!r.ok) { rejected++; continue; }
    accepted++;
    state = r.value.state;
    const placed = [...state.slots.filter((x) => x !== EMPTY_SLOT), ...state.substitutes, ...getBenchIds(state)];
    const unique = new Set(placed);
    const ok =
      validateSquadState(state).length === 0 &&
      placed.length === total && unique.size === total &&
      state.slots.length === 11 && state.substitutes.length <= 5 &&
      getAssignments(state).length === total &&
      ids.every((x) => locatePlayer(state, x) !== null);
    if (!ok && invariantOk) { invariantOk = false; firstBad = `after move #${n} (${id} → ${JSON.stringify(target)})`; }
  }
  assert(invariantOk, `no duplicates, no lost players, cap and goalkeeper rules always hold${firstBad ? ' — first break ' + firstBad : ''}`);
  assert(accepted > 300 && rejected > 100, `the fuzz exercised both outcomes (${accepted} accepted / ${rejected} rejected)`);
}

// --------------------------------------------------------------- 9. adapter
section('Test 9: Club adapter (legacy-tolerant)');
{
  const players = [...STARTERS, ...SUBS, ...BENCH].map((p) => ({ ...p, secondaryPositions: [], fatigue: 0, morale: 50 })) as unknown as Player[];
  const club = {
    footballSquad: players,
    footballLineup: STARTERS.map((p) => p.id),
    footballBench: SUBS.map((p) => p.id),
    footballTactics: { formation: '4-3-3' as const },
  };
  const ok1 = createSquadState(club, { maxSubstitutes: 5 });
  assertEqual([ok1.repairs.length, ok1.state.slots.length, ok1.state.substitutes.length], [0, 11, 5], 'a clean club needs no repairs');
  const back = applySquadState(club, ok1.state);
  assertEqual([back.footballLineup, back.footballBench], [club.footballLineup, club.footballBench], 'apply(create(club)) round-trips');

  const sold = createSquadState({ ...club, footballLineup: club.footballLineup.slice(0, 10) });
  assert(sold.state.slots.length === 11 && sold.state.slots[10] === EMPTY_SLOT && sold.repairs.some((x) => x.code === 'LINEUP_PADDED'), 'short lineup (a starter was sold) is padded with an empty slot');
  const messy = createSquadState({
    ...club,
    footballLineup: ['gk1', 'ghost', 'gk1', ...club.footballLineup.slice(3)],
    footballBench: ['cb3', 'cb3', 'st1', 'nobody'],
  });
  const c = messy.repairs.map((x) => x.code);
  assert(['LINEUP_UNKNOWN_ID_CLEARED', 'LINEUP_DUPLICATE_CLEARED', 'BENCH_DUPLICATE_REMOVED', 'BENCH_OVERLAPS_LINEUP_REMOVED', 'BENCH_UNKNOWN_ID_REMOVED'].every((k) => c.includes(k as never)), 'unknown ids, duplicates and overlaps are repaired and reported');
  assertEqual(validateSquadState(messy.state).filter((v) => v.code === 'DUPLICATE_PLAYER' || v.code === 'UNKNOWN_PLAYER'), [], 'a repaired state has no structural violations');
  const badFormation = createSquadState({ ...club, footballTactics: { formation: 'nope' as never } });
  assertEqual([badFormation.state.formation, badFormation.repairs[0]?.code], ['4-3-3', 'FORMATION_DEFAULTED'], 'unknown formation falls back to 4-3-3');
  assertEqual(createSquadState(club, { maxSubstitutes: 99 }).state.rules.maxSubstitutes, SQUAD_LIMITS.absoluteMaxSubstitutes, 'substitutes cap is clamped');
}

// ------------------------------------------------------- 10. TacticalState
section('Test 10: TacticalState (versioned)');
{
  const legacy: FootballTactics = {
    formation: '4-3-3', mentality: 'balanced', tempo: 'standard', passing: 'mixed', pressing: 'mid_press',
    width: 'standard', offsideTrap: false, captainId: '', penaltyTakerId: '', freeKickTakerId: '', cornerTakerId: '',
  } as unknown as FootballTactics;
  const a = resolveTacticalState(legacy);
  assertEqual([a.version, a.defensiveLine, a.defensiveIntensity, a.attackingIntensity, a.possessionFocus, a.directPlay, a.counterAttacking, a.timeWasting],
    [1, 45, 50, 50, 50, 45, 40, 0], 'old tactics (no sliders) resolve with the documented derived defaults');
  const gegen = resolveTacticalState({ ...legacy, pressing: 'gegenpress', mentality: 'all_out_attack', passing: 'short_tiki_taka' });
  assertEqual([gegen.defensiveLine, gegen.defensiveIntensity, gegen.attackingIntensity, gegen.possessionFocus], [85, 90, 90, 85], 'derived defaults follow the enums');
  const custom = resolveTacticalState({ ...legacy, defensiveLine: 150, timeWasting: -5, directPlay: 33.4, possessionFocus: Number.NaN });
  assertEqual([custom.defensiveLine, custom.timeWasting, custom.directPlay, custom.possessionFocus], [100, 0, 33, 50], 'explicit values are clamped/rounded; NaN falls back to the derived default');
  assertEqual(resolveTacticalState(toFootballTactics(a)), a, 'resolve ∘ toFootballTactics is idempotent');
  assertEqual(toFootballTactics(a).tacticalStateVersion, 1, 'persisted shape carries the schema version');
  assertEqual(migrateTacticalState({ ...legacy, tacticalStateVersion: 99 }).version, 1, 'a newer/unknown stored version is normalized to the current one, not rejected');
  assertEqual(resolveTacticalState({ ...legacy, pressing: 'weird' as never }).defensiveLine, 50, 'unknown enum value falls back to the neutral middle');
  assert(legacy.tacticalStateVersion === undefined && (legacy as unknown as Record<string, unknown>).version === undefined, 'input tactics are not mutated');
}

finish('Squad domain tests');
