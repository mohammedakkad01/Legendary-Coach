/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Living World entity resolution and formatting helpers (UI layer only).
 * Resolves referenced subjectIds to real in-memory clubs, players, or matches.
 */

import type { Club, Player, MatchRecord } from '../../../types/game';
import type { HistoryConfidence } from '../../../domain/livingWorld/phaseF/types';

export interface ResolvedEntity {
  id: string;
  kind: 'player' | 'club' | 'match' | 'unknown';
  title: string;
  subtitle?: string;
  extra?: string;
  icon?: string;
}

export function resolveSubjectEntity(
  id: string,
  club: Club,
  standings: { clubId: string; clubName: string }[],
  matchHistory: MatchRecord[],
  isAr: boolean
): ResolvedEntity {
  // Check if player in club squad
  const player = (club.footballSquad || []).find((p: Player) => p.id === id);
  if (player) {
    return {
      id: player.id,
      kind: 'player',
      title: isAr ? player.name : player.nameEn,
      subtitle: `${player.position} • ${isAr ? 'التقييم' : 'OVR'} ${player.overall} • ${isAr ? 'العمر' : 'Age'} ${player.age}`,
      extra: `${isAr ? 'الراتب' : 'Wage'}: ${(player.wage || 0).toLocaleString()} 💰`,
      icon: '👤',
    };
  }

  // Check if current club
  if (club.id === id) {
    return {
      id: club.id,
      kind: 'club',
      title: isAr ? club.name : club.nameEn,
      subtitle: club.divisionName || (isAr ? 'الدوري الممتاز' : 'Premier Division'),
      extra: `${isAr ? 'البطولات' : 'Trophies'}: ${club.trophies || 0} 🏆`,
      icon: '🛡️',
    };
  }

  // Check if competitor club in standings
  const comp = standings.find((s) => s.clubId === id);
  if (comp) {
    return {
      id: comp.clubId,
      kind: 'club',
      title: comp.clubName,
      subtitle: isAr ? 'نادٍ منافس في الدوري' : 'League Competitor',
      icon: '⚽',
    };
  }

  // Check if match
  const match = matchHistory.find((m) => m.id === id);
  if (match) {
    const isUserHome = match.homeClubId === club.id;
    const scoreline = `${match.homeScore} - ${match.awayScore}`;
    return {
      id: match.id,
      kind: 'match',
      title: `${match.homeClubName} vs ${match.awayClubName}`,
      subtitle: `${isAr ? 'النتيجة' : 'Score'}: ${scoreline} (${match.competition})`,
      extra: isUserHome
        ? (match.homeScore > match.awayScore ? (isAr ? 'فوز مستحق' : 'Victory') : (isAr ? 'هزيمة' : 'Defeat'))
        : (match.awayScore > match.homeScore ? (isAr ? 'فوز مستحق' : 'Victory') : (isAr ? 'هزيمة' : 'Defeat')),
      icon: '📅',
    };
  }

  // Fallback
  return {
    id,
    kind: 'unknown',
    title: id,
    subtitle: isAr ? 'معرف غير محدد' : 'Reference Entity',
    icon: '📌',
  };
}

export function confidenceBadge(conf: HistoryConfidence, isAr: boolean): { text: string; className: string } {
  switch (conf) {
    case 'full':
      return {
        text: isAr ? 'سجل مكتمل' : 'Full Record',
        className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
    case 'partial':
      return {
        text: isAr ? 'سجل جزئي' : 'Partial Record',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'limited':
    default:
      return {
        text: isAr ? 'تقديري / تاريخي' : 'Inferred / Limited',
        className: 'bg-slate-700/50 text-slate-300 border-slate-600',
      };
  }
}
