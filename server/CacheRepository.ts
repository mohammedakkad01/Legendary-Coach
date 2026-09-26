/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * server/CacheRepository.ts
 *
 * Unified Cache Repository Abstraction:
 * - Persistent Source of Truth: Firestore (Layer 1)
 *   Collections: leagues_cache, clubs_cache, players_cache, squads_cache, sync_logs
 * - In-Memory Fast Cache: Optimization (Tier 0)
 * - Server Restart Safe: Server restarts do not lose data (reads hydrate from Firestore)
 * - Standard Schema Metadata: source, season, version, updatedAt, expiresAt
 * - Cache Expiry Awareness: isExpired() determines if cache needs refresh
 */

import { initializeApp as initAdminApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import {
  CachedLeague,
  CachedClub,
  CachedPlayer,
  CachedSquad,
  SyncLogEntry,
} from './types.ts';

export interface CacheRepositoryOptions {
  serviceAccountJson?: string;
  databaseId?: string;
  defaultTtlDays?: number; // default 30 days
  disableMemoryCache?: boolean;
}

export class CacheRepository {
  private db: AdminFirestore | null = null;
  private databaseId: string;
  private defaultTtlDays: number;
  private isMemoryCacheDisabled: boolean;

  // Tier 0: In-Memory Optimization
  private memLeagues: Map<string, CachedLeague> = new Map();
  private memClubs: Map<string, CachedClub> = new Map();
  private memSquads: Map<string, CachedSquad> = new Map();
  private memPlayers: Map<string, CachedPlayer> = new Map();
  private memSyncLogs: SyncLogEntry[] = [];

  constructor(options?: CacheRepositoryOptions) {
    this.defaultTtlDays = options?.defaultTtlDays ?? 30;
    this.isMemoryCacheDisabled = options?.disableMemoryCache ?? false;
    this.databaseId = options?.databaseId || (firebaseConfig as any).firestoreDatabaseId || '(default)';

    this.initFirestore(options?.serviceAccountJson);
  }

  /**
   * Initializes Firebase Admin Firestore instance if credentials are provided
   */
  private initFirestore(serviceAccountJson?: string): void {
    try {
      const saRaw = serviceAccountJson || process.env.FIREBASE_SERVICE_ACCOUNT;
      if (saRaw && saRaw.trim() !== '') {
        const sa = JSON.parse(saRaw);
        const existingApps = getApps();
        const app = existingApps.length > 0
          ? existingApps[0]
          : initAdminApp({ credential: cert(sa), projectId: (firebaseConfig as any).projectId || sa.project_id });
        
        this.db = getAdminFirestore(app, this.databaseId);
      } else {
        // In local environments without SA, we can try to initialize admin app with projectId
        // or allow reading/writing to memory and fallback gracefully
        const existingApps = getApps();
        if (existingApps.length > 0) {
          this.db = getAdminFirestore(existingApps[0], this.databaseId);
        }
      }
    } catch (err: any) {
      console.warn(`[CacheRepository] Warning: Could not initialize Admin Firestore: ${err.message}. Operating in memory-optimized mode.`);
      this.db = null;
    }
  }

  public getFirestore(): AdminFirestore | null {
    return this.db;
  }

  /**
   * Checks whether a cached document has expired based on expiresAt or updatedAt + ttlDays
   */
  public isExpired(
    doc: { updatedAt?: string; expiresAt?: string },
    ttlDays: number = this.defaultTtlDays
  ): boolean {
    if (!doc) return true;
    const now = Date.now();

    if (doc.expiresAt) {
      const expTime = Date.parse(doc.expiresAt);
      if (!isNaN(expTime)) {
        return now >= expTime;
      }
    }

    if (doc.updatedAt) {
      const upTime = Date.parse(doc.updatedAt);
      if (!isNaN(upTime)) {
        const ttlMs = ttlDays * 86400 * 1000;
        return now - upTime > ttlMs;
      }
    }

    return true; // No timestamp -> consider expired
  }

  /**
   * Helper to generate a standardized expiresAt timestamp
   */
  public generateExpiresAt(ttlDays: number = this.defaultTtlDays): string {
    return new Date(Date.now() + ttlDays * 86400 * 1000).toISOString();
  }

  // =========================================================================
  // LEAGUES CACHE (Collection: leagues_cache)
  // =========================================================================

  public async getLeague(leagueKey: string): Promise<CachedLeague | null> {
    const docId = leagueKey.startsWith('league_') ? leagueKey : `league_${leagueKey}`;

    // 1. Check Tier 0: In-Memory cache
    if (!this.isMemoryCacheDisabled && this.memLeagues.has(docId)) {
      return this.memLeagues.get(docId)!;
    }

    // 2. Hydrate from Tier 1: Firestore
    if (this.db) {
      try {
        const snap = await this.db.collection('leagues_cache').doc(docId).get();
        if (snap.exists) {
          const data = snap.data() as CachedLeague;
          if (!this.isMemoryCacheDisabled) {
            this.memLeagues.set(docId, data);
          }
          return data;
        }
      } catch (err: any) {
        console.warn(`[CacheRepository] getLeague('${docId}') error:`, err.message);
      }
    }

    return null;
  }

  public async getAllLeagues(): Promise<CachedLeague[]> {
    // 1. If in-memory already loaded and populated, return it
    if (!this.isMemoryCacheDisabled && this.memLeagues.size > 0) {
      return Array.from(this.memLeagues.values());
    }

    // 2. Hydrate from Firestore
    if (this.db) {
      try {
        const snap = await this.db.collection('leagues_cache').get();
        const results: CachedLeague[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as CachedLeague;
          results.push(data);
          if (!this.isMemoryCacheDisabled) {
            this.memLeagues.set(docSnap.id, data);
          }
        });
        return results;
      } catch (err: any) {
        console.warn('[CacheRepository] getAllLeagues error:', err.message);
      }
    }

    return Array.from(this.memLeagues.values());
  }

  public async saveLeague(league: CachedLeague): Promise<void> {
    const docId = league.id.startsWith('league_') ? league.id : `league_${league.id}`;
    const standardized: CachedLeague = {
      ...league,
      id: docId,
      source: league.source || 'api-football',
      season: league.season || '2024',
      version: league.version || '1.0',
      updatedAt: league.updatedAt || new Date().toISOString(),
      expiresAt: league.expiresAt || this.generateExpiresAt(),
    };

    // 1. Save to Memory
    if (!this.isMemoryCacheDisabled) {
      this.memLeagues.set(docId, standardized);
    }

    // 2. Persist to Firestore
    if (this.db) {
      try {
        await this.db.collection('leagues_cache').doc(docId).set(standardized, { merge: true });
      } catch (err: any) {
        console.error(`[CacheRepository] Failed to save league ${docId} to Firestore:`, err.message);
      }
    }
  }

  // =========================================================================
  // CLUBS CACHE (Collection: clubs_cache)
  // =========================================================================

  public async getClub(clubId: string): Promise<CachedClub | null> {
    const docId = clubId.startsWith('club_') ? clubId : `club_af_${clubId}`;

    if (!this.isMemoryCacheDisabled && this.memClubs.has(docId)) {
      return this.memClubs.get(docId)!;
    }

    if (this.db) {
      try {
        const snap = await this.db.collection('clubs_cache').doc(docId).get();
        if (snap.exists) {
          const data = snap.data() as CachedClub;
          if (!this.isMemoryCacheDisabled) {
            this.memClubs.set(docId, data);
          }
          return data;
        }
      } catch (err: any) {
        console.warn(`[CacheRepository] getClub('${docId}') error:`, err.message);
      }
    }

    return null;
  }

  public async getClubsByLeague(leagueKey: string): Promise<CachedClub[]> {
    const cleanKey = leagueKey.replace(/^league_/, '');

    // Check memory first
    if (!this.isMemoryCacheDisabled && this.memClubs.size > 0) {
      const filtered = Array.from(this.memClubs.values()).filter(
        (c) => c.leagueKey === cleanKey || c.leagueKey === leagueKey
      );
      if (filtered.length > 0) return filtered;
    }

    // Query Firestore
    if (this.db) {
      try {
        const snap = await this.db.collection('clubs_cache').where('leagueKey', '==', cleanKey).get();
        const results: CachedClub[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as CachedClub;
          results.push(data);
          if (!this.isMemoryCacheDisabled) {
            this.memClubs.set(docSnap.id, data);
          }
        });
        return results;
      } catch (err: any) {
        console.warn(`[CacheRepository] getClubsByLeague('${cleanKey}') error:`, err.message);
      }
    }

    return Array.from(this.memClubs.values()).filter(
      (c) => c.leagueKey === cleanKey || c.leagueKey === leagueKey
    );
  }

  public async getAllClubs(): Promise<CachedClub[]> {
    if (!this.isMemoryCacheDisabled && this.memClubs.size > 0) {
      return Array.from(this.memClubs.values());
    }

    if (this.db) {
      try {
        const snap = await this.db.collection('clubs_cache').get();
        const results: CachedClub[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as CachedClub;
          results.push(data);
          if (!this.isMemoryCacheDisabled) {
            this.memClubs.set(docSnap.id, data);
          }
        });
        return results;
      } catch (err: any) {
        console.warn('[CacheRepository] getAllClubs error:', err.message);
      }
    }

    return Array.from(this.memClubs.values());
  }

  public async saveClubs(clubs: CachedClub[], leagueKey?: string): Promise<void> {
    const now = new Date().toISOString();
    const expiresAt = this.generateExpiresAt();

    const standardizedClubs = clubs.map((c) => {
      const docId = c.id?.startsWith('club_') ? c.id : `club_af_${c.idTeam || c.id}`;
      return {
        ...c,
        id: docId,
        idTeam: String(c.idTeam || ''),
        leagueKey: leagueKey || c.leagueKey,
        source: c.source || 'api-football',
        season: c.season || '2024',
        version: c.version || '1.0',
        updatedAt: c.updatedAt || now,
        expiresAt: c.expiresAt || expiresAt,
      };
    });

    // 1. Memory update
    if (!this.isMemoryCacheDisabled) {
      for (const club of standardizedClubs) {
        this.memClubs.set(club.id, club);
      }
    }

    // 2. Firestore batch write
    if (this.db) {
      try {
        const batch = this.db.batch();
        const keepIds = new Set<string>();

        for (const club of standardizedClubs) {
          keepIds.add(club.id);
          const docRef = this.db.collection('clubs_cache').doc(club.id);
          batch.set(docRef, club, { merge: true });
        }

        // Clean up old docs for the same league if specified
        if (leagueKey) {
          const cleanKey = leagueKey.replace(/^league_/, '');
          const oldSnap = await this.db.collection('clubs_cache').where('leagueKey', '==', cleanKey).get();
          oldSnap.forEach((d) => {
            if (!keepIds.has(d.id)) {
              batch.delete(d.ref);
            }
          });
        }

        await batch.commit();
      } catch (err: any) {
        console.error('[CacheRepository] Failed to save clubs batch to Firestore:', err.message);
      }
    }
  }

  // =========================================================================
  // SQUADS CACHE (Collection: squads_cache)
  // =========================================================================

  public async getSquad(clubId: string): Promise<CachedSquad | null> {
    const docId = clubId.startsWith('squad_') ? clubId : `squad_${clubId}`;

    if (!this.isMemoryCacheDisabled && this.memSquads.has(docId)) {
      return this.memSquads.get(docId)!;
    }

    if (this.db) {
      try {
        const snap = await this.db.collection('squads_cache').doc(docId).get();
        if (snap.exists) {
          const data = snap.data() as CachedSquad;
          if (!this.isMemoryCacheDisabled) {
            this.memSquads.set(docId, data);
          }
          return data;
        }
      } catch (err: any) {
        console.warn(`[CacheRepository] getSquad('${docId}') error:`, err.message);
      }
    }

    return null;
  }

  public async getAllSquads(): Promise<CachedSquad[]> {
    if (!this.isMemoryCacheDisabled && this.memSquads.size > 0) {
      return Array.from(this.memSquads.values());
    }

    if (this.db) {
      try {
        const snap = await this.db.collection('squads_cache').get();
        const results: CachedSquad[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as CachedSquad;
          results.push(data);
          if (!this.isMemoryCacheDisabled) {
            this.memSquads.set(docSnap.id, data);
          }
        });
        return results;
      } catch (err: any) {
        console.warn('[CacheRepository] getAllSquads error:', err.message);
      }
    }

    return Array.from(this.memSquads.values());
  }

  public async saveSquad(squad: CachedSquad): Promise<void> {
    const docId = squad.id?.startsWith('squad_') ? squad.id : `squad_${squad.clubId}`;
    const standardized: CachedSquad = {
      ...squad,
      id: docId,
      source: squad.source || 'api-football',
      season: squad.season || '2024',
      version: squad.version || '1.0',
      ratingModel: squad.ratingModel || 'estimate-v1',
      playerCount: squad.players ? squad.players.length : squad.playerCount || 0,
      updatedAt: squad.updatedAt || new Date().toISOString(),
      expiresAt: squad.expiresAt || this.generateExpiresAt(),
    };

    if (!this.isMemoryCacheDisabled) {
      this.memSquads.set(docId, standardized);
    }

    if (this.db) {
      try {
        await this.db.collection('squads_cache').doc(docId).set(standardized, { merge: true });
      } catch (err: any) {
        console.error(`[CacheRepository] Failed to save squad ${docId} to Firestore:`, err.message);
      }
    }
  }

  // =========================================================================
  // PLAYERS CACHE (Collection: players_cache)
  // =========================================================================

  public async getPlayers(teamId?: number): Promise<CachedPlayer[]> {
    if (!this.isMemoryCacheDisabled && this.memPlayers.size > 0) {
      const all = Array.from(this.memPlayers.values());
      return teamId ? all.filter((p) => Number(p.teamId) === teamId) : all;
    }

    if (this.db) {
      try {
        let query: any = this.db.collection('players_cache');
        if (teamId) {
          query = query.where('teamId', '==', teamId);
        }
        const snap = await query.get();
        const results: CachedPlayer[] = [];
        snap.forEach((docSnap: any) => {
          const data = docSnap.data() as CachedPlayer;
          results.push(data);
          if (!this.isMemoryCacheDisabled) {
            this.memPlayers.set(docSnap.id, data);
          }
        });
        return results;
      } catch (err: any) {
        console.warn('[CacheRepository] getPlayers error:', err.message);
      }
    }

    const all = Array.from(this.memPlayers.values());
    return teamId ? all.filter((p) => Number(p.teamId) === teamId) : all;
  }

  public async savePlayers(players: CachedPlayer[]): Promise<void> {
    const now = new Date().toISOString();
    const expiresAt = this.generateExpiresAt();

    const standardized = players.map((p) => ({
      ...p,
      id: p.id || `p_${p.playerId}`,
      source: p.source || 'api-football',
      season: p.season || '2024',
      version: p.version || '1.0',
      updatedAt: p.updatedAt || now,
      expiresAt: p.expiresAt || expiresAt,
    }));

    if (!this.isMemoryCacheDisabled) {
      for (const p of standardized) {
        this.memPlayers.set(p.id, p);
      }
    }

    if (this.db) {
      try {
        const batch = this.db.batch();
        for (const p of standardized) {
          const docRef = this.db.collection('players_cache').doc(p.id);
          batch.set(docRef, p, { merge: true });
        }
        await batch.commit();
      } catch (err: any) {
        console.error('[CacheRepository] Failed to save players to Firestore:', err.message);
      }
    }
  }

  // =========================================================================
  // SYNC LOGS (Collection: sync_logs)
  // =========================================================================

  public async getSyncLogs(limitCount: number = 20): Promise<SyncLogEntry[]> {
    if (this.db) {
      try {
        const snap = await this.db.collection('sync_logs').orderBy('timestamp', 'desc').limit(limitCount).get();
        const results: SyncLogEntry[] = [];
        snap.forEach((docSnap) => results.push(docSnap.data() as SyncLogEntry));
        return results;
      } catch (err: any) {
        console.warn('[CacheRepository] getSyncLogs error:', err.message);
      }
    }

    return this.memSyncLogs.slice(-limitCount).reverse();
  }

  public async saveSyncLog(log: SyncLogEntry): Promise<void> {
    const id = log.id || `log_${Date.now()}`;
    const standardized: SyncLogEntry = {
      ...log,
      id,
      timestamp: log.timestamp || new Date().toISOString(),
      version: log.version || '1.0',
      updatedAt: log.updatedAt || new Date().toISOString(),
    };

    this.memSyncLogs.push(standardized);
    if (this.memSyncLogs.length > 50) {
      this.memSyncLogs.shift();
    }

    if (this.db) {
      try {
        await this.db.collection('sync_logs').doc(id).set(standardized);
      } catch (err: any) {
        console.error('[CacheRepository] Failed to save sync log to Firestore:', err.message);
      }
    }
  }

  // =========================================================================
  // SUMMARY EXPORT FOR STATUS & DASHBOARD
  // =========================================================================

  public async getAllCacheSummary(): Promise<{
    leagues: Record<string, CachedLeague>;
    clubs: Record<string, CachedClub>;
    squads: Record<string, CachedSquad>;
    players: Record<string, CachedPlayer>;
    syncLogs: SyncLogEntry[];
  }> {
    const leaguesArr = await this.getAllLeagues();
    const clubsArr = await this.getAllClubs();
    const squadsArr = await this.getAllSquads();
    const logs = await this.getSyncLogs(15);

    const leaguesObj: Record<string, CachedLeague> = {};
    for (const l of leaguesArr) leaguesObj[l.id] = l;

    const clubsObj: Record<string, CachedClub> = {};
    for (const c of clubsArr) clubsObj[c.id] = c;

    const squadsObj: Record<string, CachedSquad> = {};
    for (const s of squadsArr) squadsObj[s.id] = s;

    const playersObj: Record<string, CachedPlayer> = {};
    for (const [id, p] of this.memPlayers.entries()) playersObj[id] = p;

    return {
      leagues: leaguesObj,
      clubs: clubsObj,
      squads: squadsObj,
      players: playersObj,
      syncLogs: logs,
    };
  }
}
