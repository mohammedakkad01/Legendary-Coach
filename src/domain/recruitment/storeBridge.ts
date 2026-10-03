/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store integration — builds weekly tick input from career save slices (no UI).
 */

import type { Club, LeagueStanding, Player } from '../../types/game';
import type { GameSaveData } from '../../types/save';
import type { GameEvent, LivingWorldState } from '../livingWorld/types';
import { ingestGameEventBatch } from '../livingWorld/events/ingest';
import type { ReducerInput } from '../livingWorld/types';
import type { AiClubWeeklyBatchEntry } from './aiClubs/weeklyAiTransferBatch';
import type { TransferTargetCandidate } from './aiClubs/clubProfileTypes';
import { collectRecruitmentClubIds } from './aiClubs/ensureProfilesOnWorld';
import { createInitialKnowledge } from './knowledge/knowledgeState';
import { getObservedPlayerView, knowledgeToObservedView } from './knowledge/observedView';
import { computeTransferMotivation } from './motivation/transferMotivation';
import { computePreOfferWillingness } from './motivation/preOfferWillingness';
import type { TransferMotivationSignalContext } from './motivation/motivationTypes';
import type { AgentActivityCandidate } from './rumors/generateRumors';
import { deriveGameWeekFromSave } from './world/gameWeek';
import { runWeeklyRecruitmentTickOnSave, type WeeklyRecruitmentTickSaveInput } from './integration';
import type { ObservedPlayerView, RecruitmentWorldState } from './types';
import type { AcademyIntakeClubContext } from './academy/academyTypes';
import { RECRUITMENT_TUNING as T } from './config/recruitmentTuning';
import { getClubModifiersForSave } from '../clubManagement/storeBridge';

const KNOWN_AI_BUDGET: Record<string, number> = {
  club_man_city: 120_000_000,
  club_real_madrid: 110_000_000,
  club_barcelona: 45_000_000,
  club_al_hilal: 90_000_000,
  club_al_nassr: 85_000_000,
  club_al_ahly: 12_000_000,
};

function squadMedianWage(squad: readonly Player[]): number {
  if (squad.length === 0) return 50_000;
  const wages = squad.map((p) => p.wage).sort((a, b) => a - b);
  return wages[Math.floor(wages.length / 2)] ?? 50_000;
}

