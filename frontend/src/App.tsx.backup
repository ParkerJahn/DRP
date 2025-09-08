
import { AuthProvider } from './contexts/AuthContext';
import { AppShell } from './components/AppShell';
import { useAuth } from './hooks/useAuth';
import BillingSubscribe from './pages/BillingSubscribe';
import JoinInvite from './pages/JoinInvite';
import { Auth } from './components/auth';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import GetStarted from './pages/GetStarted';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import TeamManagement from './components/TeamManagement';
import Profile from './pages/Profile';
import MandatoryPasswordChange from './components/MandatoryPasswordChange';
import AthleteTeam from './pages/AthleteTeam';
import { lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
const Messages = lazy(() => import('./pages/Messages'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Programs = lazy(() => import('./pages/Programs'));
const Payments = lazy(() => import('./pages/Payments'));
const Packages = lazy(() => import('./pages/Packages'));
import { ROUTES } from './config/routes';
import darkLogo from '/darkmodelogo.png';

// Main App Component
function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Suspense fallback={<div className="p-6 text-gray-600 dark:text-gray-300">Loading…</div>}>
          <AppContent />
        </Suspense>
      </AuthProvider>
    </HelmetProvider>
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

  // Check if this is a join invite route - prioritize this even when user is authenticated
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token');
  const isJoinRoute = window.location.pathname === ROUTES.JOIN_INVITE && tokenParam;
  
  // Also check if user should be on invite page (has no team but has token)
  const shouldShowInvite = tokenParam && user && !user.proId;
  
  console.log('🔍 App routing debug:', {
    pathname: window.location.pathname,
    JOIN_INVITE: ROUTES.JOIN_INVITE,
    tokenParam: !!tokenParam,
    actualToken: tokenParam ? tokenParam.substring(0, 20) + '...' : 'none',
    isJoinRoute,
    shouldShowInvite,
    user: !!user,
    userRole: role,
    userProId: user?.proId,
    fullUrl: window.location.href
  });

  if (isJoinRoute || shouldShowInvite) {
    console.log('✅ Showing JoinInvite component');
    return <JoinInvite />;
  }

  // If user is authenticated, show app
  if (user) {
    // If user is PRO but not active, show billing page
    if (role === 'PRO' && proStatus !== 'active') {
      return <BillingSubscribe />;
    }

    // Show main app
    return (
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="/app" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/profile" element={<Profile />} />
          <Route path="/app/password-change-required" element={<MandatoryPasswordChange />} />
          <Route path="/app/messages" element={<Messages />} />
          <Route path="/app/calendar" element={<Calendar />} />
          {(role === 'PRO' || role === 'STAFF' || role === 'ATHLETE') && (
            <Route path="/app/programs" element={<Programs />} />
          )}
          <Route path="/app/team" element={
            role === 'PRO' ? <TeamManagement /> : <AthleteTeam />
          } />
          {(role === 'PRO' || role === 'ATHLETE' || role === 'STAFF') && (
            <>
              <Route path="/app/payments" element={<Payments />} />
              <Route path="/app/packages" element={<Packages />} />
            </>
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900">
          {/* Mobile-Optimized Navigation */}
          <nav className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center relative">
            {/* Mobile: Stacked layout, Desktop: Side by side */}
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6 mb-4 sm:mb-0">
              <div className="text-xl sm:text-2xl font-bold text-white">DRP Workshop</div>
            </div>
            
            {/* Center: Logo + Navigation Links - Mobile optimized */}
            <div className="flex flex-col items-center mb-4 sm:mb-0">
              <img 
                className="w-20 h-12 sm:w-[120px] sm:h-[72px] transition-opacity duration-300 mb-4" 
                src={darkLogo} 
                alt="DRP Workshop Logo"
              />
              <div className="animated-line"></div>
              {/* Mobile: Stacked navigation, Desktop: Horizontal */}
              <div className="flex flex-col sm:flex-row gap-2 bg-neutral-800 rounded-lg p-2">
                <a href={ROUTES.ABOUT} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">About</a>
                <a href={ROUTES.FEATURES} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Features</a>
                <a href={ROUTES.PRICING} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Pricing</a>
                <a href={ROUTES.CONTACT} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Contact</a>
              </div>
            </div>
            
            {/* Right: Get Started Button */}
            <div className="flex justify-center sm:justify-end w-full sm:w-auto space-x-3">
              <a 
                href={ROUTES.AUTH}
                className="px-6 py-3 border border-indigo-400 text-indigo-300 rounded-lg hover:bg-indigo-400 hover:text-white transition-all duration-200 font-medium text-sm w-full sm:w-auto text-center"
              >
                Sign In
              </a>
              <a 
                href={ROUTES.GET_STARTED} 
                onClick={() => console.log('Get Started button clicked!')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium text-sm w-full sm:w-auto text-center"
              >
                Get Started
              </a>
            </div>
          </nav>

          {/* Mobile-Optimized Hero Section */}
          <div className="text-center text-white px-4 sm:px-6 py-12 sm:py-20">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl pt-8 sm:pt-12 font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                DRP Workshop
              </h1>
              <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto rounded-full mb-4 sm:mb-6"></div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 px-2">
              Your Comprehensive Coaching Platform
            </h2>
            
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-200 max-w-3xl mx-auto leading-relaxed px-4">
              Build stronger athletes, stronger teams, and stronger results with our all-in-one platform designed for coaches, staff, and athletes.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-12 sm:mb-16 px-4">
              <a
                href={ROUTES.GET_STARTED}
                onClick={() => console.log('Hero Get Started button clicked!')}
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer w-full sm:w-auto text-center"
              >
                Start Free Trial
              </a>
              <a
                href={ROUTES.FEATURES}
                className="inline-block border-2 border-indigo-400 text-indigo-300 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-indigo-400 hover:text-white transition-all duration-300 transform hover:scale-105 w-full sm:w-auto text-center"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Mobile-Optimized Features Section */}
          <div id="features" className="px-4 sm:px-6 py-12 sm:py-20 bg-black bg-opacity-20">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12 sm:mb-16 px-2">Why Choose DRP Workshop?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-white">Lightning Fast</h4>
                  <p className="text-gray-300 leading-relaxed text-sm sm:text-base px-2">Built for speed and performance. Your team will love how quickly they can access programs, schedules, and updates.</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-white">Secure & Reliable</h4>
                  <p className="text-gray-300 leading-relaxed text-sm sm:text-base px-2">Enterprise-grade security ensures your team's data is always protected. Built on Firebase for maximum reliability.</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-white">Team Focused</h4>
                  <p className="text-gray-300 leading-relaxed text-sm sm:text-base px-2">Designed specifically for coaches, staff, and athletes. Every feature is built with your team's success in mind.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-Optimized How It Works Section */}
          <div className="px-4 sm:px-6 py-12 sm:py-20">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12 sm:mb-16 px-2">How It Works</h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-2xl font-bold text-white">1</div>
                  <h4 className="text-lg sm:text-xl font-semibold mb-2 text-white">Sign Up</h4>
                  <p className="text-gray-300 text-sm sm:text-base">Create your PRO account in minutes</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-2xl font-bold text-white">2</div>
                  <h4 className="text-lg sm:text-xl font-semibold mb-2 text-white">Invite Team</h4>
                  <p className="text-gray-300 text-sm sm:text-base">Send invites to staff and athletes</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-2xl font-bold text-white">3</div>
                  <h4 className="text-lg sm:text-xl font-semibold mb-2 text-white">Build Programs</h4>
                  <p className="text-gray-300 text-sm sm:text-base">Create custom training programs</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-2xl font-bold text-white">4</div>
                  <h4 className="text-lg sm:text-xl font-semibold mb-2 text-white">Track Progress</h4>
                  <p className="text-gray-300 text-sm sm:text-base">Monitor team performance and results</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-Optimized Final CTA Section */}
          <div className="px-4 sm:px-6 py-12 sm:py-20 bg-black bg-opacity-20">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 px-2">Ready to Transform Your Team?</h3>
              <p className="text-lg sm:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                                 Join thousands of coaches who are already using DRP Workshop to build stronger, more successful teams.
              </p>
              <a
                href={ROUTES.GET_STARTED}
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 sm:px-10 py-3 sm:py-4 rounded-lg font-semibold text-lg sm:text-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto max-w-xs mx-auto"
              >
                Get Started Today
              </a>
            </div>
          </div>

          {/* Mobile-Optimized Footer */}
          <footer className="px-4 sm:px-6 py-6 sm:py-8 border-t border-gray-700">
            <div className="max-w-6xl mx-auto text-center text-gray-400">
              <p className="text-sm sm:text-base">&copy; 2024 DRP Workshop. All rights reserved.</p>
            </div>
          </footer>
        </div>
      } />
      
      <Route path={ROUTES.ABOUT} element={<About />} />
      <Route path={ROUTES.FEATURES} element={<Features />} />
      <Route path={ROUTES.PRICING} element={<Pricing />} />
      <Route path={ROUTES.CONTACT} element={<Contact />} />
      <Route path={ROUTES.GET_STARTED} element={<GetStarted />} />
      <Route path={ROUTES.AUTH} element={
        <Auth onAuthSuccess={() => {
          // After successful auth, redirect to dashboard
          // The AuthContext will handle the user state update
          window.location.href = ROUTES.DASHBOARD;
        }} />
      } />
      <Route path={ROUTES.REGISTER} element={
        <Auth onAuthSuccess={() => {
          // After successful registration, redirect to dashboard
          // The AuthContext will handle the user state update
          window.location.href = ROUTES.DASHBOARD;
        }} />
      } />
      
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
