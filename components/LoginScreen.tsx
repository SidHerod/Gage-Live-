import React, { useState } from 'react';
import { SparklesIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const LoginScreen: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const { signInWithGoogle, signUpWithEmail, loginWithEmail, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        navigate('/account');
      }
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error("Google Sign-In error:", err);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setError('Please enter your name.');
          return;
        }
        const user = await signUpWithEmail(email, password, displayName);
        if (user) {
          const userRef = doc(db, 'users', user.uid);
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
          // ✅ Removed: navigate('/account');
        }
      } else {
        const user = await loginWithEmail(email, password);
        if (user) {
          navigate('/account');
        }
      }
    } catch (err) {
      setError('Email authentication failed. Please try again.');
      console.error("Email auth error:", err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff4545] to-[#ff1818]">
            Welcome to GAGE
          </h2>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isAuthLoading}
          className="w-full flex items-center justify-center px-6 py-3 rounded-lg shadow-md text-base font-medium text-white bg-[#ff1818] hover:bg-[#e00000] transition-all duration-150 ease-in-out transform hover:scale-105 disabled:opacity-70"
        >
          <SparklesIcon className="w-5 h-5 mr-2" />
          {isAuthLoading ? 'Signing In...' : 'Sign In with Google'}
        </button>

        <div className="relative text-center">
          <span className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full border-t border-gray-300"></span>
          <span className="relative px-2 text-sm text-gray-500 bg-transparent">or</span>
        </div>

        <form onSubmit={handleEmailSubmit} className="bg-white p-6 rounded-xl shadow-2xl space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff1818]"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff1818]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff1818]"
            required
          />

          {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={isAuthLoading}
            className="w-full flex items-center justify-center px-6 py-3 rounded-lg shadow-md text-base font-medium text-white bg-[#ff1818] hover:bg-[#e00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-all duration-150 ease-in-out transform hover:scale-105 disabled:opacity-70"
          >
            {isAuthLoading ? 'Processing...' : isSignUp ? 'Sign Up with Email' : 'Login with Email'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[#ff1818] hover:underline font-medium"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
