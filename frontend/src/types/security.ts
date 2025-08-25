// Security context types
export interface SecurityContextType {
  // CSRF Protection
  csrfToken: string;
  refreshCsrfToken: () => void;
  validateCsrfToken: (token: string) => boolean;
  
  // Session Security
  isSessionExpiring: boolean;
  isSessionExpired: boolean;
  updateSessionActivity: () => void;
  clearSession: () => void;
  
  // Security Headers
  getSecurityHeaders: () => Record<string, string>;
  
  // Audit Logging
  logSecurityEvent: (
    level: 'info' | 'warn' | 'error' | 'security',
    message: string,
    userId?: string,
    action?: string
  ) => void;
  
  // Security Status
  securityStatus: {
    csrfEnabled: boolean;
    sessionProtected: boolean;
    headersEnabled: boolean;
    auditEnabled: boolean;
  };
} 