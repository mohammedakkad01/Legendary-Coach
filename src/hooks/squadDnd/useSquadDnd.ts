/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSquadDnd — mouse + touch + keyboard drag-and-drop over the squad,
 * driven entirely by the pure reduceDnd state machine.
 *
 * Interaction model
 *  - Mouse: pointerdown on a grab handle arms the drag; moving past a small
 *    threshold starts it. No movement → a plain click, handled as TAP_CARD.
 *  - Touch: pointerdown arms a long-press timer. Movement past a small
 *    threshold BEFORE the timer fires cancels everything, so the page still
 *    scrolls normally. If the timer fires first, the drag starts and the
 *    handle claims pointer capture (touch-action: none only while dragging).
 *  - Keyboard: Enter/Space on a focused grab handle dispatches the exact same
 *    TAP_CARD event a tap would; Enter/Space on a focused drop zone dispatches
 *    TAP_TARGET. This is also the universal no-pointer fallback.
 *
 * Drop-zone hit-testing during a real drag uses document.elementFromPoint,
 * matched against the nearest `[data-drop-target]` ancestor (see
 * dropTargetCodec.ts) — so any element can become a drop zone just by
 * spreading getDropTargetProps(target) onto it.
 *
 * Performance: "smooth transform-based animation" and "minimal re-renders,
 * no state updates on every pointermove" pull in opposite directions if both
 * are done through React state. This hook splits the two concerns —
 *  - the dragged disc's on-screen position is written straight to a DOM node
 *    (`ghostRef.style.transform`) on every pointermove: no re-render at all;
 *  - React state (and therefore a re-render of the board's cards, which are
 *    memoized) only updates when the HOVERED DROP ZONE changes, which happens
 *    a handful of times per drag, not on every pixel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { moveEntity, type MoveResult } from '../../domain/squad/moveEntity';
import { locationToTarget } from '../../domain/squad/squadTypes';
import type { MoveTarget, SquadLocation } from '../../domain/squad/squadTypes';
import type { SquadState } from '../../domain/squad/squadTypes';
import { reduceDnd, initialDndState } from './dndReducer';
import type { DndState, DndSource } from './dndReducer';
import { encodeDropTarget, parseDropTarget } from './dropTargetCodec';

/** Pointer must travel this far (px) before a mouse drag is recognized. */
const MOUSE_DRAG_THRESHOLD = 4;
/** Touch: how long a press must be held before it becomes a drag. */
const LONG_PRESS_MS = 300;
/** Touch: movement past this (px) before the timer fires cancels the press entirely (→ scroll). */
const TOUCH_CANCEL_THRESHOLD = 10;

export interface UseSquadDndOptions {
  /** Current read-only squad state — used only to preview a hovered move, never mutated here. */
  squadState: SquadState;
  /** Called with a validated request; the caller applies it (store action) and returns the Result. */
  onMove: (playerId: string, target: MoveTarget) => MoveResult;
  /** Turns a Result into the text announced through aria-live. */
  describeOutcome: (playerId: string, target: MoveTarget, result: MoveResult) => string;
  disabled?: boolean;
}

export interface CardHandleProps {
  readonly tabIndex: number;
  readonly role: 'button';
  readonly 'aria-pressed': boolean;
  readonly 'aria-label': string;
  readonly onPointerDown: (e: ReactPointerEvent) => void;
  readonly onKeyDown: (e: KeyboardEvent) => void;
}

export interface DropZoneProps {
  readonly 'data-drop-target': string;
  readonly tabIndex: number;
  readonly role: 'button';
  readonly 'aria-label': string;
  readonly onKeyDown: (e: KeyboardEvent) => void;
  readonly onPointerUp: (e: ReactPointerEvent) => void;
}

interface PendingPointer {
  readonly playerId: string;
  readonly location: SquadLocation;
  readonly pointerId: number;
  readonly pointerType: string;
  readonly startX: number;
  readonly startY: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  armed: boolean; // true once movement/long-press turned this into a real drag
}

