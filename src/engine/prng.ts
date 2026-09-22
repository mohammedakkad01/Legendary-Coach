/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic PRNG using Mulberry32 algorithm
 * Guarantees identical simulation outcomes across client, offline, and server.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns an integer between 0 and 2^32 - 1 */
  public nextInt(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  }

  /** Returns a float between 0 (inclusive) and 1 (exclusive) */
  public nextFloat(): number {
    return this.nextInt() / 4294967296;
  }

  /** Returns an integer between min and max (inclusive) */
  public nextRange(min: number, max: number): number {
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  /** Returns true with probability p (0 <= p <= 1) */
  public nextChance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  /** Pick random item from an array deterministically */
  public pick<T>(array: T[]): T {
    const idx = Math.floor(this.nextFloat() * array.length);
    return array[idx];
  }
}
