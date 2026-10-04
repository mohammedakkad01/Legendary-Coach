/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { Recommendation } from '../domain/assistant';
import { buildAssistantNarrativeContext } from '../domain/assistant/narrative/buildAssistantNarrativeContext';
import { reasonSentence } from '../domain/assistant/copy/deterministicCopy';
import { requestNarrativeEnrichment } from '../services/narrativeService';
import { useGameStore } from '../state/useGameStore';

export function useAssistantWhy(recommendation: Recommendation): {
  whyText: string | null;
  loadingWhy: boolean;
  fetchWhy: () => Promise<void>;
} {
  const { club, language, livingWorld } = useGameStore();
  const isAr = language === 'ar';
  const [whyText, setWhyText] = useState<string | null>(null);
  const [loadingWhy, setLoadingWhy] = useState(false);

  const fetchWhy = async () => {
    const deterministic = recommendation.reasonCodes
      .map((c) => reasonSentence(c, recommendation.reasonParams, isAr))
      .join(' ');
    setWhyText(deterministic);
    setLoadingWhy(true);
    try {
      const ctx = buildAssistantNarrativeContext({
        locale: isAr ? 'ar' : 'en',
        season: livingWorld?.currentSeason ?? 1,
        clubId: club.id,
        subjectIds: [club.id],
        reasonCodes: recommendation.reasonCodes,
        recommendationId: recommendation.id,
      });
      const enriched = await requestNarrativeEnrichment({
        context: ctx,
        importance: recommendation.importance,
        knownIds: new Set([club.id]),
      });
      if (enriched?.body) {
        setWhyText(enriched.body);
      }
    } finally {
      setLoadingWhy(false);
    }
  };

  return { whyText, loadingWhy, fetchWhy };
}
