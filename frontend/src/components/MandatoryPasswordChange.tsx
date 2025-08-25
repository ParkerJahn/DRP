import React, { useState, useEffect } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { validatePassword } from '../utils/validation';
import { CSRFProtection, SecurityAudit } from '../utils/security';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { PasswordChangeTracker } from '../utils/passwordTracking';

const MandatoryPasswordChange: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize CSRF token
  useEffect(() => {
    const token = CSRFProtection.generateToken();
    setCsrfToken(token);
    
    // Log mandatory password change access
    SecurityAudit.logSecurityEvent('info', 'Mandatory password change page accessed', user?.uid, 'mandatory_password_change');
    
    // Debug logging
    console.log('🔍 Debug: User authentication state:', {
      user: user ? { uid: user.uid, email: user.email } : null,
      authCurrentUser: auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null,
      isAuthenticated: !!auth.currentUser
    });
  }, [user?.uid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear any previous errors
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate CSRF token
    if (!CSRFProtection.validateToken(csrfToken)) {
      SecurityAudit.logSecurityEvent('security', 'CSRF token validation failed on mandatory password change', user?.uid, 'csrf_attack');
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }

    // Validate current password
    if (!formData.currentPassword.trim()) {
      setError('Current password is required');
      return;
    }

    // Validate new password
    const newPasswordValidation = validatePassword(formData.newPassword);
    if (!newPasswordValidation.isValid) {
      setError(newPasswordValidation.error || 'Invalid new password');
      return;
    }

    // Check if new password is different from current
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    // Confirm password match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Log mandatory password change attempt
      SecurityAudit.logSecurityEvent('info', 'Mandatory password change initiated', user?.uid, 'mandatory_password_change_attempt');

      // Check if we have a valid auth user
      if (!auth.currentUser) {
        throw new Error('No authenticated user found. Please sign in again.');
      }

      // Re-authenticate user before password change
      const credential = EmailAuthProvider.credential(
        user?.email || '',
        formData.currentPassword
      );

      console.log('🔐 Attempting to re-authenticate user...');
      await reauthenticateWithCredential(auth.currentUser, credential);
      console.log('✅ Re-authentication successful');

      // Update password
      console.log('🔐 Updating password...');
      await updatePassword(auth.currentUser, formData.newPassword);
      console.log('✅ Password updated successfully');

      // Refresh CSRF token after successful change
      const newToken = CSRFProtection.refreshToken();
      setCsrfToken(newToken);

      // Log successful mandatory password change
      SecurityAudit.logSecurityEvent('info', 'Mandatory password change completed successfully', user?.uid, 'mandatory_password_change_success');

      // Mark that this user has completed password change
      PasswordChangeTracker.markPasswordChangeCompleted(user?.uid || '');

      // Clear any existing errors
      setError(null);

      // Show success message before redirecting
      setSuccess('Password updated successfully! Redirecting to dashboard...');

      // Redirect to dashboard after a short delay to show success message
      setTimeout(() => {
        window.location.href = '/app/dashboard';
      }, 2000);

    } catch (error: unknown) {
      console.error('Mandatory password change error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/invalid-credential') {
          errorMessage = 'Current password is incorrect. Please enter the password you used to sign in.';
          SecurityAudit.logSecurityEvent('warn', 'Mandatory password change failed - invalid current password', user?.uid, 'mandatory_password_change_failed');
        } else if (firebaseError.code === 'auth/wrong-password') {
          errorMessage = 'Current password is incorrect. Please enter the password you used to sign in.';
          SecurityAudit.logSecurityEvent('warn', 'Mandatory password change failed - wrong current password', user?.uid, 'mandatory_password_change_failed');
        } else if (firebaseError.code === 'auth/weak-password') {
          errorMessage = 'New password is too weak. Please choose a stronger password.';
          SecurityAudit.logSecurityEvent('warn', 'Mandatory password change failed - weak password', user?.uid, 'mandatory_password_change_failed');
        } else if (firebaseError.code === 'auth/requires-recent-login') {
          errorMessage = 'For security reasons, please sign in again before changing your password.';
          SecurityAudit.logSecurityEvent('warn', 'Mandatory password change failed - requires recent login', user?.uid, 'mandatory_password_change_failed');
        } else if (firebaseError.code === 'auth/user-mismatch') {
          errorMessage = 'Authentication error. Please sign in again.';
          SecurityAudit.logSecurityEvent('error', 'Mandatory password change failed - user mismatch', user?.uid, 'mandatory_password_change_failed');
        }
      } else if (error instanceof Error) {
        if (error.message.includes('No authenticated user found')) {
          errorMessage = 'Session expired. Please sign in again.';
          SecurityAudit.logSecurityEvent('error', 'Mandatory password change failed - no authenticated user', user?.uid, 'mandatory_password_change_failed');
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-container-light dark:bg-container-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Security Update Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your password doesn't meet current security standards. Please update it to continue.
          </p>
        </div>

        {/* Security Notice */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start">
            <span className="text-amber-600 dark:text-amber-400 mr-2 mt-0.5">⚠️</span>
            <div className="text-amber-800 dark:text-amber-200 text-sm">
              <p className="font-medium mb-1">Important Security Notice</p>
              <p>Your current password may not meet current security standards. You can either update it or skip validation if you believe it's already strong.</p>
            </div>
          </div>
        </div>

        {/* Skip Validation Option */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">ℹ️</span>
              <div className="text-blue-800 dark:text-blue-200 text-sm">
                <p className="font-medium mb-1">Already have a strong password?</p>
                <p>If you believe your current password meets security standards, you can skip validation and continue to the app.</p>
              </div>
            </div>
            <button
              onClick={() => {
                PasswordChangeTracker.markPasswordChangeCompleted(user?.uid || '');
                window.location.href = '/app/dashboard';
              }}
              className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Skip Validation
            </button>
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
              {error.includes('sign in again') && (
                <button
                  onClick={() => window.location.href = '/auth'}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                >
                  Sign In Again
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
                <span className="text-green-800 dark:text-green-200">{success}</span>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Form */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden CSRF token */}
            <input type="hidden" name="csrf_token" value={csrfToken} />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                required
                placeholder="Enter your current password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter the password you used to sign in to this account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                required
                placeholder="Enter your new password"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 6 characters with uppercase, lowercase, number, and special character
              </p>
              
              {/* Password Strength Indicator */}
              <PasswordStrengthIndicator 
                password={formData.newPassword} 
                showStrength={formData.newPassword.length > 0} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                required
                placeholder="Confirm your new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating Password...' : 'Update Password & Continue'}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact support if you're having trouble updating your password.
          </p>
        </div>

        {/* Debug Panel (only in development) */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Debug Panel</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>User ID:</span>
                <span className="font-mono">{user?.uid}</span>
              </div>
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-mono">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Auth Status:</span>
                <span className={auth.currentUser ? 'text-green-600' : 'text-red-600'}>
                  {auth.currentUser ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Password Change Completed:</span>
                <span className="font-mono">
                  {PasswordChangeTracker.hasCompletedPasswordChange(user?.uid || '') ? 'Yes' : 'No'}
                </span>
              </div>
              <button
                onClick={() => {
                  PasswordChangeTracker.clearPasswordChangeCompletion(user?.uid || '');
                  window.location.reload();
                }}
                className="w-full mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                Clear Completion Status (Reload)
              </button>
              <button
                onClick={() => {
                  PasswordChangeTracker.markPasswordChangeCompleted(user?.uid || '');
                  window.location.href = '/app/dashboard';
                }}
                className="w-full mt-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
              >
                Mark as Completed & Go to Dashboard
              </button>
              <button
                onClick={() => {
                  console.log('Debug Info:', PasswordChangeTracker.getDebugInfo());
                }}
                className="w-full mt-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Log Debug Info
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MandatoryPasswordChange; 