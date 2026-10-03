/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ClubFacilitiesView — Master Club Operations, Governance & Facilities Hub (Phase E).
 * Unifies Board Governance, Financial Ledger, Staff Roster, Delegation, and Infrastructure.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useGameStore } from '../state/useGameStore';
import { ClubManagementHeader, ClubManagementTab } from './club/ClubManagementHeader';
import { BoardOverviewPanel } from './club/BoardOverviewPanel';
import { FinancesLedgerPanel } from './club/FinancesLedgerPanel';
import { StaffManagementPanel } from './club/StaffManagementPanel';
import { DelegationPanel } from './club/DelegationPanel';
import { FacilitiesAndModifiersPanel } from './club/FacilitiesAndModifiersPanel';

export const ClubFacilitiesView: React.FC = () => {
  const {
    club,
    clubManagement,
    upgradeFacility,
    skipFacilityUpgrade,
    pendingFacilityUpgrades,
    vipPoints,
    language,
    hireStaffMember,
    fireStaffMember,
    updateDelegationTask,
    submitBoardRequest,
    upgradeAnalyticsDepartment,
    matchHistory,
  } = useGameStore();

  const isAr = language === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<ClubManagementTab>('overview');
  const [, forceTick] = useState(0);

  // Periodic tick for facility construction timers
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute total weekly wages from the football squad
  const squadWeeklyWages = useMemo(() => {
    return (club.footballSquad || []).reduce((acc, p) => acc + (p.wage || 0), 0);
  }, [club.footballSquad]);

  // Current game week
  const gameWeek = useMemo(() => {
    return Math.max(1, (matchHistory || []).length + 1);
  }, [matchHistory]);

  if (!clubManagement) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6" id="club_facilities_view">
      
      {/* Top Header & Sub-Tab Navigation */}
      <ClubManagementHeader
        isAr={isAr}
        clubName={club.name}
        divisionName={club.divisionName}
        activeSubTab={activeSubTab}
        onTabChange={setActiveSubTab}
        cm={clubManagement}
      />

      {/* Render Active Sub-Tab View */}
      {activeSubTab === 'overview' && (
        <BoardOverviewPanel
          isAr={isAr}
          cm={clubManagement}
          onSubmitBoardRequest={submitBoardRequest}
        />
      )}

      {activeSubTab === 'finances' && (
        <FinancesLedgerPanel
          isAr={isAr}
          finance={clubManagement.finance}
          squadWeeklyWages={squadWeeklyWages}
        />
      )}

      {activeSubTab === 'staff' && (
        <StaffManagementPanel
          isAr={isAr}
          clubId={club.id}
          gameWeek={gameWeek}
          staff={clubManagement.staff}
          onHireStaff={hireStaffMember}
          onFireStaff={fireStaffMember}
        />
      )}

      {activeSubTab === 'delegation' && (
        <DelegationPanel
          isAr={isAr}
          delegation={clubManagement.delegation}
          staffMembers={clubManagement.staff.members}
          onUpdateDelegation={updateDelegationTask}
        />
      )}

      {activeSubTab === 'facilities' && (
        <FacilitiesAndModifiersPanel
          isAr={isAr}
          facilities={club.facilities}
          analyticsDepartmentLevel={clubManagement.facilities.analyticsDepartmentLevel}
          coins={clubManagement.finance.coins}
          diamonds={club.finances.diamonds || 0}
          vipPoints={vipPoints}
          pendingUpgrades={pendingFacilityUpgrades}
          staffMembers={clubManagement.staff.members}
          fanMood={clubManagement.fans.mood}
          onUpgradeFacility={(key) => { upgradeFacility(key); }}
          onSkipUpgrade={(key) => { skipFacilityUpgrade(key); }}
          onUpgradeAnalytics={upgradeAnalyticsDepartment}
        />
      )}

    </div>
  );
};
