import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Swords, 
  Shield, 
  Zap, 
  Trophy, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Users,
  Copy,
  Check,
  Clock,
  Radio,
  ArrowRight,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { TacticalStance, DuelPiece } from '../types/game';
import { 
  createDuelRoom, 
  joinDuelRoom, 
  submitSecretOrder, 
  checkAndResolveSimultaneousRound,
  subscribeToDuelRoom 
} from '../services/tacticalDuelService';
import { soundEffects } from '../audio/soundFX';
import confetti from 'canvas-confetti';

export const TacticalDuelModal: React.FC = () => {
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

  // PvP Room State
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
    selectedStance: 'attack',
    isOrderSubmitted: false,
    isRevealing: false,
    history: [],
    winner: null,
    opponentName: 'الخصم',
    opponentIsBot: true,
    roomId: null,
    pvpRole: null
  };

  const selectedPiece = draftedPieces.find(p => p.id === selectedPieceId) || draftedPieces[0];

  // Real-time synchronization when playing in a PvP Room
  useEffect(() => {
    if (!roomId || !isTacticalDuelModalOpen) return;

    const unsubscribe = subscribeToDuelRoom(
      roomId,
      async (updatedRoom) => {
        if (!user) return;
        syncPvPRoomToDuelState(updatedRoom, user.uid);

        // If both players have submitted orders for the current round and room is active, attempt resolution
        if (updatedRoom.status === 'active' && !updatedRoom.winner) {
          await checkAndResolveSimultaneousRound(updatedRoom, updatedRoom.round);
        }
      },
      (err) => {
        console.error('PvP Room Sync Error:', err);
      }
    );

    return () => unsubscribe();
  }, [roomId, isTacticalDuelModalOpen, user]);

  // Round deadline countdown for PvP
  useEffect(() => {
    if (opponentIsBot || winner) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // If player hasn't committed, auto-commit default order to prevent stalling
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

  // Handle Room Creation
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

  // Handle Room Join
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

  // Handle Submitting Order in PvP
  const handlePvPOrderSubmit = async () => {
    if (!selectedPiece || !selectedStance || isOrderSubmitted || !roomId) return;
    try {
      soundEffects.playFanfare();
      await submitSecretOrder(roomId, round, selectedPiece.id, selectedStance);
      // Mark as committed locally
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

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (!isTacticalDuelModalOpen) return null;

  const stances: { id: TacticalStance; nameAr: string; nameEn: string; icon: string; descAr: string; descEn: string }[] = [
    {
      id: 'attack',
      nameAr: 'هجوم ساحق',
      nameEn: 'Frontal Assault',
      icon: '⚔️',
      descAr: 'يكسر محاولات الالتفاف (+35% ضرر)، لكن يمتصه الدفاع المحكم.',
      descEn: 'Smashes flankers (+35% dmg), vulnerable to heavy defensive shields.'
    },
    {
      id: 'defend',
      nameAr: 'دفاع حصين وتطويق',
      nameEn: 'Iron Defense & Counter',
      icon: '🛡️',
      descAr: 'يمتص الهجوم المباشر (-70% ضرر ويرد بهجوم مرتد)، لكنه عرضة للالتفاف.',
      descEn: 'Absorbs frontal attack (-70% damage & counters), vulnerable to flank.'
    },
    {
      id: 'flank',
      nameAr: 'التفاف ومناورة سريعة',
      nameEn: 'Tactical Flank',
      icon: '🐎',
      descAr: 'يتجاوز الدفاع الحصين ويضرب المؤخرة مباشرة، لكن يسحقه الهجوم المباشر.',
      descEn: 'Bypasses stationary shields, intercepted by head-on charges.'
    }
  ];

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
                onClick={() => setPvpViewMode(prev => prev === 'game' ? 'lobby' : 'game')}
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
            <div className="p-6 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white">
                  {isAr ? 'غرف التحدي المباشر 1 ضد 1 (لاعب حقيقي)' : '1v1 Realtime PvP Battle Rooms'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {isAr 
                    ? 'العب ضد مدرب حقيقي بكود دعوة خاص وبنظام كشف متزامن محمي من التجسس والغش.' 
                    : 'Challenge another manager via invite code with Zero-Knowledge stance reveal.'}
                </p>
              </div>

              {/* Player Rating & Stats Banner */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">{isAr ? 'تصنيفك في صانع المعارك ELO:' : 'Duel ELO Rating:'}</span>
                    <span className="text-base font-black text-amber-300 font-mono">{club.duelRating || 1200} PTS</span>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="text-emerald-400 font-bold">{club.duelWins || 0}W</span>
                  <span className="text-neutral-500 mx-1">/</span>
                  <span className="text-rose-400 font-bold">{club.duelLosses || 0}L</span>
                  <span className="text-neutral-500 mx-1">/</span>
                  <span className="text-neutral-400 font-bold">{club.duelDraws || 0}D</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-bold">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Create Room Box */}
                <div className="p-5 rounded-2xl bg-neutral-950/70 border border-purple-500/30 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
                      <Swords className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">
                      {isAr ? 'إنشاء غرفة جديدة (مضيف)' : 'Create New Room (Host)'}
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {isAr 
                        ? 'أنشئ غرفة واحصل على رمز قصير شاركه مع صديقك أو منافسك.' 
                        : 'Host a room and receive a short invite code to share with a rival.'}
                    </p>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    disabled={isCreatingRoom}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isCreatingRoom ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء غرفة الآن' : 'Create Room')}</span>
                  </button>
                </div>

                {/* Join Room Box */}
                <div className="p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">
                      {isAr ? 'الانضمام بكود الغرفة (ضيف)' : 'Join with Room Code (Guest)'}
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {isAr ? 'أدخل رمز الغرفة الذي شاركه معك المضيف للانضمام فوراً.' : 'Enter the invite code shared by the host to join instantly.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TC-7K9A"
                      className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-center font-mono font-bold uppercase tracking-wider text-xs focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={isJoiningRoom || !roomCodeInput.trim()}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>{isJoiningRoom ? (isAr ? 'جاري الاتصال...' : 'Joining...') : (isAr ? 'الانضمام للغرفة' : 'Join Room')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bot Training Option */}
              <div className="p-4 rounded-xl bg-neutral-950/50 border border-neutral-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-200">
                    {isAr ? 'هل تريد التدريب بمفردك؟' : 'Want solo training instead?'}
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    {isAr ? 'خض جولة ضد خوارزمية الذكاء الاصطناعي لاختبار استراتيجيتك.' : 'Play against an offline tactical bot to hone your skills.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    startTacticalDuel('tactical');
                    setPvpViewMode('game');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 transition cursor-pointer"
                >
                  {isAr ? 'بدء تدريب البوت' : 'Play Bot'}
                </button>
              </div>
            </div>
          ) : (
            /* Active Game View (PvP or Bot) */
            <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* PvP Room Info Bar (if in PvP mode) */}
              {!opponentIsBot && roomId && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs">
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

              {/* Health & Commander Status Bar */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
                {/* Player Side */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                        {club.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
                        {isAr ? 'أنت' : 'You'}
                      </span>
                    </div>
                    <span className="text-xs font-black text-blue-400 flex items-center gap-1 font-mono">
                      <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                      {playerHp}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${playerHp}%` }}
                    />
                  </div>
                </div>

                {/* Opponent Side */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-red-400 flex items-center gap-1 font-mono">
                      <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                      {opponentHp}%
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">
                        {!opponentIsBot ? (isAr ? 'الخصم الحقيقي' : 'Rival Player') : (isAr ? 'بوت' : 'Bot')}
                      </span>
                      <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                        {opponentName}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full transition-all duration-500 ml-auto"
                      style={{ width: `${opponentHp}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Match Resolution or Waiting State */}
              {winner ? (
                <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {winner === 'player'
                        ? (isAr ? '🎉 انتصار تكتيكي حاسم!' : '🎉 Decisive Tactical Victory!')
                        : winner === 'opponent'
                        ? (isAr ? 'هزيمة تكتيكية بشق الأنفس' : 'Narrow Tactical Defeat')
                        : (isAr ? 'تعادل تكتيكي مشرف' : 'Honorable Tactical Stalemate')}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                      {!opponentIsBot
                        ? (isAr 
                            ? `تم تسجيل نتيجة المباراة في سجل مواجهات الـ PvP وتحديث تقييم ELO الخاص بناديك.` 
                            : 'Match result saved to your PvP history and ELO updated.')
                        : (isAr 
                            ? 'تمت إضافة مكافآت تدريب البوت وتقدم المهام اليومية لخزينتك.' 
                            : 'Rewards and Daily Mission progress credited!')}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPvpViewMode('lobby')}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{isAr ? 'غرفة أو معركة جديدة' : 'New Duel'}</span>
                    </button>
                    <button
                      onClick={closeTacticalDuel}
                      className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm transition cursor-pointer"
                    >
                      {isAr ? 'إغلاق والعودة' : 'Close'}
                    </button>
                  </div>
                </div>
              ) : isOrderSubmitted ? (
                /* Waiting for opponent / reveal state */
                <div className="p-8 rounded-2xl bg-neutral-950/90 border border-purple-500/40 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 animate-spin">
                    <Swords className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {isAr ? 'تم إقفال أمرك السري بنجاح ✓' : 'Your Secret Order is Locked ✓'}
                    </h3>
                    <p className="text-xs text-purple-300 mt-1">
                      {!opponentIsBot 
                        ? (isAr ? 'في انتظار إرسال الخصم لأمره ليتم فك التشفير والكشف المتزامن فوراً...' : 'Waiting for opponent to commit. Simultaneous reveal will trigger automatically...')
                        : (isAr ? 'جاري فك التشفير وحساب الاصطدام المباشر...' : 'Simultaneous reveal in progress...')}
                    </p>
                  </div>
                </div>
              ) : (
                /* Battle Planning Interface */
                <div className="space-y-4">
                  {/* Step 1: Choose War Piece */}
                  <div>
                    <span className="text-xs font-bold text-purple-400 block mb-2">
                      {isAr ? '1. اختر وحدتك القتالية للجولة:' : '1. Select Your Combat Unit for This Round:'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {draftedPieces.map((piece: DuelPiece) => {
                        const isSelected = piece.id === selectedPiece?.id;
                        return (
                          <button
                            key={piece.id}
                            onClick={() => selectDuelPieceAndStance(piece.id, selectedStance || 'attack')}
                            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/30 shadow-lg'
                                : 'bg-neutral-850/70 border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">{piece.icon}</span>
                              <span className="text-xs font-bold text-neutral-400">
                                {isAr ? piece.nameAr : piece.nameEn}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[11px] text-center font-mono mt-1 pt-1.5 border-t border-neutral-800">
                              <div>
                                <span className="text-neutral-500 block text-[9px]">{isAr ? 'هجوم' : 'POW'}</span>
                                <span className="text-red-400 font-bold">{piece.power}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[9px]">{isAr ? 'دفاع' : 'DEF'}</span>
                                <span className="text-blue-400 font-bold">{piece.defense}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[9px]">{isAr ? 'سرعة' : 'SPD'}</span>
                                <span className="text-emerald-400 font-bold">{piece.speed}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Choose Tactical Stance */}
                  <div>
                    <span className="text-xs font-bold text-amber-400 block mb-2">
                      {isAr ? '2. اختر النهج التكتيكي السري (كشف متزامن):' : '2. Select Your Secret Tactical Stance:'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {stances.map((s) => {
                        const isSelected = selectedStance === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => selectDuelPieceAndStance(selectedPiece.id, s.id)}
                            className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-neutral-850 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                                : 'bg-neutral-850/70 border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xl">{s.icon}</span>
                              <span className="text-sm font-bold text-white">
                                {isAr ? s.nameAr : s.nameEn}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 leading-relaxed">
                              {isAr ? s.descAr : s.descEn}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Secret Order Button */}
                  <div className="pt-2">
                    <button
                      onClick={opponentIsBot ? submitDuelRoundOrder : handlePvPOrderSubmit}
                      disabled={isOrderSubmitted}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Swords className="w-4 h-4" />
                      <span>{isAr ? 'تأكيد وإقفال الأمر السري (كشف متزامن)' : 'Commit & Lock Secret Order'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Duel History / Combat Log */}
              {history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <span className="text-xs font-bold text-neutral-400 block">
                    {isAr ? 'سجل اشتباكات الجولات السابقة:' : 'Rounds Clash Log:'}
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {history.map((h, i) => (
                      <div 
                        key={i} 
                        className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-purple-400">
                            {isAr ? `الجولة ${h.round}` : `Round ${h.round}`}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-blue-400 font-semibold">
                              {isAr ? h.playerPiece.nameAr : h.playerPiece.nameEn} ({h.playerOrder.stance})
                            </span>
                            <span className="text-neutral-500 text-[10px]">VS</span>
                            <span className="text-red-400 font-semibold">
                              {isAr ? h.opponentPiece.nameAr : h.opponentPiece.nameEn} ({h.opponentOrder.stance})
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          {isAr ? h.clashSummaryAr : h.clashSummaryEn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

