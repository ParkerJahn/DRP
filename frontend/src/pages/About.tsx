import React from 'react';
import { ROUTES } from '../config/routes';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900">
      {/* Navigation */}
      <nav className="px-6 py-4 flex justify-between items-start relative">
        {/* Left: DRP Workshop Text */}
        <div className="flex flex-col space-y-3">
          <div className="text-2xl font-bold text-white mt-4">DRP Workshop</div>
        </div>
        
        {/* Center: Logo + Navigation Links */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <img 
            className="w-[120px] h-[72px] transition-opacity duration-300 mb-4" 
            src="/public/darkmodelogo.png" 
            alt="DRP Workshop Logo"
          />
          <div className="animated-line"></div>
          <div className="flex gap-2 bg-neutral-800 rounded-lg">
            <a href={ROUTES.LANDING} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm">Home</a>
            <a href={ROUTES.FEATURES} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm">Features</a>
            <a href={ROUTES.PRICING} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm">Pricing</a>
            <a href={ROUTES.CONTACT} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm">Contact</a>
          </div>
        </div>
        
        {/* Right: Get Started Button */}
        <div className="flex justify-end">
          <a href={ROUTES.AUTH} className="px-4 py-2 mt-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium text-sm">Get Started</a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center text-white px-6 py-20">
        <h1 className="text-5xl font-bold mb-6">About DRP Workshop</h1>
        <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
          We're passionate about transforming how coaches, staff, and athletes work together to achieve extraordinary results.
        </p>
      </div>

      {/* Mission Section */}
      <div className="px-6 py-20 bg-black bg-opacity-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-lg text-gray-200 leading-relaxed mb-6">
                To provide coaches and athletes with the most intuitive, powerful, and reliable platform for building stronger teams and achieving peak performance.
              </p>
              <p className="text-lg text-gray-200 leading-relaxed">
                We believe that every team deserves access to professional-grade tools that simplify their workflow and amplify their results.
              </p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 bg-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-purple-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
              <p className="text-lg text-gray-200 leading-relaxed mb-6">
                DRP Workshop was born from a simple observation: coaches and athletes were spending more time managing their tools than focusing on what matters most - performance and results.
              </p>
              <p className="text-lg text-gray-200 leading-relaxed">
                We set out to create a platform that would streamline every aspect of team management, from program design to communication, allowing coaches to focus on what they do best - coaching.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="px-6 py-20 bg-black bg-opacity-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Our Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Innovation</h3>
              <p className="text-gray-300">We constantly push the boundaries of what's possible in sports technology.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Reliability</h3>
              <p className="text-gray-300">Your team's success depends on tools that work, every single time.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Community</h3>
              <p className="text-gray-300">We're building more than a platform - we're building a community of champions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Join Us?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Be part of the revolution in sports team management. Start your journey with DRP Workshop today.
          </p>
          <div className="space-x-6">
            <a
              href={ROUTES.AUTH}
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started
            </a>
            <a
              href={ROUTES.CONTACT}
              className="inline-block border-2 border-indigo-400 text-indigo-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-400 hover:text-white transition-all duration-300 transform hover:scale-105"
            >
              Contact Us
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
  );
};

export default About; 