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

async function convertUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
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
          let parsedProfile: UserProfile | null = storedProfile ? JSON.parse(storedProfile) : null;

          if (!parsedProfile) {
            let googlePhotoBase64: string | null = null;
            let photoIsFromGoogle = false;

            if (currentUser.photoURL) {
              googlePhotoBase64 = await convertUrlToBase64(currentUser.photoURL);
              if (googlePhotoBase64) photoIsFromGoogle = true;
            }

            parsedProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || 'Gage User',
              dob: '',
              photoBase64: googlePhotoBase64,
              photoFromGoogle: photoIsFromGoogle,
              hasProvidedDob: false,
              communityAverageGuess: null,
              numberOfCommunityGuesses: 0,
              myTotalGuessingPoints: 0,
              myNumberOfGuessesMade: 0,
              lastThreeGuesses: [],
            };
          }

          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            // 🔧 Create default doc for new users
            await setDoc(docRef, {
              communityAverageGuessTotal: 0,
              numberOfCommunityGuesses: 0,
              guessHistory: [], // <-- Key fix here
              createdAt: new Date(),
            });
          } else {
            const firestoreData = docSnap.data();
            const total = firestoreData.communityAverageGuessTotal ?? 0;
            const count = firestoreData.numberOfCommunityGuesses ?? 0;
            parsedProfile.communityAverageGuess = count > 0 ? total / count : null;
            parsedProfile.numberOfCommunityGuesses = count;
          }

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
          photoFromGoogle: data.photoFromGoogle !== undefined ? data.photoFromGoogle : prev.photoFromGoogle,
        };
      });

      if (data.dob && currentUser?.uid) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          await updateDoc(docRef, { hasProvidedDob: true });
        } catch (error) {
          console.error("Failed to update hasProvidedDob in Firestore:", error);
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