export function useSquadDnd({ squadState, onMove, describeOutcome, disabled }: UseSquadDndOptions) {
  const [state, setState] = useState<DndState>(initialDndState);
  const [announcement, setAnnouncement] = useState('');
  const pendingRef = useRef<PendingPointer | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Attach to the floating drag-ghost element; position is written imperatively (see file header). */
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const lastHoverKeyRef = useRef<string | null>(null);

  const requestMove = useCallback(
    (playerId: string, target: MoveTarget) => {
      const result = onMove(playerId, target);
      setAnnouncement(describeOutcome(playerId, target, result));
    },
    [onMove, describeOutcome],
  );

  const dispatch = useCallback(
    (event: Parameters<typeof reduceDnd>[1]) => {
      const { state: next, moveRequest } = reduceDnd(stateRef.current, event);
      setState(next);
      if (moveRequest) requestMove(moveRequest.playerId, moveRequest.target);
    },
    [requestMove],
  );

  const clearPending = useCallback(() => {
    const p = pendingRef.current;
    if (p?.longPressTimer) clearTimeout(p.longPressTimer);
    pendingRef.current = null;
  }, []);

  // ---- window-level listeners while a real drag is in progress -----------
  useEffect(() => {
    if (state.phase !== 'dragging') return undefined;

    const hitTarget = (x: number, y: number): MoveTarget | null => {
      const el = document.elementFromPoint(x, y);
      const zone = el?.closest('[data-drop-target]');
      return parseDropTarget(zone?.getAttribute('data-drop-target'));
    };

    const onMoveEvt = (e: PointerEvent) => {
      e.preventDefault();
      if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      const target = hitTarget(e.clientX, e.clientY);
      const key = target ? encodeDropTarget(target) : null;
      if (key !== lastHoverKeyRef.current) {
        lastHoverKeyRef.current = key;
        dispatch({ type: 'DRAG_MOVE', x: e.clientX, y: e.clientY, hoverTarget: target });
      }
    };
    const onUpEvt = (e: PointerEvent) => {
      dispatch({ type: 'DRAG_END', target: hitTarget(e.clientX, e.clientY) });
    };
    const onCancelEvt = () => dispatch({ type: 'CANCEL' });

    window.addEventListener('pointermove', onMoveEvt, { passive: false });
    window.addEventListener('pointerup', onUpEvt);
    window.addEventListener('pointercancel', onCancelEvt);
    return () => {
      window.removeEventListener('pointermove', onMoveEvt);
      window.removeEventListener('pointerup', onUpEvt);
      window.removeEventListener('pointercancel', onCancelEvt);
    };
  }, [state.phase, dispatch]);

  useEffect(() => clearPending, [clearPending]);

  // ---------------------------------------------------------- card handle
  const getCardHandleProps = useCallback(
    (playerId: string, location: SquadLocation, label: string): CardHandleProps => ({
      tabIndex: disabled ? -1 : 0,
      role: 'button',
      'aria-pressed': state.phase !== 'idle' && state.playerId === playerId,
      'aria-label': label,
      onPointerDown: (e: ReactPointerEvent) => {
        if (disabled || !e.isPrimary) return;
        clearPending();
        const pending: PendingPointer = {
          playerId,
          location,
          pointerId: e.pointerId,
          pointerType: e.pointerType,
          startX: e.clientX,
          startY: e.clientY,
          longPressTimer: null,
          armed: e.pointerType === 'mouse', // mouse arms immediately; touch waits for the timer
        };
        pendingRef.current = pending;

        const startDrag = (x: number, y: number) => {
          pending.armed = true;
          lastHoverKeyRef.current = null;
          if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          dispatch({ type: 'DRAG_START', playerId, location, x, y });
          // The board-level effect (phase === 'dragging') takes over move/up handling
          // from the next render — this pointerdown's own listeners stand down now.
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };

        const onMove = (ev: PointerEvent) => {
          if (pendingRef.current !== pending || ev.pointerId !== pending.pointerId || pending.armed) return;
          const dist = Math.hypot(ev.clientX - pending.startX, ev.clientY - pending.startY);
          if (pending.pointerType === 'mouse' && dist > MOUSE_DRAG_THRESHOLD) {
            startDrag(ev.clientX, ev.clientY);
          } else if (pending.pointerType !== 'mouse' && dist > TOUCH_CANCEL_THRESHOLD) {
            // Moved before the long-press fired → this is a scroll, not a drag. Let it through.
            clearPending();
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          }
        };

        const onUp = (ev: PointerEvent) => {
          if (pendingRef.current !== pending || ev.pointerId !== pending.pointerId) return;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          clearPending();
          // Reaching here (not startDrag) means no drag ever started: a plain tap.
          // Something already picked → THIS card's own location is a legal drop
          // target (moveEntity itself turns "drop on the player you already
          // picked" into a no-op), so a second tap always means "swap with me,"
          // never "pick me instead." Only when idle does a tap start a new pick.
          const source: DndSource = pending.pointerType === 'mouse' ? 'pointer' : 'tap';
          if (stateRef.current.phase === 'picked') {
            dispatch({ type: 'TAP_TARGET', target: locationToTarget(location) });
          } else {
            dispatch({ type: 'TAP_CARD', playerId, location, source });
          }
        };

        if (e.pointerType !== 'mouse') {
          pending.longPressTimer = setTimeout(() => {
            if (pendingRef.current !== pending) return;
            try {
              (e.target as Element).setPointerCapture(e.pointerId);
            } catch {
              /* pointer may already be released — safe to ignore */
            }
            startDrag(pending.startX, pending.startY);
          }, LONG_PRESS_MS);
        }

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (state.phase === 'picked') {
            dispatch({ type: 'TAP_TARGET', target: locationToTarget(location) });
          } else {
            dispatch({ type: 'TAP_CARD', playerId, location, source: 'keyboard' });
          }
        } else if (e.key === 'Escape') {
          dispatch({ type: 'CANCEL' });
        }
      },
    }),
    [state, disabled, dispatch, clearPending],
  );

  // ---------------------------------------------------------- drop zone
  const getDropZoneProps = useCallback(
    (target: MoveTarget, label: string): DropZoneProps => ({
      'data-drop-target': encodeDropTarget(target),
      tabIndex: disabled || state.phase === 'idle' ? -1 : 0,
      role: 'button',
      'aria-label': label,
      onKeyDown: (e: KeyboardEvent) => {
        if (disabled) return;
        if ((e.key === 'Enter' || e.key === ' ') && state.phase === 'picked') {
          e.preventDefault();
          dispatch({ type: 'TAP_TARGET', target });
        }
      },
      onPointerUp: () => {
        if (disabled) return;
        if (state.phase === 'picked') dispatch({ type: 'TAP_TARGET', target });
      },
    }),
    [state, disabled, dispatch],
  );

  const cancel = useCallback(() => {
    clearPending();
    dispatch({ type: 'CANCEL' });
  }, [clearPending, dispatch]);

  void squadState; // reserved for hover-preview (suitability of the hovered target); not required for Phase 2 correctness
  return { state, announcement, ghostRef, getCardHandleProps, getDropZoneProps, cancel };
}

// Re-exported so components doing pure logic (e.g. testing) don't need a second import path.
export { moveEntity };
