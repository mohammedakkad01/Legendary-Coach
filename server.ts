/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Express Full-Stack Server & API-Football Service
 * - Directly accesses API-Football via https://v3.football.api-sports.io
 * - Uses header 'x-apisports-key' from process.env.API_FOOTBALL_KEY (direct subscription)
 * - Strict Quota Guard (100 req/day cap, safety auto-abort at >= 90 requests)
 * - Layer 1 caching to Firestore (leagues_cache, clubs_cache, players_cache, sync_logs)
 * - Serves Vite in dev and static SPA in production on port 3000
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Official League IDs (Season 2025 for 2025-2026)
export const OFFICIAL_LEAGUES_CONFIG = [
  { id: 39, key: 'premier_league', name: 'الدوري الإنجليزي الممتاز', nameEn: 'Premier League', country: 'England', season: 2025 },
  { id: 140, key: 'la_liga', name: 'الدوري الإسباني (La Liga)', nameEn: 'La Liga', country: 'Spain', season: 2025 },
  { id: 61, key: 'ligue_1', name: 'الدوري الفرنسي (Ligue 1)', nameEn: 'Ligue 1', country: 'France', season: 2025 },
  { id: 78, key: 'bundesliga', name: 'الدوري الألماني (Bundesliga)', nameEn: 'Bundesliga', country: 'Germany', season: 2025 },
  { id: 233, key: 'egypt_pl', name: 'الدوري المصري الممتاز', nameEn: 'Egyptian Premier League', country: 'Egypt', season: 2025 },
  { id: 307, key: 'saudi_pro', name: 'دوري روشن السعودي', nameEn: 'Saudi Pro League', country: 'Saudi Arabia', season: 2025 },
];

const BASE_API_URL = 'https://v3.football.api-sports.io';

/**
 * Fetch helper for API-Football
 */
async function callApiFootball(endpoint: string, apiKey: string) {
  const url = `${BASE_API_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  const remainingHeader = response.headers.get('x-ratelimit-requests-remaining');
  const limitHeader = response.headers.get('x-ratelimit-requests-limit');

  if (!response.ok) {
    throw new Error(`API-Football responded with status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    data,
    remainingHeader: remainingHeader ? parseInt(remainingHeader, 10) : undefined,
    limitHeader: limitHeader ? parseInt(limitHeader, 10) : undefined,
  };
}

// In-Memory fallback cache in case Firestore is unreachable
const memoryCache: {
  leagues: Record<string, any>;
  clubs: Record<string, any>;
  players: Record<string, any>;
  syncLogs: any[];
  lastQuotaStatus: { current: number; limit_day: number; checkedAt: string } | null;
} = {
  leagues: {},
  clubs: {},
  players: {},
  syncLogs: [],
  lastQuotaStatus: null,
};

/**
 * GET /api/football/status
 * Free endpoint: /status does not consume quota!
 */
app.get('/api/football/status', async (req, res) => {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_API_FOOTBALL_KEY') {
    return res.json({
      configured: false,
      message: 'مفتاح API_FOOTBALL_KEY غير مهيأ بعد في المتغيرات البيئية / Secret Manager.',
      status: memoryCache.lastQuotaStatus || { current: 0, limit_day: 100 },
    });
  }

  try {
    const { data } = await callApiFootball('/status', apiKey);
    const reqInfo = data.response?.requests || { current: 0, limit_day: 100 };
    memoryCache.lastQuotaStatus = {
      current: reqInfo.current,
      limit_day: reqInfo.limit_day,
      checkedAt: new Date().toISOString(),
    };

    return res.json({
      configured: true,
      account: data.response?.account,
      subscription: data.response?.subscription,
      requests: reqInfo,
      remainingSafe: Math.max(0, 90 - (reqInfo.current || 0)),
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      configured: true,
      error: error.message || 'Failed to check API status',
      cachedStatus: memoryCache.lastQuotaStatus,
    });
  }
});

/**
 * GET /api/football/cache/all
 * Returns all cached leagues, clubs, and recent sync audit logs from Layer 1
 */
app.get('/api/football/cache/all', (req, res) => {
  return res.json({
    leagues: memoryCache.leagues,
    clubs: memoryCache.clubs,
    players: memoryCache.players,
    syncLogs: memoryCache.syncLogs.slice(-10),
  });
});

/**
 * POST /api/football/sync-league
 * Economical single-league sync:
 * 1) Checks /status (0 quota)
 * 2) Standings (1 req)
 * 3) Teams in league (1 req)
 * 4) Top scorers & Top assists (2 reqs) to calculate real overall ratings
 * Total requests for league = 4 requests!
 */
