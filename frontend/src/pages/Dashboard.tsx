import React from 'react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

export const Dashboard: React.FC = () => {
  const { user, role, proStatus } = useAuth();

  const getRoleSpecificContent = (role: UserRole) => {
    switch (role) {
      case 'PRO':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">PRO Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-600">Staff Members</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-green-600">Athletes</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-purple-600">Active Programs</div>
                </div>
              </div>
              {proStatus !== 'active' && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Account Activation Required
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Complete your subscription to unlock all PRO features.</p>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-yellow-600">
                          You'll be redirected to complete your subscription.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'STAFF':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Staff Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-600">Athletes Assigned</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-green-600">Active Programs</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ATHLETE':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Athlete Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-600">Current Programs</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-green-600">Upcoming Sessions</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Welcome!</h3>
            <p className="text-gray-600">Your role is being determined...</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.displayName || user?.email}!
        </p>
      </div>

      {role ? getRoleSpecificContent(role) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700">
            <div className="text-center">
              <div className="text-2xl mb-2">📝</div>
              <div className="font-medium">Create Program</div>
            </div>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700">
            <div className="text-center">
              <div className="text-2xl mb-2">📅</div>
              <div className="font-medium">Schedule Session</div>
            </div>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700">
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="font-medium">Send Message</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}; 