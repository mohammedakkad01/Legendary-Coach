/**
 * Diagnostic save size report (v1–v7 fixtures + bounded history).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { persistenceService } from '../src/services/persistenceService';
import { finalizePersistedGameSave } from '../src/services/persistence/finalizePersistedSave';
import { buildOversizedMatchHistoryFixture } from './lib/saveFixtures';

const FIXTURE_DIR = join(process.cwd(), 'scripts/fixtures/saves');

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function sizeOf(obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), 'utf8');
}

console.log('Save size report\n================\n');

for (const file of ['v1.json', 'v2.json', 'v3.json', 'v4.json', 'v5.json', 'v6.json', 'v7.json']) {
  const path = join(FIXTURE_DIR, file);
  if (!existsSync(path)) {
    console.log(`${file}: (missing — run testSaveRoundtripMatrix first)`);
    continue;
  }
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const rawSize = sizeOf(raw);
  const migrated = persistenceService.migrate(raw);
  const migratedSize = sizeOf(migrated);
  console.log(`${file}: raw ${kb(rawSize)} → migrated v${migrated.saveVersion} ${kb(migratedSize)}`);
}

const huge = buildOversizedMatchHistoryFixture(100);
const before = sizeOf(huge);
const after = sizeOf(finalizePersistedGameSave(huge));
console.log(`\nmatchHistory bound (100 → capped): ${kb(before)} → ${kb(after)}`);
