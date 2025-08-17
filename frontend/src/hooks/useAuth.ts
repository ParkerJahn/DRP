import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Add additional safety check
  if (context === undefined) {
    console.error('useAuth must be used within an AuthProvider');
    // Return a safe default object instead of throwing
    return {
      user: null,
      loading: true,
      role: null,
      proId: null,
      proStatus: null,
      signOut: async () => {
        console.error('signOut called outside of AuthProvider');
      },
      refreshUser: async () => {
        console.error('refreshUser called outside of AuthProvider');
      },
      markExplicitSignIn: () => {
        console.error('markExplicitSignIn called outside of AuthProvider');
      }
    };
  }
  
  return context;
}; 