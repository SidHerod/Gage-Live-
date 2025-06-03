import { db } from './firebase';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from './ImageUploader';
import { UserIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon } from './icons';
import type { EnrichedUserProfile, GuessRecord } from '../types'; // Use EnrichedUserProfile
// Fix: Import useProfile from ProfileContext and calculateAge from hooks/useProfile
import { calculateAge } from '../hooks/useProfile'; // Import calculateAge
import { useProfile } from '../contexts/ProfileContext';
import LoadingSpinner from './LoadingSpinner';


const AccountScreen: React.FC = () => {
  const { profile, setProfileData, isLoading } = useProfile();
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
     if (!photoBase64) { // Require photo for profile consistency
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
    // TODO: Add a success message, e.g., using a toast notification or a temporary message
    alert("Profile updated successfully!"); // Placeholder for success feedback
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"><LoadingSpinner size="lg" /></div>;
  }

  if (!profile) {
    // This case should ideally be handled by the useEffect redirecting to /login
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#ff1818] focus:border-[#ff1818] sm:text-sm"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ff1818] focus:border-[#ff1818] sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">You must be between 16 and 100 years old.</p>
          </div>


          {error
