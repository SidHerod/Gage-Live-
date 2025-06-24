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
        try {
          const localKey = PROFILE_STORAGE_PREFIX + currentUser.uid;
          const storedProfile = localStorage.getItem(localKey);
          let parsedProfile: UserProfile | null = null; // ← skip using stale localStorage
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          const firestoreData = docSnap.exists() ? docSnap.data() : {};

          parsedProfile = {
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
          parsedProfile.communityAverageGuess = count > 0 ? total / count : null;
          parsedProfile.numberOfCommunityGuesses = count;

          await setDoc(docRef, {
            communityAverageGuessTotal: firestoreData.communityAverageGuessTotal || 0,
            numberOfCommunityGuesses: firestoreData.numberOfCommunityGuesses || 0,
            photoBase64: parsedProfile.photoBase64 || null,
            name: parsedProfile.name,
            dob: parsedProfile.dob,
            hasProvidedDob: parsedProfile.dob ? true : false,
            createdAt: firestoreData.createdAt || new Date(),
          }, { merge: true });

          setProfileState(parsedProfile);
          localStorage.setItem(localKey, JSON.stringify(parsedProfile));
          localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, currentUser.uid);
        } catch (error) {
          console.error('Profile load/create error:', error);
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

      if (currentUser?.uid) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          await updateDoc(docRef, {
            ...data,
            hasProvidedDob: data.dob ? true : undefined,
          });
        } catch (error) {
          console.error("Failed to update Firestore in setProfileData:", error);
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
