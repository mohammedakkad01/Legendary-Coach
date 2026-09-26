/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * server/SyncService.ts
 *
 * Unified Sync Service orchestrating between:
 * - FootballDataRepository (API-Football upstream)
 * - CacheRepository (Firestore Tier 1 + Memory Tier 0)
 *
 * Directives:
 * 1. Cache-First: If Firestore has valid, unexpired data, API-Football is NOT called.
 * 2. Safe Refresh: When expired or missing, asserts daily quota margin (< 90 requests).
 * 3. Unified Standards: All saved docs contain source, season, version, updatedAt, expiresAt.
 * 4. Audit Trail: All sync actions record entries in sync_logs collection.
 */

import { FootballDataRepository, QuotaExceededError } from './FootballDataRepository.ts';
import { CacheRepository } from './CacheRepository.ts';
import {
  CachedLeague,
  CachedClub,
  CachedSquad,
  SyncLogEntry,
  OFFICIAL_LEAGUES_CONFIG,
  LeagueConfig,
  QuotaStatus,
} from './types.ts';
import { buildSquadPlayers } from '../scripts/lib/squadBuilder.ts';

export interface SyncLeagueOptions {
  force?: boolean;
  season?: string | number;
  ttlDays?: number;
  includeRatingsCalibration?: boolean;
}

export interface SyncSquadOptions {
  force?: boolean;
  leagueId?: string;
  clubNameEn?: string;
  standingRank?: number;
  standingsTotal?: number;
  ttlDays?: number;
}

export class SyncService {
  private footballRepo: FootballDataRepository;
  private cacheRepo: CacheRepository;

  constructor(footballRepo?: FootballDataRepository, cacheRepo?: CacheRepository) {
    this.footballRepo = footballRepo || new FootballDataRepository();
    this.cacheRepo = cacheRepo || new CacheRepository();
  }

  public getFootballRepo(): FootballDataRepository {
    return this.footballRepo;
  }

  public getCacheRepo(): CacheRepository {
    return this.cacheRepo;
  }

  public async getStatus(): Promise<QuotaStatus> {
    return this.footballRepo.getStatus();
  }

  /**
   * Resolve a league configuration from key or numeric ID
   */
  public resolveLeagueConfig(keyOrId: string | number): LeagueConfig | undefined {
    if (typeof keyOrId === 'number' || !isNaN(Number(keyOrId))) {
      const numId = Number(keyOrId);
      return OFFICIAL_LEAGUES_CONFIG.find((l) => l.id === numId || l.key === String(keyOrId));
    }
    const cleanKey = String(keyOrId).replace(/^league_/, '');
    return OFFICIAL_LEAGUES_CONFIG.find((l) => l.key === cleanKey);
  }

