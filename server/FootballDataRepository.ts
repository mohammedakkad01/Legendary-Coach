/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * server/FootballDataRepository.ts
 *
 * Upstream Data Repository for API-Football (v3.football.api-sports.io).
 * Features:
 * - Direct HTTP integration with header 'x-apisports-key'
 * - Quota Guard: Auto-aborts before calling API if requests used today >= 90 (100 cap)
 * - Rate Limiter: Configurable pause between requests (default 8s on free plan)
 * - Free Endpoint Awareness: /status consumes 0 quota
 */

import { QuotaStatus } from './types.ts';

export interface FootballRepositoryOptions {
  apiKey?: string;
  baseUrl?: string;
  delayMs?: number;
  safetyQuotaThreshold?: number; // default 90 requests
  dailyLimit?: number; // default 100 requests
}

export class QuotaExceededError extends Error {
  public currentUsage: number;
  public limit: number;

  constructor(currentUsage: number, limit: number, message?: string) {
    super(
      message ||
        `Daily API quota safeguard reached: ${currentUsage}/${limit} requests used (safe limit is 90). Aborted to prevent account suspension.`
    );
    this.name = 'QuotaExceededError';
    this.currentUsage = currentUsage;
    this.limit = limit;
  }
}

export class FootballDataRepository {
  private apiKey: string;
  private baseUrl: string;
  private delayMs: number;
  private safetyThreshold: number;
  private dailyLimit: number;
  private lastRemainingFromHeader: number | null = null;
  private lastCallTimestamp: number = 0;

