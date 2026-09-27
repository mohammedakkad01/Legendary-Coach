/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistence Load Service
 * Handles reading from storage, deserialization, corrupt-save safety, and state comparison.
 */

import { GameSaveData } from '../../types/save';
import { validationService } from './validationService';
import { migrationService } from './migrationService';
import { saveService, STORAGE_KEY } from './saveService';

export class LoadService {
  /**
   * Deserializes and validates a JSON string into GameSaveData.
   */
  public deserialize(jsonStr: string): { success: boolean; data?: GameSaveData; message: string } {
    try {
      if (!jsonStr || typeof jsonStr !== 'string') {
        return { success: false, message: 'ملف الحفظ فارغ أو غير صالح.' };
      }

      const parsed = JSON.parse(jsonStr);
      const validation = validationService.validate(parsed);

      if (!validation.valid) {
        return { success: false, message: `فشل التحقق من صحة ملف الحفظ: ${validation.error}` };
      }

      const migrated = migrationService.migrate(
        parsed,
        (club) => saveService.sanitizeClub(club),
        (state) => saveService.extractSaveData(state)
      );
      return { success: true, data: migrated, message: 'تم استعادة ملف الحفظ بنجاح!' };
    } catch (e: any) {
      return { success: false, message: `خطأ في قراءة ملف JSON: ${e?.message || 'بيانات تالفة'}` };
    }
  }

  /**
   * Loads and restores saved game from localStorage.
   * Guaranteed to never crash the game: falls back gracefully if corrupted.
   */
  public loadFromStorage(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const res = this.deserialize(raw);
      if (res.success && res.data) {
        return res.data;
      }
      console.warn('[LoadService] Corrupted local save detected:', res.message);
      return null;
    } catch (err) {
      console.error('[LoadService] Failed to load from localStorage:', err);
      return null;
    }
  }

  /**
   * Removes saved career from localStorage.
   */
  public clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      saveService.notify('idle');
    } catch (e) {
      console.error('[LoadService] Failed to clear localStorage:', e);
    }
  }

  /**
   * Export career as formatted JSON string for download or cloud backup.
   */
  public exportJson(state: any, pretty = true): string {
    const data = saveService.extractSaveData(state);
    return saveService.serialize(data, pretty);
  }

  /**
   * Compares two GameSaveData objects for logical career equivalence.
   */
  public compareStates(a: GameSaveData, b: GameSaveData): { identical: boolean; differences: string[] } {
    const diffs: string[] = [];

    if (a.club.name !== b.club.name) diffs.push(`club.name: "${a.club.name}" vs "${b.club.name}"`);
    if (a.club.divisionId !== b.club.divisionId) diffs.push(`club.divisionId: "${a.club.divisionId}" vs "${b.club.divisionId}"`);
    if (a.club.finances.coins !== b.club.finances.coins) diffs.push(`coins: ${a.club.finances.coins} vs ${b.club.finances.coins}`);
    if ((a.club.finances.diamonds || 0) !== (b.club.finances.diamonds || 0)) diffs.push(`diamonds: ${a.club.finances.diamonds} vs ${b.club.finances.diamonds}`);
    if (a.vipPoints !== b.vipPoints) diffs.push(`vipPoints: ${a.vipPoints} vs ${b.vipPoints}`);
    if (a.club.footballSquad.length !== b.club.footballSquad.length) diffs.push(`footballSquad size: ${a.club.footballSquad.length} vs ${b.club.footballSquad.length}`);
    if (a.club.footballTactics.formation !== b.club.footballTactics.formation) diffs.push(`formation: ${a.club.footballTactics.formation} vs ${b.club.footballTactics.formation}`);
    if (a.leagueFixtures.length !== b.leagueFixtures.length) diffs.push(`fixtures count: ${a.leagueFixtures.length} vs ${b.leagueFixtures.length}`);
    
    const aPlayed = a.leagueFixtures.filter(f => f.played).length;
    const bPlayed = b.leagueFixtures.filter(f => f.played).length;
    if (aPlayed !== bPlayed) diffs.push(`played fixtures: ${aPlayed} vs ${bPlayed}`);

    if (a.matchHistory.length !== b.matchHistory.length) diffs.push(`matchHistory: ${a.matchHistory.length} vs ${b.matchHistory.length}`);
    if (a.simulatedMatchdays.length !== b.simulatedMatchdays.length) diffs.push(`simulatedMatchdays: ${a.simulatedMatchdays.length} vs ${b.simulatedMatchdays.length}`);
    if (a.dailyMissions.length !== b.dailyMissions.length) diffs.push(`dailyMissions: ${a.dailyMissions.length} vs ${b.dailyMissions.length}`);

    return {
      identical: diffs.length === 0,
      differences: diffs
    };
  }
}

export const loadService = new LoadService();
