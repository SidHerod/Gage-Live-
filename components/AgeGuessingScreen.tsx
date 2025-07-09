import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { getAllGuessableProfiles } from '../hooks/firestoreHelpers';
import LoadingSpinner from './LoadingSpinner';
import type { OtherUser } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

const AgeGuessingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile, updateUserGuessingStats, isLoading: isProfileLoading } = useProfile();
  const [currentUserToGuess, setCurrentUserToGuess] = useState<OtherUser | null>(null);
  const [shuffledProfiles, setShuffledProfiles] = useState<OtherUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(16);
  const [isLoaded, setIsLoaded] = useState(false);

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
          setShuffledProfiles([]);
        } else {
          setShuffledProfiles([...availableProfiles].sort(() => Math.random() - 0.5));
        }
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
    }
  }, [shuffledProfiles, currentIndex]);

  const confirmGuess = async () => {
    if (guess < 16 || guess > 100) return;

    const actualAge = currentUserToGuess?.actualAge || 0;
    const diff = Math.abs(guess - actualAge);
    let pointsEarned = 0;

    if (diff === 0) pointsEarned = 10;
    else if (diff === 1) pointsEarned = 9;
    else if (diff === 2) pointsEarned = 7;
    else if (diff === 3) pointsEarned = 5;
    else if (diff === 4) pointsEarned = 3;
    else if (diff === 5) pointsEarned = 2;
    else if (diff >= 6 && diff <= 7) pointsEarned = 1;

    if (currentUserToGuess && profile) {
      updateUserGuessingStats(pointsEarned, currentUserToGuess, guess);

      try {
        const userDocRef = doc(db, 'users', currentUserToGuess.id);
        await updateDoc(userDocRef, {
          communityAverageGuessTotal: increment(guess),
          numberOfCommunityGuesses: increment(1),
          guessHistory: arrayUnion({ guesserId: profile.id, guessValue: guess }),
        });
      } catch (error) {
        console.error("Firestore update FAILED:", error);
      }

      if (diff === 0) {
        navigate('/perfect-hit');
        return;
      }

      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (isProfileLoading || !profile) return <LoadingSpinner size="lg" />;

  const fillPercent = ((guess - 16) / (100 - 16)) * 100;

  return (
    <main className="flex flex-col items-center justify-center p-4">
      <div
        className={`relative w-[300px] h-[400px] overflow-hidden rounded-2xl shadow-lg mb-6 mx-auto transition-opacity duration-700 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <img
          src={currentUserToGuess?.photoBase64}
          alt="User to guess"
          className="w-full h-full object-cover"
          onLoad={() => setIsLoaded(true)}
        />
        <div
          key={guess}
          className="absolute top-4 right-4 flex items-center justify-center w-16 h-16 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            border: '4px solid #ff1818',
            color: '#ff1818',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease-in-out',
          }}
        >
          {guess}
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
    </main>
  );
};

export default AgeGuessingScreen;
