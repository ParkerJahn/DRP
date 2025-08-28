import React from 'react';
import { ROUTES } from '../config/routes';
import darkLogo from '/darkmodelogo.png';
import SEO from '../components/SEO';

const GetStarted: React.FC = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Get Started - DRP Workshop",
    "description": "Choose your path to get started with DRP Workshop. Sign in to your existing account or create a new one to begin your coaching journey.",
    "url": "https://drpworkshop.com/get-started",
    "mainEntity": {
      "@type": "Organization",
      "name": "DRP Workshop",
      "description": "Comprehensive coaching platform for athletes and coaches"
    }
  };

  return (
    <>
      <SEO
        title="Get Started - DRP Workshop"
        description="Choose your path to get started with DRP Workshop. Sign in to your existing account or create a new one to begin your coaching journey."
        keywords="get started DRP Workshop, sign in, register, create account, coaching platform access"
        url="/get-started"
        structuredData={structuredData}
      />
      
      <div className="min-h-screen bg-neutral-800 flex flex-col">
        {/* Simple Header */}
        <div className="flex justify-center pt-8 pb-4">
          <a href={ROUTES.LANDING} className="text-gray-300 hover:text-white transition-colors duration-200">
            ← Back to Home
          </a>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8">
              <img 
                src={darkLogo} 
                alt="DRP Workshop Logo" 
                className="w-24 h-16 mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-white">Get Started</h1>
              <p className="text-gray-300 mt-2">Choose your path to begin</p>
            </div>

            {/* Choice Buttons */}
            <div className="space-y-4">
              {/* Sign In Option */}
              <a
                href={ROUTES.AUTH}
                className="block w-full bg-white text-neutral-800 py-4 px-6 rounded-lg font-semibold text-center hover:bg-gray-100 transition-colors duration-200 shadow-lg"
              >
                I Already Have an Account
                <div className="text-sm text-gray-600 mt-1">Sign In</div>
              </a>

              {/* Register Option */}
              <a
                href={ROUTES.REGISTER}
                className="block w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-semibold text-center hover:bg-indigo-700 transition-colors duration-200 shadow-lg"
              >
                I Don't Have an Account
                <div className="text-sm text-indigo-200 mt-1">Create New Account</div>
              </a>
            </div>

            {/* Simple Footer */}
            <div className="text-center mt-8">
              <p className="text-gray-400 text-sm">
                Need help? <a href={ROUTES.CONTACT} className="text-indigo-300 hover:text-white">Contact us</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GetStarted; 