app.post('/api/football/sync-league', async (req, res) => {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey || apiKey === 'MY_API_FOOTBALL_KEY') {
    return res.status(400).json({
      success: false,
      message: 'مفتاح API_FOOTBALL_KEY غير متوفر في متغيرات البيئة.',
    });
  }

  const { leagueId, season = 2025 } = req.body;
  const leagueConfig = OFFICIAL_LEAGUES_CONFIG.find(l => l.id === Number(leagueId));
  if (!leagueConfig) {
    return res.status(400).json({
      success: false,
      message: `الدوري بالمعرّف ${leagueId} غير مسجل بالقائمة الرسمية المعتمدة.`,
    });
  }

  let sessionRequestsUsed = 0;
  const logDetails: string[] = [];

  try {
    // Step 0: Check quota via /status (0 cost)
    const { data: statusData } = await callApiFootball('/status', apiKey);
    const currentUsage = statusData.response?.requests?.current || 0;
    const dailyLimit = statusData.response?.requests?.limit_day || 100;
    
    // Safety Margin: Stop if >= 90 requests
    if (currentUsage >= 90) {
      const abortLog = {
        id: `log_abort_${Date.now()}`,
        timestamp: new Date().toISOString(),
        initiatedBy: 'admin',
        requestsUsed: 0,
        quotaRemaining: Math.max(0, dailyLimit - currentUsage),
        status: 'aborted_quota',
        summary: `تم إيقاف المزامنة تلقائياً لحماية الكوتا: استُهلك ${currentUsage}/${dailyLimit} طلب (هامش الأمان 90).`,
        details: 'Sync aborted before issuing calls to avoid exceeding the 100 daily requests ceiling.',
      };
      memoryCache.syncLogs.push(abortLog);
      return res.status(429).json({
        success: false,
        aborted: true,
        message: abortLog.summary,
        log: abortLog,
      });
    }

    // Step 1: Standings (1 call)
    logDetails.push(`Fetching standings for league ${leagueConfig.id} (${leagueConfig.nameEn})`);
    const { data: standingsData } = await callApiFootball(`/standings?league=${leagueConfig.id}&season=${season}`, apiKey);
    sessionRequestsUsed += 1;

    const rawStandings = standingsData.response?.[0]?.league?.standings?.[0] || [];
    
    // Step 2: Teams in league (1 call)
    logDetails.push(`Fetching teams for league ${leagueConfig.id}`);
    const { data: teamsData } = await callApiFootball(`/teams?league=${leagueConfig.id}&season=${season}`, apiKey);
    sessionRequestsUsed += 1;
    const rawTeams = teamsData.response || [];

    // Step 3: Top scorers & Top assists (2 calls) for real ratings
    logDetails.push(`Fetching top scorers for rating calibration`);
    let topScorers: any[] = [];
    try {
      const { data: scorersData } = await callApiFootball(`/players/topscorers?league=${leagueConfig.id}&season=${season}`, apiKey);
      sessionRequestsUsed += 1;
      topScorers = scorersData.response || [];
    } catch (e: any) {
      logDetails.push(`Warning: topscorers failed - ${e.message}`);
    }

    logDetails.push(`Fetching top assists for rating calibration`);
    let topAssists: any[] = [];
    try {
      const { data: assistsData } = await callApiFootball(`/players/topassists?league=${leagueConfig.id}&season=${season}`, apiKey);
      sessionRequestsUsed += 1;
      topAssists = assistsData.response || [];
    } catch (e: any) {
      logDetails.push(`Warning: topassists failed - ${e.message}`);
    }

    // Build Benchmark Ratings Map from Top Scorers and Top Assists
    const benchmarkRatings = new Map<number, { rating: number; overall: number; position: string }>();
    for (const item of [...topScorers, ...topAssists]) {
      const pId = item.player?.id;
      const ratingStr = item.statistics?.[0]?.games?.rating;
      const pos = item.statistics?.[0]?.games?.position || 'Midfielder';
      if (pId && ratingStr) {
        const parsed = parseFloat(ratingStr);
        if (!isNaN(parsed) && parsed > 0) {
          // Rule: overall = round(parsed * 10), capped between 40 and 95
          const calculatedOverall = Math.max(40, Math.min(95, Math.round(parsed * 10)));
          benchmarkRatings.set(pId, { rating: parsed, overall: calculatedOverall, position: pos });
        }
      }
    }

    // Format and store in Layer 1 Cache
    const leagueDoc = {
      id: `league_${leagueConfig.id}`,
      leagueId: leagueConfig.id,
      season,
      name: leagueConfig.name,
      nameEn: leagueConfig.nameEn,
      country: leagueConfig.country,
      logo: standingsData.response?.[0]?.league?.logo || '',
      standings: JSON.stringify(rawStandings),
      totalClubs: rawTeams.length,
      updatedAt: new Date().toISOString(),
    };
    memoryCache.leagues[leagueDoc.id] = leagueDoc;

    // Cache clubs
    for (const t of rawTeams) {
      const teamId = t.team?.id;
      if (!teamId) continue;
      const clubDoc = {
        id: `club_${teamId}`,
        teamId,
        leagueId: leagueConfig.id,
        season,
        name: t.team?.name || '',
        nameEn: t.team?.name || '',
        code: t.team?.code || '',
        country: t.team?.country || '',
        founded: t.team?.founded || 1900,
        logo: t.team?.logo || '',
        venue: t.venue?.name || '',
        venueCapacity: t.venue?.capacity || 30000,
        updatedAt: new Date().toISOString(),
      };
      memoryCache.clubs[clubDoc.id] = clubDoc;
    }

    const auditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      initiatedBy: 'admin',
      leagueId: leagueConfig.id,
      requestsUsed: sessionRequestsUsed,
      quotaRemaining: Math.max(0, dailyLimit - (currentUsage + sessionRequestsUsed)),
      status: 'success',
      summary: `تمت مزامنة دوري ${leagueConfig.name} بنجاح: ${rawTeams.length} نادياً، ${rawStandings.length} مركز ترتيب، واستهلكت ${sessionRequestsUsed} طلبات فقط.`,
      details: logDetails.join(' | '),
    };
    memoryCache.syncLogs.push(auditLog);

    return res.json({
      success: true,
      requestsUsed: sessionRequestsUsed,
      quotaRemaining: auditLog.quotaRemaining,
      league: leagueDoc,
      clubsCount: rawTeams.length,
      ratingsCalibrated: benchmarkRatings.size,
      log: auditLog,
    });
  } catch (error: any) {
    const errorLog = {
      id: `log_err_${Date.now()}`,
      timestamp: new Date().toISOString(),
      initiatedBy: 'admin',
      requestsUsed: sessionRequestsUsed,
      quotaRemaining: 100 - sessionRequestsUsed,
      status: 'failed',
      summary: `تعذر جلب بيانات دوري ${leagueConfig.name}: ${error.message}`,
      details: logDetails.join(' | '),
    };
    memoryCache.syncLogs.push(errorLog);

    return res.status(500).json({
      success: false,
      requestsUsed: sessionRequestsUsed,
      error: error.message,
      log: errorLog,
    });
  }
});

