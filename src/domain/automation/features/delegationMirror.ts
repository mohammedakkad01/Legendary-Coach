/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mirrors existing delegation outputs — never calls runDelegatedTask.
 */

import type { ClubManagementState, DelegationTask } from '../../clubManagement/types';
import type { GameEvent } from '../../livingWorld/types';
import { DELEGATION_TUNING } from '../../clubManagement/config/clubManagementTuning';

export function delegationSkipReasons(
  cm: ClubManagementState,
  task: DelegationTask,
  gameWeek: number,
  hasRecruitmentWorld: boolean,
): string[] {
  const codes: string[] = [];
  if (cm.delegation.modes[task] !== 'delegate') {
    codes.push('delegation_mode_manual');
  }
  const assignee = cm.delegation.assigneeByTask[task];
  if (!assignee) {
    codes.push('staff_unassigned');
  }
  if ((task === 'scouting' || task === 'loan_search') && !hasRecruitmentWorld) {
    codes.push('recruitment_world_unavailable');
  }
  const last = cm.delegation.lastReportWeekByTask[task] ?? 0;
  if (gameWeek - last < DELEGATION_TUNING.reportCooldownWeeks && last !== gameWeek) {
    codes.push('delegation_cooldown');
  }
  return codes;
}

export function findDelegationStaffReportEvent(
  events: readonly GameEvent[],
  task: DelegationTask,
  gameWeek: number,
): GameEvent | undefined {
  return [...events]
    .reverse()
    .find(
      (e) =>
        e.type === 'staff.report' &&
        e.context.task === task &&
        (e.context.gameWeek === gameWeek || String(e.context.gameWeek) === String(gameWeek)),
    );
}

export function findDelegationStaffReportFromLog(
  eventLog: readonly GameEvent[],
  task: DelegationTask,
  gameWeek: number,
): GameEvent | undefined {
  return findDelegationStaffReportEvent(eventLog, task, gameWeek);
}
