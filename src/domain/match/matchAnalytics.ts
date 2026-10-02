/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Incremental match analytics from simulation tallies (compact storage).
 */

export type AttackZone = 'left' | 'center' | 'right';

export interface MatchAnalyticsSummary {
  readonly homePasses: number;
  readonly awayPasses: number;
  readonly homePassAccuracyPct: number;
  readonly awayPassAccuracyPct: number;
  readonly homeProgressivePasses: number;
  readonly awayProgressivePasses: number;
  readonly homeBigChances: number;
  readonly awayBigChances: number;
  readonly homePpda: number;
  readonly awayPpda: number;
  readonly homeTackles: number;
  readonly awayTackles: number;
  readonly homeInterceptions: number;
  readonly awayInterceptions: number;
  readonly homeDuelsWon: number;
  readonly homeDuelsLost: number;
  readonly awayDuelsWon: number;
  readonly awayDuelsLost: number;
  readonly homeRecoveries: number;
  readonly awayRecoveries: number;
  readonly homeAttThirdEntries: number;
  readonly awayAttThirdEntries: number;
  readonly homeAttLeft: number;
  readonly homeAttCenter: number;
  readonly homeAttRight: number;
  readonly awayAttLeft: number;
  readonly awayAttCenter: number;
  readonly awayAttRight: number;
  readonly homePressAttempts: number;
  readonly homePressSuccess: number;
  readonly awayPressAttempts: number;
  readonly awayPressSuccess: number;
  readonly homeSetPieceGoals: number;
  readonly awaySetPieceGoals: number;
  readonly homeCornerShots: number;
  readonly awayCornerShots: number;
  readonly homeFkShots: number;
  readonly awayFkShots: number;
  readonly homeThrowInShots: number;
  readonly awayThrowInShots: number;
}

export class MatchAnalyticsAccumulator {
  private homePasses = 0;
  private awayPasses = 0;
  private homePassCompleted = 0;
  private awayPassCompleted = 0;
  private homeProgressive = 0;
  private awayProgressive = 0;
  private homeBigChances = 0;
  private awayBigChances = 0;
  private homePressures = 0;
  private awayPressures = 0;
  private homePressSuccess = 0;
  private awayPressSuccess = 0;
  private homeTackles = 0;
  private awayTackles = 0;
  private homeInterceptions = 0;
  private awayInterceptions = 0;
  private homeDuelsWon = 0;
  private homeDuelsLost = 0;
  private awayDuelsWon = 0;
  private awayDuelsLost = 0;
  private homeRecoveries = 0;
  private awayRecoveries = 0;
  private homeAttThird = 0;
  private awayAttThird = 0;
  private homeAttLeft = 0;
  private homeAttCenter = 0;
  private homeAttRight = 0;
  private awayAttLeft = 0;
  private awayAttCenter = 0;
  private awayAttRight = 0;
  private homeSetPieceGoals = 0;
  private awaySetPieceGoals = 0;
  private homeCornerShots = 0;
  private awayCornerShots = 0;
  private homeFkShots = 0;
  private awayFkShots = 0;
  private homeThrowInShots = 0;
  private awayThrowInShots = 0;

  onSetPieceShot(
    isHome: boolean,
    kind: 'corner' | 'fk' | 'throw_in',
    onTarget: boolean,
    isGoal: boolean,
  ): void {
    if (isHome) {
      if (kind === 'corner') this.homeCornerShots++;
      else if (kind === 'fk') this.homeFkShots++;
      else this.homeThrowInShots++;
      if (isGoal) this.homeSetPieceGoals++;
    } else {
      if (kind === 'corner') this.awayCornerShots++;
      else if (kind === 'fk') this.awayFkShots++;
      else this.awayThrowInShots++;
      if (isGoal) this.awaySetPieceGoals++;
    }
    void onTarget;
  }

  onPossessionMinute(isHomePossession: boolean, passEstimate: number, passAccuracy: number): void {
    if (isHomePossession) {
      this.homePasses += passEstimate;
      this.homePassCompleted += Math.round(passEstimate * passAccuracy);
    } else {
      this.awayPasses += passEstimate;
      this.awayPassCompleted += Math.round(passEstimate * passAccuracy);
    }
  }

  onProgressivePass(isHome: boolean): void {
    if (isHome) this.homeProgressive++;
    else this.awayProgressive++;
  }

