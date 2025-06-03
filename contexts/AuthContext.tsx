import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      setIsLoading(false);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setIsLoading(false);
      return null;
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
    // This initial loading screen can be customized or removed if App.tsx handles global loading better
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0E1D1]">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-slate-700">Authenticating...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, signInWithGoogle, signOut }}>
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
