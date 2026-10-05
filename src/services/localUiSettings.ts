/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local UI preferences (not persisted in career save).
 */

import type { GameNotification, NotificationCategory } from '../domain/livingWorld/types';

const STORAGE_KEY = 'legendary_notification_mutes_v1';

export type NotificationMutePreferences = Partial<Record<NotificationCategory, boolean>>;

function readRaw(): NotificationMutePreferences {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as NotificationMutePreferences;
  } catch {
    return {};
  }
}

export function loadNotificationMutes(): NotificationMutePreferences {
  return readRaw();
}

export function setNotificationCategoryMuted(
  category: NotificationCategory,
  muted: boolean,
): NotificationMutePreferences {
  if (category === 'Critical') {
    return loadNotificationMutes();
  }
  const next = { ...readRaw(), [category]: muted };
  if (!muted) {
    delete next[category];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

/** Display-only: Critical is never hidden by mute preferences. */
export function isNotificationCategoryMutedForDisplay(
  mutes: NotificationMutePreferences,
  category: NotificationCategory,
): boolean {
  if (category === 'Critical') {
    return false;
  }
  return mutes[category] === true;
}

export function filterNotificationsForDisplay(
  notifications: readonly GameNotification[],
  mutes: NotificationMutePreferences,
): GameNotification[] {
  return notifications.filter(
    (n) => !isNotificationCategoryMutedForDisplay(mutes, n.category),
  );
}
