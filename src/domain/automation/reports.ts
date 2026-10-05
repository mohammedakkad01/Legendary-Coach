/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../livingWorld/types';
import type {
  AutomationChangeSummary,
  AutomationFeatureId,
  AutomationApplyMode,
  AutomationReport,
  AutomationReportStatus,
} from './types';

export function automationDedupeKey(params: {
  feature: AutomationFeatureId;
  season: number;
  matchday?: number;
  gameWeek?: number;
}): string {
  const period = params.matchday ?? params.gameWeek ?? 0;
  return `Suggestion|automation|${params.feature}|${period}|${params.season}`;
}

export function buildAutomationGameEvent(input: {
  reportId: string;
  clubId: string;
  season: number;
  timestampIso: string;
  feature: AutomationFeatureId;
  mode: AutomationApplyMode;
  status: AutomationReportStatus;
  summaryCode: string;
  reasonCodes: readonly string[];
  matchday?: number;
  gameWeek?: number;
  changeSummary: AutomationChangeSummary;
  undoable: boolean;
}): GameEvent {
  const title =
    input.status === 'applied'
      ? `Automation applied: ${input.feature}`
      : input.status === 'skipped'
        ? `Automation skipped: ${input.feature}`
        : `Automation suggestion: ${input.feature}`;

  const playerPart = input.changeSummary.playerIds?.length
    ? ` players=${input.changeSummary.playerIds.join(',')}`
    : '';
  const message = `${input.summaryCode}${playerPart}`;

  return {
    id: input.reportId,
    type: 'automation.report',
    timestamp: input.timestampIso,
    season: input.season,
    clubId: input.clubId,
    severity: 'low',
    context: {
      title,
      message,
      feature: input.feature,
      mode: input.mode,
      status: input.status,
      summaryCode: input.summaryCode,
      reasonCodes: input.reasonCodes.join(','),
      undoable: input.undoable,
      ...(input.matchday !== undefined ? { matchday: input.matchday } : {}),
      ...(input.gameWeek !== undefined ? { gameWeek: input.gameWeek } : {}),
      ...(input.changeSummary.coinCost !== undefined ? { coinCost: input.changeSummary.coinCost } : {}),
    },
  };
}

export function createAutomationReport(
  input: Omit<AutomationReport, 'notificationDelivered'> & { notificationDelivered?: boolean },
): AutomationReport {
  return {
    ...input,
    notificationDelivered: input.notificationDelivered ?? false,
  };
}
