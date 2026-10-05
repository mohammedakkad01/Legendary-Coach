/**
 * Phase H Block 5 Part A — notification pipeline, mutes, emitter coverage.
 */

import { SeededRandom } from '../src/engine/prng';
import { REAL_INITIAL_PLAYER_CLUB } from '../src/data/realFootballData';
import type { Player } from '../src/types/game';
import {
  applyNotificationPipelineForEvents,
  applyStateChanges,
  createEmptyLivingWorld,
  dispatchGameEvent,
  ensureDefaultHandlersRegistered,
  ingestGameEvent,
  mergeDuplicateNotifications,
  notificationPipelineStepForEvent,
} from '../src/domain/livingWorld';
import type { GameEvent } from '../src/domain/livingWorld/types';
import { ASSISTANT_DISMISS_EVENT_TYPE } from '../src/domain/assistant/types';
import { buildDismissEvent } from '../src/domain/assistant/recommendations/filterIgnored';
import {
  applyPlayerLifeChanges,
  resolveInteraction,
  runPostMatchPlayerLife,
} from '../src/domain/playerLife/integration';
import { weeklyDressingRoomChanges } from '../src/domain/playerLife/dressingRoom';
import { dispatchRecruitmentEventsToLivingWorld } from '../src/domain/recruitment/storeBridge';
import {
  filterNotificationsForDisplay,
  isNotificationCategoryMutedForDisplay,
  loadNotificationMutes,
  setNotificationCategoryMuted,
} from '../src/services/localUiSettings';
import * as playerLifeIntegration from '../src/domain/playerLife/integration';
import { assert, assertEqual, section, finish } from './lib/testHarness';

function samplePlayer(overrides: Partial<Player> = {}): Player {
  const base = REAL_INITIAL_PLAYER_CLUB.footballSquad[0];
  return { ...base, ...overrides };
}

section('dispatchPlayerLifeEvents removed — no partial third pipeline export');
{
  assertEqual(
    'dispatchPlayerLifeEvents' in playerLifeIntegration,
    false,
    'dispatchPlayerLifeEvents must not be exported',
  );
}

section('Notification-only path does not double-append GameEvents');
{
  ensureDefaultHandlersRegistered();
  let lw = createEmptyLivingWorld(42);
  const players = [samplePlayer({ id: 'p1', morale: 50 })];
  const event: GameEvent = {
    id: 'evt_once',
    type: 'playerLife.injury_occurred',
    timestamp: '2030-01-01T12:00:00.000Z',
    season: 1,
    playerId: 'p1',
    severity: 'high',
    context: { title: 'Injury', message: 'Test injury' },
  };
  const logged = applyStateChanges(
    { livingWorld: lw, players },
    [{ kind: 'appendGameEvent', event }],
  );
  assertEqual(logged.livingWorld.eventLog.length, 1, 'single event log entry');
  const withNotif = applyNotificationPipelineForEvents(logged, [event]);
  assertEqual(withNotif.livingWorld.eventLog.length, 1, 'notification pass does not append events');
  assert(withNotif.livingWorld.notifications.length >= 1, 'notification created');
}

section('Duplicate dedupeKey merged via pipeline (read state preserved when unread incoming)');
{
  const base = createEmptyLivingWorld(1);
  const ts = '2030-06-01T10:00:00.000Z';
  const eventA: GameEvent = {
    id: 'ev_a',
    type: 'board.request_resolved',
    timestamp: ts,
    season: 1,
    clubId: 'c1',
    severity: 'medium',
    context: { title: 'Board', message: 'First' },
  };
  const eventB: GameEvent = {
    ...eventA,
    id: 'ev_b',
    context: { ...eventA.context, message: 'Updated' },
  };
  let acc = applyStateChanges({ livingWorld: base, players: [] }, [
    { kind: 'appendGameEvent', event: eventA },
  ]);
  acc = applyNotificationPipelineForEvents(acc, [eventA]);
  const first = acc.livingWorld.notifications[0];
  acc = applyStateChanges(acc, [{ kind: 'appendGameEvent', event: eventB }]);
  acc = applyNotificationPipelineForEvents(acc, [eventB]);
  const merged = mergeDuplicateNotifications(acc.livingWorld.notifications, []);
  assertEqual(merged.filter((n) => n.dedupeKey === first.dedupeKey).length, 1, 'one row per dedupeKey');
  assertEqual(
    merged.find((n) => n.dedupeKey === first.dedupeKey)?.message,
    'Updated',
    'message updated on merge',
  );
}

