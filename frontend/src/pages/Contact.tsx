import React, { useState } from 'react';
import { validateName, validateEmail, validateTextContent, sanitizeText } from '../utils/validation';
import { ROUTES } from '../config/routes';
import darkLogo from '/darkmodelogo.png';
import SEO from '../components/SEO';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact DRP Workshop",
    "description": "Get in touch with DRP Workshop for support, questions, or to schedule a demo of our coaching platform.",
    "url": "https://drpworkshop.com/contact",
    "mainEntity": {
      "@type": "Organization",
      "name": "DRP Workshop",
      "contactType": "customer service",
      "url": "https://drpworkshop.com"
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    
    // Apply appropriate sanitization based on field type
    switch (name) {
      case 'firstName':
      case 'lastName':
        sanitizedValue = sanitizeText(value);
        break;
      case 'email':
        sanitizedValue = sanitizeText(value);
        break;
      case 'message':
        sanitizedValue = sanitizeText(value);
        break;
      case 'subject':
        // Don't sanitize select values
        sanitizedValue = value;
        break;
      default:
        sanitizedValue = sanitizeText(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let validation;
    
    // Apply validation on blur
    switch (name) {
      case 'firstName':
        validation = validateName(value, 'First Name');
        break;
      case 'lastName':
        validation = validateName(value, 'Last Name');
        break;
      case 'email':
        validation = validateEmail(value);
        break;
      case 'message':
        validation = validateTextContent(value, 2000);
        break;
      default:
        return;
    }
    
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, [name]: validation.error || '' }));
      setFormData(prev => ({ ...prev, [name]: validation.sanitized }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    
    const firstNameValidation = validateName(formData.firstName, 'First Name');
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error || '';
    }
    
    const lastNameValidation = validateName(formData.lastName, 'Last Name');
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error || '';
    }
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || '';
    }
    
    if (!formData.subject) {
      newErrors.subject = 'Please select a subject';
    }
    
    const messageValidation = validateTextContent(formData.message, 2000);
    if (!messageValidation.isValid) {
      newErrors.message = messageValidation.error || '';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Here you would typically send the form data to your backend
      // For now, we'll just simulate a submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form on success
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: ''
      });
      setErrors({});
      
      // Show success message (you could add a toast notification here)
      alert('Thank you for your message! We\'ll get back to you soon.');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Contact - DRP Workshop"
        description="Get in touch with DRP Workshop for support, questions, or to schedule a demo of our coaching platform. We're here to help you get started."
        keywords="contact DRP Workshop, coaching platform support, team management help, workout software demo, athlete coaching support, DRP Workshop contact"
        url="/contact"
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
            <a href={ROUTES.PRICING} className="px-3 py-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-all duration-200 text-sm text-center">Pricing</a>
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
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">Contact Us</h1>
        <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed px-4">
          Have questions? Need support? Want to schedule a demo? We're here to help you succeed.
        </p>
      </div>

      {/* Mobile-Optimized Contact Form Section */}
      <div className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {/* Contact Information */}
            <div className="space-y-6 sm:space-y-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Get in Touch</h2>
              
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Email</h3>
                    <p className="text-gray-300 text-sm sm:text-base">support@drpworkshop.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Response Time</h3>
                    <p className="text-gray-300 text-sm sm:text-base">Within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Support</h3>
                    <p className="text-gray-300 text-sm sm:text-base">24/7 platform support</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="bg-black bg-opacity-20 p-4 sm:p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Send us a Message</h2>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-white font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-700'
                      }`}
                      placeholder="Enter your first name"
                      required
                    />
                    {errors.firstName && (
                      <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-white font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-700'
                      }`}
                      placeholder="Enter your last name"
                      required
                    />
                    {errors.lastName && (
                      <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-white font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-700'
                    }`}
                    placeholder="Enter your email address"
                    required
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-white font-medium mb-2">Subject</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                      errors.subject ? 'border-red-500' : 'border-gray-700'
                    }`}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="sales">Sales Question</option>
                    <option value="billing">Billing Question</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.subject && (
                    <p className="text-red-400 text-sm mt-1">{errors.subject}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-white font-medium mb-2">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                      errors.message ? 'border-red-500' : 'border-gray-700'
                    }`}
                    placeholder="Tell us how we can help you..."
                    required
                  ></textarea>
                  {errors.message && (
                    <p className="text-red-400 text-sm mt-1">{errors.message}</p>
                  )}
                </div>
                
                {errors.submit && (
                  <div className="text-center">
                    <p className="text-red-400 text-sm">{errors.submit}</p>
                  </div>
                )}
                
                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Office Location */}
      <div className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Visit Our Office</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">DRP Workshop Headquarters</h3>
              <div className="space-y-4 text-gray-300">
                <p className="flex items-start">
                  <svg className="w-5 h-5 text-indigo-400 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  123 Innovation Drive<br />
                  Tech Valley, CA 94000
                </p>
                
                <p className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +1 (555) 123-4567
                </p>
                
                <p className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Monday - Friday: 9:00 AM - 6:00 PM PST
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-64 h-48 bg-gray-800 rounded-lg flex items-center justify-center mx-auto">
                <div className="text-center text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p className="text-sm">Interactive Map</p>
                  <p className="text-xs">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-6 py-20 bg-black bg-opacity-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Frequently Asked Questions</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">How quickly do you respond to support requests?</h3>
              <p className="text-gray-300">We typically respond to all support requests within 24 hours. For urgent issues, our live chat is available during business hours.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Do you offer phone support?</h3>
              <p className="text-gray-300">Yes, phone support is available for PRO plan subscribers. You can also schedule a call with our team through the contact form.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Can I schedule a demo of the platform?</h3>
              <p className="text-gray-300">Absolutely! We'd be happy to give you a personalized demo. Just let us know your specific needs and we'll schedule a time that works for you.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">What if I have a feature request?</h3>
              <p className="text-gray-300">We love hearing from our users about new features! Submit your request through the contact form and our product team will review it.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Don't wait to transform your team's performance. Start your free trial today.
          </p>
          <div className="space-x-6">
            <a
              href={ROUTES.AUTH}
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </a>
            <a
              href={ROUTES.FEATURES}
              className="inline-block border-2 border-indigo-400 text-indigo-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-400 hover:text-white transition-all duration-300 transform hover:scale-105"
            >
              View Features
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

export default Contact; 