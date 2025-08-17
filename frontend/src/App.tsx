
import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Auth } from "./components/auth";
import AppRouter from "./components/AppRouter";
import Header from "./components/Header";
import { useAuth } from './hooks/useAuth';
import BillingSubscribe from './pages/BillingSubscribe';
import JoinInvite from './pages/JoinInvite';

// Define a proper User type
interface User {
  email: string | null;
  displayName?: string;
  uid?: string;
}

// App Shell Component for authenticated users
const AppShell: React.FC = () => {
  const { user, loading, role, proStatus } = useAuth();

  // Show loading while auth state is being determined
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If user is PRO but not active, show billing page
  if (role === 'PRO' && proStatus !== 'active') {
    return (
      <BillingSubscribe 
        onBackToDashboard={() => window.location.reload()} 
      />
    );
  }

  // Check if this is a join invite route
  const urlParams = new URLSearchParams(window.location.search);
  const inviteParam = urlParams.get('invite');
  const isJoinRoute = window.location.pathname === '/join' && inviteParam;

  if (isJoinRoute) {
    return <JoinInvite />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <Header />
      <AppRouter />
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState<'auth' | 'dashboard'>('auth');
  const [user, setUser] = useState<User | null>(null);

  const handleAuthSuccess = (userData: User) => {
    console.log('🔐 Auth Success! User data:', userData);
    console.log('🔄 Switching from', currentView, 'to dashboard');
    setUser(userData);
    setCurrentView('dashboard');
    console.log('✅ State updated, currentView should now be:', 'dashboard');
  };

  console.log('🎯 Current view:', currentView, 'User:', user);

  return (
    <AuthProvider>
      <div className="App">
        {currentView === 'auth' ? (
          <Auth onAuthSuccess={handleAuthSuccess} />
        ) : (
          <AppShell />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;
