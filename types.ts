
export interface GuessRecord {
  guessedUserId: string;
  guessedUserName?: string;
  guessedUserPhotoBase64: string;
  theirActualAge: number;
  yourGuess: number;
  pointsEarned: number;
}

export interface UserProfile {
  id: string; // Firebase User UID
  email: string; // Firebase User Email
  name: string; // Firebase User Display Name (can be updated by user)
  dob: string; // YYYY-MM-DD format, user must provide
  photoBase64: string | null;
  photoFromGoogle: boolean; // True if photoBase64 was derived from Google's photoURL
  hasProvidedDob: boolean; // True if user has explicitly set their DOB
  // Stats about others guessing *this* user's age
  communityAverageGuess: number | null;
  numberOfCommunityGuesses: number;
  // Stats about *this* user guessing others
  myTotalGuessingPoints: number;
  myNumberOfGuessesMade: number;
  lastThreeGuesses: GuessRecord[];
}

// This interface represents the profile object returned by useProfile,
// which includes the dynamically calculated actualAge and completion status.
export interface EnrichedUserProfile extends UserProfile {
  actualAge: number;
  isProfileComplete: boolean; // True if DOB and Photo are present
}

export interface OtherUser { // Structure for users whose age is to be guessed
  id: string; // Firebase UID
  actualAge: number;
  photoBase64: string;
  name?: string;
}

// Payload for creating/updating parts of the profile, id (Firebase UID) is implicit.
export interface SetProfilePayload {
  name?: string;
  dob?: string;
  photoBase64?: string | null;
  photoFromGoogle?: boolean;
  hasProvidedDob?: boolean;
}