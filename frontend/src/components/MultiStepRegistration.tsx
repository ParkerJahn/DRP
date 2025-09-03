import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import ForgotPassword from './ForgotPassword';
import { cleanupOrphanedUsers } from '../services/teamManagement';
import { INPUT_LIMITS, sanitizeText } from '../utils/validation';

/**
 * MultiStepRegistration Component
 * 
 * Refactored for SweatPro-only public registration:
 * - Public registration (from /register route): Only allows PRO (coach/trainer) registration
 * - Invite-based registration: Maintains full role selection for backward compatibility
 * - Uses isInviteBasedRegistration prop to distinguish between entry points
 * - Athletes and Team Members must use invitation links from their coaches
 * 
 * @param isInviteBasedRegistration - Optional flag to enable full role selection (defaults to false)
 */

interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'PRO' | 'ATHLETE' | 'STAFF';
}

interface MultiStepRegistrationProps {
  onRegistrationComplete: (userData: { uid: string; email: string | null; displayName: string; role: string }) => void;
  onSwitchToSignIn: () => void;
  // Add optional prop to distinguish entry point (for future extensibility)
  isInviteBasedRegistration?: boolean;
}

function MultiStepRegistration({ 
  onRegistrationComplete, 
  onSwitchToSignIn, 
  isInviteBasedRegistration = false 
}: MultiStepRegistrationProps) {
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleSignIn, setIsGoogleSignIn] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    // Default to PRO for public registration, maintain old behavior for invite-based
    role: isInviteBasedRegistration ? 'ATHLETE' : 'PRO'
  });

  // Step 1: Authentication - Only validate, don't create account yet
  const handleEmailRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate password requirements
    if (registrationData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    // Validate password confirmation
    if (registrationData.password !== registrationData.confirmPassword) {
      setError('Passwords do not match. Please confirm your password.');
      setLoading(false);
      return;
    }

    // Validate email format
    if (!registrationData.email || !registrationData.email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    // All validations passed - move to profile setup
    setCurrentStep(2);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Pre-fill email if from Google
      setRegistrationData(prev => ({
        ...prev,
        email: userCredential.user.email || ''
      }));
      setIsGoogleSignIn(true);
      setGoogleUser(userCredential.user);
      
      // Move to profile setup - don't create account yet
      setCurrentStep(2);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to check if user exists in Firestore
  const debugUserExistence = async (email: string) => {
    try {
      // Note: We can't check Firestore during registration due to permissions
      // The user exists in Firebase Auth but may be missing from Firestore
      console.log('🔍 Debug Info for email:', email);
      console.log('❌ User exists in Firebase Auth (causing email-already-in-use error)');
      console.log('❓ User status in Firestore: Unknown (permission blocked)');
      console.log('💡 This suggests a previous incomplete registration');
      console.log('🛠️ Solution: User needs to either:');
      console.log('   1. Try signing in with their password');
      console.log('   2. Use "Forgot Password" to reset');
      console.log('   3. Contact support to clean up orphaned account');
      
      return 'orphaned_auth_user';
    } catch (error) {
      console.error('Error in debug function:', error);
      return 'debug_error';
    }
  };

  // Clean up orphaned account function
  const handleCleanupOrphanedAccount = async () => {
    if (!registrationData.email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await cleanupOrphanedUsers(registrationData.email);
      
      if (result.success) {
        setError('✅ Orphaned account cleaned up successfully! You can now continue with registration.');
        // Clear the email field to allow fresh registration
        setRegistrationData(prev => ({ ...prev, email: '' }));
      } else {
        setError(`❌ Cleanup failed: ${result.error}`);
      }
    } catch (error: unknown) {
      setError('❌ Error during cleanup. Please try again or contact support.');
      console.error('Cleanup error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Profile Setup - Now create account and save profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    // Validate all required fields
    if (!registrationData.firstName.trim() || 
        !registrationData.lastName.trim() || 
        !registrationData.phoneNumber.trim()) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    try {
      let newUser: User;
      
      if (isGoogleSignIn && googleUser) {
        // User already has Firebase account from Google sign-in
        newUser = googleUser;
      } else {
        // Create the Firebase user account with email/password from Phase 1
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          registrationData.email,
          registrationData.password
        );
        newUser = userCredential.user;
      }

      // Create the user profile in Firestore
      const baseProfile = {
        uid: newUser.uid,
        email: registrationData.email || newUser.email,
        displayName: `${registrationData.firstName} ${registrationData.lastName}`,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phoneNumber: registrationData.phoneNumber,
        role: registrationData.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        proId: null, // Will be set when they join a team
        isEmailVerified: newUser.emailVerified || false,
        photoURL: newUser.photoURL || null
      };

      // Add proStatus for PRO users
      const userProfile = registrationData.role === 'PRO' 
        ? { ...baseProfile, proStatus: 'inactive' as const }
        : baseProfile;

      await setDoc(doc(db, 'users', newUser.uid), userProfile);

      // Registration complete - call the success callback
      onRegistrationComplete({
        uid: newUser.uid,
        email: newUser.email,
        displayName: userProfile.displayName,
        role: registrationData.role
      });

    } catch (error: unknown) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Failed to create account. Please try again.';
      let showRecoveryOption = false;
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/email-already-in-use') {
          errorMessage = 'An account with this email already exists. This usually means you have an incomplete account from a previous registration attempt. Please try signing in instead, or use "Forgot Password" if you don\'t remember your password.';
          showRecoveryOption = true;
        } else if (firebaseError.code === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid email address.';
        } else if (firebaseError.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        }
      }
      
      setError(errorMessage);
      
      // If it's an email-already-in-use error, show recovery option
      if (showRecoveryOption) {
        console.warn('Email already in use detected. This might indicate:');
        console.warn('1. User exists in Firebase Auth but not in Firestore');
        console.warn('2. Previous incomplete registration');
        console.warn('3. Data synchronization issue');
        console.warn('Recommendation: User should try signing in instead');
        
        // Debug: Check if user exists in Firestore
        debugUserExistence(registrationData.email);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationData = (field: keyof RegistrationData, value: string) => {
    setRegistrationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const goBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setError(null);
    }
  };

  // Step 1: Authentication
  if (currentStep === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {isInviteBasedRegistration ? "Join Your Team" : "SweatPro Registration"}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {isInviteBasedRegistration 
                ? "Step 1 of 2: Set up your authentication" 
                : "Step 1 of 2: For coaches and trainers only"
              }
            </p>
            {!isInviteBasedRegistration && (
              <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
                Athletes and team members will receive an invite from their coach
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  {error.includes('already exists') && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-red-600">
                        <strong>What happened?</strong> Your email was used in a previous registration that didn't complete.
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={onSwitchToSignIn}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md transition-colors duration-200"
                        >
                          Try Signing In
                        </button>
                        <button
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md transition-colors duration-200"
                        >
                          Forgot Password?
                        </button>
                        <button
                          onClick={handleCleanupOrphanedAccount}
                          disabled={loading}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md transition-colors duration-200 disabled:opacity-50"
                        >
                          {loading ? 'Cleaning...' : 'Clean Up Account'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Sign In */}
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
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-gray-400">Or continue with email</span>
            </div>
          </div>

          {/* Email Registration Form */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Password Requirements
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• At least 6 characters long</li>
              <li>• Include uppercase and lowercase letters</li>
              <li>• Include numbers and special characters</li>
              <li>• Avoid common weak passwords</li>
            </ul>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleEmailRegistration}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={registrationData.email}
                  onChange={(e) => updateRegistrationData('email', sanitizeText(e.target.value, INPUT_LIMITS.EMAIL_MAX))}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="Enter your email"
                  maxLength={INPUT_LIMITS.EMAIL_MAX}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={registrationData.password}
                  onChange={(e) => updateRegistrationData('password', sanitizeText(e.target.value, INPUT_LIMITS.PASSWORD_MAX))}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="Create a password"
                  maxLength={INPUT_LIMITS.PASSWORD_MAX}
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 6 characters long
                </div>
                <PasswordStrengthIndicator password={registrationData.password} showStrength={true} />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={registrationData.confirmPassword}
                  onChange={(e) => updateRegistrationData('confirmPassword', sanitizeText(e.target.value, INPUT_LIMITS.PASSWORD_MAX))}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 ${
                    registrationData.confirmPassword && registrationData.password !== registrationData.confirmPassword
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                  } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white`}
                  placeholder="Confirm your password"
                  maxLength={INPUT_LIMITS.PASSWORD_MAX}
                />
                {registrationData.confirmPassword && registrationData.password !== registrationData.confirmPassword && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Passwords do not match
                  </div>
                )}
                {registrationData.confirmPassword && registrationData.password === registrationData.confirmPassword && (
                  <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ Passwords match
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !registrationData.email || !registrationData.password || !registrationData.confirmPassword || registrationData.password !== registrationData.confirmPassword || registrationData.password.length < 6}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validating...' : 'Continue to Profile Setup'}
              </button>
            </div>
          </form>

          <div className="text-center">
            <button
              onClick={onSwitchToSignIn}
              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Profile Setup
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isInviteBasedRegistration ? "Complete Your Profile" : "SweatPro Profile Setup"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isInviteBasedRegistration 
              ? "Step 2 of 2: Tell us about yourself" 
              : "Step 2 of 2: Set up your coaching profile"
            }
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

        <form className="mt-8 space-y-6" onSubmit={handleProfileSubmit}>
          <div className="space-y-4">
            {/* SweatPro Registration Header for public registration */}
            {!isInviteBasedRegistration && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                  🏋️ SweatPro Registration
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                  This registration is for personal trainers, coaches, and fitness professionals who want to manage their clients and grow their business.
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  <strong>Athletes and Team Members:</strong> You'll receive an invitation link from your coach. No need to register here!
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={registrationData.firstName}
                  onChange={(e) => updateRegistrationData('firstName', sanitizeText(e.target.value, INPUT_LIMITS.FIRST_NAME_MAX))}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="First name"
                  maxLength={INPUT_LIMITS.FIRST_NAME_MAX}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={registrationData.lastName}
                  onChange={(e) => updateRegistrationData('lastName', sanitizeText(e.target.value, INPUT_LIMITS.LAST_NAME_MAX))}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="Last name"
                  maxLength={INPUT_LIMITS.LAST_NAME_MAX}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number *
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                value={registrationData.phoneNumber}
                onChange={(e) => updateRegistrationData('phoneNumber', sanitizeText(e.target.value, INPUT_LIMITS.PHONE_MAX))}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                placeholder="Phone number"
                maxLength={INPUT_LIMITS.PHONE_MAX}
              />
            </div>

            {/* Role selection - only show for invite-based registration, hide for public */}
            {isInviteBasedRegistration ? (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  I am a... *
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  value={registrationData.role}
                  onChange={(e) => updateRegistrationData('role', e.target.value as 'PRO' | 'ATHLETE' | 'STAFF')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
                >
                  <option value="ATHLETE">Athlete (I want to train)</option>
                  <option value="PRO">PRO Coach (I want to train others)</option>
                  <option value="STAFF">Staff Member (I assist coaches)</option>
                </select>
              </div>
            ) : (
              /* Hidden field for public registration - always PRO */
              <input type="hidden" name="role" value="PRO" />
            )}

            {/* Display selected role for public registration */}
            {!isInviteBasedRegistration && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Registering as: SweatPro (Coach/Trainer)
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                  You'll be able to create training programs, manage clients, and grow your fitness business.
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={goBack}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !registrationData.firstName || !registrationData.lastName || !registrationData.phoneNumber}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>All fields marked with * are required</p>
        </div>
      </div>
      
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPassword
          onClose={() => setShowForgotPassword(false)}
          onSwitchToSignIn={() => setShowForgotPassword(false)}
        />
      )}
    </div>
  );
}

export default MultiStepRegistration; 