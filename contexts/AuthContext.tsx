import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<FirebaseUser | null>;
  loginWithEmail: (email: string, password: string) => Promise<FirebaseUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ✅ Set explicit persistence
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setIsLoading(false);
        });
        return unsubscribe;
      })
      .catch((error) => {
        console.error("Failed to set auth persistence", error);
        setIsLoading(false);
      });
  }, []);

  const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);

      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          email: result.user.email,
          name: result.user.displayName,
          photoBase64: '',
          dob: '',
          hasProvidedDob: false,
          communityAverageGuessTotal: 0,
          numberOfCommunityGuesses: 0,
          guessHistory: [],
          createdAt: new Date(),
        },
        { merge: true }
      );

      return result.user;
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        email,
        name: displayName,
        photoBase64: '',
        dob: '',
        hasProvidedDob: false,
        communityAverageGuessTotal: 0,
        numberOfCommunityGuesses: 0,
        guessHistory: [],
        createdAt: new Date(),
      });

      setCurrentUser(result.user);
      return result.user;
    } catch (error) {
      console.error("Email Sign-Up Error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUser(result.user);
      return result.user;
    } catch (error) {
      console.error("Email Login Error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Sign Out Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0E1D1]">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-slate-700">Authenticating...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        signInWithGoogle,
        signOut,
        signUpWithEmail,
        loginWithEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
