import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const UpgradeSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // TODO: Verify payment with Stripe and update user role
      console.log('Payment successful for session:', sessionId);
      
      // Simulate processing
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } else {
      setError('No session ID found');
      setLoading(false);
    }
  }, [sessionId]);

  const handleContinueToDashboard = () => {
    // TODO: Refresh user data to get updated role
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Upgrade</h2>
          <p className="text-gray-600">Setting up your PRO account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="text-green-500 text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to PRO!</h1>
        <p className="text-lg text-gray-600 mb-6">
          Your payment was successful and your account has been upgraded to PRO.
        </p>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What's Next?</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-sm text-gray-700">Create your team</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-sm text-gray-700">Invite staff members</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-sm text-gray-700">Build training programs</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-3">✅</span>
              <span className="text-sm text-gray-700">Start accepting payments</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleContinueToDashboard}
          className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}; 