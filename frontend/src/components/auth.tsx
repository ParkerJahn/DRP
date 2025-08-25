import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { useAuth } from "../hooks/useAuth";
import MultiStepRegistration from "./MultiStepRegistration";
import ForgotPassword from "./ForgotPassword";
import { validateEmail, sanitizeText } from '../utils/validation';
import { authRateLimiter } from '../utils/rateLimit';
import { CSRFProtection, SecurityAudit, SessionSecurity } from '../utils/security';

export const SignIn = ({ onSwitchToRegister, onAuthSuccess }: { onSwitchToRegister: () => void; onAuthSuccess: (userData: { email: string | null }) => void }) => {
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Initialize CSRF token and session security
  useEffect(() => {
    const token = CSRFProtection.generateToken();
    setCsrfToken(token);
    SessionSecurity.initialize();
    
    // Log security event
    SecurityAudit.logSecurityEvent('info', 'Sign-in page accessed', undefined, 'page_access');
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitized = sanitizeText(value);
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate CSRF token
    if (!CSRFProtection.validateToken(csrfToken)) {
      SecurityAudit.logSecurityEvent('security', 'CSRF token validation failed', undefined, 'csrf_attack');
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }
    
    // Check rate limiting
    const identifier = `auth_${formData.email}`;
    if (!authRateLimiter.isAllowed(identifier)) {
      const remainingTime = authRateLimiter.getTimeUntilReset(identifier);
      const minutes = Math.ceil(remainingTime / (60 * 1000));
      
      SecurityAudit.logSecurityEvent('warn', `Rate limit exceeded for ${formData.email}`, undefined, 'rate_limit_exceeded');
      setError(`Too many login attempts. Please try again in ${minutes} minutes.`);
      return;
    }
    
    // Validate email format only (don't validate password strength during sign-in)
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      SecurityAudit.logSecurityEvent('warn', `Invalid email format: ${formData.email}`, undefined, 'invalid_input');
      setError(emailValidation.error || 'Invalid email');
      return;
    }
    
    // Don't validate password strength during sign-in - let Firebase handle authentication
    // We'll check password strength after successful login and redirect if needed
    
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Reset rate limiting on successful login
      authRateLimiter.reset(identifier);
      
      // Log successful login
      SecurityAudit.logSecurityEvent('info', `Successful login for ${formData.email}`, userCredential.user.uid, 'login_success');
      
      // Refresh CSRF token for new session
      const newToken = CSRFProtection.refreshToken();
      setCsrfToken(newToken);
      
      // Check if user needs password change after successful authentication
      // This will be handled by the usePasswordSecurity hook in AppShell
      onAuthSuccess({ email: userCredential.user.email });
      
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      
      let errorMessage = 'Failed to sign in. Please check your credentials.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email address.';
          SecurityAudit.logSecurityEvent('warn', `Login attempt with non-existent email: ${formData.email}`, undefined, 'login_failed');
        } else if (firebaseError.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password.';
          SecurityAudit.logSecurityEvent('warn', `Login attempt with wrong password for: ${formData.email}`, undefined, 'login_failed');
        } else if (firebaseError.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed attempts. Please try again later.';
          SecurityAudit.logSecurityEvent('error', `Account temporarily locked for: ${formData.email}`, undefined, 'account_locked');
        } else if (firebaseError.code === 'auth/user-disabled') {
          errorMessage = 'This account has been disabled.';
          SecurityAudit.logSecurityEvent('error', `Login attempt to disabled account: ${formData.email}`, undefined, 'login_failed');
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Validate CSRF token
    if (!CSRFProtection.validateToken(csrfToken)) {
      SecurityAudit.logSecurityEvent('security', 'CSRF token validation failed for Google sign-in', undefined, 'csrf_attack');
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      
      // Log successful Google login
      SecurityAudit.logSecurityEvent('info', `Successful Google login for ${userCredential.user.email}`, userCredential.user.uid, 'google_login_success');
      
      // Refresh CSRF token for new session
      const newToken = CSRFProtection.refreshToken();
      setCsrfToken(newToken);
      
      await refreshUser();
      onAuthSuccess({ email: userCredential.user.email });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Google sign in error:', error);
      
      SecurityAudit.logSecurityEvent('error', `Google sign-in failed: ${errorMessage}`, undefined, 'google_login_failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Welcome back! Please sign in to continue.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Hidden CSRF token */}
          <input type="hidden" name="csrf_token" value={csrfToken} />
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                required
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                required
                placeholder="Enter your password"
              />
              <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 6 characters
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
        
        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <ForgotPassword
            onClose={() => setShowForgotPassword(false)}
            onSwitchToSignIn={() => setShowForgotPassword(false)}
          />
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        <div>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={onSwitchToRegister}
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Don't have an account?{" "}
            <span className="font-medium">Register</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const Auth = ({ onAuthSuccess }: { onAuthSuccess: (userData: { uid: string; email: string | null; displayName: string; role: string }) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);

  const switchToRegister = () => setIsRegistering(true);
  const switchToSignIn = () => setIsRegistering(false);

  // Wrapper function to convert SignIn callback to match MultiStepRegistration signature
  const handleSignInSuccess = (userData: { email: string | null }) => {
    // For sign in, we don't have all the profile data, so we'll call with minimal data
    // The AuthContext will handle fetching the full user data
    onAuthSuccess({
      uid: '', // Will be filled by AuthContext
      email: userData.email,
      displayName: '', // Will be filled by AuthContext
      role: '' // Will be filled by AuthContext
    });
  };

  return (
    <div>
      {isRegistering ? (
        <MultiStepRegistration onSwitchToSignIn={switchToSignIn} onRegistrationComplete={onAuthSuccess} />
      ) : (
        <SignIn onSwitchToRegister={switchToRegister} onAuthSuccess={handleSignInSuccess} />
      )}
    </div>
  );
};

export default Auth;