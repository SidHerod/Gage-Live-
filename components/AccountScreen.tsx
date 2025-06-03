import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from './ImageUploader';
import { UserIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon } from './icons';
import type { EnrichedUserProfile, GuessRecord } from '../types';
import { useProfile } from '../contexts/ProfileContext'; // Updated import
import { calculateAge } from '../hooks/useProfile'; // calculateAge can still be imported directly
import LoadingSpinner from './LoadingSpinner';


const AccountScreen: React.FC = () => {
  const { profile, setProfileData, isLoading } = useProfile(); // Consumes from ProfileContext
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [currentAgeDisplay, setCurrentAgeDisplay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isLoading && !profile) {
      navigate('/login', { replace: true });
    } else if (profile) {
      setName(profile.name);
      setDob(profile.dob);
      setPhotoBase64(profile.photoBase64);
      setCurrentAgeDisplay(profile.actualAge);
    }
  }, [profile, isLoading, navigate]);

  const handleImageUpload = (base64: string) => {
    setPhotoBase64(base64);
    setError(null); 
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDob = e.target.value;
    setDob(newDob);
    if (newDob) {
        setCurrentAgeDisplay(calculateAge(newDob));
    } else {
        setCurrentAgeDisplay(null);
    }
  };
  
  const getMinMaxDob = () => {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0],
    };
  };
  const { min: minDob, max: maxDob } = getMinMaxDob();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!profile) {
      setError("Profile not loaded. Please try again.");
      return;
    }
    if (!name.trim() || !dob) {
      setError('Name and Date of Birth are required.');
      return;
    }
     if (!photoBase64) { 
      setError('Please upload or keep a profile picture.');
      return;
    }

    const dobDate = new Date(dob);
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const maxAgeDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());

    if (dobDate > maxAgeDate) {
      setError('You must be at least 16 years old.');
      return;
    }
    if (dobDate < minAgeDate) {
      setError('Please enter a valid date of birth (max 100 years old).');
      return;
    }

    setProfileData({ name, dob, photoBase64 }); // Removed email property
    alert("Profile updated successfully!"); 
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"><LoadingSpinner size="lg" /></div>;
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"><p>Redirecting to login...</p></div>;
  }


  const calculateAccuracy = (): string => {
    if (!profile || profile.myNumberOfGuessesMade === 0) return 'N/A';
    const maxPossiblePoints = profile.myNumberOfGuessesMade * 10; 
    if (maxPossiblePoints === 0) return '0%';
    const accuracy = (profile.myTotalGuessingPoints / maxPossiblePoints) * 100;
    return `${Math.round(accuracy)}%`;
  };

  const getGuessAccuracyVisual = (record: GuessRecord) => {
    const diff = Math.abs(record.theirActualAge - record.yourGuess);
    if (diff === 0) return <span title="Spot on!"><CheckCircleIcon className="w-5 h-5 text-green-500 ml-2" /></span>;
    if (diff <= 2) return <span title={`Close (within ${diff} years)`}><CheckCircleIcon className="w-5 h-5 text-yellow-500 ml-2" /></span>;
    if (diff <= 5) return <span title={`Fair (within ${diff} years)`}><LightBulbIcon className="w-5 h-5 text-orange-500 ml-2" /></span>;
    return <span title={`Off by ${diff} years`}><XCircleIcon className="w-5 h-5 text-red-500 ml-2" /></span>;
  };
  
  const StatCard: React.FC<{ title: string; value: string | number; children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="bg-gray-50 p-4 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-1 text-2xl font-semibold text-[#ff1818]">{value}</p>
      {children}
    </div>
  );


  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className={`bg-white p-6 sm:p-8 rounded-xl shadow-2xl mt-8 transform hover:scale-[1.01] transition-transform duration-300`}>
        <div className="flex items-center justify-center mb-6">
          <UserIcon className="w-10 h-10 text-[#ff1818]" />
          <h2 className="ml-3 text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#ff4545] to-[#ff1818]">
            Your Account
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
              Your Profile Picture
            </label>
            <ImageUploader
              onImageUpload={handleImageUpload}
              currentImagePreview={photoBase64}
              label="Profile Picture"
              aspectRatio="square"
              idSuffix="profile"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email (cannot be changed)
            </label>
            <input
              type="email"
              id="email"
              value={profile.email}
              readOnly
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-700 cursor-not-allowed sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff1818] focus:border-[#ff1818] focus:ring-offset-1 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth <span className="font-normal text-gray-500 text-xs">(Current Age: {currentAgeDisplay !== null ? currentAgeDisplay : 'N/A'})</span>
            </label>
            <input
              type="date"
              id="dob"
              value={dob}
              onChange={handleDobChange}
              required
              min={minDob}
              max={maxDob}
              className="mt-1 block w-full px-3 py-2 border border-gray-400 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff1818] focus:border-[#ff1818] focus:ring-offset-1 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">You must be between 16 and 100 years old.</p>
          </div>


          {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}

          <button
            type="submit"
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-[#ff1818] hover:bg-[#e00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-all duration-150 ease-in-out transform hover:scale-105"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Update Profile
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#ff4545] to-[#ff1818] mb-6">
            Your GAGE Stats
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard 
                title="Your GAGE" 
                value={profile.communityAverageGuess !== null ? profile.communityAverageGuess.toFixed(1) : 'N/A'}
            >
                 <p className="text-xs text-gray-400 mt-1">Avg. age others guess for you (coming soon!).</p>
            </StatCard>
            <StatCard 
                title="Your Guessing Accuracy" 
                value={calculateAccuracy()}
            >
                <p className="text-xs text-gray-400 mt-1">{profile.myNumberOfGuessesMade} guesses made.</p>
            </StatCard>
          </div>

          {profile.lastThreeGuesses && profile.lastThreeGuesses.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Your Recent Gages:</h3>
              <div className="space-y-4">
                {profile.lastThreeGuesses.map((record, index) => (
                  <div key={record.guessedUserId + index + record.theirActualAge} className="flex items-center bg-white p-3 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                    <img 
                        src={record.guessedUserPhotoBase64} 
                        alt={record.guessedUserName || 'Guessed user'} 
                        className="w-16 h-20 object-cover rounded-md mr-4 border border-gray-100" 
                    />
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800">{record.guessedUserName || 'A User'}</p>
                      <p className="text-sm text-gray-600">
                        Actual Age: <span className="font-bold">{record.theirActualAge}</span>
                      </p>
                      <div className="flex items-center text-sm text-gray-600">
                        Your Guess: <span className="font-bold">{record.yourGuess}</span>
                        {getGuessAccuracyVisual(record)}
                      </div>
                      <p className="text-xs text-gray-500">Points: {record.pointsEarned}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
           {profile.lastThreeGuesses && profile.lastThreeGuesses.length === 0 && profile.myNumberOfGuessesMade > 0 && (
             <p className="text-center text-gray-500 text-sm mt-4">You've made guesses, but recent history isn't available. This might be due to an older profile version.</p>
           )}
           {profile.myNumberOfGuessesMade === 0 && (
              <p className="text-center text-gray-500 text-sm mt-4">Start playing to see your recent gages here!</p>
           )}
        </div>
    </div>
  );
};

export default AccountScreen;