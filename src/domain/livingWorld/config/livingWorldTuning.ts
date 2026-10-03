/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase F — single tuning table (legend, reputation, story, news, press, caps).
 */

function bounded(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const LIVING_WORLD_TUNING = {
  history: {
    maxSeasonSummaries: 24,
    maxMilestones: 48,
    maxHonourEntries: 32,
    maxTransferEntries: 24,
    maxManagerEntries: 16,
    maxCaptainEntries: 24,
    aggregateAfterSeasons: 20,
    backfillVersion: 1,
  },
  legend: {
    thresholdPlayer: 72,
    thresholdManager: 68,
    weights: {
      appearances: 0.22,
      goals: 0.18,
      assists: 0.1,
      trophies: 0.14,
      importantGoals: 0.08,
      yearsAtClub: 0.1,
      clubRecords: 0.08,
      academyContribution: 0.04,
      leadership: 0.04,
      fanImpact: 0.02,
    },
    maxReasonsStored: 8,
  },
  reputation: {
    deltas: {
      title_won: 8,
      top_four: 4,
      relegation: -10,
      cup_run_semifinal: 3,
      dismissal: -12,
      big_win: 2,
      shock_loss: -3,
      press_positive: 1,
      press_negative: -2,
      record_broken: 2,
    },
    ledgerMaxEntries: 120,
  },
  modifiers: {
    /** All multipliers clamped to [min, max]; neutral = 1.0 at reputation 50. */
    min: 0.85,
    max: 1.15,
    neutralReputation: 50,
    slopePerPoint: 0.003,
    mediaAttentionBase: 0.9,
    mediaAttentionRepScale: 0.002,
  },
  story: {
    globalCooldownGameWeeks: 2,
    maxActiveArcs: 6,
    maxArcEventsStored: 12,
    recentMatchWindow: 20,
    detectorCooldownGameWeeks: {
      winning_streak: 4,
      losing_streak: 4,
      youngster_breakthrough: 6,
      manager_pressure: 5,
      rivalry: 3,
      big_signing: 8,
      record_broken: 6,
      default: 3,
    },
    importanceMirrorToNotification: 75,
  },
  news: {
    maxFeed: 80,
    dailyCap: 10,
    dedupeWindowDays: 3,
  },
  press: {
    minWeeksBetween: 3,
    maxQuestionsPerSession: 5,
    answerOptionsMin: 3,
    answerOptionsMax: 5,
  },
  narrative: {
    maxCacheEntries: 32,
    maxHeadlineChars: 160,
    maxBodyChars: 1200,
    maxBulletFacts: 12,
  },
} as const;

export function reputationToModifier(reputation: number): number {
  const t = LIVING_WORLD_TUNING.modifiers;
  const raw = 1 + (reputation - t.neutralReputation) * t.slopePerPoint;
  return bounded(raw, t.min, t.max);
}

export function mediaAttentionLevel(reputation: number, mediaReputation: number): number {
  const t = LIVING_WORLD_TUNING.modifiers;
  const blended = reputation * 0.6 + mediaReputation * 0.4;
  return bounded(t.mediaAttentionBase + blended * t.mediaAttentionRepScale, 0.5, 1.5);
}
