import React from 'react';
import { useNavigate } from 'react-router-dom';

const UpgradeCancelled: React.FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-yellow-500 text-6xl mb-4">😔</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upgrade Cancelled
        </h2>
        <p className="text-gray-600 mb-6">
          No worries! You can upgrade to PRO anytime. Your account remains unchanged and you can continue using the free features.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-yellow-900 mb-2">What you're missing:</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Team management capabilities</li>
            <li>• Advanced program builder</li>
            <li>• Payment processing</li>
            <li>• Priority support</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleTryAgain}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
          
          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeCancelled; 