section('Daily cap respected through notification pipeline steps');
{
  ensureDefaultHandlersRegistered();
  let lw = createEmptyLivingWorld(100);
  let players = [samplePlayer({ id: 'n1', morale: 40 })];
  const day = '2030-06-01T10:00:00.000Z';
  for (let i = 0; i < 20; i++) {
    const event: GameEvent = {
      id: `ev_cap_${i}`,
      type: 'player.morale_shift',
      timestamp: new Date(new Date(day).getTime() + i * 120_000).toISOString(),
      season: 1,
      playerId: 'n1',
      severity: 'low',
      context: { delta: 1 },
    };
    const logged = applyStateChanges({ livingWorld: lw, players }, [
      { kind: 'appendGameEvent', event },
    ]);
    const next = applyNotificationPipelineForEvents(logged, [event]);
    lw = next.livingWorld;
    players = next.players;
  }
  const suggestionCount = lw.notifications.filter((n) => n.category === 'Suggestion').length;
  assert(suggestionCount <= 12, 'Suggestion cap respected');
}

section('Mute is display-only; Critical always visible');
{
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
  localStorage.removeItem('legendary_notification_mutes_v1');
  setNotificationCategoryMuted('Information', true);
  setNotificationCategoryMuted('Critical', true);
  assert(isNotificationCategoryMutedForDisplay(loadNotificationMutes(), 'Critical') === false, 'Critical never muted');
  const items = [
    {
      id: '1',
      category: 'Information' as const,
      title: 't',
      message: 'm',
      sourceEventId: 'e',
      createdAt: tsIso(),
      read: false,
      dedupeKey: 'k1',
    },
    {
      id: '2',
      category: 'Critical' as const,
      title: 't',
      message: 'm',
      sourceEventId: 'e2',
      createdAt: tsIso(),
      read: true,
      dedupeKey: 'k2',
    },
  ];
  const visible = filterNotificationsForDisplay(items, loadNotificationMutes());
  assertEqual(visible.length, 1, 'only Critical visible when Information muted');
  assertEqual(visible[0].category, 'Critical', 'Critical remains');
  assertEqual(items[0].read, false, 'stored read state unchanged');
}

function tsIso(): string {
  return '2030-01-01T00:00:00.000Z';
}

section('Emitter: player-life injury via runPostMatchPlayerLife');
{
  const player = samplePlayer({ id: 'inj_p', fatigue: 95 });
  player.playerLife = {
    ...(player.playerLife ?? {
      condition: { trainingLoad: 90, sharpness: 40, matchFitness: 50, recoveryQuality: 50 },
      playingTime: { squadRole: 'starter', expectedMinutesPerMatch: 90, minutesLastMatches: [] },
      development: { momentum: 0 },
      mentoring: { menteeIds: [] },
    }),
    condition: {
      trainingLoad: 95,
      sharpness: 40,
      matchFitness: 90,
      recoveryQuality: 50,
      injury: null,
    },
  };
  let lw = createEmptyLivingWorld(777);
  let found = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    lw = createEmptyLivingWorld(777 + attempt);
    const result = runPostMatchPlayerLife(
      { livingWorld: lw, players: [player] },
      {
        season: 1,
        matchday: 3,
        won: true,
        drawn: false,
        goalsFor: 2,
        goalsAgainst: 0,
        playerSummaries: [
          {
            playerId: player.id,
            minutes: 90,
            matchRating: 7.5,
            wasStarter: true,
            goals: 1,
            assists: 0,
          },
        ],
        medicalCenterLevel: 1,
        trainingGroundLevel: 5,
        recentMatchesIn7Days: 3,
        fatigueProtectionMult: 1,
      },
      [player.id],
      [],
      new SeededRandom(4242 + attempt),
    );
    if (result.livingWorld.notifications.some((n) => n.sourceEventId.startsWith('pl_inj_'))) {
      found = true;
      assertEqual(
        result.livingWorld.eventLog.filter((e) => e.type === 'playerLife.injury_occurred').length,
        1,
        'single injury event in log',
      );
      break;
    }
  }
  assert(found, 'injury path produces exactly one logged event and pipeline notification');
}

section('Emitter: dressing-room crisis via player-life changes');
{
  const lw = createEmptyLivingWorld(5);
  lw.dressingRoom = {
    cohesion: 20,
    hierarchyStability: 40,
    activeConflictPlayerIds: [],
    lastCrisisMatchday: -999,
  };
  let changes: ReturnType<typeof weeklyDressingRoomChanges> = [];
  for (let seed = 1; seed < 500; seed += 1) {
    const attempt = weeklyDressingRoomChanges(lw, 10, 1, false, false, new SeededRandom(seed));
    if (attempt.some((c) => c.kind === 'appendGameEvent')) {
      changes = attempt;
      break;
    }
  }
  const events = changes.filter((c) => c.kind === 'appendGameEvent').map((c) => c.event);
  const out = applyPlayerLifeChanges({ livingWorld: lw, players: [samplePlayer()] }, changes);
  assert(events.length >= 1, 'crisis event emitted');
  assert(
    out.livingWorld.notifications.some((n) => n.title.includes('Dressing room') || n.message.includes('cohesion')),
    'crisis notification via player-life pipeline',
  );
}

