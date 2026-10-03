/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INTERNAL generation helpers — seeded PRNG only.
 */

import { hashStringToSeed } from '../../shared/seed';
import { SeededRandom } from '../../../engine/prng';
import { clamp } from '../../shared/math';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { TrueWorldPlayer } from '../trueProfile/types';
import type { PlayerPosition } from '../../../types/game';
import type { AcademyIntakeClubContext, RecruitmentFocusConfig } from './academyTypes';
import {
  focusGenerationModifiers,
  positionPoolForFocus,
} from './recruitmentFocus';
import { drawAcademyPotentialEstimate } from './potentialEstimate';
import { pickIntakeStoryKind } from './intakeStories';
import type {
  AcademyIntakeProspectView,
  AcademyIntakeStoryKind,
} from './academyTypes';

const FIRST_NAMES = ['خالد', 'ياسر', 'فيصل', 'سلطان', 'ماجد', 'عبدالعزيز', 'تركي', 'نواف', 'بندر', 'راكان'];
const LAST_NAMES = ['الغامدي', 'العتيبي', 'القحطاني', 'الزهراني', 'الشمري', 'الدوسري', 'المطيري', 'الحربي'];
const INTL_FLAGS: Record<string, string> = {
  SA: '🇸🇦',
  MA: '🇲🇦',
  EG: '🇪🇬',
  FR: '🇫🇷',
  BR: '🇧🇷',
};

function academyIntakeRng(
  worldSeed: number,
  gameWeek: number,
  clubId: string,
  slot: number,
): SeededRandom {
  const key = `${worldSeed}|${gameWeek}|${clubId}|academy_intake|${slot}`;
  return new SeededRandom(hashStringToSeed(key));
}

export function computeAcademyIntakeCapacity(ctx: AcademyIntakeClubContext): number {
  const level = clamp(ctx.youthAcademyLevel, 1, 10);
  const base = T.academy.baseProspectsPerIntake;
  const levelBonus = Math.floor((level - 1) * T.academy.prospectsPerAcademyLevel);
  const investBonus =
    ctx.recruitmentInvestment >= T.academy.highInvestmentThreshold
      ? T.academy.highInvestmentProspectBonus
      : 0;
  return clamp(base + levelBonus + investBonus, 1, T.academy.maxProspectsPerIntake);
}

function pickPosition(rng: SeededRandom, pool: readonly PlayerPosition[]): PlayerPosition {
  return pool[rng.nextRange(0, pool.length - 1)]!;
}

function pickNationality(
  rng: SeededRandom,
  homeCode: string,
  localWeight: number,
): { code: string; label: string; flag: string } {
  if (rng.nextChance(localWeight)) {
    return { code: homeCode, label: homeCode === 'SA' ? 'السعودية' : homeCode, flag: INTL_FLAGS[homeCode] ?? '🏳️' };
  }
  const pool = ['MA', 'EG', 'FR', 'BR'].filter((c) => c !== homeCode);
  const code = pool[rng.nextRange(0, pool.length - 1)]!;
  const labels: Record<string, string> = { MA: 'المغرب', EG: 'مصر', FR: 'فرنسا', BR: 'البرازيل' };
  return { code, label: labels[code] ?? code, flag: INTL_FLAGS[code] ?? '🏳️' };
}

export interface GeneratedAcademyProspectInternal {
  truth: TrueWorldPlayer;
  view: AcademyIntakeProspectView;
  storyKind: AcademyIntakeStoryKind;
}

