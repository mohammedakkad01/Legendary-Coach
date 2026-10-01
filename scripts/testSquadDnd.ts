/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 2 pure-logic tests: the drag-and-drop state machine (reduceDnd) and
 * the drop-target string codec. No DOM — see the file headers for why these
 * two are kept pure and DOM-free in the first place.
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { reduceDnd, initialDndState } from '../src/hooks/squadDnd/dndReducer';
import type { DndState } from '../src/hooks/squadDnd/dndReducer';
import { encodeDropTarget, parseDropTarget } from '../src/hooks/squadDnd/dropTargetCodec';
import { locationToTarget } from '../src/domain/squad/squadTypes';
import type { MoveTarget, SquadLocation } from '../src/domain/squad/squadTypes';

const startLoc = (i: number): SquadLocation => ({ section: 'starting', slotIndex: i });
const subLoc = (i: number): SquadLocation => ({ section: 'substitutes', index: i });
const benchLoc: SquadLocation = { section: 'bench' };

section('Test 1: drop-target codec round-trips');
{
  const targets: MoveTarget[] = [
    { section: 'starting', slotIndex: 0 }, { section: 'starting', slotIndex: 10 },
    { section: 'substitutes', index: 0 }, { section: 'substitutes', index: 4 },
    { section: 'substitutes' }, { section: 'bench' },
  ];
  for (const t of targets) {
    const encoded = encodeDropTarget(t);
    assertEqual(parseDropTarget(encoded), t, `round-trips ${encoded}`);
  }
  assertEqual(parseDropTarget(null), null, 'null → null');
  assertEqual(parseDropTarget(undefined), null, 'undefined → null');
  assertEqual(parseDropTarget(''), null, 'empty string → null');
  assertEqual(parseDropTarget('garbage'), null, 'unrecognized string → null');
  assertEqual(parseDropTarget('starting:-1'), null, 'negative slot index does not match the pattern → null');
  assertEqual(parseDropTarget('starting:3.5'), null, 'non-integer slot index → null');
}

section('Test 2: TAP_CARD / TAP_TARGET — the tap-tap and keyboard fallback');
{
  let s: DndState = initialDndState;
  let r = reduceDnd(s, { type: 'TAP_CARD', playerId: 'p1', location: startLoc(0), source: 'tap' });
  assertEqual(r.state, { phase: 'picked', playerId: 'p1', location: startLoc(0), source: 'tap' }, 'idle + tap a card → picked');
  assertEqual(r.moveRequest, null, 'picking never itself requests a move');
  s = r.state;

  r = reduceDnd(s, { type: 'TAP_CARD', playerId: 'p1', location: startLoc(0), source: 'tap' });
  assertEqual([r.state, r.moveRequest], [{ phase: 'idle' }, null], 'tapping the SAME picked card again cancels (toggle off)');

  r = reduceDnd(s, { type: 'TAP_TARGET', target: { section: 'starting', slotIndex: 3 } });
  assertEqual(r.state, { phase: 'idle' }, 'dropping onto a target returns to idle');
  assertEqual(r.moveRequest, { playerId: 'p1', target: { section: 'starting', slotIndex: 3 } }, 'and requests exactly that move');

  r = reduceDnd(initialDndState, { type: 'TAP_TARGET', target: { section: 'bench' } });
  assertEqual([r.state, r.moveRequest], [initialDndState, null], 'TAP_TARGET while idle is ignored (nothing picked)');

  r = reduceDnd(s, { type: 'TAP_CARD', playerId: 'p2', location: subLoc(1), source: 'keyboard' });
  assertEqual(r.state, { phase: 'picked', playerId: 'p2', location: subLoc(1), source: 'keyboard' }, 'picking a DIFFERENT card while one is picked switches the pick (used when idle→picked via keyboard on a new card)');

  // The "second tap on any card = drop onto it" behavior lives in the hook
  // (it dispatches TAP_TARGET with locationToTarget(that card's own location)
  // instead of TAP_CARD once something is already picked) — verified here at
  // the level the hook actually calls the reducer:
  r = reduceDnd(s, { type: 'TAP_TARGET', target: locationToTarget(subLoc(2)) });
  assertEqual(r.moveRequest, { playerId: 'p1', target: { section: 'substitutes', index: 2 } }, 'hook-style second-tap-as-drop swaps the ORIGINALLY picked player into the second card’s slot');
  r = reduceDnd(s, { type: 'TAP_TARGET', target: locationToTarget(benchLoc) });
  assertEqual(r.moveRequest, { playerId: 'p1', target: { section: 'bench' } }, 'same pattern works for a bench row (no index)');
}

