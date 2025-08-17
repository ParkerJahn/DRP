import { createContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { onAuthStateChanged, getIdToken, signOut as firebaseSignOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User, UserRole, ProStatus } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  proId: string | null;
  proStatus: ProStatus | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);



interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      console.log('📄 User document exists:', userSnap.exists());
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        console.log('✅ User data fetched successfully:', userData);
        
        setUser(userData);
        setRole(userData.role);
        setProId(userData.proId || null);
        setProStatus(userData.proStatus || null);
        setLoading(false); // Set loading to false when user data is fetched
        console.log('🔄 Loading set to false after fetching user data');
      } else {
        console.log('❌ User document does not exist in Firestore');
        setUser(null);
        setRole(null);
        setProId(null);
        setProStatus(null);
        setLoading(false); // Set loading to false even when no user document
        console.log('🔄 Loading set to false after no user document found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
      setRole(null);
      setProId(null);
      setProStatus(null);
      setLoading(false); // Set loading to false on error
      console.log('🔄 Loading set to false after error');
    }
  };

  // Refresh user data and claims
  const refreshUser = async () => {
    if (!firebaseUser) return;

    try {
      // Force refresh the ID token to get updated claims
      await getIdToken(firebaseUser, true);
      
      // Fetch updated user data
      await fetchUserData(firebaseUser.uid);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setRole(null);
      setProId(null);
      setProStatus(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // User is signed in - check if they have a document
        console.log('🔍 User signed in, checking for existing document...');
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          // User document exists, fetch the data
          console.log('📖 User document exists, fetching data...');
          await fetchUserData(firebaseUser.uid);
        } else {
          // User document doesn't exist yet - this is normal for new registrations
          // Create a minimal user object for Firebase Auth user
          console.log('⏳ User document not found - creating minimal user object...');
          const minimalUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            role: 'PRO', // Default to PRO for new registrations
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            proStatus: 'inactive' // Default to inactive for new PRO users
          };
          console.log('✅ Created minimal user:', minimalUser);
          setUser(minimalUser);
          setRole('PRO');
          setProStatus('inactive');
          setLoading(false);
          console.log('🔄 Loading set to false, user state updated');
        }
      } else {
        // User is signed out
        setUser(null);
        setRole(null);
        setProId(null);
        setProStatus(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for ID token changes (for custom claims updates)
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribe = auth.onIdTokenChanged(async (user) => {
      if (user) {
        // Token refreshed, check for updated claims
        const token = await user.getIdTokenResult();
        if (token.claims.role !== role || token.claims.proId !== proId) {
          // Claims changed, refresh user data
          await refreshUser();
        }
      }
    });

    return () => unsubscribe();
  }, [firebaseUser, role, proId]);

  const value: AuthContextType = {
    user,
    loading,
    role,
    proId,
    proStatus,
    signOut,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 