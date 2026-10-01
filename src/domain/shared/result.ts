/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Result<T, E> — a tiny discriminated union used by pure domain functions
 * instead of throwing. The UI maps the typed `error.code` to a localized
 * message; the domain never produces user-facing strings.
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
