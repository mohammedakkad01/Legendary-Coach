/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase Client Initialization & Firestore Services
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Database ID must be passed as second parameter
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or database unreachable.');
      return false;
    }
    return true;
  }
}

// Authentication methods
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create or update user profile document
    const userDocPath = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        displayName: user.displayName || 'كابتن مجهول',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userDocPath);
    }

    return user;
  } catch (error: any) {
    console.error('Error during Google Sign In:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Cloud Career Saves
export interface CloudSaveMetadata {
  id: string;
  userId: string;
  clubName: string;
  currentSport: 'football' | 'basketball';
  reputation: number;
  coins: number;
  diamonds: number;
  vipPoints: number;
  currentChapter: number;
  currentMissionId: number;
  savePayload: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveCareerToFirestore(userId: string, saveId: string, data: Omit<CloudSaveMetadata, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const savePath = `users/${userId}/careerSaves/${saveId}`;
  try {
    const docRef = doc(db, 'users', userId, 'careerSaves', saveId);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...data,
      id: saveId,
      userId,
      createdAt: now,
      updatedAt: now
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, savePath);
  }
}

export async function fetchUserSavesFromFirestore(userId: string): Promise<CloudSaveMetadata[]> {
  const path = `users/${userId}/careerSaves`;
  try {
    const colRef = collection(db, 'users', userId, 'careerSaves');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => doc.data() as CloudSaveMetadata);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteUserSaveFromFirestore(userId: string, saveId: string): Promise<void> {
  const path = `users/${userId}/careerSaves/${saveId}`;
  try {
    const docRef = doc(db, 'users', userId, 'careerSaves', saveId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Community Tactics
export interface CloudCommunityTactic {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  sport: 'football' | 'basketball';
  formation: string;
  mentality: string;
  pressing: string;
  likesCount: number;
  createdAt: string;
}

export async function publishTacticToFirestore(tactic: CloudCommunityTactic): Promise<void> {
  const path = `tactics/${tactic.id}`;
  try {
    await setDoc(doc(db, 'tactics', tactic.id), tactic);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchCommunityTacticsFromFirestore(): Promise<CloudCommunityTactic[]> {
  const path = 'tactics';
  try {
    const colRef = collection(db, 'tactics');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as CloudCommunityTactic);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function likeTacticInFirestore(tacticId: string, currentLikes: number): Promise<void> {
  const path = `tactics/${tacticId}`;
  try {
    const docRef = doc(db, 'tactics', tacticId);
    await updateDoc(docRef, {
      likesCount: currentLikes + 1
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ==========================================
// Redeem Codes
// Docs live at /redeem_codes/{CODE} (10-char code = the doc ID, never listed —
// so it can only be reached by someone who was actually given the code).
// A per-user "claim" receipt at /redeem_codes/{CODE}/claims/{uid} makes each
// code single-use-per-account; redemptionsCount is bumped inside the SAME
// transaction so a max-redemptions cap can never be oversold by a race.
// ==========================================
export interface RedeemCodeDoc {
  code: string;
  type: 'dev' | 'player';
  active: boolean;
  maxRedemptions: number;       // 0 = unlimited
  redemptionsCount: number;
  restrictedToUid: string;      // '' = anyone with the code; else only this uid
  rewardCoins: number;
  rewardDiamonds: number;
  rewardTrainingPoints: number;
  labelAr?: string;
  labelEn?: string;
  createdAt: string;
}

export type RedeemCodeResult =
  | { status: 'success'; reward: { coins: number; diamonds: number; trainingPoints: number } }
  | { status: 'not_found' | 'inactive' | 'exhausted' | 'not_allowed' | 'already_redeemed' | 'error' };

/**
 * Atomically validates and redeems a gift code for `uid`.
 * Throws only on unexpected/network errors; expected failure modes come back
 * as a typed `status` so the UI can show a friendly Arabic/English message.
 */
export async function redeemGiftCodeInFirestore(uid: string, rawCode: string): Promise<RedeemCodeResult> {
  const code = rawCode.trim().toUpperCase();
  const codeRef = doc(db, 'redeem_codes', code);
  const claimRef = doc(db, 'redeem_codes', code, 'claims', uid);
  const path = `redeem_codes/${code}`;

  try {
    return await runTransaction(db, async (tx) => {
      const codeSnap = await tx.get(codeRef);
      if (!codeSnap.exists()) return { status: 'not_found' };

      const data = codeSnap.data() as RedeemCodeDoc;
      if (!data.active) return { status: 'inactive' };
      if (data.restrictedToUid && data.restrictedToUid !== uid) return { status: 'not_allowed' };
      if (data.maxRedemptions !== 0 && data.redemptionsCount >= data.maxRedemptions) return { status: 'exhausted' };

      const claimSnap = await tx.get(claimRef);
      if (claimSnap.exists()) return { status: 'already_redeemed' };

      tx.update(codeRef, { redemptionsCount: data.redemptionsCount + 1 });
      tx.set(claimRef, { uid, redeemedAt: new Date().toISOString() });

      return {
        status: 'success',
        reward: {
          coins: data.rewardCoins || 0,
          diamonds: data.rewardDiamonds || 0,
          trainingPoints: data.rewardTrainingPoints || 0,
        }
      } as const;
    });
  } catch (err) {
    // A permission-denied here almost always means the code was already
    // claimed by this account or has just been exhausted by someone else.
    console.error('Redeem code error:', err);
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}