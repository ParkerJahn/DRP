import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { validateName, validatePhone } from '../utils/validation';
import { CSRFProtection, SecurityAudit, EnhancedSanitizer } from '../utils/security';
import PasswordChange from '../components/PasswordChange';
import PasswordSecurityAdmin from '../components/PasswordSecurityAdmin';
import { getAuth } from 'firebase/auth';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPasswordSecurityAdmin, setShowPasswordSecurityAdmin] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize CSRF token
  useEffect(() => {
    const token = CSRFProtection.generateToken();
    setCsrfToken(token);
    
    // Log profile page access
    SecurityAudit.logSecurityEvent('info', 'Profile page accessed', user?.uid, 'page_access');
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    
    // Apply appropriate sanitization based on field type
    switch (name) {
      case 'firstName':
      case 'lastName':
        sanitizedValue = EnhancedSanitizer.sanitizeAdvanced(value);
        break;
      case 'phoneNumber':
        // Don't sanitize phone numbers during typing to allow formatting
        sanitizedValue = value;
        break;
      default:
        sanitizedValue = EnhancedSanitizer.sanitizeAdvanced(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Clear any previous errors
    if (error) setError(null);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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
      case 'phoneNumber':
        validation = validatePhone(value);
        break;
      default:
        return;
    }
    
    if (!validation.isValid) {
      setFormData(prev => ({ ...prev, [name]: validation.sanitized }));
      setError(validation.error || 'Invalid input');
    }
  };

  const handleSave = async () => {
    // Validate CSRF token
    if (!CSRFProtection.validateToken(csrfToken)) {
      SecurityAudit.logSecurityEvent('security', 'CSRF token validation failed on profile update', user?.uid, 'csrf_attack');
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }

    // Validate all inputs
    const firstNameValidation = validateName(formData.firstName, 'First Name');
    const lastNameValidation = validateName(formData.lastName, 'Last Name');
    const phoneValidation = validatePhone(formData.phoneNumber);

    if (!firstNameValidation.isValid || !lastNameValidation.isValid || !phoneValidation.isValid) {
      const errors = [
        firstNameValidation.error,
        lastNameValidation.error,
        phoneValidation.error
      ].filter(Boolean);
      
      setError(errors.join('. '));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Log profile update attempt
      SecurityAudit.logSecurityEvent('info', 'Profile update initiated', user?.uid, 'profile_update');
      
      // Here you would typically update the user profile in your backend
      // For now, we'll simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh CSRF token after successful update
      const newToken = CSRFProtection.refreshToken();
      setCsrfToken(newToken);
      
      // Log successful update
      SecurityAudit.logSecurityEvent('info', 'Profile updated successfully', user?.uid, 'profile_update_success');
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Refresh user data
      await refreshUser();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Log failed update
      SecurityAudit.logSecurityEvent('error', `Profile update failed: ${error}`, user?.uid, 'profile_update_failed');
      
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
    setIsEditing(false);
    setError(null);
    
    // Log profile edit cancelled
    SecurityAudit.logSecurityEvent('info', 'Profile edit cancelled', user?.uid, 'profile_edit_cancelled');
  };

  const handleFixProId = async () => {
    if (!user || user.role !== 'PRO') return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the current user's ID token
      const idToken = await getAuth().currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('No authentication token available');
      }
      
      // Call the Cloud Function to fix the proId
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/fixExistingProUser', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Team ID fixed successfully! Refreshing...');
        // Refresh user data to get the updated proId
        await refreshUser();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to fix Team ID');
      }
      
    } catch (error) {
      console.error('Error fixing proId:', error);
      setError('Failed to fix Team ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFixProUsers = async () => {
    if (!user || user.role !== 'PRO') return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the current user's ID token
      const idToken = await getAuth().currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('No authentication token available');
      }
      
      // Call the Cloud Function to auto-fix all PRO users
      const response = await fetch('https://us-central1-drp-workshop.cloudfunctions.net/autoFixProUsers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Auto-fixed ${result.fixedUsers.length} PRO users! Refreshing...`);
        // Refresh user data
        await refreshUser();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to auto-fix PRO users');
      }
      
    } catch (error) {
      console.error('Error auto-fixing PRO users:', error);
      setError('Failed to auto-fix PRO users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-container-light dark:bg-container-dark">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
            {!isEditing && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  SecurityAudit.logSecurityEvent('info', 'Profile edit mode enabled', user.uid, 'profile_edit_enabled');
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Security Status */}
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-600 dark:text-green-400 mr-2">🔒</span>
              <span className="text-green-800 dark:text-green-200 text-sm">
                Enhanced security enabled • CSRF protected • Input validated
              </span>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center">
                <span className="text-green-600 dark:text-green-400 mr-2">✅</span>
                <span className="text-green-800 dark:text-green-200">{success}</span>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Personal Information
              </h2>
              <div className="flex gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Change Password
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      SecurityAudit.logSecurityEvent('info', 'Profile edit mode enabled', user?.uid, 'profile_edit_enabled');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              {/* Hidden CSRF token */}
              <input type="hidden" name="csrf_token" value={csrfToken} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                    required
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{user.firstName || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                    required
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{user.lastName || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{user.phoneNumber || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <p className="text-gray-900 dark:text-white">{user.email}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email cannot be changed</p>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Account Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === 'PRO' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                  user.role === 'STAFF' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>

            {user.role === 'PRO' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PRO Status
                </label>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.proStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {user.proStatus === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  {user.proStatus === 'active' && !user.proId && (
                    <button
                      onClick={handleFixProId}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Fix Team ID
                    </button>
                  )}
                </div>
                {user.proStatus === 'active' && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Team ID: {user.proId || 'Not Set'}
                  </p>
                )}
              </div>
            )}

            {user.role === 'PRO' && user.seats && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Seat Limits
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Staff</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{user.seats.staffLimit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Athletes</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{user.seats.athleteLimit}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Member Since
              </label>
              <p className="text-gray-900 dark:text-white">
                {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setShowPasswordChange(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Change Password
            </button>
            
            {user.role === 'PRO' && (
              <button 
                onClick={() => setShowPasswordSecurityAdmin(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Password Security Admin
              </button>
            )}
            
            {user.role === 'PRO' && (
              <button
                onClick={handleAutoFixProUsers}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Auto-Fix All PRO Users
              </button>
            )}
            
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
      {showPasswordChange && <PasswordChange onClose={() => setShowPasswordChange(false)} />}
      {showPasswordSecurityAdmin && <PasswordSecurityAdmin onClose={() => setShowPasswordSecurityAdmin(false)} />}
    </div>
  );
};

export default Profile; 