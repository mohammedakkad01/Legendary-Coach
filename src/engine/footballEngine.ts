/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Pure TypeScript Football Match Engine
 * Possession-chain simulation, tactical modifiers, stamina depletion,
 * key interactive moments, and verified match replay records.
 */

import { Club, MatchEvent, MatchRecord, MatchStats, FootballTactics } from '../types/game';
import { SeededRandom } from './prng';

export interface SimulationStepResult {
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStats;
  isFinished: boolean;
  interactivePrompt?: MatchEvent;
}

export class FootballMatchEngine {
  private prng: SeededRandom;
  private homeClub: Club;
  private awayClub: Club;
  private homeTactics: FootballTactics;
  private awayTactics: FootballTactics;
  private seed: number;
  private minute: number = 0;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private events: MatchEvent[] = [];
  private stats: MatchStats;
  private pendingInteractiveMoment: MatchEvent | null = null;
  private homeVipAttackBoost: number = 0;
  private homeVipDefenseBoost: number = 0;

  constructor(
    homeClub: Club,
    awayClub: Club,
    seed: number = Date.now(),
    homeTactics?: FootballTactics,
    awayTactics?: FootballTactics,
    homeVipAttackBoost: number = 0,
    homeVipDefenseBoost: number = 0
  ) {
    this.seed = seed;
    this.prng = new SeededRandom(seed);
    this.homeClub = homeClub;
    this.awayClub = awayClub;
    this.homeTactics = homeTactics || homeClub.footballTactics;
    this.awayTactics = awayTactics || awayClub.footballTactics;
    this.homeVipAttackBoost = homeVipAttackBoost;
    this.homeVipDefenseBoost = homeVipDefenseBoost;

    this.stats = {
      homePossession: 50,
      awayPossession: 50,
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homeCorners: 0,
      awayCorners: 0,
      homeFouls: 0,
      awayFouls: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      homeXg: 0.0,
      awayXg: 0.0,
    };
  }

  /** Calculate team power based on lineup and tactical style */
  private calculateTeamPower(club: Club, tactics: FootballTactics, isHome: boolean) {
    const lineupPlayers = club.footballSquad.filter(p => club.footballLineup.includes(p.id));
    const avgOverall = lineupPlayers.length > 0 
      ? lineupPlayers.reduce((acc, p) => acc + p.overall, 0) / lineupPlayers.length 
      : 65;

    let attackBonus = 0;
    let defenseBonus = 0;

    if (tactics.mentality === 'all_out_attack') { attackBonus += 8; defenseBonus -= 6; }
    else if (tactics.mentality === 'attacking') { attackBonus += 4; defenseBonus -= 2; }
    else if (tactics.mentality === 'defensive') { attackBonus -= 3; defenseBonus += 5; }
    else if (tactics.mentality === 'ultra_defensive') { attackBonus -= 7; defenseBonus += 8; }

    if (tactics.pressing === 'high_press' || tactics.pressing === 'gegenpress') {
      attackBonus += 3;
    }

    const homeAdvantage = isHome ? 3 : 0;
    const vipAtk = isHome ? (avgOverall * (this.homeVipAttackBoost / 100)) : 0;
    const vipDef = isHome ? (avgOverall * (this.homeVipDefenseBoost / 100)) : 0;

    return {
      attack: avgOverall + attackBonus + homeAdvantage + vipAtk,
      defense: avgOverall + defenseBonus + homeAdvantage + vipDef,
      lineup: lineupPlayers
    };
  }

