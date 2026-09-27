/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 1v1 Simultaneous Tactical Duel & PvP Modal.
 * Refactored modular view with separated domain hook and presentation components.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Radio, Users, X, Clock, Copy, Check } from 'lucide-react';
import { useTacticalDuel } from '../hooks/useTacticalDuel';
import { TacticalDuelLobby } from './tactical-duel/TacticalDuelLobby';
import { TacticalDuelArena } from './tactical-duel/TacticalDuelArena';

export const TacticalDuelModal: React.FC = () => {
  const {
    isTacticalDuelModalOpen,
    closeTacticalDuel,
    selectDuelPieceAndStance,
    submitDuelRoundOrder,
    startTacticalDuel,
    club,
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
    history,
    winner,
    opponentName,
    opponentIsBot,
    roomId,
    handleCreateRoom,
    handleJoinRoom,
    handlePvPOrderSubmit,
    copyRoomCode,
  } = useTacticalDuel();

  if (!isTacticalDuelModalOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="tactical-duel-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <motion.div
          id="tactical-duel-card"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-950/90 via-neutral-900 to-indigo-950/80 p-4 sm:p-5 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {isAr ? 'صانع المعارك — الكشف المتزامن' : 'Battle Maker — 1v1 Simultaneous Clash'}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    !opponentIsBot 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>
                    {!opponentIsBot ? (isAr ? 'مباراة لاعب حقيقي PvP' : 'Real PvP Match') : (isAr ? 'تدريب تكتيكي ضد بوت' : 'Bot Training')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
                  <span>{isAr ? `الجولة ${Math.min(round, maxRounds)} من ${maxRounds}` : `Round ${Math.min(round, maxRounds)} of ${maxRounds}`}</span>
                  {!opponentIsBot && roomId && (
                    <span className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>{isAr ? `الغرفة: ${roomId}` : `Room: ${roomId}`}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPvpViewMode((prev: 'game' | 'lobby') => prev === 'game' ? 'lobby' : 'game')}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>{pvpViewMode === 'game' ? (isAr ? 'غرف PvP' : 'PvP Lobby') : (isAr ? 'المعركة' : 'Battle')}</span>
              </button>
              <button
                id="close-tactical-duel-btn"
                onClick={closeTacticalDuel}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lobby Mode: Create or Join PvP Room */}
          {pvpViewMode === 'lobby' ? (
            <TacticalDuelLobby
              isAr={isAr}
              club={club}
              errorMessage={errorMessage}
              isCreatingRoom={isCreatingRoom}
              isJoiningRoom={isJoiningRoom}
              roomCodeInput={roomCodeInput}
              setRoomCodeInput={setRoomCodeInput}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onPlayBot={() => {
                startTacticalDuel('tactical');
                setPvpViewMode('game');
              }}
            />
          ) : (
            <>
              {/* PvP Room Info Bar (if in PvP mode) */}
              {!opponentIsBot && roomId && (
                <div className="p-3 mx-4 mt-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-300">{isAr ? 'رمز دعوة الغرفة:' : 'Room Code:'}</span>
                    <span className="font-mono font-black text-amber-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
                      {roomId}
                    </span>
                    <button
                      onClick={copyRoomCode}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
                      title={isAr ? 'نسخ الرمز' : 'Copy Code'}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'الوقت المتبقي للجولة:' : 'Round Timer:'}</span>
                    <span className="font-mono font-bold text-amber-400">{timeLeft}s</span>
                  </div>
                </div>
              )}

              <TacticalDuelArena
                isAr={isAr}
                clubName={club.name}
                opponentName={opponentName}
                opponentIsBot={opponentIsBot}
                playerHp={playerHp}
                opponentHp={opponentHp}
                winner={winner}
                isOrderSubmitted={isOrderSubmitted}
                draftedPieces={draftedPieces}
                selectedPiece={selectedPiece}
                selectedStance={selectedStance}
                history={history}
                onSelectPieceAndStance={selectDuelPieceAndStance}
                onSubmitOrder={opponentIsBot ? submitDuelRoundOrder : handlePvPOrderSubmit}
                onNewDuel={() => setPvpViewMode('lobby')}
                onClose={closeTacticalDuel}
              />
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
