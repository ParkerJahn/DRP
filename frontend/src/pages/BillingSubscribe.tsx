import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface BillingSubscribeProps {
  onBackToDashboard?: () => void;
}

const BillingSubscribe: React.FC<BillingSubscribeProps> = ({ onBackToDashboard }) => {
  const { role, proStatus, user } = useAuth();
  const [activating, setActivating] = React.useState(false);
  const [copiedRole, setCopiedRole] = React.useState<'STAFF' | 'ATHLETE' | null>(null);

  // If user is not PRO or is already active, redirect
  React.useEffect(() => {
    if (role !== 'PRO') {
      if (onBackToDashboard) {
        onBackToDashboard();
      }
      return;
    }
    
    if (proStatus === 'active') {
      if (onBackToDashboard) {
        onBackToDashboard();
      }
      return;
    }
  }, [role, proStatus, onBackToDashboard]);

  const handleSubscribe = async () => {
    if (!user?.uid) return;
    
    try {
      setActivating(true);
      console.log('🧪 TEST MODE: Simulating PRO account activation...');
      
      // Update the user's proStatus to 'active' in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        proStatus: 'active',
        updatedAt: new Date()
      });
      
      console.log('✅ TEST MODE: PRO account activated successfully!');
      
      // Show success message briefly before redirecting
      alert('🎉 TEST MODE: PRO account activated! You will now be redirected to the dashboard.');
      
      // Force a page reload to trigger the auth state update
      window.location.reload();
      
    } catch (error) {
      console.error('Error activating PRO account:', error);
      alert('❌ Error activating account. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const generateInviteLink = (inviteRole: 'STAFF' | 'ATHLETE') => {
    if (!user?.uid) return '';
    
    // Generate a simple invite link (in production, this would be a signed token)
    const baseUrl = window.location.origin;
    const inviteData = {
      proId: user.uid,
      role: inviteRole,
      timestamp: Date.now()
    };
    
    // Encode the invite data (in production, this would be a secure token)
    const encodedData = btoa(JSON.stringify(inviteData));
    return `${baseUrl}/join?invite=${encodedData}`;
  };

  const copyToClipboard = async (text: string, inviteRole: 'STAFF' | 'ATHLETE') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRole(inviteRole);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedRole(null), 2000);
      
      console.log(`✅ Invite link copied for ${inviteRole}`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedRole(inviteRole);
      setTimeout(() => setCopiedRole(null), 2000);
    }
  };

  if (role !== 'PRO' || proStatus === 'active') {
    return null; // Will redirect via useEffect
  }

  const staffInviteLink = generateInviteLink('STAFF');
  const athleteInviteLink = generateInviteLink('ATHLETE');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Complete Your PRO Setup
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You're almost there! Complete your subscription to unlock all PRO features.
          </p>
          
          {/* Test Mode Banner */}
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              🧪 <strong>TEST MODE:</strong> Click the button below to simulate account activation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Activation */}
          <div className="space-y-6">
            {/* PRO Plan Details */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
                PRO Plan Features
              </h3>
              <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited Staff & Athlete seats
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Team messaging & collaboration
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Calendar & event management
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  SWEATsheet program builder
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Payment processing & analytics
                </li>
              </ul>
            </div>

            {/* Pricing */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                $29
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cancel anytime • No setup fees
              </p>
            </div>

            {/* Activate Button */}
            <button
              onClick={handleSubscribe}
              disabled={activating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activating ? '🧪 Activating...' : '🧪 TEST MODE: Activate PRO Account'}
            </button>
          </div>

          {/* Right Column - Share Links */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                🚀 Get Started Early
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share these links with your team while you complete setup
              </p>
            </div>

            {/* Staff Invite */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h4 className="text-lg font-medium text-green-900 dark:text-green-100 mb-3">
                👥 Invite Staff Members
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Coaches, assistants, and support staff
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={staffInviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-green-200 dark:border-green-700 rounded-md text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => copyToClipboard(staffInviteLink, 'STAFF')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  {copiedRole === 'STAFF' ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Athlete Invite */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
                💪 Invite Athletes
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Clients, students, and training participants
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={athleteInviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 rounded-md text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => copyToClipboard(athleteInviteLink, 'ATHLETE')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {copiedRole === 'ATHLETE' ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">📋 How It Works:</h5>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. Copy the invite link for the role you want</li>
                <li>2. Send it to your team member</li>
                <li>3. They click the link and create their account</li>
                <li>4. They're automatically added to your team</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <button
            onClick={onBackToDashboard}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Test Mode Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🧪 <strong>TEST MODE:</strong> This simulates Stripe payment completion
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            🔒 In production, this will be secure payment processing by Stripe
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillingSubscribe; 