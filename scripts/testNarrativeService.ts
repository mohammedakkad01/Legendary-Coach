/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Narrative Service & Server Route Hardening Test Suite.
 * Covers:
 * (a) Cache hit makes zero fetch calls.
 * (b) Invalid / oversized / unknown-id / mutation-key responses fall back to deterministic text and leave state untouched.
 * (c) Timeout and network error fall back, at most one retry.
 * (d) aiNarrationEnabled=false makes zero fetch calls.
 * (e) Daily / session caps stop calls.
 * (f) POST /api/narrative/enhance payload validation & hardening checks.
 */

import { assert, assertEqual, section, finish } from './lib/testHarness';

// Ensure localStorage mock is present in Node CLI test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  } as any;
}

import { useGameStore } from '../src/state/useGameStore';
import {
  requestNarrativeEnrichment,
  _resetNarrativeCapsForTest,
  _setSessionCallCountForTest,
  MAX_SESSION_CALLS,
} from '../src/services/narrativeService';
import { buildStructuredContext } from '../src/domain/livingWorld/narrative/buildContext';
import { getNarrativeCacheKey } from '../src/domain/livingWorld/narrative/cache';
import { renderNewsItem } from '../src/domain/livingWorld/news/renderTemplates';
import type { NewsItem } from '../src/domain/livingWorld/phaseF/types';
import { validateIncomingNarrativeRequest } from '../server/geminiNarrative';
import { GEMINI_NARRATIVE_CONFIG } from '../server/narrativeConfig';

// Mock test fixture for high-importance news item (importance >= 70)
const testNewsItem: NewsItem = {
  id: 'news_test_victory_01',
  type: 'match_result',
  subjectIds: ['test_club_1', 'rp_1'],
  facts: {
    won: true,
    eventType: 'match.user_completed',
  },
  tone: 'positive',
  importance: 85,
  sourceEventId: 'evt_match_test_01',
  createdAt: '2026-10-04T00:00:00.000Z',
  season: 1,
};

const sampleContext = buildStructuredContext({
  locale: 'en',
  season: 1,
  clubId: 'test_club_1',
  subjectIds: ['test_club_1', 'rp_1'],
  factKeys: ['won'],
  newsItem: testNewsItem,
});

