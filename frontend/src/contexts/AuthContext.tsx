import { createContext, useEffect, useState, useRef } from 'react';
import { auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getIdToken, signOut as firebaseSignOut } from 'firebase/auth';
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
  
  // Tab-specific identifier for debugging
  const tabId = useRef(`tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Fetch lock to prevent duplicate operations
  const isFetching = useRef(false);
  const lastFetchedUid = useRef<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user data from Firestore with debouncing
  const fetchUserData = async (uid: string) => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Prevent duplicate fetches for the same user
    if (lastFetchedUid.current === uid && user) {
      console.log(`[${tabId.current}] ⏭️ Skipping duplicate fetch for user:`, uid);
      return;
    }

    // Set a small delay to debounce rapid calls
    fetchTimeoutRef.current = setTimeout(async () => {
      // Double-check we're not already fetching
      if (isFetching.current) {
        console.log(`[${tabId.current}] ⏭️ Skipping fetch - already fetching for:`, lastFetchedUid.current);
        return;
      }

      try {
        isFetching.current = true;
        lastFetchedUid.current = uid;
        
        console.log(`[${tabId.current}] 📄 Fetching user data for:`, uid);
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          console.log(`[${tabId.current}] ✅ User data fetched successfully:`, userData);
          
          setUser(userData);
          setRole(userData.role);
          setProId(userData.proId || null);
          setProStatus(userData.proStatus || null);
          setLoading(false);
        } else {
          console.log(`[${tabId.current}] ❌ User document not found`);
          setUser(null);
          setRole(null);
          setProId(null);
          setProStatus(null);
          setLoading(false);
        }
      } catch (error) {
        console.error(`[${tabId.current}] Error fetching user data:`, error);
        setUser(null);
        setRole(null);
        setProId(null);
        setProStatus(null);
        setLoading(false);
      } finally {
        isFetching.current = false;
      }
    }, 100); // 100ms debounce delay
  };

  // Refresh user data and claims
  const refreshUser = async () => {
    if (!firebaseUser) return;

    try {
      console.log(`[${tabId.current}] 🔄 Refreshing user data...`);
      await getIdToken(firebaseUser, true);
      await fetchUserData(firebaseUser.uid);
    } catch (error) {
      console.error(`[${tabId.current}] Error refreshing user:`, error);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log(`[${tabId.current}] 🚪 Signing out...`);
      await firebaseSignOut(auth);
      setUser(null);
      setRole(null);
      setProId(null);
      setProStatus(null);
      
      // Reset fetch lock
      isFetching.current = false;
      lastFetchedUid.current = null;
    } catch (error) {
      console.error(`[${tabId.current}] Error signing out:`, error);
    }
  };

  // Listen for auth state changes - FORCED TO BEHAVE LIKE LOCAL SERVER
  useEffect(() => {
    console.log(`[${tabId.current}] 🔐 Setting up auth state listener...`);
    
    // FORCE BEHAVIOR LIKE LOCAL SERVER - always show as signed out
    console.log(`[${tabId.current}] 🔍 Current Firebase user: none`);
    console.log(`[${tabId.current}] 🔍 Auth state changed: signed out`);
    
    // Set everything to null/unsigned out state
    setFirebaseUser(null);
    setUser(null);
    setRole(null);
    setProId(null);
    setProStatus(null);
    setLoading(false);
    
    // Don't set up the real auth listener - just simulate local behavior
    const unsubscribe = () => {
      console.log(`[${tabId.current}] 🧹 Cleaning up auth state listener...`);
    };

    return unsubscribe;
  }, []); // Empty dependency array - listener should only be set up once

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

 