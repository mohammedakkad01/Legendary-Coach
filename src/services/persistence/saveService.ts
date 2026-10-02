/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistence Save Service
 * Handles state sanitization, debouncing, batching, and saving to localStorage.
 */

import { GameSaveData, CURRENT_SAVE_VERSION, SaveStatus } from '../../types/save';
import { ensureLivingWorldV3 } from '../../domain/livingWorld/migrateLivingWorld';
import { ensurePlayerLifeV4 } from '../../domain/playerLife/migratePlayerLife';
import { ensureRecruitmentV5 } from '../../domain/recruitment/migration/migrateRecruitmentV5';
import { ensureFootballSimulationV4 } from '../../domain/tactics/migrateFootballSimulation';
import { Club, ClubFinances, ClubFacilities, SportType } from '../../types/game';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_STANDINGS, REAL_INITIAL_SCOUT_MARKET } from '../../data/realFootballData';
import { STORY_CHAPTER_1_MISSIONS } from '../../data/storyChapter1';
import { INITIAL_DAILY_MISSIONS } from '../../data/dailyMissionsData';
import { generateFixturesForLeague, ensureFixtureDates } from '../../data/realLeaguesData';

export const STORAGE_KEY = 'MODAREB_LEGEND_REAL_V2';
export const APP_VERSION = '2.1.0';

export type SaveListener = (status: SaveStatus, error?: string) => void;

export class SaveService {
  private listeners: Set<SaveListener> = new Set();
  private autoSaveTimeout: any = null;
  private currentStatus: SaveStatus = 'idle';

