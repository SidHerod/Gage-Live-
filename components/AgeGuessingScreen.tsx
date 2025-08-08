import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { getAllGuessableProfiles } from '../hooks/firestoreHelpers';
import LoadingSpinner from './LoadingSpinner';
import type { OtherUser } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

const TIER3_PHRASES = [
  'WAY OFF', 'NADA', 'NOPE', 'NAH', 'REALLY?', 'WHOOPS', 'OUCH', 'YIKES', 'WRONG', 'MISS', 'NO',
];

type ResultTier = { type: 'none' | 'perfect' | 'close' | 'wayoff'; value?: number };
type WayOffMode = 'first' | 'subsequent';
type Props = {
  onWayOffCue?: (mode: WayOffMode) => void;
};

function useConfetti() {
  const confettiRef = useRef<null | ((opts: any) => void)>(null);

  const load = useCallback(async () => {
    if (confettiRef.current) return confettiRef.current;
    const mod = await import('canvas-confetti');
    confettiRef.current = mod.default;
    return confettiRef.current!;
  }, []);

  const fire = useCallback(async () => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const confetti = await load();
    const colors = ['#ff7f11', '#ff9f1c', '#ffb347', '#ffa500', '#ffcc80'];
    const common = { particleCount: 90, startVelocity: 60, gravity: 1.05, ticks: 200, spread: 70, scalar: 1, shapes: ['square', 'circle'], colors, disableForReducedMotion: true } as const;
    confetti({ ...common, angle: 60, origin: { x: 0, y: 0.7 } });
    confetti({ ...common, angle: 120, origin: { x: 1, y: 0.7 } });
    confetti({ particleCount: 120, startVelocity: 45, gravity: 1.1, spread: 100, origin: { x: 0.5, y: 0.3 }, ticks: 180, shapes: ['circle'], scalar: 1.05, colors, disableForReducedMotion: true });
    if (navigator.vibrate) navigator.vibrate(18);
  }, [load]);

  return { fire };
}

function playTick() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const t = ctx.currentTime;

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(t);
    src.stop(t + 0.05);

    setTimeout(() => ctx.close(), 250);
  } catch {
    // ignore
  }
}

/** Smooth chunky hourglass icon uses currentColor */
function HourglassIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M10 8h44M10 56h44M18 12c0 10 10 16 14 18-4 2-14 8-14 18M46 12c0 10-10 16-14 18 4 2 14 8 14 18" />
      </g>
      <path d="M22 22h20c-3 6-10 9-10 9s-7-3-10-9z" fill="currentColor" />
      <path d="M22 50h20c-3-6-10-9-10-9s-7 3-10 9z" fill="currentColor" />
    </svg>
  );
}

