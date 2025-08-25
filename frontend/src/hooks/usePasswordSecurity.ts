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
        } else {
          // For now, we'll require all users to validate their passwords
          // This ensures security for accounts created before new standards
          console.log('🔒 User requires password validation');
          setNeedsPasswordChange(true);
          SecurityAudit.logSecurityEvent('info', 'User requires password validation', user.uid, 'password_validation_required');
        }
      } catch (error) {
        console.error('Error checking password security:', error);
        // Default to requiring password change if there's an error
        setNeedsPasswordChange(true);
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
    // This is useful for users who already have strong passwords
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