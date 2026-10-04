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
import { calcAttackPower, calcDefensePower, buildSlotAssignments } from './matchPrediction';
import { resolveTacticalState, toFootballTactics } from '../domain/tactics/tacticalState';
import type { TacticalState } from '../domain/tactics/tacticalTypes';
import { TACTICAL_ENGINE as T, REFEREE as REF } from '../config/gameTuning';
import { clamp } from '../domain/shared/math';
import { describeTacticalChange } from '../i18n/liveTactics';
import type { RefereeProfile } from '../domain/referee/refereeTypes';
import { refereeMultipliers } from '../domain/referee/refereeMultipliers';
import { resolveRefereeForMatch } from '../domain/referee/createRefereeFromSeed';
import { commitIncident } from '../domain/var/applyVarDecision';
import { prepareGoalReview, preparePenaltyReview, prepareRedReview } from '../domain/var/prepareIncident';
import type { VARReview, VarMatchState, VarPlayerRef } from '../domain/var/varTypes';
import { varStreamSeed } from '../domain/var/varStream';
import { deriveTacticalInstructionsFromLegacy, ensureTacticalInstructions } from '../domain/tactics/migrateTacticsPhaseB';
import type { TacticalInstructions } from '../domain/tactics/instructionTypes';
import { averageRoleCompatibility } from '../domain/match/teamSimProfile';
import { pickPhaseForMinute } from '../domain/match/simWeights';
import { MatchAnalyticsAccumulator, type AttackZone } from '../domain/match/matchAnalytics';
import { generateAnalyticsConclusions } from '../domain/match/analyticsConclusions';
import {
  deltaInstructionModifiers,
  scaledPhaseAttackMultiplier,
  scaledRoleMultiplier,
} from '../domain/match/instructionSimEffect';
import { runSetPieceMinute } from '../domain/match/runSetPieceMinute';
import { setPieceGate, type SetPieceStreamType } from '../domain/match/setPieceRng';
import {
  applyInMatchAdaptation,
  createAdaptationState,
  observeSignals,
  type InMatchAdaptationState,
} from '../domain/tactics/opponentAdaptation/types';

