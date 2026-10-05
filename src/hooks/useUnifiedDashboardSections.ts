/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Memoized unified dashboard section models (read-only store snapshots).
 */

import { useMemo } from 'react';
import { useGameStore, type GameTab } from '../state/useGameStore';
import { useDashboardData } from './useDashboardData';
import { useNextMatchSummary } from './useNextMatchSummary';
import { useAssistantRecommendations } from './useAssistantRecommendations';
import { renderNewsItem } from '../domain/livingWorld/news/renderTemplates';

export type UnifiedDashboardSectionId =
  | 'readiness'
  | 'next_match'
  | 'ai_recommendations'
  | 'injuries'
  | 'morale'
  | 'training'
  | 'transfers'
  | 'scouting'
  | 'board'
  | 'fans'
  | 'finance'
  | 'news';

export interface UnifiedSectionSummaryLine {
  id: string;
  textEn: string;
  textAr: string;
  subtextEn?: string;
  subtextAr?: string;
  navigateTab?: GameTab;
}

export interface UnifiedDashboardSectionModel {
  id: UnifiedDashboardSectionId;
  titleEn: string;
  titleAr: string;
  hasAttention: boolean;
  defaultExpanded: boolean;
  lines: UnifiedSectionSummaryLine[];
  hidden?: boolean;
}

const BASE_ORDER: UnifiedDashboardSectionId[] = [
  'readiness',
  'next_match',
  'ai_recommendations',
  'injuries',
  'morale',
  'training',
  'transfers',
  'scouting',
  'board',
  'fans',
  'finance',
  'news',
];

function bumpAttentionSections(order: UnifiedDashboardSectionId[], flags: Record<string, boolean>) {
  const attention = order.filter((id) => flags[id]);
  const rest = order.filter((id) => !flags[id]);
  return [...attention, ...rest];
}

