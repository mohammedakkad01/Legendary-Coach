/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Simultaneous Reveal Tactical Duel (صانع المعارك والكشف المتزامن)
 * Balanced war pieces, tactical stances, and rock-paper-scissors counter matrix.
 * Stances:
 *   - attack (هجوم ساحق): Beats Flank (+35% dmg), Loses to Defend
 *   - defend (دفاع حصين): Absorbs Attack (-70% received dmg & counters +25%), Loses to Flank
 *   - flank (التفاف تكتيكي): Outmaneuvers Defend (+40% bypass dmg), Loses to Direct Attack
 */

import { DuelPiece, TacticalStance, TacticalDuelRoundResult, TacticalDuelOrder } from '../types/game';

export const DUEL_PIECES_CATALOG: DuelPiece[] = [
  {
    id: 'piece_heavy_catapult',
    nameAr: 'منجنيق الحصار العملاق',
    nameEn: 'Heavy Siege Catapult',
    type: 'siege',
    power: 85,
    defense: 40,
    speed: 30,
    icon: '🏰',
    descriptionAr: 'قوة تدميرية هائلة بعيدة المدى، ساحقة في الهجمات المباشرة لكن بطيئة الحركة.',
    descriptionEn: 'Devastating kinetic bombardment; crushes lines but slow to turn.'
  },
  {
    id: 'piece_phalanx_guard',
    nameAr: 'جدار الترس الحديدي (الفلانكس)',
    nameEn: 'Iron Phalanx Guard',
    type: 'phalanx',
    power: 50,
    defense: 90,
    speed: 40,
    icon: '🛡️',
    descriptionAr: 'حصن دفاعي منيع يصد أعتى الضربات ويرد بهجمات مرتدة حاسمة.',
    descriptionEn: 'Impenetrable shield formation absorbing heavy damage and countering.'
  },
  {
    id: 'piece_desert_cavalry',
    nameAr: 'خيالة الصحراء السريعة',
    nameEn: 'Desert Light Cavalry',
    type: 'cavalry',
    power: 70,
    defense: 45,
    speed: 95,
    icon: '🐎',
    descriptionAr: 'سرعة البرق والالتفاف حول دفاعات الخصم لضرب نقاط الضعف الخلفية.',
    descriptionEn: 'Lightning speed units specializing in flanking and exploiting rear gaps.'
  },
  {
    id: 'piece_composite_archers',
    nameAr: 'رماة السهام المركبة',
    nameEn: 'Composite Bow Archers',
    type: 'archer',
    power: 65,
    defense: 50,
    speed: 70,
    icon: '🏹',
    descriptionAr: 'وابل مستمر من السهام يربك تشكيلات العدو ويدعم كل المناورات.',
    descriptionEn: 'Continuous arrow barrage disrupting enemy maneuvers.'
  },
  {
    id: 'piece_vanguard_infantry',
    nameAr: 'مشاة الطليعة المقاتلة',
    nameEn: 'Vanguard Infantry',
    type: 'infantry',
    power: 60,
    defense: 65,
    speed: 60,
    icon: '⚔️',
    descriptionAr: 'وحدة متوازنة قادرة على التكيف مع الهجوم والدفاع بمرونة عالية.',
    descriptionEn: 'All-round disciplined troops versatile in both offense and holding lines.'
  },
  {
    id: 'piece_siege_ram',
    nameAr: 'كبش الحصار المدرع',
    nameEn: 'Armored Battering Ram',
    type: 'siege',
    power: 90,
    defense: 55,
    speed: 35,
    icon: '🦏',
    descriptionAr: 'رأس حربة معدنية لتحطيم البوابات وكسر التكتلات الدفاعية.',
    descriptionEn: 'Heavy reinforced ram designed to breach any entrenched fortress.'
  }
];

