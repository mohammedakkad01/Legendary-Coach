/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import {
  collectDismissedDedupeKeys,
  evaluateLiveTriggers,
  filterRecommendationsByIgnore,
  type Recommendation,
} from '../domain/assistant';

export function useLiveAssistant(): {
  liveRecommendations: Recommendation[];
  dismissLive: (rec: Recommendation) => void;
} {
  const {
    isMatchLive,
    activeEngine,
    activeMatchRecord,
    currentMatchMinute,
    club,
    livingWorld,
    dismissAssistantRecommendation,
  } = useGameStore();

  const cooldownsRef = useRef<Record<string, number>>({});
  const alertsEmittedRef = useRef(0);
  const [liveRecs, setLiveRecs] = useState<Recommendation[]>([]);
  const lastMinuteRef = useRef(-1);

  useEffect(() => {
    if (!isMatchLive) {
      cooldownsRef.current = {};
      alertsEmittedRef.current = 0;
      setLiveRecs([]);
      lastMinuteRef.current = -1;
    }
  }, [isMatchLive]);

  useEffect(() => {
    if (!isMatchLive || !activeEngine || !activeMatchRecord) return;
    if (currentMatchMinute === lastMinuteRef.current) return;
    lastMinuteRef.current = currentMatchMinute;

    const analytics = activeEngine.getPartialAnalytics();
    const squad = club.footballSquad;
    const lineup = club.footballLineup.filter(Boolean);
    let fatigueSum = 0;
    let fatigueN = 0;
    for (const id of lineup) {
      const p = squad.find((x) => x.id === id);
      if (p && typeof p.fatigue === 'number') {
        fatigueSum += p.fatigue;
        fatigueN += 1;
      }
    }
    const avgFatigue = fatigueN > 0 ? fatigueSum / fatigueN : null;

    const result = evaluateLiveTriggers({
      minute: currentMatchMinute,
      events: activeMatchRecord.events,
      stats: activeMatchRecord.stats,
      analytics,
      cooldowns: cooldownsRef.current,
      alertsEmitted: alertsEmittedRef.current,
      avgSquadFatigueAtKickoff: avgFatigue,
    });

    cooldownsRef.current = result.cooldowns;
    alertsEmittedRef.current = result.alertsEmitted;

    if (result.recommendations.length === 0) return;

    const dismissed = collectDismissedDedupeKeys(livingWorld?.eventLog ?? []);
    setLiveRecs((prev) => {
      const merged = [...prev, ...result.recommendations];
      const byKey = new Map<string, Recommendation>();
      for (const r of merged) {
        if (r.expiryMinute !== undefined && currentMatchMinute > r.expiryMinute) continue;
        byKey.set(r.dedupeKey, r);
      }
      return filterRecommendationsByIgnore(Array.from(byKey.values()), dismissed);
    });
  }, [isMatchLive, activeEngine, activeMatchRecord, currentMatchMinute, club, livingWorld?.eventLog]);

  const dismissLive = (rec: Recommendation) => {
    dismissAssistantRecommendation(rec);
    setLiveRecs((prev) => prev.filter((r) => r.dedupeKey !== rec.dedupeKey));
  };

  return { liveRecommendations: liveRecs, dismissLive };
}
