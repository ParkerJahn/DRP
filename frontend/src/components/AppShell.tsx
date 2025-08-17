import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getMenuItems = (role: UserRole) => {
    const baseItems = [
      { label: 'Profile', to: '/app/profile', icon: '👤' },
      { label: 'Dashboard', to: '/app/dashboard', icon: '📊' },
      { label: 'Messages', to: '/app/messages', icon: '💬' },
      { label: 'Calendar', to: '/app/calendar', icon: '📅' },
      { label: 'SWEATsheet', to: '/app/programs', icon: '💪' },
      { label: 'Logout', action: signOut, icon: '🚪' },
    ];

    if (role === 'PRO') {
      baseItems.splice(2, 0, 
        { label: 'Your Team', to: '/app/team', icon: '👥' },
        { label: 'Payments', to: '/app/payments', icon: '💰' }
      );
    }

    if (role === 'ATHLETE') {
      baseItems.splice(3, 0, { label: 'Payments', to: '/app/payments', icon: '💰' });
    }

    return baseItems;
  };

  const menuItems = role ? getMenuItems(role) : [];

  const handleMenuClick = (item: { action?: () => void }) => {
    if (item.action) {
      item.action();
    }
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top App Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-indigo-600">DRP Workshop</h1>
            </div>

            {/* User Menu Button */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.displayName || user?.email}
              </span>
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Side Drawer */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex flex-col h-full">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {menuItems.map((item, index) => (
                <div key={index}>
                  {item.to ? (
                    <button
                      onClick={() => {
                        navigate(item.to);
                        setIsDrawerOpen(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 text-left"
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMenuClick(item)}
                      className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 text-left"
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <div>Role: {role}</div>
                {role === 'PRO' && (
                  <div>Status: {user?.proStatus || 'Unknown'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overlay */}
        {isDrawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}

        {/* Page Content */}
        <div className="flex-1 ml-0 lg:ml-64 transition-margin duration-300 ease-in-out">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}; 