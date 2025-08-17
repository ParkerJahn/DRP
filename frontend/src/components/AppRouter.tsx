import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Dashboard } from './Dashboard';
import TeamManagement from './TeamManagement';
import BillingSubscribe from '../pages/BillingSubscribe';
import LoadingIndicator from './LoadingIndicator';
import { Navigate } from 'react-router-dom';

type Route = 'dashboard' | 'team' | 'profile' | 'messages' | 'calendar' | 'programs' | 'payments';

interface AppRouterProps {
  currentPath?: string;
}

function AppRouter({ currentPath }: AppRouterProps) {
  const { loading, role, proStatus } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard');

  // Listen for navigation events from Header
  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      const path = event.detail.path;
      if (path) {
        // Extract route from path (e.g., '/app/team' -> 'team')
        const route = path.split('/').pop() as Route;
        if (route && ['dashboard', 'team', 'profile', 'messages', 'calendar', 'programs', 'payments'].includes(route)) {
          setCurrentRoute(route);
        }
      }
    };

    window.addEventListener('navigate', handleNavigation as EventListener);
    return () => window.removeEventListener('navigate', handleNavigation as EventListener);
  }, []);

  // Update route based on currentPath prop if provided
  useEffect(() => {
    if (currentPath) {
      const route = currentPath.split('/').pop() as Route;
      if (route && ['dashboard', 'team', 'profile', 'messages', 'calendar', 'programs', 'payments'].includes(route)) {
        setCurrentRoute(route);
      }
    }
  }, [currentPath]);

  // Function to navigate to different routes
  const navigateTo = (route: Route) => {
    setCurrentRoute(route);
    // Dispatch custom event for Header to listen to
    window.dispatchEvent(new CustomEvent('routeChange', { detail: { route } }));
  };

  // Expose navigation function globally so Header can use it
  useEffect(() => {
    (window as unknown as Record<string, unknown>).navigateTo = navigateTo;
    return () => {
      delete (window as unknown as Record<string, unknown>).navigateTo;
    };
  }, []);

  // Show loading while auth state is being determined
  if (loading) {
    return <LoadingIndicator />;
  }

  // If user is PRO but not active, redirect to billing
  if (role === 'PRO' && proStatus !== 'active') {
    return <BillingSubscribe />;
  }

  // Route guard function to check access permissions
  const canAccessRoute = (route: Route): boolean => {
    switch (route) {
      case 'dashboard':
        return true; // All authenticated users can access dashboard
      case 'team':
        return role === 'PRO'; // Only PRO can manage team
      case 'profile':
        return true; // All users can access their profile
      case 'messages':
        return role === 'PRO' || role === 'STAFF'; // PRO and Staff can create chats
      case 'calendar':
        return role === 'PRO' || role === 'STAFF'; // PRO and Staff can manage calendar
      case 'programs':
        return role === 'PRO' || role === 'STAFF'; // PRO and Staff can build programs
      case 'payments':
        return role === 'PRO' || role === 'ATHLETE'; // PRO manages payouts, Athletes pay
      default:
        return false;
    }
  };

  // If user doesn't have access to current route, redirect to dashboard
  if (!canAccessRoute(currentRoute)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Render component based on current route
  const renderComponent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'team':
        return role === 'PRO' ? <TeamManagement /> : <Navigate to="/app/dashboard" replace />;
      case 'profile':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Profile</h1>
            <p className="text-gray-600 dark:text-gray-400">Profile management coming soon...</p>
          </div>
        );
      case 'messages':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Messages</h1>
            <p className="text-gray-600 dark:text-gray-400">Team messaging system coming soon...</p>
          </div>
        );
      case 'calendar':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Calendar</h1>
            <p className="text-gray-600 dark:text-gray-400">Calendar and event management coming soon...</p>
          </div>
        );
      case 'programs':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">SWEATsheet</h1>
            <p className="text-gray-600 dark:text-gray-400">Program builder coming soon...</p>
          </div>
        );
      case 'payments':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Payments</h1>
            <p className="text-gray-600 dark:text-gray-400">Payment management coming soon...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {renderComponent()}
    </main>
  );
}

export default AppRouter; 