export function generateSingleAcademyProspect(input: {
  worldSeed: number;
  gameWeek: number;
  club: AcademyIntakeClubContext;
  focus: RecruitmentFocusConfig;
  slot: number;
}): GeneratedAcademyProspectInternal {
  const rng = academyIntakeRng(input.worldSeed, input.gameWeek, input.club.clubId, input.slot);
  const mods = focusGenerationModifiers(input.focus);
  const pool = positionPoolForFocus(input.focus);
  const position = pickPosition(rng, pool);

  const level = clamp(input.club.youthAcademyLevel, 1, 10);
  const facilityBonus = (level - 1) * T.academy.potentialPerAcademyLevel;
  const coachingBonus = (input.club.coachingQuality / 100) * T.academy.coachingPotentialBonus;
  const repBonus = (input.club.clubReputation / 100) * T.academy.reputationPotentialBonus;

  const truePotential = clamp(
    Math.round(
      T.academy.basePotential +
        facilityBonus +
        coachingBonus +
        repBonus +
        mods.potentialBonus +
        rng.nextRange(-T.academy.potentialNoise, T.academy.potentialNoise),
    ),
    T.academy.minPotential,
    T.academy.maxPotential,
  );

  const overallGap = T.academy.baseOverallGap + rng.nextRange(0, T.academy.overallGapNoise);
  const trueOverall = clamp(Math.round(truePotential - overallGap), T.academy.minOverall, truePotential);

  const homeCode = input.focus.homeRegionCode ?? input.club.regionCode;
  const nat = pickNationality(rng, homeCode, mods.localNationalityWeight);
  const age = rng.nextRange(T.academy.minAge, T.academy.maxAge);

  const technical = clamp(
    Math.round(trueOverall + mods.technicalBias + rng.nextRange(-4, 4)),
    1,
    99,
  );
  const physical = clamp(
    Math.round(trueOverall + mods.physicalBias + rng.nextRange(-4, 4)),
    1,
    99,
  );
  const mental = clamp(Math.round(trueOverall + mods.creativeBias * 0.4 + rng.nextRange(-3, 3)), 1, 99);

  const { potentialEstimate, potentialEstimateBand } = drawAcademyPotentialEstimate(truePotential, rng);
  const estimatedOverall = clamp(
    Math.round(potentialEstimate - overallGap + rng.nextRange(-2, 2)),
    T.academy.minOverall,
    potentialEstimate,
  );

  const first = FIRST_NAMES[rng.nextRange(0, FIRST_NAMES.length - 1)]!;
  const last = LAST_NAMES[rng.nextRange(0, LAST_NAMES.length - 1)]!;
  const displayName = `${first} ${last}`;

  const prospectId = `academy_${input.worldSeed}_${input.gameWeek}_${input.club.clubId}_${input.slot}`;

  const isLocal = nat.code === homeCode;
  const storyKind = pickIntakeStoryKind({
    rng,
    focus: input.focus,
    position,
    age,
    truePotential,
    trueOverall,
    isLocal,
  });

  const marketValue = Math.round(trueOverall * trueOverall * T.academy.marketValueFactor);

  const truth: TrueWorldPlayer = {
    playerId: prospectId,
    trueOverall,
    truePotential,
    trueMarketValue: marketValue,
    attributeTruth: { technical, physical, mental },
    injuryConcernTruth: rng.nextRange(0, 8),
  };

  const view: AcademyIntakeProspectView = {
    prospectId,
    clubId: input.club.clubId,
    displayName,
    age,
    nationality: nat.label,
    nationalityFlag: nat.flag,
    position,
    potentialEstimate,
    potentialEstimateBand,
    estimatedOverall,
    storyKind,
    intakeWeek: input.gameWeek,
  };

  return { truth, view, storyKind };
}

export function generateAcademyIntakeProspects(input: {
  worldSeed: number;
  gameWeek: number;
  club: AcademyIntakeClubContext;
  focus: RecruitmentFocusConfig;
  maxProspects?: number;
}): GeneratedAcademyProspectInternal[] {
  const count = input.maxProspects ?? computeAcademyIntakeCapacity(input.club);
  const out: GeneratedAcademyProspectInternal[] = [];
  for (let slot = 0; slot < count; slot += 1) {
    out.push(
      generateSingleAcademyProspect({
        worldSeed: input.worldSeed,
        gameWeek: input.gameWeek,
        club: input.club,
        focus: input.focus,
        slot,
      }),
    );
  }
  return out;
}
