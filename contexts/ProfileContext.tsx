import React, { createContext, useContext, ReactNode } from 'react';
import { useProfileHook } from '../hooks/useProfile'; 
import type { EnrichedUserProfile, SetProfilePayload, OtherUser } from '../types';

interface ProfileContextType {
  profile: EnrichedUserProfile | null;
  setProfileData: (data: SetProfilePayload) => Promise<void>; // Updated signature
  updateUserGuessingStats: (pointsEarned: number, guessedUser: OtherUser, userGuess: number) => void;
  clearProfile: () => void;
  isLoading: boolean; // This is app profile loading, distinct from auth loading
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const profileManager = useProfileHook();
  return (
    <ProfileContext.Provider value={profileManager}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};