/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * server/types.ts
 *
 * Unified data models and interfaces for Football Data caching architecture.
 * Shared across:
 * - Server endpoints (Express)
 * - Sync Workers / GitHub Actions
 * - Firestore Cache Collections (Layer 1)
 */

export interface CachedLeague {
  id: string; // e.g. "league_premier_league"
  leagueKey: string; // e.g. "premier_league"
  apiFootballLeagueId?: number; // e.g. 39
  name: string; // Arabic name
  nameEn: string; // English name
  country: string;
  countrySlug?: string;
  logo?: string;
  standings?: any[] | string;
  totalClubs: number;
  expectedClubs?: number;
  complete?: boolean;
  matchedVia?: string;
  // Architecture Standards
  source: 'api-football' | 'thesportsdb' | 'curated' | string;
  season: string | number; // e.g. "2024" or "2025"
  version: string; // e.g. "1.0"
  updatedAt: string; // ISO 8601
  expiresAt?: string; // ISO 8601
}

export interface CachedClub {
  id: string; // e.g. "club_af_33"
  idTeam: string | number; // API team ID
  leagueKey: string; // League key e.g. "premier_league"
  apiFootballLeagueId?: number;
  name: string;
  nameEn: string;
  code?: string;
  country: string;
  founded?: number | string;
  logo: string;
  venue?: string;
  venueCapacity?: number;
  standingRank?: number | null;
  standingsTotal?: number | null;
  descriptionEn?: string;
  // Architecture Standards
  source: 'api-football' | 'thesportsdb' | 'curated' | string;
  season: string | number;
  version: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CachedPlayer {
  id: string; // e.g. "p_1234"
  playerId: number;
  teamId: number | string;
  name: string;
  nameEn?: string;
  age: number;
  number?: number;
  position: string;
  photo?: string;
  baseRating?: number | null;
  calculatedOverall: number;
  potential: number;
  isRatingEstimated: boolean;
  // Architecture Standards
  source: string;
  season: string | number;
  version: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CachedSquadPlayer {
  idPlayer?: string | number;
  name: string;
  nameEn: string;
  position: string;
  positionRaw?: string;
  nationality?: string;
  age: number;
  number?: string | number;
  photoUrl?: string;
  overall: number;
  potential: number;
  isRatingEstimated?: boolean;
}

export interface CachedSquad {
  id: string; // e.g. "squad_arsenal" or "squad_af_42"
  clubId: string; // Game club identifier (e.g. "arsenal")
  clubNameEn: string;
  leagueId: string; // Game league identifier (e.g. "premier_league")
  apiTeamId: string;
  matchedTeamName?: string;
  players: CachedSquadPlayer[];
  playerCount: number;
  ratingModel: string; // e.g. "estimate-v1"
  // Architecture Standards
  source: 'api-football' | 'thesportsdb' | 'curated' | string;
  season: string | number;
  version: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  initiatedBy: 'server' | 'github-actions' | 'cli' | 'admin';
  source: string;
  leagueId?: number | string;
  teamId?: number | string;
  requestsUsed: number;
  quotaRemaining?: number;
  status: 'success' | 'partial' | 'failed' | 'aborted_quota';
  summary: string;
  details?: string | string[] | any;
  season?: string | number;
  version: string;
  updatedAt: string;
}

export interface QuotaStatus {
  configured: boolean;
  current: number;
  limit_day: number;
  remaining: number;
  remainingSafe: number;
  account?: {
    firstname?: string;
    email?: string;
  };
  subscription?: {
    plan?: string;
    end?: string;
    active?: boolean;
  };
  checkedAt: string;
  message?: string;
}

export interface LeagueConfig {
  id: number; // API-Football League ID
  key: string; // Internal league key
  name: string; // Arabic name
  nameEn: string; // English name
  country: string;
  countrySlug?: string;
  season: number; // default season
  expectedClubs?: number;
  nameMustMatch?: RegExp;
}

export const OFFICIAL_LEAGUES_CONFIG: LeagueConfig[] = [
  { id: 39, key: 'premier_league', name: 'الدوري الإنجليزي الممتاز', nameEn: 'Premier League', country: 'England', countrySlug: 'England', season: 2024, expectedClubs: 20 },
  { id: 140, key: 'la_liga', name: 'الدوري الإسباني (La Liga)', nameEn: 'La Liga', country: 'Spain', countrySlug: 'Spain', season: 2024, expectedClubs: 20 },
  { id: 135, key: 'serie_a', name: 'الدوري الإيطالي (Serie A)', nameEn: 'Serie A', country: 'Italy', countrySlug: 'Italy', season: 2024, expectedClubs: 20 },
  { id: 78, key: 'bundesliga', name: 'الدوري الألماني (Bundesliga)', nameEn: 'Bundesliga', country: 'Germany', countrySlug: 'Germany', season: 2024, expectedClubs: 18 },
  { id: 61, key: 'ligue_1', name: 'الدوري الفرنسي (Ligue 1)', nameEn: 'Ligue 1', country: 'France', countrySlug: 'France', season: 2024, expectedClubs: 18 },
  { id: 40, key: 'championship', name: 'الدرجة الأولى الإنجليزية', nameEn: 'EFL Championship', country: 'England', countrySlug: 'England', season: 2024, expectedClubs: 24 },
  { id: 141, key: 'segunda_division', name: 'الدرجة الثانية الإسبانية', nameEn: 'La Liga Hypermotion', country: 'Spain', countrySlug: 'Spain', season: 2024, expectedClubs: 22 },
  { id: 308, key: 'yelo_league', name: 'دوري يلو السعودي', nameEn: 'Saudi Yelo League', country: 'Saudi Arabia', countrySlug: 'Saudi-Arabia', season: 2024, expectedClubs: 18 },
  { id: 200, key: 'botola_pro', name: 'الدوري المغربي الاحترافي', nameEn: 'Botola Pro Inwi', country: 'Morocco', countrySlug: 'Morocco', season: 2024, expectedClubs: 16 },
  { id: 233, key: 'egypt_pl', name: 'الدوري المصري الممتاز', nameEn: 'Egyptian Premier League', country: 'Egypt', countrySlug: 'Egypt', season: 2024, expectedClubs: 21 },
  { id: 307, key: 'saudi_pro', name: 'دوري روشن السعودي', nameEn: 'Saudi Pro League', country: 'Saudi Arabia', countrySlug: 'Saudi-Arabia', season: 2024, expectedClubs: 18 },
];
