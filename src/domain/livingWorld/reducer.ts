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
import { clamp } from '../shared/math';
import { createDefaultPlayerLife } from '../playerLife/migratePlayerLife';
import { mergePlayerLife, syncLegacyFromPlayerLife } from '../playerLife/syncLegacy';
import { clamp100, clampForm } from '../playerLife/math';
import { PLAYER_LIFE as PL } from '../../config/gameTuning';

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
    case 'patchPlayerLife': {
      const nextPlayers = updatePlayer(players, change.playerId, (p) => {
        const lifeBase = p.playerLife ?? createDefaultPlayerLife(p);
        let life = mergePlayerLife(lifeBase, change.patch ?? {});
        if (change.conditionDelta) {
          life = {
            ...life,
            condition: {
              ...life.condition,
              trainingLoad: clamp100(life.condition.trainingLoad + (change.conditionDelta.trainingLoad ?? 0)),
              sharpness: clamp100(life.condition.sharpness + (change.conditionDelta.sharpness ?? 0)),
              matchFitness: clamp100(life.condition.matchFitness + (change.conditionDelta.matchFitness ?? 0)),
              recoveryQuality: clamp100(
                life.condition.recoveryQuality + (change.conditionDelta.recoveryQuality ?? 0),
              ),
            },
          };
        }
        const leg = change.legacyDelta ?? {};
        let next: Player = {
          ...p,
          playerLife: life,
          morale: clamp100(p.morale + (leg.morale ?? 0)),
          fatigue: clamp100(p.fatigue + (leg.fatigue ?? 0)),
          stamina: clamp100(p.stamina + (leg.stamina ?? 0)),
          form: clampForm(p.form + (leg.form ?? 0), PL.form.min, PL.form.max),
          overall: leg.overall ? clamp(p.overall + leg.overall, 1, 99) : p.overall,
        };
        if (change.legacySet?.injuredWeeks !== undefined) {
          next = { ...next, injuredWeeks: Math.max(0, Math.round(change.legacySet.injuredWeeks)) };
        }
        return syncLegacyFromPlayerLife(next);
      });
      return { livingWorld, players: nextPlayers };
    }
    case 'patchDressingRoom': {
      const current = livingWorld.dressingRoom ?? {
        cohesion: 58,
        hierarchyStability: 62,
        activeConflictPlayerIds: [],
      };
      const patch = change.patch;
      const cohesion =
        patch.cohesion ??
        clamp(current.cohesion + (patch.cohesionDelta ?? 0), 0, 100);
      const hierarchyStability =
        patch.hierarchyStability ??
        clamp(current.hierarchyStability + (patch.hierarchyStabilityDelta ?? 0), 0, 100);
      return {
        livingWorld: {
          ...livingWorld,
          dressingRoom: {
            ...current,
            ...patch,
            cohesion,
            hierarchyStability,
            activeConflictPlayerIds: patch.activeConflictPlayerIds ?? current.activeConflictPlayerIds,
            lastCrisisMatchday: patch.lastCrisisMatchday ?? current.lastCrisisMatchday,
          },
        },
        players,
      };
    }
    case 'addPendingInteraction': {
      const list = livingWorld.pendingInteractions ?? [];
      if (list.some((i) => i.id === change.interaction.id)) return input;
      return {
        livingWorld: {
          ...livingWorld,
          pendingInteractions: [...list, change.interaction].slice(-30),
        },
        players,
      };
    }
    case 'removePendingInteraction':
      return {
        livingWorld: {
          ...livingWorld,
          pendingInteractions: (livingWorld.pendingInteractions ?? []).filter(
            (i) => i.id !== change.interactionId,
          ),
        },
        players,
      };
    case 'setInteractionCooldown':
      return {
        livingWorld: {
          ...livingWorld,
          interactionCooldowns: {
            ...(livingWorld.interactionCooldowns ?? {}),
            [change.key]: change.matchday,
          },
        },
        players,
      };
    case 'appendCaptaincyHistory':
      return {
        livingWorld: {
          ...livingWorld,
          captaincyHistory: [...(livingWorld.captaincyHistory ?? []), change.entry].slice(-20),
        },
        players,
      };
    default: {
      const _exhaustive: never = change;
      return _exhaustive;
    }
  }
}

function relPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function applyStateChanges(input: ReducerInput, changes: StateChange[]): ReducerResult {
  return changes.reduce(
    (acc, change) => applyOne(acc, change),
    input
  );
}
