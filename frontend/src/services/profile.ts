import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types';

// Get user profile
export const getUserProfile = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, user: userSnap.data() as User };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { success: false, error };
  }
};

// Update user profile - simplified to avoid type conflicts
export const updateUserProfile = async (uid: string, updates: Partial<Omit<User, 'updatedAt' | 'createdAt'>>) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error };
  }
};

// Update user personal info
export const updateUserPersonalInfo = async (
  uid: string, 
  firstName: string, 
  lastName: string, 
  phoneNumber?: string
) => {
  try {
    const userRef = doc(db, 'users', uid);
    const updates: Partial<User> = {
      firstName,
      lastName,
    };
    
    if (phoneNumber !== undefined) {
      updates.phoneNumber = phoneNumber;
    }
    
    await updateDoc(userRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating user personal info:', error);
    return { success: false, error };
  }
};

// Update user contact info
export const updateUserContactInfo = async (
  uid: string, 
  phoneNumber: string
) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      phoneNumber,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user contact info:', error);
    return { success: false, error };
  }
};

// Update user profile picture
export const updateUserProfilePicture = async (
  uid: string, 
  photoURL: string
) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      photoURL,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile picture:', error);
    return { success: false, error };
  }
};

// Update user display name
export const updateUserDisplayName = async (
  uid: string, 
  displayName: string
) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      displayName,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user display name:', error);
    return { success: false, error };
  }
}; 