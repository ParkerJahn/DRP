import React, { useState, useEffect } from 'react';
import { getFreeAccessStatus } from '../config/freeAccess';
import type { FreeAccessStatus } from '../config/freeAccess';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import FreeAccessActivation from '../components/FreeAccessActivation';

const BillingSubscribe: React.FC = () => {
  const { role, proStatus, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activating, setActivating] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const [freeAccessStatus] = useState<FreeAccessStatus>(getFreeAccessStatus());
  const [showFreeAccessModal, setShowFreeAccessModal] = useState(false);

  // Explicitly type the proStatus to handle the union type
  const currentProStatus = proStatus as 'active' | 'inactive' | null;

  // Function to sign out and redirect to home
  const signOutAndGoHome = async () => {
    try {
      await signOut(auth);
      // Clear any local storage or state
      localStorage.clear();
      // Use React Router navigation instead of window.location.href
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if sign out fails
      navigate('/');
    }
  };

  // If user is not PRO or is already active, redirect
  useEffect(() => {
    // Prevent multiple redirects
    if (redirecting) return;
    
    // Add a small delay to ensure auth context is fully updated
    const timer = setTimeout(() => {
      if (role !== 'PRO') {
        setRedirecting(true);
        signOutAndGoHome();
        return;
      }
      
      // If user is already active, redirect to dashboard (regardless of how they activated)
      if (currentProStatus === 'active') {
        console.log('✅ PRO user already active, redirecting to dashboard...');
        setRedirecting(true);
        navigate('/app/dashboard');
        return;
      }
      
      // If user has free access activated, automatically redirect to dashboard
      if (freeAccessStatus.isActive) {
        console.log('✅ FREE ACCESS: User has free access, redirecting to dashboard...');
        setRedirecting(true);
        navigate('/app/dashboard');
        return;
      }
    }, 500); // 500ms delay to ensure auth context is stable

    return () => clearTimeout(timer);
  }, [role, currentProStatus, freeAccessStatus.isActive, navigate, redirecting]);

  const handleActivatePro = async () => {
    if (!user) return;

    setActivating(true);

    try {
      // Check if user has free access activated
      const currentFreeAccessStatus = getFreeAccessStatus();
      
      if (currentFreeAccessStatus.isActive) {
        console.log('✅ FREE ACCESS: Activating PRO account with free access validation...');
        
        // Use secure Cloud Function to activate PRO account
        const functions = getFunctions();
        const activateProAccount = httpsCallable(functions, 'activateProAccount');
        
        await activateProAccount({
          activationMethod: 'free_access',
          freeAccessCode: 'DRP-X7K9M2P4'
        });
        
        console.log('✅ PRO account activated successfully via free access!');
        alert('🎉 PRO account activated! You will now be redirected to your dashboard.');
        
        // Set redirecting state to prevent loops
        setRedirecting(true);
        
        // Use React Router navigation
        navigate('/app/dashboard');
        return;
      }

      // If no free access, show payment required message
      alert('💳 Payment required to activate PRO account. Please complete the payment process or activate free access mode.');
      
    } catch (error) {
      console.error('Error activating PRO account:', error);
      alert('❌ Failed to activate PRO account. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  if (role !== 'PRO' || currentProStatus === 'active') {
    signOutAndGoHome();
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Complete Your PRO Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You're almost there! Complete your subscription to unlock all PRO features.
          </p>
          
        </div>

        {/* Free Access Indicator */}
        {freeAccessStatus.isActive && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <span className="text-xl">🔓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Free Access Mode Active
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  You can activate your PRO account for free! No payment required.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* PRO Plan Details */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
              PRO Plan Features
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
                SWEATsheet program builder
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Payment processing & analytics
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              $29
              <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cancel anytime • No setup fees
            </p>
          </div>

          {/* Activate Button */}
          <button
            onClick={handleActivatePro}
            disabled={activating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activating ? 'Activating...' : (freeAccessStatus.isActive ? 'Activate PRO Account (Free)' : 'Activate PRO Account')}
          </button>

          {/* Free Access Call to Action */}
          {!freeAccessStatus.isActive && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Have a free access code?
              </p>
              <button
                onClick={() => setShowFreeAccessModal(true)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium underline"
              >
                Activate Free Access Mode
              </button>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <button
            onClick={signOutAndGoHome}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none"
          >
            ← Back to Home
          </button>
        </div>
      </div>
      {/* Free Access Modal */}
      {showFreeAccessModal && (
        <FreeAccessActivation
          onClose={() => setShowFreeAccessModal(false)}
          onActivated={() => {
            setShowFreeAccessModal(false);
            // Refresh the auth context to get updated user data
            if (user?.uid) {
              // Force a re-render by updating local state
              setActivating(false);
            }
          }}
          refreshUser={refreshUser}
        />
      )}
    </div>
  );
};

export default BillingSubscribe; 