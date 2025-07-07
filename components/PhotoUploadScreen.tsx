import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import ImageUploader from './ImageUploader';
import { CameraIcon, SparklesIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

const PhotoUploadScreen: React.FC = () => {
  const { profile, setProfileData, isLoading: isProfileLoading } = useProfile();
  const navigate = useNavigate();

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isProfileLoading) {
      if (!profile) {
        navigate('/login', { replace: true });
      } else if (profile.photoBase64 && profile.hasProvidedDob) {
        navigate('/game', { replace: true });
      }
    }
  }, [profile, isProfileLoading, navigate]);

  useEffect(() => {
    if (profile?.photoBase64 && !photoPreview) {
      setPhotoPreview(profile.photoBase64);
    }
    if (profile?.dob) {
      setDob(profile.dob);
    }
  }, [profile, photoPreview]);

  const handleImageUpload = (base64: string, file: File) => {
    setPhotoPreview(base64);
    setPhotoFile(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      setError('Please upload a profile picture to continue.');
      return;
    }
    if (!dob) {
      setError('Please enter your real age to continue.');
      return;
    }
    if (!profile) {
      setError('Profile not found. Please try logging in again.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await setProfileData({
        photoBase64: photoPreview,
        photoFromGoogle: false,
        dob,
        hasProvidedDob: true,
      });
    } catch (err) {
      console.error("Error saving photo and age:", err);
      setError('Failed to save your info. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading || (!profile && !isProfileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-slate-600">Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center p-4">Redirecting to login...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <CameraIcon className="h-12 w-auto text-[#ff1818] mx-auto mb-3" />
          <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff4545] to-[#ff1818]">
            Hi, {profile.name}!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            One last step: add your profile picture and age.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-2xl transform hover:scale-[1.01] transition-transform duration-300"
        >
          <ImageUploader
            onImageUpload={handleImageUpload}
            currentImagePreview={photoPreview}
            label="Profile Picture"
            aspectRatio="square"
            idSuffix="initial-photo"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Your Real Age
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff1818]"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !photoPreview || !dob}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-[#ff1818] hover:bg-[#e00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-all duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" color="text-white" className="mr-2" />
            ) : (
              <SparklesIcon className="w-5 h-5 mr-2" />
            )}
            Play GAGE
          </button>
        </form>
      </div>
    </div>
  );
};

export default PhotoUploadScreen;
