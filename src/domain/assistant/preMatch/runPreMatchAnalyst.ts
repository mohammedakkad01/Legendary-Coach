/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LeagueStanding, PreMatchData } from '../../../types/game';
import type { OpponentTacticalScoutingCompact } from '../../livingWorld/types';
import type { RefereeProfile } from '../../referee/refereeTypes';
import { ASSISTANT_TUNING } from '../config/assistantTuning';
import { computeInformationConfidence } from '../confidence/computeConfidence';
import type { PreMatchAnalysis, AnalysisFinding } from '../types';

export interface PreMatchAnalystInput {
  readonly preMatch: PreMatchData;
  readonly analyticsDepartmentLevel: number;
  readonly opponentScouting?: OpponentTacticalScoutingCompact;
  readonly opponentStanding?: LeagueStanding;
  readonly assignedReferee?: RefereeProfile | null;
}

export function runPreMatchAnalyst(input: PreMatchAnalystInput): PreMatchAnalysis {
  const { preMatch, opponentScouting, opponentStanding, assignedReferee } = input;
  const opp = preMatch.opponentClub;
  const tactics = opp.footballTactics;

  const infoConf = computeInformationConfidence({
    isScouted: !!preMatch.isScouted,
    scoutAccuracy: preMatch.scoutAccuracy ?? 70,
    analyticsDepartmentLevel: input.analyticsDepartmentLevel,
    opponentScoutingSamples: opponentScouting?.samples ?? 0,
    opponentStarters: preMatch.opponentStarters,
  });

  const strengths: AnalysisFinding[] = [];
  const weaknesses: AnalysisFinding[] = [];
  const vulnerabilities: AnalysisFinding[] = [];

  if (preMatch.opponentAttackPower >= preMatch.userAttackPower + 3) {
    strengths.push({
      code: 'opp_high_attack',
      confidence: infoConf,
      params: { power: preMatch.opponentAttackPower },
    });
  }
  if (preMatch.opponentDefensePower <= preMatch.userDefensePower - 3) {
    weaknesses.push({
      code: 'opp_weak_defense',
      confidence: infoConf,
      params: { power: preMatch.opponentDefensePower },
    });
  }

  if (tactics.formation) {
    strengths.push({
      code: 'opp_formation_wide',
      confidence: Math.max(40, infoConf - 5),
      params: { formation: tactics.formation },
    });
  }
  if (tactics.pressing === 'high_press' || tactics.pressing === 'gegenpress') {
    strengths.push({ code: 'opp_high_press', confidence: infoConf });
  }

  const attGap = preMatch.opponentAttackPower - preMatch.userDefensePower;
  if (attGap >= 5) {
    vulnerabilities.push({
      code: 'opp_high_attack',
      confidence: infoConf,
      params: { power: preMatch.opponentAttackPower },
    });
  }

  const lineupIds = opp.footballLineup.filter(Boolean);
  const starters = lineupIds
    .map((id) => opp.footballSquad.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .sort((a, b) => b.overall - a.overall);
  const mainThreatPlayer = starters[0];
  const mainThreat: PreMatchAnalysis['mainThreat'] = mainThreatPlayer
    ? {
        code: 'key_striker',
        confidence: infoConf,
        params: { playerId: mainThreatPlayer.id, overall: mainThreatPlayer.overall },
      }
    : null;

  const keyPlayers = starters.slice(0, 3).map((p) => ({
    playerId: p.id,
    reasonCode: 'key_starter',
    confidence: infoConf,
  }));

  let w = 0;
  let d = 0;
  let l = 0;
  const form = opponentStanding?.form ?? [];
  for (const r of form) {
    if (r === 'W') w += 1;
    else if (r === 'D') d += 1;
    else l += 1;
  }
  const formSample = form.length;

  const tendencies: AnalysisFinding[] = [];
  if (opponentScouting && opponentScouting.samples >= 3) {
    if (opponentScouting.attackLeftShare >= 40) {
      tendencies.push({
        code: 'tendency_attack_left',
        confidence: Math.min(infoConf, 50 + opponentScouting.samples * 3),
        params: { share: opponentScouting.attackLeftShare, samples: opponentScouting.samples },
      });
    }
    if (opponentScouting.attackRightShare >= 40) {
      tendencies.push({
        code: 'tendency_attack_right',
        confidence: Math.min(infoConf, 50 + opponentScouting.samples * 3),
        params: { share: opponentScouting.attackRightShare, samples: opponentScouting.samples },
      });
    }
  }

  const setPieceLevel: 'low' | 'medium' | 'high' =
    tactics.mentality === 'attacking' || tactics.width === 'wide' ? 'medium' : 'low';
  const setPieceConf = preMatch.isScouted ? infoConf : Math.min(infoConf, 45);

  let refereeMode: PreMatchAnalysis['refereeMode'] = 'generic';
  let refereeProfile: PreMatchAnalysis['refereeProfile'];
  if (assignedReferee) {
    refereeMode = 'assigned';
    refereeProfile = {
      strictness: assignedReferee.strictness,
      cardTendency: assignedReferee.cardTendency,
      penaltyTendency: assignedReferee.penaltyTendency,
      foulSensitivity: assignedReferee.foulSensitivity,
    };
  } else {
    refereeProfile = { ...ASSISTANT_TUNING.confidence.genericRefereeProfile };
  }

  const uncertaintyNoteCode =
    !preMatch.isScouted && (opponentScouting?.samples ?? 0) < 3
      ? 'limited_intel'
      : undefined;

  return {
    opponentFormation: tactics.formation,
    strengths,
    weaknesses,
    mainThreat,
    defensiveVulnerabilities: vulnerabilities,
    setPieceDanger: { level: setPieceLevel, confidence: setPieceConf },
    keyPlayers,
    recentForm: { w, d, l, sampleSize: formSample },
    tendencies,
    refereeMode,
    refereeProfile,
    overallConfidence: infoConf,
    uncertaintyNoteCode,
  };
}