const AgeGuessingScreen: React.FC<Props> = ({ onWayOffCue }) => {
  const { profile, updateUserGuessingStats, isLoading: isProfileLoading } = useProfile();
  const [currentUserToGuess, setCurrentUserToGuess] = useState<OtherUser | null>(null);
  const [shuffledProfiles, setShuffledProfiles] = useState<OtherUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(16);
  const [isLoaded, setIsLoaded] = useState(false);

  const [result, setResult] = useState<ResultTier>({ type: 'none' });
  const [badgeMode, setBadgeMode] = useState<'live' | 'icon' | 'text'>('live');
  const [badgeText, setBadgeText] = useState<string>('16');
  const [badgeFade, setBadgeFade] = useState(false);
  const [goldRing, setGoldRing] = useState(false);

  // control when to actually switch to gold in perfect flow
  const [goldPhase, setGoldPhase] = useState(false);

  const hasShownWayOffOnceRef = useRef(false);
  const tier3IndexRef = useRef(0);
  const timers = useRef<number[]>([]);
  const { fire: confettiFire } = useConfetti();

  useEffect(() => () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (profile?.id) {
        const available = await getAllGuessableProfiles(profile.id);
        setShuffledProfiles(available.sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
      }
    };
    fetchProfiles();
  }, [profile?.id, isProfileLoading]);

  useEffect(() => {
    if (shuffledProfiles.length > 0) {
      setCurrentUserToGuess(shuffledProfiles[currentIndex % shuffledProfiles.length]);
      setGuess(16);
      setIsLoaded(false);
      setResult({ type: 'none' });
      setBadgeMode('live');
      setBadgeText('16');
      setBadgeFade(false);
      setGoldRing(false);
      setGoldPhase(false);
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    }
  }, [shuffledProfiles, currentIndex]);

  const confirmGuess = async () => {
    if (!currentUserToGuess || !profile) return;
    const actualAge = currentUserToGuess.actualAge ?? 0;
    const diff = Math.abs(guess - actualAge);

    let pointsEarned =
      diff === 0 ? 10 :
      diff === 1 ? 9 :
      diff === 2 ? 7 :
      diff === 3 ? 5 :
      diff === 4 ? 3 :
      diff <= 7 ? 1 : 0;

    updateUserGuessingStats(pointsEarned, currentUserToGuess, guess);

    try {
      const ref = doc(db, 'users', currentUserToGuess.id);
      await updateDoc(ref, {
        communityAverageGuessTotal: increment(guess),
        numberOfCommunityGuesses: increment(1),
        guessHistory: arrayUnion({ guesserId: profile.id, guessValue: guess }),
      });
    } catch (e) {
      console.error('Firestore update FAILED:', e);
    }

    if (diff === 0) {
      // Perfect: hourglass spins twice in red, then short pause, then flip to gold + GAGED + confetti
      setResult({ type: 'perfect' });
      setBadgeMode('icon');
      setBadgeText('');
      setGoldPhase(false); // stay red during spins
      playTick();
      const tTick2 = window.setTimeout(() => playTick(), 600);
      const tRevealTextMode = window.setTimeout(() => setBadgeMode('text'), 1200);
      // extra pause so gold does not reveal too early
      const tGoldPhase = window.setTimeout(() => {
        setGoldPhase(true);
        setBadgeText('GAGED');
        setGoldRing(true);
        confettiFire();
      }, 1800 + 400);
      const tNext = window.setTimeout(() => setCurrentIndex((p) => p + 1), 3000 + 400);
      timers.current.push(tTick2, tRevealTextMode, tGoldPhase, tNext);
      return;
    }

    if (diff <= 4) {
      // Close: spin once in red, then show number and fade
      setResult({ type: 'close', value: diff });
      setBadgeMode('icon');
      setBadgeText('');
      playTick();
      const tShow = window.setTimeout(() => {
        setBadgeMode('text');
        setBadgeText(String(diff));
      }, 600);
      const tFade = window.setTimeout(() => setBadgeFade(true), 1200);
      const tNext = window.setTimeout(() => setCurrentIndex((p) => p + 1), 1450);
      timers.current.push(tShow, tFade, tNext);
      return;
    }

    // Way off: spin twice in red, then phrase fade in, spotlight header every time
    setResult({ type: 'wayoff' });
    setBadgeMode('icon');
    setBadgeText('');
    playTick();
    const tTick2 = window.setTimeout(() => playTick(), 600);

    const phrase = TIER3_PHRASES[tier3IndexRef.current % TIER3_PHRASES.length];
    tier3IndexRef.current += 1;

    const mode: WayOffMode = hasShownWayOffOnceRef.current ? 'subsequent' : 'first';
    onWayOffCue?.(mode);
    hasShownWayOffOnceRef.current = true;

    const tShow = window.setTimeout(() => {
      setBadgeMode('text');
      setBadgeText(phrase);
    }, 1200);
    const tFade = window.setTimeout(() => setBadgeFade(true), 2000);
    const tNext = window.setTimeout(() => setCurrentIndex((p) => p + 1), 2300);
    timers.current.push(tTick2, tShow, tFade, tNext);
  };

  if (isProfileLoading || !profile) return <LoadingSpinner size="lg" />;

  const fillPercent = ((guess - 16) / (100 - 16)) * 100;

  const isPerfect = result.type === 'perfect';
  const isWayOff = result.type === 'wayoff';

  // keep red during perfect spins until goldPhase becomes true
  const badgeBorder = isPerfect && goldPhase ? '#D4AF37' : '#ff1818';
  const badgeColor = badgeBorder;

  // Badge content
  const displayText = badgeMode === 'live' ? String(guess) : badgeText;
  const showIcon = badgeMode === 'icon';

  // Auto-fit text so phrases always fit
  const upper = (displayText || '').toUpperCase();
  const textLen = upper.length;
  const wideWords = ['WHOOPS', 'WRONG', 'REALLY?', 'WAY OFF', 'NADA', 'OUCH', 'NOPE', 'NAH', 'YIKES'];
  const isWideWord = wideWords.includes(upper);

  const badgeFontSize =
    upper === 'GAGED' ? '0.9rem' :
    isWideWord ? '0.7rem' :
    textLen >= 9 ? '0.62rem' :
    textLen >= 5 ? '0.82rem' :
    '1.2rem';

  const badgeFontWeight = upper === 'GAGED' ? 900 : 700;

  return (
    <main className="flex flex-col items-center justify-center p-4">
      <div
        className={`relative w-[300px] h-[400px] overflow-hidden rounded-2xl shadow-lg mb-6 mx-auto transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ boxShadow: isPerfect && goldPhase ? '0 0 0 4px #D4AF37' : undefined }}
      >
        <img
          src={currentUserToGuess?.photoBase64}
          alt="User to guess"
          className="w-full h-full object-cover"
          onLoad={() => setIsLoaded(true)}
          draggable={false}
        />

        {/* Badge */}
        <div
          key={`${displayText}-${badgeMode}-${badgeFade}-${goldPhase}`}
          className={`absolute top-4 right-4 flex items-center justify-center w-16 h-16 rounded-full ${showIcon ? 'pulse-red' : ''} ${badgeFade ? 'opacity-0' : 'opacity-100'}`}
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            border: `4px solid ${badgeBorder}`,
            color: badgeColor,
            fontWeight: badgeFontWeight as any,
            fontSize: badgeFontSize,
            transition: 'opacity 0.25s ease, border-color 0.25s ease, color 0.25s ease',
            letterSpacing: upper === 'GAGED' ? '0.5px' : undefined,
            textTransform: 'uppercase',
          }}
        >
          {showIcon ? (
            <HourglassIcon className={isPerfect || isWayOff ? 'spin-twice' : 'spin-once'} />
          ) : (
            <span className={isWayOff ? 'fade-in' : ''}>{displayText}</span>
          )}
        </div>
      </div>

      <input
        type="range"
        min="16"
        max="100"
        value={guess}
        onChange={(e) => setGuess(Number(e.target.value))}
        className="w-full max-w-xs rounded-lg appearance-none"
        style={{
          background: `linear-gradient(to right, #ff1818 ${fillPercent}%, #ff181880 ${fillPercent}%)`,
          borderRadius: '4px',
          height: '8px',
          outline: 'none',
        }}
      />

      <button
        onClick={confirmGuess}
        className="mt-6 px-8 py-3 bg-[#ff1818] text-white font-bold rounded-lg shadow-md hover:bg-[#e00000] transition-transform transform hover:scale-105 active:scale-95"
      >
        GAGE
      </button>

      {/* Animations */}
      <style>{`
        @keyframes spinOnce { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spinTwice { 0% { transform: rotate(0deg); } 100% { transform: rotate(720deg); } }
        .spin-once { animation: spinOnce 600ms ease-out 1; transform-origin: 50% 50%; }
        .spin-twice { animation: spinTwice 1200ms ease-out 1; transform-origin: 50% 50%; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 400ms ease-in forwards; }

        /* Pulse the badge border between red and brighter red while spinning */
        @keyframes pulseRed {
          0%, 100% { border-color: #ff1818; }
          50% { border-color: #ff4d4d; }
        }
        .pulse-red { animation: pulseRed 600ms ease-in-out infinite; }
      `}</style>
    </main>
  );
};

export default AgeGuessingScreen;
