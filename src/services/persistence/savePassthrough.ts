/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Root-level unknown save field preservation (export / import / migrate).
 * Game logic must not read savePassthrough.
 */

import type { GameSaveData } from '../../types/save';
import type { ClubManagementState } from '../../domain/clubManagement/types';

/** Canonical top-level keys on persisted career JSON (v7). */
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
  'recruitmentWorld',
  'clubManagement',
  'assistant',
  'aiNarrationEnabled',
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

/** Keys that must never remain in savePassthrough when present canonically on the save root. */
export const PASSTHROUGH_STRIP_IF_CANONICAL: readonly string[] = [
  'clubManagement',
  'livingWorld',
  'recruitmentWorld',
  'assistant',
  'club',
  'matchHistory',
];

export function stripKnownFieldsFromPassthrough(save: GameSaveData): GameSaveData {
  if (!save.savePassthrough || typeof save.savePassthrough !== 'object') {
    return save;
  }
  const nextPt: Record<string, unknown> = { ...save.savePassthrough };
  for (const key of PASSTHROUGH_STRIP_IF_CANONICAL) {
    if (key in nextPt && (save as unknown as Record<string, unknown>)[key] !== undefined) {
      delete nextPt[key];
    }
  }
  if (Object.keys(nextPt).length === 0) {
    const { savePassthrough: _removed, ...rest } = save;
    return rest as GameSaveData;
  }
  return { ...save, savePassthrough: nextPt };
}

export function isPlausibleClubManagement(value: unknown): value is ClubManagementState {
  if (!value || typeof value !== 'object') return false;
  const cm = value as ClubManagementState;
  return Boolean(cm.staff && cm.finance && cm.board && cm.delegation);
}

function clubManagementFromUnknown(value: unknown): ClubManagementState | undefined {
  if (!isPlausibleClubManagement(value)) return undefined;
  return value;
}

/**
 * Prefer valid canonical clubManagement; recover from passthrough/root duplicate when missing.
 */
export function resolveClubManagementCanonical(
  save: GameSaveData,
  raw?: Record<string, unknown>,
): GameSaveData {
  if (isPlausibleClubManagement(save.clubManagement)) {
    return save;
  }

  const fromPassthrough =
    save.savePassthrough && typeof save.savePassthrough === 'object'
      ? clubManagementFromUnknown((save.savePassthrough as Record<string, unknown>).clubManagement)
      : undefined;
  const fromRaw =
    raw && typeof raw === 'object'
      ? clubManagementFromUnknown(raw.clubManagement) ??
        (raw.savePassthrough && typeof raw.savePassthrough === 'object'
          ? clubManagementFromUnknown((raw.savePassthrough as Record<string, unknown>).clubManagement)
          : undefined)
      : undefined;

  const recovered = fromPassthrough ?? fromRaw;
  if (!recovered) return save;
  return { ...save, clubManagement: recovered };
}

export function attachPassthrough(save: GameSaveData, raw: Record<string, unknown>): GameSaveData {
  const fromRawPassthrough =
    raw.savePassthrough && typeof raw.savePassthrough === 'object' && !Array.isArray(raw.savePassthrough)
      ? (raw.savePassthrough as Record<string, unknown>)
      : {};
  const extracted = extractUnknownTopLevelFields(raw);
  const merged = mergeSavePassthrough(mergeSavePassthrough(save.savePassthrough, fromRawPassthrough), extracted);
  const withPt =
    Object.keys(merged).length === 0
      ? (() => {
          const { savePassthrough: _removed, ...rest } = save;
          return rest as GameSaveData;
        })()
      : { ...save, savePassthrough: merged };
  return stripKnownFieldsFromPassthrough(withPt);
}
