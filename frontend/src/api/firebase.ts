import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Firebase API service
const firebaseApi = {
  // Get user profile data
  async getProfile(uid: string) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          first_name: userData.displayName?.split(' ')[0] || 'User',
          last_name: userData.displayName?.split(' ').slice(1).join(' ') || '',
          email: userData.email,
          role: userData.role,
          proStatus: userData.proStatus
        };
      }
      throw new Error('User not found');
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Sign out user
  async signOut() {
    try {
      const auth = getAuth();
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    const auth = getAuth();
    return !!auth.currentUser;
  },

  // Get current user ID
  getCurrentUserId() {
    const auth = getAuth();
    return auth.currentUser?.uid;
  }
};

export default firebaseApi; 