/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated PRNG stream for VAR. Same formula family as the referee stream,
 * different salt, so VAR draws never move the engine's main stream or the
 * referee-profile stream.
 */

/** ASCII-ish tag so this salt cannot collide with the referee salt (0x726566). */
export const VAR_STREAM_SALT = 0x56415231;

export function varStreamSeed(matchSeed: number): number {
  return (Math.imul(matchSeed >>> 0, 2654435761) ^ VAR_STREAM_SALT) >>> 0;
}
