/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent, GameNotification, NotificationCategory } from '../types';

function categoryForSeverity(severity: GameEvent['severity']): NotificationCategory {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'Important';
    case 'medium':
      return 'Information';
    case 'low':
    default:
      return 'Suggestion';
  }
}

export function deriveNotificationsFromEvent(event: GameEvent): GameNotification[] {
  const category =
    event.type.startsWith('story.') ? 'Story' : categoryForSeverity(event.severity);

  const title = String(event.context.title ?? event.type);
  const message = String(event.context.message ?? `Event ${event.type} recorded.`);

  let dedupeKey = `${category}|${event.type}|${event.playerId ?? ''}|${event.clubId ?? ''}|${event.season}`;
  if (event.type === 'automation.report') {
    const feature = String(event.context.feature ?? '');
    const period = event.context.matchday ?? event.context.gameWeek ?? 0;
    dedupeKey = `Suggestion|automation|${feature}|${period}|${event.season}`;
  }

  return [
    {
      id: `notif_${event.id}`,
      category,
      title,
      message,
      sourceEventId: event.id,
      createdAt: event.timestamp,
      read: false,
      dedupeKey,
    },
  ];
}
