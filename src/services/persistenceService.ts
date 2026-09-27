/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralized Persistence & Save Management Facade
 * Delegates to specialized services: saveService, loadService, migrationService, validationService.
 */

import { GameSaveData, LegacyGameSaveData, CURRENT_SAVE_VERSION, SaveStatus } from '../types/save';
import { Club } from '../types/game';
import {
  saveService,
  loadService,
  migrationService,
  validationService,
  STORAGE_KEY,
  APP_VERSION
} from './persistence';

export { STORAGE_KEY, APP_VERSION };
export { saveService, loadService, migrationService, validationService };

class PersistenceService {
  public STORAGE_KEY = STORAGE_KEY;

  public subscribe(listener: (status: SaveStatus, error?: string) => void): () => void {
    return saveService.subscribe(listener);
  }

  public extractSaveData(state: any): GameSaveData {
    return saveService.extractSaveData(state);
  }

  public sanitizeClub(club: Club): Club {
    return saveService.sanitizeClub(club);
  }

  public validate(data: unknown): { valid: boolean; error?: string } {
    return validationService.validate(data);
  }

  public migrate(raw: LegacyGameSaveData | any): GameSaveData {
    return migrationService.migrate(
      raw,
      (club) => saveService.sanitizeClub(club),
      (state) => saveService.extractSaveData(state)
    );
  }

  public serialize(data: GameSaveData, pretty = false): string {
    return saveService.serialize(data, pretty);
  }

  public deserialize(jsonStr: string): { success: boolean; data?: GameSaveData; message: string } {
    return loadService.deserialize(jsonStr);
  }

  public saveImmediate(state: any): boolean {
    return saveService.saveImmediate(state);
  }

  public scheduleAutoSave(getState: () => any, delayMs = 600): void {
    saveService.scheduleAutoSave(getState, delayMs);
  }

  public flush(getState: () => any): void {
    saveService.flush(getState);
  }

  public loadFromStorage(): GameSaveData | null {
    return loadService.loadFromStorage();
  }

  public clearStorage(): void {
    loadService.clearStorage();
  }

  public exportJson(state: any, pretty = true): string {
    return loadService.exportJson(state, pretty);
  }

  public compareStates(a: GameSaveData, b: GameSaveData): { identical: boolean; differences: string[] } {
    return loadService.compareStates(a, b);
  }
}

export const persistenceService = new PersistenceService();
