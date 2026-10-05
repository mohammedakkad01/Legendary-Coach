/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useCallback } from 'react';
import { useGameStore, type GameTab } from '../../../state/useGameStore';
import {
  useUnifiedDashboardSections,
  type UnifiedDashboardSectionModel,
} from '../../../hooks/useUnifiedDashboardSections';
import { CollapsibleDashboardSection } from '../../ui/CollapsibleDashboardSection';
import { DashboardSummaryLine } from '../../ui/DashboardSummaryLine';
import { DashboardReadinessTrio } from '../DashboardReadinessTrio';
import { DashboardAiRecommendationsWidget } from '../DashboardAiRecommendationsWidget';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { useFeedback } from '../../../context/FeedbackContext';
import { EmptyState } from '../../ui/EmptyState';
import { LayoutDashboard } from 'lucide-react';

const SectionBlock: React.FC<{
  section: UnifiedDashboardSectionModel;
  isAr: boolean;
  onNavigate: (tab: GameTab) => void;
  expandedSlot?: React.ReactNode;
}> = memo(function SectionBlock({ section, isAr, onNavigate, expandedSlot }) {
  const summary = section.lines.map((line) => (
    <DashboardSummaryLine
      key={line.id}
      isAr={isAr}
      text={isAr ? line.textAr : line.textEn}
      subtext={
        line.subtextEn || line.subtextAr
          ? isAr
            ? line.subtextAr ?? line.subtextEn
            : line.subtextEn ?? line.subtextAr
          : undefined
      }
      onActivate={line.navigateTab ? () => onNavigate(line.navigateTab!) : undefined}
      activateLabel={line.navigateTab ? `Open ${section.titleEn}` : undefined}
      activateLabelAr={line.navigateTab ? `فتح ${section.titleAr}` : undefined}
    />
  ));

  return (
    <CollapsibleDashboardSection
      isAr={isAr}
      sectionId={section.id}
      titleEn={section.titleEn}
      titleAr={section.titleAr}
      attention={section.hasAttention}
      defaultExpanded={section.defaultExpanded}
      summary={summary}
    >
      {expandedSlot}
    </CollapsibleDashboardSection>
  );
});

export const UnifiedDashboardHub: React.FC = () => {
  const { sections, isAr, clubManagementReady } = useUnifiedDashboardSections();
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const {
    completedDaily,
    totalDaily,
    claimedDaily,
    avgFatigue,
    setDailyMissionsModalOpen,
    startTacticalDuel,
    runSquadRecoverySession,
  } = useDashboardData();
  const { toast } = useFeedback();

  const onNavigate = useCallback(
    (tab: Parameters<typeof setActiveTab>[0]) => {
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  if (!clubManagementReady) {
    return (
      <EmptyState
        isAr={isAr}
        title="Club management data is loading"
        titleAr="جاري تحميل بيانات إدارة النادي"
        description="Open the Club tab once if sections stay empty."
        descriptionAr="افتح تبويب النادي إذا بقيت الأقسام فارغة."
        icon={<LayoutDashboard className="w-8 h-8" />}
      />
    );
  }

  return (
    <div className="space-y-3" id="unified_dashboard_hub">
      <div className="flex items-center gap-2 px-1">
        <LayoutDashboard className="w-5 h-5 text-sky-400" aria-hidden />
        <h2 className="text-sm font-black text-white">
          {isAr ? 'لوحة المدير الموحّدة' : 'Manager hub'}
        </h2>
        <span className="text-[10px] text-slate-500 font-bold">
          {isAr ? 'اضغط القسم للتفاصيل' : 'Tap a section for details'}
        </span>
      </div>

      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          isAr={isAr}
          onNavigate={onNavigate}
          expandedSlot={
            section.id === 'readiness' ? (
              <DashboardReadinessTrio
                isAr={isAr}
                completedDaily={completedDaily}
                totalDaily={totalDaily}
                claimedDaily={claimedDaily}
                avgFatigue={avgFatigue}
                onStartDuel={() => startTacticalDuel('tactical')}
                onOpenMissions={() => setDailyMissionsModalOpen(true)}
                onSquadRecovery={() => {
                  const res = runSquadRecoverySession();
                  if (res.success) {
                    toast.success(res.message, isAr ? 'جلسة الاستشفاء' : 'Squad Recovery');
                  } else {
                    toast.error(res.message, isAr ? 'تعذر الاستشفاء' : 'Recovery Failed');
                  }
                }}
              />
            ) : section.id === 'ai_recommendations' ? (
              <DashboardAiRecommendationsWidget
                isAr={isAr}
                onOpenTactics={() => setActiveTab('tactics')}
              />
            ) : undefined
          }
        />
      ))}
    </div>
  );
};