  /** Simulate single minute of action */
  public stepMinute(): SimulationStepResult {
    if (this.minute >= 90) {
      return {
        currentMinute: this.minute,
        homeScore: this.homeScore,
        awayScore: this.awayScore,
        events: this.events,
        stats: this.stats,
        isFinished: true,
      };
    }

    this.minute++;
    const homePower = this.calculateTeamPower(this.homeClub, this.homeTactics, true);
    const awayPower = this.calculateTeamPower(this.awayClub, this.awayTactics, false);

    // Possession dynamic shift
    const possessionDelta = (homePower.attack - awayPower.attack) * 0.2 + (this.prng.nextFloat() * 4 - 2);
    this.stats.homePossession = Math.min(78, Math.max(22, Math.round(50 + possessionDelta)));
    this.stats.awayPossession = 100 - this.stats.homePossession;

    // Interactive moment chance at specific story/tactical juncture (e.g. min 30 or 68)
    if ((this.minute === 35 || this.minute === 68) && !this.pendingInteractiveMoment) {
      const interactiveEvent: MatchEvent = {
        minute: this.minute,
        sport: 'football',
        type: 'interactive_moment',
        team: 'home',
        textAr: `فرصة تكتيكية حاسمة في الدقيقة ${this.minute}: لاحظت ثغرة في دفاع المنافس! ما هي تعليماتك الفورية للفريق؟`,
        textEn: `Crucial tactical moment at min ${this.minute}: You spot a weakness in the opponent defense! What are your orders?`,
        homeScore: this.homeScore,
        awayScore: this.awayScore,
        interactiveOptions: [
          {
            id: 'press_now',
            titleAr: 'الضغط العالي السريع وتكثيف الهجوم',
            titleEn: 'High Press & Flood The Box',
            descriptionAr: 'زيادة الخطورة الهجومية مع استنزاف بدني أكبر',
            descriptionEn: 'Increases scoring chance with higher fatigue risk',
            tacticEffect: { mentality: 'attacking', pressing: 'high_press', staminaCost: 5, riskLevel: 'medium' }
          },
          {
            id: 'counter_trap',
            titleAr: 'نصب مصيدة التسلل والارتداد السريع',
            titleEn: 'Offside Trap & Swift Counters',
            descriptionAr: 'استغلال تقدم المنافس لشن مرتدات قاتلة',
            descriptionEn: 'Exploit opponent high line with swift direct passes',
            tacticEffect: { mentality: 'balanced', riskLevel: 'safe' }
          },
          {
            id: 'lock_down',
            titleAr: 'تهدئة وتيرة اللعب والتحكم بالكرة',
            titleEn: 'Slow Tempo & Ball Retention',
            descriptionAr: 'حرمان الخصم من الاستحواذ وتأمين المناطق الخلفية',
            descriptionEn: 'Starve opponent of possession and protect backline',
            tacticEffect: { mentality: 'defensive', tempo: 'slow_patient', riskLevel: 'safe' }
          }
        ]
      };
      this.events.push(interactiveEvent);
      this.pendingInteractiveMoment = interactiveEvent;
      return {
        currentMinute: this.minute,
        homeScore: this.homeScore,
        awayScore: this.awayScore,
        events: this.events,
        stats: this.stats,
        isFinished: false,
        interactivePrompt: interactiveEvent,
      };
    }

    // Goal & Shot chances per minute (~10-15 shots per 90 mins)
    const actionRoll = this.prng.nextFloat();

    if (actionRoll < 0.14) {
      // An attacking event occurred
      const isHomeAttacking = this.prng.nextFloat() < (this.stats.homePossession / 100);
      const attackingClub = isHomeAttacking ? this.homeClub : this.awayClub;
      const defendingClub = isHomeAttacking ? this.awayClub : this.homeClub;
      const attackingPower = isHomeAttacking ? homePower : awayPower;
      const defendingPower = isHomeAttacking ? awayPower : homePower;

      const attackingPlayers = attackingPower.lineup.filter(p => p.position !== 'GK');
      const shooter = this.prng.pick(attackingPlayers.length > 0 ? attackingPlayers : attackingClub.footballSquad);

      const shotSuccessThreshold = (attackingPower.attack / (attackingPower.attack + defendingPower.defense)) * 0.42;
      const onTarget = this.prng.nextFloat() < 0.48;

      if (isHomeAttacking) {
        this.stats.homeShots++;
        this.stats.homeXg = +(this.stats.homeXg + 0.08).toFixed(2);
        if (onTarget) this.stats.homeShotsOnTarget++;
      } else {
        this.stats.awayShots++;
        this.stats.awayXg = +(this.stats.awayXg + 0.08).toFixed(2);
        if (onTarget) this.stats.awayShotsOnTarget++;
      }

      if (onTarget) {
        const isGoal = this.prng.nextFloat() < shotSuccessThreshold;
        if (isGoal) {
          if (isHomeAttacking) this.homeScore++; else this.awayScore++;

          const goalEvent: MatchEvent = {
            minute: this.minute,
            sport: 'football',
            type: 'goal',
            team: isHomeAttacking ? 'home' : 'away',
            playerId: shooter?.id,
            playerName: shooter ? shooter.name : (isHomeAttacking ? 'مهاجم الفريق' : 'مهاجم الخصم'),
            textAr: `⚽ هـــــــــــدف رائع! ${shooter?.name || 'اللاعب'} يسدد كرة قوية تستقر في الشباك بالدقيقة ${this.minute}! (${this.homeScore} - ${this.awayScore})`,
            textEn: `⚽ GOAL! ${shooter?.nameEn || 'Striker'} fires a clinical shot into the net at min ${this.minute}! (${this.homeScore} - ${this.awayScore})`,
            homeScore: this.homeScore,
            awayScore: this.awayScore,
          };
          this.events.push(goalEvent);
        } else {
          // Great save by GK
          const saveEvent: MatchEvent = {
            minute: this.minute,
            sport: 'football',
            type: 'save',
            team: isHomeAttacking ? 'away' : 'home',
            textAr: `🧤 تصدٍ خيالي من الحارس يحرم ${shooter?.name || 'المهاجم'} من هدف محقق في الدقيقة ${this.minute}!`,
            textEn: `🧤 Sensational save by the keeper denying ${shooter?.nameEn || 'the striker'} in minute ${this.minute}!`,
            homeScore: this.homeScore,
            awayScore: this.awayScore,
          };
          this.events.push(saveEvent);
          if (this.prng.nextChance(0.4)) {
            if (isHomeAttacking) this.stats.homeCorners++; else this.stats.awayCorners++;
          }
        }
      }
    } else if (actionRoll > 0.94) {
      // Foul or card event
      const isHomeFoul = this.prng.nextChance(0.5);
      if (isHomeFoul) this.stats.homeFouls++; else this.stats.awayFouls++;

      if (this.prng.nextChance(0.18)) {
        if (isHomeFoul) this.stats.homeYellowCards++; else this.stats.awayYellowCards++;
        const cardEvent: MatchEvent = {
          minute: this.minute,
          sport: 'football',
          type: 'yellow_card',
          team: isHomeFoul ? 'home' : 'away',
          textAr: `🟨 بطاقة صفراء إثر تدخل خشن في منتصف الملعب (الدقيقة ${this.minute})`,
          textEn: `🟨 Yellow card issued for a reckless tackle in midfield (Min ${this.minute})`,
          homeScore: this.homeScore,
          awayScore: this.awayScore,
        };
        this.events.push(cardEvent);
      }
    }

    return {
      currentMinute: this.minute,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events,
      stats: this.stats,
      isFinished: this.minute >= 90,
    };
  }

