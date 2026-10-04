/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public entry point for Phase G — AI Assistant & Tactical Analyst.
 */

export * from './types';
export * from './config/assistantTuning';
export * from './confidence/computeConfidence';
export * from './preMatch/runPreMatchAnalyst';
export * from './live/evaluateLiveTriggers';
export * from './postMatch/runPostMatchAnalyst';
export * from './bestTactics/wrapBestTacticsRecommendation';
export * from './scouting/buildScoutingSummary';
export * from './recommendations/filterIgnored';
export * from './diff/tacticalDiff';
export * from './copy/deterministicCopy';
export * from './narrative/buildAssistantNarrativeContext';
