import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { SecurityAudit } from '../utils/security';
import { PasswordChangeTracker } from '../utils/passwordTracking';

interface PasswordSecurityStatus {
  needsPasswordChange: boolean;
  isChecking: boolean;
  redirectToPasswordChange: () => void;
  skipPasswordValidation: () => void;
}

export const usePasswordSecurity = (): PasswordSecurityStatus => {
  const { user } = useAuth();
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Check if user needs password change
    const checkPasswordSecurity = async () => {
      try {
        // Check if user has already completed password change in this session
        const hasCompletedChange = PasswordChangeTracker.hasCompletedPasswordChange(user.uid);
        
        if (hasCompletedChange) {
          console.log('✅ User has completed password change in this session');
          setNeedsPasswordChange(false);
          setIsChecking(false);
          return;
        }

        // Check if user has a flag indicating they need a password change
        // This could be set during user creation, security events, or admin actions
        if (user.passwordChangeRequired) {
          console.log('🔒 User has passwordChangeRequired flag set');
          setNeedsPasswordChange(true);
          setIsChecking(false);
          return;
        }

        // Check if user's account was created recently (within last 30 days)
        // New accounts might need password updates to meet current security standards
        if (user.createdAt) {
          const accountAge = Date.now() - user.createdAt.toDate().getTime();
          const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
          
          if (daysSinceCreation < 30) {
            console.log('🆕 User account is new (less than 30 days old)');
            // For new accounts, we assume they have valid passwords since they just created them
            setNeedsPasswordChange(false);
          } else {
            console.log('✅ User account is established (more than 30 days old)');
            // For established accounts, we assume they have valid passwords
            setNeedsPasswordChange(false);
          }
        } else {
          // If no creation date, assume established account
          console.log('✅ User account creation date unknown, assuming established account');
          setNeedsPasswordChange(false);
        }
        
      } catch (error) {
        console.error('Error checking password security:', error);
        // Default to NOT requiring password change if there's an error
        // This prevents blocking legitimate users
        setNeedsPasswordChange(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkPasswordSecurity();
  }, [user]);

  const redirectToPasswordChange = () => {
    if (needsPasswordChange) {
      window.location.href = '/app/password-change-required';
    }
  };

  const skipPasswordValidation = () => {
    // Allow user to skip validation if they believe their password is strong
    console.log('⏭️ User skipped password validation');
    SecurityAudit.logSecurityEvent('info', 'User skipped password validation', user?.uid, 'password_validation_skipped');
    
    // Mark as completed so they don't get redirected again
    PasswordChangeTracker.markPasswordChangeCompleted(user?.uid || '');
    setNeedsPasswordChange(false);
  };

  return {
    needsPasswordChange,
    isChecking,
    redirectToPasswordChange,
    skipPasswordValidation
  };
}; 