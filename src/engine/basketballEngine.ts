/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Pure TypeScript Basketball Match Engine
 * 4 Quarters, possession-based pace, 3-pointers, dunks, defense schemes, timeouts.
 */

import { Club, MatchEvent, MatchRecord, BasketballTactics } from '../types/game';
import { SeededRandom } from './prng';

export class BasketballMatchEngine {
  private prng: SeededRandom;
  private homeClub: Club;
  private awayClub: Club;
  private homeTactics: BasketballTactics;
  private seed: number;
  private quarter: number = 1;
  private timeInQuarterSeconds: number = 720; // 12 mins per quarter
  private homeScore: number = 0;
  private awayScore: number = 0;
  private events: MatchEvent[] = [];

  constructor(
    homeClub: Club,
    awayClub: Club,
    seed: number = Date.now(),
    homeTactics?: BasketballTactics
  ) {
    this.seed = seed;
    this.prng = new SeededRandom(seed);
    this.homeClub = homeClub;
    this.awayClub = awayClub;
    this.homeTactics = homeTactics || homeClub.basketballTactics;
  }

  public simulateFullGame(): MatchRecord {
    const quarters = [1, 2, 3, 4];
    for (const q of quarters) {
      this.quarter = q;
      const possessions = this.prng.nextRange(22, 28);
      for (let p = 0; p < possessions; p++) {
        // Home possession
        this.simulatePossession(true);
        // Away possession
        this.simulatePossession(false);
      }
    }

    return {
      id: `bball_${this.seed}`,
      sport: 'basketball',
      seed: this.seed,
      homeClubId: this.homeClub.id,
      homeClubName: this.homeClub.name,
      awayClubId: this.awayClub.id,
      awayClubName: this.awayClub.name,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events,
      stats: {
        homePossession: 50,
        awayPossession: 50,
        homeShots: Math.round(this.homeScore * 0.75),
        awayShots: Math.round(this.awayScore * 0.75),
        homeShotsOnTarget: Math.round(this.homeScore * 0.45),
        awayShotsOnTarget: Math.round(this.awayScore * 0.45),
        homeCorners: 0,
        awayCorners: 0,
        homeFouls: this.prng.nextRange(12, 19),
        awayFouls: this.prng.nextRange(12, 19),
        homeYellowCards: 0,
        awayYellowCards: 0,
        homeXg: 0,
        awayXg: 0,
      },
      isFinished: true,
      competition: 'دوري السلة للمحترفين',
      matchDay: 1,
      date: new Date().toISOString().split('T')[0],
    };
  }

  private simulatePossession(isHome: boolean) {
    const shooters = isHome ? this.homeClub.basketballSquad : this.awayClub.basketballSquad;
    const player = shooters.length > 0 ? this.prng.pick(shooters) : null;
    const shotRoll = this.prng.nextFloat();

    if (shotRoll < 0.28) {
      // 3-pointer
      if (this.prng.nextChance(0.38)) {
        if (isHome) this.homeScore += 3; else this.awayScore += 3;
        this.events.push({
          minute: Math.round((this.quarter - 1) * 12 + (this.timeInQuarterSeconds / 60)),
          quarter: this.quarter,
          sport: 'basketball',
          type: 'three_pointer',
          team: isHome ? 'home' : 'away',
          playerName: player?.name || 'صانع الألعاب',
          textAr: `🎯 ثلاثية نارية مذهلة من ${player?.name || 'اللاعب'} في الربع ${this.quarter}! (${this.homeScore} - ${this.awayScore})`,
          textEn: `🎯 Sizzling three-pointer by ${player?.nameEn || 'Player'} in Q${this.quarter}! (${this.homeScore} - ${this.awayScore})`,
          homeScore: this.homeScore,
          awayScore: this.awayScore,
        });
      }
    } else if (shotRoll < 0.7) {
      // 2-pointer / Dunk
      if (this.prng.nextChance(0.52)) {
        if (isHome) this.homeScore += 2; else this.awayScore += 2;
        if (this.prng.nextChance(0.25)) {
          this.events.push({
            minute: Math.round((this.quarter - 1) * 12 + (this.timeInQuarterSeconds / 60)),
            quarter: this.quarter,
            sport: 'basketball',
            type: 'dunk',
            team: isHome ? 'home' : 'away',
            playerName: player?.name || 'لاعب الارتكاز',
            textAr: `💥 دنك ساحق يهز الصالة من ${player?.name || 'العملاق'}! (${this.homeScore} - ${this.awayScore})`,
            textEn: `💥 Monster slam dunk rattling the rim from ${player?.nameEn || 'Giant'}! (${this.homeScore} - ${this.awayScore})`,
            homeScore: this.homeScore,
            awayScore: this.awayScore,
          });
        }
      }
    }
  }
}
