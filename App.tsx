import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';

import LoginScreen from './components/LoginScreen';
import AccountScreen from './components/AccountScreen';
import PhotoUploadScreen from './components/PhotoUploadScreen';
import AgeGuessingScreen from './components/AgeGuessingScreen';
import StatisticsScreen from './components/StatisticsScreen';
import PrivacyPolicy from './components/PrivacyPolicy';
import PerfectHitScreen from './components/PerfectHitScreen';

import LoadingSpinner from './components/LoadingSpinner';
import {
  UserIcon,
  GageLogoIcon,
  ArrowRightStartOnRectangleIcon,
} from './components/icons';

const AppContent: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading, setProfileData } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine profile completeness
  const hasDob = !!profile?.dob;
  const hasPhoto = !!profile?.photoBase64;
  const profileIsComplete = currentUser && hasDob && hasPhoto;

  // Patch old profiles automatically: if dob exists but hasProvidedDob flag is missing, set it
  useEffect(() => {
    if (profile && hasDob && !profile.hasProvidedDob) {
      setProfileData({ hasProvidedDob: true }).catch((err) =>
        console.error("Error updating hasProvidedDob:", err)
      );
    }
  }, [profile, hasDob, setProfileData]);

  useEffect(() => {
    if (isAuthLoading || isProfileLoading) return;

    if (currentUser) {
      if (!profile) return;

      if (!hasDob && location.pathname !== '/account' && location.pathname !== '/upload-photo') {
        navigate('/upload-photo', { replace: true });
      } else if (!hasPhoto && location.pathname !== '/upload-photo') {
        navigate('/upload-photo', { replace: true });
      } else if (['/', '/login'].includes(location.pathname) && profileIsComplete) {
        navigate('/game', { replace: true });
      }
    } else if (location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [
    currentUser,
    profile,
    isAuthLoading,
    isProfileLoading,
    location.pathname,
    navigate,
    profileIsComplete,
    hasDob,
    hasPhoto,
  ]);

  if (isAuthLoading || (currentUser && isProfileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-slate-700">
          {isAuthLoading ? 'Authenticating...' : 'Loading profile...'}
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !currentUser ? (
            <LoginScreen />
          ) : (
            <Navigate
              to={
                profileIsComplete
                  ? '/game'
                  : !hasDob
                  ? '/upload-photo'
                  : '/upload-photo'
              }
              replace
            />
          )
        }
      />
      <Route
        path="/account"
        element={
          currentUser ? <AccountScreen /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/upload-photo"
        element={
          currentUser ? <PhotoUploadScreen /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/game"
        element={
          profileIsComplete ? (
            <AgeGuessingScreen />
          ) : (
            <Navigate to="/upload-photo" replace />
          )
        }
      />
      <Route
        path="/statistics"
        element={
          profileIsComplete ? (
            <StatisticsScreen />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/perfect-hit" element={<PerfectHitScreen />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const MainAppLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const hasDob = !!profile?.dob;
  const hasPhoto = !!profile?.photoBase64;
  const profileIsComplete = currentUser && hasDob && hasPhoto;

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F0E1D1] text-slate-800 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            <div className="w-1/3 flex justify-start">
              {currentUser && (
                <button
                  onClick={() => {
                    if (profileIsComplete) navigate('/statistics');
                    else navigate('/upload-photo');
                  }}
                  className="p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818]"
                >
                  {profile?.photoBase64 ? (
                    <img
                      src={profile.photoBase64}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-gray-500" />
                  )}
                </button>
              )}
            </div>

            <div className="w-1/3 flex justify-center">
              <button
                onClick={() => navigate(profileIsComplete ? '/game' : '/login')}
                className="text-[#ff1818]"
              >
                <GageLogoIcon className="h-10 sm:h-12 w-auto" />
              </button>
            </div>

            <div className="w-1/3 flex justify-end">
              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-[#ff1818]"
                >
                  <ArrowRightStartOnRectangleIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <AppContent />
      </main>

      <footer className="bg-white/50 py-6 text-center">
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Gage. For entertainment purposes only.
        </p>
        <a
          href="/privacy-policy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#ff1818] hover:text-[#e00000] underline mt-1 block"
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProfileProvider>
        <HashRouter>
          <MainAppLayout />
        </HashRouter>
      </ProfileProvider>
    </AuthProvider>
  );
};

export default App;