  public subscribe(listener: SaveListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  public notify(status: SaveStatus, error?: string): void {
    this.currentStatus = status;
    this.listeners.forEach((fn) => fn(status, error));
  }

  public getStatus(): SaveStatus {
    return this.currentStatus;
  }

  /**
   * Sanitizes club object to ensure all required fields and arrays exist
   * without circular references or functions.
   */
  public sanitizeClub(club: Club): Club {
    const clubFinances = (club.finances || {}) as Partial<ClubFinances>;
    const baseFinances: ClubFinances = {
      coins: typeof clubFinances.coins === 'number' ? clubFinances.coins : 250000,
      diamonds: typeof clubFinances.diamonds === 'number' ? clubFinances.diamonds : 0,
      reputation: typeof clubFinances.reputation === 'number' ? clubFinances.reputation : 1500,
      trainingPoints: typeof clubFinances.trainingPoints === 'number' ? clubFinances.trainingPoints : 50,
      scoutPoints: typeof clubFinances.scoutPoints === 'number' ? clubFinances.scoutPoints : 10,
      ticketPrice: typeof clubFinances.ticketPrice === 'number' ? clubFinances.ticketPrice : 25,
      sponsorName: clubFinances.sponsorName || 'Global Telecom',
      sponsorIncomePerMatch: typeof clubFinances.sponsorIncomePerMatch === 'number' ? clubFinances.sponsorIncomePerMatch : 15000,
      totalSeasonRevenue: typeof clubFinances.totalSeasonRevenue === 'number' ? clubFinances.totalSeasonRevenue : 0,
      totalSeasonExpenses: typeof clubFinances.totalSeasonExpenses === 'number' ? clubFinances.totalSeasonExpenses : 0,
    };

    const clubFacilities = (club.facilities || {}) as Partial<ClubFacilities>;
    const baseFacilities: ClubFacilities = {
      stadiumLevel: typeof clubFacilities.stadiumLevel === 'number' ? clubFacilities.stadiumLevel : 1,
      trainingGroundLevel: typeof clubFacilities.trainingGroundLevel === 'number' ? clubFacilities.trainingGroundLevel : 1,
      youthAcademyLevel: typeof clubFacilities.youthAcademyLevel === 'number' ? clubFacilities.youthAcademyLevel : 1,
      medicalCenterLevel: typeof clubFacilities.medicalCenterLevel === 'number' ? clubFacilities.medicalCenterLevel : 1,
      scoutingNetworkLevel: typeof clubFacilities.scoutingNetworkLevel === 'number' ? clubFacilities.scoutingNetworkLevel : 1,
    };

    return {
      id: club.id || REAL_INITIAL_PLAYER_CLUB.id,
      name: club.name || REAL_INITIAL_PLAYER_CLUB.name,
      nameEn: club.nameEn || REAL_INITIAL_PLAYER_CLUB.nameEn,
      city: club.city || REAL_INITIAL_PLAYER_CLUB.city,
      stadiumName: club.stadiumName || REAL_INITIAL_PLAYER_CLUB.stadiumName,
      colors: club.colors || REAL_INITIAL_PLAYER_CLUB.colors,
      logoBadge: club.logoBadge || REAL_INITIAL_PLAYER_CLUB.logoBadge,
      logoUrl: club.logoUrl || REAL_INITIAL_PLAYER_CLUB.logoUrl,
      divisionId: club.divisionId || REAL_INITIAL_PLAYER_CLUB.divisionId,
      divisionName: club.divisionName || REAL_INITIAL_PLAYER_CLUB.divisionName,
      boardTrust: typeof club.boardTrust === 'number' ? club.boardTrust : 85,
      fanMood: typeof club.fanMood === 'number' ? club.fanMood : 80,
      facilities: baseFacilities,
      finances: baseFinances,
      staff: club.staff || REAL_INITIAL_PLAYER_CLUB.staff,

      footballSquad: Array.isArray(club.footballSquad) ? club.footballSquad : REAL_INITIAL_PLAYER_CLUB.footballSquad,
      footballLineup: Array.isArray(club.footballLineup) ? club.footballLineup : REAL_INITIAL_PLAYER_CLUB.footballLineup,
      footballBench: Array.isArray(club.footballBench) ? club.footballBench : REAL_INITIAL_PLAYER_CLUB.footballBench,
      footballTactics: club.footballTactics || REAL_INITIAL_PLAYER_CLUB.footballTactics,

      basketballSquad: Array.isArray(club.basketballSquad) ? club.basketballSquad : REAL_INITIAL_PLAYER_CLUB.basketballSquad,
      basketballLineup: Array.isArray(club.basketballLineup) ? club.basketballLineup : REAL_INITIAL_PLAYER_CLUB.basketballLineup,
      basketballBench: Array.isArray(club.basketballBench) ? club.basketballBench : REAL_INITIAL_PLAYER_CLUB.basketballBench,
      basketballTactics: club.basketballTactics || REAL_INITIAL_PLAYER_CLUB.basketballTactics,

      duelRating: typeof club.duelRating === 'number' ? club.duelRating : 1200,
      duelWins: typeof club.duelWins === 'number' ? club.duelWins : 0,
      duelLosses: typeof club.duelLosses === 'number' ? club.duelLosses : 0,
      duelDraws: typeof club.duelDraws === 'number' ? club.duelDraws : 0,
      trophies: typeof club.trophies === 'number' ? club.trophies : 0,
    };
  }

  /**
   * Extracts ONLY persistent career data from a store state object.
   * Strips all transient UI fields and potential tokens.
   */
  public extractSaveData(state: Record<string, unknown>): GameSaveData {
    const club = state.club ? this.sanitizeClub(state.club as Club) : REAL_INITIAL_PLAYER_CLUB;
    const nowIso = new Date().toISOString();

    const base: GameSaveData = {
      saveVersion: CURRENT_SAVE_VERSION,
      saveId: typeof state.saveId === 'string' ? state.saveId : `save_${Date.now()}`,
      savedAt: nowIso,
      appVersion: APP_VERSION,

      currentSport: (state.currentSport === 'basketball' ? 'basketball' : 'football') as SportType,
      language: state.language === 'en' ? 'en' : 'ar',
      soundEnabled: typeof state.soundEnabled === 'boolean' ? state.soundEnabled : true,
      hasSelectedInitialClub: Boolean(state.hasSelectedInitialClub),
      isGuest: Boolean(state.isGuest),
      hasClaimedLoginBonus: Boolean(state.hasClaimedLoginBonus),

      club,

      energy: typeof state.energy === 'number' ? state.energy : 100,
      lastEnergyUpdate: typeof state.lastEnergyUpdate === 'number' ? state.lastEnergyUpdate : Date.now(),
      vipPoints: typeof state.vipPoints === 'number' ? state.vipPoints : 0,
      lastVipClaimDate: typeof state.lastVipClaimDate === 'string' || state.lastVipClaimDate === null ? state.lastVipClaimDate : null,
      claimedVipUpgradeChests: Array.isArray(state.claimedVipUpgradeChests) ? [...state.claimedVipUpgradeChests] : [1],
      missionSkipUsedDate: typeof state.missionSkipUsedDate === 'string' || state.missionSkipUsedDate === null ? state.missionSkipUsedDate : null,
      checkInStreak: typeof state.checkInStreak === 'number' ? state.checkInStreak : 0,
      lastCheckInDate: typeof state.lastCheckInDate === 'string' || state.lastCheckInDate === null ? state.lastCheckInDate : null,

      savedTacticalPlans: Array.isArray(state.savedTacticalPlans) ? state.savedTacticalPlans : [],
      pendingFacilityUpgrades: Array.isArray(state.pendingFacilityUpgrades) ? state.pendingFacilityUpgrades : [],

      activeNegotiations: Array.isArray(state.activeNegotiations) ? state.activeNegotiations : [],
      academyDiscoveries: Array.isArray(state.academyDiscoveries) ? state.academyDiscoveries : [],
      scoutMarket: Array.isArray(state.scoutMarket) ? state.scoutMarket : REAL_INITIAL_SCOUT_MARKET,

      dailyMissions: Array.isArray(state.dailyMissions) && state.dailyMissions.length > 0 ? state.dailyMissions : INITIAL_DAILY_MISSIONS,
      storyMissions: Array.isArray(state.storyMissions) && state.storyMissions.length > 0 ? state.storyMissions : STORY_CHAPTER_1_MISSIONS,

      leagueStandings: Array.isArray(state.leagueStandings) && state.leagueStandings.length > 0 ? state.leagueStandings : REAL_INITIAL_STANDINGS,
      leagueFixtures: Array.isArray(state.leagueFixtures) && state.leagueFixtures.length > 0
        ? ensureFixtureDates(state.leagueFixtures as GameSaveData['leagueFixtures'])
        : ensureFixtureDates(generateFixturesForLeague(club.divisionId, club.id)),
      matchHistory: Array.isArray(state.matchHistory) ? (state.matchHistory as GameSaveData['matchHistory']) : [],
      tournamentStats: Array.isArray(state.tournamentStats) ? (state.tournamentStats as GameSaveData['tournamentStats']) : [],
      simulatedMatchdays: Array.isArray(state.simulatedMatchdays) ? (state.simulatedMatchdays as number[]) : [],
      matchScoutReports:
        state.matchScoutReports && typeof state.matchScoutReports === 'object'
          ? (state.matchScoutReports as GameSaveData['matchScoutReports'])
          : {},

      unlockedSpeed2x: Boolean(state.unlockedSpeed2x),
      livingWorld: state.livingWorld as GameSaveData['livingWorld'],
      savePassthrough:
        state.savePassthrough && typeof state.savePassthrough === 'object'
          ? (state.savePassthrough as Record<string, unknown>)
          : undefined,
    };

    return ensureRecruitmentV5(
      ensurePlayerLifeV4(ensureFootballSimulationV4(ensureLivingWorldV3(base))),
    );
  }

  public serialize(data: GameSaveData, pretty = false): string {
    return JSON.stringify(data, null, pretty ? 2 : undefined);
  }

  public saveImmediate(state: any): boolean {
    try {
      this.notify('saving');
      const saveData = this.extractSaveData(state);
      const serialized = this.serialize(saveData, false);
      localStorage.setItem(STORAGE_KEY, serialized);
      this.notify('saved');
      return true;
    } catch (err: any) {
      console.error('[SaveService] Save to localStorage failed:', err);
      this.notify('error', err?.message || 'Storage Quota Exceeded');
      return false;
    }
  }

  public scheduleAutoSave(getState: () => any, delayMs = 600): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.autoSaveTimeout = null;
      try {
        const state = getState();
        this.saveImmediate(state);
      } catch (e) {
        console.error('[SaveService] Auto-save error:', e);
      }
    }, delayMs);
  }

  public flush(getState: () => any): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
      try {
        this.saveImmediate(getState());
      } catch (e) {
        console.error('[SaveService] Flush error:', e);
      }
    }
  }
}

export const saveService = new SaveService();
