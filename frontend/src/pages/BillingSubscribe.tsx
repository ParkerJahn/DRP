import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Activation flow steps
type ActivationStep = 'choice' | 'free-code' | 'billing' | 'processing' | 'success';

const BillingSubscribe: React.FC = () => {
  const { role, proStatus, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ActivationStep>('choice');
  const [freeCode, setFreeCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Explicitly type the proStatus to handle the union type
  const currentProStatus = proStatus as 'active' | 'inactive' | null;

  // Function to sign out and redirect to home
  const signOutAndGoHome = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  // Handle redirects for non-PRO or already active users
  useEffect(() => {
    if (redirecting) return;
    
    const timer = setTimeout(() => {
      if (role !== 'PRO') {
        setRedirecting(true);
        signOutAndGoHome();
        return;
      }
      
      // If user is already active, redirect to dashboard
      if (currentProStatus === 'active') {
        console.log('✅ PRO user already active, redirecting to dashboard...');
        setRedirecting(true);
        navigate('/app/dashboard');
        return;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [role, currentProStatus, navigate, redirecting]);

  // Handle free code activation
  const handleFreeCodeActivation = async () => {
    if (!freeCode.trim()) {
      setError('Please enter the free access code');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const functions = getFunctions();
      const activateProAccount = httpsCallable(functions, 'activateProAccount');
      
      await activateProAccount({
        activationMethod: 'free_access',
        freeAccessCode: freeCode.trim()
      });
      
      console.log('✅ PRO account activated successfully via free access!');
      
      // Refresh user data to get updated proStatus
      await refreshUser();
      
      setCurrentStep('success');
      
    } catch (error: unknown) {
      console.error('Error activating with free code:', error);
      
      if (error instanceof Error && error.message?.includes('Invalid free access code')) {
        setError('Invalid free access code. Please check your code and try again.');
      } else if (error instanceof Error && error.message?.includes('Free access already activated')) {
        setError('Free access has already been used for this account.');
      } else {
        setError('Failed to activate with free code. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle billing activation (placeholder for Stripe integration)
  const handleBillingActivation = async () => {
    setProcessing(true);
    setError(null);

    try {
      // TODO: Integrate with Stripe for payment processing
      // For now, this is a placeholder
      alert('🚧 Billing integration coming soon! Contact support for payment options.');
      
    } catch (error: unknown) {
      console.error('Error with billing activation:', error);
      setError('Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle success completion
  const handleSuccessComplete = () => {
    setRedirecting(true);
    navigate('/app/dashboard');
  };

  // If user is not PRO or is redirecting, show loading
  if (role !== 'PRO' || redirecting || currentProStatus === 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Activate Your SweatPro Account
          </h1>
          <p className="text-indigo-100">
            {currentStep === 'choice' && 'Choose your activation method'}
            {currentStep === 'free-code' && 'Enter your free access code'}
            {currentStep === 'billing' && 'Complete your subscription'}
            {currentStep === 'processing' && 'Processing activation...'}
            {currentStep === 'success' && 'Account activated successfully!'}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className={currentStep === 'choice' ? 'text-indigo-600 font-medium' : ''}>
              1. Choose Method
            </span>
            <span className={['free-code', 'billing'].includes(currentStep) ? 'text-indigo-600 font-medium' : ''}>
              2. Activate
            </span>
            <span className={currentStep === 'success' ? 'text-green-600 font-medium' : ''}>
              3. Complete
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-neutral-600 rounded-full h-1">
            <div 
              className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
              style={{
                width: currentStep === 'choice' ? '33%' : 
                       ['free-code', 'billing', 'processing'].includes(currentStep) ? '66%' : '100%'
              }}
            ></div>
          </div>
        </div>

        <div className="p-6">
          
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Choice */}
          {currentStep === 'choice' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  How would you like to activate your account?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose one of the options below to activate your SweatPro account
                </p>
              </div>

              {/* Free Access Option */}
              <div 
                onClick={() => setCurrentStep('free-code')}
                className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">🆓</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    Free Access Code
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Have a free access code? Enter it to activate your account at no cost.
                  </p>
                  <div className="mt-3">
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      Click to enter code →
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Option */}
              <div 
                onClick={() => setCurrentStep('billing')}
                className="cursor-pointer border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 hover:border-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all group"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">💳</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    Monthly Subscription
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Subscribe to unlock all SweatPro features and grow your fitness business.
                  </p>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                    $29/month
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      Click to subscribe →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2a: Free Code Entry */}
          {currentStep === 'free-code' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🔑</div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Enter Free Access Code
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your free access code to activate your SweatPro account
                </p>
              </div>

              <div>
                <label htmlFor="freeCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Free Access Code
                </label>
                <input
                  id="freeCode"
                  type="text"
                  value={freeCode}
                  onChange={(e) => setFreeCode(e.target.value.toUpperCase())}
                  placeholder="Enter your free access code"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white text-center font-mono text-lg tracking-wider"
                  disabled={processing}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('choice')}
                  disabled={processing}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFreeCodeActivation}
                  disabled={processing || !freeCode.trim()}
                  className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Activating...
                    </>
                  ) : (
                    'Activate Account'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2b: Billing */}
          {currentStep === 'billing' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-4">💳</div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  SweatPro Subscription
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete your subscription to activate your SweatPro account
                </p>
              </div>

              {/* Subscription Details */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">$29</div>
                  <div className="text-sm text-indigo-700 dark:text-indigo-300">per month</div>
                </div>
                
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
                  What's included:
                </h3>
                <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Unlimited Staff & Athlete seats
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Team messaging & collaboration
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Calendar & event management
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Program & workout management
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Payment processing & packages
                  </li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('choice')}
                  disabled={processing}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleBillingActivation}
                  disabled={processing}
                  className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Subscribe & Activate'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Account Activated Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your SweatPro account is now active. Welcome to the team!
              </p>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <div className="text-green-600 dark:text-green-400 mr-2">✅</div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    All SweatPro features are now unlocked
                  </span>
                </div>
              </div>

              <button
                onClick={handleSuccessComplete}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BillingSubscribe; 