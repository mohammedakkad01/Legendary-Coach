/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { recruitmentRng } from '../rng/recruitmentRng';
import type {
  TransferMotivationResult,
  TransferMotivationSignalContext,
  TransferMotiveKind,
} from './motivationTypes';

const MOTIVE_ORDER: readonly TransferMotiveKind[] = [
  'playing_time',
  'salary',
  'bigger_club',
  'champions_league',
  'home_country',
  'manager_relationship',
  'career_development',
  'club_ambition',
  'contract',
];

function motivePlayingTime(ctx: TransferMotivationSignalContext): number {
  const shortfall = clamp(100 - ctx.playingTimeFulfillmentPct, 0, 100);
  return shortfall * T.motivation.playingTimeShortfallScale;
}

function motiveSalary(ctx: TransferMotivationSignalContext): number {
  const underpaid = clamp(100 - ctx.wageVsSquadMedianPct, 0, 100);
  return underpaid * T.motivation.salaryUnderpayScale;
}

function motiveBiggerClub(ctx: TransferMotivationSignalContext): number {
  const gap = clamp(ctx.desiredClubLevel - ctx.currentClubReputation, 0, 100);
  return gap * T.motivation.biggerClubGapScale;
}

function motiveChampionsLeague(ctx: TransferMotivationSignalContext): number {
  if (!ctx.seeksChampionsLeague) return 0;
  const suitorBoost =
    ctx.suitorOffersChampionsLeague === true ? T.motivation.championsLeagueSuitorBoost : 0;
  return T.motivation.championsLeagueBase + suitorBoost;
}

function motiveHomeCountry(ctx: TransferMotivationSignalContext): number {
  return ctx.suitorIsHomeCountry ? T.motivation.homeCountrySuitorBoost : 0;
}

function motiveManager(ctx: TransferMotivationSignalContext): number {
  const trustGap = clamp(100 - ctx.managerTrust, 0, 100);
  const satGap = clamp(100 - ctx.managerSatisfaction, 0, 100);
  return ((trustGap + satGap) / 2) * T.motivation.managerDissatisfactionScale;
}

function motiveDevelopment(ctx: TransferMotivationSignalContext): number {
  const gap = clamp(100 - ctx.developmentSatisfaction, 0, 100);
  return gap * T.motivation.developmentDissatisfactionScale;
}

function motiveClubAmbition(ctx: TransferMotivationSignalContext): number {
  const rep = ctx.suitorClubReputation ?? ctx.currentClubReputation;
  const uplift = clamp(rep - ctx.currentClubReputation, 0, 100);
  return uplift * T.motivation.clubAmbitionUpliftScale;
}

function motiveContract(ctx: TransferMotivationSignalContext): number {
  const satGap = clamp(100 - ctx.contractSatisfaction, 0, 100);
  const shortTerm = ctx.contractYearsRemaining <= 1 ? T.motivation.shortContractBoost : 0;
  return satGap * T.motivation.contractDissatisfactionScale + shortTerm;
}

function archetypeBias(archetype: string): number {
  switch (archetype) {
    case 'ambitious':
      return T.motivation.archetypeBias.ambitious;
    case 'loyal':
      return T.motivation.archetypeBias.loyal;
    case 'temperamental':
      return T.motivation.archetypeBias.temperamental;
    case 'leader':
      return T.motivation.archetypeBias.leader;
    case 'nervous':
      return T.motivation.archetypeBias.nervous;
    default:
      return T.motivation.archetypeBias.professional;
  }
}

export interface ComputeTransferMotivationInput {
  worldSeed: number;
  gameWeek: number;
  observerClubId: string;
  signals: TransferMotivationSignalContext;
}

export function computeTransferMotivation(input: ComputeTransferMotivationInput): TransferMotivationResult {
  const ctx = input.signals;
  const motiveScores: Record<TransferMotiveKind, number> = {
    playing_time: motivePlayingTime(ctx),
    salary: motiveSalary(ctx),
    bigger_club: motiveBiggerClub(ctx),
    champions_league: motiveChampionsLeague(ctx),
    home_country: motiveHomeCountry(ctx),
    manager_relationship: motiveManager(ctx),
    career_development: motiveDevelopment(ctx),
    club_ambition: motiveClubAmbition(ctx),
    contract: motiveContract(ctx),
  };

  if ((ctx.transferRumorIntensity ?? 0) > T.motivation.rumorIntensityThreshold) {
    motiveScores.playing_time += T.motivation.rumorPlayingTimeBump;
  }

  const moraleDrag = ctx.morale < T.motivation.lowMoraleThreshold
    ? (T.motivation.lowMoraleThreshold - ctx.morale) * T.motivation.lowMoraleDesireScale
    : 0;
  const frustrationBoost = ctx.mentalFrustration * T.motivation.frustrationScale;
  const happinessDamp = ctx.mentalHappiness * T.motivation.happinessDampScale;

  let weighted = 0;
  let weightSum = 0;
  for (const kind of MOTIVE_ORDER) {
    const w = T.motivation.weights[kind];
    weighted += motiveScores[kind] * w;
    weightSum += w;
  }
  const base = weightSum > 0 ? weighted / weightSum : 0;

  const rng = recruitmentRng(
    input.worldSeed,
    input.gameWeek,
    input.observerClubId,
    ctx.playerId,
    'motivation_eval',
  );
  const noise = rng.nextRange(-T.motivation.desireNoiseAmplitude, T.motivation.desireNoiseAmplitude);

  const projectedTransferDesire = clamp(
    base + moraleDrag + frustrationBoost - happinessDamp + archetypeBias(ctx.personalityArchetype) + noise,
    0,
    100,
  );

  const dominantMotives = [...MOTIVE_ORDER]
    .sort((a, b) => motiveScores[b] - motiveScores[a])
    .slice(0, 3);

  const reasonCodes: string[] = [];
  if (motiveScores.playing_time >= T.motivation.dominantMotiveThreshold) reasonCodes.push('motive_playing_time');
  if (motiveScores.salary >= T.motivation.dominantMotiveThreshold) reasonCodes.push('motive_salary');
  if (projectedTransferDesire >= T.motivation.highDesireThreshold) reasonCodes.push('high_transfer_desire');
  if (projectedTransferDesire < T.motivation.lowDesireThreshold) reasonCodes.push('low_transfer_desire');

  return {
    projectedTransferDesire,
    motiveScores,
    dominantMotives,
    reasonCodes,
  };
}
