import React from 'react';
import { ROUTES } from '../config/routes';
import darkLogo from '/darkmodelogo.png';
import SEO from '../components/SEO';

const About: React.FC = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About DRP Workshop",
    "description": "Learn about DRP Workshop's mission to transform how coaches, staff, and athletes work together to achieve extraordinary results.",
    "url": "https://drpworkshop.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "DRP Workshop",
      "description": "Comprehensive coaching platform for athletes and coaches",
      "foundingDate": "2024",
      "mission": "To provide coaches and athletes with the most intuitive, powerful, and reliable platform for building stronger teams and achieving peak performance"
    }
  };

  return (
    <>
      <SEO
        title="About DRP Workshop"
        description="Learn about DRP Workshop's mission to transform how coaches, staff, and athletes work together to achieve extraordinary results. Discover our story, values, and commitment to coaching excellence."
        keywords="about DRP Workshop, coaching platform mission, team management software, athlete coaching tools, coaching excellence, sports technology"
        url="/about"
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
            <a href={ROUTES.FEATURES} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Features</a>
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
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">About DRP Workshop</h1>
        <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed px-4">
          We're passionate about transforming how coaches, staff, and athletes work together to achieve extraordinary results.
        </p>
      </div>

      {/* Mobile-Optimized Mission Section */}
      <div className="px-4 sm:px-6 py-12 sm:py-20 bg-black bg-opacity-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 px-2">Our Mission</h2>
              <p className="text-base sm:text-lg text-gray-200 leading-relaxed mb-4 sm:mb-6 px-2">
                To provide coaches and athletes with the most intuitive, powerful, and reliable platform for building stronger teams and achieving peak performance.
              </p>
              <p className="text-base sm:text-lg text-gray-200 leading-relaxed px-2">
                We believe that every team deserves access to professional-grade tools that simplify their workflow and amplify their results.
              </p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Story Section */}
      <div className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="text-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-purple-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 px-2">Our Story</h2>
              <p className="text-base sm:text-lg text-gray-200 leading-relaxed mb-4 sm:mb-6 px-2">
                Founded by coaches who experienced firsthand the challenges of managing teams with outdated tools and fragmented systems.
              </p>
              <p className="text-base sm:text-lg text-gray-200 leading-relaxed px-2">
                We built DRP Workshop to solve these problems, creating a unified platform that empowers coaches to focus on what matters most: building stronger athletes and teams.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Values Section */}
      <div className="px-4 sm:px-6 py-12 sm:py-20 bg-black bg-opacity-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12 sm:mb-16 px-2">Our Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Excellence</h3>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed px-2">We strive for excellence in everything we do, from our platform design to our customer support.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Teamwork</h3>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed px-2">We believe in the power of teamwork and collaboration, both within our company and with our customers.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Innovation</h3>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed px-2">We continuously innovate and improve our platform to meet the evolving needs of coaches and athletes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized CTA Section */}
      <div className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 px-2">Ready to Join Us?</h2>
          <p className="text-lg sm:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Start your journey with DRP Workshop and discover how our platform can transform your coaching experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <a
              href={ROUTES.GET_STARTED}
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl w-full sm:w-auto max-w-xs mx-auto text-center"
            >
              Get Started Today
            </a>
            <a
              href={ROUTES.FEATURES}
              className="inline-block border-2 border-indigo-400 text-indigo-300 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-indigo-400 hover:text-white transition-all duration-300 transform hover:scale-105 w-full sm:w-auto max-w-xs mx-auto text-center"
            >
              Explore Features
            </a>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Footer */}
      <footer className="px-4 sm:px-6 py-6 sm:py-8 border-t border-gray-700">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p className="text-sm sm:text-base">&copy; 2024 DRP Workshop. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  );
};

export default About; 