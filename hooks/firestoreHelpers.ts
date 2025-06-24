// firestoreHelpers.ts
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { calculateAge } from './useProfile';
import type { OtherUser } from '../types';

export async function getAllGuessableProfiles(currentUserId: string): Promise<OtherUser[]> {
  const profiles: OtherUser[] = [];

  try {
    const querySnapshot = await getDocs(collection(db, 'users'));

    console.log('🔎 Checking users from Firestore...');
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;

      console.log('🔍 Candidate user:', userId, data);

      if (
        userId !== currentUserId &&
        data.dob &&
        data.hasProvidedDob &&
        data.photoBase64
      ) {
        profiles.push({
          id: userId,
          actualAge: calculateAge(data.dob),
          photoBase64: data.photoBase64,
          name: data.name || 'Gage User',
        });
      }
    });

    console.log('✅ Returning guessable profiles:', profiles);
  } catch (err) {
    console.error('Failed to fetch guessable profiles:', err);
  }

  return profiles;
}
