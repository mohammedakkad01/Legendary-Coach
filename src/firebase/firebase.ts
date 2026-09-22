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
  updateDoc
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
