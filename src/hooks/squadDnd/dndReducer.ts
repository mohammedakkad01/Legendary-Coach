/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure state machine behind squad drag-and-drop.
 *
 * Three input styles converge on the SAME two events:
 *  - TAP_CARD / TAP_TARGET  → mouse click, touch tap, and Enter/Space on a
 *    focused card or drop zone all dispatch these (this IS the universal
 *    "tap player, then tap destination" fallback, and it is what keyboard
 *    users drive too — no separate keyboard code path to keep in sync).
 *  - DRAG_START / DRAG_MOVE / DRAG_END → real pointer dragging (mouse held
 *    and moved, or a touch long-press followed by movement).
 *
 * No DOM, no store access: `reduceDnd` only decides the next UI state and
 * whether a move should be attempted. The hook (useSquadDnd) wires this to
 * real events and calls the store.
 */

import type { MoveTarget, SquadLocation } from '../../domain/squad/squadTypes';

export type DndSource = 'pointer' | 'tap' | 'keyboard';

export type DndEvent =
  | { readonly type: 'TAP_CARD'; readonly playerId: string; readonly location: SquadLocation; readonly source: DndSource }
  | { readonly type: 'TAP_TARGET'; readonly target: MoveTarget }
  | { readonly type: 'DRAG_START'; readonly playerId: string; readonly location: SquadLocation; readonly x: number; readonly y: number }
  | { readonly type: 'DRAG_MOVE'; readonly x: number; readonly y: number; readonly hoverTarget: MoveTarget | null }
  | { readonly type: 'DRAG_END'; readonly target: MoveTarget | null }
  | { readonly type: 'CANCEL' };

export type DndState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'picked'; readonly playerId: string; readonly location: SquadLocation; readonly source: DndSource }
  | {
      readonly phase: 'dragging';
      readonly playerId: string;
      readonly location: SquadLocation;
      readonly x: number;
      readonly y: number;
      readonly hoverTarget: MoveTarget | null;
    };

export interface MoveRequest {
  readonly playerId: string;
  readonly target: MoveTarget;
}

export interface DndTransition {
  readonly state: DndState;
  /** Set only on the transition that should trigger moveSquadEntity. */
  readonly moveRequest: MoveRequest | null;
}

const idle: DndState = { phase: 'idle' };
const noMove = (state: DndState): DndTransition => ({ state, moveRequest: null });

export function reduceDnd(state: DndState, event: DndEvent): DndTransition {
  switch (event.type) {
    case 'TAP_CARD': {
      // Tapping the already-picked card again cancels the pick.
      if (state.phase === 'picked' && state.playerId === event.playerId) return noMove(idle);
      return noMove({ phase: 'picked', playerId: event.playerId, location: event.location, source: event.source });
    }

    case 'TAP_TARGET': {
      if (state.phase !== 'picked') return noMove(state);
      return { state: idle, moveRequest: { playerId: state.playerId, target: event.target } };
    }

    case 'DRAG_START':
      return noMove({
        phase: 'dragging',
        playerId: event.playerId,
        location: event.location,
        x: event.x,
        y: event.y,
        hoverTarget: null,
      });

    case 'DRAG_MOVE':
      if (state.phase !== 'dragging') return noMove(state);
      return noMove({ ...state, x: event.x, y: event.y, hoverTarget: event.hoverTarget });

    case 'DRAG_END': {
      if (state.phase !== 'dragging') return noMove(state);
      const request = event.target ? { playerId: state.playerId, target: event.target } : null;
      return { state: idle, moveRequest: request };
    }

    case 'CANCEL':
      return noMove(idle);
  }
}

export const initialDndState: DndState = idle;
