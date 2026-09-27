/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Zustand Slice Helper Types
 */

import { StateCreator } from 'zustand';
import { GameState } from '../types';

export type StoreSlice<T> = StateCreator<
  GameState,
  [],
  [],
  T
>;