  onAttThirdEntry(isHome: boolean): void {
    if (isHome) this.homeAttThird++;
    else this.awayAttThird++;
  }

  onShot(isHome: boolean, zone: AttackZone, xg: number, onTarget: boolean): void {
    if (isHome) {
      if (zone === 'left') this.homeAttLeft++;
      else if (zone === 'right') this.homeAttRight++;
      else this.homeAttCenter++;
    } else {
      if (zone === 'left') this.awayAttLeft++;
      else if (zone === 'right') this.awayAttRight++;
      else this.awayAttCenter++;
    }
    if (xg >= 0.18 && onTarget) {
      if (isHome) this.homeBigChances++;
      else this.awayBigChances++;
    }
  }

  onPress(isHomePressing: boolean, success: boolean): void {
    if (isHomePressing) {
      this.homePressures++;
      if (success) this.homePressSuccess++;
    } else {
      this.awayPressures++;
      if (success) this.awayPressSuccess++;
    }
  }

  onDuel(isHome: boolean, won: boolean): void {
    if (isHome) {
      if (won) this.homeDuelsWon++;
      else this.homeDuelsLost++;
    } else {
      if (won) this.awayDuelsWon++;
      else this.awayDuelsLost++;
    }
  }

  onTackle(isHome: boolean): void {
    if (isHome) this.homeTackles++;
    else this.awayTackles++;
  }

  onInterception(isHome: boolean): void {
    if (isHome) this.homeInterceptions++;
    else this.awayInterceptions++;
  }

  onRecovery(isHome: boolean): void {
    if (isHome) this.homeRecoveries++;
    else this.awayRecoveries++;
  }

  exportPressStats(homeAttempts: number, homeSuccess: number, awayAttempts: number, awaySuccess: number): void {
    this.homePressures = homeAttempts;
    this.homePressSuccess = homeSuccess;
    this.awayPressures = awayAttempts;
    this.awayPressSuccess = awaySuccess;
  }

  finalize(): MatchAnalyticsSummary {
    const ppda = (pressures: number, oppPasses: number): number =>
      oppPasses > 0 ? Math.round((pressures / oppPasses) * 100) / 100 : pressures > 0 ? 99 : 0;

    const acc = (completed: number, total: number): number =>
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      homePasses: this.homePasses,
      awayPasses: this.awayPasses,
      homePassAccuracyPct: acc(this.homePassCompleted, this.homePasses),
      awayPassAccuracyPct: acc(this.awayPassCompleted, this.awayPasses),
      homeProgressivePasses: this.homeProgressive,
      awayProgressivePasses: this.awayProgressive,
      homeBigChances: this.homeBigChances,
      awayBigChances: this.awayBigChances,
      homePpda: ppda(this.homePressures, this.awayPasses),
      awayPpda: ppda(this.awayPressures, this.homePasses),
      homeTackles: this.homeTackles,
      awayTackles: this.awayTackles,
      homeInterceptions: this.homeInterceptions,
      awayInterceptions: this.awayInterceptions,
      homeDuelsWon: this.homeDuelsWon,
      homeDuelsLost: this.homeDuelsLost,
      awayDuelsWon: this.awayDuelsWon,
      awayDuelsLost: this.awayDuelsLost,
      homeRecoveries: this.homeRecoveries,
      awayRecoveries: this.awayRecoveries,
      homeAttThirdEntries: this.homeAttThird,
      awayAttThirdEntries: this.awayAttThird,
      homeAttLeft: this.homeAttLeft,
      homeAttCenter: this.homeAttCenter,
      homeAttRight: this.homeAttRight,
      awayAttLeft: this.awayAttLeft,
      awayAttCenter: this.awayAttCenter,
      awayAttRight: this.awayAttRight,
      homePressAttempts: this.homePressures,
      homePressSuccess: this.homePressSuccess,
      awayPressAttempts: this.awayPressures,
      awayPressSuccess: this.awayPressSuccess,
      homeSetPieceGoals: this.homeSetPieceGoals,
      awaySetPieceGoals: this.awaySetPieceGoals,
      homeCornerShots: this.homeCornerShots,
      awayCornerShots: this.awayCornerShots,
      homeFkShots: this.homeFkShots,
      awayFkShots: this.awayFkShots,
      homeThrowInShots: this.homeThrowInShots,
      awayThrowInShots: this.awayThrowInShots,
    };
  }
}