section('Emitter: player-life interaction via resolveInteraction');
{
  const player = samplePlayer({ id: 'int_p' });
  const lw = createEmptyLivingWorld(8);
  lw.pendingInteractions = [
    {
      id: 'pi_1',
      playerId: player.id,
      kind: 'playing_time',
      season: 1,
      matchday: 2,
      severity: 'medium',
      context: {},
      responses: [{ id: 'promise_minutes', labelEn: 'Promise', labelAr: 'Promise' }],
    },
  ];
  const out = resolveInteraction(
    { livingWorld: lw, players: [player] },
    lw.pendingInteractions[0],
    'promise_minutes',
  );
  assert(
    out.livingWorld.notifications.some((n) => n.sourceEventId.startsWith('pl_res_')),
    'interaction notification via notification-only path',
  );
}

section('Emitter: board / staff / recruitment / assistant dismissal via ingest or dispatch');
{
  ensureDefaultHandlersRegistered();
  let lw = createEmptyLivingWorld(11);
  const players: Player[] = [];

  const boardEvt: GameEvent = {
    id: 'board_1',
    type: 'board.request_resolved',
    timestamp: tsIso(),
    season: 1,
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
    severity: 'medium',
    context: { title: 'Board', message: 'Approved', approved: true },
  };
  const boardOut = dispatchGameEvent({ livingWorld: lw, players }, boardEvt, {
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
  });
  lw = boardOut.result.livingWorld;
  assert(boardOut.result.livingWorld.notifications.some((n) => n.sourceEventId === 'board_1'), 'board ingest');

  const staffEvt: GameEvent = {
    id: 'staff_1',
    type: 'staff.hired',
    timestamp: tsIso(),
    season: 1,
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
    severity: 'medium',
    context: { title: 'Staff', message: 'Hired' },
  };
  const staffOut = dispatchGameEvent({ livingWorld: lw, players }, staffEvt, {
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
  });
  lw = staffOut.result.livingWorld;
  assert(lw.notifications.some((n) => n.sourceEventId === 'staff_1'), 'staff ingest');

  const recruitEvt: GameEvent = {
    id: 'rec_1',
    type: 'recruitment.rumor.created',
    timestamp: tsIso(),
    season: 1,
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
    severity: 'low',
    context: { title: 'Rumor', message: 'Transfer rumor' },
  };
  const recReducer = dispatchRecruitmentEventsToLivingWorld(
    { livingWorld: lw, players },
    [recruitEvt],
    { clubId: REAL_INITIAL_PLAYER_CLUB.id, gameWeek: 4 },
  );
  assert(recReducer.livingWorld.notifications.some((n) => n.sourceEventId === 'rec_1'), 'recruitment ingest');

  const dismissEvt = buildDismissEvent({
    dedupeKey: 'rec_live_1',
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
    season: 1,
    nowIso: tsIso(),
    recommendationId: 'rec_x',
  });
  const loggedDismiss = applyStateChanges(
    { livingWorld: recReducer.livingWorld, players },
    [{ kind: 'appendGameEvent', event: dismissEvt }],
  );
  const dismissNotif = applyNotificationPipelineForEvents(loggedDismiss, [dismissEvt]);
  assert(
    dismissNotif.livingWorld.notifications.some(
      (n) => n.sourceEventId === dismissEvt.id && n.category === 'Suggestion',
    ),
    'assistant dismissal notification-only',
  );
  assertEqual(dismissEvt.type, ASSISTANT_DISMISS_EVENT_TYPE, 'dismiss event type');
}

section('Ingest and notification-only step share derive/throttle semantics');
{
  const lw = createEmptyLivingWorld(3);
  const event: GameEvent = {
    id: 'cmp_1',
    type: 'staff.fired',
    timestamp: tsIso(),
    season: 1,
    severity: 'medium',
    context: { title: 'Staff out', message: 'Released' },
  };
  const step = notificationPipelineStepForEvent(event, { livingWorld: lw, players: [] });
  const ingest = ingestGameEvent({ livingWorld: lw, players: [] }, event, {
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
  });
  assertEqual(step.accepted[0]?.category, ingest.result.livingWorld.notifications[0]?.category, 'same category');
}

finish('Phase H Block 5 Part A notifications');
