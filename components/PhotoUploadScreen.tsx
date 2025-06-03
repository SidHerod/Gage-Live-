
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext'; // Updated import
import ImageUploader from './ImageUploader';
import { CameraIcon, SparklesIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

const PhotoUploadScreen: React.FC = () => {
  const { profile, setProfileData, isLoading: isProfileLoading } = useProfile(); // Use setProfileData
  const navigate = useNavigate();
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null); 
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isProfileLoading) {
      if (!profile) {
        navigate('/login', { replace: true }); 
      }
      // The App.tsx component's useEffect handles navigation if profile.photoBase64 already exists.
      // No need for a specific 'hasCompletedPhotoUpload' check here.
    }
  }, [profile, isProfileLoading, navigate]);

  useEffect(() => {
    // Initialize photoPreview with existing profile photo if available and no new preview has been set
    if (profile?.photoBase64 && !photoPreview) {
        setPhotoPreview(profile.photoBase64);
    }
  }, [profile, photoPreview]);


  const handleImageUpload = (base64: string, file: File) => {
    setPhotoPreview(base64);
    setPhotoFile(file); // Retain file if needed for other validation/metadata, though not directly used in handleSubmit
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) { 
      setError('Please upload a profile picture to continue.');
      return;
    }
    if (!profile) {
        setError('Profile not found. Please try logging in again.');
        return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // When user uploads, photo is not from Google.
      await setProfileData({ photoBase64: photoPreview, photoFromGoogle: false }); 
      // Navigation to /game will be handled by App.tsx's useEffect once the profile context updates.
    } catch (err) {
      console.error("Error saving photo:", err);
      setError('Failed to save photo. Please try again.');
      setIsSubmitting(false); // Ensure isSubmitting is reset on error
    }
    // If successful, App.tsx navigates, unmounting this. isSubmitting becomes irrelevant.
    // If there was an error, setIsSubmitting(false) is called in the catch block.
  };

  if (isProfileLoading || (!profile && !isProfileLoading)) { // Show loading if profile data is loading OR if no profile and auth isn't loading (implies profile fetch pending)
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-slate-600">Loading your profile...</p>
      </div>
    );
  }
  
  if (!profile) { // Should be caught by above, but as a fallback
      return <div className="text-center p-4">Redirecting to login...</div>;
  }
  
  // If profile.photoBase64 is true, App.tsx should navigate away.
  // Rendering this content implies profile.photoBase64 is false or null and user needs to upload.

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <CameraIcon className="h-12 w-auto text-[#ff1818] mx-auto mb-3" />
          <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff4545] to-[#ff1818]">
            Hi, {profile.name}!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            One last step: let's add your profile picture.
          </p>
        </div>
        
        <form 
            onSubmit={handleSubmit} 
            className="mt-6 space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-2xl transform hover:scale-[1.01] transition-transform duration-300"
        >
          <ImageUploader
            onImageUpload={handleImageUpload}
            currentImagePreview={photoPreview} // Use state `photoPreview` which is initialized from profile.photoBase64
            label="Profile Picture"
            aspectRatio="square"
            idSuffix="initial-photo"
          />

          {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !photoPreview}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-[#ff1818] hover:bg-[#e00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-all duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" color="text-white" className="mr-2"/>
            ) : (
              <SparklesIcon className="w-5 h-5 mr-2" />
            )}
            Set Picture & Start Playing
          </button>
        </form>
      </div>
    </div>
  );
};

export default PhotoUploadScreen;