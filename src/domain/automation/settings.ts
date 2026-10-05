/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local automation preferences — never written to GameSaveData.
 */

import type {
  AutomationApplyMode,
  AutomationFeatureId,
  AutomationFeatureSetting,
  AutomationPrefsBlob,
  AutomationSettings,
  AutomationExecutionStamps,
  AutomationUndoSnapshot,
} from './types';
import { SUGGEST_ONLY_FEATURES } from './types';

export const AUTOMATION_PREFS_STORAGE_KEY = 'MODAREB_AUTOMATION_PREFS_V1';

function defaultFeature(): AutomationFeatureSetting {
  return { enabled: false, mode: 'suggest' };
}

export function defaultAutomationSettings(): AutomationSettings {
  return {
    bench: defaultFeature(),
    rotation: defaultFeature(),
    recovery: defaultFeature(),
    scout: defaultFeature(),
    loans: defaultFeature(),
    tactics: defaultFeature(),
    opponent: defaultFeature(),
  };
}

export function defaultAutomationPrefs(): AutomationPrefsBlob {
  return {
    settings: defaultAutomationSettings(),
    stamps: { lastMatchdayByFeature: {} },
    undo: null,
  };
}

function normalizeFeature(
  id: AutomationFeatureId,
  raw: Partial<AutomationFeatureSetting> | undefined,
): AutomationFeatureSetting {
  const enabled = raw?.enabled === true;
  let mode: AutomationApplyMode = raw?.mode === 'apply' ? 'apply' : 'suggest';
  if ((SUGGEST_ONLY_FEATURES as readonly string[]).includes(id)) {
    mode = 'suggest';
  }
  return { enabled, mode };
}

function readBlob(): AutomationPrefsBlob {
  if (typeof localStorage === 'undefined') {
    return defaultAutomationPrefs();
  }
  try {
    const raw = localStorage.getItem(AUTOMATION_PREFS_STORAGE_KEY);
    if (!raw) return defaultAutomationPrefs();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultAutomationPrefs();
    const obj = parsed as Partial<AutomationPrefsBlob>;
    const base = defaultAutomationSettings();
    const settings = { ...base };
    for (const id of Object.keys(base) as AutomationFeatureId[]) {
      const slice = (obj.settings as Partial<AutomationSettings> | undefined)?.[id];
      settings[id] = normalizeFeature(id, slice);
    }
    const stamps: AutomationExecutionStamps = {
      lastMatchdayByFeature: { ...(obj.stamps?.lastMatchdayByFeature ?? {}) },
      lastRecoveryGameWeek: obj.stamps?.lastRecoveryGameWeek,
      lastScoutGameWeek: obj.stamps?.lastScoutGameWeek,
      lastLoansGameWeek: obj.stamps?.lastLoansGameWeek,
    };
    return {
      settings,
      stamps,
      undo: obj.undo ?? null,
    };
  } catch {
    return defaultAutomationPrefs();
  }
}

function writeBlob(blob: AutomationPrefsBlob): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(AUTOMATION_PREFS_STORAGE_KEY, JSON.stringify(blob));
  } catch {
    // quota / private mode
  }
}

export function loadAutomationPrefs(): AutomationPrefsBlob {
  return readBlob();
}

export function loadAutomationSettings(): AutomationSettings {
  return readBlob().settings;
}

export function saveAutomationPrefs(blob: AutomationPrefsBlob): void {
  writeBlob(blob);
}

export function patchAutomationFeature(
  id: AutomationFeatureId,
  patch: Partial<AutomationFeatureSetting>,
): AutomationSettings {
  const blob = readBlob();
  const next = normalizeFeature(id, { ...blob.settings[id], ...patch });
  blob.settings = { ...blob.settings, [id]: next };
  writeBlob(blob);
  return blob.settings;
}

export function updateAutomationStamps(
  patch: Partial<AutomationExecutionStamps>,
): AutomationExecutionStamps {
  const blob = readBlob();
  blob.stamps = { ...blob.stamps, ...patch };
  writeBlob(blob);
  return blob.stamps;
}

export function setAutomationUndo(snapshot: AutomationUndoSnapshot | null): void {
  const blob = readBlob();
  blob.undo = snapshot;
  writeBlob(blob);
}

export function getAutomationUndo(): AutomationUndoSnapshot | null {
  return readBlob().undo;
}
