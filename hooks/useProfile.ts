import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  UserProfile,
  OtherUser,
  GuessRecord,
  EnrichedUserProfile,
  SetProfilePayload,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PROFILE_STORAGE_PREFIX = 'gageUserProfile_firebase_uid_v1_';
const ACTIVE_GAGE_USER_ID_KEY = 'activeGageUserFirebaseUid_v1';

// Calculate age from date-of-birth string
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

// Get all profiles except the current user from localStorage
export function getAvailableProfilesForGuessing(currentUserId: string): OtherUser[] {
  const profiles: OtherUser[] = [];
  if (typeof window === 'undefined' || !window.localStorage) return profiles;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PROFILE_STORAGE_PREFIX)) {
      const userIdFromKey = key.substring(PROFILE_STORAGE_PREFIX.length);
      if (userIdFromKey === currentUserId) continue;
      try {
        const storedProfileString = localStorage.getItem(key);
        if (storedProfileString) {
          const userProfile = JSON.parse(storedProfileString) as UserProfile;
          if (userProfile && userProfile.id && userProfile.dob && userProfile.photoBase64) {
            profiles.push({
              id: userProfile.id,
              actualAge: calculateAge(userProfile.dob),
              photoBase64: userProfile.photoBase64,
              name: userProfile.name || 'Gage User',
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to parse profile from localStorage key ${key}:`, e);
      }
    }
  }
  return profiles;
}

// Convert an image URL to a Base64 data URL
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
    console.error('Error converting image to base64:', error);
    return null;
  }
}

// Main profile hook
export function useProfileHook() {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [profileState, setProfileState] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Load user profile from localStorage and Firestore
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
          let parsedProfile: UserProfile | null = storedProfile
            ? JSON.parse(storedProfile)
            : null;

          // If not in local storage, create a new profile
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

          // Fetch guess stats from Firestore
          try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
              await setDoc(docRef, {
                communityAverageGuessTotal: 0,
                numberOfCommunityGuesses: 0,
                createdAt: new Date(),
              });
              parsedProfile.communityAverageGuess = null;
              parsedProfile.numberOfCommunityGuesses = 0;
            } else {
              const firestoreData = docSnap.data();
              const total = firestoreData.communityAverageGuessTotal ?? 0;
              const count = firestoreData.numberOfCommunityGuesses ?? 0;
              parsedProfile.communityAverageGuess = count > 0 ? total / count : null;
              parsedProfile.numberOfCommunityGuesses = count;
            }
          } catch (error) {
            console.warn('Failed to load or create Firestore user document:', error);
          }

          setProfileState(parsedProfile);
          localStorage.setItem(localKey, JSON.stringify(parsedProfile));
          localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, currentUser.uid);
        } catch (error) {
          console.error('Failed to load or create profile:', error);
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

  // Persist profile to localStorage when changed
  useEffect(() => {
    if (isProfileLoading || isAuthLoading) return;
    if (profileState && profileState.id) {
      localStorage.setItem(PROFILE_STORAGE_PREFIX + profileState.id, JSON.stringify(profileState));
      localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, profileState.id);
    } else if (!profileState) {
      const activeUserId = localStorage.getItem(ACTIVE_GAGE_USER_ID_KEY);
      if (activeUserId) {
        localStorage.removeItem(ACTIVE_GAGE_USER_ID_KEY);
      }
    }
  }, [profileState, isProfileLoading, isAuthLoading]);

  // Set/update profile data in memory
  const setProfileData = useCallback(
    async (data: SetProfilePayload) => {
      setProfileState(prev => {
        if (!prev || !currentUser || prev.id !== currentUser.uid) return prev;
        return {
          ...prev,
          ...data,
          hasProvidedDob: data.dob !== undefined ? !!data.dob : prev.hasProvidedDob,
          photoFromGoogle:
            data.photoFromGoogle !== undefined ? data.photoFromGoogle : prev.photoFromGoogle,
        };
      });
    },
    [currentUser]
  );

  // Update guessing stats for the current user (local only)
  const updateUserGuessingStats = useCallback(
    (pointsEarned: number, guessedUser: OtherUser, userGuess: number) => {
      setProfileState(prev => {
        if (!prev) return null;
        const newGuessRecord: GuessRecord = {
          guessedUserId: guessedUser.id,
          guessedUserName: guessedUser.name,
          guessedUserPhotoBase64: guessedUser.photoBase64,
          theirActualAge: guessedUser.actualAge,
          yourGuess: userGuess,
          pointsEarned,
        };
        return {
          ...prev,
          myTotalGuessingPoints: prev.myTotalGuessingPoints + pointsEarned,
          myNumberOfGuessesMade: prev.myNumberOfGuessesMade + 1,
          lastThreeGuesses: [newGuessRecord, ...prev.lastThreeGuesses].slice(0, 3),
        };
      });
    },
    []
  );

  // Update guessing stats for a community user (Firestore logic)
  const addCommunityGuess = useCallback(
    async (targetUserId: string, guessedAge: number) => {
      try {
        const docRef = doc(db, 'users', targetUserId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const prevTotal = typeof data.communityAverageGuessTotal === 'number' ? data.communityAverageGuessTotal : 0;
          const prevCount = typeof data.numberOfCommunityGuesses === 'number' ? data.numberOfCommunityGuesses : 0;
          await updateDoc(docRef, {
            communityAverageGuessTotal: prevTotal + guessedAge,
            numberOfCommunityGuesses: prevCount + 1,
          });
        } else {
          await setDoc(docRef, {
            communityAverageGuessTotal: guessedAge,
            numberOfCommunityGuesses: 1,
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error updating community guess stats in Firestore:', error);
      }
    },
    []
  );

  // Clear profile
  const clearProfile = useCallback(() => {
    setProfileState(null);
  }, []);

  // Enrich profile (computed fields)
  const enrichedProfile = useMemo((): EnrichedUserProfile | null => {
    if (!profileState) return null;
    const isComplete = !!profileState.dob && !!profileState.photoBase64;
    return {
      ...profileState,
      actualAge: calculateAge(profileState.dob),
      isProfileComplete: isComplete,
    };
  }, [profileState]);

  return {
    profile: enrichedProfile,
    setProfileData,
    updateUserGuessingStats,
    addCommunityGuess, // <-- for updating guesses in firestore
    clearProfile,
    isLoading: isProfileLoading,
  };
}
