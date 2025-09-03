import React from 'react';
import { useNavigate } from 'react-router-dom';

const GetStarted: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-6">🚀</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to DRP Workshop
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Join a team to get started with DRP Workshop. You'll need an invite from a PRO user to create your account.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            I Have an Invite Link
          </button>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">Don't have an invite yet?</p>
            <p>Ask a PRO user to send you an invite link to join their team.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
