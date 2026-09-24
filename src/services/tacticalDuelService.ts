/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * tacticalDuelService.ts
 * Manages Realtime Peer-to-Peer Tactical Duel Rooms & Safe Stance Reveal
 * Uses Firestore real-time listeners and Zero-Knowledge document access rules.
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { 
  DuelRoom, 
  DuelPlayerOrderDoc, 
  TacticalStance, 
  TacticalDuelOrder, 
  TacticalDuelRoundResult 
} from '../types/game';
import { 
  getRandomDuelDraft, 
  DUEL_PIECES_CATALOG, 
  resolveSimultaneousDuelRound 
} from '../data/tacticalDuelData';

/** Helper to generate short friendly room code e.g. "TC-7492" */
export function generateShortRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TC-${randomPart}`;
}

/**
 * 1. Create a new PvP Duel Room as Host
 */
export async function createDuelRoom(hostClubName: string): Promise<DuelRoom> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('يجب تسجيل الدخول لإنشاء غرفة تحدي حقيقية.');
  }

  const roomId = generateShortRoomCode();
  const hostPieces = getRandomDuelDraft(4).map(p => p.id);
  const guestPieces = getRandomDuelDraft(4).map(p => p.id);

  const newRoom: DuelRoom = {
    id: roomId,
    hostUid: user.uid,
    hostClubName: hostClubName || 'المدرب المضيف',
    guestUid: null,
    guestClubName: null,
    status: 'waiting',
    round: 1,
    maxRounds: 5,
    hostHp: 100,
    guestHp: 100,
    hostDraftedPieceIds: hostPieces,
    guestDraftedPieceIds: guestPieces,
    lastRoundResult: null,
    winner: null,
    currentRoundDeadline: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const roomRef = doc(db, 'duel_rooms', roomId);
  await setDoc(roomRef, newRoom);
  return newRoom;
}

/**
 * 2. Join an existing PvP Room with short Room ID
 */
export async function joinDuelRoom(roomId: string, guestClubName: string): Promise<DuelRoom> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('يجب تسجيل الدخول للانضمام لغرفة التحدي.');
  }

  const formattedRoomId = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'duel_rooms', formattedRoomId);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    throw new Error(`لم يتم العثور على غرفة برمز [${formattedRoomId}]`);
  }

  const roomData = snap.data() as DuelRoom;

  if (roomData.hostUid === user.uid) {
    return roomData; // User re-entering their own room
  }

  if (roomData.guestUid && roomData.guestUid !== user.uid) {
    throw new Error('عذراً، هذه الغرفة ممتلئة بالفعل بلاعب آخر.');
  }

  if (roomData.status === 'finished' || roomData.status === 'abandoned') {
    throw new Error('هذه المباراة انتهت بالفعل ولا يمكن الانضمام إليها.');
  }

  // Update as active guest
  const updates: Partial<DuelRoom> = {
    guestUid: user.uid,
    guestClubName: guestClubName || 'المدرب الضيف',
    status: 'active',
    currentRoundDeadline: Date.now() + 45000, // 45 seconds timer for round 1
    updatedAt: new Date().toISOString()
  };

  await updateDoc(roomRef, updates);
  return { ...roomData, ...updates };
}

/**
 * 3. Submit secret order for current round
 * Writes to subcollection `duel_rooms/{roomId}/orders/{user.uid}`
 */
export async function submitSecretOrder(
  roomId: string,
  round: number,
  pieceId: string,
  stance: TacticalStance
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('غير مصرح - الرجاء تسجيل الدخول');

  const orderDoc: DuelPlayerOrderDoc = {
    uid: user.uid,
    round,
    pieceId,
    stance,
    submittedAt: new Date().toISOString()
  };

  const orderRef = doc(db, 'duel_rooms', roomId, 'orders', user.uid);
  await setDoc(orderRef, orderDoc);
}

/**
 * 4. Try resolving round once both orders are committed
 * Safe Client-side mutual resolution:
 * Checks if both orders exist for the round, reads opponent's revealed order,
 * computes damage with resolveSimultaneousDuelRound(), and commits to the room.
 */
export async function checkAndResolveSimultaneousRound(
  room: DuelRoom,
  currentRound: number
): Promise<TacticalDuelRoundResult | null> {
  const user = auth.currentUser;
  if (!user || !room.guestUid) return null;

  try {
    const hostOrderRef = doc(db, 'duel_rooms', room.id, 'orders', room.hostUid);
    const guestOrderRef = doc(db, 'duel_rooms', room.id, 'orders', room.guestUid);

    const [hostSnap, guestSnap] = await Promise.all([
      getDoc(hostOrderRef),
      getDoc(guestOrderRef)
    ]);

    if (!hostSnap.exists() || !guestSnap.exists()) {
      return null; // Both players haven't submitted yet
    }

    const hostOrder = hostSnap.data() as DuelPlayerOrderDoc;
    const guestOrder = guestSnap.data() as DuelPlayerOrderDoc;

    if (hostOrder.round !== currentRound || guestOrder.round !== currentRound) {
      return null; // Orders not synced to current round
    }

    // Both orders confirmed for current round!
    // Map to catalog pieces
    const hostPiece = DUEL_PIECES_CATALOG.find(p => p.id === hostOrder.pieceId) || DUEL_PIECES_CATALOG[0];
    const guestPiece = DUEL_PIECES_CATALOG.find(p => p.id === guestOrder.pieceId) || DUEL_PIECES_CATALOG[0];

    const hostDuelOrder: TacticalDuelOrder = {
      round: currentRound,
      playerId: room.hostUid,
      pieceId: hostOrder.pieceId,
      stance: hostOrder.stance,
      timestamp: Date.now()
    };

    const guestDuelOrder: TacticalDuelOrder = {
      round: currentRound,
      playerId: room.guestUid,
      pieceId: guestOrder.pieceId,
      stance: guestOrder.stance,
      timestamp: Date.now()
    };

    // Calculate clash outcome using canonical simulation matrix
    const clashResult = resolveSimultaneousDuelRound(
      currentRound,
      hostDuelOrder,
      guestDuelOrder,
      hostPiece,
      guestPiece,
      room.hostClubName,
      room.guestClubName || 'الخصم'
    );

    // Apply HP changes
    const newHostHp = Math.max(0, room.hostHp - clashResult.damageToPlayer);
    const newGuestHp = Math.max(0, room.guestHp - clashResult.damageToOpponent);

    let matchWinner: 'host' | 'guest' | 'draw' | null = null;
    let newStatus = room.status;

    if (newHostHp <= 0 || newGuestHp <= 0 || currentRound >= room.maxRounds) {
      newStatus = 'finished';
      if (newHostHp > newGuestHp) matchWinner = 'host';
      else if (newGuestHp > newHostHp) matchWinner = 'guest';
      else matchWinner = 'draw';
    }

    const roomRef = doc(db, 'duel_rooms', room.id);
    await updateDoc(roomRef, {
      round: newStatus === 'finished' ? currentRound : currentRound + 1,
      hostHp: newHostHp,
      guestHp: newGuestHp,
      lastRoundResult: clashResult,
      status: newStatus,
      winner: matchWinner,
      currentRoundDeadline: newStatus === 'finished' ? null : Date.now() + 45000,
      updatedAt: new Date().toISOString()
    });

    return clashResult;
  } catch (err) {
    // If rules forbid reading opponent's order because user hasn't committed yet, getDoc throws silently
    return null;
  }
}

/**
 * 5. Realtime room subscription helper
 */
export function subscribeToDuelRoom(
  roomId: string,
  onUpdate: (room: DuelRoom) => void,
  onError: (err: any) => void
): Unsubscribe {
  const roomRef = doc(db, 'duel_rooms', roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as DuelRoom);
      }
    },
    onError
  );
}
