import React from 'react';
import { ROUTES } from '../config/routes';
import darkLogo from '/darkmodelogo.png';
import SEO from '../components/SEO';

const Features: React.FC = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "DRP Workshop Features",
    "description": "Discover the powerful tools that make DRP Workshop the ultimate platform for coaches, staff, and athletes.",
    "url": "https://drpworkshop.com/features",
    "applicationCategory": "SportsApplication",
    "operatingSystem": "Web Browser",
    "featureList": [
      "Team Management",
      "SWEATsheet Programs",
      "Team Communication",
      "Calendar & Events",
      "Payment Processing",
      "Athlete Tracking",
      "Program Design",
      "Performance Analytics"
    ]
  };

  return (
    <>
      <SEO
        title="Features - DRP Workshop"
        description="Discover the powerful tools that make DRP Workshop the ultimate platform for coaches, staff, and athletes. Features include team management, SWEATsheet programs, communication tools, and more."
        keywords="coaching platform features, team management software, workout program builder, athlete tracking, coach communication tools, sports training software, fitness coaching platform"
        url="/features"
        structuredData={structuredData}
      />
      
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
            <a href={ROUTES.LANDING} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Home</a>
            <a href={ROUTES.ABOUT} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">About</a>
            <a href={ROUTES.PRICING} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Pricing</a>
            <a href={ROUTES.CONTACT} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Contact</a>
          </div>
        </div>
        
        {/* Right: Get Started Button */}
        <div className="flex justify-center sm:justify-end w-full sm:w-auto space-x-3">
          <a href={ROUTES.AUTH} className="px-6 py-3 border border-indigo-400 text-indigo-300 rounded-lg hover:bg-indigo-400 hover:text-white transition-all duration-200 font-medium text-sm w-full sm:w-auto text-center">Sign In</a>
          <a href={ROUTES.GET_STARTED} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium text-sm w-full sm:w-auto text-center">Get Started</a>
        </div>
      </nav>

      {/* Mobile-Optimized Hero Section */}
      <div className="text-center text-white px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">Features</h1>
        <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed px-4">
          Discover the powerful tools that make DRP Workshop the ultimate platform for coaches, staff, and athletes.
        </p>
      </div>

      {/* Mobile-Optimized Core Features Grid */}
      <div className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12 sm:mb-16 px-2">Core Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Team Management */}
            <div className="bg-black bg-opacity-20 p-4 sm:p-6 rounded-lg border border-gray-700">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-white text-center">Team Management</h3>
              <p className="text-sm sm:text-base text-gray-300 text-center px-2">Easily manage your team members, assign roles, and track performance all in one place.</p>
            </div>

            {/* Program Design */}
            <div className="bg-black bg-opacity-20 p-4 sm:p-6 rounded-lg border border-gray-700">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-white text-center">SWEATsheet Programs</h3>
              <p className="text-sm sm:text-base text-gray-300 text-center px-2">Create custom training programs with our intuitive SWEATsheet builder.</p>
            </div>

            {/* Communication */}
            <div className="bg-black bg-opacity-20 p-6 rounded-lg border border-gray-700">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white text-center">Team Communication</h3>
              <p className="text-gray-300 text-center">Built-in messaging and chat system for seamless team communication.</p>
            </div>

            {/* Calendar & Scheduling */}
            <div className="bg-black bg-opacity-20 p-6 rounded-lg border border-gray-700">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white text-center">Calendar & Events</h3>
              <p className="text-gray-300 text-center">Schedule training sessions, events, and track team availability.</p>
            </div>

            {/* Payment Processing */}
            <div className="bg-black bg-opacity-20 p-6 rounded-lg border border-gray-700">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white text-center">Payment Processing</h3>
              <p className="text-gray-300 text-center">Secure payment processing for subscriptions and team fees.</p>
            </div>

            {/* Analytics & Reporting */}
            <div className="bg-black bg-opacity-20 p-6 rounded-lg border border-gray-700">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white text-center">Analytics & Reports</h3>
              <p className="text-gray-300 text-center">Track progress, generate reports, and analyze team performance.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Features */}
      <div className="px-6 py-20 bg-black bg-opacity-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Advanced Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Role-Based Access Control</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                  PRO users manage the entire team
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                  Staff members assist with programs
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                  Athletes access their training plans
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                  Secure permissions for data access
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Real-Time Collaboration</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  Live updates across all devices
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  Instant notifications
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  Team chat and messaging
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  File sharing and collaboration
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Experience These Features?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Start your free trial and discover how DRP Workshop can transform your team's performance.
          </p>
          <div className="space-x-6">
            <a
              href={ROUTES.AUTH}
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </a>
            <a
              href={ROUTES.CONTACT}
              className="inline-block border-2 border-indigo-400 text-indigo-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-400 hover:text-white transition-all duration-300 transform hover:scale-105"
            >
              Schedule Demo
            </a>
          </div>
        </div>
      </div>

            {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-700">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p>&copy; 2024 DRP Workshop. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Features; 