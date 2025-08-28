import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import type { AuthError } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

interface InviteData {
  id: string;
  proId: string;
  role: UserRole;
  email?: string;
  expiresAt: string;
}

const JoinInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [processingGoogleSignIn, setProcessingGoogleSignIn] = useState(false);
  const [redeemingInvite, setRedeemingInvite] = useState(false);
  
  // Add state to prevent multiple useEffect triggers
  const [hasAttemptedRedemption, setHasAttemptedRedemption] = useState(false);
  
  // Add success state to prevent errors after successful account creation
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    console.log('🔍 JoinInvite useEffect - component mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
    console.log('🔍 Current search params:', window.location.search);
    
    // Don't show errors if account was successfully created
    if (accountCreated) {
      console.log('✅ Account already created, skipping token validation');
      return;
    }
    
    const token = searchParams.get('token');
    if (!token) {
      console.log('❌ No invite token provided');
      setError('No invite token provided');
      setLoading(false);
      return;
    }
    
    console.log('✅ Token found in URL:', token.substring(0, 20) + '...');
    validateInviteToken(token);
  }, [searchParams, accountCreated]);

  const validateInviteToken = async (token: string) => {
    try {
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/validateInvite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to validate invite');
      }

      const result = await response.json();
      if (result.valid) {
        setInviteData(result.invite);
        setLoading(false);
      } else {
        // Check if this is a claimed invite and show special message
        if (result.error === 'Invite has already been claimed') {
          setError('This invite has already been used. Please open a new browser tab and sign in to your account to access the team.');
        } else {
          setError(result.error || 'Invalid invite');
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error validating invite:', error);
      setError((error as Error).message || 'Failed to validate invite');
      setLoading(false);
    }
  };

  useEffect(() => {
    // If user is already authenticated, redirect them
    if (user) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  // Auto-redeem invite if user is already authenticated
  useEffect(() => {
    // Prevent multiple triggers
    if (hasAttemptedRedemption || submitting || redeemingInvite) {
      console.log('⚠️ Auto-redemption skipped:', { 
        hasAttemptedRedemption, 
        submitting, 
        redeemingInvite 
      });
      return;
    }
    
    console.log('🔄 Auto-redemption useEffect triggered:', { 
      user: !!user, 
      inviteData: !!inviteData, 
      loading, 
      userUid: user?.uid,
      userRole: user?.role,
      userProId: user?.proId,
      currentUrl: window.location.href
    });
    
    if (user && inviteData && !loading && !redeemingInvite) {
      console.log('🚀 Auto-redeeming invite for authenticated user:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        currentRole: user.role,
        currentProId: user.proId
      });
      
      // Only redeem if user isn't already on a team
      if (!user.proId) {
        // Validate that we have all required data before calling
        if (user.uid && user.email && user.displayName) {
          console.log('✅ User has no team and all data is valid, proceeding with auto-redemption');
          setHasAttemptedRedemption(true); // Mark as attempted
          redeemInviteForUser(user.uid, user.email, user.displayName);
        } else {
          console.log('⚠️ User data incomplete, skipping auto-redemption:', {
            hasUid: !!user.uid,
            hasEmail: !!user.email,
            hasDisplayName: !!user.displayName
          });
        }
      } else {
        console.log('⚠️ User already has a team, skipping auto-redemption');
        // User already has a team, redirect to dashboard
        navigate('/app/dashboard');
      }
    }
  }, [user, inviteData, loading, redeemingInvite, hasAttemptedRedemption, submitting, navigate]);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || 
        !formData.firstName || !formData.lastName || !formData.phoneNumber) {
      setError('All fields are required');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !inviteData) return;

    try {
      setSubmitting(true);
      setError(null);

      const token = searchParams.get('token');
      if (!token) {
        setError('Missing invite token');
        return;
      }

      if (isNewUser) {
        // Create new account
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );

        const newUser = userCredential.user;

        // Call Cloud Function to redeem invite and create user profile
        const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/redeemInvite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await newUser.getIdToken()}`
          },
          body: JSON.stringify({
            uid: newUser.uid,
            token: token,
            userData: {
              email: formData.email,
              displayName: `${formData.firstName} ${formData.lastName}`,
              firstName: formData.firstName,
              lastName: formData.lastName,
              phoneNumber: formData.phoneNumber
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to redeem invite');
        }

        console.log('✅ New user account created successfully');
        
        // Mark account as created to prevent errors
        setAccountCreated(true);
        
        // Now redeem the invite for the new user
        await redeemInviteForUser(newUser.uid, formData.email, `${formData.firstName} ${formData.lastName}`);
      } else {
        // Sign in existing account
        try {
          const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
          const existingUser = userCredential.user;

          // Mark account as created to prevent errors
          setAccountCreated(true);

          // Automatically redeem the invite for the existing user
          await redeemInviteForUser(existingUser.uid, formData.email, `${formData.firstName} ${formData.lastName}`);
        } catch (signInError: unknown) {
          console.error('Sign-in error:', signInError);
          
          const errorCode = (signInError as { code?: string })?.code;
          if (errorCode === 'auth/user-not-found') {
            setError('No account found with this email. Please create a new account instead.');
            setIsNewUser(true);
            return; // Don't re-throw, just return
          } else if (errorCode === 'auth/wrong-password') {
            setError('Incorrect password. Please try again.');
            return; // Don't re-throw, just return
          } else if (errorCode === 'auth/invalid-credential') {
            // This is a generic error, try to determine if user exists
            try {
              // Check if user exists by trying to create account (this will fail if user exists)
              await createUserWithEmailAndPassword(auth, formData.email, 'tempPassword123!');
              // If we get here, user doesn't exist (temp account created)
              // Delete the temp account and switch to sign-up mode
              await auth.currentUser?.delete();
              setError('No account found with this email. Please create a new account instead.');
              setIsNewUser(true);
            } catch (createError: unknown) {
              const createErrorCode = (createError as { code?: string })?.code;
              if (createErrorCode === 'auth/email-already-in-use') {
                // User exists, so it's a password issue
                setError('Incorrect password. Please try again.');
              } else {
                // Some other error, show generic message
                setError('Invalid email or password. Please check your credentials.');
              }
            }
            return; // Don't re-throw, just return
          } else {
            setError(`Sign-in failed: ${(signInError as { message?: string })?.message || 'Unknown error'}`);
            return; // Don't re-throw, just return
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error joining team:', error);
      
      const errorCode = (error as { code?: string })?.code;
      if (errorCode === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
        setIsNewUser(false);
      } else if (errorCode === 'auth/user-not-found') {
        setError('No account found with this email. Please create a new account.');
        setIsNewUser(true);
      } else if (errorCode === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError((error as { message?: string })?.message || 'An error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    if (!inviteData) {
      setError('No invite data available');
      return;
    }

    try {
      console.log('🚀 Starting Google sign-in process...');
      setProcessingGoogleSignIn(true);
      setError('');

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      console.log('✅ Google sign-in successful:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName
      });

      // Mark account as created to prevent errors
      setAccountCreated(true);

      // Wait a moment for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔄 Redeeming invite for Google user...');
      await redeemInviteForUser(result.user.uid, result.user.email || '', result.user.displayName || '');
      
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      
      if (error instanceof Error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/popup-closed-by-user') {
          setError('Sign-in popup was closed. Please try again.');
        } else if (authError.code === 'auth/popup-blocked') {
          setError('Sign-in popup was blocked. Please allow popups for this site.');
        } else if (authError.code === 'auth/network-request-failed') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(`Google sign-in failed: ${authError.message || 'Unknown error'}`);
        }
      } else {
        setError('Google sign-in failed with an unknown error');
      }
    } finally {
      setProcessingGoogleSignIn(false);
    }
  };

  // Handle invite redemption for any authenticated user
  const redeemInviteForUser = async (uid: string, email: string, displayName: string) => {
    if (redeemingInvite) {
      console.log('⚠️ Already redeeming invite, skipping...');
      return;
    }
    
    // Validate input parameters
    if (!uid || !email || !displayName) {
      console.error('❌ Invalid parameters for redeemInviteForUser:', { uid, email, displayName });
      setError('Invalid user data for invite redemption');
      return;
    }
    
    // Validate that we have an authenticated user
    if (!auth.currentUser) {
      console.error('❌ No authenticated user available');
      setError('User not authenticated');
      return;
    }
    
    // Validate that we have invite data
    if (!inviteData) {
      console.error('❌ No invite data available');
      setError('No invite data available');
      return;
    }
    
    try {
      setRedeemingInvite(true);
      console.log('🔄 Starting invite redemption for user:', { uid, email, displayName });
      console.log('🔍 Current URL before redemption:', window.location.href);
      console.log('🔍 Invite data available:', !!inviteData);
      
      const token = searchParams.get('token');
      if (!token) {
        throw new Error('Missing invite token');
      }
      
      console.log('🔍 Token found:', token.substring(0, 20) + '...');
      console.log('🔍 Current auth user:', auth.currentUser);

      // Call Cloud Function to redeem invite
      console.log('📡 Calling redeemInvite Cloud Function...');
      const requestBody = {
        uid: uid,
        token: token,
        userData: {
          email: email,
          displayName: displayName,
          firstName: displayName.split(' ')[0] || '',
          lastName: displayName.split(' ').slice(1).join(' ') || '',
          phoneNumber: ''
        }
      };
      
      console.log('📡 Request body being sent:', requestBody);
      
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/redeemInvite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser!.getIdToken()}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Cloud Function error:', errorData);
        throw new Error(errorData.error || 'Failed to redeem invite');
      }

      const result = await response.json();
      console.log('✅ Cloud Function response:', result);

      console.log('✅ Invite redeemed successfully for user:', uid);
      
      // Force refresh of auth state to get new custom claims
      console.log('🔄 Refreshing auth token...');
      await auth.currentUser!.getIdToken(true);
      
      console.log('✅ Auth token refreshed, waiting for user data update...');
      
      // Wait for the user data to be updated in the context
      // This ensures the user has the correct role and proId before navigation
      let attempts = 0;
      const maxAttempts = 10; // Reduced from 20 to 5 seconds
      
      while (attempts < maxAttempts) {
        console.log(`🔄 Waiting for user data update... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh user data from context
        if (user && typeof refreshUser === 'function') {
          console.log('🔄 Forcing user data refresh...');
          await refreshUser();
        }
        
        // Check if user data has been updated
        if (user && user.proId) {
          console.log('✅ User data updated with proId:', user.proId);
          break;
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.warn('⚠️ User data update timeout, proceeding with navigation anyway');
      }
      
      console.log('🚀 About to show success message and redirect to dashboard...');
      console.log('🔍 Final URL before navigation:', window.location.href);
      
      // Mark account as created to prevent errors
      setAccountCreated(true);
      
      // Show success message and redirect to dashboard
      alert(`🎉 You have been successfully connected to the team! Welcome to DRP Workshop!`);
      
      // Navigate to dashboard instead of login page
      navigate('/app/dashboard');
      
    } catch (error) {
      console.error('❌ Error redeeming invite:', error);
      setError((error as Error).message || 'Failed to redeem invite');
    } finally {
      setRedeemingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Invalid Invite</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!inviteData) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            {inviteData.role === 'STAFF' ? '👥' : '💪'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Join the Team!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You've been invited to join as a <strong>{inviteData.role}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
            
            {/* Special handling for claimed invites */}
            {error.includes('already been used') && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  <strong>💡 What to do next:</strong>
                </p>
                <div className="space-y-2 text-xs text-blue-600 dark:text-blue-400">
                  <p>1. Open a new browser tab or window</p>
                  <p>2. Go to <strong>https://drp-workshop.web.app</strong></p>
                  <p>3. Sign in to your existing account</p>
                  <p>4. You'll have access to your team dashboard</p>
                </div>
                <button
                  onClick={() => window.open('https://drp-workshop.web.app', '_blank')}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors duration-200"
                >
                  🚀 Open New Tab & Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* Debug Information (temporary) */}
        {import.meta.env.DEV && inviteData && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">🔍 Debug Info</h4>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p><strong>Invite ID:</strong> {inviteData.id}</p>
              <p><strong>Role:</strong> {inviteData.role}</p>
              <p><strong>Pro ID:</strong> {inviteData.proId}</p>
              <p><strong>Expires:</strong> {new Date(inviteData.expiresAt).toLocaleString()}</p>
              <p><strong>Token:</strong> {searchParams.get('token')?.substring(0, 20)}...</p>
            </div>
            
            {/* Test Cloud Function Button */}
            <button
              onClick={async () => {
                try {
                  console.log('🧪 Testing Cloud Function call...');
                  const token = searchParams.get('token');
                  if (!token) {
                    alert('No token available');
                    return;
                  }
                  
                  // Test the validateInvite function first
                  const validateResponse = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/validateInvite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                  });
                  
                  console.log('🧪 Validate response:', validateResponse.status);
                  const validateResult = await validateResponse.json();
                  console.log('🧪 Validate result:', validateResult);
                  
                  if (validateResponse.ok) {
                    alert('✅ Validate function working! Check console for details.');
                  } else {
                    alert(`❌ Validate failed: ${validateResult.error}`);
                  }
                } catch (error) {
                  console.error('🧪 Test failed:', error);
                  alert(`❌ Test failed: ${(error as Error).message}`);
                }
              }}
              className="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
            >
              🧪 Test Cloud Function
            </button>
          </div>
        )}

        {/* Password Requirements for New Users */}
        {isNewUser && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show name fields for both sign-in and sign-up */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleFormChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleFormChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Show phone number only for new accounts */}
          {isNewUser && (
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number *
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              required
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Password must be at least 6 characters long
            </div>
            <PasswordStrengthIndicator password={formData.password} showStrength={true} />
          </div>

          {/* Show confirm password only for new accounts */}
          {isNewUser && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Passwords do not match
                </div>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ Passwords match
                </div>
              )}
            </div>
          )}

          {/* Mode indicator */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
              {isNewUser ? (
                <>🆕 <strong>Creating new account</strong> - You'll be automatically added to the team</>
              ) : (
                <>🔑 <strong>Signing in to existing account</strong> - You'll be added to the team</>
              )}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Joining Team...' : (isNewUser ? `Create Account & Join as ${inviteData.role}` : `Sign In & Join as ${inviteData.role}`)}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {isNewUser ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <button
              onClick={() => setIsNewUser(!isNewUser)}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              {isNewUser ? 'Sign in instead' : 'Create new account'}
            </button>
          </p>
          
          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={processingGoogleSignIn || redeemingInvite}
            className="w-full bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingGoogleSignIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                <span>Signing in...</span>
              </>
            ) : redeemingInvite ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                <span>Joining Team...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinInvite; 