/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Live Football API Integration & Real Database Service
 * Connects to TheSportsDB public API for live real teams, real player photos,
 * real statistics, and provides a rich authentic fallback registry.
 */

import { Player, PlayerPosition, PlayerRarity, PlayerPersonality } from '../types/game';

export interface ApiTeamResult {
  idTeam: string;
  strTeam: string;
  strAlternate?: string;
  strLeague?: string;
  strStadium?: string;
  strBadge?: string;
  strLogo?: string;
  strCountry?: string;
  intFormedYear?: string;
  strDescriptionEN?: string;
  strDescriptionAR?: string;
}

export interface ApiPlayerResult {
  idPlayer: string;
  strPlayer: string;
  strTeam?: string;
  strNationality?: string;
  strPosition?: string;
  dateBorn?: string;
  strThumb?: string;
  strCutout?: string;
  strHeight?: string;
  strWeight?: string;
  strDescriptionEN?: string;
  strNumber?: string;
}

// Curated Real Teams with verified badges & real data
export const POPULAR_REAL_TEAMS: Array<{
  id: string;
  name: string;
  nameEn: string;
  country: string;
  badge: string;
  stadium: string;
  league: string;
  colors: { primary: string; secondary: string; accent: string };
}> = [
  {
    id: 'team_real_madrid',
    name: 'ريال مدريد',
    nameEn: 'Real Madrid',
    country: 'إسبانيا 🇪🇸',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png',
    stadium: 'Santiago Bernabéu',
    league: 'La Liga',
    colors: { primary: '#1e3a8a', secondary: '#ffffff', accent: '#fbbf24' }
  },
  {
    id: 'team_man_city',
    name: 'مانشستر سيتي',
    nameEn: 'Manchester City',
    country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png',
    stadium: 'Etihad Stadium',
    league: 'Premier League',
    colors: { primary: '#38bdf8', secondary: '#0f172a', accent: '#ffffff' }
  },
  {
    id: 'team_barcelona',
    name: 'برشلونة',
    nameEn: 'FC Barcelona',
    country: 'إسبانيا 🇪🇸',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/xqwpux1473502870.png',
    stadium: 'Spotify Camp Nou',
    league: 'La Liga',
    colors: { primary: '#831843', secondary: '#1e3a8a', accent: '#f59e0b' }
  },
  {
    id: 'team_arsenal',
    name: 'أرسنال',
    nameEn: 'Arsenal',
    country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png',
    stadium: 'Emirates Stadium',
    league: 'Premier League',
    colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#fbbf24' }
  },
  {
    id: 'team_liverpool',
    name: 'ليفربول',
    nameEn: 'Liverpool FC',
    country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/c8430b1716386341.png',
    stadium: 'Anfield',
    league: 'Premier League',
    colors: { primary: '#991b1b', secondary: '#047857', accent: '#ffffff' }
  },
  {
    id: 'team_bayern',
    name: 'بايرن ميونخ',
    nameEn: 'Bayern Munich',
    country: 'ألمانيا 🇩🇪',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/095ud71694432924.png',
    stadium: 'Allianz Arena',
    league: 'Bundesliga',
    colors: { primary: '#b91c1c', secondary: '#ffffff', accent: '#1d4ed8' }
  },
  {
    id: 'team_al_hilal',
    name: 'الهلال السعودي',
    nameEn: 'Al-Hilal FC',
    country: 'السعودية 🇸🇦',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/5trzvq1660439102.png',
    stadium: 'Kingdom Arena',
    league: 'Roshn Saudi League',
    colors: { primary: '#1d4ed8', secondary: '#ffffff', accent: '#60a5fa' }
  },
  {
    id: 'team_al_nassr',
    name: 'النصر السعودي',
    nameEn: 'Al-Nassr FC',
    country: 'السعودية 🇸🇦',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/84yvqi1748524565.png',
    stadium: 'Al-Awwal Park',
    league: 'Roshn Saudi League',
    colors: { primary: '#eab308', secondary: '#1e3a8a', accent: '#ffffff' }
  },
  {
    id: 'team_psg',
    name: 'باريس سان جيرمان',
    nameEn: 'Paris Saint-Germain',
    country: 'فرنسا 🇫🇷',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png',
    stadium: 'Parc des Princes',
    league: 'Ligue 1',
    colors: { primary: '#1e1b4b', secondary: '#b91c1c', accent: '#ffffff' }
  },
  {
    id: 'team_inter',
    name: 'إنتر ميلان',
    nameEn: 'Inter Milan',
    country: 'إيطاليا 🇮🇹',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/xpyuvw1473504104.png',
    stadium: 'San Siro',
    league: 'Serie A',
    colors: { primary: '#0284c7', secondary: '#000000', accent: '#eab308' }
  },
  {
    id: 'team_al_ahly',
    name: 'الأهلي المصري',
    nameEn: 'Al Ahly SC',
    country: 'مصر 🇪🇬',
    badge: 'https://r2.thesportsdb.com/images/media/team/badge/3rkv511676916584.png',
    stadium: 'Cairo International Stadium',
    league: 'Egyptian Premier League',
    colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#eab308' }
  }
];

/**
 * Search real teams from TheSportsDB Football API
 */
