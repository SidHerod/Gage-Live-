import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile, GuessRecord, EnrichedUserProfile, SetProfilePayload } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PROFILE_STORAGE_PREFIX = 'gageUserProfile_firebase_uid_v1_';
const ACTIVE_GAGE_USER_ID_KEY = 'activeGageUserFirebaseUid_v1';

export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function useProfileHook() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [profileState, setProfileState] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      setIsProfileLoading(true);
      return;
    }

    const loadProfile = async () => {
      setIsProfileLoading(true);

      if (currentUser && currentUser.uid) {
        const localKey = PROFILE_STORAGE_PREFIX + currentUser.uid;
        const docRef = doc(db, 'users', currentUser.uid);

        try {
          const docSnap = await getDoc(docRef);
          const firestoreData = docSnap.exists() ? docSnap.data() : {};

          const finalProfile: UserProfile = {
            id: currentUser.uid,
            email: currentUser.email || '',
            name: firestoreData.name || currentUser.displayName || 'Gage User',
            dob: firestoreData.dob || '',
            photoBase64: firestoreData.photoBase64 || null,
            photoFromGoogle: false,
            hasProvidedDob: firestoreData.hasProvidedDob || false,
            communityAverageGuess: null,
            numberOfCommunityGuesses: firestoreData.numberOfCommunityGuesses || 0,
            myTotalGuessingPoints: 0,
            myNumberOfGuessesMade: 0,
            lastThreeGuesses: [],
          };

          const total = firestoreData.communityAverageGuessTotal ?? 0;
          const count = firestoreData.numberOfCommunityGuesses ?? 0;
          finalProfile.communityAverageGuess = count > 0 ? total / count : null;
          finalProfile.numberOfCommunityGuesses = count;

          // Store in state and localStorage
          setProfileState(finalProfile);
          localStorage.setItem(localKey, JSON.stringify(finalProfile));
          localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, currentUser.uid);

          // Merge default doc fields
          await setDoc(
            docRef,
            {
              communityAverageGuessTotal: firestoreData.communityAverageGuessTotal || 0,
              numberOfCommunityGuesses: firestoreData.numberOfCommunityGuesses || 0,
              guessHistory: firestoreData.guessHistory || [],
              createdAt: firestoreData.createdAt || new Date(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error('🔥 Error loading profile from Firestore:', error);
          setProfileState(null);
        }
      } else {
        setProfileState(null);
        localStorage.removeItem(ACTIVE_GAGE_USER_ID_KEY);
      }

      setIsProfileLoading(false);
    };

    loadProfile();
  }, [currentUser, isAuthLoading]);

  useEffect(() => {
    if (isProfileLoading || isAuthLoading) return;
    if (profileState?.id) {
      localStorage.setItem(PROFILE_STORAGE_PREFIX + profileState.id, JSON.stringify(profileState));
      localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, profileState.id);
    } else {
      const id = localStorage.getItem(ACTIVE_GAGE_USER_ID_KEY);
      if (id) localStorage.removeItem(ACTIVE_GAGE_USER_ID_KEY);
    }
  }, [profileState, isProfileLoading, isAuthLoading]);

  const setProfileData = useCallback(
    async (data: SetProfilePayload) => {
      setProfileState(prev => {
        if (!prev || !currentUser || prev.id !== currentUser.uid) return prev;
        return {
          ...prev,
          ...data,
          hasProvidedDob: data.dob !== undefined ? !!data.dob : prev.hasProvidedDob,
        };
      });

      const updates: Record<string, any> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.dob !== undefined) {
        updates.dob = data.dob;
        updates.hasProvidedDob = true;
      }
      if (data.photoBase64 !== undefined) updates.photoBase64 = data.photoBase64;

      if (currentUser?.uid && Object.keys(updates).length > 0) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          await updateDoc(docRef, updates);
        } catch (error) {
          console.error("🔥 Failed to update profile in Firestore:", error);
        }
      }
    },
    [currentUser]
  );

  const updateUserGuessingStats = useCallback((points: number, guessedUser, guess: number) => {
    setProfileState(prev => {
      if (!prev) return null;
      const newGuess: GuessRecord = {
        guessedUserId: guessedUser.id,
        guessedUserName: guessedUser.name,
        guessedUserPhotoBase64: guessedUser.photoBase64,
        theirActualAge: guessedUser.actualAge,
        yourGuess: guess,
        pointsEarned: points,
      };
      return {
        ...prev,
        myTotalGuessingPoints: prev.myTotalGuessingPoints + points,
        myNumberOfGuessesMade: prev.myNumberOfGuessesMade + 1,
        lastThreeGuesses: [newGuess, ...prev.lastThreeGuesses].slice(0, 3),
      };
    });
  }, []);

  const clearProfile = useCallback(() => setProfileState(null), []);

  const enrichedProfile = useMemo((): EnrichedUserProfile | null => {
    if (!profileState) return null;
    return {
      ...profileState,
      actualAge: calculateAge(profileState.dob),
      isProfileComplete: !!profileState.dob && !!profileState.photoBase64,
    };
  }, [profileState]);

  return {
    profile: enrichedProfile,
    setProfileData,
    updateUserGuessingStats,
    clearProfile,
    isLoading: isProfileLoading,
  };
}
