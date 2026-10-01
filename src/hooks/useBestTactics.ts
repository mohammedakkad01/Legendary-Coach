/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best Tactics UI hook. The recommendation is computed ONLY when compute() is
 * called (button press) — never during render — and applied ONLY through
 * apply() (the sheet's explicit Apply button). Results are memoized by
 * bestTacticsInputKey, so pressing the button twice on an unchanged squad does
 * not re-run the optimizer.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { deriveOpponentProfile, recommendBestTactics } from '../domain/tactics/bestTactics';
import type { ApplyBestTacticsError, BestTacticsError, BestTacticsInput, BestTacticsRecommendation } from '../domain/tactics/bestTactics';
import type { Result } from '../domain/shared/result';
import { getMaxBenchSlots, getUnlockedFormations, getVipLevel } from '../domain/vip/vipCalculations';
import type { Club } from '../types/game';
import { bestTacticsInputKey, buildBestTacticsInput, isInsightCurrent } from './bestTactics/bestTacticsInput';

export type BestTacticsStatus = 'idle' | 'computing' | 'ready' | 'error';

type GameSnapshot = ReturnType<typeof useGameStore.getState>;

function inputFromState(state: GameSnapshot): BestTacticsInput {
  const insight = isInsightCurrent(state.nextMatchInsight, state.leagueFixtures) ? state.nextMatchInsight : null;
  return buildBestTacticsInput(
    state.club,
    deriveOpponentProfile(insight?.opponentClub),
    getMaxBenchSlots(state.vipPoints),
    getUnlockedFormations(getVipLevel(state.vipPoints)),
  );
}

export function useBestTactics() {
  const [status, setStatus] = useState<BestTacticsStatus>('idle');
  const [recommendation, setRecommendation] = useState<BestTacticsRecommendation | null>(null);
  const [error, setError] = useState<BestTacticsError | ApplyBestTacticsError | null>(null);
  const cache = useRef<{ key: string; result: Result<BestTacticsRecommendation, BestTacticsError> } | null>(null);
  const runId = useRef(0);

  const compute = useCallback(async () => {
    const id = ++runId.current;
    setStatus('computing');
    setError(null);

    let state = useGameStore.getState();
    if (!isInsightCurrent(state.nextMatchInsight, state.leagueFixtures)) {
      try {
        await state.loadNextMatchInsight();
      } catch {
        // No opponent data → the recommender evaluates against BEST_TACTICS.defaultOpponent.
      }
      state = useGameStore.getState();
    }
    if (id !== runId.current) return; // dismissed or superseded while loading

    const input = inputFromState(state);
    const key = bestTacticsInputKey(input);
    const result = cache.current?.key === key ? cache.current.result : recommendBestTactics(input);
    cache.current = { key, result };

    if (result.ok) {
      setRecommendation(result.value);
      setStatus('ready');
    } else {
      setRecommendation(null);
      setError(result.error);
      setStatus('error');
    }
  }, []);

  const apply = useCallback((): Result<Club, ApplyBestTacticsError> | null => {
    if (!recommendation) return null;
    const result = useGameStore.getState().applyBestTactics(recommendation);
    if (result.ok) {
      setRecommendation(null);
      setError(null);
      setStatus('idle');
    } else {
      setError(result.error);
    }
    return result;
  }, [recommendation]);

  const dismiss = useCallback(() => {
    runId.current += 1;
    setRecommendation(null);
    setError(null);
    setStatus('idle');
  }, []);

  // Staleness only matters while a recommendation is on screen; the key is cheap (no optimizer run).
  const club = useGameStore((s) => s.club);
  const vipPoints = useGameStore((s) => s.vipPoints);
  const nextMatchInsight = useGameStore((s) => s.nextMatchInsight);
  const leagueFixtures = useGameStore((s) => s.leagueFixtures);
  const isStale = useMemo(() => {
    if (!recommendation || !cache.current) return false;
    return bestTacticsInputKey(inputFromState(useGameStore.getState())) !== cache.current.key;
  }, [recommendation, club, vipPoints, nextMatchInsight, leagueFixtures]);

  return { status, recommendation, error, isStale, compute, apply, dismiss };
}
