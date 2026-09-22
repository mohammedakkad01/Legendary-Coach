/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase Context & Provider
 * Manages Google Auth, Firestore Cloud Sync, Community Tactics, and Network state.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  testConnection,
  signInWithGoogle,
  logOut,
  saveCareerToFirestore,
  fetchUserSavesFromFirestore,
  deleteUserSaveFromFirestore,
  publishTacticToFirestore,
  fetchCommunityTacticsFromFirestore,
  likeTacticInFirestore,
  CloudSaveMetadata,
  CloudCommunityTactic
} from './firebase';
import { useGameStore } from '../state/useGameStore';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  cloudSaves: CloudSaveMetadata[];
  communityTactics: CloudCommunityTactic[];
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveCareerToCloud: (saveName?: string) => Promise<{ success: boolean; message: string }>;
  loadCareerFromCloud: (save: CloudSaveMetadata) => Promise<{ success: boolean; message: string }>;
  deleteCloudSave: (saveId: string) => Promise<void>;
  refreshCloudSaves: () => Promise<void>;
  shareCurrentTactic: (title: string) => Promise<{ success: boolean; message: string }>;
  likeTactic: (tacticId: string, currentLikes: number) => Promise<void>;
  refreshTactics: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cloudSaves, setCloudSaves] = useState<CloudSaveMetadata[]>([]);
  const [communityTactics, setCommunityTactics] = useState<CloudCommunityTactic[]>([]);

  const { 
    club, 
    currentSport, 
    vipPoints, 
    storyMissions, 
    exportGameData, 
    importCustomDataPack, 
    language,
    hasClaimedLoginBonus,
    claimLoginBonus,
    setIsGuest
  } = useGameStore();
  const isAr = language === 'ar';

  // Listen to Auth state and test Firestore on boot
  useEffect(() => {
    testConnection().then((online) => setIsOnline(online));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setIsGuest(false);
        // Grant 300 gems login bonus on first login!
        if (!hasClaimedLoginBonus) {
          claimLoginBonus();
        }
        try {
          const saves = await fetchUserSavesFromFirestore(currentUser.uid);
          setCloudSaves(saves);
        } catch (e) {
          console.error('Error fetching initial saves:', e);
        }
      } else {
        setCloudSaves([]);
      }
    });

    // Load initial community tactics
    fetchCommunityTacticsFromFirestore()
      .then(tactics => setCommunityTactics(tactics))
      .catch(err => console.error('Error fetching tactics:', err));

    return () => unsubscribe();
  }, [hasClaimedLoginBonus]);

  const refreshCloudSaves = async () => {
    if (!user) return;
    try {
      const saves = await fetchUserSavesFromFirestore(user.uid);
      setCloudSaves(saves);
    } catch (e) {
      console.error('Error refreshing saves:', e);
    }
  };

  const refreshTactics = async () => {
    try {
      const tactics = await fetchCommunityTacticsFromFirestore();
      setCommunityTactics(tactics);
    } catch (e) {
      console.error('Error refreshing community tactics:', e);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setUser(null);
      setCloudSaves([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const saveCareerToCloud = async (saveName?: string) => {
    if (!user) {
      return {
        success: false,
        message: isAr ? 'يجب تسجيل الدخول بحساب Google أولاً للحفظ السحابي.' : 'Please sign in with Google first to save to cloud.'
      };
    }

    try {
      const saveId = `save_${Date.now()}`;
      const payload = exportGameData();
      const firstMission = storyMissions.find(m => !m.isCompleted);
      const missionId = firstMission ? firstMission.id : 10;

      await saveCareerToFirestore(user.uid, saveId, {
        clubName: saveName || club.name,
        currentSport,
        reputation: club.finances.reputation,
        coins: club.finances.coins,
        diamonds: 0,
        vipPoints,
        currentChapter: 1,
        currentMissionId: missionId,
        savePayload: payload
      });

      await refreshCloudSaves();
      return {
        success: true,
        message: isAr ? 'تم حفظ مسيرة النادي بنجاح في السحابة (Firestore)!' : 'Career save synchronized to Firestore cloud successfully!'
      };
    } catch (error: any) {
      return {
        success: false,
        message: isAr ? `فشل الحفظ السحابي: ${error?.message || 'خطأ غير متوقع'}` : `Failed cloud save: ${error?.message || 'Unexpected error'}`
      };
    }
  };

  const loadCareerFromCloud = async (save: CloudSaveMetadata) => {
    try {
      const res = importCustomDataPack(save.savePayload);
      if (res.success) {
        return {
          success: true,
          message: isAr ? `تم استرجاع مسيرة "${save.clubName}" من السحابة بنجاح!` : `Loaded "${save.clubName}" career from Firestore!`
        };
      }
      return res;
    } catch (error: any) {
      return {
        success: false,
        message: isAr ? `فشل استرجاع الملف: ${error?.message || 'بيانات تالفة'}` : `Failed to load: ${error?.message || 'Corrupted data'}`
      };
    }
  };

  const deleteCloudSave = async (saveId: string) => {
    if (!user) return;
    try {
      await deleteUserSaveFromFirestore(user.uid, saveId);
      await refreshCloudSaves();
    } catch (error) {
      console.error('Failed to delete save:', error);
    }
  };

  const shareCurrentTactic = async (title: string) => {
    if (!user) {
      return {
        success: false,
        message: isAr ? 'يرجى تسجيل الدخول لمشاركة خطتك مع المدربين.' : 'Please sign in to share your tactics.'
      };
    }

    try {
      const tacticId = `tactic_${Date.now()}`;
      const tacticData = currentSport === 'football' ? club.footballTactics : null;

      const newTactic: CloudCommunityTactic = {
        id: tacticId,
        authorId: user.uid,
        authorName: user.displayName || (isAr ? 'كابتن مجهول' : 'Coach'),
        title: title.trim() || (isAr ? `تكتيك ${club.name}` : `${club.name} Master Tactic`),
        sport: currentSport,
        formation: tacticData ? tacticData.formation : 'Standard',
        mentality: tacticData ? tacticData.mentality : 'balanced',
        pressing: tacticData ? tacticData.pressing : 'mid_block',
        likesCount: 0,
        createdAt: new Date().toISOString()
      };

      await publishTacticToFirestore(newTactic);
      await refreshTactics();
      return {
        success: true,
        message: isAr ? 'تم نشر خطتك التكتيكية في سحابة مجتمع المدربين!' : 'Tactic published to community tactics cloud!'
      };
    } catch (error: any) {
      return {
        success: false,
        message: isAr ? `فشل نشر التكتيك: ${error?.message || 'خطأ'}` : `Failed to share tactic: ${error?.message || 'Error'}`
      };
    }
  };

  const likeTactic = async (tacticId: string, currentLikes: number) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      await likeTacticInFirestore(tacticId, currentLikes);
      setCommunityTactics(prev => prev.map(t => t.id === tacticId ? { ...t, likesCount: t.likesCount + 1 } : t));
    } catch (error) {
      console.error('Failed to like tactic:', error);
    }
  };

  const contextValue = useMemo(() => ({
    user,
    loading,
    isOnline,
    cloudSaves,
    communityTactics,
    authModalOpen,
    setAuthModalOpen,
    loginWithGoogle: handleLogin,
    logout: handleLogout,
    saveCareerToCloud,
    loadCareerFromCloud,
    deleteCloudSave,
    refreshCloudSaves,
    shareCurrentTactic,
    likeTactic,
    refreshTactics
  }), [user, loading, isOnline, authModalOpen, cloudSaves, communityTactics, club, currentSport, vipPoints, storyMissions, language]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
