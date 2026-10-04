/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Express Full-Stack Server & Football Data API
 * 
 * Architecture:
 * API-Football  -->  SyncService / Worker  -->  Firestore Cache (Layer 1)  -->  Game Client
 *                                           \
 *                                            -> Memory Cache (Tier 0 Optimization)
 * 
 * - Firestore is the permanent, durable Source of Truth for official cached data.
 * - Memory cache is an optimization layer (Tier 0).
 * - Server restart does NOT lose data — reads hydrate from Firestore.
 * - Clients have read-only access (enforced by Firestore Security Rules).
 * - Serves Vite in dev and static SPA in production on port 3000.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import {
  FootballDataRepository,
  CacheRepository,
  SyncService,
  OFFICIAL_LEAGUES_CONFIG,
} from './server/index.ts';
import { handleNarrativeEnhancement, validateIncomingNarrativeRequest } from './server/geminiNarrative.ts';
import { handleAssistantExplanation, validateIncomingAssistantRequest } from './server/geminiAssistant.ts';
import { GEMINI_NARRATIVE_CONFIG } from './server/narrativeConfig.ts';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory IP rate limiter for /api/narrative/enhance
const narrativeIpRateBuckets = new Map<string, { count: number; windowStart: number }>();

function checkNarrativeIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = narrativeIpRateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > GEMINI_NARRATIVE_CONFIG.rateLimitWindowMs) {
    narrativeIpRateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= GEMINI_NARRATIVE_CONFIG.maxRequestsPerMinute) {
    return false;
  }
  bucket.count += 1;
  return true;
}

// Initialize Repositories and Services
const footballRepo = new FootballDataRepository();
const cacheRepo = new CacheRepository();
const syncService = new SyncService(footballRepo, cacheRepo);

export { OFFICIAL_LEAGUES_CONFIG };

/**
 * GET /api/football/status
 * Free endpoint: /status does not consume quota
 */
app.get('/api/football/status', async (req, res) => {
  try {
    const status = await syncService.getStatus();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({
      configured: footballRepo.isConfigured(),
      error: error.message || 'Failed to check API status',
    });
  }
});

/**
 * GET /api/football/cache/all
 * Returns unified cached leagues, clubs, squads, and sync logs from Firestore & Memory
 */
app.get('/api/football/cache/all', async (req, res) => {
  try {
    const summary = await cacheRepo.getAllCacheSummary();
    return res.json(summary);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/football/cache/leagues
 * Returns official cached leagues from Firestore
 */
app.get('/api/football/cache/leagues', async (req, res) => {
  try {
    const leagues = await cacheRepo.getAllLeagues();
    return res.json({ leagues });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/football/cache/clubs
 * Returns all cached clubs or clubs for a specific league (?leagueKey=xxx)
 */
app.get('/api/football/cache/clubs', async (req, res) => {
  try {
    const leagueKey = req.query.leagueKey as string | undefined;
    const clubs = leagueKey
      ? await cacheRepo.getClubsByLeague(leagueKey)
      : await cacheRepo.getAllClubs();
    return res.json({ clubs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/football/cache/squads/:clubId
 * Returns cached squad for a club
 */
app.get('/api/football/cache/squads/:clubId', async (req, res) => {
  try {
    const squad = await cacheRepo.getSquad(req.params.clubId);
    if (!squad) {
      return res.status(404).json({ error: `Squad not found for club ${req.params.clubId}` });
    }
    return res.json({ squad });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/football/sync-league
 * Synchronizes a single league safely:
 * - Checks Firestore cache first; if fresh and unexpired, skips calling API!
 * - If expired or forced, asserts daily quota margin (< 90 used), fetches data,
 *   persists to Firestore, and writes an audit log.
 */
app.post('/api/football/sync-league', async (req, res) => {
  const { leagueId, leagueKey, season = 2024, force = false } = req.body;
  const target = leagueKey || leagueId;

  if (!target) {
    return res.status(400).json({
      success: false,
      message: 'معرف الدوري leagueId أو المفتاح leagueKey مطلوب.',
    });
  }

  try {
    const result = await syncService.syncLeague(target, { season, force });
    if (!result.success && result.aborted) {
      return res.status(429).json(result);
    }
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/football/sync-squad
 * Synchronizes squad for a single team:
 * - Checks Firestore cache first; if fresh and unexpired, skips calling API!
 * - If expired or forced, asserts quota margin (< 90 used), fetches squad,
 *   persists to Firestore, and writes an audit log.
 */
app.post('/api/football/sync-squad', async (req, res) => {
  const { teamId, clubId, leagueId, clubNameEn, force = false } = req.body;
  const targetTeamId = teamId;
  const targetClubId = clubId || String(teamId);

  if (!targetTeamId) {
    return res.status(400).json({ success: false, message: 'معرف النادي teamId مطلوب.' });
  }

  try {
    const result = await syncService.syncSquad(targetClubId, targetTeamId, {
      force,
      leagueId,
      clubNameEn,
    });

    if (!result.success && result.aborted) {
      return res.status(429).json(result);
    }
    if (!result.success) {
      return res.status(500).json(result);
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/narrative/enhance
 * Server-side Gemini narrative enrichment endpoint.
 * Hardened with:
 * - Content-length payload guard (<= 16 KB)
 * - Per-IP rate limiting (20 req/min)
 * - Strict structural schema validation of input NarrativeRequest
 * - Never echoes raw Gemini exceptions or internal stack traces to client
 */
app.post('/api/narrative/enhance', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown_ip';

  // 1. IP rate limit guard
  if (!checkNarrativeIpRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  // 2. Payload size guard
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > GEMINI_NARRATIVE_CONFIG.maxPayloadBytes) {
    return res.status(413).json({ error: 'Payload exceeds maximum allowed size' });
  }

  // 3. Schema validation guard
  const validation = validateIncomingNarrativeRequest(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  // 4. Safe AI execution
  const apiKey = process.env.GEMINI_API_KEY;
  const outcome = await handleNarrativeEnhancement(validation.data, apiKey);

  if (!outcome.ok) {
    return res.status(outcome.status).json({ error: outcome.error });
  }

  return res.json(outcome.result);
});

/**
 * POST /api/assistant/explain
 * Server-side Gemini AI Assistant explanation endpoint.
 * Hardened with:
 * - Content-length payload guard (<= 16 KB)
 * - Per-IP rate limiting (20 req/min)
 * - Strict schema validation
 * - Server-side validation rejecting state mutation attempts
 */
app.post('/api/assistant/explain', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown_ip';

  if (!checkNarrativeIpRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > GEMINI_NARRATIVE_CONFIG.maxPayloadBytes) {
    return res.status(413).json({ error: 'Payload exceeds maximum allowed size' });
  }

  const validation = validateIncomingAssistantRequest(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const outcome = await handleAssistantExplanation(validation.data, apiKey);

  if (!outcome.ok) {
    return res.status(outcome.status).json({ error: outcome.error });
  }

  return res.json({ success: true, data: outcome.result });
});

// Vite Middleware for Dev, Static serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