  constructor(options?: FootballRepositoryOptions) {
    this.apiKey = (options?.apiKey || process.env.API_FOOTBALL_KEY || '').trim();
    this.baseUrl = options?.baseUrl || 'https://v3.football.api-sports.io';
    this.delayMs = options?.delayMs !== undefined ? options.delayMs : 8000;
    this.safetyThreshold = options?.safetyQuotaThreshold ?? 90;
    this.dailyLimit = options?.dailyLimit ?? 100;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'MY_API_FOOTBALL_KEY');
  }

  public setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Internal HTTP call wrapper with rate limiting and quota header parsing
   */
  private async executeCall<T = any>(
    endpoint: string,
    isFreeStatusCheck: boolean = false
  ): Promise<{ data: T; remaining?: number; limit?: number }> {
    if (!this.isConfigured()) {
      throw new Error('API_FOOTBALL_KEY is not configured or is empty.');
    }

    // If quota header previously indicated <= 6 requests left and this is not a status check, stop.
    if (!isFreeStatusCheck && this.lastRemainingFromHeader !== null && this.lastRemainingFromHeader <= 6) {
      throw new QuotaExceededError(
        this.dailyLimit - this.lastRemainingFromHeader,
        this.dailyLimit,
        `Stopping call: API quota header shows only ${this.lastRemainingFromHeader} requests remaining today.`
      );
    }

    // Rate-limiting delay between requests
    const timeSinceLast = Date.now() - this.lastCallTimestamp;
    if (this.delayMs > 0 && timeSinceLast < this.delayMs) {
      await this.sleep(this.delayMs - timeSinceLast);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': this.apiKey,
      },
    });

    this.lastCallTimestamp = Date.now();

    const remainingHeader = response.headers.get('x-ratelimit-requests-remaining');
    const limitHeader = response.headers.get('x-ratelimit-requests-limit');

    if (remainingHeader !== null) {
      const parsed = parseInt(remainingHeader, 10);
      if (!isNaN(parsed)) {
        this.lastRemainingFromHeader = parsed;
      }
    }

    if (response.status === 429) {
      throw new QuotaExceededError(this.dailyLimit, this.dailyLimit, 'HTTP 429: Daily or per-minute rate limit reached on API-Football.');
    }

    if (!response.ok) {
      throw new Error(`API-Football error ${response.status}: ${response.statusText} at ${endpoint}`);
    }

    const json = await response.json();

    // Check for API-Sports error payload (e.g. invalid key, suspended account)
    const errors = json.errors;
    const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0);
    if (hasErrors) {
      const errorMsg = typeof errors === 'object' ? JSON.stringify(errors) : String(errors);
      throw new Error(`API-Football error response for ${endpoint}: ${errorMsg}`);
    }

    return {
      data: json as T,
      remaining: this.lastRemainingFromHeader ?? undefined,
      limit: limitHeader ? parseInt(limitHeader, 10) : undefined,
    };
  }

  /**
   * GET /status
   * Cost: 0 requests (does not consume daily quota)
   */
  public async getStatus(): Promise<QuotaStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        current: 0,
        limit_day: this.dailyLimit,
        remaining: this.dailyLimit,
        remainingSafe: this.safetyThreshold,
        checkedAt: new Date().toISOString(),
        message: 'مفتاح API_FOOTBALL_KEY غير مهيأ بعد في المتغيرات البيئية.',
      };
    }

    try {
      const { data } = await this.executeCall<any>('/status', true);
      const reqInfo = data.response?.requests || { current: 0, limit_day: this.dailyLimit };
      const current = reqInfo.current || 0;
      const limitDay = reqInfo.limit_day || this.dailyLimit;
      const remaining = Math.max(0, limitDay - current);
      const remainingSafe = Math.max(0, this.safetyThreshold - current);

      return {
        configured: true,
        current,
        limit_day: limitDay,
        remaining,
        remainingSafe,
        account: data.response?.account,
        subscription: data.response?.subscription,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        configured: true,
        current: 0,
        limit_day: this.dailyLimit,
        remaining: this.dailyLimit,
        remainingSafe: this.safetyThreshold,
        checkedAt: new Date().toISOString(),
        message: `Failed to check status: ${err.message}`,
      };
    }
  }

  /**
   * Asserts quota is within safety threshold (>= 90 requests used triggers abort)
   */
  public async assertQuotaSafe(): Promise<QuotaStatus> {
    const status = await this.getStatus();
    if (status.current >= this.safetyThreshold) {
      throw new QuotaExceededError(status.current, status.limit_day);
    }
    return status;
  }

  /**
   * GET /standings?league={leagueId}&season={season}
   * Cost: 1 request
   */
  public async getStandings(leagueId: number, season: number | string = 2024): Promise<any> {
    await this.assertQuotaSafe();
    const { data } = await this.executeCall(`/standings?league=${leagueId}&season=${season}`);
    return data;
  }

  /**
   * GET /teams?league={leagueId}&season={season}
   * Cost: 1 request
   */
  public async getTeams(leagueId: number, season: number | string = 2024): Promise<any> {
    await this.assertQuotaSafe();
    const { data } = await this.executeCall(`/teams?league=${leagueId}&season=${season}`);
    return data;
  }

  /**
   * GET /players/topscorers?league={leagueId}&season={season}
   * Cost: 1 request
   */
  public async getTopScorers(leagueId: number, season: number | string = 2024): Promise<any> {
    await this.assertQuotaSafe();
    const { data } = await this.executeCall(`/players/topscorers?league=${leagueId}&season=${season}`);
    return data;
  }

  /**
   * GET /players/topassists?league={leagueId}&season={season}
   * Cost: 1 request
   */
  public async getTopAssists(leagueId: number, season: number | string = 2024): Promise<any> {
    await this.assertQuotaSafe();
    const { data } = await this.executeCall(`/players/topassists?league=${leagueId}&season=${season}`);
    return data;
  }

  /**
   * GET /players/squads?team={teamId}
   * Cost: 1 request
   */
  public async getSquad(teamId: number | string): Promise<any> {
    await this.assertQuotaSafe();
    const { data } = await this.executeCall(`/players/squads?team=${teamId}`);
    return data;
  }
}
