import React, { useState } from 'react';
import { ROUTES } from '../config/routes';
import darkLogo from '/darkmodelogo.png';
import SEO from '../components/SEO';

const Pricing: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState(1);
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "DRP Workshop",
    "description": "Comprehensive coaching platform for athletes and coaches",
    "url": "https://drpworkshop.com/pricing",
    "offers": [
      {
        "@type": "Offer",
        "name": "Free Trial",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Perfect for trying out DRP Workshop"
      },
      {
        "@type": "Offer",
        "name": "PRO Plan",
        "price": "29",
        "priceCurrency": "USD",
        "description": "Full access to all features"
      }
    ]
  };

  return (
    <>
      <SEO
        title="Pricing - DRP Workshop"
        description="Simple, transparent pricing for DRP Workshop. Choose the plan that's right for your team. Start free and upgrade when you're ready."
        keywords="DRP Workshop pricing, coaching platform cost, team management software pricing, workout program software pricing, athlete coaching platform pricing"
        url="/pricing"
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
            <a href={ROUTES.FEATURES} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Features</a>
            <a href={ROUTES.CONTACT} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Contact</a>
          </div>
        </div>
        
        {/* Right: Get Started Button */}
        <div className="flex justify-center sm:justify-end w-full sm:w-auto">
          <a href={ROUTES.GET_STARTED} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium text-sm w-full sm:w-auto text-center">Get Started</a>
        </div>
      </nav>

      {/* Mobile-Optimized Hero Section */}
      <div className="text-center text-white px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">Simple, Transparent Pricing</h1>
        <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed px-4">
          Choose the plan that's right for your team. Start free and upgrade when you're ready.
        </p>
      </div>

      {/* Mobile-Optimized Pricing Plans Accordion */}
      <div className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Navigation Buttons */}
            <button 
              onClick={() => setCurrentPlan((prev) => (prev === 0 ? 3 : prev - 1))}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button 
              onClick={() => setCurrentPlan((prev) => (prev === 3 ? 0 : prev + 1))}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Plan Display */}
            <div className="relative overflow-hidden px-20">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(calc(-${currentPlan * 100}%))` }}
              >
                {/* Free Trial Plan */}
                <div className="w-full flex-shrink-0 flex justify-center">
                  <div className={`bg-black bg-opacity-20 p-6 rounded-lg border text-center mx-2 transition-all duration-500 max-w-sm ${
                    currentPlan === 0 
                      ? 'border-indigo-400 opacity-100 scale-100 z-10' 
                      : 'border-gray-700 opacity-60 scale-90'
                  }`}>
                    <h3 className="text-xl font-bold text-white mb-4">Free Trial</h3>
                    <div className="text-3xl font-bold text-white mb-4">
                      $0<span className="text-lg text-gray-300">/month</span>
                    </div>
                    <p className="text-gray-300 mb-6 text-sm">Perfect for trying out DRP Workshop</p>
                    
                    <ul className="text-left space-y-2 mb-6 text-sm">
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                        Up to 5 team members
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                        Basic SWEATsheet programs
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                        Team communication
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></span>
                        Basic calendar features
                      </li>
                    </ul>
                    
                    <a
                      href={ROUTES.AUTH}
                      className="w-full inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-300 text-sm"
                    >
                      Start Free Trial
                    </a>
                  </div>
                </div>

                {/* PRO Plan */}
                <div className="w-full flex-shrink-0 flex justify-center">
                  <div className={`bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-lg border-2 text-center mx-2 relative transition-all duration-500 max-w-sm ${
                    currentPlan === 1 
                      ? 'border-indigo-400 opacity-100 scale-100 z-10' 
                      : 'border-indigo-400 opacity-60 scale-90'
                  }`}>
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-indigo-400 text-white px-3 py-1 rounded-full text-xs font-semibold">Most Popular</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">PRO Plan</h3>
                    <div className="text-3xl font-bold text-white mb-4">
                      $29<span className="text-lg text-indigo-200">/month</span>
                    </div>
                    <p className="text-indigo-200 mb-6 text-sm">Everything you need for a professional team</p>
                    
                    <ul className="text-left space-y-2 mb-6 text-sm">
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Unlimited team members
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Advanced SWEATsheet programs
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Team management tools
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Advanced analytics & reporting
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Payment processing
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Priority support
                      </li>
                    </ul>
                    
                    <a
                      href={ROUTES.AUTH}
                      className="w-full inline-block bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 text-sm"
                    >
                      Get Started
                    </a>
                  </div>
                </div>

                {/* Enterprise Plan */}
                <div className="w-full flex-shrink-0 flex justify-center">
                  <div className={`bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-lg border-2 text-center mx-2 transition-all duration-500 max-w-sm ${
                    currentPlan === 2 
                      ? 'border-purple-400 opacity-100 scale-100 z-10' 
                      : 'border-purple-400 opacity-60 scale-90'
                  }`}>
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-400 text-white px-3 py-1 rounded-full text-xs font-semibold">Enterprise</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Enterprise Plan</h3>
                    <div className="text-3xl font-bold text-white mb-4">
                      $99<span className="text-lg text-purple-200">/month</span>
                    </div>
                    <p className="text-purple-200 mb-6 text-sm">For large organizations and franchises</p>
                    
                    <ul className="text-left space-y-2 mb-6 text-sm">
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Everything in PRO
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Multi-location support
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Advanced integrations
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Custom branding
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        Dedicated account manager
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                        SLA guarantees
                      </li>
                    </ul>
                    
                    <a
                      href={ROUTES.CONTACT}
                      className="w-full inline-block bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 text-sm"
                    >
                      Contact Sales
                    </a>
                  </div>
                </div>

                {/* Custom Plan */}
                <div className="w-full flex-shrink-0 flex justify-center">
                  <div className={`bg-gradient-to-br from-gray-700 to-gray-800 p-6 rounded-lg border-2 text-center mx-2 transition-all duration-500 max-w-sm ${
                    currentPlan === 3 
                      ? 'border-gray-400 opacity-100 scale-100 z-10' 
                      : 'border-gray-500 opacity-60 scale-90'
                  }`}>
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Custom</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">Custom Solution</h3>
                    <div className="text-3xl font-bold text-white mb-4">
                      Custom<span className="text-lg text-gray-300">/month</span>
                    </div>
                    <p className="text-gray-300 mb-6 text-sm">Tailored solutions for unique needs</p>
                    
                    <ul className="text-left space-y-2 mb-6 text-sm">
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        Custom feature development
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        White-label solutions
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        API access
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        Custom integrations
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        On-premise deployment
                      </li>
                      <li className="flex items-center text-white">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        24/7 dedicated support
                      </li>
                    </ul>
                    
                    <a
                      href={ROUTES.CONTACT}
                      className="w-full inline-block bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-300 text-sm"
                    >
                      Get Quote
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Indicators */}
            <div className="flex justify-center mt-8 space-x-2">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPlan(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentPlan === index 
                      ? 'bg-indigo-500 scale-125' 
                      : 'bg-gray-400 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="px-6 py-20 bg-black bg-opacity-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Feature Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-white font-semibold py-4 pr-8">Feature</th>
                  <th className="text-white font-semibold py-4 px-8 text-center">Free Trial</th>
                  <th className="text-white font-semibold py-4 px-8 text-center">PRO Plan</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800">
                  <td className="py-4 pr-8">Team Members</td>
                  <td className="px-8 text-center">Up to 5</td>
                  <td className="px-8 text-center">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 pr-8">SWEATsheet Programs</td>
                  <td className="px-8 text-center">Basic</td>
                  <td className="px-8 text-center">Advanced</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 pr-8">Analytics & Reports</td>
                  <td className="px-8 text-center">Basic</td>
                  <td className="px-8 text-center">Advanced</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 pr-8">Payment Processing</td>
                  <td className="px-8 text-center">❌</td>
                  <td className="px-8 text-center">✅</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 pr-8">Priority Support</td>
                  <td className="px-8 text-center">❌</td>
                  <td className="px-8 text-center">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Frequently Asked Questions</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Can I cancel my subscription anytime?</h3>
              <p className="text-gray-300">Yes, you can cancel your PRO subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Is there a setup fee?</h3>
              <p className="text-gray-300">No, there are no setup fees. You only pay the monthly subscription fee.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Do you offer team discounts?</h3>
              <p className="text-gray-300">Yes, we offer volume discounts for teams with 20+ members. Contact us for custom pricing.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">What payment methods do you accept?</h3>
              <p className="text-gray-300">We accept all major credit cards, PayPal, and bank transfers for annual plans.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-20 bg-black bg-opacity-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Join thousands of coaches who are already using DRP Workshop to build stronger, more successful teams.
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
              Contact Sales
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

export default Pricing; 