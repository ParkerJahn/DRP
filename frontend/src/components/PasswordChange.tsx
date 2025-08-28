import React, { useState } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { validatePassword, validateCurrentPassword } from '../utils/validation';
import { CSRFProtection, SecurityAudit } from '../utils/security';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { PasswordSecurityManager } from '../utils/passwordSecurityManager';

interface PasswordChangeProps {
  onClose: () => void;
}

const PasswordChange: React.FC<PasswordChangeProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');

  // Initialize CSRF token
  React.useEffect(() => {
    const token = CSRFProtection.generateToken();
    setCsrfToken(token);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate CSRF token
    if (!CSRFProtection.validateToken(csrfToken)) {
      SecurityAudit.logSecurityEvent('security', 'CSRF token validation failed on password change', user?.uid, 'csrf_attack');
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }

    // Validate current password
    const currentPasswordValidation = validateCurrentPassword(formData.currentPassword);
    if (!currentPasswordValidation.isValid) {
      setError(currentPasswordValidation.error || 'Current password is required');
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
      // Log password change attempt
      SecurityAudit.logSecurityEvent('info', 'Password change initiated', user?.uid, 'password_change_attempt');

      // Re-authenticate user before password change
      const credential = EmailAuthProvider.credential(
        user?.email || '',
        formData.currentPassword
      );

      await reauthenticateWithCredential(auth.currentUser!, credential);

      // Update password
      await updatePassword(auth.currentUser!, formData.newPassword);

      // Refresh CSRF token after successful change
      const newToken = CSRFProtection.refreshToken();
      setCsrfToken(newToken);

      // Log successful password change
      SecurityAudit.logSecurityEvent('info', 'Password changed successfully', user?.uid, 'password_change_success');

      // Clear the password change requirement flag if it was set
      try {
        await PasswordSecurityManager.clearPasswordChangeRequirement(user?.uid || '');
        console.log('✅ Password change requirement flag cleared');
      } catch (error) {
        console.warn('⚠️ Failed to clear password change requirement flag:', error);
        // Don't block the user if this fails - they've already changed their password
      }

      setSuccess('Password changed successfully!');
      
      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error: unknown) {
      console.error('Password change error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/wrong-password') {
          errorMessage = 'Current password is incorrect.';
          SecurityAudit.logSecurityEvent('warn', 'Password change failed - wrong current password', user?.uid, 'password_change_failed');
        } else if (firebaseError.code === 'auth/weak-password') {
          errorMessage = 'New password is too weak. Please choose a stronger password.';
          SecurityAudit.logSecurityEvent('warn', 'Password change failed - weak password', user?.uid, 'password_change_failed');
        } else if (firebaseError.code === 'auth/requires-recent-login') {
          errorMessage = 'For security reasons, please sign in again before changing your password.';
          SecurityAudit.logSecurityEvent('warn', 'Password change failed - requires recent login', user?.uid, 'password_change_failed');
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md mx-4 w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Change Password
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Security Notice */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center">
            <span className="text-blue-600 dark:text-blue-400 mr-2">🔒</span>
            <span className="text-blue-800 dark:text-blue-200 text-sm">
              Your password must be at least 6 characters long and include uppercase, lowercase, number, and special character.
            </span>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
              <span className="text-green-800 dark:text-green-200">{success}</span>
            </div>
          </div>
        )}

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

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChange; 