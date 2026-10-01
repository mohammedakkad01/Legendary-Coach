/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 4 integration tests — the opponent adapter, the store's
 * applyBestTactics action (atomic, rejects stale / VIP-locked results) and the
 * pure half of useBestTactics (input building + memo key stability).
 * Run: npx tsx scripts/testBestTacticsIntegration.ts
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
import type { Club, Fixture, PreMatchData } from '../src/types/game';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

async function run() {
  const { soundEffects } = await import('../src/audio/soundFX');
  soundEffects.enabled = false; // Node has no Web Audio
  const { useGameStore } = await import('../src/state/useGameStore');
  const { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } = await import('../src/data/realFootballData');
  const { buildSlotAssignments, calcAttackPower, calcDefensePower } = await import('../src/engine/matchPrediction');
  const { deriveOpponentProfile, recommendBestTactics } = await import('../src/domain/tactics/bestTactics');
  const { createSquadState } = await import('../src/domain/squad/squadStateAdapter');
  const { validateForKickoff } = await import('../src/domain/squad/squadRules');
  const { getUnlockedFormations, getMaxBenchSlots } = await import('../src/domain/vip/vipCalculations');
  const { VIP_LEVELS } = await import('../src/data/vipData');
  const { buildBestTacticsInput, bestTacticsInputKey, isInsightCurrent, toBestTacticsPlayer } = await import('../src/hooks/bestTactics/bestTacticsInput');
  const { bestTacticsErrorText } = await import('../src/i18n/bestTactics');

  const maxVipPoints = Math.max(...VIP_LEVELS.map((t) => t.pointsRequired));

  // ---------------------------------------------------------------- 1. opponent adapter
  section('1) deriveOpponentProfile uses the pre-match power functions and the opponent tactics');
  {
    const opp: Club = clone(REAL_OPPONENT_CLUBS[0]);
    const before = JSON.stringify(opp);
    const prof = deriveOpponentProfile(opp);
    const xi = buildSlotAssignments(opp);
    assert(!!prof, 'a real opponent club yields a profile');
    assertEqual(prof?.attack, calcAttackPower(xi), 'attack === calcAttackPower(buildSlotAssignments(opponent))');
    assertEqual(prof?.defense, calcDefensePower(xi), 'defense === calcDefensePower(buildSlotAssignments(opponent))');
    assertEqual(
      [prof?.formation, prof?.mentality, prof?.pressing],
      [opp.footballTactics.formation, opp.footballTactics.mentality, opp.footballTactics.pressing],
      'formation / mentality / pressing come from the opponent club footballTactics',
    );
    assertEqual(JSON.stringify(opp), before, 'the opponent club is not mutated');
    assertEqual(deriveOpponentProfile(opp), prof, 'deterministic: same club → same profile');

    assert(deriveOpponentProfile(null) === undefined, 'no next match (null) → undefined');
    assert(deriveOpponentProfile(undefined) === undefined, 'no next match (undefined) → undefined');
    assert(deriveOpponentProfile({ ...opp, footballSquad: [] }) === undefined, 'opponent with an empty squad → undefined');

    const weaker: Club = clone(opp);
    weaker.footballSquad = weaker.footballSquad.map((p) => ({ ...p, overall: Math.max(30, p.overall - 25), attributes: {} as typeof p.attributes }));
    const wp = deriveOpponentProfile(weaker);
    assert(!!wp && !!prof && (wp.attack ?? 0) < (prof.attack ?? 0) && (wp.defense ?? 0) < (prof.defense ?? 0), 'a much weaker opponent squad → lower attack and defense');

    const userClub: Club = clone(REAL_INITIAL_PLAYER_CLUB);
    const base = buildBestTacticsInput(userClub, undefined, 7);
    const a = recommendBestTactics({ ...base, opponent: prof });
    const b = recommendBestTactics(base);
    assert(a.ok && b.ok, 'recommender runs with and without an opponent profile');
    if (a.ok && b.ok) {
      assert(a.value.reasons.some((r) => r.code.startsWith('opponent_') && r.code !== 'opponent_unknown'), 'with a profile the reasons compare against the real opponent');
      assert(b.value.reasons.some((r) => r.code === 'opponent_unknown'), 'without a profile the reasons say the opponent is unknown');
    }
  }

  // ---------------------------------------------------------------- 2. store action
  section('2) useGameStore.applyBestTactics applies atomically');
  {
    const club0: Club = clone(REAL_INITIAL_PLAYER_CLUB);
    useGameStore.setState({ club: club0, vipPoints: maxVipPoints });
    const input = buildBestTacticsInput(club0, deriveOpponentProfile(clone(REAL_OPPONENT_CLUBS[0])), getMaxBenchSlots(maxVipPoints));
    const rec = recommendBestTactics(input);
    assert(rec.ok, 'recommendation computed for the shipped club');
    if (rec.ok) {
      let notifications = 0;
      const unsub = useGameStore.subscribe(() => { notifications += 1; });
      const res = useGameStore.getState().applyBestTactics(rec.value);
      unsub();
      const after = useGameStore.getState().club;
      assert(res.ok, 'apply returns Ok');
      assertEqual(notifications, 1, 'exactly ONE store update for lineup + substitutes + tactics');
      assertEqual(after.footballLineup, rec.value.lineup.slice().sort((x, y) => x.slotIndex - y.slotIndex).map((l) => l.playerId), 'club.footballLineup = recommended XI in slot order');
      assertEqual(after.footballBench, [...rec.value.substitutes], 'club.footballBench = recommended substitutes');
      assertEqual(
        [after.footballTactics.formation, after.footballTactics.mentality, after.footballTactics.pressing, after.footballTactics.passing, after.footballTactics.tempo, after.footballTactics.width, after.footballTactics.offsideTrap],
        [rec.value.formation, rec.value.tactics.mentality, rec.value.tactics.pressing, rec.value.tactics.passing, rec.value.tactics.tempo, rec.value.tactics.width, rec.value.tactics.offsideTrap],
        'club.footballTactics = recommended settings',
      );
      assertEqual(validateForKickoff(createSquadState(after, { maxSubstitutes: getMaxBenchSlots(maxVipPoints) }).state), [], 'applied squad passes validateForKickoff');
      assertEqual(club0.footballLineup, REAL_INITIAL_PLAYER_CLUB.footballLineup, 'the previous club object was not mutated');
    }
  }

  section('3) applyBestTactics rejects a stale recommendation and leaves the store untouched');
  {
    const club0: Club = clone(REAL_INITIAL_PLAYER_CLUB);
    useGameStore.setState({ club: club0, vipPoints: maxVipPoints });
    const rec = recommendBestTactics(buildBestTacticsInput(club0, undefined, getMaxBenchSlots(maxVipPoints)));
    if (!rec.ok) assert(false, 'setup: recommendation computed');
    else {
      const victim = rec.value.lineup[3].playerId;
      const injured: Club = { ...club0, footballSquad: club0.footballSquad.map((p) => (p.id === victim ? { ...p, injuredWeeks: 2 } : p)) };
      useGameStore.setState({ club: injured });
      const ref = useGameStore.getState().club;
      let notifications = 0;
      const unsub = useGameStore.subscribe(() => { notifications += 1; });
      const res = useGameStore.getState().applyBestTactics(rec.value);
      unsub();
      assert(!res.ok && res.error.code === 'UNAVAILABLE_PLAYER', 'a player injured after the analysis → UNAVAILABLE_PLAYER');
      assert(useGameStore.getState().club === ref, 'club object identical (no write)');
      assertEqual(notifications, 0, 'no store notification on Err');
      if (!res.ok) assert(bestTacticsErrorText(res.error, true).length > 0 && bestTacticsErrorText(res.error, false).length > 0, 'the error localizes in ar + en');

      const sold: Club = { ...club0, footballSquad: club0.footballSquad.filter((p) => p.id !== victim) };
      useGameStore.setState({ club: sold });
      const ref2 = useGameStore.getState().club;
      const res2 = useGameStore.getState().applyBestTactics(rec.value);
      assert(!res2.ok && res2.error.code === 'INVALID_RESULT', 'a recommended player sold after the analysis → INVALID_RESULT');
      assert(useGameStore.getState().club === ref2, 'club untouched after INVALID_RESULT');
    }
  }

  section('4) VIP-locked formations: recommender respects allowedFormations; Apply does not block saves');
  {
    const club0: Club = clone(REAL_INITIAL_PLAYER_CLUB);
    const allowed = getUnlockedFormations(1);
    assert(!allowed.includes('3-4-3') && !allowed.includes('4-1-4-1'), 'VIP 1 unlocks neither 4-1-4-1 nor 3-4-3');
    assertEqual(getUnlockedFormations(3).length, 7, 'VIP 3 unlocks all 7 formations');
    const rec = recommendBestTactics(buildBestTacticsInput(club0, undefined, 5, allowed));
    assert(rec.ok && allowed.includes(rec.value.formation), 'recommended formation is unlocked at VIP 1');
    if (rec.ok) assert(rec.value.alternatives.every((a) => allowed.includes(a.formation)), 'alternatives are unlocked at VIP 1 too');

    const clubOn343: Club = {
      ...club0,
      footballTactics: { ...club0.footballTactics, formation: '3-4-3' },
    };
    useGameStore.setState({ club: clubOn343, vipPoints: 0 });
    assertEqual(useGameStore.getState().club.footballTactics.formation, '3-4-3', 'grandfathered 3-4-3 on a save at VIP 1 is kept (no save/match block)');
    const recV1 = recommendBestTactics(buildBestTacticsInput(clubOn343, undefined, 5, allowed));
    assert(recV1.ok && !allowed.includes('3-4-3') && recV1.value.formation !== '3-4-3', 'new Best Tactics suggestions respect VIP formation cap');
  }

  section('4b) synthetic opponent tactics vary by club id (pre-match / Best Tactics adapter)');
  {
    const { deriveSyntheticOpponentTactics, opponentTacticsWithRoles } = await import('../src/domain/tactics/deriveSyntheticOpponentTactics');
    const a = deriveSyntheticOpponentTactics('club_a', 4);
    const b = deriveSyntheticOpponentTactics('club_b', 4);
    assertEqual(deriveSyntheticOpponentTactics('club_a', 4), a, 'deterministic per club id');
    assert(
      a.formation !== b.formation || a.pressing !== b.pressing || a.mentality !== b.mentality,
      'different club ids produce different tactical profiles (sample pair)',
    );
    const roles = opponentTacticsWithRoles(a, ['gk', 'd1', 'd2']);
    assertEqual(roles.captainId, 'd1', 'role ids come from the opponent XI, not REAL_INITIAL_PLAYER_CLUB');
  }

  // ---------------------------------------------------------------- 5. hook (pure part)
  section('5) useBestTactics memo key is stable and sensitive to what matters');
  {
    const club: Club = clone(REAL_INITIAL_PLAYER_CLUB);
    const opp = deriveOpponentProfile(clone(REAL_OPPONENT_CLUBS[0]));
    const key = (c: Club, o = opp, subs = 7) => bestTacticsInputKey(buildBestTacticsInput(c, o, subs));
    const k0 = key(club);

    assertEqual(key(clone(club)), k0, 'same club (deep copy) → same key');
    assertEqual(key({ ...club, footballSquad: [...club.footballSquad].reverse() }), k0, 'squad order does not change the key');
    const reordered = { ...club, footballSquad: club.footballSquad.map((p) => ({ ...p, attributes: Object.fromEntries(Object.entries(p.attributes ?? {}).reverse()) as typeof p.attributes })) };
    assertEqual(key(reordered), k0, 'attribute property order does not change the key');
    const unrelated = { ...club, footballSquad: club.footballSquad.map((p) => ({ ...p, marketValue: p.marketValue + 1, name: `${p.name}!` })) };
    assertEqual(key(unrelated), k0, 'fields the recommender ignores (name, market value) do not change the key');

    const p0 = club.footballSquad[0].id;
    const withFatigue = { ...club, footballSquad: club.footballSquad.map((p) => (p.id === p0 ? { ...p, fatigue: p.fatigue + 10 } : p)) };
    const withInjury = { ...club, footballSquad: club.footballSquad.map((p) => (p.id === p0 ? { ...p, injuredWeeks: 1 } : p)) };
    const withSuspension = { ...club, footballSquad: club.footballSquad.map((p) => (p.id === p0 ? { ...p, suspendedMatches: 1 } : p)) };
    const swapped = [...club.footballLineup]; [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    assert(key(withFatigue) !== k0, 'fatigue change → new key');
    assert(key(withInjury) !== k0, 'injury → new key');
    assert(key(withSuspension) !== k0, 'suspension → new key');
    assert(key({ ...club, footballLineup: swapped }) !== k0, 'lineup slot order → new key');
    assert(key({ ...club, footballTactics: { ...club.footballTactics, mentality: 'defensive' } }) !== k0, 'tactics change → new key');
    assert(bestTacticsInputKey(buildBestTacticsInput(club, undefined, 7)) !== k0, 'opponent known vs unknown → new key');
    assert(key(club, opp, 5) !== k0, 'substitutes cap → new key');

    const input = buildBestTacticsInput(club, opp, 7);
    (input.squad[0].attributes as Record<string, number>).pace = -1;
    (input.currentLineup as string[])[0] = 'x';
    assert(club.footballSquad[0].attributes.pace !== -1 && club.footballLineup[0] !== 'x', 'the built input never aliases the club (mutation-safe)');
    assertEqual(Object.keys(toBestTacticsPlayer(club.footballSquad[0])).sort(), ['attributes', 'fatigue', 'form', 'id', 'injuredWeeks', 'morale', 'overall', 'position', 'secondaryPositions', 'stamina', 'suspendedMatches'], 'Player → BestTacticsPlayer keeps exactly the fields the optimizer reads');

    const r1 = recommendBestTactics(buildBestTacticsInput(club, opp, 7));
    const r2 = recommendBestTactics(buildBestTacticsInput({ ...club, footballSquad: [...club.footballSquad].reverse() }, opp, 7));
    assert(r1.ok && r2.ok && r1.value.id === r2.value.id, 'equal keys ⇒ identical recommendation (memoization is sound)');
  }

  section('6) the cached next-match insight is only used while its fixture is unplayed');
  {
    const fx = (matchday: number, played: boolean): Fixture => ({ matchday, opponentClubId: 'o', opponentClubName: 'O', opponentBadge: '', isHome: true, played });
    const insight = { fixture: fx(3, false) } as Pick<PreMatchData, 'fixture'>;
    assert(isInsightCurrent(insight, [fx(1, true), fx(2, true), fx(3, false), fx(4, false)]), 'insight for the next unplayed matchday → current');
    assert(!isInsightCurrent(insight, [fx(1, true), fx(2, true), fx(3, true), fx(4, false)]), 'its matchday has been played → stale');
    assert(!isInsightCurrent(null, [fx(1, false)]), 'no insight → not current');
    assert(!isInsightCurrent(insight, []), 'no fixtures → not current');
  }

  finish('Best Tactics integration');
}
run().catch((e) => { console.error('❌ Test crashed:', e); process.exit(1); });
