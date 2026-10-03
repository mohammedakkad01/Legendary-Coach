/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Weekly orchestration idempotency without a new schema version — reuses rumor throttle bucket.
 */

import type { RumorThrottleState } from '../rumors/rumorTypes';

export function isOrchestrationWeekComplete(
  throttle: RumorThrottleState,
  gameWeek: number,
): boolean {
  return throttle.orchestrationCompletedWeeks[gameWeek] === true;
}

export function markOrchestrationWeekComplete(
  throttle: RumorThrottleState,
  gameWeek: number,
): RumorThrottleState {
  return {
    ...throttle,
    orchestrationCompletedWeeks: {
      ...throttle.orchestrationCompletedWeeks,
      [gameWeek]: true,
    },
  };
}

export function hasAcademyIntakeForWeek(
  records: readonly { intakeWeek: number; clubId: string }[],
  gameWeek: number,
  clubId: string,
): boolean {
  return records.some((r) => r.intakeWeek === gameWeek && r.clubId === clubId);
}