export function useUnifiedDashboardSections(): {
  isAr: boolean;
  sections: UnifiedDashboardSectionModel[];
  clubManagementReady: boolean;
} {
  const { club, livingWorld, clubManagement, recruitmentWorld, activeNegotiations } = useGameStore();

  const { avgFatigue, totalDaily, completedDaily } = useDashboardData();
  const match = useNextMatchSummary();
  const { dashboardTop } = useAssistantRecommendations();
  const isAr = match.isAr;

  const injuredPlayers = useMemo(() => {
    const squad = club.footballSquad ?? [];
    return squad
      .filter((p) => (p.injuredWeeks ?? 0) > 0)
      .sort((a, b) => (b.injuredWeeks ?? 0) - (a.injuredWeeks ?? 0));
  }, [club.footballSquad]);

  const dressingRoom = livingWorld?.dressingRoom;
  const pendingInteractions = livingWorld?.pendingInteractions ?? [];

  const activeScouting = useMemo(
    () => recruitmentWorld.scoutingAssignments.filter((a) => a.status === 'active'),
    [recruitmentWorld.scoutingAssignments],
  );

  const newsTop = useMemo(() => {
    const feed = livingWorld?.phaseF?.newsFeed ?? [];
    return [...feed].sort((a, b) => b.importance - a.importance).slice(0, 3);
  }, [livingWorld?.phaseF?.newsFeed]);

  const sections = useMemo((): UnifiedDashboardSectionModel[] => {
    const cm = clubManagement;
    const board = cm?.board;
    const fans = cm?.fans;

    const readinessLines: UnifiedSectionSummaryLine[] = [
      {
        id: 'fatigue',
        textEn: `Squad fatigue average: ${avgFatigue}%`,
        textAr: `متوسط إجهاد التشكيلة: ${avgFatigue}%`,
        navigateTab: 'squad',
      },
      {
        id: 'daily',
        textEn: `Daily missions: ${completedDaily}/${totalDaily} complete`,
        textAr: `المهام اليومية: ${completedDaily}/${totalDaily} مكتملة`,
        navigateTab: 'squad',
      },
    ];

    const nextMatchLines: UnifiedSectionSummaryLine[] = [];
    if (match.seasonFinished) {
      nextMatchLines.push({
        id: 'season_done',
        textEn: 'Season complete — review finale options',
        textAr: 'انتهى الموسم — راجع خيارات الختام',
        navigateTab: 'match',
      });
    } else if (!match.nextFixture) {
      nextMatchLines.push({
        id: 'no_fixture',
        textEn: 'Select a club to see your next fixture',
        textAr: 'اختر نادياً لعرض مباراتك القادمة',
        navigateTab: 'match',
      });
    } else {
      nextMatchLines.push({
        id: 'fixture',
        textEn: `MD${match.nextFixture.matchday}: vs ${match.nextFixture.opponentClubName} (${match.nextFixture.isHome ? 'Home' : 'Away'})`,
        textAr: `ج${match.nextFixture.matchday}: ضد ${match.nextFixture.opponentClubName} (${match.nextFixture.isHome ? 'على أرضك' : 'خارج الأرض'})`,
        navigateTab: 'match',
      });
      if (match.rank) {
        nextMatchLines.push({
          id: 'rank',
          textEn: `League position: ${match.rank.pos}/${match.rank.total}`,
          textAr: `الترتيب: ${match.rank.pos} من ${match.rank.total}`,
          navigateTab: 'league',
        });
      }
      if (match.insight?.isScouted) {
        nextMatchLines.push({
          id: 'odds',
          textEn: `Scouted win chance: ${match.insight.winProbability}% · xG ${match.insight.expectedUserGoals}-${match.insight.expectedOpponentGoals}`,
          textAr: `احتمال الفوز: ${match.insight.winProbability}% · xG ${match.insight.expectedUserGoals}-${match.insight.expectedOpponentGoals}`,
          navigateTab: 'match',
        });
      } else if (match.isLoadingMatch || !match.insight) {
        nextMatchLines.push({
          id: 'loading',
          textEn: 'Loading match preview…',
          textAr: 'جاري تحميل معاينة المباراة…',
          navigateTab: 'match',
        });
      } else {
        nextMatchLines.push({
          id: 'scout',
          textEn: 'Scouting report locked — unlock on match screen',
          textAr: 'تقرير الكشافة مغلق — افتح شاشة المباراة',
          navigateTab: 'match',
        });
      }
    }

    const aiLines: UnifiedSectionSummaryLine[] = dashboardTop.map((rec) => ({
      id: rec.id,
      textEn: rec.titleEn,
      textAr: rec.titleAr,
      subtextEn: `${rec.confidence}% confidence`,
      subtextAr: `ثقة ${rec.confidence}%`,
      navigateTab: 'tactics',
    }));

    const injuryLines: UnifiedSectionSummaryLine[] =
      injuredPlayers.length === 0
        ? [
            {
              id: 'none',
              textEn: 'No injured players in the squad',
              textAr: 'لا يوجد لاعبون مصابون',
              navigateTab: 'squad',
            },
          ]
        : injuredPlayers.slice(0, 3).map((p) => ({
            id: p.id,
            textEn: `${p.nameEn}: out ${p.injuredWeeks} week(s)`,
            textAr: `${p.name}: غياب ${p.injuredWeeks} أسبوع`,
            navigateTab: 'squad' as GameTab,
          }));

    const moraleLines: UnifiedSectionSummaryLine[] = [];
    if (dressingRoom) {
      moraleLines.push({
        id: 'cohesion',
        textEn: `Dressing room cohesion: ${Math.round(dressingRoom.cohesion)}`,
        textAr: `انسجام غرفة الملابس: ${Math.round(dressingRoom.cohesion)}`,
        navigateTab: 'squad',
      });
    }
    if ((dressingRoom?.activeConflictPlayerIds.length ?? 0) > 0) {
      moraleLines.push({
        id: 'conflicts',
        textEn: `${dressingRoom!.activeConflictPlayerIds.length} active squad conflict(s)`,
        textAr: `${dressingRoom!.activeConflictPlayerIds.length} خلاف نشط في الفريق`,
        navigateTab: 'squad',
      });
    }
    if (pendingInteractions.length > 0) {
      moraleLines.push({
        id: 'interactions',
        textEn: `${pendingInteractions.length} player conversation(s) waiting`,
        textAr: `${pendingInteractions.length} محادثة لاعب بانتظارك`,
        navigateTab: 'squad',
      });
    }
    if (moraleLines.length === 0) {
      moraleLines.push({
        id: 'stable',
        textEn: 'Squad mood stable — open squad hub for details',
        textAr: 'معنويات مستقرة — افتح التشكيلة للتفاصيل',
        navigateTab: 'squad',
      });
    }

    const trainingLines: UnifiedSectionSummaryLine[] = [
      {
        id: 'tp',
        textEn: `${club.finances.trainingPoints} training points available`,
        textAr: `${club.finances.trainingPoints} نقطة تدريب متاحة`,
        navigateTab: 'training',
      },
    ];
    if (pendingInteractions.length > 0) {
      trainingLines.push({
        id: 'life',
        textEn: `${pendingInteractions.length} off-pitch interaction(s) pending`,
        textAr: `${pendingInteractions.length} تفاعل خارج الملعب معلّق`,
        navigateTab: 'training',
      });
    }

    const transferLines: UnifiedSectionSummaryLine[] =
      activeNegotiations.length === 0
        ? [
            {
              id: 'none',
              textEn: 'No active transfer negotiations',
              textAr: 'لا مفاوضات انتقال نشطة',
              navigateTab: 'transfers',
            },
          ]
        : activeNegotiations.slice(0, 3).map((n) => ({
            id: n.id,
            textEn: `${n.playerName}: ${n.status}`,
            textAr: `${n.playerName}: ${n.status}`,
            navigateTab: 'transfers' as GameTab,
          }));

    const scoutingLines: UnifiedSectionSummaryLine[] =
      activeScouting.length === 0
        ? [
            {
              id: 'idle',
              textEn: 'No active scouting assignments',
              textAr: 'لا مهام كشافة نشطة',
              navigateTab: 'transfers',
            },
          ]
        : activeScouting.slice(0, 3).map((a) => ({
            id: a.id,
            textEn: `Scouting assignment (${a.status})`,
            textAr: `مهمة كشافة (${a.status})`,
            subtextEn: `Reports ${a.reportsCompleted} · week ${a.createdWeek}`,
            subtextAr: `تقارير ${a.reportsCompleted} · أسبوع ${a.createdWeek}`,
            navigateTab: 'transfers' as GameTab,
          }));

    const boardLines: UnifiedSectionSummaryLine[] = board
      ? [
          {
            id: 'trust',
            textEn: `Board trust ${Math.round(board.trust)} · patience ${Math.round(board.patience)}`,
            textAr: `ثقة الإدارة ${Math.round(board.trust)} · صبر ${Math.round(board.patience)}`,
            navigateTab: 'club',
          },
          {
            id: 'consequence',
            textEn: `Board status: ${board.consequenceLevel.replace(/_/g, ' ')}`,
            textAr: `حالة الإدارة: ${board.consequenceLevel}`,
            navigateTab: 'club',
          },
        ]
      : [
          {
            id: 'unavailable',
            textEn: 'Club management data loading…',
            textAr: 'بيانات إدارة النادي قيد التحميل…',
            navigateTab: 'club',
          },
        ];

    const fanLines: UnifiedSectionSummaryLine[] = fans
      ? [
          {
            id: 'mood',
            textEn: `Fan mood ${Math.round(fans.mood)} · trust ${Math.round(fans.trust)}`,
            textAr: `مزاج الجماهير ${Math.round(fans.mood)} · ثقة ${Math.round(fans.trust)}`,
            navigateTab: 'club',
          },
        ]
      : boardLines;

    const financeLines: UnifiedSectionSummaryLine[] = [
      {
        id: 'coins',
        textEn: `Balance: ${club.finances.coins.toLocaleString()} coins · ${club.finances.diamonds ?? 0} gems`,
        textAr: `الرصيد: ${club.finances.coins.toLocaleString()} عملة · ${club.finances.diamonds ?? 0} جوهرة`,
        navigateTab: 'club',
      },
    ];

    const newsLines: UnifiedSectionSummaryLine[] =
      newsTop.length === 0
        ? [
            {
              id: 'empty',
              textEn: 'News feed fills as your season story unfolds',
              textAr: 'يتعبأ شريط الأخبار مع تقدم الموسم',
              navigateTab: 'living_world',
            },
          ]
        : newsTop.map((item) => {
            const en = renderNewsItem(item, 'en').headline;
            const ar = renderNewsItem(item, 'ar').headline;
            return {
              id: item.id,
              textEn: en,
              textAr: ar,
              navigateTab: 'living_world' as GameTab,
            };
          });

    const models: UnifiedDashboardSectionModel[] = [
      {
        id: 'readiness',
        titleEn: 'Squad readiness',
        titleAr: 'جاهزية التشكيلة',
        hasAttention: injuredPlayers.length > 0,
        defaultExpanded: false,
        lines: readinessLines.slice(0, 3),
      },
      {
        id: 'next_match',
        titleEn: 'Next match',
        titleAr: 'المباراة القادمة',
        hasAttention: Boolean(match.nextFixture && !match.seasonFinished),
        defaultExpanded: Boolean(match.nextFixture && !match.seasonFinished),
        lines: nextMatchLines.slice(0, 3),
      },
      {
        id: 'ai_recommendations',
        titleEn: 'AI recommendations',
        titleAr: 'توصيات المساعد',
        hasAttention: dashboardTop.length > 0,
        defaultExpanded: dashboardTop.length > 0,
        lines: aiLines.slice(0, 3),
        hidden: dashboardTop.length === 0,
      },
      {
        id: 'injuries',
        titleEn: 'Injuries',
        titleAr: 'الإصابات',
        hasAttention: injuredPlayers.length > 0,
        defaultExpanded: injuredPlayers.length > 0,
        lines: injuryLines,
      },
      {
        id: 'morale',
        titleEn: 'Morale & dressing room',
        titleAr: 'المعنويات وغرفة الملابس',
        hasAttention:
          (dressingRoom?.activeConflictPlayerIds.length ?? 0) > 0 || pendingInteractions.length > 0,
        defaultExpanded:
          (dressingRoom?.activeConflictPlayerIds.length ?? 0) > 0 || pendingInteractions.length > 0,
        lines: moraleLines.slice(0, 3),
      },
      {
        id: 'training',
        titleEn: 'Training',
        titleAr: 'التدريب',
        hasAttention: pendingInteractions.length > 0,
        defaultExpanded: false,
        lines: trainingLines.slice(0, 3),
      },
      {
        id: 'transfers',
        titleEn: 'Transfers',
        titleAr: 'الانتقالات',
        hasAttention: activeNegotiations.length > 0,
        defaultExpanded: activeNegotiations.length > 0,
        lines: transferLines,
      },
      {
        id: 'scouting',
        titleEn: 'Scouting',
        titleAr: 'الكشافة',
        hasAttention: activeScouting.length > 0,
        defaultExpanded: activeScouting.length > 0,
        lines: scoutingLines,
      },
      {
        id: 'board',
        titleEn: 'Board',
        titleAr: 'مجلس الإدارة',
        hasAttention: board != null && board.consequenceLevel !== 'none',
        defaultExpanded: board != null && board.consequenceLevel !== 'none',
        lines: boardLines.slice(0, 3),
      },
      {
        id: 'fans',
        titleEn: 'Fans',
        titleAr: 'الجماهير',
        hasAttention: false,
        defaultExpanded: false,
        lines: fanLines.slice(0, 3),
      },
      {
        id: 'finance',
        titleEn: 'Finance',
        titleAr: 'المالية',
        hasAttention: false,
        defaultExpanded: false,
        lines: financeLines,
      },
      {
        id: 'news',
        titleEn: 'News',
        titleAr: 'الأخبار',
        hasAttention: false,
        defaultExpanded: false,
        lines: newsLines,
      },
    ];

    const attentionFlags = Object.fromEntries(models.map((m) => [m.id, m.hasAttention])) as Record<
      string,
      boolean
    >;

    const orderedIds = bumpAttentionSections(BASE_ORDER, attentionFlags);
    const byId = new Map(models.map((m) => [m.id, m]));
    return orderedIds.map((id) => byId.get(id)!).filter((m) => !m.hidden);
  }, [
    clubManagement,
    club.finances,
    avgFatigue,
    totalDaily,
    completedDaily,
    match,
    dashboardTop,
    injuredPlayers,
    dressingRoom,
    pendingInteractions,
    activeNegotiations,
    activeScouting,
    newsTop,
  ]);

  return {
    isAr,
    sections,
    clubManagementReady: clubManagement != null,
  };
}
