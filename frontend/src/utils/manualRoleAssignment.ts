// Temporary utility to manually assign roles for testing
import { auth } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export const assignManualRole = async (role: 'ATHLETE' | 'STAFF' | 'PRO', proId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('No authenticated user');
    return { success: false, error: 'No authenticated user' };
  }

  try {
    console.log('🔧 Manually assigning role:', { uid: currentUser.uid, role, proId });
    
    // Update user document in Firestore
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      role,
      proId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('✅ User document updated with role and proId');
    
    // Note: Custom claims would need to be set via Cloud Function
    // For now, this updates the Firestore document which should be enough for testing
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error assigning manual role:', error);
    return { success: false, error };
  }
};

// Function to check current user state
export const checkUserState = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ No authenticated user');
    return;
  }

  try {
    // Get user document
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await (await import('firebase/firestore')).getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log('👤 Current user state:', {
        uid: currentUser.uid,
        email: currentUser.email,
        role: userData?.role,
        proId: userData?.proId,
        displayName: userData?.displayName,
      });
    } else {
      console.log('❌ User document does not exist');
    }
  } catch (error) {
    console.error('❌ Error checking user state:', error);
  }
};
