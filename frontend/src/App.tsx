
import { AuthProvider } from './contexts/AuthContext';
import { AppShell } from './components/AppShell';
import { useAuth } from './hooks/useAuth';
import BillingSubscribe from './pages/BillingSubscribe';
import JoinInvite from './pages/JoinInvite';
import { Auth } from './components/auth';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import TeamManagement from './components/TeamManagement';
import { ROUTES } from './config/routes';

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// App Content Component that uses AuthContext
function AppContent() {
  const { user, loading, role, proStatus } = useAuth();

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check if this is a join invite route
  const urlParams = new URLSearchParams(window.location.search);
  const inviteParam = urlParams.get('invite');
  const isJoinRoute = window.location.pathname === ROUTES.JOIN_INVITE && inviteParam;

  if (isJoinRoute) {
    return <JoinInvite />;
  }

  // If user is authenticated, show app
  if (user) {
    // If user is PRO but not active, show billing page
    if (role === 'PRO' && proStatus !== 'active') {
      return <BillingSubscribe onBackToDashboard={() => window.location.reload()} />;
    }

    // Show main app
    return (
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="/app" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="/app/dashboard" element={<Dashboard />} />
          {role === 'PRO' && (
            <Route path="/app/team" element={<TeamManagement />} />
          )}
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </AppShell>
    );
  }

  // If no user, show auth
  return (
    <Routes>
      {/* Public routes - accessible to everyone */}
      <Route path={ROUTES.LANDING} element={
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white px-6">
            {/* Logo/Brand */}
            <div className="mb-8">
              <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                PRD.me
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full"></div>
            </div>
            
            {/* Mission Statement */}
            <p className="text-2xl mb-8 text-gray-200 max-w-2xl mx-auto leading-relaxed">
              Your comprehensive coaching platform for building stronger athletes, 
              stronger teams, and stronger results.
            </p>
            
            {/* CTA Buttons */}
            <div className="space-x-6 mb-12">
              <a
                href={ROUTES.AUTH}
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Get Started as PRO
              </a>
              <a
                href={ROUTES.PRICING}
                className="inline-block border-2 border-indigo-400 text-indigo-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-400 hover:text-white transition-all duration-300 transform hover:scale-105"
              >
                View Pricing
              </a>
            </div>
            
            {/* Trust Signals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-300">Built for speed and performance</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
                <p className="text-gray-300">Enterprise-grade security</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Team Focused</h3>
                <p className="text-gray-300">Built for coaches and athletes</p>
              </div>
            </div>
          </div>
        </div>
      } />
      
      <Route path={ROUTES.AUTH} element={<Auth onAuthSuccess={() => {}} />} />
      <Route path={ROUTES.REGISTER} element={<Auth onAuthSuccess={() => {}} />} />
      
      <Route path={ROUTES.BILLING_SUBSCRIBE} element={
        <Navigate to={ROUTES.AUTH} replace />
      } />
      
      <Route path={ROUTES.APP} element={
        <Navigate to={ROUTES.AUTH} replace />
      } />
      
      <Route path="*" element={<Navigate to={ROUTES.AUTH} replace />} />
    </Routes>
  );
}

export default App;
