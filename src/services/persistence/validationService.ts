/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistence Validation Service
 * Validates save schemas, structural integrity, and guards against corruption.
 */

export class ValidationService {
  /**
   * Validates a raw save data object to ensure minimum viability
   * before attempting to migrate or restore.
   */
  public validate(data: unknown): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Save data is not a valid JSON object' };
    }

    const obj = data as Record<string, any>;

    // Club is the core invariant of a career save
    if (!obj.club || typeof obj.club !== 'object') {
      return { valid: false, error: 'Save data is missing essential club data' };
    }

    if (!obj.club.name || typeof obj.club.name !== 'string') {
      return { valid: false, error: 'Club name is missing or invalid' };
    }

    if (!Array.isArray(obj.club.footballSquad) || obj.club.footballSquad.length === 0) {
      return { valid: false, error: 'Club has an empty or invalid football squad' };
    }

    if (!Array.isArray(obj.club.footballLineup)) {
      return { valid: false, error: 'Club is missing a starting lineup array' };
    }

    return { valid: true };
  }
}

export const validationService = new ValidationService();
