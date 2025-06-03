import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile, OtherUser, GuessRecord, EnrichedUserProfile, SetProfilePayload } from '../types';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

const PROFILE_STORAGE_PREFIX = 'gageUserProfile_firebase_uid_v1_'; // Changed prefix for UID
const ACTIVE_GAGE_USER_ID_KEY = 'activeGageUserFirebaseUid_v1'; // Stores Firebase UID

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

export function getAvailableProfilesForGuessing(currentUserId: string): OtherUser[] {
  const profiles: OtherUser[] = [];
  if (typeof window === 'undefined' || !window.localStorage) {
    return profiles;
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PROFILE_STORAGE_PREFIX)) {
      const userIdFromKey = key.substring(PROFILE_STORAGE_PREFIX.length);
      if (userIdFromKey === currentUserId) {
        continue; 
      }
      try {
        const storedProfileString = localStorage.getItem(key);
        if (storedProfileString) {
          const userProfile = JSON.parse(storedProfileString) as UserProfile;
          if (
            userProfile &&
            userProfile.id &&
            userProfile.dob && // Must have DOB
            userProfile.photoBase64 // Must have photo
          ) {
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

// Helper function for base64 conversion
async function convertUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    return null;
  }
}

export function useProfileHook(): { 
  profile: EnrichedUserProfile | null;
  setProfileData: (data: SetProfilePayload) => Promise<void>;
  updateUserGuessingStats: (pointsEarned: number, guessedUser: OtherUser, userGuess: number) => void;
  clearProfile: () => void;
  isLoading: boolean; // This is app profile loading, not auth loading
} {
  const { currentUser, isLoading: isAuthLoading } = useAuth(); // Get  user and auth loading state
  const [profileState, setProfileState] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Load profile when  user changes or on initial load
  useEffect(() => {
    if (isAuthLoading) {
      setIsProfileLoading(true);
      return;
    }

    const loadProfile = async () => {
      setIsProfileLoading(true);
      if (currentUser && currentUser.uid) {
        try {
          const storedProfile = localStorage.getItem(PROFILE_STORAGE_PREFIX + currentUser.uid);
          if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile) as UserProfile;
            // Ensure essential fields from  are up-to-date if they somehow differ
            // (though typically they wouldn't once set unless changed outside this app)
            parsedProfile.email = currentUser.email || parsedProfile.email;
            // Name can be changed by user, so don't always override from currentUser.displayName
            // Photo can be changed by user, so don't always override from currentUser.photoURL

            // Defaulting missing fields for older profiles
            parsedProfile.hasProvidedDob = !!parsedProfile.dob;
            parsedProfile.photoFromGoogle = typeof parsedProfile.photoFromGoogle === 'boolean' ? parsedProfile.photoFromGoogle : false;
            parsedProfile.communityAverageGuess = parsedProfile.communityAverageGuess !== undefined ? parsedProfile.communityAverageGuess : null;
            parsedProfile.numberOfCommunityGuesses = parsedProfile.numberOfCommunityGuesses || 0;
            parsedProfile.myTotalGuessingPoints = parsedProfile.myTotalGuessingPoints || 0;
            parsedProfile.myNumberOfGuessesMade = parsedProfile.myNumberOfGuessesMade || 0;
            parsedProfile.lastThreeGuesses = parsedProfile.lastThreeGuesses || [];

            setProfileState(parsedProfile);
            localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, currentUser.uid);
          } else {
            // No stored profile, create a new one from  user data
            let googlePhotoBase64: string | null = null;
            let photoIsFromGoogle = false;
            if (currentUser.photoURL) {
              googlePhotoBase64 = await convertUrlToBase64(currentUser.photoURL);
              if (googlePhotoBase64) photoIsFromGoogle = true;
            }

            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || 'Gage User',
              dob: '', // User needs to provide this
              photoBase64: googlePhotoBase64,
              photoFromGoogle: photoIsFromGoogle,
              hasProvidedDob: false,
              communityAverageGuess: null,
              numberOfCommunityGuesses: 0,
              myTotalGuessingPoints: 0,
              myNumberOfGuessesMade: 0,
              lastThreeGuesses: [],
            };
            setProfileState(newProfile);
            localStorage.setItem(PROFILE_STORAGE_PREFIX + currentUser.uid, JSON.stringify(newProfile));
            localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, currentUser.uid);
          }
        } catch (error) {
          console.error("Failed to load or create profile from localStorage:", error);
          setProfileState(null); 
        }
      } else {
        // No  user logged in
        setProfileState(null);
        const activeUserId = localStorage.getItem(ACTIVE_GAGE_USER_ID_KEY);
        if (activeUserId) {
          // Optional: remove profile from local storage if user explicitly logs out
          // localStorage.removeItem(PROFILE_STORAGE_PREFIX + activeUserId); 
          localStorage.removeItem(ACTIVE_GAGE_USER_ID_KEY);
        }
      }
      setIsProfileLoading(false);
    };

    loadProfile();
  }, [currentUser, isAuthLoading]);


  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (isProfileLoading || isAuthLoading) { // Don't save while loading
      return; 
    }
    try {
      if (profileState && profileState.id) {
        localStorage.setItem(PROFILE_STORAGE_PREFIX + profileState.id, JSON.stringify(profileState));
        localStorage.setItem(ACTIVE_GAGE_USER_ID_KEY, profileState.id);
      } else if (!profileState) { // Profile is null (logged out or no  user)
        const activeUserId = localStorage.getItem(ACTIVE_GAGE_USER_ID_KEY);
        if (activeUserId) {
           // We don't remove the profile data itself, just the active user key,
           // so if they log back in, their data is still there.
           // To fully clear on logout, you'd remove PROFILE_STORAGE_PREFIX + activeUserId here.
        }
        localStorage.removeItem(ACTIVE_GAGE_USER_ID_KEY);
      }
    } catch (error) {
      console.error("Failed to update profile in localStorage:", error);
    }
  }, [profileState, isProfileLoading, isAuthLoading]);


  const setProfileData = useCallback(async (data: SetProfilePayload) => {
    setProfileState(prevProfile => {
      if (!prevProfile || !currentUser || prevProfile.id !== currentUser.uid) {
        // This should not happen if currentUser is always synced with profileState.id
        console.error("Profile update error: No previous profile or ID mismatch.");
        return prevProfile; 
      }

      const updatedProfile = { ...prevProfile };

      if (data.name !== undefined) updatedProfile.name = data.name;
      if (data.dob !== undefined) {
        updatedProfile.dob = data.dob;
        updatedProfile.hasProvidedDob = !!data.dob;
      }
      if (data.photoBase64 !== undefined) {
        updatedProfile.photoBase64 = data.photoBase64;
        // If user uploads a new photo, it's no longer "from Google" directly
        updatedProfile.photoFromGoogle = data.photoFromGoogle !== undefined ? data.photoFromGoogle : false;
      }
      if (data.hasProvidedDob !== undefined) { // Allow explicitly setting this
         updatedProfile.hasProvidedDob = data.hasProvidedDob;
      }


      return updatedProfile;
    });
  }, [currentUser]);


  const updateUserGuessingStats = useCallback((pointsEarned: number, guessedUser: OtherUser, userGuess: number) => {
    setProfileState(prevProfile => {
      if (!prevProfile) return null;

      const newGuessRecord: GuessRecord = {
        guessedUserId: guessedUser.id,
        guessedUserName: guessedUser.name,
        guessedUserPhotoBase64: guessedUser.photoBase64,
        theirActualAge: guessedUser.actualAge,
        yourGuess: userGuess,
        pointsEarned: pointsEarned,
      };

      const updatedLastThreeGuesses = [newGuessRecord, ...prevProfile.lastThreeGuesses].slice(0, 3);

      return {
        ...prevProfile,
        myTotalGuessingPoints: prevProfile.myTotalGuessingPoints + pointsEarned,
        myNumberOfGuessesMade: prevProfile.myNumberOfGuessesMade + 1,
        lastThreeGuesses: updatedLastThreeGuesses,
      };
    });
  }, []);

  const clearProfile = useCallback(() => {
    // This function's role changes. It's mostly called by  sign-out effect now.
    // If called manually, it might de-sync with  auth state.
    // For now, it just clears the local React state. The useEffect will handle localStorage.
    setProfileState(null);
  }, []);

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
    // setProfilePhotoAndMarkComplete is merged into setProfileData or handled by initial Google photo load
    updateUserGuessingStats, 
    clearProfile, 
    isLoading: isProfileLoading  // Renamed for clarity vs auth loading
  };
}