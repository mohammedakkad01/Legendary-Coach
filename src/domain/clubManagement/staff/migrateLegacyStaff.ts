/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ClubStaff } from '../../../types/game';
import type { ScoutStaff } from '../../recruitment/scouts/scoutTypes';
import { STAFF_TUNING } from '../config/clubManagementTuning';
import type { StaffAttributes, StaffCategory, StaffMember } from '../types';
import { clamp } from '../../shared/math';

function levelToAttr(level: number): number {
  return clamp(
    Math.round(STAFF_TUNING.levelToAttributeBase + level * STAFF_TUNING.levelToAttributeStep),
    1,
    99,
  );
}

function defaultAttributes(attr: number): StaffAttributes {
  return {
    tacticalKnowledge: attr,
    manManagement: attr,
    youthDevelopment: attr,
    judgingAbility: attr,
    injuryPrevention: attr,
    diagnosisAccuracy: attr,
    setPieceCoaching: attr,
    fitnessCoaching: attr,
    scoutingRange: attr,
  };
}

function memberFromLegacy(
  id: string,
  name: string,
  category: StaffCategory,
  level: number,
  weeklyWage: number,
  scoutLink?: string,
): StaffMember {
  const attr = levelToAttr(level);
  return {
    id,
    name,
    category,
    attributes: defaultAttributes(attr),
    reputation: clamp(40 + level * 6, 1, 99),
    weeklyWage,
    contractWeeksRemaining: STAFF_TUNING.defaultContractWeeks,
    linkedScoutId: scoutLink,
  };
}

const NEUTRAL_ATTR = STAFF_TUNING.defaultNeutralAttribute;

function neutralMember(id: string, name: string, category: StaffCategory, wage: number): StaffMember {
  return memberFromLegacy(id, name, category, 2, wage);
}

/** Map legacy ClubStaff + optional scout network into Phase E staff roster. */
export function staffFromLegacyClub(
  clubId: string,
  legacy: ClubStaff,
  scouts: readonly ScoutStaff[],
): StaffMember[] {
  const members: StaffMember[] = [
    memberFromLegacy(
      `${clubId}_staff_assistant`,
      legacy.assistantCoach.name,
      'assistant_manager',
      legacy.assistantCoach.level,
      legacy.assistantCoach.salary,
    ),
    memberFromLegacy(
      `${clubId}_staff_head`,
      legacy.assistantCoach.name,
      'head_coach',
      legacy.assistantCoach.level,
      legacy.assistantCoach.salary,
    ),
    memberFromLegacy(
      `${clubId}_staff_fitness`,
      legacy.fitnessCoach.name,
      'fitness_coach',
      legacy.fitnessCoach.level,
      legacy.fitnessCoach.salary,
    ),
    memberFromLegacy(
      `${clubId}_staff_physio`,
      legacy.physio.name,
      'physio',
      legacy.physio.level,
      legacy.physio.salary,
    ),
    memberFromLegacy(
      `${clubId}_staff_youth`,
      legacy.youthDirector.name,
      'youth_director',
      legacy.youthDirector.level,
      legacy.youthDirector.salary,
    ),
  ];

  if (scouts.length > 0) {
    for (const scout of scouts) {
      members.push({
        id: `${clubId}_staff_${scout.id}`,
        name: scout.name,
        category: 'scout',
        attributes: {
          tacticalKnowledge: NEUTRAL_ATTR,
          manManagement: NEUTRAL_ATTR,
          youthDevelopment: scout.potentialEvaluation,
          judgingAbility: scout.judgingAbility,
          injuryPrevention: NEUTRAL_ATTR,
          diagnosisAccuracy: NEUTRAL_ATTR,
          setPieceCoaching: NEUTRAL_ATTR,
          fitnessCoaching: NEUTRAL_ATTR,
          scoutingRange: scout.leagueKnowledge,
        },
        reputation: clamp(scout.reliability, 1, 99),
        weeklyWage: 1800,
        contractWeeksRemaining: STAFF_TUNING.defaultContractWeeks,
        linkedScoutId: scout.id,
      });
    }
  } else {
    members.push(
      memberFromLegacy(
        `${clubId}_staff_scout`,
        legacy.chiefScout.name,
        'scout',
        legacy.chiefScout.level,
        legacy.chiefScout.salary,
      ),
    );
  }

  members.push(
    neutralMember(`${clubId}_staff_medical`, 'Medical Team', 'medical_staff', 1500),
    neutralMember(`${clubId}_staff_analyst`, 'Recruitment Analyst', 'recruitment_analyst', 1600),
    neutralMember(`${clubId}_staff_gk`, 'GK Coach', 'goalkeeping_coach', 1400),
    neutralMember(`${clubId}_staff_scientist`, 'Sports Scientist', 'sports_scientist', 1500),
    neutralMember(`${clubId}_staff_dof`, 'Director of Football', 'director_of_football', 2200),
  );

  return members;
}

export function averageStaffReputation(members: readonly StaffMember[]): number {
  if (members.length === 0) return 50;
  return Math.round(members.reduce((s, m) => s + m.reputation, 0) / members.length);
}