export function getRandomDuelDraft(count: number = 3): DuelPiece[] {
  const shuffled = [...DUEL_PIECES_CATALOG].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Intelligent Bot Decision Logic:
 * Level 1: Novice (Weighted random)
 * Level 2: Tactical Commander (Heuristic Counter-Matrix evaluating player options)
 */
export function getBotDuelOrder(
  round: number,
  botPieces: DuelPiece[],
  playerPieces: DuelPiece[],
  difficulty: 'novice' | 'tactical' = 'tactical'
): { piece: DuelPiece; stance: TacticalStance } {
  const piece = botPieces[Math.floor(Math.random() * botPieces.length)] || DUEL_PIECES_CATALOG[0];

  if (difficulty === 'novice') {
    const stances: TacticalStance[] = ['attack', 'attack', 'defend', 'flank'];
    const stance = stances[Math.floor(Math.random() * stances.length)];
    return { piece, stance };
  }

  // Tactical Commander logic:
  // Evaluates player's strongest piece type
  const highestPowerPlayerPiece = [...playerPieces].sort((a, b) => b.power - a.power)[0];
  let stance: TacticalStance = 'defend';

  if (highestPowerPlayerPiece && highestPowerPlayerPiece.power > 75) {
    // Expecting player to attack -> Counter with defend (soak & counter) or flank
    stance = Math.random() > 0.4 ? 'defend' : 'flank';
  } else {
    // Balanced or lower power -> Go for decisive attack
    stance = Math.random() > 0.4 ? 'attack' : 'flank';
  }

  return { piece, stance };
}

/**
 * Atomic Resolution Function for Simultaneous Reveal
 */
export function resolveSimultaneousDuelRound(
  round: number,
  p1Order: TacticalDuelOrder,
  p2Order: TacticalDuelOrder,
  p1Piece: DuelPiece,
  p2Piece: DuelPiece,
  p1Name: string,
  p2Name: string
): TacticalDuelRoundResult {
  let damageToP1 = 0;
  let damageToP2 = 0;
  let clashSummaryAr = '';
  let clashSummaryEn = '';

  const p1Base = p1Piece.power;
  const p2Base = p2Piece.power;

  // Stance Matrix:
  // attack vs attack: Mutual heavy clash
  // attack vs defend: Defend absorbs and counters
  // attack vs flank: Attack smashes flanker head-on
  // defend vs flank: Flanker bypasses shield and strikes rear
  // defend vs defend: Stalemate minor chip damage
  // flank vs flank: Speed duel

  if (p1Order.stance === 'attack' && p2Order.stance === 'attack') {
    damageToP1 = Math.round(p2Base * 0.4);
    damageToP2 = Math.round(p1Base * 0.4);
    clashSummaryAr = `اشتباك هجومي متبادل وجهاً لوجه! اصطدم ${p1Piece.nameAr} بـ ${p2Piece.nameAr} في معركة طاحنة.`;
    clashSummaryEn = `Head-on clash! Both commanders ordered an all-out attack resulting in heavy mutual casualties.`;
  } else if (p1Order.stance === 'attack' && p2Order.stance === 'defend') {
    damageToP1 = Math.round(p2Piece.defense * 0.35);
    damageToP2 = Math.round(p1Base * 0.12);
    clashSummaryAr = `نجح ${p2Name} في بناء درع دفاعي حصين وامتصاص هجوم ${p1Piece.nameAr} بالكامل والرد بهجمة مرتدة موجعة!`;
    clashSummaryEn = `${p2Name} absorbed the attack with defensive fortitude and executed a sharp counter-thrust.`;
  } else if (p1Order.stance === 'defend' && p2Order.stance === 'attack') {
    damageToP1 = Math.round(p2Base * 0.12);
    damageToP2 = Math.round(p1Piece.defense * 0.35);
    clashSummaryAr = `تكتيك دفاعي محكم! امتص درع ${p1Piece.nameAr} اندفاع الخصم وألحق به خسائر بالغة.`;
    clashSummaryEn = `Brilliant defensive block! Your fortifications held firm and broke the attacker's line.`;
  } else if (p1Order.stance === 'flank' && p2Order.stance === 'defend') {
    damageToP1 = Math.round(p2Piece.defense * 0.1);
    damageToP2 = Math.round(p1Piece.speed * 0.45);
    clashSummaryAr = `مناورة التفاف عبقرية! تجاوزت وحدات ${p1Piece.nameAr} خط الدفاع الثابت وضربت المؤخرة مباشرة!`;
    clashSummaryEn = `Masterful flank maneuver! Your units swept around the rigid defense to strike exposed rear ranks.`;
  } else if (p1Order.stance === 'defend' && p2Order.stance === 'flank') {
    damageToP1 = Math.round(p2Piece.speed * 0.45);
    damageToP2 = Math.round(p1Piece.defense * 0.1);
    clashSummaryAr = `باغت الخصم خط دفاعك بمناورة التفافية سريعة كبدتك أضراراً جانبية.`;
    clashSummaryEn = `The opponent outmaneuvered your shield wall with swift flanking cavalry.`;
  } else if (p1Order.stance === 'attack' && p2Order.stance === 'flank') {
    damageToP1 = Math.round(p2Piece.speed * 0.15);
    damageToP2 = Math.round(p1Base * 0.45);
    clashSummaryAr = `سحق مباشر! قطع هجوم ${p1Piece.nameAr} طريق المناورة على الخصم وضربه ضربة قاصمة!`;
    clashSummaryEn = `Frontal assault intercepted the flanker midway with devastating kinetic impact!`;
  } else if (p1Order.stance === 'flank' && p2Order.stance === 'attack') {
    damageToP1 = Math.round(p2Base * 0.45);
    damageToP2 = Math.round(p1Piece.speed * 0.15);
    clashSummaryAr = `اصطدمت محاولة الالتفاف باندفاع هجومي مباشر من الخصم أفشل المناورة.`;
    clashSummaryEn = `Flank attempt intercepted by opposing direct vanguard assault.`;
  } else {
    // Both defend or both flank
    damageToP1 = 10;
    damageToP2 = 10;
    clashSummaryAr = `مناورات تكتيكية متطابقة، تبادل الطرفان الضربات التمويهية بحذر.`;
    clashSummaryEn = `Symmetrical tactics resulted in cautious skirmishing and minor attrition.`;
  }

  let roundWinner: 'player' | 'opponent' | 'tie' = 'tie';
  if (damageToP2 > damageToP1) roundWinner = 'player';
  else if (damageToP1 > damageToP2) roundWinner = 'opponent';

  return {
    round,
    playerOrder: p1Order,
    opponentOrder: p2Order,
    playerPiece: p1Piece,
    opponentPiece: p2Piece,
    damageToPlayer: damageToP1,
    damageToOpponent: damageToP2,
    roundWinner,
    clashSummaryAr,
    clashSummaryEn
  };
}
