
import React, { useState } from 'react';
// import { useProfile } from '../contexts/ProfileContext'; // No longer directly using setProfileData here
import { GageLogoIcon, SparklesIcon } from './icons';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth to use signInWithGoogle

const LoginScreen: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { signInWithGoogle, isLoading: isAuthLoading } = useAuth();

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      // Navigation will be handled by App.tsx based on profile completion state after successful sign-in
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error("Google Sign-In error in LoginScreen:", err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
         <GageLogoIcon className="h-12 w-auto text-[#ff1818] mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff4545] to-[#ff1818]">
            Welcome to GAGE
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with Google to start guessing ages!
          </p>
        </div>
        
        <div className="mt-8 bg-white p-6 sm:p-8 rounded-xl shadow-2xl transform hover:scale-[1.01] transition-transform duration-300">
          {error && <p className="text-sm text-red-600 text-center mb-4" role="alert">{error}</p>}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isAuthLoading}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-[#ff1818] hover:bg-[#e00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-all duration-150 ease-in-out transform hover:scale-105 disabled:opacity-70"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {isAuthLoading ? 'Signing In...' : 'Sign In with Google'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
