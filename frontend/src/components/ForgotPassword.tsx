import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { validateEmail } from '../utils/validation';
import { CSRFProtection, SecurityAudit } from '../utils/security';

interface ForgotPasswordProps {
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onClose, onSwitchToSignIn }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');

  // Initialize CSRF token
  React.useEffect(() => {
    const token = CSRFProtection.generateToken();
    setCsrfToken(token);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate CSRF token
    if (!CSRFProtection.validateToken(csrfToken)) {
      SecurityAudit.logSecurityEvent('security', 'CSRF token validation failed on forgot password', undefined, 'csrf_attack');
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Log password reset attempt
      SecurityAudit.logSecurityEvent('info', `Password reset requested for ${email}`, undefined, 'password_reset_requested');

      // Send password reset email
      await sendPasswordResetEmail(auth, email);

      // Refresh CSRF token after successful request
      const newToken = CSRFProtection.refreshToken();
      setCsrfToken(newToken);

      // Log successful password reset email
      SecurityAudit.logSecurityEvent('info', `Password reset email sent to ${email}`, undefined, 'password_reset_email_sent');

      setSuccess('Password reset email sent! Check your inbox and follow the instructions.');
      
      // Clear form
      setEmail('');

    } catch (error: unknown) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email address.';
          SecurityAudit.logSecurityEvent('warn', `Password reset attempted for non-existent email: ${email}`, undefined, 'password_reset_failed');
        } else if (firebaseError.code === 'auth/too-many-requests') {
          errorMessage = 'Too many password reset attempts. Please try again later.';
          SecurityAudit.logSecurityEvent('warn', `Password reset rate limited for: ${email}`, undefined, 'password_reset_rate_limited');
        } else if (firebaseError.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address format.';
          SecurityAudit.logSecurityEvent('warn', `Password reset attempted with invalid email: ${email}`, undefined, 'password_reset_failed');
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
            Reset Password
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

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">📧</span>
            <div className="text-blue-800 dark:text-blue-200 text-sm">
              <p className="font-medium mb-1">Forgot your password?</p>
              <p>Enter your email address and we'll send you a link to reset your password.</p>
            </div>
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
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
              required
              placeholder="Enter your email address"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToSignIn}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
          >
            ← Back to Sign In
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-500 mr-2">🔒</span>
            <span>Password reset links expire in 1 hour for security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 