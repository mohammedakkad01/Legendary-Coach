/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Client-side integration for Football Data Layer 1 & Layer 2
 * - Checks status & quota
 * - Initiates manual league syncs
 * - Clones Layer 1 real clubs & players into Layer 2 (user_saves/{userId})
 */

import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/firebase';
import { Player, Club } from '../types/game';

export interface QuotaStatus {
  configured: boolean;
  message?: string;
  requests?: {
    current: number;
    limit_day: number;
  };
  remainingSafe?: number;
  account?: {
    firstname: string;
    email: string;
  };
  subscription?: {
    plan: string;
    end: string;
    active: boolean;
  };
}

export interface SyncResult {
  success: boolean;
  message?: string;
  requestsUsed?: number;
  quotaRemaining?: number;
  league?: any;
  clubsCount?: number;
  log?: any;
}

/**
 * Fetch free /status endpoint via Express proxy
 */
export async function checkFootballApiStatus(): Promise<QuotaStatus> {
  try {
    const res = await fetch('/api/football/status');
    if (!res.ok) {
      return {
        configured: false,
        message: 'خدمة خادم الكوتا غير نشطة في بيئة الاستضافة الثابتة (Static Host). يتم استخدام التخزين السحابي المحلي.',
      };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        configured: false,
        message: 'خدمة خادم الكوتا مخصصة لبيئة السيرفر النشطة. تعمل اللعبة في وضع العميل الثابت بكفاءة تامة.',
      };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error fetching API-Football status:', err);
    return {
      configured: false,
      message: 'تعذر الاتصال بخادم اللعبة الداخلي لفحص الكوتا.',
    };
  }
}

/**
 * Trigger manual single-league sync (costs exactly 4 requests)
 */
export async function syncRealLeague(leagueId: number, season: number = 2025): Promise<SyncResult> {
  try {
    const res = await fetch('/api/football/sync-league', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, season }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        message: 'مزامنة API الخارجية تتطلب تشغيل السيرفر الخلفي المخصص للكوتا (Node/Express Server). اللعبة تعمل بنجاح مع البيانات المحلية وسحابة Firebase.',
      };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'خطأ أثناء طلب مزامنة الدوري.',
    };
  }
}

/**
 * Fetch Layer 1 cache from server
 */
export async function fetchFootballLayer1Cache() {
  try {
    const res = await fetch('/api/football/cache/all');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { leagues: {}, clubs: {}, players: {}, syncLogs: [] };
    }
    return await res.json();
  } catch (err) {
    console.error('Error fetching Layer 1 cache:', err);
    return { leagues: {}, clubs: {}, players: {}, syncLogs: [] };
  }
}

/**
 * LAYER 2 CLONING SERVICE
 * When user selects or customizes a club:
 * 1. Creates /user_saves/{userId}/club
 * 2. Clones all squad players into /user_saves/{userId}/club/players/{playerId}
 * 3. Base overall is preserved; player progression, training, and VIP boosts apply ONLY here.
 */
export async function cloneClubToUserSave(
  userId: string,
  club: Club,
  leagueId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'المستخدم غير مسجل الدخول لحفظ النادي بالسحابة.' };
  }

  const clubPath = `user_saves/${userId}/club`;
  try {
    const now = new Date().toISOString();
    
    // Save Layer 2 Club root document
    await setDoc(doc(db, 'user_saves', userId, 'club'), {
      id: club.id,
      userId,
      clonedFromClubId: club.id,
      clubName: club.name,
      leagueId,
      divisionName: club.divisionName,
      boardTrust: club.boardTrust,
      fanMood: club.fanMood,
      coins: club.finances.coins,
      diamonds: club.finances.diamonds,
      reputation: club.finances.reputation,
      seasonYear: 2025,
      updatedAt: now,
      clonedAt: now,
    }, { merge: true });

    // Clone each player into Layer 2 subcollection: user_saves/{userId}/club/players/{playerId}
    for (const player of club.footballSquad) {
      const playerPath = `user_saves/${userId}/club/players/${player.id}`;
      try {
        await setDoc(doc(db, 'user_saves', userId, 'club', 'players', player.id), {
          id: player.id,
          userId,
          realName: player.name,
          photoUrl: player.photoUrl || '',
          realPosition: player.position,
          nationality: player.nationality || 'العالم',
          isRealDataPlayer: true,
          baseOverall: player.overall,
          currentOverall: player.overall,
          potential: player.potential,
          trainingBonus: 0,
          vipBonus: 0,
          fatiguePenalty: player.fatigue || 0,
          morale: player.morale || 90,
          isRatingEstimated: false,
          lastTrainingDate: now,
        }, { merge: true });
      } catch (pErr) {
        console.warn(`Could not sync player ${player.name} to user save:`, pErr);
      }
    }

    return {
      success: true,
      message: 'تم استنساخ بيانات النادي واللاعبين بنجاح في الطبقة المستقلة الخاصة بك (Layer 2)!',
    };
  } catch (err: any) {
    console.error('Error cloning club to user save:', err);
    return {
      success: false,
      message: `تعذر حفظ بيانات النادي في السحابة: ${err.message}`,
    };
  }
}
