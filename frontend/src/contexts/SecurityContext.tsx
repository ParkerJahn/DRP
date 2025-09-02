/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CSRFProtection, SessionSecurity, SecurityAudit, SecurityHeaders } from '../utils/security';
import type { SecurityContextType } from '../types/security';

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isSessionExpiring, setIsSessionExpiring] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [securityStatus, setSecurityStatus] = useState({
    csrfEnabled: true,
    sessionProtected: true,
    headersEnabled: true,
    auditEnabled: true
  });

  // Initialize security features
  useEffect(() => {
    try {
      // Initialize CSRF protection
      const token = CSRFProtection.generateToken();
      setCsrfToken(token);
      
      // Initialize session security
      SessionSecurity.initialize();
      
      // Log security initialization
      SecurityAudit.logSecurityEvent('info', 'Security context initialized', undefined, 'security_init');
      
      // Set up session monitoring
      const sessionCheckInterval = setInterval(() => {
        const expiring = SessionSecurity.isSessionExpiring();
        const expired = SessionSecurity.isSessionExpired();
        
        setIsSessionExpiring(expiring);
        setIsSessionExpired(expired);
        
        if (expired) {
          // Redirect to login
          window.location.href = '/auth?expired=true';
        }
      }, 30000); // Check every 30 seconds
      
      // Set up CSRF token refresh
      const csrfRefreshInterval = setInterval(() => {
        const newToken = CSRFProtection.refreshToken();
        setCsrfToken(newToken);
      }, 60 * 60 * 1000); // Refresh every hour
      
      return () => {
        clearInterval(sessionCheckInterval);
        clearInterval(csrfRefreshInterval);
      };
    } catch (error) {
      console.error('Failed to initialize security context:', error);
      SecurityAudit.logSecurityEvent('error', `Security context initialization failed: ${error}`, undefined, 'security_init_failed');
      
      // Disable security features if initialization fails
      setSecurityStatus({
        csrfEnabled: false,
        sessionProtected: false,
        headersEnabled: false,
        auditEnabled: false
      });
    }
  }, []);

  // Refresh CSRF token
  const refreshCsrfToken = () => {
    try {
      const newToken = CSRFProtection.refreshToken();
      setCsrfToken(newToken);
      SecurityAudit.logSecurityEvent('info', 'CSRF token refreshed', undefined, 'csrf_refresh');
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      SecurityAudit.logSecurityEvent('error', `CSRF token refresh failed: ${error}`, undefined, 'csrf_refresh_failed');
    }
  };

  // Validate CSRF token
  const validateCsrfToken = (token: string): boolean => {
    try {
      const isValid = CSRFProtection.validateToken(token);
      if (!isValid) {
        SecurityAudit.logSecurityEvent('security', 'CSRF token validation failed', undefined, 'csrf_validation_failed');
      }
      return isValid;
    } catch (error) {
      console.error('CSRF token validation error:', error);
      SecurityAudit.logSecurityEvent('error', `CSRF token validation error: ${error}`, undefined, 'csrf_validation_error');
      return false;
    }
  };

  // Update session activity
  const updateSessionActivity = () => {
    try {
      SessionSecurity.updateActivity();
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  };

  // Clear session
  const clearSession = () => {
    try {
      SessionSecurity.clearSession();
      CSRFProtection.clearToken();
      setCsrfToken('');
      SecurityAudit.logSecurityEvent('info', 'Session cleared', undefined, 'session_cleared');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  // Get security headers
  const getSecurityHeaders = (): Record<string, string> => {
    try {
      return SecurityHeaders.getSecurityHeaders();
    } catch (error) {
      console.error('Failed to get security headers:', error);
      return {};
    }
  };

  // Log security event
  const logSecurityEvent = (
    level: 'info' | 'warn' | 'error' | 'security',
    message: string,
    userId?: string,
    action?: string
  ) => {
    try {
      SecurityAudit.logSecurityEvent(level, message, userId, action);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const value: SecurityContextType = {
    csrfToken,
    refreshCsrfToken,
    validateCsrfToken,
    isSessionExpiring,
    isSessionExpired,
    updateSessionActivity,
    clearSession,
    getSecurityHeaders,
    logSecurityEvent,
    securityStatus
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
      
      {/* Session Expiry Warning */}
      {isSessionExpiring && !isSessionExpired && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>Your session will expire soon. Click anywhere to extend.</span>
          </div>
        </div>
      )}
      
      {/* Session Expired Modal */}
      {isSessionExpired && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Session Expired
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your session has expired for security reasons. Please sign in again.
            </p>
            <button
              onClick={() => window.location.href = '/auth'}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      )}
    </SecurityContext.Provider>
  );
}; 