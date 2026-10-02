/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sole applicator for living-world StateChange operations.
 */

import { clampMorale } from './playerPsychology';
import { addPlayerMemory, decayPlayerMemories } from './playerMemory';
import { addClubMemory } from './clubMemory';
import { applyManagerReputationChange } from './managerCareer';
import { findRelationship } from './relationships';
import { appendToEventLog } from './events/eventLog';
import type { Player } from '../../types/game';
import type { ReducerInput, ReducerResult, StateChange, SquadRelationship } from './types';
import { applyMentalDeltas, clampMentalState } from './playerPsychology';

function updatePlayer(players: Player[], playerId: string, updater: (p: Player) => Player): Player[] {
  return players.map((p) => (p.id === playerId ? updater(p) : p));
}

function applyOne(input: ReducerInput, change: StateChange): ReducerInput {
  const { livingWorld, players } = input;

  switch (change.kind) {
    case 'changePlayerMorale': {
      const nextPlayers = updatePlayer(players, change.playerId, (p) => ({
        ...p,
        morale: clampMorale(p.morale + change.delta),
      }));
      return { livingWorld, players: nextPlayers };
    }
    case 'changePlayerMentalState': {
      const nextPlayers = updatePlayer(players, change.playerId, (p) => {
        const current = p.mentalState ?? {
          confidence: 50,
          happiness: 50,
          frustration: 40,
          pressure: 45,
        };
        const merged = clampMentalState({ ...current, ...change.patch });
        return { ...p, mentalState: merged };
      });
      return { livingWorld, players: nextPlayers };
    }
    case 'changePlayerMentalStateDelta': {
      const nextPlayers = updatePlayer(players, change.playerId, (p) => {
        const current = p.mentalState ?? {
          confidence: 50,
          happiness: 50,
          frustration: 40,
          pressure: 45,
        };
        const merged = applyMentalDeltas(current, change.delta);
        return { ...p, mentalState: merged };
      });
      return { livingWorld, players: nextPlayers };
    }
    case 'changeManagerRelationship': {
      const nextPlayers = updatePlayer(players, change.playerId, (p) => {
        const current = p.managerRelationship ?? { trust: 50, respect: 50, satisfaction: 50 };
        const merged = {
          trust: clamp(change.patch.trust ?? current.trust, 0, 100),
          respect: clamp(change.patch.respect ?? current.respect, 0, 100),
          satisfaction: clamp(change.patch.satisfaction ?? current.satisfaction, 0, 100),
        };
        return { ...p, managerRelationship: merged };
      });
      return { livingWorld, players: nextPlayers };
    }
    case 'changePlayerCareerState': {
      const nextPlayers = updatePlayer(players, change.playerId, (p) => {
        const current = p.careerState ?? {
          playingTimeExpectation: 50,
          developmentSatisfaction: 50,
          contractSatisfaction: 50,
          nationalTeamAmbition: 45,
          transferDesire: 40,
        };
        const patch = change.patch;
        const merged = {
          playingTimeExpectation: clamp(patch.playingTimeExpectation ?? current.playingTimeExpectation, 0, 100),
          developmentSatisfaction: clamp(patch.developmentSatisfaction ?? current.developmentSatisfaction, 0, 100),
          contractSatisfaction: clamp(patch.contractSatisfaction ?? current.contractSatisfaction, 0, 100),
          nationalTeamAmbition: clamp(patch.nationalTeamAmbition ?? current.nationalTeamAmbition, 0, 100),
          transferDesire: clamp(patch.transferDesire ?? current.transferDesire, 0, 100),
        };
        return { ...p, careerState: merged };
      });
      return { livingWorld, players: nextPlayers };
    }
    case 'addPlayerMemory': {
      const existing = livingWorld.playerMemories[change.playerId] ?? [];
      return {
        livingWorld: {
          ...livingWorld,
          playerMemories: {
            ...livingWorld.playerMemories,
            [change.playerId]: addPlayerMemory(existing, change.entry),
          },
        },
        players,
      };
    }
    case 'decayPlayerMemories': {
      const existing = livingWorld.playerMemories[change.playerId] ?? [];
      return {
        livingWorld: {
          ...livingWorld,
          playerMemories: {
            ...livingWorld.playerMemories,
            [change.playerId]: decayPlayerMemories(existing, change.factor),
          },
        },
        players,
      };
    }
    case 'addClubMemory':
      return {
        livingWorld: {
          ...livingWorld,
          clubMemory: addClubMemory(livingWorld.clubMemory, change.entry),
        },
        players,
      };
    case 'changeManagerReputation':
      return {
        livingWorld: {
          ...livingWorld,
          managerCareer: applyManagerReputationChange(livingWorld.managerCareer, change.delta, {
            eventType: change.eventType,
            delta: change.delta,
            gameEventId: change.gameEventId,
            season: change.season,
          }),
        },
        players,
      };
    case 'addRelationship': {
      const rel = change.relationship;
      if (findRelationship(livingWorld.relationships, rel.playerAId, rel.playerBId)) {
        return input;
      }
      return {
        livingWorld: {
          ...livingWorld,
          relationships: [...livingWorld.relationships, rel],
        },
        players,
      };
    }
    case 'updateRelationshipStrength': {
      const [a, b] = relPair(change.playerAId, change.playerBId);
      const nextRels = livingWorld.relationships.map((r) => {
        if (r.playerAId === a && r.playerBId === b) {
          return { ...r, strength: clamp(r.strength + change.delta, 0, 100) };
        }
        return r;
      });
      return { livingWorld: { ...livingWorld, relationships: nextRels }, players };
    }
    case 'appendGameEvent':
      return {
        livingWorld: {
          ...livingWorld,
          eventLog: appendToEventLog(livingWorld.eventLog, change.event),
        },
        players,
      };
    case 'addNotification':
      return {
        livingWorld: {
          ...livingWorld,
          notifications: [...livingWorld.notifications, change.notification].slice(-100),
        },
        players,
      };
    case 'mergeNotifications': {
      const byKey = new Map(livingWorld.notifications.map((n) => [n.dedupeKey, n]));
      for (const n of change.notifications) {
        byKey.set(n.dedupeKey, n);
      }
      return {
        livingWorld: {
          ...livingWorld,
          notifications: Array.from(byKey.values()).slice(-100),
        },
        players,
      };
    }
    case 'setLivingWorldSeason':
      return {
        livingWorld: { ...livingWorld, currentSeason: change.season },
        players,
      };
    case 'setManagerTacticalIdentity':
      return {
        livingWorld: {
          ...livingWorld,
          managerCareer: { ...livingWorld.managerCareer, tacticalIdentity: change.identity },
        },
        players,
      };
    case 'appendTacticalUsage': {
      const history = livingWorld.managerCareer.tacticalUsageHistory ?? [];
      const next = [...history, change.sample].slice(-24);
      return {
        livingWorld: {
          ...livingWorld,
          managerCareer: { ...livingWorld.managerCareer, tacticalUsageHistory: next },
        },
        players,
      };
    }
    case 'mergeOpponentScouting': {
      const prev = livingWorld.opponentTacticalScouting ?? {};
      return {
        livingWorld: {
          ...livingWorld,
          opponentTacticalScouting: { ...prev, [change.entry.opponentClubId]: change.entry },
        },
        players,
      };
    }
    default: {
      const _exhaustive: never = change;
      return _exhaustive;
    }
  }
}

function relPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function applyStateChanges(input: ReducerInput, changes: StateChange[]): ReducerResult {
  return changes.reduce(
    (acc, change) => applyOne(acc, change),
    input
  );
}
