import React, { useState } from 'react';
import { 
  validateFreeAccessCode, 
  checkCodeAttempts, 
  recordCodeAttempt, 
  activateFreeAccess,
  getFreeAccessStatus,
  deactivateFreeAccess,
  type FreeAccessStatus
} from '../config/freeAccess';

interface FreeAccessActivationProps {
  onClose: () => void;
  onActivated: () => void;
  refreshUser?: () => Promise<void>;
}

const FreeAccessActivation: React.FC<FreeAccessActivationProps> = ({ onClose, onActivated, refreshUser }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<FreeAccessStatus>(getFreeAccessStatus());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter the free access code');
      return;
    }

    // Check rate limiting
    if (!checkCodeAttempts()) {
      setError('Too many attempts. Please try again in 1 hour.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Record the attempt
      recordCodeAttempt();

      // Validate the code
      if (validateFreeAccessCode(code)) {
        // Activate free access locally
        activateFreeAccess();
        setSuccess(true);
        setCurrentStatus(getFreeAccessStatus());
        
        // Call the success callback and automatically activate PRO account securely
        setTimeout(() => {
          onActivated();
          // Use secure Cloud Function to activate PRO account
          handleAutoActivatePro();
        }, 2000);
      } else {
        setError('Invalid free access code. Please try again.');
      }
    } catch (error: unknown) {
      setError('An error occurred. Please try again.');
      console.error('Free access activation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle free access activation (without auto-activating PRO)
  const handleAutoActivatePro = async () => {
    try {
      // Get the current user from auth context
      const { getAuth } = await import('firebase/auth');
      
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // IMPORTANT: Do NOT automatically activate PRO account
        // Users must go through proper payment verification or free access validation
        // This prevents security bypass of payment requirements
        
        console.log('✅ FREE ACCESS: Free access activated, but PRO account requires proper validation');
        
        // Refresh the auth context to get updated user data
        if (refreshUser) {
          await refreshUser();
        }
        
        // Don't redirect here - let the parent component handle it
        // The onActivated callback will trigger a re-render and proper navigation
      }
    } catch (error) {
      console.error('Error handling free access activation:', error);
    }
  };

  const handleDeactivate = () => {
    deactivateFreeAccess();
    setCurrentStatus(getFreeAccessStatus());
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Free Access Activated!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You now have indefinite free access to all features.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleDeactivate}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
              >
                Deactivate Free Access
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Activate Free Access
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the free access code to activate indefinite free access mode.
          </p>
        </div>

        {currentStatus.isActive && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-300">
              ✅ Free access is currently active
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Activated: {currentStatus.activatedAt?.toLocaleDateString()}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Free Access Code
            </label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter the secret code"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'Activating...' : 'Activate Free Access'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🔒 This code provides indefinite free access to all features
          </p>
        </div>
      </div>
    </div>
  );
};

export default FreeAccessActivation; 