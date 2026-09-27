/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Custom hook to control Tactical Duel state, PvP rooms synchronization, and secret order commits.
 */

import { useState, useEffect } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { DuelPiece, TacticalStance } from '../types/game';
import { 
  createDuelRoom, 
  joinDuelRoom, 
  submitSecretOrder, 
  checkAndResolveSimultaneousRound,
  subscribeToDuelRoom 
} from '../services/tacticalDuelService';
import { soundEffects } from '../audio/soundFX';

export function useTacticalDuel() {
  const {
    tacticalDuel,
    isTacticalDuelModalOpen,
    closeTacticalDuel,
    selectDuelPieceAndStance,
    submitDuelRoundOrder,
    startTacticalDuel,
    syncPvPRoomToDuelState,
    club,
    language
  } = useGameStore();

  const { user, setAuthModalOpen } = useFirebase();
  const isAr = language === 'ar';

  const [pvpViewMode, setPvpViewMode] = useState<'game' | 'lobby'>('game');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(45);

  const {
    round,
    maxRounds,
    playerHp,
    opponentHp,
    draftedPieces,
    selectedPieceId,
    selectedStance,
    isOrderSubmitted,
    isRevealing,
    history,
    winner,
    opponentName,
    opponentIsBot,
    roomId,
    pvpRole
  } = tacticalDuel || {
    round: 1,
    maxRounds: 5,
    playerHp: 100,
    opponentHp: 100,
    draftedPieces: [],
    selectedPieceId: null,
    selectedStance: 'attack' as TacticalStance,
    isOrderSubmitted: false,
    isRevealing: false,
    history: [],
    winner: null,
    opponentName: 'الخصم',
    opponentIsBot: true,
    roomId: null,
    pvpRole: null
  };

  const selectedPiece = draftedPieces.find((p: DuelPiece) => p.id === selectedPieceId) || draftedPieces[0];

  // Real-time synchronization when playing in a PvP Room
  useEffect(() => {
    if (!roomId || !isTacticalDuelModalOpen) return;

    const unsubscribe = subscribeToDuelRoom(
      roomId,
      async (updatedRoom) => {
        if (!user) return;
        syncPvPRoomToDuelState(updatedRoom, user.uid);

        if (updatedRoom.status === 'active' && !updatedRoom.winner) {
          await checkAndResolveSimultaneousRound(updatedRoom, updatedRoom.round);
        }
      },
      (err) => {
        console.error('PvP Room Sync Error:', err);
      }
    );

    return () => unsubscribe();
  }, [roomId, isTacticalDuelModalOpen, user, syncPvPRoomToDuelState]);

  // Handle Submitting Order in PvP
  const handlePvPOrderSubmit = async () => {
    if (!selectedPiece || !selectedStance || isOrderSubmitted || !roomId) return;
    try {
      soundEffects.playFanfare();
      await submitSecretOrder(roomId, round, selectedPiece.id, selectedStance);
      useGameStore.setState(prev => ({
        tacticalDuel: {
          ...prev.tacticalDuel,
          isOrderSubmitted: true
        }
      }));
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إرسال الأمر السري');
    }
  };

  // Round deadline countdown for PvP
  useEffect(() => {
    if (opponentIsBot || winner) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!isOrderSubmitted && selectedPiece) {
            handlePvPOrderSubmit();
          }
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [round, isOrderSubmitted, opponentIsBot, winner, selectedPiece]);

  const handleCreateRoom = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setErrorMessage(null);
    setIsCreatingRoom(true);
    try {
      soundEffects.playWhistle(true);
      const room = await createDuelRoom(club.name);
      syncPvPRoomToDuelState(room, user.uid);
      setPvpViewMode('game');
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إنشاء غرفة التحدي');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!roomCodeInput.trim()) {
      setErrorMessage(isAr ? 'الرجاء إدخال رمز الغرفة' : 'Please enter room code');
      return;
    }
    setErrorMessage(null);
    setIsJoiningRoom(true);
    try {
      soundEffects.playWhistle(true);
      const room = await joinDuelRoom(roomCodeInput.trim(), club.name);
      syncPvPRoomToDuelState(room, user.uid);
      setPvpViewMode('game');
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل الانضمام للغرفة');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return {
    tacticalDuel,
    isTacticalDuelModalOpen,
    closeTacticalDuel,
    selectDuelPieceAndStance,
    submitDuelRoundOrder,
    startTacticalDuel,
    club,
    language,
    isAr,
    pvpViewMode,
    setPvpViewMode,
    roomCodeInput,
    setRoomCodeInput,
    isCreatingRoom,
    isJoiningRoom,
    errorMessage,
    copiedCode,
    timeLeft,
    round,
    maxRounds,
    playerHp,
    opponentHp,
    draftedPieces,
    selectedPiece,
    selectedStance,
    isOrderSubmitted,
    isRevealing,
    history,
    winner,
    opponentName,
    opponentIsBot,
    roomId,
    pvpRole,
    handleCreateRoom,
    handleJoinRoom,
    handlePvPOrderSubmit,
    copyRoomCode
  };
}
