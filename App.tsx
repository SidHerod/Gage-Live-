import React, { useEffect, useCallback, useLayoutEffect, useMemo, useState } from 'react';
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

/* ---------- SpotlightCue: dims the page and cuts a circular hole over a target ---------- */
function SpotlightCue({
  targetId,
  visible,
  label,
  variant = 'first', // 'first' | 'subtle'
}: {
  targetId: string;
  visible: boolean;
  label?: string; // render tooltip only if truthy
  variant?: 'first' | 'subtle';
}) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const update = useCallback(() => {
    const el = document.getElementById(targetId);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [targetId]);

  useLayoutEffect(() => {
    if (!visible) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [visible, update]);

  const hole = useMemo(() => {
    if (!rect) return null;
    const padding = 12;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2 + window.scrollY;
    const r = Math.max(rect.w, rect.h) / 2 + padding;
    return { cx, cy, r };
  }, [rect]);

  if (!visible || !hole) return null;

  const scrimOpacity = variant === 'first' ? 0.6 : 0.45;
  const ringBoxShadow =
    variant === 'first'
      ? '0 0 0 3px #ff1818, 0 0 0 8px rgba(255,24,24,0.35), 0 0 20px rgba(255,24,24,0.35)'
      : '0 0 0 3px #ff1818, 0 0 0 8px rgba(255,24,24,0.25), 0 0 14px rgba(255,24,24,0.25)';
  const anim = variant === 'first' ? 'ringPulseFast 1s' : 'ringPulseSlow 1.6s';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: `rgba(0,0,0,${scrimOpacity})`,
          clipPath: `circle(${hole.r}px at ${hole.cx}px ${hole.cy}px)`,
          pointerEvents: 'none',
          zIndex: 60,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: hole.cx - hole.r,
          top: hole.cy - hole.r - window.scrollY,
          width: hole.r * 2,
          height: hole.r * 2,
          borderRadius: '9999px',
          boxShadow: ringBoxShadow,
          pointerEvents: 'none',
          zIndex: 61,
          animation: `${anim} ease-in-out infinite`,
        }}
      />
      {label ? (
        <div
          style={{
            position: 'absolute',
            left: Math.max(12, hole.cx - 120),
            top: hole.cy + hole.r + 10 - window.scrollY,
            zIndex: 62,
            pointerEvents: 'none',
            background: 'white',
            color: '#ff1818',
            fontWeight: 700,
            padding: '8px 12px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {label}
        </div>
      ) : null}

      <style>{`
        @keyframes ringPulseFast {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.95; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ringPulseSlow {
          0% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.04); opacity: 0.85; }
          100% { transform: scale(1); opacity: 0.95; }
        }
      `}</style>
    </>
  );
}

/* ---------- AppContent ---------- */
const AppContent: React.FC<{ onWayOffCue: (mode: 'first' | 'subtle') => void }> = ({ onWayOffCue }) => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading, setProfileData } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const hasDob = !!profile?.dob;
  const hasPhoto = !!profile?.photoBase64;
  const profileIsComplete = currentUser && hasDob && hasPhoto;

  useEffect(() => {
    if (profile && hasDob && !profile.hasProvidedDob) {
      setProfileData({ hasProvidedDob: true }).catch((err) =>
        console.error('Error updating hasProvidedDob:', err)
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
      <Route path="/account" element={currentUser ? <AccountScreen /> : <Navigate to="/login" replace />} />
      <Route path="/upload-photo" element={currentUser ? <PhotoUploadScreen /> : <Navigate to="/login" replace />} />
      <Route
        path="/game"
        element={
          profileIsComplete ? (
            <AgeGuessingScreen onWayOffCue={(mode) => onWayOffCue(mode === 'first' ? 'first' : 'subtle')} />
          ) : (
            <Navigate to="/upload-photo" replace />
          )
        }
      />
      <Route path="/statistics" element={profileIsComplete ? <StatisticsScreen /> : <Navigate to="/login" replace />} />
      <Route path="/perfect-hit" element={<PerfectHitScreen />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

/* ---------- MainAppLayout ---------- */
const MainAppLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const hasDob = !!profile?.dob;
  const hasPhoto = !!profile?.photoBase64;
  const profileIsComplete = currentUser && hasDob && hasPhoto;

  const [showStatsCue, setShowStatsCue] = useState(false);
  const [cueVariant, setCueVariant] = useState<'first' | 'subtle'>('first');
  const [cueLabel, setCueLabel] = useState<string | undefined>('See real ages here');

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // game calls this with 'first' or 'subtle'
  const onWayOffCue = useCallback((mode: 'first' | 'subtle') => {
    setCueVariant(mode);
    // Only show tooltip text the first time. Subsequent times just show the ring.
    setCueLabel(mode === 'first' ? 'See real ages here' : undefined);
    setShowStatsCue(true);
    window.setTimeout(() => setShowStatsCue(false), 2200);
  }, []);

  return (
    <div className="min-h-screen bg-[#F0E1D1] text-slate-800 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            <div className="w-1/3 flex justify-start">
              {currentUser && (
                <button
                  id="stats-cue-target"
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

      {/* Spotlight lives at layout level and targets the real avatar button */}
      <SpotlightCue
        targetId="stats-cue-target"
        visible={showStatsCue}
        label={cueLabel}       // label only on first time
        variant={cueVariant}   // ring always shows
      />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <AppContent onWayOffCue={onWayOffCue} />
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
