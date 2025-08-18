import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { auth } from '../config/firebase';

export const useCustomClaims = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { user, refreshUser } = useAuth();

  const refreshCustomClaims = async () => {
    if (!user) return;
    
    try {
      setIsRefreshing(true);
      
      // Get the current Firebase user to refresh token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }
      
      // Get the ID token for authentication
      const idToken = await currentUser.getIdToken();
      
      // Call the deployed Cloud Function
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/refreshCustomClaims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Custom claims refreshed:', result);
      
      // Force a token refresh to get the new claims
      await currentUser.getIdToken(true);
      
      // Refresh user data to get updated claims
      await refreshUser();
      
      setLastRefresh(new Date());
      
      return result;
    } catch (error) {
      console.error('Error refreshing custom claims:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  const checkCustomClaims = async () => {
    if (!user) return null;
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      
      const token = await currentUser.getIdTokenResult();
      return {
        role: token.claims.role,
        proId: token.claims.proId,
        email: token.claims.email,
        emailVerified: token.claims.emailVerified
      };
    } catch (error) {
      console.error('Error checking custom claims:', error);
      return null;
    }
  };

  // Auto-refresh claims when user changes
  useEffect(() => {
    if (user) {
      checkCustomClaims().then(claims => {
        if (!claims?.role || !claims?.proId) {
          console.log('Custom claims missing, refreshing...');
          refreshCustomClaims();
        }
      });
    }
  }, [user]);

  return {
    refreshCustomClaims,
    checkCustomClaims,
    isRefreshing,
    lastRefresh
  };
}; 