export interface FootballEngineOptions {
  /** When false, corners/FK/throw-in side streams are skipped (main PRNG golden tests). Default true. */
  setPieceResolutionEnabled?: boolean;
}

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
  /**
   * Each side's resolved TacticalState — a private COPY, never the caller's
   * club.footballTactics object. The old engine held a direct reference and
   * mutated it in applyInteractiveDecision, which silently rewrote the
   * player's saved tactics after every match. Live changes here only ever
   * affect this match; getHomeTactics() is how the UI reads them back.
   */
  private homeTactics: TacticalState;
  private awayTactics: TacticalState;
  private readonly seed: number;
  private minute: number = 0;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private events: MatchEvent[] = [];
  private stats: MatchStats;
  private pendingInteractiveMoment: MatchEvent | null = null;
  private homeVipAttackBoost: number = 0;
  private homeVipDefenseBoost: number = 0;
  private readonly referee: RefereeProfile;
  private readonly yellowByPlayer = new Map<string, number>();
  /**
   * User matches pass true. Default false keeps pre-VAR results byte-identical.
   * This is a constructor argument, not a gameTuning constant.
   */
  private readonly varEnabled: boolean;
  /** VAR stream. Null while VAR is off so this match cannot draw from it. */
  private readonly varRng: SeededRandom | null;
  private varReviews: VARReview[] = [];
  private homeInstructions: TacticalInstructions;
  private awayInstructions: TacticalInstructions;
  private readonly analytics = new MatchAnalyticsAccumulator();
  private awayAdaptation: InMatchAdaptationState = createAdaptationState();
  private homePressAttempts = 0;
  private homePressSuccess = 0;
  private awayPressAttempts = 0;
  private awayPressSuccess = 0;
  private readonly homeInstructionBaseline: TacticalInstructions;
  private readonly awayInstructionBaseline: TacticalInstructions;
  private readonly homeRoleBaseline: number;
  private readonly awayRoleBaseline: number;
  private readonly setPieceResolutionEnabled: boolean;

  constructor(
    homeClub: Club,
    awayClub: Club,
    seed: number = Date.now(),
    homeTactics?: FootballTactics,
    awayTactics?: FootballTactics,
    homeVipAttackBoost: number = 0,
    homeVipDefenseBoost: number = 0,
    referee?: RefereeProfile,
    varEnabled: boolean = false,
    engineOptions?: FootballEngineOptions,
  ) {
    this.seed = seed;
    this.prng = new SeededRandom(seed);
    this.homeClub = homeClub;
    this.awayClub = awayClub;
    const homeTacticsResolved = homeTactics || homeClub.footballTactics;
    const awayTacticsResolved = awayTactics || awayClub.footballTactics;
    this.homeTactics = resolveTacticalState(homeTacticsResolved);
    this.awayTactics = resolveTacticalState(awayTacticsResolved);
    this.homeInstructions =
      ensureTacticalInstructions(homeTacticsResolved).tacticalInstructions ??
      deriveTacticalInstructionsFromLegacy(homeTacticsResolved);
    this.awayInstructions =
      ensureTacticalInstructions(awayTacticsResolved).tacticalInstructions ??
      deriveTacticalInstructionsFromLegacy(awayTacticsResolved);
    this.homeInstructionBaseline = deriveTacticalInstructionsFromLegacy(homeTacticsResolved);
    this.awayInstructionBaseline = deriveTacticalInstructionsFromLegacy(awayTacticsResolved);
    this.homeRoleBaseline = averageRoleCompatibility(homeClub, homeClub.footballTactics.playerRoles);
    this.awayRoleBaseline = averageRoleCompatibility(awayClub, awayClub.footballTactics.playerRoles);
    this.setPieceResolutionEnabled = engineOptions?.setPieceResolutionEnabled !== false;
    this.homeVipAttackBoost = homeVipAttackBoost;
    this.homeVipDefenseBoost = homeVipDefenseBoost;
    this.referee = resolveRefereeForMatch(referee, seed);
    this.varEnabled = varEnabled;
    this.varRng = varEnabled ? new SeededRandom(varStreamSeed(seed)) : null;

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
      homeRedCards: 0,
      awayRedCards: 0,
      homeXg: 0.0,
      awayXg: 0.0,
    };
  }

  /**
   * How many attack/defense points a resolved TacticalState is worth, as a
   * continuous function of its sliders — see config/gameTuning.ts
   * (TACTICAL_ENGINE) for the coefficients and why this replaced the old
   * five-step mentality/pressing table.
   */
  private tacticalBonus(tactics: TacticalState): { attack: number; defense: number } {
    const mid = 50;
    let attack =
      (tactics.attackingIntensity - mid) * T.attackingIntensityToAttack +
      (tactics.defensiveIntensity - mid) * T.defensiveIntensityToAttack +
      (tactics.possessionFocus - mid) * T.possessionFocusToAttack +
      (tactics.directPlay - mid) * T.directPlayToAttack +
      (tactics.counterAttacking - mid) * T.counterAttackingToAttack +
      (tactics.defensiveLine - mid) * T.defensiveLineToAttack;
    let defense =
      (tactics.defensiveIntensity - mid) * T.defensiveIntensityToDefense -
      (tactics.attackingIntensity - mid) * T.attackingIntensityToDefenseCost -
      (tactics.defensiveLine - mid) * T.defensiveLineToDefenseCost;

    if (tactics.offsideTrap) {
      defense += T.offsideTrapDefenseBonus;
      attack -= T.offsideTrapAttackCost;
    }

    return {
      attack: clamp(attack, -T.maxAttackBonus, T.maxAttackBonus),
      defense: clamp(defense, -T.maxDefenseBonus, T.maxDefenseBonus),
    };
  }

  /** Calculate team power (legacy Phase 3 path — keeps RNG sequence stable for regression). */
  private calculateTeamPower(club: Club, tactics: TacticalState, isHome: boolean) {
    const assignments = buildSlotAssignments(club);
    const lineup = assignments.map((a) => a.player);

    const baseAtk = calcAttackPower(assignments);
    const baseDef = calcDefensePower(assignments);

    const bonus = this.tacticalBonus(tactics);

    const homeAdvantage = isHome ? T.homeAdvantage : 0;
    const vipAtk = isHome ? (baseAtk * (this.homeVipAttackBoost / 100)) : 0;
    const vipDef = isHome ? (baseDef * (this.homeVipDefenseBoost / 100)) : 0;

    return {
      attack: Math.round(baseAtk + bonus.attack + homeAdvantage + vipAtk),
      defense: Math.round(baseDef + bonus.defense + homeAdvantage + vipDef),
      lineup,
    };
  }

  private sideInstructionContext(club: Club, instructions: TacticalInstructions, isHome: boolean) {
    const baseline = isHome ? this.homeInstructionBaseline : this.awayInstructionBaseline;
    const roleBaseline = isHome ? this.homeRoleBaseline : this.awayRoleBaseline;
    const instr = deltaInstructionModifiers(instructions, baseline);
    const roleMul = scaledRoleMultiplier(
      averageRoleCompatibility(club, club.footballTactics.playerRoles),
      roleBaseline,
    );
    const phase = pickPhaseForMinute(this.minute, this.stats.homePossession);
    const phaseAttackMul = scaledPhaseAttackMultiplier(phase);
    return { instr, roleMul, phase, phaseAttackMul };
  }

  private attackZoneForShooter(club: Club, shooterId: string | undefined, flankBias: number): AttackZone {
    if (!shooterId) return flankBias > 0.05 ? 'left' : flankBias < -0.05 ? 'right' : 'center';
    const slot = buildSlotAssignments(club).find((a) => a.player.id === shooterId);
    const label = slot?.assignedPosition.toUpperCase() ?? '';
    if (label.includes('L')) return 'left';
    if (label.includes('R')) return 'right';
    if (flankBias > 0.08) return 'left';
    if (flankBias < -0.08) return 'right';
    return 'center';
  }

  private refreshAwayAdaptation(): void {
    const summary = this.analytics.finalize();
    this.awayAdaptation = observeSignals(
      this.awayAdaptation,
      {
        homeAttLeft: summary.homeAttLeft,
        homeAttRight: summary.homeAttRight,
        homeAttCenter: summary.homeAttCenter,
        awayAttLeft: summary.awayAttLeft,
        awayAttRight: summary.awayAttRight,
        awayAttCenter: summary.awayAttCenter,
        homePressSuccess: this.homePressSuccess,
        homePressAttempts: this.homePressAttempts,
        awayPressSuccess: this.awayPressSuccess,
        awayPressAttempts: this.awayPressAttempts,
        homePossessionPct: this.stats.homePossession,
      },
      true,
    );
    this.awayInstructions = applyInMatchAdaptation(this.awayInstructions, this.awayAdaptation, true);
  }

  private applySetPieceStream(streamType: SetPieceStreamType, isHomeAttacking: boolean): void {
    if (!this.setPieceResolutionEnabled) return;
    const result = runSetPieceMinute(
      this.seed,
      this.minute,
      streamType,
      isHomeAttacking,
      this.homeClub,
      this.awayClub,
    );
    const kind = streamType === 'corner' ? 'corner' : streamType === 'fk_attack' ? 'fk' : 'throw_in';
    this.analytics.onSetPieceShot(isHomeAttacking, kind, result.isOnTarget, result.isGoal);
    const zone: AttackZone = 'center';
    if (result.isOnTarget || result.isGoal) {
      if (isHomeAttacking) {
        this.stats.homeShots++;
        if (result.isOnTarget) this.stats.homeShotsOnTarget++;
        this.stats.homeXg = +(this.stats.homeXg + result.xg).toFixed(2);
      } else {
        this.stats.awayShots++;
        if (result.isOnTarget) this.stats.awayShotsOnTarget++;
        this.stats.awayXg = +(this.stats.awayXg + result.xg).toFixed(2);
      }
      this.analytics.onShot(isHomeAttacking, zone, result.xg, result.isOnTarget);
    }
    if (!result.isGoal) {
      if (result.isOnTarget) {
        this.events.push({
          minute: this.minute,
          sport: 'football',
          type: 'save',
          team: isHomeAttacking ? 'away' : 'home',
          textAr: `🧤 تصدٍ من ركلة ثابتة (${kind}) — الدقيقة ${this.minute}`,
          textEn: `🧤 Set-piece save (${kind}) — min ${this.minute}`,
          homeScore: this.homeScore,
          awayScore: this.awayScore,
          setPieceKind: kind,
        });
      }
      return;
    }
    if (isHomeAttacking) this.homeScore++;
    else this.awayScore++;
    this.events.push({
      minute: this.minute,
      sport: 'football',
      type: 'goal',
      team: isHomeAttacking ? 'home' : 'away',
      playerId: result.scorerId,
      playerName: result.scorerName ?? 'Player',
      textAr: `⚽ هدف من ركلة ثابتة! ${result.scorerName ?? ''} (${this.homeScore}-${this.awayScore})`,
      textEn: `⚽ Set-piece goal! ${result.scorerNameEn ?? 'Player'} (${this.homeScore}-${this.awayScore})`,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      setPieceKind: kind,
    });
    if (this.varEnabled) this.reviewOpenPlayGoal();
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
    const homeCtx = this.sideInstructionContext(this.homeClub, this.homeInstructions, true);
    const awayCtx = this.sideInstructionContext(this.awayClub, this.awayInstructions, false);

    // Possession dynamic shift
    const possessionDelta = (homePower.attack - awayPower.attack) * 0.2 + (this.prng.nextFloat() * 4 - 2);
    this.stats.homePossession = Math.min(78, Math.max(22, Math.round(50 + possessionDelta)));
    this.stats.awayPossession = 100 - this.stats.homePossession;

    const isHomePossession = this.stats.homePossession >= this.stats.awayPossession;
    const possInstr = isHomePossession ? this.homeInstructions : this.awayInstructions;
    const passEst = 1 + Math.floor(possInstr.inPossession.tempo / 35);
    const passAcc = Math.min(0.92, Math.max(0.55, 0.62 + (100 - possInstr.inPossession.passingRisk) * 0.003));
    this.analytics.onPossessionMinute(isHomePossession, passEst, passAcc);
    if (homeCtx.phase === 'final_third' && isHomePossession) this.analytics.onAttThirdEntry(true);
    if (awayCtx.phase === 'final_third' && !isHomePossession) this.analytics.onAttThirdEntry(false);

    if (this.minute % 15 === 0) this.refreshAwayAdaptation();

    if (setPieceGate(this.seed, this.minute, 'throw_in', 0.022)) {
      this.applySetPieceStream('throw_in', isHomePossession);
    }

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
    const shotThreshold = 0.14;

    const pressSynthetic = (((this.seed >>> 0) ^ Math.imul(this.minute, 991)) % 1000) / 1000;
    if (pressSynthetic < 0.08 + this.homeInstructions.outOfPossession.pressingIntensity / 500) {
      this.homePressAttempts++;
      const successSynthetic = (((this.seed >>> 0) ^ Math.imul(this.minute, 313)) % 1000) / 1000;
      if (successSynthetic < 0.35 + this.homeInstructions.outOfPossession.pressingIntensity / 250) {
        this.homePressSuccess++;
        this.analytics.onPress(true, true);
        this.analytics.onRecovery(true);
      } else {
        this.analytics.onPress(true, false);
      }
    }
    if (actionRoll < shotThreshold) {
      // An attacking event occurred
      const isHomeAttacking = this.prng.nextFloat() < (this.stats.homePossession / 100);
      const attackingClub = isHomeAttacking ? this.homeClub : this.awayClub;
      const defendingClub = isHomeAttacking ? this.awayClub : this.homeClub;
      const attackingPower = isHomeAttacking ? homePower : awayPower;
      const defendingPower = isHomeAttacking ? awayPower : homePower;

      const attackingPlayers = attackingPower.lineup.filter(p => p.position !== 'GK');
      const shooter = this.prng.pick(attackingPlayers.length > 0 ? attackingPlayers : attackingClub.footballSquad);

      const atkCtx = isHomeAttacking ? homeCtx : awayCtx;
      const defCtx = isHomeAttacking ? awayCtx : homeCtx;
      let ratio = Math.max(0.4, Math.min(2.5, attackingPower.attack / Math.max(30, defendingPower.defense)));
      ratio *= atkCtx.roleMul * atkCtx.phaseAttackMul;
      ratio *= 1 + defCtx.instr.throughBallRisk * 0.25;
      const xgBase = 0.08 * atkCtx.instr.xgPerShotMult;
      const shotSuccessThreshold = Math.min(0.55, Math.max(0.12, 0.28 * Math.pow(ratio, 2.0)));
      const onTargetBase = 0.44 + (attackingPower.attack - defendingPower.defense) * 0.005;
      const onTarget =
        this.prng.nextFloat() <
        Math.min(0.65, Math.max(0.35, onTargetBase * atkCtx.instr.onTargetMult));

      const zone = this.attackZoneForShooter(
        attackingClub,
        shooter?.id,
        isHomeAttacking ? homeCtx.instr.flankBias : awayCtx.instr.flankBias,
      );

      if (isHomeAttacking) {
        this.stats.homeShots++;
        this.stats.homeXg = +(this.stats.homeXg + xgBase).toFixed(2);
        if (onTarget) this.stats.homeShotsOnTarget++;
      } else {
        this.stats.awayShots++;
        this.stats.awayXg = +(this.stats.awayXg + xgBase).toFixed(2);
        if (onTarget) this.stats.awayShotsOnTarget++;
      }
      this.analytics.onShot(isHomeAttacking, zone, xgBase, onTarget);
      if (zone !== 'center') this.analytics.onProgressivePass(isHomeAttacking);
      const duelSynthetic = (((this.seed >>> 0) ^ Math.imul(this.minute, 1187)) % 1000) / 1000;
      this.analytics.onDuel(isHomeAttacking, duelSynthetic < 0.48);
      if ((((this.seed >>> 0) ^ Math.imul(this.minute, 917)) % 100) < 12) {
        this.analytics.onTackle(!isHomeAttacking);
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
          if (this.varEnabled) this.reviewOpenPlayGoal();
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
            if (isHomeAttacking) this.stats.homeCorners++;
            else this.stats.awayCorners++;
            this.applySetPieceStream('corner', isHomeAttacking);
          }
        }
      }
    } else if (this.prng.nextChance(refereeMultipliers(this.referee).foulMinute)) {
      this.processDisciplineIncident();
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

  /**
   * Merge `changes` into a resolved TacticalState, re-deriving every slider
   * fresh from the (possibly just-changed) enums. The engine only ever
   * receives enum-level edits from the UI (Formation/Mentality/Tempo/
   * Pressing/Width, and the three interactive-moment presets below) — there
   * is no slider-level control yet — so always re-deriving is correct: it's
   * exactly what should happen when the coach picks a new Mentality. If a
   * later phase adds direct slider editing, this needs to only strip the
   * sliders whose OWN enum actually changed, not all of them.
   */
  private mergeTactics(current: TacticalState, changes: Partial<FootballTactics>): TacticalState {
    const merged: FootballTactics = {
      ...toFootballTactics(current),
      ...changes,
      defensiveLine: undefined,
      defensiveIntensity: undefined,
      attackingIntensity: undefined,
      counterAttacking: undefined,
      possessionFocus: undefined,
      directPlay: undefined,
      timeWasting: undefined,
    };
    return resolveTacticalState(merged);
  }

  /**
   * Apply a live tactical change for the home side (formation, mentality,
   * tempo, pressing, width, offside trap — any subset). Takes effect from the
   * NEXT stepMinute() tick: calculateTeamPower() reads this.homeTactics fresh
   * every minute, so nothing needs to pause. Pushes a 'tactical_change' event
   * the UI can show as an "applied" confirmation. This only ever changes
   * THIS match's tactics — never club.footballTactics itself.
   */
  public applyLiveTactics(changes: Partial<FootballTactics>): MatchEvent {
    this.homeTactics = this.mergeTactics(this.homeTactics, changes);
    const mergedFootball = { ...toFootballTactics(this.homeTactics), ...changes };
    if (changes.tacticalInstructions) {
      this.homeInstructions = changes.tacticalInstructions;
    } else {
      this.homeInstructions =
        ensureTacticalInstructions(mergedFootball).tacticalInstructions ??
        deriveTacticalInstructionsFromLegacy(mergedFootball);
    }
    const { textAr, textEn } = describeTacticalChange(changes);
    const event: MatchEvent = {
      minute: this.minute,
      sport: 'football',
      type: 'tactical_change',
      team: 'home',
      textAr,
      textEn,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      tacticalChange: changes,
    };
    this.events.push(event);
    return event;
  }

  /** The home side's tactics as currently resolved for this match (never mutates the caller's club). */
  public getHomeTactics(): FootballTactics {
    return toFootballTactics(this.homeTactics);
  }

  /** The exact seed this match was simulated with — persist it so a saved MatchRecord can be replayed. */
  public getSeed(): number {
    return this.seed;
  }

  public getReferee(): RefereeProfile {
    return this.referee;
  }

  /**
   * Read-only snapshot of in-match analytics (zones, press, set pieces, etc.).
   * Does not alter scores, events, or simulation RNG — same accumulator read path
   * as full-time analytics, without generating conclusions.
   */
  public getPartialAnalytics(): import('../domain/match/matchAnalytics').MatchAnalyticsSummary {
    this.analytics.exportPressStats(
      this.homePressAttempts,
      this.homePressSuccess,
      this.awayPressAttempts,
      this.awayPressSuccess,
    );
    return this.analytics.finalize();
  }

  public getMatchAnalytics() {
    this.analytics.exportPressStats(
      this.homePressAttempts,
      this.homePressSuccess,
      this.awayPressAttempts,
      this.awayPressSuccess,
    );
    const analytics = this.analytics.finalize();
    return {
      analytics,
      analyticsConclusions: generateAnalyticsConclusions(this.stats, analytics, true),
    };
  }

  /** Reviews opened for this match. Empty when VAR was not enabled. */
  public getVarReviews(): VARReview[] {
    return this.varReviews.map((review) => ({ ...review }));
  }

  private varState(): VarMatchState {
    return {
      matchId: `match_${this.seed}`,
      minute: this.minute,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events.map((event) => ({ ...event })),
      stats: { ...this.stats },
      varReviews: this.varReviews.map((review) => ({ ...review })),
    };
  }

  private adoptVar(state: VarMatchState): void {
    this.homeScore = state.homeScore;
    this.awayScore = state.awayScore;
    this.events = state.events.map((event) => ({ ...event }));
    this.stats = { ...state.stats };
    this.varReviews = state.varReviews.map((review) => ({ ...review }));
  }

  /**
   * Run one VAR decision. A throw rolls the minute back to the snapshot taken
   * after the referee's call and before this review, so the match continues.
   */
  private runVar(
    prepare: (before: VarMatchState, rng: SeededRandom) => { prepared: VarMatchState; review: VARReview | null },
  ): void {
    const rng = this.varRng;
    if (!this.varEnabled || !rng) return;
    const before = this.varState();
    try {
      const { prepared, review } = prepare(before, rng);
      this.adoptVar(commitIncident(before, prepared, review));
    } catch (err) {
      console.error('[VAR] review failed; match continues unchanged', err);
      this.adoptVar(before);
    }
  }

  private reviewOpenPlayGoal(): void {
    const index = this.events.length - 1;
    this.runVar((before, rng) => prepareGoalReview(before, index, rng, this.referee));
  }

  private reviewPenalty(taker: VarPlayerRef): void {
    const index = this.events.length - 1;
    this.runVar((before, rng) => preparePenaltyReview(before, index, rng, this.referee, taker));
  }

  private reviewRed(): void {
    const index = this.events.length - 1;
    this.runVar((before, rng) => prepareRedReview(before, index, rng, this.referee));
  }

  private pickDisciplinePlayer(isHomeFoul: boolean) {
    const club = isHomeFoul ? this.homeClub : this.awayClub;
    const starters = club.footballLineup
      .map((id) => club.footballSquad.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.position !== 'GK');
    const pool = starters.length > 0 ? starters : club.footballSquad.filter((p) => p.position !== 'GK');
    return pool.length > 0 ? this.prng.pick(pool) : this.prng.pick(club.footballSquad);
  }

  private pushDisciplineEvent(
    type: 'foul' | 'yellow_card' | 'red_card',
    team: 'home' | 'away',
    player: { id: string; name: string; nameEn: string },
    textAr: string,
    textEn: string,
  ): void {
    this.events.push({
      minute: this.minute,
      sport: 'football',
      type,
      team,
      playerId: player.id,
      playerName: player.name,
      textAr,
      textEn,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
    });
  }

  private processDisciplineIncident(): void {
    const mul = refereeMultipliers(this.referee);
    const isHomeFoul = this.prng.nextChance(0.5);
    if (isHomeFoul) this.stats.homeFouls++;
    else this.stats.awayFouls++;

    if (this.prng.nextChance(mul.advantagePlay)) return;

    if (this.prng.nextChance(mul.penaltyGivenFoul)) {
      this.resolvePenalty(isHomeFoul);
      return;
    }

    if (this.prng.nextChance(mul.redGivenFoul)) {
      const player = this.pickDisciplinePlayer(isHomeFoul);
      this.issueDirectRed(isHomeFoul, player);
      return;
    }

    if (this.prng.nextChance(mul.yellowGivenFoul)) {
      const player = this.pickDisciplinePlayer(isHomeFoul);
      this.issueYellow(isHomeFoul, player);
    }

    if (setPieceGate(this.seed, this.minute, 'fk_attack', 0.08)) {
      this.applySetPieceStream('fk_attack', !isHomeFoul);
    }
  }

  private issueYellow(isHomeFoul: boolean, player: { id: string; name: string; nameEn: string }): void {
    const prev = this.yellowByPlayer.get(player.id) ?? 0;
    if (prev >= 1) {
      this.issueDirectRed(isHomeFoul, player, true);
      return;
    }
    this.yellowByPlayer.set(player.id, prev + 1);
    if (isHomeFoul) this.stats.homeYellowCards++;
    else this.stats.awayYellowCards++;
    this.pushDisciplineEvent(
      'yellow_card',
      isHomeFoul ? 'home' : 'away',
      player,
      `🟨 بطاقة صفراء لـ ${player.name} (الدقيقة ${this.minute})`,
      `🟨 Yellow card for ${player.nameEn} (min ${this.minute})`,
    );
  }

  private issueDirectRed(
    isHomeFoul: boolean,
    player: { id: string; name: string; nameEn: string },
    secondYellow = false,
  ): void {
    if (isHomeFoul) this.stats.homeRedCards++;
    else this.stats.awayRedCards++;
    const ar = secondYellow
      ? `🟥 بطاقة حمراء (صفراء ثانية) لـ ${player.name} (الدقيقة ${this.minute})`
      : `🟥 بطاقة حمراء مباشرة لـ ${player.name} (الدقيقة ${this.minute})`;
    const en = secondYellow
      ? `🟥 Red card (second yellow) for ${player.nameEn} (min ${this.minute})`
      : `🟥 Straight red for ${player.nameEn} (min ${this.minute})`;
    this.pushDisciplineEvent('red_card', isHomeFoul ? 'home' : 'away', player, ar, en);
    if (this.varEnabled) this.reviewRed();
  }

  private resolvePenalty(isHomeFoul: boolean): void {
    const benefitingHome = !isHomeFoul;
    const takerClub = benefitingHome ? this.homeClub : this.awayClub;
    const pool = takerClub.footballSquad.filter((p) => p.position !== 'GK').slice(0, 11);
    const designated = takerClub.footballSquad.find((p) => p.id === takerClub.footballTactics.penaltyTakerId);
    const taker =
      designated && designated.position !== 'GK'
        ? designated
        : this.prng.pick(pool.length > 0 ? pool : takerClub.footballSquad);
    const scored = this.prng.nextChance(REF.penaltyGoalChance);
    if (scored) {
      if (benefitingHome) this.homeScore++;
      else this.awayScore++;
    }
    const textAr = scored
      ? `⚽ ركلة جزاء! ${taker.name} يسجل (الدقيقة ${this.minute}) (${this.homeScore}-${this.awayScore})`
      : `❌ ركلة جزاء ضائعة — ${taker.name} (الدقيقة ${this.minute})`;
    const textEn = scored
      ? `⚽ Penalty scored by ${taker.nameEn} (min ${this.minute}) (${this.homeScore}-${this.awayScore})`
      : `❌ Penalty missed by ${taker.nameEn} (min ${this.minute})`;
    this.events.push({
      minute: this.minute,
      sport: 'football',
      type: scored ? 'goal' : 'foul',
      team: benefitingHome ? 'home' : 'away',
      playerId: taker.id,
      playerName: taker.name,
      textAr,
      textEn,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
    });
    if (this.varEnabled && taker) {
      this.reviewPenalty({ id: taker.id, name: taker.name, nameEn: taker.nameEn });
    }
  }

  /** Apply live tactical decision made by the coach */
  public applyInteractiveDecision(optionId: string) {
    const presets: Record<string, Partial<FootballTactics>> = {
      press_now: { mentality: 'attacking', pressing: 'high_press' },
      counter_trap: { mentality: 'balanced' },
    };
    const changes = presets[optionId] ?? { mentality: 'defensive' };
    this.homeTactics = this.mergeTactics(this.homeTactics, changes);

    const flavor: Record<string, { textAr: string; textEn: string }> = {
      press_now: {
        textAr: '⚡ استجاب اللاعبون لتعليماتك بالضغط المكثف على الفور وبدأوا محاصرة الخصم!',
        textEn: '⚡ The squad responded to your high-press instructions immediately, suffocating the opponent!',
      },
      counter_trap: {
        textAr: '🛡️ انضباط تكتيكي ممتاز ومصيدة تسلل محكمة لإفشال محاولات المنافس!',
        textEn: '🛡️ Disciplined shape and crisp offside trap frustrating the opponent!',
      },
      lock_down: {
        textAr: '⏱️ الفريق يتحكم في نسق اللعب ويهدئ رتم المباراة ببراعة عالية.',
        textEn: '⏱️ The team dictates the pace, calmly controlling possession.',
      },
    };
    const { textAr, textEn } = flavor[optionId] ?? flavor.lock_down;
    this.events.push({
      minute: this.minute,
      sport: 'football',
      type: 'interactive_moment',
      team: 'home',
      textAr,
      textEn,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      tacticalChange: changes,
    });
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
    this.analytics.exportPressStats(
      this.homePressAttempts,
      this.homePressSuccess,
      this.awayPressAttempts,
      this.awayPressSuccess,
    );
    const analytics = this.analytics.finalize();
    const analyticsConclusions = generateAnalyticsConclusions(this.stats, analytics, true);
    return {
      id: `match_${this.seed}`,
      sport: 'football',
      seed: this.seed,
      referee: this.referee,
      homeClubId: this.homeClub.id,
      homeClubName: this.homeClub.name,
      awayClubId: this.awayClub.id,
      awayClubName: this.awayClub.name,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events,
      stats: this.stats,
      analytics,
      analyticsConclusions,
      ...(this.varEnabled ? { varReviews: this.getVarReviews() } : {}),
      isFinished: true,
      competition: 'دوري التحدي للدرجة الثانية',
      matchDay: 1,
      date: new Date().toISOString().split('T')[0],
    };
  }
}
