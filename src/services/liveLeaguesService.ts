/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * liveLeaguesService.ts
 * Loads the full real club lists (Firestore clubs_cache), merges them into the curated
 * REAL_LEAGUES fallback and publishes the result as the game-wide ACTIVE leagues
 * (see setActiveLeagues in realLeaguesData.ts).
 *
 * One source of truth: the club-selection screen, the league table, the season
 * fixtures, opponent lookup and the AI-vs-AI round simulation all read the same list.
 * Safe to call many times — the network fetch happens once per session.
 */

import { REAL_LEAGUES, RealLeague, mergeLiveClubsIntoLeagues, setActiveLeagues } from '../data/realLeaguesData';
import { fetchFootballLayer1Cache } from './realFootballDataService';

let hydration: Promise<RealLeague[]> | null = null;

export function hydrateLiveLeagues(): Promise<RealLeague[]> {
  if (!hydration) {
    hydration = fetchFootballLayer1Cache()
      .then(({ clubs }) => {
        if (!clubs || Object.keys(clubs).length === 0) {
          // Offline / not synced yet: allow a retry on the next call instead of caching the miss.
          hydration = null;
          return REAL_LEAGUES;
        }
        const merged = mergeLiveClubsIntoLeagues(REAL_LEAGUES, clubs);
        setActiveLeagues(merged);
        return merged;
      })
      .catch(() => {
        hydration = null;
        return REAL_LEAGUES;
      });
  }
  return hydration;
}