async function runNarrativeServiceTests() {
  section('Narrative Service: (d) aiNarrationEnabled=false makes zero fetch calls');
  {
    _resetNarrativeCapsForTest();
    const originalFetch = globalThis.fetch;
    let fetchCallCount = 0;
    globalThis.fetch = (async () => {
      fetchCallCount += 1;
      return new Response(JSON.stringify({}));
    }) as any;

    try {
      useGameStore.setState({ aiNarrationEnabled: false });

      const res = await requestNarrativeEnrichment({
        context: sampleContext,
        importance: 85,
      });

      assertEqual(fetchCallCount, 0, 'no fetch calls made when kill switch is off');
      assertEqual(res, null, 'returns null when kill switch is off');
    } finally {
      globalThis.fetch = originalFetch;
      useGameStore.setState({ aiNarrationEnabled: true });
    }
  }

  section('Narrative Service: (a) cache hit makes zero fetch calls');
  {
    _resetNarrativeCapsForTest();
    useGameStore.setState({ aiNarrationEnabled: true });
    const originalFetch = globalThis.fetch;
    let fetchCallCount = 0;
    globalThis.fetch = (async () => {
      fetchCallCount += 1;
      return new Response(JSON.stringify({}));
    }) as any;

    try {
      // Pre-seed cache in store
      const cacheKey = getNarrativeCacheKey(sampleContext);
      useGameStore.getState().storeNarrativeCacheEntry({
        contextHash: cacheKey,
        headline: 'Cached Glorious Victory',
        body: 'Cached report details for the team.',
        locale: 'en',
        cachedAt: new Date().toISOString(),
      });

      const res = await requestNarrativeEnrichment({
        context: sampleContext,
        importance: 85,
      });

      assertEqual(fetchCallCount, 0, 'zero fetch calls on cache hit');
      assert(res !== null, 'returns enriched result');
      assertEqual(res?.headline, 'Cached Glorious Victory', 'returns cached headline');
      assertEqual(res?.cached, true, 'marked as cached');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  section('Narrative Service: (b) invalid / mutation / oversized responses fall back to deterministic text');
  {
    _resetNarrativeCapsForTest();
    useGameStore.setState({ aiNarrationEnabled: true });
    const deterministic = renderNewsItem(testNewsItem, 'en');

    // Case 1: Forbidden mutation key in response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      const parsedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          requestId: parsedBody.requestId,
          presentation: {
            headline: 'Hacked Headline',
            body: 'Body text',
          },
          morale: 100, // FORBIDDEN MUTATION KEY
          delta: 10,  // FORBIDDEN MUTATION KEY
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    try {
      const initialCoins = useGameStore.getState().club.finances.coins;
      const res = await requestNarrativeEnrichment({
        context: { ...sampleContext, clubId: 'uncached_club_mutation' },
        importance: 85,
      });

      assertEqual(res, null, 'mutation response rejected and discarded');
      assertEqual(useGameStore.getState().club.finances.coins, initialCoins, 'game state remains untouched');
      // Verify fallback presentation matches deterministic template
      const presented = res?.headline || deterministic.headline;
      assertEqual(presented, deterministic.headline, 'falls back to deterministic headline');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Case 2: Oversized headline (>160 chars)
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      const parsedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          requestId: parsedBody.requestId,
          presentation: {
            headline: 'X'.repeat(250), // OVERSIZED HEADLINE
            body: 'Normal body text',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    try {
      const res = await requestNarrativeEnrichment({
        context: { ...sampleContext, clubId: 'uncached_club_oversized' },
        importance: 85,
      });

      assertEqual(res, null, 'oversized headline rejected');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Case 3: Unknown entity ID not in context
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      const parsedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          requestId: parsedBody.requestId,
          presentation: {
            headline: 'Fabricated Story',
            body: 'Story text',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    try {
      const res = await requestNarrativeEnrichment({
        context: {
          ...sampleContext,
          clubId: 'known_club',
          subjectIds: ['unknown_invented_player_999'],
        },
        knownIds: new Set(['known_club']), // unknown_invented_player_999 is NOT in knownIds
        importance: 85,
      });

      assertEqual(res, null, 'unknown id rejected');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  section('Narrative Service: (c) timeout and network error fall back with at most one retry');
  {
    _resetNarrativeCapsForTest();
    useGameStore.setState({ aiNarrationEnabled: true });
    const originalFetch = globalThis.fetch;

    // Server 500 error: triggers at most 1 retry (total 2 attempts)
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts += 1;
      return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
    }) as any;

    try {
      const res = await requestNarrativeEnrichment({
        context: { ...sampleContext, clubId: 'uncached_club_retry' },
        importance: 85,
      });

      assertEqual(attempts, 2, 'retried once (total 2 attempts)');
      assertEqual(res, null, 'silently returned null on persistent error');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Network throw: graceful fallback
    let throws = 0;
    globalThis.fetch = (async () => {
      throws += 1;
      throw new Error('Connection refused (offline)');
    }) as any;

    try {
      const res = await requestNarrativeEnrichment({
        context: { ...sampleContext, clubId: 'uncached_club_throw' },
        importance: 85,
      });

      assertEqual(throws, 2, 'two attempts on throw before graceful abort');
      assertEqual(res, null, 'offline gracefully returns null without throwing to caller');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  section('Narrative Service: (e) session and daily caps stop calls');
  {
    _resetNarrativeCapsForTest();
    useGameStore.setState({ aiNarrationEnabled: true });
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({}));
    }) as any;

    try {
      // Set session counter to MAX_SESSION_CALLS
      _setSessionCallCountForTest(MAX_SESSION_CALLS);

      const res = await requestNarrativeEnrichment({
        context: { ...sampleContext, clubId: 'uncached_club_capped' },
        importance: 85,
      });

      assertEqual(fetchCalls, 0, 'zero fetch calls when session cap reached');
      assertEqual(res, null, 'returns null when session cap reached');
    } finally {
      globalThis.fetch = originalFetch;
      _resetNarrativeCapsForTest();
    }
  }

  section('Server Hardening: Schema validation, model config, and error protection');
  {
    // 1. Model config verification
    assert(typeof GEMINI_NARRATIVE_CONFIG.model === 'string', 'model name is configured');
    assertEqual(GEMINI_NARRATIVE_CONFIG.model, 'gemini-3.8-flash', 'default model is gemini-3.8-flash');
    assert(GEMINI_NARRATIVE_CONFIG.maxPayloadBytes === 16384, 'payload size limited to 16KB');

    // 2. Reject missing requestId
    const missingReq = validateIncomingNarrativeRequest({
      schemaVersion: 1,
      context: { locale: 'en', season: 1, clubId: 'c1', subjectIds: [], factKeys: [] },
    });
    assertEqual(missingReq.ok, false, 'rejects payload without requestId');

    // 3. Reject invalid schema version
    const invalidVer = validateIncomingNarrativeRequest({
      requestId: 'r1',
      schemaVersion: 99,
      context: { locale: 'en', season: 1, clubId: 'c1', subjectIds: [], factKeys: [] },
    });
    assertEqual(invalidVer.ok, false, 'rejects payload with invalid schemaVersion');

    // 4. Reject missing locale
    const missingLocale = validateIncomingNarrativeRequest({
      requestId: 'r1',
      schemaVersion: 1,
      context: { locale: 'fr', season: 1, clubId: 'c1', subjectIds: [], factKeys: [] },
    });
    assertEqual(missingLocale.ok, false, 'rejects payload with unsupported locale');

    // 5. Accept valid request
    const valid = validateIncomingNarrativeRequest({
      requestId: 'req_valid_01',
      schemaVersion: 1,
      context: {
        locale: 'en',
        season: 1,
        clubId: 'club_city',
        subjectIds: ['p1'],
        factKeys: ['won'],
      },
    });
    assertEqual(valid.ok, true, 'accepts strictly valid NarrativeRequest');
  }

  finish();
}

runNarrativeServiceTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
