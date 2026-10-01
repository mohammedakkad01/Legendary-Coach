/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tiny shared test helper for the domain test scripts (same ✅/❌ output style
 * as the existing scripts, no new dependency).
 */

let passed = 0;
let failed = 0;

export function section(title: string): void {
  console.log(`\n${title}`);
}

export function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

/** JSON with object keys sorted, so equality ignores property order. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)))
      : v);
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  const a = stable(actual);
  const e = stable(expected);
  assert(a === e, a === e ? message : `${message} — expected ${e}, got ${a}`);
}

export function assertThrows(fn: () => unknown, message: string): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}

/** Prints the summary and sets a non-zero exit code on failure. */
export function finish(suite: string): void {
  console.log('\n====================================================');
  console.log(`📊 ${suite}: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}