  /**
   * Synchronize a single league (Standings + Clubs + optional player benchmarks)
   * Cache-First rule: Does NOT call API-Football if fresh data exists in Firestore!
   */
  public async syncLeague(
    leagueKeyOrId: string | number,
    options?: SyncLeagueOptions
  ): Promise<{
    success: boolean;
    skippedApi?: boolean;
    reason?: string;
    aborted?: boolean;
    requestsUsed: number;
    quotaRemaining?: number;
    league?: CachedLeague | null;
    clubsCount?: number;
    log?: SyncLogEntry;
    error?: string;
  }> {
    const config = this.resolveLeagueConfig(leagueKeyOrId);
    if (!config) {
      return {
        success: false,
        requestsUsed: 0,
        error: `الدوري '${leagueKeyOrId}' غير مسجل في قائمة الدوريات الرسمية المعتمدة.`,
      };
    }

    const season = options?.season || config.season || 2024;
    const leagueDocId = `league_${config.key}`;

    // 1. CACHE-FIRST CHECK: Check Firestore / Tier 1
    const existingLeague = await this.cacheRepo.getLeague(config.key);
    const existingClubs = await this.cacheRepo.getClubsByLeague(config.key);

    const isLeagueExpired = !existingLeague || this.cacheRepo.isExpired(existingLeague, options?.ttlDays);
    const hasSufficientClubs = existingClubs.length > 0 && (!config.expectedClubs || existingClubs.length >= config.expectedClubs - 2);

    if (!options?.force && !isLeagueExpired && hasSufficientClubs) {
      // Data is present, fresh and intact in Firestore! Skip external call to save quota.
      return {
        success: true,
        skippedApi: true,
        reason: 'بيانات الدوري متوفرة وحديثة في Firestore — تم تجاوز الاتصال بـ API-Football لتوفير الكوتا.',
        requestsUsed: 0,
        league: existingLeague,
        clubsCount: existingClubs.length,
      };
    }

    // 2. REFRESH REQUIRED: Safe execution with Quota Guard
    let sessionRequests = 0;
    const logDetails: string[] = [];

    try {
      // Check quota safeguard (< 90 requests used today)
      const quotaStatus = await this.footballRepo.assertQuotaSafe();
      const currentBefore = quotaStatus.current;
      const dailyLimit = quotaStatus.limit_day;

      logDetails.push(`Initiating fresh sync for ${config.nameEn} (Season ${season})`);

      // Call 1: Standings
      logDetails.push(`Fetching standings (ID ${config.id})`);
      const standingsData = await this.footballRepo.getStandings(config.id, season);
      sessionRequests += 1;

      const rawStandings = standingsData.response?.[0]?.league?.standings?.[0] || [];
      const leagueLogo = standingsData.response?.[0]?.league?.logo || '';
      const matchedVia = standingsData.response?.[0]?.league?.name || config.nameEn;

      // Extract clubs from standings ranking
      const clubsMap = new Map<number, { id: number; name: string; logo: string; rank?: number }>();
      const allGroups = standingsData.response?.[0]?.league?.standings || [];
      for (const group of allGroups) {
        for (const row of group) {
          if (row?.team?.id && !clubsMap.has(row.team.id)) {
            clubsMap.set(row.team.id, {
              id: row.team.id,
              name: row.team.name,
              logo: row.team.logo || '',
              rank: row.rank,
            });
          }
        }
      }

      // If standings didn't provide clubs (e.g. season hasn't started), fallback to /teams (Call 2)
      if (clubsMap.size === 0) {
        logDetails.push(`Fetching teams via /teams for ${config.id}`);
        const teamsData = await this.footballRepo.getTeams(config.id, season);
        sessionRequests += 1;
        for (const item of teamsData.response || []) {
          if (item?.team?.id && !clubsMap.has(item.team.id)) {
            clubsMap.set(item.team.id, {
              id: item.team.id,
              name: item.team.name,
              logo: item.team.logo || '',
            });
          }
        }
      }

      const clubsList = Array.from(clubsMap.values());
      const now = new Date().toISOString();
      const expiresAt = this.cacheRepo.generateExpiresAt(options?.ttlDays);

      // Build and save CachedLeague
      const leagueDoc: CachedLeague = {
        id: leagueDocId,
        leagueKey: config.key,
        apiFootballLeagueId: config.id,
        name: config.name,
        nameEn: config.nameEn,
        country: config.country,
        countrySlug: config.countrySlug,
        logo: leagueLogo,
        standings: rawStandings,
        totalClubs: clubsList.length,
        expectedClubs: config.expectedClubs,
        complete: config.expectedClubs ? clubsList.length >= config.expectedClubs : clubsList.length > 0,
        matchedVia,
        source: 'api-football',
        season,
        version: '1.0',
        updatedAt: now,
        expiresAt,
      };

      await this.cacheRepo.saveLeague(leagueDoc);

      // Build and save CachedClubs
      const clubDocs: CachedClub[] = clubsList.map((c) => ({
        id: `club_af_${c.id}`,
        idTeam: String(c.id),
        leagueKey: config.key,
        apiFootballLeagueId: config.id,
        name: c.name,
        nameEn: c.name,
        country: config.country,
        logo: c.logo,
        standingRank: c.rank ?? null,
        standingsTotal: clubsList.length,
        source: 'api-football',
        season,
        version: '1.0',
        updatedAt: now,
        expiresAt,
      }));

      await this.cacheRepo.saveClubs(clubDocs, config.key);

      const auditLog: SyncLogEntry = {
        id: `log_league_${config.key}_${Date.now()}`,
        timestamp: now,
        initiatedBy: 'server',
        source: 'api-football',
        leagueId: config.id,
        requestsUsed: sessionRequests,
        quotaRemaining: Math.max(0, dailyLimit - (currentBefore + sessionRequests)),
        status: 'success',
        summary: `تمت مزامنة دوري ${config.name} وتحديث Firestore: ${clubDocs.length} نادياً، استُهلك ${sessionRequests} طلب.`,
        details: logDetails.join(' | '),
        season,
        version: '1.0',
        updatedAt: now,
      };

      await this.cacheRepo.saveSyncLog(auditLog);

      return {
        success: true,
        requestsUsed: sessionRequests,
        quotaRemaining: auditLog.quotaRemaining,
        league: leagueDoc,
        clubsCount: clubDocs.length,
        log: auditLog,
      };
    } catch (err: any) {
      const isQuotaErr = err instanceof QuotaExceededError || /quota|429/i.test(err.message);
      const errorLog: SyncLogEntry = {
        id: `log_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        initiatedBy: 'server',
        source: 'api-football',
        leagueId: config.id,
        requestsUsed: sessionRequests,
        status: isQuotaErr ? 'aborted_quota' : 'failed',
        summary: `فشلت مزامنة دوري ${config.name}: ${err.message}`,
        details: logDetails.join(' | '),
        season,
        version: '1.0',
        updatedAt: new Date().toISOString(),
      };

      await this.cacheRepo.saveSyncLog(errorLog);

      return {
        success: false,
        aborted: isQuotaErr,
        requestsUsed: sessionRequests,
        error: err.message,
        log: errorLog,
      };
    }
  }

  /**
   * Synchronize a club's squad (/players/squads)
   * Cache-First rule: Does NOT call API-Football if squad cache exists in Firestore!
   */
  public async syncSquad(
    clubId: string,
    apiTeamId: string | number,
    options?: SyncSquadOptions
  ): Promise<{
    success: boolean;
    skippedApi?: boolean;
    reason?: string;
    aborted?: boolean;
    requestsUsed: number;
    squad?: CachedSquad | null;
    playersCount?: number;
    log?: SyncLogEntry;
    error?: string;
  }> {
    const cleanClubId = clubId.replace(/^squad_/, '');
    const squadDocId = `squad_${cleanClubId}`;

    // 1. CACHE-FIRST CHECK: Check Firestore / Tier 1
    const existing = await this.cacheRepo.getSquad(cleanClubId);
    if (!options?.force && existing && !this.cacheRepo.isExpired(existing, options?.ttlDays)) {
      return {
        success: true,
        skippedApi: true,
        reason: 'تشكيلة النادي موجودة وحديثة في Firestore — تم تجاوز الاتصال بـ API-Football.',
        requestsUsed: 0,
        squad: existing,
        playersCount: existing.playerCount,
      };
    }

    // 2. REFRESH REQUIRED: Safe execution with Quota Guard
    try {
      const quotaStatus = await this.footballRepo.assertQuotaSafe();
      const currentBefore = quotaStatus.current;
      const dailyLimit = quotaStatus.limit_day;

      const squadData = await this.footballRepo.getSquad(apiTeamId);
      const rawPlayers = squadData.response?.[0]?.players || [];
      const matchedTeamName = squadData.response?.[0]?.team?.name || options?.clubNameEn || cleanClubId;
      const leagueId = options?.leagueId || 'premier_league';

      const players = buildSquadPlayers(
        rawPlayers,
        leagueId,
        options?.standingRank,
        options?.standingsTotal
      );

      const now = new Date().toISOString();
      const expiresAt = this.cacheRepo.generateExpiresAt(options?.ttlDays);

      const squadDoc: CachedSquad = {
        id: squadDocId,
        clubId: cleanClubId,
        clubNameEn: options?.clubNameEn || matchedTeamName,
        leagueId,
        apiTeamId: String(apiTeamId),
        matchedTeamName,
        players,
        playerCount: players.length,
        ratingModel: 'estimate-v1',
        source: 'api-football',
        season: '2024',
        version: '1.0',
        updatedAt: now,
        expiresAt,
      };

      await this.cacheRepo.saveSquad(squadDoc);

      const auditLog: SyncLogEntry = {
        id: `squad_log_${cleanClubId}_${Date.now()}`,
        timestamp: now,
        initiatedBy: 'server',
        source: 'api-football',
        teamId: apiTeamId,
        requestsUsed: 1,
        quotaRemaining: Math.max(0, dailyLimit - (currentBefore + 1)),
        status: 'success',
        summary: `تم جلب تشكيلة ${matchedTeamName} وتخزينها في Firestore (${players.length} لاعباً).`,
        season: '2024',
        version: '1.0',
        updatedAt: now,
      };

      await this.cacheRepo.saveSyncLog(auditLog);

      return {
        success: true,
        requestsUsed: 1,
        squad: squadDoc,
        playersCount: players.length,
        log: auditLog,
      };
    } catch (err: any) {
      const isQuotaErr = err instanceof QuotaExceededError || /quota|429/i.test(err.message);
      return {
        success: false,
        aborted: isQuotaErr,
        requestsUsed: 0,
        error: err.message,
      };
    }
  }
}
