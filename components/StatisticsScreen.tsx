import { db } from './firebase';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import type { GuessRecord } from '../types';
import { UserIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon, SparklesIcon, CogIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

const StatCard: React.FC<{ title: string; value: string | number; children?: React.ReactNode; icon?: React.ReactNode }> = ({ title, value, children, icon }) => (
  <div className="bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center text-gray-500 mb-1">
      {icon && <span className="mr-2">{icon}</span>}
      <h3 className="text-sm font-medium uppercase tracking-wider">{title}</h3>
    </div>
    <p className="mt-1 text-3xl font-semibold text-[#ff1818]">{value}</p>
    {children && <div className="mt-2 text-xs text-gray-500">{children}</div>}
  </div>
);

const getGuessAccuracyVisual = (record: GuessRecord) => {
  const diff = Math.abs(record.theirActualAge - record.yourGuess);
  let title = "";
  let icon = null;

  if (diff === 0) {
    title = "Spot on!";
    icon = <CheckCircleIcon className="w-5 h-5 text-green-500 ml-2" />;
  } else if (diff <= 2) {
    title = `Very Close! Off by ${diff} year${diff === 1 ? '' : 's'}`;
    icon = <CheckCircleIcon className="w-5 h-5 text-yellow-500 ml-2" />;
  } else if (diff <= 5) {
    title = `Close! Off by ${diff} years`;
    icon = <LightBulbIcon className="w-5 h-5 text-orange-500 ml-2" />;
  } else {
    title = `Off by ${diff} years`;
    icon = <XCircleIcon className="w-5 h-5 text-red-500 ml-2" />;
  }

  return <span title={title} className="flex items-center">{icon} <span className="sr-only">{title}</span></span>;
};

const StatisticsScreen: React.FC = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isProfileLoading && !profile) {
      navigate('/login', { replace: true });
    }
  }, [isProfileLoading, profile, navigate]);

  if (isProfileLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const calculateGagerScore = (): string => {
    if (profile.myNumberOfGuessesMade === 0) return 'N/A';
    const maxPoints = profile.myNumberOfGuessesMade * 10;
    const accuracy = (profile.myTotalGuessingPoints / maxPoints) * 100;
    return `${Math.round(accuracy)}%`;
  };

  const yourGage =
    typeof profile.communityAverageGuess === 'number' &&
    profile.numberOfCommunityGuesses > 0
      ? Math.round(profile.communityAverageGuess)
      : 'N/A';

  const gagerScore = calculateGagerScore();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col items-center space-y-4 pt-4 sm:pt-0">
        {profile.photoBase64 ? (
          <img
            src={profile.photoBase64}
            alt="Your profile"
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover shadow-xl border-4 border-white transform hover:scale-105 transition-transform"
          />
        ) : (
          <UserIcon className="w-32 h-32 sm:w-40 sm:h-40 text-gray-300 bg-gray-100 p-4 rounded-full shadow-xl border-4 border-white" />
        )}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff4545] to-[#ff1818]">
            {profile.name}
          </h1>
          <p className="text-gray-600 text-lg">Age: {profile.actualAge}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="Your GAGE" value={yourGage}>
          <p>Avg. age others guess for you.</p>
          <p>Based on {profile.numberOfCommunityGuesses} community guess{profile.numberOfCommunityGuesses === 1 ? '' : 'es'}.</p>
        </StatCard>
        <StatCard title="GAGER Score" value={gagerScore}>
          <p>Your accuracy in guessing others' ages.</p>
          <p>Based on {profile.myNumberOfGuessesMade} guess{profile.myNumberOfGuessesMade === 1 ? '' : 'es'} you've made.</p>
        </StatCard>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-xl">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Last 3 Gages</h2>
        {profile.lastThreeGuesses && profile.lastThreeGuesses.length > 0 ? (
          <div className="space-y-4">
            {profile.lastThreeGuesses.map((record, index) => (
              <div
                key={record.guessedUserId + index + record.yourGuess}
                className="flex flex-col sm:flex-row items-center bg-gray-50 p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300"
              >
                <img
                  src={record.guessedUserPhotoBase64 || '/placeholder.png'}
                  alt={record.guessedUserName || 'Guessed User'}
                  className="w-32 sm:w-40 h-48 sm:h-56 object-cover rounded-xl border shadow-xl"
                />
                <div className="flex-grow text-center sm:text-left mt-4 sm:mt-0 sm:ml-4">
                  <p className="font-semibold text-gray-800 text-lg">{record.guessedUserName || 'A User'}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm mt-1">
                    <span className="text-gray-600">Actual Age:</span> <span className="font-bold">{record.theirActualAge}</span>
                    <span className="text-gray-600">Your Guess:</span>
                    <span className="font-bold flex items-center justify-center sm:justify-start">
                      {record.yourGuess} {getGuessAccuracyVisual(record)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Points Earned: {record.pointsEarned}
                  </p>
                  <p className="text-xs text-gray-500">
                    Difference: {Math.abs(record.theirActualAge - record.yourGuess)} year{Math.abs(record.theirActualAge - record.yourGuess) === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            You haven't made any guesses yet. Play the game to see your history here!
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4 pb-8">
        <button
          onClick={() => navigate('/game')}
          className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-[#ff1818] hover:bg-[#e00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-all duration-150 ease-in-out transform hover:scale-105"
        >
          <SparklesIcon className="w-5 h-5 mr-2" />
          Play GAGE
        </button>
        <button
          onClick={() => navigate('/account')}
          className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-gray-300 rounded-lg shadow-md text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-all duration-150 ease-in-out transform hover:scale-105"
        >
          <CogIcon className="w-5 h-5 mr-2" />
          Manage Account
        </button>
      </div>
    </div>
  );
};

export default StatisticsScreen;