/** Map Phase C / legacy player fields into recruitment motivation signals (no duplicate formula). */
export function buildTransferMotivationSignalsFromPlayer(
  player: Player,
  context: {
    userClub: Club;
    sellerClubId: string;
    suitorClubId?: string;
    suitorReputation?: number;
    transferRumorIntensity?: number;
  },
): TransferMotivationSignalContext {
  const median = squadMedianWage(context.userClub.footballSquad ?? []);
  const expectedMin = player.playerLife?.playingTime?.expectedMinutesPerMatch ?? 60;
  const lastMinutes = player.playerLife?.playingTime?.minutesLastMatches ?? [];
  const avgMinutes =
    lastMinutes.length > 0 ? lastMinutes.reduce((a, b) => a + b, 0) / lastMinutes.length : expectedMin * 0.5;
  const playingTimeFulfillmentPct = Math.min(100, Math.round((avgMinutes / Math.max(1, expectedMin)) * 100));

  return {
    playerId: player.id,
    personalityArchetype: player.personality,
    morale: player.morale ?? 50,
    playingTimeFulfillmentPct,
    developmentSatisfaction: player.playerLife?.development?.momentum !== undefined
      ? clampPct(50 + (player.playerLife.development.momentum ?? 0) * 2)
      : 55,
    contractSatisfaction: clampPct(100 - (player.contractYears <= 1 ? 25 : 0)),
    contractYearsRemaining: player.contractYears,
    managerTrust: player.managerRelationship?.trust ?? 50,
    managerSatisfaction: player.mentalState?.happiness ?? 50,
    mentalFrustration: player.mentalState?.frustration ?? 20,
    mentalHappiness: player.mentalState?.happiness ?? 50,
    currentClubReputation: context.userClub.finances.reputation / 100,
    desiredClubLevel: 75,
    seeksChampionsLeague: (context.userClub.finances.reputation ?? 0) > 8000,
    wageVsSquadMedianPct: median > 0 ? Math.round((player.wage / median) * 100) : 100,
    transferRumorIntensity: context.transferRumorIntensity,
    suitorClubReputation: context.suitorReputation,
    suitorOffersChampionsLeague: (context.suitorReputation ?? 0) > 70,
    suitorIsHomeCountry: false,
  };
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function observedViewForClub(
  world: RecruitmentWorldState,
  observerClubId: string,
  playerId: string,
  userClubId: string,
  gameWeek: number,
): ObservedPlayerView | null {
  const existing = getObservedPlayerView(world, observerClubId, playerId);
  if (existing) return existing;
  const truth = world.worldPlayers[playerId];
  if (!truth) return null;
  const knowledge = createInitialKnowledge({
    worldSeed: world.worldSeed,
    gameWeek,
    observerClubId,
    playerId,
    isOwnSquad: false,
    truth,
  });
  return knowledgeToObservedView(knowledge);
}

function financesForClub(clubId: string, standings: readonly LeagueStanding[]): AiClubWeeklyBatchEntry['finances'] {
  const rowIndex = standings.findIndex((s) => s.clubId === clubId);
  const budget =
    KNOWN_AI_BUDGET[clubId] ??
    clampBudget(4_000_000 + (rowIndex >= 0 ? Math.max(0, 20 - rowIndex) * 750_000 : 2_000_000));
  return {
    transferBudget: budget,
    wageBudgetRemainingWeekly: Math.round(budget / 200),
    squadSize: 22,
    maxSquadSize: 30,
  };
}

function clampBudget(n: number): number {
  return Math.max(500_000, Math.min(150_000_000, n));
}

export function buildWeeklyRecruitmentTickInputFromSave(
  save: GameSaveData,
  extra?: Partial<WeeklyRecruitmentTickSaveInput>,
): WeeklyRecruitmentTickSaveInput {
  const world = save.recruitmentWorld!;
  const userClubId = save.club.id;
  const gameWeek = deriveGameWeekFromSave(save);
  const candidatePlayers = save.scoutMarket ?? [];
  const clubIds = collectRecruitmentClubIds(save).filter((id) => id !== userClubId);

  const candidatesByClubId: Record<string, TransferTargetCandidate[]> = {};
  const aiClubEntries: AiClubWeeklyBatchEntry[] = [];
  const agentActivities: AgentActivityCandidate[] = [];

  for (const actingClubId of clubIds) {
    const profile = world.aiClubProfiles[actingClubId];
    if (!profile) continue;

    const candidates: TransferTargetCandidate[] = [];
    for (const player of candidatePlayers) {
      const observed = observedViewForClub(world, actingClubId, player.id, userClubId, gameWeek);
      if (!observed) continue;
      const signals = buildTransferMotivationSignalsFromPlayer(player, {
        userClub: save.club,
        sellerClubId: userClubId,
        suitorClubId: actingClubId,
        suitorReputation: profile.boardAmbition,
      });
      const motivation = computeTransferMotivation({
        worldSeed: world.worldSeed,
        gameWeek,
        observerClubId: actingClubId,
        signals,
      });
      const willingness = computePreOfferWillingness(motivation, signals);
      candidates.push({
        playerId: player.id,
        observed,
        willingness,
        motivation,
        sellerClubId: userClubId,
      });
      if (willingness.willInfluenceTransfer && willingness.opennessScore >= T.motivation.preOfferInfluenceThreshold) {
        agentActivities.push({
          playerId: player.id,
          subjectClubId: userClubId,
          willingness,
        });
      }
    }

    candidatesByClubId[actingClubId] = candidates;
    aiClubEntries.push({
      clubId: actingClubId,
      profile,
      finances: financesForClub(actingClubId, save.leagueStandings ?? []),
      squadNeeds: { minEstimatedRating: 68, needUrgency: 65 },
      candidates,
    });
  }

  const academy: AcademyIntakeClubContext = {
    clubId: userClubId,
    youthAcademyLevel: save.club.facilities.youthAcademyLevel,
    recruitmentInvestment: clampPct(save.club.facilities.scoutingNetworkLevel * 10),
    coachingQuality: clampPct(save.club.facilities.trainingGroundLevel * 10),
    facilitiesScore: clampPct(save.club.facilities.trainingGroundLevel * 10),
    clubReputation: clampPct(save.club.finances.reputation / 100),
    regionCode: 'SA',
  };
  if (save.clubManagement) {
    const mods = getClubModifiersForSave(save, save.club);
    academy.coachingQuality = mods.academyCoachingQuality;
    academy.recruitmentInvestment = mods.academyRecruitmentInvestment;
  }

  return {
    gameWeek,
    season: save.livingWorld?.currentSeason ?? 1,
    timestampIso: new Date().toISOString(),
    aiClubEntries,
    candidatesByClubId,
    agentActivities,
    academy: { enabled: true, club: academy },
    ...extra,
  };
}

export function dispatchRecruitmentEventsToLivingWorld(
  input: ReducerInput,
  events: readonly GameEvent[],
  options?: { gameWeek?: number; clubId?: string },
): ReducerInput {
  return ingestGameEventBatch(input, events, {
    gameWeek: options?.gameWeek,
    clubId: options?.clubId,
  });
}

export interface WeeklyRecruitmentStoreResult {
  recruitmentWorld: RecruitmentWorldState;
  livingWorld: LivingWorldState;
  club: Club;
  events: GameEvent[];
  skippedReason?: string;
}

/** Run weekly recruitment tick and merge results into store-owned slices. */
export function applyUserWeeklyRecruitment(params: {
  club: Club;
  livingWorld: LivingWorldState;
  scoutMarket: Player[];
  leagueStandings: LeagueStanding[];
  simulatedMatchdays: number[];
  activeNegotiations: GameSaveData['activeNegotiations'];
  recruitmentWorld: RecruitmentWorldState;
  saveId: string;
}): WeeklyRecruitmentStoreResult {
  const save: GameSaveData = {
    saveVersion: 5,
    saveId: params.saveId,
    savedAt: new Date().toISOString(),
    appVersion: 'store',
    currentSport: 'football',
    language: 'en',
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: false,
    club: params.club,
    energy: 100,
    lastEnergyUpdate: 0,
    vipPoints: 0,
    lastVipClaimDate: null,
    claimedVipUpgradeChests: [],
    missionSkipUsedDate: null,
    checkInStreak: 0,
    lastCheckInDate: null,
    savedTacticalPlans: [],
    pendingFacilityUpgrades: [],
    activeNegotiations: params.activeNegotiations ?? [],
    academyDiscoveries: [],
    scoutMarket: params.scoutMarket,
    dailyMissions: [],
    storyMissions: [],
    leagueStandings: params.leagueStandings,
    leagueFixtures: [],
    matchHistory: [],
    tournamentStats: [],
    simulatedMatchdays: params.simulatedMatchdays,
    matchScoutReports: {},
    unlockedSpeed2x: false,
    livingWorld: params.livingWorld,
    recruitmentWorld: params.recruitmentWorld,
  };

  const tickInput = buildWeeklyRecruitmentTickInputFromSave(save);
  const tick = runWeeklyRecruitmentTickOnSave(save, tickInput);

  let livingWorld = params.livingWorld;
  let club = params.club;
  if (tick.events.length > 0) {
    const dispatched = dispatchRecruitmentEventsToLivingWorld(
      { livingWorld, players: club.footballSquad },
      tick.events,
      { clubId: club.id, gameWeek: tickInput.gameWeek },
    );
    livingWorld = dispatched.livingWorld;
    club = { ...club, footballSquad: dispatched.players };
  }

  return {
    recruitmentWorld: tick.recruitmentWorld,
    livingWorld,
    club,
    events: tick.events,
    skippedReason: tick.skippedReason,
  };
}
