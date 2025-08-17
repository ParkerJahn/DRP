import React from 'react';
import { useNavigate } from 'react-router-dom';

export const UpgradeCancelled: React.FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="text-yellow-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Upgrade Cancelled</h1>
        <p className="text-lg text-gray-600 mb-6">
          Your PRO upgrade was cancelled. No charges were made to your account.
        </p>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Why upgrade to PRO?</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-center">
              <span className="text-blue-500 mr-3">💪</span>
              <span className="text-sm text-gray-700">Build custom training programs</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-500 mr-3">👥</span>
              <span className="text-sm text-gray-700">Manage your team of coaches</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-500 mr-3">💰</span>
              <span className="text-sm text-gray-700">Accept payments from athletes</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-500 mr-3">📊</span>
              <span className="text-sm text-gray-700">Track performance and analytics</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleTryAgain}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}; 