import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PasswordSecurityManager } from '../utils/passwordSecurityManager';
import { SecurityAudit } from '../utils/security';

interface PasswordSecurityAdminProps {
  onClose: () => void;
}

const PasswordSecurityAdmin: React.FC<PasswordSecurityAdminProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Only allow PRO users to access this admin function
  if (!user || user.role !== 'PRO') {
    return null;
  }

  const handleRequirePasswordChange = async () => {
    if (!targetUserId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a user ID' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const success = await PasswordSecurityManager.requirePasswordChange(
        targetUserId.trim(),
        reason.trim() || 'admin_requirement'
      );

      if (success) {
        setMessage({ 
          type: 'success', 
          text: `Password change requirement set for user ${targetUserId}` 
        });
        setTargetUserId('');
        setReason('');
        
        // Log the admin action
        SecurityAudit.logSecurityEvent(
          'info', 
          `Password change requirement set for user ${targetUserId}: ${reason || 'admin_requirement'}`,
          user.uid,
          'admin_password_change_requirement'
        );
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Failed to set password change requirement' 
        });
      }
    } catch (error) {
      console.error('Error setting password change requirement:', error);
      setMessage({ 
        type: 'error', 
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearPasswordChangeRequirement = async () => {
    if (!targetUserId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a user ID' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const success = await PasswordSecurityManager.clearPasswordChangeRequirement(
        targetUserId.trim()
      );

      if (success) {
        setMessage({ 
          type: 'success', 
          text: `Password change requirement cleared for user ${targetUserId}` 
        });
        setTargetUserId('');
        setReason('');
        
        // Log the admin action
        SecurityAudit.logSecurityEvent(
          'info', 
          `Password change requirement cleared for user ${targetUserId}`,
          user.uid,
          'admin_password_change_requirement_cleared'
        );
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Failed to clear password change requirement' 
        });
      }
    } catch (error) {
      console.error('Error clearing password change requirement:', error);
      setMessage({ 
        type: 'error', 
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md mx-4 w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Password Security Admin
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Security Notice */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center">
            <span className="text-amber-600 dark:text-amber-400 mr-2">⚠️</span>
            <span className="text-amber-800 dark:text-amber-200 text-sm">
              This tool allows you to require password changes for team members. Use responsibly.
            </span>
          </div>
        </div>

        {/* User ID Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target User ID
          </label>
          <input
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Enter user UID"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Reason Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason (optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., security_policy_update, admin_requirement"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center">
              <span className={`mr-2 ${
                message.type === 'success' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {message.type === 'success' ? '✅' : '❌'}
              </span>
              <span className={`${
                message.type === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {message.text}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleRequirePasswordChange}
            disabled={loading || !targetUserId.trim()}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Setting...' : 'Require Password Change'}
          </button>
          
          <button
            onClick={handleClearPasswordChangeRequirement}
            disabled={loading || !targetUserId.trim()}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Clearing...' : 'Clear Requirement'}
          </button>
        </div>

        {/* Close Button */}
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordSecurityAdmin; 