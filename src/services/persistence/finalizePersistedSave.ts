/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Last step for migrate/extract: canonical slices, bounded history, clean passthrough.
 */

import type { GameSaveData } from '../../types/save';
import { boundMatchHistoryForSave } from './matchHistoryBounds';
import {
  extractAssistantPersistedFromState,
  readAiNarrationEnabledFromState,
} from './assistantPersist';
import {
  stripKnownFieldsFromPassthrough,
  resolveClubManagementCanonical,
} from './savePassthrough';

export function finalizePersistedGameSave(
  save: GameSaveData,
  raw?: Record<string, unknown>,
): GameSaveData {
  let next: GameSaveData = { ...save, saveVersion: save.saveVersion };

  next = resolveClubManagementCanonical(next, raw);

  const assistantSource = raw
    ? ({ ...raw, assistant: raw.assistant ?? next.assistant } as Record<string, unknown>)
    : ({ assistant: next.assistant } as Record<string, unknown>);
  const assistant = extractAssistantPersistedFromState(assistantSource);
  if (assistant) {
    next = { ...next, assistant };
  } else {
    const { assistant: _removed, ...rest } = next;
    next = rest as GameSaveData;
  }

  const aiSource = raw
    ? ({ ...raw, aiNarrationEnabled: raw.aiNarrationEnabled ?? next.aiNarrationEnabled } as Record<string, unknown>)
    : ({ aiNarrationEnabled: next.aiNarrationEnabled } as Record<string, unknown>);
  next = { ...next, aiNarrationEnabled: readAiNarrationEnabledFromState(aiSource) };

  next = boundMatchHistoryForSave(next);
  next = stripKnownFieldsFromPassthrough(next);

  return next;
}
