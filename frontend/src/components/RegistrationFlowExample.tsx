import React, { useState } from 'react';
import MultiStepRegistration from './MultiStepRegistration';

/**
 * Example component demonstrating the two registration flows:
 * 1. Public Registration (SweatPro only)
 * 2. Invite-based Registration (maintains all role options)
 * 
 * This is for testing purposes only - remove in production
 */
const RegistrationFlowExample: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<'public' | 'invite'>('public');

  const handleAuthSuccess = (userData: { uid: string; email: string | null; displayName: string; role: string }) => {
    console.log('Registration successful:', userData);
    alert(`Registration successful! Role: ${userData.role}`);
  };

  const handleSwitchToSignIn = () => {
    console.log('Switch to sign in requested');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-900">
      {/* Flow Selection (for testing only) */}
      <div className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Registration Flow Testing
          </h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedFlow('public')}
              className={`px-4 py-2 rounded-md font-medium ${
                selectedFlow === 'public'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300'
              }`}
            >
              Public Registration (SweatPro Only)
            </button>
            <button
              onClick={() => setSelectedFlow('invite')}
              className={`px-4 py-2 rounded-md font-medium ${
                selectedFlow === 'invite'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300'
              }`}
            >
              Invite-based Registration (All Roles)
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Current Flow:</strong> {selectedFlow === 'public' ? 'Public Registration' : 'Invite-based Registration'}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              {selectedFlow === 'public' 
                ? 'Only PRO role is available. Role selection is hidden.' 
                : 'All roles (PRO, ATHLETE, STAFF) are available. Role selection is visible.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Registration Component */}
      <MultiStepRegistration
        onRegistrationComplete={handleAuthSuccess}
        onSwitchToSignIn={handleSwitchToSignIn}
        isInviteBasedRegistration={selectedFlow === 'invite'}
      />
    </div>
  );
};

export default RegistrationFlowExample; 