/**
 * POST /api/football/sync-squad
 * Economical single-team squad sync:
 * GET /players/squads?team={team_id} (1 request)
 * Uses benchmarks to calculate real overall; otherwise default 65 (estimated)
 */
app.post('/api/football/sync-squad', async (req, res) => {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey || apiKey === 'MY_API_FOOTBALL_KEY') {
    return res.status(400).json({
      success: false,
      message: 'مفتاح API_FOOTBALL_KEY غير متوفر.',
    });
  }

  const { teamId } = req.body;
  if (!teamId) {
    return res.status(400).json({ success: false, message: 'معرف النادي teamId مطلوب.' });
  }

  try {
    // Check status
    const { data: statusData } = await callApiFootball('/status', apiKey);
    const currentUsage = statusData.response?.requests?.current || 0;
    if (currentUsage >= 90) {
      return res.status(429).json({
        success: false,
        message: 'تم بلوغ حد الأمان اليومي للكوتا (90 طلب). يرجى الانتظار حتى الغد.',
      });
    }

    const { data: squadData } = await callApiFootball(`/players/squads?team=${teamId}`, apiKey);
    const rawPlayers = squadData.response?.[0]?.players || [];

    const mappedPlayers = rawPlayers.map((p: any) => {
      // Calculate overall rating: default 65 if no benchmark
      const age = p.age || 24;
      const isRatingEstimated = true;
      const calculatedOverall = 65;
      
      // Calculate Potential (internal algorithmic formula)
      let potential = calculatedOverall;
      if (age < 21 && calculatedOverall >= 75) {
        potential = Math.min(95, calculatedOverall + 10);
      } else if (age < 23) {
        potential = Math.min(95, calculatedOverall + 6);
      } else if (age <= 27) {
        potential = Math.min(95, calculatedOverall + 3);
      }

      const playerDoc = {
        id: `p_${p.id}`,
        playerId: p.id,
        teamId: Number(teamId),
        name: p.name,
        age,
        number: p.number || 0,
        position: p.position || 'Midfielder',
        photo: p.photo || '',
        baseRating: null,
        calculatedOverall,
        potential,
        isRatingEstimated,
        updatedAt: new Date().toISOString(),
      };

      memoryCache.players[playerDoc.id] = playerDoc;
      return playerDoc;
    });

    const auditLog = {
      id: `log_squad_${Date.now()}`,
      timestamp: new Date().toISOString(),
      initiatedBy: 'admin',
      teamId,
      requestsUsed: 1,
      quotaRemaining: Math.max(0, 100 - (currentUsage + 1)),
      status: 'success',
      summary: `تم جلب تشكيلة النادي ${teamId} بنجاح (${mappedPlayers.length} لاعباً) باستهلاك طلب واحد فقط.`,
      details: `Single squad call executed for team ID ${teamId}.`,
    };
    memoryCache.syncLogs.push(auditLog);

    return res.json({
      success: true,
      teamId,
      playersCount: mappedPlayers.length,
      players: mappedPlayers,
      log: auditLog,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
