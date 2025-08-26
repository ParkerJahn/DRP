import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

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
}

function MultiStepRegistration({ onRegistrationComplete, onSwitchToSignIn }: MultiStepRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'ATHLETE'
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Step 1: Authentication
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

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registrationData.email,
        registrationData.password
      );
      
      setFirebaseUser(userCredential.user);
      setCurrentStep(2);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      setFirebaseUser(userCredential.user);
      
      // Pre-fill email if from Google
      setRegistrationData(prev => ({
        ...prev,
        email: userCredential.user.email || ''
      }));
      
      setCurrentStep(2);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Profile Setup
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firebaseUser) {
      setError('Authentication required. Please go back to step 1.');
      return;
    }

    // Validate all required fields
    if (!registrationData.firstName.trim() || 
        !registrationData.lastName.trim() || 
        !registrationData.phoneNumber.trim()) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create user document in Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      const userData = {
        uid: firebaseUser.uid,
        email: registrationData.email || firebaseUser.email,
        displayName: `${registrationData.firstName} ${registrationData.lastName}`,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phoneNumber: registrationData.phoneNumber,
        role: registrationData.role,
        photoURL: firebaseUser.photoURL || null,
        proId: null, // Will be set by PRO if invited
        proStatus: registrationData.role === 'PRO' ? 'inactive' : null, // PRO needs to complete Stripe
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Filter out undefined values
      const cleanUserData = Object.fromEntries(
        Object.entries(userData).filter(([, value]) => value !== undefined)
      );

      await setDoc(userRef, cleanUserData);

      // Call success callback
      onRegistrationComplete({
        uid: firebaseUser.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(`Failed to create profile: ${errorMessage}`);
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
              Create Your Account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Step 1 of 2: Set up your authentication
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
                  onChange={(e) => updateRegistrationData('email', e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="Enter your email"
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
                  onChange={(e) => updateRegistrationData('password', e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="Create a password"
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
                  onChange={(e) => updateRegistrationData('confirmPassword', e.target.value)}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 ${
                    registrationData.confirmPassword && registrationData.password !== registrationData.confirmPassword
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                  } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white`}
                  placeholder="Confirm your password"
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
                {loading ? 'Creating Account...' : 'Continue to Profile Setup'}
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
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Step 2 of 2: Tell us about yourself
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
                  onChange={(e) => updateRegistrationData('firstName', e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="First name"
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
                  onChange={(e) => updateRegistrationData('lastName', e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                  placeholder="Last name"
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
                onChange={(e) => updateRegistrationData('phoneNumber', e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700"
                placeholder="(555) 123-4567"
              />
            </div>

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
              {loading ? 'Creating Profile...' : 'Complete Registration'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>All fields marked with * are required</p>
        </div>
      </div>
    </div>
  );
}

export default MultiStepRegistration; 