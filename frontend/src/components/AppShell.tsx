import React from 'react';
import Header from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
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