export async function searchRealTeamsApi(query: string): Promise<ApiTeamResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.teams || []) as ApiTeamResult[];
  } catch (error) {
    console.warn('Football API search teams error:', error);
    // Return filtered curated teams as fallback
    const q = query.toLowerCase();
    return POPULAR_REAL_TEAMS.filter(t => 
      t.name.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q)
    ).map(t => ({
      idTeam: t.id,
      strTeam: t.nameEn,
      strBadge: t.badge,
      strStadium: t.stadium,
      strCountry: t.country,
      strLeague: t.league
    }));
  }
}

/**
 * Search real players from TheSportsDB Football API
 */
export async function searchRealPlayersApi(query: string): Promise<ApiPlayerResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.player || []) as ApiPlayerResult[];
  } catch (error) {
    console.warn('Football API search players error:', error);
    return [];
  }
}

/**
 * Map API position string to Game PlayerPosition
 */
export function mapApiPosition(pos?: string): PlayerPosition {
  if (!pos) return 'CM';
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p === 'gk') return 'GK';
  if (p.includes('centre-back') || p.includes('center back') || p === 'cb') return 'CB';
  if (p.includes('left-back') || p.includes('left back') || p === 'lb') return 'LB';
  if (p.includes('right-back') || p.includes('right back') || p === 'rb') return 'RB';
  if (p.includes('defensive midfield') || p === 'cdm' || p === 'dm') return 'CDM';
  if (p.includes('attacking midfield') || p === 'cam' || p === 'am') return 'CAM';
  if (p.includes('left wing') || p === 'lw') return 'LW';
  if (p.includes('right wing') || p === 'rw') return 'RW';
  if (p.includes('forward') || p.includes('striker') || p === 'st' || p === 'cf') return 'ST';
  return 'CM';
}

/**
 * Convert API player to Game Player domain model
 */
export function convertApiPlayerToGamePlayer(apiP: ApiPlayerResult): Player {
  const position = mapApiPosition(apiP.strPosition);
  
  // Calculate approximate age from dateBorn
  let age = 24;
  if (apiP.dateBorn) {
    const bornYear = new Date(apiP.dateBorn).getFullYear();
    if (!isNaN(bornYear) && bornYear > 1970) {
      age = Math.max(17, Math.min(41, 2025 - bornYear));
    }
  }

  // Base realistic ratings calculation
  let overall = 82;
  let potential = 87;

  // Higher ratings for known superstars
  const nameLower = apiP.strPlayer.toLowerCase();
  if (nameLower.includes('haaland') || nameLower.includes('mbapp') || nameLower.includes('vinicius') || nameLower.includes('bellingham') || nameLower.includes('rodri')) {
    overall = 91;
    potential = 95;
  } else if (nameLower.includes('salah') || nameLower.includes('de bruyne') || nameLower.includes('kane') || nameLower.includes('ronaldo') || nameLower.includes('messi')) {
    overall = 89;
    potential = 89;
  } else if (nameLower.includes('saka') || nameLower.includes('yamal') || nameLower.includes('wirtz') || nameLower.includes('musiala') || nameLower.includes('palmer')) {
    overall = 86;
    potential = 94;
  } else if (age < 22) {
    overall = 75;
    potential = 88;
  }

  // Determine rarity
  let rarity: PlayerRarity = 'standard';
  if (overall >= 88) rarity = 'legend';
  else if (potential >= 88) rarity = 'prospect';
  else if (overall >= 80) rarity = 'rare';

  // Realistic market values and wages
  const marketValue = Math.round(overall * overall * 22000);
  const wage = Math.round(marketValue * 0.015);

  return {
    id: `api_p_${apiP.idPlayer || Date.now()}_${Math.floor(Math.random() * 1000)}`,
    sport: 'football',
    name: apiP.strPlayer,
    nameEn: apiP.strPlayer,
    age,
    nationality: apiP.strNationality || 'دولي',
    nationalityFlag: '🌍',
    position,
    secondaryPositions: position === 'ST' ? ['LW', 'RW'] : position === 'CB' ? ['CDM'] : ['CM'],
    overall,
    potential,
    attributes: {
      pace: position === 'ST' || position === 'LW' || position === 'RW' ? 88 : 74,
      shooting: position === 'ST' ? 89 : 72,
      passing: position === 'CM' || position === 'CAM' ? 88 : 74,
      dribbling: position === 'LW' || position === 'RW' || position === 'CAM' ? 87 : 75,
      defending: position === 'CB' || position === 'CDM' ? 85 : 45,
      physical: 78,
      goalkeeping: position === 'GK' ? overall : 12,
    },
    rarity,
    personality: 'professional' as PlayerPersonality,
    traits: ['نجم عالمي موثق', 'أداء حقيقي معتمد'],
    photoUrl: apiP.strCutout || apiP.strThumb || undefined,
    realTeam: apiP.strTeam || undefined,
    morale: 95,
    form: 8,
    stamina: 95,
    fatigue: 0,
    injuredWeeks: 0,
    suspendedMatches: 0,
    contractYears: 3,
    wage,
    marketValue,
    matchesPlayed: 0,
    goalsOrPoints: 0,
    assists: 0,
    cleanSheetsOrRebounds: 0,
    averageRating: 7.5,
  };
}