section('Test 3: DRAG_START / DRAG_MOVE / DRAG_END — real pointer dragging');
{
  let r = reduceDnd(initialDndState, { type: 'DRAG_START', playerId: 'p1', location: startLoc(2), x: 10, y: 20 });
  assertEqual(r.state, { phase: 'dragging', playerId: 'p1', location: startLoc(2), x: 10, y: 20, hoverTarget: null }, 'DRAG_START enters dragging at the start point, no hover yet');
  assertEqual(r.moveRequest, null, 'starting a drag never itself requests a move');
  let s = r.state;

  r = reduceDnd(s, { type: 'DRAG_MOVE', x: 50, y: 60, hoverTarget: { section: 'substitutes', index: 1 } });
  assert(r.state.phase === 'dragging' && r.state.x === 50 && r.state.y === 60 && JSON.stringify(r.state.hoverTarget) === JSON.stringify({ section: 'substitutes', index: 1 }), 'DRAG_MOVE updates position and hover target');
  assertEqual(r.moveRequest, null, 'moving never requests a move');
  s = r.state;

  r = reduceDnd(s, { type: 'DRAG_END', target: { section: 'substitutes', index: 1 } });
  assertEqual(r.state, { phase: 'idle' }, 'DRAG_END returns to idle');
  assertEqual(r.moveRequest, { playerId: 'p1', target: { section: 'substitutes', index: 1 } }, 'and requests the move to wherever it was dropped');

  r = reduceDnd(s, { type: 'DRAG_END', target: null });
  assertEqual([r.state, r.moveRequest], [{ phase: 'idle' }, null], 'dropped over nothing (no valid target) → cancelled, no move requested');

  r = reduceDnd(initialDndState, { type: 'DRAG_MOVE', x: 1, y: 1, hoverTarget: null });
  assertEqual(r.state, initialDndState, 'DRAG_MOVE while idle is ignored');
  r = reduceDnd(initialDndState, { type: 'DRAG_END', target: { section: 'bench' } });
  assertEqual([r.state, r.moveRequest], [initialDndState, null], 'DRAG_END while idle is ignored');

  const picked: DndState = { phase: 'picked', playerId: 'p1', location: startLoc(0), source: 'tap' };
  r = reduceDnd(picked, { type: 'DRAG_START', playerId: 'p1', location: startLoc(0), x: 5, y: 5 });
  assertEqual(r.state.phase, 'dragging', 'a real drag can start even while something was tap-picked (drag takes over)');
}

section('Test 4: CANCEL / ESCAPE from any phase');
{
  for (const s of [
    initialDndState,
    { phase: 'picked', playerId: 'p1', location: startLoc(0), source: 'tap' } as DndState,
    { phase: 'dragging', playerId: 'p1', location: startLoc(0), x: 1, y: 2, hoverTarget: null } as DndState,
  ]) {
    const r = reduceDnd(s, { type: 'CANCEL' });
    assertEqual([r.state, r.moveRequest], [{ phase: 'idle' }, null], `CANCEL from ${s.phase} → idle, no move`);
  }
}

section('Test 5: reduceDnd never mutates the state it was given');
{
  const s: DndState = { phase: 'dragging', playerId: 'p1', location: startLoc(0), x: 1, y: 2, hoverTarget: null };
  const frozen = Object.freeze({ ...s });
  const before = JSON.stringify(frozen);
  reduceDnd(frozen as DndState, { type: 'DRAG_MOVE', x: 99, y: 99, hoverTarget: { section: 'bench' } });
  assertEqual(JSON.stringify(frozen), before, 'the input state object is untouched (frozen object would throw if mutated)');
}

finish('Squad DnD (pure) tests');