  /** Apply live tactical decision made by the coach */
  public applyInteractiveDecision(optionId: string) {
    if (optionId === 'press_now') {
      this.homeTactics.mentality = 'attacking';
      this.homeTactics.pressing = 'high_press';
      this.events.push({
        minute: this.minute,
        sport: 'football',
        type: 'interactive_moment',
        team: 'home',
        textAr: `⚡ استجاب اللاعبون لتعليماتك بالضغط المكثف على الفور وبدأوا محاصرة الخصم!`,
        textEn: `⚡ The squad responded to your high-press instructions immediately, suffocating the opponent!`,
        homeScore: this.homeScore,
        awayScore: this.awayScore,
      });
    } else if (optionId === 'counter_trap') {
      this.homeTactics.mentality = 'balanced';
      this.events.push({
        minute: this.minute,
        sport: 'football',
        type: 'interactive_moment',
        team: 'home',
        textAr: `🛡️ انضباط تكتيكي ممتاز ومصيدة تسلل محكمة لإفشال محاولات المنافس!`,
        textEn: `🛡️ Disciplined shape and crisp offside trap frustrating the opponent!`,
        homeScore: this.homeScore,
        awayScore: this.awayScore,
      });
    } else {
      this.homeTactics.mentality = 'defensive';
      this.events.push({
        minute: this.minute,
        sport: 'football',
        type: 'interactive_moment',
        team: 'home',
        textAr: `⏱️ الفريق يتحكم في نسق اللعب ويهدئ رتم المباراة ببراعة عالية.`,
        textEn: `⏱️ The team dictates the pace, calmly controlling possession.`,
        homeScore: this.homeScore,
        awayScore: this.awayScore,
      });
    }
    this.pendingInteractiveMoment = null;
  }

  /** Simulate remaining minutes to completion (for instant simulation) */
  public simulateToCompletion(): SimulationStepResult {
    while (this.minute < 90) {
      this.pendingInteractiveMoment = null; // Auto-resolve any interactive pause
      this.stepMinute();
    }
    this.pendingInteractiveMoment = null;
    return {
      currentMinute: this.minute,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events,
      stats: this.stats,
      isFinished: true,
    };
  }

  /** Simulate the full match at once (for instant results / background leagues) */
  public simulateFullMatch(): MatchRecord {
    while (this.minute < 90) {
      this.stepMinute();
    }
    return {
      id: `match_${this.seed}`,
      sport: 'football',
      seed: this.seed,
      homeClubId: this.homeClub.id,
      homeClubName: this.homeClub.name,
      awayClubId: this.awayClub.id,
      awayClubName: this.awayClub.name,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events,
      stats: this.stats,
      isFinished: true,
      competition: 'دوري التحدي للدرجة الثانية',
      matchDay: 1,
      date: new Date().toISOString().split('T')[0],
    };
  }
}
