import { db } from '../firebase';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { getAllGuessableProfiles } from '../hooks/firestoreHelpers';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import type { OtherUser } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface AnimatedFeedback {
  text: string;
  colorClass: string;
  key: number;
}

type GagedAnimationStep = 'idle' | 'showingFeedback';

const AgeGuessingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile, updateUserGuessingStats, isLoading: isProfileLoading } = useProfile();

  const [currentUserToGuess, setCurrentUserToGuess] = useState<OtherUser | null>(null);
  const [currentGuessValue, setCurrentGuessValue] = useState<number>(16);
  const [shuffledProfiles, setShuffledProfiles] = useState<OtherUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [animatedFeedback, setAnimatedFeedback] = useState<AnimatedFeedback | null>(null);
  const [gagedAnimationStep, setGagedAnimationStep] = useState<GagedAnimationStep>('idle');
  const [noProfilesMessage, setNoProfilesMessage] = useState<string | null>(null);

  const submissionLockRef = useRef(false);

  useEffect(() => {
    if (!isProfileLoading && !profile) {
      navigate('/login', { replace: true });
    }
  }, [isProfileLoading, profile, navigate]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (profile?.id) {
        const availableProfiles = await getAllGuessableProfiles(profile.id);
        if (availableProfiles.length === 0) {
          setNoProfilesMessage("Come back soon to gauge more ages");
          setShuffledProfiles([]);
        } else {
          setNoProfilesMessage(null);
          setShuffledProfiles([...availableProfiles].sort(() => Math.random() - 0.5));
        }
        setCurrentIndex(0);
        setGagedAnimationStep('idle');
      }
    };
    fetchProfiles();
  }, [profile?.id, isProfileLoading]);

  useEffect(() => {
    if (gagedAnimationStep === 'idle' && shuffledProfiles.length > 0 && profile) {
      const newIndex = currentIndex % shuffledProfiles.length;
      setCurrentUserToGuess(shuffledProfiles[newIndex]);
      setCurrentGuessValue(16);
    } else if (gagedAnimationStep === 'idle' && shuffledProfiles.length === 0 && profile && !isProfileLoading) {
      setCurrentUserToGuess(null);
    }
  }, [shuffledProfiles, currentIndex, profile, gagedAnimationStep, isProfileLoading]);

  const submitGuessAndLoadNext = useCallback(async () => {
    if (submissionLockRef.current || !currentUserToGuess || !profile || gagedAnimationStep !== 'idle') return;

    submissionLockRef.current = true;
    const guess = currentGuessValue;
    const actualAge = currentUserToGuess.actualAge;
    const diff = Math.abs(guess - actualAge);
    let pointsEarned = 0;

    if (diff === 0) pointsEarned = 10;
    else if (diff === 1) pointsEarned = 9;
    else if (diff === 2) pointsEarned = 7;
    else if (diff === 3) pointsEarned = 5;
    else if (diff === 4) pointsEarned = 3;
    else if (diff === 5) pointsEarned = 2;
    else if (diff >= 6 && diff <= 7) pointsEarned = 1;
    else pointsEarned = 0;

    updateUserGuessingStats(pointsEarned, currentUserToGuess, guess);

    try {
      const userDocRef = doc(db, 'users', currentUserToGuess.id);
      await updateDoc(userDocRef, {
        communityAverageGuessTotal: increment(guess),
        numberOfCommunityGuesses: increment(1),
        guessHistory: arrayUnion({ guesserId: profile.id, guessValue: guess }),
      });
    } catch (error) {
      console.error("🔥 Firestore update FAILED:", error);
    }

    if (diff === 0) {
      navigate('/perfect-hit');
      return;
    }

    if (diff === 1 || diff === 2) {
      setAnimatedFeedback({ text: diff.toString(), colorClass: 'text-[#ff1818]', key: Date.now() });
      setGagedAnimationStep('showingFeedback');

      setTimeout(() => {
        setAnimatedFeedback(null);
        setGagedAnimationStep('idle');
        setCurrentIndex(prev => prev + 1);
        submissionLockRef.current = false;
      }, 1500);
    } else {
      setCurrentIndex(prev => prev + 1);
      setGagedAnimationStep('idle');
      submissionLockRef.current = false;
    }
  }, [currentUserToGuess, profile, currentGuessValue, updateUserGuessingStats, gagedAnimationStep, navigate]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentGuessValue(parseInt(e.target.value, 10));
  };

  const handleSliderRelease = () => {
    submitGuessAndLoadNext();
  };

  if (isProfileLoading || !profile) return <LoadingSpinner size="lg" />;

  if (noProfilesMessage && gagedAnimationStep === 'idle') {
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-xl max-w-md mx-auto">
        <h3 className="text-2xl font-semibold text-[#ff1818] mb-4">No Gages Available</h3>
        <p className="text-slate-600 mb-6">{noProfilesMessage}</p>
        <button
          onClick={() => navigate('/statistics')}
          className="px-6 py-3 bg-[#ff1818] text-white font-semibold rounded-lg shadow-md hover:bg-[#e00000]"
        >
          Go to Your Profile & Stats
        </button>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center p-4 min-h-screen py-0 !py-0">
      {currentUserToGuess && (
        <div className="w-[345px] h-[460px] mx-auto overflow-hidden rounded-2xl shadow-lg mb-0">
          <img
            src={currentUserToGuess.photoBase64}
            alt="User to guess"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <p className="text-3xl mt-6 mb-4 font-bold">{currentGuessValue}</p>
      <input
        type="range"
        min="16"
        max="100"
        value={currentGuessValue}
        onChange={handleSliderChange}
        onPointerUp={handleSliderRelease}
        className="w-64 h-2 bg-[#ff1818] rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none 
                   [&::-webkit-slider-thumb]:h-6 
                   [&::-webkit-slider-thumb]:w-6 
                   [&::-webkit-slider-thumb]:rounded-full 
                   [&::-webkit-slider-thumb]:bg-[#ff1818]
                   [&::-moz-range-thumb]:bg-[#ff1818]"
      />
      {animatedFeedback && (
        <p className={`mt-4 text-5xl font-extrabold ${animatedFeedback.colorClass}`}>
          {animatedFeedback.text}
        </p>
      )}
    </main>
  );
};

export default AgeGuessingScreen;
