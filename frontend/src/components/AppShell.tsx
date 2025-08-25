import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import { usePasswordSecurity } from '../hooks/usePasswordSecurity';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { needsPasswordChange, isChecking, redirectToPasswordChange } = usePasswordSecurity();

  // Check if user needs password change and redirect if necessary
  useEffect(() => {
    if (!isChecking && needsPasswordChange && location.pathname !== '/app/password-change-required') {
      console.log('🔒 Redirecting user to mandatory password change');
      redirectToPasswordChange();
    }
  }, [needsPasswordChange, isChecking, location.pathname, redirectToPasswordChange]);

  // Show loading while checking password security
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Checking security requirements...</p>
        </div>
      </div>
    );
  }

  // If user needs password change, show loading (they'll be redirected)
  if (needsPasswordChange && location.pathname !== '/app/password-change-required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-600 dark:text-amber-400">Redirecting to security update...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      {/* Header Component */}
      <Header />
      
      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}; 