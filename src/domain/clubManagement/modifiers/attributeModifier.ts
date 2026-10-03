/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { ATTRIBUTE_MODIFIER, STAFF_TUNING } from '../config/clubManagementTuning';
import type { StaffAttributes, StaffCategory, StaffMember } from '../types';
import type { ClubFacilitiesExtended, ClubSystemModifiers } from '../types';
import { FACILITY_TUNING } from '../config/clubManagementTuning';

export function attributeToModifier(
  attribute: number,
  range: { min: number; max: number },
): number {
  const attr = clamp(attribute, 1, 99);
  const raw = 1 + (attr - STAFF_TUNING.defaultNeutralAttribute) * ATTRIBUTE_MODIFIER.slopePerPoint;
  const t = (attr - 1) / 98;
  const linear = range.min + (range.max - range.min) * t;
  const blended = raw * 0.35 + linear * 0.65;
  return clamp(blended, range.min, range.max);
}

function weightedStaffModifier(
  members: readonly StaffMember[],
  weights: Partial<Record<StaffCategory, number>>,
  rangeKey: keyof typeof STAFF_TUNING.modifierRanges,
  pickAttr: (a: StaffAttributes) => number,
): number {
  const range = STAFF_TUNING.modifierRanges[rangeKey];
  let sumW = 0;
  let sum = 0;
  for (const m of members) {
    const w = weights[m.category];
    if (!w) continue;
    sumW += w;
    sum += attributeToModifier(pickAttr(m.attributes), range) * w;
  }
  if (sumW <= 0) return 1;
  return clamp(sum / sumW, range.min, range.max);
}

export function computeClubSystemModifiers(input: {
  staff: readonly StaffMember[];
  facilities: ClubFacilitiesExtended;
  fanMood: number;
  scoutingNetworkLevel: number;
}): ClubSystemModifiers {
  const { staff, facilities, fanMood, scoutingNetworkLevel } = input;
  const w = STAFF_TUNING.categoryWeights;

  const trainingEffectiveness = weightedStaffModifier(
    staff,
    w.trainingEffectiveness,
    'trainingEffectiveness',
    (a) => (a.tacticalKnowledge + a.manManagement + a.fitnessCoaching) / 3,
  );

  const developmentRate = weightedStaffModifier(
    staff,
    w.developmentRate,
    'developmentRate',
    (a) => (a.youthDevelopment + a.tacticalKnowledge) / 2,
  );

  const injuryStaffRaw = weightedStaffModifier(
    staff,
    w.injuryRisk,
    'injuryRisk',
    (a) => (a.injuryPrevention + a.fitnessCoaching) / 2,
  );
  /** Invert so higher staff quality lowers injury probability (neutral staff → 1.0). */
  const medicalInjuryRiskMult = clamp(2 - injuryStaffRaw, 0.72, 1.28);

  const medicalRecoveryMult = weightedStaffModifier(
    staff,
    w.recoverySpeed,
    'recoverySpeed',
    (a) => (a.injuryPrevention + a.diagnosisAccuracy) / 2,
  );

  const medicalDiagnosisMult = weightedStaffModifier(
    staff,
    w.diagnosisAccuracy,
    'diagnosisAccuracy',
    (a) => a.diagnosisAccuracy,
  );

  const scoutReportQualityMult = weightedStaffModifier(
    staff,
    w.scoutReportQuality,
    'scoutReportQuality',
    (a) => (a.judgingAbility + a.scoutingRange) / 2,
  );

  const academyStaffMult = weightedStaffModifier(
    staff,
    w.academyCoaching,
    'academyCoaching',
    (a) => (a.youthDevelopment + a.tacticalKnowledge) / 2,
  );
  const academyCoachingQuality = clamp(
    Math.round(50 * academyStaffMult + (facilities.trainingGroundLevel - 1) * 5),
    0,
    100,
  );
  const academyRecruitmentInvestment = clamp(
    Math.round(
      scoutingNetworkLevel * 10 * scoutReportQualityMult +
        facilities.scoutingNetworkLevel * 2,
    ),
    0,
    100,
  );

  const analyticsLevel = facilities.analyticsDepartmentLevel;
  const analyticsRange = FACILITY_TUNING.analyticsOppositionMult;
  const oppositionAnalysisMult = clamp(
    1 +
      (analyticsLevel - 1) * analyticsRange.perLevel +
      (weightedStaffModifier(
        staff,
        w.oppositionAnalysis,
        'oppositionAnalysis',
        (a) => a.tacticalKnowledge,
      ) -
        1) *
        0.5,
    analyticsRange.min,
    analyticsRange.max,
  );

  const setPieceQualityMult = weightedStaffModifier(
    staff,
    w.setPieceQuality,
    'setPieceQuality',
    (a) => (a.setPieceCoaching + a.tacticalKnowledge) / 2,
  );

  const st = FACILITY_TUNING.stadium;
  const level = clamp(facilities.stadiumLevel, 1, 10);
  const gateCapacity = Math.round(st.baseGateCapacity + (level - 1) * st.capacityPerLevel);
  const levelMult = clamp(
    1 + (level - 1) * st.levelAttendanceStep,
    st.attendanceMultMin,
    st.attendanceMultMax,
  );
  const moodFactor = clamp(0.85 + fanMood / 300, 0.75, 1.15);
  const stadiumAttendanceMult = clamp(levelMult * moodFactor, st.attendanceMultMin, st.attendanceMultMax);

  return {
    trainingEffectiveness,
    developmentRate,
    medicalInjuryRiskMult,
    medicalRecoveryMult,
    medicalDiagnosisMult,
    scoutReportQualityMult,
    academyCoachingQuality,
    academyRecruitmentInvestment,
    oppositionAnalysisMult,
    setPieceQualityMult,
    gateCapacity,
    stadiumAttendanceMult,
  };
}
