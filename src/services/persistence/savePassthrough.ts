/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Root-level unknown save field preservation (export / import / migrate).
 * Game logic must not read savePassthrough.
 */

import type { GameSaveData } from '../../types/save';

/** Canonical top-level keys on persisted career JSON (v3). */
export const GAME_SAVE_KNOWN_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
  'saveVersion',
  'saveId',
  'savedAt',
  'appVersion',
  'currentSport',
  'language',
  'soundEnabled',
  'hasSelectedInitialClub',
  'isGuest',
  'hasClaimedLoginBonus',
  'club',
  'energy',
  'lastEnergyUpdate',
  'vipPoints',
  'lastVipClaimDate',
  'claimedVipUpgradeChests',
  'missionSkipUsedDate',
  'checkInStreak',
  'lastCheckInDate',
  'savedTacticalPlans',
  'pendingFacilityUpgrades',
  'activeNegotiations',
  'academyDiscoveries',
  'scoutMarket',
  'dailyMissions',
  'storyMissions',
  'leagueStandings',
  'leagueFixtures',
  'matchHistory',
  'tournamentStats',
  'simulatedMatchdays',
  'matchScoutReports',
  'unlockedSpeed2x',
  'livingWorld',
  'savePassthrough',
  // legacy v1 keys (stripped into passthrough if still present after migrate)
  'version',
  'exportedAt',
]);

export function extractUnknownTopLevelFields(raw: Record<string, unknown>): Record<string, unknown> {
  const passthrough: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (!GAME_SAVE_KNOWN_TOP_LEVEL_KEYS.has(key)) {
      passthrough[key] = raw[key];
    }
  }
  return passthrough;
}

export function mergeSavePassthrough(
  existing: Record<string, unknown> | undefined,
  extracted: Record<string, unknown>
): Record<string, unknown> {
  if (!existing && Object.keys(extracted).length === 0) return {};
  return { ...(existing ?? {}), ...extracted };
}

export function attachPassthrough(save: GameSaveData, raw: Record<string, unknown>): GameSaveData {
  const fromRawPassthrough =
    raw.savePassthrough && typeof raw.savePassthrough === 'object' && !Array.isArray(raw.savePassthrough)
      ? (raw.savePassthrough as Record<string, unknown>)
      : {};
  const extracted = extractUnknownTopLevelFields(raw);
  const merged = mergeSavePassthrough(mergeSavePassthrough(save.savePassthrough, fromRawPassthrough), extracted);
  if (Object.keys(merged).length === 0) {
    const { savePassthrough: _removed, ...rest } = save;
    return rest as GameSaveData;
  }
  return { ...save, savePassthrough: merged };
}
