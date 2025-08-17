import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';

interface ProUpgradeProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ProUpgrade: React.FC<ProUpgradeProps> = ({ onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();

  const handleUpgrade = async () => {
    if (!auth.currentUser) {
      setError('You must be signed in to upgrade to PRO');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the current user's ID token
      const token = await auth.currentUser.getIdToken();
      
      // Call your Firebase function to create checkout session
      const response = await fetch('/createProUpgradeCheckout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { checkoutSession } = await response.json();
      
      // Redirect to Stripe Checkout
      if (checkoutSession.url) {
        window.location.href = checkoutSession.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upgrade to PRO
        </h2>
        <p className="text-gray-600">
          Unlock all features and manage your fitness team
        </p>
      </div>

      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">PRO Plan Features:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Team management (Staff & Athletes)</li>
            <li>• Program builder (SWEATsheet)</li>
            <li>• Team messaging system</li>
            <li>• Calendar & scheduling</li>
            <li>• Payment processing</li>
            <li>• Unlimited programs</li>
          </ul>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">$29</div>
          <div className="text-gray-600">per month</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          {isLoading ? 'Processing...' : 'Upgrade Now'}
        </button>
        
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Secure payment powered by Stripe
      </div>
    </div>
  );
};

export default ProUpgrade; 